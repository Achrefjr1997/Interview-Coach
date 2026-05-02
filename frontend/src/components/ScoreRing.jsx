export default function ScoreRing({ score, size = 120 }) {
  const pct    = Math.round(score * 100)
  const r      = (size - 16) / 2
  const circ   = 2 * Math.PI * r
  const offset = circ * (1 - score)
  const color  = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: color, fontSize: '1.4rem', fontWeight: 700 }}>
        {pct}%
      </text>
    </svg>
  )
}
