# IT1A — BSIT · DORSU Section Website

The official (and slightly unhinged) website of section IT1A: activities, dumb moments, pictures, officers, and the full student roster — all manageable from a built-in admin console.

Purple cyber-tech theme. Node.js + Express backend. Supabase database & image storage. Deployable on Render.

## Pages

| Route | What it is |
|---|---|
| `/` | Home — hero, latest activities & dumb moments, about |
| `/pictures` | Photo gallery with albums + lightbox |
| `/officers` | Officer cards |
| `/students` | Searchable student roster |
| `/adin` | Admin access terminal (password) |
| `/adin/dashboard` | Admin console — manage everything |

## 1. Supabase setup (one-time)

1. Open your Supabase project → **SQL Editor**
2. Paste the entire contents of [`schema.sql`](schema.sql) → **Run**
   - Creates tables: `settings`, `officers`, `students`, `photos`, `posts`
   - Creates the public `media` storage bucket
   - Seeds default site settings
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `service_role` secret key (**never** expose this client-side or commit it)

## 2. Run locally

```bash
npm install
copy .env.example .env   # then edit .env with your real values
npm start
```

`.env`:

```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ADMIN_PASSWORD=your-secret-password
SESSION_SECRET=some-long-random-string
```

Open http://localhost:3000 — admin at http://localhost:3000/adin

## 3. Deploy on Render

1. Push this repo to GitHub (already done if you followed the setup)
2. Render dashboard → **New → Web Service** → connect the repo
3. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. **Environment → Add** the same four variables from your `.env`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`
5. Deploy. Done.

A [`render.yaml`](render.yaml) blueprint is included if you prefer **New → Blueprint**.

## Admin console (`/adin`)

- **Activities** — post activities and dumb moments with optional cover image
- **Pictures** — upload photos into albums, delete anytime
- **Officers** — add/edit officers with photos, quotes, ordering
- **Students** — roster with photos and nicknames
- **Settings** — site title, tagline, hero text, about section

## Stack

- Node.js + Express + EJS
- Supabase (Postgres + Storage)
- Vanilla JS, no frontend framework
- Multer for uploads → streamed into Supabase Storage
