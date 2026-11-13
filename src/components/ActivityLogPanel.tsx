import { Clock3 } from 'lucide-react'
import type { ActivityEntry } from '../types/axiom'

type ActivityLogPanelProps = {
  logs: ActivityEntry[]
}

export default function ActivityLogPanel({ logs }: ActivityLogPanelProps) {
  return (
    <section className="page-block">
      <div className="page-header">
        <div>
          <span className="eyebrow accent">ACTIVITY LOGS</span>
          <h1>Riwayat aktivitas sistem</h1>
        </div>
      </div>

      <div className="log-list">
        {logs.map((log) => (
          <article className="log-item" key={log.id}>
            <div className={`log-bullet ${log.severity}`} />
            <div className="log-copy">
              <div className="log-meta">
                <span className="log-type">{log.type}</span>
                <span className="log-time"><Clock3 size={12} /> {new Date(log.timestamp).toLocaleString('id-ID')}</span>
              </div>
              <p>{log.message}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
