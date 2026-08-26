/* Healthy Eating Companion — Reusable Australian Food Source Catalogue 0.6.33
   Source-neutral catalogue registration, conversion, retirement and refresh
   utilities. Chain-specific facts live in separate catalogue modules.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const ITEM_STATUSES=Object.freeze({CURRENT:'current',RETIRED:'retired'});
  const NUTRITION_STATUSES=Object.freeze({COMPLETE:'complete',UNAVAILABLE:'unavailable',CONFIGURABLE:'configurable'});
  const NUTRIENT_KEYS=Object.freeze(['energyKj','calories','protein','fat','satFat','carbs','sugar','sodium','fibre']);
  const catalogues=new Map();

  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function norm(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function finiteOrNull(value){if(value===null||value===undefined||value==='')return null;const number=Number(value);return Number.isFinite(number)?number:null;}
  function unique(values){return [...new Set((values||[]).map(value=>String(value||'').trim()).filter(Boolean))];}
  function normaliseNutrients(values={}){const result={};for(const key of NUTRIENT_KEYS)if(Object.prototype.hasOwnProperty.call(values,key))result[key]=finiteOrNull(values[key]);return result;}
  function validateSource(source={}){
    const errors=[];
    if(!String(source.id||'').trim())errors.push('source.id');
    if(!String(source.displayName||'').trim())errors.push('source.displayName');
    if(!String(source.sourceType||'').trim())errors.push('source.sourceType');
    if(String(source.market||'')!=='AU'||String(source.country||'')!=='Australia')errors.push('source.market/country');
    if(!String(source.officialUrl||'').startsWith('https://'))errors.push('source.officialUrl');
    if(!String(source.lastCheckedDate||'').trim())errors.push('source.lastCheckedDate');
    if(!String(source.catalogueVersion||'').trim())errors.push('source.catalogueVersion');
    if(!String(source.catalogueCheckedAt||'').trim())errors.push('source.catalogueCheckedAt');
    if(typeof source.productionApproved!=='boolean')errors.push('source.productionApproved');
    if(!String(source.usageScope||'').trim())errors.push('source.usageScope');
    if(!String(source.licenceStatus||'').trim())errors.push('source.licenceStatus');
    return errors;
  }
  function validateEntity(item={},label='item'){
    const errors=[];
    if(!String(item.id||'').trim())errors.push(`${label}.id`);
    if(!String(item.name||'').trim())errors.push(`${label}.name`);
    if(!String(item.standardServingLabel||'').trim())errors.push(`${label}.standardServingLabel`);
    if(!String(item.serving?.unitKey||'').trim()||!String(item.serving?.unitLabel||'').trim())errors.push(`${label}.serving`);
    if(!Object.values(NUTRITION_STATUSES).includes(item.nutritionStatus))errors.push(`${label}.nutritionStatus`);
    if(item.loggable&&item.nutritionStatus!==NUTRITION_STATUSES.COMPLETE)errors.push(`${label}.loggable`);
    if(item.nutritionStatus===NUTRITION_STATUSES.COMPLETE){
      if(finiteOrNull(item.nutritionPerServing?.calories)===null)errors.push(`${label}.nutritionPerServing.calories`);
      if(finiteOrNull(item.nutritionPerServing?.energyKj)===null)errors.push(`${label}.nutritionPerServing.energyKj`);
    }
    if(!String(item.provenance?.url||'').startsWith('https://'))errors.push(`${label}.provenance.url`);
    return errors;
  }
  function validateItem(item={}){const errors=validateEntity(item,'item');if(!String(item.category||'').trim())errors.push('item.category');if(!Object.values(ITEM_STATUSES).includes(item.status))errors.push('item.status');return errors;}
  function normaliseEntity(raw={},fallback={}){
    const entity={...clone(fallback),...clone(raw)};
    entity.aliases=unique([entity.name,...(entity.aliases||[])]);
    entity.nutritionStatus=entity.nutritionStatus||NUTRITION_STATUSES.COMPLETE;
    entity.loggable=entity.loggable===undefined?entity.nutritionStatus===NUTRITION_STATUSES.COMPLETE:!!entity.loggable;
    entity.nutritionPerServing=normaliseNutrients(entity.nutritionPerServing);
    entity.nutritionPer100=normaliseNutrients(entity.nutritionPer100||entity.nutritionPer100g);
    entity.nutritionPer100g=clone(entity.nutritionPer100);
    entity.servingWeightG=finiteOrNull(entity.servingWeightG);
    entity.servingVolumeMl=finiteOrNull(entity.servingVolumeMl);
    entity.sourceAnomalies=unique(entity.sourceAnomalies||[]);
    return entity;
  }
  function normaliseCatalogue(input={}){
    const source={...clone(input.source||{})};
    source.aliases=unique([source.displayName,...(source.aliases||[])]);
    source.referenceUrls=unique([source.officialUrl,...(source.referenceUrls||[])]);
    source.productionApproved=!!source.productionApproved;
    const ids=new Set();
    const items=(input.items||[]).map(raw=>{
      const item=normaliseEntity(raw,{sourceId:source.id});
      item.categoryMemberships=unique([raw.category,...(raw.categoryMemberships||[])]);
      item.licensing={usageScope:source.usageScope,licenceStatus:source.licenceStatus,productionApproved:source.productionApproved,inheritedFromSource:true};
      if(ids.has(item.id))throw new Error(`Duplicate food source item id: ${source.id}:${item.id}`);ids.add(item.id);
      const variantIds=new Set();
      item.variants=(raw.variants||[]).map(rawVariant=>{
        const variant=normaliseEntity(rawVariant,{provenance:item.provenance,sourceLastCheckedDate:item.sourceLastCheckedDate,effectiveDate:item.effectiveDate,nutritionStatus:item.nutritionStatus,loggable:item.loggable,serving:item.serving,standardServingLabel:item.standardServingLabel});
        variant.licensing=clone(item.licensing);
        if(variantIds.has(variant.id))throw new Error(`Duplicate food source variant id: ${source.id}:${item.id}:${variant.id}`);variantIds.add(variant.id);
        const variantErrors=validateEntity(variant,'variant');if(variantErrors.length)throw new Error(`Invalid food source variant ${source.id}:${item.id}:${variant.id}: ${variantErrors.join(', ')}`);
        return variant;
      });
      const errors=validateItem(item);if(errors.length)throw new Error(`Invalid food source item ${source.id}:${item.id}: ${errors.join(', ')}`);
      return item;
    });
    const sourceErrors=validateSource(source);if(sourceErrors.length)throw new Error(`Invalid food source ${source.id||'(missing id)'}: ${sourceErrors.join(', ')}`);
    return {schemaVersion:2,source,items};
  }
  function registerCatalogue(input){const catalogue=normaliseCatalogue(input);catalogues.set(catalogue.source.id,catalogue);return clone(catalogue);}
  function getCatalogue(sourceId){return clone(catalogues.get(String(sourceId||''))||null);}
  function allCatalogues(){return [...catalogues.values()].map(clone);}
  function sourceForAlias(value){const q=norm(value);if(!q)return null;for(const catalogue of catalogues.values())if(catalogue.source.aliases.some(alias=>norm(alias)===q))return clone(catalogue.source);return null;}
  function itemById(itemId,{sourceId='',includeRetired=true}={}){const sources=sourceId?[catalogues.get(sourceId)].filter(Boolean):[...catalogues.values()];for(const catalogue of sources){const item=catalogue.items.find(candidate=>candidate.id===itemId&&(includeRetired||candidate.status===ITEM_STATUSES.CURRENT));if(item)return clone(item);}return null;}
  function blockedReason(status){
    if(status===NUTRITION_STATUSES.CONFIGURABLE)return 'This meal contains configurable product and size choices, so one fixed nutrition value would be unsafe. Choose components in a future configurator.';
    if(status===NUTRITION_STATUSES.UNAVAILABLE)return "McDonald's Australia does not currently publish a complete fixed nutrition table for this product. No estimate has been used.";
    return '';
  }
  function toFoodRecord(item,source,variant=null){
    if(!item||!source)return null;
    const entity=variant||item,unitKey=entity.serving.unitKey,unitLabel=entity.serving.unitLabel,sourceItemKey=`${source.id}:${item.id}${variant?`:${variant.id}`:''}`;
    const per100=clone(entity.nutritionPer100||entity.nutritionPer100g||{}),licensing={usageScope:source.usageScope,licenceStatus:source.licenceStatus,productionApproved:source.productionApproved,inheritedFromSource:true};
    return {
      id:`food-source:${sourceItemKey}`,canonicalId:`food-source:${sourceItemKey}`,recordType:'food-source',foodSourceId:source.id,sourceItemId:item.id,sourceVariantId:variant?.id||'',sourceId:sourceItemKey,
      familyId:item.id,familyName:item.name,variantLabel:variant?.variantLabel||'',name:entity.name,brand:source.displayName,category:item.category,categoryMemberships:clone(item.categoryMemberships),country:source.country,market:source.market,
      aliases:unique([...(item.aliases||[]),...(entity.aliases||[])]),sourceAliases:clone(source.aliases),sourceDisplayName:source.displayName,sourceType:source.sourceType,
      itemStatus:item.status,current:item.status===ITEM_STATUSES.CURRENT,retiredAt:item.retiredAt||'',nutritionStatus:entity.nutritionStatus,loggable:!!entity.loggable,entryBlockedReason:entity.entryBlockedReason||blockedReason(entity.nutritionStatus),
      itemKind:item.itemKind||'product',assemblyModel:clone(item.assemblyModel||null),promotionalStatus:item.promotionalStatus||'standard',promotional:!!item.promotional,limitedTime:!!item.limitedTime,promotionExpiry:item.promotionExpiry||'',
      defaultAmount:1,defaultUnit:unitKey,servingDefaultUnit:unitKey,lockedServingUnit:unitKey,fractionUnits:[unitKey],units:{[unitKey]:1},unitLabels:{[unitKey]:unitLabel},serving:entity.standardServingLabel,
      servingWeightG:entity.servingWeightG,servingVolumeMl:entity.servingVolumeMl,nutritionPer100Unit:entity.nutritionPer100Unit||item.nutritionPer100Unit||'',nutrients:clone(entity.nutritionPerServing),nutritionPer100:per100,nutritionPer100g:per100,
      nutritionBasis:{perServing:clone(entity.nutritionPerServing),per100,servingAmount:entity.servingWeightG??entity.servingVolumeMl,servingUnit:entity.servingWeightG!==null?'g':entity.servingVolumeMl!==null?'mL':'',servingText:entity.standardServingLabel,manufacturerServing:false},
      score:6,source:`Official ${source.displayName} menu nutrition · checked ${entity.sourceLastCheckedDate||source.lastCheckedDate}`,sourceUrl:entity.provenance.url,officialSourceUrl:source.officialUrl,provenance:clone(entity.provenance),sourceAnomalies:unique([...(item.sourceAnomalies||[]),...(entity.sourceAnomalies||[])]),
      sourceLastCheckedDate:entity.sourceLastCheckedDate||source.lastCheckedDate,lastSeenAt:entity.lastSeenAt||item.lastSeenAt||source.catalogueCheckedAt,catalogueVersion:source.catalogueVersion,catalogueCheckedAt:source.catalogueCheckedAt,effectiveDate:entity.effectiveDate||source.effectiveDate||'',
      usageScope:licensing.usageScope,licenceStatus:licensing.licenceStatus,productionApproved:licensing.productionApproved,licensing,verificationStatus:'official-source',verified:true,ingredients:'',allergens:[],waterMl:0,hydrationType:item.category.includes('Drink')?'drink':'food',foodGroups:{}
    };
  }
  function foodRecords({sourceId='',includeRetired=false}={}){const sources=sourceId?[catalogues.get(sourceId)].filter(Boolean):[...catalogues.values()],records=[];for(const catalogue of sources)for(const item of catalogue.items){if(!includeRetired&&item.status!==ITEM_STATUSES.CURRENT)continue;if(item.variants.length)for(const variant of item.variants)records.push(toFoodRecord(item,catalogue.source,variant));else records.push(toFoodRecord(item,catalogue.source));}return records;}
  function nutritionSnapshot(item){return {nutritionStatus:item?.nutritionStatus,nutritionPerServing:item?.nutritionPerServing,nutritionPer100:item?.nutritionPer100,variants:(item?.variants||[]).map(v=>({id:v.id,nutritionStatus:v.nutritionStatus,nutritionPerServing:v.nutritionPerServing,nutritionPer100:v.nutritionPer100}))};}
  function sameItemNutrition(left,right){return JSON.stringify(nutritionSnapshot(left))===JSON.stringify(nutritionSnapshot(right));}
  function itemDetailsSnapshot(item){const value=clone(item);delete value.nutritionPerServing;delete value.nutritionPer100;delete value.nutritionPer100g;delete value.versions;for(const variant of value.variants||[]){delete variant.nutritionPerServing;delete variant.nutritionPer100;delete variant.nutritionPer100g;}return value;}
  function diffCatalogues(previousInput,incomingInput){
    const previous=normaliseCatalogue(previousInput),incoming=normaliseCatalogue(incomingInput),oldById=new Map(previous.items.map(item=>[item.id,item])),newById=new Map(incoming.items.map(item=>[item.id,item]));
    const added=incoming.items.filter(item=>!oldById.has(item.id)).map(item=>item.id),removed=previous.items.filter(item=>item.status===ITEM_STATUSES.CURRENT&&!newById.has(item.id)).map(item=>item.id);
    const nutritionChanged=incoming.items.filter(item=>{const old=oldById.get(item.id);return old&&!sameItemNutrition(old,item);}).map(item=>item.id),detailsChanged=incoming.items.filter(item=>{const old=oldById.get(item.id);return old&&JSON.stringify(itemDetailsSnapshot(old))!==JSON.stringify(itemDetailsSnapshot(item));}).map(item=>item.id);
    return {added,removed,nutritionChanged,detailsChanged,unchanged:incoming.items.filter(item=>{const old=oldById.get(item.id);return old&&sameItemNutrition(old,item)&&JSON.stringify(itemDetailsSnapshot(old))===JSON.stringify(itemDetailsSnapshot(item));}).map(item=>item.id)};
  }
  function reconcileCatalogues(previousInput,incomingInput){
    const previous=normaliseCatalogue(previousInput),incoming=normaliseCatalogue(incomingInput);if(previous.source.id!==incoming.source.id)throw new Error('Cannot reconcile different food sources');
    const incomingById=new Map(incoming.items.map(item=>[item.id,item])),items=[];
    for(const old of previous.items){const fresh=incomingById.get(old.id);if(!fresh){items.push({...old,status:ITEM_STATUSES.RETIRED,retiredAt:old.retiredAt||incoming.source.lastCheckedDate});continue;}incomingById.delete(old.id);const changed=!sameItemNutrition(old,fresh)||JSON.stringify(itemDetailsSnapshot(old))!==JSON.stringify(itemDetailsSnapshot(fresh)),history=clone(old.versions||[]);if(changed)history.push({catalogueVersion:previous.source.catalogueVersion,effectiveDate:old.effectiveDate||previous.source.effectiveDate||'',snapshot:clone(old)});items.push({...fresh,versions:history});}
    items.push(...incomingById.values());return normaliseCatalogue({source:incoming.source,items});
  }

  const api={version:VERSION,itemStatuses:ITEM_STATUSES,nutritionStatuses:NUTRITION_STATUSES,nutrientKeys:NUTRIENT_KEYS,norm,finiteOrNull,normaliseNutrients,validateSource,validateItem,normaliseCatalogue,registerCatalogue,getCatalogue,allCatalogues,sourceForAlias,itemById,toFoodRecord,foodRecords,diffCatalogues,reconcileCatalogues};
  global.HECFoodSources=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
