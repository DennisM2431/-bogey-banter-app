
const listeners = new Set();

export const state = {
  mode:"home",
  backend:"live",
  user:null,
  eventCode:"",
  teamSlot:null,
  joinToken:"",
  event:null,
  teams:[],
  isAdmin:false,
  screen:"lobby",
  loading:false,
  error:null,
  unsubscribers:[]
};

export function setState(patch){
  Object.assign(state,patch);
  listeners.forEach(fn=>fn(state));
}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function clearSubscriptions(){
  state.unsubscribers.forEach(fn=>{try{fn()}catch{}});
  state.unsubscribers=[];
}
