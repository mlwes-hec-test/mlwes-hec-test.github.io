"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const installation=require("../installation-foundation.js");
const migrations=require("../migrations.js");

const ROOT=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const runtime=read("alpha06.js"),polish=read("alpha064.js"),worker=read("service-worker.js"),html=read("index.html");
function appFor(configFile){
  const context={window:{}};
  vm.runInNewContext(read(configFile),context);
  vm.runInNewContext(read("config.js"),context);
  return context.window.HEC_APP;
}
const MY_DATA=appFor("installation-config.js");
const TEST=appFor("deployment/test/installation-config.js");
const productionStorageKeys=[MY_DATA.storageKey,MY_DATA.functionalStorageKey,MY_DATA.protectedLibraryKey,MY_DATA.adminStorageKey,...MY_DATA.legacyMainKeys,...MY_DATA.legacyFunctionalKeys];
const testStorageKeys=[TEST.storageKey,TEST.functionalStorageKey,TEST.protectedLibraryKey,TEST.adminStorageKey,...TEST.legacyMainKeys,...TEST.legacyFunctionalKeys];

test("1. My Data and TEST storage namespaces do not overlap",()=>{
  assert.equal(MY_DATA.installationRole,"my-data");assert.equal(TEST.installationRole,"test");
  assert.deepEqual(testStorageKeys.filter(key=>productionStorageKeys.includes(key)),[]);
  assert.notEqual(MY_DATA.resetSessionKey,TEST.resetSessionKey);assert.notEqual(MY_DATA.mirrorDatabaseName,TEST.mirrorDatabaseName);assert.notEqual(MY_DATA.cachePrefix,TEST.cachePrefix);
});

test("2. TEST has no automatic My Data or legacy import path",()=>{
  assert.deepEqual(Array.from(TEST.legacyMainKeys),[]);assert.deepEqual(Array.from(TEST.legacyFunctionalKeys),[]);
  assert.match(read("app.js"),/const LEGACY_KEYS = APP\.legacyMainKeys \|\| \[\]/);
  assert.match(runtime,/const LEGACY_EXT_KEYS = APP\.legacyFunctionalKeys \|\| \[\]/);
  assert.match(read("migrations.js"),/Array\.isArray\(app\.legacyMainKeys\)\?app\.legacyMainKeys/);
});

test("3. TEST migration writes only TEST keys even beside production records",()=>{
  const values=new Map(productionStorageKeys.map((key,index)=>[key,JSON.stringify({marker:`my-data-${index}`})]));
  const storage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value))};
  let counter=0;const result=migrations.migrateStorage(storage,TEST,{now:"2026-08-24T00:00:00.000Z",idFactory:prefix=>`${prefix}-${++counter}`});
  assert.deepEqual(Array.from(result.writes).sort(),[TEST.functionalStorageKey,TEST.storageKey].sort());
  productionStorageKeys.forEach((key,index)=>assert.equal(JSON.parse(values.get(key)).marker,`my-data-${index}`,key));
});

test("4. TEST Full Reset removes TEST storage only and is single-shot",async()=>{
  const block=runtime.match(/async function runReset\(mode\)\{[\s\S]*?\n  \}\n  document\.addEventListener/)?.[0]?.replace(/\n  document\.addEventListener$/,'')||"";
  assert.ok(block);
  const removed=[],calls={mirror:0,reload:0},context={Promise,calls,APP:TEST,RESET_RELOAD_SESSION_KEY:TEST.resetSessionKey,RESET_STORAGE_KEYS:installation.resetStorageKeys(TEST,"keep-library"),FULL_RESET_STORAGE_KEYS:installation.resetStorageKeys(TEST,"full"),sessionStorage:{setItem:()=>{}},localStorage:{removeItem:key=>removed.push(key)},location:{origin:TEST.expectedOrigin,reload:()=>{calls.reload++;}},window:{HECInstallation:installation},showActionToast:()=>{throw new Error("unexpected safety lock");}};
  vm.runInNewContext(`let resetInProgress=false;function showResettingState(){resetInProgress=true;}async function allowResettingStateToPaint(){}function saveProtectedLibrary(){}async function clearPersistentMirror(){calls.mirror++;}${block};globalThis.resetApi={runReset};`,context);
  await Promise.all([context.resetApi.runReset("full"),context.resetApi.runReset("full")]);
  assert.deepEqual(removed,Array.from(installation.resetStorageKeys(TEST,"full")));
  assert.equal(removed.some(key=>productionStorageKeys.includes(key)),false);assert.deepEqual(calls,{mirror:1,reload:1});
});

test("5. My Data Full Reset is advanced, phrase-locked and absent from ordinary Settings",()=>{
  assert.match(html,/id="reset-trial" class="danger-button hidden" data-test-reset-control/);
  assert.match(html,/id="my-data-advanced-reset"[^>]*data-my-data-reset-control/);
  assert.match(html,/Type <strong>DELETE MY DATA<\/strong>/);assert.match(runtime,/value\.trim\(\)!=='DELETE MY DATA'/);
  assert.match(runtime,/FINAL WARNING: permanently delete the historical Profile, Diary, weights, activities, My Foods, My Recipes, Shopping, companion and preferences/);
  assert.match(polish,/HEC — My Data can only be permanently cleared from its advanced data deletion controls/);
});

