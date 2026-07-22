// Self-hosted database for HAUSS MUSIC: a single SQLite file on disk.
// No external database service — this is the whole point of this backend.
// Uses Node's built-in node:sqlite (Node 22.5+), so there's no native
// module to compile — works the same on Windows, Docker, any VPS.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new DatabaseSync(path.join(DATA_DIR, 'hauss.db'));
sqlite.exec('PRAGMA journal_mode = WAL');

// Thin shim so the rest of this file can keep the better-sqlite3-style
// db.prepare(sql).run/get/all(...params) call shape.
const db = {
  exec: (sql) => sqlite.exec(sql),
  prepare: (sql) => {
    const stmt = sqlite.prepare(sql);
    return {
      run: (...params) => stmt.run(...params),
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
    };
  },
};

db.exec(`
  create table if not exists users (
    id text primary key,
    email text unique not null,
    username text unique,
    password_hash text,
    google_id text,
    display_name text,
    full_name text,
    profile_picture text,
    profile_banner text,
    bio text,
    user_type text not null default '["ouvinte"]',
    role text not null default 'user',
    verified integer not null default 0,
    profile_completed integer not null default 0,
    managed_artists text not null default '[]',
    representatives text not null default '[]',
    social_links text not null default '{}',
    created_date text not null,
    updated_date text not null
  );

  create table if not exists songs (
    id text primary key,
    title text not null,
    artist text not null,
    featuring text,
    album text,
    type text default 'single',
    cover_url text,
    background_video_url text,
    audio_url text,
    duration real,
    genre text,
    lyrics text default '[]',
    plays real not null default 0,
    likes real not null default 0,
    is_favorite integer not null default 0,
    rating real not null default 0,
    rating_count real not null default 0,
    artist_id text,
    label_id text,
    label_name text,
    label_logo text,
    published_by_label integer not null default 0,
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists posts (
    id text primary key,
    title text not null,
    artist text not null,
    artist_id text,
    artist_email text,
    featuring text,
    description text,
    cover_url text,
    background_video_url text,
    type text not null default 'single',
    genre text,
    release_date text,
    tracks text not null default '[]',
    status text not null default 'draft',
    is_featured integer not null default 0,
    is_scheduled integer not null default 0,
    scheduled_datetime text,
    label_id text,
    label_name text,
    label_logo text,
    published_by_label integer not null default 0,
    likes real not null default 0,
    plays real not null default 0,
    rating real not null default 0,
    rating_count real not null default 0,
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists playlists (
    id text primary key,
    name text not null,
    description text,
    cover_url text,
    song_ids text not null default '[]',
    is_public integer not null default 1,
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists banners (
    id text primary key,
    title text not null,
    description text,
    image_url text not null,
    artist_name text not null,
    release_date text,
    link_url text,
    button_text text,
    category text,
    duration_seconds real not null default 7,
    is_active integer not null default 1,
    priority real not null default 0,
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists labels (
    id text primary key,
    name text not null,
    profile_picture text,
    representatives text not null default '[]',
    managed_artists text not null default '[]',
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists artists (
    id text primary key,
    user_id text,
    display_name text,
    email text,
    profile_picture text,
    verified integer not null default 0,
    user_type text not null default 'artista',
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists follows (
    id text primary key,
    following_id text not null,
    following_name text,
    created_by text,
    created_date text not null,
    updated_date text
  );

  create table if not exists ratings (
    id text primary key,
    item_id text not null,
    item_type text not null,
    rating real not null,
    comment text,
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists user_favorites (
    id text primary key,
    item_id text not null,
    item_type text not null,
    created_by text,
    created_date text not null,
    updated_date text
  );

  create table if not exists app_settings (
    id text primary key,
    key text not null unique,
    value text,
    created_by text,
    created_date text not null,
    updated_date text not null
  );

  create table if not exists auto_playlists (
    id text primary key,
    name text not null,
    subtitle text,
    cover_url text,
    song_ids text not null default '[]',
    genre_summary text,
    created_date text not null,
    updated_date text not null
  );
`);

