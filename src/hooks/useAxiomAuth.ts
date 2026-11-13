import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { disableAndroidPush, supportsAndroidPush } from '../services/androidPush'
import { supabase } from '../services/supabase'

export function useAxiomAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setLoading(false)
      }
    })

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setLoading(false)
    }).catch((sessionError: unknown) => {
      if (active) {
        setError(sessionError instanceof Error ? sessionError.message : 'Gagal memeriksa sesi akun.')
        setLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const runAuthAction = async (action: () => Promise<{ error: { message: string } | null }>) => {
    setError('')
    try {
      const { error: authError } = await action()
      if (authError) throw authError
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Permintaan akun gagal.'
      setError(message)
      throw actionError
    }
  }

  const signIn = (email: string, password: string) =>
    runAuthAction(() => {
      if (!supabase) throw new Error('Konfigurasi Supabase belum tersedia.')
      return supabase.auth.signInWithPassword({ email, password })
    })

  const signUp = (email: string, password: string) =>
    runAuthAction(() => {
      if (!supabase) throw new Error('Konfigurasi Supabase belum tersedia.')
      return supabase.auth.signUp({ email, password })
    })

  const signOut = () =>
    runAuthAction(async () => {
      if (!supabase) throw new Error('Konfigurasi Supabase belum tersedia.')
      if (session?.user && supportsAndroidPush()) await disableAndroidPush(session.user.id)
      return supabase.auth.signOut()
    })

  return {
    user: session?.user ?? null,
    session,
    loading,
    error,
    configured: Boolean(supabase),
    signIn,
    signUp,
    signOut,
  }
}
