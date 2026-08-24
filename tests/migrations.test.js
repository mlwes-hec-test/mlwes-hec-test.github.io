"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const migrations=require("../migrations.js");
const weightProgress=require("../weight-progress-foundation.js");
const fixtures=require("./fixtures/alpha-0.6.32-migration-fixtures.js");

const MIGRATION_TIME="2026-08-23T04:00:00.000Z";
function idFactory(){let count=0;return prefix=>`${prefix}-fixture-${String(++count).padStart(3,"0")}`;}
function migrate(fixture,options={}){return migrations.migrateRecords(fixture.main,fixture.ext,{now:MIGRATION_TIME,idFactory:idFactory(),...options});}
function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),keys:()=>[...values.keys()],value:key=>values.get(key)};
}
function assertStableRecords(records,label){
  const ids=records.map(record=>record.id);assert.equal(ids.every(Boolean),true,`${label} IDs`);assert.equal(new Set(ids).size,ids.length,`${label} IDs unique`);
  records.forEach(record=>{assert.ok(record.createdAt,`${label} createdAt`);assert.ok(record.updatedAt,`${label} updatedAt`);});
}
function assertOriginalSubset(actual,expected,pathLabel="record"){
  if(Array.isArray(expected)){
    assert.equal(actual.length,expected.length,`${pathLabel} length`);
    expected.forEach((value,index)=>assertOriginalSubset(actual[index],value,`${pathLabel}[${index}]`));
    return;
  }
  if(expected&&typeof expected==="object"){
    for(const [key,value] of Object.entries(expected)){
      assert.ok(Object.hasOwn(actual,key),`${pathLabel}.${key} retained`);
      assertOriginalSubset(actual[key],value,`${pathLabel}.${key}`);
    }
    return;
  }
  assert.deepEqual(actual,expected,`${pathLabel} retained`);
}

test("canonical Alpha 0.6.33 companion identity foundation is exact",()=>{
  const actual=migrations.CANONICAL_COMPANIONS.map(({id,name,gender})=>[id,name,gender]);
  assert.deepEqual(actual,[
    ["percy-pelican","Percy","male"],["wally-wombat","Wally","male"],["anna-goanna","Anna","female"],
    ["shelly-turtle","Shelly","female"],["ruby-ringneck","Ruby","female"],["bonnie-bilby","Bonnie","female"],
    ["skip-kangaroo","Skip","male"],["rusty-dingo","Rusty","male"],["gary-galah","Gary","male"],
    ["monty-python","Monty","male"],["chuckles-kookaburra","Chuckles","male"],["ernie-echidna","Ernie","male"],
    ["spike-thorny-devil","Spike","male"],["cassie-cassowary","Cassie","female"],
    ["salty-crocodile","Salty","male"],["bushy-koala","Bushy","male"]
  ]);
});

test("the companion picker exposes exactly the 16 approved identities",()=>{
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","companions.js"),"utf8"),context);
  const indexHtml=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
  const actual=Array.from(context.window.HEC_COMPANIONS,companion=>[companion.id,companion.name,companion.gender]);
  const expected=migrations.CANONICAL_COMPANIONS.map(({id,name,gender})=>[id,name,gender]);
  assert.equal(actual.length,16);
  assert.deepEqual(actual.sort((a,b)=>a[0].localeCompare(b[0])),expected.sort((a,b)=>a[0].localeCompare(b[0])));
  assert.equal(actual.some(([id])=>id==="salty-crocodile"),true);
  assert.equal(actual.some(([id])=>id==="bushy-koala"),true);
  assert.equal(actual.some(([id])=>id==="koko-koala"),false);
  assert.match(indexHtml,/Choose from 16 Australian characters\./);
  assert.doesNotMatch(indexHtml,/Choose from 14 Australian characters\./);
});

test("fresh Alpha 0.6.32 user receives schema metadata without an application-version bump",()=>{
  const result=migrate(fixtures.freshUser());
  assert.equal(result.main.version,"0.6.32");assert.equal(result.ext.version,"0.6.32");
  assert.equal(result.main.schemaVersion,1);assert.equal(result.ext.schemaVersion,1);
  assert.match(result.main.userId,/^user-fixture-/);assert.equal(result.main.householdId,null);assert.equal(result.ext.ownerUserId,result.main.userId);
  assert.equal(result.main.personal.surname,"");assert.equal(result.main.schemaMigrationId,migrations.MIGRATION_ID);
});

