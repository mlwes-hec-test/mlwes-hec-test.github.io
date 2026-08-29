'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalogue=require('../food-catalogue.js');
const conversation=require('../conversation-foundation.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const runtime=read('alpha06.js'),html=read('index.html'),styles=read('styles.css');
const mcd=sources.foodRecords({sourceId:'mcdonalds-au'});
const chiko={id:'aussie-chiko-roll',canonicalId:'local:chiko-roll',name:'Chiko Roll',brand:'Chiko',country:'Australia',market:'AU',aliases:['chiko roll','chicko roll','chico roll','chicco roll','cheeko roll'],nutrients:{calories:313}};

test('controlled Chiko spellings share one exact canonical resolver without general fuzzy matching',()=>{
  const cached={...chiko,id:'off-9310081760092',canonicalId:'barcode:9310081760092',recordType:'online-candidate',barcode:'9310081760092'};
  for(const query of ['Chiko Roll','Chicko Roll','Chico Roll','Chicco Roll','Cheeko Roll']){const result=catalogue.resolve([cached,chiko],query);assert.equal(result.status,'exact',query);assert.equal(result.food.name,'Chiko Roll',query);}
  assert.equal(catalogue.resolve([chiko],'chicken roll').status,'none');
  assert.equal(catalogue.corrected('chicco roll'),'chiko roll');assert.equal(catalogue.corrected('cheeko roll'),'chiko roll');
  const resolved=catalogue.resolve([cached,chiko],'Chicco Roll'),entries=[{id:'local-entry',foodId:chiko.id,canonicalId:chiko.canonicalId,name:'Chiko Roll',meal:'Dinner',amount:1},{id:'cached-entry',foodId:cached.id,canonicalId:cached.canonicalId,name:'Chiko Roll',meal:'Dinner',amount:1}],removal=conversation.matchRemoval(entries,{foodText:resolved.food.name,canonicalId:resolved.food.canonicalId,meal:'Dinner',removeMode:'all'});
  assert.equal(removal.status,'exact');assert.deepEqual(removal.matches.map(entry=>entry.id),['local-entry','cached-entry']);
  const one={...chiko,id:'one',canonicalId:'one',name:'Example Roll',brand:'Brand',serving:'100 g'},two={...one,id:'two',canonicalId:'two',serving:'170 g'};
  assert.equal(catalogue.resolve([one,two],'Example Roll').status,'ambiguous');
});

test('McDonald’s fries resolve source plus size before quantity and no-size stays ambiguous',()=>{
  const large=catalogue.resolve(mcd,'large Maccas fries'),medium=catalogue.resolve(mcd,"McDonald's medium fries"),unsized=catalogue.resolve(mcd,'Maccas fries');
  assert.equal(large.status,'exact');assert.equal(large.food.name,'Large Fries');assert.equal(large.food.nutrients.calories,389);
  assert.equal(medium.status,'exact');assert.equal(medium.food.name,'Medium Fries');assert.equal(medium.food.nutrients.calories,316);
  assert.equal(unsized.status,'ambiguous');assert.deepEqual(unsized.candidates.map(food=>food.name),['Small Fries','Medium Fries','Large Fries']);assert.match(unsized.reason,/Small, Medium or Large/);
});

test('display-only quantity formatting removes floating artefacts and preserves real decimals',()=>{
  assert.equal(catalogue.displayQuantity(200.99999999999997),'201');assert.equal(catalogue.displayQuantity(10.0000000001),'10');
  assert.equal(catalogue.displayQuantity(1.5),'1.5');assert.equal(catalogue.displayQuantity(2.25),'2.25');assert.equal(catalogue.displayQuantity(.5),'0.5');
  assert.match(runtime,/function cleanMeasureText[\s\S]*?displayQuantity/);assert.doesNotMatch(runtime,/Math\.round\(entry\.amount\)/);
});

test('Flora ProActiv Light and ordinary Flora Light are separate verified Australian products',()=>{
  assert.match(runtime,/id:'flora-proactiv-light-au-official'[\s\S]*?name:'Flora ProActiv Light'[\s\S]*?serving:'1 serve \(10 g\)'[\s\S]*?energyKj:154/);
  assert.match(runtime,/id:'flora-light-au-official'[\s\S]*?name:'Flora Light'[\s\S]*?energyKj:178/);
  assert.match(runtime,/https:\/\/www\.pro-activ\.com\/en-au\/products\/flora-proactiv-light/);assert.match(runtime,/https:\/\/www\.floraspread\.com\.au\/products\/flora-spreads\/flora-light/);
  const official={id:'official',recordType:'packaged',name:'Flora ProActiv Light',brand:'Flora',aliases:['proactiv light'],market:'AU',country:'Australia',verified:true,nutrients:{calories:37}},community={id:'community',recordType:'online-candidate',name:'Light',brand:'Flora',aliases:['proactiv light'],market:'unknown',nutrients:{calories:252}};
  assert.equal(catalogue.recordType(official),'packaged');assert.equal(catalogue.recordType(community),'online-candidate');
  assert.ok(catalogue.rank(official,'proactiv light').score>catalogue.rank(community,'proactiv light').score);
  assert.equal(catalogue.resolve([community,official],'Flora ProActiv Light').food,official);
});

test('Food Review is compact by default while full nutrition remains one disclosure away',()=>{
  assert.match(runtime,/entry-nutrition-details[\s\S]*?<summary><span>View Nutrition Details<\/span>/);assert.doesNotMatch(html,/entry-nutrition-details[^>]*\sopen(?:\s|>)/);
  assert.match(styles,/\.entry-nutrition-details>summary/);assert.match(html,/id="save-food-entry"/);assert.match(html,/id="save-food-entry-and-food"/);
});

test('single Diary delete is immediate, guarded and restores the exact snapshot through Undo',()=>{
  const start=runtime.indexOf('function deleteDiaryEntryWithUndo'),end=runtime.indexOf('\nfunction requestCopyEntry',start),block=runtime.slice(start,end);
  assert.ok(start>0&&end>start);assert.doesNotMatch(block,/openModal\(/);assert.match(block,/diaryDeleteLocks\.has\(id\)/);assert.match(block,/entry:clone\(found\.entry\)/);assert.match(block,/splice\(Math\.min\(snapshot\.index/);assert.match(block,/,5000\)/);
  assert.match(runtime,/requestDeleteEntry=function\(id\)\{\s*return deleteDiaryEntryWithUndo\(id\);/);assert.doesNotMatch(runtime,/requestDeleteEntry=function\(id\)\{[\s\S]{0,700}?openModal\(/);
  assert.match(runtime,/data-overview-delete[\s\S]*?deleteDiaryEntryWithUndo\(del\.dataset\.overviewDelete,\{reopenMeal:true\}\)/);
  assert.match(runtime,/Clear \$\{meal\}\?[\s\S]*?openModal/);assert.match(runtime,/actionType===CONVERSATION\?\.actionTypes\?\.REMOVE_FOOD/);
});

test('live food search debounces full ranking, preserves the caret and hides raw prefix walls',()=>{
  assert.match(runtime,/setTimeout\(\(\)=>\{if\(token!==alpha0630FoodSearchUiToken[\s\S]*?\},160\)/);assert.match(runtime,/input\.setSelectionRange\(caret,caret\)/);
  const prediction=runtime.slice(runtime.indexOf('const predictions=alpha0627ConceptSuggestions(raw,6)'),runtime.indexOf('\n  if(product)',runtime.indexOf('const predictions=alpha0627ConceptSuggestions(raw,6)')));assert.doesNotMatch(prediction,/alpha0623-show-raw/);
  assert.match(styles,/body\.food-search-focused #food-library \.library-scan-shortcuts/);assert.match(runtime,/visualViewport\?\.addEventListener\('resize'/);
});

test('generic fries use Australian AFCD candidates and collapse online or overseas rows',()=>{
  const au={id:'au',afcd:true,afcdKey:'au-fries',name:'Potato, french fries, deep fried',market:'AU'},us={id:'us',recordType:'online-candidate',name:'French fries',market:'US'},chips={id:'chips',afcd:true,name:'Potato crisps',market:'AU'};
  assert.deepEqual(catalogue.genericFriesCandidates([us,chips,au]).map(food=>food.id),['au']);
  assert.match(runtime,/concept\?\.key==='fries'[\s\S]*?genericFriesCandidates/);assert.match(runtime,/function rc6GroupGenericFries/);assert.match(runtime,/Show more online\/overseas matches/);assert.match(styles,/founder-polish-overseas/);
});

test('Diary header is compact on small phones without hiding its day controls',()=>{
  assert.match(styles,/#food-diary \.swipe-date-control\{[^}]*height:46px|#food-diary \.date-chevron,#food-diary \.date-label-button\{height:46px/);assert.match(styles,/#food-diary \.diary-primary-actions\{grid-template-columns:1fr/);
  assert.match(html,/id="open-day-settings"/);assert.match(html,/id="diary-plan-multiple"/);assert.match(html,/id="day-settings-details"/);
});

test('Apple dictation keeps the standard editable textarea and shared voice resolver',()=>{
  assert.match(html,/<textarea id="voice-transcript"[^>]*rows="4"/);assert.doesNotMatch(html,/id="voice-transcript"[^>]*contenteditable/);
  assert.match(runtime,/const shared=C8\?\.resolve\?\.\(allFoods\(\),query\)/);assert.match(runtime,/diaryRecords=entries\.map[\s\S]*?C8\?\.resolve/);
  assert.match(runtime,/persistedIdentity=diaryRecord\?\.entry\?\.canonicalId[\s\S]*?intent\.items\[0\]\.canonicalId=intent\.canonicalId/);assert.match(runtime,/matchTarget=\{\.\.\.intent,foodText:intent\.items\?\.\[0\]\?\.name\|\|intent\.foodText\}/);assert.match(runtime,/foodId:food\.id,canonicalId:item\.canonicalId\|\|C8\?\.canonicalKey/);
});
