const crypto = require('crypto');

function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error('ADMIN_PASSWORD environment variable is not set');
  }
  if (typeof password !== 'string') return false;
  const a = crypto.createHash('sha256').update(password).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/adin');
}

function requireAuthApi(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function loginLimiter(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).send('Too many attempts. Try again in 15 minutes.');
  }
  next();
}

module.exports = { checkPassword, requireAuth, requireAuthApi, loginLimiter };
