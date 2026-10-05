'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('../scripts/catalogue-wave-4a'),C=require('../food-catalogue'),D=require('../catalogue-discovery'),R=require('../retailer-catalogue'),S=require('../serving-foundation'),G=require('../guided-product-resolution'),SEM=require('../scripts/food-category-semantics'),X=require('../scripts/catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),report=W.derive(),{input,products}=report;
for(const kind of ['woolworths','coles','aldi','iga'])require('../'+kind+'-au-catalogue');
async function all(kind){const foods=[];for(let offset=0;;offset+=20){const p=await R.page(kind,{offset});foods.push(...p.foods);if(!p.hasMore)return foods;}}
test('32 distinct reviews reconcile; improvements and category changes are not new identities',()=>{
 assert.deepEqual(Object.values(report.groups).map(g=>g.reviewed),[10,16,2,4]);assert.equal(new Set(report.reviews.map(r=>r.canonicalKey)).size,32);
 assert.equal(products.length,9);for(const g of Object.values(report.groups)){assert.equal(g.reviewed,g.existingImproved+g.held+g.deferredRejected);assert.equal(g.newCanonicalAdmitted,0);assert(g.recategorised<=g.existingImproved);}
 assert.equal(report.reviews.filter(r=>r.disposition==='held').length,13);assert.equal(report.reviews.filter(r=>r.disposition==='deferred').length,10);
});
test('all official banners and forgiving voice/text aliases resolve to one IGA root',async()=>{
 for(const q of ['IGA','Supa IGA','SUPA IGA','Super IGA','IGA Local Grocer','IGA X-Press','IGA X-press','IGA Xpress','IGA X Press']){assert.equal(R.recognise(q).id,'iga');const intent=C.queryIntent(q);assert.equal(intent.kind,'retailer');assert.equal(intent.productQuery,'');assert.equal(C.queryIntent(q+' cheese').entity.id,'iga');assert.equal((await R.search(q+' cheese')).foods.length,2);}
 assert.equal(require('../iga-au-catalogue').index.retailer.banners.find(b=>b.id==='supa-iga').displayName,'SUPA IGA');
 for(const q of ['Bread','Milk','Cereal','Crackers','Cheese','Frozen Vegetables','Frozen Chips','Coffee','Sausage','Chicken'])assert.notEqual(C.queryIntent(q).kind,'retailer',q);
});
test('IGA browse contains exactly eight private-label identities in six categories and two families',async()=>{
 const foods=await all('iga'),d=R.directory('iga');assert.equal(foods.length,8);assert(foods.every(C.canLog));assert.equal(d.total,8);assert.equal(d.categories.length,6);assert.equal(d.brands.length,2);assert.equal(d.categories.find(c=>c.id==='other-food').count,1);
 assert.equal(d.brands.find(b=>b.key==='blackandgold').count,3);assert.equal(d.brands.find(b=>b.key==='communityco').count,5);
 assert(!foods.some(f=>f.brand==='Pepsi Max'||C.brandKey(f.brand)==='iga'));for(const f of foods){assert.equal(C.privateLabelCollectionMembership(f,'iga').length,1);assert.equal(C.retailerMembership(f,'iga').length,0);assert.equal(f.privateLabelCollections.at(-1).availabilityScope,'retailer-family-relationship');assert.equal(f.privateLabelCollections.at(-1).currentAvailability,'unknown');}
});
test('store evidence survives canonicalisation without national stock or ownership leakage',()=>{
 const f=products.find(f=>f.brand==='Pepsi Max'),m=C.retailerMembership(f,'iga')[0];assert.equal(m.availabilityScope,'store');assert.equal(m.storeId,'marks-supa-iga-mansfield');assert.equal(m.bannerId,'supa-iga');assert.equal(m.broaderAvailability,'unknown');assert.equal(m.currentAvailability,'unknown');assert.equal(m.evidence.directHttpUsable,false);
 const merged=C.canonicaliseRecords([input.independent[0],f])[0];assert.equal(merged.brand,'Pepsi Max');assert.deepEqual(C.retailerMembership(merged,'iga'),[m]);assert.equal(C.privateLabelCollectionMembership(merged,'iga').length,0);assert(!C.commercialIdentityMembership({id:'iga',type:'retailer'},merged).matches);assert.equal(C.privateLabelCollectionMembership(merged,'aldi').length,0);assert.equal(C.sourceEvidence(merged).trustClass,'package-verified-au');
});
test('new relationship cannot override consumer brand, AU scope or exact product evidence',()=>{
 const f=structuredClone(products.find(f=>C.brandKey(f.brand)==='communityco'));for(const mutate of [x=>x.brand='Kellogg\'s',x=>x.privateLabelCollections.at(-1).evidence.productEvidence.countriesTags=['en:united-states'],x=>x.privateLabelCollections.at(-1).evidence.productEvidence.recordId='off:0000000000000',x=>x.privateLabelCollections.at(-1).evidence.houseBrandRelationship.relationshipVerified=false]){const bad=structuredClone(f);mutate(bad);assert.equal(C.privateLabelCollectionMembership(bad,'iga').length,0);}
});
test('existing nutrition, unknowns, serving basis and measures are byte-equivalent facts',()=>{
 for(const f of products){const old=[...input.baseline.approved,...input.independent].find(o=>C.canonicalKey(o)===C.canonicalKey(f));for(const k of ['name','brand','barcode','nutrients','nutritionPer100','nutritionPer100Unit','units','unitLabels','sourceProvenance','sourceNutritionBasis','manufacturerServing','physicalForm'])assert.deepEqual(f[k],old[k],f.name+' '+k);
  const keys=S.servingMeasureProfile(f).measures.map(m=>m.key);assert(keys.length);if(f.nutritionPer100Unit==='g')assert(!keys.some(k=>['mL','L','cup','slice','piece'].includes(k)));
  const unit=f.nutritionPer100Unit==='mL'?'mL':'g',session=G.createSession([f],f.name,{intent:{kind:'exact-product'}});G.selectMeasure(session,unit);G.selectAmount(session,unit==='mL'?250:100);assert.equal(session.stage,G.stages.CONFIRMATION);assert(Number.isFinite(session.nutrition.calories));
 }
 const chia=products.find(f=>f.barcode==='9310246047112');assert.equal(chia.nutrients.sodium,undefined);const cola=products.find(f=>f.barcode==='9310077313011');assert.equal(cola.nutrients.fat,0);assert.equal(cola.nutrients.sugar,0);
});
test('same GTIN pack and formulation conflicts remain blocked with new retailer evidence',()=>{
 const f=products.find(f=>f.brand==='Pepsi Max');for(const change of [{pack:{amount:1250,unit:'mL'},packageSize:'1.25 L'},{brand:'Pepsi',name:'Pepsi Regular Cola 2L',variant:'regular'}]){const other={...structuredClone(f),...change,id:'conflicting-evidence'};const resolved=C.canonicaliseRecords([f,other])[0];assert(!C.canLog(resolved));assert(C.sourceConflicts(resolved).some(c=>c.severity==='material'));}
});
test('three category improvements use whole-product rules for every retailer and reject flavour traps',()=>{
 for(const brand of ['IGA','Woolworths','Coles','ALDI','Independent']){for(const [name,id]of [['Colby Cheese','cheese'],['Sourdough Rolls','bread'],['Rustic Diamond Roll','bread']])assert.equal(SEM.reviewedFamily({name,brand}).id,id);for(const name of ['Milk Chocolate','Cereal Bar','Chicken Flavoured Chips','Cheese Flavoured Snacks','Fish Flavoured Snack','Chicken Stock','Chicken Broth','Bread Stuffing','Salad Dressing','Colby Cheese Crackers','Sourdough Roll Sandwich'])assert.equal(SEM.reviewedFamily({name,brand}),null,name);}
 assert.equal(report.reviews.filter(r=>r.category).length,3);
});
test('global index reuses every canonical identity and matches IGA projection',async()=>{
 const B=require('../brand-catalogue');assert.equal(B.index.entries.length,7494);for(const f of products){const e=B.index.entries.filter(e=>C.canonicalKey(e)===C.canonicalKey(f));assert.equal(e.length,1);const record=JSON.parse(fs.readFileSync(path.join(ROOT,'data/brand-au',e[0].shard))).records.find(r=>r.id===e[0].id);assert.deepEqual(record,f);}
 for(const q of ['Black & Gold Australian Quick Oats','Community Co Colby Cheese','Pepsi Max 2L'])assert((await B.search(q,{limit:100})).foods.some(C.canLog),q);
});
test('all previous retailer identities, categories, nutrient and serving facts remain unchanged',async()=>{
 const baseline=require('../data/catalogue-wave-4a/baseline.json');for(const kind of ['aldi','woolworths','coles']){const current=await all(kind),old=baseline.retailers[kind];assert.equal(current.length,old.records.length);const prior=new Map(old.records.map(f=>[C.canonicalKey(f),f]));assert.equal(new Set(current.map(C.canonicalKey)).size,prior.size);const counts=new Map();for(const f of current){const expected=D.project(prior.get(C.canonicalKey(f)));assert.deepEqual(f,expected,kind+' '+f.id);const cats=expected.browseCategoryId?[expected.browseCategoryId]:[...new Set([...C.retailerMembership(expected,kind),...C.privateLabelCollectionMembership(expected,kind),...C.sourceDeclaredRetailerMembership(expected,kind)].flatMap(m=>m.categoryIds))];for(const cat of cats)counts.set(cat,(counts.get(cat)||0)+1);}assert.deepEqual(current.map(f=>f.id),[...current].sort(D.alphabetic).map(f=>f.id));const d=R.directory(kind);assert.deepEqual(Object.fromEntries(d.categories.map(c=>[c.id,c.count])),Object.fromEntries(counts));assert.deepEqual(d.brands,old.families);}
});
test('frozen OFF, AFCD/AUSNUT, restaurants and unrelated retailer payloads remain unchanged',()=>{for(const p of require('../data/catalogue-wave-4a/protected-files.json'))assert.equal(X.hash(fs.readFileSync(path.join(ROOT,p.file))),p.sha256,p.file);});
test('IGA builder and all index hashes regenerate deterministically',()=>{require('../scripts/build_iga_catalogue').build({check:true});for(const kind of ['iga','brand']){const idx=kind==='iga'?require('../iga-au-catalogue').index:require('../brand-au-catalogue');for(const shard of idx.files)assert.equal(X.hash(fs.readFileSync(path.join(ROOT,'data/'+kind+'-au',shard.path))),shard.sha256);}});
