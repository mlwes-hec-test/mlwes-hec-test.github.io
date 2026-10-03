'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../packaged-foods');require('../product-serving-semantics');const S=require('../serving-foundation'),X=require('../capture-foundation'),f=require('./fixtures/physical-panel-ocr');
const make=(model,extra={})=>X.buildPanelFood({id:'private-fixture',name:'Synthetic Drink Mix',brand:'Fixture Brand',barcode:'9900000000701',model,confirmed:true,discrepancyConfirmed:true,...extra}).food;
test('physical-like bread retains declarations and printed energy among percent and decimal noise',()=>{
 const p=X.parseNutritionPanel(f.bread);assert.equal(p.servingsPerPack,10.5);assert.equal(p.servingAmount,67);assert.equal(p.servingCount,2);assert.equal(p.servingCountUnit,'slice');
 assert.equal(p.perServing.energyKj,697);assert.equal(p.perServing.calories,166);assert.equal(p.per100.energyKj,1040);assert.equal(p.per100.calories,248);assert.equal(p.perServing.sodium,255);assert.equal(p.per100.sodium,380);
 for(const key of ['protein','carbs','fibre'])assert.equal(p.perServing[key],null);assert.equal(p.per100.fat,null);
});
test('physical-like liquid partial cells survive merged decimals and unreadable serving size',()=>{
 const p=X.parseNutritionPanel(f.milk);assert.equal(p.servingsPerPack,4);assert.equal(p.servingAmount,null);assert.equal(p.per100Unit,'mL');
 for(const basis of ['perServing','per100'])for(const key of ['protein','fat','carbs'])assert.equal(p[basis][key],null);
 assert.equal(p.perServing.energyKj,478);assert.equal(p.per100.energyKj,191);assert.equal(p.perServing.sodium,108);assert.equal(p.per100.sodium,43);assert.equal(p.perServing.calcium,315);assert.equal(p.per100.calcium,126);
});
test('independent declaration confidence retains pack count despite damaged trailing OCR',()=>{
 const p=X.parseOcrResult(f.spatial({metadataOnly:true}));assert.equal(p.servingsPerPack,4);assert.equal(p.servingAmount,null);
 const food=make(X.parseNutritionPanel('Serving size 250 mL\nPer 100 mL\nEnergy 46 Cal').model),merged=X.mergePanelBaseline(food,p.model);assert.equal(merged.servingsPerPack,4);assert.equal(merged.servingAmount,250);assert.equal(merged.per100.calories,46);
});
test('spatial row and column ownership survives lost flattened headings, DI column and energy continuations',()=>{
 const p=X.parseOcrResult(f.spatial());assert.equal(p.perServing.energyKj,478);assert.equal(p.perServing.calories,114);assert.equal(p.per100.energyKj,191);assert.equal(p.per100.calories,46);assert.equal(p.perServing.sodium,108);assert.equal(p.per100.sodium,43);assert.equal(p.perServing.calcium,315);assert.equal(p.per100.calcium,126);assert.equal(p.perServing.protein,null);assert.equal(p.per100.carbs,null);assert(p.tableEvidence.length>=8);
});
test('one weak spatial energy cell cannot erase its printed Cal or the other column',()=>{
 const p=X.parseOcrResult(f.spatial({weakServe:true}));assert.equal(p.perServing.energyKj,null);assert.equal(p.perServing.calories,114);assert.equal(p.per100.energyKj,191);assert.equal(p.perServing.sodium,108);
});
test('spatial wrapped prepared heading, count relationship and qualifier are retained',()=>{
 const p=X.parseOcrResult(f.spatial({prepared:true}));assert.equal(p.servingsPerPack,10);assert.equal(p.servingAmount,12.5);assert.equal(p.servingCount,1);assert.equal(p.servingCountUnit,'sachet');assert.equal(p.per100Context,'as-prepared');assert.equal(p.selectedBasis,'perServing');assert.equal(p.perServing.energyKj,200);assert.equal(p.perServing.calories,47);assert.equal(p.per100.calories,32);assert.equal(p.per100.energyKj,130);assert.deepEqual(p.qualifiers.perServing.protein,{operator:'<',limit:1});
 const weak=X.parseOcrResult(f.spatial({prepared:true,weakQualifier:true}));assert.equal(weak.perServing.protein,null);assert.equal(weak.qualifiers.perServing.protein,undefined);assert.equal(weak.qualifiers.per100.protein.limit,1);
});
test('printed pair, sodium and qualifier survive food construction, natural amount and JSON snapshot',()=>{
 const p=X.parseNutritionPanel(f.drink+'\nDirections: Add hot water and stir.'),food=make(p.model);assert(food);assert.equal(food.defaultUnit,'sachet');assert.equal(food.nutrients.energyKj,200);assert.equal(food.nutrients.calories,47);assert.equal(food.nutrients.sodium,51);assert.equal(food.nutrients.protein,null);assert.equal(food.preparation.type,'water');
 const snap=JSON.parse(JSON.stringify(P.diarySnapshot(food,{amount:1,unit:'sachet',nutrients:P.nutritionForFood(food,{amount:1,unit:'sachet'})})));assert.equal(snap.nutrients.energyKj,200);assert.equal(snap.nutritionBasis.per100.calories,32);assert.equal(snap.nutrientQualifiers.protein.operator,'<');assert.equal(snap.nutrientQualifiers.protein.limit,1);assert.equal(X.preparationWater(food,{amountMl:250}).fluidMl,250);
 assert.deepEqual(food.captureEvidence.energyProvenance,{energyKj:'printed',calories:'printed'});
});
test('single printed Cal stays the only extracted energy cell and derived Diary kJ has provenance',()=>{
 const p=X.parseNutritionPanel('Per Serving\nEnergy 47 Cal'),food=make(p.model);assert.equal(p.perServing.energyKj,null);assert.equal(food.nutrients.calories,47);assert.equal(food.captureEvidence.energyProvenance.energyKj,'derived-from-calories');assert.equal(food.nutritionBasis.perServing.energyKj,null);
});
for(const heading of ['as prepared','prepared product','when prepared','prepared according to directions'])test('prepared column heading: '+heading,()=>{
 const p=X.parseNutritionPanel('Serving size 12.5 g\nPer Serving Per 100 mL '+heading+'\nEnergy 200 kJ 130 kJ\n(47 Cal) (32 Cal)');assert.equal(p.per100Context,'as-prepared');assert.equal(p.selectedBasis,'perServing');assert.equal(p.waterPreparation,false);assert.equal(p.preparationEvidence,null);assert.equal(P.calculatedServingFrom100(p.model).calories,null);
});
for(const [plural,unit] of [['slices','slice'],['packets','packet'],['pieces','piece'],['bars','bar'],['biscuits','biscuit'],['crackers','cracker'],['crispbreads','crispbread'],['rolls','roll'],['burgers','burger'],['scoops','scoop'],['teaspoons','tsp'],['tablespoons','tbsp'],['cups','cup'],['items','item'],['portions','portion']])test('generic explicit gram equivalence: '+plural,()=>{
 const p=X.parseNutritionPanel('Serving size: 30 g (2 '+plural+')\nPer serving\nEnergy 100 Cal'),food=make(p.model),measure=S.servingMeasureProfile(food).measures.find(m=>m.key===unit);assert.equal(p.servingCount,2);assert.equal(p.servingCountUnit,unit);assert(measure,unit);assert.equal(S.consumedPortionState({food,measure,amount:1}).baseQuantity,15);
});
test('word-number and wrapped count relationship does not use package item count',()=>{
 const p=X.parseNutritionPanel('Servings per package: 10.5 (19 slices and 2 crusts)\nServing size: 67 g (two slices)');assert.equal(p.servingCount,2);assert.equal(X.parseServing('ONE SACHET\n= ONE SERVING').servingCount,1);
 assert.equal(X.parseServing('Servings per pack 10 (20 pieces)').servingCount,null);
});
test('damaged or signed count tokens are not salvaged as smaller counts',()=>{
 for(const count of ['1. 5','1, 5','1x5','-1','1 5'])assert.equal(X.parseServing('Serving size 30 g ('+count+' scoops)').servingCount,null,count);
 assert.equal(X.parseServing('-1 sachet = one serving').servingCount,null);
});
test('metadata-only serving relationship augments a compatible saved serving',()=>{
 const food=make(X.parseNutritionPanel('Serving size 12.5 g\nPer serving\nEnergy 47 Cal').model),m=X.mergePanelBaseline(food,X.parseNutritionPanel('Serving size 12.5 g\nONE SACHET = ONE SERVING').model);assert.equal(m.servingCount,1);assert.equal(m.servingCountUnit,'sachet');assert.equal(m.perServing.calories,47);
});
test('preparation needs beverage evidence; alternatives never become water-only',()=>{
 const plain=X.parseNutritionPanel(f.drink).model;assert.equal(plain.preparationEvidence.liquid,'unknown');assert.equal(plain.waterPreparation,false);assert(X.reviewStatus({name:'Fixture Drink Mix',model:plain,confirmed:true}).missing.includes('preparation-liquid'));
 for(const instructions of ['Add water or milk.','Add water and sugar.','Do not add water.','Never mix with water.','Add water or oat beverage.','Ingredients: water, milk powder.'])assert.equal(X.parseNutritionPanel(f.drink+'\n'+instructions).waterPreparation,false,instructions);
 assert.equal(X.parseNutritionPanel(f.drink+'\nMix with milk.').preparationEvidence.liquid,'milk');
 for(const text of [f.bread,f.milk])assert.equal(X.parseNutritionPanel(text).preparationEvidence,null);
});
test('new milk directions replace prior water evidence while a liquid basis cannot require hidden preparation',()=>{
 const saved=make(X.parseNutritionPanel(f.drink+'\nAdd water.').model),updated=X.mergePanelBaseline(saved,X.parseNutritionPanel(f.drink+'\nMix with milk.').model);assert.equal(updated.waterPreparation,false);assert.equal(updated.preparationEvidence.liquid,'milk');
 const liquid={...X.parseNutritionPanel(f.milk).model,preparationEvidence:{kind:'dry-beverage',liquid:'unknown'}};assert(!X.reviewStatus({name:'Fixture Liquid',model:liquid,confirmed:true}).missing.includes('preparation-liquid'));
});
test('serving guidance identifies missing count/unit and dry basis explicitly',()=>{
 const model=X.parseNutritionPanel(f.drink+'\nAdd water.').model,status=X.reviewStatus({name:'Fixture Drink Mix',model:{...model,servingCountUnit:''},confirmed:true});assert(status.missing.includes('serving-count'));assert.match(X.validationMessage(status,model),/Items Per Serve.*Item Unit/);
 assert.match(X.basisGuidance(model),/HEC will use the Per Serve/);assert.match(X.basisGuidance({...model,selectedBasis:'per100'}),/Choose Per Serve/);
});
function overlayFixture(){const catalogue={id:'source-a:item-1',name:'Synthetic Drink Mix',brand:'Fixture Brand',barcode:'9900000000701',source:'Synthetic Catalogue',units:{g:.01,serve:.125},nutrients:{calories:376,energyKj:1600},nutritionBasis:P.basisModel({per100:{calories:376,energyKj:1600},per100Unit:'g',servingAmount:12.5,servingUnit:'g',manufacturerServing:true,selectedBasis:'per100'})};const saved=make(X.parseNutritionPanel(f.drink+'\nAdd water.').model,{catalogueFood:catalogue});return {catalogue,saved};}
test('private verified count overlays compatible barcode without mutating either source',()=>{
 const {catalogue,saved}=overlayFixture(),before=JSON.stringify({catalogue,saved}),overlay=X.privateServingOverlay(catalogue,[saved]),food=X.buildBarcodeFood({food:overlay,confirmed:true}).food;assert.equal(food.defaultUnit,'sachet');assert.equal(food.units.sachet,.125);assert.equal(food.unitLabels.sachet,'Sachet (12.5 g)');assert.equal(food.captureEvidence.privateServingOverlay.privateFoodId,saved.id);assert.equal(food.nutritionBasis.servingProvenance.source,'user-verified');assert.equal(JSON.stringify({catalogue,saved}),before);
});
test('unverified, conflicting identity, changed size and conflicting private measures do not overlay',()=>{
 const {catalogue,saved}=overlayFixture();for(const candidate of [{...saved,verificationStatus:'recognised-only'},{...saved,captureEvidence:{confirmed:false}},{...saved,barcode:'9900000000799'}])assert.equal(X.privateServingOverlay(catalogue,[candidate]),catalogue);
 for(const other of [{...catalogue,name:'Different Product'},{...catalogue,nutritionBasis:{...catalogue.nutritionBasis,servingAmount:20}},{...catalogue,nutritionBasis:{...catalogue.nutritionBasis,servingCount:2,servingCountUnit:'piece'}}])assert.equal(X.privateServingOverlay(other,[saved]),other);
 const conflicting=JSON.parse(JSON.stringify(saved));conflicting.nutritionBasis.servingCount=2;assert.equal(X.privateServingOverlay(catalogue,[saved,conflicting]),catalogue);
 const changed=X.mergePanelBaseline(saved,X.parseNutritionPanel('Serving size 20 g\nPer serving\nEnergy 80 Cal').model);assert.equal(changed.servingCount,null);assert.equal(changed.servingCountUnit,'');
});
test('private corrected name may retain the exact original source identity',()=>{
 const {catalogue,saved}=overlayFixture();saved.name='Current Packet Private Name';assert.equal(X.privateServingOverlay(catalogue,[saved]).nutritionBasis.servingCountUnit,'sachet');
});
test('neutral, historical and subsequent neutral date destinations remain isolated',()=>{
 const today='2026-10-03',historical={source:'diary-add',date:'2026-10-02',meal:'Snacks'};assert.equal(X.captureDestination({today}).date,today);assert.equal(X.captureDestination({today,intent:historical}).date,historical.date);assert.equal(X.captureDestination({today}).date,today);
});
