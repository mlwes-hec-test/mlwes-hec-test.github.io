'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),R=require('../retailer-catalogue'),X=require('./catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-wave-2a'),baseline=require('../data/catalogue-wave-2a/baseline.json');
async function derive(){
 const retailers={};
 for(const kind of ['coles','woolworths','aldi']){require('../'+kind+'-au-catalogue');const foods=[];for(let offset=0;;offset+=20){const page=await R.page(kind,{offset});foods.push(...page.foods);if(!page.hasMore)break;}
  const dir=R.directory(kind),byKey=new Map(foods.map(f=>[C.canonicalKey(f),f])),changes=[];
  for(const old of baseline.retailers[kind].identities){const food=byKey.get(old.key);assert(food);assert.equal(C.canLog(food),old.loggable);const after=food.browseCategoryId||food.categoryId;if(after!==old.categoryId)changes.push({canonicalKey:old.key,name:food.name,brand:food.brand,before:old.categoryId,after,evidence:food.categoryEvidence});}
  retailers[kind]={visible:foods.length,loggable:foods.filter(C.canLog).length,restricted:foods.filter(f=>!C.canLog(f)).length,categories:dir.categories,houseBrandFamilies:dir.brands.length,otherPackagedFood:dir.categories.find(c=>c.id==='other-food').count,changes};
 }
 const globalIndex=require('../brand-au-catalogue'),protectedFiles=require('../data/catalogue-wave-2a/protected-files.json');
 for(const p of protectedFiles)assert.equal(X.hash(fs.readFileSync(path.join(ROOT,p.file))),p.sha256,p.file);
 return {schemaVersion:1,generation:require('../release-manifest.json').generation,version:require('../release-manifest.json').version,retailers,global:{canonicalIdentities:globalIndex.entries.length,brands:globalIndex.brands.length,categoryChanges:require('../data/brand-au/wave-2a-report.json').changes.length},protectedFiles:{checked:protectedFiles.length,unchanged:protectedFiles.length},review:require('./catalogue-wave-2a').derive().groups};
}
if(require.main===module)derive().then(r=>{const text=JSON.stringify(r,null,2)+'\n',file=path.join(BASE,'final-report.json');if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),text);else fs.writeFileSync(file,text);console.log(JSON.stringify({generation:r.generation,retailers:Object.fromEntries(Object.entries(r.retailers).map(([k,v])=>[k,{visible:v.visible,loggable:v.loggable,restricted:v.restricted,other:v.otherPackagedFood,moved:v.changes.length}])),protected:r.protectedFiles}));}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={derive};
