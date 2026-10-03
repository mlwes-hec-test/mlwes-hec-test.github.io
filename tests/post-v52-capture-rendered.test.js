'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const qa=require('../scripts/audit_physical_form_measures_edge'),{returningProfile}=require('../scripts/audit_navigation_startup_edge');
require('../packaged-foods');require('../product-serving-semantics');require('../serving-foundation');require('../food-catalogue');const X=require('../capture-foundation');
const breadText='Servings per package: 10.5\nServing size: 67 g (2 slices)\nPer 100 g\nEnergy 248 Cal';
const tallImage=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1200"><rect width="640" height="1200" fill="white"/><text x="40" y="80" font-size="32">Synthetic panel image</text></svg>');
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(HEC_APP.functionalStorageKey)));
async function startPanel(page){await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="label"]').click();await page.locator('#capture-new-active').click();await page.locator('#capture-manual').click();}
async function enterPanel(page,text=breadText){await page.locator('#ocr-food-name').fill('Synthetic Countable Food');await page.locator('.ocr-raw-details').evaluate(n=>n.open=true);await page.locator('#ocr-text').fill(text);await page.locator('#capture-parse-text').click();await page.locator('#ocr-package-confirmed').check();}
async function review(page,unit='slice'){await page.locator('[data-capture-source="ocr"][data-capture-action="both"]').click();await page.locator('#capture-amount').fill('1');await page.locator('#capture-amount-unit').selectOption(unit);await page.locator('#capture-amount-review').click();await page.locator('#food-entry-editor.active').waitFor();}

test('photo acceptance reveals Read Nutrition Panel below the TEST banner at mobile, tablet and desktop sizes',{timeout:180000},async()=>{
 const report=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),output=fs.mkdtempSync(path.join(os.tmpdir(),'hec-v52-mobile-'));
 try{for(const viewport of [{width:375,height:667},{width:390,height:844},{width:768,height:1024},{width:1280,height:800}]){
  const context=await qa.contextFor(browser,viewport,report);await context.addInitScript(returningProfile);const page=await context.newPage();await page.goto(qa.ORIGIN+'/');await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');await startPanel(page);await enterPanel(page);
  // A tall decoded photo and an already-expanded bread form reproduce the layout shift.
  await page.locator('#scan-image').setInputFiles({name:'synthetic-panel.svg',mimeType:'image/svg+xml',buffer:tallImage});await page.waitForFunction(()=>document.activeElement.id==='run-label-ocr');
  const position=await page.evaluate(()=>{const r=document.querySelector('#run-label-ocr').getBoundingClientRect(),b=document.querySelector('#hec-test-installation-banner').getBoundingClientRect(),h=document.querySelector('#scan-centre .sticky').getBoundingClientRect();return {top:r.top,bottom:r.bottom,clearTop:Math.max(b.bottom,h.bottom),height:visualViewport.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.id};});
  assert(position.top>=position.clearTop,JSON.stringify(position));assert(position.bottom<=position.height,JSON.stringify(position));assert.equal(position.hit,'run-label-ocr');assert.match(await page.locator('#ocr-progress').innerText(),/Photo ready/);await page.screenshot({path:path.join(output,viewport.width+'.png')});await context.close();
 }qa.requireEvidence(report);console.log('Synthetic viewport evidence: '+output);}finally{await browser.close();}
});

