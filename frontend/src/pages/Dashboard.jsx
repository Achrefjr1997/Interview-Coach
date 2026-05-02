import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createSession, listSessions, logout, deleteSession } from '../api'
import { useAuth } from '../App'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function scoreColor(score) {
  if (score == null) return '#94a3b8'
  if (score >= 0.7) return '#10b981'
  if (score >= 0.5) return '#f59e0b'
  return '#ef4444'
}

function scoreAccent(score) {
  if (score == null) return '#e2e8f0'
  if (score >= 0.7) return '#10b981'
  if (score >= 0.5) return '#f59e0b'
  return '#ef4444'
}

export default function Dashboard() {
  const [role, setRole]                 = useState('Senior Python Engineer')
  const [topicsInput, setTopicsInput]   = useState('algorithms, system_design, python')
  const [maxQuestions, setMaxQuestions] = useState(10)
  const [startDifficulty, setStartDiff] = useState(2)
  const [sessions, setSessions]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [deleting, setDeleting]         = useState(null)
  const { user, setUser, setToken }     = useAuth()
  const navigate                        = useNavigate()

  useEffect(() => {
    listSessions()
      .then(r => setSessions(r.data))
      .catch(() => {})
  }, [])

  const stats = (() => {
    const completed = sessions.filter(s => s.session_complete)
    const avgScore = completed.length
      ? completed.reduce((a, s) => a + (s.overall_score || 0), 0) / completed.length
      : 0
    const bestScore = completed.length
      ? Math.max(...completed.map(s => s.overall_score || 0))
      : 0
    return { total: sessions.length, avg: avgScore, best: bestScore }
  })()

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const topics = topicsInput.split(',').map(t => t.trim()).filter(Boolean)
      const r = await createSession({
        role,
        topics,
        max_questions: maxQuestions,
        start_difficulty: startDifficulty,
        candidate_name: user?.name || 'Candidate',
      })
      navigate(`/interview/${r.data.session_id}`)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setToken(null)
    navigate('/login')
  }

  async function handleDelete(sessionId) {
    if (!confirm('Delete this session?')) return
    setDeleting(sessionId)
    try {
      await deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch {
      alert('Failed to delete session')
    } finally {
      setDeleting(null)
    }
  }

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroLeft}>
            <div style={styles.avatar}>{initials}</div>
            <div>
              <h1 style={styles.heroTitle}>Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
              <p style={styles.heroSub}>Ready to sharpen your skills?</p>
            </div>
          </div>
          <div style={styles.heroStats}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Sessions</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={{ ...styles.statValue, color: stats.avg >= 0.5 ? '#10b981' : '#f59e0b' }}>
                {Math.round(stats.avg * 100)}%
              </div>
              <div style={styles.statLabel}>Avg Score</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={{ ...styles.statValue, color: '#10b981' }}>
                {Math.round(stats.best * 100)}%
              </div>
              <div style={styles.statLabel}>Best</div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.grid}>
          {/* New Interview Form */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <span style={styles.cardIcon}>⚡</span> New Interview
            </h2>
            <form onSubmit={handleCreate} style={styles.form}>
              <label style={styles.label}>Role</label>
              <input style={styles.input} type="text" value={role}
                onChange={e => setRole(e.target.value)} required placeholder="e.g. Senior Python Engineer" />

              <label style={styles.label}>Topics (comma-separated)</label>
              <input style={styles.input} type="text" value={topicsInput}
                onChange={e => setTopicsInput(e.target.value)} required placeholder="algorithms, system_design, python" />

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Max Questions</label>
                  <input style={styles.input} type="number" min={1} max={50} value={maxQuestions}
                    onChange={e => setMaxQuestions(parseInt(e.target.value) || 10)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Difficulty</label>
                  <select style={styles.input} value={startDifficulty}
                    onChange={e => setStartDiff(parseInt(e.target.value))}>
                    <option value={1}>1 — Entry</option>
                    <option value={2}>2 — Junior</option>
                    <option value={3}>3 — Mid</option>
                    <option value={4}>4 — Senior</option>
                    <option value={5}>5 — Staff</option>
                  </select>
                </div>
              </div>

              <button style={styles.btn} type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Start Interview →'}
              </button>
            </form>
          </div>

          {/* Past Sessions */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <span style={styles.cardIcon}>📋</span> Past Sessions
            </h2>
            {sessions.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>🎯</div>
                <p style={styles.emptyText}>No sessions yet</p>
                <p style={styles.emptySub}>Create your first interview to get started.</p>
              </div>
            ) : (
              <div style={styles.sessionList}>
                {sessions.map(s => (
                  <div key={s.session_id} style={styles.sessionRow}>
                    <div style={{ ...styles.sessionAccent, background: scoreAccent(s.overall_score) }} />
                    <div style={styles.sessionContent}>
                      <div style={styles.sessionRole}>{s.role}</div>
                      <div style={styles.sessionMeta}>
                        <span style={styles.sessionDate}>{timeAgo(s.created_at)}</span>
                        {s.topics && s.topics.slice(0, 2).map(t => (
                          <span key={t} style={styles.topicTag}>{t.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                    <div style={styles.sessionRight}>
                      <div style={{ ...styles.sessionScore, color: scoreColor(s.overall_score) }}>
                        {s.session_complete
                          ? `${Math.round((s.overall_score || 0) * 100)}%`
                          : '—'}
                      </div>
                      {s.session_complete ? (
                        <Link to={`/report/${s.session_id}`} style={styles.viewLink}>Report</Link>
                      ) : (
                        <Link to={`/interview/${s.session_id}`} style={styles.viewLink}>Resume</Link>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(s.session_id)}
                      style={{ ...styles.deleteBtn, opacity: deleting === s.session_id ? 0.5 : 1 }}
                      title="Delete session"
                      disabled={deleting === s.session_id}
                    >
                      {deleting === s.session_id ? '…' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <span>{user?.email}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page:      { minHeight: '100vh' },

  // Hero
  hero:      { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)', padding: '2rem 2rem 2.5rem', color: '#fff' },
  heroInner: { maxWidth: '960px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' },
  heroLeft:  { display: 'flex', alignItems: 'center', gap: '1rem' },
  avatar:    { width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.3)' },
  heroTitle: { margin: 0, fontSize: '1.5rem', fontWeight: 700 },
  heroSub:   { margin: '4px 0 0', fontSize: '0.9rem', opacity: 0.85 },
  heroStats: { display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.75rem 1.25rem', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' },
  statItem:  { textAlign: 'center' },
  statValue: { fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 },
  statLabel: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8, marginTop: '2px' },
  statDivider: { width: '1px', height: '32px', background: 'rgba(255,255,255,0.2)' },

  // Layout
  container: { maxWidth: '960px', margin: '0 auto', padding: '2rem' },
  grid:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },

  // Card
  card:      { background: '#fff', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' },
  cardTitle: { margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' },
  cardIcon:  { fontSize: '1.1rem' },

  // Form
  form:      { display: 'flex', flexDirection: 'column', gap: '12px' },
  label:     { fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:     { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', background: '#f8fafc', color: '#0f172a' },
  row:       { display: 'flex', gap: '12px' },
  btn:       { padding: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', marginTop: '4px', transition: 'transform 0.15s ease, box-shadow 0.15s ease', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' },

  // Empty state
  empty:     { textAlign: 'center', padding: '2rem 0' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  emptyText: { margin: 0, fontWeight: 600, color: '#334155', fontSize: '0.95rem' },
  emptySub:  { margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' },

  // Sessions
  sessionList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  sessionRow:  { display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #f1f5f9', transition: 'box-shadow 0.15s ease', position: 'relative', overflow: 'hidden' },
  sessionAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px' },
  sessionContent: { flex: 1, minWidth: 0 },
  sessionRole: { fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' },
  sessionMeta: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' },
  sessionDate: { fontSize: '0.75rem', color: '#94a3b8' },
  topicTag:    { fontSize: '0.65rem', background: '#e0e7ff', color: '#4338ca', padding: '1px 7px', borderRadius: '999px', fontWeight: 500 },
  sessionRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  sessionScore: { fontWeight: 700, fontSize: '0.95rem' },
  viewLink:    { fontSize: '0.75rem', color: '#6366f1', fontWeight: 500 },
  deleteBtn:   { background: 'none', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', marginLeft: '4px', transition: 'color 0.15s ease, background 0.15s ease', lineHeight: 1 },

  // Footer
  footer:    { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '2rem', fontSize: '0.8rem', color: '#94a3b8' },
  logoutBtn: { padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 },
}
