'use strict';
// Disposable headless browser contexts; every application request is fulfilled
// from local source through the established fail-closed QA router.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),{returningProfile}=require('./audit_navigation_startup_edge');
async function settled(page){await page.waitForFunction(()=>!HEC_RETAILER_TEST.state()?.loading&&!HEC_FOOD_CONCEPT_TEST.state()?.loading&&!HEC_AU_CATALOGUE_TEST.brandState()?.loading&&!/^Checking the Australian catalogue/.test(document.querySelector('#food-results')?.textContent.trim()||''));}
async function submit(page,q){await page.locator('#food-search').fill(q);await page.locator('#submit-food-search').click();await page.waitForFunction(q=>HEC_SEARCH_SESSION_TEST.state().rawQuery===q&&HEC_SEARCH_SESSION_TEST.state().mode==='explicit-committed',q);await settled(page);}
async function fresh(page){if(await page.locator('#a05-modal:not(.hidden)').count())await page.locator('#a05-modal-close').click();await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));}
async function renderedPerformance(page){
  await submit(page,'Aldi');
  const values={rootOpen:[],categoryRendering:[],allItemsRendering:[]};
  for(let i=0;i<20;i++)for(const [key,selector,category,count] of [['rootOpen','#submit-food-search',null,0],['categoryRendering','[data-retailer-category="bread"]','bread',1],['rootOpen','#submit-food-search',null,0],['allItemsRendering','[data-retailer-category="*"]','*',20]]){
    const ms=await page.evaluate(({selector,category,count})=>new Promise((resolve,reject)=>{
      const start=performance.now(),target=document.querySelector('#food-results');let observer;
      const timeout=setTimeout(()=>{observer.disconnect();reject(Error('Retailer render timed out'));},5000);
      const check=()=>{const s=HEC_RETAILER_TEST.state();if(s?.retailerId==='aldi'&&!s.loading&&s.categoryId===category&&target.querySelectorAll('[data-universal-result]').length===count&&(category!==null||target.querySelectorAll('[data-retailer-category]').length===11)){observer.disconnect();clearTimeout(timeout);resolve(performance.now()-start);}};
      observer=new MutationObserver(check);observer.observe(target,{childList:true,subtree:true});document.querySelector(selector).click();check();
    }),{selector,category,count});values[key].push(ms);
  }
  const results=Object.fromEntries(Object.entries(values).map(([key,a])=>{a.sort((x,y)=>x-y);return [key,{iterations:a.length,medianMs:+a[Math.floor(a.length*.5)].toFixed(3),p95Ms:+a[Math.floor(a.length*.95)].toFixed(3),maxMs:+a.at(-1).toFixed(3),thresholdMs:250}];}));
  for(const [key,value] of Object.entries(results))assert(value.p95Ms<value.thresholdMs,key+' exceeds existing 250ms query threshold');return results;
}
async function geometry(page){
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Horizontal overflow');
  const controls=page.locator('.retailer-catalogue button');
  for(let i=0;i<await controls.count();i++){
    const control=controls.nth(i);await control.scrollIntoViewIfNeeded();
    const info=await control.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:n.innerText,width:r.width,left:r.left,right:r.right,viewport:innerWidth,covered:!(hit===n||n.contains(hit)),clipped:n.scrollWidth>n.clientWidth+1};});
    assert(info.width>0&&info.left>=-1&&info.right<=info.viewport+1,JSON.stringify(info));assert(!info.covered&&!info.clipped,JSON.stringify(info));
  }
  return {horizontalOverflow:false,controlsChecked:await controls.count(),clippedControls:0,coveredControls:0};
}
async function review(page,sample,output){
  await submit(page,'Aldi');await page.locator(`[data-retailer-category="${sample.category}"]`).click();await settled(page);
  const id='off:'+sample.code,row=page.locator(`[data-universal-result="${id}"]`);await row.waitFor();
  const food=await page.evaluate(id=>HEC_CANONICAL_CACHE_TEST.food(id),id);assert.equal(food.barcode,sample.code);assert.equal(food.brand,sample.brand);assert.equal(food.retailerMemberships.filter(m=>m.retailerId==='aldi').length,1);
  await row.click();const measures=await page.locator('[data-gpr-measure]:visible').evaluateAll(nodes=>nodes.map(n=>({unit:n.dataset.gprMeasure,label:n.innerText})));
  if(sample.unit!=='mL')assert(!measures.some(m=>['mL','cup','L'].includes(m.unit)));
  const measure=page.locator(`[data-gpr-measure="${sample.unit}"]:visible`);if(await measure.count())await measure.click();else{assert.deepEqual(Object.keys(food.units),[sample.unit]);measures.push({unit:sample.unit,label:sample.unit,automaticOnlySafeMeasure:true});}const input=page.locator('[data-gpr-amount]:visible');await input.waitFor();assert.equal(await input.inputValue(),'');await input.fill(String(sample.amount));await input.press('Enter');await page.locator('#food-entry-editor.active').waitFor();
  assert.equal(await page.locator('.screen.active').count(),1);assert.equal(await page.locator('[data-gpr-amount]:visible').count(),0);assert.equal(await page.locator('#entry-amount').inputValue(),String(sample.amount));assert.equal(await page.locator('#entry-unit').inputValue(),sample.unit);
  const nutrition=await page.locator('#entry-nutrition-preview').innerText(),multiplier=food.units[sample.unit]*sample.amount;
  assert(Math.abs(multiplier-sample.baseQuantity/100)<1e-8);assert(nutrition.includes(Math.round(food.nutrients.energyKj*multiplier).toLocaleString('en-AU'))||nutrition.includes(String(Math.round(food.nutrients.calories*multiplier))),nutrition);
  await page.screenshot({path:path.join(output,'390-review-'+sample.code+'.png'),fullPage:true});
  const result={...sample,id,name:food.name,measures,nutrition,expectedCalories:food.nutrients.calories*multiplier,expectedKj:food.nutrients.energyKj*multiplier,reviewCount:1,diarySaved:false};await fresh(page);return result;
}
async function run({outputDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'hec-aldi-'))}={}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),report={pass:false,generation:require('../release-manifest.json').generation,contexts:[]};let page;
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024}]){
      const diagnostic=qa.evidence(),context=await qa.contextFor({newContext:opts=>browser.newContext({...opts,isMobile:true,hasTouch:true})},viewport,diagnostic);await context.addInitScript(returningProfile);page=await context.newPage();await qa.openLibrary(page);
      const result={viewport,diagnostic,checks:[],reviews:[]};report.contexts.push(result);
      await submit(page,'Aldi');assert.equal(await page.locator('[data-retailer-category]').count(),11);const text=await page.locator('#food-results').innerText();assert.match(text,/Private.testing/i);assert.match(text,/Open Food Facts contributors/);assert.match(text,/All Items \(20\)/);assert.match(text,/current availability is unknown/);assert.equal(diagnostic.routes.filter(r=>/aldi-au\/products/.test(r.url)).length,0);
      result.directory=await geometry(page);await page.locator('.retailer-catalogue').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(outputDirectory,viewport.width+'-directory.png'),fullPage:true});result.checks.push('10 categories plus All Items; explicit private-testing attribution; lazy directory');
      await page.locator('[data-retailer-category="*"]').click();await settled(page);assert.equal(await page.locator('[data-universal-result]').count(),20);const visible=await page.locator('[data-universal-result]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.universalResult,text:n.innerText})));
      const approved=require('../aldi-au-catalogue').index.entries;for(const entry of approved){const row=visible.find(r=>r.id===entry.id);assert(row);assert(row.text.toLowerCase().includes(entry.brand.toLowerCase()),JSON.stringify(row));}
      result.allItems=await geometry(page);await page.locator('.retailer-catalogue').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(outputDirectory,viewport.width+'-all-items.png'),fullPage:true});await page.locator('[data-retailer-back]').click();await settled(page);assert.equal(await page.locator('[data-retailer-category]').count(),11);result.checks.push('All 20 approved brands and names readable; controls fit; Back restores directory');
      if(viewport.width===390){
        for(const [retailer,count] of [['Woolworths',null],['Coles',23]]){await submit(page,retailer);assert(await page.locator('[data-retailer-category]').count()>1);if(count)assert.match(await page.locator('#food-results').innerText(),/All Items \(23\)/);}result.checks.push('Woolworths and Coles roots retain categories and accepted counts');
        await submit(page,'Aldi');await submit(page,'Bread');assert.equal(await page.evaluate(()=>HEC_RETAILER_TEST.state()),null);await page.locator('[data-fc-base]').click();await page.locator('[data-fc-answer="breadOrigin"][data-fc-value="commercial"]').click();await page.locator('[data-fc-answer="breadSource"][data-fc-value="supermarket"]').click();
        assert.deepEqual(await page.locator('[data-fc-answer="retailerIdentity"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.fcValue)),['woolworths','coles','aldi']);await page.locator('[data-fc-answer="retailerIdentity"][data-fc-value="aldi"]').click();await settled(page);assert.equal(await page.locator('[data-universal-result]').count(),1);assert.equal(await page.locator('[data-universal-result="off:4061462249464"]').count(),1);await page.screenshot({path:path.join(outputDirectory,'390-guided-bread.png'),fullPage:true});await page.locator('[data-retailer-back]').click();assert.equal(await page.locator('[data-fc-answer="retailerIdentity"]').count(),3);result.checks.push('Generic Bread clears Aldi; Commercial/Supermarket offers all three; Aldi branch is one bread; Back restores choices');
        for(const [query,count] of [['Yoghurt',5],['Cheese',1],['Cereal',2]]){
          await submit(page,query);await page.locator('[data-fc-base]').click();await page.locator('[data-fc-answer="catalogueOrigin"][data-fc-value="commercial"]').click();await page.locator('[data-fc-answer="catalogueSource"][data-fc-value="supermarket"]').click();await page.locator('[data-fc-answer="retailerIdentity"][data-fc-value="aldi"]').click();await settled(page);assert.equal(await page.locator('[data-universal-result]').count(),count);await page.locator('[data-retailer-back]').click();assert(await page.locator('[data-fc-answer="retailerIdentity"][data-fc-value="aldi"]').isVisible());result.checks.push(query+' → Commercial → Supermarket / Brand Name → Aldi: '+count+' relevant products; Back works');
        }
        await submit(page,'Aldi bread');await page.locator('[data-universal-result="off:4061462249464"]').waitFor();assert.equal(await page.locator('[data-universal-result]').count(),1);result.checks.push('Aldi bread resolves only approved Bakers Life source title through food concept');
        for(const sample of [{code:'4061462249464',brand:'Bakers Life',category:'bread',unit:'slice',amount:2,baseQuantity:75},{code:'9313820016108',brand:'Pepsi',category:'drinks',unit:'mL',amount:250,baseQuantity:250},{code:'4088700157008',brand:'Westacre Dairy',category:'cheese',unit:'g',amount:40,baseQuantity:40},{code:'4088700219737',brand:'Oh So Natural',category:'cereal',unit:'serve',amount:1,baseQuantity:45},{code:'26283517',brand:'Aldi',category:'yoghurt',unit:'g',amount:150,baseQuantity:150}])result.reviews.push(await review(page,sample,outputDirectory));
        result.diaryEntryCount=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length);assert.equal(result.diaryEntryCount,0);
        result.renderedPerformance=await renderedPerformance(page);
      }
      result.unhandledRejections=await page.evaluate(()=>__navigationRejections);assert.deepEqual(result.unhandledRejections,[]);qa.requireEvidence(diagnostic);await context.close();
    }
    report.pass=true;return report;
  }catch(error){report.error={message:error.message,stack:error.stack};throw error;}finally{if(page&&!page.isClosed())await page.screenshot({path:path.join(outputDirectory,'last-state.png'),fullPage:true}).catch(()=>{});await browser.close();fs.writeFileSync(path.join(outputDirectory,'aldi-rendered.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({outputDirectory:process.argv[2]}).then(r=>console.log(JSON.stringify({pass:r.pass,contexts:r.contexts.length,reviews:r.contexts.reduce((n,c)=>n+c.reviews.length,0)}))).catch(e=>{console.error(e);process.exitCode=1});
module.exports={run};
