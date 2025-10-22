const pool = require('../db/pool');

async function createContact(req, res) {
  const { name, email, subject = null, category = null, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO contacts(name,email,subject,category,message)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id,name,email,subject,category,message,status,created_at`,
      [name, email, subject, category, message]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit message' });
  }
}

async function adminListContacts(req, res) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 200);
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(
      `SELECT id,name,email,subject,category,message,status,created_at
       FROM contacts
       ORDER BY id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int as count FROM contacts');
    res.json({ items: rows, page, limit, total: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
}

async function adminUpdateContactStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const { status } = req.body || {};
  const allowed = ['new','in_progress','responded'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const { rows } = await pool.query(
      `UPDATE contacts SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id,status,updated_at`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Contact not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
}

module.exports = { createContact, adminListContacts, adminUpdateContactStatus };

async function adminDeleteContact(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const { rowCount } = await pool.query('DELETE FROM contacts WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
}

module.exports.adminDeleteContact = adminDeleteContact;
