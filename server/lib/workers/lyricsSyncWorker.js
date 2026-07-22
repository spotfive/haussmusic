// Child process entry point for lyric sync — see mlWorker.js for why this
// runs out-of-process at all. Talks back to the parent over IPC.
const { syncLyricsToAudio } = require('../lyricsSync');

process.on('message', async (payload) => {
  try {
    const result = await syncLyricsToAudio(payload.filePath, payload.lines);
    process.send({ result });
  } catch (err) {
    process.send({ error: err.message });
  }
});
