/* Healthy Eating Companion — Australian Food Catalogue Foundation 0.6.32
   Pure catalogue identity, ranking, de-duplication and provenance utilities.
   UI and persistence stay in alpha06.js; query parsing stays in
   search-foundation.js. No nutrition values are created here.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const RECORD_TYPES=Object.freeze({
    AFCD:'afcd',FOOD_SOURCE:'food-source',PACKAGED:'packaged',PRIVATE:'private',RECIPE:'recipe',ONLINE:'online-candidate',LOCAL:'local'
  });
  const CONTROLLED_TYPOS=Object.freeze({
    capuccino:'cappuccino',cappucino:'cappuccino',cappacino:'cappuccino',
    sausuage:'sausage',sausge:'sausage',potatoe:'potato',chicko:'chiko',chico:'chiko'
  });
  // These are explicit Australian food-language equivalences, not general fuzzy
  // guesses. A bare "scallop" or "chips" is intentionally never rewritten.
  const AUSTRALIAN_ALIASES=Object.freeze([
    {phrase:'potato scallop',alternates:['potato cake','potato fritter']},
    {phrase:'sausage sizzle',alternates:['bunnings sausage','bunnings snag']},
    {phrase:'bunnings sausage',alternates:['sausage sizzle','bunnings snag']},
    {phrase:'bunnings snag',alternates:['sausage sizzle','bunnings sausage']},
    {phrase:'snag',alternates:['sausage']},
    {phrase:'corn chips',alternates:['tortilla chips']},
    {phrase:'cappuccino sachet',alternates:['instant cappuccino sachet']},
    {phrase:'toast',alternates:['toasted bread']},
    {phrase:'hot chips',alternates:['hot potato chips','french fries']},
    {phrase:'potato chips',alternates:['potato crisps']}
  ]);

  function norm(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function tokens(value){return norm(value).split(' ').filter(Boolean);}
  function corrected(value){return tokens(value).map(token=>CONTROLLED_TYPOS[token]||token).join(' ');}
  function phrasePresent(hay,phrase){return !!phrase&&` ${norm(hay)} `.includes(` ${norm(phrase)} `);}
  function hasEnergy(food){const value=food?.nutrients?.calories;return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));}
  function sourceText(food){return norm(`${food?.source||''} ${food?.category||''}`);}

  function recordType(food){
    if(food?.foodSourceId||food?.recordType===RECORD_TYPES.FOOD_SOURCE)return RECORD_TYPES.FOOD_SOURCE;
    if(food?.afcd||food?.afcdKey||/australian food composition database|\bafcd\b/.test(sourceText(food)))return RECORD_TYPES.AFCD;
    if(food?.category==='Recipe'||food?.brand==='My Recipe'||food?.recipeId)return RECORD_TYPES.RECIPE;
    if(food?.source==='User Created'||food?.private===true)return RECORD_TYPES.PRIVATE;
    if(/open food facts|fooddata central|online product|online candidate/.test(sourceText(food)))return RECORD_TYPES.ONLINE;
    if(food?.barcode||/package|packaged|nutrition panel|product data/.test(sourceText(food)))return RECORD_TYPES.PACKAGED;
    return RECORD_TYPES.LOCAL;
  }
  function marketFor(food){if(food?.market)return String(food.market);if(/australia/i.test(String(food?.country||'')))return 'AU';return String(food?.country||'').trim()||'unknown';}
  function sourceIdFor(food){return String(food?.sourceId||food?.afcdKey||food?.barcode||food?.recipeId||food?.id||'').trim();}
  function preparationKey(food){return norm(food?.preparation||food?.prep||food?.guidedSelections?.prep||food?.variantSelections?.prep||'');}
  function canonicalKey(food){
    const kind=recordType(food),sourceId=sourceIdFor(food);
    if(kind===RECORD_TYPES.FOOD_SOURCE&&food?.foodSourceId&&food?.sourceItemId)return `food-source:${food.foodSourceId}:${food.sourceItemId}${food?.sourceVariantId?`:${food.sourceVariantId}`:''}`;
    if(kind===RECORD_TYPES.AFCD&&sourceId)return `afcd:${sourceId}`;
    if(food?.barcode)return `barcode:${String(food.barcode).replace(/\D/g,'')}`;
    if([RECORD_TYPES.PRIVATE,RECORD_TYPES.RECIPE].includes(kind)&&sourceId)return `${kind}:${sourceId}`;
    const identity=[kind,norm(food?.brand),norm(food?.name),preparationKey(food),norm(food?.serving)].join('|');
    return identity||`${kind}:${sourceId}`;
  }
  function normaliseRecord(food){
    if(!food)return null;const type=recordType(food),sourceId=sourceIdFor(food);
    return {...food,canonicalId:food.canonicalId||canonicalKey(food),recordType:type,sourceId,market:marketFor(food),country:food.country||((marketFor(food)==='AU')?'Australia':''),verificationStatus:food.verificationStatus||(food.verified?'verified':'unverified')};
  }

  function australianAlternates(query){
    const q=norm(query),out=[];
    for(const item of AUSTRALIAN_ALIASES){
      if(q===item.phrase||phrasePresent(q,item.phrase))for(const alt of item.alternates)out.push(q.replace(item.phrase,alt));
      if(item.alternates.includes(q))out.push(item.phrase);
    }
    return [...new Set(out.map(norm).filter(Boolean))];
  }
  function fields(food){
    return [
      food?.name,food?.brand,`${food?.brand||''} ${food?.name||''}`,...(food?.aliases||[]),
      food?.sourceDisplayName,...(food?.sourceAliases||[]),
      food?.familyName,food?.variantLabel,...(food?.categoryMemberships||[]),
      food?.retailer,food?.sourceContext,food?.serving,food?.packageServingText,
      ...Object.values(food?.unitLabels||{})
    ].map(norm).filter(Boolean);
  }
  function exactTokenSetMatch(queryTokens,fieldValues){const set=new Set(fieldValues.flatMap(tokens));return queryTokens.length>0&&queryTokens.every(token=>set.has(token));}
  function prefixTokenMatch(queryTokens,fieldValues){const all=fieldValues.flatMap(tokens);return queryTokens.length>0&&queryTokens.every(token=>token.length>=3&&all.some(value=>value.startsWith(token)));}
  function rank(food,query,{saved=false,locallyVerified=false}={}){
    const raw=norm(query);if(!raw)return {score:100,tier:'browse'};
    const q=corrected(raw),values=fields(food),name=norm(food?.name),brand=norm(food?.brand),aliases=(food?.aliases||[]).map(norm),sourceAliases=[food?.sourceDisplayName,...(food?.sourceAliases||[])].map(norm).filter(Boolean),combined=norm(`${food?.brand||''} ${food?.name||''}`),qt=tokens(q);
    const typoCorrected=q!==raw;let score=0,tier='none';
    if(!typoCorrected&&(name===q||combined===q)){score=1600;tier='exact-name';}
    else if(!typoCorrected&&aliases.includes(q)){score=1500;tier='exact-alias';}
    else if(!typoCorrected&&sourceAliases.includes(q)){score=1480;tier='exact-source-alias';}
    else if(!typoCorrected&&brand===q){score=1450;tier='exact-brand';}
    else if(!typoCorrected&&exactTokenSetMatch(qt,values)){score=1320+qt.length;tier='all-tokens';}
    else {
      const alternate=australianAlternates(q).find(value=>{const at=tokens(value);return values.includes(value)||exactTokenSetMatch(at,values);});
      if(alternate){score=1180+toksafe(alternate);tier='australian-alias';}
      else if(typoCorrected&&(values.includes(q)||exactTokenSetMatch(qt,values))){score=1020;tier='controlled-typo';}
      else if(name.startsWith(`${q} `)||combined.startsWith(`${q} `)||aliases.some(a=>a.startsWith(`${q} `))){score=900;tier='prefix';}
      else if(prefixTokenMatch(qt,values)){score=820+qt.length;tier='token-prefix';}
      else if(q.length>=4&&(name.includes(q)||aliases.some(a=>a.includes(q)))){score=700;tier='broader';}
    }
    if(!score)return {score:0,tier};
    const type=recordType(food);if(saved)score+=120;if(locallyVerified||food?.verified)score+=70;if(marketFor(food)==='AU')score+=35;if(type===RECORD_TYPES.AFCD)score+=25;
    return {score,tier,query:q};
  }
  function toksafe(value){return Math.min(20,tokens(value).length);}
  function quality(food){let score=0;if(food?.verified)score+=100;if(marketFor(food)==='AU')score+=25;if(hasEnergy(food))score+=20;const type=recordType(food);if(type===RECORD_TYPES.FOOD_SOURCE)score+=20;if(type===RECORD_TYPES.AFCD)score+=15;if(type===RECORD_TYPES.LOCAL||type===RECORD_TYPES.PRIVATE)score+=8;return score;}
  function dedupe(records){
    const best=new Map(),order=[];
    for(const food of records||[]){if(!food)continue;const key=canonicalKey(food);if(!best.has(key)){best.set(key,food);order.push(key);}else if(quality(food)>quality(best.get(key)))best.set(key,food);}
    return order.map(key=>best.get(key));
  }
  function dedupeRanked(items){
    const best=new Map(),order=[];
    for(const item of items||[]){if(!item?.food)continue;const key=canonicalKey(item.food),old=best.get(key);if(!old){best.set(key,item);order.push(key);}else if(Number(item.rank)>Number(old.rank)||(Number(item.rank)===Number(old.rank)&&quality(item.food)>quality(old.food)))best.set(key,item);}
    return order.map(key=>best.get(key));
  }
  function provenance(food){
    const type=recordType(food),verified=food?.verified||food?.verificationStatus==='verified';
    if(type===RECORD_TYPES.FOOD_SOURCE)return {label:food?.sourceDisplayName||food?.brand||'Official Food Source',detail:food?.source||food?.sourceUrl||'Official source catalogue',verified:true};
    if(type===RECORD_TYPES.AFCD)return {label:'Australian AFCD',detail:food?.source||'Food Standards Australia New Zealand · AFCD',verified:true};
    if(type===RECORD_TYPES.PRIVATE)return {label:'My Food',detail:'Private food saved on this device',verified:false};
    if(type===RECORD_TYPES.RECIPE)return {label:'My Recipe',detail:'Nutrition calculated from saved ingredient snapshots',verified:false};
    if(type===RECORD_TYPES.ONLINE)return {label:'Online Candidate',detail:food?.source||'Online product data · check the current package',verified:!!verified};
    if(type===RECORD_TYPES.PACKAGED)return {label:verified?'Verified Packaged Food':'Packaged Food',detail:food?.source||'Check the current package',verified:!!verified};
    return {label:verified?'Verified Food':'Food Record',detail:food?.source||'Source not supplied',verified:!!verified};
  }
  function canLog(food){return food?.loggable!==false&&food?.nutritionStatus!=='unavailable'&&food?.nutritionStatus!=='configurable'&&hasEnergy(food)&&food?.verificationStatus!=='recognised-only'&&food?.recognisedOnly!==true;}
  function newSearchState(){return {query:'',tab:'all',revision:0,snapshot:null};}
  function beginSearch(state={},context={}){return {...newSearchState(),...state,query:'',tab:context.tab||'all',revision:Number(state.revision||0)+1,snapshot:null};}
  function rememberSearch(state={},view={}){return {...state,snapshot:{query:String(view.query||''),tab:view.tab||'all',scrollY:Number(view.scrollY||0)}};}
  function restoreSearch(state={}){return state.snapshot?{...state,...state.snapshot}:{...state};}

  const api={version:VERSION,recordTypes:RECORD_TYPES,controlledTypos:CONTROLLED_TYPOS,australianAliases:AUSTRALIAN_ALIASES,norm,tokens,corrected,australianAlternates,recordType,marketFor,sourceIdFor,canonicalKey,normaliseRecord,rank,dedupe,dedupeRanked,provenance,hasEnergy,canLog,newSearchState,beginSearch,rememberSearch,restoreSearch};
  global.HECFoodCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