test("established Alpha 0.6.32 records retain data and receive stable IDs/timestamps",()=>{
  const fixture=fixtures.establishedUser(),before=structuredClone(fixture),result=migrate(fixture),{main,ext}=result;
  const mainWithoutCompanion=structuredClone(before.main);delete mainWithoutCompanion.companion;
  const migratedMainWithoutCompanion=structuredClone(main);delete migratedMainWithoutCompanion.companion;
  assertOriginalSubset(migratedMainWithoutCompanion,mainWithoutCompanion,"main");
  assertOriginalSubset(ext,before.ext,"functional");
  assert.equal(main.email,before.main.email);assert.deepEqual(main.personal,before.main.personal);assert.deepEqual(main.preferences,before.main.preferences);
  assert.equal(main.personal.surname,"Founder");assert.equal(main.weightHistory.length,2);assert.deepEqual(main.weightHistory.map(x=>x.date),before.main.weightHistory.map(x=>x.date));
  assertStableRecords(main.weightHistory,"weight");assert.equal(main.weightHistory[1].id,"weight-existing");assert.equal(main.weightHistory[1].createdAt,fixtures.FIXTURE_TIME);
  const diary=Object.values(ext.diary).flat();assertStableRecords(diary,"Diary");assert.equal(diary[1].id,"entry-existing");
  assertStableRecords(ext.exercise,"activity");assertStableRecords(ext.shopping,"shopping");assertStableRecords(ext.customFoods,"custom food");
  assertStableRecords(ext.onlineFoods,"online food");assertStableRecords(ext.recipes,"recipe");assertStableRecords(ext.mealTemplates,"meal template");
  assert.equal(ext.exercise[0].calories,300);assert.equal(ext.exercise[0].caloriesBurned,300);assert.equal(ext.exercise[0].credit,150);assert.equal(ext.exercise[0].creditedCalories,150);
  assert.equal(ext.exercise[0].creditPolicyAtLog,"50-percent");assert.equal(ext.exercise[0].creditPercentAtLog,50);
  assert.deepEqual(ext.daySettings,before.ext.daySettings);assert.deepEqual(ext.water,before.ext.water);assert.deepEqual(ext.ui,before.ext.ui);
  assert.equal(main.companion.id,"ruby-ringneck");assert.equal(main.companion.customName,"Roo");assert.equal(main.companion.pronunciation,"Roo-dee");assert.equal(main.companion.voice,"Karen");assert.equal(main.companion.voiceStyleId,null);
});

test("earlier Alpha 0.6-family data survives schema and legacy profile-start compatibility paths",()=>{
  const fixture=fixtures.earlierAlphaUser(),before=structuredClone(fixture),result=migrate(fixture);
  migrations.repairLegacyProfileStart(result.main,{today:"2026-08-24"});
  assert.equal(result.main.profileStartedDate,"2026-05-01");
  assert.equal(result.main.health.startingWeightDate,"2026-05-01");
  assert.equal(result.main.weightHistory.length,before.main.weightHistory.length);
  assert.equal(Object.values(result.ext.diary).flat().length,Object.values(before.ext.diary).flat().length);
  assert.deepEqual(result.ext.diary["2026-05-09"][0].nutrients,before.ext.diary["2026-05-09"][0].nutrients);
  assert.deepEqual(result.ext.diary["2026-05-09"][0].foodSnapshot,before.ext.diary["2026-05-09"][0].foodSnapshot);
  assert.equal(result.ext.exercise.length,1);assert.equal(result.ext.exercise[0].calories,200);assert.equal(result.ext.exercise[0].credit,100);assert.equal(result.ext.exercise[0].creditPercentAtLog,50);
  assert.deepEqual(result.ext.shopping.map(x=>x.item),before.ext.shopping.map(x=>x.item));
  assert.deepEqual(result.ext.customFoods.map(x=>x.name),before.ext.customFoods.map(x=>x.name));
  assert.deepEqual(result.ext.recipes.map(x=>x.name),before.ext.recipes.map(x=>x.name));
  assert.deepEqual(result.ext.mealTemplates.map(x=>x.name),before.ext.mealTemplates.map(x=>x.name));
  assert.deepEqual(result.main.preferences,before.main.preferences);assert.deepEqual(result.ext.daySettings,before.ext.daySettings);
  assert.equal(result.main.companion.id,"bushy-koala");assert.equal(result.main.companion.customName,"K");assert.equal(result.main.companion.pronunciation,"Kay");
  assert.equal(result.main.companion.voice,"Legacy Exact Voice");assert.equal(result.main.companion.voiceStyleId,"gentle-steady");
  assert.equal(weightProgress.effectiveRecords(result.main.weightHistory,{today:"2026-08-24"}).filter(x=>x.date==="2026-05-10").length,1);
  for(const collection of [result.main.weightHistory,Object.values(result.ext.diary).flat(),result.ext.exercise,result.ext.shopping,result.ext.customFoods,result.ext.recipes,result.ext.mealTemplates])assert.equal(collection.every(record=>record.id),true);
});

