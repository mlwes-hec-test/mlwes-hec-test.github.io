'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../food-catalogue'),S=require('../serving-foundation'),B=require('../brand-catalogue'),R=require('../retailer-catalogue'),X=require('../scripts/catalogue-round-two');
const approved=require('../data/catalogue-round-two/approved-products.json').records,baseline=require('../data/catalogue-round-two/baseline-products.json').records,policy=require('../data/catalogue-round-two/policy.json');
for(const kind of ['woolworths','coles','aldi'])require('../'+kind+'-au-catalogue');
test('all admitted expansion identities are unique, loggable, attributable, and retain public release review',()=>{
 const seen=new Set();for(const f of approved){const key=C.canonicalKey(f);assert(!seen.has(key),key);seen.add(key);assert.equal(C.productEligibility(f).addability.normalLoggingAllowed,true,f.id);assert(!C.sourceConflicts(f).some(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')),f.id);assert(f.privateTestingApproved&&f.publicReleaseReviewRequired,f.id);assert(f.sourceProvenance.url&&f.sourceProvenance.sha256,f.id);for(const value of Object.values(f.nutrients))assert(value==null||Number.isFinite(value)&&value>=0,f.id);if(!['liquid','spread','unknown'].includes(S.physicalForm(f).form))assert(!S.servingMeasureProfile(f).measures.some(m=>['mL','L','cup'].includes(m.key)),f.id);}
 assert.equal(X.hash(fs.readFileSync('data/catalogue-round-two/approved-products.json')),policy.approvedSha256);
});
test('unknown OFF nutrients stay absent and qualified official panel values are never invented as zero',()=>{
 const inputs=new Map(require('../data/catalogue-round-two/off-input.json').records.map(r=>[r.record.id,r.record]));
 for(const f of approved){const raw=inputs.get(f.id);if(raw)for(const [key,source] of [['protein','protein'],['carbs','carbs'],['fat','fat'],['fibre','fibre'],['sugar','sugars'],['sodium','sodium']])if(raw.nutrients[source]==null)assert(f.nutrients[key]==null,f.id+' '+key);}
 const raw=require('../data/catalogue-round-two/mccain-facts.json').records;assert(raw.some(r=>r.tables.some(t=>t.rows.some(v=>v.value.includes('<')))));
});
test('every expanded retailer page has actual evidence and no duplicate canonical choices',async()=>{
 for(const id of ['woolworths','coles','aldi']){const seen=new Set();for(let offset=0;;offset+=20){const page=await R.page(id,{offset});for(const f of page.foods){const key=C.canonicalKey(f);assert(!seen.has(key),key);seen.add(key);assert(X.membership(f,id).length,f.id);if(!baseline.some(old=>C.canonicalKey(old)===key))assert(C.productEligibility(f).addability.normalLoggingAllowed,f.id);}if(!page.hasMore)break;}assert.equal(seen.size,R.directory(id).total);}
});
test('multi-market explicit Australia store evidence is accepted; a foreign-only or fabricated store claim is rejected',()=>{
 const f=approved.find(f=>f.retailerMemberships?.some(m=>m.evidence.countriesTags?.length>1));assert(f);const id=f.retailerMemberships[0].retailerId;assert(C.sourceDeclaredRetailerMembership(f,id).length);for(const edit of [x=>x.retailerMemberships[0].evidence.countriesTags=['en:united-kingdom'],x=>x.retailerMemberships[0].evidence.stores='unrelated',x=>x.retailerMemberships[0].evidence.sha256='']){const changed=structuredClone(f);edit(changed);assert.equal(C.sourceDeclaredRetailerMembership(changed,id).length,0);}
});
test('manufacturer catalogue identities without GTIN are admitted only by canonical identity',async()=>{
 const f=approved.find(f=>f.id.startsWith('manufacturer:')&&!f.barcode);assert(f);assert(B.isAdmitted(f));assert(B.isBrandMember(f,'mccain'));assert(!B.isAdmitted({...f,id:'unadmitted',canonicalId:'unadmitted'}));assert(!B.isBrandMember({...f,id:'unadmitted',canonicalId:'unadmitted'},'mccain'));assert((await B.search('McCain '+f.name)).foods.some(v=>C.canonicalKey(v)===C.canonicalKey(f)));
});
test('all preserved accepted brand identities remain admitted exactly once',()=>{
 const before=require('../data/catalogue-round-two/baseline-counts.json');assert.equal(before.brandProducts,1922);const keys=B.index.entries.map(C.canonicalKey);assert.equal(new Set(keys).size,keys.length);for(const f of baseline.filter(f=>f.brandAdmission))assert(keys.includes(C.canonicalKey(f)),f.id);
});


test('new regional identity holds and ingredient-only family mentions stay out of unrelated categories',()=>{
 const audit=require('../data/catalogue-round-two/audit.json');
 for(const held of [...audit.geographyHolds,...audit.finalProjectionHolds])assert(!B.isAdmitted({id:held.id,barcode:held.id.slice(4)}),held.id);
 for(const f of approved){if(/\bbars?\b/i.test(f.name))assert.notEqual(f.categoryId,'cereal',f.id);if(/\b(chicken|lamb|beef|meatballs|gnocchi)\b/i.test(f.name))assert(!['yoghurt','cheese'].includes(f.categoryId),f.id);}
 const multi=approved.find(f=>f.retailerMemberships?.some(m=>m.evidence.countriesTags?.length>1));const changed=structuredClone(multi);for(const m of changed.retailerMemberships)delete m.evidence.australianMarketEvidence;assert.equal(C.sourceDeclaredRetailerMembership(changed,changed.retailerMemberships[0].retailerId).length,0);
});
test('new manufacturer products without a known barcode do not display a literal null barcode',()=>{
 const vm=require('node:vm'),source=fs.readFileSync('alpha06.js','utf8'),line=source.split('\n').find(s=>s.startsWith('function us633ResultRow('));
 const scope={C8:C,cleanMeasureText:s=>s,esc:s=>String(s??'')};vm.runInNewContext(line,scope);
 const f=approved.find(f=>f.id.startsWith('manufacturer:')&&!f.barcode);const html=scope.us633ResultRow({food:f});assert(!html.includes('Barcode null'));assert(!html.includes('Barcode undefined'));
 assert(scope.us633ResultRow({food:{...f,barcode:'9310174025084'}}).includes('Barcode 9310174025084'));
});


test('category coverage never acts as an admission cap for otherwise eligible foods',()=>{
 const audit=require('../data/catalogue-round-two/audit.json'),P=require('../scripts/prepare_catalogue_round_two');
 assert.equal(audit.off.filter(r=>r.reasons.length&&r.reasons.every(x=>['category-unresolved','unsupported-prepared-food-category'].includes(x))).length,0);
 const prior={reasons:['category-unresolved']};assert.equal(P.category({product_name:'White Dinner Rolls'},prior),'bread');assert.equal(P.category({product_name:'Boiled Mints'},prior),'other-food');assert.equal(P.category({product_name:'Daily Multivitamin'},prior),null);
 const foods=approved.filter(f=>f.categoryId==='other-food');assert(foods.length>0);assert(foods.every(f=>f.conceptIds.length===0));
});
