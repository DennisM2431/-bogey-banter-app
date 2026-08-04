import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot,
  collection, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[char]));

const TEAM_NAMES = [
  "The Bogey Boys","Fairway Fiends","Grip It & Sip It","The Tree Magnets",
  "Sandbaggers Anonymous","The Shank Redemption","Fore Play Specialists",
  "Beerway Bandits","Par-Tee Animals","Pin Seekers","Lost Ball Legends",
  "The Three-Putt Club"
];

const AWARDS = [
  "Beer Monster","Chaos King","Biggest Choke","Sand Specialist",
  "Tree Magnet","Best Banter","Court Jester","MVP"
];

const CHAOS_CARDS = [
  ["Putter Ban","Legendary","🚫","Your team loses both putters for the rest of the round. Use another club on every green."],
  ["Worst Ball Ambrose","Legendary","☠️","For this hole, your team must always play from the worst of your two shots."],
  ["Bag Swap","Legendary","🎒","Swap golf bags with your paired team for the entire hole."],
  ["Second-Best Shot","Epic","2️⃣","Reject your best shot and play from the second-best shot for the whole hole."],
  ["Five-Club Lockdown","Epic","🔒","Choose five clubs only. Both players are restricted to them for the next three holes."],
  ["Wrong-Handed Hole","Epic","🫲","Both players complete the entire hole opposite-handed."],
  ["No Putters","Epic","🥄","Both players must putt with wedges for the next two holes."],
  ["One Club Only","Rare","1️⃣","Choose one club now. Your team uses only that club until the ball is holed."],
  ["Opponent Controls Clubs","Rare","😈","Your paired team chooses every club your team uses on this hole."],
  ["No Tee Allowed","Rare","📍","Both tee shots must be hit directly from the ground."],
  ["Bunker Tax","Rare","🏖️","Each bunker visit adds one extra stroke to your submitted team score."],
  ["Four-Ball Tee Shot","Advantage","💥","Both players hit two tee shots. Choose the best of all four."],
  ["Mulligan Bank","Advantage","✨","Your team receives one free replay anywhere on this hole."],
  ["Foot Wedge","Advantage","👟","Move the chosen ball one club length, no closer to the hole."]
];

let user = null;
let lastAlertSignature = "";
let audioContext = null;
let eventCode = null;
let teamSlot = null;
let joinToken = null;
let sharedDeviceUrl = false;
let eventData = null;
let teams = [];
let isAdmin = false;
let unsubscribers = [];

let toastTimer = null;

function showToast(message, type = "info") {
  let toast = document.querySelector(".app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `app-toast ${type}`;
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function shouldSkipSplashForDeepLink() {
  const params = new URLSearchParams(location.search);
  return Boolean(params.get("event"));
}

function revealApplication() {
  const splash = $("#splashScreen");
  const shell = $(".app-shell");
  if (!splash || splash.classList.contains("is-closing")) return;

  splash.classList.add("is-closing");
  document.documentElement.classList.remove("splash-open");

  window.setTimeout(() => {
    splash.remove();
    shell?.classList.remove("app-shell--splash-locked");
    shell?.classList.add("app-ready");
    shell?.setAttribute("aria-hidden", "false");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, 360);
}

function initialiseSplash() {
  const splash = $("#splashScreen");
  const shell = $(".app-shell");
  if (!splash || !shell) return;

  if (shouldSkipSplashForDeepLink()) {
    splash.remove();
    shell.classList.remove("app-shell--splash-locked");
    shell.classList.add("app-ready");
    shell.setAttribute("aria-hidden", "false");
    return;
  }

  document.documentElement.classList.add("splash-open");
  const continueHandler = () => revealApplication();
  splash.addEventListener("click", continueHandler, { once: true });
  splash.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      continueHandler();
    }
  }, { once: true });
  splash.focus({ preventScroll: true });
}


function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function baseUrl() {
  return `${location.origin}${location.pathname}`;
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  eventCode = (params.get("event") || "").toUpperCase();
  teamSlot = Number(params.get("team")) || null;
  joinToken = params.get("token") || "";
  sharedDeviceUrl = params.get("shared") === "1";
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenId);
  });
}

async function ensureAuth() {
  if (!auth.currentUser) await signInAnonymously(auth);
  user = auth.currentUser;
  $("#connectionStatus").textContent = "Live connection ready";
  $("#connectionStatus").className = "connection-pill success";
}

function activeSlot() {
  if (eventData?.playStyle === "shared") {
    return eventData.sharedPhase === "scoring"
      ? Number(eventData.currentScoreSlot || 1)
      : Number(eventData.currentTurnSlot || 1);
  }
  return teamSlot;
}

function isSharedDevice() {
  return eventData?.playStyle === "shared" || sharedDeviceUrl;
}

function ownTeam() {
  return teams.find((team) => team.slot === activeSlot()) || null;
}

function pairedTeam() {
  const index = teams.findIndex((team) => team.slot === activeSlot());
  if (index < 0 || teams.length < 2) return null;
  return teams[(index + 1) % teams.length];
}

