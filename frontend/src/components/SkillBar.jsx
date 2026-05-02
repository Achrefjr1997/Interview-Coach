export default function SkillBar({ topic, score }) {
  const pct  = Math.round(score * 100)
  const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{topic.replace('_', ' ')}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: '4px', transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}
