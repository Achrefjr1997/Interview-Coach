export default function ScoreRing({ score, size = 120 }) {
  const pct    = Math.round(score * 100)
  const r      = (size - 16) / 2
  const circ   = 2 * Math.PI * r
  const offset = circ * (1 - score)
  const color  = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: color, fontSize: '1.3rem', fontWeight: 700 }}>
        {pct}%
      </text>
    </svg>
  )
}
