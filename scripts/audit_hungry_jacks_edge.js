'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge');
const flows=['Hash Brown','Toastie Ham Cheese','Whopper','Whopper Double','Chicken Royale','JFC Saucy Tender Smoky Chipotle 3 x Pack','JFC Saucy Tender Smoky Chipotle 5 x Pack','Nugget 3 Pack','Nugget 6 Pack','Nugget 12 Pack','Chips Small','Chips Medium','Chips Large','Biscoff Storm','Biscoff Shake Small'];
async function fresh(page){await page.evaluate(()=>window.openAlpha05Feature('food-library',{freshSearch:true}));}
async function settled(page){await page.waitForFunction(()=>!HEC_FOOD_CONCEPT_TEST.state()?.loading&&!HEC_AU_CATALOGUE_TEST.brandState()?.loading);}
async function submit(page,query){await fresh(page);await page.locator('#food-search').fill(query);await page.locator('#submit-food-search').click();await page.waitForFunction(()=>HEC_SEARCH_SESSION_TEST.state().mode==='explicit-committed');await settled(page);}
async function run({outputDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'hec-hj-wave-'))}={}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),report={pass:false,browser:browser.version(),contexts:[]};let page;
  try{for(const viewport of [{width:390,height:844},{width:375,height:812}]){
    const diagnostic=qa.evidence(),context=await qa.contextFor(browser,viewport,diagnostic),result={viewport,diagnostic,scenarios:[]};report.contexts.push(result);page=await context.newPage();await qa.openLibrary(page);
    const foods=await page.evaluate(()=>HECFoodSources.foodRecords({sourceId:'hungry-jacks-au'}));
    for(const query of ["Hungry Jack's",'Hungry Jacks']){await submit(page,query);assert(await page.locator('[data-rc5-source-category]').count()>10);assert.equal(await page.locator('[data-universal-result]').count(),0);assert.equal(await page.locator('#food-search').inputValue(),query);result.scenarios.push({query,categories:await page.locator('[data-rc5-source-category]').allTextContents()});}
    await page.screenshot({path:path.join(outputDirectory,`${viewport.width}-categories.png`),fullPage:true});
    const subset=viewport.width===390?flows:['Whopper','Nugget 6 Pack','Biscoff Shake Small'];
    for(const name of subset){
      const food=foods.find(f=>f.name===name);assert(food,name);const query="Hungry Jack's "+name;
      // The same exact identity is actionable in the typed, submitted and
      // category surfaces; no direct controller selection is injected.
      await fresh(page);await page.locator('#food-search').fill(query);await page.waitForTimeout(650);await settled(page);
      const preview=await page.locator('#food-live-results').innerText();assert(preview.includes(name),`${name}: missing typed identity: ${preview}`);
      await page.locator('#submit-food-search').click();await page.locator('[data-universal-result]').first().waitFor();await settled(page);
      const best=page.locator('[data-universal-group="best"] [data-universal-result]');assert.equal(await best.first().getAttribute('data-universal-result'),food.id,`${name}: exact Search`);
      await submit(page,'Hungry Jacks');await page.locator(`[data-rc5-source-category="${food.browseCategory}"]`).click();
      for(let more=0;more<4&&!await page.locator('#food-results').innerText().then(t=>t.includes(name));more++){const button=page.locator('[data-rc5-source-more]');assert(await button.count(),`${name}: absent from category`);await button.click();}
      assert(await page.locator('#food-results').innerText().then(t=>t.includes(name)),`${name}: category`);
      await submit(page,query);await page.locator(`[data-universal-result="${food.id}"]`).click();
      const controls=page.locator('[data-gpr-measure]:visible');if(await controls.count())await page.locator(`[data-gpr-measure="${food.defaultUnit}"]:visible`).click();
      const input=page.locator('[data-gpr-amount]:visible');await input.waitFor();assert.equal(await input.inputValue(),'');const profile=await page.evaluate(()=>HEC_GUIDED_PRODUCT_TEST.profile());if(profile.physicalForm!=='liquid')assert(!profile.measures.some(m=>['mL','L','cup'].includes(m.key)),name);
      await input.fill('2');await input.press('Enter');await page.locator('#food-entry-editor.active').waitFor();assert.equal(await page.locator('.screen.active').count(),1);assert.equal(await page.locator('[data-gpr-amount]:visible').count(),0);assert.equal(await page.locator('#entry-unit').inputValue(),food.defaultUnit);assert.equal(await page.locator('#entry-amount').inputValue(),'2');const nutrition=await page.locator('#entry-nutrition-preview').innerText();assert(nutrition.replaceAll(',','').includes(String(food.nutrients.energyKj*2)+' kJ'),name+': '+nutrition);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.locator('#entry-meal').selectOption('Lunch');await page.locator('#save-food-entry').click();await page.waitForFunction(id=>{if(HEC_INSTALLATION.role!=='test')throw Error('Synthetic TEST context required');return Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().some(f=>f.foodId===id);},food.id);
      const saved=await page.evaluate(id=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)).diary).flat().find(f=>f.foodId===id),food.id);assert.equal(saved.consumedPortion.amount,2);assert.equal(saved.consumedPortion.measureId,food.defaultUnit);result.scenarios.push({name,id:food.id,preview:true,search:true,browse:true,unit:food.defaultUnit,amount:2,nutrition,oneReview:true,syntheticDiary:true});
    }
    for(const name of ['BBQ Cheeseburger','Coke No Sugar POM Large','Whopper Triple','Family Bundle Large']){await submit(page,"Hungry Jack's "+name);const food=foods.find(f=>f.name===name),row=page.locator(`[data-universal-result="${food.id}"]`);assert.equal(await row.count(),1);await row.click();assert.equal(await page.locator('[data-gpr-measure]:visible,[data-gpr-amount]:visible,#food-entry-editor.active').count(),0);result.scenarios.push({name,blockedBeforeMeasure:true});}
    if(viewport.width===390)for(const [query,name] of [['Hash Brown','Hash Brown'],['Burger','Whopper'],['Chicken burger','Grilled Chicken Saucy Burger Korean BBQ'],['Chips','Chips Medium'],['Nuggets','Nugget 6 Pack']]){
      await submit(page,query);
      // Hash Brown and Burger offer a source chooser. Chips, chicken burgers
      // and nuggets expose the restaurant identity in submitted result groups.
      if(['Hash Brown','Burger'].includes(query)){await page.locator('[data-fc-base]').click();const expand=page.locator('[data-fc-narrow]');if(await expand.count())await expand.click();await page.locator('[data-fc-answer="sourceContext"][data-fc-value="ready-to-eat"]').click();await settled(page);}
      const food=foods.find(f=>f.name===name),row=page.locator(`[data-universal-result="${food.id}"]`);
      // Explicit submitted searches can finish their asynchronous catalogue
      // render after the concept/brand loading flags have cleared.
      await row.waitFor({state:'visible'});
      assert.equal(await row.count(),1,`${query}: missing rendered restaurant identity`);assert(await row.isVisible());
      result.scenarios.push({query,restaurantBranch:food.id});
    }
    await page.screenshot({path:path.join(outputDirectory,`${viewport.width}-final.png`),fullPage:true});qa.requireEvidence(diagnostic);await context.close();
  }report.pass=true;return report;}catch(error){report.error={message:error.message,stack:error.stack};if(page)await page.screenshot({path:path.join(outputDirectory,'failure.png'),fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'hungry-jacks-mobile.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({outputDirectory:process.argv[2]}).then(r=>console.log(JSON.stringify({pass:r.pass,contexts:r.contexts.map(c=>({viewport:c.viewport,scenarios:c.scenarios.length}))}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
