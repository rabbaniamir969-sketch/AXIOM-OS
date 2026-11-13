import type { AxiomState } from '../types/axiom'
import { restoreAxiomState } from './storage'
import { supabase } from './supabase'

function isAxiomState(value: unknown): value is AxiomState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<AxiomState>
  return Array.isArray(state.modules) && Array.isArray(state.logs) &&
    typeof state.permissions === 'object' && state.permissions !== null &&
    typeof state.settings === 'object' && state.settings !== null
}

export async function loadRemoteAxiomState(userId: string): Promise<AxiomState | null> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')

  const { data, error } = await supabase
    .from('axiom_core_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  if (!isAxiomState(data.state)) throw new Error('Data AXIOM dari server memiliki format yang tidak valid.')
  return restoreAxiomState(data.state as Partial<AxiomState>)
}

export async function saveRemoteAxiomState(userId: string, state: AxiomState): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')

  const remoteState = {
    permissions: state.permissions,
    logs: state.logs,
    settings: state.settings,
    modules: state.modules.map(({
      id,
      name,
      description,
      version,
      category,
      status,
      installed,
      enabled,
      permissions,
      compatibility,
    }) => ({
      id,
      name,
      description,
      version,
      category,
      status,
      installed,
      enabled,
      permissions,
      compatibility,
    })),
  }
  const { error } = await supabase
    .from('axiom_core_state')
    .upsert({ user_id: userId, state: remoteState, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) throw error
}
