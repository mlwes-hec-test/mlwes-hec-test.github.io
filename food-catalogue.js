/* Healthy Eating Companion — Australian Food Catalogue Foundation 0.6.32
   Pure catalogue identity, ranking, de-duplication and provenance utilities.
   UI and persistence stay in alpha06.js; query parsing stays in
   search-foundation.js. No nutrition values are created here.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const SEARCH=global.HECSearchFoundation||(typeof require==='function'?require('./search-foundation.js'):null);
  const SEM=global.HECProductServingSemantics||(typeof require==='function'?require('./product-serving-semantics.js'):null);
  const REG=global.HECAustralianEntityRegistry||(typeof require==='function'?require('./entity-registry.js'):null);
  const RECORD_TYPES=Object.freeze({
    AFCD:'afcd',FOOD_SOURCE:'food-source',PACKAGED:'packaged',EXTERNAL:'external-catalogue',PRIVATE:'private',RECIPE:'recipe',ONLINE:'online-candidate',LOCAL:'local'
  });
  const SOURCE_TIERS=Object.freeze({AUTHORITATIVE_LOCAL:1,AUSTRALIAN_CATALOGUE:2,SAVED_EXACT:3,BROADER_ONLINE:4,FOREIGN_FALLBACK:5});
  const PRODUCT_QUALITY=Object.freeze({HIGH:'high-quality-exact-product',INCOMPLETE:'exact-but-incomplete',WEAK:'weak-name',BRAND_REFERENCE:'brand-reference',BARCODE_ONLY:'barcode-only',FOREIGN:'foreign-low-local-relevance'});
  const WEAK_IDENTITY_LABELS=new Set(['butter','margarine','milk','spread','spreads','beurre','product','products','food','foods','other product','other products','fat','fats','dairy','dairies','dairy substitute','dairy substitutes']);
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
  function corrected(value){const normal=SEARCH?.normaliseIntent?SEARCH.normaliseIntent(value):norm(value);return tokens(normal).map(token=>CONTROLLED_TYPOS[token]||token).join(' ');}
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
    if(food?.canonicalId)return String(food.canonicalId);
    if(sourceId)return `${kind}:record:${sourceId}${preparationKey(food)?':'+preparationKey(food):''}`;
    const identity=[kind,norm(food?.brand),norm(food?.name),preparationKey(food),norm(food?.serving)].join('|');
    return identity||`${kind}:${sourceId}`;
  }
  function normaliseRecord(food){
    if(!food)return null;const type=recordType(food),sourceId=sourceIdFor(food);
    return {...food,canonicalId:food.canonicalId||canonicalKey(food),recordType:type,sourceId,market:marketFor(food),country:food.country||((marketFor(food)==='AU')?'Australia':''),verificationStatus:food.verificationStatus||(food.verified?'verified':'unverified')};
  }

  // One derived identity/provenance contract. Raw source snapshots are never
  // changed here. Unknown dates, pack sizes and current status stay unknown.
  const TRUST_CLASSES=Object.freeze({'official-au-manufacturer':1,'official-au-restaurant':1,'official-au-retailer':2,'package-verified-au':3,'open-food-facts-au':4,'generic-composition':0,'user-record':5,'candidate':6,'unknown':7});
  const brandKey=value=>REG.brandSearchKey(value);
  const brandDirectory=new Map();
  function registerBrandDirectory(entries){queryIntentCache.clear();for(const entry of entries||[]){if(!entry?.name)continue;const key=brandKey(entry.name);brandDirectory.set(key,{id:key,key,name:entry.name,type:'brand',aliases:entry.aliases||[entry.name],count:Number(entry.count)||0,market:'AU',sourceMode:'commercial'});}return brandDirectory.size;}
  function brandIdentity(query){
    const q=norm(query),concept=SEARCH?.conceptFromQuery?.(query);
    if(concept&&((concept.aliases||[]).some(alias=>norm(alias)===q)||SEARCH.interpretFoodIntent(query).generic))return null;
    return brandDirectory.get(brandKey(query))||null;
  }
  function brandPrefix(query){const words=REG.brandSearchText(query).split(' ').filter(Boolean);for(let length=words.length-1;length>0;length--){const entity=brandIdentity(words.slice(0,length).join(' '));if(entity)return {entity,residual:words.slice(length).join(' ')};}return null;}
  function sourceEvidence(food){
    const type=recordType(food),declared=food?.sourceProvenance||{},url=declared.url||food?.sourceUrl||food?.provenance?.url||'',au=marketFor(food)==='AU';
    let trustClass=declared.trustClass||'unknown';
    if(type===RECORD_TYPES.ONLINE)trustClass='candidate';
    else if(type===RECORD_TYPES.EXTERNAL)trustClass='open-food-facts-au';
    else if(type===RECORD_TYPES.AFCD)trustClass='generic-composition';
    else if([RECORD_TYPES.PRIVATE,RECORD_TYPES.RECIPE].includes(type))trustClass='user-record';
    else if(trustClass==='unknown'&&au&&food?.verified===true&&type===RECORD_TYPES.FOOD_SOURCE&&url)trustClass='official-au-restaurant';
    else if(trustClass==='unknown'&&au&&food?.verified===true&&type===RECORD_TYPES.PACKAGED&&url&&/^Official /i.test(food?.source||''))trustClass='official-au-manufacturer';
    else if(trustClass==='unknown'&&au&&food?.verified===true&&type===RECORD_TYPES.PACKAGED)trustClass='package-verified-au';
    if(!(trustClass in TRUST_CLASSES))trustClass='unknown';
    return {sourceId:declared.sourceId||food?.foodSourceId||food?.sourceCatalogueId||sourceIdFor(food),recordId:declared.recordId||food?.sourceItemId||sourceIdFor(food),url,trustClass,trustRank:TRUST_CLASSES[trustClass],retrievedAt:declared.retrievedAt||null,verifiedAt:declared.verifiedAt||food?.sourceLastCheckedDate||null,publishedDate:declared.publishedDate||null,page:declared.page||null,sha256:declared.sha256||null,market:marketFor(food),sourceType:declared.sourceType||food?.sourceType||type};
  }
  function metricEvidence(value){
    if(value&&typeof value==='object'&&Number(value.amount)>0&&['g','mL'].includes(value.unit))return {amount:Number(value.amount),unit:value.unit};
    const match=String(value||'').match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i);if(!match)return null;
    return {amount:Number(match[1])*(/^(kg|l)$/i.test(match[2])?1000:1),unit:/^(ml|l)$/i.test(match[2])?'mL':'g'};
  }
  function sourceConflicts(food){
    const conflicts=[...(food?.evidenceConflicts||[])],serve=metricEvidence(food?.manufacturerServing),pack=metricEvidence(food?.pack||food?.packageSize||food?.quantity||food?.packSize),count=Number(food?.servingsPerPack),per100=food?.nutritionPer100||{},perServe=food?.nutritionPerServing||{};
    if(serve&&pack&&serve.unit===pack.unit){
      if(serve.amount>pack.amount+1)conflicts.push({code:'serving-exceeds-pack',field:'serving',severity:'material',evidence:{serve,pack}});
      if(count>0&&Math.abs(serve.amount*count-pack.amount)>Math.max(1,pack.amount*.03))conflicts.push({code:'pack-serving-count-conflict',field:'serving',severity:'material',evidence:{serve,pack,count}});
    }
    if(serve)for(const key of ['energyKj','protein','fat','satFat','carbs','sugar','sodium']){
      const a=per100[key],b=perServe[key];if(a==null||b==null)continue;
      const expected=Number(a)*serve.amount/100,actual=Number(b),tolerance=key==='energyKj'?10:key==='sodium'?5:.15;
      if(Math.abs(expected-actual)>Math.max(tolerance,Math.max(expected,actual)*.08))conflicts.push({code:'nutrition-serving-basis-conflict',field:'nutrition',nutrient:key,severity:'material',evidence:{per100:a,perServing:b,serve,expected}});
    }
    for(const [basis,values] of [['per100',per100],['perServing',perServe]]){
      for(const [key,value] of Object.entries(values)){if(value!=null&&(!Number.isFinite(Number(value))||Number(value)<0))conflicts.push({code:'invalid-nutrient-value',field:'nutrition',severity:'material',evidence:{basis,key,value}});}
      for(const [part,total] of [['sugar','carbs'],['satFat','fat']])if(values[part]!=null&&values[total]!=null&&Number(values[part])>Number(values[total])+.2)conflicts.push({code:'nutrient-component-exceeds-total',field:'nutrition',severity:'material',evidence:{basis,part,total,partValue:values[part],totalValue:values[total]}});
    }
    return [...new Map(conflicts.map(value=>[JSON.stringify(value),value])).values()];
  }
  function productEligibility(food,{candidates=[],profile=null}={}){
    const identity=food?canonicalKey(food):null,evidence=sourceEvidence(food),central=servingFoundation(),base=central?.evaluateAddability?central.evaluateAddability(food,{profile}):{status:food&&hasEnergy(food)?'loggable-now':'details-only',normalLoggingAllowed:!!food&&hasEnergy(food)},quality=exactProductQuality(food,{candidates}),conflicts=sourceConflicts(food);
    let decision=base;
    if(conflicts.some(item=>item.severity==='material'&&(!item.resolution||item.resolution==='unresolved')))decision={status:'needs-nutrition-completion',label:'Needs Nutrition Completion',reasonCode:'source-conflict',message:'Published serving or nutrition evidence disagrees. Review the source evidence before logging.',actions:[{id:'complete',label:'Complete Nutrition'}],normalLoggingAllowed:false};
    const product=[RECORD_TYPES.PACKAGED,RECORD_TYPES.EXTERNAL,RECORD_TYPES.ONLINE,RECORD_TYPES.FOOD_SOURCE].includes(recordType(food));
    if(product&&base.normalLoggingAllowed&&!quality.exactEligible)decision={status:'details-only',label:'Details only',reasonCode:`identity-${quality.reason}`,message:'This record needs a specific product identity.',actions:[{id:'details',label:'View Details'}],normalLoggingAllowed:false};
    if(food?.legacyPreviewOnly||food?.itemStatus==='retired')decision={status:'details-only',label:'Details only',reasonCode:food?.legacyPreviewOnly?'legacy-preview-identity':'retired-product',actions:[{id:'details',label:'View Details'}],normalLoggingAllowed:false};
    if(food?.catalogueEligibility?.normalLoggingAllowed===false&&![RECORD_TYPES.PRIVATE,RECORD_TYPES.RECIPE].includes(recordType(food)))decision=food.catalogueEligibility;
    const verified=['official-au-manufacturer','official-au-restaurant','official-au-retailer','package-verified-au'].includes(evidence.trustClass),candidate=evidence.trustClass==='candidate';
    return {canonicalId:identity,exists:!!food&&!!identity,verificationStatus:verified?'verified':candidate?'candidate':evidence.trustClass==='open-food-facts-au'?'catalogued-community':'unverified',verified,candidate,identityQuality:quality,addability:decision,conflicts,source:evidence,previewEligible:!!food&&!food.legacyPreviewOnly&&food.itemStatus!=='retired',searchEligible:!!food&&!food.legacyPreviewOnly&&food.itemStatus!=='retired',restaurantEligible:!!food?.foodSourceId&&verified&&!food.legacyPreviewOnly&&food.itemStatus!=='retired'};
  }
  function canonicalProduct(food){
    const eligibility=productEligibility(food),evidence=sourceEvidence(food),brand=brandKey(food?.brand),name=norm(food?.name);
    return {id:eligibility.canonicalId,brandId:brand||null,displayBrand:food?.brand||null,productIdentity:name||null,displayName:food?.name||null,familyId:food?.familyId||food?.productFamily||null,familyName:food?.familyName||food?.productFamily||null,category:food?.category||null,foodForm:servingFoundation()?.physicalForm?.(food)?.form||'unknown',market:marketFor(food),verificationStatus:eligibility.verificationStatus,addabilityStatus:eligibility.addability.status,currentState:food?.currentState||(food?.itemStatus==='retired'?'retired':food?.itemStatus==='current'?'current':'unknown'),sourceTrust:evidence.trustClass,nutritionCompleteness:food?.nutritionStatus||food?.nutritionIntegrity?.status||'unknown',servingEvidence:food?.manufacturerServing||null,householdMeasureEvidence:food?.unitOrigins||{},pack:metricEvidence(food?.pack||food?.packageSize||food?.quantity),gtin:food?.barcode||null,sourceReferences:[evidence,...(food?.canonicalEvidence||[])],conflicts:eligibility.conflicts,flags:food?.evidenceFlags||[]};
  }
  function eligibilitySnapshot(food,decision){return snapshotRecord(decision?.normalLoggingAllowed?food:{...food,catalogueEligibility:decision});}
  function canonicalName(food){
    let name=SEARCH?.conceptNorm?.(food?.name)||norm(food?.name),brand=SEARCH?.conceptNorm?.(food?.brand)||norm(food?.brand);
    if(brand&&name.startsWith(brand+' '))name=name.slice(brand.length+1);
    return name.replace(/\s+\d+(?:\.\d+)?\s*(?:kg|g|ml|l)\s*$/i,'').trim();
  }
  function per100Values(food){let values=food?.nutritionPer100&&Object.values(food.nutritionPer100).some(value=>value!=null)?food.nutritionPer100:null;if(!values){const scale=Number(food?.units?.g)||Number(food?.units?.mL);if(!scale)return {};values=Object.fromEntries(Object.entries(food?.nutrients||{}).filter(([,value])=>value!=null).map(([key,value])=>[key,Number(value)*scale*100]));}return values.energyKj==null&&values.calories!=null?{...values,energyKj:Number(values.calories)*4.184}:values;}
  function strongDuplicateEvidence(left,right){
    if(canonicalKey(left)===canonicalKey(right))return {duplicate:true,reason:'same-canonical-id'};
    if(left?.barcode&&right?.barcode&&String(left.barcode)!==String(right.barcode))return {duplicate:false,reason:'distinct-gtins'};
    const a=metricEvidence(left?.pack||left?.packageSize||left?.quantity),b=metricEvidence(right?.pack||right?.packageSize||right?.quantity);
    if(!a||!b||a.amount!==b.amount||a.unit!==b.unit||brandKey(left?.brand)!==brandKey(right?.brand)||canonicalName(left)!==canonicalName(right))return {duplicate:false,reason:'insufficient-exact-identity-evidence'};
    const x=per100Values(left),y=per100Values(right),shared=['energyKj','protein','fat','satFat','carbs','sugar','sodium'].filter(key=>x[key]!=null&&y[key]!=null);
    const compatible=shared.length>=3&&shared.every(key=>Math.abs(Number(x[key])-Number(y[key]))<=Math.max(key==='energyKj'?10:key==='sodium'?5:.3,Math.max(Number(x[key]),Number(y[key]))*.03));
    return {duplicate:compatible,reason:compatible?'brand-product-pack-compatible-nutrition':'nutrition-identity-unresolved'};
  }
  function canonicaliseRecords(records){
    const groups=[],byId=new Map(),byName=new Map();
    for(const food of records||[]){if(!food)continue;const id=canonicalKey(food),nameKey=brandKey(food.brand)+'|'+canonicalName(food),peers=byName.get(nameKey)||[];let index=byId.get(id);
      if(index===undefined)index=peers.find(at=>groups[at].every(peer=>strongDuplicateEvidence(peer,food).duplicate));
      if(index===undefined){index=groups.length;groups.push([]);peers.push(index);byName.set(nameKey,peers);}groups[index].push(food);byId.set(id,index);
    }
    return groups.map(group=>{
      if(group.length===1)return group[0];
      const ordered=[...group].sort((a,b)=>Number(sourceConflicts(a).length>0)-Number(sourceConflicts(b).length>0)||sourceEvidence(a).trustRank-sourceEvidence(b).trustRank||String(b.sourceProvenance?.publishedDate||'').localeCompare(String(a.sourceProvenance?.publishedDate||''))||quality(b)-quality(a)||canonicalKey(a).localeCompare(canonicalKey(b))),winner=ordered[0],conflicts=group.flatMap(food=>sourceConflicts(food).map(conflict=>food!==winner&&!sourceConflicts(winner).length?{...conflict,resolution:conflict.resolution||'quarantined-source-record'}:conflict)),evidence=group.map(food=>({source:sourceEvidence(food),recordId:food.id,canonicalId:canonicalKey(food),name:food.name,pack:food.pack||food.packageSize||food.quantity||null,serving:food.manufacturerServing||null,nutrients:food.nutrients||null,nutritionPer100:food.nutritionPer100||null}));
      for(const other of ordered.slice(1)){const a=metricEvidence(winner.manufacturerServing),b=metricEvidence(other.manufacturerServing);if(a&&b&&(a.amount!==b.amount||a.unit!==b.unit))conflicts.push({code:'cross-source-serving-conflict',field:'serving',severity:'material',resolution:sourceEvidence(winner).trustRank<sourceEvidence(other).trustRank?'higher-trust-source':'unresolved',evidence:{preferred:sourceEvidence(winner),other:sourceEvidence(other),a,b}});}
      for(const other of ordered.slice(1)){const a=per100Values(winner),b=per100Values(other),different=['energyKj','protein','fat','satFat','carbs','sugar','sodium'].filter(key=>a[key]!=null&&b[key]!=null&&Math.abs(Number(a[key])-Number(b[key]))>Math.max(key==='energyKj'?10:key==='sodium'?5:.3,Math.max(Number(a[key]),Number(b[key]))*.03));if(different.length){const newer=winner.sourceProvenance?.publishedDate&&other.sourceProvenance?.publishedDate&&winner.sourceProvenance.publishedDate>other.sourceProvenance.publishedDate,resolution=sourceEvidence(winner).trustRank<sourceEvidence(other).trustRank?'higher-trust-source':newer?'newer-source-publication':'unresolved';conflicts.push({code:'cross-source-nutrition-conflict',field:'nutrition',severity:'material',resolution,fields:different,evidence:{preferred:sourceEvidence(winner),other:sourceEvidence(other),a,b}});}}
      const unresolved=conflicts.some(value=>value.resolution==='unresolved');
      return {...winner,...(unresolved?{loggable:false,nutritionStatus:'needs-review',entryBlockedReason:'Sources disagree about this product. Nutrition needs review before logging.'}:{}),canonicalEvidence:[...(winner.canonicalEvidence||[]),...evidence],evidenceConflicts:[...new Map(conflicts.map(value=>[JSON.stringify(value),value])).values()],mergedRecordIds:[...new Set(group.flatMap(food=>[food.id,...(food.mergedRecordIds||[])]))]};
    });
  }
  function sourceQuality(food){const evidence=sourceEvidence(food),decision=addability(food),foreign=/\b(?:beurre|lait|fromage|yaourt|biscottes|portionen|stuck|stueck|unite|unites)\b/.test(norm(`${food?.name||''} ${food?.servingSize||''} ${food?.packageServingText||''}`));return {trust:evidence.trustRank,complete:decision.normalLoggingAllowed,foreignFacing:foreign,current:food?.currentState==='listed-at-retrieval'||food?.itemStatus==='current',au:marketFor(food)==='AU'};}
  function compareAustralianProducts(a,b){const x=sourceQuality(a),y=sourceQuality(b);return Number(y.au)-Number(x.au)||Number(y.complete)-Number(x.complete)||x.trust-y.trust||Number(x.foreignFacing)-Number(y.foreignFacing)||Number(y.current)-Number(x.current)||norm(a.name).localeCompare(norm(b.name))||canonicalKey(a).localeCompare(canonicalKey(b));}
  const brandProductCache=new WeakMap();
  function brandResultModel(records,query,{limit=20,offset=0,total=null}={}){
    const intent=queryIntent(query),entity=intent.entity;if(intent.kind!=='brand-family'||!entity)return null;
    let cached=brandProductCache.get(records);if(!cached||cached.brand!==brandKey(entity.name)){
      const candidates=canonicaliseRecords(records||[]).filter(food=>consumerBrandMembership(entity,food).matches&&productEligibility(food).searchEligible),decisions=new Map(candidates.map(food=>[food,productEligibility(food,{candidates}).addability])),qualityMap=new Map(candidates.map(food=>[food,{...sourceQuality(food),complete:decisions.get(food).normalLoggingAllowed}]));
      candidates.sort((a,b)=>{const x=qualityMap.get(a),y=qualityMap.get(b);return Number(y.au)-Number(x.au)||Number(y.complete)-Number(x.complete)||x.trust-y.trust||Number(x.foreignFacing)-Number(y.foreignFacing)||Number(y.current)-Number(x.current)||norm(a.name).localeCompare(norm(b.name))||canonicalKey(a).localeCompare(canonicalKey(b));});
      cached={brand:brandKey(entity.name),products:candidates,decisions};if(records)brandProductCache.set(records,cached);
    }
    const products=cached.products,start=Math.max(0,offset),selected=products.slice(start,start+limit);
    const items=selected.map(food=>({id:canonicalKey(food),recordId:food.id,kind:'exact-product',name:consumerDisplayName(food),food:eligibilitySnapshot(food,cached.decisions.get(food)),recordType:recordType(food),provenance:provenance(food),addability:cached.decisions.get(food)}));
    return deepFreeze({version:VERSION,rawQuery:query,normalisedQuery:corrected(query),identityQuery:query,intent,brand:{id:entity.id,name:entity.name},groups:items.length?[{key:'brand-products',label:`${entity.name} products`,items}]:[],total:total??products.length,loaded:products.length,offset:start,hasMore:start+selected.length<(total??products.length)});
  }

  const queryIntentCache=new Map();
  function queryIntent(query){const key=String(global.HECFoodSources?.queryIdentityRevision?.()||0)+'|'+String(query||''),cached=queryIntentCache.get(key);if(cached)return cached;const result=resolveQueryIntent(query);queryIntentCache.set(key,result);if(queryIntentCache.size>180)queryIntentCache.delete(queryIntentCache.keys().next().value);return result;}
  function resolveQueryIntent(query){
    const raw=String(query||'').trim(),normal=norm(raw),types=['brand','retailer','restaurant'];
    if(!normal)return {kind:'none',query:raw,normalised:'',entity:null,productQuery:''};
    const exact=REG?.exactEntity?.(raw,types)||null,brandFamilyAlias=exact?.type==='brand'&&[exact.name,...(exact.familyAliases||[])].some(alias=>norm(alias)===normal);
    if(exact&&(exact.type!=='brand'||brandFamilyAlias))return {kind:exact.type==='restaurant'?'source':'brand-family',query:raw,normalised:normal,entity:exact,productQuery:'',reason:exact.type==='restaurant'?'recognised-source-only':'recognised-brand-only'};
    if(global.HECFoodSources?.hasQueryFamily?.(raw)||global.HECFoodSources?.hasQueryFamily?.(SEARCH.parseQuery(raw).food)||SEARCH?.interpretFoodIntent?.(raw)?.generic)return {kind:'product',query:raw,normalised:normal,entity:null,productQuery:raw,reason:'declared-food-identity'};
    const indexed=brandIdentity(raw);
    if(indexed)return {kind:'brand-family',query:raw,normalised:normal,entity:indexed,productQuery:'',reason:'indexed-brand-only'};
    const indexedPrefix=brandPrefix(raw),match=REG?.primary?.(raw,types)||null,residual=String(REG?.stripRecognisedEntities?.(raw)??raw).trim();
    if(!match&&indexedPrefix)return {kind:'product',query:raw,normalised:normal,entity:indexedPrefix.entity,productQuery:indexedPrefix.residual,reason:'indexed-brand-plus-product'};
    return {kind:'product',query:raw,normalised:normal,entity:match?.entity||null,productQuery:residual||raw,reason:match?'entity-plus-product':'product'};
  }
  function entityMatchesFood(entity,food){return !!entity&&!!food&&!!REG?.entityMatchesHay?.(entity,`${food?.brand||''} ${food?.name||''} ${(food?.aliases||[]).join(' ')} ${food?.sourceDisplayName||''} ${(food?.sourceAliases||[]).join(' ')}`);}
  function consumerBrandMembership(entity,food){
    if(!entity||entity.type!=='brand'||!food)return {matches:false,reason:'not-a-brand-candidate'};
    const mapped=norm(food.consumerBrandId||food.brandEntityId||''),entityIds=new Set([norm(entity.id),norm(entity.name)]);
    if(mapped)return {matches:entityIds.has(mapped),reason:entityIds.has(mapped)?'trusted-brand-registry-id':'different-brand-registry-id'};
    const aliases=new Set([entity.name,...(entity.aliases||[]),...(entity.familyAliases||[])].map(brandKey).filter(Boolean)),raw=String(food.brand||'').trim(),normal=brandKey(raw);
    if(!normal)return {matches:false,reason:'missing-explicit-brand'};
    if(aliases.has(normal))return {matches:true,reason:'exact-canonical-brand'};
    const primary=brandKey(raw.split(/[,;|/]/,1)[0]);
    if(primary&&aliases.has(primary))return {matches:true,reason:'exact-primary-consumer-brand'};
    return {matches:false,reason:'different-consumer-brand'};
  }
  function consumerProductSpecificity(entity,food){
    const name=norm(food?.name),brandNames=new Set([entity?.name,...(entity?.aliases||[]),...(entity?.familyAliases||[])].map(norm).filter(Boolean));
    if(!name||brandNames.has(name)||food?.recognisedOnly===true||food?.verificationStatus==='recognised-only')return {specific:false,reason:'non-specific-brand-reference'};
    return {specific:true,reason:'specific-consumer-product'};
  }
  function trustworthyLocalBrandProduct(food){
    const type=recordType(food),status=norm(food?.verificationStatus),trusted=food?.verified===true||['verified','user confirmed','package confirmed'].includes(status)||food?.saved===true||food?.isSaved===true;
    const eligibleExternal=type===RECORD_TYPES.EXTERNAL&&food?.provenanceClass==='australian-external-catalogue';
    return marketFor(food)==='AU'&&food?.current!==false&&food?.itemStatus!=='retired'&&type!==RECORD_TYPES.ONLINE&&type!==RECORD_TYPES.AFCD&&(trusted||eligibleExternal);
  }
  function defensibleSavedBrandProduct(food){
    const type=recordType(food),status=norm(food?.verificationStatus),saved=food?.saved===true||food?.isSaved===true||food?.private===true||['user confirmed','package confirmed'].includes(status);
    return food?.current!==false&&food?.itemStatus!=='retired'&&[RECORD_TYPES.PRIVATE,RECORD_TYPES.PACKAGED,RECORD_TYPES.LOCAL].includes(type)&&saved;
  }
  function brandQueryEvidence(food,entity,query){
    const queryTokens=tokens(query),brandTokens=new Set(tokens(entity?.name)),residual=queryTokens.filter(token=>!brandTokens.has(token)),hay=new Set(tokens(`${food?.name||''} ${(food?.aliases||[]).join(' ')}`));
    return residual.reduce((score,token)=>score+(hay.has(token)?1:0),0);
  }
  function brandProductSimplicity(food,entity){
    const brandTokens=new Set(tokens(entity?.name));return tokens(food?.name).filter(token=>!brandTokens.has(token)).length;
  }
  function brandProductQuality(food){
    const type=recordType(food),market=marketFor(food);let score=0;
    if(market==='AU')score+=500;if(food?.verified||food?.verificationStatus==='verified')score+=300;if(food?.current!==false&&food?.itemStatus!=='retired')score+=120;
    if(type===RECORD_TYPES.FOOD_SOURCE)score+=220;else if(type===RECORD_TYPES.PACKAGED)score+=180;else if(type===RECORD_TYPES.EXTERNAL)score+=165;else if(type===RECORD_TYPES.AFCD)score+=150;else if(type===RECORD_TYPES.LOCAL)score+=120;else if(type===RECORD_TYPES.PRIVATE)score+=100;else if(type===RECORD_TYPES.ONLINE)score-=160;
    if(hasEnergy(food))score+=40;score+=Math.max(0,Math.min(25,Number(food?.score)||0));return score;
  }
  function sourceTier(food){
    const type=recordType(food),market=marketFor(food),saved=food?.saved===true||food?.isSaved===true||food?.private===true;
    if(market!=='AU'&&market!=='Australia')return SOURCE_TIERS.FOREIGN_FALLBACK;
    if(type===RECORD_TYPES.ONLINE)return SOURCE_TIERS.BROADER_ONLINE;
    if(saved||[RECORD_TYPES.PRIVATE,RECORD_TYPES.RECIPE].includes(type))return SOURCE_TIERS.SAVED_EXACT;
    if(type===RECORD_TYPES.EXTERNAL||food?.provenanceClass==='australian-external-catalogue')return SOURCE_TIERS.AUSTRALIAN_CATALOGUE;
    return SOURCE_TIERS.AUTHORITATIVE_LOCAL;
  }
  function meaningfulProductName(food){
    const name=norm(food?.name),brand=norm(food?.brand),barcode=String(food?.barcode||'').replace(/\D/g,'');
    return !!name&&name!==brand&&name!==norm(`barcode ${barcode}`)&&!/^(?:product|food|unknown|unnamed)$/.test(name);
  }
  function productIdentityQuality(food){
    const name=norm(food?.name),brand=norm(food?.brand),meaningful=meaningfulProductName(food),tier=sourceTier(food),nutrition=norm(food?.nutritionStatus||food?.nutritionCompleteness||'');let classification=PRODUCT_QUALITY.HIGH,score=1000,reason='specific-consumer-product';
    if(!name||/^barcode \d+$/.test(name)){classification=PRODUCT_QUALITY.BARCODE_ONLY;score=100;reason='unnamed-barcode-identity';}
    else if(brand&&name===brand){classification=PRODUCT_QUALITY.BRAND_REFERENCE;score=0;reason='navigation-only-brand-reference';}
    else if(!meaningful||tokens(name).length===1&&!food?.genericName&&!food?.quantity&&!food?.packSize){classification=PRODUCT_QUALITY.WEAK;score=350;reason='ambiguous-or-weak-name';}
    else if(tier===SOURCE_TIERS.FOREIGN_FALLBACK){classification=PRODUCT_QUALITY.FOREIGN;score=300;reason='low-local-relevance';}
    else if(!hasEnergy(food)||['identity only','identity-only','partial','suspect','conflicting'].includes(nutrition)){classification=PRODUCT_QUALITY.INCOMPLETE;score=760;reason='specific-identity-incomplete-nutrition';}
    if(food?.genericName&&norm(food.genericName)!==name)score+=20;if(food?.quantity||food?.packSize||food?.packageSize)score+=15;if(food?.barcode)score+=10;
    return {classification,score,reason,consumable:![PRODUCT_QUALITY.BRAND_REFERENCE,PRODUCT_QUALITY.BARCODE_ONLY].includes(classification),exactEligible:[PRODUCT_QUALITY.HIGH,PRODUCT_QUALITY.INCOMPLETE].includes(classification),sourceTier:tier};
  }
  // A label collision within one source can indicate an incomplete product
  // name. Separate source records are not identity evidence against each other:
  // canonicaliseRecords alone decides whether their evidence permits a merge.
  function identityLabelSource(food){return [recordType(food),food?.foodSourceId||food?.sourceCatalogueId||food?.sourceProvenance?.sourceId||''].join('|');}
  function exactProductQuality(food,{candidates=[]}={}){
    const base=productIdentityQuality(food),name=norm(food?.name),nameTokens=tokens(name),brand=norm(food?.brand),peers=(candidates||[]).filter(candidate=>candidate&&candidate!==food),metadata=[food?.genericName,food?.familyName,food?.productFamily,food?.productLine,food?.categoryFacet,food?.category,...(food?.categories||[]),...(food?.categoryMemberships||[])].map(norm).filter(Boolean),sameName=peers.some(candidate=>norm(candidate.name)===name&&norm(candidate.brand)===brand&&identityLabelSource(candidate)===identityLabelSource(food)&&canonicalKey(candidate)!==canonicalKey(food)&&!(food.foodSourceId&&food.sourceItemId&&food.verified!==false)&&!(food.barcode&&candidate.barcode&&String(food.barcode)!==String(candidate.barcode))),containedByPeer=nameTokens.length===1&&peers.some(candidate=>tokens(candidate.name).includes(name)&&norm(candidate.name)!==name),metadataReference=metadata.includes(name),weakLabel=WEAK_IDENTITY_LABELS.has(name),brandReference=!!brand&&name===brand,residualName=brand&&name.startsWith(`${brand} `)?name.slice(brand.length+1):name,sameBrandPeers=peers.filter(candidate=>!brand||norm(candidate.brand)===brand),lineLabels=new Set([food?.familyName,food?.productFamily,food?.productLine,...sameBrandPeers.flatMap(candidate=>[candidate?.familyName,candidate?.productFamily,candidate?.productLine])].map(norm).filter(Boolean)),lineShell=![RECORD_TYPES.FOOD_SOURCE,RECORD_TYPES.AFCD,RECORD_TYPES.RECIPE].includes(recordType(food))&&lineLabels.has(residualName)&&sameBrandPeers.some(candidate=>{const peerName=norm(candidate.name),peerResidual=brand&&peerName.startsWith(`${brand} `)?peerName.slice(brand.length+1):peerName;return peerResidual!==residualName&&` ${peerResidual} `.includes(` ${residualName} `);});
    const sourceIdentity=!!(food?.foodSourceId&&food?.sourceItemId&&food?.verified===true&&meaningfulProductName(food));
    let exactEligible=base.exactEligible||sourceIdentity||(base.classification===PRODUCT_QUALITY.FOREIGN&&recordType(food)!==RECORD_TYPES.ONLINE&&meaningfulProductName(food)),reason=base.reason;
    if(brandReference){exactEligible=false;reason='brand-reference';}
    else if(base.classification===PRODUCT_QUALITY.BARCODE_ONLY){exactEligible=false;reason='barcode-known-name-incomplete';}
    else if((weakLabel&&!sourceIdentity)||sameName||lineShell||(!sourceIdentity&&nameTokens.length===1&&(containedByPeer||metadataReference))){exactEligible=false;reason=sameName?'ambiguous-duplicate-label':weakLabel?'generic-product-label':'family-or-line-placeholder';}
    return {...base,exactEligible,meaningful:exactEligible,reason,contextCandidates:1+peers.length};
  }
  function consumerDisplayName(food){
    const original=String(food?.name||'').trim(),fallback=String(food?.genericName||'').trim(),chosen=meaningfulProductName(food)?original:fallback||original||`Barcode ${String(food?.barcode||'').trim()}`;
    if(!chosen)return 'Unnamed product';if(/[a-z]/.test(chosen)&&/[A-Z]/.test(chosen))return chosen;
    return chosen.toLowerCase().replace(/\b[a-z]/g,letter=>letter.toUpperCase());
  }
  function fieldSpecificRank(food,query,{consumerBrand='',conceptMatch=false}={}){
    const q=norm(query),qt=tokens(q),name=norm(food?.name),brand=norm(food?.brand),generic=norm(food?.genericName),categories=(food?.categories||food?.categoryMemberships||[]).map(norm),barcode=String(food?.barcode||'').replace(/\D/g,''),identity=productIdentityQuality(food);let score=0,field='none';
    if(barcode&&String(query||'').replace(/\D/g,'')===barcode){score=100000;field='barcode';}
    else if(name===q||norm(`${brand} ${name}`)===q){score=8000;field='exact-product-name';}
    else if(consumerBrand&&brand===norm(consumerBrand)&&qt.every(token=>tokens(`${brand} ${name}`).includes(token))){score=7000+qt.length*20;field='brand-product';}
    else if(brand===q){score=6500;field='consumer-brand';}
    else if(conceptMatch){score=6000+qt.length*20;field='category-concept';}
    else if(qt.length&&qt.every(token=>tokens(name).includes(token))){score=5000+qt.length*20;field='product-name-tokens';}
    else if(generic===q||categories.includes(q)){score=4600;field='generic-or-category';}
    else if(qt.length&&qt.every(token=>tokens(`${name} ${generic}`).includes(token))){score=4000+qt.length*10;field='weak-identity-text';}
    if(!score)return {score:0,field,identity};
    score+=Math.max(0,600-sourceTier(food)*100)+identity.score;
    return {score,field,identity};
  }
  function brandFamilyResults(records,query){
    const intent=queryIntent(query);if(!['brand-family','source'].includes(intent.kind)||!intent.entity)return null;
    if(intent.kind==='source'){const products=dedupe(records||[]).filter(food=>entityMatchesFood(intent.entity,food)).sort((a,b)=>brandProductQuality(b)-brandProductQuality(a)||norm(a.name).localeCompare(norm(b.name)));return {intent,entity:intent.entity,products,primary:products.filter(food=>marketFor(food)==='AU'&&recordType(food)!==RECORD_TYPES.ONLINE),broader:products.filter(food=>marketFor(food)!=='AU'||recordType(food)===RECORD_TYPES.ONLINE),activeTier:0,broad:products,excluded:[]};}
    const broad=dedupe(records||[]).filter(food=>consumerBrandMembership(intent.entity,food).matches),eligible=[],excluded=[];
    for(const food of broad){const membership=consumerBrandMembership(intent.entity,food),specificity=consumerProductSpecificity(intent.entity,food);if(!membership.matches)excluded.push({food,reason:membership.reason});else if(!specificity.specific)excluded.push({food,reason:specificity.reason});else eligible.push(food);}
    const tier1=eligible.filter(trustworthyLocalBrandProduct),tier2=eligible.filter(food=>!tier1.includes(food)&&defensibleSavedBrandProduct(food)),tier3=eligible.filter(food=>!tier1.includes(food)&&!tier2.includes(food)),active=tier1.length?tier1:tier2.length?tier2:tier3,activeTier=tier1.length?1:tier2.length?2:tier3.length?3:0;
    const order=(a,b)=>brandQueryEvidence(b,intent.entity,query)-brandQueryEvidence(a,intent.entity,query)||brandProductSimplicity(a,intent.entity)-brandProductSimplicity(b,intent.entity)||brandProductQuality(b)-brandProductQuality(a)||norm(a.name).localeCompare(norm(b.name));
    const products=[...active].sort(order),broader=eligible.filter(food=>!active.includes(food)).sort(order);
    return {intent,entity:intent.entity,products,primary:products,broader,activeTier,broad,excluded};
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
    const q=tokens(corrected(query));
    // Only a declared consumer alias licenses spelling repair. Never compare
    // arbitrary related product names or infer a brand from a category word.
    return (food?.aliases||[]).some(alias=>{const parts=tokens(corrected(alias));return parts.length===q.length&&parts.length>=2&&parts.filter((part,index)=>part!==q[index]).length<=1&&parts.every((part,index)=>part===q[index]||part.length>=5&&q[index].length>=5&&boundedEditDistance(part,q[index],1)<=1);});
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
  function nutrientSignature(food){const keys=['calories','energyKj','protein','fat','satFat','carbs','sugar','sodium','fibre'],values=keys.map(key=>{const value=food?.nutrients?.[key];return value===null||value===undefined||value===''?'':Number(value);});return values.some(value=>value!=='')?values.join('|'):'';}
  function servingSignature(food){const units=Object.entries(food?.units||{}).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${norm(key)}:${Number(value)}`).join(','),unit=norm(food?.defaultUnit),serving=norm(food?.serving);return unit||serving||units?[String(food?.defaultAmount??''),unit,serving,units].join('|'):'';}
  function provenanceSignature(food){return norm(food?.sourceUrl||food?.provenance?.url||food?.officialSourceUrl||food?.source||'');}
  function duplicateIdentityEvidence(left,right){
    if(!left||!right)return {duplicate:false,reason:'missing-record'};
    const sameCanonical=canonicalKey(left)===canonicalKey(right),sameIdentity=norm(left.name)===norm(right.name)&&norm(left.brand)===norm(right.brand),leftServing=servingSignature(left),rightServing=servingSignature(right),leftNutrition=nutrientSignature(left),rightNutrition=nutrientSignature(right),leftProvenance=provenanceSignature(left),rightProvenance=provenanceSignature(right),sameServing=!!leftServing&&leftServing===rightServing,sameNutrition=!!leftNutrition&&leftNutrition===rightNutrition,sameProvenance=(!leftProvenance&&!rightProvenance)||!!leftProvenance&&leftProvenance===rightProvenance,duplicate=sameCanonical||(sameIdentity&&sameServing&&sameNutrition&&sameProvenance&&String(left.barcode||'')===String(right.barcode||'')&&JSON.stringify(metricEvidence(left.pack||left.packageSize||left.quantity))===JSON.stringify(metricEvidence(right.pack||right.packageSize||right.quantity))&&preparationKey(left)===preparationKey(right));
    return {duplicate,reason:sameCanonical?'same-canonical-id':duplicate?'same-identity-serving-nutrition-provenance':sameIdentity?'distinct-serving-nutrition-or-provenance':'different-identity',sameCanonical,sameIdentity,sameServing,sameNutrition,sameProvenance,leftCanonical:canonicalKey(left),rightCanonical:canonicalKey(right)};
  }
  function duplicateIdentity(left,right){return duplicateIdentityEvidence(left,right).duplicate;}
  function equivalentDisplayKey(food){const serving=servingSignature(food),nutrition=nutrientSignature(food),provenance=provenanceSignature(food);return serving&&nutrition?`${norm(food?.brand)}|${norm(food?.name)}|${serving}|${nutrition}|${provenance}|${String(food?.barcode||'')}|${JSON.stringify(metricEvidence(food?.pack||food?.packageSize||food?.quantity))}|${preparationKey(food)}`:'';}
  function dedupe(records){
    const rows=[],indexes=new Map();
    for(const food of records||[]){if(!food)continue;const keys=[`canonical:${canonicalKey(food)}`],equivalent=equivalentDisplayKey(food);if(equivalent)keys.push(`equivalent:${equivalent}`);const found=keys.map(key=>indexes.get(key)).find(index=>index!==undefined);if(found===undefined){const index=rows.length;rows.push(food);keys.forEach(key=>indexes.set(key,index));}else{if(quality(food)>quality(rows[found]))rows[found]=food;keys.forEach(key=>indexes.set(key,found));}}
    return rows;
  }
  function dedupeRanked(items){
    const rows=[],indexes=new Map();
    for(const item of items||[]){if(!item?.food)continue;const keys=[`canonical:${canonicalKey(item.food)}`],equivalent=equivalentDisplayKey(item.food);if(equivalent)keys.push(`equivalent:${equivalent}`);const found=keys.map(key=>indexes.get(key)).find(index=>index!==undefined);if(found===undefined){const index=rows.length;rows.push(item);keys.forEach(key=>indexes.set(key,index));}else{const old=rows[found];if(Number(item.rank)>Number(old.rank)||(Number(item.rank)===Number(old.rank)&&quality(item.food)>quality(old.food)))rows[found]=item;keys.forEach(key=>indexes.set(key,found));}}
    return rows;
  }
  function duplicateAudit(records=[]){const duplicatePairs=[],distinctSameName=[];for(let left=0;left<records.length;left++)for(let right=left+1;right<records.length;right++){if(norm(records[left]?.name)!==norm(records[right]?.name)||norm(records[left]?.brand)!==norm(records[right]?.brand))continue;const evidence=duplicateIdentityEvidence(records[left],records[right]);(evidence.duplicate?duplicatePairs:distinctSameName).push({left:records[left],right:records[right],evidence});}return {duplicatePairs,distinctSameName};}
  function resolvedIdentityKey(food){
    return [norm(food?.brand),norm(food?.name),norm(food?.serving),String(food?.defaultAmount??''),norm(food?.defaultUnit),String(food?.nutrients?.calories??'')].join('|');
  }
  function authoritativePackagedRecord(food){return recordType(food)===RECORD_TYPES.PACKAGED&&marketFor(food)==='AU'&&(food?.verified||food?.verificationStatus==='verified');}
  function sameNamedProduct(authority,candidate){
    if(!authority||!candidate||canonicalKey(authority)===canonicalKey(candidate))return false;
    const authorityNames=new Set([authority.name,`${authority.brand||''} ${authority.name||''}`,...(authority.aliases||[])].map(norm).filter(Boolean));
    const candidateNames=[candidate.name,`${candidate.brand||''} ${candidate.name||''}`,...(candidate.aliases||[])].map(norm).filter(Boolean);
    const authorityBrand=norm(authority.brand),candidateBrand=norm(candidate.brand);if(authorityBrand&&candidateBrand&&authorityBrand!==candidateBrand)return false;
    return candidateNames.some(value=>authorityNames.has(value))&&strongDuplicateEvidence(authority,candidate).duplicate;
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
    const intent=queryIntent(raw);if(intent.kind!=='product'){const family=brandFamilyResults(records,raw);return {status:intent.kind,food:null,candidates:family?.products||[],query:raw,correctedQuery:corrected(raw),intent,entity:intent.entity,reason:intent.kind==='source'?`Browse ${intent.entity?.name||'this source'} products.`:`Choose a specific ${intent.entity?.name||'brand'} product.`};}
    const fries=mcDonaldsFriesSizes(records,raw);
    if(fries&&!fries.size)return {status:'ambiguous',food:null,candidates:fries.choices,query:raw,correctedQuery:corrected(raw),reason:'Which McDonald’s fries size: Small, Medium or Large?'};
    const allowed=new Set(allowTiers),ranked=dedupeRanked((records||[]).map(food=>{const result=rank(food,raw);return {food,rank:result.score,result};}).filter(item=>item.rank>=minScore&&allowed.has(item.result.tier))).sort((a,b)=>b.rank-a.rank||quality(b.food)-quality(a.food)||norm(a.food.name).localeCompare(norm(b.food.name)));
    if(!ranked.length)return {status:'none',food:null,candidates:[],query:raw,correctedQuery:corrected(raw)};
    const first=ranked[0],firstIdentity=resolvedIdentityKey(first.food),credible=ranked.filter(item=>item.rank===first.rank&&canonicalKey(item.food)!==canonicalKey(first.food)&&resolvedIdentityKey(item.food)!==firstIdentity);
    if(credible.length)return {status:'ambiguous',food:null,candidates:[first,...credible].map(item=>item.food),query:raw,correctedQuery:corrected(raw),reason:`Several foods match “${raw}”. Choose the exact one.`};
    return {status:'exact',food:first.food,candidates:[first.food],rank:first.rank,tier:first.result.tier,query:raw,correctedQuery:corrected(raw)};
  }
  function provenance(food){
    const type=recordType(food),evidence=sourceEvidence(food),verified=['official-au-manufacturer','official-au-restaurant','official-au-retailer','package-verified-au'].includes(evidence.trustClass);
    if(type===RECORD_TYPES.FOOD_SOURCE)return {label:food?.sourceDisplayName||food?.brand||'Official Food Source',detail:food?.source||food?.sourceUrl||'Source catalogue',verified};
    if(type===RECORD_TYPES.AFCD)return {label:'Australian AFCD',detail:food?.source||'Food Standards Australia New Zealand · AFCD',verified:true};
    if(type===RECORD_TYPES.PRIVATE)return {label:'My Food',detail:'Private food saved on this device',verified:false};
    if(type===RECORD_TYPES.RECIPE)return {label:'My Recipe',detail:'Nutrition calculated from saved ingredient snapshots',verified:false};
    if(type===RECORD_TYPES.EXTERNAL)return {label:'Open Food Facts AU',detail:food?.source||'Community catalogue · check the current package',verified:false};
    if(type===RECORD_TYPES.ONLINE)return {label:'Online Candidate',detail:food?.source||'Online product data · check the current package',verified:false};
    if(type===RECORD_TYPES.PACKAGED)return {label:verified?'Verified Packaged Food':'Packaged Food',detail:food?.source||'Check the current package',verified:!!verified};
    return {label:verified?'Verified Food':'Food Record',detail:food?.source||'Source not supplied',verified:!!verified};
  }
  function provenanceParts(food,extras=[]){const source=provenance(food),values=[food?.brand,food?.sourceDisplayName,source.label,...extras],seen=new Set(),out=[];for(const value of values){const text=String(value||'').trim(),key=norm(text);if(text&&!seen.has(key)){seen.add(key);out.push(text);}}return out;}
  function servingFoundation(){return global.HECServingFoundation||(typeof require==='function'?require('./serving-foundation.js'):null);}
  function addability(food,options={}){return productEligibility(food,options).addability;}
  function canLog(food){
    const decision=addability(food);if(decision.normalLoggingAllowed===true)return true;
    // Preserve the catalogue API's historical nutrition-eligibility answer for
    // abstract records that do not yet carry serving metadata. Actual result,
    // Quick Add and editor routes still require the central addability decision
    // or their own explicit serving/unit guard before a Diary write can occur.
    const noServingMetadata=!Object.keys(food?.units||{}).length&&!food?.manufacturerServing&&!food?.defaultUnit;
    return !!food&&noServingMetadata&&food?.loggable!==false&&food?.nutritionStatus!=='unavailable'&&food?.nutritionStatus!=='configurable'&&hasEnergy(food)&&food?.verificationStatus!=='recognised-only'&&food?.recognisedOnly!==true;
  }
  function quickAddPolicy(food,{date='',meal='',sourceTrusted=false,safetyBlocked=false}={}){
    const policy=SEM?.servingPolicy?.(food),unit=String(policy?.defaultUnit||food?.defaultUnit||''),amount=Number(policy?.defaultAmount??food?.defaultAmount),units=policy?.units||food?.units||{},natural=!!unit&&Number.isFinite(amount)&&amount>0&&units[unit]!==undefined&&!['g','mL'].includes(unit);let reason='';
    if(!food)reason='identity';else if(!date||!meal)reason='destination';else if(!canLog(food))reason='nutrition';else if(!natural)reason='serving';else if(!sourceTrusted)reason='source';else if(safetyBlocked)reason='safety';return {ready:!reason,reason,amount,unit,date,meal};
  }
  function fullReviewPolicy(food,{safetyBlocked=false}={}){
    const policy=SEM?.servingPolicy?.(food),rawAmount=Number(policy?.defaultAmount??food?.defaultAmount),amount=Number.isFinite(rawAmount)&&rawAmount>0?rawAmount:1,unit=String(policy?.defaultUnit||food?.defaultUnit||'');let reason='';
    if(!food)reason='identity';else if(!canLog(food))reason='nutrition';else if(safetyBlocked)reason='safety';else if(!unit||(food?.units||{})[unit]===undefined)reason='unit';return {ready:!reason,reason,amount,unit};
  }
  function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);return value;}
  function snapshotRecord(food){try{return JSON.parse(JSON.stringify(food));}catch{return {...food};}}
  function genericSubmittedItem(concept,raw,parsed){return {id:`generic:${concept.key}`,kind:'generic-concept',conceptKey:concept.key,name:`${concept.label} — Generic`,sourcePlan:SEARCH.sourceContextPlan?.(concept,raw)||null,physicalForm:concept.physicalForm||'',quantity:parsed.consumedQuantity||1};}
  function restaurantProductQuery(food,query){
    let productQuery=norm(query);
    const sourceNames=[food.brand,food.sourceDisplayName,...(food.sourceAliases||[])].map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);
    for(const name of sourceNames)productQuery=(` ${productQuery} `).replace(` ${name} `,' ').trim();
    return productQuery;
  }
  function restaurantFamilyKey(food){
    if(food.choiceFamily)return norm(food.choiceFamily);
    const semantics=food.productSemantics||{};let family=norm(food.familyName||food.productFamily);
    // Some source family fields still include their declared size/count.
    // Strip only that semantic modifier; never infer a family from display names.
    const modifier=semantics.type==='sized-variant'?norm(semantics.size||food.semanticSize):semantics.type==='counted-item'?String(Number(semantics.count||food.semanticCount)||''):'';
    if(modifier&&family.startsWith(`${modifier} `))family=family.slice(modifier.length+1);
    else if(modifier&&family.endsWith(` ${modifier}`))family=family.slice(0,-modifier.length-1);
    return family;
  }
  function restaurantSearchQuantity(records,raw){
    const parsed=SEARCH?.parseQuantityLanguage?.(raw,{candidates:records})||{identityQuery:corrected(raw)};
    // A source-declared size can also be a meal word. Preserve a fully named
    // family/size identity before generic quantity parsing removes that word.
    for(const food of records){
      const semantics=food.productSemantics||{},size=norm(semantics.size||food.semanticSize),family=restaurantFamilyKey(food);
      if(!food.foodSourceId||!family||semantics.type!=='sized-variant'||!size)continue;
      const productQuery=restaurantProductQuery(food,raw);
      if(productQuery===`${size} ${family}`||productQuery===`${family} ${size}`)return {...parsed,identityQuery:corrected(raw),variantExplicit:true,productVariantSize:size};
    }
    return parsed;
  }
  function unresolvedRestaurantFamilies(records,query,parsed){
    // A score resolves relevance, not which size/order the person consumed.
    // Only explicit source family metadata and distinct semantic portions qualify.
    if(parsed?.variantExplicit)return [];
    const families=new Map();
    for(const food of records){
      const semantics=food.productSemantics||{},family=restaurantFamilyKey(food),source=food.foodSourceId;
      const singlePiece=semantics.type==='single-item'&&food.defaultUnit==='piece'&&Number(food.defaultAmount)===1&&Number(food.units?.piece)===1;
      const count=Number(semantics.count||food.semanticCount)||(singlePiece?1:0),size=norm(semantics.size||food.semanticSize);
      const portion=(semantics.type==='counted-item'||singlePiece)&&count>0?`count:${count}`:semantics.type==='sized-variant'&&size?`size:${size}`:'';
      if(!source||!family||!portion||food.verified===false||food.itemStatus==='retired')continue;
      const productQuery=restaurantProductQuery(food,query);
      // Exact family intent leaves count, size, flavour and meal modifiers intact.
      if(productQuery!==family)continue;
      const key=`${source}:${family}`,group=families.get(key)||{key,family,sourceId:source,members:[]};
      group.members.push({food,portion,count,size});families.set(key,group);
    }
    return [...families.values()].filter(group=>group.members.length>1&&new Set(group.members.map(member=>member.portion)).size===group.members.length).map(group=>{
      const sourceOrdered=new Set(group.members.map(member=>member.food.choiceOrder)).size>1;
      const order=member=>sourceOrdered?Number(member.food.choiceOrder)||0:member.count>0?member.count:['extra small','small','medium','regular','large','extra large'].indexOf(member.size);
      group.members.sort((a,b)=>order(a)-order(b)||a.size.localeCompare(b.size));
      return {...group,label:group.family.replace(/\b\w/g,char=>char.toUpperCase()),recordIds:group.members.map(member=>String(member.food.id))};
    });
  }
  // Source classes use only declared brand/source metadata, never inferred retailer ownership.
  function commercialSourceClass(food){
    if(food?.foodSourceId)return 'restaurant';
    const brand=norm(food?.brand),source=norm(food?.sourceType);
    if(/\b(?:woolworths|coles|aldi|iga)\b/.test(brand))return 'supermarket';
    if(/\b(?:bakery|bakeries)\b/.test(brand+' '+source))return 'bakery';
    return brand&&recordType(food)!=='afcd'?'brand':'';
  }
  const shortlistCatalogueCache=new WeakMap();
  const shortlistAlphabet=new Intl.Collator('en-AU',{sensitivity:'base'});
  function shortlistNameOrder(a,b){return shortlistAlphabet.compare(norm(a.name),norm(b.name))||String(a.recordId).localeCompare(String(b.recordId));}
  // Counts describe distinct compatible AU catalogue records in this discovery
  // snapshot, not sales or user popularity. Sessions append records; a new array,
  // concept or length invalidates the cache. Never scan the catalogue on typing.
  function shortlistBrandCounts(records,conceptId){
    let cached=shortlistCatalogueCache.get(records);
    if(!cached||cached.length!==records.length){cached={length:records.length,concepts:new Map()};shortlistCatalogueCache.set(records,cached);}
    if(cached.concepts.has(conceptId))return cached.concepts.get(conceptId);
    const brands=new Map(),seen=new Set();
    for(const food of records){
      if(recordType(food)!==RECORD_TYPES.EXTERNAL||marketFor(food)!=='AU'||!SEARCH.conceptCompatibility(food,conceptId).compatible)continue;
      const brand=norm(food.brand),id=food.barcode||food.id;
      if(!brand||brand==='brand not listed'||!id||seen.has(id))continue;
      seen.add(id);brands.set(brand,(brands.get(brand)||0)+1);
    }
    cached.concepts.set(conceptId,brands);return brands;
  }
  function shortlistQuality(food,intent,brandCounts){
    const definition=SEARCH.foodConceptRegistry[intent.conceptId],name=SEARCH.conceptNorm(food.name),attributes=SEARCH.conceptAttributes(food,intent.conceptId);
    // Positive evidence of an understandable concept/facet in the display name.
    // Category-only identities remain searchable, including imported names.
    const titleIdentity=definition.match.test(name)?2:Object.keys(attributes).length>0?1:0;
    // A containing dish can share a compatible catalogue category. Its title or
    // declared menu unit is weaker evidence for a bare ingredient shortlist.
    const containingDish=/\b(?:pocket|quiche|pizza|pasta|macaroni|soup)\b|\bsandwich$/.test(name)||food.defaultUnit==='burger'&&intent.conceptId!=='burger';
    const flavoured=/\b(?:flavou?red|chocolate|strawberry|vanilla|banana|caramel|coffee|mocha)\b/.test(name);
    const peripheral=intent.conceptId==='milk'&&flavoured&&!/\b(?:flavou?red|chocolate|strawberry|vanilla|banana|caramel|coffee|mocha)\b/.test(SEARCH.conceptNorm(intent.identityQuery));
    const brand=norm(food.brand),entity=REG?.primary?.(food.brand,['brand','retailer'])?.entity;
    const countries=food.countries||[],auOnly=countries.length>0&&countries.every(country=>/^(?:en:)?australia$/i.test(country));
    const recognisedAU=marketFor(food)==='AU'&&!!entity;
    return {titleIdentity,containingDish,peripheral,recognisedAU,auOnly,sourceTrust:sourceTier(food),catalogueBrandCount:brandCounts.get(brand)||0,titleWords:name.split(' ').length};
  }
  function conceptShortlist(records,intent){
    const definition=SEARCH.foodConceptRegistry[intent.conceptId],policy=definition.shortlist||{},buckets={direct:[],related:[],branded:[],supermarket:[]};
    const eligible=records.filter(food=>{const evidence=SEARCH.foodConceptEvidence(food);return !evidence.excluded&&(SEARCH.conceptCompatibility(food,intent).compatible||!Object.keys(intent.known).length&&((policy.related||[]).includes(evidence.conceptId)||recordType(food)==='afcd'&&(policy.direct||[]).includes(evidence.conceptId)));});
    const brandCounts=shortlistBrandCounts(records,intent.conceptId);
    for(const food of dedupe(eligible)){
      const evidence=SEARCH.foodConceptEvidence(food),compatible=SEARCH.conceptCompatibility(food,intent).compatible,reference=recordType(food)==='afcd';
      const declaredDirect=(policy.direct||[]).includes(evidence.conceptId),declaredRelated=(policy.related||[]).includes(evidence.conceptId);
      if(!reference&&!exactProductQuality(food,{candidates:eligible}).exactEligible)continue;
      if(evidence.excluded||(!compatible&&!((declaredRelated||reference&&declaredDirect)&&!Object.keys(intent.known).length)))continue;
      const group=declaredRelated?'related':reference?'direct':commercialSourceClass(food)==='supermarket'?'supermarket':'branded';
      buckets[group].push({kind:'exact-product',recordId:food.id,name:consumerDisplayName(food),food,addability:addability(food),decisionTrace:{concept:evidence,compatibility:SEARCH.conceptCompatibility(food,intent),sourceTrust:sourceTier(food),quality:shortlistQuality(food,intent,brandCounts),rank:rank(food,intent.identityQuery),group}});
    }
    const qualityBand=item=>{const q=item.decisionTrace.quality;return [Number(!item.addability.normalLoggingAllowed),Number(q.containingDish),Number(q.peripheral),-q.titleIdentity,q.sourceTrust,Number(!q.auOnly)];};
    const compareBand=(a,b)=>{const left=qualityBand(a),right=qualityBand(b);for(let i=0;i<left.length;i++)if(left[i]!==right[i])return left[i]-right[i];return 0;};
    const compare=(a,b)=>compareBand(a,b)||Number(b.decisionTrace.quality.recognisedAU)-Number(a.decisionTrace.quality.recognisedAU)||b.decisionTrace.quality.catalogueBrandCount-a.decisionTrace.quality.catalogueBrandCount||a.decisionTrace.quality.titleWords-b.decisionTrace.quality.titleWords||shortlistNameOrder(a,b);
    // Spread a small list across supported sub-identities/brands before adding variants.
    function diverse(items,limit,reference=false){
      items.sort(compare);
      if(reference){
        const declared=(policy.direct||[]).map(id=>items.filter(item=>SEARCH.foodConceptEvidence(item.food).conceptId===id).sort((a,b)=>Number(SEARCH.conceptNorm(b.name).startsWith(SEARCH.conceptNorm(definition.label)))-Number(SEARCH.conceptNorm(a.name).startsWith(SEARCH.conceptNorm(definition.label)))||a.name.localeCompare(b.name))[0]).filter(Boolean);
        const core=items.filter(item=>!policy.direct?.includes(SEARCH.foodConceptEvidence(item.food).conceptId));
        const facet=definition.facets.find(key=>SEARCH.conceptFacets[key]),seen=new Set(),first=[],rest=[];
        core.sort((a,b)=>Number(!!SEARCH.conceptAttributes(b.food,intent.conceptId)[facet])-Number(!!SEARCH.conceptAttributes(a.food,intent.conceptId)[facet])||a.name.length-b.name.length||a.name.localeCompare(b.name));
        for(const item of core){const key=SEARCH.conceptAttributes(item.food,intent.conceptId)[facet]||SEARCH.foodConceptEvidence(item.food).conceptId;(seen.has(key)?rest:first).push(item);seen.add(key);}
        return [...declared,...first,...rest].slice(0,limit).sort(shortlistNameOrder);
      }
      // Diversity cannot promote a weaker quality band over stronger variants.
      const bands=[];for(const item of items){let band=bands.at(-1);if(!band||compareBand(band[0],item)!==0){band=[];bands.push(band);}band.push(item);}
      const selected=[],labels=new Set();for(const band of bands){const seen=new Set(),first=[],rest=[];for(const item of band){const key=norm(item.food.brand||item.food.sourceDisplayName),label=key+'|'+norm(item.name);if(labels.has(label))continue;labels.add(label);(seen.has(key)?rest:first).push(item);seen.add(key);}selected.push(...first,...rest);}
      return selected.slice(0,limit).sort(compare);
    }
    const groups=[{key:'generic',label:'Base food concept',items:[{kind:'generic-concept',conceptKey:intent.conceptId,name:definition.label}]}];
    for(const [key,label,limit] of [['direct','Direct Australian foods',7],['related','Common related foods',3],['branded','Australian brands and food outlets',5],['supermarket','Supermarket brands',4]]){const items=diverse(buckets[key],limit,['direct','related'].includes(key));if(items.length)groups.push({key,label,items});}
    return {rawQuery:intent.rawQuery,conceptIntent:intent,groups,total:groups.reduce((n,g)=>n+g.items.length,0)};
  }
  function isExplicitProductRequest(query,conceptIntent){const intent=queryIntent(query),parsed=SEARCH.parseQuery(query),concept=SEARCH.conceptFromQuery(parsed),bareGeneric=!intent.entity&&concept?.aliases.some(alias=>SEARCH.conceptNorm(alias)===SEARCH.conceptNorm(parsed.food));return !bareGeneric&&!conceptIntent?.generic&&intent.kind==='product'&&(!!(intent.entity&&intent.productQuery)||['brand-product','exact-product'].includes(conceptIntent?.kind));}
  function explicitIdentityMatch(food,query,intent=queryIntent(query),conceptIntent=null){
    if(!food||food.legacyPreviewOnly||food.itemStatus==='retired')return false;
    // An indexed brand prefix is inferred: a complete product name can contain
    // that word without belonging to that brand. A longer inferred prefix may
    // also consume product words after the actual brand. Require the complete
    // stored brand/name, not an alias or a partial phrase, for that exception.
    const exactNameCollision=intent.reason==='indexed-brand-plus-product'&&(SEARCH.conceptNorm(food.name)===SEARCH.conceptNorm(query)||!!food.brand&&REG.brandSearchText(`${food.brand} ${food.name}`)===REG.brandSearchText(query));
    if(intent.entity?.type==='brand'&&!consumerBrandMembership(intent.entity,food).matches&&!exactNameCollision)return false;
    if(conceptIntent?.conceptId&&!conceptIntent.compoundId&&SEARCH.semanticProductExactness(food,query).priority<4&&!SEARCH.conceptCompatibility(food,conceptIntent).compatible)return false;
    const identity=SEARCH.conceptNorm(query),entity=intent.entity;
    if(entity){const names=[entity.name,...(entity.aliases||[])].map(SEARCH.conceptNorm),source=SEARCH.conceptNorm([food.brand,food.sourceDisplayName,...(food.sourceAliases||[])].filter(Boolean).join(' '));if(entity.type!=='brand'&&!names.some(name=>(' '+source+' ').includes(' '+name+' ')))return false;const product=SEARCH.conceptNorm(intent.productQuery);return !product||product.split(' ').every(token=>SEARCH.conceptNorm([food.name,...(food.aliases||[])].join(' ')).includes(token));}
    return identity.split(' ').every(token=>SEARCH.conceptNorm([food.name,food.brand,...(food.aliases||[])].join(' ')).includes(token));
  }
  function submittedResultModel(records,query,{savedIds=[],online=[]}={}){
    if(queryIntent(query).kind==='brand-family')return brandResultModel([...(records||[]),...(online||[])],query);
    const raw=String(query||'').trim(),parsed=restaurantSearchQuantity(records||[],raw),identity=REG.preserveSearchSpelling(raw,parsed.identityQuery||corrected(raw)),concept=SEARCH?.conceptFromQuery?.(identity)||null,intent=queryIntent(identity),restaurantFamilies=unresolvedRestaurantFamilies(records||[],identity,parsed),conceptIntent=SEARCH?.interpretFoodIntent?.(raw,{records,sourceIntent:intent,restaurantFamilies}),saved=new Set(savedIds||[]),ranked=dedupeRanked(canonicaliseRecords([...(records||[]),...(online||[])]).filter(food=>!food.legacyPreviewOnly&&food.itemStatus!=='retired').map(food=>({food,rank:rank(food,identity,{saved:saved.has(food?.id)}).score})).filter(item=>item.rank>0||SEARCH.semanticProductExactness(item.food,identity).priority>=4)).sort((a,b)=>(conceptIntent?.generic?0:(SEARCH?.semanticProductExactness?.(b.food,identity)?.priority||0)-(SEARCH?.semanticProductExactness?.(a.food,identity)?.priority||0))||b.rank-a.rank||quality(b.food)-quality(a.food)||norm(a.food?.name).localeCompare(norm(b.food?.name))).map(item=>item.food),groups=[];
    const genericConcept=!!concept&&!SEARCH?.likelyBrandPrefix?.(SEARCH.parseQuery(raw),concept)&&intent.kind==='product';
    if(genericConcept)groups.push({key:'generic',label:'Generic Food',items:[genericSubmittedItem(concept,raw,parsed)]});
    const buckets={best:[],restaurant:[],packaged:[],saved:[],broader:[],completion:[],details:[],related:[]},decisions=new Map();
    for(const food of ranked){const compatibility=conceptIntent?.conceptId&&(conceptIntent.generic||Object.keys(conceptIntent.known||{}).length)&&!conceptIntent.compoundId?SEARCH.conceptCompatibility(food,conceptIntent):null,exactness=SEARCH?.semanticProductExactness?.(food,identity);const decision=productEligibility(food,{candidates:ranked}).addability;decisions.set(food,decision);const item={id:canonicalKey(food),recordId:String(food?.id||canonicalKey(food)),kind:'exact-product',name:consumerDisplayName(food),food:eligibilitySnapshot(food,decision),recordType:recordType(food),provenance:provenance(food),addability:snapshotRecord(decision),decisionTrace:{concept:SEARCH?.foodConceptEvidence?.(food),compatibility,exactness,sourceTrust:sourceTier(food),completeness:decision.status,rank:rank(food,identity)}};if(compatibility&&!compatibility.compatible)buckets.related.push(item);else if(decision.status==='needs-nutrition-completion')buckets.completion.push(item);else if(decision.status==='details-only')buckets.details.push(item);else if(saved.has(food?.id)||[RECORD_TYPES.PRIVATE,RECORD_TYPES.RECIPE].includes(item.recordType))buckets.saved.push(item);else if(item.recordType===RECORD_TYPES.FOOD_SOURCE)buckets.restaurant.push(item);else if(item.recordType===RECORD_TYPES.PACKAGED)buckets.packaged.push(item);else if([RECORD_TYPES.ONLINE,RECORD_TYPES.EXTERNAL].includes(item.recordType))buckets.broader.push(item);else buckets.best.push(item);}
    const families=genericConcept?[]:restaurantFamilies,unresolvedIds=new Set(families.flatMap(family=>family.recordIds));
    const loggableRanked=ranked.filter(food=>decisions.get(food)?.normalLoggingAllowed&&!buckets.related.some(item=>item.recordId===String(food.id))),topFood=loggableRanked[0],topRank=topFood?rank(topFood,identity):{score:0,tier:'none'},strongProduct=!genericConcept&&topFood&&!unresolvedIds.has(String(topFood.id))&&(intent.kind==='product'||intent.kind==='source')&&(SEARCH.semanticProductExactness(topFood,identity).priority>=4||['exact-name','exact-alias','exact-source-alias','exact-brand','all-tokens'].includes(topRank.tier)&&topRank.score>=1200);if(strongProduct){const firstGroup=Object.entries(buckets).find(([key,items])=>!['completion','details','related'].includes(key)&&items.some(item=>item.recordId===String(topFood.id)));if(firstGroup){const [key,items]=firstGroup,index=items.findIndex(item=>item.recordId===String(topFood.id));groups.push({key:'best',label:'Best match',items:items.splice(index,1),origin:key});}}
    for(const family of families){
      const items=family.recordIds.flatMap(id=>Object.values(buckets).flatMap(bucket=>{const index=bucket.findIndex(item=>item.recordId===id);return index<0?[]:bucket.splice(index,1);}));
      groups.push({key:'restaurant-family',label:`Which ${family.label} order did you have?`,familyKey:family.key,sourceId:family.sourceId,unresolved:'size-or-count',items});
    }
    for(const [key,label] of [['best','Australian Generic Records'],['restaurant','Restaurant / Ready-to-Eat'],['packaged','Packaged / Frozen / Supermarket Products'],['saved','Saved or User-Created Results'],['broader','Broader Australian Results'],['completion','Needs Nutrition Completion'],['details','Details Only'],['related','Related foods']])if(buckets[key].length)groups.push({key,label,items:buckets[key]});
    if(!groups.length&&concept)groups.push({key:'generic',label:'Generic Food',items:[genericSubmittedItem(concept,raw,parsed)]});
    return deepFreeze({version:VERSION,rawQuery:raw,normalisedQuery:corrected(raw),identityQuery:identity,quantity:parsed,conceptIntent,concept:concept?{key:concept.key,label:concept.label}:null,submissionMode:'deliberate',groups,total:groups.reduce((sum,group)=>sum+group.items.length,0)});
  }
  function appendSubmittedOnline(model,records=[]){
    if(!model||!Array.isArray(model.groups)||!records.length)return model;
    const existingIds=new Set(model.groups.flatMap(group=>group.items||[]).flatMap(item=>[String(item.id||''),String(item.recordId||'')])),incoming=submittedResultModel(records,model.rawQuery).groups.flatMap(group=>group.items||[]).filter(item=>item.kind==='exact-product'&&!existingIds.has(String(item.id||''))&&!existingIds.has(String(item.recordId||'')));
    if(!incoming.length)return model;
    const retained=model.groups.filter(group=>group.key!=='online'),previous=model.groups.find(group=>group.key==='online')?.items||[],online=deepFreeze({key:'online',label:'Online packaged results',items:[...previous,...incoming]});
    return deepFreeze({...model,groups:[...retained,online],total:retained.reduce((sum,group)=>sum+(group.items?.length||0),0)+online.items.length});
  }
  function newUniversalSearchSession(seed={}){return {rawQuery:'',normalisedQuery:'',currentInput:'',focused:false,caretStart:0,caretEnd:0,previewRevision:0,committedRevision:0,submissionMode:'preview',intent:null,quantity:null,sourceContext:null,preparationContext:null,ownedAsync:null,errorOwner:null,selectedResult:null,destination:null,submittedModel:null,...seed};}
  function previewUniversalSearch(state,input,{focused=false,caretStart=null,caretEnd=null}={}){const target=state&&typeof state==='object'?state:newUniversalSearchSession(),raw=String(input||''),normal=corrected(raw),changed=raw!==target.rawQuery;target.rawQuery=raw;target.currentInput=raw;target.normalisedQuery=normal;target.focused=!!focused;target.caretStart=Number.isFinite(caretStart)?caretStart:raw.length;target.caretEnd=Number.isFinite(caretEnd)?caretEnd:raw.length;target.submissionMode='preview';if(changed){target.previewRevision=Number(target.previewRevision||0)+1;target.ownedAsync=null;target.errorOwner=null;target.intent=null;target.quantity=null;target.sourceContext=null;target.preparationContext=null;target.selectedResult=null;target.submittedModel=null;}return target;}
  function commitUniversalSearch(state,records,reason='explicit-submit',options={}){const target=state&&typeof state==='object'?state:newUniversalSearchSession();target.committedRevision=Number(target.committedRevision||0)+1;target.submissionMode=String(reason||'explicit-submit');target.intent=queryIntent(target.rawQuery);target.quantity=SEARCH?.parseQuantityLanguage?.(target.rawQuery,{candidates:records})||null;target.submittedModel=submittedResultModel(records,target.rawQuery,options);target.ownedAsync={previewRevision:target.previewRevision,committedRevision:target.committedRevision,query:target.rawQuery};target.errorOwner=null;return target.submittedModel;}
  function ownsUniversalAsync(state,ticket){return !!ticket&&Number(ticket.previewRevision)===Number(state?.previewRevision)&&Number(ticket.committedRevision)===Number(state?.committedRevision)&&String(ticket.query||'')===String(state?.rawQuery||'');}
  function newSearchState(){return {query:'',tab:'all',revision:0,snapshot:null};}
  function beginSearch(state={},context={}){return {...newSearchState(),...state,query:'',tab:context.tab||'all',revision:Number(state.revision||0)+1,snapshot:null};}
  function rememberSearch(state={},view={}){return {...state,snapshot:{query:String(view.query||''),tab:view.tab||'all',scrollY:Number(view.scrollY||0)}};}
  function restoreSearch(state={}){return state.snapshot?{...state,...state.snapshot}:{...state};}
  function transitionSearch(state={},nextQuery='',context={}){
    const previous=String(state.query||''),query=String(nextQuery||''),changed=previous!==query,blank=!query.trim();
    return {...newSearchState(),...state,query,tab:context.tab||state.tab||'all',revision:Number(state.revision||0)+(changed?1:0),snapshot:(changed||blank)?null:state.snapshot,pendingDrink:(changed||blank)?null:(context.pendingDrink??state.pendingDrink??null),sourceIntent:(changed||blank)?'':(state.sourceIntent||'')};
  }
  function newFederatedSearchState(){return {revision:0,query:'',local:Object.freeze([]),localCommitted:false,online:Object.freeze([]),localMeta:null};}
  function beginQueryRevision(state={},query=''){
    // Exact input owns results; corrected text is only for candidate matching.
    const raw=String(query||''),target=state&&typeof state==='object'?state:newFederatedSearchState();
    if(target.query===raw)return target.revision||0;
    target.revision=Number(target.revision||0)+1;target.query=raw;target.local=Object.freeze([]);target.localCommitted=false;target.online=Object.freeze([]);target.localMeta=null;return target.revision;
  }
  function revisionMatches(state,revision,query){return Number(state?.revision)===Number(revision)&&String(state?.query||'')===String(query||'');}
  function commitLocalSnapshot(state,revision,query,candidates=[],meta={}){
    if(!revisionMatches(state,revision,query))return false;if(state.localCommitted)return true;
    state.local=Object.freeze([...(candidates||[])]);state.localMeta=Object.freeze({...meta});state.localCommitted=true;return true;
  }
  function appendLocalSnapshot(state,revision,query,candidates=[]){
    if(!revisionMatches(state,revision,query))return false;const seen=new Set((state.local||[]).map(food=>food?.id||canonicalKey(food))),next=[...(state.local||[])];for(const food of candidates||[]){const key=food?.id||canonicalKey(food);if(!seen.has(key)){seen.add(key);next.push(food);}}state.local=Object.freeze(next);state.localCommitted=true;return true;
  }
  function appendOnlineSnapshot(state,revision,query,candidates=[]){
    if(!revisionMatches(state,revision,query))return false;const seen=new Set((state.online||[]).map(food=>food?.id||canonicalKey(food))),next=[...(state.online||[])];for(const food of candidates||[]){const key=food?.id||canonicalKey(food);if(!seen.has(key)){seen.add(key);next.push(food);}}state.online=Object.freeze(next);return true;
  }
  function naturalQuantityWarning(food,amount,unit){
    const quantity=Number(amount);if(!Number.isFinite(quantity)||quantity<=0)return {level:'invalid',requiresConfirmation:false,message:'Enter an amount greater than zero.'};
    const natural=String(unit||food?.defaultUnit||''),limits={burger:10,muffin:10,wrap:10,drink:12,portion:20,serve:20,sundae:10,mcflurry:10,cone:10,pie:10,item:20,meal:6},limit=limits[natural]||(['mL','g'].includes(natural)?10000:50);
    if(quantity<=limit)return {level:'normal',requiresConfirmation:false,message:''};
    const label=food?.unitLabels?.[natural]||natural||'servings';return {level:'implausible',requiresConfirmation:true,message:`${quantity} ${label} is much larger than a usual logging amount. Check whether you meant the natural serving, grams or millilitres before continuing.`};
  }

  const api={version:VERSION,recordTypes:RECORD_TYPES,sourceTiers:SOURCE_TIERS,productQualityTypes:PRODUCT_QUALITY,controlledTypos:CONTROLLED_TYPOS,australianAliases:AUSTRALIAN_ALIASES,norm,tokens,corrected,queryIntent,brandProductQuality,sourceTier,meaningfulProductName,productIdentityQuality,exactProductQuality,consumerDisplayName,fieldSpecificRank,consumerBrandMembership,consumerProductSpecificity,brandFamilyResults,australianAlternates,recordType,marketFor,sourceIdFor,canonicalKey,normaliseRecord,friesIntent,genericFriesCandidates,displayQuantity,rank,dedupe,dedupeRanked,duplicateIdentityEvidence,duplicateIdentity,duplicateAudit,resolve,partitionSearchRecords,provenance,provenanceParts,hasEnergy,addability,canLog,quickAddPolicy,fullReviewPolicy,commercialSourceClass,conceptShortlist,isExplicitProductRequest,explicitIdentityMatch,submittedResultModel,appendSubmittedOnline,newUniversalSearchSession,previewUniversalSearch,commitUniversalSearch,ownsUniversalAsync,newSearchState,beginSearch,rememberSearch,restoreSearch,transitionSearch,newFederatedSearchState,beginQueryRevision,revisionMatches,commitLocalSnapshot,appendLocalSnapshot,appendOnlineSnapshot,naturalQuantityWarning};
  Object.assign(api,{TRUST_CLASSES,brandKey,registerBrandDirectory,brandIdentity,brandPrefix,sourceEvidence,metricEvidence,sourceConflicts,productEligibility,canonicalProduct,canonicalName,strongDuplicateEvidence,canonicaliseRecords,sourceQuality,compareAustralianProducts,brandResultModel});
  registerBrandDirectory(global.HECAustralianCatalogueData?.brands||[]);
  global.HECFoodCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
