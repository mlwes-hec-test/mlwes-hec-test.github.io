'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../packaged-foods');require('../product-serving-semantics');const S=require('../serving-foundation');const X=require('../capture-foundation'),C=require('../food-catalogue'),fixture=require('./fixtures/product-capture');
const make=(model,extra={})=>X.buildPanelFood({id:'private-synthetic',name:'Synthetic Vanilla Custard',model,confirmed:true,discrepancyConfirmed:true,...extra});
test('synthetic solid maps both columns, kJ, calcium, serving and ingredients',()=>{
 const parsed=X.parseNutritionPanel(fixture.solidText);assert.deepEqual(parsed.issues,[]);assert.equal(parsed.perServing.energyKj,625);assert.equal(parsed.per100.energyKj,500);assert.equal(parsed.per100.calcium,120);assert.equal(parsed.perServing.satFat,3);assert.equal(parsed.servingsPerPack,6);assert.equal(parsed.servingAmount,125);assert.match(parsed.ingredients,/synthetic vanilla/);
 const {food}=make(parsed.model,{ingredients:parsed.ingredients,barcode:fixture.identity.barcode,packageSize:'750 g'});assert(C.canLog(food));assert.equal(food.waterMl,null);assert.deepEqual(food.foodGroups,{});assert.equal(food.defaultAmount,1);assert.equal(food.defaultUnit,'serve');assert.equal(food.units.g,1/125);assert(!food.units.mL);assert.equal(P.nutritionForFood(food,{amount:100,unit:'g'}).calcium,120);
});
test('liquid reversed columns and mass-less per-100 mL keep volume',()=>{
 const parsed=X.parseNutritionPanel(fixture.liquidText),food=make(parsed.model,{name:'Synthetic Milk Drink'}).food;assert.equal(parsed.per100.calcium,100);assert.equal(parsed.perServing.energyKj,500);assert(C.canLog(food));assert.equal(food.units.mL,1/250);assert(!food.units.g);
 const only=X.parseNutritionPanel('Average quantity per 100 mL\nEnergy 200 kJ\nProtein 3 g');const f=make(only.model,{name:'Synthetic Milk Drink'}).food;assert.equal(f.defaultUnit,'mL');assert.equal(f.defaultAmount,100);assert(C.canLog(f));assert.equal(f.units.mL,.01);
});
test('fixed serve without mass is valid and does not invent metric conversion',()=>{
 const m=X.parseNutritionPanel('Average quantity per serving\nEnergy 100 Cal\nProtein 2 g').model,f=make(m).food;assert(f);assert(C.canLog(f));assert.deepEqual(f.units,{serve:1});assert.equal(P.nutritionForFood(f,{amount:2,unit:'serve'}).calories,200);
});
test('one complete per-100 basis suffices even when printed serve lacks energy',()=>{
 const m=X.parseNutritionPanel('Average quantity per 100 g\nEnergy 500 kJ').model,f=make(m).food;assert(C.canLog(f));assert.equal(f.defaultUnit,'g');assert.equal(f.nutrients.protein,null);
});
test('unclear column cannot shift the other value; decimals and row-header units work',()=>{
 const p=X.parseNutritionPanel('Average quantity per serving Average quantity per 100 g\nEnergy 500 kJ 400 kJ\nProtein ? 4 g\nFat (g) 2,5 2\nSodium <5 mg 10 mg\nCalcium 120 mg');
 assert.equal(p.perServing.protein,null);assert.equal(p.per100.protein,4);assert.equal(p.perServing.fat,2.5);assert.equal(p.per100.fat,2);assert.equal(p.perServing.sodium,null);assert.equal(p.per100.sodium,10);assert.equal(p.perServing.calcium,null);assert.equal(p.per100.calcium,null);assert(p.questionable);
});
test('manual correction, ingredient text and optional nutrients survive JSON save/reopen and snapshot',()=>{
 const p=X.parseNutritionPanel(fixture.solidText),extracted=structuredClone(p);p.model.perServing.calcium=151;
 const f=JSON.parse(JSON.stringify(make(p.model,{ingredients:p.ingredients,extracted}).food));
 assert.equal(f.nutrients.calcium,151);assert.equal(f.captureEvidence.extracted.perServing.calcium,150);assert.equal(f.captureEvidence.confirmedPanel.perServing.calcium,151);
 const snap=P.diarySnapshot(f,{amount:2,unit:'serve',nutrients:P.nutritionForFood(f,{amount:2,unit:'serve'})});assert.equal(snap.nutrients.calcium,302);assert.equal(f.ingredients,p.ingredients);
});
for(const gap of ['foodGroups','waterMl','ingredients'])test('optional '+gap+' never blocks Diary',()=>{const f=make(X.parseNutritionPanel(fixture.solidText).model).food;delete f[gap];assert(C.canLog(f));assert(X.actionsFor(f).add);});
test('missing energy gives precise explanation and never fabricates a food',()=>{
 const m=P.basisModel({per100:{protein:4},per100Unit:'g',selectedBasis:'per100'}),r=make(m);assert.equal(r.food,null);assert.match(X.validationMessage(r.status,m),/energy for 100 g/);assert.equal(m.per100.calories,null);
});
test('invalid or contradictory energy/nutrient figures require correction',()=>{
 for(const values of [{calories:-5},{calories:100,energyKj:900},{calories:100,sugar:12,carbs:5}])assert.equal(make(P.basisModel({perServing:values})).food,null);
});
test('known compatible and conflicting values compare on equal basis without mutating catalogue',()=>{
 const p=X.parseNutritionPanel(fixture.solidText),catalogue=make(p.model).food,original=JSON.stringify(catalogue);
 assert.equal(X.comparePanel(catalogue,p.model).status,'compatible');
 const changed=structuredClone(p.model);changed.perServing.energyKj=800;changed.perServing.calories=800/4.184;
 assert.equal(X.comparePanel(catalogue,changed).status,'different');
 const f=make(changed,{catalogueFood:catalogue}).food;assert.equal(f.captureEvidence.choice,'panel');assert.equal(f.nutrients.energyKj,800);assert(C.canLog(f));assert.equal(JSON.stringify(catalogue),original);
});
test('comparison does not compare differing serving sizes or volume/mass as equal',()=>{
 const p=X.parseNutritionPanel(fixture.solidText),f=make(p.model).food;const larger=structuredClone(p.model);larger.servingAmount=250;larger.perServing=P.scale(larger.perServing,2);assert.equal(X.comparePanel(f,larger).status,'compatible');
 const liquid=X.parseNutritionPanel('Average quantity per 100 mL\nEnergy 500 kJ').model;assert.equal(X.comparePanel(f,liquid).status,'incomplete');
});
test('legacy confirmed-looking data is reviewed explicitly then rebuilt without stale flags',()=>{
 const old=fixture.broken(),before=JSON.stringify(old),m=X.reviewModelFor(old);assert.equal(C.canLog(old),false);assert.equal(JSON.stringify(old),before);
 const f=make(m,{id:old.id,barcode:old.barcode}).food;assert.equal(f.id,old.id);assert.equal(f.nutrients.energyKj,500);assert(C.canLog(f));assert.equal(f.recognisedOnly,false);assert.equal(f.nutritionStatus,'user-confirmed');assert.equal(old.loggable,false);
});
test('explicit piece evidence survives; pack does not create consumed amount or piece',()=>{
 const p=X.parseNutritionPanel(fixture.solidText.replace('125 g','2 pieces (125 g)')),f=make(p.model,{packageSize:'750 g'}).food;assert.equal(f.units.piece,.5);assert(S.servingMeasureProfile(f).measures.some(m=>m.key==='piece'));assert.equal(f.defaultAmount,1);assert.equal(f.units.g,1/125);
});
test('unknown barcode needs no catalogue verification',()=>{const f=make(X.parseNutritionPanel(fixture.solidText).model,{barcode:'9900000000099'}).food;assert(C.canLog(f));assert.equal(f.verified,false);assert.equal(f.captureEvidence.catalogue,null);});


