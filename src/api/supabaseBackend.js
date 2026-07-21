// Real backend for HAUSS MUSIC, backed by Supabase (Postgres + Auth + Storage).
// Only used once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set — see
// supabase/schema.sql for the schema this expects, and .env.example for
// where to get the keys. Falls back to the local (localStorage) backend
// otherwise — see base44Client.js.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// base44 entity names -> Postgres table names.
const TABLE_MAP = {
  User: 'profiles',
  Song: 'songs',
  Post: 'posts',
  Playlist: 'playlists',
  Banner: 'banners',
  Label: 'labels',
  Artist: 'artists',
  Follow: 'follows',
  Rating: 'ratings',
  UserFavorite: 'user_favorites',
  AppSettings: 'app_settings',
};

function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const column = desc ? sort.slice(1) : sort;
  return query.order(column, { ascending: !desc });
}

async function currentUserEmail() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email;
}

function makeEntity(entityName) {
  const table = TABLE_MAP[entityName] || entityName.toLowerCase();

  return {
    async list(sort, limit) {
      let query = supabase.from(table).select('*');
      query = applySort(query, sort);
      if (typeof limit === 'number') query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    // filter(query, limit) or filter(query, sort, limit) — both call shapes are used around the app
    async filter(matchQuery = {}, sortOrLimit, maybeLimit) {
      const sort = typeof sortOrLimit === 'string' ? sortOrLimit : undefined;
      const limit = typeof sortOrLimit === 'number' ? sortOrLimit : maybeLimit;
      let query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(matchQuery)) query = query.eq(key, value);
      query = applySort(query, sort);
      if (typeof limit === 'number') query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    async create(data) {
      const created_by = data.created_by ?? (await currentUserEmail());
      const { data: row, error } = await supabase.from(table).insert({ ...data, created_by }).select().single();
      if (error) throw error;
      return row;
    },
    async bulkCreate(items) {
      const created_by = await currentUserEmail();
      const payload = items.map((item) => ({ created_by, ...item }));
      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) throw error;
      return data;
    },
    async update(id, data) {
      const { data: row, error } = await supabase.from(table).update(data).eq('id', id).select().single();
      if (error) throw error;
      return row;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    subscribe(callback) {
      const channel = supabase
        .channel(`${table}-changes-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => callback?.(payload))
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

const entities = new Proxy({}, {
  get: (_target, name) => makeEntity(String(name)),
});

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    return fetchProfile(data.user.id);
  },
  async updateMe(patch) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const { data: row, error: updateError } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', data.user.id)
      .select()
      .single();
    if (updateError) throw updateError;
    return row;
  },
  async logout(redirectUrlOrFlag) {
    await supabase.auth.signOut();
    if (redirectUrlOrFlag) window.location.href = '/AuthPage';
  },
  redirectToLogin() {
    window.location.href = '/AuthPage';
  },
  // profile.idToken is the raw Google ID token (JWT) from GoogleSignInButton;
  // Supabase verifies it server-side and creates/reuses the matching account.
  async loginWithGoogle(profile) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: profile.idToken,
    });
    if (error) throw error;
    const userId = data.user.id;
    // Backfill picture/name on first Google login if the profile is still empty.
    const existing = await fetchProfile(userId);
    const patch = {};
    if (profile.picture && !existing.profile_picture) patch.profile_picture = profile.picture;
    if (profile.name && !existing.display_name) { patch.display_name = profile.name; patch.full_name = profile.name; }
    if (Object.keys(patch).length > 0) {
      const { data: updated, error: updateError } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
      if (!updateError) return updated;
    }
    return existing;
  },
};

async function handleRegister({ email, password, username, display_name }) {
  if (!email || !password) return { error: 'Email e senha são obrigatórios' };
  if (password.length < 6) return { error: 'Senha deve ter no mínimo 6 caracteres' };

  if (username) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle();
    if (existing) return { error: 'Nome de usuário já existe' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name, username: username?.toLowerCase() || null } },
  });
  if (error) return { error: error.message === 'User already registered' ? 'Email já cadastrado' : error.message };

  return { success: true, message: 'Usuário cadastrado com sucesso', user_id: data.user?.id };
}

async function handleLogin({ login, password }) {
  if (!login || !password) return { error: 'Login e senha são obrigatórios' };

  let email = login;
  if (!login.includes('@')) {
    const { data: profile } = await supabase.from('profiles').select('email').eq('username', login.toLowerCase()).maybeSingle();
    if (!profile) return { error: 'Usuário não encontrado' };
    email = profile.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Email/usuário ou senha incorretos' };

  const profile = await fetchProfile(data.user.id);
  return { success: true, user: profile };
}

const functions = {
  async invoke(name, payload) {
    if (name === 'auth/register') return { data: await handleRegister(payload || {}) };
    if (name === 'auth/login') return { data: await handleLogin(payload || {}) };
    return { data: { error: `Function "${name}" is not available` } };
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const path = `${crypto.randomUUID()}-${file.name}`.replace(/\s+/g, '_');
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      return { file_url: data.publicUrl };
    },
  },
};

const appLogs = {
  async logUserInApp() {
    // No activity log table (yet) — safe no-op, same as the local backend.
  },
};

export const supabaseBackend = { auth, entities, functions, integrations, appLogs };
