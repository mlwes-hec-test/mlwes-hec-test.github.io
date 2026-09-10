'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const C=require('../food-catalogue'),G=require('../guided-product-resolution');
const runtime=fs.readFileSync(path.join(__dirname,'../alpha06.js'),'utf8');
const previewWrapper=runtime.split('\n').find(line=>line.startsWith('const ps33ExactProductBase=rc4ExactProduct;'));
C.registerBrandDirectory([{name:'Example Regression'}]);
const product=(id,extra={})=>({id,name:'Original Snack Roll',brand:'Example Regression',recordType:'packaged',market:'AU',defaultAmount:1,defaultUnit:'roll',units:{roll:1,g:1/80},unitLabels:{roll:'Roll (80 g)',g:'g'},serving:'1 roll (80 g)',nutrients:{calories:160,energyKj:669.44,protein:4,fat:5,carbs:25},...extra});
function preview(records,preferred=records[0]){const scope={C8:C,allFoods:()=>records,ps33BrandFamily:()=>null,rc4ExactProduct:()=>preferred};vm.runInNewContext(previewWrapper,scope);return scope.rc4ExactProduct('Example Regression Original Snack Roll');}
const items=model=>model.groups.flatMap(group=>group.items);

test('independent source identities retain eligibility and ranking when weaker same-label rows arrive',()=>{
  const strong=product('package',{verified:true}),community=product('community',{recordType:'external-catalogue',barcode:'9300000000091'}),candidate=product('candidate',{recordType:'online-candidate',nutrients:{}});
  for(const rows of [[strong,community,candidate],[candidate,community,strong]]){
    const before=JSON.stringify(rows),canonical=C.canonicaliseRecords(rows),model=C.submittedResultModel(rows,'Example Regression Original Snack Roll'),selected=preview(rows,strong);
    assert.equal(canonical.length,3,'No name-only cross-source merge');
    assert.equal(model.groups[0].items[0].recordId,strong.id);
    assert.equal(C.canonicalKey(selected),C.canonicalKey(strong));
    assert(C.productEligibility(selected).addability.normalLoggingAllowed);
    assert(items(model).find(item=>item.recordId===strong.id).addability.normalLoggingAllowed);
    assert(!items(model).find(item=>item.recordId===candidate.id).addability.normalLoggingAllowed);
    const brand=C.brandResultModel(rows,'Example Regression');
    assert(items(brand).find(item=>item.recordId===strong.id).addability.normalLoggingAllowed);
    const session=G.createSession([selected],selected.name,{intent:{kind:'exact-product'}});
    assert(session.addability.normalLoggingAllowed);
    assert.equal(JSON.stringify(rows),before,'Source evidence is not mutated');
  }
});

test('copies of one canonical identity cannot manufacture label ambiguity',()=>{
  const food=product('same'),copy=JSON.parse(JSON.stringify(food));
  assert(C.productEligibility(food,{candidates:[food,copy]}).identityQuality.exactEligible);
});

test('ambiguous labels within one source stay blocked and exact preview cannot bypass that decision',()=>{
  const rows=[product('a'),product('b',{nutrients:{calories:180,energyKj:753.12}})],model=C.submittedResultModel(rows,'Example Regression Original Snack Roll');
  for(const item of items(model)){
    assert.equal(item.addability.reasonCode,'identity-ambiguous-duplicate-label');
    assert(!G.createSession([item.food],item.name,{intent:{kind:'exact-product'}}).addability.normalLoggingAllowed);
  }
  assert.equal(preview(rows),null);
});

test('independent sources do not make generic or unnamed records specific products',()=>{
  for(const name of ['Butter','Example Regression','Barcode 9300000000091']){
    const rows=[product('a',{name}),product('b',{name,recordType:'external-catalogue',barcode:'9300000000091'})];
    for(const food of rows)assert(!C.productEligibility(food,{candidates:rows}).addability.normalLoggingAllowed,name);
  }
});

test('shared GTIN conflict and source authority checks still control canonical merging',()=>{
  const official=product('official',{barcode:'9300000000091',verified:true,sourceProvenance:{trustClass:'official-au-manufacturer',sourceId:'example-maker'}}),weak=product('candidate',{barcode:official.barcode,recordType:'online-candidate'});
  assert.equal(C.canonicaliseRecords([weak,official])[0].id,official.id);
  const conflict={...official,id:'conflict',nutrients:{...official.nutrients,energyKj:1200}};
  const merged=C.canonicaliseRecords([official,conflict])[0];
  assert(!C.productEligibility(merged).addability.normalLoggingAllowed);
  assert(C.productEligibility(merged).conflicts.some(item=>item.resolution==='unresolved'));
  assert.equal(preview([official,conflict],official)?.catalogueEligibility?.normalLoggingAllowed,false);
});

