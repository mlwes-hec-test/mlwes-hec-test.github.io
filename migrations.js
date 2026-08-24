((root, factory) => {
  "use strict";

  const api = factory(root);
  if(typeof module === "object" && module.exports) module.exports = api;
  if(root) root.HECMigrations = api;

  if(root?.localStorage && root?.HEC_APP){
    try{
      root.HEC_MIGRATION_RESULT = api.migrateStorage(root.localStorage, root.HEC_APP);
    }catch(error){
      console.warn("HEC schema migration was not applied", error);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, root => {
  "use strict";

  const DATA_SCHEMA_VERSION = 1;
  const MIGRATION_ID = "alpha-0.6.33-stage-2-schema-1";
  const DEFAULT_MAIN_KEY = "healthyEatingCompanionAlpha06";
  const DEFAULT_EXT_KEY = "healthyEatingCompanionAlpha06Functional";
  const LEGACY_MAIN_KEYS = Object.freeze(["healthyEatingAlpha05","healthyEatingAlpha04"]);
  const LEGACY_EXT_KEYS = Object.freeze(["healthyEatingAlpha05Functional","healthyEatingAlpha04Extensions"]);

  const CANONICAL_COMPANIONS = Object.freeze([
    {id:"percy-pelican",name:"Percy",species:"Pelican",gender:"male",personality:"planner",icon:"🐦"},
    {id:"wally-wombat",name:"Wally",species:"Wombat",gender:"male",personality:"steady",icon:"🐾"},
    {id:"anna-goanna",name:"Anna",species:"Goanna",gender:"female",personality:"resourceful",icon:"🦎"},
    {id:"shelly-turtle",name:"Shelly",species:"Turtle",gender:"female",personality:"patient",icon:"🐢",apparentAge:"older",personalityNote:"older and wiser"},
    {id:"ruby-ringneck",name:"Ruby",species:"Ringneck",gender:"female",personality:"energetic",icon:"🦜",aliases:["rowdy-ringneck","rowdy"]},
    {id:"bonnie-bilby",name:"Bonnie",species:"Bilby",gender:"female",personality:"curious",icon:"🐰",aliases:["barnaby-bilby","barnaby"]},
    {id:"skip-kangaroo",name:"Skip",species:"Kangaroo",gender:"male",personality:"encouraging",icon:"🦘",variety:"Red Kangaroo",physicalDescription:"large Red Kangaroo; no pouch"},
    {id:"rusty-dingo",name:"Rusty",species:"Dingo",gender:"male",personality:"loyal",icon:"🐕"},
    {id:"gary-galah",name:"Gary",species:"Galah",gender:"male",personality:"social",icon:"🦜"},
    {id:"monty-python",name:"Monty",species:"Python",gender:"male",personality:"relaxed",icon:"🐍",variety:"Carpet Python"},
    {id:"chuckles-kookaburra",name:"Chuckles",species:"Kookaburra",gender:"male",personality:"light-hearted",icon:"🐦"},
    {id:"ernie-echidna",name:"Ernie",species:"Echidna",gender:"male",personality:"thoughtful",icon:"🦔"},
    {id:"spike-thorny-devil",name:"Spike",species:"Thorny Devil",gender:"male",personality:"protective",icon:"🦎"},
    {id:"cassie-cassowary",name:"Cassie",species:"Cassowary",gender:"female",personality:"confident",icon:"🐦",aliases:["clancy-cassowary","clancy"]},
    {id:"salty-crocodile",name:"Salty",species:"Saltwater Crocodile",gender:"male",personality:"direct",icon:"🐊"},
    {id:"bushy-koala",name:"Bushy",species:"Koala",gender:"male",personality:"calm",icon:"🐨",aliases:["koko-koala","koko"]}
  ].map(item => Object.freeze(item)));

  const CANONICAL_BY_ID = new Map(CANONICAL_COMPANIONS.map(item => [item.id,item]));
  const RETIRED_COMPANION_IDS = Object.freeze({
    "rowdy-ringneck":"ruby-ringneck",
    "barnaby-bilby":"bonnie-bilby",
    "clancy-cassowary":"cassie-cassowary",
    "koko-koala":"bushy-koala"
  });
  const RETIRED_COMPANION_NAMES = Object.freeze({rowdy:"ruby-ringneck",barnaby:"bonnie-bilby",clancy:"cassie-cassowary",koko:"bushy-koala"});

  function clone(value){
    if(value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }
  function isRecord(value){ return !!value && typeof value === "object" && !Array.isArray(value); }
  function normaliseId(value){ return String(value ?? "").trim(); }
  function normaliseText(value){ return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); }
  function asIsoDate(value){
    const text=String(value||"").trim();
    if(!text)return "";
    if(/^\d{4}-\d{2}-\d{2}$/.test(text))return `${text}T00:00:00.000Z`;
    const date=new Date(text);return Number.isNaN(date.getTime())?"":date.toISOString();
  }
  function firstTimestamp(record, fallbacks, now){
    for(const value of [record?.createdAt,record?.recordedAt,record?.savedAt,record?.importedAt,...fallbacks]){
      const stamp=asIsoDate(value);if(stamp)return stamp;
    }
    return now;
  }
  function createId(prefix="record"){
    const uuid=root?.crypto?.randomUUID?.();
    return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  }
  function uniqueId(prefix, seen, idFactory){
    let id="";
    do{id=normaliseId(idFactory(prefix));}while(!id||seen.has(id));
    return id;
  }
  function ensureRecordIdentity(record, prefix, seen, idFactory, now, fallbacks=[]){
    if(!isRecord(record))return record;
    let id=normaliseId(record.id);
    if(!id||seen.has(id))id=uniqueId(prefix,seen,idFactory);
    record.id=id;seen.add(id);
    if(!record.createdAt)record.createdAt=firstTimestamp(record,fallbacks,now);
    if(!record.updatedAt)record.updatedAt=record.createdAt;
    return record;
  }
  function ensureArrayRecords(list, prefix, idFactory, now, timestampFor=()=>[]){
    if(!Array.isArray(list))return list;
    const seen=new Set();
    list.forEach((record,index)=>ensureRecordIdentity(record,prefix,seen,idFactory,now,timestampFor(record,index)));
    return list;
  }
  function inferExerciseCredit(record){
    const burned=Number(record.caloriesBurned ?? record.calories),credited=Number(record.creditedCalories ?? record.credit);
    if(!Number.isFinite(burned)||burned<=0||!Number.isFinite(credited))return {policy:"unknown",percent:null};
    const percent=Math.round(credited/burned*1000)/10;
    if(Math.abs(percent)<=0.1)return {policy:"none",percent:0};
    if(Math.abs(percent-50)<=0.1)return {policy:"50-percent",percent:50};
    if(Math.abs(percent-100)<=0.1)return {policy:"100-percent",percent:100};
    return {policy:"custom",percent};
  }
  function migrateExerciseRecord(record){
    if(!isRecord(record))return;
    if(record.caloriesBurned === undefined && record.calories !== undefined)record.caloriesBurned=record.calories;
    if(record.creditedCalories === undefined && record.credit !== undefined)record.creditedCalories=record.credit;
    const inferred=inferExerciseCredit(record);
    if(record.creditPolicyAtLog === undefined)record.creditPolicyAtLog=inferred.policy;
    if(record.creditPercentAtLog === undefined)record.creditPercentAtLog=inferred.percent;
  }
  function repairLegacyProfileStart(mainInput, options={}){
    if(!isRecord(mainInput))return mainInput;
    const main=mainInput;
    main.health=isRecord(main.health)?main.health:{};
    if(!main.profileStartedDate){
      const marked=(Array.isArray(main.weightHistory)?main.weightHistory:[])
        .filter(record=>record?.date&&(record.isStartingWeight||/starting weight/i.test(record.note||"")))
        .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      let today=String(options.today||"").slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(today)){
        try{today=new Intl.DateTimeFormat("en-CA",{timeZone:main.personal?.activeTimeZone||"Australia/Brisbane"}).format(options.now?new Date(options.now):new Date());}
        catch{today=(options.now?new Date(options.now):new Date()).toISOString().slice(0,10);}
      }
      main.profileStartedDate=marked[0]?.date||today;
    }
    const profileStart=main.profileStartedDate;
    const history=(Array.isArray(main.weightHistory)?main.weightHistory:[])
      .filter(record=>record?.date&&Number(record.weightKg)>0&&(!profileStart||record.date>=profileStart))
      .sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.recordedAt||"").localeCompare(String(b.recordedAt||"")));
    if(history.length){
      const startDate=profileStart||history[0].date;
      const start=history.find(record=>record.date===startDate)||history.find(record=>record.date>=startDate)||history[0];
      main.health.startingWeightDate=start.date;
      history.forEach(record=>{
        if(record===start){record.isStartingWeight=true;record.note="Starting Weight";}
        else if(record.isStartingWeight||/starting weight/i.test(record.note||"")){record.isStartingWeight=false;record.note=record.date<startDate?"Historical Test Entry":"Progress Check-In";}
      });
    }
    return main;
  }
  function companionLookup(record){
    const id=normaliseId(record?.id).toLowerCase();
    if(CANONICAL_BY_ID.has(id))return {canonical:CANONICAL_BY_ID.get(id),fromId:""};
    if(RETIRED_COMPANION_IDS[id])return {canonical:CANONICAL_BY_ID.get(RETIRED_COMPANION_IDS[id]),fromId:id};
    if(id)return {canonical:null,fromId:""};
    const text=normaliseText(`${record?.name||""} ${record?.characterName||""}`);
    for(const [name,targetId] of Object.entries(RETIRED_COMPANION_NAMES))if(new RegExp(`\\b${name}\\b`).test(text))return {canonical:CANONICAL_BY_ID.get(targetId),fromId:id||name};
    for(const companion of CANONICAL_COMPANIONS){
      if(new RegExp(`\\b${normaliseText(companion.name)}\\b`).test(text))return {canonical:companion,fromId:""};
    }
    return {canonical:null,fromId:""};
  }
  function clearCompanionReselection(main){
    if(!isRecord(main.migrationState))return;
    delete main.migrationState.companionReselection;
    if(!Object.keys(main.migrationState).length)delete main.migrationState;
  }
  function migrateCompanion(main, now){
    if(!isRecord(main.companion))return;
    const companion=main.companion;
    if(companion.voiceStyleId === undefined)companion.voiceStyleId=null;
    const savedId=normaliseId(companion.id).toLowerCase();
    const match=companionLookup(companion);
    if(match.canonical){
      const canonical=match.canonical;
      if(match.fromId && !isRecord(companion.legacyIdentity))companion.legacyIdentity={id:match.fromId,name:companion.name||"",migratedAt:now};
      companion.id=canonical.id;
      companion.name=canonical.name;
      companion.species=canonical.species;
      companion.gender=canonical.gender;
      companion.character=canonical.icon;
      companion.characterName=`${canonical.name} the ${canonical.species}`;
      companion.personality=canonical.personality;
      companion.needsReselection=false;
      companion.selectionStatus="active";
      clearCompanionReselection(main);
      return;
    }
    const legacyId=savedId;
    if(!legacyId)return;
    companion.needsReselection=true;
    companion.selectionStatus="unknown-needs-reselection";
    main.migrationState=isRecord(main.migrationState)?main.migrationState:{};
    const existing=isRecord(main.migrationState.companionReselection)?main.migrationState.companionReselection:{};
    main.migrationState.companionReselection={...existing,required:true,legacyCompanionId:legacyId,reason:"unknown-companion",requestedAt:existing.requestedAt||now};
  }
  function stampSchema(record, previousVersion, now){
    record.schemaVersion=Math.max(Number(previousVersion)||0,DATA_SCHEMA_VERSION);
    if((Number(previousVersion)||0)<DATA_SCHEMA_VERSION){
      record.schemaMigratedAt ||= now;
      record.schemaMigrationId ||= MIGRATION_ID;
    }
  }
  function migrateRecords(mainInput={}, extInput={}, options={}){
    const now=asIsoDate(options.now)||new Date().toISOString();
    const idFactory=typeof options.idFactory === "function"?options.idFactory:createId;
    const main=isRecord(mainInput)?clone(mainInput):{};
    const ext=isRecord(extInput)?clone(extInput):{};
    const mainSchemaBefore=Number(main.schemaVersion)||0,extSchemaBefore=Number(ext.schemaVersion)||0;

    if(!normaliseId(main.userId))main.userId=normaliseId(main.profileId)||normaliseId(main.id)||idFactory("user");
    if(main.householdId === undefined)main.householdId=null;
    if(!main.createdAt)main.createdAt=firstTimestamp(main,[main.registeredAt,main.profileStartedDate],now);
    if(!main.updatedAt)main.updatedAt=main.createdAt;
    if(isRecord(main.personal) && main.personal.surname === undefined)main.personal.surname="";
    migrateCompanion(main,now);

    ensureArrayRecords(main.weightHistory,"weight",idFactory,now,record=>[record?.recordedAt,record?.date]);

    const diaryIds=new Set();
    if(isRecord(ext.diary))for(const [date,entries] of Object.entries(ext.diary))if(Array.isArray(entries))entries.forEach(entry=>ensureRecordIdentity(entry,"entry",diaryIds,idFactory,now,[entry?.date,date]));
    ensureArrayRecords(ext.exercise,"activity",idFactory,now,record=>[record?.date,record?.localDate]);
    if(Array.isArray(ext.exercise))ext.exercise.forEach(migrateExerciseRecord);
    ensureArrayRecords(ext.shopping,"shop",idFactory,now);
    ensureArrayRecords(ext.customFoods,"custom",idFactory,now,record=>[record?.savedAt]);
    ensureArrayRecords(ext.onlineFoods,"online-food",idFactory,now,record=>[record?.savedAt,record?.packageVerifiedAt]);
    ensureArrayRecords(ext.recipes,"recipe",idFactory,now);
    ensureArrayRecords(ext.mealTemplates,"meal",idFactory,now);

    if(!ext.createdAt)ext.createdAt=firstTimestamp(ext,[],now);
    if(!ext.updatedAt)ext.updatedAt=ext.createdAt;
    if(!ext.ownerUserId)ext.ownerUserId=main.userId;
    stampSchema(main,mainSchemaBefore,now);
    stampSchema(ext,extSchemaBefore,now);
    return {main,ext,schemaVersion:DATA_SCHEMA_VERSION,migrationId:MIGRATION_ID};
  }
  function readStorageRecord(storage,key){
    const raw=storage.getItem(key);
    if(raw===null)return {exists:false,valid:true,raw,value:{}};
    try{const value=JSON.parse(raw);return {exists:true,valid:isRecord(value),raw,value:isRecord(value)?value:{}};}catch{return {exists:true,valid:false,raw,value:{}};}
  }
  function hasAnyStorageKey(storage,keys){return keys.some(key=>storage.getItem(key)!==null);}
  function migrateStorage(storage, app={}, options={}){
    const mainKey=app.storageKey||DEFAULT_MAIN_KEY,extKey=app.functionalStorageKey||DEFAULT_EXT_KEY;
    const legacyMainKeys=Array.isArray(app.legacyMainKeys)?app.legacyMainKeys:LEGACY_MAIN_KEYS;
    const legacyExtKeys=Array.isArray(app.legacyFunctionalKeys)?app.legacyFunctionalKeys:LEGACY_EXT_KEYS;
    const mainRead=readStorageRecord(storage,mainKey),extRead=readStorageRecord(storage,extKey);
    const mainWritable=mainRead.valid&&(mainRead.exists||!hasAnyStorageKey(storage,legacyMainKeys));
    const extWritable=extRead.valid&&(extRead.exists||!hasAnyStorageKey(storage,legacyExtKeys));
    const migrated=migrateRecords(mainRead.value,extRead.value,options);
    const writes=[];
    if(mainWritable){const next=JSON.stringify(migrated.main);if(next!==mainRead.raw){storage.setItem(mainKey,next);writes.push(mainKey);}}
    if(extWritable){const next=JSON.stringify(migrated.ext);if(next!==extRead.raw){storage.setItem(extKey,next);writes.push(extKey);}}
    return {schemaVersion:DATA_SCHEMA_VERSION,migrationId:MIGRATION_ID,mainKey,extKey,writes,skipped:{main:!mainWritable,ext:!extWritable}};
  }

  return Object.freeze({
    DATA_SCHEMA_VERSION,
    MIGRATION_ID,
    CANONICAL_COMPANIONS,
    RETIRED_COMPANION_IDS,
    LEGACY_MAIN_KEYS,
    LEGACY_EXT_KEYS,
    createId,
    repairLegacyProfileStart,
    migrateRecords,
    migrateStorage
  });
});
