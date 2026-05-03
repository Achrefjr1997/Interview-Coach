import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { getMe } from './api'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Dashboard from './pages/Dashboard'
import Interview from './pages/Interview'
import Report    from './pages/Report'
import Replay    from './pages/Replay'
import Analytics from './pages/Analytics'
import Spinner   from './components/Spinner'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(r => {
        setUser(r.data)
        return fetch('/api/v1/auth/token', { credentials: 'include' })
      })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setToken(d.token))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthCtx.Provider value={{ user, token, setUser, setToken, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <RequireAuth><Dashboard /></RequireAuth>
          } />
          <Route path="/interview/:sessionId" element={
            <RequireAuth><Interview /></RequireAuth>
          } />
          <Route path="/report/:sessionId" element={
            <RequireAuth><Report /></RequireAuth>
          } />
          <Route path="/replay/:sessionId" element={
            <RequireAuth><Replay /></RequireAuth>
          } />
          <Route path="/analytics" element={
            <RequireAuth><Analytics /></RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