test('printed row units and zero energy are legitimate; whitespace is unknown',()=>{
 const p=X.parseNutritionPanel('Average quantity per 100 g\nEnergy (kJ) 0\nProtein (g) 0\nCalcium (mg) 12.5');assert.equal(p.per100.energyKj,0);assert.equal(p.per100.calcium,12.5);assert.equal(P.nutrientSet({sodium:'  '}).sodium,null);assert(C.canLog(make(p.model).food));
});
test('contradictory OCR component is blank and flagged rather than accepted as certain',()=>{
 const p=X.parseNutritionPanel('Average quantity per serving Average quantity per 100 g\nEnergy 500 kJ 400 kJ\nFat 5 g 4 g\nSaturated fat 3 g 24 g');assert.equal(p.per100.satFat,null);assert(p.issues.includes('confirm-per100-satFat'));assert.equal(p.perServing.satFat,3);
});
test('legacy per-100 reference retains its explicit gram conversion on review',()=>{
 const f={nutritionBasis:P.basisModel({per100:{calories:100}}),units:{g:.01},nutrients:{calories:100}},model=X.reviewModelFor(f);assert.equal(model.per100Unit,'g');assert(C.canLog(make(model).food));
});
test('confirmed fixed serve also supports explicitly printed count without inventing weight',()=>{
 const p=X.parseNutritionPanel('Serving size 2 pieces\nAverage quantity per serving\nEnergy 100 Cal'),f=make(p.model).food,profile=S.servingMeasureProfile(f);assert(profile.measures.some(m=>m.key==='piece'&&m.multiplier===.5));assert(!profile.measures.some(m=>['g','mL'].includes(m.key)));
});

