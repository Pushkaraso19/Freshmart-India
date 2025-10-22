-- FreshMart Database Schema
-- PostgreSQL Database Setup

-- Drop existing tables (if any) in correct order to respect foreign key constraints
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category TEXT DEFAULT 'General',
  unit TEXT,
  brand TEXT,
  mrp_cents INTEGER CHECK (mrp_cents >= 0),
  is_veg BOOLEAN,
  origin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ADDRESSES TABLE
-- =====================================================
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('billing','shipping')),
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CARTS TABLE
-- =====================================================
CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','abandoned','ordered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index to ensure one open cart per user
CREATE UNIQUE INDEX uq_carts_user_open ON carts(user_id) WHERE status = 'open';

-- =====================================================
-- CART ITEMS TABLE
-- =====================================================
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE(cart_id, product_id)
);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  shipping_address_id INTEGER REFERENCES addresses(id) ON DELETE SET NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card','upi','cod')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  tracking_number TEXT,
  status TEXT DEFAULT 'placed' CHECK (status IN ('placed','processing','shipped','delivered','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price INTEGER NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  type TEXT NOT NULL CHECK (type IN ('payment','refund')),
  method TEXT CHECK (method IN ('card','upi','cod')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CONTACTS TABLE
-- =====================================================
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  category TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','in_progress','responded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SAMPLE DATA (Optional - Comment out if not needed)
-- =====================================================

-- Sample Admin User (password: admin123)
-- Note: Generate your own password hash using bcrypt
INSERT INTO users (name, email, phone, password_hash, role, is_active)
VALUES (
  'Admin User',
  'admin@freshmart.com',
  '1234567890',
  '$2a$10$rK3Z8Z9h.7qGxwYnBK6K3.wGQvZz5KxP5K8Z9h.7qGxwYnBK6K3.w',
  'admin',
  true
);

-- Sample Products
INSERT INTO products (name, description, category, price, image_url, stock) VALUES
('Organic Apples', 'Fresh and crispy organic apples', 'Fruits', 299, 'https://via.placeholder.com/300x200?text=Apples', 100),
('Bananas', 'Sweet and ripe bananas', 'Fruits', 199, 'https://via.placeholder.com/300x200?text=Bananas', 120),
('Almond Milk', 'Unsweetened almond milk 1L', 'Beverages', 349, 'https://via.placeholder.com/300x200?text=Almond+Milk', 80),
('Brown Bread', 'Whole grain bread loaf', 'Bakery', 249, 'https://via.placeholder.com/300x200?text=Bread', 60),
('Organic Tomatoes', 'Fresh organic tomatoes', 'Vegetables', 159, 'https://via.placeholder.com/300x200?text=Tomatoes', 150),
('Fresh Milk', 'Full cream milk 1L', 'Dairy', 289, 'https://via.placeholder.com/300x200?text=Milk', 90);

-- =====================================================
-- DATABASE SETUP COMPLETE
-- =====================================================
