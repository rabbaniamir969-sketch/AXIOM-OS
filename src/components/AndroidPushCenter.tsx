import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { BellRing, Send, ShieldCheck } from 'lucide-react'
import { disableAndroidPush, enableAndroidPush, hasAndroidPushRegistration } from '../services/androidPush'
import { sendTestWebPush } from '../services/webPush'

type AndroidPushCenterProps = {
  user: User | null
  pushNotifications: boolean
  onPreferenceChange: (enabled: boolean) => void
}

export default function AndroidPushCenter({ user, pushNotifications, onPreferenceChange }: AndroidPushCenterProps) {
  const [registered, setRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    if (!user) {
      setRegistered(false)
      return () => { active = false }
    }

    void hasAndroidPushRegistration(user.id).then((value) => {
      if (active) setRegistered(value)
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Gagal memeriksa perangkat Android.')
    })

    return () => { active = false }
  }, [user])

  const enable = async () => {
    if (!user) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await enableAndroidPush(user.id)
      setRegistered(true)
      onPreferenceChange(true)
      setMessage('Notifikasi FCM aktif di perangkat Android ini.')
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : 'Gagal mengaktifkan notifikasi Android.')
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
      await disableAndroidPush(user.id)
      setRegistered(false)
      onPreferenceChange(false)
      setMessage('Pendaftaran notifikasi perangkat Android sudah dicabut.')
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Gagal mencabut notifikasi Android.')
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
      setMessage('Notifikasi uji dikirim ke perangkat yang terdaftar.')
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
          <h3>Notifikasi Android (FCM)</h3>
          <p>Push native dikirim ke perangkat Android melalui Firebase Cloud Messaging.</p>
        </div>
        <BellRing size={18} />
      </div>

      {!user ? (
        <p className="push-state">Masuk ke akun AXIOM untuk mengaktifkan notifikasi perangkat.</p>
      ) : (
        <>
          <div className="push-state">
            <ShieldCheck size={15} />
            <span>{registered && pushNotifications ? 'Notifikasi aktif di perangkat ini.' : 'Notifikasi belum aktif di perangkat ini.'}</span>
          </div>
          <div className="push-actions">
            {registered && pushNotifications ? (
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
                <BellRing size={14} /> {busy ? 'Memproses...' : 'Aktifkan notifikasi Android'}
              </button>
            )}
          </div>
        </>
      )}

      {(message || error) && <p className={error ? 'form-feedback error' : 'form-feedback'}>{error || message}</p>}
    </section>
  )
}
