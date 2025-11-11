const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

function buildTokenPayload(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function respondWithToken(res, user) {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ code: 500, message: 'JWT_SECRET is not configured', data: null });
  }
  const payload = buildTokenPayload(user);
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  return res.json({ code: 0, message: 'ok', data: { token, user: payload } });
}

async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: 'Username and password are required', data: null });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ code: 401, message: 'Invalid username or password', data: null });
    }

    const matched = await bcrypt.compare(password, user.password_hash);
    if (!matched) {
      return res.status(401).json({ code: 401, message: 'Invalid username or password', data: null });
    }

    respondWithToken(res, user);
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message, data: null });
  }
}

async function register(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: 'Username and password are required', data: null });
    }

    const exists = await User.findOne({ where: { username } });
    if (exists) {
      return res.status(409).json({ code: 409, message: 'Username already exists', data: null });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password_hash, role: 'user' });
    respondWithToken(res, user);
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message, data: null });
  }
}

module.exports = { login, register };
