const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const catalogue=require('../food-catalogue.js');
const records=sources.foodRecords({sourceId:'mcdonalds-au'});
const byItem=id=>records.find(record=>record.sourceItemId===id&&!record.sourceVariantId);
const context={};context.globalThis=context;vm.createContext(context);
vm.runInContext(read('entity-registry.js'),context);
vm.runInContext(read('search-foundation.js'),context);
const search=context.HECSearchFoundation;

function ranked(query){return records.map(food=>({food,result:catalogue.rank(food,query)})).filter(item=>item.result.score>0).sort((a,b)=>b.result.score-a.result.score||a.food.name.localeCompare(b.food.name));}

test('RC3 audit checkpoint preserves the reconciled 167-family current catalogue',()=>{
  const data=sources.getCatalogue('mcdonalds-au');
  assert.equal(data.source.lastCheckedDate,'2026-08-26');
  assert.match(data.source.catalogueCheckedAt,/^2026-08-26T/);
  assert.equal(data.items.length,167);assert.equal(records.length,211);
  assert.equal(data.items.filter(item=>item.nutritionStatus==='complete').length,142);
  assert.equal(data.items.filter(item=>item.nutritionStatus==='unavailable').length,17);
  assert.equal(data.items.filter(item=>item.nutritionStatus==='configurable').length,8);
});

test('exact McDonald’s product identity outranks partial family variants',()=>{
  assert.equal(ranked('Big Mac')[0].food.name,'Big Mac');
  assert.equal(ranked('Quarter Pounder')[0].food.name,'Quarter Pounder');
  assert.equal(ranked('Bacon & Egg McMuffin')[0].food.name,'Bacon & Egg McMuffin');
  assert.equal(ranked('Mega Brekkie McWrap')[0].food.name,'Mega Brekkie McWrap');
  assert.equal(ranked('10pc Chicken McNuggets')[0].food.name,'10pc Chicken McNuggets');
  assert.ok(ranked('Big Mac')[0].result.score>ranked('Big Mac')[1].result.score);
  assert.ok(ranked('Quarter Pounder')[0].result.score>ranked('Quarter Pounder')[1].result.score);
});

test('Australian McDonald’s speech and spelling variants resolve through the common catalogue ranker',()=>{
  for(const query of ['Mega breakie wrap','Mega breaky wrap','Megga breakie','Megga breaky'])assert.equal(ranked(query)[0].food.name,'Mega Brekkie McWrap',query);
  assert.ok(ranked('Maccas McMuffin').slice(0,8).every(item=>/McMuffin/i.test(item.food.name)));
  assert.ok(ranked('Maccas wrap').slice(0,6).every(item=>/wrap/i.test(item.food.name)));
  assert.ok(ranked('Mc muffin').slice(0,8).every(item=>/McMuffin/i.test(item.food.name)));
});

test('generic food terms stay generic and chips receives an explicit Australian clarification',()=>{
  for(const [query,key] of [['burger','burger'],['wrap','wrap'],['muffin','muffin'],['chips','chips'],['soft drink','soft-drink']]){
    assert.equal(search.conceptFromQuery(query).key,key);assert.equal(search.queryIntent(query).generic,true,query);
  }
  const choices=search.clarificationChoices('chips');
  assert.deepEqual(Array.from(choices,label=>label.label),['Hot Chips / Fries','Packet Chips / Crisps','Homemade','Takeaway / Restaurant','Brand / Store Product']);
  const muffin=search.queryFacetSeeds(search.parseQuery('blueberry muffin'),search.conceptFromQuery('blueberry muffin'));
  assert.equal(muffin.kind,'Sweet');assert.equal(muffin.flavour,'Blueberry');
});

test('voice wake phrases and companion-name spelling variants preserve the same resolver query',()=>{
  assert.equal(search.stripVoiceWake('Hi Shelley had a Big Mac for lunch',['Shelly']),'a big mac for lunch');
  assert.equal(search.stripVoiceWake('Hey Shelly I ate a Quarter Pounder for dinner',['Shelley']),'a quarter pounder for dinner');
  assert.equal(search.normaliseIntent('Megga breakie mc wrap'),'mega brekkie mcwrap');
});

test('search transitions invalidate stale snapshots and drink context without leaking results',()=>{
  const before={query:'coke',tab:'all',revision:4,snapshot:{query:'coke',tab:'all',scrollY:240},pendingDrink:{amount:250},sourceIntent:'drink'};
  const changed=catalogue.transitionSearch(before,'burger');
  assert.equal(changed.query,'burger');assert.equal(changed.revision,5);assert.equal(changed.snapshot,null);assert.equal(changed.pendingDrink,null);assert.equal(changed.sourceIntent,'');
  const blank=catalogue.transitionSearch(before,'');assert.equal(blank.query,'');assert.equal(blank.snapshot,null);assert.equal(blank.pendingDrink,null);
});

