'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('../scripts/catalogue-wave-1b'),C=require('../food-catalogue'),S=require('../serving-foundation'),G=require('../guided-product-resolution'),R=require('../retailer-catalogue'),B=require('../brand-catalogue'),Q=require('../search-foundation'),SEM=require('../scripts/food-category-semantics'),X=require('../scripts/catalogue-round-two');
const input=W.inputs(),report=W.derive(),rows=report.reviews,admitted=report.admissions;
const indices=Object.fromEntries(['woolworths','coles','aldi'].map(k=>[k,require('../'+k+'-au-catalogue').index]));
async function all(retailer,options={}){const foods=[];for(let offset=0;;offset+=20){const p=await R.page(retailer,{...options,offset});foods.push(...p.foods);if(!p.hasMore)return foods;}}
test('fixed manifest is bounded, canonical-distinct and all decisions reconcile',()=>{
 assert.equal(rows.length,46);assert.equal(new Set(rows.map(r=>r.canonicalKey)).size,46);
 assert.deepEqual(Object.values(report.groups).map(g=>g.reviewed),[15,24,4,3]);
 for(const g of Object.values(report.groups))assert.equal(g.reviewed,g.newlyAdmitted+g.previouslyAdmittedImproved+g.remainsRestricted+g.deferred);
 assert.equal(rows.filter(r=>r.canonicalOverlap).length,44);assert.equal(report.newCanonicalIdentities,1);assert.equal(report.admitted,2);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/catalogue-wave-1b/review-report.json'))).reviews,rows);
});
test('all 15 existing restrictions survive fresh evidence and runtime hydration',async()=>{
 const foods=await all('woolworths'),counts={};
 for(const c of input.manifest.candidates.filter(c=>c.groups.includes('A'))){counts[c.reason]=(counts[c.reason]||0)+1;const r=rows.find(r=>r.candidateId===c.candidateId),f=foods.find(f=>C.canonicalKey(f)===r.canonicalKey);assert(f);assert.equal(r.disposition,'remains-restricted');assert(!C.canLog(f));assert.equal(r.beforeStatus,r.afterStatus);if(c.reason==='identity-conflict')assert(C.sourceConflicts(f).some(c=>c.code==='same-gtin-identity-conflict'));if(c.reason==='energy-missing')assert.equal(f.nutrients.calories,null);}
 assert.deepEqual(counts,{'source-conflict':4,'identity-conflict':8,'energy-missing':3});assert.equal(foods.filter(f=>!C.canLog(f)).length,15);
});
test('24 Wave 1B corrections survive; Waves 2A and 3A account for later shared fallback changes',async()=>{
 const foods=await all('woolworths');assert.equal(foods.length,363);assert.equal(foods.filter(C.canLog).length,348);
 const changes=[...require('../data/woolworths-au/wave-2a-report.json').changes,...require('../data/woolworths-au/wave-3a-report.json').changes],later=require('../data/catalogue-wave-2a/baseline.json').retailers.woolworths.identities.filter(f=>f.categoryId==='other-food').filter(f=>changes.some(c=>c.canonicalKey===f.key));
 assert.equal(later.length,9);assert.equal(R.directory('woolworths').categories.find(c=>c.id==='other-food').count,45-later.length);
 for(const r of rows.filter(r=>r.groups.includes('B'))){const f=foods.find(f=>C.canonicalKey(f)===r.canonicalKey),prior=input.baseline.candidates.find(f=>C.canonicalKey(f)===r.canonicalKey);assert.deepEqual(r.category,SEM.reviewedFamily(prior));assert.equal(f.browseCategoryId,r.category.id);for(const k of ['nutrients','units','sourceProvenance','barcode','brand'])assert.deepEqual(f[k],prior[k],r.name+' '+k);}
});
test('shared category rules are retailer-neutral and reject misleading ingredients and forms',()=>{
 for(const brand of ['Woolworths','Coles','Aldi','Example Foods']){
  for(const [name,category]of [['Turkish Rolls Plain','bread'],['Soft Wholemeal Wraps','bread'],['Sourdough White Loaf','bread'],['English Muffins','bread'],['Quick Oats','cereal'],['Raw Buckwheat','grains'],['Mild Salsa','sauces'],['Satay Marinade','sauces'],['Cranberry & Kale Slaw Kit','produce'],['Spinach & Ricotta Cannelloni','meals']])assert.equal(SEM.reviewedFamily({brand,name})?.id,category,brand+' '+name);
  for(const name of ['Chicken Flavoured Snacks','Chicken Stock','Stock Chicken','Cereal Bar','Oat Bar','Rice Cake','Crackers','Banana Bread','Sausage In Bread','Chicken With Soft White Wraps','Loaf Cake','Cannelloni Sauce','Quick Oats Recipe Base','Soft White Wraps With Ham','Garlic Bread','Unclear Packaged Food'])assert.equal(SEM.reviewedFamily({brand,name}),null,brand+' '+name);
 }
});
test('stock and flavour cues never hijack chicken, while ordinary chicken remains compatible',()=>{
 for(const brand of ['Woolworths','Coles','Aldi',"Campbell's"]){for(const name of ['Chicken Stock','Real Stock Chicken','Chicken Broth','Broth Chicken','Chicken Soup','Chicken Flavour Snacks','Chicken Flavoured Crackers','Chicken Curry'])assert(!Q.conceptCompatibility({name,brand,recordType:'packaged'},'chicken').compatible,name);for(const name of ['Chicken Breast','Chicken Thigh','Roast Chicken'])assert(Q.conceptCompatibility({name,brand},'chicken').compatible,name);}
 assert(!Q.conceptCompatibility(admitted.find(f=>C.brandKey(f.brand)==='campbells'),'chicken').compatible);
});
test('retailer concept queries retrieve evidenced families without lexical cereal in every title',async()=>{
 for(const id of ['woolworths','coles','aldi']){const result=await R.search(id+' cereal');assert(result.foods.some(C.canLog),id);assert(result.foods.every(f=>R.entity(id).houseBrandFamilies.some(h=>h.key===C.brandKey(f.brand)&&h.evidenceIds.length)&&X.membership(f,id).length));}
 const result=await R.search('Woolworths cereal');assert(result.foods.some(f=>f.barcode==='9300633980016'));const model=C.submittedResultModel(result.foods,'Woolworths cereal');assert(model.groups.flatMap(g=>g.items).some(i=>i.food?.barcode==='9300633980016'));
 assert(!result.foods.some(f=>['kelloggs','campbells','nescafe'].includes(C.brandKey(f.brand))));
});
test('dry preparation words take precedence over beverage ancestry without changing prepared drinks',()=>{
 for(const name of ['Coffee, instant, dry powder or granules','Coffee mix, with beverage whitener & sugar, dry powder']){const food={name,recordType:'afcd',categories:['Beverages'],units:{g:.01,mL:.01,cup:2.5},nutrients:{calories:300}};assert.equal(S.physicalForm(food).form,'weight');assert(!S.servingMeasureProfile(food).measures.some(m=>['mL','L','cup'].includes(m.key)));}
 for(const name of ['Coffee, black, from instant coffee powder','Coffee, prepared from coffee mix with sugar & whitener','Coffee, flat white/latte/cappuccino, from ground coffee beans'])assert.equal(S.physicalForm({name,categories:['Beverages']}).form,'liquid');
});
test('structured Australian savoury biscuits provide generic Crackers without admitting sweet biscuits',()=>{
 const foods=require('../scripts/audit_progressive_food_resolution').afcdFoods,crackers=foods.filter(f=>/^Biscuit, savoury,/.test(f.name));assert.equal(crackers.length,17);assert(crackers.every(f=>Q.conceptCompatibility(f,'cracker').compatible));assert(crackers.some(C.canLog));
 for(const name of ['Biscuit, sweet, plain','Cake, rice, sweet','Milk chocolate biscuit'])assert(!Q.conceptCompatibility({name,recordType:'afcd'},'cracker').compatible,name);
});
test('concepts with a source-context chooser cannot be pre-filtered to generic records',()=>{
 for(const conceptId of ['burger','hash-brown'])assert.equal(R.conceptSourceQuestion({conceptId,known:{}}),null);
});
test('new admissions have complete required nutrients and preserve unknown fibre',()=>{
 for(const f of admitted){assert(C.canLog(f));for(const k of ['calories','protein','carbs','fat'])assert(Number.isFinite(f.nutrients[k]));assert.equal(f.nutrients.fibre,null);assert(f.privateTestingApproved&&f.publicReleaseReviewRequired);assert.equal(C.sourceConflicts(f).filter(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')).length,0);}
 const veg=admitted.find(f=>f.barcode==='9300633450410'),stock=admitted.find(f=>f.barcode==='9300644043601');
 assert.equal(veg.sourceNutritionBasis.state,'as-sold frozen product');assert.equal(veg.nutrients.energyKj*veg.units.g*100,217);
 assert.equal(stock.sourceNutritionBasis.basis,'per-serving');assert.deepEqual(stock.nutritionPer100,{});assert(Math.abs(stock.nutrients.energyKj*stock.units.mL*250-87)<1e-10);assert(Math.abs(stock.nutrients.protein*stock.units.mL*250-2.1)<1e-10);
 assert.equal(stock.fieldProvenance.nutrition.trustClass,'official-au-manufacturer');assert.equal(stock.fieldProvenance.identity.trustClass,'official-au-retailer');
 assert(stock.canonicalEvidence.some(e=>e.source.trustClass==='open-food-facts-au'));assert(stock.canonicalEvidence.some(e=>e.source.trustClass==='official-au-retailer'));
});
test('physical form and explicit serving support one amount handoff with no pack-derived units',()=>{
 for(const f of admitted){const liquid=f.physicalForm==='liquid',unit=liquid?'mL':'g',amount=liquid?250:100,measures=S.servingMeasureProfile(f).measures;
  assert(measures.some(m=>m.key===unit)&&measures.some(m=>m.key==='serve'));assert(!measures.some(m=>['pack','packet','piece',...(liquid?[]:['mL','L','cup'])].includes(m.key)));assert.notEqual(measures[0].key,'L');if(liquid){const cup=measures.find(m=>m.key==='cup');if(cup)assert.equal(cup.multiplier,f.units.mL*250);}
  const session=G.createSession([f],f.name,{intent:{kind:'exact-product'}});G.selectMeasure(session,unit);G.selectAmount(session,amount);assert(session.nutrition);assert.equal(session.amount,amount);assert.equal(session.selectedMeasure.key,unit);
 }
});
test('independent consumer brand and retailer presence remain separate throughout global hydration',async()=>{
 const stock=admitted.find(f=>C.brandKey(f.brand)==='campbells'),house=await all('woolworths');
 assert(!house.some(f=>f.barcode===stock.barcode));assert(house.some(f=>f.barcode==='9300633450410'));
 const result=await B.search("Campbell's Real Stock Chicken");assert.equal(result.foods.filter(f=>f.barcode===stock.barcode).length,1);const f=result.foods.find(f=>f.barcode===stock.barcode);assert.equal(f.brand,"Campbell's");assert(B.isAdmitted(f));assert.equal(C.retailerMembership(f,'woolworths').length,1);assert.equal(C.privateLabelCollectionMembership(f,'woolworths').length,0);assert.equal(C.commercialIdentityMembership(R.entity('woolworths'),f).matches,false);assert.equal(f.availabilityEvidence.currentAvailability,'unknown');
 const community=structuredClone(f);community.retailerMemberships=community.retailerMemberships.map(m=>({...m,verified:false,evidence:{...m.evidence,trustClass:'open-food-facts-au'}}));assert.equal(C.retailerMembership(community,'woolworths').length,0);
});
test('deferred candidates cannot gain a Wave 1B admission or bypass existing restrictions',()=>{
 const deferred=rows.filter(r=>r.disposition==='deferred');assert.equal(deferred.length,5);for(const r of deferred){assert(!admitted.some(f=>C.canonicalKey(f)===r.canonicalKey));assert(r.reason.length);assert(!r.privateTestingApproved);}
 assert(rows.find(r=>r.canonicalKey==='barcode:9300633556204').reason.includes('qualified-serving-bound-needs-review'));
 assert(rows.find(r=>r.canonicalKey==='barcode:9339687165339').reason.includes('missing-required-fat'));
 for(const code of ['9300633939151','9310055537224'])assert(rows.find(r=>r.canonicalKey==='barcode:'+code).reason.includes('unresolved-material-evidence'));
});
test('global index/shard hashes, canonical uniqueness and brand counts reconcile',()=>{
 assert.equal(B.index.entries.length,7494);assert.equal(B.index.brands.length,2737);assert.equal(new Set(B.index.entries.map(C.canonicalKey)).size,7494);
 for(const [kind,index]of [['brand',B.index],...Object.entries(indices)]){const records=new Map();for(const shard of index.files){const bytes=fs.readFileSync(path.resolve(__dirname,'../data/'+kind+'-au',shard.path));assert.equal(X.hash(bytes),shard.sha256);const data=JSON.parse(bytes);assert.equal(data.records.length,shard.records);for(const f of data.records)records.set(f.id,f);}for(const entry of index.entries){assert(records.has(entry.id));assert.equal(C.canonicalKey(records.get(entry.id)),C.canonicalKey(entry));}}
});
test('new evidence cannot override a material same-GTIN identity or formulation conflict',()=>{
 for(const f of admitted){for(const patch of [{brand:'Unrelated Foods'},{physicalForm:f.physicalForm==='liquid'?'weight':'liquid'},{name:'Entirely Different Formulation',brand:'Different Brand'}]){const incompatible={...structuredClone(f),...patch,id:'incompatible-evidence',canonicalEvidence:[],sourceProvenance:{...f.sourceProvenance,trustClass:'official-au-manufacturer'}};const merged=C.canonicaliseRecords([f,incompatible]);assert.equal(merged.length,1);assert(!C.canLog(merged[0]));assert(C.sourceConflicts(merged[0]).some(c=>c.code==='same-gtin-identity-conflict'));}}
 assert.equal(C.canonicaliseRecords(admitted).length,2);
});
test('Woolworths outputs regenerate byte-for-byte offline without replacing source evidence',()=>{
 const builder=require('../scripts/build_woolworths_catalogue'),first=builder.outputs(),second=builder.outputs();assert.deepEqual(first,second);for(const [file,text]of Object.entries(first))assert.equal(fs.readFileSync(path.resolve(__dirname,'../data/woolworths-au',file),'utf8'),text,file);
});
test('the standalone Woolworths builder check resolves its adapter dependency without a circular-export failure',()=>{
 const text=require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'../scripts/build_woolworths_catalogue.js'),'--check'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});assert.equal(JSON.parse(text).officialEvidenceRows,43);
});
