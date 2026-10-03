'use strict';
// Local HTTPS only; dedicated disposable synthetic profiles. No publication or
// access to the user's installed browser/PWA storage is performed.
const fs=require('node:fs'),path=require('node:path'),https=require('node:https'),assert=require('node:assert/strict'),cp=require('node:child_process');
const build=require('./build_release'),{browserTools}=require('./audit_physical_form_measures_edge');
const ORIGIN='https://mlwes-hec-test.github.io',PRIOR_SHA='06c4db8e6d047a701b54a863fc75f9780083821b';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function audit(config){
  const out=path.resolve(config.output);fs.mkdirSync(out,{recursive:true});
  const manifest=require('../release-manifest.json'),prior=JSON.parse(fs.readFileSync(path.join(config.prior,'release-manifest.json')));
  const git=file=>cp.execFileSync('git',['-c','safe.directory='+config.priorRepository.replaceAll('\\','/'),'-C',config.priorRepository,'show',PRIOR_SHA+':'+file],{maxBuffer:20e6});
  for(const file of ['service-worker.js','release-manifest.json',...Object.keys(prior.files)]){
    const bytes=fs.readFileSync(path.join(config.prior,file));assert(bytes.equals(git(file)),'Exact v53 bytes: '+file);
    if(prior.files[file])assert.equal(build.hash(bytes),prior.roles.test[file]||prior.files[file],file);
  }
  const {chromium,edge}=browserTools(),pw=require(path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
  const report={pass:false,priorSHA:PRIOR_SHA,priorGeneration:prior.generation,generation:manifest.generation,exactPriorCore:true,platform:'Edge persistent disk profiles, mobile viewport and standalone navigator flag; not native iOS',webkit:{available:fs.existsSync(pw.webkit.executablePath()),executable:pw.webkit.executablePath()},scenarios:[]};
  let context,page,server,served='prior',delayCore=false,scenario;
  const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
  async function launch(name,seed=false,offline=false){
    context=await chromium.launchPersistentContext(path.join(out,name),{executablePath:edge,headless:true,viewport:scenario.viewport,isMobile:true,hasTouch:true,serviceWorkers:'allow',ignoreHTTPSErrors:true,args:['--ignore-certificate-errors','--no-proxy-server','--host-resolver-rules=MAP mlwes-hec-test.github.io 127.0.0.1:'+server.address().port+', MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
    await context.route(url=>url.origin!==ORIGIN,route=>route.abort('blockedbyclient'));
    await context.exposeBinding('__pwaAudit',(_,event)=>scenario.events.push(event));
    await context.addInitScript(seed=>{
      Object.defineProperty(navigator,'standalone',{get:()=>true});
      for(const [target,method] of [[Storage.prototype,'clear'],[Storage.prototype,'removeItem'],[IDBFactory.prototype,'deleteDatabase'],[ServiceWorkerRegistration.prototype,'unregister']]){
        const original=target[method];target[method]=function(...args){window.__pwaAudit({type:'destructive',method});return original.apply(this,args);};
      }
      if(seed&&!localStorage.getItem('healthyEatingCompanionTestAlpha06')){
        localStorage.setItem('healthyEatingCompanionTestAlpha06',JSON.stringify(seed.main));localStorage.setItem('healthyEatingCompanionTestAlpha06Functional',JSON.stringify(seed.ext));
      }
      window.addEventListener('DOMContentLoaded',()=>{let last='';const observe=()=>{const d=window.HECRelease?.snapshot(),app=document.getElementById('app');if(!d)return;const event={type:'state',blocked:app.hidden||app.inert,state:d.state,page:d.pageGeneration,core:d.requiredCoreGeneration,worker:d.workerGeneration},json=JSON.stringify(event);if(last!==json){last=json;window.__pwaAudit(event);}};new MutationObserver(observe).observe(document.body,{subtree:true,attributes:true,childList:true});observe();});
    },seed||null);
    page=context.pages()[0]||await context.newPage();page.on('pageerror',e=>scenario.errors.push(e.message));
    if(offline)await context.setOffline(true);
    await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
  }
  const ready=async generation=>{await page.waitForFunction(g=>window.HECRelease?.snapshot().state==='ready'&&HECRelease.snapshot().pageGeneration===g,generation,{timeout:60000});await page.evaluate(()=>HEC_RELEASE_READY);};
  const state=()=>page.evaluate(()=>({main:JSON.parse(localStorage.getItem(HEC_APP.storageKey)),ext:JSON.parse(localStorage.getItem(HEC_APP.functionalStorageKey))}));
  const snapshot=()=>page.evaluate(async()=>({diag:HECRelease.snapshot(),caches:await caches.keys(),role:HEC_APP.installationRole,controller:navigator.serviceWorker.controller?.state,databases:await indexedDB.databases()}));
  function preserve(before,after){for(const key of ['userId','personal','weightHistory'])assert.deepEqual(after.main[key],before.main[key],key);for(const key of ['customFoods','savedFoodIds','diary'])assert.deepEqual(after.ext[key],before.ext[key],key);assert(after.ext.customFoods[0].captureEvidence.privateServingOverlay);}
  async function close(){await context?.close();context=null;page=null;}
  function coherent(value){assert.equal(value.role,'test');for(const key of ['pageGeneration','requiredCoreGeneration','workerGeneration'])assert.equal(value.diag[key],manifest.generation);assert.equal(value.controller,'activated');assert(value.caches.every(key=>key.startsWith('healthy-eating-companion-test-')));}
  try{
    server=https.createServer({pfx:fs.readFileSync(config.certificate),passphrase:'synthetic-local-only'},async(req,res)=>{
      const file=decodeURIComponent(new URL(req.url,ORIGIN).pathname).slice(1)||'index.html';
      try{assert(!file.includes('..')&&!file.includes('\\'));const generation=served;
        if(generation==='candidate'&&delayCore&&file==='alpha06.js')await pause(3500);
        const actual=generation==='candidate'&&['installation-config.js','manifest.webmanifest'].includes(file)?'deployment/test/'+file:file;
        const bytes=fs.readFileSync(path.join(generation==='prior'?config.prior:build.ROOT,actual));
        res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
      }catch{res.writeHead(404,{'Content-Type':'application/json'});res.end('{}');}
    });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    for(const race of [false,true]){
      const name=race?'delayed-legacy-prune':'normal-upgrade';scenario={name,viewport:{width:race?320:390,height:844},events:[],errors:[]};report.scenarios.push(scenario);served='prior';delayCore=false;
      const fixture=require('../tests/fixtures/my-foods-management').fixture(),food=fixture.ext.customFoods.find(food=>food.id==='custom-current');
      food.captureEvidence={privateServingOverlay:{source:'synthetic-package',servingAmount:12.5,servingUnit:'g',servingCount:1,servingCountUnit:'sachet'}};
      const seed={main:{version:'0.6.33',userId:'synthetic-update',completed:true,firstHomeWelcomeShown:true,companion:{enabled:false,configured:false,speechEnabled:false},personal:{givenName:'Synthetic update fixture'},health:{},weightHistory:[{id:'synthetic-weight',date:'2026-09-19',weight:81}]},ext:{version:'0.6.33',ownerUserId:'synthetic-update',customFoods:[food],savedFoodIds:[food.id],diary:fixture.ext.diary}};
      await launch(name,seed);await ready(prior.generation);scenario.before=await state();
      await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('HEC-synthetic-update-evidence',1);request.onupgradeneeded=()=>request.result.createObjectStore('sentinel');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('sentinel','readwrite');tx.objectStore('sentinel').put('retained','fixture');tx.oncomplete=()=>{db.close();resolve();};};}));
      if(race){
        served='candidate';delayCore=true;
        await page.evaluate(async generation=>{
          const reg=await navigator.serviceWorker.getRegistration(),old=navigator.serviceWorker.controller;
          reg.addEventListener('updatefound',()=>setTimeout(()=>old.postMessage({type:'HEC_RELEASE_CLIENT_READY',generation}),700),{once:true});
          await reg.update();
        },prior.generation);
        await page.waitForFunction(async generation=>(await caches.keys()).includes('healthy-eating-companion-test-core-'+generation),manifest.generation);
        await page.waitForFunction(async generation=>!(await caches.keys()).includes('healthy-eating-companion-test-core-'+generation),manifest.generation);
        scenario.legacyDeletedStaging=true;
        // Reopen the old cached document while the new install is incomplete.
        await page.reload({waitUntil:'domcontentloaded'});
      }else{await close();served='candidate';await launch(name);}
      await ready(manifest.generation);delayCore=false;scenario.after=await state();preserve(scenario.before,scenario.after);coherent(await snapshot());
      await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});await close();await launch(name);await ready(manifest.generation);preserve(scenario.before,await state());
      assert.equal(await page.evaluate(()=>new Promise(resolve=>{const request=indexedDB.open('HEC-synthetic-update-evidence',1);request.onsuccess=()=>{const db=request.result,get=db.transaction('sentinel').objectStore('sentinel').get('fixture');get.onsuccess=()=>{db.close();resolve(get.result);};};})), 'retained');
      await close();await launch(name,false,true);await ready(manifest.generation);preserve(scenario.before,await state());scenario.final=await snapshot();coherent(scenario.final);
      assert.deepEqual(scenario.errors,[]);assert(!scenario.events.some(event=>event.type==='destructive'));
      for(const event of scenario.events.filter(event=>event.type==='state'&&!event.blocked)){assert.equal(event.state,'ready');assert.equal(event.page,event.core);assert.equal(event.page,event.worker);}
      scenario.pass=true;await close();console.log(name+': PASS');
    }
    scenario={name:'fresh-candidate',viewport:{width:390,height:844},events:[],errors:[]};report.scenarios.push(scenario);served='candidate';await launch('fresh-candidate');await ready(manifest.generation);coherent(await snapshot());assert.deepEqual(scenario.errors,[]);scenario.pass=true;await close();
    // Bounded availability check: desktop WebKit is optional and still would
    // not establish physical iOS Home Screen acceptance.
    if(!report.webkit.available)report.webkit.result='Not run: Playwright WebKit executable is not installed.';
    report.pass=true;
  }catch(error){report.failure={message:error.message,stack:error.stack};if(page){report.failureState=await page.evaluate(()=>({text:document.body.innerText,diag:window.HECRelease?.snapshot()})).catch(()=>null);}throw error;}
  finally{await close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));}
  return report;
}
if(require.main===module)audit(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))).then(report=>console.log(JSON.stringify({pass:report.pass,scenarios:report.scenarios.length,webkit:report.webkit}))).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={audit};
