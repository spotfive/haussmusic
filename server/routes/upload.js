const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../auth');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

// Generous but not unbounded: 200MB covers cover art, banners and audio tracks.
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

const router = express.Router();

router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const publicBase = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ file_url: `${publicBase}/uploads/${req.file.filename}` });
});

module.exports = { router, UPLOADS_DIR };
