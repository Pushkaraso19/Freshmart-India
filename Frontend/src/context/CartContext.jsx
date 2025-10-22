import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { withAuth } from '../lib/api'
import { useAuth } from './AuthContext.jsx'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
  const api = withAuth(token)
  const normalizeItems = (val) => {
    try {
      // If value is a string that looks like JSON, parse it
      const data = typeof val === 'string' ? JSON.parse(val) : val
      if (Array.isArray(data)) {
        return data.filter((p) => p && typeof p === 'object' && 'id' in p)
      }
      if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) return data.items
        // Convert map-like objects to array of values
        const values = Object.values(data)
        return Array.isArray(values) ? values.filter((p) => p && typeof p === 'object' && 'id' in p) : []
      }
      return []
    } catch {
      return []
    }
  }

  const [items, setItems] = useState(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('cart:v1') : null
    return normalizeItems(raw)
  })

  useEffect(() => {
    try {
      const safe = Array.isArray(items) ? items : []
      localStorage.setItem('cart:v1', JSON.stringify(safe))
    } catch {}
  }, [items])

  const addItem = (product, qty = 1) => {
    // Ensure product has valid price
    if (!product || !product.id) {
      console.error('Invalid product:', product)
      return
    }
    
    const validProduct = {
      ...product,
      price: Number(product.price) || 0,
      quantity: Number(qty) || 1
    }
    
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === validProduct.id)
      if (idx !== -1) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + validProduct.quantity }
        return copy
      }
      return [...prev, validProduct]
    })
  }

  const updateQty = (id, qty) => {
    setItems(prev => prev.map(p => (p.id === id ? { ...p, quantity: Math.max(1, qty) } : p)))
    // Best-effort server sync if authenticated and we have cartItemId
    if (isAuthenticated) {
      const item = items.find((p) => p.id === id)
      if (item && item.cartItemId) {
        api(`/cart/item/${item.cartItemId}`, { method: 'PATCH', body: { quantity: Math.max(1, qty) } }).catch(() => {})
      }
    }
  }

  const increment = (id) => {
    setItems(prev => prev.map(p => (p.id === id ? { ...p, quantity: p.quantity + 1 } : p)))
    if (isAuthenticated) {
      const item = items.find((p) => p.id === id)
      if (item && item.cartItemId) {
        api(`/cart/item/${item.cartItemId}`, { method: 'PATCH', body: { quantity: (item.quantity || 0) + 1 } }).catch(() => {})
      }
    }
  }
  const decrement = (id) => {
    setItems(prev => prev.map(p => (p.id === id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p)))
    if (isAuthenticated) {
      const item = items.find((p) => p.id === id)
      if (item && item.cartItemId) {
        api(`/cart/item/${item.cartItemId}`, { method: 'PATCH', body: { quantity: Math.max(1, (item.quantity || 1) - 1) } }).catch(() => {})
      }
    }
  }

  const removeItem = (id) => {
    const item = items.find((p) => p.id === id)
    setItems(prev => prev.filter(p => p.id !== id))
    if (isAuthenticated && item && item.cartItemId) {
      api(`/cart/item/${item.cartItemId}`, { method: 'DELETE' }).catch(() => {})
    }
  }
  const clearCart = () => {
    setItems([])
    if (isAuthenticated) {
      api('/cart/clear', { method: 'DELETE' }).catch(() => {})
    }
  }

  // Hydrate from server cart when authenticated
  const hydrate = async () => {
    if (!isAuthenticated) return
    try {
      const data = await api('/cart')
      const mapped = Array.isArray(data?.items)
        ? data.items.map((it, idx) => ({
            id: it.product_id,
            name: it.name,
            // Convert cents to rupees; UI expects rupees
            price: Math.round(Number(it.price_cents || 0) / 100),
            image: it.image_url || `/assets/image/product-${(idx % 8) + 1}.png`,
            quantity: Number(it.quantity) || 1,
            cartItemId: it.id,
            unit: it.unit,
            category: it.category,
            is_veg: it.is_veg
          }))
        : []
      setItems(mapped)
    } catch (err) {
      console.error('Failed to hydrate cart:', err)
    }
  }

  useEffect(() => {
    // hydrate on auth state change
    hydrate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token])

  useEffect(() => {
    const syncListener = () => hydrate()
    window.addEventListener('sync-cart', syncListener)
    return () => window.removeEventListener('sync-cart', syncListener)
  }, [])

  const { itemCount, subtotal } = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    const itemCount = list.reduce((n, p) => n + (Number(p.quantity) || 0), 0)
    const subtotal = list.reduce((sum, p) => {
      const price = Number(p.price) || 0
      const quantity = Number(p.quantity) || 0
      return sum + (price * quantity)
    }, 0)
    return { itemCount, subtotal }
  }, [items])

  const shipping = subtotal >= 1500 || subtotal === 0 ? 0 : 150
  const tax = Math.round(subtotal * 0.05 * 100) / 100 // 5% GST with 2 decimal places
  const total = subtotal + shipping + tax

  const value = {
    items,
    addItem,
    updateQty,
    increment,
    decrement,
    removeItem,
    clearCart,
    hydrate,
    itemCount,
    subtotal,
    shipping,
    tax,
    total,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
