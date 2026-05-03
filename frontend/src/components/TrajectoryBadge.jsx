const TRAJECTORY_CONFIG = {
  improving: { label: 'Improving', color: 'var(--green)', bg: 'rgba(0,214,143,0.1)', icon: '↑' },
  plateauing: { label: 'Plateauing', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '→' },
  declining: { label: 'Declining', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', icon: '↓' },
  insufficient_data: { label: 'More Data Needed', color: 'var(--text-muted)', bg: 'var(--surface-raised)', icon: '⋯' },
}

export default function TrajectoryBadge({ trajectory }) {
  const config = TRAJECTORY_CONFIG[trajectory] || TRAJECTORY_CONFIG.insufficient_data

  return (
    <span style={{ ...styles.badge, color: config.color, background: config.bg }}>
      <span style={styles.icon}>{config.icon}</span>
      {config.label}
    </span>
  )
}

const styles = {
  badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 },
  icon: { fontSize: '0.9rem' },
}
