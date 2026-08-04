
import { TEAM_NAMES, AWARDS, CHAOS_CARDS, CARD_CATEGORIES } from "./config.js";
import { $, escapeHtml, randomCode, baseUrl, nextSlot, toast } from "./utils.js";
import { state, setState, subscribe, clearSubscriptions } from "./store.js";
import * as live from "./firebase-service.js";
import * as demo from "./demo-service.js";

const app=$("#app");
let splashDone=false;
let renderQueued=false;
let lastAdminAlert="";
const navigationHistory=[];
function navigationSnapshot(){return {mode:state.mode,screen:state.screen}}
function navigate(patch,{replace=false}={}){
  const current=navigationSnapshot();
  const next={mode:patch.mode??state.mode,screen:patch.screen??state.screen};
  if(!replace&&(current.mode!==next.mode||current.screen!==next.screen)){
    navigationHistory.push(current);
    if(navigationHistory.length>30)navigationHistory.shift();
  }
  setState(patch);
}
function goBack(){
  const previous=navigationHistory.pop();
  if(previous){setState(previous);return}
  if(state.event&&state.screen!=="lobby"){setState({screen:"lobby"});return}
  if(state.mode!=="home"){setState({mode:"home"});return}
  history.back();
}
function goHome(){
  if(state.event&&!confirm("A tournament is currently open. Return to the Home screen?"))return;
  clearSubscriptions();
  location.href=baseUrl();
}

function gameLabel(){return state.event?.gameMode==="singles"?"Singles":state.event?.gameMode==="ambrose4"?"4-Man Ambrose":"2-Man Ambrose"}
function isShared(){return state.event?.playStyle==="shared"}
function playerCount(){return state.event?.gameMode==="ambrose4"?4:state.event?.gameMode==="ambrose2"?2:1}
function label(team){
  if(!team)return"";
  if(state.event?.gameMode==="singles")return team.players?.[0]||team.name||`Player ${team.slot}`;
  return team.name||`Team ${team.slot}`;
}
function ready(team){
  if(!team)return false;
  if(state.event?.gameMode==="singles")return Boolean(team.players?.[0]);
  return Boolean(team.name&&team.players?.slice(0,playerCount()).every(Boolean));
}
function activeSlot(){
  if(!isShared())return state.teamSlot;
  return state.event.sharedPhase==="scoring"?Number(state.event.currentScoreSlot||1):Number(state.event.currentTurnSlot||1);
}
function ownTeam(){return state.teams.find(t=>t.slot===activeSlot())}
function pairedTeam(){
  const i=state.teams.findIndex(t=>t.slot===state.teamSlot);
  return i<0?null:state.teams[(i+1)%state.teams.length];
}
function allDrawn(){return state.teams.length&&state.teams.every(t=>t.drawnHole===state.event.hole&&t.card)}
function allSubmitted(){return state.teams.length>0&&state.teams.every(t=>t.scoreHole===state.event.hole&&Number(t.score)>0)}
function submittedCount(){return state.teams.filter(t=>t.scoreHole===state.event.hole&&Number(t.score)>0).length}
function allAccepted(){return allSubmitted()}
function isDemo(){return state.backend==="demo"}

function updateEvent(patch){
  return isDemo()?demo.updateDemoEvent(patch):live.updateEvent(state.eventCode,patch)
}
function updateTeam(slot,patch){
  return isDemo()?demo.updateDemoTeam(slot,patch):live.updateTeam(state.eventCode,slot,patch)
}

function splash(){
  return `<section id="splash" class="splash" tabindex="0">
    <div class="splash-frame">
      <div class="logo-big"><span class="bogey">BOGEY</span><span class="banter">BANTER</span></div>
      <p class="splash-tag">The ultimate social<br>golf tournament app.</p>
      <ul class="features">
        <li><b>✓</b>Singles &amp; Ambrose</li><li><b>⌗</b>QR Codes for Live Play</li>
        <li><b>♢</b>Admin Approvals &amp; Alerts</li><li><b>▣</b>Beer &amp; Bump every 3 holes</li>
        <li><b>◇</b>Chaos Cards</li><li><b>▥</b>Live Leaderboards</li>
        <li><b>▭</b>Story of the Day</li><li><b>♛</b>End of Day Awards</li>
      </ul>
      <div class="characters"><img src="./assets/splash-characters-approved.jpeg" alt="" onerror="this.closest('.characters').style.display='none'"></div>
      <div class="tap"><span>☝</span><div><b>TAP ANYWHERE</b><em>TO CONTINUE</em></div></div>
    </div>
  </section>`;
}

