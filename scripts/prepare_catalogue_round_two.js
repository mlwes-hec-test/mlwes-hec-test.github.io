'use strict';
// Explicit offline admission audit; raw OFF and retailer/restaurant sources are read-only.
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline'),assert=require('node:assert/strict');
const A=require('./audit_brand_wave'),C=require('../food-catalogue'),O=require('../off-catalogue'),S=require('../serving-foundation'),X=require('./catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-round-two');
const write=(n,v)=>fs.writeFileSync(path.join(BASE,n),JSON.stringify(v)+'\n');
const tags=s=>String(s||'').split(',').map(s=>s.trim()).filter(Boolean);
function category(fields,previous){
 const semantic=require('./food-category-semantics').classify(fields);
 if(!previous.reasons.some(r=>['unsupported-domain','restaurant-domain'].includes(r))&&semantic)return semantic.id;
 if(previous.categoryId)return previous.categoryId;
 const name=C.norm(fields.product_name),t=tags(fields.categories_tags);
 if(previous.reasons.includes('unsupported-domain')||previous.reasons.includes('restaurant-domain'))return null;
 if(t.some(s=>/pizza|quiche/.test(s))||/\b(pizza|quiche)\b/.test(name))return 'pizza';
 if(/\b(soup|broth|stock)\b/.test(name))return 'canned';
 if(/\b(lasagne|lasagna|ready meal|butter chicken|carbonara|spaghetti bolognese|risotto)\b/.test(name))return 'meals';
 const rules=[['frozen-potato',/\b(hash ?browns?|frozen chips|superfries|oven fries)\b/],['yoghurt',/\b(yoghurt|yogurt)\b/],['biscuits',/\b(biscuits?|crackers?|cookies|wafers?|tim tam)\b/],['cereal',/\b(corn flakes|bran flakes|breakfast cereal|muesli|granola|porridge|rolled oats|weet bix|weetbix|nutri grain)\b/],['bread',/\b(bread|bagels?|crumpets?|tortilla wraps?)\b/],['cheese',/\b(cheddar|parmesan|mozzarella|feta|tasty cheese|cottage cheese)\b/],['snacks',/\b(chocolate|choc|almonds|cashews|peanuts|potato crisps|potato chips|popcorn|protein bar|muesli bar)\b/],['drinks',/\b(coffee|juice|lemonade|soft drink|spring water|cappuccino|latte|tea bags)\b/],['milk',/\b(milk|oat drink|soy drink)\b/],['grains',/\b(rice|pasta|spaghetti|penne|noodles|couscous|flour)\b/],['spreads',/\b(peanut butter|spread|margarine|honey|jam)\b/],['canned',/\b(canned|tinned|baked beans|tuna|sardines)\b/],['sauces',/\b(sauce|dressing|ketchup|mayonnaise|vinegar|mustard|olive oil)\b/],['desserts',/\b(ice cream|gelato|custard|pudding|cake|muffin)\b/],['protein',/\b(eggs|chicken|beef|pork|salmon|tofu|sausages|bacon)\b/],['produce',/\b(raisins|sultanas|dried fruit|peas|carrots|broccoli|corn kernels)\b/]];
 const matched=rules.find(([,rx])=>rx.test(name))?.[0];if(matched)return matched;
 // A missing narrow category is not a private-testing admission gate. Keep
 // unsupported domains out, then use a neutral family without inventing concepts.
 if(/\b(multivitamins?|vitamins?|capsules?|tablets?|creatine|collagen|whey|casein|supplements?|pre workout|post workout|protein powder|protein isolate|baby formula|infant formula|dog food|cat food|pet food|vodka|whisky|whiskey|bourbon|tequila|liqueur|cider|lager|pilsner|stout|ipa|beer|wine|shiraz|chardonnay|merlot|sauvignon|riesling)\b/.test(name)||Number(fields.alcohol_100g)>.5)return null;
 const expanded=[['bread',/\b(dinner rolls?|sandwich(?:es)?|flatbread|panini|focaccia)\b/],['desserts',/\b(cheesecake|tiramisu|gateau|pies|pavlova|brownies?|danish|donuts?|doughnuts?|croissants?|gelati|sorbet)\b/],['snacks',/\b(jelly beans|gummies|gummy|lollies|liquorice|licorice|fudge|nougat|candy|caramels?|marshmallows?)\b/],['protein',/\b(mackerel|herring|anchovies|prawns?|shrimps?|squid|calamari|mussels?|fish|mince|turkey|duck|venison|lamb|lentils?|chickpeas?)\b/],['meals',/\b(macaroni and cheese|chili|chilli con carne|dumplings?|gyoza|ravioli|tortellini|enchiladas?)\b/]];
 return expanded.find(([,rx])=>rx.test(name))?.[0]||'other-food';
}
function decorate(food,categoryId,provenance,sourceBrands){
 food.categoryId=categoryId;food.category=[...require('../data/woolworths-au/source-policy.json').categories,...X.extraCategories].find(c=>c.id===categoryId).label;
 food.sourceBrands=sourceBrands;food.sourceBrandTokens=A.brandTokens({brands:sourceBrands});
 food.conceptIds=({bread:['bread'],milk:['milk'],cereal:['cereal'],yoghurt:['yoghurt'],cheese:['cheese'],'frozen-potato':['potato'],grains:[],canned:/\bsoup\b/i.test(food.name)?['soup']:[]})[categoryId]||[];
 if(/hash ?brown/i.test(food.name)&&categoryId==='frozen-potato')food.conceptIds.push('hash-brown');
 food.sourceProvenance=provenance;food.privateTestingApproved=true;food.publicReleaseReviewRequired=true;food.brandAdmission={status:'audited-round-two',evidenceSha256:provenance.sha256};food.browseEligible=true;return food;
}
async function prepare(directory,manufacturerFile){
 const summary=JSON.parse(fs.readFileSync(path.join(directory,'extraction-summary.json'))),audit=JSON.parse(fs.readFileSync(path.join(directory,'audit-records.json'))),byCode=new Map(audit.map(r=>[r.code,r]));
 assert.equal(summary.projectionMismatches.length,0);assert.equal(A.hash(fs.readFileSync(path.join(directory,'au-records.jsonl'))),summary.extractionSha256);
 const baseline=JSON.parse(fs.readFileSync(path.join(BASE,'baseline-products.json'))).records;
 const peers=new Map();for(const f of baseline)if(f.barcode){const rows=peers.get(f.barcode)||[];rows.push(f);peers.set(f.barcode,rows);}
 const records=[],inputs=[],decisions=[],mccainInputs=[];const checkDate='2026-09-18';
 for await(const line of readline.createInterface({input:fs.createReadStream(path.join(directory,'au-records.jsonl')),crlfDelay:Infinity})){
  const raw=JSON.parse(line),fields=raw.fields,prior=byCode.get(fields.code);assert(prior);const cat=category(fields,prior);
  const reasons=prior.reasons.filter(r=>!cat||!['category-unresolved','unsupported-prepared-food-category'].includes(r));
  const record=A.inputFrom(fields);if(A.brandTokens(fields).some(b=>b.key==='mccain'))mccainInputs.push(record);const food=O.toFood(record);food.brand=String(fields.brands||'').split(',')[0].trim();
  if(C.productEligibility(food).addability.status!=='loggable-now')reasons.push('production-projection-ineligible');
  if(cat){const holds=A.reviewHolds(fields,{id:cat});for(const h of holds)if(!reasons.includes(h))reasons.push(h);}
  const existing=peers.get(fields.code)||[];
  if(existing.length){const merged=C.canonicaliseRecords([food,...existing]);if(merged.length!==1||!C.productEligibility(merged[0]).addability.normalLoggingAllowed)reasons.push('existing-canonical-conflict');}
  const stores=tags(fields.stores).map(s=>s.toLowerCase()),retailers=['woolworths','coles','aldi'].filter(id=>stores.includes(id)||C.brandKey(food.brand)===id);
  if(!cat){for(let n=reasons.length-1;n>=0;n--)if(['category-unresolved','unsupported-prepared-food-category'].includes(reasons[n]))reasons.splice(n,1);reasons.push('food-domain-not-established');}
  const decision={id:record.id,name:record.name,brand:record.brand,gtin:record.barcode,categoryId:cat,retailers,reasons:[...new Set(reasons)],hasServing:!!record.servingSize,canonicalOverlap:true};decisions.push(decision);
  if(reasons.length){O.loadedFoods.clear();continue;}
  const evidence={trustClass:'open-food-facts-au',sourceId:'open-food-facts-au',recordId:record.id,url:record.sourceUrl,snapshotDate:summary.sourceSnapshotDate,snapshotSha256:summary.rawSha256,sha256:summary.extractionSha256,checkedAt:checkDate,rawRecordNumber:raw.rawRecordNumber,lastModified:record.lastModified,privateTestingApproved:true,publicReleaseReviewRequired:true};
  decorate(food,cat,evidence,record.brand);food.sourceAttribution=require('../data/brand-au/source-policy.json').licence;food.currentState='unknown';food.packIdentity={text:record.quantity||null};food.sourceServing={text:record.servingSize||null,quantity:record.servingQuantity??null};
  food.retailerMemberships=[];food.privateLabelCollections=[];
  for(const id of retailers){
   if(stores.includes(id)){const e={...evidence,field:'stores',stores:fields.stores,countriesTags:record.countries};food.retailerMemberships.push({retailerId:id,market:'AU',scope:'food',basis:'source-declared-store',verified:false,listingState:'community-snapshot',categoryIds:[cat],evidence:e});}
   if(C.brandKey(food.brand)===id)food.privateLabelCollections.push({retailerId:id,market:'AU',scope:'food',basis:'source-declared-brand',verified:false,consumerBrand:food.brand,categoryIds:[cat],evidence});
  }
  inputs.push({record,sourceFields:fields,rawRecordNumber:raw.rawRecordNumber});records.push(food);O.loadedFoods.clear();
 }
 const manufacturer=JSON.parse(fs.readFileSync(manufacturerFile,'utf8')),mDecisions=[],seen=new Map();
 const baseName=n=>C.norm(String(n).replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l)\b/ig,'')).replace(/\bmccain\b/g,'').replace(/hash browns/g,'hashbrowns').trim().split(/\s+/).sort().join(' ');
 const cleanName=n=>C.norm(n).replace(/\bmccain\b/g,'').replace(/hash browns/g,'hashbrowns').replace(/\s+/g,' ').trim();
 const nutrientKeys={'Energy':'energyKj','Protein':'protein','Fat (total)':'fat','Fat (sat)':'satFat','Carbs':'carbs','Sugars':'sugar','Fibre':'fibre','Sodium':'sodium'};
 const values=table=>{const out=Object.fromEntries(['calories','energyKj','protein','carbs','fat','satFat','sugar','fibre','sodium'].map(k=>[k,null]));for(const row of table?.rows||[]){const key=nutrientKeys[row.name],m=row.value.match(/^([0-9]+(?:\.[0-9]+)?)\s*(kJ|g|mg)\b/);if(key&&m)out[key]=Number(m[1]);}if(out.energyKj!=null)out.calories=out.energyKj/4.184;return out;};
 for(const raw of manufacturer.records){
  const key=cleanName(raw.name),dupe=seen.get(key);if(dupe){mDecisions.push({name:raw.name,url:raw.url,reasons:['duplicate-manufacturer-page'],canonicalId:dupe});continue;}
  const previous=baseline.find(f=>C.brandKey(f.brand)==='mccain'&&(f.sourceProvenance?.url===raw.url||cleanName(f.name)===key));
  let id=previous?.id||'manufacturer:mccain-au:'+new URL(raw.url).pathname.split('/').filter(Boolean).at(-1);
  const per100=values(raw.tables.find(t=>/per 100g\b/i.test(t.basis))),perServe=values(raw.tables.find(t=>/per Serving$/i.test(t.basis))),serveText=raw.servingText.find(t=>t.startsWith('Serving size '))?.slice(13)||'',serve=C.metricEvidence(serveText),pack=C.metricEvidence(raw.name);
  const cat=raw.url.includes('/potato/')?'frozen-potato':raw.url.includes('/veggies/')?'frozen-vegetables':raw.url.includes('/meals/')?'meals':'pizza';
  const provenance={trustClass:'official-au-manufacturer',sourceId:'mccain-au',recordId:new URL(raw.url).pathname,url:raw.url,retrievedAt:raw.retrievedAt,checkedAt:checkDate,sha256:raw.sha256,privateTestingApproved:true,publicReleaseReviewRequired:true};
  let food={id,canonicalId:previous?.canonicalId||id,sourceId:provenance.recordId,recordType:'packaged',market:'AU',country:'Australia',name:raw.name,brand:'McCain',barcode:previous?.barcode||null,pack,packageSize:pack?pack.amount+' '+pack.unit:null,manufacturerServing:serve,packageServingText:serveText,packageServingExplicit:!!serve,sourceServingEvidence:{text:serveText},physicalForm:'solid',physicalFormSource:'Official frozen solid food category and gram nutrition panel',measureEvidencePolicy:'source-and-published-standard-only',nutrients:per100,nutritionPer100:per100,nutritionPerServing:perServe,nutritionPer100Unit:'g',sourceNutritionBasis:{per100Unit:'g',state:'published product nutrition'},units:{g:.01,...(serve?.unit==='g'?{serve:serve.amount/100}:{})},unitLabels:{g:'g',...(serve?{serve:'Manufacturer serve ('+serveText+')'}:{})},defaultUnit:serve?'serve':'g',defaultAmount:serve?1:100,sourceUrl:raw.url,source:'Official Australian manufacturer nutrition',verified:true,verificationStatus:'verified',currentState:'listed-at-retrieval',loggable:per100.energyKj!=null,nutritionStatus:per100.energyKj!=null?'partial':'unavailable',sourceNutritionEvidence:raw.tables};
  S.applyToFood(food);decorate(food,cat,provenance,'McCain');const reasons=[];
  const gtinPeers=mccainInputs.filter(r=>baseName(r.name)===baseName(raw.name)&&pack&&C.metricEvidence(r.quantity)?.amount===pack.amount&&C.metricEvidence(r.quantity)?.unit===pack.unit&&require('./build_coles_catalogue').validGtin(r.barcode));
  const codes=[...new Set(gtinPeers.map(r=>r.barcode))];
  if(codes.length>1)reasons.push('ambiguous-manufacturer-gtin-link');
  if(codes.length===1){food.barcode=codes[0];food.identityEvidence={basis:'exact-manufacturer-product-name-and-pack',sourceRecord:gtinPeers[0],manufacturerUrl:raw.url};const comparison=C.canonicaliseRecords([food,O.toFood(gtinPeers[0]),...(peers.get(codes[0])||[])]);if(comparison.length!==1||!C.productEligibility(comparison[0]).addability.normalLoggingAllowed)reasons.push('incompatible-same-gtin-evidence');}
  if(!serve||serve.unit!=='g')reasons.push('unsafe-or-missing-serving');
  if(['energyKj','protein','carbs','fat'].some(k=>per100[k]==null))reasons.push('incomplete-nutrition');
  if(C.sourceConflicts(food).some(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')))reasons.push('material-source-conflict');
  if(!C.productEligibility(food).addability.normalLoggingAllowed)reasons.push('production-projection-ineligible');
  // The accepted Hash Browns GTIN/retailer alias is never reminted from a URL.
  if(/\/hashbrowns-750g\/$/.test(raw.url)){reasons.push('accepted-hash-browns-identity-retained');id='woolworths-au:98299';}
  const namePeers=baseline.filter(f=>C.brandKey(f.brand)==='mccain'&&cleanName(f.name+' '+(f.packageSize||''))===key&&f.barcode);
  if(!food.barcode&&namePeers.length)reasons.push('gtin-link-needs-explicit-evidence');
  if(previous){if(!C.productEligibility(previous).addability.normalLoggingAllowed)reasons.push('existing-source-review-hold');else if(!reasons.length){food=X.enrich(previous,food);decorate(food,cat,previous.sourceProvenance||provenance,'McCain');}}
  mDecisions.push({name:raw.name,url:raw.url,canonicalId:id,gtin:food.barcode,reasons:[...new Set(reasons)],conflicts:C.sourceConflicts(food)});seen.set(key,id);if(!reasons.length){const at=records.findIndex(f=>C.canonicalKey(f)===C.canonicalKey(food));if(at>=0){food=X.enrich(food,records[at]);records.splice(at,1);}records.push(food);}else if(food.barcode){const at=records.findIndex(f=>f.barcode===food.barcode);if(at>=0){records.splice(at,1);decisions.find(d=>d.gtin===food.barcode)?.reasons.push('manufacturer-overlap-held');}}
 }
 write('off-input.json',{source:summary,records:inputs});write('mccain-facts.json',manufacturer);
 write('audit.json',{checkedAt:checkDate,off:decisions,manufacturer:mDecisions});write('approved-products.json',{records});
 write('policy.json',{schema:1,privateTestingApproved:true,publicReleaseReviewRequired:true,publicReleaseLicensingAdmissionGate:false,approvedSha256:X.hash(fs.readFileSync(path.join(BASE,'approved-products.json'))),offInputSha256:X.hash(fs.readFileSync(path.join(BASE,'off-input.json'))),manufacturerSha256:X.hash(fs.readFileSync(path.join(BASE,'mccain-facts.json'))),sourcePrecedence:'Existing accepted canonical record retained; incompatible evidence held; no averaging',categoryPolicy:'Explicit source categories, reviewed title families, then Other Packaged Food; no category-only admission hold; unsupported food domains, nutrition and identity gates retained',noItemCap:true});
 require('./finalize_catalogue_round_two').finalize();
 console.log(JSON.stringify({offFound:decisions.length,offApproved:inputs.length,manufacturerFound:manufacturer.records.length,manufacturerApproved:mDecisions.filter(r=>!r.reasons.length).length,retailers:Object.fromEntries(['woolworths','coles','aldi'].map(id=>[id,records.filter(f=>X.membership(f,id).length).length])),manufacturerHolds:mDecisions.filter(r=>r.reasons.length).map(r=>({name:r.name,reasons:r.reasons}))},null,2));
}
if(require.main===module)prepare(process.argv[2],process.argv[3]).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={prepare,category,decorate};
