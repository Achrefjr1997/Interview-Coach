import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getSession } from '../api'
import { useInterviewSocket } from '../useWebSocket'
import { useAuth } from '../App'
import { cleanMath } from '../cleanMath'
import SkillBar from '../components/SkillBar'
import DifficultyBadge from '../components/DifficultyBadge'
import Spinner from '../components/Spinner'
import CodeRunner from '../components/CodeRunner'
import { ArrowLeft, X } from 'lucide-react'

export default function Interview() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [meta, setMeta] = useState(null)
  const [sessionComplete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    getSession(sessionId)
      .then(r => {
        setQuestion(r.data.current_question ? cleanMath(r.data.current_question) : '')
        if (r.data.session_complete) setComplete(true)
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load session'))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    if (!sessionComplete) return
    setCountdown(3)
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(id); navigate(`/report/${sessionId}`); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [sessionComplete, navigate, sessionId])

  const onMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'question_chunk':
        setQuestion(prev => prev + cleanMath(msg.content))
        setStreaming(true)
        break
      case 'question_done':
        setStreaming(false)
        setMeta(msg.meta)
        break
      case 'report_chunk':
        break
      case 'session_complete':
        setComplete(true)
        if (msg.overall_score != null) {
          setMeta(prev => ({ ...prev, skill_scores: msg.skill_scores }))
        }
        break
      case 'error':
        setError(msg.content)
        break
    }
  }, [])

  const { sendAnswer } = useInterviewSocket({
    sessionId, token, onMessage,
    enabled: !loading && !sessionComplete,
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!answer.trim() || streaming) return
    sendAnswer(answer)
    setAnswer('')
    setQuestion('')
    setError('')
  }

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!streaming && answer.trim()) {
          sendAnswer(answer)
          setAnswer('')
          setQuestion('')
          setError('')
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [answer, streaming, sendAnswer])

  if (loading) return <Spinner />

  if (sessionComplete) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.completeCard}>
            <div style={styles.completeIcon}>✓</div>
            <h1 style={styles.completeTitle}>Interview Complete</h1>
            <p style={styles.completeSub}>Great work! Your report is being generated.</p>
            {countdown !== null && (
              <div style={styles.countdownWrap}>
                <div style={styles.countdownRing}>
                  <span style={styles.countdownNum}>{countdown}</span>
                </div>
                <p style={styles.countdownText}>Redirecting to your report...</p>
              </div>
            )}
            <button onClick={() => navigate(`/report/${sessionId}`)} style={styles.btn}>
              View Report Now
            </button>
            <div style={{ marginTop: '1rem' }}>
              <Link to="/" style={styles.backLink}><ArrowLeft size={14} /> Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.topLeft}>
            <span style={styles.turnBadge}>Turn {meta?.turn ?? 0}</span>
            {meta ? <DifficultyBadge level={meta.next_difficulty} /> : null}
            {meta?.next_topic && (
              <span style={styles.topicPill}>{meta.next_topic.replace('_', ' ')}</span>
            )}
          </div>
          {meta?.score != null && (
            <span className="scale-in" style={{
              ...styles.scoreChip,
              background: meta.score >= 0.75 ? 'rgba(0,214,143,0.1)' : meta.score >= 0.5 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              color: meta.score >= 0.75 ? 'var(--green)' : meta.score >= 0.5 ? 'var(--amber)' : 'var(--red)',
            }}>
              Last: {Math.round(meta.score * 100)}%
            </span>
          )}
        </div>

        {/* Skill Scores */}
        {meta?.skill_scores && Object.keys(meta.skill_scores).length > 0 && (
          <div style={styles.card} className="fade-in">
            <h3 style={styles.cardTitle}>Topic Scores</h3>
            {Object.entries(meta.skill_scores).map(([topic, score]) => (
              <SkillBar key={topic} topic={topic} score={score} />
            ))}
          </div>
        )}

        {/* Question */}
        <div style={styles.card} className="fade-in">
          <h3 style={styles.cardTitle}>Question</h3>
          <div style={styles.questionBody}>
            <ReactMarkdown
              components={{
                code({ children, className, ...props }) {
                  const inline = !className
                  if (inline) return <code style={styles.inlineCode} {...props}>{children}</code>
                  return <pre style={styles.codeBlock}><code className={className} {...props}>{children}</code></pre>
                },
                p: ({ children }) => <p style={styles.mdP}>{children}</p>,
                ol: ({ children }) => <ol style={styles.mdList}>{children}</ol>,
                ul: ({ children }) => <ul style={styles.mdList}>{children}</ul>,
                li: ({ children }) => <li style={styles.mdLi}>{children}</li>,
                strong: ({ children }) => <strong style={{ color: 'var(--text-primary)' }}>{children}</strong>,
                em: ({ children }) => <em style={{ color: 'var(--text-secondary)' }}>{children}</em>,
              }}
            >
              {question}
            </ReactMarkdown>
            {streaming && <span style={styles.cursor}>▎</span>}
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span style={styles.errorText}>{error}</span>
            <button onClick={() => setError('')} style={styles.errorClose} aria-label="Dismiss"><X size={14} /></button>
          </div>
        )}

        {/* Answer (Jupyter-style) */}
        <div style={styles.answerSection}>
          <div style={styles.nbLabel}>In [ ]:</div>
          <form onSubmit={handleSubmit} style={{ flex: 1 }}>
            <textarea
              style={styles.textarea}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Write your code / answer here... (Ctrl+Enter to submit)"
              disabled={streaming}
              rows={8}
              spellCheck={false}
            />
            <button
              style={{ ...styles.btn, opacity: streaming ? 0.5 : 1, marginTop: '10px', pointerEvents: streaming ? 'none' : 'auto' }}
              type="submit"
              disabled={streaming || !answer.trim()}
              aria-label="Submit answer"
            >
              Submit Answer →
            </button>
          </form>
        </div>

        {/* Code Execution Sandbox */}
        <CodeRunner code={answer} onOutput={(out) => console.log('Python output:', out)} />

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={styles.backLink}><ArrowLeft size={14} /> End Session & Return</Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)', padding: '1.5rem' },
  container: { maxWidth: '800px', margin: '0 auto' },

  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' },
  topLeft: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  turnBadge: { background: 'var(--accent-dim)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 },
  topicPill: { background: 'var(--accent-dim)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize' },
  scoreChip: { padding: '4px 14px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 },

  card: { background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius)', marginBottom: '1rem' },
  cardTitle: { margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },

  questionBody: { fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--text-primary)' },
  mdP: { margin: '0.5rem 0' },
  mdList: { paddingLeft: '1.5rem', margin: '0.5rem 0' },
  mdLi: { marginBottom: '4px' },
  inlineCode: { background: 'var(--surface-raised)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.88em', color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' },
  codeBlock: { background: '#0a0a14', color: 'var(--text-primary)', padding: '14px 16px', borderRadius: '10px', fontSize: '0.825rem', lineHeight: 1.6, overflowX: 'auto', margin: '0.5rem 0', border: '1px solid var(--border)' },
  cursor: { animation: 'blink 1s step-end infinite', color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' },

  answerSection: { display: 'flex', gap: '0', background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border)' },
  nbLabel: { background: 'var(--surface-raised)', color: 'var(--text-muted)', padding: '14px 14px 0', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', fontWeight: 600, minWidth: '52px', textAlign: 'right', borderRight: '1px solid var(--border)', userSelect: 'none' },
  textarea: { width: '100%', background: '#0a0a14', color: 'var(--text-primary)', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '0.85rem', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', lineHeight: 1.7, resize: 'vertical', borderRadius: 0, tabSize: 4, minHeight: '180px' },

  btn: { padding: '11px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'background 200ms ease' },

  completeCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center', padding: '3rem 2rem' },
  completeIcon: { width: '56px', height: '56px', borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 1rem' },
  completeTitle: { margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' },
  completeSub: { color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' },

  countdownWrap: { marginBottom: '1.5rem' },
  countdownRing: { width: '48px', height: '48px', borderRadius: '50%', background: 'var(--surface-raised)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  countdownNum: { fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' },
  countdownText: { margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' },

  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--red)', fontSize: '0.85rem', margin: '8px 0', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' },
  errorText: { flex: 1 },
  errorClose: { background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' },

  backLink: { color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' },
}
