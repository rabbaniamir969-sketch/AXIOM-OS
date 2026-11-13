import { moduleCatalog } from '../modules/registry'
import type { AxiomState, ActivityEntry, CoreSettings, ModuleRecord, PermissionState } from '../types/axiom'

const STORAGE_KEY = 'axiom-core-state-v1'
const PERMISSION_REVIEW_KEY = 'axiom-permission-review-v1'

export const defaultPermissions: PermissionState = {
  localStorage: false,
  notifications: false,
  network: false,
}

export const defaultSettings: CoreSettings = {
  theme: 'midnight',
  autoSave: true,
  developerMode: false,
  pushNotifications: true,
}

export const defaultLogs: ActivityEntry[] = [
  {
    id: 'boot-1',
    type: 'system',
    message: 'AXIOM CORE berhasil diinisialisasi dan siap mengelola modul.',
    severity: 'success',
    timestamp: new Date().toISOString(),
  },
]

export function createDefaultAxiomState(): AxiomState {
  return {
    modules: restoreModules(),
    permissions: { ...defaultPermissions },
    logs: [...defaultLogs],
    settings: { ...defaultSettings },
  }
}

function reviewLegacyPermissions(permissions?: Partial<PermissionState>): {
  permissions: PermissionState
  revokedLegacyStorageGrant: boolean
} {
  const reviewed: PermissionState = {
    ...defaultPermissions,
    ...permissions,
  }
  const needsReview = window.localStorage.getItem(PERMISSION_REVIEW_KEY) !== 'reviewed'

  if (needsReview) {
    reviewed.localStorage = false
    window.localStorage.setItem(PERMISSION_REVIEW_KEY, 'reviewed')
  }

  return {
    permissions: reviewed,
    revokedLegacyStorageGrant: needsReview && permissions?.localStorage === true,
  }
}

const restoreModules = (modules?: Array<Partial<ModuleRecord>>): ModuleRecord[] => {
  const source = Array.isArray(modules) && modules.length > 0 ? modules : moduleCatalog

  return source.map((module) => {
    const catalogEntry = moduleCatalog.find((entry) => entry.id === module.id) ?? moduleCatalog[0]

    return {
      ...catalogEntry,
      ...module,
      version: module.version ?? catalogEntry.version,
      category: module.category ?? catalogEntry.category,
      status: module.status ?? catalogEntry.status,
      installed: module.installed ?? catalogEntry.installed ?? false,
      enabled: module.enabled ?? catalogEntry.enabled ?? false,
      permissions: module.permissions ?? catalogEntry.permissions ?? ['localStorage'],
      compatibility: module.compatibility ?? catalogEntry.compatibility,
      icon: catalogEntry.icon,
    }
  })
}

export function restoreAxiomState(value: Partial<AxiomState>): AxiomState {
  return {
    modules: restoreModules(value.modules),
    permissions: { ...defaultPermissions, ...value.permissions },
    logs: Array.isArray(value.logs) && value.logs.length > 0 ? value.logs.slice(0, 40) : [...defaultLogs],
    settings: { ...defaultSettings, ...value.settings },
  }
}

export function loadAxiomState(): AxiomState {
  const fallback = createDefaultAxiomState()

  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY)
    if (!serialized) {
      const permissionReview = reviewLegacyPermissions()
      return {
        ...fallback,
        permissions: permissionReview.permissions,
      }
    }

    const parsed = JSON.parse(serialized) as Partial<AxiomState>

    const permissionReview = reviewLegacyPermissions(parsed.permissions)
    const state = restoreAxiomState({ ...parsed, permissions: permissionReview.permissions })

    if (permissionReview.revokedLegacyStorageGrant) {
      saveAxiomState(state)
    }

    return state
  } catch {
    return fallback
  }
}

export function saveAxiomState(state: AxiomState): void {
  if (typeof window === 'undefined') {
    return
  }

  const snapshot = {
    ...state,
    modules: state.modules.map(({ id, name, description, version, category, status, installed, enabled, permissions, compatibility }) => ({
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

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}
