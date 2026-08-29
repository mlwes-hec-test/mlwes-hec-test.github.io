const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const sources=require('../food-sources.js');
const registered=require('../mcdonalds-au-catalogue.js');
const catalogue=require('../food-catalogue.js');
const packaged=require('../packaged-foods.js');
const integrity=require('../mcdonalds-au-integrity.js');
require('../serving-foundation.js');
const serving=globalThis.HECServingFoundation;
const data=sources.getCatalogue('mcdonalds-au');
const records=sources.foodRecords({sourceId:'mcdonalds-au'});
const byItem=id=>records.find(record=>record.sourceItemId===id);
const byVariant=(id,variant)=>records.find(record=>record.sourceItemId===id&&record.sourceVariantId===variant);

test('source identity, official references, refresh metadata and Founder-Trial licensing are explicit',()=>{
  const source=data.source;
  assert.equal(registered.schemaVersion,2);assert.equal(source.id,'mcdonalds-au');assert.equal(source.displayName,"McDonald's Australia");
  assert.equal(source.sourceType,'restaurant/fast food');assert.equal(source.market,'AU');assert.equal(source.country,'Australia');
  assert.ok(source.aliases.includes('Macca’s'));assert.ok(source.aliases.includes('Maccas'));
  assert.match(source.officialUrl,/^https:\/\/www\.mcdonalds\.com\/au\/en-au\/menu/);assert.equal(source.lastCheckedDate,'2026-08-26');
  assert.match(source.catalogueVersion,/mcdonalds-au-2026-08-26-founder-trial\.1/);assert.match(source.catalogueCheckedAt,/^2026-08-26T/);
  assert.equal(source.usageScope,'development/founder-trial');assert.equal(source.licenceStatus,'no-affirmative-production-catalogue-reuse-licence-granted');assert.equal(source.productionApproved,false);
  assert.equal(source.refreshPolicy.schedulerIncluded,false);assert.equal(source.refreshPolicy.preservePublishedAnomalies,true);
});

test('complete current catalogue has the reviewed 167-family classification and 211 runtime records',()=>{
  assert.equal(data.items.length,167);assert.equal(records.length,211);assert.ok(data.items.every(item=>item.status==='current'));
  assert.equal(data.items.filter(item=>item.nutritionStatus==='complete').length,142);
  assert.equal(data.items.filter(item=>item.nutritionStatus==='unavailable').length,17);
  assert.equal(data.items.filter(item=>item.nutritionStatus==='configurable').length,8);
  assert.equal(records.filter(record=>record.loggable).length,186);assert.equal(records.filter(record=>!record.loggable).length,25);
  assert.equal(new Set(data.items.map(item=>item.id)).size,167);assert.equal(new Set(records.map(record=>record.id)).size,211);
});

test('all 17 official category surfaces and overlapping memberships are retained',()=>{
  assert.equal(data.source.inventory.categorySurfaces.length,17);
  assert.deepEqual(data.source.inventory.categorySurfaces.map(surface=>surface.count),[19,20,25,16,18,6,20,10,13,42,11,32,7,15,14,8,8]);
  assert.deepEqual([...new Set(data.items.map(item=>item.category))].sort(),['Breakfast','Bundle Meals','Burgers','Chicken & Fish','Condiments','Desserts','Drinks','Happy Meal','McCafé Drinks','McCafé Food','Shakes & Frappes','Sides']);
  assert.deepEqual(sources.itemById('big-mac',{sourceId:'mcdonalds-au'}).categoryMemberships,['Burgers','Beef','All Day']);
  assert.deepEqual(sources.itemById('cheeseburger',{sourceId:'mcdonalds-au'}).categoryMemberships,['Burgers','Beef','Sides','Happy Meal','All Day']);
});

test('official per-serving and per-100 facts retain all published fields without inventing fibre or weight',()=>{
  const bigMac=byItem('big-mac');
  assert.deepEqual(bigMac.nutrients,{energyKj:2600,calories:621,protein:28.7,fat:34.4,satFat:13.8,carbs:46.5,sugar:8,sodium:1119});
  assert.equal(bigMac.nutritionPer100.energyKj,1070);assert.equal(bigMac.nutritionPer100.calories,255);
  assert.equal(Object.hasOwn(bigMac.nutrients,'fibre'),false);assert.equal(bigMac.servingWeightG,null);assert.equal(bigMac.servingVolumeMl,null);
  const milk=records.find(record=>/CalciYum/.test(record.name));assert.equal(milk.nutritionPer100Unit,'mL');
});

