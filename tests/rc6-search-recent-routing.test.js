'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalogue=require('../food-catalogue.js');
const search=require('../search-foundation.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');

const ROOT=path.join(__dirname,'..'),runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const mcd=sources.foodRecords({sourceId:'mcdonalds-au'});
const generic={id:'afcd-fries',afcd:true,recordType:'afcd',market:'AU',country:'Australia',name:'Potato, fries, fast food outlet, deep fried, salted',brand:'Australian Food Composition Database',aliases:['fries','hot chips'],defaultAmount:100,defaultUnit:'g',units:{g:.01},nutrients:{calories:300},verified:true};
const foreign=(brand,size)=>({id:`${brand}-${size}`,recordType:'online-candidate',market:'US',country:'United States',name:`${size} Fries`,brand,aliases:[`${brand} ${size} fries`],defaultAmount:1,defaultUnit:'serve',units:{serve:1},nutrients:{calories:400},verificationStatus:'unverified'});
const burgerKing=foreign('Burger King','Large'),arbys=foreign("Arby's",'Medium');
const smallMcd=mcd.find(food=>food.name==='Small Fries');

function score(food,query){return catalogue.rank(food,query).score;}

test('generic fries and size-only fries rank Australian generic food before branded products',()=>{
  for(const query of ['fries','small fries','medium fries','large fries','hot chips']){
    assert.equal(catalogue.friesIntent(query).generic,true,query);
    assert.ok(score(generic,query)>score(smallMcd,query),query);
    assert.ok(score(smallMcd,query)>score(query.includes('medium')?arbys:burgerKing,query),query);
  }
});

test('generic size words do not become product or brand intent',()=>{
  for(const query of ['small fries','medium fries','large fries']){const intent=search.queryIntent(query);assert.equal(intent.generic,true);assert.equal(intent.genericFries,true);assert.equal(intent.source,'');}
});

test('Australian chips uses separate canonical source branches',()=>{
  const concept=search.conceptFromQuery('chips'),choices=search.clarificationChoices('chips',concept);
  assert.equal(concept.key,'chips');assert.deepEqual(choices.map(choice=>choice.label),['Home-Prepared','Restaurant / Ready-to-Eat','Purchased Packaged / Frozen','Not Sure / Typical']);assert.equal(catalogue.friesIntent('chips').generic,false);
});

test('explicit McDonald’s and Maccas fries keep official source intent',()=>{
  assert.ok(score(smallMcd,"McDonald's small fries")>score(generic,"McDonald's small fries"));
  assert.ok(score(smallMcd,'Maccas small fries')>score(generic,'Maccas small fries'));
});

test('an explicit foreign brand remains searchable and outranks generic food',()=>{
  assert.ok(score(burgerKing,'Burger King large fries')>score(generic,'Burger King large fries'));
});

test('Recent history filter never replaces an active destination meal',()=>{
  assert.match(runtime,/function alpha0618RecentTargetMeal\(entry\)\{return ext\.ui\.pendingMeal\|\|entry\?\.meal\|\|'Snacks';\}/);
  assert.doesNotMatch(runtime,/targetMeal=\(filter&&filter!==["']All["']\)\?filter/);
  for(const [history,destination] of [['Breakfast','Dinner'],['Lunch','Snacks'],['Dinner','Breakfast'],['Snacks','Lunch'],['Lunch','Lunch']]){
    const route=(active,source)=>active||source||'Snacks';assert.equal(route(destination,history),destination);
  }
});

test('Recent quick-repeat wording names the active destination',()=>{
  assert.match(runtime,/＋ Add to \$\{esc\(destination\|\|e\.meal\)\}/);assert.match(runtime,/aria-label="Quick add \$\{esc\(e\.name\)\} to \$\{esc\(destination\|\|e\.meal\)\}"/);
});
