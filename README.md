# FreshMart - Online Grocery E-commerce Platform

A full-stack e-commerce web application for online grocery shopping. Built with modern web technologies including React, Node.js, Express, and PostgreSQL.

---

## 🚀 Features

### User Features
- 🔐 **User Authentication** - Secure registration and login with JWT tokens
- 🛍️ **Product Browsing** - Browse products by categories with search functionality
- 🛒 **Shopping Cart** - Add/remove items with real-time cart updates
- 💳 **Checkout Process** - Complete order placement with multiple payment options
- 📦 **Order Tracking** - View order history and track order status
- 👤 **Account Management** - Manage profile, addresses, and view order history
- 📧 **Contact Form** - Submit inquiries and feedback

### Admin Features
- 📊 **Admin Dashboard** - Comprehensive admin panel for managing the platform
- 📦 **Product Management** - Create, update, and delete products
- 📋 **Order Management** - View and update order statuses
- 👥 **User Management** - View and manage user accounts
- 💬 **Contact Management** - View and respond to customer inquiries
- 📈 **Inventory Tracking** - Monitor stock levels with alerts

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **React Router v7** - Client-side routing
- **Vite** - Build tool and dev server
- **CSS3** - Custom styling with responsive design
- **Font Awesome** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Relational database (Aiven cloud hosting)
- **JWT** - Authentication tokens
- **bcrypt.js** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger

---

## 📁 Project Structure

```
FreshMart/
├── Backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── db/                # Database scripts & connection
│   │   ├── middleware/        # Auth & admin middleware
│   │   ├── routes/            # API route definitions
│   │   ├── server.js          # Express server setup
│   │   └── setupEnv.js        # Environment configuration
│   ├── .env                   # Environment variables (not in git)
│   └── package.json
│
├── Frontend/                   # React frontend
│   ├── public/
│   │   └── assets/image/      # Static images
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React context (Auth, Cart)
│   │   ├── lib/               # API utilities
│   │   ├── pages/             # Page components
│   │   ├── styles/            # CSS stylesheets
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── database.sql                # Complete database schema
└── README.md                   # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **PostgreSQL** database (local or cloud)

### 1. Clone the Repository
```bash
git clone https://github.com/Pushkaraso19/Freshmart-India.git
cd FreshMart
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `Backend` directory:

```env
# Server
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Environment
NODE_ENV=development
```

#### Database Setup

**Option 1: Using the SQL file (Recommended)**
```bash
# From the project root directory
psql $DATABASE_URL -f database.sql

# This will:
# - Create all tables with proper schema
# - Set up indexes and constraints
# - Insert sample admin user and products
```

**Option 2: Using npm migration script**
```bash
# Create database tables only (no sample data)
npm run migrate

# Or drop existing tables and recreate
npm run migrate:drop

# Seed sample data (optional)
npm run seed
```

**Default Admin Credentials (from database.sql):**
- Email: `admin@freshmart.com`
- Password: `admin123`


**Manual Admin User Creation:**

If you prefer to create your own admin user:

```bash
# Generate password hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(h => console.log(h));"
```

```sql
-- Insert admin user with your hashed password
INSERT INTO users (name, email, phone, password_hash, role, is_active)
VALUES ('Your Name', 'your@email.com', '1234567890', 'HASHED_PASSWORD_HERE', 'admin', true);
```

#### Start Backend Server
```bash
npm run dev    # Development with nodemon
# or
npm start      # Production
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd Frontend
npm install
```

#### Configure API Endpoint (if needed)
If your backend runs on a different port, update the API base URL in `Frontend/src/lib/api.js`.

#### Start Frontend Development Server
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

---

## 🎮 Usage

### Regular User Flow
1. **Register** an account at `/register` or **Login** at `/login`
2. **Browse** products on the homepage
3. **Add items** to cart
4. **Checkout** and place order
5. **Track orders** in your account dashboard

### Admin Flow
1. **Login** with admin credentials
2. Click profile icon → **"Admin Dashboard"**
3. Manage products, orders, users, and contacts

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Products
- `GET /api/products` - List all products (public)
- `GET /api/products/:id` - Get single product (public)
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Cart
- `GET /api/cart` - Get user's cart (auth required)
- `POST /api/cart/items` - Add item to cart (auth required)
- `PUT /api/cart/items/:id` - Update cart item (auth required)
- `DELETE /api/cart/items/:id` - Remove cart item (auth required)

### Orders
- `GET /api/orders` - Get user's orders (auth required)
- `POST /api/orders` - Place new order (auth required)
- `GET /api/orders/admin` - List all orders (admin only)
- `PUT /api/orders/:id` - Update order status (admin only)

