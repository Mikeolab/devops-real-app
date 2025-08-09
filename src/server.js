// src/server.js
const app = require('./app'); // <- app.js exports the app itself
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on :${PORT}`);
});
