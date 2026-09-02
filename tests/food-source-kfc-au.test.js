'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const ROOT=path.join(__dirname,'..'),read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8'),runtime=read('alpha06.js');
const semantics=require('../product-serving-semantics.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const registered=require('../kfc-au-catalogue.js');
const catalogue=require('../food-catalogue.js');
const packaged=require('../packaged-foods.js');
const entities=require('../entity-registry.js');
const conversation=require('../conversation-foundation.js');
const integrity=require('../kfc-au-integrity.js');
const audit=require('../scripts/audit_kfc_au.js');
const data=sources.getCatalogue('kfc-au'),records=sources.foodRecords({sourceId:'kfc-au'}),byName=name=>records.find(record=>record.name===name);

function productionFunction(name){const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,name);const body=runtime.indexOf('{',start);let depth=0,end=body;for(;end<runtime.length;end++){if(runtime[end]==='{')depth++;else if(runtime[end]==='}'&&!--depth){end++;break;}}return runtime.slice(start,end);}
function decisionHarness(){
  const generic={id:'afcd-hot-chips',recordType:'afcd',afcd:true,name:'Potato chips, regular, takeaway',brand:'Australian Food Composition Database',aliases:['chips','hot chips'],category:'Takeaway',country:'Australia',market:'AU',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'100 g reference',nutrients:{energyKj:1000,calories:239},verified:true};
  const community={id:'off-kfc-shell',recordType:'online-candidate',name:'KFC Style Zinger Burger',brand:'Community Brand',aliases:['zinger burger'],category:'Online Product',country:'International',market:'international',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'100 g',nutrients:{calories:300},verified:false};
  const foods=[generic,community,...sources.foodRecords()],context={foods,catalogue,sources,entities,console,window:null,globalThis:null};context.window=context;context.globalThis=context;context.HECFoodSources=sources;vm.createContext(context);
  vm.runInContext(`
    const C8=catalogue,REG29=entities;function normalise(value){return C8.norm(value);}function allFoods(){return foods;}function s23ProductLike(){return true;}function searchRank(food,query){return C8.rank(food,query).score;}function s23Parsed(value){return{food:C8.norm(value)}}
    function rc4SourceFoods(id){return foods.filter(food=>food.foodSourceId===id&&food.itemStatus!=='retired');}
    function rc5ExactProductBase(query){return foods.map(food=>({food,result:C8.rank(food,query)})).filter(item=>['exact-name','exact-alias'].includes(item.result.tier)).sort((a,b)=>b.result.score-a.result.score||Number(!!b.food.foodSourceId)-Number(!!a.food.foodSourceId))[0]?.food||null;}
    ${productionFunction('rc4NamedRestaurantSource')}
    ${productionFunction('rc5PackagedBrand')}
    ${productionFunction('rc5SearchContext')}
    ${productionFunction('rc5ExactCandidates')}
    ${productionFunction('rc5SourceFamilyChoice')}
    ${productionFunction('rc5ExactDecision')}
    window.decide=value=>{const result=rc5ExactDecision(value);return{kind:result.kind,primary:result.primary?.name||'',choices:result.choices.map(food=>food.name),sourceId:result.context.source?.id||'',product:result.context.product};};
  `,context);return context;
}

test('current official snapshot has explicit source authority, freshness and reproducible hash',()=>{
  assert.equal(registered.schemaVersion,2);assert.equal(data.source.id,'kfc-au');assert.equal(data.source.displayName,'KFC Australia');assert.equal(data.source.lastCheckedDate,'2026-09-02');assert.match(data.source.catalogueCheckedAt,/^2026-09-02T/);
  assert.equal(data.source.referenceMetadata.nutritionBasis.includes('September 2023'),true);assert.equal(data.source.referenceMetadata.normalisedSnapshotSha256,'e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2');assert.equal(audit.manifest().hashMatches,true);
  assert.equal(data.source.productionApproved,false);assert.match(data.source.licenceStatus,/no-affirmative-production/);assert.ok(data.source.referenceUrls.every(url=>url.startsWith('https://www.kfc.com.au/')));
});

