import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/admin.css'

export default function AdminContacts() {
  const { api, user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [sort, setSort] = useState({ key: 'id', dir: 'desc' })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })

  useEffect(() => {
    loadContacts()
  }, [pagination.page])

  const loadContacts = async () => {
    try {
      setLoading(true)
      setError('')
      // Note: You'll need to create this endpoint on the backend
      const data = await api(`/contacts/admin?page=${pagination.page}&limit=${pagination.limit}`)
      setContacts(data.items || [])
      setPagination(prev => ({ ...prev, total: data.total || 0 }))
    } catch (err) {
      setError(err.message)
      // Fallback to empty array if endpoint doesn't exist yet
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return `${c.name} ${c.email} ${c.subject || ''} ${c.message || ''}`.toLowerCase().includes(q)
  })

  const toggleSort = (key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const caret = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const getVal = (c, key) => {
    switch (key) {
      case 'id': return Number(c.id) || 0
      case 'name': return (c.name || '').toLowerCase()
      case 'email': return (c.email || '').toLowerCase()
      case 'subject': return (c.subject || '').toLowerCase()
      case 'status': return (c.status || '').toLowerCase()
      case 'created_at': return new Date(c.created_at).getTime() || 0
      default: return ''
    }
  }

  const sortedContacts = [...filteredContacts].sort((a,b) => {
    const av = getVal(a, sort.key)
    const bv = getVal(b, sort.key)
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

  const updateStatus = async (id, status) => {
    try {
      setSavingId(id)
      setError('')
      await api(`/contacts/admin/${id}`, { method: 'PUT', body: { status } })
      setContacts(prev => prev.map(c => (c.id === id ? { ...c, status } : c)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const deleteContact = async (id) => {
    if (!confirm('Delete this contact message?')) return
    try {
      setSavingId(id)
      setError('')
      await api(`/contacts/admin/${id}`, { method: 'DELETE' })
      setContacts(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const handleReply = (contact) => {
    // Construct mailto link with pre-filled subject and body
    const subject = encodeURIComponent(`Re: ${contact.subject || 'Your Contact Message'}`)
    const body = encodeURIComponent(`Hi ${contact.name},\n\nThank you for contacting FreshMart.\n\nYour original message:\n"${contact.message}"\n\nBest regards,\nFreshMart Team`)
    const mailtoLink = `mailto:${contact.email}?subject=${subject}&body=${body}`
    
    // Open default email client
    window.location.href = mailtoLink
    
    // Update status to in_progress if it's new
    if (contact.status === 'new') {
      updateStatus(contact.id, 'in_progress')
    }
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
        <h1>Contact Responses</h1>
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
            placeholder="Search contact messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="admin-loading">Loading contact messages...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table contacts-table">
              <thead>
                <tr>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('id')}>ID{caret('id')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('name')}>Name{caret('name')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('email')}>Email{caret('email')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('subject')}>Subject{caret('subject')}</th>
                  <th>Message</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('status')}>Status{caret('status')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('created_at')}>Submitted{caret('created_at')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-products">
                      {error ? 'Contact responses endpoint not yet implemented. Create /api/contacts/admin endpoint on backend.' : 'No contact messages found'}
                    </td>
                  </tr>
                ) : (
                  sortedContacts.map(c => (
                    <tr key={c.id}>
                      <td><strong>#{c.id}</strong></td>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.email}</td>
                      <td>{c.subject || '-'}</td>
                      <td style={{ maxWidth: '300px' }}>
                        <details>
                          <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>
                            View message
                          </summary>
                          <div style={{ 
                            marginTop: '1rem', 
                            padding: '1rem', 
                            background: '#f9fafb', 
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            whiteSpace: 'pre-wrap',
                            fontSize: '1.3rem',
                            lineHeight: '1.6'
                          }}>
                            {c.message}
                          </div>
                        </details>
                      </td>
                      <td>
                        <span className={`badge contact-status ${c.status || 'new'}`}>
                          {c.status || 'new'}
                        </span>
                      </td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-action btn-reply"
                            onClick={() => handleReply(c)}
                            title="Reply via Email"
                            disabled={savingId === c.id}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                              <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            Reply
                          </button>
                          <select
                            value={c.status || 'new'}
                            onChange={(e) => updateStatus(c.id, e.target.value)}
                            disabled={savingId === c.id}
                            style={{
                              padding: '0.8rem 1rem',
                              border: '2px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '1.3rem',
                              cursor: 'pointer',
                              background: 'white'
                            }}
                          >
                            <option value="new">New</option>
                            <option value="in_progress">In Progress</option>
                            <option value="responded">Responded</option>
                          </select>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => deleteContact(c.id)}
                            disabled={savingId === c.id}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
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
              ({pagination.total} total contacts)
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
