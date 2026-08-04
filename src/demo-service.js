
import { CHAOS_CARDS, DEMO_NAMES } from "./config.js";
import { clone, nextSlot } from "./utils.js";

let demo=null;
let listeners=[];
function emit(){listeners.forEach(fn=>fn(clone(demo)))}

export function createDemo(){
  demo={
    event:{
      id:"DEMO53",name:"Bogey Banter Demo",gameMode:"singles",playStyle:"shared",
      teamCount:4,holes:9,hole:1,status:"playing",beerStops:true,
      currentTurnSlot:1,currentScoreSlot:1,sharedPhase:"drawing",sharedRevealSlot:null,
      breakHole:null,currentVoteSlot:1,
      story:["Demo mode started. Draw a card for each player."],awardsOpen:false
    },
    teams:DEMO_NAMES.map((name,i)=>({
      slot:i+1,name,players:[name],joinToken:"DEMO",ownerUid:"demo",
      drawnHole:0,card:null,bonusCards:[],scoreHole:0,score:null,acceptedHole:0,cumulativeScore:0,categoryCounts:{},bestHole:null,worstHole:null,readyBreakHole:0,votesLocked:false,votes:{}
    }))
  };
  emit();return clone(demo);
}
export function subscribeDemo(fn){listeners.push(fn);fn(clone(demo));return()=>{listeners=listeners.filter(x=>x!==fn)}}
export function updateDemoEvent(patch){Object.assign(demo.event,patch);emit()}
export function updateDemoTeam(slot,patch){Object.assign(demo.teams.find(t=>t.slot===slot),patch);emit()}
export function drawDemo(slot){
  const t=demo.teams.find(x=>x.slot===slot);
  t.card=CHAOS_CARDS[Math.floor(Math.random()*CHAOS_CARDS.length)];
  t.drawnHole=demo.event.hole;
  t.cardPreviewed=true;
  t.categoryCounts=t.categoryCounts||{};
  t.categoryCounts[t.card[1]]=(t.categoryCounts[t.card[1]]||0)+1;
  demo.event.sharedRevealSlot=slot;
  demo.event.story.push(`Hole ${demo.event.hole}: ${t.name} drew ${t.card[0]}.`);
  emit();
}
export function resetDemo(){demo=null;listeners=[]}
