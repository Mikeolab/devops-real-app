// src/server.js (CommonJS)
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// Serve the React build output from client/dist
const clientDist = path.join(process.cwd(), 'client', 'dist');
app.use(express.static(clientDist, { maxAge: '1h', etag: true }));

// Health endpoint for CI/Render
app.get('/health', (_req, res) => res.status(200).send('ok'));

// SPA fallback: all other routes return index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
