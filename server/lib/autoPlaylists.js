// Weekly auto-curated playlists: groups songs by their real, audio-detected
// genre (server/lib/audioGenre.js), gives each cluster an AI name/cover
// (server/lib/aiCreative.js), and replaces whatever was there before. Meant
// to be called from a weekly cron (server/index.js) and from the admin
// "regenerate now" route — never from a request path a user is waiting on,
// since a full catalog pass can take a long time.
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { UPLOADS_DIR } = require('../routes/upload');
const { runInWorker } = require('./mlWorker');
const { generatePlaylistName, generatePlaylistCover, isConfigured: aiConfigured } = require('./aiCreative');
const { cleanupOrphanedFiles, extractUploadUrls } = require('../fileCleanup');

const MIN_SONGS_PER_PLAYLIST = 4;
const MAX_SONGS_PER_PLAYLIST = 24;
const MAX_TOTAL_PLAYLISTS = 12;

const GENRE_LABELS_PT = {
  blues: 'blues', classical: 'clássico', country: 'country', disco: 'disco',
  hiphop: 'hip-hop', jazz: 'jazz', metal: 'metal', pop: 'pop', reggae: 'reggae', rock: 'rock',
};

const VARIANTS = [
  { sort: 'plays', flavor: 'as músicas mais tocadas' },
  { sort: 'newest', flavor: 'as descobertas mais recentes' },
  { sort: 'shuffle', flavor: 'uma mistura variada' },
];

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed % 233280 || 1;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortSongs(songs, sort, seed) {
  const arr = [...songs];
  if (sort === 'plays') { arr.sort((a, b) => (b.plays || 0) - (a.plays || 0)); return arr; }
  if (sort === 'newest') { arr.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); return arr; }
  return seededShuffle(arr, seed);
}

function uploadFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/uploads\/([^/?#]+)/);
  return match ? match[1] : null;
}

async function ensureGenreDetected(song) {
  const filename = uploadFilenameFromUrl(song.audio_url);
  if (!filename) return null;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    const result = await runInWorker('genreWorker.js', { filePath });
    const genre = result?.genre || null;
    if (genre) db.prepare('update songs set detected_genre = ? where id = ?').run(genre, song.id);
    return genre;
  } catch (err) {
    console.error(`Genre classification failed for song ${song.id}:`, err.message);
    return null;
  }
}

function saveCoverImage(buffer) {
  if (!process.env.PUBLIC_URL) {
    console.error('Auto playlists: PUBLIC_URL is not set, cannot build an absolute cover image URL from a cron job (no request to infer it from) — skipping cover.');
    return null;
  }
  const filename = `${uuidv4()}.png`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return `${process.env.PUBLIC_URL.replace(/\/$/, '')}/uploads/${filename}`;
}

async function regenerateAutoPlaylists() {
  const songs = db.prepare("select * from songs where audio_url is not null and audio_url != ''").all();

  for (const song of songs) {
    if (!song.detected_genre) {
      song.detected_genre = await ensureGenreDetected(song);
    }
  }

  const byGenre = new Map();
  for (const song of songs) {
    if (!song.detected_genre) continue;
    if (!byGenre.has(song.detected_genre)) byGenre.set(song.detected_genre, []);
    byGenre.get(song.detected_genre).push(song);
  }

  // Biggest clusters first, so a catalog too big to fit under the cap still
  // gets its most substantial genres represented.
  const genreEntries = [...byGenre.entries()]
    .filter(([, list]) => list.length >= MIN_SONGS_PER_PLAYLIST)
    .sort((a, b) => b[1].length - a[1].length);

  const clusters = [];
  outer:
  for (const [genre, genreSongs] of genreEntries) {
    // More songs in a genre earns it more variant playlists (top-played /
    // newest / shuffled mix) instead of piling everything into one, capped
    // so one huge genre can't crowd out every other one.
    const numVariants = Math.min(VARIANTS.length, Math.max(1, Math.floor(genreSongs.length / 6)));
    for (let i = 0; i < numVariants; i++) {
      if (clusters.length >= MAX_TOTAL_PLAYLISTS) break outer;
      const variant = VARIANTS[i];
      const seed = genre.length * 7919 + i * 104729 + genreSongs.length;
      const picked = sortSongs(genreSongs, variant.sort, seed).slice(0, MAX_SONGS_PER_PLAYLIST);
      clusters.push({ genre, variant, songs: picked });
    }
  }

  const newRows = [];
  for (const cluster of clusters) {
    const genreLabel = GENRE_LABELS_PT[cluster.genre] || cluster.genre;
    const sampleSongs = cluster.songs.slice(0, 5).map((s) => ({ title: s.title, artist: s.artist }));

    let name = null, subtitle = '';
    try {
      const generated = await generatePlaylistName({ genre: `${genreLabel} (${cluster.variant.flavor})`, sampleSongs });
      if (generated) { name = generated.name; subtitle = generated.subtitle; }
    } catch (err) {
      console.error('AI playlist naming failed:', err.message);
    }
    if (!name) {
      name = genreLabel.charAt(0).toUpperCase() + genreLabel.slice(1);
      subtitle = cluster.variant.flavor;
    }

    let coverUrl = '';
    try {
      const buffer = await generatePlaylistCover({ name, subtitle, genre: genreLabel });
      if (buffer) coverUrl = saveCoverImage(buffer) || '';
    } catch (err) {
      console.error('AI cover generation failed:', err.message);
    }

    newRows.push({
      id: uuidv4(),
      name,
      subtitle,
      cover_url: coverUrl,
      song_ids: cluster.songs.map((s) => s.id),
      genre_summary: cluster.genre,
    });
  }

  // Build the new set fully (including the slow AI calls above) before
  // touching what's already live, so a mid-run failure never leaves the
  // site with no auto playlists at all.
  const previous = db.prepare('select * from auto_playlists').all();
  db.prepare('delete from auto_playlists').run();
  const now = new Date().toISOString();
  for (const row of newRows) {
    db.prepare(`
      insert into auto_playlists (id, name, subtitle, cover_url, song_ids, genre_summary, created_date, updated_date)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, row.name, row.subtitle, row.cover_url, JSON.stringify(row.song_ids), row.genre_summary, now, now);
  }
  for (const old of previous) {
    cleanupOrphanedFiles(extractUploadUrls(old, 'auto_playlists'));
  }

  console.log(
    `Auto playlists regenerated: ${newRows.length} playlist(s) from ${songs.length} song(s). ` +
    `AI ${aiConfigured ? 'enabled' : 'DISABLED (set OPENAI_API_KEY for real names/covers — using plain genre names, no covers for now)'}.`
  );
  return newRows.length;
}

module.exports = { regenerateAutoPlaylists };
