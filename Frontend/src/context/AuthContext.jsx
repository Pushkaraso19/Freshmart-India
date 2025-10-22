import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { withAuth } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth:token') || '')
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth:user') || 'null') } catch { return null }
  })

  useEffect(() => {
    if (token) localStorage.setItem('auth:token', token)
    else localStorage.removeItem('auth:token')
  }, [token])

  useEffect(() => {
    try {
      if (user) localStorage.setItem('auth:user', JSON.stringify(user))
      else localStorage.removeItem('auth:user')
    } catch {}
  }, [user])

  const api = useMemo(() => withAuth(token), [token])

  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } })
    setUser(data.user)
    setToken(data.token)
    return data
  }

  const register = async (name, email, phone, password) => {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, phone, password } })
    setUser(data.user)
    setToken(data.token)
    return data
  }

  const logout = () => {
    setUser(null)
    setToken('')
  }

  const value = { user, token, api, login, register, logout, isAuthenticated: !!token }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
