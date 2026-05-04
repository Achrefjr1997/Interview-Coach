import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, Scatter, ResponsiveContainer } from 'recharts'

export default function SkillEvolutionChart({ evolution }) {
  if (!evolution || evolution.length === 0) return null

  const data = evolution.map((snap, i) => ({
    attempt: i + 1,
    score: Math.round(snap.score * 100),
    ema: snap.ema_after != null ? Math.round(snap.ema_after * 100) : null,
    difficulty: snap.difficulty,
    date: snap.recorded_at ? new Date(snap.recorded_at).toLocaleDateString() : '—',
  }))

  return (
    <div style={styles.wrapper}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <XAxis dataKey="attempt" label={{ value: 'Attempt', position: 'insideBottom', offset: -4, style: { fontSize: 10, fill: 'var(--text-muted)' } }} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-primary)' }}
            formatter={(value, name) => [value != null ? `${value}%` : '—', name === 'ema' ? 'EMA' : 'Score']}
          />
          <ReferenceLine y={65} stroke="#EF9F27" strokeDasharray="4 4" strokeWidth={1} />
          <Scatter dataKey="score" fill="#7C5CFC" opacity={0.5} r={4} name="Score" />
          <Line type="monotone" dataKey="ema" stroke="#00D68F" strokeWidth={2} dot={false} name="EMA" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const styles = {
  wrapper: { marginTop: '8px', padding: '12px', background: 'var(--surface-raised)', borderRadius: '10px', border: '1px solid var(--border)' },
}
