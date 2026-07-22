const express = require('express');
const { requireAuth } = require('../auth');
const { db } = require('../db');
const { regenerateAutoPlaylists } = require('../lib/autoPlaylists');

const router = express.Router();

let running = false;

router.post('/regenerate', requireAuth, async (req, res, next) => {
  try {
    const me = db.prepare('select role from users where id = ?').get(req.userId);
    if (me?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    if (running) return res.status(409).json({ error: 'Já está gerando — aguarde terminar' });

    running = true;
    regenerateAutoPlaylists()
      .catch((err) => console.error('Auto playlist regeneration failed:', err))
      .finally(() => { running = false; });

    res.json({ success: true, message: 'Geração iniciada em segundo plano — pode levar vários minutos' });
  } catch (err) { next(err); }
});

module.exports = router;
