# Bogey Banter

The ultimate social golf tournament app.

## First upload

Upload these files to the root of the `bogey-banter-app` GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `firebase-config.js`
- `manifest.json`
- `service-worker.js`

Keep `firestore.rules` for Firebase setup.

## Firebase Rules

In Firebase:

1. Open Firestore Database.
2. Open the Rules tab.
3. Replace the existing rules with the contents of `firestore.rules`.
4. Tap Publish.

These are testing rules for authenticated anonymous users. Tighten them before a public release.

## GitHub Pages

In the new GitHub repository:

1. Open Settings.
2. Open Pages.
3. Source: Deploy from a branch.
4. Branch: main.
5. Folder: /(root).
6. Save.

The site will appear at:

`https://dennism2431.github.io/bogey-banter-app/`

## First live test

1. Open the site on the admin phone.
2. Create a tournament.
3. Open the QR tab.
4. Scan Team 2 using a second phone.
5. Register Team 2.
6. Confirm the admin lobby updates live.
7. Register every selected team.
8. Start the tournament.

## Current live features

- Reusable tournaments
- 2–12 teams
- Real QR codes
- Unique team names
- Live Firebase lobby
- One chaos-card draw per team per hole
- Paired-team score entry
- Opponent card notification
- Admin score approval
- Hole locking
- Beer & Bump stops after every third hole
- Team-ready confirmations
- Live cumulative leaderboard
- Story of the Day
- Locked end-of-day award ballots
- Admin award tally
- Regeneratable team QR codes
- Printable QR sheet
- PWA shell and basic offline app files

## Planned polish

- Illustrated Bogey Banter branding
- Full demo tutorial
- Event templates and archive
- PDF tournament report
- Animated award presentation
- Team photographs
- Custom chaos decks
