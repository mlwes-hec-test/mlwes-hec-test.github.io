'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../guided-product-resolution'),data=require('../australian-catalogue-data');
const {checkSpreadMeasures}=require('../scripts/spread_measure_acceptance');
const {checkMeasures}=require('../scripts/audit_physical_form_responsive');
const fixture=()=>({id:'audit-spread',name:'Example Filling',brand:'Example',recordType:'packaged',physicalForm:'spread',category:'Spreads',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},nutritionPer100Unit:'g',sourceNutritionBasis:'per-100g',nutrients:{calories:400,energyKj:1674,fat:30,protein:4,carbs:25}});
const accept=profile=>checkSpreadMeasures({keys:profile.measures.map(m=>m.key),profile});
test('evidenced household conversion must appear; missing evidence or conversion fails acceptance',()=>{
  const food=fixture();food.units.tsp=.05;food.unitLabels.tsp='Teaspoon (5 g)';food.unitOrigins={tsp:{origin:'Reviewed package serving mass',sourceType:'product-metadata',confidence:'package-explicit'}};
  const profile=G.servingProfile(food);assert.equal(profile.measures.find(m=>m.key==='tsp').conversionToBase.baseQuantity,5);accept(profile);
  assert.throws(()=>checkSpreadMeasures({keys:['g'],profile}),/must match canonical evidence/);
  for(const change of [{confidence:'unvalidated'},{conversionToBase:{baseUnit:'mL',baseQuantity:5}},{conversionToBase:{baseUnit:'g',baseQuantity:0}}]){
    const corrupt=structuredClone(profile);Object.assign(corrupt.measures.find(m=>m.key==='tsp'),change);
    assert.throws(()=>accept(corrupt),/lacks validated mass conversion evidence/);
  }
});
test('unevidenced spread accepts grams-only including the auto-selected amount UI',()=>{
  const profile=G.servingProfile(fixture());assert.deepEqual(profile.measures.map(m=>m.key),['g']);accept(profile);
  checkMeasures({label:'Unevidenced control',profile,measures:[],guide:{measureAutoSelected:true,selectedMeasure:'g'},amountVisible:true},{spread:true});
  assert.throws(()=>checkSpreadMeasures({keys:[],profile}),/no usable/);
  const altered=structuredClone(profile);altered.measures.push({...altered.measures[0],key:'kg',multiplier:10});
  assert.throws(()=>checkSpreadMeasures({keys:['kg'],profile:altered}),/requires grams/);
});
for(const key of ['tsp','tbsp'])test(`an unevidenced spread cannot inherit ${key} from raw units or the UI`,()=>{
  const food=fixture();food.units[key]=.05;food.unitLabels[key]=key;const profile=G.servingProfile(food);
  assert(!profile.measures.some(m=>m.key===key));assert(profile.rejectedMeasures.some(m=>m.key===key));accept(profile);
  assert.throws(()=>checkSpreadMeasures({keys:['g',key],profile}),/unsupported rendered/);
});
test('Flora accepted teaspoon, tablespoon, manufacturer serve and grams stay available',()=>{
  const food=data.packagedProducts.find(f=>f.id==='flora-proactiv-light-au-official'),profile=G.servingProfile(food);accept(profile);
  for(const [key,mass] of [['tsp',5],['tbsp',19],['serve',10],['g',1]])assert.equal(profile.measures.find(m=>m.key===key).conversionToBase.baseQuantity,mass);
  assert.throws(()=>checkSpreadMeasures({keys:['tsp','tbsp','g'],profile}),/missing evidenced source serve/);
  const session=G.createSession([food],food.name,{intent:{kind:'exact-product'}});G.selectMeasure(session,'tsp');G.selectAmount(session,2);
  assert.equal(session.nutrition.calories,37);assert.equal(session.nutrition.energyKj,154);
});
test('all MeadowLea supplemental spreads preserve source serves and published tablespoon evidence without teaspoon inheritance',()=>{
  const foods=data.packagedProducts.filter(f=>f.brand==='MeadowLea');assert.equal(foods.length,8);
  for(const food of foods){const profile=G.servingProfile(food);accept(profile);assert(!profile.measures.some(m=>m.key==='tsp'));
    const tablespoon=profile.measures.find(m=>m.key==='tbsp');assert.equal(tablespoon.conversionToBase.baseQuantity,19);assert.equal(tablespoon.sourceType,'official-reference');assert(tablespoon.sourceReference);
    assert.equal(profile.measures.some(m=>m.key==='serve'),!!food.manufacturerServing);
  }
});
