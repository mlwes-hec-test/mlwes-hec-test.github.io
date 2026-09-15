'use strict';
// Offline first-wave projection. Never acquires or rewrites the frozen archive.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),OFF=require('../off-catalogue'),{validGtin}=require('./build_coles_catalogue');
const base=path.resolve(__dirname,'../data/aldi-au');
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(base,file),'utf8'));
function pool(records){return records.filter(r=>r.offRetailerEvidence.explicit&&r.audit.conservativeReviewCandidate&&r.normalized.countriesTags.length===1&&r.normalized.countriesTags[0]==='en:australia');}
function projection(r){return {hecInput:r.hecInput,normalized:r.normalized,audit:r.audit,offRetailerEvidence:r.offRetailerEvidence,rawRecordNumber:r.raw.rawRecordNumber};}
function verifyEvidence(directory){
  const policy=read('source-policy.json');
  for(const pin of policy.source.pins)assert.equal(hash(fs.readFileSync(path.join(directory,pin.path))),pin.sha256,pin.path+' hash mismatch');
  const canonical=JSON.parse(fs.readFileSync(path.join(directory,'canonical-audit-snapshot.json'),'utf8'));
  assert.deepEqual(pool(canonical.records).map(projection),read('review-input.json').records,'Frozen admission-pool projection differs');
  return {pins:policy.source.pins,pool:pool(canonical.records).length};
}
function derive(){
  const policy=read('source-policy.json'),raw=fs.readFileSync(path.join(base,'review-input.json'));
  assert.equal(hash(raw),policy.source.reviewInputSha256,'Review input pin differs');
  const inputs=JSON.parse(raw).records;assert.equal(inputs.length,policy.reviews.length);assert.equal(new Set(policy.reviews.map(r=>r.code)).size,inputs.length);
  const rows=inputs.map(input=>{
    const record=input.hecInput,item=policy.reviews.find(r=>r.code===record.barcode),a=input.audit,n=input.normalized;
    assert(item,'Unreviewed admission-pool item');assert(a.conservativeReviewCandidate&&a.australiaOnlyReviewCandidate);assert.deepEqual(n.countriesTags,['en:australia']);
    assert(input.offRetailerEvidence.explicit&&n.stores.split(',').some(s=>s.trim().toLowerCase()==='aldi'));
    const food=OFF.toFood(record),evidence={trustClass:'open-food-facts-au',sourceId:'open-food-facts-au',recordId:record.id,url:record.sourceUrl,snapshotDate:policy.source.snapshotDate,snapshotSha256:policy.source.pins[0].sha256,sha256:policy.source.pins[1].sha256,evidenceDate:policy.source.evidenceDate,rawRecordNumber:input.rawRecordNumber,field:'stores',stores:n.stores,countriesTags:n.countriesTags,lastModified:record.lastModified};
    food.sourceProvenance=evidence;food.sourceAttribution=policy.licence;
    food.retailerMemberships=[{retailerId:'aldi',market:'AU',scope:'food',basis:'source-declared-store',verified:false,listingState:'community-snapshot',categoryIds:[item.categoryId],evidence}];
    food.privateLabelCollections=[];food.commercialIdentities=[];food.currentState='unknown';
    food.availabilityEvidence={listingState:'community-snapshot',currentAvailability:'unknown',reason:'Pinned community store metadata; no current stock or retailer verification.'};
    food.category=policy.categories.find(c=>c.id===item.categoryId).label;food.conceptIds=item.conceptIds;
    food.sourceCategories=[...record.categories];food.packIdentity={text:n.quantity,quantity:n.productQuantity};
    food.sourceServing={text:n.servingSize,quantity:n.servingQuantity,unit:n.servingQuantityUnit};
    food.sourceNutritionBasis=record.nutritionBasis;food.sourceBasisLimit=n.nutritionBasis;
    food.reviewState={status:item.excludeReason?'excluded':'approved-first-wave',reason:item.excludeReason||null,note:item.note,canonicalEvidenceSha256:evidence.sha256};
    food.browseEligible=!item.excludeReason;
    const eligibility=C.productEligibility(food);
    if(food.browseEligible){
      assert(validGtin(record.barcode)&&record.brand&&record.name);assert.equal(n.brandValues.length,1);
      assert.equal(eligibility.addability.status,'loggable-now');assert.equal(food.nutritionIntegrity.status,'usable');
      assert.equal(a.conflicts.length,0);assert.equal(a.historicalIdentityConflicts.length,0);assert.equal(a.explicitCollisionTags.length,0);assert(!a.qualityTagsReviewRequired&&!a.servingBasisConflict);
      assert(!(food.quarantinedMeasures||[]).some(m=>m.rejectionReason==='source-serving-unit-conflicts-with-nutrition-basis'));
      // Detailed wave review is stricter than the general shared energy gate.
      assert(a.nutritionIntegrity.energy.relativeDifference<=.05,'Energy basis needs individual review');
      assert.equal(C.sourceDeclaredRetailerMembership(food,'aldi').length,1);assert.equal(C.retailerMembership(food,'aldi').length,0);
    }
    return {input,record,item,food,eligibility};
  });return {policy,rows};
}
function outputs(){
  const {policy,rows}=derive(),approved=rows.filter(r=>r.food.browseEligible).sort((a,b)=>policy.categories.findIndex(c=>c.id===a.item.categoryId)-policy.categories.findIndex(c=>c.id===b.item.categoryId)||a.record.name.localeCompare(b.record.name,'en')||a.record.barcode.localeCompare(b.record.barcode)),out={},entries=[],files=[];
  const categories=policy.categories.filter(c=>approved.some(r=>r.item.categoryId===c.id));
  for(let i=0;i<approved.length;i+=8){const file='products/'+String(i/8).padStart(2,'0')+'.json',records=approved.slice(i,i+8).map(r=>r.food),raw=JSON.stringify({attribution:policy.licence,records})+'\n';out[file]=raw;files.push({path:file,sha256:hash(raw),records:records.length});for(const f of records)entries.push(Object.fromEntries(['id','barcode','recordType','market','brand','name','aliases','conceptIds','retailerMemberships','browseEligible'].map(k=>[k,f[k]]).concat([['shard',file]])));}
  const index={schemaVersion:1,retailer:policy.retailer,categories,selectableOnly:true,entries,files,base:'./data/aldi-au/',sourceDigest:hash(JSON.stringify(policy)),licence:policy.licence};
  out['../../aldi-au-catalogue.js']="/* Generated by scripts/build_aldi_catalogue.js. Open Food Facts contributors; ODbL/DbCL. */\n(function(global){'use strict';const index="+JSON.stringify(index)+";const adapter=global.HECRetailerSource||(typeof require==='function'?require('./retailer-source.js'):null);const registration=adapter.register(index);global.HECAldiAustralia={index,registration};if(typeof module!=='undefined'&&module.exports)module.exports={index,registration};})(typeof window!=='undefined'?window:globalThis);\n";
  const report={admissionPool:rows.length,approved:approved.length,excluded:rows.length-approved.length,categories:categories.map(c=>({...c,count:approved.filter(r=>r.item.categoryId===c.id).length})),allItems:approved.length,exclusionReasons:rows.filter(r=>!r.food.browseEligible).reduce((a,r)=>(a[r.item.excludeReason]=(a[r.item.excludeReason]||0)+1,a),{}),products:rows.map(({record,item,food,eligibility})=>({id:record.id,name:record.name,brand:record.brand,gtin:record.barcode,categoryId:item.categoryId,approved:food.browseEligible,review:food.reviewState,eligibility:eligibility.addability,pack:food.packIdentity,serving:food.sourceServing,measures:food.units,measureLabels:food.unitLabels,quarantinedMeasures:food.quarantinedMeasures||[],nutritionIntegrity:food.nutritionIntegrity,conflicts:C.sourceConflicts(food)}))};
  out['review-manifest.json']=JSON.stringify(report,null,2)+'\n';return out;
}
function build({check=false}={}){const out=outputs();for(const [relative,raw] of Object.entries(out)){const file=path.resolve(base,relative);if(check)assert.equal(fs.readFileSync(file,'utf8'),raw,'Stale generated Aldi output: '+relative);else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,raw);}}return JSON.parse(out['review-manifest.json']);}
if(require.main===module){const at=process.argv.indexOf('--evidence');if(at>=0)console.log(JSON.stringify(verifyEvidence(process.argv[at+1])));const report=build({check:process.argv.includes('--check')});console.log(JSON.stringify({pool:report.admissionPool,approved:report.approved,excluded:report.excluded,categories:report.categories}));}
module.exports={pool,projection,verifyEvidence,derive,outputs,build};
