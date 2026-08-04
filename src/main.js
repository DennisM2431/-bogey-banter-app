
import { TEAM_NAMES, AWARDS, CHAOS_CARDS } from "./config.js";
import { $, escapeHtml, randomCode, baseUrl, nextSlot, toast } from "./utils.js";
import { state, setState, subscribe, clearSubscriptions } from "./store.js";
import * as live from "./firebase-service.js";
import * as demo from "./demo-service.js";

const app=$("#app");
let splashDone=false;
let renderQueued=false;
let lastAdminAlert="";

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
function allAccepted(){return state.teams.length&&state.teams.every(t=>t.acceptedHole===state.event.hole)}
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
  return `<main class="shell">
    <header class="topbar">
      <div class="brand"><div class="brand-icon">⚑</div><div><strong>BOGEY BANTER</strong><small>THE ULTIMATE SOCIAL GOLF TOURNAMENT APP</small></div></div>
      ${isDemo()?'<span class="demo-ribbon">DEMO MODE</span>':'<span class="version">v6.0</span>'}
    </header>
    <div class="statusbar"><span>${event?`${escapeHtml(event.name)} • ${event.id||state.eventCode}`:"Choose how you want to play"}</span>
      <span class="live-pill"><i></i>${isDemo()?"Local demo":"Live connection ready"}</span></div>
    ${content}
  </main>${event&&nav?bottomNav():""}${adminBanner()}`;
}

