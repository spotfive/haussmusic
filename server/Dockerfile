FROM node:24-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data /app/uploads
VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3001
CMD ["node", "index.js"]
