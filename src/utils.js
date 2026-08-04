
export const $ = (selector, root=document) => root.querySelector(selector);
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

export function randomCode(length=6){
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join("");
}
export function baseUrl(){ return `${location.origin}${location.pathname}`; }
export function nextSlot(slot,count){ return slot>=count?1:slot+1; }
export function card(){ return null; }
export function toast(message,type="info"){
  const host=document.getElementById("toastHost");
  const el=document.createElement("div");
  el.className=`toast ${type}`;
  el.textContent=message;
  host.appendChild(el);
  setTimeout(()=>el.remove(),3400);
}
export function clone(value){ return JSON.parse(JSON.stringify(value)); }
