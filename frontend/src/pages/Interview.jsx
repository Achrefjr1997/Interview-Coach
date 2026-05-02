import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getSession } from '../api'
import { useInterviewSocket } from '../useWebSocket'
import { useAuth } from '../App'
import { cleanMath } from '../cleanMath'
import SkillBar from '../components/SkillBar'
import DifficultyBadge from '../components/DifficultyBadge'
import Spinner from '../components/Spinner'

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

  useEffect(() => {
    getSession(sessionId)
      .then(r => {
        setQuestion(r.data.current_question ? cleanMath(r.data.current_question) : '')
        if (r.data.session_complete) setComplete(true)
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load session'))
      .finally(() => setLoading(false))
  }, [sessionId])

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
        setTimeout(() => navigate(`/report/${sessionId}`), 2500)
        break
      case 'error':
        setError(msg.content)
        break
    }
  }, [navigate, sessionId])

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

  if (loading) return <Spinner />

  if (sessionComplete) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ ...styles.card, textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={styles.completeIcon}>✓</div>
            <h1 style={{ ...styles.heading, marginBottom: '0.5rem' }}>Interview Complete</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Redirecting to your full report...
            </p>
            <button
              onClick={() => navigate(`/report/${sessionId}`)}
              style={styles.btn}
            >
              View Report Now
            </button>
            <div style={{ marginTop: '1.5rem' }}>
              <a href="/" style={styles.backLink}>Back to Dashboard</a>
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
            <span style={{
              ...styles.scoreChip,
              background: meta.score >= 0.75 ? '#ecfdf5' : meta.score >= 0.5 ? '#fffbeb' : '#fef2f2',
              color: meta.score >= 0.75 ? '#059669' : meta.score >= 0.5 ? '#d97706' : '#dc2626',
            }}>
              Last: {Math.round(meta.score * 100)}%
            </span>
          )}
        </div>

        {/* Skill Scores */}
        {meta?.skill_scores && Object.keys(meta.skill_scores).length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Topic Scores</h3>
            {Object.entries(meta.skill_scores).map(([topic, score]) => (
              <SkillBar key={topic} topic={topic} score={score} />
            ))}
          </div>
        )}

        {/* Question */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Question</h3>
          <div style={styles.questionBody}>
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
                p: ({ children }) => <p style={styles.mdP}>{children}</p>,
                ol: ({ children }) => <ol style={styles.mdList}>{children}</ol>,
                ul: ({ children }) => <ul style={styles.mdList}>{children}</ul>,
                li: ({ children }) => <li style={styles.mdLi}>{children}</li>,
                strong: ({ children }) => <strong style={{ color: '#0f172a' }}>{children}</strong>,
                em: ({ children }) => <em style={{ color: '#475569' }}>{children}</em>,
              }}
            >
              {question}
            </ReactMarkdown>
            {streaming && <span style={styles.cursor}>▎</span>}
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Answer (Jupyter-style) */}
        <div style={styles.answerSection}>
          <div style={styles.nbLabel}>In [ ]:</div>
          <form onSubmit={handleSubmit} style={{ flex: 1 }}>
            <textarea
              style={styles.textarea}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Write your code / answer here..."
              disabled={streaming}
              rows={8}
              spellCheck={false}
            />
            <button
              style={{ ...styles.btn, opacity: streaming ? 0.5 : 1, marginTop: '10px' }}
              type="submit"
              disabled={streaming || !answer.trim()}
            >
              Submit Answer →
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href="/" style={styles.backLink}>End Session & Return</a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page:      { minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1.5rem' },
  container: { maxWidth: '800px', margin: '0 auto' },

  // Top bar
  topBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' },
  topLeft:   { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  turnBadge: { background: '#e0e7ff', color: '#4338ca', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 },
  topicPill: { background: '#ede9fe', color: '#6d28d9', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize' },
  scoreChip: { padding: '4px 14px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 },

  // Cards
  card:      { background: '#fff', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '1rem' },
  cardTitle: { margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' },

  // Question markdown
  questionBody: { fontSize: '0.925rem', lineHeight: 1.75, color: '#1e293b' },
  mdP:          { margin: '0.5rem 0' },
  mdList:       { paddingLeft: '1.5rem', margin: '0.5rem 0' },
  mdLi:         { marginBottom: '4px' },
  inlineCode:   { background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '0.88em', color: '#7c3aed', fontFamily: 'ui-monospace, monospace' },
  codeBlock:    { background: '#0f172a', color: '#e2e8f0', padding: '14px 16px', borderRadius: '10px', fontSize: '0.825rem', lineHeight: 1.6, overflowX: 'auto', margin: '0.5rem 0' },
  cursor:       { animation: 'blink 1s step-end infinite', color: '#6366f1', fontWeight: 700, fontSize: '1.1rem' },

  // Jupyter answer cell
  answerSection: { display: 'flex', gap: '0', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1rem', border: '1px solid rgba(0,0,0,0.04)' },
  nbLabel:       { background: '#f8fafc', color: '#94a3b8', padding: '14px 14px 0', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '0.8rem', fontWeight: 600, minWidth: '52px', textAlign: 'right', borderRight: '1px solid #e2e8f0', userSelect: 'none' },
  textarea:      { width: '100%', background: '#1e1e2e', color: '#cdd6f4', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '0.85rem', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', lineHeight: 1.7, resize: 'vertical', borderRadius: 0, tabSize: 4, minHeight: '180px' },

  // Button
  btn:         { padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)', transition: 'transform 0.15s ease' },
  completeIcon: { width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 1rem' },
  heading:     { margin: 0, fontSize: '1.3rem', fontWeight: 700 },
  error:       { color: '#ef4444', fontSize: '0.85rem', margin: '8px 0', background: '#fef2f2', padding: '8px 14px', borderRadius: '8px' },
  backLink:    { color: '#94a3b8', fontSize: '0.85rem', transition: 'color 0.15s ease' },
}
