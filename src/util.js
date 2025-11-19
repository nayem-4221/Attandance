const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev');
    req.user = decoded; // { username, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || (req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = { requireAuth, adminOnly };
