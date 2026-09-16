'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),qa=require('./audit_physical_form_measures_edge'),t=require('./audit_brand_wave_edge'),{returningProfile}=require('./audit_navigation_startup_edge');
async function measure(page,key){return page.evaluate(key=>new Promise((resolve,reject)=>{
  const start=performance.now(),target=document.querySelector('#food-library');let observer;const timer=setTimeout(()=>{observer.disconnect();reject(Error('Render timeout: '+key));},15000);
  const ready=()=>{const state=HEC_AU_CATALOGUE_TEST.status(),query=HEC_SEARCH_SESSION_TEST.state().rawQuery;switch(key){case 'freshFoodLibrary':case 'blankNewSearch':return document.querySelector('#food-search')?.value===''&&document.querySelector('#food-library.active');case 'genericShortlist':return query==='Bread'&&document.querySelector('[data-fc-base]');case 'exactBrand':case 'brandBrowse':return state?.query==="Kellogg's"&&!state.loading&&document.querySelector('[data-au-brand-category]');case 'brandProduct':return query==="Kellogg's Corn Flakes"&&document.querySelector('[data-universal-result="off:8801083672700"]');case 'brandCategory':case 'allItems':return !state?.loading&&document.querySelector('.brand-catalogue [data-universal-result]');case 'conceptBrandName':return document.querySelector('[data-fc-answer="brandIdentity"]');case 'retailerBrowse':return query==='Aldi'&&!HEC_RETAILER_TEST.state()?.loading&&document.querySelector('[data-retailer-category]');}return false;};
  const check=()=>{if(ready()){observer.disconnect();clearTimeout(timer);resolve(performance.now()-start);}};observer=new MutationObserver(check);observer.observe(target,{childList:true,subtree:true});
  if(key==='freshFoodLibrary'||key==='blankNewSearch')openAlpha05Feature('food-library',{freshSearch:true});
  else if(key==='brandCategory')document.querySelector('[data-au-brand-category="cereal"]').click();
  else if(key==='allItems')document.querySelector('[data-au-brand-category="*"]').click();
  else if(key==='conceptBrandName')document.querySelector('[data-fc-answer="catalogueSource"][data-fc-value="brand"]').click();
  else document.querySelector('#submit-food-search').click();
  check();
}),key);}
const {policy,operations,normalResult,coldResult,acceptanceResult}=require('./brand-performance-policy');

async function prepare(page,key){
  await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));
  if(key==='brandCategory'||key==='allItems')await t.submit(page,"Kellogg's");
  if(key==='conceptBrandName'){
    await t.submit(page,'Cereal');
    await page.locator('[data-fc-base]').click();
    await page.locator('[data-fc-answer="catalogueOrigin"][data-fc-value="commercial"]').click();
  }
  const queries={genericShortlist:'Bread',exactBrand:"Kellogg's",brandBrowse:"Kellogg's",brandProduct:"Kellogg's Corn Flakes",retailerBrowse:'Aldi'};
  if(queries[key])await page.locator('#food-search').fill(queries[key]);
}

async function extraFlows(page,out,report){
  for(const [query,brand] of [['Soup','campbells'],['Coffee','nescafe'],['Potato','mccain']]){
    await t.submit(page,query);
    await page.locator(`[data-universal-generic="${query.toLowerCase()}"]`).click();
    await page.locator('[data-universal-source="packaged-frozen"]').click();
    const choice=page.locator(`[data-au-concept-brand="${brand}"]`);
    await choice.waitFor();await choice.click();await t.settled(page);
    assert(await page.locator('.brand-catalogue [data-universal-result]').count());
    report.extraFlows.push({query,brand,products:await page.locator('.brand-catalogue [data-universal-result]').count(),geometry:await t.geometry(page)});
    await page.screenshot({path:path.join(out,query.toLowerCase()+'-brand.png'),fullPage:true});
    await page.locator('[data-au-brand-back]').click();
    assert(await page.locator(`[data-au-concept-brand="${brand}"]`).count());
  }
}

