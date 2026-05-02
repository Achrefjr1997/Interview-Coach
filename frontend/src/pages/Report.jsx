import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getReport } from '../api'
import { cleanMath } from '../cleanMath'
import ScoreRing from '../components/ScoreRing'
import SkillBar from '../components/SkillBar'
import DifficultyBadge from '../components/DifficultyBadge'
import Spinner from '../components/Spinner'

function QuestionCard({ item, index }) {
  const [open, setOpen] = useState(false)
  const scoreColor = item.score >= 0.75 ? '#10b981' : item.score >= 0.5 ? '#f59e0b' : '#ef4444'
  const accentColor = item.score >= 0.75 ? '#10b981' : item.score >= 0.5 ? '#f59e0b' : '#ef4444'

  return (
    <div style={styles.qCard}>
      <div style={{ ...styles.qCardAccent, background: accentColor }} />
      <div style={styles.qCardHeader} onClick={() => setOpen(!open)}>
        <div style={styles.qCardLeft}>
          <span style={styles.qNum}>Q{index + 1}</span>
          <span style={styles.qTopic}>{item.topic?.replace('_', ' ') || '-'}</span>
          <DifficultyBadge level={item.difficulty || 1} />
        </div>
        <div style={styles.qCardRight}>
          <span style={{ ...styles.qScore, color: scoreColor }}>
            {Math.round((item.score || 0) * 100)}%
          </span>
          <span style={styles.qToggle}>{open ? '▴' : '▾'}</span>
        </div>
      </div>

      <div style={styles.qQuestion}>
        <ReactMarkdown
          components={{
            code({ children, className, ...props }) {
              const inline = !className
              if (inline) return <code style={styles.inlineCode} {...props}>{children}</code>
              return (
                <pre style={styles.codeBlock}>
                  <code className={className} {...props}>{children}</code>
                </pre>
              )
            },
            p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
            ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', margin: '4px 0' }}>{children}</ol>,
            ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', margin: '4px 0' }}>{children}</ul>,
            li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
          }}
        >
          {cleanMath(item.question)}
        </ReactMarkdown>
      </div>

      {open && (
        <div style={styles.qDetail}>
          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Your Answer</div>
            <div style={styles.qSectionContent}>
              {item.candidate_answer || <em style={{ color: '#94a3b8' }}>No answer provided</em>}
            </div>
          </div>

          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Correct / Expected Answer</div>
            <div style={styles.qSectionModel}>
              {item.expected_answer || <em style={{ color: '#94a3b8' }}>No model answer available</em>}
            </div>
          </div>

          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Evaluation</div>
            <div style={styles.qSectionContent}>{item.score_rationale}</div>
          </div>

          {item.gaps && item.gaps.length > 0 && (
            <div style={styles.qSection}>
              <div style={{ ...styles.qSectionLabel, color: '#ef4444' }}>Gaps Identified</div>
              <ul style={styles.qList}>
                {item.gaps.map((g, j) => <li key={j}>{g}</li>)}
              </ul>
            </div>
          )}

          {item.strengths && item.strengths.length > 0 && (
            <div style={styles.qSection}>
              <div style={{ ...styles.qSectionLabel, color: '#10b981' }}>Strengths</div>
              <ul style={styles.qList}>
                {item.strengths.map((s, j) => <li key={j}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Report() {
  const { sessionId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    getReport(sessionId)
      .then(r => setReport(r.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <Spinner />
  if (error) return (
    <div style={styles.page}>
      <div style={styles.container}>
        <p style={styles.error}>{error}</p>
        <Link to="/" style={styles.backLink}>← Back to Dashboard</Link>
      </div>
    </div>
  )
  if (!report) return null

  const overall = report.overall_score || 0

  return (
    <div style={styles.page}>
      {/* Header Banner */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div>
            <p style={styles.heroSub}>Interview Report</p>
            <h1 style={styles.heroTitle}>{report.candidate_name}</h1>
            <p style={styles.heroRole}>{report.role}</p>
          </div>
          <div style={styles.heroScore}>
            <ScoreRing score={overall} size={90} />
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>{Math.round(overall * 100)}%</div>
            </div>
          </div>
          <Link to={`/replay/${sessionId}`} style={styles.replayBtn}>▶ Replay Session</Link>
        </div>
      </div>

      <div style={styles.container}>
        {/* Score Summary */}
        <div style={styles.scoreBar}>
          <div style={styles.scoreBarLeft}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Topic Scores</h3>
            {report.skill_scores && Object.entries(report.skill_scores).map(([topic, score]) => (
              <SkillBar key={topic} topic={topic} score={score} />
            ))}
            {(!report.skill_scores || Object.keys(report.skill_scores).length === 0) && (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No scores</p>
            )}
          </div>
          <div style={styles.scoreBarRight}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{report.total_questions}</div>
              <div style={styles.statLabel}>Questions</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statValue, color: overall >= 0.5 ? '#10b981' : '#f59e0b' }}>
                {Math.round(overall * 100)}%
              </div>
              <div style={styles.statLabel}>Avg Score</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button style={tab === 'overview' ? styles.tabActive : styles.tab}
            onClick={() => setTab('overview')}>Summary</button>
          <button style={tab === 'questions' ? styles.tabActive : styles.tab}
            onClick={() => setTab('questions')}>Questions ({report.history?.length || 0})</button>
        </div>

        {/* Tab Content */}
        {tab === 'overview' && report.final_report && (
          <div style={styles.card}>
            <div style={styles.markdown}>
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => <h2 style={styles.mdH2} {...props} />,
                  h3: ({ node, ...props }) => <h3 style={styles.mdH3} {...props} />,
                  p: ({ node, ...props }) => <p style={styles.mdP} {...props} />,
                  ul: ({ node, ...props }) => <ul style={styles.mdUl} {...props} />,
                  li: ({ node, ...props }) => <li style={styles.mdLi} {...props} />,
                  strong: ({ node, ...props }) => <strong style={{ color: '#0f172a' }} {...props} />,
                }}
              >
                {report.final_report}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {tab === 'questions' && (
          <div style={styles.questionsList}>
            {report.history && report.history.length > 0 ? (
              report.history.map((item, i) => (
                <QuestionCard key={i} item={item} index={i} />
              ))
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No questions recorded</p>
            )}
          </div>
        )}

        <Link to="/" style={{ ...styles.backLink, display: 'inline-block', marginTop: '2rem' }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

const styles = {
  page:      { minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' },
  container: { maxWidth: '880px', margin: '0 auto', padding: '2rem' },

  // Hero
  hero:      { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)', padding: '2rem', color: '#fff' },
  heroInner: { maxWidth: '880px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' },
  heroSub:   { margin: 0, fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' },
  heroTitle: { margin: '4px 0 2px', fontSize: '1.5rem', fontWeight: 700 },
  heroRole:  { margin: 0, fontSize: '0.9rem', opacity: 0.85 },
  heroScore: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  replayBtn: { background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' },

  // Score bar
  scoreBar:      { display: 'flex', gap: '2rem', background: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '1.25rem', alignItems: 'center' },
  scoreBarLeft:  { flex: 1, minWidth: 0 },
  scoreBarRight: { display: 'flex', gap: '1.5rem', flexShrink: 0 },
  statBox:       { textAlign: 'center' },
  statValue:     { fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 },
  statLabel:     { fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' },

  // Tabs
  tabs:      { display: 'flex', gap: '4px', marginBottom: '1.25rem' },
  tab:       { padding: '8px 20px', border: 'none', background: '#e2e8f0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, color: '#64748b', cursor: 'pointer', transition: 'all 0.15s ease' },
  tabActive: { padding: '8px 20px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' },

  // Card
  card:       { background: '#fff', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '1rem' },

  // Markdown
  markdown:   { fontSize: '0.9rem', lineHeight: 1.75, color: '#334155' },
  mdH2:       { fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '1.5rem', marginBottom: '0.5rem', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' },
  mdH3:       { fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginTop: '1.25rem', marginBottom: '0.4rem' },
  mdP:        { margin: '0.5rem 0' },
  mdUl:       { paddingLeft: '1.25rem', margin: '0.4rem 0' },
  mdLi:       { marginBottom: '3px' },

  // Question cards
  questionsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  qCard:         { background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', position: 'relative' },
  qCardAccent:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px' },
  qCardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid #f1f5f9' },
  qCardLeft:     { display: 'flex', alignItems: 'center', gap: '10px' },
  qCardRight:    { display: 'flex', alignItems: 'center', gap: '10px' },
  qNum:          { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 },
  qTopic:        { fontSize: '0.825rem', fontWeight: 600, color: '#334155', textTransform: 'capitalize' },
  qScore:        { fontSize: '0.9rem', fontWeight: 700 },
  qToggle:       { fontSize: '0.65rem', color: '#94a3b8' },
  qQuestion:     { padding: '12px 16px', fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6, borderBottom: '1px solid #f8fafc' },
  qDetail:       { padding: '0 16px 16px', animation: 'fadeIn 0.2s ease' },
  qSection:      { marginTop: '14px' },
  qSectionLabel: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: '6px' },
  qSectionContent: { fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', whiteSpace: 'pre-wrap' },
  qSectionModel:   { fontSize: '0.85rem', color: '#065f46', lineHeight: 1.6, background: '#ecfdf5', padding: '10px 14px', borderRadius: '10px', borderLeft: '3px solid #10b981', whiteSpace: 'pre-wrap' },
  qList:           { margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#475569' },
  inlineCode:      { background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '0.85em', color: '#7c3aed', fontFamily: 'ui-monospace, monospace' },
  codeBlock:       { background: '#0f172a', color: '#e2e8f0', padding: '12px 14px', borderRadius: '10px', fontSize: '0.775rem', lineHeight: 1.5, overflowX: 'auto', margin: '0.5rem 0' },

  error:    { color: '#ef4444', fontSize: '1rem' },
  backLink: { color: '#6366f1', fontSize: '0.85rem', fontWeight: 500 },
}
