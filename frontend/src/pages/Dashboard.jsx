import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createSession, listSessions, logout, deleteSession, getRecommendations } from '../api'
import { useAuth } from '../App'
import { Zap, Clock, Target, ChevronRight, Trash2, BarChart3, LogOut, TrendingUp, Award, Layers, ArrowRight } from 'lucide-react'

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
  if (score == null) return 'var(--text-muted)'
  if (score >= 0.7) return 'var(--green)'
  if (score >= 0.5) return 'var(--amber)'
  return 'var(--red)'
}

function scoreGlow(score) {
  if (score == null) return 'none'
  if (score >= 0.7) return '0 0 12px rgba(0,214,143,0.3)'
  if (score >= 0.5) return '0 0 12px rgba(245,158,11,0.3)'
  return '0 0 12px rgba(239,68,68,0.3)'
}

export default function Dashboard() {
  const [role, setRole] = useState('Senior Python Engineer')
  const [topicsInput, setTopicsInput] = useState('algorithms, system_design, python')
  const [maxQuestions, setMaxQuestions] = useState(10)
  const [startDifficulty, setStartDiff] = useState(2)
  const [sessions, setSessions] = useState([])
  const [recommendations, setRecs] = useState([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { user, setUser, setToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([listSessions(), getRecommendations()])
      .then(([sRes, rRes]) => {
        setSessions(sRes.data)
        setRecs(rRes.data.recommendations || [])
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setDataLoading(false))
  }, [])

  const stats = (() => {
    const completed = sessions.filter(s => s.session_complete)
    const avgScore = completed.length
      ? completed.reduce((a, s) => a + (s.overall_score || 0), 0) / completed.length
      : 0
    const bestScore = completed.length
      ? Math.max(...completed.map(s => s.overall_score || 0))
      : 0
    const velocity = completed.length >= 2
      ? (() => {
          const first = completed[completed.length - 1].overall_score || 0
          const last = completed[0].overall_score || 0
          return Math.round((last - first) * 100)
        })()
      : null
    return { total: sessions.length, avg: avgScore, best: bestScore, velocity }
  })()

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
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
      setError(err.response?.data?.detail || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  function promptDelete(sessionId) {
    setDeleteTarget(sessionId)
  }

  async function confirmDelete() {
    const id = deleteTarget
    setDeleteTarget(null)
    setDeleting(id)
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s.session_id !== id))
    } catch {
      setError('Failed to delete session')
    } finally {
      setDeleting(null)
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setToken(null)
    navigate('/login')
  }

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={styles.page}>
      {/* Floating Nav */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navBrand}>
            <img src="/assets/logo.jpg" alt="Interview Coach" style={styles.navLogo} />
            <span style={styles.navBrandText}>Interview Coach</span>
          </div>
          <div style={styles.navActions}>
            <Link to="/analytics" style={styles.navLink} className="nav-link-hover">
              <BarChart3 size={14} /> Analytics
            </Link>
            <div style={styles.navAvatar}>{initials}</div>
            <button onClick={handleLogout} style={styles.navLogout} className="nav-btn-hover" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroBg} />
        <div style={styles.heroInner}>
          <div style={styles.heroContent}>
            <img src="/assets/logo.jpg" alt="Interview Coach" style={styles.heroLogo} />
            <p style={styles.heroGreeting}>Welcome back</p>
            <h1 style={styles.heroTitle}>{user?.name?.split(' ')[0] || 'there'}</h1>
            <p style={styles.heroSub}>Ready to level up your technical skills?</p>
          </div>
        </div>
      </div>

      <div style={styles.container}>
        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={styles.errorClose} className="error-close-hover" aria-label="Dismiss">×</button>
          </div>
        )}

        {/* Bento Grid */}
        <div style={styles.bento}>
          {/* Stat Cards Row */}
          <div style={styles.statCard} className="stat-card-hover">
            <div style={styles.statIcon}><Layers size={18} color="var(--accent)" /></div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Sessions</div>
          </div>

          <div style={styles.statCard} className="stat-card-hover">
            <div style={styles.statIcon}><Award size={18} color="var(--green)" /></div>
            <div style={{ ...styles.statValue, color: stats.avg >= 0.5 ? 'var(--green)' : 'var(--amber)' }}>
              {stats.total > 0 ? `${Math.round(stats.avg * 100)}%` : '—'}
            </div>
            <div style={styles.statLabel}>Average Score</div>
          </div>

          <div style={styles.statCard} className="stat-card-hover">
            <div style={styles.statIcon}><TrendingUp size={18} color={stats.velocity > 0 ? 'var(--green)' : stats.velocity < 0 ? 'var(--red)' : 'var(--amber)'} /></div>
            <div style={{ ...styles.statValue, color: stats.velocity > 0 ? 'var(--green)' : stats.velocity < 0 ? 'var(--red)' : 'var(--text-primary)' }}>
              {stats.velocity !== null ? `${stats.velocity > 0 ? '+' : ''}${stats.velocity}%` : '—'}
            </div>
            <div style={styles.statLabel}>Velocity</div>
          </div>

          <div style={styles.statCard} className="stat-card-hover">
            <div style={styles.statIcon}><Award size={18} color="var(--amber)" /></div>
            <div style={{ ...styles.statValue, color: 'var(--green)' }}>
              {stats.total > 0 ? `${Math.round(stats.best * 100)}%` : '—'}
            </div>
            <div style={styles.statLabel}>Best Score</div>
          </div>

          {/* New Interview Card (spans 2 cols) */}
          <div style={styles.bentoInterview}>
            <div style={styles.cardAccent} />
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderLeft}>
                <div style={styles.cardIcon}><Zap size={16} /></div>
                <h2 style={styles.cardTitle}>New Interview</h2>
              </div>
            </div>
            <form onSubmit={handleCreate} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Role</label>
                <input style={styles.input} type="text" value={role}
                  onChange={e => setRole(e.target.value)} required placeholder="e.g. Senior Python Engineer" />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Topics</label>
                <input style={styles.input} type="text" value={topicsInput}
                  onChange={e => setTopicsInput(e.target.value)} required placeholder="algorithms, system_design, python" />
              </div>

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Questions</label>
                  <input style={styles.input} type="number" min={1} max={50} value={maxQuestions}
                    onChange={e => setMaxQuestions(parseInt(e.target.value) || 10)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Difficulty</label>
                  <select style={styles.input} value={startDifficulty} onChange={e => setStartDiff(parseInt(e.target.value))}>
                    {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{['Entry', 'Junior', 'Mid', 'Senior', 'Staff'][d - 1]}</option>)}
                  </select>
                </div>
              </div>

              <button style={styles.btn} className="btn-primary-hover" type="submit" disabled={loading}>
                {loading ? 'Starting...' : 'Start Interview'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Past Sessions */}
          <div style={styles.bentoSessions}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderLeft}>
                <div style={{ ...styles.cardIcon, background: 'rgba(124,92,252,0.12)' }}><Clock size={16} /></div>
                <h2 style={styles.cardTitle}>Recent Sessions</h2>
              </div>
              {sessions.length > 4 && (
                <span style={styles.sessionCount}>{sessions.length} total</span>
              )}
            </div>
            {dataLoading ? (
              <div style={styles.empty}>
                <p style={{ color: 'var(--text-secondary)' }}>Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}><Clock size={24} /></div>
                <p style={styles.emptyText}>No sessions yet</p>
                <p style={styles.emptySub}>Start your first interview to see progress here.</p>
              </div>
            ) : (
              <div style={styles.sessionList}>
                {sessions.slice(0, 5).map((s, i) => (
                  <div key={s.session_id} style={styles.sessionRow} className={`fade-in stagger-${Math.min(i + 1, 8)} session-row-hover`}>
                    <div style={{ ...styles.sessionScoreDot, background: scoreColor(s.overall_score), boxShadow: scoreGlow(s.overall_score) }} />
                    <div style={styles.sessionContent}>
                      <div style={styles.sessionRole}>{s.role}</div>
                      <div style={styles.sessionMeta}>
                        <span style={styles.sessionDate}>{timeAgo(s.created_at)}</span>
                        {s.topics?.slice(0, 2).map(t => (
                          <span key={t} style={styles.topicTag}>{t.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                    <div style={styles.sessionRight}>
                      <div style={{ ...styles.sessionScore, color: scoreColor(s.overall_score) }}>
                        {s.session_complete ? `${Math.round((s.overall_score || 0) * 100)}%` : '—'}
                      </div>
                      {s.session_complete ? (
                        <div style={styles.sessionLinks}>
                          <Link to={`/report/${s.session_id}`} style={styles.sessionLink}>Report</Link>
                          <span style={styles.sessionLinkSep}>·</span>
                          <Link to={`/replay/${s.session_id}`} style={styles.sessionLink}>Replay</Link>
                        </div>
                      ) : (
                        <Link to={`/interview/${s.session_id}`} style={styles.sessionLink}>Resume</Link>
                      )}
                    </div>
                    <button
                      onClick={() => promptDelete(s.session_id)}
                      style={styles.deleteBtn}
                      className="delete-btn-reveal"
                      title="Delete session"
                      disabled={deleting === s.session_id}
                      aria-label="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div style={styles.recSection}>
            <div style={styles.recHeader}>
              <div style={styles.cardHeaderLeft}>
                <div style={{ ...styles.cardIcon, background: 'rgba(0,214,143,0.12)' }}><Target size={16} /></div>
                <h2 style={styles.cardTitle}>Recommended Practice</h2>
              </div>
            </div>
            <div style={styles.recGrid}>
              {recommendations.slice(0, 4).map((r, i) => {
                const levelColor = r.level === 'Critical' ? 'var(--red)' : r.level === 'Needs Work' ? 'var(--amber)' : 'var(--green)'
                return (
                  <div key={r.topic} style={styles.recCard} className={`fade-in stagger-${Math.min(i + 1, 8)} rec-card-hover`}>
                    <div style={styles.recCardHeader}>
                      <span style={styles.recTopic}>{r.topic.replace('_', ' ')}</span>
                      <span style={{ ...styles.recBadge, color: levelColor, background: levelColor + '18' }}>
                        {r.level}
                      </span>
                    </div>
                    <div style={styles.recScoreRow}>
                      <span style={{ ...styles.recScore, color: levelColor }}>
                        {Math.round(r.avg_score * 100)}%
                      </span>
                      <span style={styles.recCount}>{r.sessions_count} questions</span>
                    </div>
                    <p style={styles.recAction}>{r.action}</p>
                    <button
                      onClick={() => {
                        setTopicsInput(r.topic)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      style={styles.recBtn}
                      className="rec-btn-hover"
                    >
                      Practice <ChevronRight size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div style={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
            <div style={styles.modal} className="scale-in" onClick={e => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Delete Session?</h3>
              <p style={styles.modalText}>This action cannot be undone. All Q&A data will be lost.</p>
              <div style={styles.modalActions}>
                <button onClick={() => setDeleteTarget(null)} style={styles.modalCancel} className="modal-cancel-hover">Cancel</button>
                <button onClick={confirmDelete} style={styles.modalDelete} className="modal-delete-hover">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },

  // Floating Nav
  nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '12px 24px', background: 'rgba(14,14,22,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' },
  navInner: { maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navBrand: { display: 'flex', alignItems: 'center', gap: '10px' },
  navLogo: { width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' },
  navBrandText: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' },
  navActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  navLink: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s ease' },
  navAvatar: { width: '28px', height: '28px', borderRadius: '7px', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 },
  navLogout: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' },

  // Hero
  hero: { position: 'relative', background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 50%, #1a1040 100%)', padding: '5rem 2rem 3.5rem', borderBottom: '1px solid var(--border)', overflow: 'hidden' },
  heroBg: { position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)', pointerEvents: 'none' },
  heroInner: { maxWidth: '1100px', margin: '0 auto' },
  heroContent: { maxWidth: '500px' },
  heroLogo: { width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', marginBottom: '16px', boxShadow: '0 4px 24px rgba(124,92,252,0.25)' },
  heroGreeting: { margin: 0, fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' },
  heroTitle: { margin: '6px 0 8px', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' },
  heroSub: { margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.5 },

  // Container
  container: { maxWidth: '1100px', margin: '0 auto', padding: '2rem' },

  // Error
  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239,68,68,0.08)', color: 'var(--red)', padding: '10px 14px', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.85rem' },
  errorClose: { background: 'none', border: 'none', color: 'var(--red)', fontSize: '1.1rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1, fontWeight: 700, transition: 'background 0.15s ease' },

  // Bento Grid
  bento: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '2rem' },

  // Stat Cards
  statCard: { background: 'var(--surface)', borderRadius: '14px', padding: '18px 20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'all 0.2s ease' },
  statIcon: { width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' },
  statValue: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' },
  statLabel: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 },

  // Bento Interview (spans 2 cols)
  bentoInterview: { gridColumn: 'span 2', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' },
  cardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, var(--accent), var(--green))' },

  // Bento Sessions (spans 2 cols)
  bentoSessions: { gridColumn: 'span 2', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' },

  // Card
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' },
  cardHeaderLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  cardIcon: { width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124,92,252,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' },
  cardTitle: { margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' },
  sessionCount: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 },

  // Form
  form: { padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', background: 'var(--surface-raised)', color: 'var(--text-primary)' },
  row: { display: 'flex', gap: '12px' },
  btn: { padding: '12px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease' },

  // Empty
  empty: { padding: '2.5rem 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  emptyIcon: { color: 'var(--text-muted)', marginBottom: '4px' },
  emptyText: { margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' },
  emptySub: { margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' },

  // Sessions
  sessionList: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px 24px 20px' },
  sessionRow: { display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', gap: '10px', transition: 'background 0.15s ease' },
  sessionScoreDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  sessionContent: { flex: 1, minWidth: 0 },
  sessionRole: { fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' },
  sessionMeta: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' },
  sessionDate: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  topicTag: { fontSize: '0.625rem', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 7px', borderRadius: '6px', fontWeight: 500 },
  sessionRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  sessionScore: { fontWeight: 700, fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' },
  sessionLinks: { display: 'flex', alignItems: 'center', gap: '4px' },
  sessionLink: { fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500 },
  sessionLinkSep: { color: 'var(--text-muted)', fontSize: '0.7rem' },
  deleteBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0, transition: 'opacity 0.15s ease' },

  // Recommendations
  recSection: { background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '2rem' },
  recSectionHeader: { padding: '20px 24px 0' },
  recGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', padding: '16px 24px 24px' },
  recCard: { background: 'var(--surface-raised)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', transition: 'all 0.2s ease' },
  recCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  recTopic: { fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'capitalize' },
  recBadge: { padding: '2px 8px', borderRadius: '999px', fontSize: '0.625rem', fontWeight: 600 },
  recScoreRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' },
  recScore: { fontSize: '1.1rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  recCount: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  recAction: { margin: '0 0 10px', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 },
  recBtn: { width: '100%', padding: '8px', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s ease' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', maxWidth: '360px', width: '90%' },
  modalTitle: { margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' },
  modalText: { margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 },
  modalActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  modalCancel: { padding: '8px 18px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500, transition: 'all 0.15s ease' },
  modalDelete: { padding: '8px 18px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s ease' },
}
