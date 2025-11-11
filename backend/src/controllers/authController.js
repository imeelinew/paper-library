const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ code: 500, message: 'JWT_SECRET is not configured', data: null });
    }

    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      code: 0,
      message: 'ok',
      data: {
        token,
        user: payload
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message, data: null });
  }
}

module.exports = { login };
