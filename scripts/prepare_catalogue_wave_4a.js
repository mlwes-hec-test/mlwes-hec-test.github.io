'use strict';
// One-time read-only checkpoint audit; refuses to overwrite its captured baseline.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),O=require('../off-catalogue'),R=require('../retailer-catalogue'),X=require('./catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-wave-4a');
const git=(...a)=>cp.execFileSync('git',a,{cwd:ROOT,encoding:'utf8'}).trim();
async function snapshot(){
 assert.equal(git('rev-parse','HEAD'),'c5393ae8d9f09c5feb8a7aa72e4045c927dc9f7d');assert.equal(git('branch','--show-current'),'alpha-0.6.33');
 assert(!fs.existsSync(path.join(BASE,'baseline.json')),'Do not recapture the baseline');
 const idx=require('../brand-au-catalogue'),globalRecords=idx.files.flatMap(s=>JSON.parse(fs.readFileSync(path.join(ROOT,'data/brand-au',s.path))).records);
 const off=fs.readdirSync(path.join(ROOT,'data/open-food-facts-au/products')).sort().flatMap(file=>JSON.parse(fs.readFileSync(path.join(ROOT,'data/open-food-facts-au/products',file))).products.map(record=>({file:'data/open-food-facts-au/products/'+file,record})));
 const keys=['iga','blackandgold','communityco'],associated=off.filter(p=>keys.includes(C.brandKey(p.record.brand))),approved=globalRecords.filter(f=>keys.includes(C.brandKey(f.brand)));
 const summary=records=>({canonical:new Set(records.map(C.canonicalKey)).size,loggable:records.filter(C.canLog).length,restricted:records.filter(f=>!C.canLog(f)).length,brands:records.reduce((a,f)=>(a[C.brandKey(f.brand)]=(a[C.brandKey(f.brand)]||0)+1,a),{}),categories:records.reduce((a,f)=>(a[f.categoryId||f.category||'unknown']=(a[f.categoryId||f.category||'unknown']||0)+1,a),{})});
 const retailers={};for(const kind of ['woolworths','coles','aldi']){require('../'+kind+'-au-catalogue');const foods=[];for(let offset=0;;offset+=20){const p=await R.page(kind,{offset});foods.push(...p.foods);if(!p.hasMore)break;}const d=R.directory(kind);retailers[kind]={visible:foods.length,loggable:foods.filter(C.canLog).length,restricted:foods.filter(f=>!C.canLog(f)).length,categories:d.categories,families:d.brands,records:foods};}
 const baseline={head:git('rev-parse','HEAD'),subject:git('log','-1','--format=%s'),parent:git('rev-parse','HEAD^'),branch:git('branch','--show-current'),release:require('../release-manifest.json').generation,preflightWorkingTree:'clean before this audit script was created',globalCanonical:idx.entries.length,iga:{directory:R.directory('iga'),frozenPrimaryBrand:summary(associated.map(p=>O.toFood(p.record))),approvedGlobal:summary(approved),existingVerifiedMemberships:globalRecords.flatMap(f=>C.retailerMembership(f,'iga')),existingPrivateLabelCollections:globalRecords.flatMap(f=>C.privateLabelCollectionMembership(f,'iga')),aliases:['IGA','Supa IGA','Super IGA','IGA Local Grocer','IGA X-Press','IGA Xpress'].map(query=>({query,intent:C.queryIntent(query)}))},retailers};
 const protectedFiles=git('ls-files').split('\n').filter(f=>/^(?:data\/(?:open-food-facts-au|australian-catalogue|woolworths-au|coles-au|aldi-au)\/|deployment\/)|(?:afcd|ausnut|mcdonalds|kfc-au|hungry-jacks)/i.test(f)).map(file=>({file,sha256:X.hash(fs.readFileSync(path.join(ROOT,file)))}));
 fs.mkdirSync(BASE,{recursive:true});for(const [file,data]of Object.entries({'baseline.json':baseline,'baseline-records.json':{approved,associated},'protected-files.json':protectedFiles}))fs.writeFileSync(path.join(BASE,file),JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({iga:baseline.iga,protectedFiles:protectedFiles.length}));
}
if(require.main===module)snapshot().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={snapshot};
