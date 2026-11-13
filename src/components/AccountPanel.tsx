import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { LogIn, LogOut, UserRoundPlus } from 'lucide-react'

type AccountPanelProps = {
  user: User | null
  loading: boolean
  configured: boolean
  error: string
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
  onSignOut: () => Promise<void>
}

export default function AccountPanel({
  user,
  loading,
  configured,
  error,
  onSignIn,
  onSignUp,
  onSignOut,
}: AccountPanelProps) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      if (mode === 'signIn') {
        await onSignIn(email.trim(), password)
        setMessage('Berhasil masuk. Data AXIOM Anda akan dimuat dari server.')
      } else {
        await onSignUp(email.trim(), password)
        setMessage('Pendaftaran dikirim. Jika verifikasi email aktif, buka tautan yang dikirim untuk mengaktifkan akun.')
      }
    } catch {
      // The auth hook exposes the provider error in this panel.
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="panel-card account-message">Memeriksa sesi akun...</div>
  }

  if (!configured) {
    return (
      <div className="panel-card account-message">
        Konfigurasi Supabase belum lengkap. Isi URL project dan publishable key di file .env.local lalu jalankan ulang aplikasi.
      </div>
    )
  }

  if (user) {
    return (
      <div className="page-block">
        <div className="panel-card profile-card">
          <div className="profile-avatar">{user.email?.slice(0, 1).toUpperCase() ?? 'U'}</div>
          <div className="profile-copy">
            <h3>{user.email}</h3>
            <p>Akun terhubung ke Supabase Auth.</p>
            <span className="status-badge active">MASUK</span>
          </div>
        </div>

        <div className="panel-card profile-settings-card">
          <h3>Status akun</h3>
          <div className="profile-list">
            <div className="info-item"><span>ID pengguna</span><strong>{user.id}</strong></div>
            <div className="info-item"><span>Email terverifikasi</span><strong>{user.email_confirmed_at ? 'Ya' : 'Belum'}</strong></div>
            <div className="info-item"><span>Penyimpanan data</span><strong>Supabase</strong></div>
            <div className="info-item"><span>Sinkronisasi akun</span><strong>Aktif</strong></div>
          </div>
          <button type="button" className="secondary-btn" disabled={busy} onClick={async () => {
            setBusy(true)
            setMessage('')
            try {
              await onSignOut()
              setMessage('Anda sudah keluar dari akun.')
            } catch {
              // The auth hook exposes the provider error in this panel.
            } finally {
              setBusy(false)
            }
          }}>
            <LogOut size={15} /> Keluar
          </button>
          {(message || error) && <p className={error ? 'form-feedback error' : 'form-feedback'}>{error || message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="panel-card account-form-card">
      <div>
        <span className="eyebrow accent">AKUN AXIOM</span>
        <h2>{mode === 'signIn' ? 'Selamat datang kembali' : 'Buat akun AXIOM'}</h2>
        <p>Masuk untuk menyimpan modul, izin, dan aktivitas ke akun Supabase Anda.</p>
      </div>
      <form className="account-form" onSubmit={submit}>
        <label>
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>Kata sandi</span>
          <input
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit" className="primary-btn" disabled={busy}>
          {mode === 'signIn' ? <LogIn size={15} /> : <UserRoundPlus size={15} />}
          {busy ? 'Memproses...' : mode === 'signIn' ? 'Masuk' : 'Daftar'}
        </button>
      </form>
      <button
        type="button"
        className="link-btn"
        disabled={busy}
        onClick={() => {
          setMode((current) => current === 'signIn' ? 'signUp' : 'signIn')
          setMessage('')
        }}
      >
        {mode === 'signIn' ? 'Belum punya akun? Buat akun' : 'Sudah punya akun? Masuk'}
      </button>
      {(message || error) && <p className={error ? 'form-feedback error' : 'form-feedback'}>{error || message}</p>}
      <small className="account-security-note">Kata sandi dikirim langsung ke Supabase Auth dan tidak disimpan di localStorage aplikasi.</small>
    </div>
  )
}
