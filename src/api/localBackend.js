// Self-contained local backend for HAUSS MUSIC.
// Replaces the previous base44-hosted backend: everything (auth, entities,
// file uploads) is persisted in the browser's localStorage instead of a
// remote server. No network calls leave the browser.

const DB_PREFIX = 'hauss_db_';
const SESSION_KEY = 'hauss_session_user_id';
const SEED_FLAG_KEY = 'hauss_seeded_v1';

// Emails that always get the 'admin' role, on registration/login and
// retroactively if the account already existed with a different role.
const ADMIN_EMAILS = ['steffanbaum123@gmail.com'];
const isAdminEmail = (email) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());

const hasWindow = typeof window !== 'undefined';
const storage = hasWindow ? window.localStorage : null;

const genId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

function readTable(name) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(DB_PREFIX + name);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTable(name, rows) {
  if (!storage) return;
  storage.setItem(DB_PREFIX + name, JSON.stringify(rows));
}

// Promotes a user to admin (and persists it) if their email is on the
// admin allowlist but their stored role hasn't caught up yet.
function ensureAdminRole(user) {
  if (!user || !isAdminEmail(user.email) || user.role === 'admin') return user;
  const rows = readTable('User');
  const idx = rows.findIndex(u => u.id === user.id);
  if (idx === -1) return user;
  rows[idx] = { ...rows[idx], role: 'admin', updated_date: nowIso() };
  writeTable('User', rows);
  return rows[idx];
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function sortRows(rows, sort) {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (desc ? -1 : 1);
  });
}

// The current session's email, auto-stamped onto created_by like base44 used
// to do server-side — without this, "my releases/songs" queries (which
// filter by created_by === user.email) silently come back empty.
function currentUserEmail() {
  const uid = storage?.getItem(SESSION_KEY);
  if (!uid) return undefined;
  return readTable('User').find(u => u.id === uid)?.email;
}

function makeEntity(name) {
  return {
    async list(sort, limit) {
      const rows = sortRows(readTable(name), sort);
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    },
    // filter(query, limit) or filter(query, sort, limit)
    async filter(query = {}, sortOrLimit, maybeLimit) {
      const sort = typeof sortOrLimit === 'string' ? sortOrLimit : undefined;
      const limit = typeof sortOrLimit === 'number' ? sortOrLimit : maybeLimit;
      let rows = readTable(name).filter(row =>
        Object.entries(query).every(([key, value]) => row[key] === value)
      );
      rows = sortRows(rows, sort);
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    },
    async get(id) {
      const row = readTable(name).find(r => r.id === id);
      if (!row) {
        const err = new Error(`${name} with id ${id} not found`);
        err.status = 404;
        throw err;
      }
      return row;
    },
    async create(data) {
      const rows = readTable(name);
      const row = { id: genId(), created_date: nowIso(), updated_date: nowIso(), created_by: currentUserEmail(), ...data };
      rows.push(row);
      writeTable(name, rows);
      return row;
    },
    async bulkCreate(items) {
      const rows = readTable(name);
      const createdBy = currentUserEmail();
      const created = items.map(data => ({ id: genId(), created_date: nowIso(), updated_date: nowIso(), created_by: createdBy, ...data }));
      writeTable(name, [...rows, ...created]);
      return created;
    },
    async update(id, data) {
      const rows = readTable(name);
      const idx = rows.findIndex(r => r.id === id);
      if (idx === -1) {
        const err = new Error(`${name} with id ${id} not found`);
        err.status = 404;
        throw err;
      }
      rows[idx] = { ...rows[idx], ...data, updated_date: nowIso() };
      writeTable(name, rows);
      return rows[idx];
    },
    async delete(id) {
      writeTable(name, readTable(name).filter(r => r.id !== id));
      return { success: true };
    },
    subscribe() {
      // No realtime backend locally; return a no-op unsubscribe function.
      return () => {};
    },
  };
}

const entities = new Proxy({}, {
  get: (_target, name) => makeEntity(String(name)),
});

