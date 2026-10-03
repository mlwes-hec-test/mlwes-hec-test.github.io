'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../packaged-foods');require('../product-serving-semantics');require('../serving-foundation');
const X=require('../capture-foundation'),f=require('./fixtures/noisy-iphone-v56');
for(const mode of ['text','lines','spatial']){
 const parse=kind=>mode==='text'?X.parseNutritionPanel(f[kind]):X.parseOcrResult(mode==='lines'?f.lines(f[kind]):f.spatial(kind));
 test('exact v56 bread: '+mode,()=>{const p=parse('bread');assert.equal(p.servingsPerPack,10.5);assert.equal(p.servingAmount,67);assert.equal(p.servingUnit,'g');assert.equal(p.servingCount,2);assert.equal(p.servingCountUnit,'slice');assert.equal(p.perServing.calories,null);});
 test('exact v56 drink with unresolved prepared denominator: '+mode,()=>{
  const p=parse('drink');assert.equal(p.servingsPerPack,10);assert.equal(p.servingAmount,null);assert.equal(p.servingUnit,'');assert.equal(p.servingCount,1);assert.equal(p.servingCountUnit,'sachet');
  assert.equal(p.perServing.calories,47);assert.equal(p.energyProvenance.perServing.calories,'printed');assert.equal(p.per100.calories,null);assert.equal(p.per100Unit,'');assert.equal(p.per100Context,'product');assert.equal(p.selectedBasis,'perServing');
  assert.deepEqual(p.preparedReference,{heading:'AsPrepared |',basis:null,calories:32});assert.match(p.calorieEvidence.statement,/47 calories per sachet/);assert(p.issues.includes('prepared-reference-basis-unresolved'));assert(!p.issues.includes('energy-not-recognised'));
  for(const basis of ['perServing','per100']){assert.equal(p[basis].energyKj,null);for(const key of ['protein','fat','carbs','sugar','sodium'])assert.equal(p[basis][key],null);}
 });
}
for(const label of ['Serving Size','Servingsize','ServingSize','Serving Sze','Servng Size','Serving sz','Serve size','Servlng Slze','Serving-size'])test('bounded serving label: '+label,()=>{const p=X.parseServing(label+':67g(2sice)');assert.equal(p.servingAmount,67);assert.equal(p.servingCount,2);assert.equal(p.servingCountUnit,'slice');});
for(const [word,unit] of [['sice','slice'],['slce','slice'],['slice','slice'],['slices','slice'],['pice','piece'],['sache','sachet'],['packt','packet'],['biscut','biscuit'],['craker','cracker'],['crispbred','crispbread'],['burgr','burger']])test('serving-context natural unit: '+word,()=>{const p=X.parseServing('Servng Size: 67g (2 '+word+')');assert.equal(p.servingAmount,67);assert.equal(p.servingCount,2);assert.equal(p.servingCountUnit,unit);});
test('fuzzy words need explicit metric serving, attached parentheses and an unambiguous long natural unit',()=>{
 for(const text of ['2sice','Net weight 67g(2sice)','Serving suggestion 67g(2sice)','One serving is 67g(2sice)','Serving Size 67 (2sice)','Serving Size 67g. Ingredients (2sice)','Serving Size 67g (2 rice)','Serving Size 67g (2 port)','Serving Size 67g (2 sccop)','Serving Size 67g (2 scces)','Serving Size 67g (2 pachet)','Serving Size 67g (2 .5 sice)','Serving Size 67g (-2sice)'])assert.equal(X.parseServing(text).servingCount,null,text);
 // "bars" and "burgers" remain exact; short words are never fuzzy corrected.
 assert.equal(X.parseServing('Serving size 67g (2 bars)').servingCountUnit,'bar');
});
for(const label of ['Servings Per Pack','Servings per package','senings Per Pack','servngs per pack','serves per pack','serings per pack'])test('pack label within nutrition metadata: '+label,()=>{assert.equal(X.parseServing('NUTRITION INFORMATION\nTOR | '+label+': 10').servingsPerPack,10);});
test('pack counts reject unrelated prose, damaged numbers and fuzzy labels outside metadata',()=>{
 for(const text of ['pack 10','We pack 10 for each order','senings Per Pack: 10','Directions\nsenings Per Pack: 10','NUTRITION INFORMATION\nContains\nsenings Per Pack: 10','NUTRITION INFORMATION\nsettings per pack 10'])assert.equal(X.parseServing(text).servingsPerPack,null,text);
 for(const value of ['1 .0','10g','10 5','10 .5','10-12','-10','10 or 12'])assert.equal(X.parseServing('NUTRITION INFORMATION\nsenings per pack: '+value).servingsPerPack,null,value);
});
test('wrapped fuzzy declarations and existing word-number counts remain generic',()=>{
 const p=X.parseServing('NUTRITION INFORMATION\nsenings per pack:\n10\nServng Size:\n67g (2 slce)');assert.equal(p.servingsPerPack,10);assert.equal(p.servingAmount,67);assert.equal(p.servingCount,2);
 assert.equal(X.parseServing('Serving size five pieces').servingCount,5);assert.equal(X.parseServing('Serving size twelve biscuits').servingCount,12);
 const panel=X.parseNutritionPanel('Average Quantity Per Serving Per 100 mL\nAsPrepared\n47 Cal 32 Cal');assert.equal(panel.perServing.calories,47);assert.equal(panel.per100.calories,32);
});
for(const heading of ['AsPrepared','As Prepared','As-Prepared','asprepared'])test('prepared heading and independent unlabeled Cal cells: '+heading,()=>{
 const p=X.parseNutritionPanel('Per Serving Per 100 mL\n'+heading+'\n47 Cal     32 Cal\nProtein ? ?');assert.equal(p.perServing.calories,47);assert.equal(p.per100.calories,32);assert.equal(p.per100Context,'as-prepared');assert.equal(p.perServing.energyKj,null);assert.equal(p.per100.energyKj,null);
 const spatial=X.parseOcrResult(f.explicitReference({heading}));assert.equal(spatial.perServing.calories,47);assert.equal(spatial.per100.calories,32);assert.equal(spatial.per100Context,'as-prepared');assert.equal(spatial.per100Unit,'mL');assert.equal(spatial.perServing.protein,null);
});
test('spatial order and cell confidence govern partial calories independently',()=>{
 const weak=X.parseOcrResult(f.explicitReference({weak:true}));assert.equal(weak.perServing.calories,null);assert.equal(weak.per100.calories,32);
 const reversed=X.parseOcrResult(f.explicitReference({reverse:true}));assert.equal(reversed.perServing.calories,47);assert.equal(reversed.per100.calories,32);
});
test('supporting prose never guesses an ambiguous column, changes a number or fabricates kJ',()=>{
 for(const text of [f.drink.replace('47 calories','48 calories'),f.drink.replace('ONE SACHET = ONE SERVING','ONE SACHET'),f.drink.replace('per sachet','per biscuit'),f.drink+'\n48 calories per sachet',f.drink.replace('47 Cal     32 Cal','47 Cal'),f.drink.replace('47 Cal     32 Cal','4 .7 Cal     32 Cal'),f.drink.replace('47 Cal     32 Cal','47 Cal     47 Cal')]){const p=X.parseNutritionPanel(text);assert.equal(p.perServing.calories,null,text);assert.equal(p.per100.calories,null);assert.equal(p.preparedReference.calories,null);}
 const prose=X.parseNutritionPanel('ONE SACHET = ONE SERVING\nContains on average 47 calories per sachet');assert.equal(prose.perServing.calories,null);
});
test('weak OCR cells and corroboration never lower existing confidence thresholds',()=>{
 for(const token of ['47','AsPrepared','sachet']){const data=f.lines(f.drink);const words=data.blocks[0].paragraphs[0].lines.at(token==='sachet'?-1:token==='47'?6:5).words;words.find(w=>w.text===token).confidence=35;const p=X.parseOcrResult(data);assert.equal(p.perServing.calories,null,token);assert.equal(p.preparedReference?.calories??null,null);}
 const data=f.lines(f.drink);data.blocks[0].paragraphs[0].lines[2].words.at(-1).confidence=35;assert.equal(X.parseOcrResult(data).servingsPerPack,null);
 const bread=f.lines(f.bread.replace('67g(2sice)','67g (2sice)'));bread.blocks[0].paragraphs[0].lines[2].words.at(-1).confidence=35;const p=X.parseOcrResult(bread);assert.equal(p.servingAmount,67);assert.equal(p.servingCount,null);
});
test('no decimals, units or prepared columns guessed from damaged text or prose',()=>{
 assert.equal(X.parseNutritionPanel('Serving Sze:1258').servingAmount,null);
 const p=X.parseNutritionPanel('Per serving\nEnergy 47 Cal\nCarbohydrate 3089\nSugars 33g');assert.equal(p.perServing.carbs,null);assert.equal(p.perServing.sugar,null);assert.equal(p.perServing.energyKj,null);
 for(const text of ['Best as prepared','Directions: AsPrepared','prepared','Per serving Per 100 mL\n47 Cal 32 Cal\nDirections: best as prepared']){const p=X.parseNutritionPanel(text);assert.equal(p.per100Context,'product');assert.equal(p.preparedReference,undefined);}
});
test('partial v56 calories retain private serving/water and compatible baseline with distinct provenance',()=>{
 const baseline=X.parseNutritionPanel('Serving size 12.5g (1 sachet)\nPer Serving\nEnergy 210 kJ\n50 Cal\nSodium 51 mg\nSugars 3.3g').model;
 baseline.waterPreparation=true;baseline.preparationEvidence={kind:'dry-beverage',liquid:'water',source:'user-entered'};
 const saved=X.buildPanelFood({id:'v56-private',name:'Synthetic Drink Mix',brand:'Fixture',barcode:'9900000000701',model:baseline,confirmed:true}).food;
 const catalogue={...saved,id:'v56-catalogue',recordType:'packaged'},before=JSON.stringify({saved,catalogue}),overlay=X.privateServingOverlay(catalogue,[saved]),parsed=X.parseOcrResult(f.lines(f.drink)),model=X.mergePanelBaseline(overlay,parsed.model);
 assert.equal(model.servingAmount,12.5);assert.equal(model.servingUnit,'g');assert.equal(model.servingCount,1);assert.equal(model.servingCountUnit,'sachet');assert.equal(model.servingsPerPack,10);assert.equal(model.waterPreparation,true);assert.equal(model.preparationEvidence.liquid,'water');assert.equal(model.perServing.calories,47);assert.equal(model.perServing.energyKj,210);assert.equal(model.perServing.sugar,3.3);assert.equal(model.perServing.sodium,51);assert.equal(model.per100.calories,null);
 assert.deepEqual(model.servingProvenance,overlay.nutritionBasis.servingProvenance);assert.equal(model.servingText,overlay.nutritionBasis.servingText);
 const food=X.buildPanelFood({id:saved.id,name:saved.name,model,catalogueFood:overlay,extracted:parsed,confirmed:true,discrepancyConfirmed:true}).food;assert(food);assert.equal(food.preparation.type,'water');assert.equal(food.captureEvidence.extracted.servingAmount,null);assert.equal(food.captureEvidence.extracted.perServing.energyKj,null);assert.equal(food.captureEvidence.catalogue.nutritionBasis.servingAmount,12.5);assert.equal(food.captureEvidence.extracted.preparedReference.basis,null);assert.equal(food.captureEvidence.confirmedPanel.perServing.calories,47);
 const snapshot=P.diarySnapshot(food,{amount:1,unit:'sachet',nutrients:P.nutritionForFood(food,{amount:1,unit:'sachet'})});assert.equal(snapshot.nutrients.calories,47);assert.equal(snapshot.nutrients.energyKj,210);assert.equal(JSON.stringify({saved,catalogue}),before);
 const corrupted=X.parseNutritionPanel('Per Serving\nEnergy 47 Cal\nSugars 33g');const merged=X.mergePanelBaseline(saved,corrupted.model);assert.equal(merged.perServing.sugar,3.3);assert.equal(corrupted.perServing.sugar,null);
});
