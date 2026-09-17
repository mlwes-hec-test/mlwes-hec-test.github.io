'use strict';
// Round-two is an additive, deterministic projection of retained factual evidence.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../food-catalogue');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-round-two');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=v=>JSON.stringify(v)+'\n';
const read=n=>JSON.parse(fs.readFileSync(path.join(BASE,n),'utf8').replace(/^\uFEFF/,''));
const extraCategories=[{id:'meals',label:'Prepared Meals',scope:'food'},{id:'pizza',label:'Pizza & Savoury Snacks',scope:'food'},{id:'other-food',label:'Other Packaged Food',scope:'food'}];
function membership(f,id){return [...C.retailerMembership(f,id),...C.sourceDeclaredRetailerMembership(f,id),...C.privateLabelCollectionMembership(f,id)];}
function enrich(base,addition){
  const f=structuredClone(base);
  for(const key of ['retailerMemberships','privateLabelCollections'])f[key]=[...new Map([...(base[key]||[]),...(addition[key]||[])].map(v=>[JSON.stringify(v),v])).values()];
  f.privateTestingApproved=true;f.publicReleaseReviewRequired=true;
  f.roundTwoProvenance=addition.sourceProvenance;return f;
}
function augment(out,kind){
  const file='../../'+kind+'-au-catalogue.js',script=out[file],match=script.match(/const index=(.*?);(?:const adapter|if\(typeof module)/s);assert(match,'Generated index marker missing');
  const index=JSON.parse(match[1]),input=read('approved-products.json');assert.equal(hash(fs.readFileSync(path.join(BASE,'approved-products.json'))),read('policy.json').approvedSha256);
  const additions=input.records.filter(f=>kind==='brand'||membership(f,kind).length);
  const existing=index.files.flatMap(s=>JSON.parse(out[s.path]).records),byKey=new Map();for(const f of existing){const key=C.canonicalKey(f);if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(f);}
  const extra=[];let overlaps=0;
  for(const f of additions){const group=byKey.get(C.canonicalKey(f));if(group){overlaps++;}else{extra.push(f);byKey.set(C.canonicalKey(f),[f]);}}
  const fields=['id','canonicalId','barcode','recordType','market','brand','name','aliases','conceptIds','retailerMemberships','privateLabelCollections','commercialIdentities','browseEligible'];
  const entry=(f,shard)=>kind==='brand'?{id:f.id,canonicalId:f.canonicalId,barcode:f.barcode||null,name:f.name,brand:f.brand,sourceBrands:f.sourceBrands||f.brand,brandKeys:f.sourceBrandTokens.map(b=>b.key),categoryId:f.categoryId,conceptIds:f.conceptIds||[],pack:f.packageSize,shard}:Object.fromEntries(fields.filter(k=>f[k]!==undefined).map(k=>[k,f[k]]).concat([['shard',shard]]));
  const locations=new Map(index.entries.map(e=>[e.id,e.shard]));index.entries=existing.map(f=>entry(f,locations.get(f.id)));
  extra.sort((a,b)=>C.canonicalKey(a).localeCompare(C.canonicalKey(b),'en'));
  for(let i=0;i<extra.length;i+=20){const relative='products/round-two-'+String(i/20).padStart(3,'0')+'.json',records=extra.slice(i,i+20);out[relative]=bytes({records});index.files.push({path:relative,sha256:hash(out[relative]),records:records.length});index.entries.push(...records.map(f=>entry(f,relative)));}
  index.categories=[...new Map([...index.categories,...require('../data/woolworths-au/source-policy.json').categories,...extraCategories].map(c=>[c.id,c])).values()];
  if(kind==='brand'){
    const brands=new Map();for(const e of index.entries)for(const key of e.brandKeys){const f=byKey.get(C.canonicalKey(e))?.[0],token=f?.sourceBrandTokens.find(t=>t.key===key);const b=brands.get(key)||{key,name:token?.name||e.brand,aliases:[],count:0,tier:'private-testing'};b.count++;b.aliases=[...new Set([...b.aliases,token?.name||e.brand])];brands.set(key,b);}
    index.brands=[...brands.values()].sort((a,b)=>a.key.localeCompare(b.key,'en'));index.notice='Private testing · Australian manufacturer and attributable community nutrition evidence. Current retailer availability is unknown. Public-release review remains separate.';
  }else{
    index.retailer.collectionMode='private-testing-evidence';index.retailer.collectionNotice='Private testing · Verified listings and separately identified community store or private-label evidence. Current availability is unknown.';
  }
  index.roundTwo={privateTestingApproved:true,publicReleaseReviewRequired:true,admittedAdditions:extra.length,canonicalOverlaps:overlaps,evidenceSha256:read('policy.json').approvedSha256};
  out[file]=script.replace(match[1],JSON.stringify(index));out['round-two-report.json']=bytes({kind,...index.roundTwo,indexedCanonicalIdentities:byKey.size,entries:index.entries.length,brands:kind==='brand'?index.brands:undefined});return out;
}
module.exports={augment,enrich,membership,extraCategories,hash,bytes,read};
