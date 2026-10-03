const WORKER_URL = new URL(self.location.href);
const INSTALLATION_ROLE = WORKER_URL.searchParams.get("role") === "test" ? "test" : "my-data";
const CACHE_PREFIX = INSTALLATION_ROLE === "test" ? "healthy-eating-companion-test" : "healthy-eating-companion-my-data";
const CACHE_NAME = `${CACHE_PREFIX}-core-${RELEASE.generation}`;
const DATA_CACHE = `${CACHE_PREFIX}-data-${RELEASE.generation}`;
const VERSION = "0.6.33";
const CORE_FILES = Object.keys(RELEASE.files);
const STATIC_FILES = RELEASE.optional;
const READY_URL = new URL('./__hec_core_ready__',self.location.href).href;
const clientGenerations=new Map();
// Only retire caches that preceded this installation. A running older worker
// must never delete a future worker's staging cache on a late client-ready reply.
let precedingCaches=[],preparing=null;
const coreURL=(file,generation=RELEASE.generation)=>new URL(file+'?g='+generation,self.location.href).href;
const expectedHash=file=>RELEASE.roles[INSTALLATION_ROLE][file]||RELEASE.files[file];
const sha=async response=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
async function verifiedFetch(file){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(coreURL(file),{cache:'no-store',signal:controller.signal});if(!response.ok||await sha(response)!==expectedHash(file))throw Error('Incomplete core release: '+file);return response;}
  finally{clearTimeout(timer);}
}
async function ready(cache,generation=RELEASE.generation){
  const marker=await cache.match(READY_URL);
  if(!marker||await marker.text()!==generation)return false;
  const keys=new Set((await cache.keys()).map(request=>request.url));
  return CORE_FILES.every(file=>keys.has(coreURL(file,generation)));
}
function installCore(){
  if(preparing)return preparing;
  preparing=(async()=>{
    // v53/v54 workers can unlink a staging cache while its writes are pending.
    // Reopen by name after completion and retry once if that happened.
    for(let attempt=0;attempt<2;attempt++){
      const cache=await caches.open(CACHE_NAME);if(await ready(cache))return;
      const results=await Promise.allSettled(CORE_FILES.map(async file=>{
        const cached=await cache.match(coreURL(file));
        if(!cached||await sha(cached)!==expectedHash(file))await cache.put(coreURL(file),await verifiedFetch(file));
      }));
      if(results.some(result=>result.status==='rejected'))throw Error('Required application download incomplete');
      await cache.put(READY_URL,new Response(RELEASE.generation));
      if(await ready(await caches.open(CACHE_NAME)))return;
    }
    throw Error('Core cache completion interrupted');
  })().finally(()=>{preparing=null;});
  return preparing;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  precedingCaches=(await caches.keys()).filter(key=>key!==CACHE_NAME&&key!==DATA_CACHE);
  await installCore();await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await installCore();
  await self.clients.claim();
})()));
async function pruneUnused(){
  const clients=await self.clients.matchAll({type:'window'});
  if(!clients.length||clients.some(client=>clientGenerations.get(client.id)!==RELEASE.generation))return;
  for(const key of precedingCaches)if(key.startsWith(CACHE_PREFIX+'-')||INSTALLATION_ROLE==='my-data'&&key.startsWith('healthy-eating-companion-alpha-'))await caches.delete(key);
}
self.addEventListener('message',event=>{
  if(event.data?.type==='HEC_RELEASE_STATUS')event.waitUntil((async()=>event.ports[0]?.postMessage({generation:RELEASE.generation,role:INSTALLATION_ROLE,cache:CACHE_NAME,ready:await ready(await caches.open(CACHE_NAME))}))());
  if(event.data?.type==='HEC_RELEASE_RESUME')event.waitUntil(installCore().then(()=>self.skipWaiting()).catch(()=>{}));
  if(event.data?.type==='HEC_RELEASE_CLIENT_READY'&&event.source?.id&&event.data.generation===RELEASE.generation){clientGenerations.set(event.source.id,event.data.generation);event.waitUntil(pruneUnused());}
});
const unavailable=()=>new Response('HEC update is not ready. Please retry while online.',{status:503,headers:{'Content-Type':'text/plain'}});
async function coreResponse(file,generation){
  if(!generation)return unavailable();
  const cache=await caches.open(`${CACHE_PREFIX}-core-${generation}`);
  if(!await ready(cache,generation))return unavailable();
  return await cache.match(coreURL(file,generation))||unavailable();
}
async function navigationResponse(){
  try{await installCore();const response=await coreResponse('index.html',RELEASE.generation);if(response.ok)return response;}catch{}
  // This document can advance registration/activation even if the app shell is
  // unavailable. It loads no runtime and never touches application storage.
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HEC update</title>
<style>body{font:18px system-ui;max-width:32rem;margin:12vh auto;padding:24px;background:#f4f7f4;color:#183c2a}button{font:inherit;padding:12px 20px}</style>
<h1>HEC update</h1><p id="status">The update is not ready yet. Check your connection and try again. Your saved data remains on this device.</p><button id="retry">Retry update</button>
<script>
const button=document.getElementById('retry'),status=document.getElementById('status');let running=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(worker){return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>done(null),1500);function done(value){clearTimeout(timer);channel.port1.close();resolve(value);}channel.port1.onmessage=event=>done(event.data);try{worker.postMessage({type:'HEC_RELEASE_STATUS'},[channel.port2]);}catch{done(null);}});}
async function retry(){if(running)return;running=true;button.disabled=true;status.textContent='Finishing the update…';
try{const reg=await navigator.serviceWorker.register(${JSON.stringify(WORKER_URL.href)},{scope:'./',updateViaCache:'none'});void reg.update().catch(()=>{});const sent=new Set(),until=Date.now()+20000;
while(Date.now()<until){for(const worker of [reg.waiting,reg.active])if(worker&&!sent.has(worker)){sent.add(worker);worker.postMessage({type:'HEC_RELEASE_RESUME'});}
const controller=navigator.serviceWorker.controller,value=controller&&await check(controller);
if(value?.ready&&value.role===${JSON.stringify(INSTALLATION_ROLE)}&&controller===navigator.serviceWorker.controller&&controller===reg.active&&controller.state==='activated'&&!reg.installing&&!reg.waiting){location.reload();return;}await pause(150);}
}catch{}finally{running=false;button.disabled=false;status.textContent=navigator.onLine?'The update could not finish downloading or preparing. Check your connection and try again. Your saved data remains on this device.':'You are offline. Connect to the internet and retry. Your saved data remains on this device.';}}
button.onclick=retry;window.addEventListener('online',retry);
<\/script></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
async function cacheFirst(request){
  const cache=await caches.open(DATA_CACHE),cached=await cache.match(request);if(cached)return cached;
  const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;
}
const OFF_CATALOGUE_PATH='/data/open-food-facts-au/';
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  const base=new URL('./',self.location.href).pathname,file=decodeURIComponent(url.pathname.slice(base.length));
  if(!url.pathname.startsWith(base))return;
  if(event.request.mode==='navigate'||event.request.destination==='document'){event.respondWith(navigationResponse());return;}
  if(CORE_FILES.includes(file)){const generation=url.searchParams.get('g')||(!RELEASE.runtime.includes(file)&&file!=='styles.css'?clientGenerations.get(event.clientId)||RELEASE.generation:null);event.respondWith(coreResponse(file,generation));return;}
  // Unknown code is never substituted with a shell or an older same-path file.
  if(event.request.destination==='script'||event.request.destination==='style'){event.respondWith(unavailable());return;}
  if(url.pathname.includes(OFF_CATALOGUE_PATH)){event.respondWith(cacheFirst(event.request));return;}
  event.respondWith(cacheFirst(event.request));
});
