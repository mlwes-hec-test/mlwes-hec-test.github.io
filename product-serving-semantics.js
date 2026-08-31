/* Healthy Eating Companion — central product and serving semantics 0.6.33.
   One policy owns product role, serving defaults, compatible unit families,
   parent/component ranking and catalogue validation. Importers may supply
   explicit productSemantics; otherwise source metadata is preferred before
   conservative inference. Uncertain records stay unclassified.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const TYPES=Object.freeze({
    SINGLE:'single-item',COUNTED:'counted-item',SIZED:'sized-variant',MEAL:'complete-meal',
    COMPONENT:'component',PACKAGED:'packaged-serving',CONFIGURABLE:'configurable-bundle',
    REFERENCE:'reference-only',UNKNOWN:'unknown'
  });
  const BASIS=Object.freeze({ITEM:'per-item',SERVE:'per-serve',HUNDRED_G:'per-100-g',HUNDRED_ML:'per-100-mL',UNRESOLVED:'unresolved'});
  const COMPONENT_WORDS=Object.freeze(['sauce','syrup','dressing','dip','aioli','mayonnaise','mayo','ketchup','jam','butter','condiment','topping','seasoning']);
  const SIZE_WORDS=Object.freeze(['small','medium','large','regular','extra large']);
  const FOOD_GROUP_UNIT_PATTERN=/australian standard|standard (?:vegetable|fruit|grain|dairy|protein)|vegetable(?: group)? serve|fruit serve|grain serve|dairy serve|protein serve|dietary guidelines|eat for health/;
  const EXPLICIT_OVERRIDES=Object.freeze({}); // Reserved for source-reviewed exceptions; intentionally empty.
  const CONTROLLED_IDENTITY_ALIASES=Object.freeze({hotcakes:['hot cakes']}); // Orthographic only; no nutrition or serving override.

  function norm(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function unique(values){return [...new Set((values||[]).map(value=>String(value||'').trim()).filter(Boolean))];}
  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function stem(value){const word=norm(value);return word.length>4&&word.endsWith('s')&&!word.endsWith('ss')?word.slice(0,-1):word;}
  function words(value){return norm(value).split(' ').filter(Boolean);}
  function hasComponentIntent(value){const set=new Set(words(value));return COMPONENT_WORDS.some(word=>set.has(word));}
  function componentBase(value){return words(value).filter(word=>!COMPONENT_WORDS.includes(word)).map(stem).join(' ');}
  function countFrom(value){const match=String(value||'').match(/(?:^|\b)(\d+)\s*(?:pc|pcs|piece|pieces)\b/i);return match?Number(match[1]):0;}
  function sizeFrom(food){const explicit=String(food?.productSemantics?.size||food?.semanticSize||food?.variantLabel||'').trim();if(explicit)return explicit;const match=norm(food?.name).match(new RegExp(`^(${SIZE_WORDS.join('|')})\\b`));return match?match[1].replace(/\b\w/g,char=>char.toUpperCase()):'';}
  function metadataType(value){const key=norm(value).replace(/ /g,'-');return Object.values(TYPES).includes(key)?key:'';}
  function recordKind(food){return String(food?.recordType||'').toLowerCase().trim().replace(/_/g,'-');}
  function memberships(food){return unique([food?.category,food?.browseCategory,...(food?.categoryMemberships||[])]).map(norm);}
  function isDrink(food){return memberships(food).some(value=>/drink|shake|frappe|mccafe/.test(value));}
  function isPer100Reference(food){const type=recordKind(food),basis=food?.nutritionBasis||{},serving=norm(food?.serving);return (type==='afcd'||food?.afcd===true)&&(!food?.manufacturerServing&&!basis.manufacturerServing)&&(/per 100|reference/.test(serving)||food?.defaultUnit==='g'||food?.nutritionPer100||food?.nutritionPer100g);}
  function controlledAliasesFor(value){const text=norm(value),out=[];for(const [canonical,aliases] of Object.entries(CONTROLLED_IDENTITY_ALIASES))if(text.includes(canonical))out.push(...aliases);return unique(out);}
  function relationshipAliasesFor(value){const parts=String(value||'').trim().split(/\s+/),normal=parts.map(norm);if(parts.length<2||!normal.some(word=>COMPONENT_WORDS.includes(word)))return[];const index=normal.findIndex(word=>!COMPONENT_WORDS.includes(word));if(index<0||/s$/i.test(parts[index]))return[];const plural=[...parts];plural[index]=`${plural[index]}s`;return[plural.join(' ')];}

  function inferFromSource(food){
    const type=recordKind(food),member=memberships(food),name=norm(food?.name),kind=norm(food?.itemKind),nutritionStatus=norm(food?.nutritionStatus),count=Number(food?.semanticCount)||countFrom(food?.name)||countFrom(food?.standardServingLabel),size=sizeFrom(food);
    if(kind==='configurable-assembly'||nutritionStatus==='configurable'||food?.assemblyModel)return {type:TYPES.CONFIGURABLE,confidence:'high'};
    if(member.includes('condiments')||member.includes('sauces')||type==='component')return {type:TYPES.COMPONENT,confidence:'high',parentKey:componentBase(name)};
    if(type==='packaged'||type==='online-candidate'||food?.manufacturerServing||food?.packageServingExplicit)return {type:TYPES.PACKAGED,confidence:'high'};
    if(isPer100Reference(food))return {type:TYPES.REFERENCE,confidence:'high'};
    if(size)return {type:TYPES.SIZED,confidence:'high',size};
    if(count>0)return {type:TYPES.COUNTED,confidence:'high',count};
    if(!isDrink(food)&&(/\bmeal\b|\bbundle\b|\bdeal\b/.test(name)||/\bwith\b.*\b(?:butter|syrup|sauce|dressing)\b/.test(name)))return {type:TYPES.MEAL,confidence:'high'};
    if(type==='food-source'&&food?.serving)return {type:TYPES.SINGLE,confidence:'high'};
    return null;
  }
  function inferConservatively(food){
    const name=norm(food?.name),count=countFrom(food?.name),size=sizeFrom(food);
    if(hasComponentIntent(name)&&words(name).length<=5)return {type:TYPES.COMPONENT,confidence:'medium',parentKey:componentBase(name)};
    if(size)return {type:TYPES.SIZED,confidence:'medium',size};
    if(count)return {type:TYPES.COUNTED,confidence:'medium',count};
    if(food?.defaultUnit&&!['g','mL'].includes(food.defaultUnit))return {type:TYPES.SINGLE,confidence:'medium'};
    return {type:TYPES.UNKNOWN,confidence:'low'};
  }
  function classify(food={}){
    const override=EXPLICIT_OVERRIDES[String(food?.canonicalId||food?.sourceId||food?.id||'')];
    const explicit=override||food?.productSemantics||food?.semanticRole;
    if(explicit){const object=typeof explicit==='string'?{type:explicit}:explicit,type=metadataType(object.type);if(type)return {...clone(object),type,source:override?'audited-override':'explicit-metadata',confidence:object.confidence||'high'};}
    const source=inferFromSource(food);if(source)return {...source,source:'source-metadata'};
    return {...inferConservatively(food),source:'central-inference'};
  }
  function foodGroupUnitEvidence(food,key){const label=norm(food?.unitLabels?.[key]||key),origin=norm(food?.unitOrigins?.[key]?.origin||'');return FOOD_GROUP_UNIT_PATTERN.test(`${label} ${origin}`);}
  function commercialOrComposite(food,semantics=classify(food)){
    const type=recordKind(food),name=norm(food?.name),category=memberships(food).join(' '),brand=norm(food?.brand),genericBrand=!brand||/^(?:generic|generic australian|fresh|fresh produce|fresh or frozen|australian food composition database|afcd)$/.test(brand);
    return !!food?.foodSourceId||['packaged','online-candidate'].includes(type)||[TYPES.MEAL,TYPES.COMPONENT,TYPES.PACKAGED,TYPES.CONFIGURABLE].includes(semantics.type)||/restaurant|takeaway|meal|bundle|spreads/.test(category)||/\b(?:with|in bread|burger|sandwich|wrap|meal|bundle|sauce)\b/.test(name)||!genericBrand;
  }
  function foodGroupUnitEligibility(food={},semantics=classify(food)){
    const explicit=food?.foodGroupUnitPolicy||food?.productSemantics?.foodGroupUnitPolicy;
    if(explicit===true||explicit?.allowed===true)return {allowed:true,reason:'explicit-trustworthy-metadata'};
    if(explicit===false||explicit?.allowed===false)return {allowed:false,reason:'explicitly-excluded'};
    const hasEvidence=Object.keys(food?.units||{}).some(key=>foodGroupUnitEvidence(food,key));
    if(!hasEvidence)return {allowed:false,reason:'no-explicit-food-group-measure'};
    if(commercialOrComposite(food,semantics))return {allowed:false,reason:'commercial-or-composite-product'};
    const genericSource=recordKind(food)==='afcd'||food?.afcd===true||/generic|fresh food|food composition|afcd/.test(norm(`${food?.brand||''} ${food?.source||''}`));
    return genericSource?{allowed:true,reason:'explicit-guideline-measure-on-generic-food'}:{allowed:false,reason:'food-group-source-not-established'};
  }
  function safeUnitState(food={},semantics=classify(food)){
    const units=clone(food?.units||{}),unitLabels=clone(food?.unitLabels||{}),eligibility=foodGroupUnitEligibility(food,semantics);
    if(!eligibility.allowed)for(const key of Object.keys(units))if(foodGroupUnitEvidence(food,key)){delete units[key];delete unitLabels[key];}
    return {units,unitLabels,eligibility};
  }
  function trustedDietaryDescriptors(food={}){
    const verified=food?.dietaryClaimsVerified===true||food?.provenance?.dietaryClaimsVerified===true;if(!verified)return[];
    const allowed=new Map([['plant based','plant-based'],['vegetarian','vegetarian'],['vegan','vegan'],['vegetable','vegetable']]);return unique(food?.dietaryClaims||food?.provenance?.dietaryClaims||[]).map(value=>allowed.get(norm(value))).filter(Boolean);
  }
  function nutritionBasis(food,semantics=classify(food)){
    if(semantics.type===TYPES.CONFIGURABLE)return BASIS.UNRESOLVED;
    if(semantics.type===TYPES.REFERENCE)return String(food?.nutritionPer100Unit||'g').toLowerCase()==='ml'?BASIS.HUNDRED_ML:BASIS.HUNDRED_G;
    if(semantics.type===TYPES.COUNTED||semantics.type===TYPES.SINGLE||semantics.type===TYPES.SIZED)return (food?.nutritionBasis?.perServing||food?.nutrients)?BASIS.ITEM:BASIS.UNRESOLVED;
    return (food?.nutritionBasis?.perServing||food?.nutrients)?BASIS.SERVE:BASIS.UNRESOLVED;
  }
  function naturalUnit(food,units=food?.units||{}){const preferred=[food?.defaultUnit,food?.servingDefaultUnit,'serve','item','burger','muffin','wrap','portion','drink','g','mL'].filter(Boolean);return preferred.find(key=>units[key]!==undefined)||Object.keys(units)[0]||'';}
  function servingPolicy(food={},semantics=classify(food)){
    const type=semantics.type,safe=safeUnitState(food,semantics),existingUnits=safe.units,existingLabels=safe.unitLabels,existingUnit=naturalUnit(food,existingUnits),count=Number(semantics.count)||0,size=semantics.size||sizeFrom(food),basis=nutritionBasis(food,semantics);
    const base={semanticType:type,semanticSource:semantics.source,confidence:semantics.confidence,nutritionBasis:basis,defaultAmount:Number(food?.defaultAmount)||1,defaultUnit:existingUnit,allowedUnits:Object.keys(existingUnits),allowedUnitFamily:'natural',units:existingUnits,unitLabels:existingLabels,foodGroupUnitEligibility:safe.eligibility,naturalServingDisplay:String(food?.serving||''),countMeaningful:false,sizePartOfIdentity:false,reviewOnly:false,partialEditingSafe:type!==TYPES.MEAL,loggable:food?.loggable!==false};
    if(type===TYPES.MEAL)return {...base,defaultAmount:1,defaultUnit:'meal',allowedUnits:['meal'],allowedUnitFamily:'complete-meal',units:{meal:1},unitLabels:{meal:'Complete Meal'},naturalServingDisplay:`1 complete meal (${String(food?.name||'').trim()})`,partialEditingSafe:false};
    if(type===TYPES.COMPONENT){const unit=existingUnit||'serve';return {...base,defaultAmount:1,defaultUnit:unit,allowedUnits:[unit],allowedUnitFamily:'component',units:{[unit]:Number(existingUnits[unit])||1},unitLabels:{[unit]:existingLabels[unit]||'Component Serve'},partialEditingSafe:true};}
    if(type===TYPES.COUNTED&&count>0)return {...base,defaultAmount:count,defaultUnit:'piece',allowedUnits:['piece','portion'],allowedUnitFamily:'count',units:{piece:1/count,portion:1},unitLabels:{piece:'Piece',portion:`${count}-Piece Portion`},naturalServingDisplay:`${count} pieces`,countMeaningful:true};
    if(type===TYPES.SIZED)return {...base,allowedUnitFamily:'sized-natural',sizePartOfIdentity:true,size,naturalServingDisplay:String(food?.serving||`1 ${size} serving`).trim()};
    if(type===TYPES.PACKAGED)return {...base,allowedUnitFamily:'package',naturalServingDisplay:String(food?.serving||food?.packageServingText||'').trim()};
    if(type===TYPES.CONFIGURABLE)return {...base,defaultAmount:1,defaultUnit:'bundle',allowedUnits:['bundle'],allowedUnitFamily:'configurable',units:{bundle:1},unitLabels:{bundle:'Configurable Bundle'},naturalServingDisplay:'Configuration required',reviewOnly:true,partialEditingSafe:false,loggable:false};
    if(type===TYPES.REFERENCE){const metric=String(food?.nutritionPer100Unit||'g').toLowerCase()==='ml'?'mL':'g',scale=Number(existingUnits[metric])||.01;if(safe.eligibility.allowed&&Object.keys(existingUnits).some(key=>foodGroupUnitEvidence(food,key)))return {...base,defaultAmount:existingUnit===metric?100:1,defaultUnit:existingUnit||metric,allowedUnits:Object.keys(existingUnits),allowedUnitFamily:'food-group-reference',units:existingUnits,unitLabels:existingLabels,naturalServingDisplay:existingUnit===metric?`100 ${metric} reference`:existingLabels[existingUnit]||String(food?.serving||''),reviewOnly:false,partialEditingSafe:true};return {...base,defaultAmount:100,defaultUnit:metric,allowedUnits:[metric],allowedUnitFamily:'metric-reference',units:{[metric]:scale},unitLabels:{[metric]:metric},naturalServingDisplay:`100 ${metric} reference`,reviewOnly:false,partialEditingSafe:true};}
    if(type===TYPES.UNKNOWN)return {...base,allowedUnitFamily:'unclassified',reviewOnly:true};
    return {...base,allowedUnitFamily:'natural-item'};
  }
  function applyToFood(food){
    if(!food)return food;const previousResolution=clone(food.semanticResolution||null),semantics=classify(food),policy=servingPolicy(food,semantics),before={amount:Number(food.defaultAmount),unit:String(food.defaultUnit||''),label:String(food.unitLabels?.[food.defaultUnit]||''),serving:String(food.serving||'')};
    food.productSemantics={...semantics};food.semanticType=semantics.type;food.semanticSource=semantics.source;food.servingPolicy={...policy,units:undefined,unitLabels:undefined};
    food.units=clone(policy.units);food.unitLabels=clone(policy.unitLabels);food.defaultAmount=policy.defaultAmount;food.defaultUnit=policy.defaultUnit;food.servingDefaultUnit=policy.defaultUnit;food.lockedServingUnit=policy.defaultUnit;food.fractionUnits=policy.countMeaningful?['piece','portion']:policy.allowedUnits.filter(unit=>!['g','mL'].includes(unit));food.serving=policy.naturalServingDisplay||food.serving;
    if(!policy.foodGroupUnitEligibility.allowed&&/dietary guidelines|eat for health/i.test(String(food.servingFoundationSource||''))){delete food.servingFoundationSource;delete food.servingFoundationNotes;}
    food.nutritionBasis={...(food.nutritionBasis||{}),semanticBasis:policy.nutritionBasis};if(!policy.loggable){food.loggable=false;if(semantics.type===TYPES.CONFIGURABLE)food.nutritionStatus='configurable';}
    const after={amount:food.defaultAmount,unit:food.defaultUnit,label:String(food.unitLabels?.[food.defaultUnit]||''),serving:String(food.serving||'')},changed=JSON.stringify(before)!==JSON.stringify(after);
    food.semanticResolution=previousResolution?.autoResolved&&!changed?previousResolution:{autoResolved:changed,before,after,rule:semantics.source};return food;
  }
  function rankAdjustment(food,query){
    const semantics=classify(food),q=norm(query),intent=hasComponentIntent(q),queryCore=words(q).filter(word=>!COMPONENT_WORDS.includes(word)).map(stem),foodCore=componentBase(food?.name),parentMatch=!!queryCore.length&&queryCore.every(word=>words(foodCore).map(stem).includes(word));
    if(semantics.type===TYPES.COMPONENT){if(intent)return {adjustment:180,intent:'component'};if(parentMatch)return {adjustment:-520,intent:'parent'};return {adjustment:-180,intent:'neutral'};}
    if(!intent&&parentMatch&&[TYPES.SINGLE,TYPES.SIZED,TYPES.MEAL,TYPES.COUNTED].includes(semantics.type))return {adjustment:160,intent:'parent'};
    return {adjustment:0,intent:intent?'component':'neutral'};
  }
  function validate(food,policy=servingPolicy(food)){
    const issues=[],type=policy.semanticType,labels=Object.values(policy.unitLabels||{}).map(norm).join(' '),units=policy.allowedUnits||[];
    if(type===TYPES.MEAL&&(/condiment/.test(labels)||policy.allowedUnitFamily==='component'))issues.push('meal-condiment-unit');
    if(type===TYPES.COMPONENT&&policy.allowedUnitFamily!=='component')issues.push('component-unit-family');
    if(type===TYPES.REFERENCE&&policy.allowedUnitFamily!=='food-group-reference'&&(policy.defaultAmount!==100||!['g','mL'].includes(policy.defaultUnit)))issues.push('reference-default');
    if(type===TYPES.SIZED&&!policy.sizePartOfIdentity)issues.push('size-identity');
    if(type===TYPES.COUNTED&&(!policy.countMeaningful||policy.defaultAmount<2))issues.push('count-semantics');
    if(type===TYPES.SINGLE&&policy.defaultAmount===1&&policy.defaultUnit==='g'&&food?.serving)issues.push('natural-item-1g');
    if(type===TYPES.CONFIGURABLE&&(policy.loggable||food?.loggable!==false))issues.push('configurable-loggable');
    if(type===TYPES.PACKAGED&&(/australian standard|vegetable|fruit serve|grain serve/.test(labels)||units.some(unit=>/standardServe|vegetable|fruit/i.test(unit))))issues.push('packaged-food-group-unit');
    if(!policy.foodGroupUnitEligibility?.allowed&&(FOOD_GROUP_UNIT_PATTERN.test(labels)||units.some(unit=>foodGroupUnitEvidence(food,unit))))issues.push('food-group-unit-not-authorised');
    if(!policy.defaultUnit||!policy.allowedUnits.includes(policy.defaultUnit))issues.push('default-unit-not-allowed');
    return issues;
  }
  function audit(records=[]){
    const categoryCounts=Object.fromEntries(Object.values(TYPES).map(type=>[type,0])),flagged=[],unresolved=[];let autoResolved=0;
    const rows=(records||[]).map(food=>{const semantics=classify(food),policy=servingPolicy(food,semantics),issues=validate(food,policy),original=food.semanticResolution?.before||{amount:food.defaultAmount,unit:food.defaultUnit,label:food.unitLabels?.[food.defaultUnit]||'',serving:food.serving},resolved=food.semanticResolution?.after||{amount:policy.defaultAmount,unit:policy.defaultUnit,label:policy.unitLabels?.[policy.defaultUnit]||'',serving:policy.naturalServingDisplay},changed=food.semanticResolution?.autoResolved===true||JSON.stringify(original)!==JSON.stringify(resolved);categoryCounts[semantics.type]++;if(changed){autoResolved++;flagged.push({id:food.id,name:food.name,type:semantics.type,issues:['central-policy-adjustment'],original,resolved});}if(semantics.type===TYPES.UNKNOWN||issues.length)unresolved.push({id:food.id,name:food.name,type:semantics.type,issues});return{id:food.id,name:food.name,semanticType:semantics.type,semanticSource:semantics.source,nutritionBasis:policy.nutritionBasis,defaultAmount:policy.defaultAmount,defaultUnit:policy.defaultUnit,allowedUnitFamily:policy.allowedUnitFamily,source:food.source||'',loggable:policy.loggable,configurable:semantics.type===TYPES.CONFIGURABLE,issues};});
    return {totalRecords:rows.length,categoryCounts,flaggedConflicts:flagged.length,safelyAutoResolved:autoResolved,unresolvedCount:unresolved.length,flagged,unresolved,rows};
  }

  const api={version:VERSION,types:TYPES,bases:BASIS,componentWords:COMPONENT_WORDS,explicitOverrides:EXPLICIT_OVERRIDES,controlledIdentityAliases:CONTROLLED_IDENTITY_ALIASES,norm,classify,foodGroupUnitEvidence,foodGroupUnitEligibility,trustedDietaryDescriptors,servingPolicy,applyToFood,rankAdjustment,validate,audit,controlledAliasesFor,relationshipAliasesFor};
  global.HECProductServingSemantics=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
