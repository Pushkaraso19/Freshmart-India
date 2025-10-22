import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Shopping from './pages/Shopping.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderSuccess from './pages/OrderSuccess.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AccountOverview from './pages/AccountOverview.jsx'
import AccountOrders from './pages/AccountOrders.jsx'
import AccountAddresses from './pages/AccountAddresses.jsx'
import AdminProducts from './pages/AdminProducts.jsx'
import AdminOrders from './pages/AdminOrders.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AdminContacts from './pages/AdminContacts.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { isAuthenticated, user } = useAuth()
  const RequireAuth = ({ children }) => (isAuthenticated ? children : <Navigate to="/login" replace />)
  const RequireAdmin = ({ children }) => (isAuthenticated && user?.role === 'admin' ? children : <Navigate to="/" replace />)
  
  return (
    <Routes>
      <Route element={<Layout />}> 
  <Route index element={user?.role === 'admin' ? <Navigate to="/admin/products" replace /> : <Shopping />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/account" element={<RequireAuth><AccountOverview /></RequireAuth>} />
        <Route path="/account/orders" element={<RequireAuth><AccountOrders /></RequireAuth>} />
        <Route path="/account/addresses" element={<RequireAuth><AccountAddresses /></RequireAuth>} />
        
        {/* Admin Routes */}
        <Route path="/admin/products" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
        <Route path="/admin/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
        <Route path="/admin/contacts" element={<RequireAdmin><AdminContacts /></RequireAdmin>} />
        <Route path="/admin" element={<Navigate to="/admin/products" replace />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
