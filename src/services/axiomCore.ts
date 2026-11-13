import type {
  ActivityEntry,
  ActivitySeverity,
  AxiomState,
  CoreSettings,
  ModuleRecord,
  PermissionKey,
  PermissionState,
} from '../types/axiom'

const logPrefix = (type: string, message: string, severity: ActivitySeverity = 'info'): ActivityEntry => ({
  id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
  type,
  message,
  severity,
  timestamp: new Date().toISOString(),
})

export function getSystemMetrics(modules: ModuleRecord[]) {
  const installed = modules.filter((module) => module.installed).length
  const active = modules.filter((module) => module.installed && module.enabled).length
  const inactive = installed - active

  return { installed, active, inactive }
}

function getMissingPermissions(state: AxiomState, module: ModuleRecord): PermissionKey[] {
  return module.permissions.filter((permission) => !state.permissions[permission])
}

export function installModule(state: AxiomState, moduleId: string): AxiomState {
  const module = state.modules.find((entry) => entry.id === moduleId)

  if (!module) {
    return state
  }

  if (module.installed) {
    return {
      ...state,
      logs: [logPrefix('module', `Modul ${module.name} sudah terpasang.`, 'warning'), ...state.logs].slice(0, 40),
    }
  }

  const missingPermissions = getMissingPermissions(state, module)

  const nextModules: ModuleRecord[] = state.modules.map((entry) =>
    entry.id === moduleId
      ? {
          ...entry,
          installed: true,
          enabled: missingPermissions.length === 0,
          status: missingPermissions.length === 0 ? 'active' : 'planned',
        }
      : entry
  )

  return {
    ...state,
    modules: nextModules,
    logs: [
      logPrefix(
        'install',
        missingPermissions.length > 0
          ? `Modul ${module.name} berhasil dipasang, menunggu persetujuan izin: ${missingPermissions.join(', ')}.`
          : `Modul ${module.name} berhasil dipasang dan diaktifkan.`,
        missingPermissions.length > 0 ? 'warning' : 'success'
      ),
      ...state.logs,
    ].slice(0, 40),
  }
}

export function removeModule(state: AxiomState, moduleId: string): AxiomState {
  const module = state.modules.find((entry) => entry.id === moduleId)

  if (!module) {
    return state
  }

  if (module.id === 'core') {
    return {
      ...state,
      logs: [logPrefix('system', 'Modul inti AXIOM CORE tidak dapat dihapus.', 'warning'), ...state.logs].slice(0, 40),
    }
  }

  const nextModules: ModuleRecord[] = state.modules.map((entry) =>
    entry.id === moduleId
      ? {
          ...entry,
          installed: false,
          enabled: false,
          status: 'planned',
        }
      : entry
  )

  return {
    ...state,
    modules: nextModules,
    logs: [logPrefix('remove', `Modul ${module.name} berhasil dihapus dari sistem.`, 'info'), ...state.logs].slice(0, 40),
  }
}

export function toggleModule(state: AxiomState, moduleId: string): AxiomState {
  const module = state.modules.find((entry) => entry.id === moduleId)

  if (!module || !module.installed) {
    return state
  }

  if (module.id === 'core') {
    return {
      ...state,
      logs: [logPrefix('system', 'Modul inti AXIOM CORE harus tetap aktif.', 'warning'), ...state.logs].slice(0, 40),
    }
  }

  const missingPermissions = getMissingPermissions(state, module)
  const nextEnabled = !module.enabled

  if (nextEnabled && missingPermissions.length > 0) {
    return {
      ...state,
      logs: [
        logPrefix(
          'toggle',
          `Modul ${module.name} belum dapat diaktifkan karena izin belum disetujui: ${missingPermissions.join(', ')}.`,
          'warning'
        ),
        ...state.logs,
      ].slice(0, 40),
    }
  }

  const nextModules: ModuleRecord[] = state.modules.map((entry) =>
    entry.id === moduleId
      ? {
          ...entry,
          enabled: nextEnabled,
          status: nextEnabled ? 'active' : 'planned',
        }
      : entry
  )

  return {
    ...state,
    modules: nextModules,
    logs: [
      logPrefix('toggle', `Modul ${module.name} ${nextEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`, nextEnabled ? 'success' : 'warning'),
      ...state.logs,
    ].slice(0, 40),
  }
}

export function updatePermission(state: AxiomState, key: PermissionKey, value: boolean): AxiomState {
  const nextPermissions: PermissionState = {
    ...state.permissions,
    [key]: value,
  }

  const nextModules: ModuleRecord[] = state.modules.map((module) => {
    if (module.id === 'core' || !module.installed || !module.permissions.includes(key)) {
      return module
    }

    if (value) {
      return module
    }

    return {
      ...module,
      enabled: false,
      status: 'planned',
    }
  })

  const labelMap: Record<PermissionKey, string> = {
    localStorage: 'Penyimpanan lokal',
    notifications: 'Notifikasi',
    network: 'Jaringan',
  }

  return {
    ...state,
    permissions: nextPermissions,
    modules: nextModules,
    logs: [
      logPrefix('permission', `${labelMap[key]} ${value ? 'disetujui' : 'dicabut'}.`, value ? 'success' : 'warning'),
      ...state.logs,
    ].slice(0, 40),
  }
}

export function updateCoreSetting<T extends keyof CoreSettings>(state: AxiomState, key: T, value: CoreSettings[T]): AxiomState {
  const nextSettings: CoreSettings = {
    ...state.settings,
    [key]: value,
  }

  return {
    ...state,
    settings: nextSettings,
    logs: [logPrefix('settings', `Pengaturan ${key} diperbarui.`, 'info'), ...state.logs].slice(0, 40),
  }
}