function chrome(content,nav=true){
  const event=state.event;
  return `<main class="shell screen-art screen-art-${state.screen||state.mode}">
    <header class="topbar">
      <div class="topbar-navigation">
        ${state.mode!=="home"||state.event?'<button class="header-action" data-action="back" aria-label="Go back">←</button>':""}
        <div class="brand"><div class="brand-icon">⚑</div><div><strong>BOGEY BANTER</strong><small>THE ULTIMATE SOCIAL GOLF TOURNAMENT APP</small></div></div>
      </div>
      <div class="topbar-actions">
        ${state.mode!=="home"||state.event?'<button class="header-action" data-action="home" aria-label="Return home">⌂</button>':""}
        ${isDemo()?'<span class="demo-ribbon">DEMO MODE</span>':'<span class="version">v7.0 RC1.1.1</span>'}
      </div>
    </header>
    <div class="statusbar"><span>${event?`${escapeHtml(event.name)} • ${event.id||state.eventCode}`:"Choose how you want to play"}</span>
      <span class="live-pill"><i></i>${isDemo()?"Local demo":"Live connection ready"}</span></div>
    ${content}
  </main>${event&&nav?bottomNav():""}${adminBanner()}`;
}

function bottomNav(){
  const items=[["lobby","⌂","Lobby"],["draw","◇","Draw"],["score","✎","Score"],["board","♛","Board"],["story","≡","Story"],["awards","★","Awards"],["more","•••","More"]];
  return `<nav class="bottom-nav">${items.map(([id,icon,name])=>
    `<button class="nav ${state.screen===id?"active":""}" data-nav="${id}"><i>${icon}</i>${name}</button>`
  ).join("")}</nav>`;
}

function home(){
  return chrome(`<section class="card">
    <div class="kicker">CHOOSE YOUR GAME</div><h1>Golf, chaos and banter—all in one place.</h1>
    <p class="muted">Create a live tournament, join with a QR code, or explore every feature instantly in Demo Mode.</p>
    <div class="menu-grid">
      <button class="mode-card lime" data-home="create"><span class="icon">👥</span><span><strong>Create Tournament</strong><small>Singles, 2-Man or 4-Man Ambrose</small></span><b>›</b></button>
      <button class="mode-card blue" data-home="join"><span class="icon">⌗</span><span><strong>Join Tournament</strong><small>Use a team QR or join code</small></span><b>›</b></button>
      <button class="mode-card purple" data-home="demo"><span class="icon">▶</span><span><strong>Demo Mode</strong><small>Explore cards, scoring, leaderboard and awards</small></span><b>›</b></button>
    </div><button class="secondary" data-home="about" style="margin-top:12px">About Bogey Banter</button>
  </section>`,false);
}

function createScreen(){
  return chrome(`<section class="card"><div class="kicker">TOURNAMENT BUILDER</div><h2>Create your round</h2>
    <div class="form-grid">
      <label class="field wide"><span>Tournament name</span><input id="eventName" placeholder="Enter tournament name" autocomplete="off"></label>
      <label class="field"><span>Game mode</span><select id="gameMode"><option value="ambrose4">4-Man Ambrose</option><option value="ambrose2">2-Man Ambrose</option><option value="singles">Singles</option></select></label>
      <label class="field"><span>Play style</span><select id="playStyle"><option value="live">Live devices</option><option value="shared">Shared device</option></select></label>
      <label class="field"><span>Competitors</span><select id="teamCount"></select></label>
      <label class="field"><span>Holes</span><select id="holes"><option value="9">9</option><option value="18" selected>18</option></select></label>
      <label class="field"><span>Chaos deck</span><select id="chaosMode"><option>Casual</option><option selected>Classic</option><option>Chaos</option><option>Carnage</option></select></label>
      <label class="field"><span>Theme</span><select id="theme"><option selected>Classic Bogey Banter</option></select></label>
      <div id="sharedNames" class="wide hidden"></div>
      <label class="toggle wide"><input id="beerStops" type="checkbox" checked><span><strong>Beer & Bump every third hole</strong><br><small class="muted">No timer—continue when everyone is ready.</small></span></label>
      <button id="createEvent" class="primary wide">Create Tournament</button>
      <button data-home="back" class="secondary wide">Back</button>
    </div>
  </section>`,false);
}

function joinScreen(){
  return chrome(`<section class="card"><div class="kicker">JOIN LIVE PLAY</div><h2>Open your team</h2>
    <div class="form-grid">
      <label class="field wide"><span>Tournament code</span><input id="joinCode" autocapitalize="characters"></label>
      <label class="field"><span>Team / player number</span><input id="joinSlot" type="number" min="1" max="12"></label>
      <label class="field"><span>Team token</span><input id="joinToken"></label>
      <button id="joinEvent" class="primary wide">Join Tournament</button>
      <button data-home="back" class="secondary wide">Back</button>
    </div>
  </section>`,false);
}

function metrics(){
  const registered=state.teams.filter(ready).length;
  return `<div class="metrics">
    <div class="metric"><span>HOLE</span><strong>${state.event.hole}</strong><small>Current</small></div>
    <div class="metric"><span>READY</span><strong>${registered}/${state.event.teamCount}</strong><small>Competitors</small></div>
    <div class="metric"><span>MODE</span><strong>${escapeHtml(gameLabel())}</strong><small>${isShared()?"Shared device":"Live devices"}</small></div>
  </div>`;
}

