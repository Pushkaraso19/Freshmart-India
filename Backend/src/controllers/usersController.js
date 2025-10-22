const pool = require('../db/pool');

async function adminListUsers(req, res) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 200);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role, is_active, created_at
       FROM users
       ORDER BY id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int as count FROM users');
    res.json({ items: rows, page, limit, total: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load users' });
  }
}

module.exports = { adminListUsers };

async function adminUpdateUser(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const { role, is_active } = req.body || {};
  const updates = [];
  const values = [];
  let i = 1;
  if (role !== undefined) {
    if (!['admin','customer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    updates.push(`role=$${i++}`); values.push(role);
  }
  if (is_active !== undefined) {
    updates.push(`is_active=$${i++}`); values.push(!!is_active);
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  try {
    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${i} RETURNING id, name, email, phone, role, is_active, created_at`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

module.exports.adminUpdateUser = adminUpdateUser;
