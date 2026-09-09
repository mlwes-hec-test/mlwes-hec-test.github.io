'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge');
const {product}=require('./audit_physical_form_responsive');

async function run({catalogueReport,outputDirectory,width=320,height=568,control='nutSpread'}){
  fs.mkdirSync(outputDirectory,{recursive:true});
  const record=JSON.parse(fs.readFileSync(catalogueReport)).controls[control];
  assert(record,'Physical audit control required');
  const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  const routing=qa.evidence(),report={pass:false,viewport:{width,height},browser:browser.version(),record,routing};
  let page;
  try{
    const context=await qa.contextFor(browser,report.viewport,routing);page=await context.newPage();await qa.openLibrary(page);
    report.rendered=await product(page,record,'Spread evidence control',{spread:true});
    report.identity=await page.evaluate(id=>{
      const food=HEC_GUIDED_PRODUCT_TEST.food(),profile=HEC_GUIDED_PRODUCT_TEST.profile();
      return {id:food.id,canonicalId:HECGuidedProductResolution.canonicalProductKey(food),profileKey:profile.productKey,
        expected:HECFoodCatalogue.canonicalKey(HECOpenFoodFactsAU.getLoaded(id)),eligibility:HECFoodCatalogue.productEligibility(food)};
    },record.id);
    assert.equal(report.identity.id,record.id);assert.equal(report.identity.canonicalId,report.identity.expected);
    assert.equal(report.identity.profileKey,report.identity.expected);assert(report.identity.eligibility.addability.normalLoggingAllowed);
    const grams=page.locator('[data-gpr-measure="g"]:visible');if(await grams.count())await grams.click();
    const amount=page.locator('[data-gpr-amount]:visible');await amount.fill('10');await amount.press('Enter');
    await page.locator('#food-entry-editor.active').waitFor();assert.equal(await page.locator('#food-entry-editor.active').count(),1);
    assert.equal(await page.locator('#entry-unit').inputValue(),'g');
    report.reviewMeasures=await page.locator('#entry-unit option').evaluateAll(ns=>ns.map(n=>n.value));
    require('./spread_measure_acceptance').checkSpreadMeasures({keys:report.reviewMeasures,profile:report.rendered.profile,label:'Review spread'});
    const before=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length);
    await page.locator('#entry-meal').selectOption('Lunch');await page.locator('#save-food-entry').click();
    await page.waitForFunction(before=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length===before+1,before);
    report.diary=await page.evaluate(()=>{if(HEC_INSTALLATION.role!=='test')throw Error('Disposable TEST context required');return Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().at(-1);});
    assert.equal(report.diary.foodId,record.id);assert.equal(report.diary.consumedPortion.baseUnit,'g');assert.equal(report.diary.consumedPortion.baseQuantity,10);
    qa.requireEvidence(routing);report.pass=true;return report;
  }catch(error){report.error={message:error.message,stack:error.stack};throw error;}
  finally{if(page)await page.screenshot({path:path.join(outputDirectory,'result.png'),fullPage:true});await browser.close();fs.writeFileSync(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({catalogueReport:process.argv[2],outputDirectory:process.argv[3],width:Number(process.argv[4])||320,height:Number(process.argv[5])||568})
  .then(r=>console.log(JSON.stringify({pass:r.pass,viewport:r.viewport,canonicalId:r.identity.canonicalId,measures:r.rendered.spreadEvidence.keys})))
  .catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
