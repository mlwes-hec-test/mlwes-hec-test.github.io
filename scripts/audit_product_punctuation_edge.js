'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge');
async function run({sample,viewport,outputDirectory}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  const routing=qa.evidence(),report={pass:false,viewport,browser:browser.version(),sample,routing,queries:[]};let page;
  try{
    const context=await qa.contextFor(browser,viewport,routing);page=await context.newPage();await qa.openLibrary(page);
    const brands=[sample.brand.replace(/[’']/g,"'"),sample.brand.replace(/[’']/g,'’'),sample.brand.replace(/[’']/g,'')];
    for(const query of [...new Set(brands.map(brand=>brand+' '+sample.name)),sample.name]){
      await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));await page.locator('#food-search').fill(query);
      await page.waitForFunction(id=>HECOpenFoodFactsAU.getLoaded(id),sample.id,{timeout:30000});await page.locator('#submit-food-search').click();
      const target=page.locator(`[data-universal-result="${sample.id}"]`);await target.waitFor({state:'visible',timeout:30000});
      const state=await page.evaluate(()=>HEC_SEARCH_SESSION_TEST.state());assert.equal(state.mode,'explicit-committed');assert.equal(state.universalSource,'');assert.equal(state.sourceCommitted,false);
      const rank=await page.locator('[data-universal-result]').evaluateAll((nodes,id)=>nodes.findIndex(n=>n.dataset.universalResult===id)+1,sample.id);await target.click();
      const selected=await page.evaluate(()=>{const food=HEC_GUIDED_PRODUCT_TEST.food();return {id:food.id,brand:food.brand,name:food.name,canonicalId:HECGuidedProductResolution.canonicalProductKey(food),profileKey:HEC_GUIDED_PRODUCT_TEST.profile().productKey,eligible:HECFoodCatalogue.productEligibility(food).addability.normalLoggingAllowed,overflow:document.documentElement.scrollWidth>innerWidth+1};});
      assert.equal(selected.id,sample.id);assert.equal(selected.canonicalId,sample.canonicalId);assert.equal(selected.profileKey,sample.canonicalId);assert.equal(selected.brand,sample.brand);assert.equal(selected.name,sample.name);assert(selected.eligible);assert(!selected.overflow);report.queries.push({query,rank,selected});
    }
    qa.requireEvidence(routing);report.pass=true;return report;
  }catch(error){report.error={message:error.message,stack:error.stack};throw error;}
  finally{if(page)await page.screenshot({path:path.join(outputDirectory,'result.png'),fullPage:true});await browser.close();fs.writeFileSync(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2));}
}
if(require.main===module){const sample=JSON.parse(fs.readFileSync(process.argv[2])).automaticReachability.find(row=>row.kind==='punctuation');run({sample,viewport:{width:Number(process.argv[4]),height:Number(process.argv[5])},outputDirectory:process.argv[3]}).then(r=>console.log(JSON.stringify({pass:r.pass,viewport:r.viewport,queries:r.queries.map(q=>({query:q.query,rank:q.rank,canonicalId:q.selected.canonicalId}))}))).catch(error=>{console.error(error);process.exitCode=1;});}
module.exports={run};