function lobby(){
  const register=!isShared()&&state.teamSlot;
  return chrome(`${metrics()}
    ${register?registration():""}
    <section class="card"><div class="kicker">LIVE LOBBY</div><h2>Competitors</h2>
      <div class="list">${state.teams.map(t=>`<div class="row"><div class="row-head"><strong>${escapeHtml(label(t))}</strong><span class="badge ${ready(t)?"ready":"waiting"}">${ready(t)?"Ready":"Waiting"}</span></div><small>${escapeHtml(t.players?.filter(Boolean).join(" & ")||"Not registered")}</small></div>`).join("")}</div>
      ${state.isAdmin&&state.event.status==="lobby"?`
        <div class="lobby-start-area">
          <button id="startEvent" class="primary" ${state.teams.every(ready)?"":"disabled"}>Start Tournament</button>
          ${state.teams.every(ready)?"":`<p class="waiting-message">Waiting for ${state.event.teamCount-state.teams.filter(ready).length} competitor${state.event.teamCount-state.teams.filter(ready).length===1?"":"s"} to register.</p>`}
        </div>`:""}
    </section>
    ${state.isAdmin&&!isShared()?qrSection():""}`);
}

function registration(){
  const team=state.teams.find(t=>t.slot===state.teamSlot);
  if(!team)return"";
  const count=playerCount();
  const names=TEAM_NAMES.map(n=>`<option ${team.name===n?"selected":""}>${escapeHtml(n)}</option>`).join("");
  return `<section class="card"><div class="kicker">YOUR ENTRY</div><h2>Register ${state.event.gameMode==="singles"?"player":"team"}</h2>
    <div class="form-grid">
      ${state.event.gameMode!=="singles"?`<label class="field wide"><span>Team name</span><select id="regName">${names}</select></label>`:""}
      ${Array.from({length:count},(_,i)=>`<label class="field"><span>${state.event.gameMode==="singles"?"Player name":`Player ${i+1}`}</span><input id="regPlayer${i}" value="${escapeHtml(team.players?.[i]||"")}"></label>`).join("")}
      <button id="saveRegistration" class="primary wide">Save Entry</button>
    </div></section>`;
}

function qrSection(){
  return `<section class="card"><div class="kicker">TEAM QR CODES</div><h2>Scan to join</h2><div id="qrGrid" class="qr-grid"></div>
    <div class="button-row" style="margin-top:10px"><button id="regenQr" class="secondary">Regenerate</button><button id="printQr" class="secondary">Print</button></div></section>`;
}

function draw(){
  if(state.event.status==="lobby")return chrome(`<section class="card"><h2>Waiting for the admin to start</h2></section>`);
  if(isShared())return chrome(sharedDraw());
  const team=ownTeam();
  if(!team)return chrome(`<section class="card"><h2>Open this tournament using your team QR code.</h2></section>`);
  return chrome(drawCardView(team,false));
}

function sharedDraw(){
  if(state.event.sharedRevealSlot){
    const t=state.teams.find(x=>x.slot===Number(state.event.sharedRevealSlot));
    const last=allDrawn();
    return `<section class="card"><div class="kicker">${escapeHtml(label(t))} DREW</div>${cardMarkup(t)}
      <div class="reveal-controls"><button id="continueReveal" class="primary">${last?"View All Cards":`Pass to ${escapeHtml(label(state.teams.find(x=>x.slot===nextSlot(t.slot,state.teams.length))))}`}</button></div></section>`;
  }
  if(state.event.sharedPhase==="cards-complete"){
    return `<section class="card"><div class="kicker">ALL CARDS DRAWN</div><h2>Hole ${state.event.hole} cards</h2>
      <div class="card-gallery">${state.teams.map(miniCard).join("")}</div><button id="beginScores" class="primary" style="margin-top:12px">Begin Score Entry</button></section>`;
  }
  if(state.event.sharedPhase==="scoring"){
    return `<section class="card"><h2>All cards have been drawn.</h2><button data-nav="score" class="primary">Enter Scores</button></section>`;
  }
  const t=ownTeam();
  return `<section class="card">${drawCardView(t,true)}</section>`;
}

function drawCardView(team,shared){
  const drawn=team.drawnHole===state.event.hole&&team.card;
  return drawn?`${cardMarkup(team)}<button class="secondary" disabled style="margin-top:12px">Card already drawn ✓</button>`:
    `<div class="chaos-card"><div><div class="rarity">${shared?`${escapeHtml(label(team))}'S TURN`:"ONE DRAW PER HOLE"}</div><div class="chaos-title"><span>🎴</span><h2>Draw Your Chaos Card</h2></div><p>${shared?"Everyone draws before scoring starts.":"Your paired scorer sees it immediately."}</p></div><div>Bogey Banter • Hole ${state.event.hole}</div></div><button id="drawButton" class="primary" style="margin-top:12px">Draw Card</button>`;
}
function cardClass(card){return CARD_CATEGORIES[card?.[1]]?.className||"challenge"}
function cardMarkup(t){const c=t.card;return `<div class="chaos-card chaos-${cardClass(c)} art-${escapeHtml(c?.[4]||"generic")}" data-art="${escapeHtml(c?.[4]||"generic")}"><div class="card-art-layer" aria-hidden="true"><img src="./assets/splash-characters-approved.jpeg" alt=""></div><div class="card-theme-symbol" aria-hidden="true">${escapeHtml(c[2])}</div><div class="card-content"><div class="rarity">${escapeHtml(c[1])} • HOLE ONLY</div><div class="chaos-title"><span>${escapeHtml(c[2])}</span><h2>${escapeHtml(c[0])}</h2></div><p class="card-subtitle">${escapeHtml(c[5]||"Hole-only chaos awaits.")}</p><div class="rule-panel"><p>${escapeHtml(c[3])}</p></div></div><div class="card-footer"><span>${escapeHtml(label(t))}</span><span>Hole ${state.event.hole}</span></div></div>`}
function miniCard(t){return `<div class="mini-card"><small>${escapeHtml(label(t))}</small><strong>${escapeHtml(t.card?.[2]||"")} ${escapeHtml(t.card?.[0]||"Waiting")}</strong><p>${escapeHtml(t.card?.[3]||"")}</p></div>`}

