import type { LucideIcon } from 'lucide-react'
import type { PermissionKey } from '../types/axiom'

export type AxiomModule = {
  id: string
  name: string
  description: string
  icon: LucideIcon
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
}
