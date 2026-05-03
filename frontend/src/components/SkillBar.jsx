import { useState, useEffect } from 'react'

export default function SkillBar({ topic, score }) {
  const pct  = Math.round(score * 100)
  const color = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(id)
  }, [pct])

  return (
    <div style={{ marginBottom: '10px' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
        <span style={{ fontWeight: 500, textTransform: 'capitalize', color: 'var(--text-primary)' }}>{topic.replace('_', ' ')}</span>
        <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      <div style={{ height: '5px', background: 'var(--surface-raised)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`, background: color,
          borderRadius: '3px', transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}
