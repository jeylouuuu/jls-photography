const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { signToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

function publicAdmin(admin) {
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    full_name: admin.full_name
  };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const db = getDb();
  const admin = db
    .prepare('SELECT * FROM admins WHERE username = ? OR email = ?')
    .get(username.trim(), username.trim());
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = signToken({ id: admin.id, username: admin.username, email: admin.email });
  res.json({ token, admin: publicAdmin(admin) });
});

router.get('/verify', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ valid: false });
  const payload = verifyToken(token);
  if (!payload || !payload.id) return res.status(401).json({ valid: false });
  const admin = getDb().prepare('SELECT * FROM admins WHERE id = ?').get(payload.id);
  if (!admin) return res.status(401).json({ valid: false });
  res.json({ valid: true, admin: publicAdmin(admin) });
});

router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;