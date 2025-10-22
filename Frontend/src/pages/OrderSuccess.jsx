import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../styles/orderSuccess.css'

export default function OrderSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Redirect after 5 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <section className="order-success-section">
      <div className="order-success-container">
        <div className="success-card">
          <div className="success-icon">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" fill="#dcfce7"/>
              <path d="M8 12.5L10.5 15L16 9.5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h1>Order Placed Successfully!</h1>
          
          {orderId && (
            <div className="order-info">
              <span className="order-label">Order ID:</span>
              <span className="order-id">#{orderId}</span>
            </div>
          )}
          
          <div className="redirect-notice">
            <i className="fa fa-clock"></i>
            Redirecting to home page in <strong>{countdown}</strong> seconds...
          </div>
        </div>
      </div>
    </section>
  )
}
