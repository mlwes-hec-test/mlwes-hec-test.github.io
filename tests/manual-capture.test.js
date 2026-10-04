'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../packaged-foods');require('../product-serving-semantics');require('../serving-foundation');const C=require('../food-catalogue'),X=require('../capture-foundation');
const roundtrip=value=>JSON.parse(JSON.stringify(value));
function save(model,extra={}){const result=X.buildPanelFood({id:'synthetic-manual',name:'Synthetic Packet Food',model,confirmed:true,...extra});assert(result.food,JSON.stringify(result.status));assert(C.canLog(result.food));return roundtrip(result.food);}

for(const basis of ['perServing','per100'])for(const key of P.nutrientKeys.filter(key=>!['calories','energyKj'].includes(key)))test(basis+' '+key+': blank and zero survive capture save and Review reconstruction',()=>{
 for(const value of [undefined,null,'','  ',0,'0']){
  const expected=value===0||value==='0'?0:null,model=P.basisModel({[basis]:{calories:100,[key]:value},selectedBasis:basis,per100Unit:'g'}),food=save(model),review=X.reviewModelFor(food);
  assert.equal(food.nutrients[key],expected);assert.equal(food.captureEvidence.confirmedPanel[basis][key],expected);assert.equal(food.nutritionBasis[basis][key],expected);assert.equal(review[basis][key],expected);
  const amount=basis==='perServing'?1:100,unit=basis==='perServing'?'serve':'g',nutrients=P.nutritionForFood(food,{amount,unit}),entry=roundtrip({foodSnapshot:P.diarySnapshot(food,{amount,unit,nutrients})});
  assert.equal(entry.foodSnapshot.nutrients[key],expected);assert.equal(P.foodFromSnapshot(entry).nutrients[key],expected);
 }
});
for(const basis of ['perServing','per100'])for(const unit of basis==='per100'?['g','mL']:['g'])test('energy gate and missing column: '+basis+' '+unit,()=>{
 const model=P.basisModel({selectedBasis:basis,per100Unit:unit});
 assert.equal(X.buildPanelFood({name:'Synthetic Food',model,confirmed:true}).food,null);
 assert.match(X.validationMessage(X.reviewStatus({name:'Synthetic Food',model,confirmed:true}),model),new RegExp('energy for '+(basis==='perServing'?'one serve':'100 '+unit)+'.*packet'));
 for(const key of ['calories','energyKj']){
  const food=save({...model,[basis]:{...model[basis],[key]:0}});assert.equal(food.nutrients.calories,0);assert.equal(food.nutrients.energyKj,0);
  const other=basis==='perServing'?'per100':'perServing';assert(Object.values(food.nutritionBasis[other]).every(v=>v===null));
 }
});
test('manual dual columns and serving relationship survive saved Review',()=>{
 const perServing={energyKj:420,calories:100,protein:2,fat:3,satFat:.5,carbs:15,sugar:1,fibre:1.5,sodium:120},per100={energyKj:1680,calories:400,protein:8,fat:12,satFat:2,carbs:60,sugar:4,fibre:6,sodium:480};
 const food=save(P.basisModel({perServing,per100,servingAmount:25,servingUnit:'g',manufacturerServing:true,servingsPerPack:8,servingCount:4,servingCountUnit:'cracker',selectedBasis:'perServing'}),{name:'Example Crackers'});
 const review=X.reviewModelFor(food);for(const [key,value] of Object.entries(perServing))assert.equal(review.perServing[key],value);for(const [key,value] of Object.entries(per100))assert.equal(review.per100[key],value);assert.equal(review.servingCount,4);assert.equal(food.units.cracker,.25);assert.equal(P.nutritionForFood(food,{amount:1,unit:'cracker'}).calories,25);assert.equal(review.perServing.calcium,null);
});
test('partial OCR plus manual completion keeps printed columns, missing nutrients and extraction evidence',()=>{
 const parsed=X.parseOcrResult({text:'Serving size: 67 g (2 slices)',confidence:95}),model=P.basisModel({...parsed.model,selectedBasis:'perServing',servingsPerPack:10.5,perServing:{energyKj:697,calories:166,sodium:255},per100:{energyKj:1040,calories:243,sodium:380}}),food=save(model,{extracted:parsed});
 assert.equal(food.nutritionBasis.servingAmount,67);assert.equal(food.nutritionBasis.servingCount,2);assert.equal(food.nutritionBasis.servingCountUnit,'slice');assert.equal(food.nutritionBasis.per100.calories,243);assert.equal(food.captureEvidence.extracted.perServing.calories,null);assert.equal(food.nutrients.protein,null);assert.equal(P.completeness(food).integrity.status,'partial');
});
test('private barcode baseline, zero and unknown are preserved through sparse merge and manual edit',()=>{
 const baseline=save(P.basisModel({servingAmount:12.5,servingUnit:'g',manufacturerServing:true,servingCount:1,servingCountUnit:'sachet',waterPreparation:true,perServing:{calories:47,fat:0},selectedBasis:'perServing'}),{name:'Synthetic Drink Mix',brand:'Fixture Brand',barcode:'9900000000791'}),before=JSON.stringify(baseline);
 const sparse=X.parseOcrResult({text:'Serving size: 12.5 g (1 sachet)\nPer serving\nSodium 0 mg',confidence:95}),merged=X.mergePanelBaseline(baseline,sparse.model);
 assert.equal(merged.perServing.calories,47);assert.equal(merged.perServing.sodium,0);assert.equal(merged.perServing.fat,0);assert.equal(merged.perServing.protein,null);assert.equal(merged.waterPreparation,true);
 merged.perServing.sodium=50;const food=save(merged,{name:baseline.name,barcode:baseline.barcode,catalogueFood:baseline,extracted:sparse});assert.equal(food.captureEvidence.catalogue.nutrients.protein,null);assert.equal(food.captureEvidence.extracted.perServing.sodium,0);assert.equal(food.nutrients.sodium,50);assert.equal(food.preparation.type,'water');assert.equal(JSON.stringify(baseline),before);
});
test('manual as-prepared reference stays separate from dry serving and cannot supply dry energy',()=>{
 const model=P.basisModel({servingAmount:12.5,servingUnit:'g',manufacturerServing:true,servingCount:1,servingCountUnit:'sachet',perServing:{calories:47},per100:{calories:32,sodium:0},per100Unit:'mL',per100Context:'as-prepared',selectedBasis:'perServing',waterPreparation:true});
 const food=save(model);assert.equal(food.nutritionBasis.per100.calories,32);assert.equal(food.nutrients.calories,47);assert.equal(food.nutrients.sodium,null);assert.equal(food.nutritionBasis.per100.sodium,0);assert.equal(food.units.mL,undefined);assert.equal(P.calculatedServingFrom100(model).calories,null);
 const invalid={...model,selectedBasis:'per100'};assert(X.reviewStatus({name:'Synthetic Food',model:invalid,confirmed:true}).missing.includes('prepared-reference'));assert.equal(X.buildPanelFood({name:'Synthetic Food',model:invalid,confirmed:true}).food,null);
});
