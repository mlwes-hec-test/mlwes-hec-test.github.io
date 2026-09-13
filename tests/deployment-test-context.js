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
  const manifest=require('../release-manifest.json');
  if(!worker.includes(manifest.generation))throw Error('Worker generation mismatch');
  return {version:manifest.version,releaseSlug:manifest.version.replaceAll('.','-'),generation:manifest.generation,revision:'core-'+manifest.generation};
}
function assertCacheDeclaration(assert,worker,app){
  const details=cacheDeclaration(worker);assert.equal(details.version,app.version);
  assert.equal(app.cachePrefix,INSTALLATIONS[app.installationRole].cachePrefix);
  assert(worker.includes('CACHE_PREFIX}-core-'));return details;
}
async function assertCacheActivation(assert,worker,app){
  assertCacheDeclaration(assert,worker,app);const w=require('./release-worker-context').workerContext({role:app.installationRole});await w.run('install');
  const obsolete=app.cachePrefix+'-old',opposite=(app.installationRole==='test'?INSTALLATIONS['my-data']:INSTALLATIONS.test).cachePrefix+'-old';
  for(const key of [obsolete,opposite,'unrelated-cache'])await w.cache.open(key);
  await w.run('activate');assert.deepEqual(w.events.deleted,[]);await w.message('HEC_RELEASE_CLIENT_READY');
  assert.deepEqual(w.events.deleted,[obsolete]);assert.equal(w.events.claimed,1);
}

module.exports=Object.freeze({contextFromSources,assertInstallationContext,assertCacheDeclaration,assertCacheActivation});