function score(){
  if(state.event.status!=="playing")return chrome(`<section class="card"><h2>Scoring is currently locked.</h2></section>`);
  if(isShared())return chrome(sharedScore());
  const opponent=pairedTeam();
  if(!opponent)return chrome(`<section class="card"><h2>Join a team to score.</h2></section>`);
  const submitted=opponent.scoreHole===state.event.hole;
  return chrome(`<section class="card score-panel"><div class="kicker">PAIRED SCORING</div><h2>Enter ${escapeHtml(label(opponent))}'s score</h2>
    ${opponent.card?`<div class="callout"><strong>${escapeHtml(opponent.card[2])} ${escapeHtml(opponent.card[0])}</strong><br>${escapeHtml(opponent.card[3])}</div>`:"<div class='callout'>Waiting for their card draw.</div>"}
    <label class="field"><span>Total strokes</span><input id="liveScore" type="number" min="1" max="30" value="${submitted?opponent.score||"":""}" ${submitted?"disabled":""}></label>
    <button id="submitLiveScore" class="primary" ${submitted||!opponent.card?"disabled":""}>${submitted?"Score Submitted ✓":"Submit Score"}</button></section>`);
}

function sharedScore(){
  if(state.event.sharedPhase!=="scoring")return `<section class="card"><h2>Draw every card first.</h2><button data-nav="draw" class="primary">Return to Draw</button></section>`;
  const t=ownTeam(); const submitted=t.scoreHole===state.event.hole;
  return `<section class="card score-panel"><div class="kicker">SHARED DEVICE SCORING</div><h2>Enter ${escapeHtml(label(t))}'s score</h2>
    <div class="callout"><strong>${escapeHtml(t.card[2])} ${escapeHtml(t.card[0])}</strong><br>${escapeHtml(t.card[3])}</div>
    <label class="field"><span>Total strokes</span><input id="sharedScore" type="number" min="1" max="30" value="${submitted?t.score||"":""}" ${submitted?"disabled":""}></label>
    <button id="submitSharedScore" class="primary" ${submitted?"disabled":""}>${submitted?"Score Confirmed ✓":"Confirm Score"}</button></section>`;
}

function scoreProgress(){
  const count=submittedCount();
  return `<section class="card score-progress-card">
    <div class="row-head"><div><div class="kicker">HOLE ${state.event.hole} PROGRESS</div><h2>${count} of ${state.teams.length} scores submitted</h2></div><span class="progress-number">${count}/${state.teams.length}</span></div>
    <div class="submission-progress">${state.teams.map(t=>{const done=t.scoreHole===state.event.hole&&Number(t.score)>0;return `<div class="submission-row ${done?"submitted":"pending"}"><span>${done?"✓":"…"}</span><strong>${escapeHtml(label(t))}</strong><small>${done?`${t.score} strokes`:"Waiting"}</small></div>`}).join("")}</div>
    ${state.isAdmin&&allSubmitted()?`<button id="nextHole" class="primary next-hole-button">${state.event.hole>=state.event.holes?"Finish Tournament":`Start Hole ${state.event.hole+1}`}</button>`:""}
    ${!allSubmitted()?'<p class="waiting-message">Start Next Hole will unlock automatically when every score is submitted.</p>':""}
  </section>`;
}
function board(){
  const ranked=[...state.teams].sort((a,b)=>(a.cumulativeScore||0)-(b.cumulativeScore||0));
  return chrome(`${scoreProgress()}<section class="card"><div class="kicker">LIVE STANDINGS</div><h2>Leaderboard</h2><div class="list">
    ${ranked.map((t,i)=>`<div class="row leader-row"><span class="position">${i+1}</span><span><strong>${escapeHtml(label(t))}</strong><small>Hole ${state.event.hole}</small></span><strong>${t.cumulativeScore||0}</strong></div>`).join("")}
  </div></section>`);
}
function story(){
  return chrome(`<section class="card"><div class="kicker">STORY OF THE DAY</div><h2>Round recap</h2><div class="list">${(state.event.story||[]).slice().reverse().map(s=>`<div class="story">${escapeHtml(s)}</div>`).join("")}</div></section>`);
}


