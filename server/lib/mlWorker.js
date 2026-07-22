// Runs a CPU-heavy ML task (Whisper transcription, audio classification —
// anything going through onnxruntime-node) in a separate child process.
//
// The native ONNX binding blocks Node's single event loop for the entire
// duration of inference, not just the JS thread doing the awaiting — a
// production incident confirmed this directly: the whole server went
// unresponsive (502s to every visitor, not just the one request waiting on
// lyric sync) for the several minutes a genre-classification pass took.
// Isolating the work in its own process means it can block *itself* freely
// without ever touching the main server's ability to answer HTTP requests.
const { fork } = require('child_process');
const path = require('path');

function runInWorker(workerScript, payload, { timeoutMs = 10 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = fork(path.join(__dirname, 'workers', workerScript), [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error('ML worker timed out'));
    }, timeoutMs);

    child.on('message', (msg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (msg?.error) reject(new Error(msg.error));
      else resolve(msg?.result);
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on('exit', (code) => {
      if (settled) return;
      if (code !== 0) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`ML worker exited with code ${code}`));
      }
    });

    child.send(payload);
  });
}

module.exports = { runInWorker };
