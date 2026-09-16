'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../brand-catalogue'),C=require('../food-catalogue');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
require('../woolworths-au-catalogue');require('../coles-au-catalogue');require('../aldi-au-catalogue');

function directoryController(foods,brandCatalogue=B){
  const source=fs.readFileSync(path.join(__dirname,'../alpha06.js'),'utf8');
  const controller=source.slice(source.indexOf('function au633LoadBrand('),source.indexOf('\nfunction au633SubmitBrand('));
  const scope={window:{HECBrandCatalogue:brandCatalogue},C8:C,au633BrandState:null,searchSession633:{rawQuery:'',revision:1},allFoods:()=>foods,au633BrandQueryCurrent:()=>true,au633RenderBrand:()=>{},rememberCanonicalFoods:()=>{},au633ConceptMember:(food,id)=>!id||B.entries.get('off:'+food.barcode)?.conceptIds.includes(id)};
  vm.runInNewContext(controller,scope);return scope;
}

test('actual directory controller preserves the entire index set despite loaded manufacturer and retailer records',async()=>{
  const admitted=B.index.files.flatMap(file=>require('../data/brand-au/'+file.path).records);
  const retailer=require('../woolworths-au-catalogue').index.files.flatMap(file=>require('../data/woolworths-au/'+file.path).records);
  const scope=directoryController([...require('../australian-catalogue-data').packagedProducts,...retailer,...admitted]);
  for(const brand of B.index.brands){
    const state=scope.au633LoadBrand(brand.name);await state.promise;assert(!state.error,brand.key+': '+state.error);
    const expected=B.index.entries.filter(e=>e.brandKeys.includes(brand.key)).map(e=>'barcode:'+e.barcode).sort();
    assert.deepEqual(Array.from(state.records,C.canonicalKey).sort(),expected,brand.key);
  }
});

test('failed generated shard loading cannot substitute a cached or manufacturer-only directory',async()=>{
  const scope=directoryController(require('../australian-catalogue-data').packagedProducts,{...B,search:async()=>{throw Error('synthetic shard failure');}});
  const state=scope.au633LoadBrand('McCain');await state.promise;
  assert.equal(state.records.length,0);assert.match(state.error,/synthetic shard failure/);assert.equal(state.loading,false);
});

test('every generated brand directory has exactly its admitted identities across all pages and categories',async()=>{
  assert.deepEqual([B.index.entries.length,B.index.brands.length,B.index.categories.length],[1922,342,17]);
  for(const brand of B.index.brands){
    const expected=B.index.entries.filter(e=>e.brandKeys.includes(brand.key));
    const actual=[];
    for(let offset=0;;offset+=B.pageSize){const page=await B.page(brand.key,{offset});actual.push(...page.foods);if(!page.hasMore)break;}
    assert.deepEqual(actual.map(C.canonicalKey).sort(),expected.map(e=>'barcode:'+e.barcode).sort(),brand.key);
    assert(actual.every(f=>B.isBrandMember(f,brand.key)),brand.key);
    assert.equal(B.directory(brand.key).categories.reduce((n,c)=>n+c.count,0),actual.length);
  }
});

test('priority counts, source spellings, Hash Browns membership and exact products remain admitted',async()=>{
  for(const [key,count] of [['kelloggs',30],['mccain',6],['campbells',3],['nescafe',3]])assert.equal(B.directory(key).total,count);
  assert.equal(B.directory('pmu'),null);
  for(const query of ['McCain','Mccain','MCCAIN'])assert.equal(B.recognise(query).brand.key,'mccain');
  for(const [query,id] of [['McCain Hash Browns','off:9310174025084'],["Kellogg's Corn Flakes",'off:8801083672700'],["Campbell’s Chunky Beef & Veg",'off:9300644700702'],['Nescafé Café Nescafé Gold Original','off:93625302']])assert((await B.search(query)).foods.some(f=>C.canonicalKey(f)==='barcode:'+id.slice(4)),query);
  const hash=B.entries.get('off:9310174025084');assert.deepEqual(hash.conceptIds,['hash-brown','potato']);
});

test('brand labels, manufacturer supplements and excluded raw products cannot grant generated-directory admission',async()=>{
  const raw=await require('../scripts/audit_open_food_facts_au').api.search('McCain',{limit:500});
  const excluded=raw.foods.filter(f=>!B.isAdmitted(f));assert(excluded.length);
  for(const food of excluded)assert(!B.isBrandMember(food,'mccain'),food.id);
  const supplements=require('../australian-catalogue-data').packagedProducts.filter(f=>f.brand==='McCain'&&!f.barcode);assert(supplements.length);
  for(const food of supplements)assert(!B.isBrandMember(food,'mccain'),food.id);
  const admitted=(await B.search('McCain Hash Browns')).foods[0];
  assert(!B.isBrandMember({...admitted,brand:'Unrelated'},'kelloggs'));
  assert(!B.isBrandMember({...admitted,barcode:null},'mccain'));
});

test('retailer aliases reuse the admitted canonical GTIN without losing either membership',async()=>{
  const food=(await B.search('McCain Hash Browns')).foods[0];
  const retailer=require('../woolworths-au-catalogue').index.files.flatMap(file=>require('../data/woolworths-au/'+file.path).records).filter(f=>f.barcode===food.barcode);
  assert(retailer.length);
  const merged=C.canonicaliseRecords([food,...retailer]);assert.equal(merged.length,1);
  assert.equal(C.canonicalKey(merged[0]),'barcode:9310174025084');
  assert(B.isBrandMember(merged[0],'mccain'));
  assert(C.retailerMembership(merged[0],'woolworths').length);
});

test('fresh brand hydration resolves retailer authority, retains OFF evidence and uses canonical Review nutrition',async()=>{
  require('../woolworths-au-catalogue');
  const food=(await B.search('McCain Hash Browns')).foods[0];
  assert.equal(food.id,'woolworths-au:98299');
  assert(food.mergedRecordIds.includes('off:9310174025084'));
  const admitted=B.index.files.flatMap(file=>require('../data/brand-au/'+file.path).records).find(f=>f.barcode===food.barcode);
  assert.deepEqual(C.sameGtinIdentityConflicts(admitted,food),[]);
  const G=require('../guided-product-resolution'),session=G.createSession([food],food.name,{intent:{kind:'exact-product'}});
  G.selectMeasure(session,'g');G.selectAmount(session,75);
  assert.equal(Math.round(session.nutrition.calories),130);assert.equal(Math.round(session.nutrition.energyKj),543);
  assert(food.canonicalEvidence.some(e=>e.recordId==='off:9310174025084'&&Math.round(e.nutrients.energyKj)===680));
  assert.equal(food.nutrients.sugar,null,'Unknown canonical retailer sugar is not replaced by OFF sugar');
});
