"use strict";

const vm=require("node:vm");

const INSTALLATIONS=Object.freeze({
  "my-data":Object.freeze({
    displayName:"HEC — My Data",shortName:"HEC My Data",manifestId:"/Lifestyle-Companion/index.html",
    iconApple:"assets/app-icons/hec-my-data-180.png",icon192:"assets/app-icons/hec-my-data-192.png",icon512:"assets/app-icons/hec-my-data-512.png",
    themeColor:"#2e6d4d",expectedOrigin:"",storageKey:"healthyEatingCompanionAlpha06",functionalStorageKey:"healthyEatingCompanionAlpha06Functional",
    protectedLibraryKey:"healthyEatingCompanionProtectedLibrary",adminStorageKey:"healthyEatingCompanionAlpha064Admin",resetSessionKey:"healthyEatingCompanionResetReloadPending",
    mirrorDatabaseName:"HEC-Persistent-Mirror",cachePrefix:"healthy-eating-companion-my-data",serviceWorkerScope:"./",
    legacyMainKeys:Object.freeze(["healthyEatingAlpha05","healthyEatingAlpha04"]),legacyFunctionalKeys:Object.freeze(["healthyEatingAlpha05Functional","healthyEatingAlpha04Extensions"])
  }),
  test:Object.freeze({
    displayName:"HEC — TEST",shortName:"HEC TEST",manifestId:"/hec-test",
    iconApple:"assets/app-icons/hec-test-180.png",icon192:"assets/app-icons/hec-test-192.png",icon512:"assets/app-icons/hec-test-512.png",
    themeColor:"#111111",expectedOrigin:"https://mlwes-hec-test.github.io",storageKey:"healthyEatingCompanionTestAlpha06",functionalStorageKey:"healthyEatingCompanionTestAlpha06Functional",
    protectedLibraryKey:"healthyEatingCompanionTestProtectedLibrary",adminStorageKey:"healthyEatingCompanionTestAlpha064Admin",resetSessionKey:"healthyEatingCompanionTestResetReloadPending",
    mirrorDatabaseName:"HEC-TEST-Persistent-Mirror",cachePrefix:"healthy-eating-companion-test",serviceWorkerScope:"./",
    legacyMainKeys:Object.freeze([]),legacyFunctionalKeys:Object.freeze([])
  })
});

function contextFromSources(installationSource,appSource,manifestSource){
  const context={window:{}};
  vm.runInNewContext(installationSource,context);
  vm.runInNewContext(appSource,context);
  return Object.freeze({app:context.window.HEC_APP,manifest:JSON.parse(manifestSource)});
}

function expectedRole(){
  const role=process.env.HEC_EXPECTED_INSTALLATION_ROLE||"my-data";
  if(!Object.hasOwn(INSTALLATIONS,role))throw new Error(`Unsupported HEC_EXPECTED_INSTALLATION_ROLE: ${role}`);
  return role;
}

