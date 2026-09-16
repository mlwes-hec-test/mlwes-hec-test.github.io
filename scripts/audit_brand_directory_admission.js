'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),t=require('./audit_brand_wave_edge');
const {returningProfile}=require('./audit_navigation_startup_edge');
const index=require('../brand-au-catalogue');

async function renderedIds(page){return page.locator('.brand-catalogue [data-universal-result]').evaluateAll(nodes=>nodes.map(node=>{
  const id=node.dataset.universalResult,food=HEC_CANONICAL_CACHE_TEST.food(id);
  return {id,admittedId:'off:'+food.barcode,canonicalKey:HECFoodCatalogue.canonicalKey(food)};
}));}

async function directory(page,key){
  const brand=index.brands.find(b=>b.key===key),expected=index.entries.filter(e=>e.brandKeys.includes(key)).map(e=>e.id).sort();
  await t.submit(page,brand.name);
  await page.locator('[data-au-brand-category="*"]').click();
  const actual=[];
  for(;;){actual.push(...await renderedIds(page));const more=page.locator('[data-au-brand-more]');if(!await more.count())break;await more.click();await t.settled(page);}
  assert.deepEqual(actual.map(f=>f.admittedId).sort(),expected,key);
  assert.equal(new Set(actual.map(f=>f.canonicalKey)).size,expected.length,key);
  return {key,count:actual.length,expected,actual,parity:true};
}

async function run(out){
  fs.mkdirSync(out,{recursive:true});
  const report={pass:false,contexts:[]},{chromium,edge}=qa.browserTools();
  const browser=await chromium.launch({headless:true,executablePath:edge});let page;
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024}]){
      const diagnostic=qa.evidence(),context=await qa.contextFor(browser,viewport,diagnostic);
      await context.addInitScript(returningProfile);page=await context.newPage();await qa.openLibrary(page);
      const result={viewport,diagnostic,directories:[],generic:[],reviews:[]};report.contexts.push(result);
      result.freshDirectory=await directory(page,'mccain');
      const coldSelection=await t.resolveRenderedProduct(page,'off:9310174025084');
      assert.equal(coldSelection.id,'woolworths-au:98299');
      assert.equal(Math.round(coldSelection.food.nutrients.calories*.75),130);
      assert.equal(Math.round(coldSelection.food.nutrients.energyKj*.75),543);
      await t.fresh(page);
      // Reproduce the history that hydrated the retailer alias before McCain.
      for(const query of ['Bread','Milk','Cereal','Soup','Potato','Hash Brown','Big Mac']){
        await t.submit(page,query);
        const first=await page.locator('#food-results [data-fc-base],#food-results [data-universal-generic],#food-results [data-universal-result]').first().evaluate(n=>({base:n.hasAttribute('data-fc-base'),concept:n.dataset.universalGeneric,text:n.innerText}));
        if(query==='Big Mac')assert.match(first.text,/^Big Mac\n/);else assert(first.base||first.concept,query);
        if(query==='Milk')assert(!/milk chocolate/i.test(await page.locator('#food-results').innerText()));
        if(['Potato','Hash Brown'].includes(query)){
          await t.geometry(page);await page.screenshot({path:path.join(out,viewport.width+'-'+query.replace(/ /g,'-')+'.png'),fullPage:true});
        }
        result.generic.push({query,first});
      }
      for(const key of viewport.width===390?['mccain','kelloggs','campbells','nescafe','arizona','bakerslife','chobani','westacredairy']:['mccain'])result.directories.push(await directory(page,key));
      await t.fresh(page);await t.submit(page,'McCain');await t.geometry(page);await page.screenshot({path:path.join(out,viewport.width+'-mccain-directory.png'),fullPage:true});
      await page.locator('[data-au-brand-category="*"]').click();await t.geometry(page);
      const selection=await t.resolveRenderedProduct(page,'off:9310174025084');
      assert.equal(selection.canonicalKey,'barcode:9310174025084');
      await page.locator(`[data-universal-result="${selection.id}"]`).click();
      await page.screenshot({path:path.join(out,viewport.width+'-hash-browns-selection.png'),fullPage:true});
      await t.fresh(page);
      result.reviews.push(await t.review(page,t.samples.find(s=>s.id==='off:9310174025084'),out,viewport.width));
      assert.equal(Math.round(result.reviews[0].calories),130);assert.equal(Math.round(result.reviews[0].energyKj),543);
      result.canonicalHashBrownEnergyMatches=true;
      await t.fresh(page);await t.submit(page,'McCain');await page.locator('[data-au-brand-category="*"]').click();await page.locator('[data-au-brand-back]').click();assert(await page.locator('[data-au-brand-category]').count());
      for(const concept of ['potato','hash-brown']){
        await t.submit(page,concept==='potato'?'Potato':'Hash Brown');
        if(concept==='hash-brown'){
          await page.locator('[data-fc-base]').click();
          await page.locator('[data-fc-answer="sourceContext"][data-fc-value="packaged-frozen"]').click();
          await t.resolveRenderedProduct(page,'off:9310174025084');await t.geometry(page);
          await page.locator('[data-fc-back]').click();assert(await page.locator('[data-fc-answer="sourceContext"]').count());
          continue;
        }
        await page.locator(`[data-universal-generic="${concept}"]`).click();
        await page.locator('[data-universal-source="packaged-frozen"]').click();
        await page.locator('[data-au-concept-brand="mccain"]').click();await t.settled(page);
        const foods=await renderedIds(page),expected=index.entries.filter(e=>e.brandKeys.includes('mccain')&&e.conceptIds.includes(concept)).map(e=>e.id).sort();
        assert.deepEqual(foods.map(f=>f.admittedId).sort(),expected);
        await t.geometry(page);await page.locator('[data-au-brand-back]').click();assert(await page.locator('[data-au-concept-brand="mccain"]').count());
      }
      await t.fresh(page);assert.equal(await page.locator('#food-search').inputValue(),'');
      await t.submit(page,'PMU');assert.equal(await page.locator('.brand-catalogue [data-universal-result]').count(),0);
      result.pmu='unresolved / no admitted brand';result.back=true;
      qa.requireEvidence(diagnostic);await context.close();
    }
    report.pass=true;return report;
  }catch(error){report.error={message:error.message,stack:error.stack};throw error;}
  finally{if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'last-state.png'),fullPage:true}).catch(()=>{});await browser.close();fs.writeFileSync(path.join(out,'admission-rendered.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run(process.argv[2]).then(r=>console.log(JSON.stringify({pass:r.pass,contexts:r.contexts.length}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run,directory,renderedIds};
