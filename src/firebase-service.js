
import { firebaseConfig } from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,doc,setDoc,getDoc,updateDoc,onSnapshot,collection,writeBatch,serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { randomCode } from "./utils.js";

const firebaseApp=initializeApp(firebaseConfig);
const auth=getAuth(firebaseApp);
const db=getFirestore(firebaseApp);

export async function signIn(){
  if(!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
}

export async function createEvent(settings,user){
  const code=randomCode();
  const shared=settings.playStyle==="shared";
  const event={
    name:settings.name||"Bogey Banter Tournament",
    theme:settings.theme,
    gameMode:settings.gameMode,
    playStyle:settings.playStyle,
    teamCount:settings.count,
    holes:settings.holes,
    chaosMode:settings.chaosMode,
    beerStops:settings.beerStops,
    hole:1,status:shared?"playing":"lobby",
    currentTurnSlot:1,currentScoreSlot:1,
    sharedPhase:shared?"drawing":null,sharedRevealSlot:null,
    adminUid:user.uid,story:[shared?"Shared-device round started.":"Tournament created."],
    awardsOpen:false,awardsFinalised:false,createdAt:serverTimestamp()
  };
  await setDoc(doc(db,"events",code),event);
  const batch=writeBatch(db);
  for(let slot=1;slot<=settings.count;slot++){
    const person=settings.sharedNames?.[slot-1]||"";
    batch.set(doc(db,"events",code,"teams",String(slot)),{
      slot,joinToken:randomCode(12),
      name:settings.gameMode==="singles"?person:"",
      players:settings.gameMode==="singles"?[person]:
        settings.gameMode==="ambrose4"?["","","",""]:["",""],
      ownerUid:shared||slot===1?user.uid:null,
      drawnHole:0,card:null,scoreHole:0,score:null,acceptedHole:0,
      cumulativeScore:0,readyBreakHole:0,votesLocked:false,votes:{}
    });
  }
  await batch.commit();
  return code;
}

export async function getEvent(code){
  const snap=await getDoc(doc(db,"events",code));
  return snap.exists()?{id:code,...snap.data()}:null;
}

export function watchEvent(code,onEvent,onTeams){
  const eventRef=doc(db,"events",code);
  const a=onSnapshot(eventRef,s=>onEvent(s.exists()?{id:code,...s.data()}:null));
  const b=onSnapshot(collection(db,"events",code,"teams"),s=>
    onTeams(s.docs.map(d=>d.data()).sort((x,y)=>x.slot-y.slot))
  );
  return [a,b];
}

export async function updateEvent(code,patch){await updateDoc(doc(db,"events",code),patch)}
export async function updateTeam(code,slot,patch){await updateDoc(doc(db,"events",code,"teams",String(slot)),patch)}
export async function regenerate(code,teams){
  const batch=writeBatch(db);
  teams.forEach(t=>batch.update(doc(db,"events",code,"teams",String(t.slot)),{joinToken:randomCode(12)}));
  await batch.commit();
}
