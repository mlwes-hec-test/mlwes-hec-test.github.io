'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),t=require('./audit_brand_wave_edge'),prior=require('./audit_catalogue_wave_1b_edge');
async function run(out,{reusePrior=false}={}){
 fs.mkdirSync(out,{recursive:true});const report={pass:false,generation:require('../release-manifest.json').generation,scenarios:[],reviews:[],diagnostic:qa.evidence()};
 const regression=reusePrior?JSON.parse(fs.readFileSync(path.join(out,'wave-1b-regression/wave-1b-rendered.json'))):await prior.run(path.join(out,'wave-1b-regression'));assert(regression.pass);assert.equal(regression.generation,report.generation);report.prior={pass:true,conceptScreens:regression.concepts.contexts[0].scenarios.length,conceptFlows:regression.concepts.contexts[0].flows.length,extraReviews:regression.reviews.length};
 const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});let page;
 try{const context=await qa.contextFor(browser,{width:390,height:844},report.diagnostic);page=await context.newPage();await qa.openLibrary(page);
  for(const query of ['Frozen Chips','Frozen Vegetables','Salad','Fish','Seafood','Damora Crisps Sea Salt','Farmdale Full Cream Milk 3L','Market Fare Mixed Vegetables','Pepsi Max 2L']){
   console.log('Wave 3A query '+query);await t.fresh(page);await t.submit(page,query);const choices=await prior.rows(page);let selected;
   const wanted={'Damora Crisps Sea Salt':'4061462197710','Farmdale Full Cream Milk 3L':'4088700028285','Market Fare Mixed Vegetables':'4088700137154','Pepsi Max 2L':'9313820004518'}[query];
   if(wanted){selected=choices.find(r=>r.food.barcode===wanted);assert(selected?.eligible,query);}
   else selected=choices.find(r=>r.eligible&&r.food.recordType==='afcd')||choices.find(r=>r.eligible);
   if(query==='Seafood'&&!selected){const comparison=require('../data/catalogue-wave-3a/verification/search-baseline/comparison.json');assert(comparison.pass);assert.equal(comparison.head,require('../data/catalogue-wave-3a/baseline.json').startingHead);assert.deepEqual(choices.map(r=>({id:r.id,name:r.food.name,brand:r.food.brand,eligible:r.eligible,group:r.group})),comparison.contexts.find(c=>c.query==='Seafood'&&c.phase==='accepted-source').choices);report.scenarios.push({query,unchangedAcceptedSourceGap:true,normalLoggingSuppressed:true});continue;}
   assert(selected,query+' has no loggable choice');report.scenarios.push({query,choices:choices.map(r=>({id:r.id,name:r.food.name,brand:r.food.brand,eligible:r.eligible,form:r.form,group:r.group}))});
   if(wanted==='4088700137154'){assert.match(selected.food.name,/prepared by boiling/);assert(!Object.keys(selected.food.units).some(k=>['mL','L','cup','piece'].includes(k)));}
   if(wanted==='9313820004518'){assert.equal(selected.food.brand,'Pepsi Max');assert.equal(selected.food.privateLabelCollections.length,0);}
   report.reviews.push(await prior.review(page,selected,selected.form==='liquid'?'mL':'g',selected.form==='liquid'?250:100));
   if(wanted)await page.screenshot({path:path.join(out,wanted+'-review.png'),fullPage:true});
  }
  for(const query of ['Bakers Life','Seasons Pride','Hillcrest']){await t.fresh(page);await t.submit(page,query);const text=await page.locator('#food-results').innerText();assert(text.includes('All Items')||await page.locator('[data-universal-result]').count(),query);report.scenarios.push({query,text});}
  qa.requireEvidence(report.diagnostic);await context.close();
  // A request completing after Back/new-category navigation cannot replace it.
  console.log('Wave 3A late navigation');const diagnostic=qa.evidence(),late=await qa.contextFor(browser,{width:390,height:844},diagnostic),p=await late.newPage();await qa.openLibrary(p);await t.submit(p,'aldi');
  let hold=true,release;const gate=new Promise(resolve=>{release=resolve;}),held=[],pending=[],pattern='**/data/aldi-au/products/**';
  await p.route(pattern,route=>{const work=(async()=>{if(hold){held.push(route.request().url());await gate;}await route.fallback();})();pending.push(work);return work;});
  try{
   await p.locator('[data-retailer-category="yoghurt"]').click();await p.waitForFunction(()=>HEC_RETAILER_TEST.state()?.loading);await p.waitForTimeout(50);assert(held.length>0);console.log('Held yoghurt requests: '+held.length);
   await p.locator('[data-retailer-back]').click();await t.settled(p);hold=false;await p.locator('[data-retailer-category="cheese"]').click();await p.waitForFunction(()=>HEC_RETAILER_TEST.state()?.categoryId==='cheese');console.log('Cheese selected before releasing yoghurt');
  }finally{hold=false;release();await Promise.all(pending);await p.waitForLoadState('networkidle');}
  await p.unroute(pattern);await t.settled(p);await p.waitForLoadState('networkidle');
  const state=await p.evaluate(()=>HEC_RETAILER_TEST.state());assert.equal(state.categoryId,'cheese');assert(!state.loading);assert.equal(state.result.categoryId,'cheese');report.lateNavigation={pass:true,held:held.length,category:state.categoryId,diagnostic};qa.requireEvidence(diagnostic);await late.close();
  report.loading=await require('./audit_retailer_loading_edge').run(path.join(out,'loading'));assert(report.loading.pass);report.pass=true;return report;
 }catch(error){report.error={message:error.message,stack:error.stack};if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(out,'wave-3a-rendered.json'),JSON.stringify(report,null,2)+'\n');}
}
if(require.main===module)run(process.argv[2],{reusePrior:process.argv.includes('--focused')}).then(r=>console.log(JSON.stringify({pass:r.pass,queries:r.scenarios.length,reviews:r.reviews.length,routes:r.loading.routes.length}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
