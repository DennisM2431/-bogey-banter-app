# Bogey Banter v5.3 — Final Rebuild

This release makes the approved Concept 3 artwork and characters the permanent opening experience.

## Permanent Home / Splash Screen

- Shown whenever the normal app URL is opened or launched.
- Tap anywhere to continue.
- Deep links from team QR codes skip the splash and open the correct tournament slot immediately.
- The approved character artwork is stored unchanged at:
  `assets/splash-characters-approved.jpeg`
- Approved asset SHA-256:
  `3c1b814c8b755e18c26b4567b47f5d1f7d5f50005ccbeb540a498bb0e638ca04`

## Included Game Modes

- Singles: 2–4 players
- Shared-device Singles
- Live-device Singles
- 2-player Ambrose: up to 12 teams
- 4-player Ambrose: up to 6 teams

## Shared-device flow

1. Every player draws.
2. Each card stays visible until **Pass to Next Player** is pressed.
3. After all draws, every card appears together in the Draw screen gallery.
4. Score entry starts only when **Begin Score Entry** is pressed.
5. The leaderboard opens after all scores are confirmed.

## Reliability Improvements

- New v5.3 service-worker cache with automatic old-cache removal.
- Network-first app HTML to reduce stale GitHub Pages versions.
- Local QR generator remains bundled in the repository.
- Deep-link QR joining bypasses the splash.
- Reduced-motion support.
- Better touch feedback and screen transitions.
- Non-blocking connection error notifications.
- Approved splash artwork cached for offline reopening.

## Upload

Upload every file and the complete `assets` folder to the repository root.

Required:
- `index.html`
- `styles.css`
- `app.js`
- `firebase-config.js`
- `manifest.json`
- `service-worker.js`
- `qrcode-local.js`
- `assets/splash-characters-approved.jpeg`
- `README.md`

After GitHub Pages deploys, fully close the old Home Screen app or Safari tab and reopen it.
