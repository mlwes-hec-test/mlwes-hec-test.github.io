/* Healthy Eating Companion — Australian Food Catalogue Foundation 0.6.32
   Pure catalogue identity, ranking, de-duplication and provenance utilities.
   UI and persistence stay in alpha06.js; query parsing stays in
   search-foundation.js. No nutrition values are created here.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
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

  function queryIntent(query){
    const raw=String(query||'').trim(),normal=norm(raw),types=['brand','retailer','restaurant'];
    if(!normal)return {kind:'none',query:raw,normalised:'',entity:null,productQuery:''};
    const exact=REG?.exactEntity?.(raw,types)||null,brandFamilyAlias=exact?.type==='brand'&&[exact.name,...(exact.familyAliases||[])].some(alias=>norm(alias)===normal);
    if(exact&&(exact.type!=='brand'||brandFamilyAlias))return {kind:exact.type==='restaurant'?'source':'brand-family',query:raw,normalised:normal,entity:exact,productQuery:'',reason:exact.type==='restaurant'?'recognised-source-only':'recognised-brand-only'};
    const match=REG?.primary?.(raw,types)||null,residual=String(REG?.stripRecognisedEntities?.(raw)??raw).trim();
    return {kind:'product',query:raw,normalised:normal,entity:match?.entity||null,productQuery:residual||raw,reason:match?'entity-plus-product':'product'};
  }
  function entityMatchesFood(entity,food){return !!entity&&!!food&&!!REG?.entityMatchesHay?.(entity,`${food?.brand||''} ${food?.name||''} ${(food?.aliases||[]).join(' ')} ${food?.sourceDisplayName||''} ${(food?.sourceAliases||[]).join(' ')}`);}
  function consumerBrandMembership(entity,food){
    if(!entity||entity.type!=='brand'||!food)return {matches:false,reason:'not-a-brand-candidate'};
    const mapped=norm(food.consumerBrandId||food.brandEntityId||''),entityIds=new Set([norm(entity.id),norm(entity.name)]);
    if(mapped)return {matches:entityIds.has(mapped),reason:entityIds.has(mapped)?'trusted-brand-registry-id':'different-brand-registry-id'};
    const aliases=new Set([entity.name,...(entity.aliases||[]),...(entity.familyAliases||[])].map(norm).filter(Boolean)),raw=String(food.brand||'').trim(),normal=norm(raw);
    if(!normal)return {matches:false,reason:'missing-explicit-brand'};
    if(aliases.has(normal))return {matches:true,reason:'exact-canonical-brand'};
    const primary=norm(raw.split(/[,;|/]/,1)[0]);
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
  function exactProductQuality(food,{candidates=[]}={}){
    const base=productIdentityQuality(food),name=norm(food?.name),nameTokens=tokens(name),brand=norm(food?.brand),peers=(candidates||[]).filter(candidate=>candidate&&candidate!==food),metadata=[food?.genericName,food?.familyName,food?.productFamily,food?.productLine,food?.categoryFacet,food?.category,...(food?.categories||[]),...(food?.categoryMemberships||[])].map(norm).filter(Boolean),sameName=peers.some(candidate=>norm(candidate.name)===name),containedByPeer=nameTokens.length===1&&peers.some(candidate=>tokens(candidate.name).includes(name)&&norm(candidate.name)!==name),metadataReference=metadata.includes(name),weakLabel=WEAK_IDENTITY_LABELS.has(name),brandReference=!!brand&&name===brand,residualName=brand&&name.startsWith(`${brand} `)?name.slice(brand.length+1):name,sameBrandPeers=peers.filter(candidate=>!brand||norm(candidate.brand)===brand),lineLabels=new Set([food?.familyName,food?.productFamily,food?.productLine,...sameBrandPeers.flatMap(candidate=>[candidate?.familyName,candidate?.productFamily,candidate?.productLine])].map(norm).filter(Boolean)),lineShell=![RECORD_TYPES.FOOD_SOURCE,RECORD_TYPES.AFCD,RECORD_TYPES.RECIPE].includes(recordType(food))&&lineLabels.has(residualName)&&sameBrandPeers.some(candidate=>{const peerName=norm(candidate.name),peerResidual=brand&&peerName.startsWith(`${brand} `)?peerName.slice(brand.length+1):peerName;return peerResidual!==residualName&&` ${peerResidual} `.includes(` ${residualName} `);});
    let exactEligible=base.exactEligible||(base.classification===PRODUCT_QUALITY.FOREIGN&&recordType(food)!==RECORD_TYPES.ONLINE&&meaningfulProductName(food)),reason=base.reason;
    if(brandReference){exactEligible=false;reason='brand-reference';}
    else if(base.classification===PRODUCT_QUALITY.BARCODE_ONLY){exactEligible=false;reason='barcode-known-name-incomplete';}
    else if(weakLabel||sameName||lineShell||(nameTokens.length===1&&(containedByPeer||metadataReference))){exactEligible=false;reason=sameName?'ambiguous-duplicate-label':weakLabel?'generic-product-label':'family-or-line-placeholder';}
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
    const broad=dedupe(records||[]).filter(food=>entityMatchesFood(intent.entity,food)),eligible=[],excluded=[];
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
  function nutrientSignature(food){const keys=['calories','energyKj','protein','fat','satFat','carbs','sugar','sodium','fibre'],values=keys.map(key=>{const value=food?.nutrients?.[key];return value===null||value===undefined||value===''?'':Number(value);});return values.some(value=>value!=='')?values.join('|'):'';}
  function servingSignature(food){const units=Object.entries(food?.units||{}).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${norm(key)}:${Number(value)}`).join(','),unit=norm(food?.defaultUnit),serving=norm(food?.serving);return unit||serving||units?[String(food?.defaultAmount??''),unit,serving,units].join('|'):'';}
  function provenanceSignature(food){return norm(food?.sourceUrl||food?.provenance?.url||food?.officialSourceUrl||food?.source||'');}
  function duplicateIdentityEvidence(left,right){
    if(!left||!right)return {duplicate:false,reason:'missing-record'};
    const sameCanonical=canonicalKey(left)===canonicalKey(right),sameIdentity=norm(left.name)===norm(right.name)&&norm(left.brand)===norm(right.brand),leftServing=servingSignature(left),rightServing=servingSignature(right),leftNutrition=nutrientSignature(left),rightNutrition=nutrientSignature(right),leftProvenance=provenanceSignature(left),rightProvenance=provenanceSignature(right),sameServing=!!leftServing&&leftServing===rightServing,sameNutrition=!!leftNutrition&&leftNutrition===rightNutrition,sameProvenance=(!leftProvenance&&!rightProvenance)||!!leftProvenance&&leftProvenance===rightProvenance,duplicate=sameCanonical||(sameIdentity&&sameServing&&sameNutrition&&sameProvenance);
    return {duplicate,reason:sameCanonical?'same-canonical-id':duplicate?'same-identity-serving-nutrition-provenance':sameIdentity?'distinct-serving-nutrition-or-provenance':'different-identity',sameCanonical,sameIdentity,sameServing,sameNutrition,sameProvenance,leftCanonical:canonicalKey(left),rightCanonical:canonicalKey(right)};
  }
  function duplicateIdentity(left,right){return duplicateIdentityEvidence(left,right).duplicate;}
  function equivalentDisplayKey(food){const serving=servingSignature(food),nutrition=nutrientSignature(food),provenance=provenanceSignature(food);return serving&&nutrition?`${norm(food?.brand)}|${norm(food?.name)}|${serving}|${nutrition}|${provenance}`:'';}
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
  function newFederatedSearchState(){return {revision:0,query:'',local:Object.freeze([]),localCommitted:false,online:Object.freeze([]),localMeta:null};}
  function beginQueryRevision(state={},query=''){
    const normal=corrected(query),target=state&&typeof state==='object'?state:newFederatedSearchState();
    if(target.query===normal)return target.revision||0;
    target.revision=Number(target.revision||0)+1;target.query=normal;target.local=Object.freeze([]);target.localCommitted=false;target.online=Object.freeze([]);target.localMeta=null;return target.revision;
  }
  function revisionMatches(state,revision,query){return Number(state?.revision)===Number(revision)&&String(state?.query||'')===corrected(query);}
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

  const api={version:VERSION,recordTypes:RECORD_TYPES,sourceTiers:SOURCE_TIERS,productQualityTypes:PRODUCT_QUALITY,controlledTypos:CONTROLLED_TYPOS,australianAliases:AUSTRALIAN_ALIASES,norm,tokens,corrected,queryIntent,brandProductQuality,sourceTier,meaningfulProductName,productIdentityQuality,exactProductQuality,consumerDisplayName,fieldSpecificRank,consumerBrandMembership,consumerProductSpecificity,brandFamilyResults,australianAlternates,recordType,marketFor,sourceIdFor,canonicalKey,normaliseRecord,friesIntent,genericFriesCandidates,displayQuantity,rank,dedupe,dedupeRanked,duplicateIdentityEvidence,duplicateIdentity,duplicateAudit,resolve,partitionSearchRecords,provenance,hasEnergy,canLog,quickAddPolicy,fullReviewPolicy,newSearchState,beginSearch,rememberSearch,restoreSearch,transitionSearch,newFederatedSearchState,beginQueryRevision,revisionMatches,commitLocalSnapshot,appendLocalSnapshot,appendOnlineSnapshot,naturalQuantityWarning};
  global.HECFoodCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
