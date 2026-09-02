/* Healthy Eating Companion — Australian Food Entity Registry 0.6.32
   Small, maintainable local vocabulary used BEFORE food matching.
   It recognises retailers, brands, restaurant/takeaway chains and aliases so
   HEC can preserve information the user already supplied without hard-coding
   every individual food product.
*/
(function(global){
  'use strict';
  const VERSION='0.6.33';
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function words(v){return norm(v).split(' ').filter(Boolean);}

  const E=[
    // Major national / regional grocery retailers.
    {id:'woolworths',type:'retailer',name:'Woolworths',aliases:['woolworths','woolies','woolworths metro','woolies metro'],sourceMode:'commercial',route:'store'},
    {id:'coles',type:'retailer',name:'Coles',aliases:['coles','coles local'],sourceMode:'commercial',route:'store'},
    {id:'aldi',type:'retailer',name:'ALDI',aliases:['aldi'],sourceMode:'commercial',route:'store'},
    {id:'iga',type:'retailer',name:'IGA',aliases:['iga','independent grocers of australia','supa iga','iga x press','iga xpress'],sourceMode:'commercial',route:'store'},
    {id:'costco',type:'retailer',name:'Costco',aliases:['costco','costco wholesale'],sourceMode:'commercial',route:'store'},
    {id:'foodworks',type:'retailer',name:'FoodWorks',aliases:['foodworks','food works'],sourceMode:'commercial',route:'store'},
    {id:'drakes',type:'retailer',name:'Drakes Supermarkets',aliases:['drakes','drakes supermarkets'],sourceMode:'commercial',route:'store'},
    {id:'foodland',type:'retailer',name:'Foodland',aliases:['foodland'],sourceMode:'commercial',route:'store'},
    {id:'harris-farm',type:'retailer',name:'Harris Farm Markets',aliases:['harris farm','harris farm markets'],sourceMode:'commercial',route:'store'},
    {id:'friendly-grocer',type:'retailer',name:'Friendly Grocer',aliases:['friendly grocer'],sourceMode:'commercial',route:'store'},
    {id:'spar',type:'retailer',name:'SPAR',aliases:['spar'],sourceMode:'commercial',route:'store'},
    {id:'spudshed',type:'retailer',name:'Spudshed',aliases:['spudshed','spud shed'],sourceMode:'commercial',route:'store'},

    // Common Australian grocery brands / product families used in founder tests.
    {id:'kelloggs',type:'brand',name:"Kellogg's",aliases:['kellogg','kelloggs',"kellogg's"],sourceMode:'commercial',foodConcept:'cereal',foodFamily:'Breakfast Cereal'},
    {id:'doritos',type:'brand',name:'Doritos',aliases:['doritos'],sourceMode:'commercial',foodConcept:'corn-chip',foodFamily:'Corn Chips'},
    {id:'ccs',type:'brand',name:"CC's",aliases:['ccs',"cc's",'ccs corn chips'],sourceMode:'commercial',foodConcept:'corn-chip',foodFamily:'Corn Chips'},
    {id:'mission',type:'brand',name:'Mission',aliases:['mission'],sourceMode:'commercial'},
    {id:'tip-top',type:'brand',name:'Tip Top',aliases:['tip top','tiptop'],sourceMode:'commercial',foodConcept:'bread',foodFamily:'Bread'},
    {id:'sunblest',type:'brand',name:'Sunblest',aliases:['sunblest','sun blest'],sourceMode:'commercial',foodConcept:'bread',foodFamily:'Bread'},
    {id:'country-bake',type:'brand',name:'Country Bake',aliases:['country bake'],sourceMode:'commercial',foodConcept:'bread',foodFamily:'Bread'},
    {id:'arnotts',type:'brand',name:"Arnott's",aliases:['arnotts',"arnott's",'arnott'],sourceMode:'commercial'},
    {id:'nescafe',type:'brand',name:'Nescafé',aliases:['nescafe','nescafé'],sourceMode:'commercial',foodConcept:'coffee',foodFamily:'Coffee'},
    {id:'sanitarium',type:'brand',name:'Sanitarium',aliases:['sanitarium'],sourceMode:'commercial',foodConcept:'cereal',foodFamily:'Breakfast Cereal'},
    {id:'san-remo',type:'brand',name:'San Remo',aliases:['san remo','sanremo'],sourceMode:'commercial',foodConcept:'pasta',foodFamily:'Pasta'},
    {id:'flora',type:'brand',name:'Flora',aliases:['flora','flora proactiv','proactiv'],familyAliases:['flora','flora proactiv','proactiv'],sourceMode:'commercial'},
    {id:'chiko',type:'brand',name:'Chiko',aliases:['chiko','chiko roll'],familyAliases:['chiko'],sourceMode:'commercial'},
    {id:'pepsi',type:'brand',name:'Pepsi',aliases:['pepsi','pepsi max'],sourceMode:'commercial'},
    {id:'black-gold',type:'brand',name:'Black & Gold',aliases:['black and gold','black gold'],sourceMode:'commercial'},
    {id:'westacre',type:'brand',name:'Westacre',aliases:['westacre'],sourceMode:'commercial'},
    {id:'seasons-pride',type:'brand',name:'Seasons Pride',aliases:['seasons pride'],sourceMode:'commercial'},
    {id:'pekish',type:'brand',name:'Pekish',aliases:['pekish','pekish eggs'],sourceMode:'commercial',foodConcept:'egg',foodFamily:'Eggs'},

    // Australian restaurant / takeaway vocabulary. Existing menu tables still
    // provide the actual foods; registry recognition only supplies intent/context.
    {id:'mcdonalds',type:'restaurant',name:"McDonald's",aliases:['mcdonalds',"mcdonald's",'maccas',"macca's",'macca'],sourceMode:'restaurant',route:'restaurant'},
    {id:'kfc',type:'restaurant',name:'KFC',aliases:['kfc','kentucky fried chicken','kentucky'],sourceMode:'restaurant',route:'restaurant'},
    {id:'hungry-jacks',type:'restaurant',name:"Hungry Jack's",aliases:['hungry jacks',"hungry jack's",'hjs',"hj's"],sourceMode:'restaurant',route:'restaurant'},
    {id:'subway',type:'restaurant',name:'Subway',aliases:['subway'],sourceMode:'restaurant',route:'restaurant'},
    {id:'dominos',type:'restaurant',name:"Domino's",aliases:['dominos',"domino's"],sourceMode:'restaurant',route:'restaurant'},
    {id:'red-rooster',type:'restaurant',name:'Red Rooster',aliases:['red rooster'],sourceMode:'restaurant',route:'restaurant'},
    {id:'oporto',type:'restaurant',name:'Oporto',aliases:['oporto'],sourceMode:'restaurant',route:'restaurant'},
    {id:'gyg',type:'restaurant',name:'Guzman y Gomez',aliases:['gyg','guzman y gomez','guzman and gomez'],sourceMode:'restaurant',route:'restaurant'},
    {id:'grilld',type:'restaurant',name:"Grill'd",aliases:['grilld',"grill'd"],sourceMode:'restaurant',route:'restaurant'},
    {id:'chicken-treat',type:'restaurant',name:'Chicken Treat',aliases:['chicken treat'],sourceMode:'restaurant',route:'restaurant'}
  ];

  const ENTRIES=E.map(e=>({...e,market:e.market||'AU',country:e.country||'Australia',aliases:[...new Set([e.name,...(e.aliases||[])])]}));
  function aliasRecords(){
    const out=[];for(const entity of ENTRIES)for(const alias of entity.aliases){const n=norm(alias);if(n)out.push({entity,alias,n,tokenCount:words(alias).length});}
    return out.sort((a,b)=>b.n.length-a.n.length||b.tokenCount-a.tokenCount);
  }
  const ALIASES=aliasRecords();
  // Alpha 0.6.32 stability: entity recognition is queried many times while a
  // search is being ranked. Cache by normalised phrase so one keystroke does
  // not repeatedly rescan every registry alias for every food candidate.
  const IDENTIFY_CACHE=new Map(),PREDICT_CACHE=new Map();
  function remember(map,key,value,limit=180){if(map.has(key))map.delete(key);map.set(key,value);while(map.size>limit)map.delete(map.keys().next().value);return value;}
  function phrasePresentNormalised(hayNorm,phraseNorm){return !!phraseNorm&&` ${hayNorm} `.includes(` ${phraseNorm} `);}
  function identify(text){
    const key=norm(text);if(!key)return[];const hit=IDENTIFY_CACHE.get(key);if(hit)return hit;
    const found=[];
    for(const r of ALIASES){if(!phrasePresentNormalised(key,r.n))continue;if(found.some(x=>x.entity.id===r.entity.id))continue;found.push({entity:r.entity,matchedAlias:r.alias,matchedNorm:r.n});}
    found.sort((a,b)=>b.matchedNorm.length-a.matchedNorm.length);return remember(IDENTIFY_CACHE,key,found);
  }
  function primary(text,types=[]){const matches=identify(text);return matches.find(x=>!types.length||types.includes(x.entity.type))||null;}
  function exactEntity(text,types=[]){const n=norm(text);return ALIASES.find(r=>r.n===n&&(!types.length||types.includes(r.entity.type)))?.entity||null;}
  function predict(text,limit=6){
    const n=norm(text),ws=words(n),last=ws[ws.length-1]||'';if(last.length<3)return[];const cacheKey=`${n}|${limit}`,cached=PREDICT_CACHE.get(cacheKey);if(cached)return cached;const hits=[];
    for(const r of ALIASES){const aw=words(r.n),al=aw[aw.length-1]||'';let score=0;if(r.n===n)score=3000;else if(r.n.startsWith(n))score=2200-n.length;else if(al.startsWith(last))score=1500-last.length;if(score)hits.push({entity:r.entity,alias:r.alias,score});}
    const best=new Map();for(const h of hits){const old=best.get(h.entity.id);if(!old||h.score>old.score)best.set(h.entity.id,h);}
    return remember(PREDICT_CACHE,cacheKey,[...best.values()].sort((a,b)=>b.score-a.score||a.entity.name.localeCompare(b.entity.name)).slice(0,limit));
  }
  function sourceMode(text){return primary(text,['restaurant'])?.entity.sourceMode||primary(text,['retailer','brand'])?.entity.sourceMode||'';}
  function foodConcept(text){return primary(text,['brand'])?.entity.foodConcept||'';}
  function stripRecognisedEntities(text){
    let out=norm(text);for(const m of identify(text)){const re=new RegExp(`(?:^|\\s)${m.matchedNorm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`,'g');out=out.replace(re,' ');}return out.replace(/\s+/g,' ').trim();
  }
  function entityMatchesHay(entity,hay){const h=` ${norm(hay)} `;return entity.aliases.some(a=>h.includes(` ${norm(a)} `));}
  function canonicalSearchText(text){let out=norm(text);for(const m of identify(text)){const canonical=norm(m.entity.name);if(canonical!==m.matchedNorm){const re=new RegExp(`(?:^|\\s)${m.matchedNorm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`,'g');out=out.replace(re,` ${canonical}`);}}return out.replace(/\s+/g,' ').trim();}

  const api={version:VERSION,entries:ENTRIES,norm,identify,primary,exactEntity,predict,sourceMode,foodConcept,stripRecognisedEntities,entityMatchesHay,canonicalSearchText};
  global.HECAustralianEntityRegistry=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
