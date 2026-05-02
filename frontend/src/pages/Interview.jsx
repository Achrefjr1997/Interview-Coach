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
  const { token }     = useAuth()

  const [question, setQuestion]       = useState('')
  const [answer, setAnswer]           = useState('')
  const [streaming, setStreaming]     = useState(false)
  const [meta, setMeta]               = useState(null)
  const [sessionComplete, setComplete] = useState(false)
  const [reportChunks, setReportChunks] = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(true)

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
        setQuestion(prev => prev)
        break
      case 'report_chunk':
        setReportChunks(prev => prev + msg.content)
        break
      case 'session_complete':
        setComplete(true)
        if (msg.overall_score != null) {
          setMeta(prev => ({
            ...prev,
            skill_scores: msg.skill_scores,
          }))
        }
        setTimeout(() => navigate(`/report/${sessionId}`), 2500)
        break
      case 'error':
        setError(msg.content)
        break
    }
  }, [])

  const { sendAnswer } = useInterviewSocket({
    sessionId,
    token,
    onMessage,
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
            <h1 style={{ ...styles.heading, marginBottom: '0.5rem' }}>Interview Complete</h1>
            <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Redirecting to your full report...
            </p>
            <button
              onClick={() => navigate(`/report/${sessionId}`)}
              style={{ ...styles.btn, padding: '10px 28px', fontSize: '0.95rem' }}
            >
              View Report Now
            </button>
            <div style={{ marginTop: '1.5rem' }}>
              <a href="/" style={{ ...styles.backLink, fontSize: '0.85rem' }}>Back to Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div style={styles.topLeft}>
            <span style={styles.turnBadge}>Turn {meta?.turn || 0}</span>
            {meta && <DifficultyBadge level={meta.next_difficulty} />}
            {meta?.next_topic && (
              <span style={styles.topicPill}>{meta.next_topic.replace('_', ' ')}</span>
            )}
          </div>
          {meta?.score != null && (
            <span style={{
              ...styles.scoreChip,
              background: meta.score >= 0.75 ? '#dcfce7' : meta.score >= 0.5 ? '#fef3c7' : '#fee2e2',
              color: meta.score >= 0.75 ? '#166534' : meta.score >= 0.5 ? '#92400e' : '#991b1b',
            }}>
              Last score: {Math.round(meta.score * 100)}%
            </span>
          )}
        </div>

        {meta?.skill_scores && Object.keys(meta.skill_scores).length > 0 && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Topic Scores</h3>
            {Object.entries(meta.skill_scores).map(([topic, score]) => (
              <SkillBar key={topic} topic={topic} score={score} />
            ))}
          </div>
        )}

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Question</h3>
          <div style={styles.questionBody}>
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
                p: ({ children }) => <p style={styles.mdP}>{children}</p>,
                ol: ({ children }) => <ol style={styles.mdList}>{children}</ol>,
                ul: ({ children }) => <ul style={styles.mdList}>{children}</ul>,
                li: ({ children }) => <li style={styles.mdLi}>{children}</li>,
                strong: ({ children }) => <strong style={{ color: '#111' }}>{children}</strong>,
                em: ({ children }) => <em style={{ color: '#555' }}>{children}</em>,
              }}
            >
              {question}
            </ReactMarkdown>
            {streaming && <span style={styles.cursor}>|</span>}
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

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
              Submit Answer
            </button>
          </form>
        </div>

        <a href="/" style={styles.backLink}>End Session & Return</a>
      </div>
    </div>
  )
}

const styles = {
  page:       { minHeight: '100vh', background: '#f5f5f5', padding: '2rem' },
  container:  { maxWidth: '800px', margin: '0 auto' },
  heading:    { margin: '0 0 1rem', fontSize: '1.4rem', fontWeight: 700 },
  topBar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' },
  topLeft:    { display: 'flex', alignItems: 'center', gap: '10px' },
  turnBadge:  { background: '#e5e7eb', padding: '3px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, color: '#374151' },
  topicPill:  { background: '#dbeafe', padding: '3px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, color: '#1d4ed8', textTransform: 'capitalize' },
  scoreChip:  { padding: '4px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 },
  card:       { background: '#fff', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,.05)', marginBottom: '1rem' },
  cardTitle:  { margin: '0 0 10px', fontSize: '1rem', fontWeight: 600, color: '#0f172a' },

  // Question markdown
  questionBody: { fontSize: '0.95rem', lineHeight: 1.75, color: '#1e293b' },
  cursor:       { animation: 'blink 1s step-end infinite', color: '#2563eb', fontWeight: 700, fontSize: '1.1rem' },
  mdP:          { margin: '0.5rem 0' },
  mdList:       { paddingLeft: '1.5rem', margin: '0.5rem 0' },
  mdLi:         { marginBottom: '4px' },
  inlineCode:   { background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '0.88em', color: '#d946ef', fontFamily: 'ui-monospace, monospace' },
  codeBlock:    { background: '#0f172a', color: '#e2e8f0', padding: '14px 16px', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.6, overflowX: 'auto', margin: '0.5rem 0' },

  questionBox: { display: 'flex', gap: '8px' },
  questionLabel: { fontSize: '0.85rem', fontWeight: 600, color: '#555', minWidth: '70px' },
  questionText: { fontSize: '1.05rem', lineHeight: 1.6, flex: 1 },
  // Question markdown
  // Jupyter-style answer cell
  answerSection: { display: 'flex', gap: '0', background: '#fff', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: '1rem', border: '1px solid #e2e8f0' },
  nbLabel:       { background: '#f8fafc', color: '#64748b', padding: '14px 14px 0', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.8rem', fontWeight: 600, minWidth: '52px', textAlign: 'right', borderRight: '1px solid #e2e8f0', userSelect: 'none' },
  textarea:      { width: '100%', background: '#1e1e2e', color: '#cdd6f4', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '0.875rem', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', lineHeight: 1.7, resize: 'vertical', borderRadius: 0, tabSize: 4, minHeight: '180px' },
  btn:        { padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  error:      { color: '#dc2626', fontSize: '0.875rem', margin: '8px 0' },
  backLink:   { display: 'inline-block', marginTop: '1rem', color: '#888', fontSize: '0.85rem' },
}
