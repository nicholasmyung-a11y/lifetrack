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

## Deploy

Needs the Node server (not static-only hosting) so `/api/sync` works:

- Railway / Render / Fly.io / any Node host
- Start command: `npm run serve` (or `npm run build && npm start`)
- Port: `PORT` env or `4173`

Static hosts (plain Netlify/GitHub Pages) will run the UI but **not** cross-device sync unless you add a separate sync API.
