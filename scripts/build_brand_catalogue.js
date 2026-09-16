'use strict';
// Deterministic, offline projection of the audited frozen OFF Australian pool.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),readline=require('node:readline');
const A=require('./audit_brand_wave'),C=require('../food-catalogue'),O=require('../off-catalogue'),{validGtin}=require('./build_coles_catalogue');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/brand-au');
const read=name=>JSON.parse(fs.readFileSync(path.join(BASE,name),'utf8'));
const write=(name,data)=>{const file=path.join(BASE,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,A.bytes(data));};
function peers(){const map=new Map();for(const folder of ['woolworths-au','coles-au','aldi-au'])for(const name of fs.readdirSync(path.join(ROOT,'data',folder,'products')).sort())for(const f of JSON.parse(fs.readFileSync(path.join(ROOT,'data',folder,'products',name))).records||[]){if(!f.barcode)continue;const group=map.get(f.barcode)||[];group.push(f);map.set(f.barcode,group);}return map;}
async function prepare(directory,{check=false}={}){
  const raw=fs.readFileSync(path.join(directory,'audit-records.json')),audit=JSON.parse(raw),summary=JSON.parse(fs.readFileSync(path.join(directory,'audit-summary.json'))),wanted=new Map(audit.filter(r=>!r.reasons.length).map(r=>[r.code,r]));
  const inputs=[];
  for await(const line of readline.createInterface({input:fs.createReadStream(path.join(directory,'au-records.jsonl')),crlfDelay:Infinity})){
    const {fields,rawRecordNumber}=JSON.parse(line),r=wanted.get(fields.code);if(!r)continue;
    assert.equal(r.rawRecordNumber,rawRecordNumber);
    const record=A.inputFrom(fields);inputs.push({record,sourceBrands:fields.brands,sourceBrandTags:String(fields.brands_tags||'').split(',').filter(Boolean),sourceCategoryTags:fields.categories_tags,rawRecordNumber,categoryId:r.categoryId,conceptIds:r.conceptIds});
  }
  inputs.sort((a,b)=>a.record.barcode.localeCompare(b.record.barcode,'en'));assert.equal(inputs.length,summary.cleanBeforeTier);
  const input={schema:1,source:'Open Food Facts contributors',records:inputs},pin={schema:1,rawSha256:summary.rawSha256,extractionSha256:summary.extractionSha256,auditRecordsSha256:A.hash(raw),auditScriptSha256:A.hash(fs.readFileSync(path.join(__dirname,'audit_brand_wave.js'))),sourceSnapshotDate:'2026-08-30',reviewInputSha256:A.hash(A.bytes(input)),tiers:{A:5,B:2,prioritySingletons:['kelloggs','mccain','campbells','pmu','nescafe']},licence:{attribution:'Open Food Facts contributors',database:'ODbL 1.0',contents:'DbCL 1.0',databaseUrl:'https://opendatacommons.org/licenses/odbl/1-0/',contentsUrl:'https://opendatacommons.org/licenses/dbcl/1-0/'}};
  for(const [file,data] of Object.entries({'review-input.json':input,'source-policy.json':pin,'population-audit.json':summary}))if(check)assert.equal(fs.readFileSync(path.join(BASE,file),'utf8'),A.bytes(data),file+' differs from external full audit');else write(file,data);
}
function derive(){
  const policy=read('source-policy.json'),raw=fs.readFileSync(path.join(BASE,'review-input.json'));assert.equal(A.hash(raw),policy.reviewInputSha256);assert.equal(A.hash(fs.readFileSync(path.join(__dirname,'audit_brand_wave.js'))),policy.auditScriptSha256);
  const existing=peers(),rows=JSON.parse(raw).records.map(item=>{
    const record=item.record;assert(validGtin(record.barcode));assert(record.countries.includes('en:australia'));assert.equal(record.brand,item.sourceBrands);
    const food=O.toFood(record),eligibility=C.productEligibility(food);assert.equal(eligibility.addability.status,'loggable-now');assert.equal(food.nutritionIntegrity.status,'usable');assert(['protein','carbs','fat'].every(k=>record.nutrients[k]!=null));
    food.sourceBrands=item.sourceBrands;food.sourceBrandTags=item.sourceBrandTags;food.sourceBrandTokens=A.brandTokens({brands:item.sourceBrands});
    // Preserve the established OFF primary display brand/canonical comparison;
    // retain the entire recovered source field separately, without role inference.
    food.brand=item.sourceBrands.split(',')[0].trim();
    food.categoryId=item.categoryId;food.category=require('../data/woolworths-au/source-policy.json').categories.find(c=>c.id===item.categoryId).label;
    const sourceTags=String(item.sourceCategoryTags||'').split(',');
    const conceptCategories={bread:['bread'],milk:['milk'],yoghurt:['yoghurt'],cheese:['cheese'],cereal:['cereal'],cracker:['biscuits'],spread:['spreads'],margarine:['spreads'],rice:['grains'],chicken:['protein'],egg:['protein'],'hash-brown':['frozen-potato']};
    const conceptIds=item.conceptIds.filter(id=>!conceptCategories[id]||conceptCategories[id].includes(item.categoryId));
    food.conceptIds=[...new Set([...conceptIds,...(sourceTags.some(t=>/^en:(?:.*-)?soups$/.test(t))?['soup']:[]),...(sourceTags.includes('en:coffees')?['coffee']:[]),...(item.categoryId==='frozen-potato'?['potato']:[])])];food.sourceCategoryTags=item.sourceCategoryTags;
    food.sourceProvenance={trustClass:'open-food-facts-au',sourceId:'open-food-facts-au',recordId:record.id,url:record.sourceUrl,snapshotSha256:policy.rawSha256,sha256:policy.reviewInputSha256,snapshotDate:policy.sourceSnapshotDate,rawRecordNumber:item.rawRecordNumber,lastModified:record.lastModified};
    food.sourceAttribution=policy.licence;food.currentState='unknown';food.browseEligible=true;
    food.brandAdmission={status:'audited-first-wave',evidenceSha256:policy.reviewInputSha256};
    food.packIdentity={text:record.quantity||null};food.sourceServing={text:record.servingSize||null,quantity:record.servingQuantity??null};
    const overlap=existing.get(food.barcode)||[],merged=overlap.length?C.canonicaliseRecords([food,...overlap])[0]:food;
    const finalEligibility=C.productEligibility(merged);
    const productionHold=finalEligibility.addability.status==='loggable-now'?null:finalEligibility.addability.reasonCode||finalEligibility.addability.status;
    // Membership enrichment cannot change the reviewed source product fields.
    for(const key of ['retailerMemberships','privateLabelCollections','commercialIdentities','canonicalEvidence','mergedRecordIds'])if(merged[key])food[key]=merged[key];
    assert(!C.sourceConflicts(merged).some(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')));
    O.loadedFoods.clear();return {item,food,overlap:overlap.length>0,productionHold};
  });
  const brands=new Map();for(const {food} of rows.filter(r=>!r.productionHold))for(const token of food.sourceBrandTokens){const entry=brands.get(token.key)||{key:token.key,names:new Map(),codes:new Set()};entry.names.set(token.name,(entry.names.get(token.name)||0)+1);entry.codes.add(food.barcode);brands.set(token.key,entry);}
  const selected=[...brands.values()].map(b=>({key:b.key,name:[...b.names].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'en'))[0][0],aliases:[...b.names.keys()].sort(),count:b.codes.size,tier:b.codes.size>=policy.tiers.A?'A':b.codes.size>=policy.tiers.B?'B':policy.tiers.prioritySingletons.includes(b.key)?'priority-singleton':null})).filter(b=>b.tier).sort((a,b)=>a.key.localeCompare(b.key,'en'));
  const allowed=new Set(selected.map(b=>b.key)),approved=rows.filter(r=>!r.productionHold&&r.food.sourceBrandTokens.some(b=>allowed.has(b.key)));
  return {policy,rows,brands:selected,approved};
}
function outputs(){
  const {policy,rows,brands,approved}=derive(),files=[],entries=[],out={};
  for(let i=0;i<approved.length;i+=20){const relative='products/'+String(i/20).padStart(3,'0')+'.json',records=approved.slice(i,i+20).map(r=>r.food),raw=A.bytes({licence:policy.licence,records});out[relative]=raw;files.push({path:relative,sha256:A.hash(raw),records:records.length});for(const food of records)entries.push({id:food.id,barcode:food.barcode,name:food.name,brand:food.brand,sourceBrands:food.sourceBrands,brandKeys:food.sourceBrandTokens.map(b=>b.key),categoryId:food.categoryId,conceptIds:food.conceptIds,pack:food.packageSize,shard:relative});}
  const categories=require('../data/woolworths-au/source-policy.json').categories.filter(c=>entries.some(e=>e.categoryId===c.id)),index={schema:1,brands,categories,entries,files,base:'./data/brand-au/',source:policy,notice:'Private testing · Audited Australian records from Open Food Facts contributors. Community evidence; current availability is unknown. No brand or retailer endorsement.'};
  out['../../brand-au-catalogue.js']='/* Generated by scripts/build_brand_catalogue.js. Open Food Facts contributors; ODbL/DbCL. */\n(function(g){const index='+JSON.stringify(index)+';if(typeof module!=="undefined"&&module.exports)module.exports=index;g.HECBrandCatalogueIndex=index;})(typeof window!=="undefined"?window:globalThis);\n';
  const report={products:approved.length,brands:brands.length,tierA:brands.filter(b=>b.tier==='A').length,tierB:brands.filter(b=>b.tier==='B').length,prioritySingletons:brands.filter(b=>b.tier==='priority-singleton').length,cleanPool:rows.length,deferredSingletonProducts:rows.filter(r=>!r.productionHold).length-approved.length,projectionHolds:rows.filter(r=>r.productionHold).map(r=>({id:r.food.id,reason:r.productionHold})),retailerCanonicalReuse:approved.filter(r=>r.overlap).length,newCanonicalIdentities:0,existingOFFIdentitiesEnriched:approved.length,categories:categories.map(c=>({...c,count:entries.filter(e=>e.categoryId===c.id).length})),brandFrequencies:brands.slice().sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key,'en')),policy,files};
  out['build-report.json']=A.bytes(report);return out;
}
function build({check=false}={}){const out=outputs();for(const [file,raw] of Object.entries(out)){const target=path.resolve(BASE,file);if(check)assert.equal(fs.readFileSync(target,'utf8'),raw,'Stale brand output: '+file);else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,raw);}}return JSON.parse(out['build-report.json']);}
if(require.main===module)(async()=>{const at=process.argv.indexOf('--prepare');if(at>=0)await prepare(process.argv[at+1],{check:process.argv.includes('--check')});const r=build({check:process.argv.includes('--check')});console.log(JSON.stringify({products:r.products,brands:r.brands,tierA:r.tierA,tierB:r.tierB,overlap:r.retailerCanonicalReuse,newCanonical:r.newCanonicalIdentities}));})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={prepare,derive,outputs,build};