### Account
- `GET /api/account/profile` - Get user profile (auth required)
- `PUT /api/account/profile` - Update profile (auth required)
- `GET /api/account/addresses` - Get user addresses (auth required)
- `POST /api/account/addresses` - Add address (auth required)

### Contacts
- `POST /api/contacts` - Submit contact form (public)
- `GET /api/contacts` - List all contacts (admin only)

### Users (Admin)
- `GET /api/users` - List all users (admin only)
- `PUT /api/users/:id` - Update user (admin only)

---

## 🗄️ Database Schema

The complete database schema is available in the [`database.sql`](./database.sql) file at the root of the project.

### Quick Database Setup

#### Option 1: Using the SQL File (Recommended)
```bash
# Connect to your PostgreSQL database and run the SQL file
psql $DATABASE_URL -f database.sql

# Or if using local PostgreSQL
psql -U your_username -d freshmart -f database.sql
```

#### Option 2: Using npm migration script
```bash
cd Backend
npm run migrate
```

### Database Tables Overview

The database consists of 8 main tables:

1. **users** - User accounts with authentication and role management
2. **products** - Product catalog with pricing and inventory
3. **addresses** - User shipping and billing addresses
4. **carts** - Active shopping carts for users
5. **cart_items** - Items within shopping carts
6. **orders** - Completed order records
7. **order_items** - Products within orders
8. **transactions** - Payment transaction records
9. **contacts** - Customer inquiry submissions

### Key Relationships
- **users** → **addresses** (one-to-many)
- **users** → **carts** (one-to-many)
- **users** → **orders** (one-to-many)
- **carts** → **cart_items** (one-to-many)
- **products** → **cart_items** (one-to-many)
- **orders** → **order_items** (one-to-many)
- **products** → **order_items** (one-to-many)
- **orders** → **transactions** (one-to-many)

### Sample Data
The `database.sql` file includes sample data:
- 1 admin user (email: admin@freshmart.com, password: admin123)
- 6 sample products across different categories

**⚠️ Important:** Change the admin password immediately after setup!

---

## 🔐 Security Features

- **Password Hashing** - bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth
- **Role-Based Access Control** - Admin vs Customer roles
- **SQL Injection Prevention** - Parameterized queries
- **CORS Configuration** - Controlled cross-origin access
- **Environment Variables** - Sensitive data protection
- **Input Validation** - Server-side validation

---

## 📱 Responsive Design

The application is fully responsive and works seamlessly on:
- 📱 Mobile devices (320px+)
- 📱 Tablets (768px+)
- 💻 Desktops (1024px+)
- 🖥️ Large screens (1440px+)

---

## 🎨 Key Features Implementation

### Frontend Highlights
- **Context API** - Global state management for Auth and Cart
- **Protected Routes** - Route guards for authenticated/admin routes
- **Dynamic Rendering** - Data-driven UI components
- **Form Validation** - Client-side form validation
- **Error Handling** - User-friendly error messages
- **Loading States** - Loading indicators for async operations

### Backend Highlights
- **RESTful API** - Standard REST endpoints
- **Middleware Pipeline** - Auth, validation, error handling
- **Connection Pooling** - Efficient database connections
- **Transaction Support** - ACID compliance for orders
- **Logging** - Request/response logging with Morgan

---

## 🚧 Development Scripts

### Backend
```bash
npm run dev          # Start with nodemon (auto-restart)
npm start            # Start production server
npm run migrate      # Run database migrations
npm run migrate:drop # Drop all tables and recreate
npm run seed         # Seed sample data
```

### Frontend
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## 🐛 Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env` is correct
- Check PostgreSQL is running
- For Aiven cloud DB, ensure SSL is configured properly
- Test connection: `psql $DATABASE_URL`

### Admin Dashboard Not Accessible
- Verify user role is 'admin' in database
- Check that admin user exists with correct credentials
- Clear browser cache and re-login
- Check JWT token includes role claim
- Verify backend authController includes role in JWT payload

### CORS Errors
- Backend should allow frontend origin in CORS config
- Check backend is running on correct port
- Verify API base URL in frontend matches backend

### Port Already in Use
```bash
# Kill process on port 5000 (backend)
npx kill-port 5000

# Kill process on port 5173 (frontend)
npx kill-port 5173
```

---

## 📦 Dependencies

### Backend Key Packages
- `express` - Web framework
- `pg` - PostgreSQL client
- `jsonwebtoken` - JWT implementation
- `bcryptjs` - Password hashing
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `morgan` - HTTP logger

### Frontend Key Packages
- `react` & `react-dom` - React library
- `react-router-dom` - Routing
- `vite` - Build tool
- `swiper` - Carousel/slider component

---

