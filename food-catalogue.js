/* Healthy Eating Companion — Australian Food Catalogue Foundation 0.6.32
   Pure catalogue identity, ranking, de-duplication and provenance utilities.
   UI and persistence stay in alpha06.js; query parsing stays in
   search-foundation.js. No nutrition values are created here.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const SEM=global.HECProductServingSemantics||(typeof require==='function'?require('./product-serving-semantics.js'):null);
  const RECORD_TYPES=Object.freeze({
    AFCD:'afcd',FOOD_SOURCE:'food-source',PACKAGED:'packaged',PRIVATE:'private',RECIPE:'recipe',ONLINE:'online-candidate',LOCAL:'local'
  });
  const CONTROLLED_TYPOS=Object.freeze({
    capuccino:'cappuccino',cappucino:'cappuccino',cappacino:'cappuccino',
    sausuage:'sausage',sausge:'sausage',potatoe:'potato',chicko:'chiko',chico:'chiko',chicco:'chiko',cheeko:'chiko',
    breaky:'brekkie',breakie:'brekkie',megga:'mega'
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
    if(Object.values(RECORD_TYPES).includes(food?.recordType))return food.recordType;
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
  function boundedEditDistance(left,right,limit=2){
    const a=norm(left),b=norm(right),max=Math.max(0,Number(limit)||0);if(Math.abs(a.length-b.length)>max)return max+1;
    let previous=Array.from({length:b.length+1},(_,index)=>index);
    for(let i=1;i<=a.length;i++){
      const current=[i];let rowMin=i;
      for(let j=1;j<=b.length;j++){current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));rowMin=Math.min(rowMin,current[j]);}
      if(rowMin>max)return max+1;previous=current;
    }
    return previous[b.length];
  }
  function conservativeProductVariant(food,query){
    const q=tokens(query),identity=norm(`${food?.brand||''} ${food?.name||''}`),aliases=(food?.aliases||[]).map(norm);
    if(/\bchiko roll\b/.test(identity)||aliases.includes('chiko roll')){
      if(q.length===2&&boundedEditDistance(q[0],'chiko',2)<=2&&boundedEditDistance(q[1],'roll',1)<=1&&!/^chicken/.test(q[0]))return true;
    }
    if(/\bflora proactiv light\b/.test(identity)||aliases.includes('flora proactiv light')){
      if(q.length>=3&&q.length<=4&&q[0]==='flora'&&boundedEditDistance(q[q.length-1],'light',1)<=1&&boundedEditDistance(q.slice(1,-1).join(''),'proactiv',2)<=2)return true;
    }
    return false;
  }
  function friesIntent(query){
    const q=norm(query),generic=/^(?:(?:small|medium|large|regular|extra large)\s+)?(?:fries|french fries|hot chips)$/.test(q);
    return {generic,query:q,base:q.replace(/^(?:small|medium|large|regular|extra large)\s+/,'').replace(/^french fries$/,'fries').replace(/^hot chips$/,'fries')};
  }
  function displayQuantity(value,{maxDecimals=3,tolerance=1e-9}={}){
    const amount=Number(value);if(!Number.isFinite(amount))return String(value??'');
    const integer=Math.round(amount),scale=Math.max(1,Math.abs(amount));if(Math.abs(amount-integer)<=tolerance*scale)return String(integer);
    const places=Math.max(0,Math.min(8,Number(maxDecimals)||0)),factor=10**places,rounded=Math.round((amount+Number.EPSILON)*factor)/factor;
    return rounded.toFixed(places).replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1');
  }
  function explicitlyNamesSource(food,query){
    const q=` ${norm(query)} `,phrases=[food?.brand,food?.sourceDisplayName,...(food?.sourceAliases||[])].map(norm).filter(value=>value.length>2);
    if(/\b(?:maccas?|mcdonalds|mc donalds)\b/.test(norm(query))&&food?.foodSourceId==='mcdonalds-au')return true;
    return phrases.some(phrase=>q.includes(` ${phrase} `));
  }
  function genericFriesRecord(food){
    const text=norm(`${food?.name||''} ${(food?.aliases||[]).join(' ')} ${food?.category||''} ${food?.sourceContext||''}`);
    return /\bfries\b/.test(text)||(/\bchips\b/.test(text)&&/\b(?:potato|hot|fast food|takeaway|deep fried)\b/.test(text));
  }
  function genericFriesCandidates(records){
    return dedupe((records||[]).filter(food=>recordType(food)===RECORD_TYPES.AFCD&&marketFor(food)==='AU'&&/^potato (?:chips regular|fries)\b/.test(norm(food?.name||''))));
  }
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
      else if(conservativeProductVariant(food,raw)){score=1100;tier='conservative-product-variant';}
      else if(name.startsWith(`${q} `)||combined.startsWith(`${q} `)||aliases.some(a=>a.startsWith(`${q} `))){score=900;tier='prefix';}
      else if(prefixTokenMatch(qt,values)){score=820+qt.length;tier='token-prefix';}
      else if(q.length>=4&&(name.includes(q)||aliases.some(a=>a.includes(q)))){score=700;tier='broader';}
    }
    const fries=friesIntent(query),explicitSource=explicitlyNamesSource(food,query);
    if(fries.generic&&!explicitSource&&genericFriesRecord(food)){
      const baseValues=fields(food),baseTokens=tokens(fries.base),baseMatch=baseValues.includes(fries.base)||exactTokenSetMatch(baseTokens,baseValues)||baseValues.some(value=>value.includes(fries.base));
      if(baseMatch){const type=recordType(food),australian=marketFor(food)==='AU',generic=type===RECORD_TYPES.AFCD||(!food?.brand&&!food?.foodSourceId);score=Math.max(score,generic&&australian?1800:australian?1350:760);tier=generic&&australian?'generic-au-fries':australian?'australian-fries':'generic-fries';}
    }
    if(!score)return {score:0,tier};
    const relationship=SEM?.rankAdjustment?.(food,q)||{adjustment:0,intent:'neutral'};score=Math.max(1,score+Number(relationship.adjustment||0));
    const type=recordType(food);if(saved)score+=120;if(locallyVerified||food?.verified)score+=70;if(marketFor(food)==='AU')score+=35;if(type===RECORD_TYPES.AFCD)score+=25;
    if(fries.generic&&!explicitSource&&marketFor(food)!=='AU'&&(food?.brand||[RECORD_TYPES.FOOD_SOURCE,RECORD_TYPES.ONLINE,RECORD_TYPES.PACKAGED].includes(type)))score=Math.min(score,780);
    return {score,tier,query:q,relationshipIntent:relationship.intent};
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
  function resolvedIdentityKey(food){
    return [norm(food?.brand),norm(food?.name),norm(food?.serving),String(food?.defaultAmount??''),norm(food?.defaultUnit),String(food?.nutrients?.calories??'')].join('|');
  }
  function authoritativePackagedRecord(food){return recordType(food)===RECORD_TYPES.PACKAGED&&marketFor(food)==='AU'&&(food?.verified||food?.verificationStatus==='verified');}
  function sameNamedProduct(authority,candidate){
    if(!authority||!candidate||canonicalKey(authority)===canonicalKey(candidate))return false;
    const authorityNames=new Set([authority.name,`${authority.brand||''} ${authority.name||''}`,...(authority.aliases||[])].map(norm).filter(Boolean));
    const candidateNames=[candidate.name,`${candidate.brand||''} ${candidate.name||''}`,...(candidate.aliases||[])].map(norm).filter(Boolean);
    const authorityBrand=norm(authority.brand),candidateBrand=norm(candidate.brand);if(authorityBrand&&candidateBrand&&authorityBrand!==candidateBrand)return false;
    return candidateNames.some(value=>authorityNames.has(value));
  }
  function partitionSearchRecords(records){
    const list=dedupe(records||[]),authorities=list.filter(authoritativePackagedRecord),legacy=[],legacyKeys=new Set();
    for(const food of list){
      if(authoritativePackagedRecord(food))continue;const authority=authorities.find(item=>sameNamedProduct(item,food));if(!authority)continue;
      legacy.push({food,authority,reason:'A verified Australian product record supersedes this cached or legacy match.'});legacyKeys.add(canonicalKey(food));
    }
    return {primary:list.filter(food=>!legacyKeys.has(canonicalKey(food))),legacy};
  }
  function mcDonaldsFriesSizes(records,query){
    const q=corrected(query),namesSource=/\b(?:maccas?|mcdonalds|mc donalds)\b/.test(q),namesFries=/\b(?:fries|french fries)\b/.test(q),size=q.match(/\b(small|medium|large)\b/)?.[1]||'';
    if(!namesSource||!namesFries)return null;
    const choices=(records||[]).filter(food=>food?.foodSourceId==='mcdonalds-au'&&/\bfries\b/.test(norm(food.name))).sort((a,b)=>['small','medium','large'].indexOf(norm(a.name).split(' ')[0])-['small','medium','large'].indexOf(norm(b.name).split(' ')[0]));
    return choices.length>1?{size,choices}:null;
  }
  function resolve(records,query,{minScore=1000,allowTiers=['exact-name','exact-alias','all-tokens','australian-alias','controlled-typo','conservative-product-variant']}={}){
    const raw=String(query||'').trim();if(!raw)return {status:'none',food:null,candidates:[],query:'',correctedQuery:''};
    const fries=mcDonaldsFriesSizes(records,raw);
    if(fries&&!fries.size)return {status:'ambiguous',food:null,candidates:fries.choices,query:raw,correctedQuery:corrected(raw),reason:'Which McDonald’s fries size: Small, Medium or Large?'};
    const allowed=new Set(allowTiers),ranked=dedupeRanked((records||[]).map(food=>{const result=rank(food,raw);return {food,rank:result.score,result};}).filter(item=>item.rank>=minScore&&allowed.has(item.result.tier))).sort((a,b)=>b.rank-a.rank||quality(b.food)-quality(a.food)||norm(a.food.name).localeCompare(norm(b.food.name)));
    if(!ranked.length)return {status:'none',food:null,candidates:[],query:raw,correctedQuery:corrected(raw)};
    const first=ranked[0],firstIdentity=resolvedIdentityKey(first.food),credible=ranked.filter(item=>item.rank===first.rank&&canonicalKey(item.food)!==canonicalKey(first.food)&&resolvedIdentityKey(item.food)!==firstIdentity);
    if(credible.length)return {status:'ambiguous',food:null,candidates:[first,...credible].map(item=>item.food),query:raw,correctedQuery:corrected(raw),reason:`Several foods match “${raw}”. Choose the exact one.`};
    return {status:'exact',food:first.food,candidates:[first.food],rank:first.rank,tier:first.result.tier,query:raw,correctedQuery:corrected(raw)};
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
  function canLog(food){const policy=SEM?.servingPolicy?.(food);return policy?.loggable!==false&&food?.loggable!==false&&food?.nutritionStatus!=='unavailable'&&food?.nutritionStatus!=='configurable'&&hasEnergy(food)&&food?.verificationStatus!=='recognised-only'&&food?.recognisedOnly!==true;}
  function quickAddPolicy(food,{date='',meal='',sourceTrusted=false,safetyBlocked=false}={}){
    const policy=SEM?.servingPolicy?.(food),unit=String(policy?.defaultUnit||food?.defaultUnit||''),amount=Number(policy?.defaultAmount??food?.defaultAmount),units=policy?.units||food?.units||{},natural=!!unit&&Number.isFinite(amount)&&amount>0&&units[unit]!==undefined&&!['g','mL'].includes(unit);let reason='';
    if(!food)reason='identity';else if(!date||!meal)reason='destination';else if(!canLog(food))reason='nutrition';else if(!natural)reason='serving';else if(!sourceTrusted)reason='source';else if(safetyBlocked)reason='safety';return {ready:!reason,reason,amount,unit,date,meal};
  }
  function fullReviewPolicy(food,{safetyBlocked=false}={}){
    const policy=SEM?.servingPolicy?.(food),rawAmount=Number(policy?.defaultAmount??food?.defaultAmount),amount=Number.isFinite(rawAmount)&&rawAmount>0?rawAmount:1,unit=String(policy?.defaultUnit||food?.defaultUnit||'');let reason='';
    if(!food)reason='identity';else if(!canLog(food))reason='nutrition';else if(safetyBlocked)reason='safety';else if(!unit||(food?.units||{})[unit]===undefined)reason='unit';return {ready:!reason,reason,amount,unit};
  }
  function newSearchState(){return {query:'',tab:'all',revision:0,snapshot:null};}
  function beginSearch(state={},context={}){return {...newSearchState(),...state,query:'',tab:context.tab||'all',revision:Number(state.revision||0)+1,snapshot:null};}
  function rememberSearch(state={},view={}){return {...state,snapshot:{query:String(view.query||''),tab:view.tab||'all',scrollY:Number(view.scrollY||0)}};}
  function restoreSearch(state={}){return state.snapshot?{...state,...state.snapshot}:{...state};}
  function transitionSearch(state={},nextQuery='',context={}){
    const previous=corrected(state.query||''),query=String(nextQuery||''),next=corrected(query),changed=previous!==next,blank=!next;
    return {...newSearchState(),...state,query,tab:context.tab||state.tab||'all',revision:Number(state.revision||0)+(changed?1:0),snapshot:(changed||blank)?null:state.snapshot,pendingDrink:(changed||blank)?null:(context.pendingDrink??state.pendingDrink??null),sourceIntent:(changed||blank)?'':(state.sourceIntent||'')};
  }
  function naturalQuantityWarning(food,amount,unit){
    const quantity=Number(amount);if(!Number.isFinite(quantity)||quantity<=0)return {level:'invalid',requiresConfirmation:false,message:'Enter an amount greater than zero.'};
    const natural=String(unit||food?.defaultUnit||''),limits={burger:10,muffin:10,wrap:10,drink:12,portion:20,serve:20,sundae:10,mcflurry:10,cone:10,pie:10,item:20,meal:6},limit=limits[natural]||(['mL','g'].includes(natural)?10000:50);
    if(quantity<=limit)return {level:'normal',requiresConfirmation:false,message:''};
    const label=food?.unitLabels?.[natural]||natural||'servings';return {level:'implausible',requiresConfirmation:true,message:`${quantity} ${label} is much larger than a usual logging amount. Check whether you meant the natural serving, grams or millilitres before continuing.`};
  }

  const api={version:VERSION,recordTypes:RECORD_TYPES,controlledTypos:CONTROLLED_TYPOS,australianAliases:AUSTRALIAN_ALIASES,norm,tokens,corrected,australianAlternates,recordType,marketFor,sourceIdFor,canonicalKey,normaliseRecord,friesIntent,genericFriesCandidates,displayQuantity,rank,dedupe,dedupeRanked,resolve,partitionSearchRecords,provenance,hasEnergy,canLog,quickAddPolicy,fullReviewPolicy,newSearchState,beginSearch,rememberSearch,restoreSearch,transitionSearch,naturalQuantityWarning};
  global.HECFoodCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