function bottomNav(){
  const items=[["lobby","⌂","Lobby"],["draw","◇","Draw"],["score","✎","Score"],["board","♛","Board"],["story","≡","Story"],["awards","★","Awards"],["admin","⚙","Admin"]];
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
    </div>
  </section>`,false);
}

function createScreen(){
  return chrome(`<section class="card"><div class="kicker">TOURNAMENT BUILDER</div><h2>Create your round</h2>
    <div class="form-grid">
      <label class="field wide"><span>Tournament name</span><input id="eventName" value="Jared's Bucks Cup"></label>
      <label class="field"><span>Game mode</span><select id="gameMode"><option value="ambrose4">4-Man Ambrose</option><option value="ambrose2">2-Man Ambrose</option><option value="singles">Singles</option></select></label>
      <label class="field"><span>Play style</span><select id="playStyle"><option value="live">Live devices</option><option value="shared">Shared device</option></select></label>
      <label class="field"><span>Competitors</span><select id="teamCount"></select></label>
      <label class="field"><span>Holes</span><select id="holes"><option value="9">9</option><option value="18" selected>18</option></select></label>
      <label class="field"><span>Chaos deck</span><select id="chaosMode"><option>Normal</option><option selected>Extreme</option></select></label>
      <label class="field"><span>Theme</span><select id="theme"><option>Bucks Weekend</option><option>Classic Golf</option><option>Corporate Day</option></select></label>
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
      ${state.isAdmin&&state.event.status==="lobby"?'<button id="startEvent" class="primary" style="margin-top:12px">Start Tournament</button>':""}
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
function cardMarkup(t){return `<div class="chaos-card"><div><div class="rarity">${escapeHtml(t.card[1])}</div><div class="chaos-title"><span>${escapeHtml(t.card[2])}</span><h2>${escapeHtml(t.card[0])}</h2></div><p>${escapeHtml(t.card[3])}</p></div><div>${escapeHtml(label(t))} • Hole ${state.event.hole}</div></div>`}
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

function board(){
  const ranked=[...state.teams].sort((a,b)=>(a.cumulativeScore||0)-(b.cumulativeScore||0));
  return chrome(`<section class="card"><div class="kicker">LIVE STANDINGS</div><h2>Leaderboard</h2><div class="list">
    ${ranked.map((t,i)=>`<div class="row leader-row"><span class="position">${i+1}</span><span><strong>${escapeHtml(label(t))}</strong><small>Hole ${state.event.hole}</small></span><strong>${t.cumulativeScore||0}</strong></div>`).join("")}
  </div>${isShared()&&allAccepted()?`<button id="nextHole" class="primary" style="margin-top:12px">${state.event.hole>=state.event.holes?"Open Awards":`Start Hole ${state.event.hole+1}`}</button>`:""}</section>`);
}

function story(){
  return chrome(`<section class="card"><div class="kicker">STORY OF THE DAY</div><h2>Round recap</h2><div class="list">${(state.event.story||[]).slice().reverse().map(s=>`<div class="story">${escapeHtml(s)}</div>`).join("")}</div></section>`);
}

function awards(){
  const winners=[...state.teams].sort((a,b)=>(a.cumulativeScore||0)-(b.cumulativeScore||0));
  return chrome(`<section class="card"><div class="kicker">END OF DAY AWARDS</div><h2>${state.event.hole>=state.event.holes?"Awards Ceremony":"Awards Preview"}</h2>
    <div class="list">${AWARDS.map((a,i)=>`<div class="row"><div class="row-head"><strong>${escapeHtml(a)}</strong><span>${escapeHtml(label(winners[i%winners.length]))}</span></div></div>`).join("")}</div>
  </section>`);
}

function admin(){
  if(!state.isAdmin)return chrome(`<section class="card"><h2>Admin access only.</h2></section>`);
  const pending=state.teams.filter(t=>t.scoreHole===state.event.hole&&t.acceptedHole!==state.event.hole);
  return chrome(`<section class="card"><div class="kicker">ADMIN CONTROL</div><h2>Hole ${state.event.hole}</h2>
    <div class="list">${pending.length?pending.map(t=>`<div class="row"><div class="row-head"><strong>${escapeHtml(label(t))}: ${t.score}</strong><span class="badge waiting">Pending</span></div><div class="button-row" style="margin-top:9px"><button class="success approve" data-slot="${t.slot}">Approve</button><button class="danger reject" data-slot="${t.slot}">Reject</button></div></div>`).join(""):"<div class='callout'>No scores waiting for approval.</div>"}</div>
    ${!isShared()&&allAccepted()?'<button id="nextHole" class="primary" style="margin-top:12px">Start Next Hole</button>':""}
  </section>`);
}

function adminBanner(){
  if(!state.event||!state.isAdmin||isShared())return"";
  const p=state.teams.find(t=>t.scoreHole===state.event.hole&&t.acceptedHole!==state.event.hole);
  if(!p)return"";
  return `<aside class="admin-banner"><strong>Score submitted: ${escapeHtml(label(p))} — ${p.score}</strong><div class="button-row"><button class="success approve" data-slot="${p.slot}">Approve</button><button class="danger reject" data-slot="${p.slot}">Reject</button></div></aside>`;
}

function screen(){
  if(state.mode==="home")return home();
  if(state.mode==="create")return createScreen();
  if(state.mode==="join")return joinScreen();
  if(!state.event)return home();
  return ({lobby,draw,score,board,story,awards,admin}[state.screen]||lobby)();
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
    if(action==="back")setState({mode:"home"});
    if(action==="create")setState({mode:"create"});
    if(action==="join")setState({mode:"join"});
    if(action==="demo")startDemo();
  }));
  document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>setState({screen:b.dataset.nav})));
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
  document.querySelectorAll(".approve").forEach(b=>b.addEventListener("click",()=>approve(Number(b.dataset.slot))));
  document.querySelectorAll(".reject").forEach(b=>b.addEventListener("click",()=>reject(Number(b.dataset.slot))));
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
    const mode=$("#gameMode").value,style=$("#playStyle").value,count=Number($("#teamCount").value);
    const sharedNames=mode==="singles"&&style==="shared"?Array.from({length:count},(_,i)=>$(`#sharedName${i}`).value.trim()):[];
    if(sharedNames.some(n=>!n))return toast("Enter every player name.","error");
    const user=state.user||await live.signIn();
    const code=await live.createEvent({name:$("#eventName").value.trim(),gameMode:mode,playStyle:style,count,holes:Number($("#holes").value),chaosMode:$("#chaosMode").value,theme:$("#theme").value,beerStops:$("#beerStops").checked,sharedNames},user);
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
  await updateTeam(t.slot,{drawnHole:state.event.hole,card:c});
  await updateEvent({story:[...(state.event.story||[]),`Hole ${state.event.hole}: ${label(t)} drew ${c[0]}.`],...(isShared()?{sharedRevealSlot:t.slot}:{})});
}
async function continueReveal(){
  const slot=Number(state.event.sharedRevealSlot),last=allDrawn();
  if(last)await updateEvent({sharedRevealSlot:null,sharedPhase:"cards-complete",currentTurnSlot:1});
  else await updateEvent({sharedRevealSlot:null,currentTurnSlot:nextSlot(slot,state.teams.length)});
}
async function submitSharedScore(){
  const t=ownTeam(),score=Number($("#sharedScore").value);if(!score)return toast("Enter a valid score.","error");
  await updateTeam(t.slot,{scoreHole:state.event.hole,score,acceptedHole:state.event.hole,cumulativeScore:(t.cumulativeScore||0)+score});
  if(t.slot===state.teams.length){await updateEvent({currentScoreSlot:1,story:[...(state.event.story||[]),`All Hole ${state.event.hole} scores confirmed.`]});setState({screen:"board"})}
  else await updateEvent({currentScoreSlot:nextSlot(t.slot,state.teams.length)});
}
async function submitLiveScore(){
  const t=pairedTeam(),score=Number($("#liveScore").value);if(!score)return toast("Enter a valid score.","error");
  await updateTeam(t.slot,{scoreHole:state.event.hole,score,acceptedHole:0});toast("Score submitted for admin approval.");
}
async function approve(slot){
  const t=state.teams.find(x=>x.slot===slot);
  await updateTeam(slot,{acceptedHole:state.event.hole,cumulativeScore:(t.cumulativeScore||0)+(t.score||0)});
}
async function reject(slot){await updateTeam(slot,{scoreHole:0,score:null,acceptedHole:0})}
async function nextHole(){
  if(state.event.hole>=state.event.holes){await updateEvent({awardsOpen:true,status:"finished"});setState({screen:"awards"});return}
  const n=state.event.hole+1;
  await updateEvent({hole:n,status:"playing",currentTurnSlot:1,currentScoreSlot:1,sharedRevealSlot:null,sharedPhase:isShared()?"drawing":null,story:[...(state.event.story||[]),`Hole ${n} unlocked.`]});
  setState({screen:"draw"});
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
