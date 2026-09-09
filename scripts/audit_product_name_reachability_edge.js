'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge');
const recordId='off:9339423004229',canonicalId='barcode:9339423004229';
async function rows(page){return page.locator('#food-results [data-universal-result]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.universalResult,text:node.innerText})));}
async function fresh(page){await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));}
async function exact(page,query){
  await fresh(page);const input=page.locator('#food-search');await input.fill(query);
  await page.waitForFunction(id=>HECOpenFoodFactsAU?.getLoaded(id),recordId,{timeout:30000});await page.waitForTimeout(900);
  const preview=await page.locator('#food-live-results').innerText();await input.press('Enter');
  const target=page.locator(`[data-universal-result="${recordId}"]`);await target.waitFor({state:'visible',timeout:30000});
  const submitted=await rows(page),state=await page.evaluate(()=>HEC_SEARCH_SESSION_TEST.state());
  assert.equal(state.mode,'explicit-committed');assert.equal(state.universalSource,'');assert.equal(state.sourceCommitted,false);
  await target.click();const selected=await page.evaluate(()=>{const food=HEC_GUIDED_PRODUCT_TEST.food();return {food,canonicalId:HECGuidedProductResolution.canonicalProductKey(food),profile:HEC_GUIDED_PRODUCT_TEST.profile(),overflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert.equal(selected.food.id,recordId);assert.equal(selected.canonicalId,canonicalId);assert.equal(selected.profile.productKey,canonicalId);assert(!selected.overflow);
  assert(!selected.profile.measures.some(measure=>['mL','L','cup'].includes(measure.key)));
  await page.locator('[data-gpr-measure="g"]:visible').click();const amount=page.locator('[data-gpr-amount]:visible');await amount.fill('84');await amount.press('Enter');await page.locator('#food-entry-editor.active').waitFor();
  const before=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length);
  await page.locator('#entry-meal').selectOption('Lunch');await page.locator('#save-food-entry').click();
  await page.waitForFunction(before=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length===before+1,before);
  const logged=await page.evaluate(()=>{if(HEC_INSTALLATION.role!=='test')throw Error('Disposable TEST context required');const entry=Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().at(-1),record=HECOpenFoodFactsAU.getLoaded(entry.foodId);return {entry,canonicalId:HECFoodCatalogue.canonicalKey(record)};});
  assert.equal(logged.entry.foodId,recordId);assert.equal(logged.canonicalId,canonicalId);assert.equal(logged.entry.consumedPortion.baseQuantity,84);assert.equal(logged.entry.consumedPortion.baseUnit,'g');
  return {query,preview,submitted,state,selected:{id:selected.food.id,canonicalId:selected.canonicalId,measures:selected.profile.measures.map(measure=>measure.key)},logged};
}
async function brand(page,query){
  await fresh(page);await page.locator('#food-search').fill(query);await page.locator('#submit-food-search').click();
  await page.waitForFunction(query=>HEC_AU_CATALOGUE_TEST.brandState()?.query===query&&!HEC_AU_CATALOGUE_TEST.brandState().loading,query);
  const report={query,pages:[]},seen=new Set();
  for(let count=0;count<20;count++){
    const model=await page.evaluate(()=>HEC_AU_CATALOGUE_TEST.brandState().model),rendered=await rows(page);
    assert.equal(model.intent.kind,'brand-family');assert.equal(model.intent.productQuery,'');assert(rendered.length<=20);
    for(const row of rendered){assert(!seen.has(row.id));seen.add(row.id);}
    report.pages.push({offset:model.offset,total:model.total,rows:rendered,hasMore:model.hasMore});
    if(!model.hasMore)break;assert(count<19,'Brand traversal must terminate');await page.locator('[data-au-brand-more]').click();await page.waitForFunction(()=>!HEC_AU_CATALOGUE_TEST.brandState().loading);
  }
  assert.equal(seen.size,report.pages[0].total);return report;
}
async function run({width=390,height=844,outputDirectory=path.join(os.tmpdir(),`hec-product-reachability-${width}`)}={}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),routing=qa.evidence(),report={pass:false,viewport:{width,height},browser:browser.version(),routing};
  try{const context=await qa.contextFor(browser,{width,height},routing),page=await context.newPage();await qa.openLibrary(page);
    report.exact=[];for(const query of ['HARVEST SEEDS & GRAINS',"Abbott's Bakery HARVEST SEEDS & GRAINS"]){report.exact.push(await exact(page,query));}
    report.brands=[];for(const query of ["Abbott's Bakery","Abbott's"]){report.brands.push(await brand(page,query));}
    assert(report.brands[0].pages.some(page=>page.rows.some(row=>row.id===recordId)));
    qa.requireEvidence(routing);report.pass=true;await page.screenshot({path:path.join(outputDirectory,'result.png'),fullPage:true});return report;
  }catch(error){report.error={message:error.message,stack:error.stack};throw error;}finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({width:Number(process.argv[2])||390,height:Number(process.argv[3])||844,...(process.argv[4]?{outputDirectory:process.argv[4]}:{})}).then(report=>console.log(JSON.stringify({pass:report.pass,viewport:report.viewport}))).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
