import { Activity, Cpu, ShieldCheck, Sparkles } from 'lucide-react'
import MetricCard from './MetricCard'
import type { AxiomState } from '../types/axiom'

type CoreDashboardProps = {
  state: AxiomState
  onOpenView: (view: 'dashboard' | 'modules' | 'permissions' | 'logs' | 'settings') => void
  onSelectModule: (moduleId: string) => void
}

export default function CoreDashboard({ state, onOpenView, onSelectModule }: CoreDashboardProps) {
  const installed = state.modules.filter((module) => module.installed).length
  const active = state.modules.filter((module) => module.installed && module.enabled).length
  const inactive = installed - active
  const latestLogs = state.logs.slice(0, 4)
  const installedModules = state.modules.filter((module) => module.installed).slice(0, 3)

  return (
    <section className="page-block">
      <div className="page-header">
        <div>
          <span className="eyebrow accent">AXIOM CORE</span>
          <h1>Core Dashboard</h1>
        </div>
        <button type="button" className="primary-btn" onClick={() => onOpenView('modules')}>
          Kelola modul
        </button>
      </div>

      <div className="stats-grid">
        <MetricCard label="MODUL TERPASANG" value={String(installed)} note="Semua modul yang aktif di sistem" />
        <MetricCard label="MODUL AKTIF" value={String(active)} note="Modul siap digunakan" />
        <MetricCard label="MODUL NONAKTIF" value={String(inactive)} note="Modul tertahan atau belum diaktifkan" />
      </div>

      <div className="dashboard-grid">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Status AXIOM CORE</h3>
            <span className="live-pill">CORE ONLINE</span>
          </div>
          <ul className="status-list">
            <li><Cpu size={14} /> Sistem inti online</li>
            <li><ShieldCheck size={14} /> Izin pengguna dalam kendali aktif</li>
            <li><Activity size={14} /> Penyimpanan persisten aktif</li>
          </ul>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Modul aktif</h3>
            <button type="button" className="link-btn" onClick={() => onOpenView('modules')}>Lihat semua</button>
          </div>
          <div className="mini-list">
            {installedModules.map((module) => (
              <button type="button" className="mini-item" key={module.id} onClick={() => onSelectModule(module.id)}>
                <span className="mini-label"><module.icon size={14} /> {module.name}</span>
                <span className="mini-status">{module.enabled ? 'Aktif' : 'Nonaktif'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-card wide-panel">
        <div className="panel-header">
          <h3>Riwayat aktivitas</h3>
          <button type="button" className="link-btn" onClick={() => onOpenView('logs')}>Lihat log</button>
        </div>
        <div className="log-preview">
          {latestLogs.map((log) => (
            <div className="preview-log" key={log.id}>
              <span className={`dot ${log.severity}`} />
              <div>
                <strong>{log.type}</strong>
                <p>{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="callout-box">
        <Sparkles size={16} />
        <span>
          AXIOM OS dirancang berkembang sebagai platform modular, dengan keputusan akses tetap di tangan pengguna.
        </span>
      </div>
    </section>
  )
}
