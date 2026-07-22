// Child process entry point for genre classification — see mlWorker.js for
// why this runs out-of-process at all. Talks back to the parent over IPC.
const { classifyGenre } = require('../audioGenre');

process.on('message', async (payload) => {
  try {
    const result = await classifyGenre(payload.filePath);
    process.send({ result });
  } catch (err) {
    process.send({ error: err.message });
  }
});
