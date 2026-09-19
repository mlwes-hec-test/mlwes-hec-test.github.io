'use strict';
const test=require('node:test'),assert=require('node:assert/strict');require('../packaged-foods');require('../product-serving-semantics');require('../serving-foundation');const C=require('../food-catalogue'),X=require('../capture-foundation'),f=require('./fixtures/barcode-confirmation');
test('online foreign wrapper reproduces exact identity failure; packet confirmation builds legitimate private identity',()=>{
 assert.equal(C.addability(f.food).reasonCode,'identity-low-local-relevance');assert.equal(X.actionsFor(f.food).both,true);
 assert.equal(X.buildBarcodeFood({food:f.food,id:'private-test'}).food,null);
 const before=JSON.stringify(f.food),r=X.buildBarcodeFood({food:f.food,id:'private-test',confirmed:true}).food;
 assert(C.canLog(r));assert.equal(C.canonicalKey(r),'private:private-test');assert.notEqual(C.canonicalKey(r),C.canonicalKey(f.food));assert.equal(r.barcode,f.code);assert.equal(r.nutrients.fat,5.3);assert.equal(r.captureEvidence.choice,'catalogue');assert(r.captureEvidence.confirmedAt);assert.equal(JSON.stringify(f.food),before);
 assert(C.canLog(JSON.parse(JSON.stringify(r))));assert.deepEqual(r.foodGroups,{});assert.equal(r.waterMl,null);assert.equal(r.ingredients,'');assert.equal(r.defaultAmount,1);assert.equal(r.units.g,1/170);
});
test('private conversion rejects vague names without bypassing identity requirements',()=>{for(const name of ['Food','Unknown','Product','Fixture Kitchen','Barcode '+f.code])assert.equal(X.buildBarcodeFood({food:{...f.food,name},confirmed:true}).food,null);});
test('whole selected source replaces partial bad OCR and keeps both evidence models',()=>{const bad=X.parseNutritionPanel(f.badText),model=X.reviewModelFor(f.food),r=X.buildPanelFood({id:'one-private',...f.food,model,confirmed:true,catalogueFood:f.food,choice:'catalogue',extracted:bad}).food;assert.equal(r.nutrients.fat,5.3);assert.equal(r.nutrients.protein,3.3);assert.equal(r.captureEvidence.extracted.perServing.fat,33);assert(C.canLog(r));});
test('corrected physical source keeps barcode evidence and one ID',()=>{const model=X.reviewModelFor(f.food);model.perServing.fat=5.1;const r=X.buildPanelFood({...f.food,id:'one-private',model,confirmed:true,catalogueFood:f.food,choice:'panel'}).food;assert.equal(r.nutrients.fat,5.1);assert.equal(r.captureEvidence.catalogue.nutrients.fat,5.3);assert.equal(r.id,'one-private');assert(C.canLog(r));});
test('decimal-rich text preserves decimals, units, serving and column order',()=>{const p=X.parseNutritionPanel(f.decimalText);for(const key of ['fat','protein','satFat','sugar','sodium','energyKj'])assert.equal(p.perServing[key],f.nutrients[key]);assert.equal(p.per100.fat,3.12);assert.equal(p.servingAmount,170);assert.equal(p.servingsPerPack,1);});
test('split decimals and low-confidence integer readings become unknown',()=>{
 for(const value of ['5 .3','5. 3']){const p=X.parseNutritionPanel(f.decimalText.replace('5.3',value));assert.equal(p.perServing.fat,null);assert(p.questionable);}
 const text='Average quantity per serving\nEnergy 670 kJ\nFat 33 g';const p=X.parseOcrResult({text,confidence:90,blocks:[{paragraphs:[{lines:[{text:'Fat 33 g',words:[{text:'33',confidence:52}]}]}]}]});assert.equal(p.perServing.fat,null);assert(p.issues.includes('uncertain-fat-columns'));
});