async function createTournament() {
  const code = randomCode();
  const count = Number($("#teamCount").value);
  const gameMode = $("#gameMode").value;
  const playStyle = $("#playStyle").value;
  const sharedSingles = gameMode === "singles" && playStyle === "shared";

  const sharedNames = [
    $("#sharedPlayer1")?.value.trim(),
    $("#sharedPlayer2")?.value.trim(),
    $("#sharedPlayer3")?.value.trim(),
    $("#sharedPlayer4")?.value.trim()
  ].slice(0, count);

  if (sharedSingles && sharedNames.some((name) => !name)) {
    return alert(`Enter all ${count} player names.`);
  }
  if (sharedSingles && new Set(sharedNames.map((name) => name.toLowerCase())).size !== sharedNames.length) {
    return alert("Each player needs a different name.");
  }

  const event = {
    name: $("#eventName").value.trim() || "Bogey Banter Tournament",
    theme: $("#theme").value,
    gameMode,
    playStyle,
    teamCount: count,
    holes: Number($("#holes").value),
    chaosMode: $("#chaosMode").value,
    beerStops: $("#beerStops").checked,
    hole: 1,
    status: sharedSingles ? "playing" : "lobby",
    currentTurnSlot: 1,
    currentScoreSlot: 1,
    sharedPhase: sharedSingles ? "drawing" : null,
    sharedRevealSlot: null,
    adminUid: user.uid,
    story: [sharedSingles
      ? `Shared-device Singles started with ${count} players.`
      : "Tournament created by Team 1."],
    awardsOpen: false,
    awardsFinalised: false,
    createdAt: serverTimestamp()
  };

  await setDoc(doc(db, "events", code), event);
  const batch = writeBatch(db);
  for (let slot = 1; slot <= count; slot += 1) {
    const sharedName = sharedSingles ? sharedNames[slot - 1] : "";
    batch.set(doc(db, "events", code, "teams", String(slot)), {
      slot,
      joinToken: randomCode(12),
      name: sharedName,
      players: gameMode === "singles"
        ? [sharedName]
        : (gameMode === "ambrose4" ? ["", "", "", ""] : ["", ""]),
      ownerUid: sharedSingles || slot === 1 ? user.uid : null,
      drawnHole: 0,
      card: null,
      scoreHole: 0,
      score: null,
      acceptedHole: 0,
      cumulativeScore: 0,
      readyBreakHole: 0,
      votesLocked: false,
      votes: {}
    });
  }
  await batch.commit();

  location.href = sharedSingles
    ? `${baseUrl()}?event=${code}&shared=1`
    : `${baseUrl()}?event=${code}&team=1`;
}

async function openManualTeam() {
  const code = $("#manualEventCode").value.trim().toUpperCase();
  const slot = Number($("#manualTeamSlot").value);
  const token = $("#manualTeamToken").value.trim();
  if (!code || !slot || !token) return alert("Enter the code, team number and team token.");
  location.href = `${baseUrl()}?event=${encodeURIComponent(code)}&team=${slot}&token=${encodeURIComponent(token)}`;
}

async function loadEvent() {
  if (!eventCode) return;
  const eventRef = doc(db, "events", eventCode);
  const snapshot = await getDoc(eventRef);
  if (!snapshot.exists()) {
    $("#connectionStatus").textContent = "Tournament not found";
    $("#connectionStatus").className = "connection-pill error";
    return;
  }

  eventData = { id: eventCode, ...snapshot.data() };
  isAdmin = eventData.adminUid === user.uid;
  $("#bottomNav").classList.remove("hidden");
  document.querySelector('[data-screen="qrScreen"]')?.classList.toggle("hidden", eventData.playStyle === "shared");
  document.querySelector('[data-screen="adminScreen"]')?.classList.toggle("hidden", eventData.playStyle === "shared");
  showScreen(eventData.playStyle === "shared" ? "drawScreen" : "lobbyScreen");

  unsubscribers.forEach((unsubscribe) => unsubscribe());
  unsubscribers = [
    onSnapshot(eventRef, (snap) => {
      eventData = { id: eventCode, ...snap.data() };
      renderAll();
    }),
    onSnapshot(collection(db, "events", eventCode, "teams"), (snap) => {
      teams = snap.docs.map((entry) => entry.data()).sort((a, b) => a.slot - b.slot);
      renderAll();
    })
  ];
}


function currentGameMode() {
  const mode = eventData?.gameMode;
  if (mode === "singles") return "singles";
  if (mode === "ambrose4") return "ambrose4";
  return "ambrose2";
}

function isSinglesMode() {
  return currentGameMode() === "singles";
}

function isFourPlayerAmbrose() {
  return currentGameMode() === "ambrose4";
}

function playersPerEntry() {
  if (isSinglesMode()) return 1;
  return isFourPlayerAmbrose() ? 4 : 2;
}

function competitorLabel(team) {
  if (!team) return "";
  if (isSinglesMode()) return team.players?.[0] || team.name || `Player ${team.slot}`;
  return team.name || `Team ${team.slot}`;
}

function competitorMembers(team) {
  if (!team) return "";
  if (isSinglesMode()) return team.players?.[0] || "Waiting for player";
  return team.players?.filter(Boolean).join(" & ") || `Waiting for ${playersPerEntry()} players`;
}

function competitorReady(team) {
  if (!team) return false;
  if (isSinglesMode()) return Boolean(team.players?.[0]);
  const required = playersPerEntry();
  return Boolean(
    team.name &&
    Array.isArray(team.players) &&
    team.players.length >= required &&
    team.players.slice(0, required).every(Boolean)
  );
}

function updateGameModeControls() {
  const mode = $("#gameMode").value;
  const style = $("#playStyle")?.value || "live";
  const countSelect = $("#teamCount");
  const current = Number(countSelect.value) || 4;
  countSelect.innerHTML = "";

  const max = mode === "singles" ? 4 : (mode === "ambrose4" ? 6 : 12);
  for (let count = 2; count <= max; count += 1) {
    countSelect.insertAdjacentHTML(
      "beforeend",
      `<option ${count === Math.min(current, max) ? "selected" : ""}>${count}</option>`
    );
  }

  $("#competitorCountLabel").childNodes[0].textContent =
    mode === "singles" ? "Number of players" : "Number of teams";

  const sharedSingles = mode === "singles" && style === "shared";
  $("#sharedPlayerSetup")?.classList.toggle("hidden", !sharedSingles);
  $("#createTournament").textContent = sharedSingles
    ? "Start shared-device round"
    : (style === "shared" ? "Create shared-device tournament" : "Create live tournament");
  updateSharedPlayerFieldVisibility();
}


function updateSharedPlayerFieldVisibility() {
  const count = Number($("#teamCount")?.value || 4);
  $("#sharedPlayer3Label")?.classList.toggle("hidden", count < 3);
  $("#sharedPlayer4Label")?.classList.toggle("hidden", count < 4);
}

function sharedNextSlot(current) {
  return current >= teams.length ? 1 : current + 1;
}

