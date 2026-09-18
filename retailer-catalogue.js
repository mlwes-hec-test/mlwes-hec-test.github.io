/* Shared Australian retailer catalogue indexes. No retailer product data lives here.
   Adapters register small evidence-bearing index rows and hydrate only a page's
   complete canonical groups. Consumer brand and commercial identity stay separate. */
(function(global){
  'use strict';
  const C=global.HECFoodCatalogue||(typeof require==='function'?require('./food-catalogue.js'):null);
  const REG=global.HECAustralianEntityRegistry||(typeof require==='function'?require('./entity-registry.js'):null);
  const SEARCH=global.HECSearchFoundation||(typeof require==='function'?require('./search-foundation.js'):null);
  const catalogues=new Map(),PAGE_SIZE=20,MAX_EVIDENCE_ROWS=32,MAX_CATEGORIES=64;
  let revision=0;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const loadedFoods=new Map(),searchTokens=value=>C.norm(value).split(' ').filter(token=>token.length>1&&!['and','the','in','with','of'].includes(token)).map(token=>token.replace(/ies$/,'y').replace(/([a-z]{4,})s$/,'$1'));
  const requireValue=(condition,message)=>{if(!condition)throw new Error(`Retailer catalogue: ${message}`);};
  function entity(id){return catalogues.get(id)?.retailer||REG.entries.find(item=>item.id===id&&item.type==='retailer')||null;}
  function recognise(query){const key=C.norm(query);for(const {retailer} of catalogues.values())if(retailer.aliases.some(alias=>C.norm(alias)===key))return retailer;return REG.exactEntity(query,['retailer']);}
  function houseBrandFamily(food,retailer){return retailer.houseBrandFamilies?.find(f=>f.key===C.brandKey(food.brand)&&['current','uncertain'].includes(f.status)&&f.evidenceIds?.length)||null;}
  function browseMembership(food,source){if(source.retailer.collectionMode==='private-testing-evidence')return [...C.retailerMembership(food,source.retailer.id),...C.sourceDeclaredRetailerMembership(food,source.retailer.id),...C.privateLabelCollectionMembership(food,source.retailer.id)];return source.retailer.collectionMode==='source-declared-store'?C.sourceDeclaredRetailerMembership(food,source.retailer.id):source.retailer.collectionMode==='source-declared-brand'?C.privateLabelCollectionMembership(food,source.retailer.id):C.retailerMembership(food,source.retailer.id);}
  function conceptMembership(food,source){if(source.retailer.houseBrandFamilies)return !!houseBrandFamily(food,source.retailer)&&browseMembership(food,source).length>0;if(source.retailer.collectionMode==='private-testing-evidence')return source.retailer.id==='aldi'?browseMembership(food,source).length>0:C.commercialIdentityMembership(source.retailer,food).matches;return source.retailer.collectionMode==='source-declared-store'?browseMembership(food,source).length>0:C.commercialIdentityMembership(source.retailer,food).matches;}
  function registerCatalogue({retailer,categories=[],entries=[],loadRecords,selectableOnly=false}){
    requireValue(retailer?.id&&retailer.name&&retailer.market==='AU','an Australian retailer identity is required');
    requireValue(typeof loadRecords==='function','a bounded record loader is required');
    const registered={...clone(retailer),type:'retailer',aliases:[...new Set([retailer.name,...(retailer.aliases||[])])]},foodCategories=new Map();
    for(const alias of registered.aliases){const existing=REG.exactEntity(alias,['brand','retailer','restaurant']),intent=C.queryIntent(alias),active=recognise(alias);requireValue(!active||active.id===retailer.id,'retailer aliases must not replace another retailer');requireValue(!existing||(existing.type==='retailer'&&existing.id===retailer.id),'retailer aliases must not replace another entity');requireValue(!intent.entity||intent.entity.type==='retailer','retailer aliases must not replace indexed brands');requireValue(intent.reason!=='declared-food-identity','retailer aliases must not replace generic foods');}
    for(const category of categories){if(category.scope!=='food')continue;requireValue(category.id&&category.id!=='*'&&category.label&&!foodCategories.has(category.id),'food categories need unique stable IDs and labels');foodCategories.set(category.id,clone(category));}
    requireValue(foodCategories.size<=MAX_CATEGORIES,'split oversized category directories in the adapter');
    const rows=new Map(),groups=new Map();
    for(const raw of entries){
      const entry=clone(raw),members=browseMembership(entry,{retailer}).filter(m=>m.categoryIds?.some(id=>foodCategories.has(id))&&(!selectableOnly||entry.browseEligible===true));
      requireValue(entry.id&&!rows.has(entry.id),'index record IDs must be unique');
      const key=C.canonicalKey(entry),group=groups.get(key)||{key,ids:[],categories:new Set(),commercialConcepts:new Set(),houseBrands:new Set()};
      group.ids.push(entry.id);
      for(const member of members)for(const id of entry.browseCategoryId?[entry.browseCategoryId]:member.categoryIds||[])if(foodCategories.has(id))group.categories.add(id);
      const family=houseBrandFamily(entry,registered);if(members.length&&family)group.houseBrands.add(family.key);
      if(conceptMembership(entry,{retailer:registered}))for(const id of entry.conceptIds||[])group.commercialConcepts.add(id);
      rows.set(entry.id,entry);groups.set(key,group);
    }
    // A verified listing admits a canonical group, not each evidence source.
    // Unlisted corroborating/conflicting records stay in that group's analysis.
    // Posting lists are built once on registration, never on a search keystroke.
    const searchable=[...groups.values()].filter(group=>group.categories.size),all=registered.houseBrandFamilies?searchable.filter(group=>group.houseBrands.size):searchable,postings=new Map([['*',all]]),commercial=new Map();
    for(const group of all)requireValue(group.ids.length<=MAX_EVIDENCE_ROWS,'canonical group exceeds the evidence-row bound; quarantine in the adapter');
    for(const category of foodCategories.values())postings.set(category.id,all.filter(group=>group.categories.has(category.id)));
    for(const group of all)for(const concept of group.commercialConcepts){const list=commercial.get(concept)||[];list.push(group);commercial.set(concept,list);}
    const searchPostings=new Map();
    for(const group of searchable){const searchRows=group.ids.map(id=>rows.get(id));group.privateIdentity=searchRows.some(row=>conceptMembership(row,{retailer:registered}));group.searchNames=searchRows.flatMap(row=>[row.name,...(row.aliases||[])]).filter(Boolean).map(C.norm);const tokens=new Set(searchRows.flatMap(row=>searchTokens([row.name,row.brand,...(row.aliases||[]),row.barcode,...((retailer.collectionMode==='source-declared-store'||retailer.id==='aldi'&&retailer.collectionMode==='private-testing-evidence')?[...registered.aliases,...(row.conceptIds||[]).flatMap(id=>SEARCH.foodConceptRegistry[id]?.aliases||[id])]:[])].join(' '))));for(const token of tokens){const list=searchPostings.get(token)||new Set();list.add(group);searchPostings.set(token,list);}}
    for(const [key,food] of loadedFoods)if(browseMembership(food,{retailer}).length)loadedFoods.delete(key);
    catalogues.set(retailer.id,{retailer:registered,selectableOnly,categories:foodCategories,rows,postings,commercial,searchPostings,loadRecords,cache:new Map()});revision++;
    return {retailerId:retailer.id,products:all.length,evidenceRows:rows.size};
  }
  function unregisterCatalogue(id){if(catalogues.delete(id)){revision++;for(const [key,food] of loadedFoods)if(C.retailerMembership(food,id).length||C.sourceDeclaredRetailerMembership(food,id).length||C.privateLabelCollectionMembership(food,id).length)loadedFoods.delete(key);}}
  function commercialOptions(conceptId){return [...catalogues.values()].filter(value=>value.commercial.get(conceptId)?.length).map(value=>({id:value.retailer.id,label:value.retailer.name,count:value.commercial.get(conceptId).length}));}
  function conceptSourceQuestion(session){
    // Hash Brown already has a complete source-context question, including
    // packaged/frozen. Preserve that accepted source decision and Back path.
    if(session.conceptId==='hash-brown')return null;
    const known=session.known||{},options=commercialOptions(session.conceptId);
    const brandOptions=global.HECBrandCatalogue?.conceptBrands(session.conceptId)||[];
    if(known.breadSource==='brand'||known.catalogueSource==='brand')return {key:'brandIdentity',question:'Which brand?',options:brandOptions.map(b=>({value:b.key,label:`${b.name} (${b.count})`})),reason:'audited-concept-brand-membership'};
    if(known.breadSource==='supermarket'||known.catalogueSource==='supermarket')return {key:'retailerIdentity',question:'Which supermarket / brand identity?',options:options.map(item=>({value:item.id,label:item.label})),reason:'supported-retailer-concept'};
    if(session.conceptId==='bread'||!options.length&&!brandOptions.length)return null;
    if(!known.catalogueOrigin)return {key:'catalogueOrigin',question:'Generic or Commercial?',options:[{value:'generic',label:'Generic Australian food'},{value:'commercial',label:'Commercial'}],reason:'registered-retailer-concept-coverage'};
    if(known.catalogueOrigin==='commercial'&&!known.catalogueSource)return {key:'catalogueSource',question:'How would you like to find it?',options:[{value:'supermarket',label:'Supermarket / Brand Name'},{value:'brand',label:'Choose by product brand'}],reason:'registered-retailer-concept-coverage'};
    return null;
  }
  function directory(retailerId,{scope='retailer',conceptId=''}={}){
    const source=catalogues.get(retailerId),retailer=entity(retailerId);if(!retailer)return null;
    const list=scope==='commercial-identity'?source?.commercial.get(conceptId)||[]:source?.postings.get('*')||[];
    const categories=scope==='commercial-identity'?[]:[...(source?.categories.values()||[])].map(category=>({id:category.id,label:category.label,count:source.postings.get(category.id).length})).filter(category=>category.count);
    const brands=scope==='retailer'?(source?.retailer.houseBrandFamilies||[]).map(f=>({key:f.key,name:f.name,count:list.filter(g=>g.houseBrands.has(f.key)).length})).filter(f=>f.count).sort((a,b)=>a.name.localeCompare(b.name,'en')):[];
    return {kind:'retailer',retailer:{id:retailer.id,name:retailer.name,market:'AU',...(retailer.collectionMode?{collectionMode:retailer.collectionMode,collectionNotice:retailer.collectionNotice}: {})},scope,conceptId,categories,brands,total:list.length,pageSize:PAGE_SIZE};
  }
  async function page(retailerId,{categoryId='*',brandKey='',scope='retailer',conceptId='',offset=0,limit=PAGE_SIZE,isCurrent=()=>true}={}){
    requireValue(['retailer','commercial-identity'].includes(scope),'unknown browse scope');
    const source=catalogues.get(retailerId),model=directory(retailerId,{scope,conceptId});requireValue(model,'unknown retailer');
    const suppliedCurrent=isCurrent;isCurrent=()=>suppliedCurrent()&&catalogues.get(retailerId)===source;
    const size=Math.min(PAGE_SIZE,Math.max(1,Math.floor(Number(limit)||PAGE_SIZE))),start=Math.max(0,Math.floor(Number(offset)||0));
    const groups=(scope==='commercial-identity'?source?.commercial.get(conceptId)||[]:source?.postings.get(categoryId)||[]).filter(g=>!brandKey||g.houseBrands.has(brandKey));
    const selected=groups.slice(start,start+size),foods=[];
    if(!isCurrent())return null;
    const key=JSON.stringify([scope,conceptId,categoryId,brandKey,start,size]),cached=source?.cache.get(key);
    if(cached)return clone(cached);
    if(selected.length){
      foods.push(...await hydrateGroups(source,selected,{scope,isCurrent}));if(!isCurrent())return null;
    }
    const result={...model,categoryId,brandKey,brandName:model.brands.find(b=>b.key===brandKey)?.name||'',categoryLabel:categoryId==='*'?'All Items':source?.categories.get(categoryId)?.label||'',offset:start,total:groups.length,hasMore:start+selected.length<groups.length,foods};
    if(source&&isCurrent()){source.cache.set(key,clone(result));if(source.cache.size>16)source.cache.delete(source.cache.keys().next().value);}
    return isCurrent()?clone(result):null;
  }
  async function hydrateGroups(source,selected,{scope='retailer',isCurrent=()=>true}={}){
      const retailerId=source.retailer.id,foods=[],ids=selected.flatMap(group=>group.ids),records=await source.loadRecords(ids,{isCurrent});if(!isCurrent())return [];
      requireValue(Array.isArray(records)&&records.length===ids.length,'loader must return the complete requested evidence groups');
      const byId=new Map(records.map(record=>[record.id,record]));requireValue(byId.size===ids.length&&ids.every(id=>byId.has(id)),'loader returned missing, duplicate or unexpected IDs');
      for(const id of ids){const record=byId.get(id),entry=source.rows.get(id);requireValue(C.canonicalKey(record)===C.canonicalKey(entry),'hydrated canonical identity differs from its index');
        requireValue(record.browseCategoryId===entry.browseCategoryId,'hydrated display category differs from its index');
        requireValue(JSON.stringify(C.retailerMembership(record,retailerId))===JSON.stringify(C.retailerMembership(entry,retailerId)),'hydrated retailer evidence differs from its index');
        requireValue(JSON.stringify(C.sourceDeclaredRetailerMembership(record,retailerId))===JSON.stringify(C.sourceDeclaredRetailerMembership(entry,retailerId)),'hydrated community store evidence differs from its index');
        requireValue(JSON.stringify(C.privateLabelCollectionMembership(record,retailerId))===JSON.stringify(C.privateLabelCollectionMembership(entry,retailerId)),'hydrated collection evidence differs from its index');
      }
      for(const group of selected){
        const records=group.ids.map(id=>byId.get(id)),canonical=C.canonicaliseRecords(records);requireValue(canonical.length===1,'index group does not resolve to one canonical identity');
        const food=canonical[0];if(scope==='commercial-identity'&&!conceptMembership(food,source))throw new Error('Retailer catalogue: hydrated private-label identity differs from its index');
        if(!food.legacyPreviewOnly&&food.itemStatus!=='retired'&&(!source.selectableOnly||C.productEligibility(food).addability.status==='loggable-now')){foods.push(food);loadedFoods.set(C.canonicalKey(food),clone(food));if(loadedFoods.size>200)loadedFoods.delete(loadedFoods.keys().next().value);}
      }
      return foods;
  }
  async function search(query,{offset=0,limit=PAGE_SIZE,isCurrent=()=>true}={}){
    const generation=revision,current=()=>isCurrent()&&generation===revision,tokens=[...new Set(searchTokens(query))],matches=[],normalisedQuery=C.norm(query),privateIntent=[...catalogues.values()].find(source=>source.retailer.aliases.some(alias=>normalisedQuery.startsWith(C.norm(alias)+' ')));
    const start=Math.max(0,Math.floor(Number(offset)||0)),size=Math.min(PAGE_SIZE,Math.max(1,Math.floor(Number(limit)||PAGE_SIZE)));
    if(!tokens.length||!current())return {query,total:0,offset:start,hasMore:false,foods:[]};
    for(const source of catalogues.values()){
      if(privateIntent&&source!==privateIntent)continue;
      const lists=tokens.map(token=>source.searchPostings.get(token));if(lists.some(list=>!list))continue;
      const smallest=[...lists].sort((a,b)=>a.size-b.size)[0],normalised=C.norm(query);for(const group of smallest)if((!privateIntent||group.privateIdentity)&&lists.every(list=>list.has(group)))matches.push({source,group,score:group.searchNames.some(name=>name===normalised)?2:group.searchNames.some(name=>name.startsWith(normalised))?1:0});
    }
    matches.sort((a,b)=>b.score-a.score||a.group.key.localeCompare(b.group.key));const seen=new Set(),unique=matches.filter(m=>{if(seen.has(m.group.key))return false;seen.add(m.group.key);return true;});const selected=unique.slice(start,start+size),bySource=new Map(),foods=[];
    for(const {source,group} of selected){const groups=bySource.get(source)||[];groups.push(group);bySource.set(source,groups);}
    for(const [source,groups] of bySource){if(!current())return null;foods.push(...await hydrateGroups(source,groups,{isCurrent:current}));}
    const byKey=new Map(foods.map(food=>[C.canonicalKey(food),food]));
    return current()?{query,total:unique.length,offset:start,hasMore:start+selected.length<unique.length,foods:selected.map(({group})=>byKey.get(group.key)).filter(food=>food&&(!privateIntent||conceptMembership(food,privateIntent)))}:null;
  }
  function createSession(retailerId,{ownerQuery,ownerRevision,scope='retailer',conceptId=''}={}){return {retailerId,ownerQuery,ownerRevision,scope,conceptId,categoryId:scope==='commercial-identity'?'*':null,brandKey:'',view:'categories',offset:0,request:0,active:true,loading:false,result:null,error:''};}
  function cancel(session){if(session){session.active=false;session.request++;session.result=null;session.loading=false;}}
  async function load(session,{categoryId=session.categoryId,brandKey=session.brandKey||'',offset=0,isCurrent=()=>true}={}){
    const request=++session.request,owns=()=>session.active&&session.request===request&&isCurrent();session.categoryId=categoryId;session.brandKey=brandKey;session.offset=offset;session.loading=true;session.result=null;session.error='';
    try{const result=categoryId===null?directory(session.retailerId,session):await page(session.retailerId,{...session,categoryId,offset,isCurrent:owns});if(!owns())return null;session.result=result;return result;}
    catch(error){if(owns())session.error=String(error.message||error);return null;}
    finally{if(owns())session.loading=false;}
  }
  const api={version:'0.6.33',pageSize:PAGE_SIZE,maxEvidenceRows:MAX_EVIDENCE_ROWS,entity,recognise,registerCatalogue,unregisterCatalogue,commercialOptions,conceptSourceQuestion,directory,page,search,loadedFoods,createSession,load,cancel,revision:()=>revision};
  global.HECRetailerCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
