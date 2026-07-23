// Real backend for HAUSS MUSIC talking to your own self-hosted server
// (see /server) — a plain Express + SQLite API you run yourself, no
// third-party database vendor involved. Used automatically once
// VITE_API_URL is set; otherwise base44Client.js falls back to Supabase
// or the localStorage-only stand-in.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'hauss_api_token';

export const isApiConfigured = !!API_URL;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function makeEntity(entityName) {
  const base = `/api/entities/${entityName}`;
  return {
    async list(sort, limit) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (typeof limit === 'number') params.set('limit', String(limit));
      return request(`${base}?${params.toString()}`);
    },
    async filter(query = {}, sortOrLimit, maybeLimit) {
      const sort = typeof sortOrLimit === 'string' ? sortOrLimit : undefined;
      const limit = typeof sortOrLimit === 'number' ? sortOrLimit : maybeLimit;
      const params = new URLSearchParams(query);
      if (sort) params.set('sort', sort);
      if (typeof limit === 'number') params.set('limit', String(limit));
      return request(`${base}?${params.toString()}`);
    },
    async get(id) {
      return request(`${base}/${id}`);
    },
    async create(data) {
      return request(base, { method: 'POST', body: data });
    },
    async bulkCreate(items) {
      return request(`${base}/bulk`, { method: 'POST', body: items });
    },
    async update(id, data) {
      return request(`${base}/${id}`, { method: 'PUT', body: data });
    },
    async delete(id) {
      return request(`${base}/${id}`, { method: 'DELETE' });
    },
    subscribe() {
      // No realtime transport in the self-hosted server (yet) — no-op,
      // same as the local backend.
      return () => {};
    },
  };
}

const entities = new Proxy({}, {
  get: (_target, name) => makeEntity(String(name)),
});

const auth = {
  async me() {
    return request('/api/auth/me');
  },
  async updateMe(patch) {
    return request('/api/auth/me', { method: 'PUT', body: patch });
  },
  logout(redirectUrlOrFlag) {
    setToken(null);
    if (redirectUrlOrFlag) window.location.href = '/AuthPage';
  },
  redirectToLogin() {
    window.location.href = '/AuthPage';
  },
  async loginWithGoogle(profile) {
    const { token, user } = await request('/api/auth/google', { method: 'POST', body: { idToken: profile.idToken } });
    setToken(token);
    return user;
  },
};

const functions = {
  async invoke(name, payload) {
    if (name === 'auth/register') {
      const data = await request('/api/auth/register', { method: 'POST', body: payload });
      return { data };
    }
    if (name === 'auth/login') {
      const data = await request('/api/auth/login', { method: 'POST', body: payload });
      if (data?.success && data.token) setToken(data.token);
      return { data };
    }
    return { data: { error: `Function "${name}" is not available` } };
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const form = new FormData();
      form.append('file', file);
      return request('/api/upload', { method: 'POST', body: form, isForm: true });
    },
    // Transcribes the track and aligns each given lyric line to it —
    // can take a minute or more, there's nothing to poll, the caller just
    // awaits it.
    async SyncLyrics({ audio_url, lines }) {
      return request('/api/lyrics-sync', { method: 'POST', body: { audio_url, lines } });
    },
  },
};

const appLogs = {
  async logUserInApp() {
    // No activity log table (yet) — safe no-op, same as the other backends.
  },
};

export const apiBackend = { auth, entities, functions, integrations, appLogs };