function renderAll() {
  if (!eventData) return;
  const registered = teams.filter(competitorReady).length;
  $("#eventStatus").textContent = `${eventData.name} • ${eventData.id}`;
  $("#metricHole").textContent = eventData.hole;
  $("#metricTeams").textContent = `${registered}/${eventData.teamCount}`;
  const modeLabel = isSinglesMode()
    ? "Singles"
    : (isFourPlayerAmbrose() ? "4-player Ambrose" : "2-player Ambrose");
  $("#metricMode").textContent = `${modeLabel} • ${eventData.playStyle === "shared" ? "Shared device" : eventData.status}`;
  const current = ownTeam();
  const sharedBanner = $("#sharedTurnBanner");
  if (sharedBanner) {
    sharedBanner.classList.toggle("hidden", !isSharedDevice() || !current);
    if (isSharedDevice() && current) {
      const phaseText = eventData.sharedPhase === "scoring" ? "ENTERING SCORE" : "DRAWING CARD";
      sharedBanner.innerHTML = `<span>${phaseText}</span><strong>${escapeHtml(competitorLabel(current))}</strong><small>Hole ${eventData.hole} • Pass the phone when prompted</small>`;
    }
  }

  renderRegistration();
  renderTeams();
  renderQrCodes();
  renderDraw();
  renderScoring();
  renderLeaderboard();
  renderStory();
  renderAwards();
  renderAdmin();
  renderAdminScoreBanner();
}

function renderRegistration() {
  const team = ownTeam();
  const canRegister = Boolean(team && eventData.status === "lobby" && !isSharedDevice());
  $("#teamRegistrationPanel").classList.toggle("hidden", !canRegister);
  if (!canRegister) return;

  const singles = isSinglesMode();
  const fourPlayer = isFourPlayerAmbrose();
  $("#teamRegistrationPanel").querySelector("h2").textContent =
    singles ? "Register player" : "Register your team";
  $("#teamNameLabel").classList.toggle("hidden", singles);
  $("#playerTwoLabel").classList.toggle("hidden", singles);
  $("#playerThreeLabel").classList.toggle("hidden", !fourPlayer);
  $("#playerFourLabel").classList.toggle("hidden", !fourPlayer);
  $("#playerOneLabel").childNodes[0].textContent = singles ? "Player name" : "Player 1";
  $("#saveTeam").textContent = singles ? "Save player" : "Save team";

  if (!singles) {
    const usedNames = teams.map((entry) => entry.name).filter(Boolean);
    $("#teamName").innerHTML = `<option value="">Choose a team name</option>` +
      TEAM_NAMES.map((name) => {
        const unavailable = usedNames.includes(name) && team.name !== name;
        return `<option ${unavailable ? "disabled" : ""} ${team.name === name ? "selected" : ""}>${escapeHtml(name)}${unavailable ? " 🔒" : ""}</option>`;
      }).join("");
  }

  $("#playerOne").value = team.players?.[0] || "";
  $("#playerTwo").value = singles ? "" : (team.players?.[1] || "");
  $("#playerThree").value = fourPlayer ? (team.players?.[2] || "") : "";
  $("#playerFour").value = fourPlayer ? (team.players?.[3] || "") : "";
}

function renderTeams() {
  $("#teamsList").innerHTML = teams.map((team) => {
    const ready = competitorReady(team);
    const prefix = isSinglesMode() ? `Player ${team.slot}` : `Team ${team.slot}`;
    return `<div class="team-row">
      <span class="team-status ${ready ? "ready" : ""}">${ready ? "Ready" : "Waiting"}</span>
      <strong>${prefix}: ${escapeHtml(ready ? competitorLabel(team) : "Unclaimed")}</strong><br>
      <small>${escapeHtml(competitorMembers(team))}</small>
    </div>`;
  }).join("");

  $("#startTournament").classList.toggle("hidden", !isAdmin || eventData.status !== "lobby");
}

async function saveTeam() {
  const team = ownTeam();
  if (!team) return;
  if (teamSlot !== 1 && joinToken !== team.joinToken) {
    return alert(`This ${isSinglesMode() ? "player" : "team"} link is invalid or has been regenerated.`);
  }

  const playerOne = $("#playerOne").value.trim();

  if (isSinglesMode()) {
    if (!playerOne) return alert("Enter the player's name.");
    if (teams.some((entry) =>
      entry.slot !== teamSlot &&
      entry.players?.[0]?.trim().toLowerCase() === playerOne.toLowerCase()
    )) {
      return alert("That player name has already been entered.");
    }

    await updateDoc(doc(db, "events", eventCode, "teams", String(teamSlot)), {
      name: playerOne,
      players: [playerOne],
      ownerUid: user.uid
    });
    return;
  }

  const name = $("#teamName").value;
  const playerTwo = $("#playerTwo").value.trim();
  const playerThree = $("#playerThree").value.trim();
  const playerFour = $("#playerFour").value.trim();
  const players = isFourPlayerAmbrose()
    ? [playerOne, playerTwo, playerThree, playerFour]
    : [playerOne, playerTwo];

  if (!name || players.some((player) => !player)) {
    return alert(`Complete the team name and all ${players.length} player names.`);
  }
  if (teams.some((entry) => entry.slot !== teamSlot && entry.name === name)) {
    return alert("That team name has already been chosen.");
  }

  await updateDoc(doc(db, "events", eventCode, "teams", String(teamSlot)), {
    name,
    players,
    ownerUid: user.uid
  });
}

async function startTournament() {
  if (teams.some((team) => !competitorReady(team))) {
    return alert(`Every ${isSinglesMode() ? "player" : "team"} must register before the tournament starts.`);
  }
  await updateDoc(doc(db, "events", eventCode), {
    status: "playing",
    story: [...(eventData.story || []), `Tournament started with ${teams.length} ${isSinglesMode() ? "players" : "teams"} in ${isSinglesMode() ? "Singles" : (isFourPlayerAmbrose() ? "4-player Ambrose" : "2-player Ambrose")} mode.`]
  });
}

