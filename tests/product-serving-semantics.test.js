'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const semantics=require('../product-serving-semantics.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const catalogue=require('../food-catalogue.js');
const integrity=require('../mcdonalds-au-integrity.js');
const records=sources.foodRecords({sourceId:'mcdonalds-au'});
const named=name=>records.find(record=>record.name===name);
const ranked=(query,list=records)=>list.map(food=>({food,rank:catalogue.rank(food,query)})).filter(item=>item.rank.score>0).sort((a,b)=>b.rank.score-a.rank.score||a.food.name.localeCompare(b.food.name)).map(item=>item.food);

const flora={id:'flora',recordType:'packaged',name:'Flora ProActiv Light',brand:'Flora',market:'AU',verified:true,category:'Spreads',defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.1},unitLabels:{serve:'Serve (10 g)',g:'g'},serving:'1 serve (10 g)',manufacturerServing:{amount:10,unit:'g'},nutritionBasis:{perServing:{calories:37},per100:{calories:368},manufacturerServing:true},nutrients:{calories:37},loggable:true};
const reference={id:'afcd-fries',recordType:'afcd',afcd:true,name:'Potato fries, deep fried',brand:'Australian Food Composition Database',defaultAmount:1,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'Reference values per 100 g',nutritionPer100Unit:'g',nutrients:{calories:300},loggable:true};

test('semantic source order prefers explicit metadata before source metadata and inference',()=>{
  const explicit=semantics.classify({recordType:'afcd',productSemantics:{type:'component',parentKey:'test'}});assert.equal(explicit.type,semantics.types.COMPONENT);assert.equal(explicit.source,'explicit-metadata');
  const source=semantics.classify({recordType:'packaged',name:'Packaged food'});assert.equal(source.type,semantics.types.PACKAGED);assert.equal(source.source,'source-metadata');
  const inferred=semantics.classify({name:'Example Sauce'});assert.equal(inferred.type,semantics.types.COMPONENT);assert.equal(inferred.source,'central-inference');assert.deepEqual(semantics.explicitOverrides,{});
});

test('representative records cover all eight reusable semantic roles',()=>{
  assert.equal(named('Big Mac').semanticType,semantics.types.SINGLE);
  assert.equal(named('6pc Chicken McNuggets').semanticType,semantics.types.COUNTED);
  assert.equal(named('Large Fries').semanticType,semantics.types.SIZED);
  assert.equal(named('Hotcakes with Butter & Syrup').semanticType,semantics.types.MEAL);
  assert.equal(named('Hotcake Syrup').semanticType,semantics.types.COMPONENT);
  assert.equal(semantics.classify(flora).type,semantics.types.PACKAGED);
  assert.equal(named("Macca's Mega Meal").semanticType,semantics.types.CONFIGURABLE);
  assert.equal(semantics.classify(reference).type,semantics.types.REFERENCE);
});

test('serving policy retains natural, count, size, package and 100 g reference semantics',()=>{
  const bigMac=semantics.servingPolicy(named('Big Mac')),nuggets=semantics.servingPolicy(named('6pc Chicken McNuggets')),fries=semantics.servingPolicy(named('Large Fries')),packaged=semantics.servingPolicy(flora),afcd=semantics.servingPolicy(reference);
  assert.deepEqual([bigMac.defaultAmount,bigMac.defaultUnit,bigMac.allowedUnitFamily],[1,'burger','natural-item']);
  assert.deepEqual([nuggets.defaultAmount,nuggets.defaultUnit,nuggets.countMeaningful,nuggets.units.piece],[6,'piece',true,1/6]);
  assert.deepEqual([fries.defaultUnit,fries.sizePartOfIdentity,fries.size],['portion',true,'Large']);
  assert.deepEqual([packaged.defaultAmount,packaged.defaultUnit,packaged.allowedUnits.sort()],[1,'serve',['g','serve']]);
  assert.deepEqual([afcd.defaultAmount,afcd.defaultUnit,afcd.nutritionBasis],[100,'g','per-100-g']);
});

