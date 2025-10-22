const pool = require('../db/pool')

async function me(req, res) {
  try {
  const { rows } = await pool.query('SELECT id, username, name, email, phone, role, is_active, created_at FROM users WHERE id=$1', [req.user.id])
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load profile' })
  }
}

async function listAddresses(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT id, type, line1, line2, city, state, postal_code, country, is_default FROM addresses WHERE user_id=$1 ORDER BY id DESC',
      [req.user.id]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load addresses' })
  }
}

async function addAddress(req, res) {
  const { type = 'shipping', line1, line2, city, state, postal_code, country, is_default } = req.body || {}
  if (!['billing','shipping'].includes(type)) return res.status(400).json({ error: 'Invalid address type' })
  if (!line1 || !city || !state || !postal_code) return res.status(400).json({ error: 'Missing address fields' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO addresses(user_id, type, line1, line2, city, state, postal_code, country, is_default)
       VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'India'),COALESCE($9,false))
       RETURNING id, type, line1, line2, city, state, postal_code, country, is_default`,
      [req.user.id, type, line1, line2 || null, city, state, postal_code, country || null, !!is_default]
    )
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default=false WHERE user_id=$1 AND id<>$2', [req.user.id, rows[0].id])
    }
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add address' })
  }
}

async function updateAddress(req, res) {
  const id = parseInt(req.params.id, 10)
  const { type, line1, line2, city, state, postal_code, country, is_default } = req.body || {}
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  try {
    const { rows } = await pool.query(
      `UPDATE addresses SET
        type=COALESCE($1, type),
        line1=COALESCE($2, line1),
        line2=COALESCE($3, line2),
        city=COALESCE($4, city),
        state=COALESCE($5, state),
        postal_code=COALESCE($6, postal_code),
        country=COALESCE($7, country),
        is_default=COALESCE($8, is_default)
       WHERE id=$9 AND user_id=$10
       RETURNING id, type, line1, line2, city, state, postal_code, country, is_default`,
      [type, line1, line2, city, state, postal_code, country, is_default, id, req.user.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Address not found' })
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default=false WHERE user_id=$1 AND id<>$2', [req.user.id, rows[0].id])
    }
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update address' })
  }
}

async function deleteAddress(req, res) {
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
  try {
    const { rowCount } = await pool.query('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [id, req.user.id])
    if (!rowCount) return res.status(404).json({ error: 'Address not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete address' })
  }
}

module.exports = { me, listAddresses, addAddress, updateAddress, deleteAddress }
