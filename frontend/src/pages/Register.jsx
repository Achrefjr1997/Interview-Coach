import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api'
import { useAuth } from '../App'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { setUser, setToken } = useAuth()
  const navigate = useNavigate()

  function passwordStrength(pw) {
    if (!pw) return 0
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^a-zA-Z0-9]/.test(pw)) score++
    return score
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      const r = await register({ name, email, password })
      setUser(r.data)
      const t = await fetch('/api/v1/auth/token', { credentials: 'include' })
      if (t.ok) setToken((await t.json()).token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img src="/assets/logo.jpg" alt="Interview Coach" style={styles.logo} />
          <h1 style={styles.title}>Interview Coach</h1>
          <p style={styles.subtitle}>Create your account</p>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.field}>
            <label style={styles.label}>Name</label>
            <input style={styles.input} type="text" value={name}
              onChange={e => setName(e.target.value)} required placeholder="Your name" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            {password && (
              <div style={styles.strengthBar}>
                {[1, 2, 3, 4].map(i => {
                  const filled = i <= passwordStrength(password)
                  const color = i <= 2 ? 'var(--red)' : i === 3 ? 'var(--amber)' : 'var(--green)'
                  return <div key={i} style={{ ...styles.strengthSeg, background: filled ? color : 'var(--border)' }} />
                })}
              </div>
            )}
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input style={styles.input} type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button style={{ ...styles.btn, opacity: submitting ? 0.6 : 1 }} type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A14', padding: '2rem' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', width: '100%', maxWidth: '400px', overflow: 'hidden' },
  header: { padding: '2.5rem 2rem 1.5rem', textAlign: 'center' },
  logo: { width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 4px 24px rgba(124,92,252,0.25)' },
  title: { margin: '1rem 0 0.25rem', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' },
  subtitle: { margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' },
  form: { padding: '0 2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '11px 14px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', background: 'var(--surface-raised)', color: 'var(--text-primary)' },
  btn: { padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 200ms ease' },
  error: { background: 'rgba(239,68,68,0.1)', color: 'var(--red)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' },
  strengthBar: { display: 'flex', gap: '4px', marginTop: '6px' },
  strengthSeg: { height: '3px', flex: 1, borderRadius: '2px', transition: 'background 0.3s ease' },
  footer: { textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 2rem 2rem', margin: 0 },
}
