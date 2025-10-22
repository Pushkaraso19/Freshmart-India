import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/admin.css'

export default function AdminUsers() {
  const { api, user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [sort, setSort] = useState({ key: 'id', dir: 'asc' })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })

  useEffect(() => {
    loadUsers()
  }, [pagination.page])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      // Note: You'll need to create this endpoint on the backend
      const data = await api(`/users/admin?page=${pagination.page}&limit=${pagination.limit}`)
      setUsers(data.items || [])
      setPagination(prev => ({ ...prev, total: data.total || 0 }))
    } catch (err) {
      setError(err.message)
      // Fallback to empty array if endpoint doesn't exist yet
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return `${u.name} ${u.email} ${u.phone || ''}`.toLowerCase().includes(q)
  })

  const toggleSort = (key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const caret = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const getVal = (u, key) => {
    switch (key) {
      case 'id': return Number(u.id) || 0
      case 'name': return (u.name || '').toLowerCase()
      case 'email': return (u.email || '').toLowerCase()
      case 'phone': return (u.phone || '').toLowerCase()
      case 'role': return (u.role || '').toLowerCase()
      case 'is_active': return u.is_active ? 1 : 0
      case 'created_at': return new Date(u.created_at).getTime() || 0
      default: return ''
    }
  }

  const sortedUsers = [...filteredUsers].sort((a,b) => {
    const av = getVal(a, sort.key)
    const bv = getVal(b, sort.key)
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

  const updateUser = async (id, payload) => {
    try {
      setSavingId(id)
      setError('')
      const updated = await api(`/users/admin/${id}`, { method: 'PUT', body: payload })
      // update local list without full reload
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updated } : u)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const toggleRole = (u) => {
    const nextRole = u.role === 'admin' ? 'customer' : 'admin'
    updateUser(u.id, { role: nextRole })
  }

  const toggleActive = (u) => {
    updateUser(u.id, { is_active: !u.is_active })
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="admin-error">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>User Management</h1>
      </div>

      {error && (
        <div className="admin-error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}

      <div className="admin-content">
        <div className="admin-tools">
          <input
            className="admin-search"
            placeholder="Search users by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="admin-loading">Loading users...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table users-table">
              <thead>
                <tr>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('id')}>ID{caret('id')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('name')}>Name{caret('name')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('email')}>Email{caret('email')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('phone')}>Phone{caret('phone')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('role')}>Role{caret('role')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('is_active')}>Status{caret('is_active')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('created_at')}>Created{caret('created_at')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-products">
                      {error ? 'User management endpoint not yet implemented. Create /api/users/admin endpoint on backend.' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map(u => (
                    <tr key={u.id}>
                      <td><strong>#{u.id}</strong></td>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td>{u.phone || '-'}</td>
                      <td>
                        <span className={`badge role ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className={`btn-action ${u.role === 'admin' ? 'btn-deactivate' : 'btn-activate'}`}
                            onClick={() => toggleRole(u)}
                            title={u.role === 'admin' ? 'Make Customer' : 'Make Admin'}
                            disabled={savingId === u.id}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            {savingId === u.id ? 'Saving...' : (u.role === 'admin' ? 'Make Customer' : 'Make Admin')}
                          </button>
                          <button
                            className={`btn-action ${u.is_active ? 'btn-delete' : 'btn-activate'}`}
                            onClick={() => toggleActive(u)}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                            disabled={savingId === u.id}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {u.is_active ? (
                                <>
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="15" y1="9" x2="9" y2="15"></line>
                                  <line x1="9" y1="9" x2="15" y2="15"></line>
                                </>
                              ) : (
                                <>
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </>
                              )}
                            </svg>
                            {savingId === u.id ? 'Saving...' : (u.is_active ? 'Deactivate' : 'Activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="admin-pagination">
            <button 
              className="btn-pagination" 
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)} 
              ({pagination.total} total users)
            </span>
            <button 
              className="btn-pagination" 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
