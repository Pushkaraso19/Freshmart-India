import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Header(){
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const { items: cartItems, increment, decrement, removeItem, itemCount, subtotal, shipping, tax, total } = useCart()
  const loginRef = useRef(null)
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event) {
      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setIsLoginOpen(false)
      }
    }
    const openCart = () => setIsCartOpen(true)
    const toastListener = (e) => {
      const { message, type = 'info', duration = 2500 } = e.detail || {}
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter(t => t.id !== id))
      }, duration)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('open-cart', openCart)
    window.addEventListener('toast', toastListener)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('open-cart', openCart)
      window.removeEventListener('toast', toastListener)
    }
  }, [])

  const handleGoToAuth = () => navigate('/login')

  return (
    <>
      <header className="header">
        <Link to="/" className="logo">
          <i className="fa fa-shopping-basket"></i>
          FreshMart India
        </Link>

        <nav className={`navbar ${isMenuOpen ? 'active' : ''}`}>
          {user?.role === 'admin' ? (
            <>
              <NavLink to="/admin/products" onClick={() => setIsMenuOpen(false)}>
                <i className="fa fa-cube"></i> 
                <span>Products</span>
              </NavLink>
              <NavLink to="/admin/orders" onClick={() => setIsMenuOpen(false)}>
                <i className="fa fa-list-alt"></i> 
                <span>Orders</span>
              </NavLink>
              <NavLink to="/admin/users" onClick={() => setIsMenuOpen(false)}>
                <i className="fa fa-users"></i> 
                <span>Users</span>
              </NavLink>
              <NavLink to="/admin/contacts" onClick={() => setIsMenuOpen(false)}>
                <i className="fa fa-envelope"></i> 
                <span>Contact Responses</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" onClick={() => setIsMenuOpen(false)}>
                <i className="fa fa-shopping-bag"></i> 
                <span>Shopping</span>
              </NavLink>
              <NavLink to="/about" onClick={() => setIsMenuOpen(false)}>
                <i className="fa fa-info-circle"></i> 
                <span>About Us</span>
              </NavLink>
              <NavLink to="/contact" onClick={() => setIsMenuOpen(false)}>
                <i className="fa fa-envelope"></i> 
                <span>Contact</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="icons">
          <div id="menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <i className="fa fa-bars"></i>
          </div>
          <div onClick={() => (isAuthenticated ? setIsLoginOpen(!isLoginOpen) : handleGoToAuth())}>
            <i className="fa fa-user"></i>
          </div>
          {user?.role !== 'admin' && (
            <div id="cart-btn" onClick={() => setIsCartOpen(!isCartOpen)} data-count={itemCount || undefined}>
              <i className="fa fa-shopping-cart"></i>
            </div>
          )}
        </div>

        
        {/* Account dropdown for authenticated users */}
        {isAuthenticated && (
          <div 
            ref={loginRef}
            className={`login-form ${isLoginOpen ? 'active' : ''}`}
            style={{width:'24rem', padding: '1.2rem'}}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border-color)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span style={{ fontWeight: '600', fontSize: '1.4rem' }}>
                {user?.role === 'admin' ? `Admin: ${user?.name || 'User'}` : `Hello, ${user?.name || 'User'}`}
              </span>
            </div>
            <div style={{display:'grid', gap:'0.3rem'}}>
              {user?.role === 'admin' ? (
                <>
                  <div style={{ padding: '0.6rem 0.8rem', color: '#6b7280', fontSize: '1.2rem', textAlign: 'left',}}>
                    <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>Administrator Account</div>
                    <div style={{ fontSize: '1.1rem' }}>{user?.email}</div>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/account" 
                    onClick={()=>setIsLoginOpen(false)} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.8rem', 
                      padding: '0.6rem 0.8rem', 
                      borderRadius: '8px', 
                      textDecoration: 'none', 
                      color: 'var(--dark)', 
                      fontSize: '1.3rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--light-gray)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="9"/>
                      <rect x="14" y="3" width="7" height="5"/>
                      <rect x="14" y="12" width="7" height="9"/>
                      <rect x="3" y="16" width="7" height="5"/>
                    </svg>
                    Overview
                  </Link>
                  <Link 
                    to="/account/orders" 
                    onClick={()=>setIsLoginOpen(false)} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.8rem', 
                      padding: '0.6rem 0.8rem', 
                      borderRadius: '8px', 
                      textDecoration: 'none', 
                      color: 'var(--dark)', 
                      fontSize: '1.3rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--light-gray)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    Orders
                  </Link>
                  <Link 
                    to="/account/addresses" 
                    onClick={()=>setIsLoginOpen(false)} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.8rem', 
                      padding: '0.6rem 0.8rem', 
                      borderRadius: '8px', 
                      textDecoration: 'none', 
                      color: 'var(--dark)', 
                      fontSize: '1.3rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--light-gray)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Addresses
                  </Link>
                </>
              )}
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }}></div>
              <button 
                onClick={()=>{setIsLoginOpen(false); logout();}}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.8rem', 
                  padding: '0.6rem 0.8rem', 
                  borderRadius: '8px', 
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626', 
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(220, 38, 38, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <i className="fa fa-check-circle" aria-hidden="true" />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shopping Cart */}
      {user?.role !== 'admin' && (
        <div className={`shopping-cart ${isCartOpen ? 'active' : ''}`}>
          <div className="cart-header">
            <h3><i className="fa fa-shopping-cart"></i> My Cart</h3>
            <button className="cart-close" onClick={() => setIsCartOpen(false)}>
              <i className="fa fa-times"></i>
            </button>
          </div>
          
          <div className="cart-items">
            {cartItems.length === 0 ? (
              <div className="empty-state">
                <i className="fa fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <Link to="/" className="btn btn-primary" onClick={() => setIsCartOpen(false)}>
                  Start Shopping
                </Link>
              </div>
            ) : (
              cartItems.map((item, index) => (
                <div key={index} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <div className="price">₹{item.price}</div>
                    <div className="qty-controls">
                      <button onClick={() => decrement(item.id)}>-</button>
                      <input type="number" className="qty" value={item.quantity} readOnly />
                      <button onClick={() => increment(item.id)}>+</button>
                    </div>
                  </div>
                  <button className="remove-item" onClick={() => removeItem(item.id)}>
                    <i className="fa fa-trash"></i>
                  </button>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="cart-summary">
              <div className="cart-total">
                <div style={{display:'flex',flexDirection:'column',gap:'0.25rem',width:'100%'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',borderTop:'2px solid var(--light-bg)',paddingTop:'0.5rem',fontWeight:700}}>
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="cart-actions">
                <Link to="/checkout" className="btn btn-primary" onClick={() => setIsCartOpen(false)}>
                  Proceed to Checkout
                </Link>
                <button className="btn btn-outline" onClick={() => setIsCartOpen(false)}>
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
