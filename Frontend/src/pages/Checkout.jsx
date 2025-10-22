import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { withAuth } from '../lib/api'

export default function Checkout(){
  const { items: cartItems, subtotal, shipping, tax, total, increment, decrement, removeItem, clearCart } = useCart()
  const { token, user } = useAuth()
  const api = withAuth(token)
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [isProcessing, setIsProcessing] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [shippingAddressId, setShippingAddressId] = useState(null)
  const [newAddress, setNewAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: ''
  })
  const [formErrors, setFormErrors] = useState({})
  
  // Calculate fresh grocery shipping (same-day delivery)
  const calculateFreshShipping = () => {
    if (subtotal >= 500) return 0 // Free delivery over ₹500
    return Math.round(subtotal * 0.15) // 15% of subtotal
  }
  
  const freshShipping = calculateFreshShipping()

  useEffect(() => {
    if (!token) return
    api('/account/addresses')
      .then((rows) => {
        setAddresses(rows)
        const def = rows.find(r => r.is_default && r.type === 'shipping') || rows.find(r => r.type === 'shipping') || rows[0]
        setShippingAddressId(def?.id || null)
      })
      .catch(() => {})
  }, [token])
  

  const handleAddressChange = (e) => {
    setNewAddress({
      ...newAddress,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: ''
      })
    }
  }

  const validateStep2 = () => {
    const errors = {}
    
    // If no address is selected and user is adding new address
    if (!shippingAddressId) {
      const required = ['line1', 'city', 'state', 'postal_code']
      required.forEach(field => {
        if (!newAddress[field].trim()) {
          errors[field] = 'This field is required'
        }
      })
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (currentStep === 2 && !validateStep2()) {
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, 2))
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handlePlaceOrder = async () => {
    setIsProcessing(true)
    try {
      const body = { payment_method: paymentMethod, shipping_address_id: shippingAddressId }
      const response = await api('/orders/place', { method: 'POST', body })
      clearCart()
      // Navigate to success page with order ID
      const orderId = response.order?.id || response.id
      navigate(`/order-success?orderId=${orderId}`)
    } catch (err) {
      alert(err.message || 'Failed to place order')
    } finally {
      setIsProcessing(false)
    }
  }

  const steps = [
    { number: 1, title: 'Cart Review' },
    { number: 2, title: 'Delivery Address' }
  ]

  return (
    <section className="checkout-section">
      <div className="checkout-container">
        <div className="checkout-header">
          <h1>Checkout</h1>
          <div className="checkout-steps">
            {steps.map(step => (
              <div key={step.number} className={`step ${currentStep >= step.number ? 'active' : ''}`}>
                <div className="step-number">{step.number}</div>
                <span>{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="checkout-content">
          <div className="checkout-main-full">
            {/* Step 1: Cart Review */}
            {currentStep === 1 && (
              <div className="checkout-step" id="step-1">
                <div className="cart-review-header">
                  <h2>Review Your Cart</h2>
                  <p className="items-count">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
                </div>
                
                {cartItems.length === 0 ? (
                  <div className="empty-cart">
                    <i className="fa fa-shopping-cart" style={{fontSize: '4rem', color: '#d1d5db', marginBottom: '1rem'}}></i>
                    <p>Your cart is empty.</p>
                    <Link to="/shopping" className="btn btn-primary">Start Shopping</Link>
                  </div>
                ) : (
                  <>
                    <div className="cart-items-grid">
                      {cartItems.map(item => (
                        <div key={item.id} className="cart-item-card">
                          <div className="cart-item-image">
                            <img src={item.image} alt={item.name} />
                            {item.is_veg !== undefined && (
                              <div className="veg-badge">
                                {item.is_veg ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#10b981" strokeWidth="2"/>
                                    <circle cx="12" cy="12" r="4" fill="#10b981"/>
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#ef4444" strokeWidth="2"/>
                                    <path d="M12 8 L16 16 L8 16 Z" fill="#ef4444"/>
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="cart-item-content">
                            <h4>{item.name}</h4>
                            {item.brand && <p className="item-brand">{item.brand}</p>}
                            <div className="item-pricing">
                              <span className="item-unit-price">₹{(Number(item.price) || 0).toFixed(2)} each</span>
                              <span className="item-total-price">₹{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="cart-item-actions">
                            <div className="quantity-controls">
                              <button type="button" onClick={() => decrement(item.id)} className="qty-btn">
                                <i className="fa fa-minus"></i>
                              </button>
                              <span className="qty-value">{item.quantity}</span>
                              <button type="button" onClick={() => increment(item.id)} className="qty-btn">
                                <i className="fa fa-plus"></i>
                              </button>
                            </div>
                            <button type="button" className="remove-btn" onClick={() => removeItem(item.id)}>
                              <i className="fa fa-trash"></i> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cart Summary */}
                    <div className="cart-summary-section">
                      <div className="summary-details">
                        <div className="summary-row">
                          <span>Subtotal ({cartItems.length} items)</span>
                          <span>₹{(Number(subtotal) || 0).toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                          <span>Delivery Charges (Same Day)</span>
                          <span className={freshShipping === 0 ? 'free-text' : ''}>
                            {freshShipping === 0 ? 'FREE' : `₹${(Number(freshShipping) || 0).toFixed(2)}`}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span>Tax (GST)</span>
                          <span>₹{(Number(tax) || 0).toFixed(2)}</span>
                        </div>
                        <div className="summary-row total-row">
                          <span>Total Amount</span>
                          <span>₹{((Number(subtotal) || 0) + (Number(freshShipping) || 0) + (Number(tax) || 0)).toFixed(2)}</span>
                        </div>
                      </div>
                      <button type="button" className="btn btn-primary btn-large" onClick={nextStep}>
                        Proceed to Delivery <i className="fa fa-arrow-right"></i>
                      </button>
                      {freshShipping > 0 && subtotal < 500 && (
                        <p className="free-shipping-notice">
                          <i className="fa fa-gift"></i>
                          Add ₹{(500 - subtotal).toFixed(2)} more to get FREE delivery!
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Delivery Address */}
            {currentStep === 2 && (
              <div className="checkout-step-split" id="step-2">
                <div className="delivery-form-section">
                  <h2>Delivery Information</h2>
                  
                  {/* Customer Details - Auto-filled */}
                  <div className="customer-info">
                  <h3>Customer Details</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Name</label>
                      <p>{user?.name || 'Guest User'}</p>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{user?.email || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                      <label>Phone</label>
                      <p>{user?.phone || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                      <label>Delivery Time</label>
                      <p><strong>Same Day Delivery</strong> (Fresh Groceries)</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <form className="shipping-form">
                  <h3>Delivery Address</h3>
                  
                  {addresses.length > 0 && (
                    <div className="form-group full-width">
                      <label>Select Saved Address</label>
                      <select value={shippingAddressId || ''} onChange={(e)=>setShippingAddressId(Number(e.target.value) || null)}>
                        <option value="">Add New Address</option>
                        {addresses.map(a => (
                          <option key={a.id} value={a.id}>
                            {[a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(', ')} {a.is_default ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {!shippingAddressId && (
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label>Address Line 1 *</label>
                        <input 
                          type="text" 
                          name="line1"
                          placeholder="House/Flat No., Building Name"
                          value={newAddress.line1}
                          onChange={handleAddressChange}
                          className={formErrors.line1 ? 'error' : ''}
                        />
                        {formErrors.line1 && <span className="form-error">{formErrors.line1}</span>}
                      </div>
                      <div className="form-group full-width">
                        <label>Address Line 2</label>
                        <input 
                          type="text" 
                          name="line2"
                          placeholder="Street Name, Area, Landmark (Optional)"
                          value={newAddress.line2}
                          onChange={handleAddressChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>City *</label>
                        <input 
                          type="text" 
                          name="city"
                          value={newAddress.city}
                          onChange={handleAddressChange}
                          className={formErrors.city ? 'error' : ''}
                        />
                        {formErrors.city && <span className="form-error">{formErrors.city}</span>}
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input 
                          type="text" 
                          name="state"
                          value={newAddress.state}
                          onChange={handleAddressChange}
                          className={formErrors.state ? 'error' : ''}
                        />
                        {formErrors.state && <span className="form-error">{formErrors.state}</span>}
                      </div>
                      <div className="form-group">
                        <label>Postal Code *</label>
                        <input 
                          type="text" 
                          name="postal_code"
                          value={newAddress.postal_code}
                          onChange={handleAddressChange}
                          className={formErrors.postal_code ? 'error' : ''}
                        />
                        {formErrors.postal_code && <span className="form-error">{formErrors.postal_code}</span>}
                      </div>
                    </div>
                  )}
                  
                  <div className="delivery-notice">
                    <i className="fa fa-info-circle"></i>
                    <div>
                      <strong>Same Day Delivery</strong>
                      <p>Fresh groceries delivered within hours. Order before 6 PM for same-day delivery.</p>
                    </div>
                  </div>
                  
                  <div className="step-buttons">
                    <button type="button" className="btn btn-secondary prev-step" onClick={prevStep}>
                      Back to Cart
                    </button>
                    <button type="button" className="btn btn-primary next-step" onClick={handlePlaceOrder} disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <i className="fa fa-spinner fa-spin"></i>
                          Processing...
                        </>
                      ) : (
                        <>Place Order (Cash on Delivery)</>
                      )}
                    </button>
                  </div>
                </form>
                </div>
                
                {/* Order Summary Sidebar */}
                <div className="order-summary-sidebar">
                  <div className="order-summary-card">
                    <h3>Order Summary</h3>
                    <div className="summary-items">
                      {cartItems.map(item => (
                        <div key={item.id} className="summary-item-detailed">
                          <img src={item.image} alt={item.name} className="summary-item-image" />
                          <div className="summary-item-info">
                            <h4>{item.name}</h4>
                            <p>Qty: {item.quantity} × ₹{(Number(item.price) || 0).toFixed(2)}</p>
                          </div>
                          <span className="summary-item-price">
                            ₹{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="summary-totals">
                      <div className="summary-row">
                        <span>Subtotal ({cartItems.length} items)</span>
                        <span>₹{(Number(subtotal) || 0).toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Delivery Charges</span>
                        <span className={freshShipping === 0 ? 'free-text' : ''}>
                          {freshShipping === 0 ? 'FREE' : `₹${(Number(freshShipping) || 0).toFixed(2)}`}
                        </span>
                      </div>
                      <div className="summary-row">
                        <span>Tax (GST)</span>
                        <span>₹{(Number(tax) || 0).toFixed(2)}</span>
                      </div>
                      <div className="summary-row total">
                        <span>Total Amount</span>
                        <span>₹{((Number(subtotal) || 0) + (Number(freshShipping) || 0) + (Number(tax) || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="payment-badge">
                      <i className="fa fa-money-bill-wave"></i>
                      Cash on Delivery
                    </div>
                    
                    {freshShipping > 0 && subtotal < 500 && (
                      <div className="free-shipping-note">
                        <i className="fa fa-gift"></i>
                        Add ₹{(500 - subtotal).toFixed(2)} more for FREE delivery!
                      </div>
                    )}
                  </div>
                  
                  <div className="security-info">
                    <div className="security-item">
                      <i className="fa fa-shield-alt"></i>
                      <span>100% Secure Delivery</span>
                    </div>
                    <div className="security-item">
                      <i className="fa fa-truck"></i>
                      <span>Same Day Delivery</span>
                    </div>
                    <div className="security-item">
                      <i className="fa fa-leaf"></i>
                      <span>Fresh Guarantee</span>
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </section>
  )
}
