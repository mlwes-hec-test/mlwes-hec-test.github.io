'use strict';
// Offline full-population audit. This writes only to a caller-supplied external
// audit directory. Passing shared eligibility is not production approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),readline=require('node:readline'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),O=require('../off-catalogue'),S=require('../search-foundation'),{validGtin}=require('./build_coles_catalogue');
const ROOT=path.resolve(__dirname,'..'),PIN='f72687ee8bc6522054fe69dbfda6b91902c16af1ec2e043cde27bc6c29ad8176';
const list=v=>String(v||'').split(',').map(s=>s.trim()).filter(Boolean);
const number=v=>v==null||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const bytes=v=>JSON.stringify(stable(v))+'\n';
const N={energyKj:'energy-kj',calories:'energy-kcal',protein:'proteins',carbs:'carbohydrates',sugars:'sugars',fat:'fat',saturatedFat:'saturated-fat',fibre:'fiber',sodium:'sodium',salt:'salt'};
const categories=require('../data/woolworths-au/source-policy.json').categories;
const restaurantKeys=new Set(require('../entity-registry').entries.filter(e=>e.type==='restaurant').flatMap(e=>[e.name,...(e.aliases||[])]).map(C.brandKey));
const RULES=[['frozen-potato',/^(frozen-potato.*|hash-browns)$/],['frozen-vegetables',/^frozen-vegetables/],['yoghurt',/^(.*-)?yog[uh]?urts?$/],['cheese',/^(.*-)?cheeses?$/],['biscuits',/^(.*-)?(biscuits|crackers|cookies|wafers)$/],['bread',/^(.*-)?(breads|bread-rolls|bagels|wraps)$/],['cereal',/^(.*-)?(breakfast-cereals|mueslis|granolas|porridges)$/],['desserts',/^(.*-)?(ice-creams|desserts|puddings|cakes|pastries|muffins)$/],['snacks',/^(.*-)?(chocolates|chocolate-bars|candies|confectioneries|crisps)$/],['milk',/^(.*-)?(milks|milk-substitutes|plant-milks)$/],['sauces',/^(.*-)?(sauces|condiments|dressings|tomato-pastes)$/],['spreads',/^(.*-)?(spreads|margarines|butters)$/],['canned',/^(canned-.*|baked-beans)$/],['grains',/^(.*-)?(rices|pastas|noodles|grains)$/],['protein',/^(.*-)?(meats|poultries|chickens|beef|pork|sausages|seafoods|fishes|eggs|tofus|legumes)$/],['drinks',/^(beverages|non-alcoholic-beverages|.*juices|teas|coffees|waters|carbonated-drinks)$/],['produce',/^(.*-)?(vegetables|fruits|prepared-salads|coleslaws)$/],['snacks',/^(.*-)?(snacks|nuts)$/]];
function category(f){const tags=list(f.categories_tags).map(t=>t.replace(/^en:/,''));
  if(tags.some(t=>/^(alcoholic-beverages|beers|wines|spirits|liqueurs|pet-food|pet-foods|food-supplements|dietary-supplements|medications|tobacco|non-food-products|baby-formulas|infant-formulas)$/.test(t)))return {id:null,reason:'unsupported-domain'};
  if(tags.some(t=>/sandwiches|restaurant-meals|fast-food/.test(t)))return {id:null,reason:'unsupported-prepared-food-category'};
  // A category's ingredient suffix is not the product family: e.g. a pizza
  // "with-ham-and-cheese" and tomato sauce "with-cheese" are not cheese.
  const familyTags=tags.filter(t=>!/(?:-with-|-and-cheese$)/.test(t));
  if(tags.some(t=>/^(pizzas|quiches|frozen-pizzas|frozen-pizzas-and-pies)$/.test(t)))return {id:null,reason:'unsupported-prepared-food-category'};
  const match=RULES.find(([,rx])=>familyTags.some(t=>rx.test(t)));return {id:match?.[0]||null,reason:match?null:'category-unresolved'};
}
function brandTokens(f){return [...new Map(list(f.brands).map(name=>[C.brandKey(name),{key:C.brandKey(name),name}])).values()];}
function brandNoise(name){return !name||/^(unknown|not known|none|n a|na|no brand|unbranded|brand|test|testing|food|foods|organic|australian made|homemade|home made|various|generic)$/i.test(C.norm(name))||name.length>100||/https?:|@|\d{8,}|[<>={}]/.test(name)||!/[\p{L}]/u.test(name);}
function reviewHolds(f,cat){
  const reasons=[],name=C.norm(f.product_name),tokens=brandTokens(f);
  if(tokens.some(b=>b.key==='b'))reasons.push('ambiguous-brand-initial');
  if(tokens.some(b=>b.key==='oluflorentzenas'))reasons.push('unresolved-source-brand-role');
  const metricAmounts=[...String(f.serving_size||'').matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/ig)].map(m=>C.metricEvidence(m[1].replace(',','.')+' '+m[2]));
  if(new Set(metricAmounts.map(m=>m.unit+':'+m.amount)).size>1)reasons.push('contradictory-serving-text');
  if(cat.id==='cheese'&&/\b(?:salsa|sauce|macaroni|pasta|crackers?|breadsticks?|chorizo|salami)\b/.test(name))reasons.push('composite-product-category-unresolved');
  if(cat.id==='milk'&&/\b(?:thickened cream|whipping cream|ice cream|coconut cream)\b/.test(name))reasons.push('name-category-contradiction');
  return reasons;
}
function inputFrom(f){const nutrients=Object.fromEntries(Object.entries(N).map(([k,v])=>[k,number(f[v+'_100g'])]).filter(([,v])=>v!==null));return {id:'off:'+f.code,sourceId:'off:'+f.code,barcode:f.code,name:f.product_name||'',genericName:f.generic_name||'',brand:f.brands||'',brandKey:C.brandKey(f.brands),quantity:f.quantity||'',servingSize:f.serving_size||'',servingQuantity:number(f.serving_quantity),countries:list(f.countries_tags),categories:list(f.categories_en||f.categories),nutritionBasis:'per-100g-off-csv',nutrients,nutritionCompleteness:nutrients.calories!=null||nutrients.energyKj!=null?'complete':Object.keys(nutrients).length?'partial':'identity-only',lastModified:f.last_modified_datetime||f.last_modified_t||'',source:'Open Food Facts',sourceScope:'Australia',sourceUrl:f.url||'',provenanceClass:'australian-external-catalogue',recordType:'external-catalogue',market:'AU'};}
function retailerRecords(){const map=new Map();for(const folder of ['woolworths-au','coles-au','aldi-au'])for(const name of fs.readdirSync(path.join(ROOT,'data',folder,'products')).sort())for(const f of JSON.parse(fs.readFileSync(path.join(ROOT,'data',folder,'products',name))).records||[]){if(!f.barcode)continue;const group=map.get(f.barcode)||[];group.push(f);map.set(f.barcode,group);}return map;}
async function audit(directory){
  const out=path.resolve(directory);assert(out!==ROOT&&!out.startsWith(ROOT+path.sep),'Output must stay outside source');
  const extraction=JSON.parse(fs.readFileSync(path.join(out,'extraction-summary.json')));assert.equal(extraction.rawSha256,PIN);assert.equal(extraction.projectionMismatches.length,0);
  const file=path.join(out,'au-records.jsonl');assert.equal(hash(fs.readFileSync(file)),extraction.extractionSha256);
  const retailers=retailerRecords(),rows=[],brands=new Map(),status={},exclusions={},holds=new Map(require('../data/aldi-au/source-policy.json').reviews.filter(r=>r.excludeReason).map(r=>[r.code,r.excludeReason]));
  let unknownChecks=0;
  const stream=readline.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity});
  for await(const line of stream){const raw=JSON.parse(line),f=raw.fields,input=inputFrom(f),food=O.toFood(input),base=C.productEligibility(food),tokens=brandTokens(f),cat=category(f),reasons=[];assert(input.countries.includes('en:australia'));
    food.nutritionPer100={...food.sourceNutrients};
    // CSV supplies no per-serving nutrient columns in this frozen export;
    // if a future pinned input does, check them without replacing missing values.
    food.nutritionPerServing=Object.fromEntries(Object.entries(N).map(([k,v])=>[({sugars:'sugar',saturatedFat:'satFat'})[k]||k,number(f[v+'_serving'])]).filter(([,v])=>v!==null));
    if(food.nutritionPerServing.sodium!=null)food.nutritionPerServing.sodium*=1000;
    const conflicts=C.sourceConflicts(food),collisionTags=list(f.categories_tags).filter(t=>/different-products.*same.barcode|barcode.*collision|barcode-gilt/i.test(t));
    if(collisionTags.length)reasons.push('explicit-barcode-collision');
    if(holds.has(f.code))reasons.push('prior-individual-review-hold');
    if(!validGtin(f.code))reasons.push('invalid-gtin');
    if(!tokens.length)reasons.push('missing-brand');else if(tokens.some(b=>brandNoise(b.name)))reasons.push('brand-noise');
    if(tokens.some(b=>restaurantKeys.has(b.key)))reasons.push('restaurant-domain');
    if(!C.productIdentityQuality(food).exactEligible)reasons.push('identity-incomplete');
    if(base.addability.status!=='loggable-now')reasons.push(base.addability.status);
    if(conflicts.some(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')))reasons.push('material-source-conflict');
    if(food.nutritionIntegrity.status==='suspect')reasons.push('nutrition-conflict');
    if(['protein','carbs','fat'].some(k=>input.nutrients[k]==null))reasons.push('missing-required-macros');
    if(food.nutritionIntegrity.energy?.relativeDifference>.05)reasons.push('energy-disagreement-over-five-percent');
    if(list(f.data_quality_errors_tags).length)reasons.push('off-quality-errors');
    if(food.quarantinedMeasures?.some(m=>m.rejectionReason==='source-serving-unit-conflicts-with-nutrition-basis'))reasons.push('serving-basis-conflict');
    if(Object.values(input.nutrients).some(v=>v<0))reasons.push('negative-nutrition');
    if(['protein','fat','carbs'].some(k=>input.nutrients[k]>100.2)||['protein','fat','carbs'].reduce((n,k)=>n+(input.nutrients[k]||0),0)>103)reasons.push('incoherent-nutrient-mass');
    if(!cat.id)reasons.push(cat.reason);
    const pack=C.metricEvidence(f.quantity),serve=C.metricEvidence(f.serving_size),multi=f.product_name?.match(/\b(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i),titlePack=multi?{...C.metricEvidence(multi[2]+' '+multi[3]),amount:Number(multi[1])*C.metricEvidence(multi[2]+' '+multi[3]).amount}:C.metricEvidence(f.product_name);
    if(pack&&serve&&pack.unit!==serve.unit)reasons.push('pack-serving-unit-conflict');
    if(food.physicalForm==='liquid'&&pack?.unit==='g')reasons.push('physical-form-pack-conflict');
    if(food.physicalForm==='liquid'&&pack?.unit!=='mL'&&serve?.unit!=='mL')reasons.push('liquid-basis-not-corroborated');
    if(food.physicalForm!=='liquid'&&food.physicalForm!=='unknown'&&pack?.unit==='mL')reasons.push('physical-form-pack-conflict');
    if(titlePack&&pack&&(titlePack.unit!==pack.unit||titlePack.amount!==pack.amount))reasons.push('name-pack-conflict');
    if(f.obsolete==='1')reasons.push('obsolete-source-record');
    if(/prepared|reconstituted/i.test(f.nutrition_data_per||''))reasons.push('prepared-basis-review');
    const peers=retailers.get(f.code)||[],merged=peers.length?C.canonicaliseRecords([food,...peers])[0]:null;
    const overlapConflicts=merged?C.sourceConflicts(merged).filter(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')):[];
    if(overlapConflicts.length)reasons.push('incompatible-retailer-gtin-overlap');
    const concept=S.foodConceptEvidence(food).conceptId,conceptIds=concept&&concept!=='unknown'?[concept]:[];
    const expectedConcept={bread:'bread',milk:'milk',yoghurt:'yoghurt',cheese:'cheese',cereal:'cereal'}[cat.id];
    const titleConcept=S.foodConceptEvidence({name:f.product_name}).conceptId;
    if(expectedConcept&&['bread','milk','yoghurt','cheese','cereal'].includes(titleConcept)&&titleConcept!==expectedConcept)reasons.push('name-category-contradiction');
    reasons.push(...reviewHolds(f,cat));
    const r={code:f.code,name:f.product_name,brands:f.brands,brandsTags:list(f.brands_tags),brandTokens:tokens.map(b=>b.key),rawRecordNumber:raw.rawRecordNumber,categoryId:cat.id,conceptIds,baseStatus:base.addability.status,validGtin:validGtin(f.code),reasons:[...new Set(reasons)],retailerOverlap:peers.length>0,overlapConflicts:overlapConflicts.map(c=>({code:c.code,fields:c.fields})),sourceConflicts:conflicts,collisionTags,nutritionStatus:food.nutritionIntegrity.status,pack:f.quantity,serving:f.serving_size};
    rows.push(r);status[r.baseStatus]=(status[r.baseStatus]||0)+1;for(const reason of r.reasons)exclusions[reason]=(exclusions[reason]||0)+1;
    for(const b of tokens){const group=brands.get(b.key)||{key:b.key,names:new Set(),all:[],potential:[],clean:[]};group.names.add(b.name);group.all.push(r.code);if(r.baseStatus==='loggable-now'&&r.validGtin)group.potential.push(r.code);if(!r.reasons.length)group.clean.push(r.code);brands.set(b.key,group);}
    for(const [key,col] of Object.entries(N))if(number(f[col+'_100g'])===null){assert(!(key in input.nutrients));unknownChecks++;}
    O.loadedFoods.clear();
    if(rows.length%10000===0)console.log(JSON.stringify({audited:rows.length,clean:rows.filter(r=>!r.reasons.length).length}));
  }
  const priority=new Set(['kelloggs','mccain','campbells','pmu','nescafé','nescafe'].map(C.brandKey));
  const frequencies=[...brands.values()].map(b=>{const clean=[...new Set(b.clean)].length;return {key:b.key,names:[...b.names].sort(),all:[...new Set(b.all)].length,potential:[...new Set(b.potential)].length,clean,tier:clean>=5?'A':clean>=2?'B':clean===1&&priority.has(b.key)?'priority-singleton':null};}).sort((a,b)=>b.clean-a.clean||a.key.localeCompare(b.key));
  const tiers=new Set(frequencies.filter(b=>b.tier).map(b=>b.key));
  for(const r of rows)r.provisionalWaveCandidate=!r.reasons.length&&r.brandTokens.some(b=>tiers.has(b));
  const count=fn=>rows.filter(fn).length,candidates=rows.filter(r=>r.provisionalWaveCandidate);
  const summary={productionApproved:false,rawSha256:PIN,extractionSha256:extraction.extractionSha256,australianRecords:rows.length,distinctBarcodes:new Set(rows.map(r=>r.code)).size,validGtins:new Set(rows.filter(r=>r.validGtin).map(r=>r.code)).size,withBrand:count(r=>r.brandTokens.length),distinctBrandTokens:brands.size,sharedEligibility:status,initiallyLoggable:count(r=>r.baseStatus==='loggable-now'),cleanBeforeTier:count(r=>!r.reasons.length),provisionalTierA:frequencies.filter(b=>b.tier==='A').length,provisionalTierB:frequencies.filter(b=>b.tier==='B').length,provisionalPrioritySingletons:frequencies.filter(b=>b.tier==='priority-singleton').length,provisionalProducts:candidates.length,provisionalBrands:tiers.size,newCanonicalIdentitiesOverExistingOFF:0,retailerOverlaps:count(r=>r.retailerOverlap),compatibleRetailerOverlaps:count(r=>r.retailerOverlap&&!r.overlapConflicts.length),incompatibleRetailerOverlaps:count(r=>r.overlapConflicts.length),candidateRetailerOverlaps:candidates.filter(r=>r.retailerOverlap).length,exclusionReasons:exclusions,unknownNutrientAssertions:unknownChecks,categories:categories.map(c=>({...c,count:candidates.filter(r=>r.categoryId===c.id).length})).filter(c=>c.count),priorities:[...priority].map(key=>({key,frequency:frequencies.find(b=>b.key===key)||null,records:rows.filter(r=>r.brandTokens.includes(key))})),topBrands:frequencies.slice(0,40)};
  for(const [name,value] of Object.entries({'audit-summary.json':summary,'brand-frequencies.json':frequencies,'audit-records.json':rows})){fs.writeFileSync(path.join(out,name),bytes(value));}
  console.log(JSON.stringify({...summary,priorities:summary.priorities.map(p=>({key:p.key,frequency:p.frequency})),topBrands:summary.topBrands.slice(0,15)},null,2));return summary;
}
if(require.main===module)audit(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={audit,inputFrom,brandTokens,brandNoise,category,reviewHolds,stable,bytes,hash};
