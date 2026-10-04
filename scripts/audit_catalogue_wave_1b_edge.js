'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),t=require('./audit_brand_wave_edge'),concepts=require('./audit_food_concept_resolution_edge');
async function rows(page){return page.locator('[data-universal-result]').evaluateAll(ns=>ns.map(n=>{const food=HEC_CANONICAL_CACHE_TEST.food(n.dataset.universalResult);return {id:n.dataset.universalResult,food,group:n.closest('[data-universal-group]')?.dataset.universalGroup,eligible:HECFoodCatalogue.canLog(food),form:HECServingFoundation.physicalForm(food).form};}));}
async function review(page,row,unit,amount){
 await page.locator('[data-universal-result="'+row.id+'"]').first().click();
 const measure=page.locator('[data-gpr-measure="'+unit+'"]:visible');if(await measure.count())await measure.click();
 const input=page.locator('[data-gpr-amount]:visible');await input.waitFor();assert.equal(await input.inputValue(),'');await input.fill(String(amount));await input.press('Enter');
 await page.locator('#food-entry-editor.active').waitFor();assert.equal(await page.locator('.screen.active').count(),1);assert.equal(await page.locator('[data-gpr-amount]:visible').count(),0);assert.equal(await page.locator('#entry-unit').inputValue(),unit);assert.equal(Number(await page.locator('#entry-amount').inputValue()),amount);
 const preview=await page.locator('#entry-nutrition-preview').innerText(),food=row.food,scale=food.units[unit]*amount;assert(preview.includes(Math.round(food.nutrients.calories*scale).toLocaleString('en-AU')+' Cal'),preview);assert(preview.includes(Math.round((food.nutrients.energyKj??food.nutrients.calories*4.184)*scale).toLocaleString('en-AU')+' kJ'),preview);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 return {id:row.id,gtin:food.barcode,brand:food.brand,name:food.name,unit,amount,preview,reviewCount:1};
}
async function run(outputDirectory,{conceptFlows=true}={}){
 fs.mkdirSync(outputDirectory,{recursive:true});const report={pass:false,generation:require('../release-manifest.json').generation,scenarios:[],reviews:[],diagnostic:qa.evidence()};
 if(conceptFlows){report.concepts=await concepts.run({flows:true,outputDirectory:path.join(outputDirectory,'concepts')});assert(report.concepts.pass,JSON.stringify(report.concepts.failures));}
 const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});let page;
 try{const context=await qa.contextFor(browser,{width:320,height:568},report.diagnostic);page=await context.newPage();await qa.openLibrary(page);
  for(const query of ['Coffee','Flat White',"Kellogg's Corn Flakes",'Woolworths cereal']){
   await t.fresh(page);await t.submit(page,query);const choices=await rows(page);assert(choices.length,query);let selected;
   if(/Coffee|Flat White/.test(query)){selected=choices.find(r=>r.eligible&&r.food.recordType==='afcd'&&r.form==='liquid');assert(selected);assert(!/dry powder or granules|sachet/i.test(selected.food.name));for(const r of choices.filter(r=>/dry powder/.test(r.food.name)&&! /prepared|from /.test(r.food.name)))assert.equal(r.form,'weight');}
   else{selected=choices.find(r=>r.eligible);assert(selected);if(query.startsWith('Kellogg')){assert.equal(selected.food.brand,"Kellogg's");assert.equal(selected.food.name,'Corn Flakes');assert.equal(selected.food.barcode,'8801083672700');assert(!choices.some(r=>r.food.barcode==='9310055537224'&&r.eligible));}else{assert(choices.some(r=>r.food.barcode==='9300633980016'));assert(choices.every(r=>!['campbells','kelloggs','nescafe'].includes(r.food.brand?.toLowerCase().replace(/[^a-z]/g,''))));}}
   report.scenarios.push({query,choices:choices.map(r=>({id:r.id,name:r.food.name,brand:r.food.brand,eligible:r.eligible,group:r.group,form:r.form}))});
   report.reviews.push(await review(page,selected,selected.form==='liquid'?'mL':'g',selected.form==='liquid'?250:35));
  }
  await t.fresh(page);await t.submit(page,'Woolworths');assert((await page.locator('#food-results').innerText()).includes('All Items (363)'));await page.locator('[data-retailer-category="frozen-vegetables"]').click();await t.settled(page);const vegetables=(await rows(page)).find(r=>r.food.barcode==='9300633450410');assert(vegetables?.eligible);report.reviews.push(await review(page,vegetables,'g',100));
  await t.fresh(page);await t.submit(page,"Campbell's Real Stock Chicken");const stock=(await rows(page)).find(r=>r.food.barcode==='9300644043601');assert(stock?.eligible);assert.equal(stock.food.brand,"Campbell's");assert.equal(stock.food.nutrients.fibre,null);assert.equal(stock.food.fieldProvenance.nutrition.trustClass,'official-au-manufacturer');report.reviews.push(await review(page,stock,'mL',250));
  await page.screenshot({path:path.join(outputDirectory,'new-stock-review.png'),fullPage:true});
  qa.requireEvidence(report.diagnostic);report.pass=true;await context.close();return report;
 }catch(error){report.error={message:error.message,stack:error.stack};if(page&&!page.isClosed())await page.screenshot({path:path.join(outputDirectory,'failure.png'),fullPage:true});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'wave-1b-rendered.json'),JSON.stringify(report,null,2)+'\n');}
}
if(require.main===module)run(process.argv[2],{conceptFlows:!process.argv.includes('--focused')}).then(r=>console.log(JSON.stringify({pass:r.pass,queries:r.scenarios.length,reviews:r.reviews.length,conceptScenarios:r.concepts?.contexts[0].scenarios.length,conceptFlows:r.concepts?.contexts[0].flows.length}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
