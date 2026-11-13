import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { BellRing, Send, ShieldCheck } from 'lucide-react'
import { sendTestWebPush, subscribeToWebPush, unsubscribeFromWebPush, webPushSupportMessage } from '../services/webPush'
import { supabase } from '../services/supabase'

type WebPushCenterProps = {
  user: User | null
  pushNotifications: boolean
  onPreferenceChange: (enabled: boolean) => void
}

export default function WebPushCenter({ user, pushNotifications, onPreferenceChange }: WebPushCenterProps) {
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const supportIssue = webPushSupportMessage()

  useEffect(() => {
    let active = true
    if (!user || !('serviceWorker' in navigator)) {
      setSubscribed(false)
      return
    }

    navigator.serviceWorker.getRegistration('/').then(async (registration) => {
      const current = await registration?.pushManager.getSubscription()
      if (!active) return
      setSubscribed(Boolean(current))

      if (current && supabase) {
        const { error: saveError } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: current.endpoint,
          subscription: current.toJSON(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,endpoint' })
        if (saveError && active) setError(saveError.message)
      }
    }).catch((subscriptionError: unknown) => {
      if (active) setError(subscriptionError instanceof Error ? subscriptionError.message : 'Gagal memeriksa langganan notifikasi.')
    })

    return () => { active = false }
  }, [user])

  const enable = async () => {
    if (!user) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await subscribeToWebPush(user.id)
      setSubscribed(true)
      onPreferenceChange(true)
      setMessage('Notifikasi web berhasil diaktifkan untuk akun ini.')
    } catch (subscriptionError) {
      setError(subscriptionError instanceof Error ? subscriptionError.message : 'Gagal mengaktifkan notifikasi web.')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!user) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await unsubscribeFromWebPush(user.id)
      setSubscribed(false)
      onPreferenceChange(false)
      setMessage('Langganan notifikasi pada browser ini sudah dicabut.')
    } catch (subscriptionError) {
      setError(subscriptionError instanceof Error ? subscriptionError.message : 'Gagal mencabut langganan notifikasi.')
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await sendTestWebPush()
      setMessage('Notifikasi uji dikirim ke browser yang terdaftar.')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Gagal mengirim notifikasi uji.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel-card web-push-card">
      <div className="panel-header">
        <div>
          <h3>Notifikasi Web Push</h3>
          <p>Notifikasi browser dikirim melalui Supabase Edge Function.</p>
        </div>
        <BellRing size={18} />
      </div>

      {!user ? (
        <p className="push-state">Masuk ke akun AXIOM untuk mengaktifkan notifikasi lintas sesi.</p>
      ) : supportIssue ? (
        <p className="form-feedback error">{supportIssue}</p>
      ) : (
        <>
          <div className="push-state">
            <ShieldCheck size={15} />
            <span>{subscribed && pushNotifications ? 'Notifikasi aktif di browser ini.' : 'Notifikasi belum aktif di browser ini.'}</span>
          </div>
          <div className="push-actions">
            {subscribed && pushNotifications ? (
              <>
                <button type="button" className="primary-btn small" disabled={busy} onClick={sendTest}>
                  <Send size={14} /> Kirim tes
                </button>
                <button type="button" className="secondary-btn small" disabled={busy} onClick={disable}>
                  Matikan
                </button>
              </>
            ) : (
              <button type="button" className="primary-btn small" disabled={busy} onClick={enable}>
                <BellRing size={14} /> {busy ? 'Memproses...' : 'Aktifkan notifikasi web'}
              </button>
            )}
          </div>
        </>
      )}

      {(message || error) && <p className={error ? 'form-feedback error' : 'form-feedback'}>{error || message}</p>}
    </section>
  )
}
