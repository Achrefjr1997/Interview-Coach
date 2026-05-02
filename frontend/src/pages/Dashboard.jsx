import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createSession, listSessions, logout, deleteSession } from '../api'
import { useAuth } from '../App'

export default function Dashboard() {
  const [role, setRole]                 = useState('Senior Python Engineer')
  const [topicsInput, setTopicsInput]   = useState('algorithms, system_design, python')
  const [maxQuestions, setMaxQuestions] = useState(10)
  const [startDifficulty, setStartDiff] = useState(2)
  const [sessions, setSessions]         = useState([])
  const [loading, setLoading]           = useState(false)
  const { user, setUser, setToken }     = useAuth()
  const navigate                        = useNavigate()

  useEffect(() => {
    listSessions()
      .then(r => setSessions(r.data))
      .catch(() => {})
  }, [])

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
    try {
      await deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch {
      alert('Failed to delete session')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.heading}>Interview Coach</h1>
          <div style={styles.userInfo}>
            <span>{user?.email}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>
        </header>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>New Interview</h2>
            <form onSubmit={handleCreate} style={styles.form}>
              <label style={styles.label}>Role</label>
              <input style={styles.input} type="text" value={role}
                onChange={e => setRole(e.target.value)} required />

              <label style={styles.label}>Topics (comma-separated)</label>
              <input style={styles.input} type="text" value={topicsInput}
                onChange={e => setTopicsInput(e.target.value)} required />

              <label style={styles.label}>Max Questions</label>
              <input style={styles.input} type="number" min={1} max={50} value={maxQuestions}
                onChange={e => setMaxQuestions(parseInt(e.target.value) || 10)} />

              <label style={styles.label}>Start Difficulty</label>
              <select style={styles.input} value={startDifficulty}
                onChange={e => setStartDiff(parseInt(e.target.value))}>
                <option value={1}>1 - Entry</option>
                <option value={2}>2 - Junior</option>
                <option value={3}>3 - Mid</option>
                <option value={4}>4 - Senior</option>
                <option value={5}>5 - Staff</option>
              </select>

              <button style={styles.btn} type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Start Interview'}
              </button>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Past Sessions</h2>
            {sessions.length === 0 ? (
              <p style={styles.empty}>No sessions yet. Create one to get started.</p>
            ) : (
              <div style={styles.sessionList}>
                {sessions.map(s => (
                  <div key={s.session_id} style={styles.sessionRow}>
                    <div>
                      <div style={styles.sessionRole}>{s.role}</div>
                      <div style={styles.sessionDate}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </div>
                      <div style={styles.sessionRight}>
                        <div style={styles.sessionScore}>
                          {s.session_complete
                            ? `${Math.round((s.overall_score || 0) * 100)}%`
                            : 'In progress'}
                        </div>
                        {s.session_complete ? (
                          <Link to={`/report/${s.session_id}`} style={styles.viewLink}>View report</Link>
                        ) : (
                          <Link to={`/interview/${s.session_id}`} style={styles.viewLink}>Resume</Link>
                        )}
                        <button
                          onClick={() => handleDelete(s.session_id)}
                          style={styles.deleteBtn}
                          title="Delete session"
                        >
                          ✕
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page:      { minHeight: '100vh', background: '#f5f5f5', padding: '2rem' },
  container: { maxWidth: '960px', margin: '0 auto' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  heading:   { margin: 0, fontSize: '1.5rem', fontWeight: 700 },
  userInfo:  { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem', color: '#555' },
  logoutBtn: { padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' },
  grid:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  card:      { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,.06)' },
  cardTitle: { margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 600 },
  form:      { display: 'flex', flexDirection: 'column', gap: '10px' },
  label:     { fontSize: '0.85rem', fontWeight: 500, color: '#555' },
  input:     { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' },
  btn:       { padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', marginTop: '4px' },
  empty:     { color: '#999', fontSize: '0.875rem' },
  sessionList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sessionRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  sessionRole: { fontWeight: 600, fontSize: '0.9rem' },
  sessionDate: { fontSize: '0.8rem', color: '#888' },
  sessionRight: { textAlign: 'right' },
  sessionScore: { fontWeight: 700, fontSize: '0.9rem', color: '#2563eb' },
  viewLink: { fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' },
  deleteBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', padding: '2px 6px', marginLeft: '4px', borderRadius: '4px' },
}
