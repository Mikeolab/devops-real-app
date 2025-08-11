// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');
const { performance } = require('node:perf_hooks');
const client = require('prom-client');

const app = express();

// Trust proxy (Render) and basic middleware
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.ORIGIN || '*' }));
app.use(express.json());

// ---------- Latency log to stdout ----------
app.use((req, res, next) => {
  const t0 = performance.now();
  res.on('finish', () => {
    const ms = (performance.now() - t0).toFixed(1);
    console.log(`[${res.statusCode}] ${req.method} ${req.originalUrl} ${ms}ms`);
  });
  next();
});

// ---------- Prometheus metrics ----------
client.collectDefaultMetrics({ labels: { app: 'devops-real-app' } });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// per-request measurement
app.use((req, res, next) => {
  const routeLabel = req.path; // no querystring
  const end = httpRequestDuration.startTimer({ method: req.method, route: routeLabel });
  res.on('finish', () => {
    end({ status_code: res.statusCode });
    httpRequestsTotal.inc({ method: req.method, route: routeLabel, status_code: String(res.statusCode) });
  });
  next();
});

// expose metrics
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ---------- Static site ----------
const staticDir = path.join(__dirname, '..', 'public');
console.log('[BOOT] Serving static from:', staticDir);
app.use(express.static(staticDir));

// ---------- File-backed leads ----------
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

// ---------- Routes ----------
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Quotes via Coinbase (no API key)
app.get('/quotes', async (_req, res) => {
  try {
    const [btc, eth] = await Promise.all([
      //fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC', { timeout: 5000 }).then(r => r.json()),
      //fetch('https://api.coinbase.com/v2/exchange-rates?currency=ETH', { timeout: 5000 }).then(r => r.json())
    ]);
    const bitcoin_usd  = Number(btc?.data?.rates?.USD)  || null;
    const ethereum_usd = Number(eth?.data?.rates?.USD) || null;
    if (bitcoin_usd == null || ethereum_usd == null) throw new Error('missing USD quotes');
    res.json({ bitcoin_usd, ethereum_usd });
  } catch (e) {
    console.error('Quotes error:', e.message);
    res.status(502).json({ error: 'price feed unavailable' });
  }
});

// Leads (POST/GET)
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

// Home
app.get('/', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));

module.exports = app;
