import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useEffect, useState } from 'react'

export default function AccountOverview() {
  const { api, user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ orders: 0, addresses: 0 })

  useEffect(() => {
    // Load profile and basic stats
    Promise.all([
      api('/account/me').catch(() => null),
      api('/orders').catch(() => []),
      api('/account/addresses').catch(() => [])
    ]).then(([profileData, orders, addresses]) => {
      if (profileData) setProfile(profileData)
      setStats({ 
        orders: orders?.length || 0, 
        addresses: addresses?.length || 0 
      })
    })
  }, [])

  const accountCards = [
    {
      title: 'Orders',
      description: 'Track purchases and order history',
      link: '/account/orders',
      count: stats.orders,
      color: '#22c55e',
      bg: 'linear-gradient(135deg, #22c55e08, #22c55e15)',
      svg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      )
    },
    {
      title: 'Addresses',
      description: 'Manage shipping and billing',
      link: '/account/addresses',
      count: stats.addresses,
      color: '#3b82f6',
      bg: 'linear-gradient(135deg, #3b82f608, #3b82f615)',
      svg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      )
    }
  ]

  return (
    <div className="account-page">
      <div className="main-header">
          <h1 className="main-title">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</h1>
          <p className="main-subtitle">Manage your account and preferences</p>
      </div>
      <div className="account-layout">
        {/* Sidebar Profile */}
        <div className="account-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              <span className="avatar-initial">{profile ? (profile.name || 'U').charAt(0).toUpperCase() : user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div className="sidebar-info">
              <h3 className="sidebar-name">{profile?.name || user?.name || 'User'}</h3>
              <p className="sidebar-email">{profile?.email || user?.email || 'Loading...'}</p>
              <div className="sidebar-meta">
                <div className="meta-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>{profile?.phone || user?.phone || 'No phone'}</span>
                </div>
                <div className="meta-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Since {profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="sidebar-stats">
            <div className="sidebar-stat">
              <span className="stat-number">{stats.orders}</span>
              <span className="stat-label">Total Orders</span>
            </div>
            <div className="sidebar-stat">
              <span className="stat-number">{stats.addresses}</span>
              <span className="stat-label">Saved Addresses</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="account-main">

          <div className="actions-grid">
            {accountCards.map((card, index) => (
              <Link 
                key={index} 
                to={card.link} 
                className="action-card"
                style={{ 
                  background: card.bg,
                  '--card-color': card.color
                }}
              >
                <div className="action-header">
                  <div className="action-icon" style={{ color: card.color }}>
                    {card.svg}
                  </div>
                  <div className="action-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17l10-10"/>
                      <path d="M7 7h10v10"/>
                    </svg>
                  </div>
                </div>
                
                <div className="action-content">
                  <h3 className="action-title">{card.title}</h3>
                  <p className="action-description">{card.description}</p>
                  <div className="action-count" style={{ color: card.color }}>
                    {card.count}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
