const pool = require('./pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running is_active migration...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrate_active_status.sql'),
      'utf8'
    );
    
    await client.query(sql);
    console.log('✅ Migration completed successfully');
    console.log('   - Added is_active column to products table');
    console.log('   - Set all existing products to active');
    console.log('   - Created performance index');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
