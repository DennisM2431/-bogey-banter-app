# Bogey Banter v5.1.1 — Neon Edition

Concept 3 is now the official interface.

## Upload to GitHub

Replace/upload these files together:

- index.html
- styles.css
- app.js
- firebase-config.js
- manifest.json
- service-worker.js
- qrcode-local.js
- README.md

## Included

### Tournament formats
- Singles: 2–4 players
- 2-player Ambrose: up to 12 teams
- 4-player Ambrose: up to 6 teams

### Play styles
- Live devices using QR codes and Firebase
- Singles shared-device mode using one phone

### Shared-device Singles flow
1. Choose Singles.
2. Choose Shared device.
3. Enter 2–4 player names.
4. The app starts immediately without QR codes.
5. The current player draws their chaos card.
6. Pass the phone to the next player, who enters the previous player's score.
7. The app automatically rotates through all players.
8. After everyone scores, view the leaderboard and start the next hole.

### Other features
- Local bundled QR generator
- Floating admin score notifications
- Sound alerts, supported vibration and badges
- Score submission lock
- Admin approve/reject workflow
- Beer & Bump every third hole
- Readable neon chaos cards
- Live leaderboard
- Story of the Day
- Award voting

## Important

After uploading, wait for GitHub Pages and fully close/reopen the app.
Create a new tournament to test Shared-device Singles.


## v5.1.1 Fixes

- Fixed the Draw Card button in Shared-device Singles.
- The draw now saves against the current player rather than a missing QR team slot.
- Added a Drawing… state and visible error message if Firebase rejects a draw.
- Fixed shared-device award ballots to save against the current player.
- Added rarity-coloured Neon cards:
  - Green: Advantage
  - Orange: Rare
  - Purple: Epic
  - Gold: Legendary
- Updated the draw layout to more closely match Concept 3.

The original Concept 3 image was a visual mockup rather than a screenshot of working code.
v5.1.1 brings the implemented screens closer to that direction while retaining the real
Firebase, QR, scoring and shared-device workflows.
