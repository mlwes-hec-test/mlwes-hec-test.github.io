'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),concept=require('./audit_food_concept_resolution_edge');
async function run({outputDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'hec-au-shortlist-'))}={}){
  const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  const report={pass:false,browser:'Microsoft Edge',version:browser.version(),outputDirectory,contexts:[]};fs.mkdirSync(outputDirectory,{recursive:true});
  try{
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932}]){
      const diagnostic=qa.evidence(),context=await qa.contextFor(browser,viewport,diagnostic),page=await context.newPage(),entry={viewport,diagnostic,shortlists:[],exact:[]};report.contexts.push(entry);await qa.openLibrary(page);
      for(const query of ['Bread','Milk','Cheese','Yoghurt','Cereal','Hash Brown']){
        console.log(`Shortlist ${viewport.width} ${query}`);await concept.submit(page,query);await concept.settled(page);
        const screen=await concept.capture(page),shortlist=await page.locator('#food-results [data-fc-base],#food-results [data-universal-result]').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('strong').innerText,detail:n.querySelector('small').innerText,id:n.dataset.universalResult||'',group:n.closest('[data-universal-group]').dataset.universalGroup,base:n.hasAttribute('data-fc-base')})));
        assert(shortlist[0].base&&shortlist.length>1&&shortlist.length<=20);assert(!screen.overflow);assert.equal(await page.locator('[data-fc-answer]').count(),0);
        const order=['generic','direct','related','branded','supermarket'];assert.deepEqual(shortlist.map(r=>order.indexOf(r.group)),shortlist.map(r=>order.indexOf(r.group)).sort((a,b)=>a-b));
        assert(!shortlist.some(r=>['off:26042855','off:26006017'].includes(r.id)));
        if(query==='Bread')assert(shortlist.some(r=>/Helga/i.test(r.detail)));
        if(query==='Milk')assert(!shortlist.some(r=>/chocolate|milkshake|powder|infant formula/i.test(r.name)));
        if(query==='Cheese')assert(!shortlist.some(r=>/pocket|macaroni|chicken|burger/i.test(r.name)));
        await page.screenshot({path:path.join(outputDirectory,`${viewport.width}-${query.replaceAll(' ','-')}.png`),fullPage:true});
        const selectable=page.locator('[data-universal-result]').filter({hasText:'Loggable now'}).first(),id=await selectable.getAttribute('data-universal-result'),name=await selectable.locator('strong').innerText();await selectable.click();
        const selected=await page.evaluate(()=>window.HEC_GUIDED_PRODUCT_TEST.ui());assert.equal(selected.product,name);assert.equal(await page.locator('[data-fc-base]').count(),0);
        entry.shortlists.push({query,shortlist,overflow:screen.overflow,directSelection:{id,name,stage:selected.stage}});
      }
      for(const [query,name] of [['Big Mac','Big Mac'],['Flora ProActiv Light','Flora ProActiv Light'],['McCain hash browns','Hash Browns'],['Biscottes Au froment','Biscottes Au froment'],['Lait Entier','Lait Entier']]){
        await concept.submit(page,query);await page.locator('[data-universal-result]').first().waitFor();const names=await page.locator('[data-universal-result] strong').allInnerTexts();assert(names.includes(name),query);if(query==='Big Mac')assert.equal(names[0],name);entry.exact.push({query,names});
      }
      qa.requireEvidence(diagnostic);await context.close();
    }
    report.pass=true;return report;
  }catch(error){report.error={message:error.message,stack:error.stack};throw error;}finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'shortlists.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run().then(r=>console.log(JSON.stringify({pass:r.pass,outputDirectory:r.outputDirectory}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
