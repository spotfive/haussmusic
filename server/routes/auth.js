const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { db, getEntityConfig, serializeRow, deserializeRow } = require('../db');
const { signToken, requireAuth } = require('../auth');

const router = express.Router();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'steffanbaum123@gmail.com')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const userConfig = () => getEntityConfig('User');
const nowIso = () => new Date().toISOString();

function userCount() {
  return db.prepare('select count(*) as n from users').get().n;
}

function findUserByEmail(email) {
  return db.prepare('select * from users where lower(email) = lower(?)').get(email);
}

function findUserByUsername(username) {
  return db.prepare('select * from users where lower(username) = lower(?)').get(username);
}

function insertUser(fields) {
  const config = userConfig();
  const base = {
    id: uuidv4(),
    profile_picture: '',
    profile_banner: '',
    bio: '',
    user_type: ['ouvinte'],
    role: 'user',
    verified: false,
    profile_completed: false,
    managed_artists: [],
    representatives: [],
    social_links: {},
    created_date: nowIso(),
    updated_date: nowIso(),
    ...fields,
  };
  const row = serializeRow(config, base);
  const columns = Object.keys(row);
  db.prepare(`insert into users (${columns.join(',')}) values (${columns.map(() => '?').join(',')})`)
    .run(...columns.map((c) => row[c]));
  return deserializeRow(config, db.prepare('select * from users where id = ?').get(base.id));
}

router.post('/register', async (req, res) => {
  const { email, password, username, display_name } = req.body || {};
  if (!email || !password) return res.json({ error: 'Email e senha são obrigatórios' });
  if (password.length < 6) return res.json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  if (findUserByEmail(email)) return res.json({ error: 'Email já cadastrado' });
  if (username && findUserByUsername(username)) return res.json({ error: 'Nome de usuário já existe' });

  const password_hash = await bcrypt.hash(password, 10);
  const isFirst = userCount() === 0;
  const isAdmin = isFirst || ADMIN_EMAILS.includes(email.toLowerCase());
  const name = display_name || username || email.split('@')[0];

  const user = insertUser({
    email,
    username: username?.toLowerCase() || null,
    password_hash,
    display_name: name,
    full_name: name,
    role: isAdmin ? 'admin' : 'user',
  });

  res.json({ success: true, message: 'Usuário cadastrado com sucesso', user_id: user.id });
});

router.post('/login', async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.json({ error: 'Login e senha são obrigatórios' });

  const user = login.includes('@') ? findUserByEmail(login) : findUserByUsername(login);
  if (!user || !user.password_hash) return res.json({ error: 'Usuário não encontrado' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.json({ error: 'Senha incorreta' });

  const token = signToken(user.id);
  const { password_hash, ...safeUser } = deserializeRow(userConfig(), user);
  res.json({ success: true, token, user: safeUser });
});

router.post('/google', async (req, res) => {
  if (!googleClient) return res.status(500).json({ error: 'Google login not configured on the server (missing GOOGLE_CLIENT_ID)' });
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  let user = findUserByEmail(payload.email);
  if (!user) {
    const isFirst = userCount() === 0;
    const isAdmin = isFirst || ADMIN_EMAILS.includes(payload.email.toLowerCase());
    user = insertUser({
      email: payload.email,
      google_id: payload.sub,
      display_name: payload.name || payload.email.split('@')[0],
      full_name: payload.name || payload.email.split('@')[0],
      profile_picture: payload.picture || '',
      profile_completed: true,
      role: isAdmin ? 'admin' : 'user',
    });
  } else if (!user.profile_picture && payload.picture) {
    db.prepare('update users set profile_picture = ?, updated_date = ? where id = ?').run(payload.picture, nowIso(), user.id);
    user = db.prepare('select * from users where id = ?').get(user.id);
  }

  const token = signToken(user.id);
  const { password_hash, ...safeUser } = deserializeRow(userConfig(), user);
  res.json({ token, user: safeUser });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('select * from users where id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const { password_hash, ...safeUser } = deserializeRow(userConfig(), user);
  res.json(safeUser);
});

router.put('/me', requireAuth, (req, res) => {
  const config = userConfig();
  const patch = serializeRow(config, req.body || {});
  delete patch.id;
  delete patch.password_hash;
  delete patch.email;
  const columns = Object.keys(patch);
  if (columns.length > 0) {
    patch.updated_date = nowIso();
    const setClause = [...columns, 'updated_date'].map((c) => `${c} = ?`).join(', ');
    db.prepare(`update users set ${setClause} where id = ?`).run(...columns.map((c) => patch[c]), patch.updated_date, req.userId);
  }
  const user = db.prepare('select * from users where id = ?').get(req.userId);
  const { password_hash, ...safeUser } = deserializeRow(config, user);
  res.json(safeUser);
});

module.exports = router;
