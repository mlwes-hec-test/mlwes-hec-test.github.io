'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),t=require('./audit_brand_wave_edge'),{returningProfile}=require('./audit_navigation_startup_edge');
async function geometry(page){const r=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:[...document.querySelectorAll('#food-results button')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&(r.left< -1||r.right>innerWidth+1||n.scrollWidth>n.clientWidth+1);}).map(n=>n.innerText)}));assert.equal(r.overflow,false);assert.deepEqual(r.clipped,[]);return r;}
async function run(out){
 fs.mkdirSync(out,{recursive:true});
 const report={generation:require('../release-manifest.json').generation,pass:false,viewport:{width:375,height:812},routes:[],diagnostic:qa.evidence()};
 const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
 try{
  const context=await qa.contextFor(browser,report.viewport,report.diagnostic);await context.addInitScript(returningProfile);const page=await context.newPage();await qa.openLibrary(page);
  for(const retailer of ['aldi','woolworths','coles']){
   await t.fresh(page);await t.submit(page,retailer);const d=await page.evaluate(id=>HECRetailerCatalogue.directory(id),retailer);await geometry(page);
   assert.equal(await page.locator('[data-retailer-category]').count(),d.categories.length+1);
   if(retailer==='aldi'){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'aldi-root.png'),fullPage:true});}
   for(const choice of [...[...d.categories,{id:'*',label:'All Items',count:d.total}].map(c=>({kind:'category',key:c.id,label:c.label,expected:c.count})),...d.brands.map(b=>({kind:'brand',key:b.key,label:b.name,expected:b.count}))]){
    if(choice.kind==='brand')await page.locator('[data-retailer-brands]').click();
    await page.locator('[data-retailer-'+choice.kind+'="'+choice.key+'"]').click();
    const row={retailer,...choice,actual:0,settled:false,state:'OTHER'};report.routes.push(row);
    try{
     do{
      await page.waitForFunction(()=>!HEC_RETAILER_TEST.state()?.loading,{},{timeout:5000});
      const s=await page.evaluate(()=>{const s=HEC_RETAILER_TEST.state();return {loading:s.loading,error:s.error,total:s.result?.total,hasMore:s.result?.hasMore,count:s.result?.foods?.length}});
      assert(!s.error,s.error);assert(s.count>0);assert.equal(await page.locator('[data-universal-result]').count(),s.count);assert(!/Loading foods/.test(await page.locator('#food-results').innerText()));
      row.actual+=s.count;await geometry(page);
      if(retailer==='aldi'&&row.actual===s.count&&['yoghurt','bakerslife','seasonspride'].includes(choice.key)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'aldi-'+choice.key+'.png'),fullPage:true});}
      if(!s.hasMore)break;await page.locator('[data-retailer-more]').click();
     }while(true);
     row.settled=true;assert.equal(row.actual,row.expected);row.state='PASS';
    }catch(e){row.error=e.message;row.state='RESOLUTION-FAIL';console.log('FAIL '+retailer+' '+choice.key+' '+e.message);}
    await page.locator('[data-retailer-back]').click();await t.settled(page);
    if(choice.kind==='brand'){assert(await page.locator('[data-retailer-brand="'+choice.key+'"]').count());await page.locator('[data-retailer-back]').click();}
    assert(await page.locator('[data-retailer-category]').count());
   }
   console.log(retailer+' audited '+d.categories.length+' categories, '+d.brands.length+' brands');
  }
  report.empty=[];
  for(const kind of ['category','brand']){
   await t.fresh(page);await t.submit(page,'aldi');if(kind==='brand')await page.locator('[data-retailer-brands]').click();
   const control=page.locator('[data-retailer-'+kind+']').first();await control.evaluate((n,kind)=>n.setAttribute('data-retailer-'+kind,'stale-empty-key'),kind);await control.click();await t.settled(page);
   const s=await page.evaluate(()=>HEC_RETAILER_TEST.state());assert.equal(s.loading,false);assert.equal(s.result.foods.length,0);assert.match(await page.locator('#food-results').innerText(),/No matching foods/);await geometry(page);report.empty.push({kind,settled:true,count:0});
   if(kind==='category')await page.screenshot({path:path.join(out,'defensive-empty.png'),fullPage:true});await page.locator('[data-retailer-back]').click();await t.settled(page);
  }
  qa.requireEvidence(report.diagnostic);assert(report.routes.every(r=>r.state==='PASS'));await context.close();
  report.failures=[];
  for(const mode of ['stalled','rejected']){
   const diagnostic=qa.evidence(),c=await qa.contextFor(browser,report.viewport,diagnostic);await c.addInitScript(returningProfile);const p=await c.newPage();await qa.openLibrary(p);await t.submit(p,'aldi');const held=[];
   const pattern='**/data/aldi-au/products/**';await p.route(pattern,route=>{held.push(route);if(mode==='rejected')return route.abort('failed');});
   const start=Date.now();await p.locator('[data-retailer-category="yoghurt"]').click();await p.locator('[data-retailer-retry]').waitFor({timeout:20000});
   const s=await p.evaluate(()=>HEC_RETAILER_TEST.state());assert.equal(s.loading,false);assert(s.error);assert(!/Loading foods/.test(await p.locator('#food-results').innerText()));assert(Date.now()-start<20000);await geometry(p);
   report.failures.push({mode,error:s.error,settled:true,elapsedMs:Date.now()-start,injectedRequests:held.length,diagnostic});
   for(const route of held)if(mode==='stalled')await route.abort().catch(()=>{});await p.unroute(pattern);await p.locator('[data-retailer-retry]').click();await t.settled(p);assert.equal(await p.locator('[data-universal-result]').count(),10);report.failures.at(-1).retryProducts=10;
   assert.deepEqual(diagnostic.pageErrors,[]);assert.equal(diagnostic.liveFallthrough,0);await c.close();
  }
  report.pass=true;return report;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'routes.json'),JSON.stringify(report,null,2)+'\n');}
}
if(require.main===module)run(process.argv[2]).then(r=>console.log(JSON.stringify({pass:r.pass,routes:r.routes.length}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