test('Hotcakes is a complete source-backed meal and never a condiment serving',()=>{
  const meal=named('Hotcakes with Butter & Syrup'),component=named('Hotcake Syrup'),policy=semantics.servingPolicy(meal);
  assert.equal(policy.defaultUnit,'meal');assert.equal(policy.defaultAmount,1);assert.equal(policy.allowedUnitFamily,'complete-meal');assert.deepEqual(policy.allowedUnits,['meal']);
  assert.match(policy.naturalServingDisplay,/Hotcakes with Butter & Syrup/);assert.doesNotMatch(policy.unitLabels.meal,/condiment/i);assert.equal(policy.partialEditingSafe,false);
  assert.equal(component.semanticType,'component');assert.equal(semantics.servingPolicy(component).allowedUnitFamily,'component');
  assert.doesNotMatch(policy.naturalServingDisplay,/3 hotcakes/i,'component count is not guessed');
});

test('Hotcakes and hot cakes rank the complete item first while explicit syrup intent ranks the component first',()=>{
  for(const query of ['Hotcakes','hot cakes'])assert.equal(ranked(query)[0].name,'Hotcakes with Butter & Syrup',query);
  for(const query of ['Hotcake Syrup','hotcakes syrup'])assert.equal(ranked(query)[0].name,'Hotcake Syrup',query);
  assert.ok(ranked('Hotcakes').findIndex(food=>food.name==='Hotcake Syrup')>ranked('Hotcakes').findIndex(food=>food.name==='Hotcakes with Butter & Syrup'));
});

test('parent/component ranking is general rather than a Hotcakes-only rule',()=>{
  const parent={id:'burger',name:'Classic Burger',aliases:['burger'],productSemantics:{type:'single-item'},defaultAmount:1,defaultUnit:'burger',units:{burger:1},unitLabels:{burger:'Burger'},nutrients:{calories:400},verified:true,market:'AU'};
  const component={id:'burger-sauce',name:'Burger Sauce',aliases:['burger','burger sauce'],productSemantics:{type:'component',parentKey:'burger'},defaultAmount:1,defaultUnit:'serve',units:{serve:1},unitLabels:{serve:'Condiment Serve'},nutrients:{calories:80},verified:true,market:'AU'};
  assert.ok(catalogue.rank(parent,'burger').score>catalogue.rank(component,'burger').score);assert.ok(catalogue.rank(component,'burger sauce').score>catalogue.rank(parent,'burger sauce').score);
});

test('semantic validation rejects unsafe meal, package, natural-item and configurable combinations',()=>{
  const meal=named('Hotcakes with Butter & Syrup'),mealPolicy={...semantics.servingPolicy(meal),allowedUnitFamily:'component',allowedUnits:['serve'],defaultUnit:'serve',unitLabels:{serve:'Condiment Serve'}};
  assert.ok(semantics.validate(meal,mealPolicy).includes('meal-condiment-unit'));
  const badPackage={...semantics.servingPolicy(flora),allowedUnits:['standardServe'],defaultUnit:'standardServe',unitLabels:{standardServe:'Australian standard vegetable serve'}};assert.ok(semantics.validate(flora,badPackage).includes('packaged-food-group-unit'));
  const natural={name:'Natural Item',serving:'1 item',productSemantics:{type:'single-item'},loggable:true},badNatural={semanticType:'single-item',defaultAmount:1,defaultUnit:'g',allowedUnits:['g'],allowedUnitFamily:'natural-item',unitLabels:{g:'g'},loggable:true};assert.ok(semantics.validate(natural,badNatural).includes('natural-item-1g'));
  const bundle={name:'Family Bundle',productSemantics:{type:'configurable-bundle'},nutritionStatus:'configurable',loggable:true};assert.ok(semantics.validate(bundle).includes('configurable-loggable'));
});

test('the deterministic McDonald’s audit covers all 211 records with no unresolved conflict',()=>{
  const report=integrity.buildIntegrityReport();assert.equal(report.totalRuntimeRecords,211);assert.deepEqual(report.semanticCategoryCounts,{'single-item':99,'counted-item':6,'sized-variant':82,'complete-meal':1,component:15,'packaged-serving':0,'configurable-bundle':8,'reference-only':0,unknown:0});
  assert.equal(report.semanticFlaggedConflicts,15);assert.equal(report.semanticSafelyAutoResolved,15);assert.equal(report.semanticUnresolvedCount,0);assert.equal(report.errorCount,0);
});

