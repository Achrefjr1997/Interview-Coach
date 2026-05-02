import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getReport } from '../api'
import { cleanMath } from '../cleanMath'
import DifficultyBadge from '../components/DifficultyBadge'
import Spinner from '../components/Spinner'

export default function Replay() {
  const { sessionId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [expandedSections, setExpandedSections] = useState({})

  useEffect(() => {
    getReport(sessionId)
      .then(r => {
        setReport(r.data)
        setCurrentIdx(0)
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <Spinner />
  if (error) return (
    <div style={styles.page}>
      <div style={styles.container}>
        <p style={styles.error}>{error}</p>
        <Link to="/" style={styles.backLink}>← Dashboard</Link>
      </div>
    </div>
  )
  if (!report || !report.history || report.history.length === 0) return null

  const history = report.history
  const current = history[currentIdx]
  const progress = ((currentIdx + 1) / history.length) * 100

  function toggleSection(key) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function goNext() {
    if (currentIdx < history.length - 1) setCurrentIdx(i => i + 1)
  }
  function goPrev() {
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  const scoreColor = current.score >= 0.75 ? '#10b981' : current.score >= 0.5 ? '#f59e0b' : '#ef4444'

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div>
            <p style={styles.heroSub}>Session Replay</p>
            <h1 style={styles.heroTitle}>{report.candidate_name}</h1>
            <p style={styles.heroRole}>{report.role}</p>
          </div>
          <Link to={`/report/${sessionId}`} style={styles.reportBtn}>View Full Report →</Link>
        </div>
      </div>

      <div style={styles.container}>
        {/* Progress Bar */}
        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div style={styles.progressText}>
            Question {currentIdx + 1} of {history.length}
          </div>
        </div>

        {/* Timeline Dots */}
        <div style={styles.timeline}>
          {history.map((h, i) => {
            const c = h.score >= 0.75 ? '#10b981' : h.score >= 0.5 ? '#f59e0b' : '#ef4444'
            return (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                style={{
                  ...styles.dot,
                  background: i === currentIdx ? c : i < currentIdx ? c : '#e2e8f0',
                  transform: i === currentIdx ? 'scale(1.3)' : 'scale(1)',
                }}
                title={`Q${i + 1}: ${Math.round((h.score || 0) * 100)}%`}
              />
            )
          })}
        </div>

        {/* Navigation */}
        <div style={styles.navRow}>
          <button onClick={goPrev} disabled={currentIdx === 0}
            style={{ ...styles.navBtn, opacity: currentIdx === 0 ? 0.3 : 1 }}>
            ← Previous
          </button>
          <span style={styles.navLabel}>
            {current.topic?.replace('_', ' ')} · <DifficultyBadge level={current.difficulty || 1} />
          </span>
          <button onClick={goNext} disabled={currentIdx === history.length - 1}
            style={{ ...styles.navBtn, opacity: currentIdx === history.length - 1 ? 0.3 : 1 }}>
            Next →
          </button>
        </div>

        {/* Question Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.qNum}>Q{currentIdx + 1}</span>
            <span style={{ ...styles.qScore, color: scoreColor }}>
              {Math.round((current.score || 0) * 100)}%
            </span>
          </div>
          <div style={styles.questionText}>
            <ReactMarkdown
              components={{
                code({ children, className, ...props }) {
                  const inline = !className
                  if (inline) return <code style={styles.inlineCode} {...props}>{children}</code>
                  return <pre style={styles.codeBlock}><code className={className} {...props}>{children}</code></pre>
                },
                p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', margin: '4px 0' }}>{children}</ol>,
                ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', margin: '4px 0' }}>{children}</ul>,
                li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
              }}
            >
              {cleanMath(current.question)}
            </ReactMarkdown>
          </div>
        </div>

        {/* Expandable Sections */}
        <div style={styles.section}>
          <button style={styles.sectionBtn} onClick={() => toggleSection('answer')}>
            <span style={styles.sectionLabel}>Your Answer</span>
            <span style={styles.sectionToggle}>{expandedSections.answer ? '▴' : '▾'}</span>
          </button>
          {expandedSections.answer && (
            <div style={styles.sectionContent}>
              {current.candidate_answer || <em style={{ color: '#94a3b8' }}>No answer provided</em>}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <button style={styles.sectionBtn} onClick={() => toggleSection('expected')}>
            <span style={styles.sectionLabel}>Correct Answer</span>
            <span style={styles.sectionToggle}>{expandedSections.expected ? '▴' : '▾'}</span>
          </button>
          {expandedSections.expected && (
            <div style={styles.sectionModel}>
              {current.expected_answer || <em style={{ color: '#94a3b8' }}>No model answer</em>}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <button style={styles.sectionBtn} onClick={() => toggleSection('eval')}>
            <span style={styles.sectionLabel}>Evaluation</span>
            <span style={styles.sectionToggle}>{expandedSections.eval ? '▴' : '▾'}</span>
          </button>
          {expandedSections.eval && (
            <div style={styles.sectionContent}>
              <p style={{ margin: '0 0 8px' }}>{current.score_rationale}</p>
              {current.gaps?.length > 0 && (
                <div>
                  <strong style={{ color: '#ef4444', fontSize: '0.8rem' }}>Gaps:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569' }}>
                    {current.gaps.map((g, j) => <li key={j}>{g}</li>)}
                  </ul>
                </div>
              )}
              {current.strengths?.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <strong style={{ color: '#10b981', fontSize: '0.8rem' }}>Strengths:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569' }}>
                    {current.strengths.map((s, j) => <li key={j}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/" style={styles.backLink}>← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page:      { minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' },
  container: { maxWidth: '720px', margin: '0 auto', padding: '1.5rem' },

  // Hero
  hero:      { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)', padding: '1.5rem 2rem', color: '#fff' },
  heroInner: { maxWidth: '720px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  heroSub:   { margin: 0, fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' },
  heroTitle: { margin: '4px 0 2px', fontSize: '1.3rem', fontWeight: 700 },
  heroRole:  { margin: 0, fontSize: '0.85rem', opacity: 0.85 },
  reportBtn: { background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' },

  // Progress
  progressWrap:  { marginBottom: '1rem' },
  progressTrack: { height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' },
  progressFill:  { height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '2px', transition: 'width 0.3s ease' },
  progressText:  { fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', textAlign: 'right' },

  // Timeline
  timeline:    { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' },
  dot:         { width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', transition: 'transform 0.15s ease, background 0.15s ease', padding: 0 },

  // Nav
  navRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  navBtn:    { background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 16px', fontSize: '0.8rem', cursor: 'pointer', color: '#475569', fontWeight: 500 },
  navLabel:  { fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' },

  // Card
  card:        { background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '1rem', overflow: 'hidden' },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' },
  qNum:        { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', borderRadius: '6px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 },
  qScore:      { fontWeight: 700, fontSize: '1rem' },
  questionText: { padding: '14px 16px', fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.7 },
  inlineCode:  { background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '0.85em', color: '#7c3aed', fontFamily: 'ui-monospace, monospace' },
  codeBlock:   { background: '#0f172a', color: '#e2e8f0', padding: '12px 14px', borderRadius: '10px', fontSize: '0.775rem', lineHeight: 1.5, overflowX: 'auto', margin: '0.5rem 0' },

  // Sections
  section:       { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '8px', overflow: 'hidden' },
  sectionBtn:    { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  sectionLabel:  { fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' },
  sectionToggle: { fontSize: '0.7rem', color: '#94a3b8' },
  sectionContent:{ padding: '0 16px 14px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  sectionModel:  { padding: '0 16px 14px', fontSize: '0.85rem', color: '#065f46', lineHeight: 1.6, background: '#ecfdf5', margin: '0 12px 12px', borderRadius: '10px', borderLeft: '3px solid #10b981', whiteSpace: 'pre-wrap' },

  error:    { color: '#ef4444', fontSize: '1rem' },
  backLink: { color: '#6366f1', fontSize: '0.85rem', fontWeight: 500 },
}
