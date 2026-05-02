const COLORS = {
  1: { bg: '#f1f5f9', text: '#475569', label: 'Entry' },
  2: { bg: '#ede9fe', text: '#6d28d9', label: 'Junior' },
  3: { bg: '#fef3c7', text: '#92400e', label: 'Mid' },
  4: { bg: '#fee2e2', text: '#991b1b', label: 'Senior' },
  5: { bg: '#fce7f3', text: '#9d174d', label: 'Staff' },
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
