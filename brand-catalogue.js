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
  const D=global.HECCatalogueDiscovery||(typeof require==='function'?require('./catalogue-discovery'):null),accepted=new Map(D.products.map(f=>[C.canonicalKey(f),f]));
  const acceptedInputs=new Map();
  function registerAccepted(foods){
    const local=food=>['packaged','local'].includes(C.recordType(food))&&C.marketFor(food)==='AU',keys=new Set((foods||[]).filter(local).map(C.canonicalKey)),groups=new Map();
    for(const food of foods||[]){const key=C.canonicalKey(food);if(keys.has(key)){const group=groups.get(key)||[];group.push(food);groups.set(key,group);}}
    for(const [key,group] of groups){const previous=acceptedInputs.get(key);if(previous?.length===group.length&&previous.every((f,i)=>f===group[i]))continue;acceptedInputs.set(key,group);const canonical=C.canonicaliseRecords(group);if(canonical.length===1&&C.productEligibility(canonical[0]).addability.normalLoggingAllowed)accepted.set(key,canonical[0]);else accepted.delete(key);}
  }
  function rowsFor(key){const keys=D.familyKeys(key),rows=[...new Map(keys.flatMap(k=>postings.get(k)||[]).map(e=>[C.canonicalKey(e),e])).values()].filter(e=>!D.holds[e.barcode]);for(const f of accepted.values())if(keys.includes(C.brandKey(f.brand))&&!rows.some(e=>C.canonicalKey(e)===C.canonicalKey(f)))rows.push({...f,local:true,brandKeys:[C.brandKey(f.brand)],categoryId:D.category(f)?.id||f.categoryId||'existing',conceptIds:f.conceptIds||[]});return rows.map(D.project);}
  const admittedKeys=new Map(index.entries.map(e=>[C.canonicalKey(e),e]));
  function entryFor(food){return food?admittedKeys.get(C.canonicalKey(food)):undefined;}
  function isAdmitted(food){return !!entryFor(food);}
  // Admission belongs to the generated identity set, including retailer aliases
  // of the same GTIN. A matching brand label alone is not directory admission.
  function isBrandMember(food,key){if(!food||D.holds[food.barcode])return false;const keys=D.familyKeys(key),entry=admittedKeys.get(C.canonicalKey(food));return entry?entry.brandKeys.some(k=>keys.includes(k)):accepted.has(C.canonicalKey(food))&&keys.includes(C.brandKey(food.brand));}
  function ordinaryChoice(food){return (C.recordType(food)!=='external-catalogue'||isAdmitted(food))&&C.productEligibility(food).addability.normalLoggingAllowed;}
  function recognise(query){const intent=C.queryIntent(query);if(intent.entity?.type==='retailer'||intent.entity?.type==='restaurant'||intent.reason==='declared-food-identity')return null;const words=String(query||'').trim().split(/\s+/);for(let length=words.length;length>0;length--){const key=C.brandKey(words.slice(0,length).join(' '));if(brands.has(key))return {brand:brands.get(key),residual:words.slice(length).join(' ')};}return null;}
  function conceptBrands(conceptId){const map=concepts.get(conceptId)||new Map();return [...map].map(([key,count])=>({...brands.get(key),count})).sort((a,b)=>a.name.localeCompare(b.name,'en'));}
  function directory(key,{conceptId=''}={}){const brand=brands.get(key);if(!brand)return null;const rows=rowsFor(key).filter(e=>!conceptId||e.conceptIds.includes(conceptId)),categories=[...index.categories,{id:'soft-drinks',label:'Soft Drinks'},{id:'existing',label:'Other accepted products'}];return {brand,conceptId,total:rows.length,pageSize:PAGE_SIZE,notice:index.notice,categories:[...new Map(categories.map(c=>[c.id,c])).values()].map(c=>({...c,label:c.id==='drinks'?'Drinks':c.label,count:rows.filter(e=>e.categoryId===c.id).length})).filter(c=>c.count)};}
  async function shard(file){if(!cache.has(file)){const p=typeof window==='undefined'?Promise.resolve(require('node:fs').readFileSync(require('node:path').join(__dirname,'data/brand-au',file),'utf8')).then(JSON.parse):fetch(index.base+file).then(r=>{if(!r.ok)throw Error('Brand catalogue shard unavailable: '+file);return r.json();});cache.set(file,p.catch(error=>{cache.delete(file);throw error;}));}return cache.get(file);}
  async function hydrate(rows,{isCurrent=()=>true,usableOnly=false}={}){
    const files=[...new Set(rows.filter(e=>!e.local).map(e=>e.shard))],pages=await Promise.all(files.map(shard));if(!isCurrent())return [];
    const found=new Map(pages.flatMap(p=>p.records).map(f=>[f.id,f]));
    const retailer=global.HECRetailerCatalogue||(typeof require==='function'?require('./retailer-catalogue'):null);
    const foods=await Promise.all(rows.map(async e=>{
      const food=e.local?accepted.get(C.canonicalKey(e)):found.get(e.id);
      if(!food||food.barcode!==e.barcode||!e.local&&!['audited-first-wave','audited-round-two','audited-wave-1b','audited-wave-3a','audited-wave-6a'].includes(food.brandAdmission?.status))throw Error('Brand admission mismatch: '+e.id);
      if(!C.productEligibility(food).addability.normalLoggingAllowed){if(usableOnly)return null;throw Error('Brand admission mismatch: '+e.id);}
      // Resolve only this admitted GTIN through the retailer's indexed canonical
      // evidence group. Source precedence must not depend on prior browsing.
      const evidence=retailer&&e.barcode?await retailer.search(e.barcode,{isCurrent}):null;
      if(!isCurrent())return null;
      const peers=(evidence?.foods||[]).filter(f=>C.canonicalKey(f)===C.canonicalKey(food));
      const canonical=C.canonicaliseRecords([food,...peers]);
      if(canonical.length!==1||!C.productEligibility(canonical[0]).addability.normalLoggingAllowed){if(e.local||usableOnly){if(e.local)accepted.delete(C.canonicalKey(e));return null;}throw Error('Brand canonical identity needs review: '+e.id);}
      if(e.local)return D.project({...clone(canonical[0]),categoryId:e.categoryId});
      return D.project({...clone(canonical[0]),brandAdmission:clone(food.brandAdmission),sourceBrands:food.sourceBrands,sourceBrandTokens:clone(food.sourceBrandTokens),categoryId:e.categoryId,category:food.category,conceptIds:[...e.conceptIds]});
    }));
    if(!isCurrent())return [];
    for(const food of foods.filter(Boolean)){loadedFoods.set(food.id,food);if(loadedFoods.size>200)loadedFoods.delete(loadedFoods.keys().next().value);}
    return foods.filter(Boolean);
  }
  async function usableCatalogue(key,{isCurrent=()=>true}={}){
    const rows=rowsFor(key),foods=[];
    for(let offset=0;offset<rows.length;offset+=PAGE_SIZE){if(!isCurrent())return null;foods.push(...await hydrate(rows.slice(offset,offset+PAGE_SIZE),{isCurrent,usableOnly:true}));}
    if(!isCurrent())return null;
    const usable=D.usableProducts(foods).filter(food=>isBrandMember(food,key));return {foods:usable,total:usable.length};
  }
  async function page(key,{categoryId='*',conceptId='',filter='',offset=0,limit=PAGE_SIZE,isCurrent=()=>true}={}){const model=directory(key,{conceptId});if(!model)return null;const rows=rowsFor(key).filter(e=>(categoryId==='*'||e.categoryId===categoryId)&&(!conceptId||e.conceptIds.includes(conceptId))&&D.matches(e,filter)).sort((a,b)=>a.name.localeCompare(b.name,'en')||String(a.barcode||a.id).localeCompare(String(b.barcode||b.id))),start=Math.max(0,Number(offset)||0),size=Math.min(PAGE_SIZE,Math.max(1,Number(limit)||PAGE_SIZE)),foods=await hydrate(rows.slice(start,start+size),{isCurrent});return isCurrent()?{...model,foods,total:rows.length,offset:start,categoryId,hasMore:start+size<rows.length}:null;}
  async function search(query,{brandKey='',filter='',offset=0,limit=20,isCurrent=()=>true}={}){const found=brandKey&&brands.has(brandKey)?{brand:brands.get(brandKey),residual:''}:recognise(query);if(!found)return null;const q=C.norm(filter||found.residual),tokens=q.split(' ').filter(Boolean),rows=rowsFor(found.brand.key).filter(e=>tokens.every(t=>C.norm(e.name+' '+e.brand+' '+e.pack+' '+(e.aliases||[]).join(' ')).includes(t)));
    const priority=e=>C.norm(e.name)===q?3:C.norm(e.name)===C.norm(query)?3:S.semanticProductExactness(e,query).priority;
    rows.sort((a,b)=>(q?priority(b)-priority(a)||a.name.length-b.name.length:0)||a.name.localeCompare(b.name,'en')||String(a.barcode||a.id).localeCompare(String(b.barcode||b.id)));
    const start=Math.max(0,Number(offset)||0),size=Math.min(500,Math.max(1,Number(limit)||20)),foods=await hydrate(rows.slice(start,start+size),{isCurrent});return isCurrent()?{query,total:rows.length,offset:start,limit:size,hasMore:start+size<rows.length,foods,intent:{kind:found.residual?'brand-product':'consumer-brand',brand:found.brand,productQuery:found.residual},brand:found.brand,source:'Australian private-testing brand catalogue'}:null;
  }
  const api={registerAccepted,rowsFor,index,pageSize:PAGE_SIZE,brands,entries,loadedFoods,entryFor,isAdmitted,isBrandMember,ordinaryChoice,recognise,conceptBrands,directory,usableCatalogue,page,search,hydrate};global.HECBrandCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
