'use strict';
// Offline, bounded evidence review and projection into the existing catalogues.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),O=require('../off-catalogue'),S=require('../serving-foundation');
const X=require('./catalogue-round-two'),SEM=require('./food-category-semantics');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-wave-1b');
const read=n=>JSON.parse(fs.readFileSync(path.join(BASE,n),'utf8'));
const copy=v=>JSON.parse(JSON.stringify(v));
const unresolved=f=>C.sourceConflicts(f).filter(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved'));
function inputs(){
  const policy=read('policy.json');
  for(const [file,hash]of Object.entries(policy.inputs))assert.equal(X.hash(fs.readFileSync(path.join(BASE,file))),hash,'Changed reviewed input: '+file);
  const manifest=read('candidate-manifest.json'),peers=read('baseline-peers.json');
  assert(manifest.candidates.length<=60);assert.equal(new Set(manifest.candidates.map(c=>c.candidateId)).size,manifest.candidates.length);
  for(const [group,limit]of Object.entries(manifest.groupLimits))assert(manifest.candidates.filter(c=>c.groups.includes(group)).length<=limit);
  assert.equal(manifest.candidates.filter(c=>c.groups.includes('A')).length,15);
  for(const brand of ['nescafe','kelloggs','campbells'])assert(manifest.candidates.filter(c=>c.groups.includes('D')&&C.brandKey(c.brand)===brand).length<=3);
  const cache=new Map();for(const p of peers.protectedOFF){if(!cache.has(p.file)){const bytes=fs.readFileSync(path.join(ROOT,p.file));assert.equal(X.hash(bytes),p.sha256);cache.set(p.file,JSON.parse(bytes));}assert.deepEqual(cache.get(p.file).products[p.row],p.record);}
  return {policy,manifest,peers,baseline:read('baseline.json'),facts:read('public-products.json').records,manufacturer:read('manufacturer-facts.json')};
}
function manufacturerFood(retailer,facts){
  const n=facts.nutrition,serve=C.metricEvidence(n.servingSize);
  assert.equal(serve?.unit,'mL');assert.equal(facts.packLabel,'1litre');
  const listing=facts.australianRetailerLinks.find(l=>new URL(l.url).pathname.split('/')[3]===retailer.sourceId);
  assert(listing,'Manufacturer must link this exact Australian retailer product');
  assert.equal(C.norm(facts.ingredients),C.norm(retailer.ingredients));
  const fields={energyKj:'energy',protein:'protein',carbs:'carbohydrates',fat:'fat',satFat:'saturatedFat',sugar:'sugars',sodium:'sodium',fibre:'fibre'};
  const nutrients=Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,n[field+'PerServe']??null]));nutrients.calories=nutrients.energyKj/4.184;
  const evidence={...facts.provenance,sourceId:facts.sourceId,recordId:facts.recordId,trustClass:'official-au-manufacturer',market:'AU',sourceType:'official-au-manufacturer',sourceContentUpdatedAt:facts.sourceContentUpdatedAt,nutritionContentUpdatedAt:facts.nutritionContentUpdatedAt,dateNote:facts.dateNote};
  // Copy source identity facts, never the retailer adapter's derived serving
  // caches: this independent panel has a different nutrient denominator.
  const identity=Object.fromEntries(['canonicalId','recordType','market','country','name','brand','aliases','barcode','sourceBarcode','pack','packageSize','packCount','category','categoryMemberships','sourceCategories','conceptIds','availabilityEvidence','retailerMemberships','commercialIdentities','verified','verificationStatus','currentState','ingredients','measureEvidencePolicy','score'].filter(k=>retailer[k]!==undefined).map(k=>[k,copy(retailer[k])]));
  const f={...identity,id:'manufacturer:'+facts.sourceId+':'+facts.recordId,sourceId:facts.recordId,sourceCatalogueId:facts.sourceId,
    source:'Official Australian manufacturer panel',sourceUrl:evidence.url,sourceProvenance:evidence,
    nutrients,nutritionPerServing:copy(nutrients),nutritionPer100:{},nutritionPer100Unit:undefined,
    sourceNutritionBasis:{basis:'per-serving',amount:serve.amount,unit:serve.unit,state:'as-sold ready-to-use liquid stock'},
    sourceNutritionEvidence:copy(n),nutritionBasisNote:'Use the explicit 250 mL manufacturer serving. Per100g CMS fields are retained as source evidence, not assumed to be per100mL.',
    manufacturerServing:{...serve,text:n.servingSize},sourceServingEvidence:{text:n.servingSize,servingsPerPack:n.servesPerPackage},
    servingsPerPack:Number(n.servesPerPackage),packageServingText:n.servingSize,packageServingExplicit:true,
    serving:'Manufacturer serve '+n.servingSize+'; as-sold ready-to-use liquid stock',defaultUnit:'serve',defaultAmount:1,
    units:{mL:1/serve.amount,serve:1},unitLabels:{mL:'mL',serve:'Manufacturer serve ('+n.servingSize+')'},
    nutritionStatus:'partial',loggable:true,evidenceFlags:[],evidenceConflicts:[],physicalForm:'liquid',physicalFormSource:'Manufacturer explicit serving in mL; ready-to-use stock',
    identityEvidence:{manufacturerTitle:facts.title,manufacturerRetailerLink:listing.url,retailerGtin:retailer.barcode,gtinSource:retailer.sourceProvenance,matchingIngredients:true},
    fieldProvenance:{identity:retailer.sourceProvenance,nutrition:evidence,serving:evidence,retailerPresence:retailer.retailerMemberships[0].evidence}};
  S.applyToFood(f);return f;
}
function derive(){
  const input=inputs(),{manifest,peers,baseline,facts,manufacturer}=input;
  const W=require('./build_woolworths_catalogue'),sourcePolicy=require('../data/woolworths-au/source-policy.json');
  const categories=[...sourcePolicy.categories,...X.extraCategories],reviews=[],admissions=[],seen=new Set();
  for(const candidate of manifest.candidates){
    const group=candidate.groups[0],old=baseline.candidates.find(f=>C.canonicalKey(f)===candidate.canonicalKey);
    const raw=facts.find(f=>f.sourceRecordId===(candidate.sourceRecordId||candidate.recordId?.split(':')[1]));
    const key=raw?'barcode:'+raw.product.Barcode:candidate.canonicalKey;
    assert(!seen.has(key),'Duplicate candidate canonical identity: '+key);seen.add(key);
    const prior=peers.records.filter(p=>C.canonicalKey(p.record)===key).map(p=>p.record),off=peers.protectedOFF.filter(p=>C.canonicalKey(p.record)===key).map(p=>{
      const food=O.toFood(p.record);food.sourceProvenance={...C.sourceEvidence(food),sha256:p.sha256,shard:p.file,row:p.row,snapshotDate:require('../data/open-food-facts-au/manifest.json').sourceSnapshotDate};return food;
    });
    const before=C.canonicaliseRecords([...prior,...off]),base={candidateId:candidate.candidateId,groups:candidate.groups,canonicalKey:key,
      name:raw?.product.DisplayName||candidate.name,brand:raw?.product.Brand||candidate.brand,
      canonicalOverlap:!!before.length,previouslyOrdinary:prior.some(f=>f.browseEligible!==false&&C.productEligibility(f).addability.normalLoggingAllowed),
      beforeStatus:old?C.productEligibility(old).addability.status:before[0]?C.productEligibility(before[0]).addability.status:'not-catalogued',
      privateTestingApproved:false,publicReleaseReviewRequired:true};
    if(group==='B'){
      assert.equal(old.categoryId,'other-food');const category=SEM.reviewedFamily(old);
      reviews.push({...base,disposition:category?'recategorised':'deferred',reason:category?'Shared food-family evidence supports classification':'Ambiguous family retained in Other Packaged Food',category,
        evidence:{source:C.sourceEvidence(old),baselineSha256:candidate.baselineSha256},afterStatus:C.productEligibility(old).addability.status,privateTestingApproved:true});continue;
    }
    assert(raw,'Missing captured candidate evidence');assert(W.validGtin(raw.product.Barcode),'Invalid source GTIN');
    const selection=sourcePolicy.products.find(p=>p.sourceRecordId===raw.sourceRecordId)||{
      sourceRecordId:raw.sourceRecordId,categoryId:candidate.proposedCategoryId,physicalForm:group==='C'&&candidate.proposedCategoryId==='yoghurt'?'weight':candidate.physicalForm,
      conceptIds:candidate.proposedCategoryId==='milk'?['milk']:candidate.proposedCategoryId==='yoghurt'?['yoghurt']:candidate.proposedCategoryId==='cereal'?['cereal']:[],
      nutritionState:candidate.proposedCategoryId==='frozen-vegetables'?'as-sold frozen product':'as published for this product'};
    const official=W.convert(raw,selection,sourcePolicy);official.categoryId=selection.categoryId;
    official.fieldProvenance={identity:official.sourceProvenance,nutrition:official.sourceProvenance,serving:official.sourceProvenance,retailerPresence:official.retailerMemberships[0].evidence};
    const evidenceRows=[official,...prior,...off],holds=[];let nutrition=official;
    if(group==='D'){
      const link=manufacturer.australianRetailerLinks.find(l=>new URL(l.url).pathname.split('/')[3]===raw.sourceRecordId);
      if(link){nutrition=manufacturerFood(official,manufacturer);evidenceRows.unshift(nutrition);}
      else holds.push('independent-exact-product-nutrition-not-established');
    }
    // A qualified source value is not an exact required nutrient. Do not fill it
    // from another panel or accept a contradictory exact/upper-bound pair.
    for(const key of ['calories','protein','carbs','fat'])if(nutrition.nutrients[key]==null)holds.push('missing-required-'+key);
    for(const row of raw.nutrition){const exact=W.number(row.Values?.['Quantity Per 100g / 100mL'],row.Name==='Energy'?'kJ':row.Name==='Sodium'?'mg':'g');
      const bound=String(row.Values?.['Quantity Per Serving']||'').match(/^<\s*(\d+(?:\.\d+)?)/);
      if(exact!==null&&bound&&official.manufacturerServing&&exact*official.manufacturerServing.amount/100>=Number(bound[1]))holds.push('qualified-serving-bound-needs-review');
    }
    const merged=C.canonicaliseRecords(evidenceRows);assert.equal(merged.length,1);const food=merged[0],eligibility=C.productEligibility(food);
    if(!eligibility.addability.normalLoggingAllowed)holds.push(eligibility.addability.reasonCode);
    if(unresolved(food).length)holds.push('unresolved-material-evidence');
    if(group==='A'){
      assert(!eligibility.addability.normalLoggingAllowed,'Completion requires an explicit evidence adjudication; do not replace an accepted source implicitly');
      reviews.push({...base,disposition:'remains-restricted',reason:eligibility.addability.reasonCode,additionalHolds:[...new Set(holds)],beforeReason:C.productEligibility(old).addability.reasonCode,
        afterStatus:eligibility.addability.status,conflicts:unresolved(food),evidence:raw.provenance});continue;
    }
    if(holds.length){reviews.push({...base,disposition:'deferred',reason:[...new Set(holds)].join('; '),afterStatus:eligibility.addability.status,conflicts:unresolved(food),evidence:raw.provenance});continue;}
    assert(S.servingMeasureProfile(food).measures.length);
    assert.equal(C.brandKey(food.brand),C.brandKey(raw.product.Brand));
    food.categoryId=selection.categoryId;food.category=categories.find(c=>c.id===selection.categoryId).label;food.browseCategoryId=food.categoryId;food.conceptIds=selection.conceptIds;
    food.sourceBrands=food.brand;food.sourceBrandTokens=[{name:food.brand,key:C.brandKey(food.brand)}];
    food.brandAdmission={status:'audited-wave-1b',evidenceSha256:input.policy.inputs['public-products.json']};
    food.privateTestingApproved=true;food.publicReleaseReviewRequired=true;food.browseEligible=true;
    const review={...base,disposition:base.previouslyOrdinary?'improved':'admitted',reason:'Reliable AU identity, required nutrition and safe consumed measure; compatible canonical evidence',
      afterStatus:eligibility.addability.status,privateTestingApproved:true,evidence:raw.provenance,nutritionSource:C.sourceEvidence(nutrition),
      measures:S.servingMeasureProfile(food).measures.map(m=>({key:m.key,label:m.label})),newCanonicalIdentity:!before.length};
    food.catalogueReview={wave:'1B',candidateId:review.candidateId,checkedAt:raw.provenance.retrievedAt,disposition:review.disposition,publicReleaseReviewRequired:true};
    reviews.push(review);admissions.push(food);
  }
  const groups=Object.fromEntries(['A','B','C','D'].map(group=>{const rows=reviews.filter(r=>r.groups.includes(group));return [group,{reviewed:rows.length,
    newlyAdmitted:rows.filter(r=>r.disposition==='admitted').length,previouslyAdmittedImproved:rows.filter(r=>['improved','recategorised'].includes(r.disposition)).length,
    recategorised:rows.filter(r=>r.disposition==='recategorised').length,remainsRestricted:rows.filter(r=>r.disposition==='remains-restricted').length,
    deferred:rows.filter(r=>r.disposition==='deferred').length,canonicalOverlaps:rows.filter(r=>r.canonicalOverlap).length}];}));
  return {schemaVersion:1,wave:'1B',startingHead:manifest.startingHead,candidateCount:reviews.length,groups,
    newCanonicalIdentities:reviews.filter(r=>r.newCanonicalIdentity).length,admitted:admissions.length,
    reviews,admissions,inputHashes:input.policy.inputs};
}
function augment(out,kind){
  if(!['woolworths','brand'].includes(kind))return out;
  const report=derive(),reviews=new Map(report.reviews.map(r=>[r.canonicalKey,r]));
  const file='../../'+kind+'-au-catalogue.js',script=out[file],match=script.match(/const index=(.*?);(?:const adapter|if\(typeof module)/s);assert(match);
  const index=JSON.parse(match[1]),byId=new Map(),existingKeys=new Set();
  for(const shard of index.files){const data=JSON.parse(out[shard.path]);for(const food of data.records){
    const key=C.canonicalKey(food),review=reviews.get(key);existingKeys.add(key);
    if(review?.groups.includes('A'))food.catalogueReview={wave:'1B',candidateId:review.candidateId,checkedAt:review.evidence.retrievedAt,disposition:review.disposition,reason:review.reason,publicReleaseReviewRequired:true};
    if(review?.disposition==='recategorised'){
      food.categoryId=review.category.id;food.category=index.categories.find(c=>c.id===food.categoryId).label;food.browseCategoryId=food.categoryId;food.conceptIds=review.category.conceptIds;
      food.categoryEvidence={wave:'1B',rule:review.category.rule,candidateId:review.candidateId,baselineSha256:review.evidence.baselineSha256};
    }
    byId.set(food.id,food);
  }out[shard.path]=X.bytes(data);shard.sha256=X.hash(out[shard.path]);}
  const extra=report.admissions.filter(f=>!existingKeys.has(C.canonicalKey(f))).sort((a,b)=>C.canonicalKey(a).localeCompare(C.canonicalKey(b)));
  if(extra.length){const relative='products/wave-1b-000.json';out[relative]=X.bytes({records:extra});index.files.push({path:relative,sha256:X.hash(out[relative]),records:extra.length});for(const food of extra){byId.set(food.id,food);index.entries.push({id:food.id,shard:relative});}}
  for(const entry of index.entries){const food=byId.get(entry.id);if(!reviews.has(C.canonicalKey(food)))continue;
    const fields=kind==='brand'?['id','canonicalId','barcode','name','brand','sourceBrands','categoryId','conceptIds']:['id','canonicalId','barcode','recordType','market','brand','name','aliases','conceptIds','retailerMemberships','commercialIdentities','privateLabelCollections','browseEligible'];
    for(const key of [...fields,'browseCategoryId'])if(food[key]!==undefined)entry[key]=food[key];
    if(kind==='brand'){entry.brandKeys=food.sourceBrandTokens.map(b=>b.key);entry.pack=food.packageSize;}
  }
  if(kind==='brand')for(const food of extra)for(const token of food.sourceBrandTokens){let brand=index.brands.find(b=>b.key===token.key);if(!brand){brand={key:token.key,name:token.name,aliases:[token.name],count:0,tier:'private-testing'};index.brands.push(brand);}brand.count++;brand.aliases=[...new Set([...brand.aliases,token.name])];}
  index.wave1B={candidateManifestSha256:report.inputHashes['candidate-manifest.json'],reviewed:report.candidateCount,admitted:extra.length,publicReleaseReviewRequired:true};
  out[file]=script.replace(match[1],JSON.stringify(index));
  out['wave-1b-report.json']=X.bytes({kind,...index.wave1B,categoryChanges:report.reviews.filter(r=>r.disposition==='recategorised').length});
  return out;
}
if(require.main===module){const report=derive(),output=JSON.stringify({...report,admissions:report.admissions.map(f=>({id:f.id,canonicalKey:C.canonicalKey(f),brand:f.brand,name:f.name}))},null,2)+'\n';
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path.join(BASE,'review-report.json'),'utf8'),output);
  else fs.writeFileSync(path.join(BASE,'review-report.json'),output);
  console.log(JSON.stringify({candidates:report.candidateCount,groups:report.groups,newCanonical:report.newCanonicalIdentities,admitted:report.admitted}));
}
module.exports={inputs,derive,augment,manufacturerFood};
