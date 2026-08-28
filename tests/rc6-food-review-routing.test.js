'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalogue=require('../food-catalogue.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');

const ROOT=path.join(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const records=sources.foodRecords({sourceId:'mcdonalds-au'});
const food=name=>records.find(item=>item.name===name);
const bigMac=food('Big Mac');
const mcmuffin=food('Bacon & Egg McMuffin');
const mcwrap=food('Classic Chicken McWrap');
const quickContext={date:'2026-08-29',meal:'Snacks',sourceTrusted:true,safetyBlocked:false};
const reviewBlock=runtime.slice(runtime.indexOf('function rc6FullReviewEligibility'),runtime.indexOf('\nfunction rc6QuickAdd',runtime.indexOf('function rc6FullReviewEligibility')));
const rowBlock=runtime.slice(runtime.indexOf('resourceFoodRow=function(food)'),runtime.indexOf('\nlet rc6QuickAddLockTarget',runtime.indexOf('resourceFoodRow=function(food)')));

test('1. Big Mac remains eligible for exactly one-serving Quick Add',()=>{
  const policy=catalogue.quickAddPolicy(bigMac,quickContext);assert.equal(policy.ready,true);assert.equal(policy.amount,1);assert.equal(policy.unit,'burger');
});

test('2. Quick Add remains in Food Library',()=>{
  const quick=runtime.slice(runtime.indexOf('function rc6QuickAdd(food,context={})'),runtime.indexOf('\nconst rc6ResourceFoodRowBase'));assert.doesNotMatch(quick,/openFeature\(/);assert.match(runtime,/Added 1 \$\{food\.name\} to \$\{result\.meal\}/);
});

test('3. Quick Add preserves the active date and Snacks destination',()=>{
  const policy=catalogue.quickAddPolicy(bigMac,quickContext);assert.equal(policy.date,'2026-08-29');assert.equal(policy.meal,'Snacks');
});

test('4. loggable product cards route to the full review action',()=>{
  assert.match(rowBlock,/data-food-review/);assert.match(runtime,/event\.target\.closest\?\.\('\[data-food-review\]'\)/);assert.match(runtime,/rc6OpenFullReview\(getFood\(review\.dataset\.foodReview\)\)/);
});

test('5. the full editor inherits the active Snacks destination',()=>{
  assert.match(reviewBlock,/meal=ext\.ui\.pendingMeal\|\|ext\.ui\?\.mealEntrySession\?\.meal\|\|''/);assert.match(reviewBlock,/prepareEntry\(food,\{date,meal/);
});

test('6. the full editor inherits the active add-session date',()=>{
  assert.match(reviewBlock,/date=ext\.ui\?\.mealEntrySession\?\.date\|\|ext\.ui\.diaryDate\|\|isoToday\(\)/);
});

test('7. Big Mac full review defaults to 1 burger',()=>{
  assert.deepEqual(catalogue.fullReviewPolicy(bigMac),{ready:true,reason:'',amount:1,unit:'burger'});
});

test('8. the full editor exposes Add to Diary',()=>{
  assert.match(html,/id="save-food-entry"[^>]*>Add to Diary<\/button>/i);
});

test('9. the full editor exposes Add and Save to My Foods',()=>{
  assert.match(html,/id="save-food-entry-and-food"[^>]*>Add &amp; Save to My Foods<\/button>/i);
});

test('10. Nutrition Details retains the read-only showFoodDetails route',()=>{
  assert.match(rowBlock,/class="resource-details"[^`]*data-food-details/);assert.match(rowBlock,/class="rc6-live-food-info"[^`]*data-food-details/);assert.match(runtime,/if\(details\)\{showFoodDetails\(details\.dataset\.foodDetails\)/);
});

test('11. Bacon and Egg McMuffin full review defaults to 1 McMuffin',()=>{
  assert.deepEqual(catalogue.fullReviewPolicy(mcmuffin),{ready:true,reason:'',amount:1,unit:'muffin'});
});

test('12. Classic Chicken McWrap full review defaults to 1 wrap',()=>{
  assert.deepEqual(catalogue.fullReviewPolicy(mcwrap),{ready:true,reason:'',amount:1,unit:'wrap'});
});

test('13. incomplete products cannot Quick Add or enter the add editor',()=>{
  const item={...bigMac,nutrients:{},nutritionStatus:'unavailable'};assert.equal(catalogue.quickAddPolicy(item,quickContext).ready,false);assert.equal(catalogue.fullReviewPolicy(item).reason,'nutrition');
});

test('14. configurable products cannot Quick Add or enter the add editor',()=>{
  const item={...bigMac,nutritionStatus:'configurable'};assert.equal(catalogue.quickAddPolicy(item,quickContext).ready,false);assert.equal(catalogue.fullReviewPolicy(item).reason,'nutrition');
});

test('15. non-loggable cards retain explanatory details routing',()=>{
  assert.match(rowBlock,/review\.ready\?`data-food-review[^:]+:`data-food-details/);assert.match(reviewBlock,/if\(!review\.ready\)\{showFoodDetails/);
});

test('16. community gram-only records retain grams without an invented natural unit',()=>{
  const grams={id:'community-grams',name:'Community Food',defaultAmount:100,defaultUnit:'g',units:{g:1},nutrients:{calories:200},verificationStatus:'verified'};assert.deepEqual(catalogue.fullReviewPolicy(grams),{ready:true,reason:'',amount:100,unit:'g'});assert.equal(catalogue.quickAddPolicy(grams,quickContext).reason,'serving');
});

test('17. official McDonald’s provenance remains intact',()=>{
  for(const item of [bigMac,mcmuffin,mcwrap]){assert.equal(item.verified,true);assert.equal(item.foodSourceId,'mcdonalds-au');assert.match(item.source,/Official McDonald's Australia/);assert.match(item.provenance.url,/^https:\/\/www\.mcdonalds\.com\/au\/en-au\/menu\//);}
});

test('18. one plus event remains protected from double-fire',()=>{
  assert.match(runtime,/rc6QuickAddLockUntil=now\+550/);assert.match(runtime,/add===rc6QuickAddLockTarget&&now<rc6QuickAddLockUntil/);assert.match(runtime,/stopImmediatePropagation\(\)/);
});

test('19. opening the editor does not save or add an entry',()=>{
  assert.doesNotMatch(reviewBlock,/addEntry\(|saveEditorEntry\(|saveExt\(/);assert.match(reviewBlock,/prepareEntry\(/);
});

test('20. cancelling the editor performs navigation without saving',()=>{
  const cancel=runtime.slice(runtime.indexOf('by("entry-editor-back")?.addEventListener'),runtime.indexOf('\nfunction saveEditorEntry'));assert.match(cancel,/openFeature\(/);assert.doesNotMatch(cancel,/addEntry\(|saveEditorEntry\(|saveExt\(/);
});

test('mobile rows provide distinct touch targets and the editor keeps its sticky action',()=>{
  assert.match(styles,/resource-row\.rc6-food-row\{grid-template-columns/);assert.match(styles,/rc6-live-food-info/);assert.match(styles,/min-height:48px/);assert.match(styles,/@media\(max-width:520px\)/);assert.match(styles,/#food-entry-editor .*position:sticky/);
});
