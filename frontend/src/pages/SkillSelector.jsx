import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSkillProfile, selectSkills, getSkillSessionConfig, createSession } from '../api'
import ScoreRing from '../components/ScoreRing'
import Sparkline from '../components/Sparkline'
import SkillEvolutionChart from '../components/SkillEvolutionChart'
import Spinner from '../components/Spinner'
import { ArrowLeft, ArrowRight, CheckSquare, Square, ChevronDown, ChevronRight, Upload } from 'lucide-react'

const CATEGORY_CONFIG = {
  missing_critical: { label: 'Critical Gaps', color: '#F0997B', order: 0 },
  missing_nice: { label: 'Nice to Have', color: '#EF9F27', order: 1 },
  trending: { label: 'Trending', color: '#5DCAA5', order: 2 },
  matched: { label: 'You Already Have', color: '#7C5CFC', order: 3 },
}

export default function SkillSelector() {
  const [profile, setProfile] = useState(null)
  const [selected, setSelected] = useState({})
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getSkillProfile()
      .then(r => {
        setProfile(r.data)
        const sel = {}
        r.data.skills.forEach(s => { sel[s.id] = s.selected })
        setSelected(sel)
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load skill profile'))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(skillId) {
    const newVal = !selected[skillId]
    setSelected(prev => ({ ...prev, [skillId]: newVal }))
    try {
      await selectSkills({ skill_ids: [skillId], selected: newVal })
    } catch { /* optimistic — silence error */ }
  }

  function toggleExpand(skillId) {
    setExpanded(prev => ({ ...prev, [skillId]: !prev[skillId] }))
  }

  async function handleStart() {
    setStarting(true)
    setError('')
    try {
      const configRes = await getSkillSessionConfig()
      const sessionRes = await createSession(configRes.data)
      navigate(`/interview/${sessionRes.data.session_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start interview')
      setStarting(false)
    }
  }

  const grouped = {}
  if (profile) {
    profile.skills.forEach(s => {
      const cat = s.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(s)
    })
  }

  const categories = Object.entries(grouped).sort((a, b) => (CATEGORY_CONFIG[a[0]]?.order ?? 9) - (CATEGORY_CONFIG[b[0]]?.order ?? 9))
  const selectedCount = Object.values(selected).filter(Boolean).length

  if (loading) return <div style={styles.center}><Spinner /></div>
  if (error && !profile) return (
    <div style={styles.center}>
      <p style={styles.errorText}>{error}</p>
      <Link to="/cv" style={styles.backBtn}>Upload CV</Link>
    </div>
  )

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navBrand}>
            <img src="/assets/logo.jpg" alt="Interview Coach" style={styles.navLogo} />
            <span style={styles.navBrandText}>Skill Planner</span>
          </div>
          <Link to="/" style={styles.backBtn}><ArrowLeft size={14} /> Dashboard</Link>
        </div>
      </nav>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Select Skills to Test</h1>
          <p style={styles.subtitle}>{profile?.role} — {profile?.seniority} level · <Link to="/cv" style={styles.reuploadLink}><Upload size={10} /> Re-upload CV</Link></p>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={styles.errorClose}>×</button>
          </div>
        )}

        <div style={styles.skillList}>
          {categories.map(([cat, skills]) => {
            const cfg = CATEGORY_CONFIG[cat] || { label: cat, color: 'var(--text-muted)' }
            return (
              <div key={cat} style={styles.categorySection}>
                <div style={styles.categoryHeader}>
                  <div style={{ ...styles.categoryDot, background: cfg.color }} />
                  <h3 style={styles.categoryTitle}>{cfg.label}</h3>
                  <span style={styles.categoryCount}>{skills.length} skills</span>
                </div>

                {skills.map(skill => {
                  const isSelected = selected[skill.id]
                  const isExpanded = expanded[skill.id]
                  const emaArr = skill.evolution?.map(e => e.ema_after).filter(v => v != null)
                  const hasEvolution = emaArr && emaArr.length > 0
                  const tested = skill.ema_score != null

                  return (
                    <div key={skill.id}>
                      <div style={{ ...styles.skillRow, background: isSelected ? 'rgba(124,92,252,0.06)' : 'var(--surface)' }}>
                        <button onClick={() => handleToggle(skill.id)} style={styles.checkBtn}>
                          {isSelected ? <CheckSquare size={18} color="var(--accent)" /> : <Square size={18} color="var(--text-muted)" />}
                        </button>

                        <div style={styles.skillInfo}>
                          <div style={styles.skillName}>{skill.display_name}</div>
                          <div style={styles.skillMeta}>
                            <span style={{ ...styles.skillBadge, color: cfg.color, background: cfg.color + '18' }}>{cfg.label}</span>
                            {skill.attempts > 0 && <span style={styles.attempts}>{skill.attempts} attempts</span>}
                          </div>
                        </div>

                        <div style={styles.skillScore}>
                          <ScoreRing score={skill.ema_score ?? 0} size={40} strokeWidth={4} />
                          {!tested && <span style={styles.untested}>untested</span>}
                        </div>

                        {hasEvolution ? (
                          <button onClick={() => toggleExpand(skill.id)} style={styles.expandBtn}>
                            <Sparkline data={emaArr} />
                            {isExpanded ? <ChevronDown size={12} color="var(--text-muted)" /> : <ChevronRight size={12} color="var(--text-muted)" />}
                          </button>
                        ) : (
                          <div style={styles.noData}>—</div>
                        )}
                      </div>

                      {isExpanded && hasEvolution && (
                        <SkillEvolutionChart evolution={skill.evolution} />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky Footer */}
      <div style={styles.footer}>
        <div style={styles.footerInner}>
          <span style={styles.footerCount}>{selectedCount} skill{selectedCount !== 1 ? 's' : ''} selected</span>
          <button onClick={handleStart} disabled={selectedCount === 0 || starting} style={{ ...styles.startBtn, opacity: selectedCount === 0 || starting ? 0.5 : 1 }}>
            {starting ? 'Starting...' : 'Start Interview'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' },
  nav: { padding: '12px 24px', background: 'rgba(14,14,22,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 },
  navInner: { maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navBrand: { display: 'flex', alignItems: 'center', gap: '10px' },
  navLogo: { width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' },
  navBrandText: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' },
  container: { maxWidth: '800px', margin: '0 auto', padding: '2rem' },
  header: { textAlign: 'center', marginBottom: '2rem' },
  title: { margin: '0 0 6px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' },
  subtitle: { margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' },
  reuploadLink: { display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 },
  errorText: { color: 'var(--red)', fontSize: '0.9rem' },
  errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239,68,68,0.08)', color: 'var(--red)', padding: '10px 14px', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.85rem' },
  errorClose: { background: 'none', border: 'none', color: 'var(--red)', fontSize: '1.1rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1, fontWeight: 700 },
  skillList: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  categorySection: { background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' },
  categoryHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', borderBottom: '1px solid var(--border)' },
  categoryDot: { width: '10px', height: '10px', borderRadius: '3px' },
  categoryTitle: { margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1 },
  categoryCount: { fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 },
  skillRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' },
  checkBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' },
  skillInfo: { flex: 1, minWidth: 0 },
  skillName: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' },
  skillMeta: { display: 'flex', alignItems: 'center', gap: '6px' },
  skillBadge: { padding: '2px 8px', borderRadius: '999px', fontSize: '0.625rem', fontWeight: 600 },
  attempts: { fontSize: '0.7rem', color: 'var(--text-muted)' },
  skillScore: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '50px' },
  untested: { fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 500 },
  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px' },
  noData: { width: '80px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' },
  footer: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(14,14,22,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', padding: '14px 24px', zIndex: 10 },
  footerInner: { maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerCount: { fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 },
  startBtn: { padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
}
