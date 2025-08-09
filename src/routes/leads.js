const express = require('express');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');
const { publicPostLimiter } = require('../middleware/rateLimit');
const router = express.Router();

router.post('/', publicPostLimiter, async (req, res) => {
  const { name, phone, service, note } = req.body || {};
  if (!name || !phone || !service) return res.status(400).json({ error: 'name, phone, service required' });

  try {
    const lead = await Lead.create({ name, phone, service, note });
    return res.status(201).json(lead);
  } catch {
    return res.status(400).json({ error: 'invalid payload' });
  }
});

router.get('/', auth(true), async (_req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 }).limit(200);
  return res.json(leads);
});

module.exports = router;