test('the 17 incomplete products are searchable but cannot enter Diary and contain no estimated energy',()=>{
  const names=data.items.filter(item=>item.nutritionStatus==='unavailable').map(item=>item.name);
  assert.equal(names.length,17);assert.ok(names.includes('Iced Chai Latte'));assert.ok(names.includes('Brown Sugar Shaken Espresso with Oat Milk'));
  const chai=byItem('iced-chai-latte');assert.equal(catalogue.rank(chai,'iced chai latte').tier,'exact-name');assert.equal(catalogue.canLog(chai),false);
  assert.equal(packaged.completeness(chai).canAddToDiary,false);assert.match(chai.entryBlockedReason,/does not currently publish/i);assert.equal(Object.keys(chai.nutrients).length,0);
});

test('eight configurable bundles use a future component-assembly model and never a fixed value',()=>{
  const bundles=data.items.filter(item=>item.nutritionStatus==='configurable');assert.equal(bundles.length,8);
  for(const item of bundles){assert.equal(item.itemKind,'configurable-assembly');assert.equal(item.loggable,false);assert.equal(item.assemblyModel.nutritionAggregation,'sum-selected-components');assert.equal(item.assemblyModel.implementationStatus,'future-configurator');assert.equal(Object.keys(item.nutritionPerServing).length,0);}
  const mega=byItem('maccas-mega-meal');assert.equal(catalogue.canLog(mega),false);assert.match(mega.entryBlockedReason,/configurable product and size choices/i);
});

test('McCafé families resolve to complete size children while incomplete families remain details-only',()=>{
  const families=data.items.filter(item=>item.categoryMemberships.includes('McCafé Drinks'));
  const variants=records.filter(record=>record.sourceVariantId&&record.categoryMemberships.includes('McCafé Drinks'));
  assert.equal(families.length,42);assert.equal(variants.length,63);assert.equal(records.filter(record=>!record.sourceVariantId&&record.categoryMemberships.includes('McCafé Drinks')&&record.loggable).length,4);
  const small=byVariant('cappuccino','small'),large=byVariant('cappuccino','large');assert.ok(small);assert.ok(large);assert.equal(large.name,'Large Cappuccino');
  assert.ok(catalogue.rank(small,'cappuccino').score>0);assert.equal(catalogue.rank(large,'large maccas cappuccino').tier,'exact-alias');
});

test('Iced Chai defective source links are recorded and are not converted to latte size records',()=>{
  const chai=sources.itemById('iced-chai-latte',{sourceId:'mcdonalds-au'});assert.equal(chai.variants.length,0);assert.equal(chai.nutritionStatus,'unavailable');
  assert.equal(chai.officialSizeLinks.length,3);assert.match(chai.officialSizeLinks.find(link=>link.label==='Small').url,/iced-latte-small/);assert.match(chai.officialSizeLinks.find(link=>link.label==='Large').url,/iced-latte-large/);assert.match(chai.officialSizeLinks.find(link=>link.label==='Medium').url,/iced-chai-latte-medium/);
  assert.match(chai.sourceAnomalies.join(' '),/size selector links labelled Small and Large resolve to Iced Latte pages/i);
});

test('promotional and explicitly limited-time classifications match the reviewed official surfaces',()=>{
  assert.equal(data.items.filter(item=>item.promotional).length,20);assert.equal(data.items.filter(item=>item.limitedTime).length,5);
  assert.equal(data.items.filter(item=>item.promotionalStatus==='featured').length,15);assert.equal(data.items.filter(item=>item.promotionalStatus==='limited-time').length,5);
  assert.ok(data.items.filter(item=>item.limitedTime).every(item=>item.promotionExpiry===''));
});

test('source, punctuation and product aliases use the shared exact-first resolver',()=>{
  for(const query of ["McDonald's",'McDonalds','Macca’s','Maccas','Macca'])assert.ok(catalogue.rank(byItem('big-mac'),query).score>=1400,query);
  assert.equal(sources.sourceForAlias('maccas').id,'mcdonalds-au');assert.equal(sources.sourceForAlias("McDonald's").id,'mcdonalds-au');
  assert.ok(records.filter(record=>catalogue.rank(record,'maccas').score>=1400).length>150);
  const generic={id:'generic-burger',name:'Burger bun',brand:'Generic',country:'Australia',aliases:['burger'],nutrients:{calories:100}};
  assert.ok(catalogue.rank(byItem('big-mac'),'big mac').score>catalogue.rank(generic,'big mac').score);
  assert.ok(catalogue.rank(byItem('6pc-chicken-mcnuggets'),'6 nuggets').score>=1400);
});