async function renderQrCodes() {
  const grid = $("#qrGrid");
  grid.innerHTML = "";
  $("#regenerateCodes").classList.toggle("hidden", !isAdmin);
  $("#printQrSheet").classList.toggle("hidden", !isAdmin);

  if (isSharedDevice()) {
    grid.innerHTML = `<div class="callout">Shared-device mode does not need QR codes. Pass this phone between players.</div>`;
    return;
  }
  if (!isAdmin) {
    grid.innerHTML = `<p>Only the tournament admin can view or regenerate join QR codes.</p>`;
    return;
  }

  if (!window.BogeyBanterQR) {
    grid.innerHTML = `<div class="callout">QR generator failed to load. Refresh Bogey Banter.</div>`;
    return;
  }

  for (const team of teams) {
    const link = `${baseUrl()}?event=${encodeURIComponent(eventCode)}&team=${team.slot}&token=${encodeURIComponent(team.joinToken)}`;
    const slotLabel = isSinglesMode() ? `Player ${team.slot}` : `Team ${team.slot}`;
    const card = document.createElement("article");
    card.className = "qr-card";

    const qrImage = document.createElement("img");
    qrImage.className = "qr-image";
    qrImage.alt = `${slotLabel} join QR code`;
    qrImage.width = 260;
    qrImage.height = 260;
    qrImage.src = window.BogeyBanterQR.toDataUrl(link, {
      size: 260,
      margin: 4,
      dark: "#111111",
      light: "#ffffff"
    });

    const imageWrap = document.createElement("div");
    imageWrap.className = "qr-image-wrap";
    imageWrap.appendChild(qrImage);

    const title = document.createElement("strong");
    title.textContent = slotLabel;

    const subtitle = document.createElement("small");
    subtitle.textContent = competitorReady(team) ? competitorLabel(team) : "Unclaimed";

    card.append(imageWrap, title, subtitle);
    grid.appendChild(card);
  }
}


function sharedDrawnCardsForHole() {
  return teams.filter((entry) => entry.drawnHole === eventData.hole && entry.card);
}

function sharedAllCardsDrawn() {
  return teams.length > 0 && sharedDrawnCardsForHole().length === teams.length;
}

function renderSharedCardGallery() {
  const cards = sharedDrawnCardsForHole();
  return `<div class="shared-card-gallery">
    ${cards.map((entry) => `
      <article class="mini-chaos-card">
        <div class="mini-card-player">${escapeHtml(competitorLabel(entry))}</div>
        <div class="mini-card-title">
          <span>${escapeHtml(entry.card[2])}</span>
          <strong>${escapeHtml(entry.card[0])}</strong>
        </div>
        <p>${escapeHtml(entry.card[3])}</p>
        <small>${escapeHtml(entry.card[1])} • Hole ${eventData.hole}</small>
      </article>
    `).join("")}
  </div>`;
}

