const pool = require('./pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
	const client = await pool.connect();
	try {
		console.log('Running Razorpay migration...');
		
		const sql = fs.readFileSync(
			path.join(__dirname, 'migrate_razorpay.sql'),
			'utf8'
		);

		await client.query(sql);
		
		console.log('✓ Migration completed successfully');
		console.log('Database is now ready for Razorpay payments');
	} catch (err) {
		console.error('Migration failed:', err);
		throw err;
	} finally {
		client.release();
		await pool.end();
	}
}

runMigration();
