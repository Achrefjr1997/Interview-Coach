import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getReport } from '../api'
import { cleanMath } from '../cleanMath'
import ScoreRing from '../components/ScoreRing'
import SkillBar from '../components/SkillBar'
import DifficultyBadge from '../components/DifficultyBadge'
import Spinner from '../components/Spinner'
import { ChevronDown, ChevronUp, Play, ArrowLeft } from 'lucide-react'

function QuestionCard({ item, index }) {
  const [open, setOpen] = useState(false)
  const scoreColor = item.score >= 0.75 ? 'var(--green)' : item.score >= 0.5 ? 'var(--amber)' : 'var(--red)'
  const accentColor = scoreColor

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
          {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </div>

      <div style={styles.qQuestion}>
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
          {cleanMath(item.question)}
        </ReactMarkdown>
      </div>

      {open && (
        <div style={styles.qDetail}>
          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Your Answer</div>
            <div style={styles.qSectionContent}>
              {item.candidate_answer || <em style={{ color: 'var(--text-muted)' }}>No answer provided</em>}
            </div>
          </div>

          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Expected Answer</div>
            <div style={styles.qSectionModel}>
              {item.expected_answer || <em style={{ color: 'var(--text-muted)' }}>No model answer available</em>}
            </div>
          </div>

          <div style={styles.qSection}>
            <div style={styles.qSectionLabel}>Evaluation</div>
            <div style={styles.qSectionContent}>{item.score_rationale}</div>
          </div>

          {item.gaps && item.gaps.length > 0 && (
            <div style={styles.qSection}>
              <div style={{ ...styles.qSectionLabel, color: 'var(--red)' }}>Gaps Identified</div>
              <ul style={styles.qList}>
                {item.gaps.map((g, j) => <li key={j}>{g}</li>)}
              </ul>
            </div>
          )}

          {item.strengths && item.strengths.length > 0 && (
            <div style={styles.qSection}>
              <div style={{ ...styles.qSectionLabel, color: 'var(--green)' }}>Strengths</div>
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
        <Link to="/" style={styles.backLink}><ArrowLeft size={14} /> Back to Dashboard</Link>
      </div>
    </div>
  )
  if (!report) return (
    <div style={styles.page}>
      <div style={{ ...styles.container, textAlign: 'center', paddingTop: '4rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: '1rem 0 0.5rem' }}>No Report Data</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>The session data could not be loaded.</p>
        <Link to="/" style={styles.backLink}><ArrowLeft size={14} /> Back to Dashboard</Link>
      </div>
    </div>
  )

  const overall = report.overall_score || 0

  return (
    <div style={styles.page}>
      {/* Header */}
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
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(overall * 100)}%</div>
            </div>
          </div>
          <Link to={`/replay/${sessionId}`} style={styles.replayBtn}><Play size={14} /> Replay Session</Link>
        </div>
      </div>

      <div style={styles.container}>
        {/* Score Summary */}
        <div style={styles.scoreBar}>
          <div style={styles.scoreBarLeft}>
            <h3 style={styles.scoreBarTitle}>Topic Scores</h3>
            {report.skill_scores && Object.entries(report.skill_scores).map(([topic, score]) => (
              <SkillBar key={topic} topic={topic} score={score} />
            ))}
            {(!report.skill_scores || Object.keys(report.skill_scores).length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No scores</p>
            )}
          </div>
          <div style={styles.scoreBarRight}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{report.total_questions}</div>
              <div style={styles.statLabel}>Questions</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statValue, color: overall >= 0.5 ? 'var(--green)' : 'var(--amber)' }}>
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
                  strong: ({ node, ...props }) => <strong style={{ color: 'var(--text-primary)' }} {...props} />,
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
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No questions recorded</p>
            )}
          </div>
        )}

        <Link to="/" style={{ ...styles.backLink, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2rem' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  container: { maxWidth: '880px', margin: '0 auto', padding: '2rem' },

  hero: { background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 100%)', padding: '2rem', borderBottom: '1px solid var(--border)' },
  heroInner: { maxWidth: '880px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' },
  heroSub: { margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  heroTitle: { margin: '4px 0 2px', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' },
  heroRole: { margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' },
  heroScore: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  replayBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface-raised)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border)', textDecoration: 'none' },

  scoreBar: { display: 'flex', gap: '2rem', background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1.25rem', alignItems: 'center' },
  scoreBarLeft: { flex: 1, minWidth: 0 },
  scoreBarRight: { display: 'flex', gap: '1.5rem', flexShrink: 0 },
  scoreBarTitle: { margin: '0 0 12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statBox: { textAlign: 'center' },
  statValue: { fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' },
  statLabel: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' },

  tabs: { display: 'flex', gap: '4px', marginBottom: '1.25rem' },
  tab: { padding: '8px 20px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' },
  tabActive: { padding: '8px 20px', border: '1px solid var(--accent)', background: 'var(--accent)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#fff', cursor: 'pointer' },

  card: { background: 'var(--surface)', padding: '1.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1rem' },

  markdown: { fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--text-primary)' },
  mdH2: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem', paddingBottom: '6px', borderBottom: '1px solid var(--border)' },
  mdH3: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.4rem' },
  mdP: { margin: '0.5rem 0' },
  mdUl: { paddingLeft: '1.25rem', margin: '0.4rem 0' },
  mdLi: { marginBottom: '3px' },

  questionsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  qCard: { background: 'var(--surface)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' },
  qCardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px' },
  qCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--border)' },
  qCardLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  qCardRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  qNum: { background: 'var(--accent)', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 },
  qTopic: { fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' },
  qScore: { fontSize: '0.9rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  qQuestion: { padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, borderBottom: '1px solid var(--border)' },
  qDetail: { padding: '0 16px 16px', animation: 'fadeIn 0.2s ease' },
  qSection: { marginTop: '14px' },
  qSectionLabel: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '6px' },
  qSectionContent: { fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, background: 'var(--surface-raised)', padding: '10px 14px', borderRadius: '10px', whiteSpace: 'pre-wrap', border: '1px solid var(--border)' },
  qSectionModel: { fontSize: '0.85rem', color: 'var(--green)', lineHeight: 1.6, background: 'rgba(0,214,143,0.06)', padding: '10px 14px', borderRadius: '10px', borderLeft: '3px solid var(--green)', whiteSpace: 'pre-wrap' },
  qList: { margin: '4px 0 0', paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' },
  inlineCode: { background: 'var(--surface-raised)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.85em', color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' },
  codeBlock: { background: '#0a0a14', color: 'var(--text-primary)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.775rem', lineHeight: 1.5, overflowX: 'auto', margin: '0.5rem 0', border: '1px solid var(--border)' },

  error: { color: 'var(--red)', fontSize: '1rem' },
  backLink: { color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 },
}