function renderDraw() {
  const box = $("#drawContent");
  const team = ownTeam();

  if (isSharedDevice() && eventData.sharedRevealSlot) {
    const revealed = teams.find((entry) => entry.slot === Number(eventData.sharedRevealSlot));

    if (!revealed || revealed.drawnHole !== eventData.hole || !revealed.card) {
      updateDoc(doc(db, "events", eventCode), { sharedRevealSlot: null });
    } else {
      const isLastReveal = sharedAllCardsDrawn();
      const next = teams.find((entry) => entry.slot === sharedNextSlot(revealed.slot));

      box.innerHTML = `<article class="content-card reveal-screen">
        <div class="reveal-kicker">${escapeHtml(competitorLabel(revealed))} drew</div>
        <div class="chaos-card reveal-card">
          <div>
            <div class="rarity">${escapeHtml(revealed.card[1])}</div>
            <div class="chaos-title-row">
              <span class="chaos-title-icon">${escapeHtml(revealed.card[2])}</span>
              <h2 class="chaos-title-text">${escapeHtml(revealed.card[0])}</h2>
            </div>
            <p>${escapeHtml(revealed.card[3])}</p>
          </div>
          <div>Bogey Banter • Hole ${eventData.hole}</div>
        </div>
        <button id="continueSharedDraw" class="neon-cta">
          ${isLastReveal ? "View all drawn cards" : `Pass to ${escapeHtml(competitorLabel(next))}`}
          <span>→</span>
        </button>
      </article>`;

      $("#continueSharedDraw")?.addEventListener("click", async () => {
        if (isLastReveal) {
          await updateDoc(doc(db, "events", eventCode), {
            sharedRevealSlot: null,
            sharedPhase: "cards-complete",
            currentTurnSlot: 1
          });
        } else {
          await updateDoc(doc(db, "events", eventCode), {
            sharedRevealSlot: null,
            currentTurnSlot: sharedNextSlot(revealed.slot)
          });
        }
        showScreen("drawScreen");
      });
      return;
    }
  }

  if (isSharedDevice() && eventData.sharedPhase === "cards-complete") {
    box.innerHTML = `<article class="content-card">
      <div class="section-heading">
        <div>
          <span class="section-kicker">ALL CARDS DRAWN</span>
          <h2>Hole ${eventData.hole} chaos cards</h2>
        </div>
        <span class="step-pill">READY</span>
      </div>
      ${renderSharedCardGallery()}
      <button id="beginSharedScoring" class="neon-cta">Begin score entry <span>→</span></button>
    </article>`;

    $("#beginSharedScoring")?.addEventListener("click", async () => {
      await updateDoc(doc(db, "events", eventCode), {
        sharedPhase: "scoring",
        currentScoreSlot: 1
      });
      showScreen("scoreScreen");
    });
    return;
  }

  if (isSharedDevice() && eventData.sharedPhase === "scoring") {
    const scoringPlayer = teams.find((entry) => entry.slot === Number(eventData.currentScoreSlot || 1));
    box.innerHTML = `<div class="content-card center">
      <div class="big-icon">✍️</div>
      <h2>All cards have been drawn</h2>
      <p>Now enter ${escapeHtml(competitorLabel(scoringPlayer))}'s score.</p>
      <button id="goToSharedScore" class="primary">Enter score</button>
    </div>`;
    $("#goToSharedScore")?.addEventListener("click", () => showScreen("scoreScreen"));
    return;
  }

  if (eventData.status === "lobby") {
    box.innerHTML = `<div class="content-card center"><div class="big-icon">🔒</div><h2>Waiting for admin</h2></div>`;
    return;
  }
  if (!team) {
    box.innerHTML = `<div class="content-card">Open the tournament using your team QR code.</div>`;
    return;
  }
  if (eventData.status === "break" && isSharedDevice()) {
    box.innerHTML = `<div class="panel center neon-break">
      <div class="big-icon">🍺</div>
      <h2>Beer &amp; Bump</h2>
      <p>No timer. Continue whenever everyone is ready.</p>
      <button id="sharedContinueBreak" class="primary">Start Hole ${eventData.hole + 1}</button>
    </div>`;
    $("#sharedContinueBreak")?.addEventListener("click", advanceToNextHole);
    return;
  }
  if (eventData.status === "break") {
    const ready = team.readyBreakHole === eventData.hole;
    box.innerHTML = `<div class="content-card center">
      <div class="big-icon">🍺</div>
      <h2>Beer &amp; Bump stop</h2>
      <p>No timer. Tap ready when your team is finished.</p>
      <button id="readyAfterBreak" class="${ready ? "success" : "primary"}" ${ready ? "disabled" : ""}>
        ${ready ? "Team ready ✓" : "We're ready"}
      </button>
    </div>`;
    $("#readyAfterBreak")?.addEventListener("click", () => updateDoc(
      doc(db, "events", eventCode, "teams", String(teamSlot)),
      { readyBreakHole: eventData.hole }
    ));
    return;
  }

  const drawn = team.drawnHole === eventData.hole;
  const rarityClass = drawn
    ? String(team.card?.[1] || "chaos").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : "ready";
  box.innerHTML = `<div class="panel draw-panel">
    <div class="chaos-card rarity-${rarityClass}">
      ${drawn ? `
        <div>
          <div class="rarity">${escapeHtml(team.card[1])}</div>
          <div class="chaos-title-row">
            <span class="chaos-title-icon">${escapeHtml(team.card[2])}</span>
            <h2 class="chaos-title-text">${escapeHtml(team.card[0])}</h2>
          </div>
          <p>${escapeHtml(team.card[3])}</p>
        </div>` : `
        <div>
          <div class="rarity">${isSharedDevice() ? `${escapeHtml(competitorLabel(team))}'s turn` : "One draw per competitor per hole"}</div>
          <h2 class="undrawn-title">Draw your chaos card</h2>
          <p>${isSharedDevice() ? "Draw the card, then pass the phone to the next player to enter this score." : "Your paired scorer sees it immediately."}</p>
        </div>`}
      <div>Bogey Banter • Hole ${eventData.hole}</div>
    </div>
    <div class="draw-action-bar">
      <span>${escapeHtml(competitorLabel(team))} • Hole ${eventData.hole}</span>
      <button id="drawCard" class="primary" ${drawn ? 'disabled style="opacity:.45"' : ""}>
        ${drawn ? "Card already drawn ✓" : "Draw card"}
      </button>
    </div>
  </div>`;

  $("#drawCard")?.addEventListener("click", async () => {
    const button = $("#drawCard");
    if (button) {
      button.disabled = true;
      button.textContent = "Drawing…";
      button.classList.add("drawing-card");
    }

    try {
      const card = CHAOS_CARDS[Math.floor(Math.random() * CHAOS_CARDS.length)];
      await updateDoc(doc(db, "events", eventCode, "teams", String(team.slot)), {
        drawnHole: eventData.hole,
        card
      });
      await updateDoc(doc(db, "events", eventCode), {
        story: [...(eventData.story || []), `Hole ${eventData.hole}: ${competitorLabel(team)} drew ${card[0]}.`]
      });

      if (isSharedDevice()) {
        const isLastDrawer = team.slot === teams.length;
        await updateDoc(doc(db, "events", eventCode), {
          sharedRevealSlot: team.slot,
          story: [
            ...(eventData.story || []),
            ...(isLastDrawer ? [`All Hole ${eventData.hole} chaos cards have been drawn.`] : [])
          ]
        });
        showScreen("drawScreen");
      }
    } catch (error) {
      console.error("Card draw failed:", error);
      alert(`The card could not be drawn: ${error.message}`);
      if (button) {
        button.disabled = false;
        button.textContent = "Draw card";
        button.classList.remove("drawing-card");
      }
    }
  });
}