test('real production Chiko preview, hydrated Search and selection retain the accepted roll identity',{timeout:90000},async()=>{
  const qa=require('../scripts/audit_physical_form_measures_edge'),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  const routing=qa.evidence(),report={pass:false},evidenceDir=fs.mkdtempSync(path.join(os.tmpdir(),'hec-chiko-regression-'));
  try{
    const context=await qa.contextFor(browser,{width:390,height:844},routing),page=await context.newPage();await qa.openLibrary(page);
    await page.locator('#food-search').fill('Chiko roll');
    await page.waitForFunction(()=>HECOpenFoodFactsAU.getLoaded('off:9310081760092'));
    const review=page.locator('#food-live-results [data-food-review="aussie-chiko-roll"]').first();await review.waitFor({state:'visible'});
    report.preview=await page.locator('#food-live-results').innerText();
    assert.match(report.preview,/1 roll \(162 g\).*313 Cal.*1,310 kJ/);
    report.trace=await page.evaluate(()=>{
      const C=HECFoodCatalogue,records=HEC_AU_CATALOGUE_TEST.foods().filter(food=>/chiko/i.test(food.brand)),canonical=C.canonicaliseRecords(records);
      return {records:records.map(food=>({food,eligibility:C.productEligibility(food,{candidates:canonical}),canonical:C.canonicalProduct(food)})),canonicalIds:canonical.map(C.canonicalKey),dedupedIds:C.dedupe(canonical).map(C.canonicalKey),duplicate:C.strongDuplicateEvidence(records[0],records[1]),model:C.submittedResultModel(records,'Chiko roll')};
    });
    assert.equal(report.trace.records.length,2);assert.equal(report.trace.canonicalIds.length,2);assert.equal(report.trace.duplicate.duplicate,false);
    const accepted=report.trace.records.find(row=>row.food.id==='aussie-chiko-roll');
    assert(accepted.eligibility.addability.normalLoggingAllowed);assert.equal(accepted.eligibility.verified,false);
    await page.locator('#submit-food-search').click();
    const target=page.locator('[data-universal-result="aussie-chiko-roll"]');await target.waitFor({state:'visible'});
    report.submitted=await page.locator('#food-results').innerText();assert.match(await target.innerText(),/Loggable now/);
    assert.equal(await page.locator('[data-universal-result]').first().getAttribute('data-universal-result'),'aussie-chiko-roll');
    await target.click();
    report.selected=await page.evaluate(()=>({food:HEC_GUIDED_PRODUCT_TEST.food(),profile:HEC_GUIDED_PRODUCT_TEST.profile(),ui:HEC_GUIDED_PRODUCT_TEST.ui()}));
    assert.equal(C.canonicalKey(report.selected.food),accepted.eligibility.canonicalId);
    assert(['serving-measure','consumption-amount'].includes(report.selected.ui.stage));
    assert(C.productEligibility(report.selected.food).addability.normalLoggingAllowed);
    const roll=report.selected.profile.measures.find(measure=>measure.key==='roll');assert.equal(roll.conversionToBase.baseQuantity,162);
    if(await page.locator('[data-gpr-measure="roll"]:visible').count())await page.locator('[data-gpr-measure="roll"]:visible').click();
    const amount=page.locator('[data-gpr-amount]:visible');await amount.fill('1');await amount.press('Enter');await page.locator('#food-entry-editor.active').waitFor();
    report.review=await page.locator('#food-entry-editor').innerText();assert.match(report.review,/313/);assert.match(report.review,/1,310/);assert.match(report.review,/Add to Diary/);
    assert.equal(await page.locator('#entry-unit').inputValue(),'roll');
    // Preview's existing Review action opens the amount editor directly.
    await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));await page.locator('#food-search').fill('Chiko roll');await review.waitFor({state:'visible'});await review.click();
    await page.locator('#food-entry-editor.active').waitFor();
    report.previewReview=await page.locator('#food-entry-editor').innerText();
    assert.match(report.previewReview,/Review Chiko Roll/);assert.match(report.previewReview,/313 Cal.*1,310 kJ/);
    assert.equal(await page.locator('#entry-unit').inputValue(),'roll');
    qa.requireEvidence(routing);report.pass=true;
  }finally{await browser.close();fs.writeFileSync(path.join(evidenceDir,'report.json'),JSON.stringify({...report,routing},null,2));console.log('Chiko regression evidence: '+evidenceDir);}
});
