'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../packaged-foods');require('../product-serving-semantics');require('../serving-foundation');
const X=require('../capture-foundation'),f=require('./fixtures/real-iphone-panel');
for(const mode of ['text','lines','spatial']){
 const parse=kind=>mode==='text'?X.parseNutritionPanel(f[kind]):X.parseOcrResult(mode==='lines'?f.lines(f[kind]):f.spatial(kind));
 test('real iPhone bread transcription: '+mode,()=>{
  const p=parse('bread');assert.equal(p.servingsPerPack,10.5);assert.equal(p.servingAmount,67);assert.equal(p.servingUnit,'g');assert.equal(p.servingCount,2);assert.equal(p.servingCountUnit,'slice');
  assert.equal(p.perServing.sodium,255);assert.equal(p.per100.sodium,380);assert.equal(p.perServing.energyKj,697);assert.equal(p.energyProvenance.perServing.energyKj,'printed');
  for(const key of ['protein','carbs','fibre'])assert.equal(p.perServing[key],null,key);assert.equal(p.per100.carbs,null);assert.equal(p.per100.energyKj,null);
 });
 test('real iPhone ten-sachet transcription: '+mode,()=>{
  const p=parse('drink');assert.equal(p.servingsPerPack,10);assert.equal(p.servingAmount,12.5);assert.equal(p.servingUnit,'g');assert.equal(p.per100Unit,'mL');assert.equal(p.per100Context,'as-prepared');
  for(const [basis,kj,cal] of [['perServing',200,47],['per100',130,32]]){assert.equal(p[basis].energyKj,kj);assert.equal(p[basis].calories,cal);assert.deepEqual(p.energyProvenance[basis],{energyKj:'printed',calories:'printed'});assert.equal(p[basis].protein,null);assert.equal(p.qualifiers[basis].protein,undefined);}
  assert.equal(p.servingCount,null);assert.equal(p.waterPreparation,false);
 });
}
test('pack number is independent of noisy trailing descriptions but never repaired',()=>{
 for(const tail of [' (19 slices and 2 crusts)',' ? ? ?',' assorted packets',' (notes 1 . 5)'])assert.equal(X.parseServing('Servings per package: 10.5'+tail).servingsPerPack,10.5);
 for(const value of ['1 .5','1. 5','1x5','-10','10 5','10g','10 g','10, ?','10 – 12','10 to 12','10 or 12','10 x 2'])assert.equal(X.parseServing('Servings Per Pack: '+value).servingsPerPack,null,value);
 const data=f.lines(f.drink);data.blocks[0].paragraphs[0].lines[1].words.at(-1).confidence=35;assert.equal(X.parseOcrResult(data).servingsPerPack,null);
});
test('damaged serving label requires nearby metadata, table region and an intact metric/count pair',()=>{
 for(const text of ['Sening an 67g (2 slices)','Ingredients\nSening an 67g (2 slices)\nPer serving',f.bread.replace('Sening an','Net weight'),f.bread.replace('67g','6 7g'),f.bread.replace('(2 slices)','(2 .5 slices)')])assert.equal(X.parseNutritionPanel(text).servingAmount,null,text);
 const p=X.parseNutritionPanel(f.bread.replace('67g (2 slices)','30g (3 crackers)'));assert.equal(p.servingAmount,30);assert.equal(p.servingCount,3);assert.equal(p.servingCountUnit,'cracker');
});
for(const heading of ['As Prepared','AsPrepared','as-prepared','prepared'])test('prepared heading attached to reference through wrapped separator: '+heading,()=>{
 const p=X.parseNutritionPanel(f.drink.replace('AsPrepared',heading));assert.equal(p.per100Context,'as-prepared');assert.equal(p.perServing.energyKj,200);assert.equal(p.per100.energyKj,130);
});
test('prepared prose outside the table never relabels a product column',()=>{
 const p=X.parseNutritionPanel('Per serving Per 100 mL\nEnergy 200 kJ 130 kJ\nDirections: best as prepared');assert.equal(p.per100Context,'product');
});
test('weak prepared heading and split numeric continuation never acquire confidence from adjacent words',()=>{
 const data=f.lines(f.drink);data.blocks[0].paragraphs[0].lines.find(l=>l.text==='Serving | AsPrepared').words.at(-1).confidence=30;
 assert.equal(X.parseOcrResult(data).per100Context,'product');
 for(const tail of ['.5','5',',5']){const data=f.lines('Servings Per Pack: 10 '+tail);data.blocks[0].paragraphs[0].lines[0].words.at(-1).confidence=30;assert.equal(X.parseOcrResult(data).servingsPerPack,null);}
});
test('uncertain prepared prose after the table cannot remove a trusted reference heading',()=>{
 const data=f.lines(f.drink+'\nBest as prepared');data.blocks[0].paragraphs[0].lines.at(-1).words.at(-1).confidence=30;assert.equal(X.parseOcrResult(data).per100Context,'as-prepared');
});
test('isolated spatial sodium and energy survive damaged neighbouring cells and weak page confidence',()=>{
 const data=f.spatial(),words=data.blocks.map(b=>b.paragraphs[0].lines[0].words[0]);words.find(w=>w.text==='380 mg').confidence=35;
 const p=X.parseOcrResult(data);assert.equal(p.perServing.sodium,255);assert.equal(p.per100.sodium,null);assert.equal(p.perServing.energyKj,697);assert.equal(p.perServing.carbs,null);
});
test('one unpositioned cell in two columns stays unknown; unitless second energy does not veto positioned first unit',()=>{
 assert.equal(X.parseNutritionPanel('Per Serving Per 100 g\nSodium 255 mg').perServing.sodium,null);
 const p=X.parseNutritionPanel('Per Serving Per 100 g\nEnergy 697 kJ\n1040\n(248 Cal)');assert.equal(p.perServing.energyKj,697);assert.equal(p.per100.energyKj,null);assert.equal(p.per100.calories,null);
});
test('accepted partial panel retains compatible private serving, water, unread cells and source evidence',()=>{
 const baseline=X.parseNutritionPanel('Serving size 12.5 g (1 sachet)\nPer serving\nEnergy 210 kJ\n50 Cal\nSodium 51 mg').model;
 baseline.waterPreparation=true;baseline.preparationEvidence={kind:'dry-beverage',liquid:'water',source:'user-entered'};
 const catalogue={id:'fixture-catalogue',name:'Fixture Drink Mix',brand:'Fixture',barcode:'9900000000701',nutritionBasis:baseline,nutrients:baseline.perServing,units:{serve:1,g:1/12.5}};
 const saved=X.buildPanelFood({id:'fixture-private',name:catalogue.name,brand:catalogue.brand,barcode:catalogue.barcode,model:baseline,catalogueFood:catalogue,confirmed:true}).food,before=JSON.stringify({catalogue,saved});
 const overlay=X.privateServingOverlay(catalogue,[saved]),parsed=X.parseOcrResult(f.lines(f.drink)),model=X.mergePanelBaseline(overlay,parsed.model);
 assert.equal(model.servingsPerPack,10);assert.equal(model.servingCount,1);assert.equal(model.servingCountUnit,'sachet');assert.equal(model.waterPreparation,true);assert.equal(model.preparationEvidence.liquid,'water');assert.equal(model.perServing.sodium,51);assert.equal(model.perServing.energyKj,200);assert.equal(model.perServing.calories,47);
 const food=X.buildPanelFood({id:saved.id,name:catalogue.name,model,catalogueFood:overlay,extracted:parsed,confirmed:true,discrepancyConfirmed:true}).food;
 assert(food);assert.equal(food.preparation.type,'water');assert.equal(food.captureEvidence.extracted.perServing.sodium,null);assert.equal(food.captureEvidence.catalogue.nutritionBasis.perServing.sodium,51);assert.equal(food.captureEvidence.confirmedPanel.perServing.sodium,51);assert.equal(food.nutrients.energyKj,200);
 const snap=JSON.parse(JSON.stringify(P.diarySnapshot(food,{amount:1,unit:'sachet',nutrients:P.nutritionForFood(food,{amount:1,unit:'sachet'})})));assert.equal(snap.nutrients.calories,47);assert.equal(snap.nutritionBasis.per100.energyKj,130);assert.equal(snap.nutritionBasis.per100.calories,32);assert.equal(JSON.stringify({catalogue,saved}),before);
});
test('recovering count details does not erase compatible existing nutrition',()=>{
 const model=X.parseNutritionPanel('Serving size 67 g\nPer serving\nEnergy 697 kJ\nProtein 6.2 g').model,food={nutritionBasis:model};
 const merged=X.mergePanelBaseline(food,X.parseNutritionPanel(f.bread).model);assert.equal(merged.perServing.protein,6.2);assert.equal(merged.perServing.sodium,255);assert.equal(merged.servingCount,2);
});
