'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const qa=require('../scripts/audit_physical_form_measures_edge');
const {returningProfile}=require('../scripts/audit_navigation_startup_edge');

const panel='Serving size 20 g (2 slices)\nPer serving\nEnergy 200 kJ\n(47 Cal)\nProtein <1 g\nCarbohydrate 10 g\nFat 0 g\nSaturated Fat <0.1 g\nFibre ≤0.2 g\nSodium 51 mg';
const qualifiers={protein:{operator:'<',limit:1},satFat:{operator:'<',limit:0.1},fibre:{operator:'≤',limit:0.2}};
const halfQualifiers={protein:{operator:'<',limit:0.5},satFat:{operator:'<',limit:0.05},fibre:{operator:'≤',limit:0.1}};
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(HEC_APP.functionalStorageKey)));
const entries=state=>Object.values(state.diary||{}).flat();

function assertUnknownExact(values){
  for(const key of ['protein','satFat','fibre','sugar'])assert.equal(values[key],null,key+' must remain unknown');
}
async function assertCards(page,container,half=false){
  const rows=await page.locator(container+' .nutrition-card-grid > div').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.querySelector('span').textContent,node.querySelector('strong').textContent])));
  assert.deepEqual(rows,{
    Energy:half?'24 Cal · 100 kJ':'47 Cal · 200 kJ',
    Protein:half?'<0.5 g':'<1 g',
    Carbohydrate:half?'5 g':'10 g',
    Fat:'0 g',
    'Saturated Fat':half?'<0.05 g':'<0.1 g',
    Fibre:half?'≤0.1 g':'≤0.2 g',
    Sugars:'Not Available',
    Sodium:half?'26 mg':'51 mg'
  });
}
async function assertReview(page,half=false){
  await page.locator('#food-entry-editor.active').waitFor();
  await page.locator('#entry-nutrition-preview summary').click();
  assert.equal(await page.locator('#entry-nutrition-preview .nutrition-card-grid').isVisible(),true);
  await assertCards(page,'#entry-nutrition-preview',half);
}

