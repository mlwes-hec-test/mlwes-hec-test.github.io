'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const C=require('../food-catalogue'),O=require('../off-catalogue'),R=require('../retailer-catalogue'),A=require('../retailer-source'),B=require('../scripts/build_coles_catalogue'),G=require('../guided-product-resolution');
const {index}=require('../coles-au-catalogue'),{rows,policy}=B.derive(),bread=rows.find(r=>r.item.ref==='co-01:491').food;
test.afterEach(()=>A.register(index));
test('all Coles source rows reproduce from pinned, attributable OFF bytes without changing the protected layer',()=>{
  B.build({check:true});assert.equal(rows.length,34);assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/open-food-facts-au/manifest.json')).digest('hex'),policy.source.manifestSha256);
  for(const {record,food,item} of rows){assert.equal(record.id,item.id);assert(B.validGtin(record.barcode));assert.equal(food.id,record.id);assert.equal(food.brand,record.brand);assert.deepEqual(food.nutrients,O.toFood(record).nutrients);assert.deepEqual(food.rawSourceNutrients,record.nutrients);assert.deepEqual(food.sourceCategories,record.categories);assert.equal(food.sourceNutritionBasis,record.nutritionBasis);assert.equal(C.sourceEvidence(food).trustClass,'open-food-facts-au');assert.equal(C.productEligibility(food).verified,false);assert.equal(C.retailerMembership(food,'coles').length,0);assert.equal(C.privateLabelCollectionMembership(food,'coles').length,1);assert.equal(food.currentState,'unknown');assert.equal(food.sourceAttribution.attribution,'Open Food Facts contributors');}
});
test('reviewed collection directory is lazy, paged and excludes restricted rows',async()=>{
  const reads=[];A.register(index,{loadJSON:async f=>{reads.push(f);return require('../data/coles-au/'+f);}});
  const d=R.directory('coles');assert.equal(d.total,23);assert.equal(d.categories.length,12);assert.equal(reads.length,0);assert.equal(d.retailer.collectionMode,'source-declared-brand');
  const a=await R.page('coles'),b=await R.page('coles',{offset:20});assert.equal(a.foods.length,20);assert.equal(b.foods.length,3);assert(a.hasMore);assert(!b.hasMore);
  assert.equal(new Set([...a.foods,...b.foods].map(f=>f.id)).size,23);for(const f of [...a.foods,...b.foods])assert.equal(C.productEligibility(f).addability.normalLoggingAllowed,true);
  assert(!a.foods.concat(b.foods).some(f=>rows.find(r=>r.food.id===f.id).food.browseEligible===false));
});
test('guided Coles bread uses reviewed source-declared brand identity without claiming retailer verification',async()=>{
  const result=await R.page('coles',{scope:'commercial-identity',conceptId:'bread'});assert.equal(result.foods.length,3);assert(result.foods.every(f=>C.brandKey(f.brand)==='coles'));assert(result.foods.every(f=>C.commercialIdentityMembership(R.entity('coles'),f).reason==='source-declared-private-label-identity'));
  assert(!C.commercialIdentityMembership(R.entity('coles'),O.toFood(rows[0].record)).matches);
});
test('synthetic national-brand, missing-pin, foreign-source and wrong-record claims cannot enter the collection',()=>{
  const clone=()=>structuredClone(bread);for(const edit of [f=>f.brand='Tip Top',f=>f.privateLabelCollections[0].verified=true,f=>f.privateLabelCollections[0].evidence.sha256='',f=>f.privateLabelCollections[0].evidence.url='https://evilopenfoodfacts.org/product/'+f.barcode,f=>f.privateLabelCollections[0].evidence.recordId='off:12345678']){const f=clone();edit(f);assert.equal(C.privateLabelCollectionMembership(f,'coles').length,0);assert(!C.commercialIdentityMembership(R.entity('coles'),f).matches);assert.equal(C.retailerMembership(f,'coles').length,0);}
});
test('compatible same-GTIN OFF hydration retains one identity and the separate collection provenance',()=>{
  const raw=O.toFood(rows[0].record),foods=C.canonicaliseRecords([raw,bread]);assert.equal(foods.length,1);assert.equal(foods[0].id,bread.id);assert.deepEqual(foods[0].nutrients,bread.nutrients);assert.equal(C.privateLabelCollectionMembership(foods[0],'coles').length,1);assert.equal(C.retailerMembership(foods[0],'coles').length,0);assert.equal(C.privateLabelCollectionMembership(C.canonicaliseRecords([foods[0],raw])[0],'coles').length,1);
});
test('synthetic compatible cross-retailer evidence keeps memberships separate and never manufactures Coles listing evidence',()=>{
  const other={...structuredClone(bread),id:'synthetic:other-store',retailerMemberships:[{retailerId:'woolworths',market:'AU',scope:'food',verified:true,categoryIds:['bread'],evidence:{trustClass:'package-verified-au',sourceId:'synthetic-fixture',recordId:'synthetic:other-store',url:'https://example.org/synthetic-fixture',retrievedAt:'2026-09-13T00:00:00Z'}}],privateLabelCollections:[]};
  const [food]=C.canonicaliseRecords([bread,other]);assert.equal(C.retailerMembership(food,'woolworths').length,1);assert.equal(C.retailerMembership(food,'coles').length,0);assert.equal(C.privateLabelCollectionMembership(food,'coles').length,1);
});
test('synthetic same-GTIN brand/pack/form conflicts remain blocked after re-canonicalisation',()=>{
  for(const change of [{brand:'Tip Top'},{packageSize:'99 kg',pack:{amount:99000,unit:'g'}},{physicalForm:'liquid'}]){const other={...structuredClone(bread),id:'synthetic:conflict',packageSize:'650 g',...change};const original={...structuredClone(bread),packageSize:'500 g'};const [f]=C.canonicaliseRecords([original,other]);assert.equal(C.productEligibility(f).addability.normalLoggingAllowed,false);assert.equal(C.productEligibility(C.canonicaliseRecords([f,bread])[0]).addability.normalLoggingAllowed,false);}
});
test('missing and conflicting real nutrition remains restricted; unknown optional nutrients stay unknown',()=>{
  for(const r of rows.filter(r=>r.eligibility.addability.status!=='loggable-now')){assert.equal(r.food.browseEligible,false);assert.notEqual(G.createSession([r.food],r.food.name,{intent:{kind:'exact-product'}}).addability?.normalLoggingAllowed,true);assert.equal(C.productEligibility(r.food).addability.normalLoggingAllowed,false);}
  const tuna=rows.find(r=>r.item.ref==='co-02:188');assert.equal(tuna.food.nutrients.sodium,undefined);assert.equal(tuna.food.nutrients.sugar,undefined);assert.equal(tuna.food.browseEligible,true);
});
test('source natural bread slices and mL drink amounts retain one confirmation and unchanged nutrition',()=>{
  const s=G.createSession([bread],bread.name,{intent:{kind:'exact-product'}});G.selectMeasure(s,'slice');G.selectAmount(s,2);assert.equal(s.stage,G.stages.CONFIRMATION);assert(Math.abs(s.nutrition.calories-bread.nutrients.calories*.84)<.001);
  const drink=rows.find(r=>r.item.ref==='co-01:96').food;assert(!Object.keys(drink.units).includes('g'));const d=G.createSession([drink],drink.name,{intent:{kind:'exact-product'}});G.selectMeasure(d,'mL');G.selectAmount(d,250);assert.equal(d.stage,G.stages.CONFIRMATION);assert(Math.abs(d.nutrition.calories-49)<.001);
});
test('late Coles requests cannot replace Woolworths or generic query ownership',async()=>{
  let finish;A.register(index,{loadJSON:f=>new Promise(resolve=>{finish=()=>resolve(require('../data/coles-au/'+f));})});
  const s=R.createSession('coles',{ownerQuery:'Coles',ownerRevision:1});const pending=R.load(s,{categoryId:'bread'});await new Promise(resolve=>setImmediate(resolve));R.cancel(s);finish();assert.equal(await pending,null);assert.equal(s.result,null);assert.equal(R.recognise('Bread'),null);
});
test('changed hydrated collection evidence fails closed and cannot silently admit a different source',async()=>{
  A.register(index,{loadJSON:async f=>{const page=structuredClone(require('../data/coles-au/'+f));page.records.forEach(r=>r.privateLabelCollections=[]);return page;}});await assert.rejects(R.page('coles',{categoryId:'bread'}),/collection evidence differs/);
});
test('generic intent and existing OFF identifiers remain unchanged',()=>{assert.equal(C.queryIntent('Coles').kind,'retailer');for(const q of ['Bread','Milk'])assert.equal(C.queryIntent(q).kind,'product');for(const row of rows)assert.equal(C.canonicalKey(row.food),C.canonicalKey(O.toFood(row.record)));});
