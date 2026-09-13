'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),{instrument,settled}=require('./profile_search_typing');
const readiness=require('./navigation_readiness_contract');
function returningProfile(){
  if(location.origin!=='https://mlwes-hec-test.github.io')return;
  // Synthetic TEST-only returning profile. No real profile or mirror is read.
  if(!localStorage.getItem('healthyEatingCompanionTestAlpha06'))localStorage.setItem('healthyEatingCompanionTestAlpha06',JSON.stringify({version:'0.6.33',completed:true,firstHomeWelcomeShown:true,companion:{enabled:false,configured:false,speechEnabled:false},personal:{givenName:'Navigation fixture'},health:{}}));
  window.__navigationEvents=[];for(const type of ['pointerdown','touchstart','click'])window.addEventListener(type,event=>__navigationEvents.push({type,trusted:event.isTrusted,target:event.target.outerHTML?.slice(0,400)}),true);
  window.__navigationRejections=[];window.addEventListener('unhandledrejection',event=>__navigationRejections.push(String(event.reason?.stack||event.reason)));
}
async function tap(page,selector,destination,report){
  const control=page.locator(selector).first();await control.scrollIntoViewIfNeeded();assert(await control.isEnabled(),selector+' disabled');
  const hit=await control.evaluate(node=>{const box=node.getBoundingClientRect(),target=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return {element:node.outerHTML,hit:target?.outerHTML,uncovered:node===target||node.contains(target),pointerEvents:getComputedStyle(node).pointerEvents};});assert(hit.uncovered,selector+' covered: '+hit.hit);assert.notEqual(hit.pointerEvents,'none');
  const before=await page.evaluate(()=>__navigationEvents.length);await control.tap();await page.locator('#'+destination+'.active').waitFor({state:'visible'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const after=await page.evaluate(before=>({screen:document.querySelector('.screen.active')?.id,events:__navigationEvents.slice(before),focus:document.activeElement?.id,bodyClasses:document.body.className,inert:document.body.inert,bodyPointerEvents:getComputedStyle(document.body).pointerEvents}),before);assert(after.events.some(event=>event.type==='click'&&event.trusted));assert(after.events.some(event=>event.type==='touchstart'&&event.trusted));assert(!after.inert);assert.notEqual(after.bodyPointerEvents,'none');report.actions.push({selector,hit,after});
}
async function run({viewport={width:390,height:844},output=fs.mkdtempSync(path.join(os.tmpdir(),'hec-nav-repaired-'))}={}){
  fs.mkdirSync(output,{recursive:true});const report={...qa.evidence(),viewport,actions:[],pass:false}, {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});let page;
  try{
    const context=await qa.contextFor({newContext:options=>browser.newContext({...options,hasTouch:true,isMobile:true})},viewport,report);await context.addInitScript(returningProfile);await context.addInitScript(instrument);await context.addInitScript(readiness.installReadinessProbe);
    // Hold a real required-core response until the gated state is inspected.
    // This is a deterministic network barrier, never a readiness delay/poll.
    let releaseCore,coreRequested;const coreGate=new Promise(resolve=>{releaseCore=resolve;}),requested=new Promise(resolve=>{coreRequested=resolve;});
    await context.route('**/alpha06.js?g=*',async route=>{coreRequested();await coreGate;await route.fallback();});
    page=await context.newPage();await page.goto(qa.ORIGIN+'/',{waitUntil:'domcontentloaded'});
    try{
      await Promise.race([requested,page.waitForFunction(()=>window.HECRelease?.snapshot().state==='paused').then(()=>{throw Error('Startup failed before required-core barrier');})]);
      report.preReady=await page.evaluate(()=>__navigationReadiness.snapshot());readiness.assertGated(report.preReady);
      assert.equal(await page.locator('#hec-release-status').isVisible(),true);
      assert.equal(await page.locator('#home [data-room="diary"]').isVisible(),false);
      await assert.rejects(page.locator('#home [data-room="diary"]').tap({trial:true,timeout:250}),/Timeout/,'Ordinary navigation must be blocked');
    }finally{releaseCore();}
    report.readiness=[await page.evaluate(readiness.waitForReleaseInPage)];readiness.assertReady(report.readiness[0]);
    assert.deepEqual(report.pageErrors,[],'Returning-profile startup must finish without exceptions');assert(await page.evaluate(()=>!!window.HEC_SEARCH_SESSION_TEST&&!!window.HEC_AU_CATALOGUE_TEST),'Late functional-layer registration must complete');assert.equal(await page.locator('.screen.active').getAttribute('id'),'home');
    for(const [room,dest] of [['diary','food-diary'],['daily-progress','daily-progress'],['shopping-list','shopping-list']]){await tap(page,`#home [data-room="${room}"]`,dest,report);await tap(page,`#${dest} [data-go="home"]`,'home',report);}
    await tap(page,'#home [data-room="database"]','food-library',report);const initialSearch=page.locator('#food-search');await initialSearch.tap();await initialSearch.pressSequentially('Flora',{delay:20});await tap(page,'#clear-food-search','food-library',report);assert.equal(await initialSearch.inputValue(),'');assert.equal(await page.evaluate(()=>HEC_SEARCH_SESSION_TEST.state().rawQuery),'');await tap(page,'#food-library [data-go="home"]','home',report);
    await tap(page,'#home [data-room="database"]','food-library',report);await tap(page,'#food-library [data-hec-back]','home',report);
    await tap(page,'#home [data-room="database"]','food-library',report);const input=page.locator('#food-search');await input.focus();await page.evaluate(()=>__typing.begin());
    await page.evaluate(()=>{const original=window.setTimeout,clear=window.clearTimeout;window.__navigationPreviewGate={pending:[],holding:true};window.setTimeout=(fn,ms,...args)=>{if(ms===120&&__navigationPreviewGate.holding){const work={id:-1-__navigationPreviewGate.pending.length,fn:()=>fn(...args)};__navigationPreviewGate.pending.push(work);return work.id;}return original(fn,ms,...args);};window.clearTimeout=id=>{if(id>=0)clear(id);};});
    await input.pressSequentially('Flora',{delay:20});assert.equal(await input.inputValue(),'Flora');const revision=await page.evaluate(()=>HEC_SEARCH_SESSION_TEST.state().revision);assert(await page.evaluate(()=>__navigationPreviewGate.pending.length>0));
    await tap(page,'#food-library [data-go="home"]','home',report);await tap(page,'#home [data-room="diary"]','food-diary',report);
    assert.equal(await page.evaluate(revision=>HEC_SEARCH_SESSION_TEST.current(revision,'Flora'),revision),false);await page.evaluate(async()=>{__navigationPreviewGate.holding=false;for(const work of __navigationPreviewGate.pending)await work.fn();});await settled(page);assert.equal(await page.locator('.screen.active').getAttribute('id'),'food-diary');assert(await page.locator('#food-live-results').evaluate(n=>n.classList.contains('hidden')));await tap(page,'#food-diary [data-go="home"]','home',report);
    // Hold an actual lazy catalogue completion, then deliver it after navigation.
    await tap(page,'#home [data-room="database"]','food-library',report);await page.evaluate(()=>{const api=HECOpenFoodFactsAU,original=api.search;window.__navigationLate={};api.search=async function(...args){const result=await original.apply(this,args);return new Promise(resolve=>{__navigationLate.ready=true;__navigationLate.release=()=>{api.search=original;resolve(result);};});};});await input.focus();await input.pressSequentially('Flora',{delay:20});await page.waitForFunction(()=>__navigationLate.ready);
    await tap(page,'#food-library [data-hec-back]','home',report);await tap(page,'#home [data-room="diary"]','food-diary',report);await page.evaluate(()=>__navigationLate.release());await settled(page);assert.equal(await page.locator('.screen.active').getAttribute('id'),'food-diary');assert.equal(await page.evaluate(()=>HEC_AU_CATALOGUE_TEST.brandState()),null);await tap(page,'#food-diary [data-go="home"]','home',report);
    await tap(page,'#home [data-room="database"]','food-library',report);await input.focus();await input.pressSequentially('Chiko Roll',{delay:20});await input.press('Enter');await page.locator('[data-universal-result="aussie-chiko-roll"]').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>HEC_SEARCH_SESSION_TEST.state().rawQuery),'Chiko Roll');await tap(page,'#food-library [data-go="home"]','home',report);await tap(page,'#home [data-room="shopping-list"]','shopping-list',report);await tap(page,'#shopping-list [data-go="home"]','home',report);
    report.exposureObservations=await page.evaluate(()=>__navigationReadiness.observations);for(const value of report.exposureObservations)readiness.assertReady(value,{home:false});
    await page.reload({waitUntil:'domcontentloaded'});report.readiness.push(await page.evaluate(readiness.waitForReleaseInPage));readiness.assertReady(report.readiness[1]);assert(await page.evaluate(()=>!!window.HEC_SEARCH_SESSION_TEST));await tap(page,'#home [data-room="diary"]','food-diary',report);await tap(page,'#food-diary [data-go="home"]','home',report);
    for(const value of await page.evaluate(()=>__navigationReadiness.observations))readiness.assertReady(value,{home:false});
    assert.deepEqual(await page.evaluate(()=>__navigationRejections),[]);qa.requireEvidence(report);report.pass=true;return report;
  }catch(error){report.error={message:error.message,stack:error.stack};throw error;}finally{if(page)await page.screenshot({path:path.join(output,'navigation.png'),fullPage:true}).catch(()=>{});await browser.close();fs.writeFileSync(path.join(output,'navigation.json'),JSON.stringify(report,null,2));console.log('Navigation evidence: '+output);}
}
if(require.main===module)run({output:process.argv[2]}).catch(error=>{console.error(error);process.exitCode=1;});module.exports={run,returningProfile,tap};
