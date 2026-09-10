'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const serving=require('../serving-foundation'),guided=require('../guided-product-resolution'),migration=require('../migrations');
const {runtime,legacyFood,stored}=require('./legacy-saved-food-runtime');
test('legacy JSON loads through the real saved-food and calculation path: .5 kg = 500 g = 615 Cal',()=>{
  const values=stored(),app=runtime(values),food=app.nonRecipeFoods()[0],before=JSON.parse(JSON.stringify(food));
  const resolved=serving.resolveMeasureRequest(food,'kg',.5);assert(resolved.ok);assert.equal(resolved.measure.key,'g');assert.equal(resolved.amount,500);
  assert.equal(app.scaledNutrients(food,.5,'kg').calories,615);assert.equal(app.scaledNutrients(food,500,'g').calories,615);
  assert.equal(food.units.kg,undefined);assert.equal(food.units.g,.01);
  assert.deepEqual(food.sourceMeasureMetadata.units,before.units);assert.deepEqual(food.sourceMeasureMetadata.labels,before.unitLabels);
  for(const key of ['id','name','customNotes','nutrients','ingredients','serving'])assert.deepEqual(food[key],before[key]);
  assert.equal(app.storage.getItem('healthyEatingCompanionAlpha06Functional'),values.healthyEatingCompanionAlpha06Functional);
});
for(const [amount,grams,calories] of [[.125,125,153.75],[1.25,1250,1537.5],[2,2000,2460]])test(`historical ${amount} kg scales every nutrient from the stored basis`,()=>{
  const app=runtime(stored()),food=app.nonRecipeFoods()[0];
  assert.equal(app.scaledNutrients(food,amount,'kg').calories,calories);
  assert.deepEqual(app.scaledNutrients(food,amount,'kg'),app.scaledNutrients(food,grams,'g'));
});
test('ordinary legacy grams and supported mass spellings retain their meaning',()=>{
  const app=runtime(stored()),food=app.nonRecipeFoods()[0];assert.equal(app.scaledNutrients(food,75,'g').calories,92.25);
  for(const unit of ['kg','kilogram','kilograms'])assert.equal(app.scaledNutrients(food,.5,unit).calories,615);
  assert.equal(app.scaledNutrients(food,500,'grams').calories,615);
});
test('mass normalization does not rename an existing custom serving key',()=>{
  const food=legacyFood({units:{serving:1,g:.01,kg:10},unitLabels:{serving:'My custom serving',g:'g',kg:'kg'},defaultUnit:'serving'}),app=runtime(stored(food));
  assert.equal(app.scaledNutrients(app.nonRecipeFoods()[0],2,'serving').calories,246);
});
test('the late Review wrapper cannot replace a selected gram amount with the default serve',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),source=fs.readFileSync(path.join(__dirname,'../alpha06.js'),'utf8');
  const wrapper=source.split('\n').find(line=>line.startsWith('prepareEntry=function(food,opts={}){if(!opts.entry&&C8'));
  assert(wrapper);const classes=new Set(),unit={value:'g',closest:()=>({classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},setAttribute:()=>{},removeAttribute:()=>{}})},food=legacyFood({lockedServingUnit:'serve'});
  const context={by:()=>unit,C8:null,alpha0631PrepareEntryBase:()=>{},unitOptions:f=>f.units,editorFood:()=>food,updateEntryPreview:()=>{},food};
  vm.createContext(context);vm.runInContext(wrapper+';prepareEntry(food,{entry:{unit:"kg",amount:.5}})',context);
  assert.equal(unit.value,'g');assert(!classes.has('alpha0631-locked-unit'));
  unit.value='serve';vm.runInContext('prepareEntry(food,{})',context);assert.equal(unit.value,'serve');assert(classes.has('alpha0631-locked-unit'));
});
test('a supplied positive kg-only conversion becomes grams before sanitation',()=>{
  const food=legacyFood({units:{kg:2},unitLabels:{kg:'kg'},defaultAmount:.5,defaultUnit:'kg',nutrients:{calories:615},serving:'.5 kg'}),profile=serving.servingMeasureProfile(food);
  assert.equal(profile.resolvedFood.units.g,.002);assert.equal(profile.resolvedFood.defaultUnit,'g');assert.equal(profile.resolvedFood.defaultAmount,500);
  const app=runtime(stored(food));assert.equal(app.scaledNutrients(app.nonRecipeFoods()[0],.5,'kg').calories,615);assert.equal(food.units.g,undefined);
});
test('unknown requests and invalid mass quantities remain unavailable',()=>{
  const app=runtime(stored()),food=app.nonRecipeFoods()[0];
  for(const unit of ['furlong','stone','mystery-unit']){assert.equal(serving.resolveMeasureRequest(food,unit,1).ok,false);assert.equal(app.scaledNutrients(food,1,unit).calories,null);}
  for(const amount of [0,-1,'nope',Infinity,1e308])assert.equal(serving.resolveMeasureRequest(food,'kg',amount).ok,false);
  for(const kg of [0,-2,'nope']){const p=serving.servingMeasureProfile(legacyFood({units:{kg},defaultUnit:'kg',serving:'Unknown mass'}));assert.equal(p.resolvedFood.units.g,undefined);}
});
test('solid volume firewall and nutrition-basis conflict survive mass normalization',()=>{
  const food=legacyFood({physicalForm:'solid-countable',units:{g:.01,kg:10,mL:.01,L:10,cup:2.5}}),p=serving.servingMeasureProfile(food);
  for(const unit of ['mL','L','cup']){assert(!p.measures.some(m=>m.key===unit));assert.equal(serving.resolveMeasureRequest(food,unit,1).ok,false);}
  const conflict=legacyFood({physicalForm:'solid-countable',nutritionPer100Unit:'mL',units:{kg:10,mL:.01}});assert.equal(serving.resolveMeasureRequest(conflict,'kg',.5).ok,false);
});
test('modern created private food keeps grams and natural custom serving, with no kg-first Diary choice',()=>{
  const food=legacyFood({recordType:'private',verificationStatus:'user-confirmed',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'100 g'}),app=runtime(stored(food)),loaded=app.nonRecipeFoods()[0];
  assert.equal(app.defaultUnit(loaded),'g');assert.equal(app.defaultAmount(loaded),100);assert.equal(app.scaledNutrients(loaded,100,'g').calories,123);
  const session=guided.createSession([legacyFood()],legacyFood().name,{intent:{kind:'exact-product'}});
  assert(!guided.servingProfile(legacyFood()).measures.some(m=>m.key==='kg'));
  assert(session);assert.equal(serving.servingMeasureProfile(legacyFood()).preferredMeasure,'serve');
});
test('normal migration and repeated load preserve saved identities, recipes and diary snapshots',()=>{
  const values=stored(),original=JSON.parse(values.healthyEatingCompanionAlpha06Functional),m=migration.migrateRecords({userId:'synthetic-user',completed:true},original,{now:'2026-09-10T01:00:00.000Z'}),app=runtime(stored(m.ext.customFoods[0]));
  for(let i=0;i<3;i++){const food=app.nonRecipeFoods()[0];assert.equal(app.scaledNutrients(food,.5,'kg').calories,615);}
  assert.equal(app.ext.customFoods.length,1);assert.equal(app.ext.customFoods[0].id,original.customFoods[0].id);
  assert.deepEqual(JSON.parse(JSON.stringify(app.ext.diary)),original.diary);assert.deepEqual(JSON.parse(JSON.stringify(app.ext.recipes)),original.recipes);
});
