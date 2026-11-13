import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'

const installationIdKey = 'axiom-android-installation-id'
const notificationChannelId = 'axiom_updates'

export function supportsAndroidPush(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function getInstallationId(): string {
  const existingId = localStorage.getItem(installationIdKey)
  if (existingId) return existingId

  const installationId = crypto.randomUUID()
  localStorage.setItem(installationIdKey, installationId)
  return installationId
}

export async function hasAndroidPushRegistration(userId: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')

  const { data, error } = await supabase
    .from('push_devices')
    .select('installation_id')
    .eq('user_id', userId)
    .eq('installation_id', getInstallationId())
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function enableAndroidPush(userId: string): Promise<void> {
  if (!supportsAndroidPush()) throw new Error('Push native hanya tersedia di aplikasi Android.')
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const client = supabase

  let pushPermission = await PushNotifications.checkPermissions()
  if (pushPermission.receive !== 'granted') {
    pushPermission = await PushNotifications.requestPermissions()
  }
  if (pushPermission.receive !== 'granted') {
    throw new Error('Izin notifikasi Android tidak diberikan.')
  }

  let localPermission = await LocalNotifications.checkPermissions()
  if (localPermission.display !== 'granted') {
    localPermission = await LocalNotifications.requestPermissions()
  }
  if (localPermission.display !== 'granted') {
    throw new Error('Izin notifikasi lokal Android tidak diberikan.')
  }

  await LocalNotifications.createChannel({
    id: notificationChannelId,
    name: 'Pembaruan AXIOM',
    description: 'Notifikasi penting dari AXIOM OS',
    importance: 4,
  })

  const installationId = getInstallationId()
  const listenerHandles: PluginListenerHandle[] = []
  let timeoutId: number | undefined

  try {
    const tokenReceived = new Promise<void>((resolve, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Pendaftaran FCM terlalu lama. Coba lagi.')), 20000)

      void (async () => {
        listenerHandles.push(await PushNotifications.addListener('registration', async ({ value }) => {
          if (!value) {
            reject(new Error('FCM tidak mengembalikan token perangkat.'))
            return
          }

          try {
            const { error } = await client
              .from('push_devices')
              .upsert({
                user_id: userId,
                installation_id: installationId,
                token: value,
                platform: 'android',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,installation_id' })

            if (error) reject(error)
            else resolve()
          } catch (registrationError) {
            reject(registrationError)
          }
        }))

        listenerHandles.push(await PushNotifications.addListener('registrationError', (error) => {
          reject(new Error(error.error || 'Pendaftaran FCM gagal.'))
        }))

        await PushNotifications.register()
      })().catch(reject)
    })

    await tokenReceived
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    await Promise.all(listenerHandles.map((handle) => handle.remove()))
  }
}

export async function disableAndroidPush(userId: string): Promise<void> {
  if (!supportsAndroidPush()) return
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  if (!await hasAndroidPushRegistration(userId)) return

  const { error } = await supabase
    .from('push_devices')
    .delete()
    .eq('user_id', userId)
    .eq('installation_id', getInstallationId())

  if (error) throw error
  await PushNotifications.unregister()
}

function getNotificationUrl(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('url' in data)) return null
  const url = data.url
  return typeof url === 'string' && url.startsWith('/#') && !url.startsWith('//') ? url : null
}

function openNotificationUrl(data: unknown): void {
  const url = getNotificationUrl(data)
  if (url) window.location.hash = url.slice(1)
}

export async function installAndroidPushListeners(onError: (message: string) => void): Promise<() => Promise<void>> {
  if (!supportsAndroidPush()) return async () => {}

  const listenerHandles = await Promise.all([
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      void LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Date.now() % 2147483647),
          title: notification.title || 'AXIOM OS',
          body: notification.body || 'Anda menerima notifikasi baru.',
          channelId: notificationChannelId,
          schedule: { at: new Date() },
          extra: { url: getNotificationUrl(notification.data) },
        }],
      }).catch((error: unknown) => {
        onError(error instanceof Error ? error.message : 'Notifikasi foreground gagal ditampilkan.')
      })
    }),
    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      openNotificationUrl(notification.data)
    }),
    LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      openNotificationUrl(notification.extra)
    }),
  ])

  return async () => {
    await Promise.all(listenerHandles.map((handle) => handle.remove()))
  }
}
