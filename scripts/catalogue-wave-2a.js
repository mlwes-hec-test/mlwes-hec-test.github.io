'use strict';
// Offline evidence decisions and shared fallback projection in existing adapters.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),O=require('../off-catalogue'),SEM=require('./food-category-semantics'),X=require('./catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-wave-2a');
const read=n=>JSON.parse(fs.readFileSync(path.join(BASE,n),'utf8'));
function inputs(){
 const policy=read('policy.json');for(const [file,sha256]of Object.entries(policy.inputs))assert.equal(X.hash(fs.readFileSync(path.join(BASE,file))),sha256,'Reviewed input changed: '+file);
 const manifest=read('candidate-manifest.json'),baseline=read('baseline-records.json'),peers=read('baseline-peers.json'),evidence=read('reviewed-evidence.json');
 assert(manifest.candidates.length<=60);assert.equal(new Set(manifest.candidates.map(c=>c.canonicalKey)).size,manifest.candidates.length);
 for(const [group,limit]of Object.entries(manifest.groupLimits))assert(manifest.candidates.filter(c=>c.group===group).length<=limit);
 for(const p of peers.protectedOFF){const raw=fs.readFileSync(path.join(ROOT,p.file));assert.equal(X.hash(raw),p.sha256);assert.deepEqual(JSON.parse(raw).products[p.row],p.record);}
 return {policy,manifest,baseline,peers,evidence};
}
function derive(){
 const {policy,manifest,baseline,peers,evidence}=inputs(),facts=new Map(evidence.records.map(r=>[r.id,r]));
 const reviews=manifest.candidates.map(c=>{
  const prior=[...baseline.coles.excluded,...baseline.coles.other,...peers.records].find(f=>C.canonicalKey(f)===c.canonicalKey),off=peers.protectedOFF.find(p=>p.canonicalKey===c.canonicalKey);
  if(c.baselineSha256)assert.equal(X.hash(JSON.stringify(prior)),c.baselineSha256);
  const row={...c,canonicalOverlap:!!(prior||off),duplicateEvidenceCollapsed:0,newCanonicalIdentity:false,privateTestingApproved:false,publicReleaseReviewRequired:true};
  if(c.group==='A')return {...row,disposition:'restricted',reason:c.reason,beforeStatus:C.productEligibility(prior).addability.status,afterStatus:C.productEligibility(prior).addability.status,unresolved:true,evidence:C.sourceEvidence(prior),freshCorroboration:evidence.records.filter(r=>r.decision==='remains-restricted'&&(c.name.includes('Sweet Potato')?r.id==='coles-5032128':c.name.includes('Simply Steam')?r.id==='coles-7489339':false)).map(r=>r.id)};
  if(c.group==='B'){
   assert.equal(prior.browseCategoryId||prior.categoryId,'other-food');const category=SEM.fallbackFamily(prior);assert(category,'Manifest requires a defensible whole-product category');
   return {...row,disposition:'recategorised',reason:category.rule,category,evidence:C.sourceEvidence(prior),privateTestingApproved:true};
  }
  if(c.group==='C'||c.brand==='Sanitarium'){
   const fact=evidence.records.find(r=>r.url===c.url);assert.equal(fact.decision,'deferred');
   return {...row,disposition:'deferred',reason:fact.reason,evidence:fact,beforeStatus:off?C.productEligibility(O.toFood(off.record)).addability.status:'identity-link-not-established'};
  }
  assert.equal(c.group,'D');assert.equal(C.brandKey(prior.brand),'mccain');assert(C.canLog(prior));
  const manufacturer=facts.get('mccain-air-fryer-manufacturer'),listing=facts.get('coles-mccain-assortment');
  assert.equal(new URL(manufacturer.url).pathname,new URL(prior.sourceUrl).pathname);assert.equal(C.metricEvidence(listing.pack).amount,prior.pack.amount);
  for(const key of ['energyKj','protein','carbs','fat','sodium'])assert.equal(prior.nutrients[key],manufacturer.per100Published[key]);
  for(const key of ['satFat','sugar','fibre'])assert.equal(prior.nutrients[key],null);
  assert.equal(prior.manufacturerServing.amount,100);assert.equal(prior.manufacturerServing.unit,'g');
  return {...row,disposition:'improved',reason:'Independent canonical manufacturer product gains separate AU Coles presence; original panel unchanged',evidence:[manufacturer,listing],duplicateEvidenceCollapsed:2,privateTestingApproved:true};
 });
 const groups=Object.fromEntries(['A','B','C','D'].map(group=>{const rows=reviews.filter(r=>r.group===group),count=d=>rows.filter(r=>r.disposition===d).length;return [group,{reviewed:rows.length,newlyAdmitted:count('admitted'),existingCanonicalImproved:count('improved'),recategorised:count('recategorised'),restricted:count('restricted'),deferredRejected:count('deferred'),canonicalOverlaps:rows.filter(r=>r.canonicalOverlap).length,duplicateEvidenceCollapsed:rows.reduce((n,r)=>n+r.duplicateEvidenceCollapsed,0)}];}));
 for(const g of Object.values(groups))assert.equal(g.reviewed,g.newlyAdmitted+g.existingCanonicalImproved+g.recategorised+g.restricted+g.deferredRejected);
 return {schemaVersion:1,wave:'2A',startingHead:manifest.startingHead,candidateCount:reviews.length,groups,newCanonicalIdentities:0,reviews,inputHashes:policy.inputs};
}
function presence(food,review,policy){
 const listing=review.evidence.find(e=>e.trustClass==='official-au-retailer'),evidence={trustClass:listing.trustClass,sourceId:'coles-au-wave-2a',recordId:listing.id,url:listing.url,retrievedAt:read('reviewed-evidence.json').webReaderCheckedAt,sourceSnapshotDate:null,sha256:policy.inputs['reviewed-evidence.json'],hashBasis:'reviewed-public-source-facts',identityMatch:'Exact manufacturer variant and 750 g pack; no inferred GTIN',privateTestingApproved:true,publicReleaseReviewRequired:true};
 const member={retailerId:'coles',market:'AU',scope:'food',verified:true,categoryIds:[food.categoryId],currentAvailability:'unknown',listingState:listing.listingState,evidence};
 food.retailerMemberships=[...new Map([...(food.retailerMemberships||[]),member].map(m=>[JSON.stringify(m),m])).values()];
 food.fieldProvenance={...(food.fieldProvenance||{}),identity:C.sourceEvidence(food),nutrition:C.sourceEvidence(food),serving:C.sourceEvidence(food),retailerPresence:evidence};
 food.catalogueReview={wave:'2A',candidateId:review.candidateId,disposition:review.disposition,checkedAt:evidence.retrievedAt,publicReleaseReviewRequired:true};
 assert.equal(C.privateLabelCollectionMembership(food,'coles').length,0);
 assert.equal(C.retailerMembership(food,'coles').length,1);
}
function augment(out,kind){
 const report=derive(),reviews=new Map(report.reviews.map(r=>[r.canonicalKey,r])),file='../../'+kind+'-au-catalogue.js',script=out[file],match=script.match(/const index=(.*?);(?:const adapter|if\(typeof module)/s);assert(match);
 const index=JSON.parse(match[1]),byId=new Map(),changes=[];
 for(const shard of index.files){const data=JSON.parse(out[shard.path]);for(const food of data.records){
  const key=C.canonicalKey(food),review=reviews.get(key),old=food.browseCategoryId||food.categoryId;
  if(old==='other-food'&&food.browseEligible!==false&&C.canLog(food)){
   const category=SEM.fallbackFamily(food);
   if(category){
    // Every Coles house-brand review must have been enrolled before projection.
    if(index.retailer?.id==='coles'&&index.retailer.houseBrandFamilies.some(f=>f.key===C.brandKey(food.brand)))assert.equal(review?.group,'B','Unreviewed Coles category candidate');
    changes.push({canonicalKey:key,id:food.id,name:food.name,brand:food.brand,before:old,after:category.id,rule:category.rule,evidence:{name:food.name,categories:food.categories||[],physicalForm:food.physicalForm||null,source:C.sourceEvidence(food)}});
    food.categoryId=category.id;food.browseCategoryId=category.id;food.category=index.categories.find(c=>c.id===category.id).label;food.conceptIds=category.conceptIds;
    food.categoryEvidence={wave:'2A',rule:category.rule,source:C.sourceEvidence(food),...(review?.group==='B'?{candidateId:review.candidateId}:{}),projectionOnly:true};
   }
  }
  if(review?.disposition==='improved')presence(food,review,{inputs:report.inputHashes});
  byId.set(food.id,food);
 }out[shard.path]=X.bytes(data);shard.sha256=X.hash(out[shard.path]);}
 for(const entry of index.entries){const food=byId.get(entry.id);for(const key of ['browseCategoryId','conceptIds','retailerMemberships'])if(food[key]!==undefined)entry[key]=food[key];if(kind==='brand')entry.categoryId=food.categoryId;}
 changes.sort((a,b)=>a.canonicalKey.localeCompare(b.canonicalKey)||a.id.localeCompare(b.id));
 index.wave2A={candidateManifestSha256:report.inputHashes['candidate-manifest.json'],reviewed:report.candidateCount,admitted:0,categoryChanges:changes.length,publicReleaseReviewRequired:true};
 out[file]=script.replace(match[1],JSON.stringify(index));out['wave-2a-report.json']=X.bytes({kind,...index.wave2A,changes});return out;
}
if(require.main===module){const report=derive(),text=JSON.stringify(report,null,2)+'\n';if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path.join(BASE,'review-report.json'),'utf8'),text);else fs.writeFileSync(path.join(BASE,'review-report.json'),text);console.log(JSON.stringify({candidates:report.candidateCount,groups:report.groups}));}
module.exports={inputs,derive,augment};
