export default function SkillBar({ topic, score }) {
  const pct  = Math.round(score * 100)
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{topic.replace('_', ' ')}</span>
        <span style={{ color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: '3px', transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}
