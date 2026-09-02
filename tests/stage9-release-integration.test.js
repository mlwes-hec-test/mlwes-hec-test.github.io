"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const migrations=require("../migrations.js");
const deployment=require("./deployment-test-context.js");

const ROOT=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const exists=relative=>fs.existsSync(path.join(ROOT,relative));
const html=read("index.html"),config=read("config.js"),worker=read("service-worker.js"),runtime=read("alpha06.js"),polish=read("alpha064.js");
const installationContext=deployment.contextFromSources(read("installation-config.js"),config,read("manifest.webmanifest"));
const RELEASE="0.6.33";
const runtimeFiles=vm.runInNewContext(html.match(/const runtimeFiles=(\[[\s\S]*?\n  \]);/)?.[1]||"[]");
const coreFiles=vm.runInNewContext(worker.match(/const CORE_FILES = (\[[\s\S]*?\]);/)?.[1]||"[]",{VERSION:RELEASE});

test("1. HEC_APP remains the one canonical active release authority",()=>{
  const context={window:{}};vm.runInNewContext(read("installation-config.js"),context);vm.runInNewContext(config,context);
  assert.equal(context.window.HEC_APP.version,RELEASE);
  assert.match(config,/const version = "0\.6\.33"/);
  assert.match(read("app.js"),/const APP = window\.HEC_APP;[\s\S]*canonical configuration was not loaded/);
  assert.match(runtime,/const APP = window\.HEC_APP;[\s\S]*canonical configuration was not loaded/);
  assert.doesNotMatch(read("app.js"),/window\.HEC_APP \|\| \{[^}]*version/);
});

