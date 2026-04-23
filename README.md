# Eye Roll News

A news app where you skip stories by rolling your eyes. **Pure frontend** — no server, no account, no database. Everything runs in the browser.

## Stack

- Next.js 14 App Router, configured for static export (`output: "export"`)
- TypeScript + Tailwind
- MediaPipe FaceLandmarker for in-browser eye tracking
- Hacker News public JSON API (no key, hit directly from the browser)
- `localStorage` for per-device roll counts and history
- `<canvas>` for the session-end share PNG

## Pages

- `/` — camera permission gate
- `/feed` — mobile feed, one HN story per screen
- `/session-end` — your count for this session, all-time total, personal top-3, share card
- `/desktop` — split-screen with live camera debug view and threshold slider

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # produces the static `out/` directory
```

`npm run build` writes a fully static site to `out/`. Drop it on any static host — GitHub Pages, Netlify, Cloudflare Pages, Vercel, S3. No env vars, no runtime.

## Detection

MediaPipe's `eyeLookUpLeft` + `eyeLookUpRight` blendshapes are averaged into a single signal. A roll is a spike above threshold (default `0.5`) that drops back below 60% of threshold within 150–1000ms. 1.5s debounce prevents double-counts. Sustained upward looks (>1.5s elevated) reset without counting.

## Persistence

Nothing leaves the device. `lib/roll-store.ts` keeps:
- `byArticle` — rolls per HN story id
- `byDay` — total rolls per calendar day
- `history` — last 200 rolled stories (used for the personal leaderboard)

Clearing site data resets everything.

## No backend?

Right — no API routes, no database, no cron. The feed calls `hacker-news.firebaseio.com/v0/topstories.json` directly from the browser (it has CORS enabled — despite the hostname, there's no Firebase SDK or account involved). Counts are per-device only; the "every roll counts, globally" framing from the build doc is out of scope for this version.
