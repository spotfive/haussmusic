// Deletes files from uploads/ once nothing in the database points at them
// anymore, so removing a song/banner/etc. (or replacing its cover/audio)
// doesn't leave the original file sitting on disk forever.
const path = require('path');
const fs = require('fs');
const { db, FILE_FIELDS_BY_TABLE } = require('./db');
const { UPLOADS_DIR } = require('./routes/upload');

// posts.tracks is a JSON array of { audio_url, ... } — those files need the
// same treatment but aren't a plain column.
function extractTrackUrls(row) {
  if (!row || row.tracks === undefined) return [];
  try {
    const tracks = typeof row.tracks === 'string' ? JSON.parse(row.tracks) : row.tracks;
    return (tracks || []).map((t) => t?.audio_url).filter(Boolean);
  } catch {
    return [];
  }
}

// Returns every uploads/-relative URL a (pre-update/pre-delete) row holds,
// for the given table.
function extractUploadUrls(row, table) {
  if (!row) return [];
  const columns = FILE_FIELDS_BY_TABLE[table] || [];
  const urls = columns.map((c) => row[c]).filter(Boolean);
  if (table === 'posts') urls.push(...extractTrackUrls(row));
  return urls;
}

function uploadFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/uploads\/([^/?#]+)/);
  return match ? match[1] : null;
}

function isFileReferencedElsewhere(filename) {
  const like = `%${filename}%`;
  for (const [table, columns] of Object.entries(FILE_FIELDS_BY_TABLE)) {
    for (const column of columns) {
      const row = db.prepare(`select id from ${table} where ${column} like ? limit 1`).get(like);
      if (row) return true;
    }
  }
  const trackRow = db.prepare(`select id from posts where tracks like ? limit 1`).get(like);
  if (trackRow) return true;
  return false;
}

function deleteUploadFile(filename) {
  fs.unlink(path.join(UPLOADS_DIR, filename), (err) => {
    if (err && err.code !== 'ENOENT') console.error(`Failed to delete upload ${filename}:`, err.message);
  });
}

// Call this AFTER the delete/update that stopped referencing `urls` has
// already been committed — that way "does anything else still use this
// file" naturally excludes the row being deleted/changed.
function cleanupOrphanedFiles(urls) {
  const filenames = [...new Set(urls.map(uploadFilenameFromUrl).filter(Boolean))];
  for (const filename of filenames) {
    if (!isFileReferencedElsewhere(filename)) deleteUploadFile(filename);
  }
}

module.exports = { extractUploadUrls, cleanupOrphanedFiles, FILE_FIELDS_BY_TABLE };
