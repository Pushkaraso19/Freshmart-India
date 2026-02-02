import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/admin.css'

export default function AdminProducts() {
  const { api, user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState('all') // default: show all products
  const [sort, setSort] = useState({ key: 'id', dir: 'asc' })
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price_rupees: '',
    image_url: '',
    stock: '',
    unit: '',
    brand: '',
    mrp_rupees: '',
    is_veg: true,
    origin: '',
    tags: '',
    is_active: true
  })

  useEffect(() => {
    loadProducts()
  }, [pagination.page, showArchived])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError('')
      const archivedParam = showArchived === 'inactive' ? 'only' : (showArchived === 'all' ? 'true' : '')
      const url = `/products/admin/all?page=${pagination.page}&limit=${pagination.limit}${archivedParam ? '&archived=' + archivedParam : ''}`
      const data = await api(url)
      setProducts(data.items || [])
      setPagination(prev => ({ ...prev, total: data.total || 0 }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
      
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        price_cents: Number.isFinite(parseFloat(formData.price_rupees)) ? Math.round(parseFloat(formData.price_rupees) * 100) : null,
        image_url: formData.image_url || null,
        stock: parseInt(formData.stock, 10),
        unit: formData.unit || null,
        brand: formData.brand || null,
        mrp_cents: formData.mrp_rupees !== '' && Number.isFinite(parseFloat(formData.mrp_rupees)) ? Math.round(parseFloat(formData.mrp_rupees) * 100) : null,
        is_veg: !!formData.is_veg,
        origin: formData.origin || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_active: !!formData.is_active
      }
      if (payload.price_cents == null) throw new Error('Please enter a valid price in ₹')

      if (editingProduct) {
        await api(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: payload
        })
      } else {
        await api('/products', {
          method: 'POST',
          body: payload
        })
      }

      setShowForm(false)
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        category: '',
        price_rupees: '',
        image_url: '',
        stock: '',
        unit: '',
        brand: '',
        mrp_rupees: '',
        is_veg: true,
        origin: '',
        tags: '',
        is_active: true
      })
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    const tagsString = Array.isArray(product.tags) ? product.tags.join(', ') : ''
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      price_rupees: ((product.price_cents || 0) / 100).toFixed(2),
      image_url: product.image_url || '',
      stock: product.stock.toString(),
      unit: product.unit || '',
      brand: product.brand || '',
      mrp_rupees: product.mrp_cents != null ? (product.mrp_cents / 100).toFixed(2) : '',
      is_veg: product.is_veg == null ? true : !!product.is_veg,
      origin: product.origin || '',
      tags: tagsString,
      is_active: product.is_active == null ? true : !!product.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this product? This may fail if the product has been ordered.')) return
    try {
      setError('')
      await api(`/products/${id}`, { method: 'DELETE' })
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleArchive = async (id) => {
    try {
      setError('')
      await api(`/products/${id}/archive`, { method: 'PATCH' })
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRestore = async (id) => {
    try {
      setError('')
      await api(`/products/${id}/restore`, { method: 'PATCH' })
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      price_rupees: '',
      image_url: '',
      stock: '',
      unit: '',
      brand: '',
      mrp_rupees: '',
      is_veg: true,
      origin: '',
      tags: '',
      is_active: true
    })
  }

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return `${p.name} ${p.category || ''}`.toLowerCase().includes(q)
  })

  const toggleSort = (key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const caret = (key) => sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const getVal = (p, key) => {
    switch (key) {
      case 'id': return Number(p.id) || 0
      case 'name': return (p.name || '').toLowerCase()
      case 'category': return (p.category || '').toLowerCase()
      case 'price_cents': return Number(p.price_cents) || 0
      case 'stock': return Number(p.stock) || 0
      default: return ''
    }
  }

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const av = getVal(a, sort.key)
    const bv = getVal(b, sort.key)
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

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
        <h1>Product Management</h1>
        <button 
          className="btn-add-product" 
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Product
        </button>
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

      {showForm && (
        <div className="admin-form-container">
          <form className="admin-form" onSubmit={handleSubmit}>
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            
            <div className="form-group">
              <label htmlFor="name">Product Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="brand">Brand</label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="e.g., Amul, Aashirvaad"
                />
              </div>
              <div className="form-group">
                <label htmlFor="unit">Unit</label>
                <select id="unit" name="unit" value={formData.unit} onChange={handleInputChange}>
                  <option value="">Select unit</option>
                  <option value="250 g">250 g</option>
                  <option value="500 g">500 g</option>
                  <option value="1 kg">1 kg</option>
                  <option value="2 kg">2 kg</option>
                  <option value="250 ml">250 ml</option>
                  <option value="500 ml">500 ml</option>
                  <option value="1 L">1 L</option>
                  <option value="packet">Packet</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Enter product description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select id="category" name="category" value={formData.category} onChange={handleInputChange}>
                  <option value="">Select category</option>
                  <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                  <option value="Meat & Poultry">Meat & Poultry</option>
                  <option value="Fish & Seafood">Fish & Seafood</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Bakery & Bread">Bakery & Bread</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="price_rupees">Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  id="price_rupees"
                  name="price_rupees"
                  value={formData.price_rupees}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="e.g., 290.00"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mrp_rupees">MRP (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  id="mrp_rupees"
                  name="mrp_rupees"
                  value={formData.mrp_rupees}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 320.00"
                />
              </div>
              <div className="form-group">
                <label htmlFor="stock">Stock Quantity *</label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="Available quantity"
                />
              </div>

              <div className="form-group">
                <label htmlFor="image_url">Image URL</label>
                <input
                  type="text"
                  id="image_url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="origin">Origin</label>
                <input
                  type="text"
                  id="origin"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  placeholder="e.g., Nashik, India"
                />
              </div>
              <div className="form-group">
                <label htmlFor="tags">Tags</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g., fresh, organic, local (comma-separated)"
                />
              </div>
              <div className="form-group switch-group">
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    id="is_veg"
                    name="is_veg"
                    className="switch-input"
                    checked={!!formData.is_veg}
                    onChange={handleInputChange}
                  />
                  <span className="switch-track">
                    <span className="switch-thumb"></span>
                  </span>
                  <span className="switch-text">
                    <span className="state-on">Veg</span>
                    <span className="state-off">Non-Veg</span>
                  </span>
                </label>
              </div>
              <div className="form-group switch-group">
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    className="switch-input"
                    checked={!!formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span className="switch-track">
                    <span className="switch-thumb"></span>
                  </span>
                  <span className="switch-text">
                    <span className="state-on">Active</span>
                    <span className="state-off">Inactive</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-content">
        <div className="admin-tools">
          <input
            className="admin-search"
            placeholder="Search products by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="archive-filter">
            <label>Show: </label>
            <select value={showArchived} onChange={(e) => setShowArchived(e.target.value)}>
              <option value="active">Active Products</option>
              <option value="inactive">Inactive Products</option>
              <option value="all">All Products</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">Loading products...</div>
        ) : (
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('id')}>ID{caret('id')}</th>
                  <th>Image</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('name')}>Name / Brand{caret('name')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('category')}>Category{caret('category')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('price_cents')}>Price{caret('price_cents')}</th>
                  <th style={{cursor:'pointer'}} onClick={() => toggleSort('stock')}>Stock{caret('stock')}</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-products">No products found</td>
                  </tr>
                ) : (
                  sortedProducts.map(product => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="product-thumbnail"
                          />
                        ) : (
                          <div className="no-image">No image</div>
                        )}
                      </td>
                      <td>
                        <div className="product-name">{product.name} {product.unit ? <span style={{ color: '#6b7280', fontWeight: 500 }}>• {product.unit}</span> : null}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{product.brand || ''}</div>
                        {product.description && (
                          <div className="product-description">{product.description}</div>
                        )}
                      </td>
                      <td>{product.category || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>₹{(product.price_cents / 100).toFixed(2)}</span>
                          {product.mrp_cents != null && product.mrp_cents > product.price_cents && (
                            <>
                              <span className="mrp">₹{(product.mrp_cents / 100).toFixed(2)}</span>
                              <span className="discount-badge">-{Math.round(100 - (product.price_cents / product.mrp_cents) * 100)}%</span>
                            </>
                          )}
                        </div>
                        <div style={{ marginTop: '0.25rem' }}>
                          {product.is_veg === true && <span className="veg-badge">Veg</span>}
                          {product.is_veg === false && <span className="nonveg-badge">Non-Veg</span>}
                          {product.origin && <span className="origin-badge">{product.origin}</span>}
                          {product.tags && Array.isArray(product.tags) && product.tags.map((tag, idx) => (
                            <span key={idx} className="tag-badge">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`stock-badge ${product.stock === 0 ? 'out-of-stock' : product.stock < 10 ? 'low-stock' : ''}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        {product.is_active ? (
                          <span className="status-badge status-active">Active</span>
                        ) : (
                          <span className="status-badge status-archived">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-action btn-edit" 
                            onClick={() => handleEdit(product)}
                            title="Edit product"
                            disabled={!product.is_active}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          {product.is_active ? (
                            <button 
                              className="btn-action btn-archive" 
                              onClick={() => handleArchive(product.id)}
                              title="Mark as inactive"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                <rect x="1" y="3" width="22" height="5"></rect>
                                <line x1="10" y1="12" x2="14" y2="12"></line>
                              </svg>
                            </button>
                          ) : (
                            <button 
                              className="btn-action btn-restore" 
                              onClick={() => handleRestore(product.id)}
                              title="Mark as active"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                              </svg>
                            </button>
                          )}
                          <button 
                            className="btn-action btn-delete" 
                            onClick={() => handleDelete(product.id)}
                            title="Delete product permanently"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
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
              ({pagination.total} total products)
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
