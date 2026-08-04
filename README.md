# Bogey Banter Commercial Rebuild v6.0

This is a new modular application rather than another patch to the legacy 1,300-line `app.js`.

## Architecture

- `src/main.js` — application controller and screen components
- `src/store.js` — central application state
- `src/firebase-service.js` — live Firebase persistence
- `src/demo-service.js` — fully local Demo Mode
- `src/config.js` — cards, awards and team names
- `src/utils.js` — shared utilities

## Demo Mode

Demo Mode is enabled and does not require Firebase or QR codes.

It includes:
- Four example players
- Shared-device card drawing
- Persistent card reveal after each draw
- All-card gallery
- Score entry
- Leaderboard
- Story of the Day
- Awards
- Admin screens

## Live Modes

- Singles — shared device or live devices
- 2-Man Ambrose — live devices
- 4-Man Ambrose — live devices
- QR joining
- Paired scoring
- Admin approvals
- Story and awards

## Approved artwork

The approved character image is included unchanged:

`assets/splash-characters-approved.jpeg`

SHA-256: `3c1b814c8b755e18c26b4567b47f5d1f7d5f50005ccbeb540a498bb0e638ca04`

## Upload

Upload every file and folder from this ZIP to the repository root.

The `src` and `assets` folders are required.
