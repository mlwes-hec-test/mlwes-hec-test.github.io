'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),C=require('../food-catalogue'),X=require('./catalogue-round-two'),S=require('./food-category-semantics');
const auditPath=path.join(__dirname,'../data/catalogue-round-three/family-audit-after.json');
function families(retailer){return JSON.parse(fs.readFileSync(auditPath)).rows.filter(r=>r.retailer===retailer&&r.relationshipVerified&&r.status!=='legacy').map(r=>({key:r.key,name:r.displayBrand,status:r.status,evidenceIds:r.evidenceIds}));}
function augment(out,kind){
  const file='../../'+kind+'-au-catalogue.js',script=out[file],match=script.match(/const index=(.*?);(?:const adapter|if\(typeof module)/s);assert(match);
  const index=JSON.parse(match[1]),byId=new Map(),changes=[];
  for(const shard of index.files){const data=JSON.parse(out[shard.path]);for(const f of data.records){
    const semantic=S.classify(f);if(semantic){
      const before={categoryId:f.categoryId,conceptIds:f.conceptIds||[]};
      f.categoryId=semantic.id;f.category=index.categories.find(c=>c.id===semantic.id).label;f.conceptIds=semantic.conceptIds;
      // Retain the original evidence category assertions. This explicit projection
      // field owns display categorisation; it is not new retailer evidence.
      f.browseCategoryId=semantic.id;
      if(before.categoryId!==f.categoryId||JSON.stringify(before.conceptIds)!==JSON.stringify(f.conceptIds))changes.push({id:f.id,brand:f.brand,name:f.name,before,after:{categoryId:f.categoryId,conceptIds:f.conceptIds},rule:semantic.rule});
    }
    const aliases=C.potatoBiteAliases(f.name);if(aliases.length)f.aliases=[...new Set([...(f.aliases||[]),...aliases])];
    byId.set(f.id,f);
  }out[shard.path]=X.bytes(data);shard.sha256=X.hash(out[shard.path]);}
  for(const entry of index.entries){const f=byId.get(entry.id);for(const key of ['conceptIds','browseCategoryId'])if(f[key]!==undefined)entry[key]=f[key];if(C.potatoBiteAliases(f.name).length)entry.aliases=f.aliases;if(kind==='brand')entry.categoryId=f.categoryId;}
  if(kind!=='brand'){
    index.retailer.houseBrandFamilies=families(kind);
    index.retailer.houseBrandAuditSha256=X.hash(fs.readFileSync(auditPath));
    index.retailer.collectionNotice='Private testing · Verified own and private-label brand families. Current product availability is unknown.';
  }
  out[file]=script.replace(match[1],JSON.stringify(index));
  out['semantics-repair-report.json']=X.bytes({kind,changes,relationshipAuditSha256:X.hash(fs.readFileSync(auditPath))});return out;
}
module.exports={families,augment};
