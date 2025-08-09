const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ email, passwordHash });
    return res.status(201).json({ id: user._id, email: user.email });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'email already exists' });
    return res.status(500).json({ error: 'failed to create user' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign({ sub: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
});

module.exports = router;
