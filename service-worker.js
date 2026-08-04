const CACHE="bogey-banter-v7-rc1";
const FILES=["./","./index.html","./styles.css","./manifest.json","./firebase-config.js","./qrcode-local.js",
"./src/main.js","./src/config.js","./src/utils.js","./src/store.js","./src/firebase-service.js","./src/demo-service.js",
"./assets/splash-characters-approved.jpeg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));return}
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r})));
});
