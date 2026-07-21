FROM node:24-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data /app/uploads

# No VOLUME instruction here on purpose: Railway's builder rejects it.
# Persistent storage for /app/data and /app/uploads is configured through
# Railway's own Volumes UI instead (Settings -> Volumes) — same effect,
# just done on their side rather than baked into the image. Plain
# docker-compose deployments still get persistence via docker-compose.yml.

EXPOSE 3001
CMD ["node", "index.js"]