// Lightweight migration: add columns that got introduced after a table
// already existed on disk. "create table if not exists" above only
// applies to brand-new databases, so older ones need this too.
for (const [table, column, definition] of [
  ['artists', 'created_by', 'text'],
  ['app_settings', 'created_by', 'text'],
  ['follows', 'updated_date', 'text'],
  ['user_favorites', 'updated_date', 'text'],
  ['songs', 'likes', 'real not null default 0'],
  ['songs', 'credits', "text default '[]'"],
  ['banners', 'button_text', 'text'],
  ['banners', 'category', 'text'],
  ['banners', 'duration_seconds', 'real not null default 7'],
  ['songs', 'detected_genre', 'text'],
]) {
  const cols = db.prepare(`pragma table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

// Migration: resync songs.likes / is_favorite from user_favorites — the
// real per-user source of truth. An earlier version of this migration set
// likes=1 for already-favorited songs without creating a matching
// user_favorites row, leaving those songs with a phantom like nobody
// could ever unlike (toggling looks for a user_favorites row to decide
// whether to remove one). Recomputing from user_favorites on every
// startup is idempotent and self-healing: it undoes that phantom count
// and keeps likes accurate even if a client update ever drifts.
db.exec(`
  update songs
  set likes = (select count(*) from user_favorites uf where uf.item_id = songs.id and uf.item_type = 'song'),
      is_favorite = case when (select count(*) from user_favorites uf where uf.item_id = songs.id and uf.item_type = 'song') > 0 then 1 else 0 end;
`);

// Migration: user_type used to be a single string column (e.g. "gravadora").
// It's now a JSON array (people can hold more than one cargo at once) —
// wrap any leftover plain-string values so existing accounts keep their
// cargo instead of losing it. Safe to run on every startup: once a value
// starts with "[" this no longer matches it.
db.exec(`
  update users
  set user_type = '["' || replace(user_type, '"', '') || '"]'
  where user_type is not null and user_type != '' and substr(user_type, 1, 1) != '[';
`);

// table -> columns that can hold a plain uploads URL (this server's own
// /uploads/<file>, never a third-party URL). Shared with fileCleanup.js so
// there's one list of "where uploaded file URLs can live" to keep in sync.
const FILE_FIELDS_BY_TABLE = {
  users: ['profile_picture', 'profile_banner'],
  songs: ['cover_url', 'background_video_url', 'audio_url'],
  posts: ['cover_url', 'background_video_url'],
  banners: ['image_url'],
  labels: ['profile_picture'],
  artists: ['profile_picture'],
  auto_playlists: ['cover_url'],
};

// Migration: PUBLIC_URL was misconfigured as http:// instead of https:// for
// a while, so uploads made during that window have an insecure URL baked
// into the database — the browser then flags the (https) site as "not
// fully secure" because it's loading http:// images/video as mixed
// content. This server is only ever reachable over https in production
// (Railway/Vercel both terminate TLS at the edge), so it's always safe to
// upgrade a stored own-upload URL from http to https.
for (const [table, columns] of Object.entries(FILE_FIELDS_BY_TABLE)) {
  for (const column of columns) {
    db.exec(`update ${table} set ${column} = 'https://' || substr(${column}, 8) where ${column} like 'http://%'`);
  }
}
db.exec(`update posts set tracks = replace(tracks, 'http://', 'https://') where tracks like '%http://%'`);

// entity name (as used by the frontend) -> { table, json: [...], bool: [...] }
const ENTITIES = {
  User: { table: 'users', json: ['managed_artists', 'representatives', 'social_links', 'user_type'], bool: ['verified', 'profile_completed'] },
  Song: { table: 'songs', json: ['lyrics', 'credits'], bool: ['is_favorite', 'published_by_label'] },
  Post: { table: 'posts', json: ['tracks'], bool: ['is_featured', 'is_scheduled', 'published_by_label'] },
  Playlist: { table: 'playlists', json: ['song_ids'], bool: ['is_public'] },
  Banner: { table: 'banners', json: [], bool: ['is_active'] },
  Label: { table: 'labels', json: ['representatives', 'managed_artists'], bool: [] },
  Artist: { table: 'artists', json: [], bool: ['verified'] },
  Follow: { table: 'follows', json: [], bool: [] },
  Rating: { table: 'ratings', json: [], bool: [] },
  UserFavorite: { table: 'user_favorites', json: [], bool: [] },
  AppSettings: { table: 'app_settings', json: [], bool: [] },
  AutoPlaylist: { table: 'auto_playlists', json: ['song_ids'], bool: [] },
};

function getEntityConfig(name) {
  const config = ENTITIES[name];
  if (!config) {
    const err = new Error(`Unknown entity "${name}"`);
    err.status = 404;
    throw err;
  }
  return config;
}

// SQLite has no bool/json/array types: serialize going in, parse coming out.
function serializeRow(config, data) {
  const row = { ...data };
  for (const key of config.json) {
    if (key in row) row[key] = JSON.stringify(row[key] ?? (Array.isArray(row[key]) ? [] : {}));
  }
  for (const key of config.bool) {
    if (key in row) row[key] = row[key] ? 1 : 0;
  }
  return row;
}

function deserializeRow(config, row) {
  if (!row) return row;
  const out = { ...row };
  for (const key of config.json) {
    if (key in out) {
      try { out[key] = JSON.parse(out[key]); } catch { out[key] = Array.isArray(out[key]) ? [] : {}; }
    }
  }
  for (const key of config.bool) {
    if (key in out) out[key] = !!out[key];
  }
  return out;
}

module.exports = { db, ENTITIES, getEntityConfig, serializeRow, deserializeRow, FILE_FIELDS_BY_TABLE };
