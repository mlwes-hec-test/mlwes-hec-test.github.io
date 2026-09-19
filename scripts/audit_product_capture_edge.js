'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),{returningProfile}=require('./audit_navigation_startup_edge'),fixture=require('../tests/fixtures/product-capture');
const output=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),'hec-product-capture-'));
async function run(){
 fs.mkdirSync(output,{recursive:true});const report={pass:false,viewport:{width:390,height:844},diagnostic:qa.evidence(),steps:[]};
 const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});let page;
 try{
  const c=await qa.contextFor({newContext:o=>browser.newContext({...o,isMobile:true,hasTouch:true})},report.viewport,report.diagnostic);
  await c.addInitScript(returningProfile);
  await c.addInitScript(old=>{if(location.origin!=='https://mlwes-hec-test.github.io')return;if(!localStorage.getItem('synthetic-capture-seeded')){localStorage.setItem('healthyEatingCompanionTestAlpha06Functional',JSON.stringify({customFoods:[old],savedFoodIds:[old.id],onlineFoods:[],ui:{}}));localStorage.setItem('synthetic-capture-seeded','yes');}},fixture.broken());
  await c.route('**/api/v2/product/**',route=>route.fulfill({json:{status:1,product:{code:'9900000000001',product_name:'Synthetic Vanilla Custard',brands:'Synthetic Fixture Brand',serving_size:'125 g',serving_quantity:125,serving_quantity_unit:'g',nutriments:{}}}}));
  page=await c.newPage();await page.goto(qa.ORIGIN+'/');await page.waitForFunction(()=>window.HECRelease?.snapshot().state==='ready');
  const snap=async name=>{const clipped=await page.locator('#scan-centre.active button:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||n.scrollWidth>n.clientWidth+1;}).map(n=>n.id||n.textContent));assert.deepEqual(clipped,[],'clipped controls '+name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,'horizontal overflow '+name);await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});report.steps.push(name);};
  const capture=async()=>{await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="barcode"]').click();await page.locator('#manual-barcode-details').evaluate(n=>n.open=true);await page.locator('#scan-barcode-input').fill('9900000000001');await page.locator('#lookup-barcode').click();await page.locator('[data-compare-barcode-panel]').waitFor();};
  await capture();await snap('01-barcode-identity');await page.locator('[data-compare-barcode-panel]').click();
  const png=await page.evaluate(text=>{const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=1050;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1500,1050);ctx.fillStyle='black';ctx.font='32px monospace';text.split('\n').forEach((line,i)=>ctx.fillText(line,35,55+i*65));return canvas.toDataURL('image/png').split(',')[1];},fixture.solidText);
  const panelFile=path.join(output,'synthetic-panel.png');fs.writeFileSync(panelFile,Buffer.from(png,'base64'));
  // Deterministic OCR boundary fixture: production image preprocessing, parser,
  // correction, storage and Diary still execute. This is not an OCR accuracy claim.
  await page.evaluate(text=>{window.__captureOcrText=text;window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>{if(window.__captureOcrFail)throw Error('Synthetic extraction failure');return {data:{text:window.__captureOcrText}};},terminate:async()=>{}})};},fixture.solidText);
  await page.locator('#scan-image').setInputFiles(panelFile);await page.locator('#run-label-ocr').click();
  await page.waitForFunction(()=>document.querySelector('#ocr-calcium').value==='150');assert.equal(await page.locator('#ocr-food-name').inputValue(),'Synthetic Vanilla Custard');await snap('02-extracted-panel');
  await page.locator('#ocr-calcium').evaluate(n=>n.closest('details').open=true);await page.locator('#ocr-calcium').fill('151');await page.locator('#ocr-ingredients').fill('Synthetic milk, vanilla, starch.');await page.locator('#ocr-pack-size').fill('750 g');
  await page.locator('#capture-value-choice').selectOption('panel');await page.locator('#ocr-package-confirmed').check();
  assert(await page.locator('[data-capture-source="ocr"][data-capture-action="save"]').isEnabled());await snap('03-confirmed-corrections');
  await page.locator('[data-capture-source="ocr"][data-capture-action="save"]').click();await page.locator('#food-library.active').waitFor();
  let state=await page.evaluate(()=>JSON.parse(localStorage.getItem(HEC_APP.functionalStorageKey)));report.saved=state.customFoods.filter(f=>f.barcode==='9900000000001');assert.equal(report.saved.length,1);assert.equal(report.saved[0].id,'synthetic-old-private');assert.equal(report.saved[0].nutrients.calcium,151);assert.equal(report.saved[0].waterMl,null);assert.equal(report.saved[0].ingredients,'Synthetic milk, vanilla, starch.');
  const id=report.saved[0].id;
  await page.reload();await page.waitForFunction(()=>window.HECRelease?.snapshot().state==='ready');await page.evaluate(()=>openAlpha05Feature('food-library'));await page.locator('[data-library-tab="saved"]').click();
  await snap('04-reopened-my-food');
  const row=page.locator('#food-results [data-food-save="'+id+'"]').locator('..');await row.locator('.resource-main').click();
  await require('./capture_amount_test_helper')(page);await page.locator('#food-entry-editor.active').waitFor();report.amount={unit:await page.locator('#entry-unit').inputValue(),amount:await page.locator('#entry-amount').inputValue(),options:await page.locator('#entry-unit option').evaluateAll(ns=>ns.map(n=>n.value))};
  assert(!report.amount.options.includes('mL'));assert.notEqual(Number(report.amount.amount),750);
  await page.locator('#entry-amount').fill('2');await page.locator('#entry-meal').selectOption('Lunch');await snap('05-final-review');await page.locator('#save-food-entry').click();
  state=await page.evaluate(()=>JSON.parse(localStorage.getItem(HEC_APP.functionalStorageKey)));const entries=Object.values(state.diary).flat();assert.equal(entries.length,1);assert.equal(entries[0].nutrients.calcium,302);assert.deepEqual(entries[0].foodGroups,{});assert.equal(entries[0].waterMl,null);report.diary=entries[0];await snap('06-diary-save');
  await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="label"]').click();assert.equal(await page.locator('#ocr-food-name').inputValue(),'');assert.equal(await page.locator('#ocr-calories').inputValue(),'');report.cleanAfterSave=true;
  await page.locator('#ocr-food-name').fill('Synthetic unfinished');await page.locator('#ocr-selected-basis').selectOption('per100');await page.locator('#ocr-per100-unit').selectOption('g');await page.locator('#ocr100-energy-kj').fill('500');
  await page.evaluate(()=>openAlpha05Feature('home'));await page.evaluate(()=>openAlpha05Feature('scan-centre'));assert(await page.locator('#capture-resume').isVisible());assert(!(await page.locator('#label-tools').isVisible()));await snap('07-explicit-resume');
  await page.locator('#capture-resume-draft').click();assert.equal(await page.locator('#ocr-food-name').inputValue(),'Synthetic unfinished');assert.equal(await page.locator('#ocr100-energy-kj').inputValue(),'500');
  await page.locator('#capture-cancel').click();await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="label"]').click();assert.equal(await page.locator('#ocr-food-name').inputValue(),'');report.cancel=true;
  await page.evaluate(()=>window.__captureOcrFail=true);await page.locator('#scan-image').setInputFiles(panelFile);await page.locator('#run-label-ocr').click();await page.waitForFunction(()=>document.querySelector('#ocr-progress').textContent.includes('could not'));await snap('08-extraction-failed');
  await page.locator('#ocr-food-name').fill('Synthetic manual fallback');await page.locator('#ocr-selected-basis').selectOption('per100');await page.locator('#ocr-per100-unit').selectOption('mL');await page.locator('#ocr100-energy-kj').fill('200');await page.locator('#ocr100-protein').fill('3');await page.locator('#ocr-package-confirmed').check();assert(await page.locator('[data-capture-source="ocr"][data-capture-action="save"]').isEnabled());await snap('09-manual-fallback');await page.locator('[data-capture-source="ocr"][data-capture-action="save"]').click();
  await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="label"]').click();await page.locator('#ocr-food-name').fill('Retry clears this');await page.locator('#capture-retry').click();assert.equal(await page.locator('#ocr-food-name').inputValue(),'');assert.equal(await page.locator('#scan-image').inputValue(),'');report.retry=true;await snap('10-fresh-attempt');
  await page.reload();await page.waitForFunction(()=>window.HECRelease?.snapshot().state==='ready');await page.evaluate(()=>openAlpha05Feature('scan-centre'));assert(!(await page.locator('#capture-resume').isVisible()));report.reopen=true;

  // Late asynchronous extraction and barcode responses must not revive Cancelled drafts.
  await page.locator('[data-scan-mode="label"]').click();
  await page.evaluate(()=>{window.__workerTerminated=false;window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:()=>new Promise(resolve=>{window.__finishCaptureOcr=resolve;}),terminate:async()=>{window.__workerTerminated=true;}})};});
  await page.locator('#scan-image').setInputFiles(panelFile);await page.locator('#run-label-ocr').click();await page.waitForFunction(()=>typeof __finishCaptureOcr==='function');await page.locator('#capture-cancel').click();
  await page.evaluate(text=>__finishCaptureOcr({data:{text,confidence:99}}),fixture.solidText);await page.waitForFunction(()=>__workerTerminated);
  await page.evaluate(()=>openAlpha05Feature('scan-centre'));await page.locator('[data-scan-mode="label"]').click();assert.equal(await page.locator('#ocr-calcium').inputValue(),'');assert.equal(await page.locator('#ocr-food-name').inputValue(),'');report.lateOcrIgnored=true;
  await page.locator('#capture-new-active').click();assert.equal(await page.locator('#scan-image').inputValue(),'');report.startNew=true;
  let releaseLookup,lookupSeen;const lookupGate=new Promise(resolve=>releaseLookup=resolve),lookupRequest=new Promise(resolve=>lookupSeen=resolve);
  await c.route('**/api/v2/product/9900000000009.json?*',async route=>{lookupSeen();await lookupGate;await route.fulfill({json:{status:1,product:{code:'9900000000009',product_name:'Synthetic late response',nutriments:{}}}});});
  await page.locator('[data-scan-mode="barcode"]').click();await page.locator('#manual-barcode-details').evaluate(n=>n.open=true);await page.locator('#scan-barcode-input').fill('9900000000009');await page.locator('#lookup-barcode').click();await lookupRequest;
  await page.locator('#capture-cancel').click();releaseLookup();await page.waitForResponse(r=>r.url().includes('/product/9900000000009.json'));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(()=>openAlpha05Feature('scan-centre'));assert.equal(await page.locator('#scan-barcode-input').inputValue(),'');assert.equal(await page.locator('#scan-food-preview').innerText(),'');report.lateBarcodeIgnored=true;
  qa.requireEvidence(report.diagnostic);report.pass=true;
 }catch(e){report.release=await page?.evaluate(()=>({snapshot:window.HECRelease?.snapshot(),notice:document.querySelector('#hec-release-status')?.textContent}));report.error={message:e.message,stack:e.stack};if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
 finally{await browser.close();fs.writeFileSync(path.join(output,'capture-flow.json'),JSON.stringify(report,null,2));}
 return {pass:report.pass,steps:report.steps,output};
}
if(require.main===module)run().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};

