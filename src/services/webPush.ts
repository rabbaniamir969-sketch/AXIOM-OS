import { supabase } from './supabase'

const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY

function decodeVapidKey(value: string): Uint8Array {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export function webPushSupportMessage(): string | null {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'Browser ini belum mendukung Web Push.'
  }
  if (!vapidPublicKey || vapidPublicKey.startsWith('your-')) {
    return 'VAPID public key belum dikonfigurasi. Key Supabase bukan VAPID key.'
  }
  if (!vapidPublicKey.startsWith('B') || vapidPublicKey.length < 80) {
    return 'Format VAPID public key tidak valid.'
  }
  return null
}

export async function subscribeToWebPush(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const supportIssue = webPushSupportMessage()
  if (supportIssue) throw new Error(supportIssue)

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Izin notifikasi browser tidak diberikan.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeVapidKey(vapidPublicKey),
  })
  const json = subscription.toJSON()

  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    await subscription.unsubscribe()
    throw new Error('Browser mengembalikan data langganan push yang tidak lengkap.')
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: json.endpoint,
      subscription: json,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' })

  if (error) {
    await subscription.unsubscribe()
    throw error
  }
}

export async function unsubscribeFromWebPush(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint

  if (endpoint) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
    if (error) throw error
    await subscription?.unsubscribe()
  }
}

export async function sendTestWebPush(): Promise<void> {
  await sendWebPushNotification(
    'AXIOM OS',
    'Notifikasi web sudah terhubung ke akun Anda.',
    '/#notifications'
  )
}

export async function sendWebPushNotification(title: string, body: string, url = '/#notifications'): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')

  const { data, error } = await supabase.functions.invoke<{
    delivered: number
    failed?: number
    warnings?: string[]
  }>('send-web-push', {
    body: {
      title: title.slice(0, 80),
      body: body.slice(0, 240),
      url,
    },
  })
  if (error) throw error
  if (!data?.delivered) {
    if (data?.warnings?.length) throw new Error(data.warnings.join(' '))
    if (data?.failed) throw new Error(`Notifikasi gagal dikirim ke ${data.failed} perangkat.`)
    throw new Error('Belum ada perangkat yang terdaftar untuk menerima notifikasi.')
  }
  if (data.failed || data.warnings?.length) {
    const warning = data.warnings?.join(' ')
    throw new Error(`Notifikasi terkirim sebagian: ${data.delivered} berhasil, ${data.failed ?? 0} gagal.${warning ? ` ${warning}` : ''}`)
  }
}
