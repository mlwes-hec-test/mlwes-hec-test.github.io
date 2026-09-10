'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const C=require('../food-catalogue'),data=require('../australian-catalogue-data'),qa=require('../scripts/audit_physical_form_measures_edge');
const {instrument,settled}=require('../scripts/profile_search_typing');
C.registerBrandDirectory(data.brands);

// The old search partition rule is the semantic oracle. Compare data, including
// authority order, not object references or a looser duplicate-name rule.
function originalPartition(records){
  const list=C.dedupe(records),authoritative=f=>C.recordType(f)==='packaged'&&C.marketFor(f)==='AU'&&(f.verified||f.verificationStatus==='verified'),authorities=list.filter(authoritative),legacy=[],keys=new Set();
  const names=f=>[f.name,`${f.brand||''} ${f.name||''}`,...(f.aliases||[])].map(C.norm).filter(Boolean);
  for(const food of list){if(authoritative(food))continue;const authority=authorities.find(a=>C.canonicalKey(a)!==C.canonicalKey(food)&&!(C.norm(a.brand)&&C.norm(food.brand)&&C.norm(a.brand)!==C.norm(food.brand))&&names(food).some(n=>names(a).includes(n))&&C.strongDuplicateEvidence(a,food).duplicate);if(authority){legacy.push({food,authority,reason:'A verified Australian product record supersedes this cached or legacy match.'});keys.add(C.canonicalKey(food));}}
  return {primary:list.filter(f=>!keys.has(C.canonicalKey(f))),legacy};
}
test('indexed partition preserves the old authority, alias, brand and strong identity rules',()=>{
  const base={name:'Original Snack',brand:'Example',recordType:'packaged',market:'AU',pack:{amount:80,unit:'g'},nutritionPer100:{energyKj:900,fat:10,protein:5},nutrients:{calories:172},aliases:['Snack Original']};
  const rows=[...data.packagedProducts,{...base,id:'verified-1',verified:true},{...base,id:'verified-2',verified:true,serving:'40 g'},{...base,id:'candidate',recordType:'online-candidate'}, {...base,id:'other-brand',brand:'Elsewhere'}, {...base,id:'other-pack',pack:{amount:160,unit:'g'}},{...base,id:'alias-only',name:'Snack Original'},{...base,id:'empty-brand',brand:''},{...base,id:'accent',name:'Original Snáck'}];
  for(const records of [rows,[...rows].reverse()]){const before=JSON.stringify(records);assert.deepEqual(C.partitionSearchRecords(records),originalPartition(records));assert.equal(JSON.stringify(records),before);}
});
test('exact-only ranking is identical to filtering the complete rank result',()=>{
  const records=[...data.packagedProducts,{id:'accent',name:'Snáck Original',brand:'Example',aliases:['Snack approved'],recordType:'packaged',market:'AU'}];
  for(const query of ['Flora','McCain','Meadow lea','Chiko roll','Flora Light','Snack approved','Snáck Original','Snack Original'])for(const food of records){const full=C.rank(food,query),exact=C.rank(food,query,{exactOnly:true});if(['exact-name','exact-alias'].includes(full.tier))assert.deepEqual(exact,full);else assert.equal(exact.score,0);}
});
test('chunked brand eligibility yields the same complete model without mutating source evidence',async()=>{
  const records=data.packagedProducts.filter(f=>C.consumerBrandMembership(C.queryIntent('McCain').entity,f).matches),snapshot=JSON.stringify(records),expected=C.brandResultModel(structuredClone(records),'McCain',{limit:500});
  assert(await C.prepareBrandResultModel(records,'McCain'));assert.deepEqual(C.brandResultModel(records,'McCain',{limit:500}),expected);assert.equal(JSON.stringify(records),snapshot);
  assert.equal(await C.prepareBrandResultModel(structuredClone(records),'McCain',{isCurrent:()=>false}),false);
});
test('chunk processing stops on ownership loss and yields to another browser-compatible task',async()=>{
  let current=true,visits=0;const scheduled=new Promise(resolve=>setTimeout(()=>{current=false;resolve();},0));
  const done=await C.forEachSearchChunk(Array.from({length:1000},(_,i)=>i),()=>{visits++;const until=performance.now()+1;while(performance.now()<until){};},()=>current);
  await scheduled;assert.equal(done,false);assert(visits>0&&visits<1000);
});

