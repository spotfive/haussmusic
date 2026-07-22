// Classifies a track's real sound (not the artist-typed genre field) using
// a small audio model fine-tuned on GTZAN — the standard 10-genre music
// dataset (blues, classical, country, disco, hiphop, jazz, metal, pop,
// reggae, rock). This is the "listen to the audio" signal the weekly
// auto-playlist curation clusters songs by.
const path = require('path');
const fs = require('fs');
const { decodeAudioToPcm } = require('./audioDecode');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MODEL_CACHE_DIR = path.join(DATA_DIR, 'model-cache');
fs.mkdirSync(MODEL_CACHE_DIR, { recursive: true });

// Loaded lazily, on first actual use — same reasoning as lyricsSync.js:
// a broken native ONNX binary on some host should only break this one
// feature, not server boot.
let classifierPromise = null;
async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = MODEL_CACHE_DIR;
      return pipeline('audio-classification', 'onnx-community/Musical-genres-Classification-Hubert-V1-ONNX', { device: 'cpu' });
    })().catch((err) => {
      classifierPromise = null;
      throw err;
    });
  }
  return classifierPromise;
}

// Returns the top predicted genre label (e.g. "pop", "hiphop") and its
// confidence score.
async function classifyGenre(filePath) {
  const audio = await decodeAudioToPcm(filePath);
  const classifier = await getClassifier();
  const result = await classifier(audio);
  const top = result?.[0];
  return top ? { genre: top.label, score: top.score } : null;
}

module.exports = { classifyGenre };
