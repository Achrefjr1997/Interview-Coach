import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getReport, getAnalytics } from '../api'
import { cleanMath } from '../cleanMath'
import DifficultyBadge from '../components/DifficultyBadge'
import Spinner from '../components/Spinner'
import { ChevronDown, ChevronUp, ArrowLeft, FileText } from 'lucide-react'

export default function Replay() {
  const { sessionId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [expandedSections, setExpandedSections] = useState({})
  const [tab, setTab] = useState('replay')
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    getReport(sessionId)
      .then(r => { setReport(r.data); setCurrentIdx(0) })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    if (tab === 'context' && !analytics && !analyticsLoading) {
      setAnalyticsLoading(true)
      getAnalytics().then(r => setAnalytics(r.data)).catch(() => {}).finally(() => setAnalyticsLoading(false))
    }
  }, [tab])

  if (loading) return <Spinner />
  if (error) return (
    <div style={styles.page}>
      <div style={styles.container}>
        <p style={styles.error}>{error}</p>
        <Link to="/" style={styles.backLink}><ArrowLeft size={14} /> Dashboard</Link>
      </div>
    </div>
  )
  if (!report || !report.history || report.history.length === 0) return (
    <div style={styles.page}>
      <div style={{ ...styles.container, textAlign: 'center', paddingTop: '4rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1rem 0 0.5rem' }}>No Replay Data</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>This session has no Q&A history to replay.</p>
        <Link to="/" style={styles.backLink}><ArrowLeft size={14} /> Back to Dashboard</Link>
      </div>
    </div>
  )

  const history = report.history
  const current = history[currentIdx]
  const progress = ((currentIdx + 1) / history.length) * 100

  function toggleSection(key) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function goNext() { if (currentIdx < history.length - 1) setCurrentIdx(i => i + 1) }
  function goPrev() { if (currentIdx > 0) setCurrentIdx(i => i - 1) }

  const scoreColor = current.score >= 0.75 ? 'var(--green)' : current.score >= 0.5 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div>
            <p style={styles.heroSub}>Session Replay</p>
            <h1 style={styles.heroTitle}>{report.candidate_name}</h1>
            <p style={styles.heroRole}>{report.role}</p>
          </div>
          <Link to={`/report/${sessionId}`} style={styles.reportBtn}><FileText size={14} /> View Full Report</Link>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.tabBar}>
          <button onClick={() => setTab('replay')} style={{ ...styles.tab, ...(tab === 'replay' ? styles.tabActive : {}) }}>Replay</button>
          <button onClick={() => setTab('context')} style={{ ...styles.tab, ...(tab === 'context' ? styles.tabActive : {}) }}>Historical Context</button>
        </div>

        {tab === 'replay' && (
          <>
            <div style={styles.progressWrap}>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
              <div style={styles.progressText}>Question {currentIdx + 1} of {history.length}</div>
            </div>

            <div style={styles.timeline}>
              {history.map((h, i) => {
                const c = h.score >= 0.75 ? 'var(--green)' : h.score >= 0.5 ? 'var(--amber)' : 'var(--red)'
                return (
                  <button key={i} onClick={() => setCurrentIdx(i)} style={{
                    ...styles.dot,
                    background: i === currentIdx ? c : i < currentIdx ? c : 'var(--border)',
                    transform: i === currentIdx ? 'scale(1.3)' : 'scale(1)',
                  }} title={`Q${i + 1}: ${Math.round((h.score || 0) * 100)}%`} />
                )
              })}
            </div>

            <div style={styles.navRow}>
              <button onClick={goPrev} disabled={currentIdx === 0} style={{ ...styles.navBtn, opacity: currentIdx === 0 ? 0.3 : 1 }}>← Previous</button>
              <span style={styles.navLabel}>{current.topic?.replace('_', ' ')} · <DifficultyBadge level={current.difficulty || 1} /></span>
              <button onClick={goNext} disabled={currentIdx === history.length - 1} style={{ ...styles.navBtn, opacity: currentIdx === history.length - 1 ? 0.3 : 1 }}>Next →</button>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.qNum}>Q{currentIdx + 1}</span>
                <span style={{ ...styles.qScore, color: scoreColor }}>{Math.round((current.score || 0) * 100)}%</span>
              </div>
              <div style={styles.questionText}>
                <ReactMarkdown components={{
                  code({ children, className, ...props }) {
                    const inline = !className
                    if (inline) return <code style={styles.inlineCode} {...props}>{children}</code>
                    return <pre style={styles.codeBlock}><code className={className} {...props}>{children}</code></pre>
                  },
                  p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                  ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', margin: '4px 0' }}>{children}</ol>,
                  ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', margin: '4px 0' }}>{children}</ul>,
                  li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
                }}>{cleanMath(current.question)}</ReactMarkdown>
              </div>
            </div>

            <div style={styles.section}>
              <button style={styles.sectionBtn} onClick={() => toggleSection('answer')}>
                <span style={styles.sectionLabel}>Your Answer</span>
                {expandedSections.answer ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
              </button>
              {expandedSections.answer && (
                <div style={styles.sectionContent}>{current.candidate_answer || <em style={{ color: 'var(--text-muted)' }}>No answer provided</em>}</div>
              )}
            </div>

            <div style={styles.section}>
              <button style={styles.sectionBtn} onClick={() => toggleSection('expected')}>
                <span style={styles.sectionLabel}>Expected Answer</span>
                {expandedSections.expected ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
              </button>
              {expandedSections.expected && (
                <div style={styles.sectionModel}>{current.expected_answer || <em style={{ color: 'var(--text-muted)' }}>No model answer</em>}</div>
              )}
            </div>

            <div style={styles.section}>
              <button style={styles.sectionBtn} onClick={() => toggleSection('eval')}>
                <span style={styles.sectionLabel}>Evaluation</span>
                {expandedSections.eval ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
              </button>
              {expandedSections.eval && (
                <div style={styles.sectionContent}>
                  <p style={{ margin: '0 0 8px' }}>{current.score_rationale}</p>
                  {current.gaps?.length > 0 && (
                    <div>
                      <strong style={{ color: 'var(--red)', fontSize: '0.8rem' }}>Gaps:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{current.gaps.map((g, j) => <li key={j}>{g}</li>)}</ul>
                    </div>
                  )}
                  {current.strengths?.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong style={{ color: 'var(--green)', fontSize: '0.8rem' }}>Strengths:</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{current.strengths.map((s, j) => <li key={j}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'context' && analytics && (
          <>
            <div style={styles.contextCard}>
              <h3 style={styles.contextTitle}>Session vs. Your Average</h3>
              <div style={styles.contextGrid}>
                <ContextStat label="This Session" value={`${Math.round((report.overall_score || 0) * 100)}%`} highlight />
                <ContextStat label="Your Average" value={`${Math.round(analytics.stats.avg_score * 100)}%`} />
                <ContextStat label="Your Best" value={`${Math.round(analytics.stats.best_score * 100)}%`} />
                <ContextStat label="Sessions" value={analytics.stats.total_sessions} />
              </div>
            </div>

            <div style={styles.contextCard}>
              <h3 style={styles.contextTitle}>Topic Comparison</h3>
              <p style={styles.contextSub}>How this session compares to your historical averages</p>
              {Object.entries(report.skill_scores || {}).map(([topic, score]) => {
                const histTopic = analytics.topic_trends.find(t => t.topic === topic)
                const avg = histTopic ? histTopic.avg : null
                const diff = avg !== null ? score - avg : null
                const isAbove = diff !== null && diff > 0
                return (
                  <div key={topic} style={styles.contextRow}>
                    <span style={styles.contextTopic}>{topic}</span>
                    <span style={{ ...styles.contextScore, color: score >= 0.7 ? 'var(--green)' : score >= 0.5 ? 'var(--amber)' : 'var(--red)' }}>{Math.round(score * 100)}%</span>
                    {avg !== null && <span style={{ ...styles.contextDiff, color: isAbove ? 'var(--green)' : 'var(--red)' }}>{isAbove ? '↑' : '↓'} {Math.abs(Math.round(diff * 100))}% vs avg</span>}
                  </div>
                )
              })}
            </div>

            <div style={styles.contextCard}>
              <h3 style={styles.contextTitle}>Recurring Gaps</h3>
              <p style={styles.contextSub}>Gaps that appeared here and in other sessions</p>
              {(() => {
                const sessionGaps = history.flatMap(h => h.gaps || []).map(g => g.toLowerCase().trim())
                const gapCounts = {}
                sessionGaps.forEach(g => { gapCounts[g] = (gapCounts[g] || 0) + 1 })
                const recurring = Object.entries(gapCounts)
                  .map(([gap, count]) => ({ gap, count, isRecurring: analytics.gap_clusters.some(gc => gc.gap === gap) }))
                  .filter(g => g.isRecurring)
                  .sort((a, b) => b.count - a.count)
                if (recurring.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recurring gaps!</p>
                return recurring.map(g => (
                  <div key={g.gap} style={styles.gapRow}>
                    <span style={styles.gapName}>{g.gap}</span>
                    <span style={styles.gapBadge}>{g.count}× in this session</span>
                  </div>
                ))
              })()}
            </div>
          </>
        )}

        {tab === 'context' && analyticsLoading && <div style={styles.center}><Spinner /></div>}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/" style={styles.backLink}><ArrowLeft size={14} /> Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}

function ContextStat({ label, value, highlight }) {
  return (
    <div style={{ ...styles.contextStat, background: highlight ? 'rgba(124,92,252,0.1)' : 'var(--surface-raised)' }}>
      <div style={{ ...styles.contextStatValue, color: highlight ? 'var(--accent)' : 'var(--text-primary)' }}>{value}</div>
      <div style={styles.contextStatLabel}>{label}</div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  container: { maxWidth: '720px', margin: '0 auto', padding: '1.5rem' },

  hero: { background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 100%)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' },
  heroInner: { maxWidth: '720px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  heroSub: { margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  heroTitle: { margin: '4px 0 2px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' },
  heroRole: { margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' },
  reportBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface-raised)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border)', textDecoration: 'none' },

  tabBar: { display: 'flex', gap: '4px', marginBottom: '1.25rem' },
  tab: { padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, color: 'var(--text-secondary)' },
  tabActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },

  progressWrap: { marginBottom: '1rem' },
  progressTrack: { height: '3px', background: 'var(--surface-raised)', borderRadius: '2px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--accent)', borderRadius: '2px', transition: 'width 0.3s ease' },
  progressText: { fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' },

  timeline: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', transition: 'transform 0.15s ease, background 0.15s ease', padding: 0 },

  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  navBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 16px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500 },
  navLabel: { fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' },

  card: { background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '1rem', overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  qNum: { background: 'var(--accent)', color: '#fff', borderRadius: '6px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 },
  qScore: { fontWeight: 700, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' },
  questionText: { padding: '14px 16px', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.7 },
  inlineCode: { background: 'var(--surface-raised)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.85em', color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' },
  codeBlock: { background: '#0a0a14', color: 'var(--text-primary)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.775rem', lineHeight: 1.5, overflowX: 'auto', margin: '0.5rem 0', border: '1px solid var(--border)' },

  section: { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '8px', overflow: 'hidden' },
  sectionBtn: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  sectionLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  sectionContent: { padding: '0 16px 14px', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  sectionModel: { padding: '0 16px 14px', fontSize: '0.85rem', color: 'var(--green)', lineHeight: 1.6, background: 'rgba(0,214,143,0.06)', margin: '0 12px 12px', borderRadius: '10px', borderLeft: '3px solid var(--green)', whiteSpace: 'pre-wrap' },

  contextCard: { background: 'var(--surface)', borderRadius: '14px', padding: '1.25rem', border: '1px solid var(--border)', marginBottom: '1rem' },
  contextTitle: { margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' },
  contextSub: { margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' },
  contextGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
  contextStat: { borderRadius: '10px', padding: '12px', textAlign: 'center' },
  contextStatValue: { fontSize: '1.2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  contextStatLabel: { fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' },
  contextRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' },
  contextTopic: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' },
  contextScore: { fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' },
  contextDiff: { fontSize: '0.75rem', fontWeight: 600 },

  gapRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
  gapName: { fontSize: '0.85rem', color: 'var(--text-primary)' },
  gapBadge: { fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 },

  error: { color: 'var(--red)', fontSize: '1rem' },
  backLink: { color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' },
  center: { display: 'flex', justifyContent: 'center', padding: '2rem' },
}
