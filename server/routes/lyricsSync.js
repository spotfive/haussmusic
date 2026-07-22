const path = require('path');
const fs = require('fs');
const express = require('express');
const { requireAuth } = require('../auth');
const { UPLOADS_DIR } = require('./upload');
const { runInWorker } = require('../lib/mlWorker');

const router = express.Router();

function uploadFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/uploads\/([^/?#]+)/);
  return match ? match[1] : null;
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { audio_url, lines } = req.body || {};
    const filename = uploadFilenameFromUrl(audio_url);
    if (!filename) return res.status(400).json({ error: 'audio_url inválido' });
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'Nenhum verso para sincronizar' });

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo de áudio não encontrado' });

    const synced = await runInWorker('lyricsSyncWorker.js', { filePath, lines });
    res.json({ lines: synced });
  } catch (err) { next(err); }
});

module.exports = router;