test('natural serving safeguards distinguish normal fractions from implausible whole-product quantities',()=>{
  const bigMac=byItem('big-mac'),quarterPounder=byItem('quarter-pounder'),mcmuffin=byItem('bacon-egg-mcmuffin'),mcwrap=byItem('mega-brekkie-mcwrap'),nuggets=byItem('10pc-chicken-mcnuggets'),fries=byItem('small-fries');
  assert.equal(bigMac.defaultUnit,'burger');assert.ok(bigMac.fractionUnits.includes('burger'));
  assert.equal(quarterPounder.defaultAmount,1);assert.equal(quarterPounder.defaultUnit,'burger');
  assert.equal(mcmuffin.defaultAmount,1);assert.equal(mcmuffin.defaultUnit,'muffin');
  assert.equal(mcwrap.defaultAmount,1);assert.equal(mcwrap.defaultUnit,'wrap');
  assert.equal(nuggets.defaultUnit,'portion');assert.match(nuggets.unitLabels.portion,/10-Piece Portion/);
  assert.equal(fries.defaultUnit,'portion');assert.match(fries.unitLabels.portion,/Small Fries Portion/);
  assert.equal(quarterPounder.nutrients.calories*.5,272.5);assert.equal(quarterPounder.nutrients.energyKj*.5,1140);
  assert.equal(catalogue.naturalQuantityWarning(bigMac,.5,'burger').requiresConfirmation,false);
  assert.equal(catalogue.naturalQuantityWarning(bigMac,1,'burger').requiresConfirmation,false);
  assert.equal(catalogue.naturalQuantityWarning(bigMac,250,'burger').requiresConfirmation,true);
  assert.equal(catalogue.naturalQuantityWarning(nuggets,250,'portion').requiresConfirmation,true);
});

test('official provenance and canonical IDs survive saving without creating a manual duplicate',()=>{
  const bigMac=byItem('big-mac'),provenance=catalogue.provenance(bigMac);
  assert.equal(provenance.label,"McDonald's Australia");assert.equal(provenance.verified,true);
  assert.equal(bigMac.canonicalId,'food-source:mcdonalds-au:big-mac');
  assert.equal(catalogue.canonicalKey({...bigMac}),bigMac.canonicalId);
});

test('RC3 UI contract separates diary logging from My Foods and removes individual numeric scoring',()=>{
  const runtime=read('alpha06.js'),html=read('index.html'),css=read('styles.css');
  assert.match(html,/id="save-food-entry"[^>]*>Add to Diary</);
  assert.match(html,/id="save-food-entry-and-food"[^>]*>Add &amp; Save to My Foods</);
  assert.match(runtime,/textContent='Add to Diary'/);assert.match(runtime,/textContent='Add & Save to My Foods'/);
  assert.match(runtime,/rc3SaveLocked/);assert.match(runtime,/naturalQuantityWarning/);
  assert.match(runtime,/if\(a>0&&a<=1\)return label/);
  assert.match(runtime,/if\(amount>1&&!/);
  assert.doesNotMatch(runtime,/Why This Score|Nutrition Score/);
  assert.match(runtime,/class="entry-primary-name"/);assert.match(runtime,/class="entry-source-meta"/);
  assert.match(runtime,/No Foods Yet/);assert.doesNotMatch(runtime,/No Entries Yet/);
  assert.match(css,/entry-primary-name/);assert.match(css,/overflow-wrap:anywhere/);
  assert.match(html,/id="confirm-voice-log"[^>]*disabled/);
});

test('blank search, incompatible drink carry-over and moderate voice confirmation are explicit',()=>{
  const runtime=read('alpha06.js');
  assert.match(runtime,/function rc3NeutralSearch/);assert.match(runtime,/Previous searches are not shown here/);
  assert.match(runtime,/Updating Search/);assert.match(runtime,/Matching only the words in your current search/);
  assert.match(runtime,/pendingDrink&&!S23\?\.queryIntent\?\.\(value\)\?\.drink/);
  assert.match(runtime,/context\.innerHTML='';context\.classList\.add\('hidden'\)/);
  assert.match(runtime,/function rc3DrinkCompatible/);assert.match(runtime,/usedDrinkContext:false/);
  assert.match(runtime,/const catalogueRank=C8\?\.rank\?\.\(food,intent\.foodText\)/);
  assert.match(runtime,/confidence:exact\?'high':rankInfo\.rank>=1400\?'high':'moderate'/);
  assert.match(runtime,/quick-voice-clarification/);assert.match(runtime,/audio-capture.*captured/s);
});