function renderScoring() {
  const box = $("#scoreContent");
  const team = ownTeam();

  if (eventData.status !== "playing") {
    box.innerHTML = `<div class="content-card center"><div class="big-icon">🔒</div><h2>Scoring locked</h2></div>`;
    return;
  }

  if (isSharedDevice()) {
    if (eventData.sharedPhase !== "scoring") {
      const drawingPlayer = teams.find((entry) => entry.slot === Number(eventData.currentTurnSlot || 1));
      box.innerHTML = `<div class="content-card center">
        <div class="big-icon">🎴</div>
        <h2>Draw cards first</h2>
        <p>${escapeHtml(competitorLabel(drawingPlayer))} still needs to draw their card.</p>
        <button id="returnToDraw" class="primary">Return to draw</button>
      </div>`;
      $("#returnToDraw")?.addEventListener("click", () => showScreen("drawScreen"));
      return;
    }

    if (!team) {
      box.innerHTML = `<div class="content-card">No current player found.</div>`;
      return;
    }

    const alreadySubmitted = team.scoreHole === eventData.hole;
    const nextScorePlayer = teams.find((entry) => entry.slot === sharedNextSlot(team.slot));
    const isLastScorer = team.slot === teams.length;

    box.innerHTML = `<div class="panel shared-score-panel">
      <div class="turn-kicker">
        ${isLastScorer
          ? "FINAL SCORE FOR THIS HOLE"
          : `PASS THE PHONE TO ${escapeHtml(competitorLabel(nextScorePlayer))} AFTER CONFIRMING`}
      </div>
      <h2>Enter ${escapeHtml(competitorLabel(team))}'s score</h2>
      <div class="callout">
        <strong>${escapeHtml(team.card[2])} ${escapeHtml(team.card[0])}</strong><br>
        ${escapeHtml(team.card[3])}
      </div>
      <label>Total strokes
        <input id="sharedScore" type="number" min="1" max="30"
          value="${alreadySubmitted ? team.score ?? "" : ""}"
          ${alreadySubmitted ? "disabled" : ""}>
      </label>
      <button id="submitSharedScore"
        class="${alreadySubmitted ? "score-submitted-lock" : "primary"}"
        ${alreadySubmitted ? "disabled" : ""}>
        ${alreadySubmitted ? "Score confirmed ✓" : "Confirm score"}
      </button>
    </div>`;

    if (!alreadySubmitted) {
      $("#submitSharedScore").addEventListener("click", async () => {
        const score = Number($("#sharedScore").value);
        if (!score) return alert("Enter a valid score.");

        await updateDoc(doc(db, "events", eventCode, "teams", String(team.slot)), {
          scoreHole: eventData.hole,
          score,
          acceptedHole: eventData.hole,
          cumulativeScore: (team.cumulativeScore || 0) + score
        });

        if (isLastScorer) {
          await updateDoc(doc(db, "events", eventCode), {
            currentScoreSlot: 1,
            currentTurnSlot: 1,
            story: [...(eventData.story || []), `All Hole ${eventData.hole} scores confirmed.`]
          });
          showScreen("leaderboardScreen");
        } else {
          await updateDoc(doc(db, "events", eventCode), {
            currentScoreSlot: sharedNextSlot(team.slot)
          });
          showScreen("scoreScreen");
        }
      });
    }
    return;
  }

  const opponent = pairedTeam();
  if (!team || !opponent) {
    box.innerHTML = `<div class="content-card">Join a registered team to score.</div>`;
    return;
  }

  const opponentLabel = competitorLabel(opponent);
  const cardNotice = opponent.drawnHole === eventData.hole
    ? `<div class="callout"><strong>${escapeHtml(opponentLabel)} drew ${escapeHtml(opponent.card[2])} ${escapeHtml(opponent.card[0])}</strong><br>${escapeHtml(opponent.card[3])}</div>`
    : `<div class="callout">Waiting for ${escapeHtml(opponentLabel)} to draw their card.</div>`;

  const alreadySubmitted = opponent.scoreHole === eventData.hole;
  const existingScore = alreadySubmitted ? opponent.score ?? "" : "";
  box.innerHTML = `<div class="content-card">
    <h2>Paired scoring</h2>
    ${cardNotice}
    <p>You are submitting the score for <strong>${escapeHtml(opponentLabel)}</strong>. ${isSinglesMode() ? "Players" : "Teams"} cannot score themselves.</p>
    <label>Total strokes
      <input id="opponentScore" type="number" min="1" max="30" value="${existingScore}" ${alreadySubmitted ? "disabled" : ""}>
    </label>
    <button id="submitOpponentScore" class="${alreadySubmitted ? "score-submitted-lock" : "primary"}" ${alreadySubmitted ? "disabled" : ""}>
      ${alreadySubmitted ? "Score submitted ✓" : "Submit score"}
    </button>
    ${alreadySubmitted ? '<p class="note">Waiting for the admin to approve or reject this score.</p>' : ""}
  </div>`;

  if (!alreadySubmitted) {
    $("#submitOpponentScore").addEventListener("click", async () => {
      const score = Number($("#opponentScore").value);
      if (!score) return alert("Enter a valid score.");
      await updateDoc(doc(db, "events", eventCode, "teams", String(opponent.slot)), {
        scoreHole: eventData.hole,
        score,
        acceptedHole: 0
      });
    });
  }
}

function renderLeaderboard() {
  const ranked = [...teams].sort((a, b) => (a.cumulativeScore || 0) - (b.cumulativeScore || 0));
  const allDone = teams.length > 0 && teams.every((team) => team.acceptedHole === eventData.hole);
  $("#leaderboard").innerHTML = ranked.map((team, index) => `
    <div class="leader-row">
      <strong>${index + 1}. ${escapeHtml(competitorLabel(team))}</strong>
      <span style="float:right">${team.cumulativeScore || 0}</span><br>
      <small>${escapeHtml(isSinglesMode() ? "Singles" : competitorMembers(team))}</small>
    </div>
  `).join("") + (isSharedDevice() && allDone ? `
    <div class="shared-next-action">
      <button id="sharedNextHole" class="primary">${
        eventData.hole >= eventData.holes ? "Open awards" :
        (eventData.beerStops && eventData.hole % 3 === 0) ? "Start Beer & Bump" :
        `Start Hole ${eventData.hole + 1}`
      }</button>
    </div>` : "");
  $("#sharedNextHole")?.addEventListener("click", continueFromApprovedScores);
}

function renderStory() {
  $("#storyList").innerHTML = (eventData.story || []).slice().reverse().map((item) =>
    `<div class="story-item">${escapeHtml(item)}</div>`
  ).join("");
}

