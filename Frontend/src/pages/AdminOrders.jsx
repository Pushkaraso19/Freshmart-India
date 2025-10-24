import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import useAdminRealtime from '../hooks/useAdminRealtime.js'
import '../styles/admin.css'

export default function AdminOrders() {
  const { api, user, token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderFilter, setOrderFilter] = useState('')
  const [sort, setSort] = useState({ key: 'id', dir: 'desc' })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })

  useEffect(() => {
    loadOrders(true)
  }, [pagination.page])

  const loadOrders = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      setError('')
      const data = await api(`/orders/admin?page=${pagination.page}&limit=${pagination.limit}`)
      setOrders(data.items || [])
      setPagination(prev => ({ ...prev, total: data.total || 0 }))
    } catch (err) {
      setError(err.message)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const updateOrder = async (id, patch) => {
    try {
      setError('')
      await api(`/orders/admin/${id}`, { method: 'PATCH', body: patch })
      loadOrders()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredOrders = orders.filter(o => {
    const q = orderFilter.trim().toLowerCase()
    if (!q) return true
    const hay = `${o.user_name} ${o.user_email} ${o.status}`.toLowerCase()
    return hay.includes(q)
  })

  const toggleSort = (key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const caret = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const getVal = (o, key) => {
    switch (key) {
      case 'id': return Number(o.id) || 0
      case 'user_name': return (o.user_name || '').toLowerCase()
      case 'total_cents': return Number(o.total_cents) || 0
      case 'payment_status': return (o.payment_status || '').toLowerCase()
      case 'status': return (o.status || '').toLowerCase()
      case 'created_at': return new Date(o.created_at).getTime() || 0
      default: return ''
    }
  }

  const sortedOrders = [...filteredOrders].sort((a,b) => {
    const av = getVal(a, sort.key)
    const bv = getVal(b, sort.key)
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

  // Realtime subscriptions: update without reload
  const handleOrderCreated = useCallback(({ order, user: u }) => {
    // Only inject at top when viewing first page
    if (pagination.page !== 1) return;
    const enriched = {
      id: order.id,
      total_cents: order.total_cents,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      created_at: order.created_at,
      user_id: order.user_id,
      user_name: u?.name || `User #${order.user_id}`,
      user_email: u?.email || '',
      items: [], // filled by background silent refresh
    };
    setOrders(prev => [enriched, ...prev]);
    // Silent refresh current page (no spinner) to fetch items aggregation
    loadOrders(false);
  }, [pagination.page])

  const handleOrderUpdated = useCallback(({ order }) => {
    setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, ...order } : o)))
  }, [])

  useAdminRealtime({ token, onOrderCreated: handleOrderCreated, onOrderUpdated: handleOrderUpdated })

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
        <h1>Order Management</h1>
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
            placeholder="Filter by user name, email, or status..."
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="admin-loading">Loading orders...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table orders-table">
              <thead>
                <tr>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('id')}>ID{caret('id')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('user_name')}>User{caret('user_name')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('total_cents')}>Total{caret('total_cents')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('created_at')}>Created{caret('created_at')}</th>
                  <th>Items</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('status')}>Status{caret('status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-products">No orders found</td>
                  </tr>
                ) : (
                  sortedOrders.map(o => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>
                        <div className="order-user">
                          <div className="name">{o.user_name}</div>
                          <div className="email">{o.user_email}</div>
                        </div>
                      </td>
                      <td>₹{(o.total_cents / 100).toFixed(2)}</td>
                      <td>{new Date(o.created_at).toLocaleString()}</td>
                      <td>
                        <details>
                          <summary>{o.items?.length || 0} items</summary>
                          <ul className="order-items">
                            {(o.items || []).map((it, idx) => (
                              <li key={idx}>
                                {it.name || `Product #${it.product_id}`} × {it.quantity} {it.unit || ''} @ ₹{(it.price/100).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                      <td>
                        <div className="status-control">
                          <span className={`badge status ${o.status}`}>{o.status}</span>
                          <select 
                            value={o.status} 
                            onChange={(e) => updateOrder(o.id, { status: e.target.value })}
                            className="status-select"
                          >
                            {['placed','processing','shipped','delivered','cancelled'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
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
              ({pagination.total} total orders)
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