function autoAwardData(){
  const ranked=[...state.teams].sort((a,b)=>(a.cumulativeScore||0)-(b.cumulativeScore||0));
  const maxBy=(key)=>[...state.teams].sort((a,b)=>((b.categoryCounts||{})[key]||0)-((a.categoryCounts||{})[key]||0))[0];
  const best=[...state.teams].filter(t=>Number.isFinite(t.bestHole)).sort((a,b)=>a.bestHole-b.bestHole)[0];
  const worst=[...state.teams].filter(t=>Number.isFinite(t.worstHole)).sort((a,b)=>b.worstHole-a.worstHole)[0];
  return [
    ["Tournament Champion",ranked[0]],
    ["Runner-Up",ranked[1]],
    ["Best Single-Hole Score",best],
    ["Worst Single-Hole Score",worst],
    ["Chaos Magnet",maxBy("Sabotage")],
    ["Lucky Break King",maxBy("Lucky Break")],
    ["Beer Magnet",maxBy("Beer Card")],
    ["Challenge Champion",maxBy("Challenge")],
    ["Legendary Victim",maxBy("Legendary")]
  ].filter(([,team])=>team);
}

function more(){
  const diag=live.connectionInfo?.()||{};
  return chrome(`<section class="card"><div class="kicker">BETA HUB</div><h2>Testing & Support</h2>
    <div class="menu-grid">
      <button class="mode-card blue" data-more="bug"><span class="icon">🐞</span><span><strong>Report a Bug</strong><small>Send screen, device and build details</small></span><b>›</b></button>
      <button class="mode-card purple" data-more="idea"><span class="icon">💡</span><span><strong>Suggest an Idea</strong><small>Cards, UI or gameplay feedback</small></span><b>›</b></button>
      <button class="mode-card lime" data-more="notes"><span class="icon">📋</span><span><strong>Release Notes</strong><small>What changed in RC1</small></span><b>›</b></button>
      <button class="mode-card blue" data-more="diagnostics"><span class="icon">🔧</span><span><strong>Diagnostics</strong><small>Connection, cache and tournament details</small></span><b>›</b></button>
      <button class="mode-card purple" data-more="about"><span class="icon">ℹ️</span><span><strong>About</strong><small>Credits and version</small></span><b>›</b></button>
    </div></section>`,true);
}
function feedbackForm(type){
  const isBug=type==="bug";
  return chrome(`<section class="card"><div class="kicker">${isBug?"BUG REPORT":"FEATURE SUGGESTION"}</div><h2>${isBug?"Tell us what went wrong":"Share your idea"}</h2>
    <div class="form-grid">
      <label class="field wide"><span>Title</span><input id="feedbackTitle" maxlength="100"></label>
      <label class="field wide"><span>${isBug?"What happened?":"Describe your idea"}</span><textarea id="feedbackBody" rows="6"></textarea></label>
      ${isBug?'<label class="field wide"><span>What did you expect?</span><textarea id="feedbackExpected" rows="4"></textarea></label>':""}
      <div class="callout wide">Automatically included: v7.0 RC1.1, current screen, game mode, tournament code, browser and device.</div>
      <button id="sendFeedback" class="primary wide" data-type="${type}">Submit</button><button data-nav="more" class="secondary wide">Back</button>
    </div></section>`);
}
function releaseNotes(){return chrome(`<section class="card"><div class="kicker">WHAT'S NEW</div><h2>v7.0 RC1.1</h2><div class="list">
  ${["Commercial modular engine","42 one-hole-only Chaos Cards","Premium illustrated card fronts","Animated character screen backgrounds","Demo Mode","Shared and live Singles","2-Man and 4-Man Ambrose","Beta Hub and bug reporting","Automatic score/card awards","Designed & Created by Dennis Moran"].map(x=>`<div class="row">✓ ${x}</div>`).join("")}
  </div><button data-nav="more" class="secondary" style="margin-top:12px">Back</button></section>`)}
function diagnostics(){
  const info=live.connectionInfo?.()||{};
  return chrome(`<section class="card"><div class="kicker">DEVELOPER DIAGNOSTICS</div><h2>Build information</h2><div class="list">
    <div class="row"><strong>Version</strong><small>v7.0 RC1.1</small></div>
    <div class="row"><strong>Backend</strong><small>${escapeHtml(state.backend)}</small></div>
    <div class="row"><strong>Firebase</strong><small>${info.authenticated?"Authenticated":"Not authenticated"} • ${escapeHtml(info.projectId||"Unknown")}</small></div>
    <div class="row"><strong>Screen</strong><small>${escapeHtml(state.screen)}</small></div>
    <div class="row"><strong>Tournament</strong><small>${escapeHtml(state.eventCode||"None")}</small></div>
    <div class="row"><strong>Competitors loaded</strong><small>${state.teams.length}</small></div>
    <div class="row"><strong>Cache</strong><small>bogey-banter-v7-rc1-1</small></div>
  </div><div class="button-row" style="margin-top:12px"><button id="testQr" class="secondary">Test QR</button><button id="clearCache" class="danger">Clear Cache</button></div><button data-nav="more" class="secondary" style="margin-top:9px">Back</button></section>`)}