test('144 live-menu rows deduplicate to 126 canonical current identities across 12 categories',()=>{
  assert.equal(data.source.inventory.menuRows,144);assert.equal(data.items.length,126);assert.equal(records.length,126);assert.equal(data.source.inventory.browseCategories.length,12);assert.equal(new Set(data.items.map(item=>item.id)).size,126);
  assert.deepEqual(data.source.inventory.categorySurfaces.map(surface=>surface.count),[4,16,13,31,20,4,8,10,8,2,15,13]);
  const chips=data.items.find(item=>item.name==='Regular Chips');assert.deepEqual(chips.categoryMemberships,['Snack Hacks','Sides & Desserts']);assert.equal(chips.sourceOccurrences.length,3);
  assert.ok(records.every(record=>record.current&&record.officialCurrentIdentity));assert.ok(records.every(record=>data.source.inventory.browseCategories.includes(record.browseCategory)));
});

test('quality states are conservative and every active identity is reachable without duplicate results',()=>{
  assert.deepEqual(data.source.inventory.energyOnlyProducts,57);assert.equal(data.source.inventory.identityOnlyProducts,8);assert.equal(data.source.inventory.configurableProducts,61);assert.equal(data.source.inventory.limitedTimeProducts,4);assert.equal(data.source.inventory.sourceConflicts,2);
  assert.equal(records.filter(record=>record.loggable).length,57);assert.equal(records.filter(record=>!record.loggable).length,69);
  assert.ok(records.filter(record=>record.nutritionStatus==='energy-only').every(record=>!['protein','fat','satFat','carbs','sugar','sodium','fibre'].some(key=>Object.hasOwn(record.nutrients,key))));
  assert.ok(records.filter(record=>record.nutritionStatus==='identity-only').every(record=>!record.loggable&&!Object.keys(record.nutrients).length));
});

test('official kJ is retained and displayed kcal is explicitly derived without invented macros',()=>{
  for(const [name,kj] of [['Zinger Burger',1874],['6 Wicked Wings',3259],['Regular Popcorn Chicken',1644],['Regular Chips',1186],['Pepsi Freeze',734]]){const food=byName(name);assert.equal(food.nutrients.energyKj,kj,name);assert.equal(food.nutrients.calories,Math.round((kj/4.184)*10)/10,name);assert.equal(food.energySource.publishedEnergyKj,kj);assert.equal(food.calorieSource.formula,'published kJ / 4.184');}
  assert.equal(byName('Sparkling Water').nutrients.energyKj,0);assert.equal(byName('Sparkling Water').nutrients.calories,0);assert.equal(byName('Giant Liquid Gold Sauce').nutrients.energyKj,undefined);
});

test('current component values win disclosed conflicts and standard burger extras stay optional',()=>{
  const gravy=byName('Regular Gravy'),chicken=byName('3 Pieces of Chicken'),zinger=byName('Zinger Burger');assert.equal(gravy.nutrients.energyKj,241);assert.equal(gravy.sourceConflict.olderEnergyKj,215);assert.equal(chicken.nutrients.energyKj,3093);assert.equal(chicken.sourceConflict.olderEnergyKj,2951);
  assert.equal(zinger.semanticType,'single-item');assert.equal(zinger.defaultUnit,'burger');assert.equal(zinger.optionalExtras.find(extra=>extra.name==='Bacon Slice').energyKj,231);assert.equal(zinger.optionalExtras.find(extra=>extra.name==='Corn Chips').energyKj,null);
});

