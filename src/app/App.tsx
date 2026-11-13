
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  BellRing,
  ChevronRight,
  Command,
  FileText,
  Grid2X2,
  LayoutDashboard,
  Layers3,
  Menu,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import AndroidPushCenter from '../components/AndroidPushCenter'
import ActivityLogPanel from '../components/ActivityLogPanel'
import AccountPanel from '../components/AccountPanel'
import CoreDashboard from '../components/CoreDashboard'
import CoreSettingsPanel from '../components/CoreSettingsPanel'
import ModuleManagerView from '../components/ModuleManagerView'
import PermissionCenter from '../components/PermissionCenter'
import WebPushCenter from '../components/WebPushCenter'
import { installAndroidPushListeners, supportsAndroidPush } from '../services/androidPush'
import { useAxiomAuth } from '../hooks/useAxiomAuth'
import { useAxiomCore } from '../hooks/useAxiomCore'
import type { AxiomView } from '../types/axiom'

type NavGroup = {
  title: string
  items: Array<{ id: AxiomView; label: string; icon: typeof Grid2X2 }>
}

const navGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'modules', label: 'Module Manager', icon: Layers3 },
    ],
  },
  {
    title: 'Manajemen',
    items: [
      { id: 'permissions', label: 'Permission Center', icon: ShieldCheck },
      { id: 'logs', label: 'Activity Logs', icon: FileText },
    ],
  },
  {
    title: 'Akun',
    items: [
      { id: 'profile', label: 'Profil Pengguna', icon: UserRound },
      { id: 'notifications', label: 'Notifikasi', icon: BellRing },
    ],
  },
  {
    title: 'Pengaturan',
    items: [{ id: 'settings', label: 'Core Settings', icon: Settings2 }],
  },
]

const pageTitles: Record<AxiomView, string> = {
  dashboard: 'Dashboard',
  modules: 'Module Manager',
  details: 'Module Details',
  permissions: 'Permission Center',
  logs: 'Activity Logs',
  settings: 'Core Settings',
  profile: 'Profil Pengguna',
  notifications: 'Notifikasi',
}

