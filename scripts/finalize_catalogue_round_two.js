'use strict';
const fs=require('node:fs'),path=require('node:path'),C=require('../food-catalogue'),X=require('./catalogue-round-two');
const base=path.resolve(__dirname,'../data/catalogue-round-two');
function finalize(){const products=X.read('approved-products.json'),audit=X.read('audit.json'),policy=X.read('policy.json');

 const baseline=X.read('baseline-products.json').records,oldAdmitted=new Set(baseline.filter(f=>f.brandAdmission).map(C.canonicalKey)),corroboration=X.read('market-corroboration.json');
 const inputs=new Map(X.read('off-input.json').records.map(r=>[r.record.id,r.record]));
 const regionalHolds=new Set(['24022408','24069335','26001029','26001470','26006079','26006109','26007120','26038551','26042794','26042855','26049076','26078007']);
 const geographyHeld=[];
 for(const f of products.records){
  const input=inputs.get(f.id),countries=input?.countries||[];
  const official=baseline.find(b=>b.barcode&&b.barcode===f.barcode&&C.verifiedRetailEvidence(b.sourceProvenance));
  const current=corroboration.find(r=>r.gtin===f.barcode);
  const marketEvidence=current?{trustClass:'official-au-retailer',sourceId:'aldi-au-public',recordId:new URL(current.url).pathname,url:current.url,retrievedAt:current.checkedAt,sha256:current.sha256,matchedGtin:f.barcode,matchBasis:current.matchBasis,brand:current.brand,name:current.name,pack:current.pack}:official?{...official.sourceProvenance,matchedGtin:f.barcode,matchBasis:'Existing verified Australian product with compatible exact GTIN'}:null;
  if(countries.length>1){
   if(marketEvidence){for(const m of f.retailerMemberships||[])m.evidence.australianMarketEvidence=marketEvidence;f.australianMarketEvidence=marketEvidence;}
   else{
    const dropped=[...(f.retailerMemberships||[]),...(f.privateLabelCollections||[])].map(m=>m.retailerId);f.retailerMemberships=[];f.privateLabelCollections=[];
    const d=audit.off.find(r=>r.id===f.id);if(d&&dropped.length)d.membershipHolds=[...new Set(dropped)].map(retailerId=>({retailerId,reason:'Multi-market store token lacks independent Australian product corroboration'}));
    if(!oldAdmitted.has(C.canonicalKey(f))&&(regionalHolds.has(f.barcode)||['aldi','coles','woolworths'].includes(C.brandKey(f.brand)))){geographyHeld.push(f);if(d)d.reasons.push('australian-product-identity-unresolved');}
   }
  }
  let category=f.categoryId;
  if(category==='cereal'&&/\bbars?\b/i.test(f.name))category='snacks';
  if(['yoghurt','cheese'].includes(category)&&/\b(chicken|lamb|beef|meatballs|gnocchi)\b/i.test(f.name))category=/sausage|burgers|fillets/i.test(f.name+' '+f.brand)?'protein':'meals';
  if(category==='yoghurt'&&/\b(dressing|dip)\b/i.test(f.name))category='sauces';
  if(category==='yoghurt'&&/\bbutton snacks\b/i.test(f.name))category='snacks';
  if(category==='milk'&&C.brandKey(f.brand)==='cadbury')category='snacks';
  if(category==='milk'&&/^hot chocolate$/i.test(f.name))category='drinks';
  if(category!==f.categoryId){f.categoryId=category;f.category=[...require('../data/woolworths-au/source-policy.json').categories,...X.extraCategories].find(c=>c.id===category).label;f.conceptIds=[];for(const m of [...(f.retailerMemberships||[]),...(f.privateLabelCollections||[])])m.categoryIds=[category];const d=audit.off.find(r=>r.id===f.id);if(d){d.categoryReview='Reviewed whole product family; ingredient or flavour mention is not the food concept';d.categoryId=category;}}
 }
 products.records=products.records.filter(f=>!geographyHeld.includes(f));
 audit.geographyHolds=[...new Map([...(audit.geographyHolds||[]),...geographyHeld.map(f=>({id:f.id,name:f.name,reason:'Australian product identity unresolved in multi-market evidence'}))].map(r=>[r.id,r])).values()];
 C.registerBrandDirectory(products.records.flatMap(f=>f.sourceBrandTokens).map(b=>({name:b.name,aliases:[b.name]})));
 const held=products.records.filter(f=>!C.productEligibility(f).addability.normalLoggingAllowed);const keys=new Set(held.map(C.canonicalKey));
 products.records=products.records.filter(f=>!keys.has(C.canonicalKey(f)));
 for(const f of held){const d=audit.off.find(r=>r.id===f.id)||audit.manufacturer.find(r=>r.canonicalId===f.id);if(d)d.reasons.push('final-directory-identity-ineligible');}
 audit.finalProjectionHolds=[...new Map([...(audit.finalProjectionHolds||[]),...held.map(f=>({id:f.id,name:f.name,status:C.productEligibility(f).addability}))].map(r=>[r.id,r])).values()];
 fs.writeFileSync(path.join(base,'approved-products.json'),JSON.stringify(products)+'\n');fs.writeFileSync(path.join(base,'audit.json'),JSON.stringify(audit)+'\n');policy.approvedSha256=X.hash(fs.readFileSync(path.join(base,'approved-products.json')));fs.writeFileSync(path.join(base,'policy.json'),JSON.stringify(policy)+'\n');console.log(JSON.stringify({approved:products.records.length,held:audit.finalProjectionHolds}));}
if(require.main===module)finalize();module.exports={finalize};
