'use strict';
const assert=require('node:assert/strict');

// Observe the real bootstrap. A handled startup failure also settles its promise,
// so settlement alone is never evidence of a usable application.
function installReadinessProbe(){
  const snapshot=()=>{
    const app=document.getElementById('app'),notice=document.getElementById('hec-release-status');
    return {diag:window.HECRelease?.snapshot(),generation:window.HEC_RELEASE?.generation,
      runtime:window.HEC_RELEASE?.runtime,files:window.HEC_RELEASE?.files,roles:window.HEC_RELEASE?.roles,
      hidden:!!app?.hidden,inert:!!app?.inert,readyAttribute:document.documentElement.hasAttribute('data-hec-ready'),
      noticeHidden:!!notice?.hidden,screen:document.querySelector('.screen.active')?.id,
      apis:{search:typeof window.HEC_SEARCH_SESSION_TEST?.state==='function',catalogue:typeof window.HEC_AU_CATALOGUE_TEST?.brandState==='function',
        navigate:typeof window.openAlpha05Feature==='function',beforeScreen:typeof window.HECBeforeScreenShow==='function',
        membership:typeof window.HECFoodCatalogue?.retailerMembership==='function',directory:typeof window.HECRetailerCatalogue?.directory==='function',source:typeof window.HECRetailerSource?.register==='function'},
      controller:navigator.serviceWorker?.controller?.scriptURL||null,
      profile:JSON.parse(localStorage.getItem('healthyEatingCompanionTestAlpha06')||'null')};
  };
  window.__navigationReadiness={observations:[],snapshot};
  document.addEventListener('DOMContentLoaded',()=>{
    const probe=window.__navigationReadiness;
    const observe=()=>{const value=snapshot();if(!value.hidden&&!value.inert)probe.observations.push(value);};
    const observer=new MutationObserver(observe);observer.observe(document.documentElement,{subtree:true,attributes:true,childList:true});observe();
    if(!window.HEC_RELEASE_READY||typeof window.HEC_RELEASE_READY.then!=='function')throw Error('Explicit readiness promise missing');
    // Capture AT settlement, not after a later poll could conceal missing APIs.
    probe.completion=window.HEC_RELEASE_READY.then(()=>{const value=snapshot();observe();observer.disconnect();return value;});
  },{once:true});
}
async function waitForReleaseInPage(timeoutMs=30000){
  const completion=window.__navigationReadiness?.completion;
  if(!completion)throw Error('Explicit readiness observation missing');
  let timer;
  try{return await Promise.race([completion,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Explicit readiness never completed')),timeoutMs);})]);}
  finally{clearTimeout(timer);}
}
function assertReady(value,{home=true}={}){
  assert(value?.diag,'Release diagnostics missing');assert.equal(value.diag.state,'ready','Settled readiness is not successful readiness');
  assert(Object.values(value.apis).every(Boolean),'Late functional-layer registration must complete at readiness');
  assert.equal(value.hidden,false);assert.equal(value.inert,false);assert.equal(value.readyAttribute,true);assert.equal(value.noticeHidden,true);
  assert.equal(value.diag.role,'test');assert.equal(value.diag.pageGeneration,value.generation);assert.equal(value.diag.requiredCoreGeneration,value.generation);
  if(value.controller){assert.equal(value.diag.workerGeneration,value.generation);assert.equal(value.diag.cacheGeneration,'healthy-eating-companion-test-core-'+value.generation);}
  else{assert.equal(value.diag.workerGeneration,null);assert.equal(value.diag.cacheGeneration,null);}
  assert.deepEqual(value.diag.executed.map(item=>item.file),value.runtime);
  for(const item of value.diag.executed){assert.equal(item.generation,value.generation);assert.equal(item.sha256,value.roles.test[item.file]||value.files[item.file]);}
  if(home)assert.equal(value.screen,'home');
  assert.equal(value.profile?.completed,true);assert.equal(value.profile?.personal?.givenName,'Navigation fixture');
}
function assertGated(value){
  assert.equal(value.diag.state,'updating');assert.equal(value.hidden,true);assert.equal(value.inert,true);
  assert.equal(value.readyAttribute,false);assert.equal(value.noticeHidden,false);assert.deepEqual(value.diag.executed,[]);
}
module.exports={installReadinessProbe,waitForReleaseInPage,assertReady,assertGated};
