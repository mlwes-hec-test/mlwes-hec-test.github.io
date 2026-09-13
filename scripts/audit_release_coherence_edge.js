'use strict';
const fs=require('node:fs'),path=require('node:path'),https=require('node:https'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const build=require('./build_release'),{browserTools}=require('./audit_physical_form_measures_edge');
const hash=body=>crypto.createHash('sha256').update(body).digest('hex'),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function audit(config){
 const out=path.resolve(config.output);fs.mkdirSync(out,{recursive:true});const {chromium,edge}=browserTools(),candidate=build.ROOT,manifest=require('../release-manifest.json');
 const previousApp=fs.readFileSync(candidate+'/app.js','utf8')+'\n// Synthetic preceding coherent release for lifecycle regression.\n';
 const previous={...build.build(candidate,{'app.js':previousApp}),'app.js':previousApp},previousGeneration=JSON.parse(previous['release-manifest.json']).generation;
 const report={pass:false,started:new Date().toISOString(),generation:manifest.generation,previousGeneration,platform:'Windows Edge persistent disk profiles; mobile viewport, not iOS WebKit',scenarios:[]};
 const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
 let server,context,page,scenario,role='my-data',served='legacy',condition='normal',offline=false,phase='',launch=0;
 const origin=()=>role==='test'?'https://mlwes-hec-test.github.io':'https://lifestyle-companion.github.io';
 const prefix=()=>role==='test'?'/':'/Lifestyle-Companion/';
 const bytes=file=>{const root=served==='legacy'?config[role==='test'?'oldTest':'oldMyData']:candidate;const actual=served!=='legacy'&&role==='test'&&['installation-config.js','manifest.webmanifest'].includes(file)?'deployment/test/'+file:file;return Buffer.from(served==='previous'&&previous[file]!==undefined?previous[file]:fs.readFileSync(path.join(root,actual)));};
 async function launchProfile(name,seed,{isOffline=false}={}){
  launch++;context=await chromium.launchPersistentContext(path.join(out,'profiles',name),{headless:true,executablePath:edge,viewport:scenario.viewport,isMobile:true,hasTouch:true,serviceWorkers:'allow',ignoreHTTPSErrors:true,args:['--ignore-certificate-errors','--no-proxy-server','--host-resolver-rules=MAP '+new URL(origin()).hostname+' 127.0.0.1:'+server.address().port+', MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
  await context.route(url=>url.origin!==origin(),route=>route.abort('blockedbyclient'));
  await context.exposeBinding('__releaseObservation',(_,data)=>scenario.observations.push({phase,launch,at:Date.now(),...data}));
  await context.addInitScript(({seed,role})=>{
   const key=role==='test'?'healthyEatingCompanionTestAlpha06':'healthyEatingCompanionAlpha06';
   if(seed&&!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(seed.main));localStorage.setItem(key+'Functional',JSON.stringify(seed.ext));}
   for(const [object,method] of [[Storage.prototype,'clear'],[Storage.prototype,'removeItem'],[IDBFactory.prototype,'deleteDatabase'],[ServiceWorkerRegistration.prototype,'unregister']]){const original=object[method];object[method]=function(...args){window.__releaseObservation({type:'destructive',method,args});return original.apply(this,args);};}
   window.addEventListener('DOMContentLoaded',()=>{
    let last='';const observe=()=>{const app=document.getElementById('app'),diag=window.HECRelease?.snapshot(),current={blocked:!!app?.hidden||!!app?.inert,diag,text:document.getElementById('hec-release-status')?.innerText,screen:document.querySelector('.screen.active')?.id};const key=JSON.stringify(current);if(key!==last){last=key;window.__releaseObservation({type:'state',...current});}};
    new MutationObserver(observe).observe(document.body,{subtree:true,attributes:true,childList:true});observe();
   });
  },{seed,role});
  page=context.pages()[0]||await context.newPage();page.on('pageerror',error=>scenario.errors.push({phase,message:error.message}));page.on('console',m=>{if(m.type()==='error')scenario.consoleErrors.push({phase,text:m.text(),url:m.location().url});});
  const cdp=await context.newCDPSession(page);await cdp.send('Debugger.enable');
  cdp.on('Debugger.scriptParsed',async event=>{if(!event.url.startsWith(origin()+prefix()))return;const file=new URL(event.url).pathname.slice(prefix().length);if(!manifest.runtime.includes(file))return;try{const source=await cdp.send('Debugger.getScriptSource',{scriptId:event.scriptId});scenario.executed.push({phase,launch,url:event.url,file,hash:hash(Buffer.from(source.scriptSource)),context:event.executionContextId,at:Date.now()});}catch{}});
  if(isOffline)await context.setOffline(true);
  const start=Date.now();await page.goto(origin()+prefix(),{waitUntil:'domcontentloaded',timeout:45000});scenario.navigations.push({phase,launch,at:start,domMs:Date.now()-start});
 }
 async function ready(generation){await page.waitForFunction(g=>g?window.HECRelease?.snapshot().state==='ready'&&HECRelease.snapshot().pageGeneration===g:!!window.HEC_SEARCH_SESSION_TEST,generation||null,{timeout:60000});if(generation)await page.evaluate(()=>HEC_RELEASE_READY);await pause(150);}
 async function snapshot(label){return page.evaluate(async label=>({label,diag:window.HECRelease?.snapshot(),controller:navigator.serviceWorker?.controller?.scriptURL,caches:await caches.keys(),screen:document.querySelector('.screen.active')?.id,intent:window.HECFoodCatalogue?.queryIntent('Woolworths'),query:window.HEC_SEARCH_SESSION_TEST?.state(),directory:window.HECRetailerCatalogue?.directory('woolworths'),storage:Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])),databases:await indexedDB.databases(),overflow:document.documentElement.scrollWidth>innerWidth+1}),label);}
 async function library(){await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));}
 async function search(query){await library();await page.locator('#food-search').fill(query);await page.locator('#submit-food-search').click();await page.waitForFunction(q=>HEC_SEARCH_SESSION_TEST.state().rawQuery===q&&HEC_SEARCH_SESSION_TEST.state().mode==='explicit-committed',query);await pause(400);}
 async function symptom(){await search('Woolworths');assert.equal(await page.locator('[data-retailer-category]').count(),18);assert.equal(await page.evaluate(()=>HECRetailerCatalogue.directory('woolworths').total),43);assert.equal(await page.evaluate(()=>HECFoodCatalogue.queryIntent('Woolworths').kind),'retailer');}
 function preserve(before,after){const key=role==='test'?'healthyEatingCompanionTestAlpha06':'healthyEatingCompanionAlpha06',a=JSON.parse(before.storage[key]),b=JSON.parse(after.storage[key]),ae=JSON.parse(before.storage[key+'Functional']),be=JSON.parse(after.storage[key+'Functional']);assert.equal(b.completed,true);assert.equal(b.personal.givenName,a.personal.givenName);assert.deepEqual(b.weightHistory,a.weightHistory);for(const field of ['diary','customFoods','savedFoodIds','recipes'])assert.deepEqual(be[field],ae[field],field);assert(be.savedFoodIds.includes('custom-current'));assert.equal(after.databases[0].name,role==='test'?'HEC-TEST-Persistent-Mirror':'HEC-Persistent-Mirror');assert(!Object.keys(after.storage).some(k=>role==='test'?/^healthyEatingCompanionAlpha/.test(k):/^healthyEatingCompanionTest/.test(k)));}
 async function close(){await context.close();context=null;await pause(150);}
 try{
 server=https.createServer({pfx:fs.readFileSync(config.certificate),passphrase:'synthetic-local-only'},async(req,res)=>{
  const url=new URL(req.url,origin()),file=url.pathname.startsWith(prefix())?decodeURIComponent(url.pathname.slice(prefix().length))||'index.html':'favicon.ico';
  if(offline){res.destroy();return;}
  const fail=served==='candidate'&&(condition==='core-failure'&&file==='alpha06.js'||condition==='optional-failure'&&file.startsWith('assets/'));
  if(served==='candidate'&&condition==='slow'&&file==='alpha06.js')await pause(5000);
  let body,status;try{assert(!file.includes('..')&&!file.includes('\\'));body=fail?Buffer.from('temporarily unavailable'):bytes(file);status=fail?503:200;}catch{body=Buffer.from('{}');status=404;}
  scenario.requests.push({phase,file,status,served,condition,at:Date.now(),hash:hash(body)});res.writeHead(status,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const cases=[['legacy-mydata-immediate','my-data',375,'normal'],['legacy-test-immediate','test',390,'normal'],['required-failure','my-data',390,'core-failure'],['slow-core','my-data',390,'slow'],['optional-failure','my-data',390,'optional-failure'],['offline-recovery','my-data',390,'offline'],['open-library-update','test',375,'foreground'],['legacy-offline-reopen','my-data',375,'legacy-offline']].filter(row=>!config.only||config.only.includes(row[0]));
 for(const [name,caseRole,width,mode] of cases){
  role=caseRole;served=['offline','foreground'].includes(mode)?'previous':'legacy';condition='normal';offline=false;phase=name+'-old';
  scenario={name,role,mode,viewport:config.viewports?.[name]||{width,height:width===375?812:844},requests:[],observations:[],executed:[],errors:[],consoleErrors:[],navigations:[]};report.scenarios.push(scenario);console.log('Starting '+name);
  const fixture=require('../tests/fixtures/my-foods-management').fixture(),food=fixture.ext.customFoods.find(x=>x.id==='custom-current'),diary=fixture.ext.diary;
  for(const entries of Object.values(diary))for(const entry of entries){entry.createdAt=entry.date+'T00:00:00.000Z';entry.updatedAt=entry.createdAt;}
  const seed={main:{version:'0.6.33',userId:'synthetic-release-'+name,completed:true,firstHomeWelcomeShown:true,companion:{enabled:false,configured:false,speechEnabled:false},personal:{givenName:'Synthetic '+name},health:{},weightHistory:[{id:'synthetic-weight',date:'2026-09-10',weight:81.25}]},ext:{version:'0.6.33',ownerUserId:'synthetic-release-'+name,diary,customFoods:[food],savedFoodIds:[food.id],recipes:[{id:'synthetic-recipe',name:'Retained synthetic recipe',ingredients:[{foodId:food.id,amount:100,unit:'g'}]}]}};
  await launchProfile(name,seed);await ready(served==='previous'?previousGeneration:null);await pause(2800);await symptom();scenario.before=await snapshot('old-used');await page.screenshot({path:path.join(out,name+'-old.png'),fullPage:true});
  if(name==='legacy-mydata-immediate'){const start=Date.now();await page.reload({waitUntil:'domcontentloaded'});await ready();await page.evaluate(()=>HEC_RELEASE_READY);scenario.oldCurrentStartupMs=Date.now()-start;await symptom();}
  if(mode!=='foreground')await close();served='candidate';condition=mode;phase=name+'-candidate';
  if(mode==='offline'||mode==='legacy-offline'){offline=true;await launchProfile(name,null,{isOffline:true});await ready(mode==='offline'?previousGeneration:null);await symptom();scenario.offline=await snapshot('coherent-offline');if(mode==='offline')assert.equal(scenario.offline.diag.pageGeneration,previousGeneration);else assert(!scenario.offline.diag);await page.screenshot({path:path.join(out,name+'-offline.png'),fullPage:true});offline=false;condition='normal';await context.setOffline(false);if(mode==='legacy-offline'){scenario.legacyRecovery='Ordinary navigation after network returns; legacy code has no foreground check';await page.reload({waitUntil:'domcontentloaded'});}}
  else if(mode==='foreground'){scenario.openBeforeUpdate=await snapshot('library-open');console.log('Waiting for the bounded foreground interval');await pause(61000);await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));}
  else {
   await launchProfile(name,null);
   const attempts=Date.now();try{await page.locator('[data-room="database"]').click({timeout:350});scenario.immediateAttempt='usable';}catch{scenario.immediateAttempt='withheld';}
   scenario.immediateMs=Date.now()-attempts;scenario.immediate=await snapshot('immediate');await page.screenshot({path:path.join(out,name+'-updating.png'),fullPage:true});
   if(mode==='core-failure'){
    await page.waitForFunction(()=>window.HECRelease?.snapshot().state==='paused',null,{timeout:40000});scenario.failure=await snapshot('required-core-paused');assert.equal(scenario.failure.diag.executed.length,0);assert.notEqual(scenario.failure.diag.workerGeneration,manifest.generation);assert(!scenario.failure.caches.some(key=>key.endsWith(manifest.generation)));condition='normal';await page.getByRole('button',{name:'Retry update'}).click();
   }
  }
  await ready(manifest.generation);const start=Date.now();await symptom();scenario.searchMs=Date.now()-start;scenario.after=await snapshot('candidate-ready');preserve(scenario.before,scenario.after);assert(!scenario.after.overflow);await page.screenshot({path:path.join(out,name+'-ready.png'),fullPage:true});
  assert.deepEqual(scenario.errors,[]);assert.equal(scenario.observations.filter(x=>x.type==='destructive').length,0);
  assert.equal(scenario.after.diag.requiredCoreGeneration,manifest.generation);assert.equal(scenario.after.diag.workerGeneration,manifest.generation);assert.equal(scenario.after.diag.cacheGeneration,'healthy-eating-companion-'+role+'-core-'+manifest.generation);assert(scenario.after.controller);
  // Real touch navigation on the installed worker path complements the source
  // audit's verified online fallback. Keep returning data and both narrow widths.
  scenario.readyNavigation=[];
  for(const [selector,destination] of [['#food-library [data-go="home"]','home'],['#home [data-room="diary"]','food-diary'],['#food-diary [data-go="home"]','home'],['#home [data-room="database"]','food-library'],['#food-library [data-go="home"]','home']]){
   const control=page.locator(selector).first();await control.scrollIntoViewIfNeeded();await control.tap();await page.locator('#'+destination+'.active').waitFor({state:'visible'});scenario.readyNavigation.push({selector,destination});
  }
  for(const state of scenario.observations.filter(x=>x.type==='state'&&!x.blocked&&x.diag))assert.equal(state.diag.state,'ready','Normal interaction before complete startup');
  const candidateCode=scenario.executed.filter(x=>x.phase===phase);for(const entry of candidateCode){const generation=new URL(entry.url).searchParams.get('g');if(!generation){assert.equal(mode,'legacy-offline');const file=path.join(config.oldMyData,entry.file);assert.equal(entry.hash,hash(fs.readFileSync(file)));continue;}const wanted=generation===previousGeneration&&entry.file==='app.js'?hash(Buffer.from(previousApp)):manifest.roles[role][entry.file]||manifest.files[entry.file];assert.equal(entry.hash,wanted,entry.file+' executed bytes');}
  const candidateLoads=scenario.executed.filter(x=>x.phase===phase&&x.file==='app.js'&&new URL(x.url).searchParams.get('g')===manifest.generation).length;assert.equal(candidateLoads,1,'Repeated candidate reload');
  if(name==='legacy-mydata-immediate'){
   await search('Bread');assert.equal(await page.evaluate(()=>HEC_RETAILER_TEST.state()),null);assert.equal(await page.locator('[data-fc-base]').count(),1);
   await page.locator('[data-fc-base]').click();await page.locator('[data-fc-answer="breadOrigin"][data-fc-value="commercial"]').click();await page.locator('[data-fc-answer="breadSource"][data-fc-value="supermarket"]').click();await page.locator('[data-fc-answer="retailerIdentity"][data-fc-value="woolworths"]').click();await page.locator('[data-universal-result]').first().waitFor();scenario.guided=await page.locator('[data-universal-result]').evaluateAll(nodes=>nodes.map(n=>n.dataset.universalResult));assert(scenario.guided.every(id=>id.startsWith('woolworths-au:')));
   await search('McCain Hash Browns');await page.locator('[data-universal-result="woolworths-au:98299"]').waitFor();scenario.nationalBrand=await page.evaluate(()=>{const food=HEC_CANONICAL_CACHE_TEST.food('woolworths-au:98299');return {brand:food.brand,membership:HECFoodCatalogue.retailerMembership(food,'woolworths').length};});assert.equal(scenario.nationalBrand.brand,'McCain');assert(scenario.nationalBrand.membership);
   await search("Hungry Jack's");await page.locator('[data-rc5-source-category]').first().waitFor();scenario.restaurantCategories=await page.locator('[data-rc5-source-category]').count();
   const currentStart=Date.now();await page.reload({waitUntil:'domcontentloaded'});await ready(manifest.generation);scenario.currentStartupMs=Date.now()-currentStart;scenario.current=await snapshot('already-current-reopen');preserve(scenario.before,scenario.current);
  }
  scenario.pass=true;await close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({name,pass:true,searchMs:scenario.searchMs,currentStartupMs:scenario.currentStartupMs}));
 }
 report.pass=true;
 }catch(error){report.error={message:error.message,stack:error.stack};if(page){report.failurePage=await page.evaluate(()=>({text:document.body.innerText,diag:window.HECRelease?.snapshot()})).catch(()=>null);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}throw error;}
 finally{await context?.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));}
 return report;
}
if(require.main===module)audit(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))).then(report=>console.log(JSON.stringify({pass:report.pass,scenarios:report.scenarios.length}))).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={audit};
