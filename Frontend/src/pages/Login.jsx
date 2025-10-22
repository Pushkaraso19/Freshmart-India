import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state && location.state.from) || '/'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      // If admin, take them directly to admin products; else go back to previous or home
      if (data?.user?.role === 'admin') {
        navigate('/admin/products', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p>Please sign in to continue</p>
        <form onSubmit={onSubmit} className="auth-form">
          <label>Email</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          <label>Password</label>
          <div className="password-field">
            <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} required />
            <button type="button" aria-label="Toggle password visibility" onClick={()=>setShowPwd(s=>!s)} className="password-toggle">
              <i className={`fa ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          {error && <div className="form-error" style={{color:'var(--red)'}}>{error}</div>}
          <button disabled={loading} className="btn btn-primary" type="submit">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </section>
  )
}