function renderAwards() {
  const box = $("#awardsContent");
  const team = ownTeam();

  if (!eventData.awardsOpen) {
    box.innerHTML = `<div class="content-card center"><div class="big-icon">🎖️</div><h2>Award voting is not open</h2></div>`;
    return;
  }

  if (isAdmin) {
    const locked = teams.filter((entry) => entry.votesLocked).length;
    const allLocked = locked === teams.length;
    const tally = {};
    AWARDS.forEach((award) => {
      tally[award] = {};
      teams.forEach((entry) => {
        const vote = entry.votes?.[award];
        if (vote) tally[award][vote] = (tally[award][vote] || 0) + 1;
      });
    });

    box.innerHTML = `<div class="content-card">
      <h2>Admin award tally</h2>
      <p class="callout">${locked}/${teams.length} team ballots locked.</p>
      ${AWARDS.map((award) => {
        const results = Object.entries(tally[award]).sort((a, b) => b[1] - a[1]);
        return `<div class="team-row"><strong>${escapeHtml(award)}</strong><br>${
          results.length ? results.map(([name, votes]) => `${escapeHtml(name)}: ${votes}`).join(" • ") : "No votes"
        }</div>`;
      }).join("")}
      <button id="finaliseAwards" class="primary" ${allLocked ? "" : 'disabled style="opacity:.45"'}>Finalise winners</button>
    </div>`;
    $("#finaliseAwards")?.addEventListener("click", async () => {
      const winners = {};
      AWARDS.forEach((award) => {
        const results = Object.entries(tally[award]).sort((a, b) => b[1] - a[1]);
        if (results[0]) winners[award] = results[0][0];
      });
      await updateDoc(doc(db, "events", eventCode), {
        awardsFinalised: true,
        awardWinners: winners,
        story: [...(eventData.story || []), ...Object.entries(winners).map(([award, winner]) => `${award}: ${winner}`)]
      });
    });
    return;
  }

  if (!team) {
    box.innerHTML = `<div class="content-card">Join a team to vote.</div>`;
    return;
  }

  const playerOptions = teams.flatMap((entry) => entry.players).filter(Boolean);
  box.innerHTML = `<div class="content-card">
    <h2>${escapeHtml(competitorLabel(team))} award ballot</h2>
    <p class="callout">One vote per category. Once locked, your team cannot change its ballot.</p>
    <div class="form-grid">
      ${AWARDS.map((award) => `
        <label>${escapeHtml(award)}
          <select data-award="${escapeHtml(award)}" ${team.votesLocked ? "disabled" : ""}>
            <option value="">Choose recipient</option>
            ${playerOptions.map((player) => `<option ${team.votes?.[award] === player ? "selected" : ""}>${escapeHtml(player)}</option>`).join("")}
          </select>
        </label>
      `).join("")}
      <button id="lockAwardVotes" class="${team.votesLocked ? "success" : "primary"}" ${team.votesLocked ? "disabled" : ""}>
        ${team.votesLocked ? "Votes locked ✓" : "Lock team votes"}
      </button>
    </div>
  </div>`;

  if (!team.votesLocked) {
    $("#lockAwardVotes").addEventListener("click", async () => {
      const votes = {};
      document.querySelectorAll("[data-award]").forEach((select) => {
        votes[select.dataset.award] = select.value;
      });
      if (AWARDS.some((award) => !votes[award])) return alert("Choose a recipient in every category.");
      await updateDoc(doc(db, "events", eventCode, "teams", String(team.slot)), {
        votes,
        votesLocked: true
      });
    });
  }
}


async function approveTeamScore(team) {
  if (!team || team.scoreHole !== eventData.hole) return;
  if (team.acceptedHole === eventData.hole) return;

  await updateDoc(doc(db, "events", eventCode, "teams", String(team.slot)), {
    acceptedHole: eventData.hole,
    cumulativeScore: (team.cumulativeScore || 0) + Number(team.score || 0)
  });
}

async function rejectTeamScore(team) {
  if (!team) return;
  await updateDoc(doc(db, "events", eventCode, "teams", String(team.slot)), {
    scoreHole: 0,
    score: null,
    acceptedHole: 0
  });
}

function openAdminReview() {
  showScreen("adminScreen");
}

async function continueFromApprovedScores() {
  if (eventData.hole >= eventData.holes) {
    await updateDoc(doc(db, "events", eventCode), {
      status: "finished",
      awardsOpen: true,
      story: [...(eventData.story || []), "Final scores locked. Award voting opened."]
    });
    return;
  }

  if (eventData.beerStops && eventData.hole % 3 === 0) {
    await updateDoc(doc(db, "events", eventCode), {
      status: "break",
      story: [...(eventData.story || []), `Beer & Bump stop after hole ${eventData.hole}.`]
    });
    return;
  }

  await advanceToNextHole();
}


function playAdminNotificationSound(kind = "score") {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    const frequencies = kind === "complete" ? [660, 880] : [520, 700];
    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.11);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.11);
      oscillator.stop(now + 0.22 + index * 0.11);
    });
  } catch (error) {
    console.warn("Notification sound unavailable:", error);
  }
}

function vibrateAdmin(kind = "score") {
  if (!navigator.vibrate) return;
  navigator.vibrate(kind === "complete" ? [120, 70, 160] : [90, 50, 90]);
}

function triggerAdminAlertOnce(signature, kind = "score") {
  if (!signature || signature === lastAlertSignature) return;
  lastAlertSignature = signature;
  playAdminNotificationSound(kind);
  vibrateAdmin(kind);
}

