import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api'
import { useAuth } from '../App'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { setUser, setToken } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const r = await register({ name, email, password })
      setUser(r.data)
      const t = await fetch('/api/v1/auth/token', { credentials: 'include' })
      if (t.ok) setToken((await t.json()).token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.logo}></div>
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
          </div>
          <button style={styles.btn} type="submit">Create Account</button>
        </form>
        <p style={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' },
  card:   { background: '#fff', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '420px', overflow: 'hidden' },
  cardHeader: { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '2rem 2rem 1.5rem', textAlign: 'center', color: '#fff' },
  logo:   { fontSize: '2rem', marginBottom: '0.5rem' },
  title:  { margin: 0, fontSize: '1.4rem', fontWeight: 700 },
  subtitle: { margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.85 },
  form:   { padding: '1.75rem 2rem 1rem', display: 'flex', flexDirection: 'column', gap: '16px' },
  field:  { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:  { fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:  { padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', background: '#f8fafc' },
  btn:    { padding: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)', marginTop: '4px' },
  error:  { background: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', textAlign: 'center' },
  footer: { textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', padding: '0 2rem 2rem', margin: 0 },
}