test('shared editor variants add known official extras and block unknown-extra energy',()=>{
  const context={food:structuredClone(byName('Zinger Burger')),window:null,globalThis:null};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(`
    const FOOD_VARIANT_SCHEMAS={};function clone(value){return JSON.parse(JSON.stringify(value));}function n(value){return Number(value)||0;}function formatNumber(value){return String(value);}
    ${productionFunction('variantSchema')}
    ${productionFunction('resolveVariantFood')}
    window.apply=values=>resolveVariantFood(food,values);
  `,context);
  const bacon=JSON.parse(JSON.stringify(context.apply({sourceExtra0:'added'})));assert.equal(bacon.name,'Zinger Burger + Bacon Slice');assert.equal(bacon.nutrients.energyKj,2105);assert.equal(bacon.nutrients.calories,503.1);assert.equal(Object.hasOwn(bacon.nutrients,'fat'),false);
  const unsupported=JSON.parse(JSON.stringify(context.apply({sourceExtra3:'added'})));assert.equal(unsupported.loggable,false);assert.match(unsupported.entryBlockedReason,/no published fixed energy/i);
});

test('central semantics preserve burger, count, size, component and configurable identities',()=>{
  const expected=[['Zinger Burger','single-item',1,'burger'],['6 Wicked Wings','counted-item',6,'piece'],['10 Nuggets','counted-item',10,'piece'],['Regular Popcorn Chicken','sized-variant',1,'portion'],['Large Chips','sized-variant',1,'portion'],['Regular Gravy','component',1,'serve'],['Zinger Burger Combo','configurable-bundle',1,'bundle'],['Zinger Burger Box','configurable-bundle',1,'bundle'],['Go Bucket Wicked Boneless','configurable-bundle',1,'bundle'],['Family Feast','configurable-bundle',1,'bundle']];
  for(const [name,type,amount,unit] of expected){const food=byName(name);assert.ok(food,name);assert.equal(food.semanticType,type,name);assert.equal(food.defaultAmount,amount,name);assert.equal(food.defaultUnit,unit,name);assert.notEqual(food.defaultUnit,'g',name);}
  for(const name of ['Zinger Burger Combo','Zinger Burger Box','Family Feast']){const food=byName(name);assert.equal(catalogue.canLog(food),false);assert.match(food.entryBlockedReason,/choices|configurator/i);assert.equal(Object.keys(food.nutrients).length,0);}
  assert.equal(semantics.audit(records).unresolvedCount,0);
});

test('source-only aliases, exact KFC intent and data-driven family choices use the shared resolver',()=>{
  for(const alias of ['KFC','KFC Australia','Kentucky Fried Chicken','Kentucky'])assert.equal(sources.sourceForAlias(alias).id,'kfc-au',alias);
  const decide=decisionHarness().decide;
  assert.deepEqual(JSON.parse(JSON.stringify(decide('KFC'))),{kind:'none',primary:'',choices:[],sourceId:'kfc-au',product:''});
  for(const query of ['Zinger','Zinger Burger','KFC Zinger','KFC Zinger Burger'])assert.equal(decide(query).primary,'Zinger Burger',query);
  assert.deepEqual(Array.from(decide('KFC Wicked Wings').choices),['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings']);assert.equal(decide('KFC 6 Wicked Wings').primary,'6 Wicked Wings');
  assert.deepEqual(Array.from(decide('KFC Popcorn Chicken').choices),['Snack Popcorn Chicken','Regular Popcorn Chicken','Maxi Popcorn Chicken']);assert.equal(decide('KFC Regular Popcorn Chicken').primary,'Regular Popcorn Chicken');
  assert.deepEqual(Array.from(decide('KFC chips').choices),['Regular Chips','Large Chips']);assert.notEqual(decide('chips').sourceId,'kfc-au');assert.equal(decide('chips').primary,'Potato chips, regular, takeaway');
  assert.equal(decide("McDonald's Big Mac").primary,'Big Mac');
});

