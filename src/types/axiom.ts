import type { LucideIcon } from 'lucide-react'

export type PermissionKey = 'localStorage' | 'notifications' | 'network'

export type ModuleRecord = {
  id: string
  name: string
  description: string
  version: string
  category: string
  status: 'active' | 'planned'
  installed: boolean
  enabled: boolean
  permissions: PermissionKey[]
  compatibility: {
    minCoreVersion: string
    platforms: string[]
  }
  icon: LucideIcon
}

export type ActivitySeverity = 'info' | 'success' | 'warning'

export type ActivityEntry = {
  id: string
  type: string
  message: string
  severity: ActivitySeverity
  timestamp: string
}

export type PermissionState = Record<PermissionKey, boolean>

export type CoreSettings = {
  theme: 'midnight' | 'aurora'
  autoSave: boolean
  developerMode: boolean
  pushNotifications: boolean
}

export type AxiomState = {
  modules: ModuleRecord[]
  permissions: PermissionState
  logs: ActivityEntry[]
  settings: CoreSettings
}

export type AxiomView = 'dashboard' | 'modules' | 'details' | 'permissions' | 'logs' | 'settings' | 'profile' | 'notifications'