async function installGate(page){await page.evaluate(()=>{
  const originalSet=window.setTimeout,originalClear=window.clearTimeout,gate=window.__previewGate={hold:true,queued:[],next:-1};
  window.setTimeout=(fn,delay,...args)=>{if(gate.hold&&delay===120){const item={id:gate.next--,fn:()=>fn(...args),cancelled:false};gate.queued.push(item);return item.id;}return originalSet(fn,delay,...args);};
  window.clearTimeout=id=>{const item=gate.queued.find(item=>item.id===id);if(item)item.cancelled=true;else originalClear(id);};
  gate.release=async()=>{gate.hold=false;for(const item of gate.queued.splice(0))await item.fn();}; // Deliberately invoke cancelled callbacks to exercise their ownership guards.
});}
async function release(page){await page.evaluate(()=>__previewGate.release());await settled(page);}
async function state(page){return page.evaluate(()=>({value:document.getElementById('food-search').value,selection:[document.getElementById('food-search').selectionStart,document.getElementById('food-search').selectionEnd],focused:document.activeElement===document.getElementById('food-search'),stable:__typing.input===document.getElementById('food-search'),session:HEC_SEARCH_SESSION_TEST.state(),live:document.getElementById('food-live-results').innerText,results:document.getElementById('food-results').innerText}));}

for(const viewport of [{width:390,height:844},{width:320,height:568}])test(`real TEST sequential typing preserves text, selection and rendered bounds at ${viewport.width}x${viewport.height}`,{timeout:90000},async()=>{
  const routing=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),output=fs.mkdtempSync(path.join(os.tmpdir(),`hec-keyboard-${viewport.width}-`));
  try{const context=await qa.contextFor(browser,viewport,routing);await context.addInitScript(instrument);const page=await context.newPage();await qa.openLibrary(page);const input=page.locator('#food-search');await input.focus();await page.evaluate(()=>__typing.begin());
    for(const query of ['Flora','McCain','Meadow lea','Chiko roll']){
      await input.press('ControlOrMeta+A');await input.pressSequentially(query,{delay:20});await settled(page);const actual=await state(page);
      assert.equal(actual.value,query);assert(actual.stable&&actual.focused);assert.deepEqual(actual.selection,[query.length,query.length]);assert.equal(actual.session.rawQuery,query);assert(actual.live.length>0);
      assert(await page.evaluate(()=>__typing.events.every(e=>e.stable&&e.focused&&e.connected&&e.frameFocused)));
    }
    await page.screenshot({path:path.join(output,'chiko-preview.png'),fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    await installGate(page);await input.press('ControlOrMeta+A');await input.pressSequentially('Flora',{delay:20});
    // A selection made after input must survive deferred rendering unchanged.
    await input.press('Home');await input.press('Shift+ArrowRight');await input.press('Shift+ArrowRight');const selected=await state(page);await release(page);assert.deepEqual((await state(page)).selection,selected.selection);assert((await state(page)).focused);
    await input.press('ControlOrMeta+A');await input.press('Backspace');await settled(page);assert.equal((await state(page)).value,'');assert.equal((await state(page)).live,'');
    // Dictation/paste-style replacement uses the standard input event. It must
    // retain spaces and exact revisions just as genuine sequential typing does.
    await input.evaluate(el=>{el.value=' Meadow lea ';el.setSelectionRange(4,7);el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:el.value}));});const pasted=await state(page);await settled(page);assert.equal((await state(page)).value,' Meadow lea ');assert.deepEqual((await state(page)).selection,[4,7]);assert.equal(pasted.session.rawQuery,' Meadow lea ');
    await input.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.value='Flora';el.setSelectionRange(5,5);el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'Flora',isComposing:true}));});assert.equal((await state(page)).session.rawQuery,'Flora');
    await input.dispatchEvent('compositionend',{data:'Flora'});await settled(page);assert.match((await state(page)).live,/Brand: Flora/);
    await page.screenshot({path:path.join(output,'flora-preview.png'),fullPage:true});qa.requireEvidence(routing);
    const cached=await page.evaluate(async()=>{
      const api=HECOpenFoodFactsAU,foundation=HECServingFoundation,result=await api.search('Flora',{limit:500}),snapshot=JSON.stringify(result.foods),sourceSnapshot=JSON.stringify(result.foods.map(food=>api.getLoaded(food.id))),apply=foundation.applyToFood;let conversions=0;
      foundation.applyToFood=function(...args){conversions++;return apply.apply(this,args);};
      try{const repeated=await api.search('Flora',{limit:500}),same=JSON.stringify(repeated.foods)===snapshot;repeated.foods[0].searchGroup='test-only';return {same,independent:JSON.stringify(result.foods)===snapshot,sourceSame:JSON.stringify(result.foods.map(food=>api.getLoaded(food.id)))===sourceSnapshot,conversions};}finally{foundation.applyToFood=apply;}
    });assert.deepEqual(cached,{same:true,independent:true,sourceSame:true,conversions:0});qa.requireEvidence(routing);
  }finally{await browser.close();fs.writeFileSync(path.join(output,'routing.json'),JSON.stringify(routing,null,2));console.log('Keyboard rendered evidence: '+output);}
});

