const COLORS = ['var(--accent)', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#e0e7ff', '#c7d2fe', '#a5b4fc']

export default function GapChart({ data }) {
  if (!data || data.length === 0) return (
    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No gaps recorded yet</p>
  )

  const maxCount = Math.max(...data.map(d => d.count))
  const barHeight = 28
  const labelWidth = 120
  const chartWidth = 400
  const totalWidth = labelWidth + chartWidth + 20
  const totalHeight = data.length * (barHeight + 8) + 10

  return (
    <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} style={{ width: '100%', height: 'auto' }}>
      {data.map((gap, i) => {
        const y = i * (barHeight + 8)
        const barW = (gap.count / maxCount) * chartWidth
        const color = COLORS[i % COLORS.length]
        return (
          <g key={gap.gap}>
            <text x={labelWidth - 8} y={y + barHeight / 2 + 4} textAnchor="end" fontSize="11" fill="var(--text-primary)">{gap.gap}</text>
            <rect x={labelWidth} y={y} width={barW} height={barHeight} rx="6" fill={color} opacity="0.85" />
            <text x={labelWidth + barW + 8} y={y + barHeight / 2 + 4} fontSize="11" fill="var(--text-secondary)" fontWeight="500">{gap.count}× ({Math.round(gap.frequency * 100)}%)</text>
          </g>
        )
      })}
    </svg>
  )
}
