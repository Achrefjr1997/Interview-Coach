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
  const scoreColor = item.score >= 0.75 ? '#16a34a' : item.score >= 0.5 ? '#d97706' : '#dc2626'

  return (
    <div style={styles.qCard}>
      <div style={styles.qCardHeader} onClick={() => setOpen(!open)}>
        <div style={styles.qCardLeft}>
          <span style={styles.qNum}>Q{index + 1}</span>
          <span style={{ ...styles.qTopic, textTransform: 'capitalize' }}>
            {item.topic?.replace('_', ' ') || '-'}
          </span>
          <DifficultyBadge level={item.difficulty || 1} />
        </div>
        <div style={styles.qCardRight}>
          <span style={{ ...styles.qScore, color: scoreColor }}>
            {Math.round((item.score || 0) * 100)}%
          </span>
          <span style={styles.qToggle}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      <div style={styles.qQuestion}>
        <ReactMarkdown
          components={{
            code({ children, className, ...props }) {
              const inline = !className
              if (inline) {
                return <code style={styles.inlineCode} {...props}>{children}</code>
              }
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
              {item.candidate_answer || <em style={{ color: '#999' }}>No answer provided</em>}
            </div>
          </div>

          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Correct / Expected Answer</div>
            <div style={styles.qSectionModel}>
              {item.expected_answer || <em style={{ color: '#999' }}>No model answer available</em>}
            </div>
          </div>

          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Evaluation</div>
            <div style={styles.qSectionContent}>{item.score_rationale}</div>
          </div>

          {item.gaps && item.gaps.length > 0 && (
            <div style={styles.qSection}>
              <div style={{ ...styles.qSectionLabel, color: '#dc2626' }}>Gaps Identified</div>
              <ul style={styles.qList}>
                {item.gaps.map((g, j) => <li key={j}>{g}</li>)}
              </ul>
            </div>
          )}

          {item.strengths && item.strengths.length > 0 && (
            <div style={styles.qSection}>
              <div style={{ ...styles.qSectionLabel, color: '#16a34a' }}>Strengths</div>
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
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('overview')

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
        <Link to="/" style={styles.backLink}>Back to Dashboard</Link>
      </div>
    </div>
  )
  if (!report) return null

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>Interview Report</h1>
            <p style={styles.subtitle}>
              {report.candidate_name} — {report.role}
              &nbsp;·&nbsp; {report.total_questions} questions
            </p>
          </div>
          <Link to="/" style={styles.backLink}>← Dashboard</Link>
        </header>

        {/* Score Summary Bar */}
        <div style={styles.scoreBar}>
          <div style={styles.scoreBarLeft}>
            <ScoreRing score={report.overall_score || 0} size={100} />
          </div>
          <div style={styles.scoreBarRight}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 600 }}>Topic Breakdown</h3>
            {report.skill_scores && Object.entries(report.skill_scores).map(([topic, score]) => (
              <SkillBar key={topic} topic={topic} score={score} />
            ))}
            {(!report.skill_scores || Object.keys(report.skill_scores).length === 0) && (
              <p style={{ color: '#999', fontSize: '0.85rem' }}>No scores</p>
            )}
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
                  strong: ({ node, ...props }) => <strong style={{ color: '#111' }} {...props} />,
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
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No questions recorded</p>
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
  page:      { minHeight: '100vh', background: '#f1f5f9', padding: '2rem' },
  container: { maxWidth: '880px', margin: '0 auto' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  heading:   { margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' },
  subtitle:  { margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' },
  backLink:  { color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 },

  // Score bar
  scoreBar:      { display: 'flex', gap: '2rem', background: '#fff', padding: '1.5rem', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,.04)', marginBottom: '1.25rem', alignItems: 'center' },
  scoreBarLeft:  { flexShrink: 0 },
  scoreBarRight: { flex: 1, minWidth: 0 },

  // Tabs
  tabs:      { display: 'flex', gap: '4px', marginBottom: '1.25rem' },
  tab:       { padding: '8px 20px', border: 'none', background: '#e2e8f0', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#475569', cursor: 'pointer' },
  tabActive: { padding: '8px 20px', border: 'none', background: '#2563eb', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#fff', cursor: 'pointer' },

  // Card
  card:       { background: '#fff', padding: '1.75rem', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,.04)', marginBottom: '1rem' },

  // Markdown
  markdown:   { fontSize: '0.925rem', lineHeight: 1.75, color: '#334155' },
  mdH2:       { fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '1.5rem', marginBottom: '0.5rem', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' },
  mdH3:       { fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginTop: '1.25rem', marginBottom: '0.4rem' },
  mdP:        { margin: '0.5rem 0' },
  mdUl:       { paddingLeft: '1.25rem', margin: '0.4rem 0' },
  mdLi:       { marginBottom: '3px' },

  // Question cards
  questionsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  qCard:         { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflow: 'hidden' },
  qCardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid #f1f5f9' },
  qCardLeft:     { display: 'flex', alignItems: 'center', gap: '10px' },
  qCardRight:    { display: 'flex', alignItems: 'center', gap: '10px' },
  qNum:          { background: '#2563eb', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 },
  qTopic:        { fontSize: '0.85rem', fontWeight: 600, color: '#334155' },
  qScore:        { fontSize: '0.95rem', fontWeight: 700 },
  qToggle:       { fontSize: '0.7rem', color: '#94a3b8' },
  qQuestion:     { padding: '12px 16px', fontSize: '0.9rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.6, borderBottom: '1px solid #f8fafc' },
  inlineCode:    { background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '0.88em', color: '#d946ef', fontFamily: 'ui-monospace, monospace' },
  codeBlock:     { background: '#0f172a', color: '#e2e8f0', padding: '12px 14px', borderRadius: '8px', fontSize: '0.8rem', lineHeight: 1.5, overflowX: 'auto', margin: '0.5rem 0' },
  qDetail:       { padding: '0 16px 16px', animation: 'fadeIn 0.2s ease' },

  qSection:        { marginTop: '14px' },
  qSectionLabel:   { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: '6px' },
  qSectionContent: { fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', whiteSpace: 'pre-wrap' },
  qSectionModel:   { fontSize: '0.875rem', color: '#166534', lineHeight: 1.6, background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #16a34a', whiteSpace: 'pre-wrap' },
  qList:           { margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569' },

  error: { color: '#dc2626', fontSize: '1rem' },
}
