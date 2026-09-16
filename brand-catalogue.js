/* Shared, bounded browsing of the audited OFF brand wave. Brand membership is
   independent of retailer membership; no source or retailer identity is minted. */
(function(global){
  'use strict';
  const C=global.HECFoodCatalogue||(typeof require==='function'?require('./food-catalogue'):null),S=global.HECSearchFoundation||(typeof require==='function'?require('./search-foundation'):null);
  const index=global.HECBrandCatalogueIndex||(typeof require==='function'?require('./brand-au-catalogue'):null),PAGE_SIZE=20;
  const brands=new Map(index.brands.map(b=>[b.key,b])),entries=new Map(index.entries.map(e=>[e.id,e])),postings=new Map(),concepts=new Map(),cache=new Map(),loadedFoods=new Map();
  for(const e of index.entries)for(const key of e.brandKeys){if(!brands.has(key))continue;const rows=postings.get(key)||[];rows.push(e);postings.set(key,rows);for(const id of e.conceptIds){const values=concepts.get(id)||new Map();values.set(key,(values.get(key)||0)+1);concepts.set(id,values);}}
  C.registerBrandDirectory(index.brands);
  const clone=v=>JSON.parse(JSON.stringify(v));
  function isAdmitted(food){return !!food?.barcode&&entries.has('off:'+food.barcode);}
  // Admission belongs to the generated identity set, including retailer aliases
  // of the same GTIN. A matching brand label alone is not directory admission.
  function isBrandMember(food,key){return !!food?.barcode&&!!entries.get('off:'+food.barcode)?.brandKeys.includes(key);}
  function ordinaryChoice(food){return (C.recordType(food)!=='external-catalogue'||isAdmitted(food))&&C.productEligibility(food).addability.normalLoggingAllowed;}
  function recognise(query){const intent=C.queryIntent(query);if(intent.entity?.type==='retailer'||intent.entity?.type==='restaurant'||intent.reason==='declared-food-identity')return null;const words=String(query||'').trim().split(/\s+/);for(let length=words.length;length>0;length--){const key=C.brandKey(words.slice(0,length).join(' '));if(brands.has(key))return {brand:brands.get(key),residual:words.slice(length).join(' ')};}return null;}
  function conceptBrands(conceptId){const map=concepts.get(conceptId)||new Map();return [...map].map(([key,count])=>({...brands.get(key),count})).sort((a,b)=>a.name.localeCompare(b.name,'en'));}
  function directory(key,{conceptId=''}={}){const brand=brands.get(key);if(!brand)return null;const rows=(postings.get(key)||[]).filter(e=>!conceptId||e.conceptIds.includes(conceptId));return {brand,conceptId,total:rows.length,pageSize:PAGE_SIZE,notice:index.notice,categories:index.categories.map(c=>({...c,count:rows.filter(e=>e.categoryId===c.id).length})).filter(c=>c.count)};}
  async function shard(file){if(!cache.has(file)){const p=typeof window==='undefined'?Promise.resolve(require('node:fs').readFileSync(require('node:path').join(__dirname,'data/brand-au',file),'utf8')).then(JSON.parse):fetch(index.base+file).then(r=>{if(!r.ok)throw Error('Brand catalogue shard unavailable: '+file);return r.json();});cache.set(file,p.catch(error=>{cache.delete(file);throw error;}));}return cache.get(file);}
  async function hydrate(rows,{isCurrent=()=>true}={}){
    const files=[...new Set(rows.map(e=>e.shard))],pages=await Promise.all(files.map(shard));if(!isCurrent())return [];
    const found=new Map(pages.flatMap(p=>p.records).map(f=>[f.id,f]));
    const retailer=global.HECRetailerCatalogue||(typeof require==='function'?require('./retailer-catalogue'):null);
    const foods=await Promise.all(rows.map(async e=>{
      const food=found.get(e.id);
      if(!food||food.barcode!==e.barcode||food.brandAdmission?.status!=='audited-first-wave'||!C.productEligibility(food).addability.normalLoggingAllowed)throw Error('Brand admission mismatch: '+e.id);
      // Resolve only this admitted GTIN through the retailer's indexed canonical
      // evidence group. Source precedence must not depend on prior browsing.
      const evidence=retailer?await retailer.search(e.barcode,{isCurrent}):null;
      if(!isCurrent())return null;
      const peers=(evidence?.foods||[]).filter(f=>C.canonicalKey(f)===C.canonicalKey(food));
      const canonical=C.canonicaliseRecords([food,...peers]);
      if(canonical.length!==1||!C.productEligibility(canonical[0]).addability.normalLoggingAllowed)throw Error('Brand canonical identity needs review: '+e.id);
      return {...clone(canonical[0]),brandAdmission:clone(food.brandAdmission),sourceBrands:food.sourceBrands,sourceBrandTokens:clone(food.sourceBrandTokens),categoryId:e.categoryId,category:food.category,conceptIds:[...e.conceptIds]};
    }));
    if(!isCurrent())return [];
    for(const food of foods){loadedFoods.set(food.id,food);if(loadedFoods.size>200)loadedFoods.delete(loadedFoods.keys().next().value);}
    return foods;
  }
  async function page(key,{categoryId='*',conceptId='',offset=0,limit=PAGE_SIZE,isCurrent=()=>true}={}){const model=directory(key,{conceptId});if(!model)return null;const rows=(postings.get(key)||[]).filter(e=>(categoryId==='*'||e.categoryId===categoryId)&&(!conceptId||e.conceptIds.includes(conceptId))).sort((a,b)=>a.name.localeCompare(b.name,'en')||a.barcode.localeCompare(b.barcode)),start=Math.max(0,Number(offset)||0),size=Math.min(PAGE_SIZE,Math.max(1,Number(limit)||PAGE_SIZE)),foods=await hydrate(rows.slice(start,start+size),{isCurrent});return isCurrent()?{...model,foods,total:rows.length,offset:start,categoryId,hasMore:start+size<rows.length}:null;}
  async function search(query,{brandKey='',offset=0,limit=20,isCurrent=()=>true}={}){const found=brandKey&&brands.has(brandKey)?{brand:brands.get(brandKey),residual:''}:recognise(query);if(!found)return null;const q=C.norm(found.residual),tokens=q.split(' ').filter(Boolean),rows=(postings.get(found.brand.key)||[]).filter(e=>tokens.every(t=>C.norm(e.name+' '+e.pack).includes(t)));
    const priority=e=>C.norm(e.name)===q?3:C.norm(e.name)===C.norm(query)?3:S.semanticProductExactness(e,query).priority;
    rows.sort((a,b)=>priority(b)-priority(a)||a.name.length-b.name.length||a.name.localeCompare(b.name,'en')||a.barcode.localeCompare(b.barcode));
    const start=Math.max(0,Number(offset)||0),size=Math.min(500,Math.max(1,Number(limit)||20)),foods=await hydrate(rows.slice(start,start+size),{isCurrent});return isCurrent()?{query,total:rows.length,offset:start,limit:size,hasMore:start+size<rows.length,foods,intent:{kind:found.residual?'brand-product':'consumer-brand',brand:found.brand,productQuery:found.residual},brand:found.brand,source:'Open Food Facts Australia · audited brand wave'}:null;
  }
  const api={index,pageSize:PAGE_SIZE,brands,entries,loadedFoods,isAdmitted,isBrandMember,ordinaryChoice,recognise,conceptBrands,directory,page,search,hydrate};global.HECBrandCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