const auth = {
  async me() {
    const uid = storage?.getItem(SESSION_KEY);
    if (!uid) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const user = readTable('User').find(u => u.id === uid);
    if (!user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    return ensureAdminRole(user);
  },
  async updateMe(data) {
    const uid = storage?.getItem(SESSION_KEY);
    if (!uid) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const rows = readTable('User');
    const idx = rows.findIndex(u => u.id === uid);
    if (idx === -1) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    rows[idx] = { ...rows[idx], ...data, updated_date: nowIso() };
    writeTable('User', rows);
    return rows[idx];
  },
  logout(redirectUrlOrFlag) {
    storage?.removeItem(SESSION_KEY);
    if (redirectUrlOrFlag && hasWindow) {
      window.location.href = '/AuthPage';
    }
  },
  redirectToLogin() {
    if (hasWindow) window.location.href = '/AuthPage';
  },
  // profile decoded from a Google "Sign in with Google" ID token: { sub, email, name, picture }
  async loginWithGoogle(profile) {
    if (!profile?.email) {
      const err = new Error('Google profile missing email');
      throw err;
    }
    const userRows = readTable('User');
    let user = userRows.find(u => u.email?.toLowerCase() === profile.email.toLowerCase());

    if (!user) {
      user = {
        id: genId(),
        created_date: nowIso(),
        updated_date: nowIso(),
        email: profile.email,
        full_name: profile.name || profile.email.split('@')[0],
        display_name: profile.name || profile.email.split('@')[0],
        profile_picture: profile.picture || '',
        bio: '',
        user_type: 'ouvinte',
        role: isAdminEmail(profile.email) || userRows.length === 0 ? 'admin' : 'user',
        profile_completed: true,
        verified: false,
        managed_artists: [],
        google_id: profile.sub,
      };
      writeTable('User', [...userRows, user]);
    } else if (profile.picture && !user.profile_picture) {
      user = { ...user, profile_picture: profile.picture, updated_date: nowIso() };
      writeTable('User', userRows.map(u => (u.id === user.id ? user : u)));
    }

    user = ensureAdminRole(user);
    storage?.setItem(SESSION_KEY, user.id);
    return user;
  },
};

async function handleRegister({ email, password, username, display_name }) {
  if (!email || !password) return { error: 'Email e senha são obrigatórios' };
  if (password.length < 6) return { error: 'Senha deve ter no mínimo 6 caracteres' };

  const credentials = readTable('UserCredential');
  if (credentials.some(c => c.email?.toLowerCase() === email.toLowerCase())) {
    return { error: 'Email já cadastrado' };
  }
  if (username && credentials.some(c => c.username?.toLowerCase() === username.toLowerCase())) {
    return { error: 'Nome de usuário já existe' };
  }

  const password_hash = await sha256Hex(password);
  const userRows = readTable('User');
  const newUser = {
    id: genId(),
    created_date: nowIso(),
    updated_date: nowIso(),
    email,
    full_name: display_name || email.split('@')[0],
    display_name: display_name || username || email.split('@')[0],
    profile_picture: '',
    bio: '',
    user_type: 'ouvinte',
    role: isAdminEmail(email) || userRows.length === 0 ? 'admin' : 'user',
    profile_completed: false,
    verified: false,
    managed_artists: [],
  };
  writeTable('User', [...userRows, newUser]);

  const newCredential = {
    id: genId(),
    created_date: nowIso(),
    updated_date: nowIso(),
    user_id: newUser.id,
    email: email.toLowerCase(),
    username: username?.toLowerCase() || null,
    password_hash,
  };
  writeTable('UserCredential', [...credentials, newCredential]);

  return { success: true, message: 'Usuário cadastrado com sucesso', user_id: newUser.id };
}

async function handleLogin({ login, password }) {
  if (!login || !password) return { error: 'Login e senha são obrigatórios' };

  const password_hash = await sha256Hex(password);
  const credential = readTable('UserCredential').find(c =>
    c.email?.toLowerCase() === login.toLowerCase() || c.username?.toLowerCase() === login.toLowerCase()
  );
  if (!credential) return { error: 'Usuário não encontrado' };
  if (credential.password_hash !== password_hash) return { error: 'Senha incorreta' };

  let user = readTable('User').find(u => u.id === credential.user_id);
  if (!user) return { error: 'Usuário não encontrado' };
  user = ensureAdminRole(user);

  storage?.setItem(SESSION_KEY, user.id);
  return { success: true, user };
}

const functions = {
  async invoke(name, payload) {
    if (name === 'auth/register') return { data: await handleRegister(payload || {}) };
    if (name === 'auth/login') return { data: await handleLogin(payload || {}) };
    return { data: { error: `Function "${name}" is not available offline` } };
  },
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const integrations = {
  Core: {
    async UploadFile({ file }) {
      // No remote storage locally: encode the file as a data URL so it
      // keeps working (and persists) purely in the browser.
      const file_url = await readFileAsDataUrl(file);
      return { file_url };
    },
  },
};

const appLogs = {
  async logUserInApp() {
    // No-op: there is no server to log activity to.
  },
};

export const localBackend = { auth, entities, functions, integrations, appLogs };

// ===== Demo data seed (first run only) =====
export function seedDemoData() {
  if (!storage || storage.getItem(SEED_FLAG_KEY)) return;

  const demoArtistUser = {
    id: genId(),
    created_date: nowIso(),
    updated_date: nowIso(),
    email: 'artista@hauss.music',
    full_name: 'Nova Onda',
    display_name: 'Nova Onda',
    profile_picture: '',
    bio: 'Produtor e artista residente da HAUSS MUSIC.',
    user_type: 'artista',
    role: 'user',
    profile_completed: true,
    verified: true,
    managed_artists: [],
  };
  writeTable('User', [demoArtistUser]);

  const songs = [
    { title: 'Metal Noturno', artist: 'Nova Onda', album: 'Prata', type: 'single', genre: 'electronic', duration: 214, plays: 4820, rating: 4.6, rating_count: 38, cover_url: '', audio_url: '' },
    { title: 'Reflexo', artist: 'Nova Onda', album: 'Prata', type: 'single', genre: 'pop', duration: 198, plays: 3110, rating: 4.3, rating_count: 21, cover_url: '', audio_url: '' },
    { title: 'Aço Frio', artist: 'Cinza Claro', album: 'Aço Frio', type: 'ep', genre: 'hip-hop', duration: 176, plays: 2210, rating: 4.1, rating_count: 15, cover_url: '', audio_url: '' },
  ];
  writeTable('Song', songs.map(data => ({ id: genId(), created_date: nowIso(), updated_date: nowIso(), ...data })));

  const banners = [
    { title: 'Novo single: Metal Noturno', description: 'Ouça agora o novo lançamento.', image_url: '', artist_name: 'Nova Onda', is_active: true, priority: 1 },
  ];
  writeTable('Banner', banners.map(data => ({ id: genId(), created_date: nowIso(), updated_date: nowIso(), ...data })));

  writeTable('AppSettings', [
    { id: genId(), created_date: nowIso(), updated_date: nowIso(), key: 'app_name', value: 'HAUSS MUSIC' },
  ]);

  storage.setItem(SEED_FLAG_KEY, 'true');
}
