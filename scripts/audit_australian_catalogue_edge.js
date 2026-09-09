'use strict';
// Genuine Edge, disposable local TEST-origin routing; no live application data.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const qa=require('./audit_physical_form_measures_edge'),concept=require('./audit_food_concept_resolution_edge');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
async function fresh(page){await page.evaluate(()=>window.openAlpha05Feature('food-library',{freshSearch:true}));}
async function ready(page){await page.waitForFunction(()=>!HEC_AU_CATALOGUE_TEST.brandState()?.loading&&!HEC_FOOD_CONCEPT_TEST.state()?.loading&&!/Checking the Australian catalogue/.test(document.querySelector('#food-results').innerText));}
async function surface(page,label){return page.evaluate(label=>{const visible=node=>!!node&&node.getBoundingClientRect().height>0&&node.getBoundingClientRect().width>0&&getComputedStyle(node).visibility!=='hidden',surfaces=['food-live-results','food-results'].map(id=>document.getElementById(id)).filter(visible),controls=surfaces.flatMap(node=>[...node.querySelectorAll('button')]).filter(visible);return {label,text:surfaces.map(node=>node.innerText).join('\n'),surfaces:surfaces.length,overflow:document.documentElement.scrollWidth>innerWidth+1||surfaces.some(node=>node.scrollWidth>node.clientWidth+1),outside:controls.filter(node=>{const r=node.getBoundingClientRect();return r.left<-.6||r.right>innerWidth+.6;}).map(node=>node.innerText),short:controls.filter(node=>node.getBoundingClientRect().height<43.5).map(node=>node.innerText)};},label);}
function checkSurface(row){assert.equal(row.surfaces,1,row.label);assert(!row.overflow,row.label);assert.deepEqual(row.outside,[],row.label);assert.deepEqual(row.short,[],row.label);return row;}
async function previewSearch(page,query){
  await fresh(page);await page.locator('#food-search').fill(query);await page.waitForTimeout(900);
  const preview=checkSurface(await surface(page,query+' preview'));
  const ids=await page.locator('#food-live-results [data-food-review],#food-live-results [data-food-add],#food-live-results [data-universal-result]').evaluateAll(nodes=>[...new Set(nodes.map(node=>node.dataset.foodReview||node.dataset.foodAdd||node.dataset.universalResult))]);
  const before=await page.evaluate(ids=>ids.map(id=>({id,...HEC_AU_CATALOGUE_TEST.eligibility(id)})),ids);
  await page.locator('#submit-food-search').click();await ready(page);await page.waitForTimeout(100);
  const submitted=checkSurface(await surface(page,query+' Search'));
  const rows=await page.locator('#food-results [data-universal-result]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.universalResult,text:node.innerText})));
  // Every actionable preview identity must be reachable with compatible status.
  for(const entry of before.filter(entry=>entry.addability.normalLoggingAllowed)){
    const found=rows.find(row=>row.id===entry.id);assert(found,query+' orphan preview '+entry.id);assert.match(found.text,/Loggable now/,query+' status mismatch '+entry.id);
  }
  const candidate=rows.find(row=>/Loggable now/.test(row.text));let selection=null;
  if(candidate){const expected=await page.evaluate(id=>HEC_AU_CATALOGUE_TEST.eligibility(id),candidate.id);await page.locator(`[data-universal-result="${candidate.id}"]`).click();selection=await page.evaluate(()=>{const food=HEC_GUIDED_PRODUCT_TEST.food();return {id:food?.id,canonicalId:HECGuidedProductResolution.canonicalProductKey(food),eligibility:HECFoodCatalogue.productEligibility(food)};});assert.equal(selection.id,candidate.id);assert.equal(selection.canonicalId,expected.canonicalId);assert.equal(selection.eligibility.addability.status,expected.addability.status);}
  return {query,preview,submitted,previewIdentities:before.map(entry=>({id:entry.id,canonicalId:entry.canonicalId,status:entry.addability.status,verified:entry.verified})),rows,selection};
}
function automaticReachabilitySamples(){
  const C=require('../food-catalogue'),off=require('./audit_open_food_facts_au'),data=require('../australian-catalogue-data');C.registerBrandDirectory(data.brands);
  const buckets={collision:[],punctuation:[]};
  for(const raw of off.allProducts()){
    if(!raw.name||!raw.brand||/abbott/i.test(raw.brand)||raw.name.split(/\s+/).length<3)continue;
    const prefix=C.brandPrefix(raw.name),possibleCollision=prefix&&C.brandKey(prefix.entity.name)!==C.brandKey(raw.brand),punctuation=/['’]/.test(raw.brand);
    if(!possibleCollision&&!punctuation)continue;const food=off.api.toFood(raw);if(!C.productEligibility(food).addability.normalLoggingAllowed)continue;
    const entry={id:food.id,name:food.name,brand:food.brand,canonicalId:C.canonicalKey(food)};
    if(possibleCollision&&C.queryIntent(raw.name).reason==='indexed-brand-plus-product')buckets.collision.push({...entry,query:food.name});
    if(punctuation)buckets.punctuation.push({...entry,query:food.brand+' '+food.name});
  }
  return Object.entries(buckets).flatMap(([kind,foods])=>{const seen=new Set();return foods.sort((a,b)=>hash(a.id).localeCompare(hash(b.id))).filter(food=>{const brand=C.brandKey(food.brand);if(seen.has(brand))return false;seen.add(brand);return true;}).slice(0,3).map(food=>({...food,kind}));});
}
async function collisionReachability(page,sample){
  await fresh(page);await page.locator('#food-search').fill(sample.query);await page.waitForFunction(id=>HECOpenFoodFactsAU.getLoaded(id),sample.id,{timeout:30000});
  await page.locator('#submit-food-search').click();await ready(page);const target=page.locator(`[data-universal-result="${sample.id}"]`);await target.waitFor({state:'visible',timeout:30000});
  const submitted=checkSurface(await surface(page,sample.query));await target.click();const selected=await page.evaluate(()=>{const food=HEC_GUIDED_PRODUCT_TEST.food();return {id:food?.id,canonicalId:HECGuidedProductResolution.canonicalProductKey(food)};});
  assert.equal(selected.id,sample.id);assert.equal(selected.canonicalId,sample.canonicalId);return {...sample,submitted,selected};
}
async function brand(page,query){
  // Deliberately retain a prior concept in the same search input.
  await concept.submit(page,'Hash Brown');await concept.settled(page);await page.locator('[data-fc-base]').click();await page.locator('[data-fc-value="packaged-frozen"]').click();
  await page.locator('#food-search').fill(query);await page.waitForTimeout(900);await ready(page);
  const preview=checkSurface(await surface(page,query+' brand preview'));
  await page.locator('#submit-food-search').click();await ready(page);
  const model=await page.evaluate(()=>HEC_AU_CATALOGUE_TEST.brandState().model),state=await page.evaluate(()=>HEC_SEARCH_SESSION_TEST.state());
  assert.equal(model.intent.kind,'brand-family');assert.equal(model.intent.productQuery,'');assert.equal(state.universalSource,'');assert.equal(state.guidedCommitted,false);assert(model.loaded>1,query+' breadth');assert(model.groups[0].items.length<=20);
  const membership=await page.evaluate(()=>{const model=HEC_AU_CATALOGUE_TEST.brandState().model;return model.groups.flatMap(group=>group.items).every(item=>HECFoodCatalogue.consumerBrandMembership(model.intent.entity,item.food).matches);});assert(membership,query+' contamination');
  if(query==='McCain'){assert(model.loaded>20);assert(model.groups[0].items.some(item=>!/hash brown/i.test(item.name)));}
  if(query==='Meadow Lea'){assert(model.groups[0].items[0].provenance.verified);assert(!/beurre/i.test(model.groups[0].items[0].name));}
  const submitted=checkSurface(await surface(page,query+' brand Search'));
  let secondPage=null;if(model.hasMore){await page.locator('[data-au-brand-more]').click();await ready(page);secondPage=await page.evaluate(()=>HEC_AU_CATALOGUE_TEST.brandState().model.groups[0].items.map(item=>item.id));assert(secondPage.length);assert(!secondPage.some(id=>model.groups[0].items.some(item=>item.id===id)));await page.locator('[data-au-brand-start]').click();}
  return {query,preview,submitted,total:model.total,first:model.groups[0].items.map(item=>({id:item.id,name:item.name,status:item.addability.status,provenance:item.provenance})),secondPage};
}
async function loggedFlow(page,{query,measure,amount,calories,kj,id}){
  await concept.submit(page,query);await ready(page);await concept.chooseIdentity(page);
  const profile=await page.evaluate(()=>HEC_GUIDED_PRODUCT_TEST.profile());
  if(await page.locator('[data-gpr-measure]:visible').count())await page.locator(`[data-gpr-measure="${measure}"]:visible`).click();
  const input=page.locator('[data-gpr-amount]:visible');await input.fill(String(amount));const preview=await page.locator('[data-gpr-amount-preview]').innerText();
  assert.match(preview.replace(/,/g,''),new RegExp('\\b'+calories+' Cal'));assert.match(preview.replace(/,/g,''),new RegExp('\\b'+kj+' kJ'));
  await input.press('Enter');await page.locator('#food-entry-editor.active').waitFor();assert.equal(await page.locator('[data-gpr-amount]:visible').count(),0);
  const before=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length);
  await page.locator('#entry-meal').selectOption('Lunch');await page.locator('#save-food-entry').click();await page.waitForFunction(before=>Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().length===before+1,before);
  const entry=await page.evaluate(()=>{if(HEC_INSTALLATION.role!=='test')throw Error('Only disposable local TEST storage');return Object.values(JSON.parse(localStorage.getItem(HEC_INSTALLATION.functionalStorageKey)||'{}').diary||{}).flat().at(-1);});
  assert.equal(entry.foodId,id);assert.equal(Math.round(entry.nutrients.calories),calories);assert.equal(Math.round(entry.nutrients.energyKj||entry.nutrients.calories*4.184),kj);
  return {query,measure,amount,preview,profileMeasures:profile.measures.map(item=>({key:item.key,conversion:item.conversionToBase})),diary:{id:entry.foodId,nutrients:entry.nutrients,consumedPortion:entry.consumedPortion}};
}
async function run({quick=false,viewports=null,outputDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'hec-au-foundation-edge-'))}={}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),report={pass:false,browser:browser.version(),outputDirectory,viewports:[]};
  const data=require('../australian-catalogue-data'),sampled=data.brands.filter(brand=>brand.count>=3&&brand.count<=15&&/^[A-Za-z ]+$/.test(brand.name)).sort((a,b)=>hash(a.name).localeCompare(hash(b.name))).slice(0,3).map(brand=>brand.name);
  const automaticReachability=automaticReachabilitySamples();assert.equal(automaticReachability.length,6);report.automaticReachability=automaticReachability;
  try{for(const viewport of viewports||(quick?[{width:390,height:844}]:[{width:320,height:568},{width:390,height:844},{width:430,height:932}])){
    const diagnostic=qa.evidence(),context=await qa.contextFor(browser,viewport,diagnostic),page=await context.newPage();page.setDefaultTimeout(15000);const row={viewport,diagnostic,brands:[],consistency:[],flows:[]};report.viewports.push(row);await qa.openLibrary(page);
    for(const query of ['McCain','Meadow Lea','Flora','Tip Top','Norco',...sampled]){row.brands.push(await brand(page,query));console.log(viewport.width+' brand '+query);}
    for(const query of ['McCain hash brown','Flora ProActiv Light',"Hungry jacks hash brown",'Big Mac','Sanitarium Weet-Bix Original']){row.consistency.push(await previewSearch(page,query));console.log(viewport.width+' identity '+query);}
    const automatic=data.packagedProducts.filter(food=>food.loggable&&food.sourceCatalogueId).sort((a,b)=>hash(a.id).localeCompare(hash(b.id))).slice(0,5);
    for(const food of automatic)row.consistency.push(await previewSearch(page,food.brand+' '+food.name));
    row.collisionReachability=[];for(const sample of automaticReachability)row.collisionReachability.push(await collisionReachability(page,sample));
    await concept.submit(page,'Hash Brown');await concept.settled(page);await page.locator('[data-fc-base]').click();await page.locator('[data-fc-value="ready-to-eat"]').click();row.restaurant=await page.locator('[data-universal-result]').evaluateAll(nodes=>nodes.map(node=>node.dataset.universalResult));assert(row.restaurant.includes('food-source:hungry-jacks-au:hash-brown'));
    for(const query of ['Bread','Milk']){await concept.submit(page,query);await concept.settled(page);assert.equal(await page.locator('[data-fc-base]').count(),1);assert.equal(await page.locator('[data-fc-answer]').count(),0);checkSurface(await surface(page,query));await page.locator('[data-fc-base]').click();assert.equal((await page.evaluate(()=>HEC_FOOD_CONCEPT_TEST.state())).nextFacet,query==='Bread'?'breadOrigin':'milkSource');}
    for(const query of ['McCain','Meadow Lea','Flora','McCain hash brown','McCain','Hash Brown']){await page.locator('#food-search').fill(query);await page.waitForTimeout(60);}await page.locator('#submit-food-search').click();await concept.settled(page);assert.equal((await page.evaluate(()=>HEC_FOOD_CONCEPT_TEST.state())).conceptId,'hash-brown');
    row.customisation=await concept.previewCustomisation(page);
    row.flows.push(await loggedFlow(page,{query:'Flora ProActiv Light',measure:'tsp',amount:2,calories:37,kj:154,id:'flora-proactiv-light-au-official'}));
    row.flows.push(await loggedFlow(page,{query:'McCain hash brown',measure:'serve',amount:1,calories:122,kj:510,id:'off:9310174025084'}));
    row.flows.push(await loggedFlow(page,{query:'Big Mac',measure:'burger',amount:2,calories:1242,kj:5200,id:'food-source:mcdonalds-au:big-mac'}));
    await concept.submit(page,'KFC Wicked Wings');await ready(page);for(const count of [3,6,10])assert.equal(await page.locator('[data-universal-result]').filter({has:page.locator('strong',{hasText:new RegExp('^'+count+' Wicked Wings$')})}).count(),1);
    await page.screenshot({path:path.join(outputDirectory,viewport.width+'-result.png'),fullPage:true});qa.requireEvidence(diagnostic);await context.close();fs.writeFileSync(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2));
  }report.pass=true;return report;}catch(error){report.error={message:error.message,stack:error.stack};throw error;}finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'report.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({quick:process.argv.includes('--quick'),...(process.argv.includes('--seven')?{viewports:[{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:834,height:1194},{width:390,height:520},{width:1194,height:834}]}:{}),...(process.argv[2]&&!process.argv[2].startsWith('--')?{outputDirectory:process.argv[2]}:{})}).then(report=>console.log(JSON.stringify({pass:report.pass,viewports:report.viewports.length,outputDirectory:report.outputDirectory}))).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run,previewSearch,brand,automaticReachabilitySamples};
