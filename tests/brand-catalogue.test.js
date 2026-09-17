'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const B=require('../brand-catalogue'),C=require('../food-catalogue'),S=require('../serving-foundation'),G=require('../guided-product-resolution');
const report=require('../data/brand-au/build-report.json'),records=B.index.files.flatMap(f=>require('../data/brand-au/'+f.path).records),inputs=new Map(require('../data/brand-au/review-input.json').records.map(r=>[r.record.id,r]));
test('every generated record passes identity, GTIN, AU, nutrition, conflicts and unknown preservation',()=>{
  const valid=require('../scripts/build_coles_catalogue').validGtin,keys=new Set();
  for(const f of records){const input=inputs.get(f.id)?.record||require('../data/catalogue-round-two/off-input.json').records.find(r=>r.record.id===f.id)?.record;if(!input){assert.equal(f.sourceProvenance.trustClass,'official-au-manufacturer');assert.equal(C.productEligibility(f).addability.normalLoggingAllowed,true);assert(f.privateTestingApproved&&f.publicReleaseReviewRequired);assert(!keys.has(C.canonicalKey(f)));keys.add(C.canonicalKey(f));continue;}assert(!keys.has(C.canonicalKey(f)));keys.add(C.canonicalKey(f));assert.equal(C.canonicalKey(f),'barcode:'+f.barcode);assert(valid(f.barcode));assert(input.countries.includes('en:australia'));assert.equal(f.sourceBrands,input.brand);assert.equal(C.productEligibility(f).addability.status,'loggable-now',f.id);assert.equal(f.nutritionIntegrity.status,'usable');assert(!C.sourceConflicts(f).some(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')));for(const key of ['protein','carbs','fat','fibre'])if(input.nutrients[key]==null)assert(f.nutrients[key]==null,f.id+' '+key);assert.equal(f.verified,false);assert.equal(f.currentState,'unknown');}
  assert.equal(keys.size,B.index.entries.length);
});
test('all admitted source tokens meet reproducible tiers without merging companies or sub-brands',()=>{
  for(const b of B.index.brands){const count=records.filter(f=>f.sourceBrandTokens.some(t=>t.key===b.key)).length;assert.equal(b.count,count,b.key);assert.equal(b.tier,'private-testing');assert(count>=1);}
  assert(B.brands.has('nestlé')&&B.brands.has('nestle'));assert.notEqual(B.brands.get('nestlé'),B.brands.get('nestle'));
});
test('the wave adds no duplicate OFF identity and retains existing retailer evidence',()=>{
  const existing=new Map(require('../data/open-food-facts-au/manifest.json').productShards.flatMap(s=>require('../data/open-food-facts-au/'+s.path).products).map(r=>[r.id,r]));
  for(const f of records.filter(f=>f.sourceProvenance.trustClass==='open-food-facts-au')){assert(existing.has(f.id));assert.equal(f.barcode,existing.get(f.id).barcode);}
  const bread=records.find(f=>f.id==='off:4061462249464');assert(bread);assert.equal(C.sourceDeclaredRetailerMembership(bread,'aldi').length,1);
});
test('known solids never gain liquid measures in the complete generated wave',()=>{
  for(const f of records){const form=S.physicalForm(f).form;if(!['liquid','spread','unknown'].includes(form))assert(!S.servingMeasureProfile(f).measures.some(m=>['mL','L','cup'].includes(m.key)),f.id+' '+f.name);}
});
test('brand plus exact product outranks lexical extensions and incomplete records never enter brand browse',async()=>{
  const result=await B.search("Kellogg's Corn Flakes",{limit:20});assert.equal(C.norm(result.foods[0].name),'corn flakes');assert(result.foods.every(f=>C.productEligibility(f).addability.normalLoggingAllowed));
  for(const q of ["Kellogg’s",'McCain',"Campbell’s",'Nescafé']){const r=await B.search(q,{limit:500});assert(r.total>1);assert.equal(r.total,r.foods.length);assert(r.foods.every(f=>B.isAdmitted(f)));}
});
test('brand browse is bounded, category scoped, and all pages cover the complete brand',async()=>{
  const key='chobani',seen=new Set();for(let offset=0;;offset+=B.pageSize){const r=await B.page(key,{offset});assert(r.foods.length<=20);for(const f of r.foods){assert(!seen.has(f.id));seen.add(f.id);}if(!r.hasMore)break;}assert.equal(seen.size,B.directory(key).total);
  for(const category of B.directory('kelloggs').categories){const r=await B.page('kelloggs',{categoryId:category.id});assert(r.foods.every(f=>f.categoryId===category.id));}
});
test('generic food and retailer intent cannot become an exact-brand catalogue query',()=>{
  for(const q of ['Bread','Milk','Cereal','Yoghurt','Soup','Potato','Big Mac','Coles','Woolworths','Aldi'])assert.equal(B.recognise(q),null,q);
});
test('a complete indexed brand outranks a shorter registered brand prefix',async()=>{
  const query='Westacre Dairy Light Tasty Cheese Shredded',intent=C.queryIntent(query),result=await B.search(query);
  assert.equal(C.brandKey(intent.entity.name),'westacredairy');assert.equal(intent.productQuery.toLowerCase(),'light tasty cheese shredded');assert(C.explicitIdentityMatch(result.foods[0],query,intent));
});
test('concept Brand Name options contain accepted relevant products only',async()=>{
  assert(B.conceptBrands('cereal').some(b=>b.key==='kelloggs'));assert(!B.conceptBrands('cereal').some(b=>b.key==='nescafe'));
  for(const b of B.conceptBrands('cereal')){const page=await B.page(b.key,{conceptId:'cereal'});assert(page.foods.length);assert(page.foods.every(f=>f.conceptIds.includes('cereal')&&f.categoryId==='cereal'));}
});
test('source tokens allow secondary explicit brand membership without ownership inference',()=>{
  const f=records.find(f=>f.sourceBrandTokens.length>1);assert(f);for(const t of f.sourceBrandTokens)assert(C.consumerBrandMembership({type:'brand',name:t.name},f).matches);assert(!C.consumerBrandMembership({type:'brand',name:'Unrelated Example'},f).matches);
});
test('cancelled asynchronous queries cannot hand off foods',async()=>{assert.equal(await B.search('Kellogg’s',{isCurrent:()=>false}),null);assert.equal(await B.page('kelloggs',{isCurrent:()=>false}),null);});
test('decorated brand sorting preserves the existing complete ranking order',()=>{const sample=records.slice(0,70);assert.deepEqual(C.sortedAustralianProducts(sample).map(f=>f.id),[...sample].sort(C.compareAustralianProducts).map(f=>f.id));});
test('cached raw OFF rows cannot bypass audited brand admission',async()=>{
  const O=require('../scripts/audit_open_food_facts_au').api;for(const barcode of ['9300605137424','9300605156852','9300652801309']){const food=await O.lookupBarcode(barcode);assert(food);assert(!B.isAdmitted(food));assert(!B.ordinaryChoice(food));}
  assert(B.ordinaryChoice(records.find(f=>f.id==='off:9310055536579')));
});
test('representative real products retain one amount-to-Review conversion',()=>{
  for(const id of ['off:9310055536579','off:9310174025084','off:9300644700702','off:93625302','off:0613008753481','off:8852756327694']){const food=records.find(f=>f.id===id);assert(food,id);const session=G.createSession([food],food.name,{intent:{kind:'exact-product'}});const metric=food.units.g?'g':'mL';G.selectMeasure(session,metric);G.selectAmount(session,37);assert(session.nutrition,id);assert.equal(session.amount,37);}
});
