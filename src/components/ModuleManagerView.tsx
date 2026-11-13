import { useMemo, useState } from 'react'
import { CheckCircle2, Search, ShieldCheck, Trash2, Zap } from 'lucide-react'
import type { ModuleRecord } from '../types/axiom'

type ModuleManagerViewProps = {
  modules: ModuleRecord[]
  onInstall: (moduleId: string) => void
  onRemove: (moduleId: string) => void
  onToggle: (moduleId: string) => void
  onSelect: (moduleId: string) => void
}

export default function ModuleManagerView({
  modules,
  onInstall,
  onRemove,
  onToggle,
  onSelect,
}: ModuleManagerViewProps) {
  const [query, setQuery] = useState('')

  const visibleModules = useMemo(
    () =>
      modules.filter((module) => `${module.name} ${module.description}`.toLowerCase().includes(query.toLowerCase())),
    [modules, query]
  )

  return (
    <section className="page-block">
      <div className="page-header">
        <div>
          <span className="eyebrow accent">MODULE MANAGER</span>
          <h1>Kelola modul AXIOM</h1>
        </div>
      </div>

      <div className="toolbar-row">
        <label className="searchbox compact">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari modul..." />
        </label>
        <span className="meta-pill">{visibleModules.length} modul</span>
      </div>

      <div className="module-grid">
        {visibleModules.map((module) => (
          <article className="module-card" key={module.id}>
            <div className="module-card-header">
              <div className="module-icon-wrap">
                <module.icon size={18} />
              </div>
              <span className={`status-badge ${module.installed ? 'active' : 'planned'}`}>
                {module.id === 'core' ? 'CORE AKTIF' : module.installed ? 'TERPASANG' : 'BELUM DIPASANG'}
              </span>
            </div>

            <div className="module-card-body">
              <h3>{module.name}</h3>
              <p>{module.description}</p>
              <div className="module-meta-row">
                <span>v{module.version}</span>
                <span>{module.category}</span>
              </div>
            </div>

            <div className="module-card-actions">
              <button type="button" className="ghost-btn" onClick={() => onSelect(module.id)}>
                <ShieldCheck size={14} /> Detail
              </button>

              {module.id !== 'core' && (
                <>
                  {!module.installed ? (
                    <button type="button" className="primary-btn small" onClick={() => onInstall(module.id)}>
                      <CheckCircle2 size={14} /> Pasang
                    </button>
                  ) : (
                    <button type="button" className="secondary-btn small" onClick={() => onToggle(module.id)}>
                      <Zap size={14} /> {module.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  )}

                  {module.installed && (
                    <button type="button" className="danger-btn small" onClick={() => onRemove(module.id)}>
                      <Trash2 size={14} /> Hapus
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