test('qualified nutrients survive capture, scaled Review, Diary and saved-food reopen',{timeout:120000},async()=>{
  const report=qa.evidence(),{chromium,edge}=qa.browserTools();
  const browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    // Disposable synthetic storage; all application requests are fulfilled from
    // local SOURCE and external requests are aborted by the shared harness.
    const context=await qa.contextFor(browser,{width:390,height:844},report);
    await context.addInitScript(returningProfile);
    const page=await context.newPage();
    await page.goto(qa.ORIGIN+'/');
    await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');
    const parsed=await page.evaluate(text=>HECCaptureFoundation.parseNutritionPanel(text).model,panel);
    assertUnknownExact(parsed.perServing);
    assert.deepEqual(parsed.qualifiers.perServing,qualifiers);

    await page.evaluate(()=>openAlpha05Feature('scan-centre'));
    await page.locator('[data-scan-mode="label"]').click();
    await page.locator('#capture-new-active').click();
    await page.locator('#capture-manual').click();
    await page.locator('#ocr-food-name').fill('Synthetic Qualifier Bread');
    await page.locator('.ocr-raw-details').evaluate(node=>node.open=true);
    await page.locator('#ocr-text').fill(panel);
    await page.locator('#capture-parse-text').click();
    for(const [id,value] of Object.entries({'ocr-protein':'<1','ocr-sat-fat':'<0.1','ocr-fibre':'≤0.2','ocr-sugar':'','ocr-fat':'0'})){
      assert.equal(await page.locator('#'+id).inputValue(),value);
    }
    // Exercise the editable form readback as well as the initial parser output.
    await page.locator('#ocr-protein').fill('<1');
    await page.locator('#ocr-sat-fat').fill('<0.1');
    await page.locator('#ocr-package-confirmed').check();
    await page.locator('[data-capture-source="ocr"][data-capture-action="both"]').click();
    await page.locator('#capture-amount').fill('2');
    await page.locator('#capture-amount-unit').selectOption('slice');
    await page.locator('#capture-amount-review').click();
    await assertReview(page);
    await page.locator('#entry-amount').fill('1');
    await assertReview(page,true);
    await page.locator('#entry-meal').selectOption('Lunch');
    await page.locator('#save-food-entry').click();

    const state=await stored(page),entry=entries(state).at(-1);
    assert(entry);
    assert.equal(entry.amount,1);
    assert.equal(entry.unit,'slice');
    assertUnknownExact(entry.nutrients);
    assertUnknownExact(entry.foodSnapshot.nutrients);
    assert.deepEqual(entry.foodSnapshot.nutrientQualifiers,halfQualifiers);
    const food=state.customFoods.find(item=>item.id===entry.foodId);
    assert(food);
    assert(state.savedFoodIds.includes(food.id));
    assertUnknownExact(food.nutrients);
    assert.deepEqual(food.nutrientQualifiers,qualifiers);
    assert.deepEqual(food.nutritionBasis.qualifiers.perServing,qualifiers);

    await page.reload();
    await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');
    const reopened=entries(await stored(page)).find(item=>item.id===entry.id);
    assert.deepEqual(reopened.foodSnapshot,entry.foodSnapshot);
    const restored=await page.evaluate(entry=>HECPackagedFoods.foodFromSnapshot(entry),reopened);
    assertUnknownExact(restored.nutrients);
    assert.deepEqual(restored.nutrientQualifiers,halfQualifiers);
    await page.evaluate(()=>openAlpha05Feature('food-diary'));
    await page.locator('[data-entry-edit="'+entry.id+'"]').click();
    await assertReview(page,true);
    await page.locator('#save-food-entry').click();
    const resaved=entries(await stored(page)).find(item=>item.id===entry.id);
    assertUnknownExact(resaved.nutrients);
    assert.deepEqual(resaved.foodSnapshot.nutrientQualifiers,halfQualifiers);

    await page.evaluate(()=>openAlpha05Feature('food-library'));
    await page.locator('[data-library-tab="saved"]').click();
    await page.locator('#food-results [data-food-details="'+food.id+'"]').click();
    await assertCards(page,'#a05-modal-extra');
    await page.locator('[data-review-product-nutrition="'+food.id+'"]:visible').click();
    for(const [id,value] of Object.entries({'ocr-protein':'<1','ocr-sat-fat':'<0.1','ocr-fibre':'≤0.2','ocr-sugar':''})){
      assert.equal(await page.locator('#'+id).inputValue(),value);
    }
    await page.locator('#capture-value-choice').selectOption('catalogue');
    await page.locator('#ocr-package-confirmed').check();
    await page.locator('[data-capture-source="ocr"][data-capture-action="both"]').click();
    await page.locator('#capture-amount').fill('2');
    await page.locator('#capture-amount-unit').selectOption('slice');
    await page.locator('#capture-amount-review').click();
    await assertReview(page);

    // Reopen the stored snapshot without its saved-food source, so this final
    // assertion cannot be satisfied by the live private food's qualifiers.
    await page.evaluate(id=>{
      const state=JSON.parse(localStorage.getItem(HEC_APP.functionalStorageKey));
      state.customFoods=state.customFoods.filter(food=>food.id!==id);
      state.savedFoodIds=state.savedFoodIds.filter(foodId=>foodId!==id);
      localStorage.setItem(HEC_APP.functionalStorageKey,JSON.stringify(state));
    },food.id);
    await page.reload();
    await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');
    await page.evaluate(()=>openAlpha05Feature('food-diary'));
    await page.locator('[data-entry-edit="'+entry.id+'"]').click();
    await assertReview(page,true);
    qa.requireEvidence(report);
  }finally{
    await browser.close();
  }
});