test('ordinary foods hide water wording, explicit gram-based dry mix logs water and retains it in Diary edit',{timeout:180000},async()=>{
 const report=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
 try{const context=await qa.contextFor(browser,{width:390,height:844},report);await context.addInitScript(returningProfile);const page=await context.newPage();await page.goto(qa.ORIGIN+'/');await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');await startPanel(page);await enterPanel(page);
  assert.equal(await page.locator('#ocr-water-preparation').isVisible(),false);assert.equal(await page.locator('#ocr-water-preparation-help').isVisible(),false);assert.doesNotMatch(await page.locator('#ocr-review').innerText(),/For water only|This is a dry drink mix/);
  await enterPanel(page,'Serving size 250 mL\nPer 100 mL\nEnergy 46 Cal');assert.equal(await page.locator('#ocr-preparation-options').isVisible(),false);assert.equal(await page.locator('#ocr-serving-unit').inputValue(),'mL');assert.equal(await page.locator('#ocr-per100-unit').inputValue(),'mL');
  await enterPanel(page,'Serving size 20 g\nPer serving\nEnergy 80 Cal');await page.locator('#ocr-preparation-options summary').click();await page.locator('#ocr-water-preparation').check();assert.equal(await page.locator('#ocr-water-preparation-help').isVisible(),true);await page.locator('#ocr-package-confirmed').check();
  await page.locator('[data-capture-source="ocr"][data-capture-action="both"]').click();await page.locator('#capture-amount').fill('20');await page.locator('#capture-amount-unit').selectOption('g');await page.locator('#capture-water-amount').fill('250');await page.locator('#capture-amount-review').click();await page.locator('#entry-meal').selectOption('Lunch');await page.locator('#entry-remember-water').check();await page.locator('#save-food-entry').click();
  const stored=await state(page),entry=Object.values(stored.diary).flat().at(-1);assert.equal(entry.nutrients.calories,80);assert.equal(entry.waterMl,250);assert.equal(entry.unit,'g');assert.equal(stored.customFoods.find(f=>f.id===entry.foodId).preparation.usualWaterMl,250);
  await page.evaluate(()=>openAlpha05Feature('food-diary'));await page.locator('[data-entry-edit="'+entry.id+'"]').click();assert.equal(await page.locator('#entry-water-amount').inputValue(),'250');assert.equal(await page.locator('#entry-amount').inputValue(),'20');assert.equal(await page.locator('#entry-unit').inputValue(),'g');
  qa.requireEvidence(report);
 }finally{await browser.close();}
});

test('Capture uses Today from neutral Library, preserves explicit historical Add Food, and forgets stale intent after reopen',{timeout:180000},async()=>{
 const report=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
 try{const context=await qa.contextFor(browser,{width:390,height:844},report);await context.addInitScript(returningProfile);const page=await context.newPage();await page.goto(qa.ORIGIN+'/');await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');
  const today=await page.evaluate(()=>HECDate.todayISO());
  await page.evaluate(()=>openAlpha05Feature('food-library'));await startPanel(page);await enterPanel(page);await review(page);assert.equal(await page.locator('#entry-date').inputValue(),today);assert.equal(await page.locator('#entry-meal').inputValue(),'');
  const historical='2026-09-19';await page.evaluate(()=>openAlpha05Feature('food-diary'));await page.locator('#diary-date').evaluate((n,date)=>{n.value=date;n.dispatchEvent(new Event('change',{bubbles:true}));},historical);
  await page.locator('[data-add-to-meal="Lunch"]').first().click();await startPanel(page);await enterPanel(page);await review(page);assert.equal(await page.locator('#entry-date').inputValue(),historical);assert.equal(await page.locator('#entry-meal').inputValue(),'Lunch');assert.equal(await page.locator('#entry-unit').inputValue(),'slice');
  // An unrelated Home → Library entry is neutral even though the Diary day is old.
  await page.evaluate(()=>{openAlpha05Feature('home');openAlpha05Feature('food-library',{fromHome:true});});await startPanel(page);await enterPanel(page);await review(page);assert.equal(await page.locator('#entry-date').inputValue(),today);assert.equal(await page.locator('#entry-meal').inputValue(),'');
  await page.evaluate(date=>{const key=HEC_APP.functionalStorageKey,saved=JSON.parse(localStorage.getItem(key));saved.ui.diaryDate=date;saved.ui.pendingMeal='Lunch';saved.ui.mealEntrySession={date,meal:'Lunch'};localStorage.setItem(key,JSON.stringify(saved));},historical);
  await page.reload();await page.waitForFunction(()=>HECRelease.snapshot().state==='ready');await page.evaluate(()=>openAlpha05Feature('food-library'));await startPanel(page);await enterPanel(page);await review(page);assert.equal(await page.locator('#entry-date').inputValue(),today);assert.equal(await page.locator('#entry-meal').inputValue(),'');
  qa.requireEvidence(report);
 }finally{await browser.close();}
});
