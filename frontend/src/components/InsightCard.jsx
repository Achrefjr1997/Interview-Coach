import { Trophy, BarChart2, Lightbulb } from 'lucide-react'

const ICONS = {
  strength: Trophy,
  pattern: BarChart2,
  recommendation: Lightbulb,
}

export default function InsightCard({ type, title, description }) {
  const Icon = ICONS[type] || Lightbulb
  const borderColor = type === 'strength' ? 'var(--green)' : type === 'pattern' ? 'var(--accent)' : 'var(--amber)'
  const bgColor = type === 'strength' ? 'rgba(0,214,143,0.06)' : type === 'pattern' ? 'rgba(124,92,252,0.06)' : 'rgba(245,158,11,0.06)'

  return (
    <div style={{ ...styles.card, borderLeftColor: borderColor, background: bgColor }}>
      <div style={styles.icon}><Icon size={18} color={borderColor} /></div>
      <div style={styles.content}>
        <h4 style={styles.title}>{title}</h4>
        <p style={styles.desc}>{description}</p>
      </div>
    </div>
  )
}

const styles = {
  card: { display: 'flex', gap: '12px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', borderLeftWidth: '4px', marginBottom: '10px' },
  icon: { display: 'flex', alignItems: 'flex-start', paddingTop: '2px' },
  content: { flex: 1 },
  title: { margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' },
  desc: { margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 },
}