test("legacy profile-start repair is warning-free, idempotent and preserves pre-profile history",()=>{
  const main={personal:{activeTimeZone:"Australia/Brisbane"},health:{},weightHistory:[
    {id:"old",date:"2026-04-01",weightKg:92,note:"Historical Test Entry"},
    {id:"start",date:"2026-05-01",weightKg:90,note:"Starting Weight",isStartingWeight:true},
    {id:"later",date:"2026-05-15",weightKg:89,note:"Starting Weight",isStartingWeight:true}
  ]};
  const first=migrations.repairLegacyProfileStart(structuredClone(main),{today:"2026-08-24"}),snapshot=structuredClone(first);
  const second=migrations.repairLegacyProfileStart(first,{today:"2026-09-01"});
  assert.deepEqual(second,snapshot);assert.equal(second.profileStartedDate,"2026-05-15");assert.equal(second.health.startingWeightDate,"2026-05-15");
  assert.deepEqual(second.weightHistory.find(x=>x.id==="old"),main.weightHistory[0]);
  assert.equal(second.weightHistory.find(x=>x.id==="later").isStartingWeight,true);
});

for(const [oldId,oldName,newId,newName] of [
  ["rowdy-ringneck","Rowdy","ruby-ringneck","Ruby"],
  ["barnaby-bilby","Barnaby","bonnie-bilby","Bonnie"],
  ["clancy-cassowary","Clancy","cassie-cassowary","Cassie"]
])test(`${oldName} migrates to ${newName} without losing companion preferences`,()=>{
  const result=migrate(fixtures.companionUser(oldId,oldName));
  assert.equal(result.main.companion.id,newId);assert.equal(result.main.companion.name,newName);assert.equal(result.main.companion.customName,"Mate");
  assert.equal(result.main.companion.pronunciation,"Mayt");assert.equal(result.main.companion.voice,"Exact Device Voice");assert.equal(result.main.companion.speechEnabled,false);
  assert.equal(result.main.companion.needsReselection,false);assert.equal(result.main.companion.legacyIdentity.id,oldId);
});

test("Salty remains selected and active, including after superseded reselection state",()=>{
  const before=fixtures.companionUser("salty-crocodile","Salty",{voiceStyleId:"salty-exact",guidanceDetail:"concise"});
  before.main.companion.needsReselection=true;before.main.companion.selectionStatus="legacy-needs-reselection";
  before.main.migrationState={companionReselection:{required:true,legacyCompanionId:"salty-crocodile",reason:"legacy-companion-retired",requestedAt:MIGRATION_TIME},unrelatedState:"keep"};
  const result=migrate(before),companion=result.main.companion;
  assert.equal(companion.id,"salty-crocodile");assert.equal(companion.name,"Salty");assert.equal(companion.customName,"Mate");
  assert.equal(companion.pronunciation,"Mayt");assert.equal(companion.voice,"Exact Device Voice");assert.equal(companion.voiceStyleId,"salty-exact");
  assert.equal(companion.speechEnabled,false);assert.equal(companion.guidanceDetail,"concise");
  assert.equal(companion.needsReselection,false);assert.equal(companion.selectionStatus,"active");
  assert.equal(Object.hasOwn(result.main.migrationState,"companionReselection"),false);assert.equal(result.main.migrationState.unrelatedState,"keep");
});

test("Koko migrates idempotently to Bushy without losing companion preferences",()=>{
  const before=fixtures.companionUser("koko-koala","Koko",{voiceStyleId:"koko-exact",guidanceDetail:"gentle",preferredGreeting:"Morning"});
  before.main.companion.needsReselection=true;before.main.companion.selectionStatus="legacy-needs-reselection";
  before.main.migrationState={companionReselection:{required:true,legacyCompanionId:"koko-koala",reason:"legacy-companion-retired",requestedAt:MIGRATION_TIME}};
  const first=migrate(before),companion=first.main.companion;
  assert.equal(companion.id,"bushy-koala");assert.equal(companion.name,"Bushy");assert.equal(companion.customName,"Mate");
  assert.equal(companion.pronunciation,"Mayt");assert.equal(companion.voice,"Exact Device Voice");assert.equal(companion.voiceStyleId,"koko-exact");
  assert.equal(companion.speechEnabled,false);assert.equal(companion.guidanceDetail,"gentle");assert.equal(companion.preferredGreeting,"Morning");
  assert.equal(companion.needsReselection,false);assert.equal(companion.selectionStatus,"active");
  assert.deepEqual(companion.legacyIdentity,{id:"koko-koala",name:"Koko",migratedAt:MIGRATION_TIME});
  assert.equal(Object.hasOwn(first.main,"migrationState"),false);
  const second=migrations.migrateRecords(first.main,first.ext,{now:"2026-09-01T00:00:00.000Z",idFactory:prefix=>{throw new Error(`unexpected ID for ${prefix}`);}});
  assert.deepEqual(second,first);
});

