require('dotenv').config();
const jwt = require('jsonwebtoken');

function auth(requiredRoles = []) {
  return (req, res, next) => {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ code: 500, message: 'JWT_SECRET is not configured', data: null });
    }

    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ code: 401, message: 'Unauthorized', data: null });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { id, username, role }
      if (requiredRoles.length && !requiredRoles.includes(req.user.role)) {
        return res.status(403).json({ code: 403, message: 'Forbidden', data: null });
      }
      next();
    } catch {
      return res.status(401).json({ code: 401, message: 'Invalid or expired token', data: null });
    }
  };
}

module.exports = { auth };
