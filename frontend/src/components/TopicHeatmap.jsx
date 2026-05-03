function scoreColor(score) {
  if (score >= 0.85) return 'var(--green)'
  if (score >= 0.7) return '#34d399'
  if (score >= 0.5) return 'var(--amber)'
  if (score >= 0.35) return '#fb923c'
  return 'var(--red)'
}

export default function TopicHeatmap({ data }) {
  if (!data || data.length === 0) return null

  const maxSessions = Math.max(...data.map(d => d.scores.length))
  const cellSize = 36
  const gap = 4
  const labelWidth = 100
  const w = labelWidth + maxSessions * (cellSize + gap) + 20
  const h = data.length * (cellSize + gap) + 30

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      {Array.from({ length: maxSessions }, (_, i) => (
        <text key={i} x={labelWidth + i * (cellSize + gap) + cellSize / 2} y="16" textAnchor="middle" fontSize="10" fill="var(--text-muted)">S{i + 1}</text>
      ))}

      {data.map((topic, ti) => {
        const y = 30 + ti * (cellSize + gap)
        return (
          <g key={topic.topic}>
            <text x={labelWidth - 8} y={y + cellSize / 2 + 4} textAnchor="end" fontSize="11" fill="var(--text-primary)" fontWeight="500">{topic.topic}</text>
            {topic.scores.map((score, si) => (
              <rect
                key={si}
                x={labelWidth + si * (cellSize + gap)}
                y={y}
                width={cellSize}
                height={cellSize}
                rx="6"
                fill={scoreColor(score)}
                opacity={0.85}
              />
            ))}
          </g>
        )
      })}

      <g transform={`translate(${labelWidth}, ${h - 16})`}>
        {['0.3', '0.5', '0.7', '0.85'].map((threshold, i) => (
          <g key={threshold} transform={`translate(${i * 50}, 0)`}>
            <rect width="12" height="12" rx="3" fill={scoreColor(parseFloat(threshold))} />
            <text x="16" y="10" fontSize="9" fill="var(--text-muted)">{threshold}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}
