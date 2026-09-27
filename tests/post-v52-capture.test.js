'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../packaged-foods');require('../product-serving-semantics');const S=require('../serving-foundation'),X=require('../capture-foundation');
const make=model=>X.buildPanelFood({id:'synthetic-private',name:'Synthetic Dry Mix',model,confirmed:true,discrepancyConfirmed:true}).food;
function ocrRows(lines,confidence=95){return {text:lines.map(l=>l.text).join('\n'),confidence,blocks:[{paragraphs:[{lines:lines.map(line=>({...line,words:line.words||line.text.split(' ').map(text=>({text,confidence:95}))}))}]}]};}
function geometry({single=false,reverse=false,weak=false}={}){
 const words=[],add=(text,x,y,confidence=95)=>words.push({text,confidence,bbox:{x0:x,x1:x+text.length*9,y0:y,y1:y+20}});
 add('Per',500,100);add(reverse?'100':'Serving',500,130);if(reverse)add('mL',500,160);
 if(!single){add('Per',900,100);add(reverse?'Serving':'100',900,130);if(!reverse)add('mL',900,160);}
 add('Energy',20,210);add('478',510,210);add('kJ',550,210);if(!single){add('191',910,210);add('kJ',950,210);}
 add('Protein',20,260);add('8.5',510,260,weak?45:95);add('g',550,260);if(!single){add('3.4',910,260);add('g',950,260);}
 add('Sodium',20,310);add('108',510,310);add('mg',550,310);if(!single){add('43',910,310);add('mg',950,310);}
 return {text:'Unreadable ingredients\n8x5\n108 mg\n43 mg',confidence:48,blocks:words.map(w=>({paragraphs:[{lines:[{text:w.text,words:[w]}]}]}))};
}
test('wrapped labels and headings recover isolated serving metadata and count without whole-panel energy',()=>{
 const p=X.parseNutritionPanel('Servings per\npackage:\n10.5\nServing\nsize:\n67 g (2 slices)\nPer\nServing\nPer 100\ng\nSodium 255 mg 380 mg');
 assert.equal(p.servingsPerPack,10.5);assert.equal(p.servingAmount,67);assert.equal(p.servingCount,2);assert.equal(p.servingCountUnit,'slice');assert.equal(p.perServing.sodium,255);assert.equal(p.per100.sodium,380);assert.equal(p.perServing.calories,null);
});
test('arbitrary countable solid derives a 33.5 g slice and preserves it in a diary snapshot',()=>{
 const model=X.parseNutritionPanel('Serving size: 67 g (2 slices)\nPer 100 g\nEnergy 248 Cal').model,food=make(model),measure=S.servingMeasureProfile(food).measures.find(m=>m.key==='slice'),portion=S.consumedPortionState({food,measure,amount:1}),snap=P.diarySnapshot(food,{amount:1,unit:'slice',consumedPortion:portion});
 assert.equal(portion.baseQuantity,33.5);assert.equal(Math.round(P.nutritionForFood(food,{amount:1,unit:'slice'}).calories),83);assert.equal(snap.selection.unit,'slice');assert.equal(snap.consumedPortion.baseQuantity,33.5);assert.equal(food.preparation,undefined);
});
test('sachet declarations, pack count, dry basis and preparation fluids stay independent',()=>{
 const model=X.parseNutritionPanel('Servings per pack:\n26\nServing size:\n12.5 g\nONE SACHET = ONE SERVING\nPer 100 g\nEnergy 376 Cal').model,food=make({...model,waterPreparation:true});
 assert.equal(model.servingsPerPack,26);assert.equal(model.servingCount,1);assert.equal(food.units.sachet,food.units.serve);assert.equal(P.nutritionForFood(food,{amount:1,unit:'sachet'}).calories,47);assert.equal(X.preparationWater(food,{amountMl:250}).fluidMl,250);assert.equal(X.preparationWater(food,{amountMl:250,alreadyLoggedSeparately:true}).fluidMl,0);
});
for(const size of ['20 g',''])test('explicit dry mix supports '+(size||'fixed manufacturer serve')+' without a sachet',()=>{
 const model=X.parseNutritionPanel((size?'Serving size '+size+'\n':'')+'Per serving\nEnergy 80 Cal').model,food=make({...model,waterPreparation:true});assert(food);assert.equal(P.nutritionForFood(food,{amount:1,unit:'serve'}).calories,80);assert.equal(X.preparationWater(food,{amountMl:250}).fluidMl,250);assert.equal(X.preparationWater(food,{amountMl:300}).fluidMl,300);assert.equal(food.units.sachet,undefined);
});
test('liquid cannot inherit dry preparation state and stays per 100 mL',()=>{
 const model=X.parseNutritionPanel('Serving size 250 mL\nPer 100 mL\nEnergy 46 Cal').model,food=make({...model,waterPreparation:true});assert.equal(X.waterPreparationAllowed(model),false);assert.equal(food.preparation,undefined);assert.equal(food.units.mL,.01);assert.equal(food.nutritionBasis.per100Unit,'mL');
});
for(const options of [{},{weak:true},{single:true},{reverse:true}])test('positioned cells survive wrapped headings and low page confidence '+JSON.stringify(options),()=>{
 const p=X.parseOcrResult(geometry(options)),basis=options.reverse?'per100':'perServing';assert.equal(p[basis].energyKj,478);assert.equal(p[basis].sodium,108);assert.equal(p[basis].protein,options.weak?null:8.5);if(!options.single)assert.equal(p[options.reverse?'perServing':'per100'].protein,3.4);assert(p.tableEvidence.length>=3);
});
test('high-confidence OCR lines survive low average confidence while unsupported lines stay blank',()=>{
 const data=ocrRows([{text:'Per serving'},{text:'Energy 200 kJ'},{text:'Sodium 51 mg'}],40);data.text+='\nProtein 8 g';const p=X.parseOcrResult(data);assert.equal(p.perServing.energyKj,200);assert.equal(p.perServing.sodium,51);assert.equal(p.perServing.protein,null);
});
test('partial exact cells and less-than qualifiers retain units and column ownership',()=>{
 const p=X.parseNutritionPanel('Per Serving Per 100 g\nProtein ? g 9.2 g\nSaturated fat <1.0 g <1.0 g\nSodium 255 mg 380 mg\nCalcium 120 mg');assert.equal(p.perServing.protein,null);assert.equal(p.per100.protein,9.2);assert.deepEqual(p.qualifiers.perServing.satFat,{operator:'<',limit:1});assert.equal(p.perServing.satFat,null);assert.equal(p.per100.sodium,380);assert.equal(p.per100.calcium,null);assert.equal(p.perServing.calcium,null);
});
test('dry and prepared reference columns never contaminate one another',()=>{
 const p=X.parseNutritionPanel('Serving size 12.5 g\nPer serving Per 100 g Per 100 mL As Prepared\nEnergy 47 Cal 376 Cal 32 Cal\nSodium 51 mg 408 mg 33 mg');assert.equal(p.perServing.calories,47);assert.equal(p.perServing.sodium,51);assert.equal(p.per100.calories,null);assert.equal(p.per100.sodium,null);
 const prepared=X.parseNutritionPanel('Serving size 12.5 g\nPer Serving\nPer 100\nmL\nAs Prepared\nEnergy 47 Cal 32 Cal');assert.equal(prepared.per100Context,'as-prepared');assert.equal(P.calculatedServingFrom100(prepared.model).calories,null);
});
for(const token of ['8x5','8 .5','8. 5','8.5.3'])test('corrupted token is never salvaged as a plausible nutrient: '+token,()=>{const p=X.parseNutritionPanel('Per serving\nProtein '+token+' g\nSodium 51 mg');assert.equal(p.perServing.protein,null);assert.equal(p.perServing.sodium,51);});
test('corrupted metric declarations and mismatched nutrient units stay unknown',()=>{
 for(const amount of ['12 .5','12. 5','12x5'])assert.equal(X.parseNutritionPanel('Serving size '+amount+' g').servingAmount,null);
 assert.equal(X.parseNutritionPanel('Servings per pack 2 .6').servingsPerPack,null);assert.equal(X.parseNutritionPanel('Per serving\nProtein (mg) 8.5').perServing.protein,null);
});
test('private package naming correction preserves catalogue identity and nutrients',()=>{
 const catalogue={...make(X.parseNutritionPanel('Per 100 mL\nEnergy 46 Cal').model),name:'Old Catalogue Name'},before=JSON.stringify(catalogue),food=X.buildPanelFood({name:'Checked Current Packet Name',brand:'Synthetic Dairy',model:X.reviewModelFor(catalogue),catalogueFood:catalogue,choice:'catalogue',confirmed:true}).food;
 assert.equal(food.name,'Checked Current Packet Name');assert.equal(food.captureEvidence.catalogue.name,'Old Catalogue Name');assert.equal(JSON.stringify(catalogue),before);
});
test('date provenance accepts explicit Diary intent and ignores persisted historical state',()=>{
 const today='2026-09-27',old={date:'2026-09-19',meal:'Lunch'};assert.deepEqual(X.captureDestination({today,intent:old}),{source:'neutral',date:today,meal:''});assert.deepEqual(X.captureDestination({today,intent:{...old,source:'diary-add'}}),{source:'diary-add',...old});assert.equal(X.captureDestination({today}).date,today);
});
test('attached units and numeric one-unit declarations retain explicit values',()=>{
 const p=X.parseNutritionPanel('Servings per pack: 26\nServing size: 12.5g\n1 sachet = 1 serving\nPer Serving Per 100mL As Prepared\nEnergy 200kJ 130kJ\n47Cal 32Cal');assert.equal(p.servingAmount,12.5);assert.equal(p.servingCount,1);assert.equal(p.servingCountUnit,'sachet');assert.equal(p.perServing.energyKj,200);assert.equal(p.perServing.calories,47);assert.equal(p.per100.energyKj,130);assert.equal(p.per100.calories,32);
});
test('geometry cannot salvage corrupted or signed energy tokens; other cells remain usable',()=>{
 for(const text of ['4x8','-478','>478','+478']){const data=geometry();const word=data.blocks.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words))).find(w=>w.text==='478');word.text=text;const p=X.parseOcrResult(data);assert.equal(p.perServing.energyKj,null,text);assert.equal(p.per100.energyKj,191,text);assert.equal(p.perServing.sodium,108,text);}
});
