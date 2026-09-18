'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),C=require('../food-catalogue'),R=require('../retailer-catalogue'),B=require('../brand-au-catalogue'),X=require('./catalogue-round-two'),S=require('./food-category-semantics');
const BASE=path.join(__dirname,'../data/catalogue-semantics-repair'),before=require('../data/catalogue-semantics-repair/baseline.json'),audit=require('../data/catalogue-round-three/family-audit-after.json');
async function run(){
 const summary={generation:require('../release-manifest.json').generation,retailers:{},categoryAudit:[],ambiguous:[],screenedCompoundControls:[],allFoods:[],retainedIdentityCounts:{}},canonical=[];
 for(const id of ['aldi','woolworths','coles']){
  const index=require('../'+id+'-au-catalogue').index,foods=[];for(let offset=0;;offset+=20){const p=await R.page(id,{offset});foods.push(...p.foods);if(!p.hasMore)break;}
  const raw=index.files.flatMap(s=>require('../data/'+id+'-au/'+s.path).records),oldKeys=new Map();
  // Starting ordinary browse admitted canonical groups using any accepted listing,
  // store association or private-label collection evidence, including restricted WW.
  for(const e of before.retailers[id].entries)if(e.browseEligible!==false&&!oldKeys.has(e.key))oldKeys.set(e.key,e);
  const rawByKey=new Map(C.canonicaliseRecords(raw).map(f=>[C.canonicalKey(f),f]));
  const previous=[...rawByKey.values()].filter(f=>f.browseEligible!==false&&X.membership(f,id).length);
  assert.equal(previous.length,before.retailers[id].visible);
  const visible=new Set(foods.map(C.canonicalKey)),excluded=previous.filter(f=>!visible.has(C.canonicalKey(f))).map(f=>{const family=audit.rows.find(r=>r.retailer===id&&r.key===C.brandKey(f.brand));return {key:C.canonicalKey(f),brand:f.brand,name:f.name,reason:family?.status==='legacy'?'explicit-legacy':'no-verified-house-brand-relationship'};});
  summary.retailers[id]={before:before.retailers[id].visible,after:foods.length,ordinary:foods.filter(f=>C.productEligibility(f).addability.normalLoggingAllowed).length,restricted:foods.filter(f=>!C.productEligibility(f).addability.normalLoggingAllowed).length,brands:R.directory(id).brands,excluded};
  const baseline=new Map(before.retailers[id].records.map(f=>[f.id,f]));
  for(const f of foods){const old=baseline.get(f.id),semantic=S.classify(f),row={retailer:id,id:f.id,key:C.canonicalKey(f),name:f.name,brand:f.brand,before:old?.categoryId||X.membership(f,id)[0]?.categoryIds?.[0]||null,after:f.categoryId||X.membership(f,id)[0]?.categoryIds?.[0]||null,sourceCategoryTags:f.sourceCategoryTags||null,sourceCategories:f.categories||[],rule:semantic?.rule||null};summary.allFoods.push(row);
   if(semantic&&(row.before!==row.after||JSON.stringify(old?.conceptIds||[])!==JSON.stringify(f.conceptIds||[])))summary.categoryAudit.push({...row,categoryChanged:row.before!==row.after,beforeConcepts:old?.conceptIds||[],afterConcepts:f.conceptIds||[]});
   if(!semantic&&/\b(?:cakes?|pies?|buns?|cream|salad)\b/i.test(f.name)&&f.categoryId!=='other-food'&&!/\b(?:pillows|cookie pie|cake mix)\b/i.test(f.name))summary.screenedCompoundControls.push(row);
   if(!semantic&&(/\b(?:pancakes?|potato cakes?|fish cakes?|pillows|cookie pie|cake mix|croquettes?)\b/i.test(f.name)||f.categoryId==='other-food'))summary.ambiguous.push({...row,reason:f.categoryId==='other-food'?'Neutral category retained; specific product family needs review':'Compound/flavour or preparation evidence needs individual review; no automatic reassignment'});
  }
  canonical.push(...rawByKey.values());
 }
 const brands=B.files.flatMap(s=>require('../data/brand-au/'+s.path).records);canonical.push(...brands);
 const ordinary=new Set(canonical.filter(f=>f.browseEligible!==false&&C.productEligibility(f).addability.normalLoggingAllowed).map(C.canonicalKey));
 const universe=new Set([...canonical,...require('../data/catalogue-round-two/baseline-products.json').records,...require('../data/catalogue-round-two/approved-products.json').records].map(C.canonicalKey));for(const shard of require('../data/open-food-facts-au/manifest.json').productShards)for(const f of require('../data/open-food-facts-au/'+shard.path).products)universe.add(C.canonicalKey(f));
 summary.retainedIdentityCounts={brandBrowse:B.entries.length,brandDirectory:B.brands.length,ordinary:ordinary.size,packagedUniverse:universe.size};assert.deepEqual(summary.retainedIdentityCounts,{brandBrowse:7489,brandDirectory:2736,ordinary:7511,packagedUniverse:73393});
 summary.exclusions=Object.values(summary.retailers).flatMap(r=>r.excluded).reduce((s,e)=>(s.total++,s[e.reason]=(s[e.reason]||0)+1,s),{total:0});
 summary.categoryCorrections=new Set(summary.categoryAudit.filter(r=>r.categoryChanged).map(r=>r.key)).size;
 summary.ambiguousStandaloneFoods=brands.filter(f=>/^(?:rice cakes?|potato cakes?|fish cakes?)$|\bpancakes?\b/i.test(f.name)&&!S.classify(f)).map(f=>({id:f.id,name:f.name,brand:f.brand,categoryId:f.categoryId,reason:'Food form/recipe context insufficient for high-confidence reassignment'}));
 fs.writeFileSync(path.join(BASE,'audit.json'),JSON.stringify(summary,null,2)+'\n');return summary;
}
if(require.main===module)run().then(r=>console.log(JSON.stringify({counts:r.retainedIdentityCounts,exclusions:r.exclusions,categoryCorrections:r.categoryCorrections,categoryCandidatesLeft:r.ambiguous.length}))).catch(e=>{console.error(e);process.exitCode=1;});module.exports={run};
