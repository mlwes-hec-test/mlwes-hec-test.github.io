'use strict';
const assert=require('node:assert/strict');
const serving=require('../serving-foundation');

// Acceptance uses the selected canonical profile, including conversion evidence.
// Physical form alone never licenses a household measure.
function checkSpreadMeasures({keys,profile,label='Spread'}){
  assert.equal(profile?.physicalForm,'spread',`${label}: spread profile required`);
  const measures=profile.measures||[],food=profile.resolvedFood||{};
  const usable=measure=>Number.isFinite(measure?.multiplier)&&measure.multiplier>0;
  const evidenced=measure=>usable(measure)
    &&serving.PORTION_PRESET_POLICY.trustedConfidence.includes(measure.confidence)
    &&!!measure.source&&!!measure.sourceType
    &&measure.conversionToBase?.baseUnit==='g'
    &&Number.isFinite(measure.conversionToBase.baseQuantity)
    &&measure.conversionToBase.baseQuantity>0;
  assert(keys.length,`${label}: no usable ordinary logging measure`);
  for(const key of keys)assert(measures.some(m=>m.key===key&&usable(m)),`${label}: unsupported rendered ${key}`);
  assert(!keys.some(key=>['mL','L','cup'].includes(key)),`${label}: volume for spread`);
  const massNutrition=!profile.nutritionBasisConflict&&serving.basisInfo(food).gScale>0;
  if(massNutrition)assert(keys.includes('g'),`${label}: mass nutrition requires grams`);
  for(const key of ['tsp','tbsp']){
    const measure=measures.find(m=>m.key===key);
    if(measure)assert(evidenced(measure),`${label}: ${key} lacks validated mass conversion evidence`);
    assert.equal(keys.includes(key),!!measure,`${label}: ${key} must match canonical evidence`);
  }
  const reference=profile.referenceServing||food.manufacturerServing;
  const sourceServe=measures.find(m=>m.key==='serve');
  if(sourceServe&&evidenced(sourceServe))assert(keys.includes('serve'),`${label}: missing evidenced source serve`);
  if(massNutrition&&reference?.amount>0&&serving.normalizeMeasure(reference.unit)==='g'){
    assert(evidenced(sourceServe),`${label}: source mass serve lost from profile`);
    assert.equal(sourceServe.conversionToBase.baseQuantity,reference.amount,`${label}: source serve mass changed`);
    assert(keys.includes('serve'),`${label}: missing source serve`);
  }
  return {keys,massNutrition,household:measures.filter(m=>['tsp','tbsp'].includes(m.key)),sourceServe:sourceServe||null};
}
module.exports={checkSpreadMeasures};
