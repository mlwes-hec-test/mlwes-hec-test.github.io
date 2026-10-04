'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),t=require('./audit_brand_wave_edge'),prior=require('./audit_catalogue_wave_1b_edge');
async function run(out,{reusePrior=false}={}){
 fs.mkdirSync(out,{recursive:true});const report={pass:false,generation:require('../release-manifest.json').generation,scenarios:[],reviews:[],diagnostic:qa.evidence()};
 // Covers the 27 generic first screens, 25 complete concept flows, Coffee,
 // Flat White, and both physically accepted Wave 1B product facts.
 const previous=reusePrior?JSON.parse(fs.readFileSync(path.join(out,'wave-1b-regression/wave-1b-rendered.json'))):await prior.run(path.join(out,'wave-1b-regression'));
 assert(previous.pass);assert.equal(previous.generation,report.generation);
 report.wave1B={pass:previous.pass,generation:previous.generation,conceptFirstScreens:previous.concepts.contexts[0].scenarios.length,conceptReviewFlows:previous.concepts.contexts[0].flows.length,additionalQueries:previous.scenarios.length,additionalReviews:previous.reviews.length,report:'wave-1b-regression/wave-1b-rendered.json'};
 const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});let page;
 try{const context=await qa.contextFor(browser,{width:390,height:844},report.diagnostic);page=await context.newPage();await qa.openLibrary(page);
  for(const query of ['frozen chips','frozen fries','salad','Coles Soft White Wraps','McCain Air Fryer Straight Cut']){
   await t.fresh(page);await t.submit(page,query);const choices=await prior.rows(page);let selected;
   if(query==='frozen fries'&&!choices.some(r=>r.eligible)){
    const baseline=JSON.parse(fs.readFileSync(path.join(out,'../frozen-fries-baseline/comparison.json')));assert(baseline.pass);
    assert.deepEqual(choices.map(r=>({id:r.id,name:r.food.name,brand:r.food.brand,eligible:r.eligible,group:r.group})),baseline.contexts[0].choices);
    report.scenarios.push({query,unchangedLegacyGap:true,normalLoggingSuppressed:true,baselineReport:'../frozen-fries-baseline/comparison.json'});continue;
   }
   assert(choices.some(r=>r.eligible),query);
   if(query.startsWith('Coles')){selected=choices.find(r=>r.food.barcode==='9310645343143');assert(selected);assert.equal(selected.food.browseCategoryId,'bread');}
   else if(query.startsWith('McCain')){selected=choices.find(r=>r.food.id==='supplemental:mccain-au:products-categories-potato-speedy-solutions-air-fryer-straight-cut-750g');assert(selected);assert.equal(selected.food.brand,'McCain');assert.equal(selected.food.nutrients.fibre,null);assert.equal(selected.food.nutrients.satFat,null);assert.equal(selected.food.nutrients.sugar,null);assert.equal(selected.food.retailerMemberships[0].retailerId,'coles');}
   else if(query==='salad'){selected=choices[0];assert(selected.eligible&&selected.form!=='liquid'&&/salad/i.test(selected.food.name)&&! /dressing|juice|burger|sandwich/i.test(selected.food.name));}
   else{selected=choices.find(r=>r.eligible&&r.form!=='liquid'&&r.food.recordType==='afcd'&&'g' in r.food.units)||choices.find(r=>r.eligible&&r.form!=='liquid'&&'g' in r.food.units);assert(selected,query);}
   report.scenarios.push({query,choices:choices.map(r=>({id:r.id,name:r.food.name,brand:r.food.brand,eligible:r.eligible,group:r.group,form:r.form}))});
   report.reviews.push(await prior.review(page,selected,'g',100));
  }
  for(const [kind,total,other]of [['Coles',417,64],['Woolworths',363,37],['Aldi',222,42]]){await t.fresh(page);await t.submit(page,kind);const text=await page.locator('#food-results').innerText();assert(text.includes('All Items ('+total+')'),text);assert(text.includes('Other Packaged Food ('+other+')'),text);await page.screenshot({path:path.join(out,kind.toLowerCase()+'-categories.png'),fullPage:true});}
  qa.requireEvidence(report.diagnostic);report.pass=true;await context.close();return report;
 }catch(error){report.error={message:error.message,stack:error.stack};if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}
 finally{await browser.close();fs.writeFileSync(path.join(out,'wave-2a-rendered.json'),JSON.stringify(report,null,2)+'\n');}
}
if(require.main===module)run(process.argv[2],{reusePrior:process.argv.includes('--focused')}).then(r=>console.log(JSON.stringify({pass:r.pass,extraQueries:r.scenarios.length,extraReviews:r.reviews.length}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
