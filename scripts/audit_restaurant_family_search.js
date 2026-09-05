'use strict';

const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge.js');
const accessibility=require('./audit_search_accessibility.js');
const cases=[
  {query:'KFC Wicked Wings',family:['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings'],label:'Wicked Wings'},
  {query:'Wicked Wings',family:['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings'],label:'Wicked Wings'},
  ...[3,6,10].flatMap(count=>[{query:`KFC ${count} Wicked Wings`,exact:`${count} Wicked Wings`},{query:`${count} Wicked Wings`,exact:`${count} Wicked Wings`}]),
  {query:'KFC Popcorn Chicken',family:['Snack Popcorn Chicken','Regular Popcorn Chicken','Maxi Popcorn Chicken'],label:'Popcorn Chicken'},
  ...['Snack','Regular','Maxi'].map(size=>({query:`KFC ${size} Popcorn Chicken`,exact:`${size} Popcorn Chicken`})),
  {query:'KFC Nuggets',family:['3 Nuggets','6 Nuggets','10 Nuggets'],label:'Nuggets'},
  {query:'KFC Chicken Pieces',family:['1 Piece of Chicken','3 Pieces of Chicken','6 Pieces of Chicken','21 Pieces of Chicken'],label:'Chicken Pieces'},
  {query:"McDonald's Fries",family:['Small Fries','Medium Fries','Large Fries'],label:'Fries'},
  ...['Small','Medium','Large'].map(size=>({query:`McDonald's ${size} Fries`,exact:`${size} Fries`}))
];
async function submit(page,query,button=true){
  await page.evaluate(()=>window.openAlpha05Feature('food-library',{freshSearch:true}));
  const input=page.locator('#food-search');await input.fill(query);
  assert.notEqual((await page.evaluate(()=>window.HEC_SEARCH_SESSION_TEST.state())).mode,'explicit-committed','Typing must remain preview');
  if(button)await page.locator('#submit-food-search').click();else await input.press('Enter');
  await page.locator('.universal-search-submitted').waitFor({state:'visible'});
  assert.equal((await page.evaluate(()=>window.HEC_SEARCH_SESSION_TEST.state())).mode,'explicit-committed');
}
async function rendered(page){return page.evaluate(()=>({
  groups:[...document.querySelectorAll('[data-universal-group]')].map(group=>({key:group.dataset.universalGroup,label:group.querySelector('h3').innerText,items:[...group.querySelectorAll('[data-universal-result]')].map(node=>({id:node.dataset.universalResult,name:node.querySelector('strong').innerText,action:node.querySelector('b').innerText}))})),
  overflow:document.documentElement.scrollWidth>innerWidth+1,text:document.querySelector('#food-results').innerText
}));}
async function downstream(page,count,key,amount){
  await submit(page,`KFC ${count} Wicked Wings`);const row=page.locator('[data-universal-group="best"] [data-universal-result]'),id=await row.getAttribute('data-universal-result');await row.click();
  const choices=page.locator('[data-gpr-measure]:visible');await choices.first().waitFor();
  const measures=await choices.evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.gprMeasure,text:n.innerText})));
  assert.deepEqual(measures.map(m=>m.key),['piece','portion']);
  await page.locator(`[data-gpr-measure="${key}"]:visible`).click();
  const input=page.locator('[data-gpr-amount]:visible');await input.waitFor();await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-gpr-amount'));
  assert.equal(await input.inputValue(),'');const prompt=await page.locator('#food-results').innerText();
  assert.match(prompt,key==='piece'?/individual wings/i:new RegExp(`${count}-wing orders`,'i'));
  await input.fill(String(amount));await input.press('Enter');await page.locator('#food-entry-editor.active').waitFor({state:'visible'});
  assert.equal(await page.locator('#entry-unit').inputValue(),key);assert.equal(Number(await page.locator('#entry-amount').inputValue()),amount);
  assert.equal(await page.locator('[data-gpr-amount]:visible').count(),0,'Only the final Review is active');
  await page.locator('#entry-meal').selectOption('Lunch');await page.locator('#save-food-entry').click();
  await page.waitForFunction(id=>{if(window.HEC_INSTALLATION.role!=='test')throw Error('Disposable TEST context required');const data=JSON.parse(localStorage.getItem(window.HEC_INSTALLATION.functionalStorageKey)||'{}');return Object.values(data.diary||{}).flat().some(row=>row.foodId===id);},id);
  const diary=await page.evaluate(id=>Object.values(JSON.parse(localStorage.getItem(window.HEC_INSTALLATION.functionalStorageKey)).diary).flat().find(row=>row.foodId===id),id);
  assert.equal(diary.consumedPortion.measureId,key);assert.equal(diary.consumedPortion.amount,amount);assert.equal(diary.consumedPortion.baseQuantity,key==='portion'?count*amount:amount);assert.equal(diary.consumedPortion.baseUnit,'piece');assert.deepEqual(diary.foodSnapshot.consumedPortion,diary.consumedPortion);
  return {label:`${count} wings ${key} amount and persisted final Review`,measures,prompt,diary};
}
async function run({outputDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'hec-family-edge-')),viewports=[{width:390,height:844}]}={}){
  fs.mkdirSync(outputDirectory,{recursive:true});const {chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),report={pass:false,browser:'Microsoft Edge',version:browser.version(),contexts:[]};let page;
  try{for(const viewport of viewports){const diagnostic=qa.evidence(),context=await qa.contextFor(browser,viewport,diagnostic),result={viewport,diagnostic,scenarios:[]};report.contexts.push(result);page=await context.newPage();await qa.openLibrary(page);
    for(const [index,item] of cases.entries()){
      await submit(page,item.query,index%2===0);const state=await rendered(page);assert(!state.overflow);
      if(item.family){const group=state.groups.find(g=>g.key==='restaurant-family');assert(group,`${item.query}: neutral family group missing; ${state.text}`);assert.deepEqual(group.items.map(i=>i.name),item.family);assert.equal(group.label.toLowerCase(),`Which ${item.label} order did you have?`.toLowerCase());assert(!state.groups.some(g=>g.key==='best'&&g.items.some(i=>item.family.includes(i.name))));assert.equal(state.groups[0],group);assert(group.items.every(i=>i.action==='Choose'));if(['Wicked Wings','Popcorn Chicken'].includes(item.label))assert(state.groups.some(g=>g.key==='details'&&g.items.some(i=>/Combo/.test(i.name))),'Combos remain visible after direct choices');}
      else{assert.equal(state.groups[0].key,'best',item.query);assert.deepEqual(state.groups[0].items.map(i=>i.name),[item.exact]);}
      result.scenarios.push({query:item.query,...state,search:await accessibility.audit(page,item.query)});
      if(index===0||item.label==='Popcorn Chicken')await page.screenshot({path:path.join(outputDirectory,`${viewport.width}x${viewport.height}-${item.label.replaceAll(' ','-')}.png`),fullPage:true});
    }
    result.scenarios.push(await downstream(page,6,'portion',1.5),await downstream(page,10,'piece',2));
    qa.requireEvidence(diagnostic);await context.close();
  }report.pass=true;return report;}catch(e){report.error={message:e.message,stack:e.stack};if(page)await page.screenshot({path:path.join(outputDirectory,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();fs.writeFileSync(path.join(outputDirectory,'restaurant-family.json'),JSON.stringify(report,null,2));}
}
if(require.main===module)run({outputDirectory:process.argv[2],viewports:[{width:320,height:568},{width:390,height:844},{width:430,height:932}]}).then(r=>console.log(JSON.stringify({pass:r.pass,scenarios:r.contexts.reduce((n,c)=>n+c.scenarios.length,0)}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run,cases};
