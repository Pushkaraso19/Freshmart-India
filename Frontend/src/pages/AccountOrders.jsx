import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function AccountOrders() {
  const { api } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [reordering, setReordering] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState(null)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    setLoading(true)
    api('/orders')
      .then(setOrders)
      .catch((e) => setError(e.message || 'Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.status === filter
  })

  const getStatusIcon = (status) => {
    const icons = {
      placed: 'fa-clock',
      processing: 'fa-cog fa-spin',
      shipped: 'fa-truck',
      delivered: 'fa-check-circle',
      cancelled: 'fa-times-circle'
    }
    return icons[status] || 'fa-clock'
  }

  const getPaymentIcon = (method) => {
    const icons = {
      card: 'fa-credit-card',
      upi: 'fa-mobile-alt',
      cod: 'fa-money-bill-wave'
    }
    return icons[method] || 'fa-credit-card'
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleCancelOrder = async (orderId) => {
    setCancelling(true)
    try {
      const updated = await api(`/orders/${orderId}/cancel`, { method: 'PATCH' })
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status, payment_status: updated.payment_status } : o))
      // Close both modals
      setCancelConfirmOrder(null)
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null)
      }
      // Show success notification
      showNotification('Order cancelled successfully! Items have been restocked.')
    } catch (e) {
      showNotification(e.message || 'Failed to cancel order', 'error')
    } finally {
      setCancelling(false)
    }
  }

  const handleReorder = async (order) => {
    if (reordering) return
    setReordering(true)
    
    try {
      let successCount = 0
      let failedItems = []
      
      // Fetch fresh product data for each item
      for (const item of order.items) {
        try {
          const product = await api(`/products/${item.product_id}`)
          
          // Check if product is in stock
          if (product.stock <= 0) {
            failedItems.push({ name: product.name, reason: 'Out of stock' })
            continue
          }
          
          // Convert price from cents to rupees
          const priceInRupees = Math.round(Number(product.price_cents || 0) / 100)
          
          // Add to cart with the original quantity
          addItem({
            id: product.id,
            name: product.name,
            price: priceInRupees,
            image: product.image_url,
            unit: product.unit,
            category: product.category,
            is_veg: product.is_veg
          }, item.quantity)
          
          // Sync with backend if authenticated
          try {
            await api('/cart/add', { 
              method: 'POST', 
              body: { productId: product.id, quantity: item.quantity } 
            })
          } catch (syncErr) {
            console.warn('Failed to sync cart:', syncErr)
          }
          
          successCount++
        } catch (err) {
          console.error(`Failed to add product ${item.product_id}:`, err)
          failedItems.push({ name: item.name || `Product #${item.product_id}`, reason: 'Not available' })
        }
      }
      
      // Show appropriate message
      if (successCount > 0 && failedItems.length === 0) {
        // Trigger cart sync and navigate to checkout
        window.dispatchEvent(new Event('sync-cart'))
        const goToCheckout = window.confirm(`All ${successCount} items added to cart! Would you like to proceed to checkout?`)
        if (goToCheckout) {
          navigate('/checkout')
        } else {
          window.dispatchEvent(new Event('open-cart'))
        }
      } else if (successCount > 0 && failedItems.length > 0) {
        alert(`${successCount} items added to cart. ${failedItems.length} items couldn't be added:\n${failedItems.map(f => `- ${f.name}: ${f.reason}`).join('\n')}`)
        window.dispatchEvent(new Event('sync-cart'))
        const goToCheckout = window.confirm('Would you like to proceed to checkout with the available items?')
        if (goToCheckout) {
          navigate('/checkout')
        } else {
          window.dispatchEvent(new Event('open-cart'))
        }
      } else {
        alert('No items could be added to cart. All items are either out of stock or unavailable.')
      }
      
    } catch (err) {
      alert('Failed to reorder. Please try again.')
    } finally {
      setReordering(false)
    }
  }

  const CancelConfirmModal = ({ order, onClose }) => {
    if (!order) return null

    return (
      <div className="cancel-modal-overlay" onClick={onClose}>
        <div className="cancel-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Warning Icon */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="cancel-modal-icon">
              <i className="fa fa-exclamation-triangle"></i>
            </div>
          </div>

          {/* Title and Description */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 className="cancel-modal-title">Cancel Order?</h2>
            <p className="cancel-modal-description">
              Are you sure you want to cancel Order #{order.id}?
            </p>
          </div>

          {/* Information Box */}
          <div className="cancel-modal-info">
            <div className="cancel-modal-info-header">
              <i className="fa fa-info-circle"></i>
              <p>What happens when you cancel:</p>
            </div>
            <ul>
              <li>Your order will be cancelled immediately</li>
              <li>Items will be restocked</li>
              {order.payment_method !== 'cod' && order.payment_status === 'paid' && (
                <li>Refund will be processed to your original payment method</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="cancel-modal-actions">
            <button 
              className="cancel-modal-btn cancel-modal-btn-secondary"
              onClick={onClose}
              disabled={cancelling}
            >
              Keep Order
            </button>
            <button 
              className="cancel-modal-btn cancel-modal-btn-danger"
              onClick={() => handleCancelOrder(order.id)}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <i className="fa fa-spinner fa-spin"></i>
                  Cancelling...
                </>
              ) : (
                <>
                  <i className="fa fa-times-circle"></i>
                  Yes, Cancel Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Order Details</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--gray)' }}>
              <i className="fa fa-times"></i>
            </button>
          </div>

          {/* Order Info */}
          <div style={{ background: 'var(--light-bg)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Order ID</p>
                <p style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>#{order.id}</p>
              </div>
              <div>
                <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Order Date</p>
                <p style={{ fontWeight: 'bold' }}>{new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>{new Date(order.created_at).toLocaleTimeString()}</p>
              </div>
              <div>
                <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Status</p>
                <span className={`order-status ${order.status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 'bold' }}>
                  <i className={`fa ${getStatusIcon(order.status)}`}></i>
                  {order.status.toUpperCase()}
                </span>
              </div>
              <div>
                <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Payment</p>
                <p style={{ fontWeight: 'bold' }}>
                  <i className={`fa ${getPaymentIcon(order.payment_method)}`} style={{ marginRight: '0.5rem' }}></i>
                  {order.payment_method?.toUpperCase()}
                </p>
                <p style={{ fontSize: '0.875rem', color: order.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>
                  {order.payment_status?.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Items Ordered</h3>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
              {(order.items || []).map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  padding: '1rem',
                  borderBottom: idx < order.items.length - 1 ? '1px solid var(--border-color)' : 'none',
                  alignItems: 'center'
                }}>
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name || `Product ${item.product_id}`}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{item.name || `Product #${item.product_id}`}</h4>
                    <p style={{ color: 'var(--gray)', fontSize: '0.875rem', margin: 0 }}>
                      Quantity: {item.quantity} {item.unit || ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '1.125rem', margin: 0 }}>
                      ₹{(Number(item.price) / 100).toFixed(2)}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray)', margin: '0.25rem 0 0 0' }}>
                      ₹{((Number(item.price) * item.quantity) / 100).toFixed(2)} total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div style={{ background: 'var(--light-bg)', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray)' }}>Subtotal</span>
                <span>₹{((order.items || []).reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0) / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>Total Amount</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--primary)' }}>
                  ₹{(Number(order.total_cents || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
            {order.status === 'delivered' && (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  onClose()
                  handleReorder(order)
                }}
                disabled={reordering}
                style={{ margin: 0 }}
              >
                <i className="fa fa-redo"></i>
                {reordering ? 'Adding to Cart...' : 'Reorder'}
              </button>
            )}
            {['placed', 'processing'].includes(order.status) && (
              <button 
                className="btn-cancel-order"
                onClick={() => setCancelConfirmOrder(order)}
                disabled={cancelling}
              >
                <i className="fa fa-times-circle"></i>
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="account-page">
      {/* Notification Toast */}
      {notification && (
        <div className={`notification-toast notification-${notification.type}`}>
          <div className="notification-content">
            <i className={`fa ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{notification.message}</span>
          </div>
          <button 
            className="notification-close" 
            onClick={() => setNotification(null)}
            aria-label="Close notification"
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
      )}

      <div className="account-container">
        <div className="account-header">
          <h1>Your Orders</h1>
          <p className="subtitle">Track and manage your purchases</p>
        </div>

        {/* Cancel Confirmation Modal */}
        {cancelConfirmOrder && <CancelConfirmModal order={cancelConfirmOrder} onClose={() => setCancelConfirmOrder(null)} />}

        {/* Order Details Modal */}
        {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

        {/* Filter Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem', 
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {['all', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`btn ${filter === status ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize', margin: 0 }}
            >
              {status === 'all' ? 'All Orders' : status}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <i className="fa fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
            <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>Loading your orders...</p>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <i className="fa fa-exclamation-triangle"></i>
            <h3>Error Loading Orders</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="empty-state">
            <i className="fa fa-shopping-bag"></i>
            <h3>No Orders Found</h3>
            <p>
              {filter === 'all' 
                ? "You haven't placed any orders yet. Start shopping to see your orders here!"
                : `No orders with status "${filter}" found.`
              }
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.href = '/'}
            >
              Start Shopping
            </button>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="orders-grid">
            {filteredOrders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div>
                    <div className="order-id">Order #{order.id}</div>
                    <div className="order-meta">
                      <span>
                        <i className="fa fa-calendar"></i>
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        <i className={`fa ${getPaymentIcon(order.payment_method)}`}></i>
                        {order.payment_method?.toUpperCase()}
                      </span>
                      <span className={`order-status ${order.status}`}>
                        <i className={`fa ${getStatusIcon(order.status)}`} style={{ marginRight: '0.5rem' }}></i>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="order-total">
                    ₹{(Number(order.total_cents || 0) / 100).toFixed(2)}
                  </div>
                </div>

                {/* Order Summary */}
                <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '1rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray)' }}>
                    <i className="fa fa-box"></i>
                    <span>{order.items?.length || 0} items</span>
                    <span style={{ margin: '0 0.5rem' }}>•</span>
                    <span>{order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} total quantity</span>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(order.items || []).slice(0, 3).map((item, idx) => (
                      <div key={idx} style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        background: 'var(--light-bg)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem'
                      }}>
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            style={{ width: '20px', height: '20px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        )}
                        <span>{item.name || `Product #${item.product_id}`}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        background: 'var(--light-bg)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        color: 'var(--gray)'
                      }}>
                        +{order.items.length - 3} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Actions */}
                <div style={{ 
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end'
                }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <i className="fa fa-eye"></i>
                    View Details
                  </button>
                  {order.status === 'delivered' && (
                    <button 
                      className="btn btn-outline" 
                      style={{ margin: 0 }}
                      onClick={() => handleReorder(order)}
                      disabled={reordering}
                    >
                      <i className="fa fa-redo"></i>
                      {reordering ? 'Adding...' : 'Reorder'}
                    </button>
                  )}
                  {['placed', 'processing'].includes(order.status) && (
                    <button 
                      className="btn-cancel-order btn-cancel-order-sm"
                      onClick={() => setCancelConfirmOrder(order)}
                      disabled={cancelling}
                    >
                      <i className="fa fa-times-circle"></i>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
