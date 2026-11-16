# LifeTrack (Phone + PC PWA)

Daily tracker for scoops, meals, workouts, supplements, water, skincare, study, and notes.

- **Phone:** installable PWA (Add to Home Screen)
- **PC:** same site, wider dashboard layout
- **Sync:** one sync code links phone ↔ PC

## Run (with sync)

```bash
cd daily-life-tracker
npm install
npm run serve
```

Open `http://localhost:4173` on your PC and phone (same Wi‑Fi / hosted URL).

## Sync setup

1. On **phone**, open Sync → **Create Code** (e.g. `K7Q2M9`)
2. On **PC**, enter that code → **Join Code**
3. Checks sync every few seconds while both use the same server URL

Data also saves locally on each device (works offline; syncs when back online).

## Install on phone

Must be HTTPS (or localhost):

- **iPhone (Safari):** Share → Add to Home Screen  
- **Android (Chrome):** Install app / Add to Home Screen  

## Deploy (permanent — PC can stay off)

Needs the Node server so `/api/sync` works. **Render free tier** is the easiest.

### Render (recommended)

1. Push this folder to a GitHub repo
2. Go to [https://render.com](https://render.com) → sign up free (GitHub login is fine)
3. **New** → **Blueprint** (uses `render.yaml`) **or** **Web Service**
4. If Web Service manually:
   - Build: `npm ci && npm run build`
   - Start: `npm start`
   - Health check: `/api/health`
5. After deploy, open your `https://….onrender.com` URL on phone + PC
6. Create a sync code on one device, join on the other
7. Phone: Safari/Chrome → Add to Home Screen

Free Render apps may sleep after idle; first open can take ~30s, then sync works again.

### Other hosts

Railway / Fly.io / any Node host:

- `npm run build && npm start`
- Port: `PORT` env (Render/Railway set this automatically)

Static-only hosts (plain Netlify/GitHub Pages) run the UI but **not** sync.