function about(){return chrome(`<section class="card about-card"><div class="kicker">ABOUT</div><h1>BOGEY BANTER</h1><p>The ultimate social golf tournament app.</p><div class="credits"><span>Designed & Created by</span><strong>Dennis Moran</strong><span>Built with</span><strong>ChatGPT</strong></div><p class="muted">Version 7.0 RC1<br>© Bogey Banter</p><button data-nav="more" class="secondary">Back</button></section>`)}
function awards(){
  const automatic=autoAwardData();
  const winners=[...state.teams].sort((a,b)=>(a.cumulativeScore||0)-(b.cumulativeScore||0));
  return chrome(`<section class="card"><div class="kicker">AUTOMATIC AWARDS</div><h2>Calculated from cards and scores</h2><div class="list">
    ${automatic.map(([a,t])=>`<div class="row"><div class="row-head"><strong>${escapeHtml(a)}</strong><span>${escapeHtml(label(t))}</span></div></div>`).join("")||'<div class="callout">Awards will appear as scores and cards are recorded.</div>'}
  </div></section><section class="card"><div class="kicker">GROUP-VOTED AWARDS</div><h2>Fun awards</h2><div class="list">${AWARDS.map((a,i)=>`<div class="row"><div class="row-head"><strong>${escapeHtml(a)}</strong><span>${escapeHtml(label(winners[i%Math.max(winners.length,1)])||"Voting opens at finish")}</span></div></div>`).join("")}</div></section>`);
}

function admin(){
  if(!state.isAdmin)return chrome(`<section class="card"><h2>Admin access only.</h2></section>`);
  return chrome(`${scoreProgress()}<section class="card"><div class="kicker">ADMIN CONTROL</div><h2>Hole ${state.event.hole}</h2><div class="callout">Scores are accepted automatically. The host can start the next hole when all scores are submitted.</div></section>`);
}
function adminBanner(){
  if(!state.event||!state.isAdmin||isShared()||!allSubmitted())return"";
  return `<aside class="admin-banner all-scores-banner"><strong>All Hole ${state.event.hole} scores are in.</strong><button id="bannerNextHole" class="primary">${state.event.hole>=state.event.holes?"Finish Tournament":`Start Hole ${state.event.hole+1}`}</button></aside>`;
}

function screen(){
  if(state.mode==="home")return home();
  if(state.mode==="create")return createScreen();
  if(state.mode==="join")return joinScreen();
  if(!state.event)return home();
  return ({lobby,draw,score,board,story,awards,admin,more,bug:()=>feedbackForm("bug"),idea:()=>feedbackForm("idea"),notes:releaseNotes,diagnostics,about}[state.screen]||lobby)();
}

function render(){
  if(!splashDone&&!new URLSearchParams(location.search).get("event"))app.innerHTML=splash()+screen();
  else app.innerHTML=screen();
  bind();
  if(state.event&&state.isAdmin&&!isShared())renderQr();
}
subscribe(()=>{if(!renderQueued){renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render()})}});

function bind(){
  $("#splash")?.addEventListener("click",()=>{splashDone=true;$("#splash").classList.add("closing");setTimeout(render,360)},{once:true});
  document.querySelectorAll("[data-home]").forEach(b=>b.addEventListener("click",()=>{
    const action=b.dataset.home;
    if(action==="back")goBack();
    if(action==="create")navigate({mode:"create"});
    if(action==="join")navigate({mode:"join"});
    if(action==="demo")startDemo();
    if(action==="about"){splashDone=true;setState({mode:"play",screen:"about"});}
  }));
  document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>navigate({screen:b.dataset.nav})));
  document.querySelectorAll("[data-more]").forEach(b=>b.addEventListener("click",()=>navigate({screen:b.dataset.more})));
  document.querySelectorAll("[data-action='back']").forEach(b=>b.addEventListener("click",goBack));
  document.querySelectorAll("[data-action='home']").forEach(b=>b.addEventListener("click",goHome));
  $("#sendFeedback")?.addEventListener("click",sendFeedback);
  $("#clearCache")?.addEventListener("click",clearAppCache);
  $("#testQr")?.addEventListener("click",testQr);
  $("#gameMode")?.addEventListener("change",setupCounts);
  $("#playStyle")?.addEventListener("change",setupCounts);
  $("#teamCount")?.addEventListener("change",setupSharedNames);
  $("#createEvent")?.addEventListener("click",createLive);
  $("#joinEvent")?.addEventListener("click",joinLive);
  $("#saveRegistration")?.addEventListener("click",saveRegistration);
  $("#startEvent")?.addEventListener("click",()=>updateEvent({status:"playing",story:[...(state.event.story||[]),"Tournament started."]}));
  $("#drawButton")?.addEventListener("click",drawNow);
  $("#continueReveal")?.addEventListener("click",continueReveal);
  $("#beginScores")?.addEventListener("click",()=>updateEvent({sharedPhase:"scoring",currentScoreSlot:1}));
  $("#submitSharedScore")?.addEventListener("click",submitSharedScore);
  $("#submitLiveScore")?.addEventListener("click",submitLiveScore);
  $("#nextHole")?.addEventListener("click",nextHole);
  $("#regenQr")?.addEventListener("click",async()=>{await live.regenerate(state.eventCode,state.teams);toast("New QR codes generated.")});
  $("#printQr")?.addEventListener("click",()=>window.print());
  $("#bannerNextHole")?.addEventListener("click",nextHole);
  if(state.mode==="create")setupCounts();
}