export default function App() {
  const auth = useAxiomAuth()
  const {
    state,
    syncError,
    pushError,
    installModule,
    removeModule,
    toggleModule,
    updatePermission,
    updateCoreSetting,
  } = useAxiomCore(auth.user?.id, auth.loading)
  const [view, setView] = useState<AxiomView>('dashboard')
  const [selectedModuleId, setSelectedModuleId] = useState<string>(state.modules[0]?.id ?? 'core')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [nativePushError, setNativePushError] = useState('')

  const selectedModule = useMemo(
    () => state.modules.find((module) => module.id === selectedModuleId) ?? state.modules[0] ?? null,
    [selectedModuleId, state.modules]
  )
  const activeModuleCount = state.modules.filter((module) => module.installed && module.enabled).length
  const installedModuleCount = state.modules.filter((module) => module.installed).length
  const approvedPermissionCount = Object.values(state.permissions).filter(Boolean).length

  const syncRoute = () => {
    const hash = window.location.hash.replace('#', '').trim()
    const validViews: AxiomView[] = ['dashboard', 'modules', 'details', 'permissions', 'logs', 'settings', 'profile', 'notifications']

    if (validViews.includes(hash as AxiomView)) {
      setView(hash as AxiomView)
      return
    }

    window.location.hash = 'dashboard'
    setView('dashboard')
  }

  useEffect(() => {
    syncRoute()
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)

    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    let active = true
    let removeListeners: (() => Promise<void>) | undefined

    void installAndroidPushListeners(setNativePushError).then((cleanup) => {
      if (active) removeListeners = cleanup
      else void cleanup()
    }).catch((error: unknown) => {
      if (active) setNativePushError(error instanceof Error ? error.message : 'Gagal menyiapkan notifikasi Android.')
    })

    return () => {
      active = false
      if (removeListeners) {
        void removeListeners().catch((error: unknown) => {
          setNativePushError(error instanceof Error ? error.message : 'Gagal melepas listener notifikasi Android.')
        })
      }
    }
  }, [])

  useEffect(() => {
    if (view === 'details' && selectedModuleId === '') {
      setSelectedModuleId(state.modules[0]?.id ?? 'core')
    }
  }, [view, selectedModuleId, state.modules])

  const navigate = (nextView: AxiomView) => {
    setView(nextView)
    setMobileOpen(false)
    window.history.pushState(null, '', `#${nextView}`)
  }

  const openModuleDetails = (moduleId: string) => {
    setSelectedModuleId(moduleId)
    setView('details')
    setMobileOpen(false)
    window.history.pushState(null, '', '#details')
  }

  const currentTitle = view === 'details' && selectedModule ? selectedModule.name : pageTitles[view]

  return (
    <div className="axiom-app-shell">
      <div className={`axiom-backdrop ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`axiom-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="axiom-sidebar-header">
          <div className="axiom-brand">
            <div className="axiom-brand-mark">
              <Command size={22} />
            </div>
            <div>
              <strong>AXIOM</strong>
              <span>OS</span>
            </div>
          </div>

          <button type="button" className="axiom-icon-button sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <nav className="axiom-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.title} className="axiom-nav-group">
              <span className="axiom-nav-label">{group.title}</span>

              {group.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`axiom-nav-item ${view === id ? 'active' : ''}`}
                  onClick={() => navigate(id)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="axiom-sidebar-footer">
          <div className="axiom-mini-card">
            <ShieldCheck size={16} />
            <div>
              <strong>Status perangkat</strong>
              <small>AXIOM Core berjalan</small>
            </div>
          </div>
        </div>
      </aside>

      <main className={`axiom-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <header className="axiom-topbar">
          <div className="axiom-topbar-left">
            <button type="button" className="axiom-icon-button menu-button" onClick={() => setMobileOpen((value) => !value)}>
              <Menu size={18} />
            </button>

            <button type="button" className="axiom-icon-button desktop-toggle" onClick={() => setSidebarOpen((value) => !value)}>
              <Grid2X2 size={16} />
            </button>

            <div className="axiom-breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{currentTitle}</strong>
            </div>
          </div>

          <div className="axiom-topbar-right">
            <span className="axiom-live-pill"><i /> Core aktif</span>
            <button type="button" className="axiom-icon-button" aria-label="Notifikasi" onClick={() => navigate('notifications')}>
              <Bell size={17} />
            </button>
            <button type="button" className="axiom-user-pill" aria-label="Buka profil pengguna" onClick={() => navigate('profile')}>
              {auth.user?.email?.slice(0, 1).toUpperCase() ?? 'L'}
            </button>
          </div>
        </header>

        <div className="axiom-page-shell">
          {syncError && (
            <div className="system-feedback error" role="status">
              Gagal menyinkronkan data akun: {syncError}
            </div>
          )}

          {view === 'dashboard' && <CoreDashboard state={state} onOpenView={navigate} onSelectModule={openModuleDetails} />}

          {view === 'modules' && (
            <ModuleManagerView
              modules={state.modules}
              onInstall={installModule}
              onRemove={removeModule}
              onToggle={toggleModule}
              onSelect={openModuleDetails}
            />
          )}

          {view === 'details' && selectedModule && (
            <section className="page-block detail-page">
              <div className="page-header">
                <div>
                  <span className="eyebrow accent">MODULE DETAILS</span>
                  <h1>{selectedModule.name}</h1>
                </div>
                <button type="button" className="primary-btn" onClick={() => navigate('modules')}>
                  <ArrowLeft size={15} /> Kembali
                </button>
              </div>

              <div className="detail-hero">
                <div className="module-icon-wrap large">
                  <selectedModule.icon size={28} />
                </div>
                <div className="detail-copy">
                  <p>{selectedModule.description}</p>
                  <div className="meta-row">
                    <span className={`status-badge ${selectedModule.enabled ? 'active' : 'planned'}`}>
                      {selectedModule.enabled ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                    <span className="meta-pill">v{selectedModule.version}</span>
                    <span className="meta-pill">{selectedModule.category}</span>
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                <div className="panel-card">
                  <h3>Informasi modul</h3>
                  <dl className="detail-list">
                    <div>
                      <dt>ID</dt>
                      <dd>{selectedModule.id}</dd>
                    </div>
                    <div>
                      <dt>Versi</dt>
                      <dd>{selectedModule.version}</dd>
                    </div>
                    <div>
                      <dt>Instalasi</dt>
                      <dd>{selectedModule.installed ? 'Terpasang' : 'Belum dipasang'}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedModule.enabled ? 'Aktif' : 'Nonaktif'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="panel-card">
                  <h3>Kompatibilitas & Izin</h3>
                  <dl className="detail-list">
                    <div>
                      <dt>Versi minimum</dt>
                      <dd>{selectedModule.compatibility.minCoreVersion}</dd>
                    </div>
                    <div>
                      <dt>Platform</dt>
                      <dd>{selectedModule.compatibility.platforms.join(', ')}</dd>
                    </div>
                    <div>
                      <dt>Izin</dt>
                      <dd>{selectedModule.permissions.join(', ')}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {selectedModule.id === 'core' ? (
              <div className="callout-box">
                <ShieldCheck size={16} />
                <span>Modul inti AXIOM CORE selalu aktif dan tidak dapat dihapus.</span>
              </div>
              ) : (
              <div className="detail-actions">
                <button
                  type="button"
                  className={selectedModule.enabled ? 'secondary-btn' : 'primary-btn'}
                  onClick={() => toggleModule(selectedModule.id)}
                >
                  {selectedModule.enabled ? 'Nonaktifkan modul' : 'Aktifkan modul'}
                </button>

                {selectedModule.installed ? (
                  <button type="button" className="danger-btn" onClick={() => removeModule(selectedModule.id)}>
                    Hapus modul
                  </button>
                ) : (
                  <button type="button" className="primary-btn" onClick={() => installModule(selectedModule.id)}>
                    Pasang modul
                  </button>
                )}
              </div>
              )}
            </section>
          )}

          {view === 'permissions' && (
            <PermissionCenter permissions={state.permissions} modules={state.modules} onPermissionChange={updatePermission} />
          )}

          {view === 'logs' && <ActivityLogPanel logs={state.logs} />}

          {view === 'settings' && <CoreSettingsPanel settings={state.settings} onSettingChange={updateCoreSetting} />}

          {view === 'profile' && (
            <section className="page-block profile-page">
              <div className="page-header">
                <div>
                  <span className="eyebrow accent">PROFILE</span>
                  <h1>Profil Pengguna</h1>
                </div>
              </div>
              <AccountPanel
                user={auth.user}
                loading={auth.loading}
                configured={auth.configured}
                error={auth.error}
                onSignIn={auth.signIn}
                onSignUp={auth.signUp}
                onSignOut={auth.signOut}
              />
              {auth.user && (
                <div className="panel-card quick-metrics">
                  <div className="metric-mini">
                    <strong>{activeModuleCount}</strong>
                    <span>Modul aktif</span>
                  </div>
                  <div className="metric-mini">
                    <strong>{approvedPermissionCount}</strong>
                    <span>Izin disetujui</span>
                  </div>
                  <div className="metric-mini">
                    <strong>{installedModuleCount}</strong>
                    <span>Modul terpasang</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {view === 'notifications' && (
            <section className="page-block notification-page">
              <div className="page-header">
                <div>
                  <span className="eyebrow accent">ALERTS</span>
                  <h1>Notifikasi</h1>
                </div>
              </div>

              {supportsAndroidPush() ? (
                <AndroidPushCenter
                  user={auth.user}
                  pushNotifications={state.settings.pushNotifications}
                  onPreferenceChange={(enabled) => updateCoreSetting('pushNotifications', enabled)}
                />
              ) : (
                <WebPushCenter
                  user={auth.user}
                  pushNotifications={state.settings.pushNotifications}
                  onPreferenceChange={(enabled) => updateCoreSetting('pushNotifications', enabled)}
                />
              )}

              {(pushError || nativePushError) && (
                <div className="system-feedback error" role="status">{pushError || nativePushError}</div>
              )}

              <div className="panel-card notification-card">
                <h3>Aktivitas terbaru</h3>
                {state.logs.length > 0 ? (
                  <div className="notification-list">
                    {state.logs.slice(0, 6).map((log) => (
                    <div key={log.id} className={`notification-item ${log.severity}`}>
                      <div className="notification-dot" />
                      <div className="notification-copy">
                        <strong>{log.type}</strong>
                        <p>{log.message}</p>
                      </div>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    ))}
                  </div>
                ) : (
                  <p className="push-state">Belum ada aktivitas.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
