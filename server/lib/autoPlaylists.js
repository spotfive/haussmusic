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

// A "collection" needs at least 2 songs to mean anything, but otherwise
// this uses whatever a genre actually has — no artificial minimum blocking
// a small catalog from getting any playlists at all.
const MIN_SONGS_PER_PLAYLIST = 2;
const MAX_SONGS_PER_PLAYLIST = 16;
const MAX_TOTAL_PLAYLISTS = 12;

const GENRE_LABELS_PT = {
  blues: 'blues', classical: 'clássico', country: 'country', disco: 'disco',
  hiphop: 'hip-hop', jazz: 'jazz', metal: 'metal', pop: 'pop', reggae: 'reggae', rock: 'rock',
};

// Splits a genre's songs into playlist-sized, non-overlapping chunks —
// every song lands in exactly one playlist, never duplicated across
// several. Sorted once by engagement first so the strongest songs open the
// first chunk instead of landing wherever they happen to fall.
function partitionSongs(songs) {
  const sorted = [...songs].sort((a, b) => ((b.plays || 0) + (b.likes || 0) * 2) - ((a.plays || 0) + (a.likes || 0) * 2));
  const chunks = [];
  for (let i = 0; i < sorted.length; i += MAX_SONGS_PER_PLAYLIST) {
    chunks.push(sorted.slice(i, i + MAX_SONGS_PER_PLAYLIST));
  }
  // A tiny leftover chunk (e.g. 1 song) reads as an afterthought — fold it
  // into the previous chunk instead of giving it its own thin playlist.
  if (chunks.length > 1 && chunks[chunks.length - 1].length < MIN_SONGS_PER_PLAYLIST) {
    chunks[chunks.length - 2].push(...chunks.pop());
  }
  return chunks;
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
    // A big genre becomes several non-overlapping playlists (partitioned,
    // not resampled) instead of one giant list or several copies of the
    // same songs reordered.
    const chunks = partitionSongs(genreSongs);
    for (let i = 0; i < chunks.length; i++) {
      if (clusters.length >= MAX_TOTAL_PLAYLISTS) break outer;
      clusters.push({ genre, part: i + 1, totalParts: chunks.length, songs: chunks[i] });
    }
  }

  const newRows = [];
  for (const cluster of clusters) {
    const genreLabel = GENRE_LABELS_PT[cluster.genre] || cluster.genre;
    const sampleSongs = cluster.songs.slice(0, 5).map((s) => ({ title: s.title, artist: s.artist }));
    const flavor = cluster.totalParts > 1 ? `parte ${cluster.part} de ${cluster.totalParts}` : null;

    let name = null, subtitle = '';
    try {
      const generated = await generatePlaylistName({ genre: flavor ? `${genreLabel} (${flavor})` : genreLabel, sampleSongs });
      if (generated) { name = generated.name; subtitle = generated.subtitle; }
    } catch (err) {
      console.error('AI playlist naming failed:', err.message);
    }
    if (!name) {
      name = genreLabel.charAt(0).toUpperCase() + genreLabel.slice(1) + (cluster.totalParts > 1 ? ` Vol. ${cluster.part}` : '');
      subtitle = 'selecionadas do acervo HAUSS';
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
    `AI names ${aiConfigured ? 'enabled' : 'DISABLED (set OPENAI_API_KEY — using plain genre names for now)'}, covers via free pollinations.ai.`
  );
  return newRows.length;
}

module.exports = { regenerateAutoPlaylists };