async function runBrowser(out,mode){
  assert(out,'An evidence output directory is required');
  assert(['normal','cold-first'].includes(mode));
  assert(!fs.existsSync(path.join(out,'brand-performance.json')),'Refusing to overwrite existing performance evidence');
  fs.mkdirSync(out,{recursive:true});
  const report={pass:false,mode,policy,generation:require('../release-manifest.json').generation,viewport:{width:390,height:844},diagnostic:qa.evidence(),samplesMs:{},measurements:{},extraFlows:[]};
  const {chromium,edge}=qa.browserTools();
  const browser=await chromium.launch({headless:true,executablePath:edge});
  report.browser={name:'Microsoft Edge',version:browser.version(),executable:edge,freshProcess:true,freshContext:true};
  let page;
  try{
    const context=await qa.contextFor(browser,report.viewport,report.diagnostic);
    await context.addInitScript(returningProfile);
    page=await context.newPage();await qa.openLibrary(page);
    if(mode==='cold-first'){
      // No other query, generic search, warm-up or measured operation precedes this.
      await page.locator('#food-search').fill('Bread');
      report.samplesMs.genericShortlist=[await measure(page,'genericShortlist')];
      report.measurement=coldResult(report.samplesMs.genericShortlist);
      await t.settled(page);
      report.failures=report.measurement.pass?[]:['coldFirstGenericShortlist'];
    }else{
      report.samplesMs=Object.fromEntries(operations.map(key=>[key,[]]));
      for(let i=0;i<policy.normalSamples;i++)for(const key of operations){
        await prepare(page,key);
        report.samplesMs[key].push(await measure(page,key));
        await t.settled(page);
      }
      for(const key of operations)report.measurements[key]=normalResult(key,report.samplesMs[key]);
      report.failures=operations.filter(key=>!report.measurements[key].pass);
      await extraFlows(page,out,report);
    }
    qa.requireEvidence(report.diagnostic);
    report.pass=report.failures.length===0;
    return report;
  }catch(error){
    report.error={message:error.message,stack:error.stack};
    report.failures=[...(report.failures||[]),'runtime-or-evidence'];
    return report;
  }finally{
    if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'last-state.png'),fullPage:true}).catch(()=>{});
    await browser.close();
    fs.writeFileSync(path.join(out,'brand-performance.json'),JSON.stringify(report,null,2));
  }
}

async function run(out,iterations=policy.normalSamples){
  assert.equal(iterations,policy.normalSamples,'Normal acceptance requires exactly 50 samples');
  return runBrowser(out,'normal');
}
async function runCold(out){return runBrowser(out,'cold-first');}
async function runAcceptance(out){
  assert(out,'An evidence output directory is required');
  // Exactly one cold observation and two independent normal runs. No retries,
  // averaging, optional extra attempts or reuse of a browser's warmed state.
  const cold=await runCold(path.join(out,'cold-first'));
  const official=await run(path.join(out,'official'));
  const confirmation=await run(path.join(out,'confirmation'));
  const report=acceptanceResult(cold,official,confirmation);
  fs.writeFileSync(path.join(out,'brand-acceptance.json'),JSON.stringify(report,null,2));
  return report;
}

if(require.main===module){
  const [out,mode='--acceptance']=process.argv.slice(2);
  const runners={'--acceptance':runAcceptance,'--normal':run,'--cold':runCold};
  if(!out||!runners[mode]){console.error('Usage: node scripts/benchmark_brand_rendered.js <evidence-directory> [--acceptance|--normal|--cold]');process.exitCode=1;}
  else runners[mode](out).then(report=>{console.log(JSON.stringify(report.mode?{pass:report.pass,mode:report.mode,measurement:report.measurement,measurements:report.measurements}:report));if(!report.pass)process.exitCode=1;}).catch(error=>{console.error(error);process.exitCode=1;});
}
module.exports={run,runCold,runAcceptance};