test("6. IndexedDB mirror deletion is role-specific",async()=>{
  assert.equal(MY_DATA.mirrorDatabaseName,"HEC-Persistent-Mirror");assert.equal(TEST.mirrorDatabaseName,"HEC-TEST-Persistent-Mirror");
  assert.match(runtime,/const DB_NAME=APP\.mirrorDatabaseName/);assert.match(polish,/indexedDB\.deleteDatabase\(APP\.mirrorDatabaseName\)/);
  assert.doesNotMatch(polish,/deleteDatabase\(["']HEC-Persistent-Mirror/);
  const block=polish.match(/function deleteOwnedMirror\(\)\{[^\n]+\}/)?.[0]||"";assert.ok(block);
  const deleted=[],context={Promise,APP:TEST,indexedDB:{deleteDatabase:name=>{deleted.push(name);const request={};Promise.resolve().then(()=>request.onsuccess?.());return request;}}};
  vm.runInNewContext(`${block};globalThis.dbApi={deleteOwnedMirror};`,context);await context.dbApi.deleteOwnedMirror();
  assert.deepEqual(deleted,[TEST.mirrorDatabaseName]);assert.equal(deleted.includes(MY_DATA.mirrorDatabaseName),false);
});

async function activatedCaches(role,keys){
  const handlers={},deleted=[];let claimed=false;
  const context={URL,Promise,Error,setTimeout:()=>0,caches:{open:async()=>({}),keys:async()=>keys,delete:async key=>{deleted.push(key);return true;}},fetch:async()=>({ok:true,clone(){return this;}}),self:{location:{href:`https://example.test/service-worker.js?v=0.6.33&role=${role}`,origin:"https://example.test"},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{},addEventListener:(type,handler)=>{handlers[type]=handler;}}};
  vm.runInNewContext(worker,context);let promise;handlers.activate({waitUntil:value=>{promise=value;}});await promise;return{deleted,claimed};
}

test("7. cache deletion is limited to the active role prefix, including legacy My Data shells",async()=>{
  const keys=["healthy-eating-companion-alpha-0-6-22-v1","healthy-eating-companion-alpha-0-6-32-v3","healthy-eating-companion-my-data-alpha-0-6-32-v1","healthy-eating-companion-test-alpha-0-6-32-v1","unrelated-cache"];
  const myData=await activatedCaches("my-data",keys),testRole=await activatedCaches("test",keys);
  assert.deepEqual(myData.deleted,[keys[0],keys[1],keys[2]]);assert.deepEqual(testRole.deleted,[keys[3]]);assert.equal(myData.claimed&&testRole.claimed,true);
  assert.equal(installation.ownsCacheName(TEST,keys[0]),false);assert.equal(installation.ownsCacheName(TEST,keys[1]),false);assert.equal(installation.ownsCacheName(TEST,keys[2]),false);
  assert.doesNotMatch(worker,/localStorage|indexedDB|deleteDatabase/);
});

test("8. service-worker unregistration is limited to the active scope",async()=>{
  const here="https://mlwes-hec-test.github.io/index.html",own={scope:"https://mlwes-hec-test.github.io/"},other={scope:"https://mlwes-hec-test.github.io/another/"};
  assert.equal(installation.ownsServiceWorkerRegistration(TEST,own,here),true);assert.equal(installation.ownsServiceWorkerRegistration(TEST,other,here),false);
  assert.match(polish,/ownsServiceWorkerRegistration\(APP,registration,location\.href\)/);assert.doesNotMatch(polish,/for\(const reg of await navigator\.serviceWorker\.getRegistrations\(\)\)await reg\.unregister/);
  const block=polish.match(/async function clearInstalledData\(includeFounder=true\)\{[\s\S]*?\n\}/)?.[0]||"";assert.ok(block);
  const unregistered=[],cacheDeleted=[],ownRegistration={scope:own.scope,unregister:async()=>{unregistered.push("own");}},otherRegistration={scope:other.scope,unregister:async()=>{unregistered.push("other");}};
  const caches={keys:async()=>["healthy-eating-companion-test-old","healthy-eating-companion-my-data-old"],delete:async key=>{cacheDeleted.push(key);}};
  const context={Promise,APP:TEST,location:{origin:TEST.expectedOrigin,href:here},localStorage:{removeItem:()=>{}},deleteOwnedMirror:async()=>{},caches,window:{HECInstallation:installation,caches},navigator:{serviceWorker:{getRegistrations:async()=>[ownRegistration,otherRegistration]}}};
  vm.runInNewContext(`${block};globalThis.installApi={clearInstalledData};`,context);await context.installApi.clearInstalledData(true);
  assert.deepEqual(unregistered,["own"]);assert.deepEqual(cacheDeleted,["healthy-eating-companion-test-old"]);
});

test("9. My Data and TEST manifests have distinct stable identities",()=>{
  const myManifest=JSON.parse(read("manifest.webmanifest")),testManifest=JSON.parse(read("deployment/test/manifest.webmanifest"));
  assert.equal(myManifest.id,MY_DATA.manifestId);assert.equal(testManifest.id,TEST.manifestId);assert.notEqual(myManifest.id,testManifest.id);
  assert.equal(myManifest.id,"/Lifestyle-Companion/index.html");assert.equal(myManifest.start_url,"./index.html");assert.equal(myManifest.scope,"./");assert.equal(MY_DATA.serviceWorkerScope,"./");
  assert.equal(testManifest.id,"/hec-test");assert.equal(testManifest.start_url,"./index.html");assert.equal(testManifest.scope,"./");assert.equal(TEST.serviceWorkerScope,"./");
  assert.match(html,/<meta name="apple-mobile-web-app-title" content="HEC My Data">/);assert.match(html,/<link rel="manifest" href="manifest\.webmanifest\?v=0\.6\.33">/);
  assert.match(myManifest.name,/HEC — My Data/);assert.match(testManifest.name,/HEC — TEST/);assert.notEqual(myManifest.short_name,testManifest.short_name);
});

test("10. TEST has a distinct manifest icon and permanent in-app banner",()=>{
  const manifest=JSON.parse(read("deployment/test/manifest.webmanifest"));
  assert.equal(manifest.icons.every(icon=>icon.src.includes("hec-test-")&&fs.existsSync(path.join(ROOT,icon.src.replace(/^\.\//,"")))),true);
  assert.match(read("installation-foundation.js"),/hec-test-installation-banner/);assert.match(read("styles.css"),/background:#ffd400[^}]*color:#111/);
  assert.equal(TEST.icon192,"assets/app-icons/hec-test-192.png");assert.match(read("installation-foundation.js"),/link\[rel="apple-touch-icon"\]/);
  assert.match(html,/id="installation-identity"/);assert.match(read("deployment/test/installation-config.js"),/displayName: "HEC — TEST"/);
});

test("11. TEST origin safety assertion rejects any non-approved origin",()=>{
  assert.equal(installation.isOriginSafe(TEST,TEST.expectedOrigin),true);assert.equal(installation.isOriginSafe(TEST,"https://my-data.example"),false);
  assert.throws(()=>installation.assertDestructiveOrigin(TEST,"https://my-data.example"),error=>error.code==="HEC_TEST_ORIGIN_MISMATCH");
  assert.match(html,/HEC TEST Safety Lock/);assert.ok(html.indexOf("roleOriginSafe")<html.indexOf("window.HEC_RELEASE_READY=runtimeFiles.reduce"));
});

test("12. installation role is explicit in runtime and founder diagnostics",()=>{
  assert.equal(MY_DATA.installationRole,"my-data");assert.equal(TEST.installationRole,"test");
  assert.match(html,/id="installation-diagnostics"/);assert.match(read("installation-foundation.js"),/Origin safety/);
  assert.match(polish,/installationRole:APP\.installationRole/);assert.match(read("app.js"),/role=\$\{encodeURIComponent\(APP\.installationRole\)\}/);
});

test("13. existing My Data historical migration remains active and lossless",()=>{
  const fixture=require("./fixtures/alpha-0.6.32-migration-fixtures.js").establishedUser();let counter=0;
  const result=migrations.migrateRecords(fixture.main,fixture.ext,{now:"2026-08-24T00:00:00.000Z",idFactory:prefix=>`${prefix}-dual-${++counter}`});
  assert.equal(result.main.email,fixture.main.email);assert.equal(result.main.weightHistory.length,fixture.main.weightHistory.length);assert.equal(Object.values(result.ext.diary).flat().length,Object.values(fixture.ext.diary).flat().length);assert.equal(result.ext.exercise.length,fixture.ext.exercise.length);assert.equal(result.ext.shopping.length,fixture.ext.shopping.length);
  assert.deepEqual(Array.from(MY_DATA.legacyMainKeys),["healthyEatingAlpha05","healthyEatingAlpha04"]);
});

test("14. My Data refuses a TEST backup while historical unlabelled backups remain compatible",()=>{
  assert.match(polish,/APP\.installationRole==="my-data"&&payload\.installationRole==="test"/);
  assert.match(runtime,/APP\.installationRole==='my-data'&&p\.installationRole==='test'/);
  assert.doesNotMatch(polish,/!payload\.installationRole/);
});

test("15. both roles remain on the one canonical Alpha 0.6.33 source",()=>{
  assert.equal(MY_DATA.version,"0.6.33");assert.equal(TEST.version,"0.6.33");
  assert.equal(read("deployment/test/installation-config.js").includes("version"),false);
  assert.match(read("config.js"),/const version = "0\.6\.33"/);
});
