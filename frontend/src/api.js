import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

// Auth
export const register  = (data)       => api.post('/auth/register', data)
export const login     = (data)       => api.post('/auth/login', data)
export const logout    = ()           => api.post('/auth/logout')
export const getMe     = ()           => api.get('/auth/me')

// Sessions
export const createSession = (data)   => api.post('/sessions', data)
export const listSessions  = ()       => api.get('/sessions')
export const getSession    = (id)     => api.get(`/sessions/${id}`)
export const deleteSession = (id)     => api.delete(`/sessions/${id}`)
export const getRecommendations = ()  => api.get('/recommendations')

// Answer (REST fallback)
export const submitAnswer  = (data)   => api.post('/answer', data)

// Report
export const getReport     = (id)     => api.get(`/reports/${id}`)

// Analytics
export const getAnalytics  = ()       => api.get('/analytics')
