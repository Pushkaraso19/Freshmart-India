import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { withAuth, API_BASE_URL } from '../lib/api'
import { useAuth } from '../context/AuthContext.jsx'

export default function Shopping(){
  const { addItem } = useCart()
  const { token, isAuthenticated } = useAuth()
  const authedApi = withAuth(token)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [dietaryFilter, setDietaryFilter] = useState('all') 
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageSearching, setImageSearching] = useState(false)
  const [identifiedItems, setIdentifiedItems] = useState('')
  const [isDragging, setIsDragging] = useState(false) 

  const [filteredProducts, setFilteredProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(40) // Show 12 products per page
  
  // Fetch products from backend on mount
  useEffect(() => {
    const api = withAuth('')
    setLoading(true)
    api('/products?limit=100')
      .then((data) => {
        const items = (data?.items || []).map((p, idx) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          brand: p.brand || '',
          unit: p.unit || '',
          category: p.category || 'General',
          price: Math.round(Number(p.price_cents || 0) / 100),
          mrp: p.mrp_cents ? Math.round(Number(p.mrp_cents) / 100) : null,
          image: p.image_url || `/assets/image/product-${(idx % 8) + 1}.png`,
          stock: Number(p.stock || 0),
          inStock: Number(p.stock) > 0,
          is_veg: p.is_veg,
          origin: p.origin || '',
        }))
        setAllProducts(items)
        setError('')
      })
      .catch((err) => setError(err.message || 'Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  const baseCategories = [
    { id: 'all', name: 'All Products', color: '#6b7280' },
    { id: 'Fruits & Vegetables', name: 'Fruits & Vegetables', color: '#10b981' },
    { id: 'Meat & Poultry', name: 'Meat & Poultry', color: '#ef4444' },
    { id: 'Fish & Seafood', name: 'Fish & Seafood', color: '#3b82f6' },
    { id: 'Dairy & Eggs', name: 'Dairy & Eggs', color: '#f59e0b' },
    { id: 'Bakery & Bread', name: 'Bakery & Bread', color: '#8b5cf6' }
  ]

  // Filter products based on dietary preference first
  const dietaryFilteredProducts = allProducts.filter(product => {
    if (dietaryFilter === 'veg') return product.is_veg === true
    if (dietaryFilter === 'nonveg') return product.is_veg === false
    return true 
  })

  const categories = baseCategories
    .map(c => ({
      ...c,
      count: c.id === 'all' 
        ? dietaryFilteredProducts.length 
        : dietaryFilteredProducts.filter(p => p.category === c.id).length
    }))
    .filter(c => c.count > 0)

  // Filter products
  useEffect(() => {
  let filtered = allProducts

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(product => product.category === activeCategory)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by dietary preference
    if (dietaryFilter === 'veg') {
      filtered = filtered.filter(product => product.is_veg === true)
    } else if (dietaryFilter === 'nonveg') {
      filtered = filtered.filter(product => product.is_veg === false)
    }
    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [allProducts, activeCategory, searchQuery, dietaryFilter])

  // Pagination logic
  const indexOfLastProduct = currentPage * itemsPerPage
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
      performImageSearch(file)
    }
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        setSelectedImage(file)
        setImagePreview(URL.createObjectURL(file))
        performImageSearch(file)
      }
    }
  }

  const performImageSearch = async (file) => {
    setImageSearching(true)
    setIdentifiedItems('')
    try {
      const formData = new FormData()
      formData.append('image', file)

      const baseUrl = API_BASE_URL || ''
      const response = await fetch(`${baseUrl}/api/products/search-by-image`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to search by image')
      }

      const data = await response.json()
      setIdentifiedItems(data.identified || '')
      
      if (data.items && data.items.length > 0) {
        const items = data.items.map((p, idx) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          brand: p.brand || '',
          unit: p.unit || '',
          category: p.category || 'General',
          price: Math.round(Number(p.price_cents || 0) / 100),
          mrp: p.mrp_cents ? Math.round(Number(p.mrp_cents) / 100) : null,
          image: p.image_url || `/assets/image/product-${(idx % 8) + 1}.png`,
          stock: Number(p.stock || 0),
          inStock: Number(p.stock) > 0,
          is_veg: p.is_veg,
          origin: p.origin || '',
        }))
        setFilteredProducts(items)
        setCurrentPage(1)
        setActiveCategory('all')
      } else {
        setFilteredProducts([])
      }
    } catch (err) {
      console.error('Image search error:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('toast', { 
          detail: { message: err.message || 'Failed to search by image', type: 'error' } 
        }))
      }
    } finally {
      setImageSearching(false)
    }
  }

  const clearImageSearch = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setIdentifiedItems('')
    setSearchQuery('')
    setActiveCategory('all')
    setCurrentPage(1)
  }

  const addToCart = async (product) => {
    addItem({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      image: product.image,
      unit: product.unit,
      category: product.category,
      is_veg: product.is_veg
    })
    if (isAuthenticated) {
      try {
        await authedApi('/cart/add', { method: 'POST', body: { productId: product.id, quantity: 1 } })
      } catch (err) {
        console.warn('Failed to sync cart:', err.message)
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-cart'))
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: `${product.name} added to cart`, type: 'success' } }))
    }
  }

  return (
    <div className="shopping-page">
      {/* Unified Header with Controls */}
      <div className="shopping-header">
        <div className="container">
          <div className="header-content">
            <div className="page-title">
              <h1>Fresh Groceries</h1>
              <p>Quality products delivered to your doorstep</p>
            </div>
            
            <div className="unified-controls">
              {/* Dietary Filter - 3-Way Switch */}
              <div className="control-section">
                <h3>Dietary</h3>
                <div className="dietary-switch-container">
                  <div className="dietary-switch">
                    <button 
                      className={`dietary-option ${dietaryFilter === 'veg' ? 'active' : ''}`}
                      onClick={() => setDietaryFilter('veg')}
                      title="Vegetarian Only"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" className="dietary-icon">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#10b981" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="4" fill="#10b981"/>
                      </svg>
                      <span>Veg</span>
                    </button>
                    <button 
                      className={`dietary-option ${dietaryFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setDietaryFilter('all')}
                      title="All Products"
                    >
                      <span>Both</span>
                    </button>
                    <button 
                      className={`dietary-option ${dietaryFilter === 'nonveg' ? 'active' : ''}`}
                      onClick={() => setDietaryFilter('nonveg')}
                      title="Non-Vegetarian Only"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" className="dietary-icon">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#ef4444" strokeWidth="2"/>
                        <path d="M12 8 L16 16 L8 16 Z" fill="#ef4444"/>
                      </svg>
                      <span>Non-Veg</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="control-section">
                <h3>Categories</h3>
                <div className="control-list">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      className={`control-btn ${activeCategory === category.id ? 'active' : ''}`}
                      onClick={() => setActiveCategory(category.id)}
                      style={{
                        '--category-color': category.color,
                        borderColor: activeCategory === category.id ? category.color : '#e5e7eb',
                        backgroundColor: activeCategory === category.id ? category.color : 'transparent',
                        color: activeCategory === category.id ? 'white' : '#4b5563'
                      }}
                    >
                      {category.name}
                      <span className="count">({category.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrated Search */}
              <div className="control-section">
                <h3>Search</h3>
                <div className="control-list">
                  <div 
                    className={`integrated-search-control ${imagePreview ? 'has-image' : ''} ${isDragging ? 'dragging' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <>
                        <div className="search-image-preview">
                          <img src={imagePreview} alt="Search" />
                          {imageSearching && (
                            <div className="search-spinner"></div>
                          )}
                        </div>
                        <div className="search-image-info">
                          {imageSearching ? (
                            <span className="analyzing-text">Analyzing image...</span>
                          ) : identifiedItems ? (
                            <span className="detected-text">
                              <i className="fa fa-check-circle"></i> {identifiedItems}
                            </span>
                          ) : (
                            <span className="image-uploaded-text">Image uploaded</span>
                          )}
                        </div>
                        <button 
                          className="clear-search-btn"
                          onClick={clearImageSearch}
                          title="Clear image"
                        >
                          <i className="fa fa-times"></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <i className="fa fa-search"></i>
                        <input 
                          type="text" 
                          placeholder="Search products or drag & drop image..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            className="clear-search-btn"
                            onClick={() => setSearchQuery('')}
                          >
                            <i className="fa fa-times"></i>
                          </button>
                        )}
                        <label className="camera-upload-btn" title="Upload image">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                          <i className="fa fa-camera"></i>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="products-section">
        <div className="container">
          <div className="products-header">
            <h2>
              {activeCategory === 'all' ? 'All Products' : categories.find(c => c.id === activeCategory)?.name}
            </h2>
            <p className="results-count">
              Showing {currentProducts.length} of {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              {filteredProducts.length > itemsPerPage && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>

          {loading && <div className="loading">Loading products...</div>}
          {error && !loading && <div className="error" style={{color:'var(--red)'}}>{error}</div>}
          
          {/* Show products categorically when 'All Products' is selected */}
          {activeCategory === 'all' && currentProducts.length > 0 ? (
            baseCategories.slice(1).map(category => {
              const categoryProducts = currentProducts.filter(product => product.category === category.id);
              if (categoryProducts.length === 0) return null;
              
              return (
                <div key={category.id} className="category-section">
                  <div className="category-header">
                    <h3 className="category-title">
                      <i className="fa fa-folder"></i>
                      {category.name}
                      <span className="category-count">({categoryProducts.length})</span>
                    </h3>
                  </div>
                  <div className="products-grid">
                    {categoryProducts.map(product => (
                      <div key={product.id} className="product-card">
                        <div className="product-image">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            onError={(e) => {
                              e.target.src = `/assets/image/product-${(product.id % 8) + 1}.png`;
                            }}
                          />
                          {/* Discount badge */}
                          {product.mrp && product.mrp > product.price && (
                            <span className="product-badge discount-badge">
                              {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                            </span>
                          )}
                          {!product.inStock && <div className="out-of-stock-overlay">Out of Stock</div>}
                        </div>
                        
                        <div className="product-info">
                          <h3 className="product-name">{product.name}</h3>
                          <div className="product-unit">{product.unit || 'Per piece'}</div>
                          
                          <div className="product-meta-row">
                            <span className="product-category">
                              <i className="fa fa-folder"></i> {product.category}
                            </span>
                            {product.origin && (
                              <span className="product-origin">
                                <i className="fa fa-map-marker"></i> {product.origin}
                              </span>
                            )}
                          </div>

                          <div className="product-meta-row">
                            <span className="product-stock">
                              <i className="fa fa-cube"></i> {product.stock} left
                            </span>
                            {product.is_veg !== null && (
                              <span className={`veg-indicator ${product.is_veg ? 'veg' : 'nonveg'}`}>
                                {product.is_veg ? (
                                  <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" className="dietary-icon">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#10b981" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="4" fill="#10b981"/>
                      </svg>
                                    Veg
                                  </>
                                ) : (
                                  <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" className="dietary-icon">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#ef4444" strokeWidth="2"/>
                        <path d="M12 8 L16 16 L8 16 Z" fill="#ef4444"/>
                      </svg>
                                    Non-Veg
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="product-price">
                            <span className="current-price">₹{product.price}</span>
                            {product.mrp && product.mrp > product.price && (
                              <span className="original-price">₹{product.mrp}</span>
                            )}
                            {product.mrp && product.mrp > product.price && (
                              <span className="discount-text">
                                {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                              </span>
                            )}
                          </div>

                          <button 
                            className={`add-to-cart-btn ${!product.inStock ? 'disabled' : ''}`}
                            onClick={() => product.inStock && addToCart(product)}
                            disabled={!product.inStock}
                          >
                            <i className="fa fa-shopping-cart"></i>
                            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Regular grid view for specific categories or filtered results */
            <div className="products-grid">
              {currentProducts.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      onError={(e) => {
                        e.target.src = `/assets/image/product-${(product.id % 8) + 1}.png`;
                      }}
                    />
                    {/* Discount badge */}
                    {product.mrp && product.mrp > product.price && (
                      <span className="product-badge discount-badge">
                        {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                      </span>
                    )}
                    {!product.inStock && <div className="out-of-stock-overlay">Out of Stock</div>}
                  </div>
                  
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <div className="product-unit">{product.unit || 'Per piece'}</div>
                    
                    <div className="product-meta-row">
                      <span className="product-category">
                        <i className="fa fa-folder"></i> {product.category}
                      </span>
                      {product.origin && (
                        <span className="product-origin">
                          <i className="fa fa-map-marker"></i> {product.origin}
                        </span>
                      )}
                    </div>

                    <div className="product-meta-row">
                      <span className="product-stock">
                        <i className="fa fa-cube"></i> {product.stock} left
                      </span>
                      {product.is_veg !== null && (
                        <span className={`veg-indicator ${product.is_veg ? 'veg' : 'nonveg'}`}>
                          {product.is_veg ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" className="veg-icon">
                                <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
                                <circle cx="12" cy="12" r="4" fill="#16a34a"/>
                              </svg>
                              Veg
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" className="nonveg-icon">
                                <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
                                <polygon points="12,6 18,18 6,18" fill="#dc2626"/>
                              </svg>
                              Non-Veg
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="product-price">
                      <span className="current-price">₹{product.price}</span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="original-price">₹{product.mrp}</span>
                      )}
                      {product.mrp && product.mrp > product.price && (
                        <span className="discount-text">
                          {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                        </span>
                      )}
                    </div>

                    <button 
                      className={`add-to-cart-btn ${!product.inStock ? 'disabled' : ''}`}
                      onClick={() => product.inStock && addToCart(product)}
                      disabled={!product.inStock}
                    >
                      <i className="fa fa-shopping-cart"></i>
                      {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="no-products">
              <div className="no-products-content">
                <i className="fa fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your search or filter criteria</p>
                <button 
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearchQuery('')
                    setActiveCategory('all')
                    setDietaryFilter('all')
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
          
          {/* Pagination - Minimalist */}
          {filteredProducts.length > itemsPerPage && (
            <div className="shopping-pagination">
              <button 
                className="btn-pagination" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <i className="fa fa-chevron-left"></i>
              </button>
              <div className="pagination-pages">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      className={`page-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button 
                className="btn-pagination" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <i className="fa fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
