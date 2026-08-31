const WORKER_URL = new URL(self.location.href);
const INSTALLATION_ROLE = WORKER_URL.searchParams.get("role") === "test" ? "test" : "my-data";
const CACHE_PREFIX = INSTALLATION_ROLE === "test" ? "healthy-eating-companion-test" : "healthy-eating-companion-my-data";
const CACHE_NAME = `${CACHE_PREFIX}-alpha-0-6-33-v13`;
const VERSION = "0.6.33";
const CORE_FILES = [
  `./index.html`,
  `./styles.css?v=${VERSION}`,
  `./installation-config.js?v=${VERSION}`,
  `./config.js?v=${VERSION}`,
  `./installation-foundation.js?v=${VERSION}`,
  `./migrations.js?v=${VERSION}`,
  `./companions.js?v=${VERSION}`,
  `./companion-artwork.js?v=${VERSION}`,
  `./companion-voice-metadata.js?v=${VERSION}`,
  `./companion-voices.js?v=${VERSION}`,
  `./stage4-foundation.js?v=${VERSION}`,
  `./weight-progress-foundation.js?v=${VERSION}`,
  `./nutrition-trends-foundation.js?v=${VERSION}`,
  `./app.js?v=${VERSION}`,
  `./entity-registry.js?v=${VERSION}`,
  `./search-foundation.js?v=${VERSION}`,
  `./product-serving-semantics.js?v=${VERSION}`,
  `./food-sources.js?v=${VERSION}`,
  `./mcdonalds-au-catalogue-data.js?v=${VERSION}`,
  `./mcdonalds-au-catalogue.js?v=${VERSION}`,
  `./food-catalogue.js?v=${VERSION}`,
  `./guided-branching.js?v=${VERSION}`,
  `./packaged-foods.js?v=${VERSION}`,
  `./capture-foundation.js?v=${VERSION}`,
  `./serving-foundation.js?v=${VERSION}`,
  `./guided-product-resolution.js?v=${VERSION}`,
  `./activity-foundation.js?v=${VERSION}`,
  `./food-groups-foundation.js?v=${VERSION}`,
  `./conversation-foundation.js?v=${VERSION}`,
  `./alpha06.js?v=${VERSION}`,
  `./alpha064.js?v=${VERSION}`,
  `./manifest.webmanifest?v=${VERSION}`,
  "./afcd-release-3.json"
];
const STATIC_FILES = [
  "./assets/app-icons/hec-my-data-180.png",
  "./assets/app-icons/hec-my-data-192.png",
  "./assets/app-icons/hec-my-data-512.png",
  "./assets/app-icons/hec-test-180.png",
  "./assets/app-icons/hec-test-192.png",
  "./assets/app-icons/hec-test-512.png",
  "./assets/companions/runtime/picker/percy-pelican.webp",
  "./assets/companions/runtime/picker/wally-wombat.webp",
  "./assets/companions/runtime/picker/anna-goanna.webp",
  "./assets/companions/runtime/picker/shelly-turtle.webp",
  "./assets/companions/runtime/picker/ruby-ringneck.webp",
  "./assets/companions/runtime/picker/bonnie-bilby.webp",
  "./assets/companions/runtime/picker/skip-kangaroo.webp",
  "./assets/companions/runtime/picker/rusty-dingo.webp",
  "./assets/companions/runtime/picker/gary-galah.webp",
  "./assets/companions/runtime/picker/monty-python.webp",
  "./assets/companions/runtime/picker/chuckles-kookaburra.webp",
  "./assets/companions/runtime/picker/ernie-echidna.webp",
  "./assets/companions/runtime/picker/spike-thorny-devil.webp",
  "./assets/companions/runtime/picker/cassie-cassowary.webp",
  "./assets/companions/runtime/picker/salty-crocodile.webp",
  "./assets/companions/runtime/picker/bushy-koala.webp"
];
const CORE_PATHS = new Set(CORE_FILES.map(x=>new URL(x,self.location.href).pathname));
const COMPANION_HERO_PATH="/assets/companions/runtime/hero/";
const timeout = ms => new Promise((_,reject)=>setTimeout(()=>reject(new Error("network timeout")),ms));

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.allSettled([...CORE_FILES,...STATIC_FILES].map(async url=>{
      try{const response=await Promise.race([fetch(url,{cache:"reload"}),timeout(4500)]);if(response.ok)await cache.put(url,response.clone());}catch{}
    }));
  })());
  self.skipWaiting();
});
const ownsInstallationCache = key => String(key||"").startsWith(`${CACHE_PREFIX}-`)||(INSTALLATION_ROLE==="my-data"&&String(key||"").startsWith("healthy-eating-companion-alpha-"));
self.addEventListener("activate",event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE_NAME&&ownsInstallationCache(key))await caches.delete(key);await self.clients.claim();})());});

async function cachedShell(request){
  const cache=await caches.open(CACHE_NAME);
  const hit=await cache.match(request,{ignoreSearch:true});
  return hit||await cache.match("./index.html",{ignoreSearch:true});
}
async function navigationResponse(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match("./index.html",{ignoreSearch:true});
  try{
    const response=await Promise.race([fetch(request,{cache:"no-store"}),timeout(2200)]);
    if(response.ok){cache.put("./index.html",response.clone()).catch(()=>{});return response;}
  }catch{}
  if(cached)return cached;
  return fetch(request);
}
async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  const network=fetch(request,{cache:"no-store"}).then(response=>{if(response.ok)cache.put(request,response.clone()).catch(()=>{});return response;}).catch(()=>null);
  if(cached){network.catch(()=>{});return cached;}
  const response=await network;if(response)return response;
  const samePathFallback=await cache.match(request,{ignoreSearch:true});
  return samePathFallback||cachedShell(request);
}
async function cacheFirst(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request,{ignoreSearch:true});if(cached)return cached;
  const response=await fetch(request);if(response.ok)cache.put(request,response.clone()).catch(()=>{});return response;
}
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==="navigate"||event.request.destination==="document"){event.respondWith(navigationResponse(event.request));return;}
  if(CORE_PATHS.has(url.pathname)||["script","style","manifest"].includes(event.request.destination)){event.respondWith(staleWhileRevalidate(event.request));return;}
  if(url.pathname.includes(COMPANION_HERO_PATH)){event.respondWith(cacheFirst(event.request));return;}
  event.respondWith(cacheFirst(event.request));
});