test('every record uses a natural fixed serving and none defaults to 1 g',()=>{
  assert.ok(records.every(record=>record.defaultAmount===1));assert.ok(records.every(record=>record.defaultUnit!=='g'));
  assert.equal(byItem('big-mac').defaultUnit,'burger');assert.equal(byItem('bacon-egg-mcmuffin').defaultUnit,'muffin');
  assert.equal(byVariant('cappuccino','large').serving,'1 large drink');
  const resolved=serving.applyToFood(structuredClone(byItem('big-mac')));assert.equal(resolved.defaultUnit,'burger');assert.equal(resolved.lockedServingUnit,'burger');
});

test('official fries sizes keep distinct servings and January 2026 source-backed nutrition',()=>{
  const small=byItem('small-fries'),medium=byVariant('small-fries','medium'),large=byVariant('small-fries','large');
  assert.equal(small.name,'Small Fries');assert.equal(medium.name,'Medium Fries');assert.equal(large.name,'Large Fries');
  assert.equal(medium.serving,'1 medium fries portion');assert.equal(large.serving,'1 large fries portion');
  assert.deepEqual(medium.nutrients,{energyKj:1320,calories:316,protein:5,fat:16.6,satFat:1.4,carbs:35.2,sugar:0,sodium:304});
  assert.deepEqual(large.nutrients,{energyKj:1630,calories:389,protein:6.1,fat:20.5,satFat:1.7,carbs:43.3,sugar:0,sodium:374});
  assert.match(medium.provenance.supportingReference,/Aus%20Core%20Food%20Menu_January%202026\.pdf$/);assert.equal(large.nutritionPer100.calories,304);
});

test('Diary snapshots preserve catalogue facts, variant identity and non-production licensing immutably',()=>{
  const cappuccino=byVariant('cappuccino','large'),snapshot=packaged.diarySnapshot(cappuccino,{amount:1,unit:'drink',unitLabel:'Large Drink',nutrients:cappuccino.nutrients,loggedAt:'2026-08-25T10:00:00+10:00'}),saved=structuredClone(snapshot);
  cappuccino.nutrients.calories=9999;cappuccino.sourceAnomalies.push('later mutation');
  assert.deepEqual(snapshot,saved);assert.equal(snapshot.sourceItemId,'cappuccino');assert.equal(snapshot.sourceVariantId,'large');assert.equal(snapshot.familyName,'Cappuccino');
  assert.equal(snapshot.usageScope,'development/founder-trial');assert.equal(snapshot.productionApproved,false);assert.match(snapshot.licenceStatus,/no-affirmative-production/);
  assert.equal(snapshot.lastSeenAt,'2026-08-26T17:01:32+10:00');
  const historical=packaged.foodFromSnapshot({foodSnapshot:snapshot});assert.equal(historical.nutrients.calories,saved.nutrients.calories);assert.equal(historical.sourceVariantId,'large');
});

test('refresh reconciliation retires removals and versions nutrition/detail changes without deletion',()=>{
  const previous=sources.getCatalogue('mcdonalds-au'),incoming=structuredClone(previous),removed=incoming.items.pop(),bigMac=incoming.items.find(item=>item.id==='big-mac');
  incoming.source.catalogueVersion='mcdonalds-au-future';incoming.source.lastCheckedDate='2026-09-01';incoming.source.catalogueCheckedAt='2026-09-01T02:00:00+10:00';bigMac.nutritionPer100.calories=256;bigMac.categoryMemberships.push('Future Test');
  const diff=sources.diffCatalogues(previous,incoming),reconciled=sources.reconcileCatalogues(previous,incoming),retired=reconciled.items.find(item=>item.id===removed.id),changed=reconciled.items.find(item=>item.id==='big-mac');
  assert.deepEqual(diff.removed,[removed.id]);assert.deepEqual(diff.nutritionChanged,['big-mac']);assert.ok(diff.detailsChanged.includes('big-mac'));
  assert.equal(retired.status,'retired');assert.equal(retired.retiredAt,'2026-09-01');assert.equal(changed.versions.length,1);assert.equal(changed.versions[0].snapshot.nutritionPer100.calories,255);
  const nextIncoming=structuredClone(incoming),next=sources.reconcileCatalogues(reconciled,nextIncoming);assert.equal(next.items.find(item=>item.id===removed.id).retiredAt,'2026-09-01');
});

test('current resolver excludes retired records while historical snapshots remain usable',()=>{
  const retired=structuredClone(data.items[0]);retired.status='retired';retired.retiredAt='2026-09-01';
  const converted=sources.toFoodRecord(retired,data.source);assert.equal(converted.current,false);assert.equal(converted.itemStatus,'retired');
  assert.ok(sources.foodRecords({sourceId:'mcdonalds-au'}).every(record=>record.itemStatus==='current'));
  assert.ok(packaged.foodFromSnapshot({foodSnapshot:packaged.diarySnapshot(converted,{amount:1,unit:converted.defaultUnit,unitLabel:converted.unitLabels[converted.defaultUnit],nutrients:converted.nutrients})}));
});