test('shared voice quantity semantics select counted identity once and scale natural servings correctly',()=>{
  const wingsIntent=conversation.parseActionRequest('Add six Wicked Wings for lunch',{today:'2026-09-02'});assert.equal(wingsIntent.quantity.amount,6);assert.equal(wingsIntent.foodText,'wicked wings');
  const wings=records.filter(food=>food.semanticType==='counted-item'&&Number(food.productSemantics.count)===wingsIntent.quantity.amount&&(catalogue.norm(food.name.replace(/^\d+\s+/,''))===catalogue.norm(wingsIntent.foodText)));assert.equal(wings.length,1);assert.equal(wings[0].name,'6 Wicked Wings');assert.equal(packaged.nutritionForFood(wings[0],{amount:6,unit:'piece'}).energyKj,3259);
  const burgers=conversation.parseActionRequest('Add two Zinger Burgers for dinner',{today:'2026-09-02'}),zinger=byName('Zinger Burger');assert.equal(burgers.quantity.amount,2);assert.equal(catalogue.rank(zinger,burgers.foodText).tier,'exact-alias');assert.equal(packaged.nutritionForFood(zinger,{amount:2,unit:'burger'}).energyKj,3748);
  const chips=conversation.parseActionRequest('Add a regular KFC chips for lunch',{today:'2026-09-02'});assert.equal(catalogue.resolve(records,chips.foodText).food.name,'Regular Chips');
});

test('Diary snapshot keeps KFC identity, source priority and nutrition derivation immutable',()=>{
  const food=byName('Regular Gravy'),snapshot=packaged.diarySnapshot(food,{amount:1,unit:'serve',unitLabel:'Component Serve',nutrients:food.nutrients,loggedAt:'2026-09-02T16:00:00+10:00'}),saved=structuredClone(snapshot);food.nutrients.energyKj=9999;food.sourceConflict.olderEnergyKj=9999;assert.deepEqual(snapshot,saved);
  assert.equal(snapshot.foodSourceId,'kfc-au');assert.equal(snapshot.brand,'KFC Australia');assert.equal(snapshot.energySource.publishedEnergyKj,241);assert.equal(snapshot.calorieSource.method,'derived');assert.equal(snapshot.nutritionFreshness.classification,'current-component-corroborated');assert.equal(snapshot.sourceConflict.olderEnergyKj,215);
});

test('integrity, offline loading, legacy removal, responsive hub and refresh tooling contracts are present',()=>{
  const report=integrity.buildIntegrityReport(),html=read('index.html'),worker=read('service-worker.js'),styles=read('styles.css');assert.equal(report.errorCount,0);assert.equal(report.totalEntities,126);assert.equal(report.menuRows,144);assert.equal(report.semanticTypes['counted-item'],13);assert.equal(report.semanticTypes['sized-variant'],13);
  assert.ok(html.indexOf('mcdonalds-au-catalogue.js')<html.indexOf('kfc-au-catalogue-data.js'));assert.ok(html.indexOf('kfc-au-catalogue-data.js')<html.indexOf('kfc-au-catalogue.js'));assert.ok(html.indexOf('kfc-au-catalogue.js')<html.indexOf('alpha06.js'));assert.match(worker,/kfc-au-catalogue-data\.js/);assert.match(worker,/kfc-au-catalogue\.js/);
  assert.doesNotMatch(runtime,/kfc:\{label:'KFC Australia'/);assert.match(runtime,/inventory\?\.browseCategories/);assert.match(runtime,/slice\(0,shown\)/);assert.match(styles,/\.rc5-category-grid\{display:grid/);assert.match(styles,/@media\(max-width:520px\)[\s\S]*\.rc5-category-grid\{grid-template-columns:1fr\}/);assert.match(read('scripts/audit_kfc_au.js'),/--compare/);assert.match(read('KFC_AU_FOOD_SOURCE.md'),/last approved catalogue untouched/i);
});

test('KFC and unrelated generic ranking stay lightweight at current scale',()=>{
  const queries=['KFC','KFC Zinger Burger','KFC Wicked Wings','KFC Popcorn Chicken','KFC chips','banana'],samples=[];for(let run=0;run<25;run++)for(const query of queries){const start=performance.now();for(const food of records)catalogue.rank(food,query);samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);const p95=samples[Math.ceil(samples.length*.95)-1];assert.ok(p95<250,`KFC/generic single-query p95 ${p95.toFixed(3)}ms exceeded 250ms`);
});
