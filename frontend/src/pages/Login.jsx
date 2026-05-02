import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api'
import { useAuth } from '../App'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const { setUser, setToken }   = useAuth()
  const navigate                = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const r = await login({ email, password })
      setUser(r.data)
      const t = await fetch('/api/v1/auth/token', { credentials: 'include' })
      if (t.ok) setToken((await t.json()).token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Interview Coach</h1>
        <h2 style={styles.sub}>Sign in</h2>
        {error && <p style={styles.error}>{error}</p>}
        <label style={styles.label}>Email</label>
        <input style={styles.input} type="email" value={email}
          onChange={e => setEmail(e.target.value)} required />
        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" value={password}
          onChange={e => setPassword(e.target.value)} required />
        <button style={styles.btn} type="submit">Sign in</button>
        <p style={styles.link}>No account? <Link to="/register">Register</Link></p>
      </form>
    </div>
  )
}

const styles = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
  card:  { background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 2px 16px rgba(0,0,0,.08)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#1a1a1a' },
  sub:   { margin: 0, fontWeight: 500, color: '#444', fontSize: '1rem' },
  label: { fontSize: '0.85rem', fontWeight: 500, color: '#555' },
  input: { padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem', outline: 'none' },
  btn:   { padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: '4px' },
  error: { color: '#dc2626', fontSize: '0.875rem', margin: 0 },
  link:  { textAlign: 'center', fontSize: '0.875rem', color: '#555', margin: 0 },
}
