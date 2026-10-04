'use strict';
// One-time checkpoint capture. Never recapture after changing catalogue inputs.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),R=require('../retailer-catalogue'),X=require('./catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-wave-3a');
const git=(...args)=>cp.execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
async function snapshot(){
 assert.equal(git('rev-parse','HEAD'),'428603dabd96ea9ebde3ee85ba11d82a97ed83fd');
 assert.equal(git('branch','--show-current'),'alpha-0.6.33');
 assert(!fs.existsSync(path.join(BASE,'baseline.json')),'Baseline already captured');
 const globalIndex=require('../brand-au-catalogue'),globalKeys=new Set(globalIndex.entries.map(C.canonicalKey)),retailers={},records={};
 for(const kind of ['coles','woolworths','aldi']){
  const index=require('../'+kind+'-au-catalogue').index,raw=index.files.flatMap(s=>JSON.parse(fs.readFileSync(path.join(ROOT,'data/'+kind+'-au',s.path))).records),visible=[];
  for(let offset=0;;offset+=20){const p=await R.page(kind,{offset});visible.push(...p.foods);if(!p.hasMore)break;}
  const keys=new Set(visible.map(C.canonicalKey)),families=new Set(index.retailer.houseBrandFamilies.map(f=>f.key)),own=C.canonicaliseRecords(raw).filter(f=>families.has(C.brandKey(f.brand))),excluded=own.filter(f=>!keys.has(C.canonicalKey(f))),dir=R.directory(kind);
  retailers[kind]={visible:visible.length,loggable:visible.filter(C.canLog).length,restricted:visible.filter(f=>!C.canLog(f)).length,retainedCanonical:new Set(raw.map(C.canonicalKey)).size,retainedHouseBrandCanonical:own.length,independentEvidenceIdentities:new Set(raw.map(C.canonicalKey)).size-own.length,houseBrandCanonicalGlobalOverlap:own.filter(f=>globalKeys.has(C.canonicalKey(f))).length,categories:dir.categories,brands:dir.brands,excluded:excluded.map(f=>({key:C.canonicalKey(f),name:f.name,brand:f.brand,status:C.productEligibility(f).addability,quarantined:f.quarantinedMeasures,conflicts:C.sourceConflicts(f)})),identities:visible.map(f=>({key:C.canonicalKey(f),name:f.name,brand:f.brand,categoryId:f.browseCategoryId||f.categoryId,loggable:C.canLog(f)}))};
  records[kind]={excluded,other:visible.filter(f=>(f.browseCategoryId||f.categoryId)==='other-food')};
 }
 const protectedFiles=git('ls-files').split('\n').filter(f=>/^(?:data\/open-food-facts-au\/|data\/australian-catalogue\/|deployment\/)|(?:afcd|ausnut|mcdonalds|kfc-au|hungry-jacks)/i.test(f)).map(file=>({file,sha256:X.hash(fs.readFileSync(path.join(ROOT,file)))}));
 fs.mkdirSync(BASE,{recursive:true});
 for(const [file,data]of Object.entries({'baseline.json':{startingHead:git('rev-parse','HEAD'),subject:git('log','-1','--format=%s'),branch:git('branch','--show-current'),release:require('../release-manifest.json').generation,globalCanonical:globalIndex.entries.length,globalBrands:globalIndex.brands.length,retailers},'baseline-records.json':records,'protected-files.json':protectedFiles}))fs.writeFileSync(path.join(BASE,file),JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({retailers:Object.fromEntries(Object.entries(retailers).map(([k,v])=>[k,{visible:v.visible,loggable:v.loggable,restricted:v.restricted,excluded:v.excluded.length}])),protectedFiles:protectedFiles.length}));
}
if(require.main===module)snapshot().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={snapshot};
