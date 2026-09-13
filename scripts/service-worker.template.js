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
const coreURL=(file,generation=RELEASE.generation)=>new URL(file+'?g='+generation,self.location.href).href;
const expectedHash=file=>RELEASE.roles[INSTALLATION_ROLE][file]||RELEASE.files[file];
const sha=async response=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
async function verifiedFetch(file){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(coreURL(file),{cache:'no-store',signal:controller.signal});if(!response.ok||await sha(response)!==expectedHash(file))throw Error('Incomplete core release: '+file);return response;}
  finally{clearTimeout(timer);}
}
async function ready(cache){return !!await cache.match(READY_URL);}
async function installCore(){
  const cache=await caches.open(CACHE_NAME);if(await ready(cache))return;
  // Nothing may read this generation until the final marker is written. Wait
  // for every writer to finish before removing a failed staging cache.
  const results=await Promise.allSettled(CORE_FILES.map(async file=>{await cache.put(coreURL(file),await verifiedFetch(file));}));
  if(results.some(result=>result.status==='rejected')){await caches.delete(CACHE_NAME);throw Error('Required application download incomplete');}
  await cache.put(READY_URL,new Response(RELEASE.generation));
}
self.addEventListener('install',event=>event.waitUntil(installCore().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  if(!await ready(await caches.open(CACHE_NAME)))throw Error('Core release not ready');
  await self.clients.claim();
})()));
async function pruneUnused(){
  const clients=await self.clients.matchAll({type:'window'});
  if(!clients.length||clients.some(client=>clientGenerations.get(client.id)!==RELEASE.generation))return;
  for(const key of await caches.keys())if(key!==CACHE_NAME&&key!==DATA_CACHE&&(key.startsWith(CACHE_PREFIX+'-')||INSTALLATION_ROLE==='my-data'&&key.startsWith('healthy-eating-companion-alpha-')))await caches.delete(key);
}
self.addEventListener('message',event=>{
  if(event.data?.type==='HEC_RELEASE_STATUS')event.waitUntil((async()=>event.ports[0]?.postMessage({generation:RELEASE.generation,role:INSTALLATION_ROLE,cache:CACHE_NAME,ready:await ready(await caches.open(CACHE_NAME))}))());
  if(event.data?.type==='HEC_RELEASE_CLIENT_READY'&&event.source?.id&&event.data.generation===RELEASE.generation){clientGenerations.set(event.source.id,event.data.generation);event.waitUntil(pruneUnused());}
});
const unavailable=()=>new Response('HEC update is not ready. Please retry while online.',{status:503,headers:{'Content-Type':'text/plain'}});
async function coreResponse(file,generation){
  if(!generation)return unavailable();
  const cache=await caches.open(`${CACHE_PREFIX}-core-${generation}`);
  if(!await ready(cache))return unavailable();
  return await cache.match(coreURL(file,generation))||unavailable();
}
async function navigationResponse(){return coreResponse('index.html',RELEASE.generation);}
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
