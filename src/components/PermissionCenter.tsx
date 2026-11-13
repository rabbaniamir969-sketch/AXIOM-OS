import type { ModuleRecord, PermissionKey, PermissionState } from '../types/axiom'

type PermissionCenterProps = {
  permissions: PermissionState
  modules: ModuleRecord[]
  onPermissionChange: (key: PermissionKey, value: boolean) => void
}

const permissionMeta: Record<PermissionKey, { label: string; description: string; requiredBy: string[] }> = {
  localStorage: {
    label: 'Penyimpanan lokal',
    description: 'Memungkinkan modul menyimpan konfigurasi, status, dan cache di perangkat.',
    requiredBy: ['core', 'planner', 'workspace'],
  },
  notifications: {
    label: 'Notifikasi',
    description: 'Mengizinkan modul mengirim pengingat dan update aktifitas penting.',
    requiredBy: ['assistant', 'planner'],
  },
  network: {
    label: 'Jaringan',
    description: 'Memungkinkan modul terhubung ke layanan online bila dibutuhkan.',
    requiredBy: ['assistant'],
  },
}

export default function PermissionCenter({ permissions, modules, onPermissionChange }: PermissionCenterProps) {
  const permissionKeys: PermissionKey[] = ['localStorage', 'notifications', 'network']

  return (
    <section className="page-block">
      <div className="page-header">
        <div>
          <span className="eyebrow accent">PERMISSION CENTER</span>
          <h1>Kontrol izin modul</h1>
        </div>
      </div>

      <div className="permission-grid">
        {permissionKeys.map((key) => {
          const info = permissionMeta[key]
          const linkedModules = modules.filter((module) => module.permissions.includes(key) && module.installed)

          return (
            <article className="permission-card" key={key}>
              <div className="permission-header">
                <div>
                  <h3>{info.label}</h3>
                  <p>{info.description}</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={(event) => onPermissionChange(key, event.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="permission-footer">
                <span className={permissions[key] ? 'on-label' : 'off-label'}>
                  {permissions[key] ? 'Diizinkan' : 'Belum disetujui'}
                </span>
                <small>{linkedModules.length} modul terhubung</small>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
