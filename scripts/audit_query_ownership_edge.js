'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge');
const phones=[{width:320,height:568},{width:390,height:844},{width:430,height:932}];
async function snapshot(page){return page.evaluate(()=>({session:HEC_SEARCH_SESSION_TEST.state(),brand:HEC_AU_CATALOGUE_TEST.brandState(),rows:[...document.querySelectorAll('#food-results [data-universal-result],#food-live-results [data-universal-result]')].filter(n=>n.getClientRects().length).map(n=>({id:n.dataset.universalResult,text:n.innerText})),overflow:document.documentElement.scrollWidth>innerWidth+1}));}
async function installProbe(page){await page.evaluate(()=>{
  // Synthetic records exist only in this disposable browser. Real catalogue
  // requests, including approved alias families, retain the production API.
  const brands=['Cote','Côte','resume','résumé'];HECFoodCatalogue.registerBrandDirectory(brands.map(name=>({name,count:2})));
  const original=HECOpenFoodFactsAU.search.bind(HECOpenFoodFactsAU),pending=[],calls=[];
  window.queryOwnershipProbe={pending,calls,hold:false,release(){for(const item of pending.splice(0))item.resolve(item.result);}};
  HECOpenFoodFactsAU.search=async(query,options={})=>{
    if(!brands.includes(query))return original(query,options);
    const foods=[0,1].map(i=>({id:`query-probe:${query}:${i}`,brand:query,name:i?'Golden Seed Bites':'Cedar Seeds & Grains',recordType:'packaged',country:'Australia',market:'AU',units:{g:.01},nutrients:{calories:200},pack:{amount:100,unit:'g'}}));
    const result={query,foods,total:2,offset:0,hasMore:false,intent:HECFoodCatalogue.queryIntent(query)};calls.push(query);
    return queryOwnershipProbe.hold?new Promise(resolve=>pending.push({query,result,resolve})):result;
  };
});}
async function submit(page,query){await page.locator('#food-search').fill(query);await page.locator('#submit-food-search').click();}
async function settled(page,query){await page.waitForFunction(query=>{const state=HEC_AU_CATALOGUE_TEST.brandState();return state?.query===query&&!state.loading;},query);return snapshot(page);}
async function transition(page,a,b,{baseline=false,alias=false}={}){
  await submit(page,a);const before=await settled(page,a);
  await page.evaluate(()=>queryOwnershipProbe.hold=true);await submit(page,b);
  if(baseline){await page.waitForTimeout(500);const after=await snapshot(page);return {a,b,before,after,reproduced:after.session.revision===before.session.revision&&after.brand.query===a};}
  const pending=await snapshot(page);assert(pending.session.revision>before.session.revision,`${a} → ${b}: fresh revision`);assert.equal(pending.session.rawQuery,b);assert.equal(pending.session.universalSource,'');assert(!pending.rows.some(row=>row.id.startsWith('query-probe:'+a+':')),`${a} rows retired immediately`);
  await page.evaluate(()=>{queryOwnershipProbe.hold=false;queryOwnershipProbe.release();});const after=await settled(page,b);
  assert(!after.overflow);assert.equal(after.brand.query,b);assert.equal(after.session.sourceCommitted,false);
  const ids=state=>state.brand.model.groups.flatMap(g=>g.items||[]).map(i=>i.recordId).sort();
  if(alias){assert.deepEqual(ids(after),ids(before));assert(after.brand.model.total>0);if(b==='Bürgen')assert.equal(after.brand.model.total,8);}
  else{assert.equal(after.brand.model.total,2);assert(after.rows.length>0);assert(after.rows.every(row=>row.id.startsWith('query-probe:'+b+':')));}
  return {a,b,before,pending,after};
}
async function lateResponse(page,a,b){
  await page.evaluate(()=>queryOwnershipProbe.hold=true);await submit(page,a);await page.waitForFunction(a=>queryOwnershipProbe.pending.some(item=>item.query===a),a);
  const old=await snapshot(page);await page.evaluate(()=>queryOwnershipProbe.hold=false);await submit(page,b);const current=await settled(page,b);
  await page.evaluate(()=>queryOwnershipProbe.release());await page.waitForTimeout(300);const after=await snapshot(page);
  assert(after.session.revision>old.session.revision);assert.equal(after.session.revision,current.session.revision);assert.equal(after.brand.query,b);assert.deepEqual(after.rows,current.rows);return {a,b,old,current,after};
}
async function run({baseline=false,viewports=phones,outputDirectory=path.join(os.tmpdir(),baseline?'hec-query-owner-baseline':'hec-query-owner-edge')}={}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),report={pass:false,baseline,browser:browser.version(),viewports:[]};
  try{for(const viewport of viewports){const routing=qa.evidence(),item={viewport,routing};report.viewports.push(item);const context=await qa.contextFor(browser,viewport,routing),page=await context.newPage();await qa.openLibrary(page);await installProbe(page);
    item.transitions=[await transition(page,'Cote','Côte',{baseline})];
    if(baseline)assert(item.transitions[0].reproduced,'Baseline defect must be reproduced');
    else{
      for(const [a,b]of [['Côte','Cote'],['resume','résumé'],['résumé','resume'],['Burgen','Bürgen'],['Häagen-Dazs','Haagen-Dazs']])item.transitions.push(await transition(page,a,b,{alias:a==='Burgen'||a==='Häagen-Dazs'}));
      item.late=[];for(const pair of [['Cote','Côte'],['résumé','resume']])item.late.push(await lateResponse(page,...pair));
      const input=page.locator('#food-search');await input.fill('McCain Hash Browns');const specific=await snapshot(page);await input.fill('');const cleared=await snapshot(page);assert(cleared.session.revision>specific.session.revision);assert.equal(cleared.session.rawQuery,'');assert.equal(cleared.session.guidedCommitted,false);await submit(page,'Burgen');item.clearReplace={specific,cleared,brand:await settled(page,'Burgen')};
      await submit(page,'Milk');await page.waitForFunction(()=>HEC_SEARCH_SESSION_TEST.state().intentKind!=='brand-family');item.generic=await snapshot(page);assert.equal(item.generic.session.rawQuery,'Milk');assert(!item.generic.rows.some(row=>row.id.startsWith('query-probe:')));
      await input.fill('');await input.pressSequentially('Côte');await page.locator('#submit-food-search').click();item.rapid=await settled(page,'Côte');assert.equal(item.rapid.brand.model.total,2);
    }
    await page.screenshot({path:path.join(outputDirectory,`${viewport.width}x${viewport.height}.png`),fullPage:true});qa.requireEvidence(routing);await context.close();item.pass=true;
  }report.pass=true;return report;}catch(error){report.error={message:error.message,stack:error.stack};throw error;}finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({baseline:process.argv.includes('--baseline'),...(process.argv[2]&&!process.argv[2].startsWith('--')?{outputDirectory:process.argv[2]}:{})}).then(r=>console.log(JSON.stringify({pass:r.pass,baseline:r.baseline,viewports:r.viewports.map(v=>({viewport:v.viewport,pass:v.pass,liveFallthrough:v.routing.liveFallthrough}))}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run,transition,lateResponse,phones};
