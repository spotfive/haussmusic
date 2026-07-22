require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { attachUser } = require('./auth');
const { db } = require('./db');
const authRoutes = require('./routes/auth');
const entityRoutes = require('./routes/entities');
const { router: uploadRoutes, UPLOADS_DIR } = require('./routes/upload');
const lyricsSyncRoutes = require('./routes/lyricsSync');
const autoPlaylistRoutes = require('./routes/autoPlaylists');
const { regenerateAutoPlaylists } = require('./lib/autoPlaylists');

const app = express();
const PORT = process.env.PORT || 3001;
const ORIGIN = process.env.CORS_ORIGIN || '*';

// Railway (and most PaaS) terminate TLS at their edge and forward plain
// HTTP to this container, so without this Express always sees the
// connection as "http" — req.protocol ignores the X-Forwarded-Proto header
// unless the proxy in front of it is explicitly trusted. That's what was
// causing generated file URLs (in routes/upload.js) to come out as
// http://... on an https site, tripping the browser's mixed-content warning.
app.set('trust proxy', 1);

app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(attachUser);

app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/upload', uploadRoutes);
// Transcribing + aligning a full track can take well over a minute,
// especially the first call after a deploy (downloading the Whisper
// model). Node's default socket timeout would otherwise cut the response
// off mid-request.
app.use('/api/lyrics-sync', (req, res, next) => { req.setTimeout(5 * 60 * 1000); next(); }, lyricsSyncRoutes);
app.use('/api/auto-playlists', autoPlaylistRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`HAUSS MUSIC server listening on :${PORT}`);
});

// Every Monday 4am — regenerates the "Para o seu momento" collections from
// scratch (re-classifies any newly uploaded songs, re-clusters, new AI
// names/covers, old ones replaced). Runs in the background; nothing waits
// on it. Also runs once shortly after boot if nothing has ever been
// generated yet, so the feature isn't empty for up to a week on a fresh
// deploy — deliberately NOT run synchronously at startup, since a full
// catalog pass can take a long time and shouldn't delay the server
// listening for requests.
cron.schedule('0 4 * * 1', () => {
  regenerateAutoPlaylists().catch((err) => console.error('Weekly auto playlist regeneration failed:', err));
});

setTimeout(() => {
  const existing = db.prepare('select count(*) as n from auto_playlists').get();
  if (existing.n === 0) {
    regenerateAutoPlaylists().catch((err) => console.error('Initial auto playlist generation failed:', err));
  }
}, 15000);
