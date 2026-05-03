const COLORS = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--red)', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function TrendLine({ data, height = 200 }) {
  if (!data || data.length === 0) return null

  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const w = 600 - padding.left - padding.right
  const h = height - padding.top - padding.bottom

  const allScores = data.flatMap(d => d.scores)
  const minScore = Math.min(...allScores, 0)
  const maxScore = Math.max(...allScores, 1)
  const range = maxScore - minScore || 1

  const xStep = data[0]?.scores.length > 1 ? w / (data[0].scores.length - 1) : w / 2

  const toX = (i) => padding.left + i * xStep
  const toY = (v) => padding.top + h - ((v - minScore) / range) * h

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * 100))

  return (
    <svg viewBox={`0 0 600 ${height}`} style={{ width: '100%', height: 'auto' }}>
      {yTicks.map((tick) => {
        const y = toY(tick / 100)
        return (
          <g key={tick}>
            <line x1={padding.left} y1={y} x2={600 - padding.right} y2={y} stroke="var(--border)" strokeDasharray="4,4" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{tick}%</text>
          </g>
        )
      })}

      {data.map((topic, ti) => {
        const color = COLORS[ti % COLORS.length]
        const points = topic.scores.map((s, i) => `${toX(i)},${toY(s)}`).join(' ')
        return (
          <g key={topic.topic}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {topic.scores.map((s, i) => (
              <circle key={i} cx={toX(i)} cy={toY(s)} r="4" fill={color} stroke="var(--bg)" strokeWidth="2" />
            ))}
          </g>
        )
      })}

      {data.map((topic, ti) => {
        const x = padding.left + ti * 90
        const y = height - 8
        const color = COLORS[ti % COLORS.length]
        return (
          <g key={topic.topic}>
            <rect x={x} y={y - 8} width="10" height="10" rx="2" fill={color} />
            <text x={x + 14} y={y} fontSize="10" fill="var(--text-secondary)">{topic.topic}</text>
          </g>
        )
      })}
    </svg>
  )
}
