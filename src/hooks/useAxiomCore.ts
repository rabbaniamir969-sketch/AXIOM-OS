import { useEffect, useRef, useState } from 'react'
import { installModule, removeModule, toggleModule, updateCoreSetting, updatePermission } from '../services/axiomCore'
import { createDefaultAxiomState, loadAxiomState, saveAxiomState } from '../services/storage'
import { loadRemoteAxiomState, saveRemoteAxiomState } from '../services/remoteState'
import { isSupabaseConfigured } from '../services/supabase'
import { sendWebPushNotification } from '../services/webPush'
import type { AxiomState, CoreSettings, PermissionKey } from '../types/axiom'

export function useAxiomCore(userId: string | undefined, authLoading: boolean) {
  const [state, setState] = useState<AxiomState>(() => loadAxiomState())
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [remoteReady, setRemoteReady] = useState(!isSupabaseConfigured)
  const [syncError, setSyncError] = useState('')
  const [pushError, setPushError] = useState('')
  const previousAutoSave = useRef(state.settings.autoSave)
  const lastSeenLogId = useRef(state.logs[0]?.id)

  useEffect(() => {
    let active = true

    if (authLoading) {
      setReady(false)
      setRemoteReady(false)
      return () => { active = false }
    }

    if (!isSupabaseConfigured || !userId) {
      const localState = loadAxiomState()
      previousAutoSave.current = localState.settings.autoSave
      lastSeenLogId.current = localState.logs[0]?.id
      setState(localState)
      setRemoteReady(true)
      setReady(true)
      setSyncError('')
      return () => { active = false }
    }

    setReady(false)
    setRemoteReady(false)
    setSyncError('')
    void (async () => {
      try {
        const remoteState = await loadRemoteAxiomState(userId)
        const nextState = remoteState ?? createDefaultAxiomState()
        if (!remoteState && nextState.settings.autoSave) {
          await saveRemoteAxiomState(userId, nextState)
        }
        if (active) {
          previousAutoSave.current = nextState.settings.autoSave
          lastSeenLogId.current = nextState.logs[0]?.id
          setState(nextState)
          setRemoteReady(true)
        }
      } catch (error) {
        if (active) {
          setSyncError(error instanceof Error ? error.message : 'Gagal memuat data akun dari Supabase.')
        }
      } finally {
        if (active) setReady(true)
      }
    })()

    return () => { active = false }
  }, [authLoading, userId])

  useEffect(() => {
    if (!ready) return
    const autoSaveChanged = previousAutoSave.current !== state.settings.autoSave
    previousAutoSave.current = state.settings.autoSave
    if (!state.settings.autoSave && !autoSaveChanged) return

    if (!userId || !isSupabaseConfigured) {
      saveAxiomState(state)
    }
    if (userId && isSupabaseConfigured && remoteReady) {
      void saveRemoteAxiomState(userId, state).then(() => setSyncError('')).catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : 'Gagal menyimpan data ke Supabase.')
      })
    }
  }, [ready, remoteReady, state, userId])

  useEffect(() => {
    if (!ready) return
    const latestLog = state.logs[0]
    const previousLogId = lastSeenLogId.current
    lastSeenLogId.current = latestLog?.id

    if (
      !userId ||
      !remoteReady ||
      !state.settings.pushNotifications ||
      !latestLog ||
      !previousLogId ||
      latestLog.id === previousLogId ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) return

    void sendWebPushNotification('AXIOM OS · ' + latestLog.type, latestLog.message)
      .then(() => setPushError(''))
      .catch((error: unknown) => {
        setPushError(error instanceof Error ? error.message : 'Gagal mengirim notifikasi web.')
      })
  }, [ready, remoteReady, state, userId])

  const handleInstall = (moduleId: string) => {
    setState((current) => installModule(current, moduleId))
  }

  const handleRemove = (moduleId: string) => {
    setState((current) => removeModule(current, moduleId))
  }

  const handleToggle = (moduleId: string) => {
    setState((current) => toggleModule(current, moduleId))
  }

  const handlePermission = (key: PermissionKey, value: boolean) => {
    setState((current) => updatePermission(current, key, value))
  }

  const handleSetting = <T extends keyof CoreSettings>(key: T, value: CoreSettings[T]) => {
    setState((current) => updateCoreSetting(current, key, value))
  }

  return {
    state,
    ready,
    syncError,
    pushError,
    installModule: handleInstall,
    removeModule: handleRemove,
    toggleModule: handleToggle,
    updatePermission: handlePermission,
    updateCoreSetting: handleSetting,
  }
}
