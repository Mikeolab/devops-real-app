// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');

const app = express();

// Trust Render/Proxy so req.ip etc. are correct
app.set('trust proxy', 1);

// CORS + JSON
app.use(cors({ origin: process.env.ORIGIN || '*' }));
app.use(express.json());

// ---- simple latency logs (perf in ms) ----
app.use((req, res, next) => {
  const t0 = performance.now();
  res.on('finish', () => {
    const ms = (performance.now() - t0).toFixed(1);
    console.log(`[${res.statusCode}] ${req.method} ${req.originalUrl} ${ms}ms`);
  });
  next();
});
// ------------------------------------------

// --- static site ---
const staticDir = path.join(__dirname, '..', 'public');
console.log('[BOOT] Serving static from:', staticDir);
app.use(express.static(staticDir));

// --- file store for leads ---
const dataDir = path.join(__dirname, '..', 'data');
const leadsFile = path.join(dataDir, 'leads-buffer.json');

async function ensureLeadsStore() {
  await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
  try { await fs.access(leadsFile); }
  catch { await fs.writeFile(leadsFile, '[]', 'utf8'); }
}
async function readLeads() {
  await ensureLeadsStore();
  return JSON.parse(await fs.readFile(leadsFile, 'utf8'));
}
async function addLead(lead) {
  const all = await readLeads();
  const saved = { ...lead, _source: 'file', createdAt: new Date().toISOString() };
  all.unshift(saved);
  await fs.writeFile(leadsFile, JSON.stringify(all, null, 2), 'utf8');
  return saved;
}

// --- health ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- quotes ---
app.get('/quotes', async (_req, res) => {
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
      { timeout: 5000 }
    );
    const d = await r.json();
    res.json({
      bitcoin_usd: d?.bitcoin?.usd ?? null,
      ethereum_usd: d?.ethereum?.usd ?? null
    });
  } catch {
    res.status(502).json({ error: 'price feed unavailable' });
  }
});

// --- leads (POST/GET) ---
app.post('/leads', async (req, res) => {
  const { name, phone, service, note = '' } = req.body || {};
  if (!name || !phone || !service) {
    return res.status(400).json({ error: 'name, phone, and service are required' });
  }
  try {
    const saved = await addLead({ name, phone, service, note });
    res.status(201).json(saved);
  } catch (e) {
    console.error('Failed to save lead:', e);
    res.status(500).json({ error: 'failed to save lead' });
  }
});

app.get('/leads', async (_req, res) => {
  try {
    const all = await readLeads();
    res.json(all.slice(0, 200));
  } catch (e) {
    console.error('Failed to read leads:', e);
    res.status(500).json({ error: 'failed to read leads' });
  }
});

// --- homepage ---
app.get('/', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));

module.exports = app;
