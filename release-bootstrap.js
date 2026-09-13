/* Embedded by build_release.js so a legacy worker cannot substitute a stale
 * bootstrap before the release gate exists. This file contains no user data. */
(() => {
  'use strict';
  const release=window.HEC_RELEASE,app=document.getElementById('app'),notice=document.getElementById('hec-release-status');
  const role=location.origin==='https://mlwes-hec-test.github.io'?'test':'my-data';
  const diagnostics={pageGeneration:release.generation,requiredCoreGeneration:null,workerGeneration:null,cacheGeneration:null,role,state:'updating',executed:[],reloads:0,checks:0};
  const coreHash=file=>release.roles[role][file]||release.files[file];
  const assetURL=file=>new URL(file+'?g='+release.generation,location.href).href;
  const integrity=file=>'sha256-'+btoa(coreHash(file).match(/../g).map(byte=>String.fromCharCode(parseInt(byte,16))).join(''));
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let registration=null,started=false,starting=null,reloading=false,lastCheck=0,checking=null,installFailed=false;
  const watchedRegistrations=new WeakSet();
  function status(message,blocked=true,retry=false){
    if(blocked){document.documentElement.removeAttribute('data-hec-ready');app.inert=true;app.hidden=true;diagnostics.state='updating';}
    notice.hidden=false;notice.dataset.blocking=String(blocked);notice.replaceChildren();
    const text=document.createElement('p');text.textContent=message;notice.append(text);
    if(retry){const button=document.createElement('button');button.textContent='Retry update';button.onclick=async()=>{if(!started)return begin();if(app.hidden)await onControllerChange();return checkUpdate(true);};notice.append(button);}
  }
  function paused(){const blocked=!started||app.hidden;status(blocked?'The update could not finish. Connect to the internet and try again. Your saved data remains on this device.':'The update is paused. You can keep using HEC.',blocked,true);if(blocked)diagnostics.state='paused';}
  function workerStatus(worker=navigator.serviceWorker?.controller){
    if(!worker)return Promise.resolve(null);
    return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>done(null),1500);function done(value){clearTimeout(timer);channel.port1.close();resolve(value);}channel.port1.onmessage=event=>done(event.data);try{worker.postMessage({type:'HEC_RELEASE_STATUS'},[channel.port2]);}catch{done(null);}});
  }
  function remember(value){if(value?.ready){diagnostics.workerGeneration=value.generation;diagnostics.cacheGeneration=value.cache;}}
  async function onControllerChange(){
    if(started)status('Updating HEC…');
    const value=await workerStatus();remember(value);
    if(!value?.ready||value.role!==role){if(started)paused();return;}
    if(value.generation===release.generation){if(started){app.hidden=false;app.inert=false;document.documentElement.setAttribute('data-hec-ready','');notice.hidden=true;diagnostics.state='ready';}return;}
    if(!reloading){reloading=true;diagnostics.reloads++;status('Updating HEC…');location.reload();}
  }
  function watchRegistration(reg){
    registration=reg;
    if(watchedRegistrations.has(reg))return;watchedRegistrations.add(reg);
    const watch=()=>{const worker=reg.installing;if(!worker)return;
      if(started)status('An update is being prepared. You can keep using HEC.',false);
      worker.addEventListener('statechange',()=>{if(worker.state==='redundant'){installFailed=true;if(started)paused();}});
    };
    reg.addEventListener('updatefound',watch);watch();
  }
  async function checkUpdate(force=false){
    if(checking||!navigator.onLine||!registration||!force&&Date.now()-lastCheck<60000)return checking;
    lastCheck=Date.now();diagnostics.checks++;
    checking=registration.update().then(()=>true).catch(()=>{if(started)paused();return false;}).finally(()=>{checking=null;});return checking;
  }
  async function coherentWorker(){
    installFailed=false;
    if(!('serviceWorker' in navigator)||!location.protocol.startsWith('http'))return false;
    const current=await workerStatus();remember(current);
    if(current?.ready&&current.role===role&&current.generation===release.generation){
      const reg=await navigator.serviceWorker.getRegistration();if(reg){watchRegistration(reg);void checkUpdate();}return true;
    }
    try{
      const reg=await navigator.serviceWorker.register(`service-worker.js?v=${encodeURIComponent(release.version)}&role=${encodeURIComponent(role)}`,{scope:'./',updateViaCache:'none'});
      watchRegistration(reg);const updated=await checkUpdate(true);if(updated===false&&!reg.installing)throw Error('Update check unavailable');
      const deadline=Date.now()+20000;
      while(Date.now()<deadline){const value=await workerStatus();remember(value);if(value?.ready&&value.role===role){if(value.generation!==release.generation){await onControllerChange();throw Error('Changing page generation');}return true;}if(installFailed||!reg.installing&&!reg.waiting&&reg.active?.state==='redundant')break;await delay(150);}
      throw Error('Core readiness not reached');
    }catch(error){
      // A browser that cannot register a worker may still run a fully verified
      // online document. An existing installed client must keep its gate.
      if(navigator.serviceWorker.controller)throw error;
      return false;
    }
  }
  async function verifyOnlineCore(){
    await Promise.all(Object.keys(release.files).map(async file=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try{const response=await fetch(assetURL(file),{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Core unavailable');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');if(digest!==coreHash(file))throw Error('Core generation mismatch');}finally{clearTimeout(timer);}
    }));
  }
  function load(file,style=false){return new Promise((resolve,reject)=>{
    const node=document.createElement(style?'link':'script');node.integrity=integrity(file);node.crossOrigin='anonymous';
    if(style){node.rel='stylesheet';node.href=assetURL(file);}else node.src=assetURL(file);
    node.onload=()=>{if(!style)diagnostics.executed.push({file,sha256:coreHash(file),generation:release.generation});resolve();};node.onerror=()=>reject(Error('Core asset unavailable: '+file));
    (style?document.head:document.body).append(node);
  });}
  async function boot(){
    status('Updating HEC…');
    if(!await coherentWorker())await verifyOnlineCore();
    diagnostics.requiredCoreGeneration=release.generation;
    let runtimeError=null;const onError=event=>{runtimeError=event.error||Error('Runtime startup failed');};window.addEventListener('error',onError);
    try{
      await load('styles.css',true);
      for(const file of release.runtime){await load(file);if(runtimeError)throw runtimeError;
        if(file==='config.js'){
          const APP=window.HEC_APP,roleOriginSafe=APP?.installationRole===role&&(role!=='test'||APP.expectedOrigin===location.origin);
          if(!roleOriginSafe)throw Error('HEC TEST Safety Lock');
          if(APP.version!==release.version)throw Error('Visible release mismatch');
        }
      }
      if(!window.HECFoodCatalogue?.retailerMembership||!window.HEC_SEARCH_SESSION_TEST||!window.HECRetailerCatalogue?.directory||!window.HECRetailerSource?.register)throw Error('Runtime registrations incomplete');
    }finally{window.removeEventListener('error',onError);}
    const manifest=document.createElement('link');manifest.rel='manifest';manifest.href=assetURL('manifest.webmanifest');document.head.append(manifest);
    started=true;diagnostics.state='ready';app.hidden=false;app.inert=false;document.documentElement.setAttribute('data-hec-ready','');notice.hidden=true;
    navigator.serviceWorker?.controller?.postMessage({type:'HEC_RELEASE_CLIENT_READY',generation:release.generation});
  }
  function begin(){
    if(starting)return starting;
    // A failed script execution cannot be safely replayed in the same global
    // scope. Reload this verified shell on explicit retry, never in a loop.
    if(diagnostics.executed.length){location.reload();return;}
    starting=boot().catch(error=>{diagnostics.failure=String(error.message);paused();}).finally(()=>{starting=null;});return starting;
  }
  window.HECRelease=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(diagnostics)),check:()=>checkUpdate(true)});
  navigator.serviceWorker?.addEventListener('controllerchange',()=>void onControllerChange());
  function foreground(){if(started){if(app.hidden)void onControllerChange();void checkUpdate();}else if(diagnostics.state==='paused')void begin();}
  window.addEventListener('pageshow',foreground);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')foreground();});
  window.addEventListener('online',foreground);
  window.HEC_RELEASE_READY=begin();
})();
