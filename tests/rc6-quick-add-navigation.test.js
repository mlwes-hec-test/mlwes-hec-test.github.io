'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalogue=require('../food-catalogue.js');
const ROOT=path.join(__dirname,'..'),runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const known={id:'big-mac',name:'Big Mac',defaultAmount:1,defaultUnit:'burger',units:{burger:1},nutritionStatus:'complete',verificationStatus:'verified',nutrients:{calories:621}};

test('quick-add policy accepts one trusted natural serving with an active destination',()=>{
  assert.deepEqual(catalogue.quickAddPolicy(known,{date:'2026-08-28',meal:'Snacks',sourceTrusted:true,safetyBlocked:false}),{ready:true,reason:'',amount:1,unit:'burger',date:'2026-08-28',meal:'Snacks'});
});

test('quick add blocks missing destination, ambiguous serving, incomplete and configurable foods',()=>{
  assert.equal(catalogue.quickAddPolicy(known,{date:'2026-08-28',sourceTrusted:true}).reason,'destination');
  assert.equal(catalogue.quickAddPolicy({...known,defaultUnit:'g',defaultAmount:100,units:{g:1}},{date:'2026-08-28',meal:'Lunch',sourceTrusted:true}).reason,'serving');
  assert.equal(catalogue.quickAddPolicy({...known,nutrients:{}},{date:'2026-08-28',meal:'Lunch',sourceTrusted:true}).reason,'nutrition');
  assert.equal(catalogue.quickAddPolicy({...known,nutritionStatus:'configurable'},{date:'2026-08-28',meal:'Lunch',sourceTrusted:true}).reason,'nutrition');
});

test('quick add blocks uncertain sources and existing safety restrictions',()=>{
  assert.equal(catalogue.quickAddPolicy(known,{date:'2026-08-28',meal:'Lunch',sourceTrusted:false}).reason,'source');assert.equal(catalogue.quickAddPolicy(known,{date:'2026-08-28',meal:'Lunch',sourceTrusted:true,safetyBlocked:true}).reason,'safety');
});

test('plus quick-add writes one natural serving and remains in Food Library',()=>{
  const start=runtime.indexOf('function rc6QuickAdd(food,context={})'),end=runtime.indexOf('\nconst rc6ResourceFoodRowBase',start+1),quickAdd=runtime.slice(start,end);assert.ok(start>=0&&end>start);assert.match(quickAdd,/amount:check\.amount,unit:check\.unit/);assert.match(runtime,/showActionToast\(`Added 1 \$\{food\.name\} to \$\{result\.meal\}\.`/);assert.doesNotMatch(quickAdd,/openFeature\(/);
});

test('one click is intercepted once and guarded against double-fire',()=>{
  assert.match(runtime,/event\.preventDefault\(\);event\.stopImmediatePropagation\(\)/);assert.match(runtime,/rc6QuickAddLockUntil=now\+550/);assert.match(runtime,/add===rc6QuickAddLockTarget&&now<rc6QuickAddLockUntil/);
});

test('row or name opens full review while nutrition details and plus remain separate controls',()=>{
  assert.match(runtime,/class="rc6-live-food-review"/);assert.match(runtime,/reviewAttr=review\.ready\?`data-food-review/);assert.match(runtime,/class="rc6-live-food-info"[^`]*data-food-details/);assert.match(runtime,/function rc6OpenFullReview\(food\)/);assert.match(runtime,/rc6-live-food-add/);assert.match(styles,/rc6-live-food-row\{display:grid/);assert.match(styles,/resource-details/);assert.match(styles,/#food-entry-editor .*position:sticky/);
});

test('pure McDonald’s source aliases preview the hub and require an explicit action',()=>{
  for(const alias of ["McDonald's",'McDonalds','Maccas',"Macca's"])assert.equal(catalogue.norm(alias).length>0,true);
  const automatic=runtime.slice(runtime.indexOf("renderLibrary=function(){rc6RenderLibraryBase"),runtime.indexOf("by('food-search')?.addEventListener('focus'"));assert.match(runtime,/function ps33PreviewSource/);assert.match(runtime,/data-rc4-source-browse/);assert.doesNotMatch(automatic,/foodSourceBrowse=|\.blur/);assert.match(runtime,/ss633Commit\('source-tap'/);
});

test('source plus product and exact Big Mac retain product-first decisions',()=>{
  assert.match(runtime,/if\(context\.mcdonalds\)\{const official=rc5ExactCandidates/);assert.match(runtime,/const exact=rc5ExactProductBase\(query\)/);
});

test('Back to Categories and Back to All close the keyboard without autofocus',()=>{
  const backCategories=runtime.slice(runtime.indexOf("if(event.target.closest?.('[data-rc5-back-categories]'))"),runtime.indexOf("if(event.target.closest?.('[data-rc5-source-more]'))")),backAll=runtime.slice(runtime.indexOf("if(event.target.closest?.('[data-rc4-leave-source]'))"),runtime.indexOf("if(event.target.closest?.('[data-rc4-source-more]'))"));
  assert.match(backCategories,/\.blur\?\.\(\)/);assert.match(backAll,/\.blur\?\.\(\)/);assert.doesNotMatch(backCategories+backAll,/food-search'\)\?\.focus\(\)/);assert.match(backAll,/delete ext\.ui\.foodSourceBrowse/);
});

test('Weight voice affordance and quick actions fit the existing responsive surfaces',()=>{
  assert.match(html,/id="weight-log-by-voice"[^>]*>🎙️ Log Weight by Voice/);assert.match(styles,/@media\(max-width:520px\)/);assert.match(styles,/@media\(max-height:560px\) and \(max-width:700px\)/);
});
