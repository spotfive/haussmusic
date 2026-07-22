FROM node:24-bookworm-slim

# Switched off node:24-alpine: the lyric auto-sync feature (server/lib/lyricsSync.js)
# needs onnxruntime-node's native binary to run the Whisper model, and that
# binary is built against glibc — it can't load on Alpine's musl libc at
# all. This is the standard fix for that class of native-addon
# incompatibility, not a workaround specific to this one dependency.
# libgomp1 is onnxruntime's OpenMP runtime, not present in the slim base
# by default.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# npm ci (not install) so the native onnxruntime-node binary Railway builds
# with is exactly what was tested locally, not whatever a fresh semver
# resolve happens to pick.
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/data /app/uploads

# No VOLUME instruction here on purpose: Railway's builder rejects it.
# Persistent storage for /app/data and /app/uploads is configured through
# Railway's own Volumes UI instead (Settings -> Volumes) — same effect,
# just done on their side rather than baked into the image. Plain
# docker-compose deployments still get persistence via docker-compose.yml.

EXPOSE 3001
CMD ["node", "index.js"]