test("no approved companion is flagged for reselection",()=>{
  for(const approved of migrations.CANONICAL_COMPANIONS){
    const before=fixtures.companionUser(approved.id,approved.name);
    before.main.migrationState={companionReselection:{required:true,legacyCompanionId:approved.id,reason:"legacy-companion-retired",requestedAt:MIGRATION_TIME}};
    const result=migrate(before);
    assert.equal(result.main.companion.id,approved.id,approved.name);
    assert.equal(result.main.companion.needsReselection,false,approved.name);
    assert.equal(result.main.companion.selectionStatus,"active",approved.name);
    assert.equal(Object.hasOwn(result.main,"migrationState"),false,approved.name);
  }
});

test("unknown companion IDs are preserved and never become Percy",()=>{
  const result=migrate(fixtures.companionUser("future-bird","Percy"));
  assert.equal(result.main.companion.id,"future-bird");assert.equal(result.main.companion.name,"Percy");assert.notEqual(result.main.companion.id,"percy-pelican");
  assert.equal(result.main.companion.needsReselection,true);assert.equal(result.main.migrationState.companionReselection.reason,"unknown-companion");
});

test("migration is idempotent and generates no replacement IDs on a second run",()=>{
  const first=migrate(fixtures.establishedUser());
  const second=migrations.migrateRecords(first.main,first.ext,{now:"2026-09-01T00:00:00.000Z",idFactory:prefix=>{throw new Error(`unexpected ID for ${prefix}`);}});
  assert.deepEqual(second,first);
});

test("storage migration uses only the Alpha 0.6.32 keys and is idempotent",()=>{
  const fixture=fixtures.establishedUser(),mainKey="healthyEatingCompanionAlpha06",extKey="healthyEatingCompanionAlpha06Functional";
  const storage=memoryStorage({[mainKey]:JSON.stringify(fixture.main),[extKey]:JSON.stringify(fixture.ext),unrelated:"keep"});
  const first=migrations.migrateStorage(storage,{storageKey:mainKey,functionalStorageKey:extKey},{now:MIGRATION_TIME,idFactory:idFactory()});
  assert.deepEqual(first.writes.sort(),[extKey,mainKey].sort());assert.deepEqual(storage.keys().sort(),[mainKey,extKey,"unrelated"].sort());assert.equal(storage.value("unrelated"),"keep");
  const second=migrations.migrateStorage(storage,{storageKey:mainKey,functionalStorageKey:extKey},{now:"2026-09-01T00:00:00.000Z",idFactory:prefix=>{throw new Error(`unexpected ID for ${prefix}`);}});
  assert.deepEqual(second.writes,[]);
});

test("legacy-only and invalid stores are never overwritten",()=>{
  const legacyMain=JSON.stringify({completed:true,email:"legacy@example.test"}),legacyExt=JSON.stringify({shopping:[{item:"Keep me"}]});
  const legacyStorage=memoryStorage({healthyEatingAlpha05:legacyMain,healthyEatingAlpha05Functional:legacyExt});
  const legacyResult=migrations.migrateStorage(legacyStorage,{}, {now:MIGRATION_TIME,idFactory:idFactory()});
  assert.equal(legacyResult.skipped.main,true);assert.equal(legacyResult.skipped.ext,true);assert.equal(legacyStorage.getItem("healthyEatingCompanionAlpha06"),null);assert.equal(legacyStorage.getItem("healthyEatingCompanionAlpha06Functional"),null);
  assert.equal(legacyStorage.getItem("healthyEatingAlpha05"),legacyMain);assert.equal(legacyStorage.getItem("healthyEatingAlpha05Functional"),legacyExt);

  const invalidStorage=memoryStorage({healthyEatingCompanionAlpha06:"{broken",healthyEatingCompanionAlpha06Functional:"{also-broken"});
  const invalidResult=migrations.migrateStorage(invalidStorage,{}, {now:MIGRATION_TIME,idFactory:idFactory()});
  assert.deepEqual(invalidResult.skipped,{main:true,ext:true});assert.equal(invalidStorage.getItem("healthyEatingCompanionAlpha06"),"{broken");assert.equal(invalidStorage.getItem("healthyEatingCompanionAlpha06Functional"),"{also-broken");
});
