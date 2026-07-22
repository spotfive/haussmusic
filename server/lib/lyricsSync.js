// Free/self-hosted lyric auto-sync: transcribes the track with Whisper
// (word-level timestamps) and aligns the artist's own typed lyric lines
// against that transcript, so each line inherits the timestamp of its
// first recognized word. Lines that can't be matched (ad-libs, backing
// vocals not written down, a bad transcription) are left with time: null —
// LyricsView already interpolates those from their timed neighbors, so a
// partial match is still useful, not a failure.
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MODEL_CACHE_DIR = path.join(DATA_DIR, 'model-cache');
fs.mkdirSync(MODEL_CACHE_DIR, { recursive: true });

// Loaded lazily, on first actual use — never at server startup. This is a
// native ONNX binary; if it fails to load on a given host, that failure
// should only break lyric sync, not boot of the whole app.
let transcriberPromise = null;
async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = MODEL_CACHE_DIR;
      return pipeline('automatic-speech-recognition', 'Xenova/whisper-base', { device: 'cpu' });
    })().catch((err) => {
      transcriberPromise = null; // let the next request retry instead of staying broken forever
      throw err;
    });
  }
  return transcriberPromise;
}

// Whisper wants raw PCM float32 samples at 16kHz mono; ffmpeg decodes
// whatever format the track was uploaded as (mp3, m4a, wav...) into that.
function decodeAudioToPcm(filePath) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, [
      '-i', filePath,
      '-f', 'f32le',
      '-ac', '1',
      '-ar', '16000',
      'pipe:1',
    ], { maxBuffer: 1024 * 1024 * 1024, encoding: 'buffer' }, (err, stdout) => {
      if (err) return reject(err);
      resolve(new Float32Array(stdout.buffer, stdout.byteOffset, stdout.length / Float32Array.BYTES_PER_ELEMENT));
    });
  });
}

function normalizeWord(w) {
  return (w || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents (á -> a, ç -> c, ...)
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '');
}

// Longest common subsequence between two normalized-word arrays. Returns
// matched index pairs [targetIdx, whisperIdx] in order — this is what lets
// a mismatched/missing word in either sequence get skipped instead of
// throwing every following line's alignment off.
function alignWords(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] && a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const pairs = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] && a[i - 1] === b[j - 1]) {
      pairs.push([i - 1, j - 1]);
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  pairs.reverse();
  return pairs;
}

// lines: array of plain-text strings (no [mm:ss] prefix). Returns
// [{ text, time }] — time is a number of seconds, or null when unmatched.
async function syncLyricsToAudio(filePath, lines) {
  const audio = await decodeAudioToPcm(filePath);
  const transcriber = await getTranscriber();
  // Hardcoded rather than auto-detected: this catalog is Brazilian
  // Portuguese, and language auto-detect on sung (not spoken) audio was
  // unreliable in testing — it silently fell back to English, which wrecks
  // alignment against Portuguese lyrics.
  const result = await transcriber(audio, { return_timestamps: 'word', chunk_length_s: 30, language: 'portuguese' });
  const whisperWords = (result.chunks || []).map((c) => ({
    norm: normalizeWord(c.text),
    time: Array.isArray(c.timestamp) ? c.timestamp[0] : null,
  }));

  const lineWordRanges = [];
  const targetWords = [];
  for (const line of lines) {
    const words = (line || '').split(/\s+/).filter(Boolean).map(normalizeWord).filter(Boolean);
    lineWordRanges.push([targetWords.length, targetWords.length + words.length]);
    targetWords.push(...words);
  }

  const pairs = alignWords(targetWords, whisperWords.map((w) => w.norm));
  const timeForTargetIdx = new Map();
  for (const [ti, wi] of pairs) {
    const t = whisperWords[wi]?.time;
    if (t != null && !timeForTargetIdx.has(ti)) timeForTargetIdx.set(ti, t);
  }

  return lines.map((text, li) => {
    const [start, end] = lineWordRanges[li];
    let time = null;
    for (let idx = start; idx < end; idx++) {
      if (timeForTargetIdx.has(idx)) { time = timeForTargetIdx.get(idx); break; }
    }
    return { text, time };
  });
}

module.exports = { syncLyricsToAudio };
