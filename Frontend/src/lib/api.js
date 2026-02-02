// Simple API client for the FreshMart frontend
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export const API_BASE = API_BASE_URL ? `${API_BASE_URL}/api` : '/api'

export function withAuth(token) {
  return async function api(path, { method = 'GET', headers = {}, body } = {}) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
    const res = await fetch(`${API_BASE}${path}`, opts)
    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`
      const err = new Error(msg)
      err.status = res.status
      err.data = data
      throw err
    }
    return data
  }
}