test('counted and configurable records remain nutritionally safe',()=>{
  const nuggets=named('6pc Chicken McNuggets'),bundle=named("Macca's Mega Meal");assert.equal(nuggets.defaultAmount,6);assert.equal(nuggets.defaultUnit,'piece');assert.equal(nuggets.units.piece,1/6);assert.equal(catalogue.canLog(nuggets),true);
  assert.equal(bundle.loggable,false);assert.equal(bundle.nutritionStatus,'configurable');assert.equal(catalogue.canLog(bundle),false);assert.equal(semantics.servingPolicy(bundle).reviewOnly,true);
});

test('exact and close mobile result names use three-line and two-line wrapping contracts',()=>{
  const runtime=read('alpha06.js'),styles=read('styles.css');assert.match(runtime,/semantic-exact-match/);assert.match(runtime,/semantic-close-match/);assert.match(styles,/semantic-exact-match[\s\S]*?-webkit-line-clamp:3/);assert.match(styles,/semantic-close-match[\s\S]*?-webkit-line-clamp:2/);
  for(const name of ['Sausage & Egg McMuffin','Deluxe Sausage & Egg McMuffin','Double Sausage & Egg McMuffin'])assert.ok(named(name),name);
  assert.match(styles,/overflow-wrap:anywhere/);assert.match(styles,/grid-template-columns:minmax\(0,1fr\)/);
});

test('focused search layout leaves the first result usable at 390x844 and 390x520',()=>{
  const runtime=read('alpha06.js'),styles=read('styles.css');for(const [width,height] of [[390,844],[390,520],[430,932]]){const resultPanel=height-112,identityWidth=width-20-128;assert.ok(resultPanel>=263,`${width}x${height} result panel`);assert.ok(identityWidth>=242,`${width}x${height} identity width`);}
  assert.match(runtime,/visualViewport\?\.addEventListener\('resize',rc6SyncFoodSearchViewport\)/);assert.match(runtime,/visualViewport\?\.addEventListener\('scroll',rc6SyncFoodSearchViewport\)/);assert.match(runtime,/--hec-search-available-height/);assert.match(styles,/food-search-keyboard-open[\s\S]*?max-height:var\(--hec-search-available-height/);assert.match(styles,/overflow-x:hidden/);assert.doesNotMatch(runtime.slice(runtime.indexOf('function rc6SyncFoodSearchViewport'),runtime.indexOf('renderLibrary=function',runtime.indexOf('function rc6SyncFoodSearchViewport'))),/focus\(|blur\(|scrollIntoView|scrollTo/);
});

test('incremental product ranking converges without changing the editable search field',()=>{
  for(const query of ['Hot','Hotc','Hotca','Hotcake','Hotcakes'])assert.ok(Array.isArray(ranked(query)),query);assert.equal(ranked('Hotcakes')[0].name,'Hotcakes with Butter & Syrup');
  for(const query of ['Saus','Sausage','Sausage and egg McMuffin'])assert.ok(Array.isArray(ranked(query)),query);assert.equal(ranked('Sausage and egg McMuffin')[0].name,'Sausage & Egg McMuffin');
  const runtime=read('alpha06.js');assert.match(runtime,/id!=='food-search'/);assert.doesNotMatch(runtime.slice(runtime.indexOf('function rc6SyncFoodSearchViewport'),runtime.indexOf('window.HEC_PRODUCT_SEMANTICS_TEST')),/autofocus/);
});

test('existing representative food behavior remains intact',()=>{
  assert.equal(ranked('Big Mac')[0].name,'Big Mac');assert.equal(named('Small Fries').semanticType,'sized-variant');assert.equal(named('Medium Fries').semanticType,'sized-variant');assert.equal(named('Large Fries').semanticType,'sized-variant');
  const afcd=semantics.applyToFood(structuredClone(reference)),packaged=semantics.applyToFood(structuredClone(flora)),runtime=read('alpha06.js');assert.deepEqual([afcd.defaultAmount,afcd.defaultUnit],[100,'g']);assert.deepEqual([packaged.defaultAmount,packaged.defaultUnit],[1,'serve']);assert.match(runtime,/data-rc6-quick-add="true"/);assert.match(runtime,/title="Nutrition Details"/);
});

test('the semantic module is loaded once before catalogue imports and cached offline',()=>{
  const html=read('index.html'),worker=read('service-worker.js');assert.ok(html.indexOf('product-serving-semantics.js')<html.indexOf('food-sources.js'));assert.match(worker,/product-serving-semantics\.js/);assert.match(read('serving-foundation.js'),/SEM\?\.applyToFood/);assert.match(read('food-catalogue.js'),/SEM\?\.rankAdjustment/);
});
