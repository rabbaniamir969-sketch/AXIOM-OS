type Props = { label: string; value: string; note: string }
export default function MetricCard({ label, value, note }: Props) {
  return <article className="metric-card"><span className="eyebrow">{label}</span><strong>{value}</strong><small>{note}</small></article>
}
