'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('../scripts/catalogue-wave-2a'),C=require('../food-catalogue'),S=require('../serving-foundation'),G=require('../guided-product-resolution'),R=require('../retailer-catalogue'),B=require('../brand-catalogue'),SEM=require('../scripts/food-category-semantics'),X=require('../scripts/catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),input=W.inputs(),report=W.derive(),baseline=require('../data/catalogue-wave-2a/baseline.json');
const indices=Object.fromEntries(['coles','woolworths','aldi'].map(k=>[k,require('../'+k+'-au-catalogue').index]));
async function all(kind){const foods=[];for(let offset=0;;offset+=20){const p=await R.page(kind,{offset});foods.push(...p.foods);if(!p.hasMore)return foods;}}
test('39 distinct candidates obey all four ceilings and dispositions reconcile without fabricated admissions',()=>{
 assert.equal(report.candidateCount,39);assert.deepEqual(Object.values(report.groups).map(g=>g.reviewed),[11,22,4,2]);
 assert.equal(new Set(report.reviews.map(r=>r.canonicalKey)).size,39);assert.equal(report.newCanonicalIdentities,0);
 for(const g of Object.values(report.groups))assert.equal(g.reviewed,g.newlyAdmitted+g.existingCanonicalImproved+g.recategorised+g.restricted+g.deferredRejected);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT,'data/catalogue-wave-2a/review-report.json'))),report);
});
test('all retained Coles exclusions remain excluded with exact nutrition and serving facts',async()=>{
 const foods=await all('coles'),keys=new Set(foods.map(C.canonicalKey)),records=indices.coles.files.flatMap(s=>require('../data/coles-au/'+s.path).records);
 for(const old of input.baseline.coles.excluded){assert(!keys.has(C.canonicalKey(old)));const f=records.find(f=>f.id===old.id);assert(f);for(const k of ['nutrients','units','sourceProvenance','sourceNutritionBasis','quarantinedMeasures'])assert.deepEqual(f[k],old[k],old.name+' '+k);assert.equal(f.browseEligible,false);assert(report.reviews.some(r=>r.canonicalKey===C.canonicalKey(f)&&r.disposition==='restricted'));}
 assert.equal(foods.length,417);assert(foods.every(C.canLog));
});
test('all reviewed category moves preserve identity, nutrition, unknowns, serving and provenance',async()=>{
 for(const kind of ['coles','woolworths','aldi']){const foods=await all(kind),byKey=new Map(foods.map(f=>[C.canonicalKey(f),f]));for(const old of input.baseline[kind].other){const f=byKey.get(C.canonicalKey(old)),category=SEM.fallbackFamily(old)||SEM.additionalFallbackFamily(old);assert(f);for(const k of ['id','barcode','brand','name','nutrients','units','unitLabels','sourceProvenance','sourceNutritionBasis','manufacturerServing','retailerMemberships','privateLabelCollections'])assert.deepEqual(f[k],old[k],kind+' '+old.name+' '+k);assert.equal(f.browseCategoryId||f.categoryId,category?.id||'other-food');}}
});
test('shared product-head rules are retailer-neutral and reject compounds and ambiguous fragments',()=>{
 const positives=[['French Fries','frozen-potato'],['Straight Cut Chips','frozen-potato'],['Frozen Potato Wedges','frozen-potato'],['Cheese Supreme Corn Chips','snacks'],['Chicken Flavoured Corn Chips','snacks'],['Greek Salad','produce'],['Pickle Slaw','produce'],['Cheese Burger Slices','cheese'],['Garlic Aioli','sauces'],['Orange Marmalade','spreads'],['Soft White Wraps','bread'],['Ham Hock','protein'],['Smoked Rainbow Trout Fillets','protein']];
 const negatives=['Chicken Flavoured Snacks','Cheese Flavoured Snacks','Potato Containing Meal','Chicken With Potato Wedges','Bread Stuffing','Cereal Bar','Milk Chocolate','Chicken Stock','Chicken Broth','Salad Dressing','Chicken Salad Sandwich','Potato Chips','Buffalo Wedges','Burger Slices','Light Tasty Slices','Air Fries Aioli','Salsa And Corn Chips','Chipotle Cheese, Guacamole & Corn Chips','Sausage Rolls','Chicken Wraps','Cream Cheese Dip','Frozen Broccoli Fries','Frozen Fish And Chips','Ham And Cheese Croquettes','Unknown Packaged Food'];
 for(const brand of ['Coles','Woolworths','Aldi','Independent Foods']){for(const [name,id]of positives)assert.equal(SEM.fallbackFamily({brand,name,physicalForm:'solid-weight'})?.id,id,brand+' '+name);for(const name of negatives)assert.equal(SEM.fallbackFamily({brand,name,physicalForm:'solid-weight'}),null,brand+' '+name);}
});
test('Coles/Woolworths/Aldi counts, category deltas and every moved house identity reconcile',async()=>{
 for(const [kind,visible,loggable,restricted,other,moved]of [['coles',417,417,0,61,25],['woolworths',363,348,15,36,9],['aldi',224,224,0,25,26]]){
  const foods=await all(kind),dir=R.directory(kind),prior=baseline.retailers[kind];assert.equal(foods.length,visible);assert.equal(foods.filter(C.canLog).length,loggable);assert.equal(foods.filter(f=>!C.canLog(f)).length,restricted);assert.equal(dir.categories.find(c=>c.id==='other-food').count,other);
  const changes=prior.identities.filter(p=>p.categoryId!==(foods.find(f=>C.canonicalKey(f)===p.key)?.browseCategoryId||foods.find(f=>C.canonicalKey(f)===p.key)?.categoryId));assert.equal(changes.length,moved);for(const c of changes){assert.equal(c.categoryId,'other-food');assert([...require('../data/'+kind+'-au/wave-2a-report.json').changes,...require('../data/'+kind+'-au/wave-3a-report.json').changes].some(r=>r.canonicalKey===c.key));}
  assert.equal(new Set(foods.map(C.canonicalKey)).size,visible);assert(foods.every(f=>indices[kind].retailer.houseBrandFamilies.some(h=>h.key===C.brandKey(f.brand))));
 }
 assert.equal(R.directory('woolworths').categories.find(c=>c.id==='bread').count,35);
});
test('independent McCain discovery improves the existing global canonical record without ownership or nutrition substitution',async()=>{
 const review=report.reviews.find(r=>r.disposition==='improved'),old=input.peers.records[0],result=await B.search('McCain Air Fryer Straight Cut'),matches=result.foods.filter(f=>C.canonicalKey(f)===review.canonicalKey);assert.equal(matches.length,1);const f=matches[0];assert.equal(f.brand,'McCain');assert.equal(f.barcode,null);assert(B.isAdmitted(f));assert(C.canLog(f));
 for(const k of ['id','canonicalId','nutrients','nutritionPer100','manufacturerServing','units','sourceProvenance','sourceNutritionEvidence'])assert.deepEqual(f[k],old[k],k);
 assert.equal(C.retailerMembership(f,'coles').length,1);assert.equal(C.privateLabelCollectionMembership(f,'coles').length,0);assert.equal(C.commercialIdentityMembership(R.entity('coles'),f).matches,false);assert(!(await all('coles')).some(p=>C.canonicalKey(p)===review.canonicalKey));
 for(const k of ['fibre','satFat','sugar'])assert.equal(f.nutrients[k],null);assert.equal(f.fieldProvenance.nutrition.trustClass,'official-au-manufacturer');assert.equal(f.fieldProvenance.retailerPresence.trustClass,'official-au-retailer');assert.equal(C.retailerMembership(f,'coles')[0].currentAvailability,'unknown');
 const measures=S.servingMeasureProfile(f).measures;assert(measures.some(m=>m.key==='g'));assert(measures.some(m=>m.key==='serve'));assert(!measures.some(m=>['mL','L','cup','piece','pack'].includes(m.key)));const session=G.createSession([f],f.name,{intent:{kind:'exact-product'}});G.selectMeasure(session,'g');G.selectAmount(session,100);assert.equal(session.stage,G.stages.CONFIRMATION);assert.equal(Math.round(session.nutrition.calories),137);
});
test('thin-family and second independent discovery holds never create substitute canonical identities',()=>{
 const keys=new Set(B.index.entries.map(C.canonicalKey));for(const r of report.reviews.filter(r=>r.disposition==='deferred')){assert(!r.privateTestingApproved);assert(r.reason.length>20);assert(!keys.has(r.canonicalKey));}assert.equal(keys.size,7494);assert.equal(B.index.brands.length,2737);
});
test('accepted Woolworths vegetables and Campbell stock retain exact logged energy and missing fibre',async()=>{
 const veg=(await all('woolworths')).find(f=>f.barcode==='9300633450410'),stock=(await B.search("Campbell's Real Stock Chicken")).foods.find(f=>f.barcode==='9300644043601');
 for(const [f,unit,amount,cal,kj]of [[veg,'g',100,52,217],[stock,'mL',250,21,87]]){assert(C.canLog(f));assert.equal(Math.round(f.nutrients.calories*f.units[unit]*amount),cal);assert.equal(Math.round(f.nutrients.energyKj*f.units[unit]*amount),kj);assert.equal(f.nutrients.fibre,null);assert.equal(f.manufacturerServing.amount,amount);assert.equal(f.manufacturerServing.unit,unit);}
 assert.equal(stock.brand,"Campbell's");assert(!(await all('woolworths')).some(f=>f.barcode===stock.barcode));
});
test('every changed global category has whole-product evidence and retains index/shard parity',()=>{
 for(const [kind,index]of [['brand',B.index],...Object.entries(indices)]){const byId=new Map();for(const shard of index.files){const bytes=fs.readFileSync(path.join(ROOT,'data/'+kind+'-au',shard.path));assert.equal(X.hash(bytes),shard.sha256);const rows=JSON.parse(bytes).records;assert.equal(rows.length,shard.records);for(const f of rows)byId.set(f.id,f);}for(const e of index.entries){const f=byId.get(e.id);assert(f);assert.equal(C.canonicalKey(f),C.canonicalKey(e));assert.equal(e.browseCategoryId,f.browseCategoryId);}for(const change of require('../data/'+kind+'-au/wave-2a-report.json').changes){assert.equal(change.before,'other-food');const f=byId.get(change.id);assert.equal(SEM.fallbackFamily({...f,name:change.evidence.name,categories:change.evidence.categories,physicalForm:change.evidence.physicalForm})?.id,change.after);}}
});
test('protected OFF, restaurant, reference and deployment payloads remain byte-for-byte unchanged',()=>{
 const files=require('../data/catalogue-wave-2a/protected-files.json');assert.equal(files.length,2461);for(const f of files)assert.equal(X.hash(fs.readFileSync(path.join(ROOT,f.file))),f.sha256,f.file);
});
test('all catalogue projections reproduce byte-for-byte and retain the complete evidence groups',()=>{
 for(const kind of ['coles','woolworths','aldi','brand']){const builder=require('../scripts/build_'+kind+'_catalogue'),out=builder.outputs();for(const [file,text]of Object.entries(out))assert.equal(fs.readFileSync(path.resolve(ROOT,'data/'+kind+'-au',file),'utf8'),text,kind+' '+file);}
});
