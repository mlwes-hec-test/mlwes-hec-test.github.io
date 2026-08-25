/* Healthy Eating Companion — Packaged Food & Snapshot Foundation 0.6.32
   Keeps manufacturer serving data, per-serving values and per-100 reference
   values distinct. Missing data remains missing; this module never invents a
   serving conversion or a zero nutrient value.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const NUTRIENTS=['energyKj','calories','protein','carbs','fat','satFat','fibre','sugar','sodium'];
  const METRIC_UNITS=new Set(['g','kg','mL','L']);
  function finiteOrNull(value){if(value===null||value===undefined||value==='')return null;const number=Number(value);return Number.isFinite(number)?number:null;}
  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function nutrientSet(values={}){return Object.fromEntries(NUTRIENTS.map(key=>[key,finiteOrNull(values[key])]));}
  function scale(values,factor){const f=finiteOrNull(factor);return Object.fromEntries(NUTRIENTS.map(key=>{const value=finiteOrNull(values?.[key]);return [key,value===null||f===null?null:value*f];}));}
  function metricAmount(amount,unit){const value=finiteOrNull(amount);if(value===null||value<=0)return null;if(unit==='kg')return {amount:value*1000,unit:'g'};if(unit==='L')return {amount:value*1000,unit:'mL'};if(unit==='g'||unit==='mL')return {amount:value,unit};return null;}
  function basisModel({perServing={},per100={},servingAmount=null,servingUnit='',servingText='',manufacturerServing=false}={}){
    const amount=finiteOrNull(servingAmount),unit=String(servingUnit||'');
    return {perServing:nutrientSet(perServing),per100:nutrientSet(per100),servingAmount:amount,servingUnit:unit,servingText:String(servingText||''),manufacturerServing:!!manufacturerServing&&amount!==null&&amount>0&&['g','mL'].includes(unit)};
  }
  function calculatedServingFrom100(model){if(!model?.manufacturerServing)return nutrientSet({});return scale(model.per100,model.servingAmount/100);}
  function selectedNutrition(model,{amount=1,unit='serve'}={}){
    if(!model)return nutrientSet({});
    if(unit==='serve')return scale(model.perServing,amount);
    const metric=metricAmount(amount,unit);if(!metric)return nutrientSet({});
    if(model.servingUnit&&metric.unit!==model.servingUnit)return nutrientSet({});
    return scale(model.per100,metric.amount/100);
  }
  function nutritionForFood(food,{amount=1,unit='serve'}={}){const multiplier=finiteOrNull(food?.units?.[unit]),qty=finiteOrNull(amount);if(multiplier===null||multiplier<=0||qty===null||qty<=0)return nutrientSet({});return scale(food?.nutrients||{},multiplier*qty);}
  function basisDiscrepancies(model,tolerance=.25){
    if(!model?.manufacturerServing)return[];const calculated=calculatedServingFrom100(model),out=[];
    for(const key of NUTRIENTS){const direct=finiteOrNull(model.perServing?.[key]),expected=finiteOrNull(calculated?.[key]);if(direct===null||expected===null)continue;const ratio=Math.abs(direct-expected)/Math.max(Math.abs(expected),key==='sodium'?1:.01);if(ratio>tolerance)out.push({key,direct,expected,ratio});}
    return out;
  }
  function attachBasis(food,modelInput={}){if(!food)return food;const model=basisModel(modelInput);food.nutritionBasis=model;food.manufacturerServing=model.manufacturerServing?{amount:model.servingAmount,unit:model.servingUnit,text:model.servingText}:null;food.nutritionBasisDiscrepancies=basisDiscrepancies(model);return food;}
  function supportedUnits(food){return Object.keys(food?.units||{}).filter(unit=>{const value=finiteOrNull(food.units[unit]);return value!==null&&value>0;});}
  function canUseUnit(food,unit){return supportedUnits(food).includes(unit);}
  function completeness(food){
    const missing=[];if(!String(food?.name||'').trim())missing.push('name');if(finiteOrNull(food?.nutrients?.calories)===null)missing.push('energy');
    const packageLike=!!food?.barcode||/package|online product|open food facts|nutrition panel/i.test(`${food?.source||''} ${food?.category||''}`);if(packageLike&&!supportedUnits(food).length)missing.push('serving');
    const explicitlyBlocked=food?.loggable===false||food?.nutritionStatus==='unavailable'||food?.nutritionStatus==='configurable';
    return {complete:missing.length===0&&!explicitlyBlocked,missing,canSaveToMyFoods:!!String(food?.name||'').trim(),canAddToDiary:!explicitlyBlocked&&missing.length===0&&food?.verificationStatus!=='recognised-only'&&food?.recognisedOnly!==true,blockedReason:explicitlyBlocked?String(food?.entryBlockedReason||'This food cannot be added to Diary as one fixed nutrition value.') : ''};
  }
  function diarySnapshot(food,{amount,unit,unitLabel,nutrients,loggedAt}={}){
    const stableSource=String(food?.sourceId||food?.afcdKey||food?.barcode||food?.id||'');return {snapshotVersion:VERSION,foodId:String(food?.id||''),canonicalId:String(food?.canonicalId||stableSource),sourceId:stableSource,foodSourceId:String(food?.foodSourceId||''),sourceItemId:String(food?.sourceItemId||''),sourceVariantId:String(food?.sourceVariantId||''),familyId:String(food?.familyId||''),familyName:String(food?.familyName||''),variantLabel:String(food?.variantLabel||''),itemStatus:String(food?.itemStatus||''),nutritionStatus:String(food?.nutritionStatus||''),loggable:food?.loggable!==false,categoryMemberships:clone(food?.categoryMemberships||[]),promotionalStatus:String(food?.promotionalStatus||''),limitedTime:!!food?.limitedTime,catalogueVersion:String(food?.catalogueVersion||''),catalogueCheckedAt:String(food?.catalogueCheckedAt||''),sourceLastCheckedDate:String(food?.sourceLastCheckedDate||''),lastSeenAt:String(food?.lastSeenAt||''),effectiveDate:String(food?.effectiveDate||''),sourceUrl:String(food?.sourceUrl||''),provenance:clone(food?.provenance||null),sourceAnomalies:clone(food?.sourceAnomalies||[]),usageScope:String(food?.usageScope||''),licenceStatus:String(food?.licenceStatus||''),productionApproved:!!food?.productionApproved,licensing:clone(food?.licensing||null),barcode:String(food?.barcode||''),name:String(food?.name||''),brand:String(food?.brand||''),country:String(food?.country||''),market:String(food?.market||''),source:String(food?.source||''),verified:!!food?.verified,verificationStatus:String(food?.verificationStatus||''),serving:String(food?.serving||''),manufacturerServing:clone(food?.manufacturerServing||null),nutritionBasis:clone(food?.nutritionBasis||null),selection:{amount:Number(amount),unit:String(unit||''),unitLabel:String(unitLabel||'')},nutrients:nutrientSet(nutrients||{}),loggedAt:String(loggedAt||new Date().toISOString())};
  }
  function foodFromSnapshot(entry){
    const snap=entry?.foodSnapshot;if(!snap)return null;const selection=snap.selection||{};
    return {id:snap.foodId||entry.foodId,canonicalId:snap.canonicalId||'',sourceId:snap.sourceId||'',foodSourceId:snap.foodSourceId||'',sourceItemId:snap.sourceItemId||'',sourceVariantId:snap.sourceVariantId||'',familyId:snap.familyId||'',familyName:snap.familyName||'',variantLabel:snap.variantLabel||'',itemStatus:snap.itemStatus||'',nutritionStatus:snap.nutritionStatus||'',loggable:snap.loggable!==false,categoryMemberships:clone(snap.categoryMemberships||[]),promotionalStatus:snap.promotionalStatus||'',limitedTime:!!snap.limitedTime,catalogueVersion:snap.catalogueVersion||'',catalogueCheckedAt:snap.catalogueCheckedAt||'',sourceLastCheckedDate:snap.sourceLastCheckedDate||'',lastSeenAt:snap.lastSeenAt||'',effectiveDate:snap.effectiveDate||'',sourceUrl:snap.sourceUrl||'',provenance:clone(snap.provenance||null),sourceAnomalies:clone(snap.sourceAnomalies||[]),usageScope:snap.usageScope||'',licenceStatus:snap.licenceStatus||'',productionApproved:!!snap.productionApproved,licensing:clone(snap.licensing||null),name:snap.name||entry.name,brand:snap.brand||entry.brand,country:snap.country||'',market:snap.market||'',source:snap.source||entry.source,barcode:snap.barcode||'',verified:!!snap.verified,verificationStatus:snap.verificationStatus||'',serving:snap.serving||`${selection.amount||entry.amount||1} ${selection.unitLabel||entry.unit||'serve'}`,defaultAmount:selection.amount||entry.amount||1,defaultUnit:selection.unit||entry.unit||'serve',units:{[selection.unit||entry.unit||'serve']:1/Math.max(Number(selection.amount||entry.amount||1),.0001)},unitLabels:{[selection.unit||entry.unit||'serve']:selection.unitLabel||entry.unitLabel||entry.unit||'serve'},nutrients:clone(snap.nutrients||entry.nutrients||{}),nutritionBasis:clone(snap.nutritionBasis||null),manufacturerServing:clone(snap.manufacturerServing||null)};
  }

  const api={version:VERSION,nutrientKeys:NUTRIENTS,metricUnits:METRIC_UNITS,finiteOrNull,nutrientSet,scale,metricAmount,basisModel,calculatedServingFrom100,selectedNutrition,nutritionForFood,basisDiscrepancies,attachBasis,supportedUnits,canUseUnit,completeness,diarySnapshot,foodFromSnapshot};
  global.HECPackagedFoods=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