function setupCounts(){
  const mode=$("#gameMode")?.value||"ambrose4";const style=$("#playStyle")?.value||"live";
  const select=$("#teamCount");if(!select)return;
  const max=mode==="singles"?4:mode==="ambrose4"?6:12;
  const old=Math.min(Number(select.value)||4,max);
  select.innerHTML=Array.from({length:max-1},(_,i)=>i+2).map(n=>`<option ${n===old?"selected":""}>${n}</option>`).join("");
  setupSharedNames();
  const holder=$("#sharedNames");if(holder)holder.classList.toggle("hidden",!(mode==="singles"&&style==="shared"));
}
function setupSharedNames(){
  const holder=$("#sharedNames");if(!holder)return;
  const count=Number($("#teamCount")?.value||4);
  holder.innerHTML=`<div class="callout">Enter each player now. No QR codes are needed.</div><div class="form-grid" style="margin-top:10px">${Array.from({length:count},(_,i)=>`<label class="field"><span>Player ${i+1}</span><input id="sharedName${i}"></label>`).join("")}</div>`;
}

async function createLive(){
  try{
    const eventName=$("#eventName").value.trim();
    const mode=$("#gameMode").value,style=$("#playStyle").value,count=Number($("#teamCount").value);
    const sharedNames=mode==="singles"&&style==="shared"?Array.from({length:count},(_,i)=>$(`#sharedName${i}`).value.trim()):[];
    if(!eventName)return toast("Enter a tournament name.","error");
    if(sharedNames.some(n=>!n))return toast("Enter every player name.","error");
    const user=state.user||await live.signIn();
    const code=await live.createEvent({name:eventName,gameMode:mode,playStyle:style,count,holes:Number($("#holes").value),chaosMode:$("#chaosMode").value,theme:$("#theme").value,beerStops:$("#beerStops").checked,sharedNames},user);
    location.href=style==="shared"?`${baseUrl()}?event=${code}&shared=1`:`${baseUrl()}?event=${code}&team=1`;
  }catch(e){console.error(e);toast(e.message,"error")}
}
function joinLive(){
  const code=$("#joinCode").value.trim().toUpperCase(),slot=Number($("#joinSlot").value),token=$("#joinToken").value.trim();
  if(!code||!slot||!token)return toast("Enter the code, slot and token.","error");
  location.href=`${baseUrl()}?event=${encodeURIComponent(code)}&team=${slot}&token=${encodeURIComponent(token)}`;
}
async function saveRegistration(){
  const t=state.teams.find(x=>x.slot===state.teamSlot);if(!t)return;
  const count=playerCount();const players=Array.from({length:count},(_,i)=>$(`#regPlayer${i}`).value.trim());
  if(players.some(n=>!n))return toast("Enter every player name.","error");
  const name=state.event.gameMode==="singles"?players[0]:$("#regName").value;
  await updateTeam(t.slot,{name,players,ownerUid:state.user.uid});toast("Entry saved.");
}
async function drawNow(){
  const t=ownTeam();if(!t)return;
  if(isDemo()){demo.drawDemo(t.slot);return}
  const c=CHAOS_CARDS[Math.floor(Math.random()*CHAOS_CARDS.length)];
  const counts={...(t.categoryCounts||{})};counts[c[1]]=(counts[c[1]]||0)+1;
  await updateTeam(t.slot,{drawnHole:state.event.hole,card:c,categoryCounts:counts});
  await updateEvent({story:[...(state.event.story||[]),`Hole ${state.event.hole}: ${label(t)} drew ${c[0]}.`],...(isShared()?{sharedRevealSlot:t.slot}:{})});
}
async function continueReveal(){
  const slot=Number(state.event.sharedRevealSlot),last=allDrawn();
  if(last)await updateEvent({sharedRevealSlot:null,sharedPhase:"cards-complete",currentTurnSlot:1});
  else await updateEvent({sharedRevealSlot:null,currentTurnSlot:nextSlot(slot,state.teams.length)});
}
async function submitSharedScore(){
  const t=ownTeam(),score=Number($("#sharedScore").value);if(!score)return toast("Enter a valid score.","error");
  await updateTeam(t.slot,{scoreHole:state.event.hole,score,acceptedHole:state.event.hole,cumulativeScore:(t.cumulativeScore||0)+score,bestHole:t.bestHole==null?score:Math.min(t.bestHole,score),worstHole:t.worstHole==null?score:Math.max(t.worstHole,score)});
  if(t.slot===state.teams.length){await updateEvent({currentScoreSlot:1,story:[...(state.event.story||[]),`All Hole ${state.event.hole} scores confirmed.`]});navigate({screen:"board"})}
  else await updateEvent({currentScoreSlot:nextSlot(t.slot,state.teams.length)});
}
async function submitLiveScore(){
  const t=pairedTeam(),score=Number($("#liveScore").value);if(!score)return toast("Enter a valid score.","error");
  await updateTeam(t.slot,{scoreHole:state.event.hole,score,acceptedHole:state.event.hole,cumulativeScore:(t.cumulativeScore||0)+score,bestHole:t.bestHole==null?score:Math.min(t.bestHole,score),worstHole:t.worstHole==null?score:Math.max(t.worstHole,score)});
  toast("Score submitted.");
  navigate({screen:"board"});
}
async function approve(slot){
  const t=state.teams.find(x=>x.slot===slot);
  const score=t.score||0;await updateTeam(slot,{acceptedHole:state.event.hole,cumulativeScore:(t.cumulativeScore||0)+score,bestHole:t.bestHole==null?score:Math.min(t.bestHole,score),worstHole:t.worstHole==null?score:Math.max(t.worstHole,score)});
}
async function reject(slot){await updateTeam(slot,{scoreHole:0,score:null,acceptedHole:0})}
async function nextHole(){
  if(state.event.hole>=state.event.holes){await updateEvent({awardsOpen:true,status:"finished"});navigate({screen:"awards"});return}
  const n=state.event.hole+1;
  await updateEvent({hole:n,status:"playing",currentTurnSlot:1,currentScoreSlot:1,sharedRevealSlot:null,sharedPhase:isShared()?"drawing":null,story:[...(state.event.story||[]),`Hole ${n} unlocked.`]});
  navigate({screen:"draw"});
}
function renderQr(){
  requestAnimationFrame(()=>{
    const grid=$("#qrGrid");if(!grid||!window.BogeyBanterQR)return;
    grid.innerHTML=state.teams.map(t=>{
      const url=`${baseUrl()}?event=${encodeURIComponent(state.eventCode)}&team=${t.slot}&token=${encodeURIComponent(t.joinToken)}`;
      const src=window.BogeyBanterQR.toDataUrl(url,{size:240,margin:4,dark:"#111",light:"#fff"});
      return `<div class="qr-card"><div class="qr-box"><img src="${src}" alt="Team ${t.slot} QR code"></div><strong>${escapeHtml(label(t)||`Team ${t.slot}`)}</strong></div>`;
    }).join("");
  });
}
function startDemo(){
  clearSubscriptions();demo.createDemo();
  const unsub=demo.subscribeDemo(data=>setState({backend:"demo",mode:"play",eventCode:"DEMO53",teamSlot:1,event:data.event,teams:data.teams,isAdmin:true,screen:"draw"}));
  state.unsubscribers=[unsub];splashDone=true;
}


