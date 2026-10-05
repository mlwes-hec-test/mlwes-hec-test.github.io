'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('../scripts/catalogue-wave-3a'),C=require('../food-catalogue'),O=require('../off-catalogue'),S=require('../serving-foundation'),G=require('../guided-product-resolution'),D=require('../catalogue-discovery'),R=require('../retailer-catalogue'),B=require('../brand-catalogue'),SEM=require('../scripts/food-category-semantics'),X=require('../scripts/catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),report=W.derive(),input=W.inputs();
for(const kind of ['aldi','coles','woolworths'])require('../'+kind+'-au-catalogue');
async function all(kind){const foods=[];for(let offset=0;;offset+=20){const p=await R.page(kind,{offset});foods.push(...p.foods);if(!p.hasMore)return foods;}}
test('39 enrolled identities resolve uniquely and category moves are subsets of improvements',()=>{
 assert.deepEqual(Object.values(report.groups).map(g=>g.reviewed),[15,17,5,2]);assert.equal(report.candidateCount,39);assert.equal(new Set(report.reviews.map(r=>r.canonicalKey)).size,39);
 for(const g of Object.values(report.groups)){assert.equal(g.reviewed,g.newCanonicalAdmitted+g.existingCanonicalImproved+g.restricted+g.deferredRejected);assert(g.recategorised<=g.existingCanonicalImproved);}
 assert.equal(report.newCanonicalIdentities,1);assert.equal(report.newlyLoggable,3);assert.equal(report.groups.C.duplicateEvidenceCollapsed,2);
});
test('15 retained holds and four deferrals stay out of normal admission',async()=>{
 const keys=new Set((await all('aldi')).map(C.canonicalKey)),globalKeys=new Set(B.index.entries.map(C.canonicalKey));
 for(const review of report.reviews.filter(r=>['restricted','deferred'].includes(r.disposition))){assert(!keys.has(review.canonicalKey));assert(!globalKeys.has(review.canonicalKey));assert(!review.privateTestingApproved);assert(review.unresolved);assert(review.reason.length>20);}
 const hash=report.reviews.find(r=>r.candidateId==='3A-A-01');assert(hash.reason.includes('conflict'));assert.equal(hash.evidence.per100.satFat,null);assert.equal(hash.evidence.per100.sugar,null);
});
test('exact package GTINs complete existing identities without collapsing other milk or vegetable formulations',()=>{
 for(const food of report.admissions.filter(f=>f.brand!=='Pepsi Max')){const old=input.peers.records.find(p=>p.record.barcode===food.barcode).record;assert.deepEqual(old.nutrients,{});const merged=C.canonicaliseRecords([food,O.toFood(old)]);assert.equal(merged.length,1);assert(C.canLog(merged[0]));assert.deepEqual(C.sourceConflicts(merged[0]),[]);assert.equal(C.canonicalKey(merged[0]),'barcode:'+old.barcode);}
 const milk=report.admissions.find(f=>f.brand==='Farmdale');const other={...milk,id:'another',barcode:'4088700158074',canonicalId:'barcode:4088700158074'};assert.equal(C.canonicaliseRecords([milk,other]).length,2);
 const conflict={...milk,id:'incompatible',pack:{amount:1000,unit:'mL'},packageSize:'1 L',name:'Full Cream Milk 1L'};assert(!C.canLog(C.canonicaliseRecords([milk,conflict])[0]),'Same-GTIN incompatible pack must remain blocked');
});
test('two package-evidenced Aldi trademarks enter house browse, independent Pepsi stays global',async()=>{
 const aldi=await all('aldi');for(const brand of ['Farmdale','Market Fare']){const f=aldi.find(f=>f.brand===brand);assert(f);assert.equal(C.privateLabelCollectionMembership(f,'aldi').length,1);assert(f.fieldProvenance.ownership.houseBrandRelationship.rawWording.includes('registered trademark'));}
 const f=report.admissions.find(f=>f.brand==='Pepsi Max');assert(!aldi.some(p=>p.barcode===f.barcode));assert.equal(C.privateLabelCollectionMembership(f,'aldi').length,0);assert.equal(C.retailerMembership(f,'aldi').length,1);assert.equal(C.sourceEvidence(f).trustClass,'package-verified-au');assert.equal(f.identityEvidence.independentCorroboration.trustClass,'official-au-manufacturer');assert.equal(f.retailerMemberships[0].evidence.trustClass,'official-au-retailer');assert.equal(f.retailerMemberships[0].currentAvailability,'unknown');assert.equal(B.index.entries.filter(e=>e.barcode===f.barcode).length,1);
});
test('unknown fibre, true printed zero, preparation and human measures survive a complete review flow',()=>{
 const milk=report.admissions.find(f=>f.brand==='Farmdale'),veg=report.admissions.find(f=>f.brand==='Market Fare'),pepsi=report.admissions.find(f=>f.brand==='Pepsi Max');assert.equal(milk.nutrients.fibre,null);assert.equal(pepsi.nutrients.fibre,0);assert.equal(pepsi.nutrients.fat,0);assert.equal(pepsi.nutrients.sugar,0);
 assert.match(veg.name,/prepared by boiling/);assert.match(veg.sourceNutritionBasis.state,/drained/);assert.deepEqual(new Set(S.servingMeasureProfile(veg).measures.map(m=>m.key)),new Set(['g','serve']));
 for(const [food,unit,amount,kj,cal]of [[milk,'mL',250,648,155],[veg,'g',100,268,64],[pepsi,'mL',250,5,1]]){const session=G.createSession([food],food.name,{intent:{kind:'exact-product'}});G.selectMeasure(session,unit);G.selectAmount(session,amount);assert.equal(session.stage,G.stages.CONFIRMATION);assert.equal(Math.round(session.nutrition.energyKj),kj);assert.equal(Math.round(session.nutrition.calories),cal);}
 for(const food of [milk,pepsi]){const measures=S.servingMeasureProfile(food).measures;assert(measures.some(m=>m.key==='cup'&&m.multiplier===2.5));assert(!measures.some(m=>['piece','slice','pack','g'].includes(m.key)));}
});
test('shared fallback semantics handle product forms and reject ingredient/flavour/compound traps',()=>{
 const positives=[['White sourdough','bread'],['Artisan White Sourdough','bread'],['Fetta Cheese','cheese'],['Mexican Blend Cheese','cheese'],['Pecorino Romano','cheese'],['Crisps Sea Salt','snacks'],['Pretzel Twists','snacks'],['Southern Blue Whiting Classic Crumbs','protein'],['Tempura Barramundi','protein'],['Smoked Rainbow Trout Fillets In Truffle Flavoured Oil','protein'],['Pitted Kalamata Olives','produce'],['Grilled Artichokes','produce'],['Roasted Beetroot Dip','sauces'],['Vegetable Spring Rolls','pizza']];
 const negatives=['Chicken Flavoured Snack','Cheese Flavoured Snack','Cereal Bar','Milk Chocolate','Fish Flavoured Snack','Chicken and Potato Meal','Bread Stuffing','Chicken Stock','Chicken Broth','Salad Dressing','Pecorino Romano Pasta','Sourdough Crackers','Pretzel Ice Cream','Corn Fritters','Crisps with Cheese Dip','Breaded Chicken','Fish Pie','Artichoke Pasta','Cheese Dip'];
 for(const brand of ['Aldi','Woolworths','Coles','Independent Foods']){for(const [name,id]of positives)assert.equal(SEM.additionalFallbackFamily({brand,name})?.id,id,name);for(const name of negatives)assert.equal(SEM.additionalFallbackFamily({brand,name}),null,name);}
});
test('all three retailer totals and each cross-retailer category consequence reconcile',async()=>{
 for(const [kind,total,loggable,other,categories,families]of [['aldi',224,224,25,18,34],['woolworths',363,348,36,20,11],['coles',417,417,60,19,15]]){const foods=await all(kind),d=R.directory(kind);assert.equal(foods.length,total);assert.equal(new Set(foods.map(C.canonicalKey)).size,total);assert.equal(foods.filter(C.canLog).length,loggable);assert.equal(d.categories.length,categories);assert.equal(d.brands.length,families);assert.equal(d.categories.find(c=>c.id==='other-food').count,other);}
 assert.equal(R.directory('woolworths').categories.find(c=>c.id==='bread').count,35);
});
test('all moved existing products retain exact identity, nutrients, measures and ownership',async()=>{
 for(const kind of ['aldi','coles','woolworths']){const foods=await all(kind);for(const old of input.baseline[kind].other){const f=foods.find(f=>C.canonicalKey(f)===C.canonicalKey(old));assert(f);for(const key of ['id','barcode','brand','name','nutrients','units','unitLabels','sourceProvenance','sourceNutritionBasis','manufacturerServing','retailerMemberships','privateLabelCollections'])assert.deepEqual(f[key],old[key],old.name+' '+key);}}
 // Wave 3A's recorded projection is historical. Wave 4A independently checks all current retailer facts and the nine explicitly reviewed global overlays.
 const audit=require('../data/catalogue-wave-3a/final-report.json');assert.equal(audit.projectionDiff.length,52);assert.equal(audit.global.categoryChanges,30);
});
test('new exact brand products are globally reachable and every index entry matches its shard',async()=>{
 for(const food of report.admissions){const query=food.name.startsWith(food.brand)?food.name:food.brand+' '+food.name,results=await B.search(query,{limit:100});assert(results.foods.some(f=>C.canonicalKey(f)===C.canonicalKey(food)),query);}
 for(const kind of ['aldi','coles','woolworths','brand']){const index=kind==='brand'?B.index:require('../'+kind+'-au-catalogue').index,records=new Map();for(const shard of index.files){const bytes=fs.readFileSync(path.join(ROOT,'data/'+kind+'-au',shard.path));assert.equal(X.hash(bytes),shard.sha256);for(const food of JSON.parse(bytes).records)records.set(food.id,food);}for(const e of index.entries){const food=records.get(e.id);assert(food);assert.equal(C.canonicalKey(e),C.canonicalKey(food));assert.equal(e.browseCategoryId,D.project(food).browseCategoryId);}}
});
test('all protected source payloads are unchanged',()=>{for(const p of require('../data/catalogue-wave-3a/protected-files.json'))assert.equal(X.hash(fs.readFileSync(path.join(ROOT,p.file))),p.sha256,p.file);});