function updateAdminAlertBadges(count, allAccepted = false) {
  const scoreBadge = $("#scoreAlertBadge");
  const adminBadge = $("#adminAlertBadge");
  [scoreBadge, adminBadge].forEach((badge) => {
    if (!badge) return;
    if (count > 0 || allAccepted) {
      badge.textContent = allAccepted ? "✓" : String(count);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  });
}

function renderAdminScoreBanner() {
  const banner = $("#adminScoreBanner");
  if (!banner) return;

  if (isSharedDevice() || !isAdmin || !eventData || eventData.status !== "playing") {
    banner.classList.add("hidden");
    banner.classList.remove("attention", "all-ready");
    updateAdminAlertBadges(0, false);
    return;
  }

  const submitted = teams.filter((team) =>
    team.scoreHole === eventData.hole && team.acceptedHole !== eventData.hole
  );
  const allSubmitted = teams.length > 0 && teams.every((team) => team.scoreHole === eventData.hole);
  const allAccepted = teams.length > 0 && teams.every((team) => team.acceptedHole === eventData.hole);

  banner.classList.remove("all-ready", "attention");

  if (allAccepted) {
    $("#bannerTitle").textContent = `Hole ${eventData.hole} complete`;
    $("#bannerMessage").textContent = eventData.hole >= eventData.holes
      ? "Every score is approved. Open award voting."
      : (eventData.beerStops && eventData.hole % 3 === 0)
        ? "Every score is approved. Start the Beer & Bump stop."
        : `Every score is approved. Start Hole ${eventData.hole + 1}.`;

    $("#bannerActions").innerHTML = `
      <button id="bannerNextHole" class="banner-next">
        ${eventData.hole >= eventData.holes
          ? "Open award voting"
          : (eventData.beerStops && eventData.hole % 3 === 0)
            ? "Start Beer & Bump"
            : `Start Hole ${eventData.hole + 1}`}
      </button>`;
    banner.classList.remove("hidden");
    banner.classList.add("all-ready");
    updateAdminAlertBadges(0, true);
    triggerAdminAlertOnce(`complete-${eventData.id}-${eventData.hole}`, "complete");
    $("#bannerNextHole").addEventListener("click", continueFromApprovedScores);
    return;
  }

  if (!submitted.length) {
    banner.classList.add("hidden");
    banner.classList.remove("attention", "all-ready");
    updateAdminAlertBadges(0, false);
    return;
  }

  const team = submitted[0];
  const remaining = submitted.length - 1;

  $("#bannerTitle").textContent = "Score submitted";
  $("#bannerMessage").textContent =
    `${competitorLabel(team)} submitted ${team.score} strokes for Hole ${eventData.hole}.` +
    (remaining > 0 ? ` ${remaining} more score${remaining === 1 ? "" : "s"} waiting for approval.` : "") +
    (allSubmitted ? " All team scores have now been received." : "");

  $("#bannerActions").innerHTML = `
    <button id="bannerApprove" class="banner-approve">Approve</button>
    <button id="bannerReject" class="banner-reject">Reject</button>
    <button id="bannerReview" class="banner-review">Review scores</button>`;

  banner.classList.remove("hidden");
  banner.classList.add("attention");
  updateAdminAlertBadges(submitted.length, false);
  triggerAdminAlertOnce(
    `score-${eventData.id}-${eventData.hole}-${team.slot}-${team.score}`,
    "score"
  );

  $("#bannerApprove").addEventListener("click", () => approveTeamScore(team));
  $("#bannerReject").addEventListener("click", () => rejectTeamScore(team));
  $("#bannerReview").addEventListener("click", openAdminReview);
}


function renderAdmin() {
  const box = $("#adminContent");
  if (!isAdmin) {
    box.innerHTML = `<div class="content-card center"><div class="big-icon">👑</div><h2>Admin only</h2></div>`;
    return;
  }

  const allAccepted = teams.length > 0 && teams.every((team) => team.acceptedHole === eventData.hole);
  const allReady = teams.length > 0 && teams.every((team) => team.readyBreakHole === eventData.hole);

  const rows = teams.map((team) => `
    <div class="score-row">
      <strong>${escapeHtml(competitorLabel(team))}</strong><br>
      <small>${team.scoreHole === eventData.hole ? `${team.score} strokes submitted` : "Waiting for paired team score"}</small>
      <button class="${team.acceptedHole === eventData.hole ? "success" : "secondary"} accept-score"
        data-slot="${team.slot}"
        ${team.scoreHole !== eventData.hole ? 'disabled style="opacity:.45"' : ""}>
        ${team.acceptedHole === eventData.hole ? "Accepted" : "Accept"}
      </button>
    </div>
  `).join("");

  box.innerHTML = `<div class="content-card">
    <h2>Admin hole control</h2>
    ${eventData.status === "break" ? `
      <p class="callout">Beer &amp; Bump readiness: ${teams.filter((team) => team.readyBreakHole === eventData.hole).length}/${teams.length}</p>
      <button id="continueAfterBreak" class="primary" ${allReady ? "" : 'disabled style="opacity:.45"'}>Unlock next hole</button>
    ` : `
      ${rows}
      <button id="advanceHole" class="primary" ${allAccepted ? "" : 'disabled style="opacity:.45"'}>
        ${eventData.hole >= eventData.holes ? "Open award voting" : "Accept all and advance"}
      </button>
    `}
  </div>`;

  document.querySelectorAll(".accept-score").forEach((button) => {
    button.addEventListener("click", async () => {
      const slot = Number(button.dataset.slot);
      const team = teams.find((entry) => entry.slot === slot);
      await approveTeamScore(team);
    });
  });

  $("#advanceHole")?.addEventListener("click", continueFromApprovedScores);

  $("#continueAfterBreak")?.addEventListener("click", advanceToNextHole);
}

async function advanceToNextHole() {
  const nextHole = eventData.hole + 1;
  await updateDoc(doc(db, "events", eventCode), {
    hole: nextHole,
    status: "playing",
    currentTurnSlot: 1,
    currentScoreSlot: 1,
    sharedRevealSlot: null,
    sharedPhase: isSharedDevice() ? "drawing" : eventData.sharedPhase,
    story: [...(eventData.story || []), `Hole ${nextHole} unlocked.`]
  });
}

async function regenerateCodes() {
  const batch = writeBatch(db);
  teams.forEach((team) => {
    batch.update(doc(db, "events", eventCode, "teams", String(team.slot)), {
      joinToken: randomCode(12)
    });
  });
  await batch.commit();
  alert("New team codes generated. Old QR links are now invalid.");
}

function startDemo() {
  alert("Demo mode will be restored in the next polish build. The live multiplayer foundation is now the priority.");
}

updateGameModeControls();
$("#gameMode").addEventListener("change", updateGameModeControls);
$("#playStyle").addEventListener("change", updateGameModeControls);
$("#teamCount").addEventListener("change", updateSharedPlayerFieldVisibility);

$("#openCreate").addEventListener("click", () => $("#createPanel").classList.toggle("hidden"));
$("#openJoin").addEventListener("click", () => $("#joinPanel").classList.toggle("hidden"));
$("#openDemo").addEventListener("click", startDemo);
$("#createTournament").addEventListener("click", createTournament);
$("#joinTournament").addEventListener("click", openManualTeam);
$("#saveTeam").addEventListener("click", saveTeam);
$("#startTournament").addEventListener("click", startTournament);
$("#regenerateCodes").addEventListener("click", regenerateCodes);
$("#printQrSheet").addEventListener("click", () => window.print());
document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screen));
});

initialiseSplash();
readUrl();
try {
  await ensureAuth();
  await loadEvent();
} catch (error) {
  console.error(error);
  $("#connectionStatus").textContent = "Connection failed";
  $("#connectionStatus").className = "connection-pill error";
  showToast(`Bogey Banter could not connect: ${error.message}`, "error");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js")
    .then((registration) => {
      registration.update().catch(() => {});
      if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
    })
    .catch((error) => console.error("Service worker registration failed:", error));

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!sessionStorage.getItem("bb-sw-reloaded")) {
      sessionStorage.setItem("bb-sw-reloaded", "1");
      location.reload();
    }
  });
}