test("2. every active visible and static release copy is 0.6.33",()=>{
  assert.match(html,/data-hec-release="0\.6\.33"/);assert.match(html,/Founder Trial Alpha 0\.6\.33/);assert.match(html,/Alpha 0\.6\.33/);
  assert.match(html,/manifest\.webmanifest\?v=0\.6\.33/);assert.match(html,/styles\.css\?v=0\.6\.33/);assert.match(html,/config\.js\?v=0\.6\.33/);
  assert.match(read("manifest.webmanifest"),/Founder Trial Alpha 0\.6\.33/);
  assert.match(worker,/const VERSION = "0\.6\.33"/);deployment.assertCacheDeclaration(assert,worker,installationContext.app);
  assert.doesNotMatch(runtime,/Meal Photos Stay[^"`]*Alpha 0\.6\./);assert.doesNotMatch(runtime,/Private Browsing[^`]*Alpha 0\.6\./);
  assert.match(read("README.txt"),/FOUNDER TRIAL ALPHA 0\.6\.33/);
});

test("3. runtime module diagnostics report the release version",()=>{
  for(const file of ["entity-registry.js","search-foundation.js","food-catalogue.js","guided-branching.js","packaged-foods.js","capture-foundation.js","serving-foundation.js"]){
    assert.match(read(file),/const VERSION='0\.6\.33'/,file);
  }
  assert.match(runtime,/const ALPHA0623_BUILD=ACTIVE_VERSION/);assert.match(runtime,/const ALPHA0624_BUILD=ACTIVE_VERSION/);
  assert.match(runtime,/build:ACTIVE_VERSION/);assert.match(runtime,/ext\.version=ACTIVE_VERSION/);
});

test("4. release assertion blocks runtime loading when an old config is served",()=>{
  assert.match(html,/if\(!expected\|\|actual!==expected\)\{refreshReleaseWorker\(\);return;\}/);
  assert.ok(html.indexOf("actual!==expected")<html.indexOf("window.HEC_RELEASE_READY=runtimeFiles.reduce"));
  assert.match(html,/window\.stop\(\)/);assert.match(html,/service-worker\.js\?v=\$\{encodeURIComponent\(expected\)\}/);
  assert.match(html,/controllerchange/);assert.match(html,/Your saved data is not being changed/);assert.match(html,/&role=\$\{encodeURIComponent\(window\.HEC_APP\?\.installationRole\|\|"my-data"\)\}/);
});

test("5. cache-busting for dynamically loaded runtime files derives from HEC_APP.version",()=>{
  assert.equal(runtimeFiles.length,30);assert.ok(runtimeFiles.includes('food-groups-foundation.js'));assert.ok(runtimeFiles.includes('product-serving-semantics.js'));assert.ok(runtimeFiles.includes('off-catalogue.js'));assert.ok(runtimeFiles.includes('guided-product-resolution.js'));assert.ok(runtimeFiles.includes('kfc-au-catalogue-data.js'));assert.ok(runtimeFiles.includes('kfc-au-catalogue.js'));assert.match(html,/script\.src=`\$\{file\}\?v=\$\{encodeURIComponent\(actual\)\}`/);
  assert.equal(runtimeFiles[0],"installation-foundation.js");
  assert.ok(runtimeFiles.indexOf("migrations.js")<runtimeFiles.indexOf("app.js"));
  assert.ok(runtimeFiles.indexOf("companion-voice-metadata.js")<runtimeFiles.indexOf("companion-voices.js"));
  assert.ok(runtimeFiles.indexOf("entity-registry.js")<runtimeFiles.indexOf("search-foundation.js"));
  assert.ok(runtimeFiles.indexOf("product-serving-semantics.js")<runtimeFiles.indexOf("food-sources.js"));
  assert.ok(runtimeFiles.indexOf("food-sources.js")<runtimeFiles.indexOf("mcdonalds-au-catalogue-data.js"));
  assert.ok(runtimeFiles.indexOf("mcdonalds-au-catalogue-data.js")<runtimeFiles.indexOf("mcdonalds-au-catalogue.js"));
  assert.ok(runtimeFiles.indexOf("mcdonalds-au-catalogue.js")<runtimeFiles.indexOf("kfc-au-catalogue-data.js"));
  assert.ok(runtimeFiles.indexOf("kfc-au-catalogue-data.js")<runtimeFiles.indexOf("kfc-au-catalogue.js"));
  assert.ok(runtimeFiles.indexOf("conversation-foundation.js")<runtimeFiles.indexOf("alpha06.js"));
  assert.ok(runtimeFiles.indexOf("mcdonalds-au-catalogue.js")<runtimeFiles.indexOf("food-catalogue.js"));
  assert.ok(runtimeFiles.indexOf("food-catalogue.js")<runtimeFiles.indexOf("off-catalogue.js"));
  assert.ok(runtimeFiles.indexOf("weight-progress-foundation.js")<runtimeFiles.indexOf("nutrition-trends-foundation.js"));
  assert.ok(runtimeFiles.indexOf("nutrition-trends-foundation.js")<runtimeFiles.indexOf("app.js"));
  assert.ok(runtimeFiles.indexOf("capture-foundation.js")<runtimeFiles.indexOf("alpha06.js"));
});

test("6. service-worker core coverage exactly includes every required runtime module",()=>{
  const coreNames=new Set(coreFiles.map(item=>String(item).replace(/^\.\//,"").split("?")[0]));
  for(const file of ["installation-config.js","config.js",...runtimeFiles,"styles.css","manifest.webmanifest","afcd-release-3.json"])assert.equal(coreNames.has(file),true,file);
  for(const file of coreNames)assert.equal(exists(file),true,file);
  assert.equal(new Set(coreFiles).size,coreFiles.length);
});

test("7. companion authoring sources remain absent and only 48 runtime WebPs ship",()=>{
  assert.equal(exists("assets/companions/source"),false);
  const groups=["assets/companions/runtime/picker","assets/companions/runtime/hero/512","assets/companions/runtime/hero/1024"];
  const counts=groups.map(group=>fs.readdirSync(path.join(ROOT,group)).filter(name=>name.endsWith(".webp")).length);
  assert.deepEqual(counts,[16,16,16]);
  assert.equal(coreFiles.some(file=>String(file).includes("assets/companions/source")),false);
});

test("8. My Data activation removes superseded My Data shells without touching TEST, storage or databases",async()=>{
  const handlers={},deleted=[];let claimed=false;
  const context={URL,Promise,Error,setTimeout:()=>0,caches:{open:async()=>({}),keys:async()=>["healthy-eating-companion-alpha-0-6-22-v1","healthy-eating-companion-alpha-0-6-32-v3","healthy-eating-companion-my-data-alpha-0-6-32-v1","healthy-eating-companion-my-data-alpha-0-6-33-v1","healthy-eating-companion-test-alpha-0-6-32-v1","unrelated-cache"],delete:async key=>{deleted.push(key);return true;}},fetch:async()=>({ok:true,clone(){return this;}}),self:{location:{href:"https://hec.example/service-worker.js?v=0.6.33&role=my-data",origin:"https://hec.example"},clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{},addEventListener:(type,handler)=>{handlers[type]=handler;}}};
  vm.runInNewContext(worker,context);let promise;handlers.activate({waitUntil:value=>{promise=value;}});await promise;
  assert.deepEqual(deleted,["healthy-eating-companion-alpha-0-6-22-v1","healthy-eating-companion-alpha-0-6-32-v3","healthy-eating-companion-my-data-alpha-0-6-32-v1","healthy-eating-companion-my-data-alpha-0-6-33-v1"]);assert.equal(claimed,true);
  assert.doesNotMatch(worker,/localStorage|indexedDB|deleteDatabase/);
});

test("9. a new versioned script request cannot use an old same-path cache entry while online",async()=>{
  const handlers={};let exactChecked=false,ignoreChecked=false;
  const oldResponse={tag:"old",ok:true,clone(){return this;}},newResponse={tag:"new",ok:true,clone(){return this;}};
  const cache={match:async(_request,options)=>{if(options?.ignoreSearch){ignoreChecked=true;return oldResponse;}exactChecked=true;return null;},put:async()=>{}};
  const context={URL,Promise,Error,setTimeout:()=>0,caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},fetch:async()=>newResponse,self:{location:{href:"https://hec.example/service-worker.js",origin:"https://hec.example"},clients:{claim:async()=>{}},skipWaiting:()=>{},addEventListener:(type,handler)=>{handlers[type]=handler;}}};
  vm.runInNewContext(worker,context);let responsePromise;handlers.fetch({request:{method:"GET",url:"https://hec.example/config.js?v=0.6.34",mode:"same-origin",destination:"script"},respondWith:value=>{responsePromise=value;}});
  const response=await responsePromise;assert.equal(response.tag,"new");assert.equal(exactChecked,true);assert.equal(ignoreChecked,false);
});

test("10. the Alpha 0.6.16 profileStart ReferenceError path is removed",()=>{
  assert.match(runtime,/window\.HECMigrations\.repairLegacyProfileStart\(main\)/);
  assert.doesNotMatch(runtime,/!profileStart\|\|x\.date>=profileStart/);
  assert.equal(typeof migrations.repairLegacyProfileStart,"function");
});

test("11. malformed-but-recoverable records remain present while valid records gain identities",()=>{
  let counter=0;const result=migrations.migrateRecords({version:"0.6.12",personal:null,weightHistory:[null,{date:"2025-01-01",weightKg:80,note:"keep"}]},{version:"0.6.12",diary:{"2025-01-01":[null,{name:"Keep",nutrients:null}]},shopping:[null,{item:"Keep"}]},{now:"2026-08-24T00:00:00.000Z",idFactory:prefix=>`${prefix}-${++counter}`});
  assert.equal(result.main.weightHistory.length,2);assert.equal(result.main.weightHistory[0],null);assert.equal(result.main.weightHistory[1].note,"keep");assert.ok(result.main.weightHistory[1].id);
  assert.equal(result.ext.diary["2025-01-01"].length,2);assert.equal(result.ext.diary["2025-01-01"][0],null);assert.equal(result.ext.diary["2025-01-01"][1].nutrients,null);assert.ok(result.ext.diary["2025-01-01"][1].id);
  assert.equal(result.ext.shopping.length,2);assert.equal(result.ext.shopping[0],null);assert.equal(result.ext.shopping[1].item,"Keep");
});

test("12. reset paths retain one owner, repeated-click protection and the exact protected library scope",()=>{
  const resetBlock=runtime.match(/const LIBRARY_BACKUP_KEY[\s\S]*?\/\* ================================================================/)?.[0]||"";
  const protectedBlock=resetBlock.match(/function saveProtectedLibrary\(\)[\s\S]*?function restoreProtectedLibrary/)?.[0]||"";
  assert.match(resetBlock,/if\(resetInProgress\)return/);assert.match(resetBlock,/sessionStorage\.setItem\(RESET_RELOAD_SESSION_KEY,'1'\)/);assert.match(resetBlock,/await clearPersistentMirror\(\)/);
  for(const key of ["customFoods","onlineFoods","savedFoodIds","foodVerification","recipes","mealTemplates"])assert.match(protectedBlock,new RegExp(key));
  assert.doesNotMatch(protectedBlock,/\bdiary\b|\bexercise\b|\bshopping\b|weightHistory/);
  assert.match(resetBlock,/RESET_STORAGE_KEYS = window\.HECInstallation\.resetStorageKeys\(APP,'keep-library'\)/);
  assert.match(resetBlock,/FULL_RESET_STORAGE_KEYS = window\.HECInstallation\.resetStorageKeys\(APP,'full'\)/);
});

test("13. backup and diagnostics metadata derive from the canonical release",()=>{
  assert.match(polish,/const RELEASE_SLUG=APP\.version\.replace/);assert.match(polish,/\$\{INSTALLATION_SLUG\}-alpha-\$\{RELEASE_SLUG\}-backup/);
  assert.match(polish,/format:"HEC-BACKUP-1",version:APP\.version/);assert.match(polish,/App version: \$\{item\.version\}/);
  assert.doesNotMatch(polish,/alpha-0-6-9-(backup|local-insights)/);
  assert.match(runtime,/format:'HEC-BACKUP-1',version:ACTIVE_VERSION/);
});

test("14. blank USDA configuration makes no DEMO_KEY request and leaves local search independent",()=>{
  assert.doesNotMatch(runtime,/DEMO_KEY/);assert.match(runtime,/key=String\(settings\.usdaKey\|\|""\)\.trim\(\);if\(!key\)return \[\]/);
  assert.match(runtime,/Local results are ready/);assert.match(runtime,/finally\{if\(token===onlineSearchToken&&button\)button\.disabled=false/);
  assert.match(runtime,/local Australian foods and other available sources continue without USDA/);
});

test("15. HTML IDs are unique",()=>{
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]),counts=new Map();ids.forEach(id=>counts.set(id,(counts.get(id)||0)+1));
  assert.deepEqual([...counts.entries()].filter(([,count])=>count>1),[]);assert.ok(ids.length>100);
});

test("16. all local static and dynamic entry references resolve",()=>{
  const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match=>match[1]),files=new Set(runtimeFiles);
  refs.forEach(ref=>{if(!/^(?:https?:|data:|mailto:)/.test(ref))files.add(ref.split("?")[0].replace(/^\.\//,""));});
  for(const file of files)assert.equal(exists(file),true,file);
});

test("17. core release forms retain labels and validation accessibility wiring",()=>{
  for(const id of ["dob","height-cm","weight-kg","activity","calculation-sex"])assert.match(html,new RegExp(`id="${id}"[^>]*aria-describedby=`),id);
  for(const id of ["dob-error","height-error","weight-error","activity-error","calculation-sex-error"])assert.match(html,new RegExp(`id="${id}"[^>]*aria-live="polite"`),id);
  assert.match(read("app.js"),/setAttribute\("aria-invalid",message\?"true":"false"\)/);
  assert.match(html,/aria-labelledby="companion-preview-modal-title"/);assert.match(read("app.js"),/companionPreviewMarkup\(companion,"companion-preview-modal-title"\)/);
});

test("18. release documentation filenames are reserved for this candidate",()=>{
  assert.equal(path.basename(path.join(ROOT,"RELEASE_NOTES_ALPHA_0_6_33.txt")),"RELEASE_NOTES_ALPHA_0_6_33.txt");
  assert.equal(path.basename(path.join(ROOT,"HEC_ALPHA_0_6_33_BUILD_AND_TEST_REPORT.md")),"HEC_ALPHA_0_6_33_BUILD_AND_TEST_REPORT.md");
});

test("19. Reset & Keep My Library preserves exactly the protected library fields",()=>{
  const block=runtime.match(/function protectedLibrary\(\)[\s\S]*?function restoreProtectedLibrary\(\)\{[\s\S]*?\n  \}/)?.[0]||"";
  assert.ok(block);
  const values=new Map(),original={customFoods:[{id:"custom-1",name:"Soup"}],onlineFoods:[{id:"saved-1",name:"Saved"},{id:"cache-1",name:"Cache only"}],savedFoodIds:["saved-1"],foodVerification:{"saved-1":{method:"barcode"}},recipes:[{id:"recipe-1",name:"Recipe"}],mealTemplates:[{id:"meal-1",name:"Meal"}],diary:{today:[{id:"entry-1"}]},exercise:[{id:"activity-1"}],shopping:[{id:"shop-1"}]};
  const context={ext:structuredClone(original),ACTIVE_VERSION:RELEASE,LIBRARY_BACKUP_KEY:"protected",clone:structuredClone,localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value))},saveExt:()=>{}};
  vm.runInNewContext(`${block};globalThis.resetApi={saveProtectedLibrary,restoreProtectedLibrary};`,context);
  context.resetApi.saveProtectedLibrary();const payload=JSON.parse(values.get("protected"));
  assert.deepEqual(Object.keys(payload).sort(),["customFoods","foodVerification","mealTemplates","onlineFoods","recipes","savedAt","savedFoodIds","version"].sort());
  assert.deepEqual(payload.onlineFoods.map(food=>food.id),["saved-1"]);assert.equal(payload.version,RELEASE);
  context.ext.customFoods=[];context.ext.onlineFoods=[];context.ext.savedFoodIds=[];context.ext.foodVerification={};context.ext.recipes=[];context.ext.mealTemplates=[];
  context.resetApi.restoreProtectedLibrary();
  assert.equal(JSON.stringify(context.ext.customFoods),JSON.stringify(original.customFoods));assert.equal(JSON.stringify(context.ext.onlineFoods),JSON.stringify([original.onlineFoods[0]]));assert.equal(JSON.stringify(context.ext.recipes),JSON.stringify(original.recipes));assert.equal(JSON.stringify(context.ext.mealTemplates),JSON.stringify(original.mealTemplates));
});

test("20. keep-library and full reset paths are single-shot and clear their exact key sets",async()=>{
  const block=runtime.match(/async function runReset\(mode\)\{[\s\S]*?\n  \}\n  document\.addEventListener/)?.[0]?.replace(/\n  document\.addEventListener$/,'')||"";
  assert.ok(block);
  // Use explicit contexts so the extracted production function owns the same
  // state and dependencies it has in the browser.
  async function run(mode){
    const removed=[],calls={protected:0,mirror:0,reload:0},context={Promise,calls,APP:{installationRole:"my-data",expectedOrigin:""},RESET_RELOAD_SESSION_KEY:"pending",RESET_STORAGE_KEYS:["main","ext","legacy"],FULL_RESET_STORAGE_KEYS:["main","ext","legacy","protected","admin"],sessionStorage:{setItem:()=>{}},localStorage:{removeItem:key=>removed.push(key)},location:{origin:"https://hec.example",reload:()=>{calls.reload++;}},window:{HECInstallation:{assertDestructiveOrigin:()=>true}},showActionToast:()=>{throw new Error("unexpected safety lock");}};
    vm.runInNewContext(`let resetInProgress=false;function showResettingState(){resetInProgress=true;}async function allowResettingStateToPaint(){}function saveProtectedLibrary(){calls.protected++;}async function clearPersistentMirror(){calls.mirror++;}${block};globalThis.resetApi={runReset};`,context);
    await Promise.all([context.resetApi.runReset(mode),context.resetApi.runReset(mode)]);return{removed,calls};
  }
  const keep=await run("keep-library"),full=await run("full");
  assert.deepEqual(keep.removed,["main","ext","legacy"]);assert.deepEqual(keep.calls,{protected:1,mirror:1,reload:1});
  assert.deepEqual(full.removed,["main","ext","legacy","protected","admin"]);assert.deepEqual(full.calls,{protected:0,mirror:1,reload:1});
});

test("21. restored Alpha 0.6.32 backup records migrate without payload loss",()=>{
  const fixture=require("./fixtures/alpha-0.6.32-migration-fixtures.js").establishedUser(),payload={format:"HEC-BACKUP-1",version:"0.6.32",profile:structuredClone(fixture.main),functional:structuredClone(fixture.ext)};
  let count=0;const restored=migrations.migrateRecords(payload.profile,payload.functional,{now:"2026-08-24T00:00:00.000Z",idFactory:prefix=>`${prefix}-restore-${++count}`});
  assert.equal(restored.main.email,payload.profile.email);assert.equal(restored.main.weightHistory.length,payload.profile.weightHistory.length);assert.equal(Object.values(restored.ext.diary).flat().length,Object.values(payload.functional.diary).flat().length);
  assert.equal(restored.ext.exercise.length,payload.functional.exercise.length);assert.equal(restored.ext.shopping.length,payload.functional.shopping.length);assert.equal(restored.ext.customFoods.length,payload.functional.customFoods.length);assert.equal(restored.ext.recipes.length,payload.functional.recipes.length);
  assert.equal(restored.main.companion.voice,payload.profile.companion.voice);assert.equal(restored.main.companion.customName,payload.profile.companion.customName);
});

test("22. static icon-only buttons have accessible names",()=>{
  const unnamed=[];
  for(const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){
    const attributes=match[1],text=match[2].replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
    if(!text&&!/\baria-label="[^"]+"/.test(attributes))unnamed.push(match[0].slice(0,100));
  }
  assert.deepEqual(unnamed,[]);
});

test("23. the inline release loader and manifest both parse",()=>{
  const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);assert.equal(inline.length,1);assert.doesNotThrow(()=>new vm.Script(inline[0]));
  assert.doesNotThrow(()=>JSON.parse(read("manifest.webmanifest")));
});