async function sendFeedback(){
  const type=$("#sendFeedback")?.dataset.type||"bug";
  const title=$("#feedbackTitle")?.value.trim();const body=$("#feedbackBody")?.value.trim();const expected=$("#feedbackExpected")?.value.trim()||"";
  if(!title||!body)return toast("Complete the title and description.","error");
  const payload={type,title,body,expected,version:"7.0 RC1",screen:state.screen,gameMode:state.event?.gameMode||null,playStyle:state.event?.playStyle||null,eventCode:state.eventCode||null,userAgent:navigator.userAgent,platform:navigator.platform||"unknown",viewport:`${innerWidth}x${innerHeight}`};
  try{if(isDemo()){localStorage.setItem(`bb-feedback-${Date.now()}`,JSON.stringify(payload))}else await live.submitFeedback(payload);toast("Thanks — your report was submitted.");navigate({screen:"more"})}catch(e){console.error(e);localStorage.setItem(`bb-feedback-${Date.now()}`,JSON.stringify(payload));toast("Saved on this device. It can be submitted when connected.")}
}
async function clearAppCache(){if(!confirm("Clear cached app files and reload?"))return;const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));location.reload()}
function testQr(){try{const value=window.BogeyBanterQR?.toDataUrl("BOGEY-BANTER-QR-TEST",{size:160,margin:3,dark:"#111",light:"#fff"});if(!value)throw new Error("QR library unavailable");toast("QR generator is working.")}catch(e){toast(`QR test failed: ${e.message}`,"error")}}
async function loadFromUrl(){
  const params=new URLSearchParams(location.search),code=(params.get("event")||"").toUpperCase();
  if(!code)return;
  splashDone=true;
  const user=await live.signIn();
  const slot=Number(params.get("team"))||null,token=params.get("token")||"",shared=params.get("shared")==="1";
  const event=await live.getEvent(code);
  if(!event)return toast("Tournament not found.","error");
  const isAdmin=event.adminUid===user.uid;
  setState({user,mode:"play",backend:"live",eventCode:code,teamSlot:slot,joinToken:token,event,isAdmin,screen:shared||event.playStyle==="shared"?"draw":"lobby"});
  clearSubscriptions();
  state.unsubscribers=live.watchEvent(code,
    e=>e&&setState({event:e,isAdmin:e.adminUid===user.uid}),
    teams=>{
      const requested=teams.find(t=>t.slot===slot);
      if(slot&&token&&requested&&requested.joinToken!==token&&!isAdmin)toast("This team QR code is no longer valid.","error");
      setState({teams});
    }
  );
}
async function boot(){
  render();
  try{const user=await live.signIn();setState({user});await loadFromUrl()}catch(e){console.error(e);toast("Live services are unavailable. Demo Mode still works.","error")}
  if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js").catch(console.error);
}
boot();
