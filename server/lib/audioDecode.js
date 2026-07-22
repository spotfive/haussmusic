// Shared by every audio-ML feature (lyric sync, genre classification): both
// want raw PCM float32 samples at 16kHz mono, and ffmpeg decodes whatever
// format the track was uploaded as (mp3, m4a, wav...) into that regardless
// of which model consumes it next.
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

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

module.exports = { decodeAudioToPcm };
