'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const qa=require('../scripts/audit_physical_form_measures_edge'),{returningProfile}=require('../scripts/audit_navigation_startup_edge'),f=require('./fixtures/real-iphone-panel');
require('../packaged-foods');require('../product-serving-semantics');require('../serving-foundation');const X=require('../capture-foundation');
const image=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1200"><rect width="640" height="1200" fill="white"/><text x="40" y="80">Transcribed OCR test input</text></svg>');
async function photo(page,data){
 await page.evaluate(data=>{window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data}),terminate:async()=>{}})};},data);
 await page.locator('#scan-image').setInputFiles({name:'fixture.svg',mimeType:'image/svg+xml',buffer:image});await page.waitForFunction(()=>document.activeElement.id==='run-label-ocr');await page.locator('#run-label-ocr').click();await page.waitForFunction(()=>!document.querySelector('#run-label-ocr').disabled);
}
async function values(page,expected){for(const [id,value] of Object.entries(expected))assert.equal(await page.locator('#'+id).inputValue(),String(value),id);}
async function reachable(page,id){
 const control=page.locator('#'+id);assert(await control.isVisible(),id);await control.scrollIntoViewIfNeeded();
 const box=await control.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,hit:hit===n||n.contains(hit),overflow:document.documentElement.scrollWidth>innerWidth+1};});
 assert(box.left>=0&&box.right<=box.width+1&&box.top>=0&&box.bottom<=box.height&&box.hit,JSON.stringify({id,...box}));assert.equal(box.overflow,false);
}
for(const viewport of [{width:390,height:844},{width:320,height:568}])test('transcribed bread and private ten-sachet OCR review at '+viewport.width+'x'+viewport.height,{timeout:180000},async()=>{
 const report=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),output=fs.mkdtempSync(path.join(os.tmpdir(),'hec-iphone-mapping-'+viewport.width+'-'));let page;
 try{
  const context=await qa.contextFor(browser,viewport,report);await context.addInitScript(returningProfile);page=await context.newPage();await page.goto(qa.ORIGIN+'/');await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');
  await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="label"]').click();await page.locator('#capture-new-active').click();await page.locator('#capture-manual').click();await page.locator('#ocr-food-name').fill('White Sandwich');await page.locator('#ocr-food-brand').fill('Bakers Oven');
  await photo(page,f.spatial('bread'));
  await values(page,{'ocr-food-name':'White Sandwich','ocr-food-brand':'Bakers Oven','ocr-serving-amount':67,'ocr-serving-unit':'g','ocr-servings-per-pack':10.5,'ocr-serving-count':2,'ocr-serving-count-unit':'slice','ocr-energy-kj':697,'ocr-sodium':255,'ocr100-sodium':380,'ocr-protein':'','ocr-carbs':'','ocr-fibre':''});
  assert.match(await page.locator('#ocr-serving-summary').innerText(),/Serving details.*2.*slices/i);assert(await page.locator('#ocr-serving-details').evaluate(n=>n.open));assert.match(await page.locator('#capture-field-issues').innerText(),/Protein|Carbohydrate/i);
  for(const id of ['ocr-serving-amount','ocr-serving-count','ocr-serving-count-unit','ocr-servings-per-pack','ocr-energy-kj','ocr-sodium'])await reachable(page,id);
  await page.locator('#ocr-serving-details').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'bread-serving.png')});
  await page.locator('#ocr-serving-count-unit').selectOption('');assert.match(await page.locator('#ocr-review-status').innerText(),/Review Still Required[\s\S]*Items Per Serve.*Item Unit/);await page.locator('[data-capture-attention="ocr-serving-count-unit"]').click();await reachable(page,'ocr-serving-count-unit');await page.screenshot({path:path.join(output,'bread-attention.png')});await page.locator('#ocr-serving-count-unit').selectOption('slice');
  await page.locator('#ocr-package-confirmed').check();assert.match(await page.locator('#ocr-review-status').innerText(),/Ready To Save/);
  await context.close();

  // A separate ephemeral context contains only this test's verified private food.
  const drinkContext=await qa.contextFor(browser,viewport,report);await drinkContext.addInitScript(returningProfile);
  const model=X.parseNutritionPanel('Serving size: 12.5 g (1 sachet)\nPer serving\nEnergy 210 kJ\n50 Cal\nSodium 51 mg').model;model.waterPreparation=true;model.preparationEvidence={kind:'dry-beverage',liquid:'water',source:'user-entered'};
  const saved=X.buildPanelFood({id:'transcribed-private-drink',name:'Synthetic Drink Mix',brand:'Fixture Brand',barcode:'9900000000701',model,confirmed:true}).food;assert(saved);
  await drinkContext.addInitScript(saved=>{if(location.origin==='https://mlwes-hec-test.github.io')localStorage.setItem('healthyEatingCompanionTestAlpha06Functional',JSON.stringify({customFoods:[saved],savedFoodIds:[saved.id],onlineFoods:[],ui:{}}));},saved);
  await drinkContext.route('**/api/v2/product/**',route=>route.fulfill({json:{status:1,product:{code:saved.barcode,product_name:saved.name,brands:saved.brand,serving_size:'12.5 g',serving_quantity:12.5,serving_quantity_unit:'g',nutriments:{'energy-kcal_100g':400,'energy-kj_100g':1680,proteins_100g:4,carbohydrates_100g:72.8,fat_100g:14.4}}}}));
  page=await drinkContext.newPage();await page.goto(qa.ORIGIN+'/');await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="barcode"]').click();await page.locator('#manual-barcode-details').evaluate(n=>n.open=true);await page.locator('#scan-barcode-input').fill(saved.barcode);await page.locator('#lookup-barcode').click();await page.locator('[data-compare-barcode-panel]').waitFor();
  assert.match(await page.locator('#scan-food-preview').innerText(),/previously checked serving[\s\S]*1 sachet = 12.5 g/i);
  const catalogueId=await page.locator('[data-compare-barcode-panel]').getAttribute('data-compare-barcode-panel'),before=await page.evaluate(id=>JSON.stringify(HEC_CANONICAL_CACHE_TEST.food(id)),catalogueId);
  await page.locator('[data-compare-barcode-panel]').click();await photo(page,f.lines(f.drink));
  await values(page,{'ocr-serving-amount':12.5,'ocr-servings-per-pack':10,'ocr-serving-count':1,'ocr-serving-count-unit':'sachet','ocr-energy-kj':200,'ocr-calories':47,'ocr100-energy-kj':130,'ocr100-calories':32,'ocr-per100-unit':'mL','ocr-per100-context':'as-prepared','ocr-preparation-liquid':'water'});
  assert(await page.locator('#ocr-water-preparation').isChecked());assert.match(await page.locator('#ocr-100-column').innerText(),/Per 100 mL As Prepared/);assert.match(await page.locator('#capture-field-issues').innerText(),/Panel readings are shown where available/);assert.doesNotMatch(await page.locator('#capture-field-issues').innerText(),/No usable nutrition/);
  await page.locator('#capture-value-choice').selectOption('panel');await page.locator('#ocr-package-confirmed').check();assert.match(await page.locator('#ocr-review-status').innerText(),/Ready To Save/);
  for(const id of ['ocr-serving-count','ocr-serving-count-unit','ocr-servings-per-pack','ocr-preparation-liquid','ocr-package-confirmed'])await reachable(page,id);
  await page.locator('#ocr-serving-details').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'drink-serving.png')});await page.locator('#ocr-energy-kj').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'drink-energy.png')});
  await page.locator('[data-capture-source="ocr"][data-capture-action="save"]').click();
  const foods=await page.evaluate(()=>JSON.parse(localStorage.getItem(HEC_APP.functionalStorageKey)).customFoods),updated=foods.find(food=>food.barcode===saved.barcode&&food.captureEvidence?.extracted);assert(updated);assert.equal(updated.nutrients.energyKj,200);assert.equal(updated.nutrients.calories,47);assert.equal(updated.nutritionBasis.per100.energyKj,130);assert.equal(updated.nutritionBasis.per100.calories,32);assert.equal(updated.nutritionBasis.servingsPerPack,10);assert.equal(updated.preparation.type,'water');assert.equal(updated.nutritionBasis.servingCountUnit,'sachet');assert.equal(updated.captureEvidence.extracted.perServing.protein,null);assert(updated.captureEvidence.catalogue);
  assert.equal(await page.evaluate(id=>JSON.stringify(HEC_CANONICAL_CACHE_TEST.food(id)),catalogueId),before);qa.requireEvidence(report);console.log('Transcribed mobile evidence: '+output);
 }catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.error('Failure evidence: '+output);}throw error;}finally{await browser.close();}
});
