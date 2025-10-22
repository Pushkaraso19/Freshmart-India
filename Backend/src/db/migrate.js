const pool = require('./pool');

async function migrate({ drop = false } = {}) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		if (drop) {
			await client.query(`
				DROP TABLE IF EXISTS transactions;
				DROP TABLE IF EXISTS order_items;
				DROP TABLE IF EXISTS orders;
				DROP TABLE IF EXISTS cart_items;
				DROP TABLE IF EXISTS carts;
				DROP TABLE IF EXISTS addresses;
				DROP TABLE IF EXISTS products;
				DROP TABLE IF EXISTS users;
			`);
		}

		await client.query(`
			-- Users
			CREATE TABLE IF NOT EXISTS users (
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

			-- Products
			CREATE TABLE IF NOT EXISTS products (
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

			-- Addresses
			CREATE TABLE IF NOT EXISTS addresses (
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

			-- Carts
			CREATE TABLE IF NOT EXISTS carts (
				id SERIAL PRIMARY KEY,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','abandoned','ordered')),
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);
			CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_user_open ON carts(user_id) WHERE status = 'open';

			-- Cart items
			CREATE TABLE IF NOT EXISTS cart_items (
				id SERIAL PRIMARY KEY,
				cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
				product_id INTEGER NOT NULL REFERENCES products(id),
				quantity INTEGER NOT NULL CHECK (quantity > 0),
				UNIQUE(cart_id, product_id)
			);

			-- Orders
			CREATE TABLE IF NOT EXISTS orders (
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

			-- Order items
			CREATE TABLE IF NOT EXISTS order_items (
				id SERIAL PRIMARY KEY,
				order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
				product_id INTEGER NOT NULL REFERENCES products(id),
				quantity INTEGER NOT NULL CHECK (quantity > 0),
				price INTEGER NOT NULL CHECK (price >= 0),
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);

			-- Transactions
			CREATE TABLE IF NOT EXISTS transactions (
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

			-- Contacts (contact responses)
			CREATE TABLE IF NOT EXISTS contacts (
				id SERIAL PRIMARY KEY,
				name TEXT NOT NULL,
				email TEXT NOT NULL,
				subject TEXT,
				category TEXT,
				message TEXT NOT NULL,
				status TEXT DEFAULT 'new' CHECK (status IN ('new','in_progress','responded')),
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);
		`);

		await client.query('COMMIT');
		console.log('Migration completed');
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Migration failed', err);
		process.exitCode = 1;
	} finally {
		client.release();
	}
}

const args = process.argv.slice(2);
const drop = args.includes('--drop');
migrate({ drop }).then(() => process.exit());
