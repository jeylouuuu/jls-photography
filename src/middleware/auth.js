const jwt = require('jsonwebtoken');

function requireProductionEnv(name, fallback) {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production') {
    if (!value || value === 'REPLACE_WITH_48_byte_random_hex' || value === 'REPLACE_WITH_STRONG_PASSWORD') {
      throw new Error(`Missing or unsafe production env var: ${name}`);
    }
    return value;
  }
  return value || fallback;
}

const JWT_SECRET = requireProductionEnv('JWT_SECRET', 'jls-change-this-in-production');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const payload = verifyToken(token);
  if (!payload || !payload.id) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.admin = payload;
  next();
}

module.exports = { signToken, verifyToken, requireAuth, JWT_SECRET };