function assertInstallationContext(assert,context){
  const role=expectedRole(),expected=INSTALLATIONS[role],opposite=INSTALLATIONS[role==="test"?"my-data":"test"],{app,manifest}=context;
  assert.equal(app.installationRole,role,"root installation role matches the declared test context");
  for(const field of ["displayName","shortName","manifestId","iconApple","icon192","icon512","themeColor","expectedOrigin","storageKey","functionalStorageKey","protectedLibraryKey","adminStorageKey","resetSessionKey","mirrorDatabaseName","cachePrefix","serviceWorkerScope"]){
    assert.equal(app[field],expected[field],`${role} ${field}`);
  }
  assert.deepEqual(Array.from(app.legacyMainKeys),Array.from(expected.legacyMainKeys),`${role} legacy main keys`);
  assert.deepEqual(Array.from(app.legacyFunctionalKeys),Array.from(expected.legacyFunctionalKeys),`${role} legacy functional keys`);
  assert.equal(manifest.id,expected.manifestId,`${role} manifest ID`);
  assert.equal(manifest.short_name,expected.shortName,`${role} manifest short name`);
  assert.match(manifest.name,new RegExp(expected.displayName.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")),`${role} manifest name`);
  assert.deepEqual(manifest.icons.map(icon=>String(icon.src).replace(/^\.\//,"")),[expected.icon192,expected.icon512],`${role} manifest icons`);
  for(const field of ["manifestId","storageKey","functionalStorageKey","protectedLibraryKey","adminStorageKey","resetSessionKey","mirrorDatabaseName","cachePrefix"]){
    assert.notEqual(app[field],opposite[field],`${role} must not use the opposite ${field}`);
  }
  return Object.freeze({role,expected});
}

function cacheDeclaration(worker){
  const version=worker.match(/const VERSION = "(\d+\.\d+\.\d+)";/)?.[1];
  const match=worker.match(/const CACHE_NAME = `\$\{CACHE_PREFIX\}-alpha-(\d+)-(\d+)-(\d+)-(v\d+)`;/);
  if(!version||!match)throw new Error("Service-worker versioned cache declaration is missing");
  return Object.freeze({version,releaseSlug:`${match[1]}-${match[2]}-${match[3]}`,revision:match[4]});
}

function assertCacheDeclaration(assert,worker,app){
  const details=cacheDeclaration(worker),requestedRevision=process.env.HEC_EXPECTED_CACHE_REVISION||"";
  assert.equal(details.releaseSlug,details.version.replaceAll(".","-"),"cache release matches the runtime version");
  assert.equal(details.version,app.version,"cache and application versions match");
  assert.equal(app.cachePrefix,INSTALLATIONS[app.installationRole].cachePrefix,"cache prefix belongs to the active installation role");
  assert.match(worker,/const CACHE_PREFIX = INSTALLATION_ROLE === "test" \? "healthy-eating-companion-test" : "healthy-eating-companion-my-data";/);
  if(requestedRevision){assert.match(requestedRevision,/^v\d+$/);assert.equal(details.revision,requestedRevision,"cache revision matches the deployment candidate expectation");}
  return details;
}

async function assertCacheActivation(assert,worker,app){
  const details=assertCacheDeclaration(assert,worker,app),current=`${app.cachePrefix}-alpha-${details.releaseSlug}-${details.revision}`;
  const obsolete=`${app.cachePrefix}-alpha-${details.releaseSlug}-v0`,oppositePrefix=app.installationRole==="test"?INSTALLATIONS["my-data"].cachePrefix:INSTALLATIONS.test.cachePrefix;
  const opposite=`${oppositePrefix}-alpha-${details.releaseSlug}-v999`,legacy="healthy-eating-companion-alpha-0-6-32-v3",unrelated="unrelated-cache";
  const keys=[current,obsolete,opposite,legacy,unrelated],deleted=[],handlers={};let claimed=false;
  const context={URL,Promise,Error,setTimeout:()=>0,caches:{open:async()=>({}),keys:async()=>keys,delete:async key=>{deleted.push(key);return true;}},fetch:async()=>({ok:true,clone(){return this;}}),self:{location:{href:`https://example.test/service-worker.js?role=${app.installationRole}`,origin:"https://example.test"},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{},addEventListener:(type,handler)=>{handlers[type]=handler;}}};
  vm.runInNewContext(worker,context);let activation;handlers.activate({waitUntil:value=>{activation=value;}});await activation;
  assert.deepEqual(deleted,[obsolete,...(app.installationRole==="my-data"?[legacy]:[])],"only obsolete same-role caches are removed");
  assert.equal(deleted.includes(current),false,"current cache is retained");
  assert.equal(deleted.includes(opposite),false,"opposite-role cache is retained");
  assert.equal(deleted.includes(unrelated),false,"unrelated cache is retained");
  assert.equal(claimed,true);
}

module.exports=Object.freeze({contextFromSources,assertInstallationContext,assertCacheDeclaration,assertCacheActivation});
