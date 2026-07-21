require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { attachUser } = require('./auth');
const authRoutes = require('./routes/auth');
const entityRoutes = require('./routes/entities');
const { router: uploadRoutes, UPLOADS_DIR } = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;
const ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(attachUser);

app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/upload', uploadRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`HAUSS MUSIC server listening on :${PORT}`);
});
