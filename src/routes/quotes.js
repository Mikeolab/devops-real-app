const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'bitcoin,ethereum', vs_currencies: 'usd' },
      timeout: 5000
    });
    return res.json({
      bitcoin_usd: data?.bitcoin?.usd ?? null,
      ethereum_usd: data?.ethereum?.usd ?? null
    });
  } catch {
    return res.status(502).json({ error: 'price feed unavailable' });
  }
});

module.exports = router;
