import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AccountAddresses() {
  const { api } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState({ type:'shipping', line1:'', line2:'', city:'', state:'', postal_code:'', country:'India', is_default:false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const load = () => {
    api('/account/addresses')
      .then(setAddresses)
      .catch((e) => setError(e.message || 'Failed to load addresses'))
  }

  useEffect(() => { load() }, [])

  const onChange = (e) => setForm(f => ({...f, [e.target.name]: e.target.type==='checkbox'? e.target.checked : e.target.value }))
  
  const resetForm = () => {
    setForm({ type:'shipping', line1:'', line2:'', city:'', state:'', postal_code:'', country:'India', is_default:false })
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (editingId) {
        await api(`/account/addresses/${editingId}`, { method:'PATCH', body: form })
      } else {
        await api('/account/addresses', { method:'POST', body: form })
      }
      resetForm()
      load()
    } catch (err) {
      setError(err.message || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (address) => {
    setForm(address)
    setEditingId(address.id)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this address?')) {
      try { 
        await api(`/account/addresses/${id}`, { method:'DELETE' })
        load()
      } catch (err) {
        setError('Failed to delete address')
      }
    }
  }

  const makeDefault = async (id) => {
    try {
      await api(`/account/addresses/${id}`, { method:'PATCH', body: { is_default: true } })
      load()
    } catch (err) {
      setError('Failed to update default address')
    }
  }

  const getAddressIcon = (type) => {
    if (type === 'shipping') {
      return (
        <svg fill="currentColor" width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 6 L 0 8 L 19 8 L 19 23 L 12.84375 23 C 12.398438 21.28125 10.851563 20 9 20 C 7.148438 20 5.601563 21.28125 5.15625 23 L 4 23 L 4 18 L 2 18 L 2 25 L 5.15625 25 C 5.601563 26.71875 7.148438 28 9 28 C 10.851563 28 12.398438 26.71875 12.84375 25 L 21.15625 25 C 21.601563 26.71875 23.148438 28 25 28 C 26.851563 28 28.398438 26.71875 28.84375 25 L 32 25 L 32 16.84375 L 31.9375 16.6875 L 29.9375 10.6875 L 29.71875 10 L 21 10 L 21 6 Z M 1 10 L 1 12 L 10 12 L 10 10 Z M 21 12 L 28.28125 12 L 30 17.125 L 30 23 L 28.84375 23 C 28.398438 21.28125 26.851563 20 25 20 C 23.148438 20 21.601563 21.28125 21.15625 23 L 21 23 Z M 2 14 L 2 16 L 8 16 L 8 14 Z M 9 22 C 10.117188 22 11 22.882813 11 24 C 11 25.117188 10.117188 26 9 26 C 7.882813 26 7 25.117188 7 24 C 7 22.882813 7.882813 22 9 22 Z M 25 22 C 26.117188 22 27 22.882813 27 24 C 27 25.117188 26.117188 26 25 26 C 23.882813 26 23 25.117188 23 24 C 23 22.882813 23.882813 22 25 22 Z"></path>
        </svg>
      )
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      )
    }
  }

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Your Addresses</h1>
          <p className="subtitle">Manage your shipping and billing addresses</p>
        </div>

        {error && (
          <div className="empty-state" style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', marginBottom: '2rem' }}>
            <i className="fa fa-exclamation-triangle" style={{ color: '#dc2626' }}></i>
            <h3 style={{ color: '#dc2626' }}>Error</h3>
            <p style={{ color: '#dc2626' }}>{error}</p>
            <button className="btn btn-primary" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}

        <div className="addresses-layout">
          {/* Add/Edit Address Form */}
          <div className="address-form-card">
            <h3>
              <i className="fa fa-plus" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            
            <form onSubmit={handleSubmit} className="account-form">
              <div>
                <label>Address Type</label>
                <select name="type" value={form.type} onChange={onChange}>
                  <option value="shipping">Shipping Address</option>
                  <option value="billing">Billing Address</option>
                </select>
              </div>

              <div>
                <label>Flat No., Apartment</label>
                <input 
                  name="line1" 
                  value={form.line1} 
                  onChange={onChange} 
                  required 
                  placeholder="001, Summer"
                />
              </div>

              <div>
                <label>Street Address</label>
                <input 
                  name="line2" 
                  value={form.line2} 
                  onChange={onChange} 
                  required
                  placeholder="123 Main Street"
                />
              </div>

              <div className="form-row">
                <div>
                  <label>City</label>
                  <input 
                    name="city" 
                    value={form.city} 
                    onChange={onChange} 
                    required 
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label>Postal Code</label>
                  <input 
                    name="postal_code" 
                    value={form.postal_code} 
                    onChange={onChange} 
                    required 
                    placeholder="10001"
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>State</label>
                  <input 
                    name="state" 
                    value={form.state} 
                    onChange={onChange} 
                    required 
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <label>Country</label>
                  <input 
                    name="country" 
                    value={form.country} 
                    onChange={onChange} 
                    placeholder="India"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "0px" }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '1.4rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease'
                }}>
                  <input 
                    type="checkbox" 
                    name="is_default" 
                    checked={form.is_default} 
                    onChange={onChange}
                    style={{ 
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  /> 
                  <span>Set as default address</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {editingId && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={resetForm}
                    style={{ flex: '1', margin: 0 }}
                  >
                    Cancel
                  </button>
                )}
                <button 
                  className="btn btn-primary" 
                  type="submit"
                  disabled={loading}
                  style={{ flex: '1', margin: 0 }}
                >
                  {loading ? (
                    <>
                      <i className="fa fa-spinner fa-spin"></i>
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Address'
                  ) : (
                    'Add Address'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Address List */}
          <div>
            {addresses.length === 0 ? (
              <div className="empty-state">
                <i className="fa fa-map-marker-alt"></i>
                <h3>No Addresses Yet</h3>
                <p>Add your first address to get started with faster checkout.</p>
              </div>
            ) : (
              <div className="addresses-grid">
                {addresses.map(address => (
                  <div 
                    key={address.id} 
                    className={`address-card ${address.is_default ? 'default' : ''}`}
                  >
                    <div className="address-header">
                      <div className="address-type">
                        <span className="address-icon">
                          {getAddressIcon(address.type)}
                        </span>
                        <span className="address-label">{address.type} Address</span>
                      </div>
                      {address.is_default && (
                        <span className="badge default">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          Default
                        </span>
                      )}
                    </div>

                    <div className="address-content">
                      {address.line1}
                      {address.line2 && <>, {address.line2}</>}
                      <br />
                      {address.city}, {address.state} {address.postal_code}
                      <br />
                      {address.country}
                    </div>

                    <div className="address-actions">
                      <button 
                        className="btn btn-edit" 
                        onClick={() => handleEdit(address)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      
                      {!address.is_default && (
                        <button 
                          className="btn btn-default" 
                          onClick={() => makeDefault(address.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          Make Default
                        </button>
                      )}
                      
                      <button 
                        className="btn btn-delete" 
                        onClick={() => handleDelete(address.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
