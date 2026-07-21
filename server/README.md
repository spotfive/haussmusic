# HAUSS MUSIC server

Your own backend: a small Express API backed by a single SQLite file
(`data/hauss.db`) and a local `uploads/` folder for cover art, banners and
audio. No third-party database company involved — this runs entirely on
whatever machine you point it at, and the data lives in files you control.

## Run it locally

```bash
cd server
cp .env.example .env      # then fill in JWT_SECRET at least
npm install
npm start
```

The API listens on `http://localhost:3001`. In the project root, set
`VITE_API_URL=http://localhost:3001` in `.env.local` and restart
`npm run dev` — the frontend now talks to this server instead of
localStorage/Supabase.

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Deploy it somewhere it stays online

This is a normal Node process + a `Dockerfile`, so it runs on anything that
runs Docker. A few options, roughly easiest first:

- **Railway / Render / Fly.io** — connect this `server/` folder (or the
  Dockerfile), add a persistent volume mounted at `/app/data` and
  `/app/uploads` (this is the part that matters — without it your data
  resets on every redeploy), set the environment variables from
  `.env.example`, deploy. All three have a free/trial tier.
- **Any VPS you already have** (or a cheap one — Hetzner, DigitalOcean,
  Oracle Cloud's free tier):
  ```bash
  git clone <your repo> && cd <repo>/server
  cp .env.example .env   # fill it in
  docker compose up -d --build
  ```
  Put a reverse proxy (Caddy or nginx) in front for HTTPS and your domain —
  Caddy is the least fiddly:
  ```
  api.yourdomain.com {
    reverse_proxy localhost:3001
  }
  ```

Either way, once it's reachable at some URL, set that as `VITE_API_URL` in
the frontend's `.env.local` (or as an environment variable in Vercel, if
that's where you're hosting the frontend) and redeploy the frontend.

## Notes

- `role` and `password_hash` on the `User` entity can only be changed by an
  admin — every other entity write requires being logged in, and
  update/delete requires owning the row (`created_by`) or being admin.
  Banners, Labels, Artists and AppSettings are admin-only end to end.
- The very first person to ever register becomes admin automatically, and
  `ADMIN_EMAILS` in `.env` always gets admin regardless of order — same
  behavior as the local/Supabase backends.
- Back up `data/hauss.db` and `uploads/` (or your Docker volumes) — that's
  your entire database and every uploaded file.
