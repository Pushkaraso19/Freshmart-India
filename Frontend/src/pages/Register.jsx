import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { register, api, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(1)
  // Step 1
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // Step 2
  const [addr, setAddr] = useState({ type:'shipping', line1:'', line2:'', city:'', state:'', postal_code:'', country:'India', is_default:true })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state && location.state.from) || '/'

  useEffect(() => {
    if (isAuthenticated && step === 2) {
      // user just registered; continue to address form
    }
  }, [isAuthenticated, step])

  const submitStep1 = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !phone || !password) return setError('All fields are required')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError('Passwords do not match')
    if (phone.length < 10) return setError('Please enter a valid phone number')
    setLoading(true)
    try {
      await register(name, email, phone, password)
      setStep(2)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const submitStep2 = async (e) => {
    e.preventDefault()
    setError('')
    // Minimal validation
    if (!addr.line1 || !addr.city || !addr.state || !addr.postal_code) {
      return setError('Please complete the address fields')
    }
    setLoading(true)
    try {
      await api('/account/addresses', { method:'POST', body: addr })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p>Quick 2-step setup</p>

        {step === 1 && (
          <>
            <div className="auth-steps">
              <div className="auth-step active">1</div>
              <div className="auth-step">2</div>
            </div>
            <form onSubmit={submitStep1} className="auth-form">
              <label>Full Name</label>
              <input type="text" value={name} onChange={(e)=>setName(e.target.value)} required placeholder="Enter your full name" />
              
              <label>Email Address</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="Enter your email" />
              
              <label>Phone Number</label>
              <input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} required placeholder="Enter your phone number" pattern="[0-9]{10,}" />
              
              <label>Password</label>
              <div className="password-field">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} required placeholder="Create a password" />
                <button type="button" aria-label="Toggle password visibility" onClick={()=>setShowPwd(s=>!s)} className="password-toggle">
                  <i className={`fa ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              
              <label>Confirm Password</label>
              <div className="password-field">
                <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e)=>setConfirm(e.target.value)} required placeholder="Confirm your password" />
                <button type="button" aria-label="Toggle confirm password visibility" onClick={()=>setShowConfirm(s=>!s)} className="password-toggle">
                  <i className={`fa ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <small>Use at least 6 characters with a mix of letters and numbers.</small>
              
              {error && <div className="form-error">{error}</div>}
              
              <button disabled={loading} className="btn btn-primary" type="submit">
                {loading ? (
                  <>
                    <i className="fa fa-spinner fa-spin"></i>
                    Creating Account...
                  </>
                ) : (
                  'Continue to Address'
                )}
              </button>
              
              <div className="auth-switch">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-steps">
              <div className="auth-step completed">1</div>
              <div className="auth-step active">2</div>
            </div>
            <form onSubmit={submitStep2} className="auth-form">
              <h3 style={{fontSize:'1.8rem', marginBottom:'1rem', color:'var(--dark)', textAlign:'center'}}>
                <i className="fa fa-map-marker-alt" style={{marginRight:'0.5rem', color:'var(--primary)'}}></i>
                Shipping Address
              </h3>
              
              <label>Flat No., Apartment</label>
              <input name="line1" value={addr.line1} onChange={(e)=>setAddr(a=>({...a, line1:e.target.value}))} required placeholder="001, Summer" />
              
              <label>Street Address</label>
              <input name="line2" value={addr.line2} onChange={(e)=>setAddr(a=>({...a, line2:e.target.value}))} required placeholder="123 Main Street" />
              
              <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'1rem'}}>
                <div>
                  <label>City</label>
                  <input name="city" value={addr.city} onChange={(e)=>setAddr(a=>({...a, city:e.target.value}))} required placeholder="Mumbai" />
                </div>
                <div>
                  <label>Postal Code</label>
                  <input name="postal_code" value={addr.postal_code} onChange={(e)=>setAddr(a=>({...a, postal_code:e.target.value}))} required placeholder="10001" />
                </div>
              </div>
              
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div>
                  <label>State</label>
                  <input name="state" value={addr.state} onChange={(e)=>setAddr(a=>({...a, state:e.target.value}))} required placeholder="Maharashtra" />
                </div>
                <div>
                  <label>Country</label>
                  <input name="country" value={addr.country} onChange={(e)=>setAddr(a=>({...a, country:e.target.value}))} placeholder="India" />
                </div>
              </div>
              
              {error && <div className="form-error">{error}</div>}
              
              <div className="step-buttons">
                <button type="button" className="btn btn-secondary" onClick={()=>setStep(1)}>
                  Back
                </button>
                <button disabled={loading} className="btn btn-primary" type="submit">
                  {loading ? (
                    <>
                      <i className="fa fa-spinner fa-spin"></i>
                      Finishing...
                    </>
                  ) : (
                    <>
                      Complete Registration
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