test('source catalogue uses the common resolver and all runtime dependencies are offline-cached in order',()=>{
  const runtime=read('alpha06.js'),html=read('index.html'),worker=read('service-worker.js');
  assert.match(runtime,/FOODS\.push\(\.\.\.\(window\.HECFoodSources\?\.foodRecords\?\.\(\)\|\|\[\]\)\)/);assert.match(runtime,/base=C8\.rank\(food,nq,options\)\.score/);
  assert.doesNotMatch(runtime,/mcd:\{label:"McDonald’s Australia"/);assert.ok(html.indexOf('food-sources.js')<html.indexOf('mcdonalds-au-catalogue-data.js'));assert.ok(html.indexOf('mcdonalds-au-catalogue-data.js')<html.indexOf('mcdonalds-au-catalogue.js'));assert.ok(html.indexOf('mcdonalds-au-catalogue.js')<html.indexOf('alpha06.js'));
  assert.match(worker,/mcdonalds-au-catalogue-data\.js/);assert.match(worker,/mcdonalds-au-catalogue\.js/);
});

test('AFCD, My Foods, Recent and recipes retain their established central paths',()=>{
  const runtime=read('alpha06.js');assert.match(runtime,/return \[\.\.\.FOODS,\.\.\.custom,\.\.\.AFCD_FOODS,\.\.\.\(ext\.onlineFoods\|\|\[\]\)\]/);assert.match(runtime,/function renderRecentLibrary\(query=""\)/);assert.match(runtime,/function renderRecipeLibrary\(query=""\)/);assert.match(runtime,/ext\.savedFoodIds\.includes\(food\.id\)/);
  const afcd={id:'afcd-banana',afcd:true,afcdKey:'BANANA',name:'Banana, raw',brand:'Australian Food Composition Database',country:'Australia',aliases:['banana'],nutrients:{calories:90},source:'Food Standards Australia New Zealand · AFCD Release 3'};assert.ok(catalogue.rank(afcd,'banana').score>0);
});

test('published source anomalies remain verbatim facts rather than silent corrections',()=>{
  const doubleBacon=byItem('double-bacon-egg-mcmuffin');assert.equal(doubleBacon.nutrients.energyKj,1370);assert.equal(doubleBacon.nutrients.calories,518);assert.match(doubleBacon.sourceAnomalies.join(' '),/retained without correction/i);
  const ranch=byItem('ranch-sauce');assert.equal(ranch.nutrients.energyKj,553);assert.equal(ranch.nutrients.calories,0);assert.equal(ranch.nutritionPer100.calories,0);assert.match(ranch.sourceAnomalies.join(' '),/0 Cal/);
});

test('official provenance is factual verification and never implies production reuse permission',()=>{
  assert.ok(records.every(record=>record.sourceUrl.startsWith('https://www.mcdonalds.com/au/en-au/menu/')));assert.ok(records.every(record=>record.verified&&record.verificationStatus==='official-source'));
  assert.ok(records.every(record=>record.usageScope==='development/founder-trial'&&record.productionApproved===false));assert.ok(records.every(record=>record.licensing.inheritedFromSource));
  assert.ok(data.source.referenceUrls.some(url=>url.endsWith('/terms-and-conditions.html')));assert.match(data.source.referenceMetadata.retrievalMethod,/Founder-Trial catalogue transcription/);
});

test('program integrity report returns the reviewed totals with zero errors',()=>{
  const report=integrity.buildIntegrityReport();assert.equal(report.totalEntities,167);assert.equal(report.totalRuntimeRecords,211);assert.equal(report.fullyLoggableEntities,142);assert.equal(report.fullyLoggableRecords,186);assert.equal(report.incompleteEntities,17);assert.equal(report.configurableEntities,8);assert.equal(report.mccafeFamilies,42);assert.equal(report.mccafeVariants,63);assert.equal(report.promotionalEntities,20);assert.equal(report.limitedTimeEntities,5);assert.equal(report.errorCount,0);assert.deepEqual(report.errors,[]);
});

test('UI contract keeps blocked products details-only and displays exact reasons and licensing',()=>{
  const runtime=read('alpha06.js');assert.match(runtime,/food\.entryBlockedReason\|\|'A complete fixed nutrition value is not available/);assert.match(runtime,/nutritionStatus==='configurable'\?'Configurable meal'/);assert.match(runtime,/Cannot add to Diary/);assert.match(runtime,/Catalogue use:/);assert.match(runtime,/data-food-details/);assert.match(runtime,/C8&&\!C8\.canLog\(food\)/);
});
