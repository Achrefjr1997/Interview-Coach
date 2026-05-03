const COLORS = {
  1: { bg: 'var(--surface-raised)', text: 'var(--text-secondary)', label: 'Entry' },
  2: { bg: 'rgba(124,92,252,0.15)', text: 'var(--accent)', label: 'Junior' },
  3: { bg: 'rgba(245,158,11,0.12)', text: 'var(--amber)', label: 'Mid' },
  4: { bg: 'rgba(239,68,68,0.12)', text: 'var(--red)', label: 'Senior' },
  5: { bg: 'rgba(239,68,68,0.18)', text: '#f87171', label: 'Staff' },
}

export default function DifficultyBadge({ level }) {
  const c = COLORS[level] || COLORS[1]
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '0.7rem', fontWeight: 600,
    }}>
      {level}/5 · {c.label}
    </span>
  )
}
