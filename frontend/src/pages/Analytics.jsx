import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics } from '../api'
import TrendLine from '../components/TrendLine'
import TopicHeatmap from '../components/TopicHeatmap'
import GapChart from '../components/GapChart'
import InsightCard from '../components/InsightCard'
import TrajectoryBadge from '../components/TrajectoryBadge'
import Spinner from '../components/Spinner'
import { ArrowLeft, TrendingUp, Grid, AlertTriangle, Lightbulb } from 'lucide-react'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('trends')

  useEffect(() => {
    getAnalytics()
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.center}><Spinner /></div>
  if (error) return (
    <div style={{ ...styles.center, gap: '1.5rem' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No Analytics Yet</h2>
      <p style={styles.error}>{error}</p>
      <Link to="/" style={styles.link}><ArrowLeft size={14} /> Back to Dashboard</Link>
    </div>
  )
  if (!data) return null

  const { trajectory, stats, topic_trends, gap_clusters, difficulty_progression, sessions } = data
  const insights = generateInsights(data)

  const tabs = [
    { id: 'trends', label: 'Trends', icon: <TrendingUp size={14} /> },
    { id: 'heatmap', label: 'Heatmap', icon: <Grid size={14} /> },
    { id: 'gaps', label: 'Gaps', icon: <AlertTriangle size={14} /> },
    { id: 'insights', label: 'Insights', icon: <Lightbulb size={14} /> },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div>
            <Link to="/" style={styles.backBtn}><ArrowLeft size={14} /> Dashboard</Link>
            <p style={styles.heroSub}>Learning Analytics</p>
            <h1 style={styles.heroTitle}>Your Progress Journey</h1>
            <TrajectoryBadge trajectory={trajectory} />
          </div>
          <div style={styles.statsRow}>
            <StatCard label="Sessions" value={stats.total_sessions} />
            <StatCard label="Avg Score" value={`${Math.round(stats.avg_score * 100)}%`} />
            <StatCard label="Best Score" value={`${Math.round(stats.best_score * 100)}%`} />
            {stats.velocity !== null && (
              <StatCard label="Velocity" value={`${stats.velocity > 0 ? '+' : ''}${stats.velocity}%`} highlight={stats.velocity > 0} />
            )}
          </div>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.tabBar}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'trends' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Score Trends Over Time</h3>
            <TrendLine data={topic_trends} />
            <div style={styles.trendSummary}>
              {topic_trends.map(t => (
                <div key={t.topic} style={styles.trendItem}>
                  <span style={styles.trendTopic}>{t.topic}</span>
                  <span style={{ ...styles.trendBadge, color: t.trend === 'improving' ? 'var(--green)' : t.trend === 'declining' ? 'var(--red)' : 'var(--amber)' }}>
                    {t.trend} ({t.latest > t.avg ? '↑' : '↓'} {Math.round(t.latest * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'heatmap' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Topic Performance Heatmap</h3>
            <p style={styles.cardSub}>S1 = earliest session, Sn = latest</p>
            <TopicHeatmap data={topic_trends} />
          </div>
        )}

        {tab === 'gaps' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Most Common Gaps</h3>
            <p style={styles.cardSub}>Areas that appeared across multiple sessions</p>
            <GapChart data={gap_clusters} />
          </div>
        )}

        {tab === 'insights' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>AI-Generated Insights</h3>
            <p style={styles.cardSub}>Patterns detected from {stats.total_sessions} sessions</p>
            {insights.map((insight, i) => (
              <InsightCard key={i} type={insight.type} title={insight.title} description={insight.desc} />
            ))}
          </div>
        )}

        {/* Session History Table */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Session History</h3>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={{ flex: 2 }}>Session</span>
              <span style={{ flex: 1 }}>Role</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Score</span>
              <span style={{ flex: 1, textAlign: 'right' }}>Date</span>
              <span style={{ flex: 0.5, textAlign: 'right' }}></span>
            </div>
            {sessions.slice().reverse().map(s => (
              <div key={s.session_id} style={styles.tableRow}>
                <span style={{ flex: 2, fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s.candidate_name}</span>
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.role}</span>
                <span style={{ ...styles.scoreCell, color: s.overall_score >= 0.7 ? 'var(--green)' : s.overall_score >= 0.5 ? 'var(--amber)' : 'var(--red)' }}>
                  {s.overall_score ? `${Math.round(s.overall_score * 100)}%` : '—'}
                </span>
                <span style={{ flex: 1, textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
                <span style={{ flex: 0.5, textAlign: 'right' }}>
                  <Link to={`/report/${s.session_id}`} style={styles.viewLink}>View</Link>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statValue, color: highlight ? 'var(--green)' : 'var(--text-primary)' }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )
}

function generateInsights(data) {
  const { topic_trends, gap_clusters, stats, difficulty_progression } = data
  const insights = []

  const strongest = [...topic_trends].sort((a, b) => b.latest - a.latest)[0]
  if (strongest && strongest.latest >= 0.7) {
    insights.push({ type: 'strength', title: 'Strong Area', desc: `You excel at ${strongest.topic} with a score of ${Math.round(strongest.latest * 100)}%.` })
  }

  const weakest = [...topic_trends].sort((a, b) => a.latest - b.latest)[0]
  if (weakest && weakest.latest < 0.5) {
    insights.push({ type: 'pattern', title: 'Needs Attention', desc: `${weakest.topic} remains your weakest area at ${Math.round(weakest.latest * 100)}%. Consider focused practice.` })
  }

  const improving = topic_trends.filter(t => t.trend === 'improving')
  if (improving.length > 0) {
    const best = improving.sort((a, b) => b.slope - a.slope)[0]
    insights.push({ type: 'strength', title: 'Fastest Improvement', desc: `Your ${best.topic} skills improved most rapidly (slope: ${best.slope.toFixed(3)}).` })
  }

  if (gap_clusters.length > 0) {
    const topGap = gap_clusters[0]
    insights.push({ type: 'pattern', title: 'Recurring Gap', desc: `"${topGap.gap}" appeared in ${Math.round(topGap.frequency * 100)}% of your sessions.` })
  }

  if (difficulty_progression.length >= 3) {
    const early = difficulty_progression.slice(0, Math.ceil(difficulty_progression.length / 2))
    const late = difficulty_progression.slice(-Math.ceil(difficulty_progression.length / 2))
    const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length
    const lateAvg = late.reduce((a, b) => a + b, 0) / late.length
    if (lateAvg > earlyAvg) {
      insights.push({ type: 'strength', title: 'Difficulty Growth', desc: `You've progressed from avg difficulty ${earlyAvg.toFixed(1)} to ${lateAvg.toFixed(1)}.` })
    }
  }

  if (weakest && weakest.latest < 0.6) {
    insights.push({ type: 'recommendation', title: 'Practice Suggestion', desc: `Focus your next sessions on ${weakest.topic} to build confidence.` })
  }

  if (stats.velocity !== null && stats.velocity > 10) {
    insights.push({ type: 'strength', title: 'Learning Velocity', desc: `You're improving at ${stats.velocity}% — keep up the momentum!` })
  }

  return insights
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' },
  error: { color: 'var(--red)', fontWeight: 500 },
  link: { fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' },

  hero: { background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 100%)', padding: '2rem', borderBottom: '1px solid var(--border)' },
  heroInner: { maxWidth: '900px', margin: '0 auto' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px', textDecoration: 'none' },
  heroSub: { margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  heroTitle: { margin: '4px 0 12px', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' },
  statsRow: { display: 'flex', gap: '10px', marginTop: '1.5rem', flexWrap: 'wrap' },
  statCard: { background: 'var(--surface-raised)', borderRadius: '12px', padding: '10px 16px', minWidth: '90px', border: '1px solid var(--border)' },
  statValue: { fontSize: '1.2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  statLabel: { fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' },

  container: { maxWidth: '900px', margin: '0 auto', padding: '2rem' },

  tabBar: { display: 'flex', gap: '4px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' },
  tabActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },

  card: { background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1.25rem' },
  cardTitle: { margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' },
  cardSub: { margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' },

  trendSummary: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1rem' },
  trendItem: { display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-raised)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid var(--border)' },
  trendTopic: { fontWeight: 600, color: 'var(--text-primary)' },
  trendBadge: { fontWeight: 600, fontSize: '0.75rem' },

  table: { display: 'flex', flexDirection: 'column', gap: '4px' },
  tableHeader: { display: 'flex', padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },
  tableRow: { display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' },
  scoreCell: { flex: 1, textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' },
  viewLink: { fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 },
}