test('Search and Return use the latest raw value and retire pending preview callbacks',{timeout:90000},async()=>{
  const routing=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  try{const context=await qa.contextFor(browser,{width:390,height:844},routing);await context.addInitScript(instrument);const page=await context.newPage();await qa.openLibrary(page);await page.evaluate(()=>__typing.begin());
    for(const action of ['button','return']){
      await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));await installGate(page);const input=page.locator('#food-search');await input.pressSequentially('Chiko roll',{delay:20});assert(await page.evaluate(()=>__previewGate.queued.length>0));
      if(action==='button')await page.locator('#submit-food-search').click();else await input.press('Enter');
      await page.locator('[data-universal-result="aussie-chiko-roll"]').waitFor({state:'visible'});const committed=await state(page);assert.equal(committed.session.rawQuery,'Chiko roll');assert.equal(committed.session.mode,'explicit-committed');
      await release(page);const after=await state(page);assert.equal(after.results,committed.results);assert.equal(after.session.mode,'explicit-committed');assert.equal(after.live,'');
    }
    qa.requireEvidence(routing);
  }finally{await browser.close();}
});

test('pending and late catalogue work is rejected across clear, leave, cancel and A to B to A',{timeout:90000},async()=>{
  const routing=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  try{const context=await qa.contextFor(browser,{width:390,height:844},routing);await context.addInitScript(instrument);const page=await context.newPage();await qa.openLibrary(page);await page.evaluate(()=>__typing.begin());const input=page.locator('#food-search');
    await installGate(page);await input.pressSequentially('McCain',{delay:20});await page.locator('#clear-food-search').click();await release(page);assert.equal((await state(page)).value,'');assert.equal((await state(page)).live,'');assert.doesNotMatch((await state(page)).results,/McCain/);
    // Hold completion of actual catalogue searches after their real assets and
    // nutrition have loaded; release in an obsolete order, without network use.
    await page.evaluate(()=>{
      const api=HECOpenFoodFactsAU,original=api.search;window.__catalogueGate={pending:[]};api.search=async function(query,options){const result=await original.call(this,query,options);return new Promise(resolve=>__catalogueGate.pending.push({query,result,resolve:()=>resolve(result)}));};
    });
    await input.fill('Flora');await page.waitForFunction(()=>__catalogueGate.pending.some(x=>x.query==='Flora'));const a1=(await state(page)).session.revision;
    await input.fill('McCain');await page.waitForFunction(()=>__catalogueGate.pending.some(x=>x.query==='McCain'));
    await input.fill('Flora');await page.waitForFunction(()=>__catalogueGate.pending.filter(x=>x.query==='Flora').length===2);const a2=(await state(page)).session.revision;assert(a2>a1);
    await page.evaluate(()=>{__catalogueGate.pending[0].resolve();__catalogueGate.pending[1].resolve();});assert(await page.evaluate(()=>HEC_AU_CATALOGUE_TEST.brandState().loading));assert.equal(await page.evaluate(r=>HEC_SEARCH_SESSION_TEST.current(r,'Flora'),a1),false);
    await page.evaluate(()=>__catalogueGate.pending[2].resolve());await page.waitForFunction(()=>!HEC_AU_CATALOGUE_TEST.brandState().loading);await settled(page);assert.match((await state(page)).live,/Brand: Flora/);assert.doesNotMatch((await state(page)).live,/McCain/);
    await page.evaluate(()=>{window.__oldRow=document.querySelector('[data-universal-result]');});await input.fill('Flora ');const revision=(await state(page)).session.revision;assert(revision>a2);assert.equal(await page.evaluate(()=>__oldRow.isConnected),false);await page.evaluate(()=>__oldRow.click());assert.equal((await state(page)).session.guidedCommitted,false);
    await page.waitForFunction(()=>__catalogueGate.pending.length>=4);await page.locator('#food-library [data-hec-back]').click();assert.equal(await page.evaluate(r=>HEC_SEARCH_SESSION_TEST.current(r,'Flora '),revision),false);await page.evaluate(()=>__catalogueGate.pending[3].resolve());await settled(page);assert.equal(await page.evaluate(()=>HEC_AU_CATALOGUE_TEST.brandState()),null);
    // Cancel a submitted generic search while its real catalogue response waits.
    await page.evaluate(()=>openAlpha05Feature('food-library',{freshSearch:true}));await input.fill('chips');await input.press('Enter');await page.locator('[data-fc-base]').click();await page.locator('[data-fc-cancel]').waitFor({state:'visible'});await page.waitForFunction(()=>__catalogueGate.pending.some(x=>x.query==='chips'));await page.locator('[data-fc-cancel]').click();await page.evaluate(()=>{for(const work of __catalogueGate.pending)work.resolve();});await settled(page);assert.equal((await state(page)).value,'');assert.equal((await state(page)).live,'');assert.doesNotMatch((await state(page)).results,/Choose a product/);
    qa.requireEvidence(routing);
  }finally{await browser.close();}
});
