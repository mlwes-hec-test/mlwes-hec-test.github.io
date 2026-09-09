'use strict';

const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge.js');
const cases=[
  {query:'Bread',concept:'bread',excluded:/sausage in bread|banana bread|crispbread|garlic bread/i},
  {query:'Milk',concept:'milk',excluded:/milk chocolate|milkshake|human|breast/i},
  {query:'Big Mac',exact:'Big Mac',variant:'Double Big Mac'},
  {query:'Cheeseburger',exact:'Cheeseburger',variant:'Double Cheeseburger'},
  {query:'Hash Brown',concept:'hash-brown',},
  {query:'Flora ProActiv Light',exact:'Flora ProActiv Light'},
  {query:'Whole meal bread',concept:'bread',supplied:{breadType:'Wholemeal'}},
  {query:'Wholemeal bread',concept:'bread',supplied:{breadType:'Wholemeal'}},
  {query:'White bread',concept:'bread',supplied:{breadType:'White'}},
  {query:'Cow milk',concept:'milk',supplied:{milkSource:'Cow'}},
  {query:'Oat milk',concept:'milk',supplied:{milkSource:'Oat'},excluded:/what fat level|what lactose/i},
  {query:'Skim milk',concept:'milk',supplied:{fatLevel:'Skim'}},
  {query:'Lactose-free milk',concept:'milk',supplied:{lactose:'Lactose free'}},
  {query:'Cheese',concept:'cheese',guidedQuestion:/what type of cheese/i,excluded:/cheeseburger/i},
  {query:'Yoghurt',concept:'yoghurt'},
  {query:'Cereal',concept:'cereal',guidedQuestion:/what kind of breakfast cereal/i,excluded:/cereal bar/i},
  {query:'Sausages',concept:'sausage'},
  {query:'Chips',concept:'chips',},
  {query:'Fries',concept:'fries'},
  {query:'Chicken',concept:'chicken'},
  {query:'Apple',concept:'apple',excluded:/where did it come from|apple pie|apple juice/i},
  {query:'Crackers',concept:'cracker'},
  {query:'Margarine',concept:'margarine'},
  {query:'Burger',concept:'burger'},
  {query:'Rice',concept:'rice',excluded:/where did it come from/i},
  {query:'Eggs',concept:'egg'},
  {query:'KFC Wicked Wings',family:['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings']}
];
async function submit(page,query){
  await page.evaluate(()=>window.openAlpha05Feature('food-library',{freshSearch:true}));
  const input=page.locator('#food-search');await input.fill(query);
  assert.notEqual((await page.evaluate(()=>window.HEC_SEARCH_SESSION_TEST.state())).mode,'explicit-committed');
  await page.locator('#submit-food-search').click();
  await page.waitForFunction(()=>window.HEC_SEARCH_SESSION_TEST.state().mode==='explicit-committed');
}
async function capture(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return page.evaluate(()=>({
  text:document.querySelector('#food-results').innerText,
  question:document.querySelector('.food-concept-question strong,.guided-resolution-question strong,.universal-source-branch header small')?.innerText||'',
  concept:window.HEC_FOOD_CONCEPT_TEST?.state?.()||null,
  groups:[...document.querySelectorAll('[data-universal-group]')].map(group=>({key:group.dataset.universalGroup,names:[...group.querySelectorAll('[data-universal-result] strong')].map(n=>n.innerText)})),
  guide:window.HEC_GUIDED_PRODUCT_TEST.ui(),
  overflow:document.documentElement.scrollWidth>innerWidth+1
}));}
async function settled(page){await page.waitForFunction(()=>!window.HEC_FOOD_CONCEPT_TEST?.state?.()?.loading,{},{timeout:60000});}
async function chooseIdentity(page,{preferences={},exactName=''}={}){
  await settled(page);const steps=[],defaults={breadOrigin:'home',breadType:'Wholemeal',milkSource:'Cow',fatLevel:'Regular fat',lactose:'Standard lactose',functionalStyle:'Standard',fortification:'Unfortified',identitySource:'generic',sourceContext:'ready-to-eat',preparation:'Boiled',eggPart:'Whole',cheeseType:'Cheddar / tasty',chickenCut:'Breast',grain:'Wholemeal',...preferences};
  for(let count=0;count<18;count++){
    if(await page.locator('[data-fc-base]:visible').count()){await page.locator('[data-fc-base]').click();continue;}
    if(await page.locator('[data-gpr-customisation=standard]:visible').count()){await page.locator('[data-gpr-customisation=standard]').click();continue;}
    const state=await page.evaluate(()=>window.HEC_GUIDED_PRODUCT_TEST.ui());if(['serving-measure','consumption-amount'].includes(state.stage)){if(exactName)assert.equal(state.product,exactName);return {steps,state};}
    const answers=page.locator('[data-fc-answer]:visible,[data-gpr-answer]:visible');
    if(await answers.count()){
      const options=await answers.evaluateAll(nodes=>nodes.map(node=>({key:node.dataset.fcAnswer||node.dataset.gprAnswer,value:node.dataset.fcValue||node.dataset.gprValue,label:node.innerText}))),key=options[0].key,desired=defaults[key],index=options.findIndex(option=>option.value===desired||option.label.trim()===desired),chosen=index>=0?index:0;
      assert(options[chosen].value!=='__unsure__','The deterministic acceptance path must select a concrete answer');assert(!steps.some(step=>step.key===key),'A supplied facet was asked again');steps.push({key,choice:options[chosen]});await answers.nth(chosen).click();await page.waitForFunction(({key,value})=>(window.HEC_FOOD_CONCEPT_TEST?.state?.()?window.HEC_FOOD_CONCEPT_TEST.state().known[key]===value:!document.querySelector(`[data-gpr-answer="${key}"]`)),{key,value:options[chosen].value});continue;
    }
    let rows=page.locator('[data-universal-result]:visible').filter({hasText:'Loggable now'});if(exactName){const exact=rows.filter({has:page.locator('strong',{hasText:new RegExp(`^${exactName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)})});assert(await exact.count(),`Requested exact identity is missing: ${exactName}`);rows=exact;}
    assert(await rows.count(),`No loggable identity after ${JSON.stringify(steps)}: ${await page.locator('#food-results').innerText()}`);
    const selected=rows.first();steps.push({product:await selected.innerText(),id:await selected.getAttribute('data-universal-result')});await selected.click();
  }throw Error('Identity resolution exceeded 18 deliberate choices');
}
async function flowToReview(page,query,{preferences={},measure,amount=1,exactName=''}={}){
  await submit(page,query);const identity=await chooseIdentity(page,{preferences,exactName}),choices=page.locator('[data-gpr-measure]:visible'),measures=await choices.evaluateAll(nodes=>nodes.map(node=>({key:node.dataset.gprMeasure,label:node.innerText})));
  if(query==='Apple'){assert(!/dried|stewed|canned|juice/i.test(identity.state.product));assert(measures.some(option=>option.key==='item'));}
  if(query==='Eggs'){assert(!measures.some(option=>/poultry|lean meat/i.test(option.label)));assert(measures.some(option=>/Egg$/.test(option.key)));}
  if(query==='Yoghurt')assert(!measures.some(option=>/nuts\/seeds|poultry/i.test(option.label)));
  if(query==="Helga's wholemeal")assert(!/wrap|flatbread|roll/i.test(identity.state.product));
  if(query==='Sausages')assert(measures.some(option=>option.key==='sausage'));
  if(['Chips','Fries'].includes(query))assert(!measures.some(option=>/starchy vegetable/i.test(option.label)));
  if(measures.length){const preferred=measure||(/^.*milk$/i.test(query)?'mL':/bread/i.test(query)?'regularSlice':/flora/i.test(query)?'g':measures[0].key),chosen=measures.find(option=>option.key===preferred)||measures[0];if(measure)assert.equal(chosen.key,measure);await page.locator(`[data-gpr-measure="${chosen.key}"]:visible`).click();}
  const input=page.locator('[data-gpr-amount]:visible');await input.waitFor();await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-gpr-amount'));assert.equal(await input.inputValue(),'');
  if(!/milk/i.test(query))assert(!measures.some(option=>['mL','L','cup'].includes(option.key)),`${query}: solid exposes liquid measures`);
  await input.fill(String(amount));const preview=await page.locator('#food-results').innerText();await input.press('Enter');await page.locator('#food-entry-editor.active').waitFor();
  assert.equal(await page.locator('[data-gpr-amount]:visible').count(),0,'Only the final Review remains active');
  const review={amount:await page.locator('#entry-amount').inputValue(),unit:await page.locator('#entry-unit').inputValue(),summary:await page.locator('#entry-selection-summary').innerText()};assert.equal(Number(review.amount),amount);
  let diary=null;
  if(['Bread','Milk','Big Mac','Hash Brown','Flora ProActiv Light'].includes(query)){
    const before=await page.evaluate(()=>{assertTest();function assertTest(){if(window.HEC_INSTALLATION.role!=='test')throw Error('Disposable TEST storage required');}return Object.values(JSON.parse(localStorage.getItem(window.HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length;});
    await page.locator('#entry-meal').selectOption('Lunch');await page.locator('#save-food-entry').click();await page.waitForFunction(before=>Object.values(JSON.parse(localStorage.getItem(window.HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length===before+1,before);
    diary=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem(window.HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().at(-1));assert.equal(diary.consumedPortion.amount,amount);assert.equal(diary.consumedPortion.measureId,review.unit);assert.deepEqual(diary.foodSnapshot.consumedPortion,diary.consumedPortion);
  }
  if(query==='Flora ProActiv Light'){assert.match(preview,/19 Cal/);assert.match(preview,/77 kJ/);assert.equal(review.unit,'g');assert(!measures.some(m=>/thinSpread|thickSpread/.test(m.key)));}
  return {query,identity,measures,preview,review,diary};
}
async function sourceBreadth(page){
  await submit(page,'Hash Brown');await settled(page);await page.locator('[data-fc-base]').click();const branches={};
  for(const source of ['ready-to-eat','packaged-frozen']){await page.locator('[data-fc-answer="sourceContext"][data-fc-value="'+source+'"]').click();const candidates=await page.evaluate(()=>HEC_FOOD_CONCEPT_TEST.candidates()),ids=await page.locator('[data-universal-result]').evaluateAll(ns=>ns.map(n=>n.dataset.universalResult));assert.deepEqual([...ids].sort(),candidates.map(f=>f.id).sort());assert(!candidates.some(f=>/quiche|burger|wrap/i.test(f.name)));
    if(source==='ready-to-eat'){const expected=await page.evaluate(()=>HECFoodSources.foodRecords().filter(f=>HECSearchFoundation.conceptCompatibility(f,'hash-brown').compatible).map(f=>f.id).sort());assert.deepEqual([...ids].sort(),expected);}
    else{const raw=require('./audit_open_food_facts_au.js').allProducts(),search=require('../search-foundation.js'),expected=[...raw,...require('../australian-catalogue-data').packagedProducts].filter(f=>search.conceptCompatibility(f,'hash-brown').compatible).map(f=>f.id).sort();assert.deepEqual([...ids].sort(),expected);assert(candidates.some(f=>/McCain/i.test(f.brand)));}
    branches[source]={candidates,groups:await page.locator('.food-concept-product-group h3').allInnerTexts()};await page.locator('[data-fc-back]').click();}
  return branches;
}
async function previewCustomisation(page){
  await page.evaluate(()=>window.openAlpha05Feature('food-library',{freshSearch:true}));await page.locator('#food-search').fill('Big Mac');const control=page.locator('[data-food-review][aria-label="Review and edit Big Mac entry"]:visible').first();await control.waitFor();await control.click();await page.locator('[data-gpr-customisation=extras]').waitFor();await page.locator('[data-gpr-customisation=extras]').click();assert.equal(await page.locator('[data-gpr-amount]').count(),0);await page.locator('[data-gpr-customisation=standard]').click();const amount=page.locator('[data-gpr-amount]:visible');await amount.fill('1');await amount.press('Enter');await page.locator('#food-entry-editor.active').waitFor();assert.equal(await page.locator('#entry-unit').inputValue(),'burger');return {previewEntry:true,unsupportedExtras:true,standardReview:true};
}
async function deltaChecks(page){
  const result={preview:await previewCustomisation(page)};await submit(page,'Bread');await settled(page);assert.equal(await page.locator('[data-fc-answer]').count(),0);await page.locator('[data-fc-base]').click();result.breadOrigin=await page.locator('[data-fc-answer]').allInnerTexts();assert.deepEqual(await page.locator('[data-fc-answer]').evaluateAll(ns=>ns.map(n=>n.dataset.fcValue)),['home','commercial']);
  await page.locator('[data-fc-value=home]').click();assert.equal(await page.locator('[data-fc-answer=breadType]').count()>0,true);await page.locator('[data-fc-back]').click();await page.locator('[data-fc-value=commercial]').click();result.breadCommercial=await page.locator('[data-fc-answer]').allInnerTexts();assert.equal(result.breadCommercial.length,4);
  for(const source of ['bakery','restaurant','brand','supermarket']){await page.locator('[data-fc-value='+source+']').click();result[source]=await capture(page);assert(result[source].question||await page.locator('[data-universal-result]').count()||/No reliable loaded/.test(result[source].text));await page.locator('[data-fc-back]').click();}
  for(const query of ['Milk','Hash Brown']){await submit(page,query);await settled(page);assert.equal(await page.locator('[data-fc-answer]').count(),0);await page.locator('[data-fc-base]').click();assert.equal((await capture(page)).concept.nextFacet,query==='Milk'?'milkSource':'sourceContext');}
  for(const query of ['KFC hash brown','Flora unicorn product']){await submit(page,query);await page.locator('.universal-search-empty').filter({hasText:'isn’t currently in HEC’s verified catalogue'}).waitFor();const text=await page.locator('#food-results').innerText();assert.match(text,/isn’t currently in HEC’s verified catalogue/);assert(!/McDonald/.test(text));result[query]=text;}
  result.explicitQuantities=[];for(const query of ['two Big Macs',"two McDonald's Big Macs"]){await submit(page,query);const exact=page.locator('[data-universal-result]').first();try{await exact.waitFor();}catch(error){error.message+='; query='+query+'; rendered='+await page.locator('#food-results').innerText();throw error;}assert.equal(await exact.locator('strong').innerText(),'Big Mac');result.explicitQuantities.push({query,first:await exact.innerText()});}
  await submit(page,'Big Mac');const row=page.locator('[data-universal-result]').first();await row.waitFor();await row.click();await page.locator('[data-gpr-customisation=extras]').waitFor();await page.locator('[data-gpr-customisation=extras]').click();result.customisation=await capture(page);assert.match(result.customisation.text,/not yet available/);assert.equal(await page.locator('[data-gpr-amount]').count(),0);await page.locator('[data-gpr-customisation=standard]').click();await page.locator('[data-gpr-amount]').waitFor();
  await submit(page,'KFC Wicked Wings');for(const count of [3,6,10]){const row=page.locator('[data-universal-result]').filter({has:page.locator('strong',{hasText:new RegExp('^'+count+' Wicked Wings$')})});assert.equal(await row.count(),1);}return result;
}
async function run({baseline=false,flows=false,targeted=false,outputDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'hec-concept-edge-')),viewports=[{width:390,height:844}]}={}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),report={pass:false,baseline,browser:'Microsoft Edge',version:browser.version(),contexts:[],failures:[],outputDirectory};
  try{for(const viewport of viewports){const diagnostic=qa.evidence(),context=await qa.contextFor(browser,viewport,diagnostic),row={viewport,diagnostic,scenarios:[]};report.contexts.push(row);const page=await context.newPage();await qa.openLibrary(page);
    for(const item of cases.filter(item=>!targeted||['Bread','Whole meal bread','Milk','Hash Brown','Big Mac','Flora ProActiv Light','KFC Wicked Wings'].includes(item.query))){console.log('First screen '+viewport.width+' '+item.query);await submit(page,item.query);await settled(page);const screen=await capture(page),failures=[];
      if(item.concept){const rows=await page.locator('#food-results [data-fc-base],#food-results [data-universal-result]').evaluateAll(ns=>ns.map(n=>({name:n.querySelector('strong').innerText,group:n.closest('[data-universal-group]').dataset.universalGroup,detail:n.querySelector('small').innerText,id:n.dataset.universalResult||'',base:n.hasAttribute('data-fc-base')})));screen.shortlist=rows;if(!rows[0]?.base||rows.length<2||rows.length>20||screen.question)failures.push('Generic submission must show base plus a concise shortlist without a question');}
      if(item.question&&!item.question.test(screen.question))failures.push(`First question: expected ${item.question}; received ${JSON.stringify(screen.question)}`);
      if(item.concept&&screen.concept?.conceptId!==item.concept)failures.push(`Concept: expected ${item.concept}; received ${screen.concept?.conceptId||'no central concept state'}`);
      if(item.excluded&&item.excluded.test(screen.text))failures.push(`Incompatible primary concept or question: ${item.excluded}`);
      if(item.exact){const best=screen.groups.find(g=>g.key==='best')?.names[0]||screen.guide.product;if(best!==item.exact)failures.push(`Exact identity: expected ${item.exact}; received ${best}`);}
      if(item.family){const names=screen.groups.find(g=>g.key==='restaurant-family')?.names||[];if(JSON.stringify(names)!==JSON.stringify(item.family))failures.push('Restaurant count peers are not neutral direct choices');}
      for(const [key,value] of Object.entries(item.supplied||{}))if(screen.concept?.known?.[key]!==value)failures.push(`Supplied facet lost: ${key}=${value}`);
      if(screen.overflow)failures.push('Horizontal overflow');row.scenarios.push({query:item.query,...screen,failures});report.failures.push(...failures.map(reason=>({viewport,query:item.query,reason})));
      if(['Bread','Milk','Big Mac','Hash Brown'].includes(item.query))await page.screenshot({path:path.join(outputDirectory,`${viewport.width}-${item.query.replaceAll(' ','-')}.png`),fullPage:true});
      if(!baseline)await settled(page);if(item.guidedQuestion){await page.locator('[data-fc-base]').click();assert.match((await capture(page)).question,item.guidedQuestion);}
    }
    if(!baseline){row.sourceBreadth=await sourceBreadth(page);row.delta=await deltaChecks(page);}
    if(flows){row.flows=[];for(const query of ['Bread','Whole meal bread','White bread','Milk','Cow milk','Oat milk','Cheese','Yoghurt','Cereal','Sausages','Hash Brown','Chips','Fries','Chicken','Apple','Crackers','Margarine','Burger','Rice','Eggs','Big Mac','Cheeseburger','Flora ProActiv Light','McCain hash browns',"Helga's wholemeal"]){
      if(targeted&&!['Bread','Whole meal bread','Milk','Hash Brown','Big Mac','Flora ProActiv Light','McCain hash browns'].includes(query))continue;console.log('Complete flow '+viewport.width+' '+query);
      try{row.flows.push(await flowToReview(page,query,{amount:/milk$/i.test(query)?250:/Flora/.test(query)?5:2,exactName:query==='Big Mac'?'Big Mac':''}));}
      catch(error){report.failures.push({viewport,query,phase:'measure-amount-review',reason:error.message});await page.screenshot({path:path.join(outputDirectory,`${viewport.width}-${query.replaceAll(' ','-')}-flow-failure.png`),fullPage:true});break;}
    }}
    qa.requireEvidence(diagnostic);await context.close();
  }report.pass=report.failures.length===0;return report;}finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'food-concepts.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({baseline:process.argv.includes('--baseline'),flows:process.argv.includes('--flows')}).then(report=>{console.log(JSON.stringify({pass:report.pass,outputDirectory:report.outputDirectory,failures:report.failures},null,2));if(!report.pass)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run,previewCustomisation,cases,submit,capture,settled,chooseIdentity,flowToReview,sourceBreadth};
