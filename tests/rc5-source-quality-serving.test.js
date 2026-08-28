'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.join(__dirname,'..'),runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const foodCatalogue=require('../food-catalogue.js');
const official=sources.foodRecords({sourceId:'mcdonalds-au'});
const community={id:'off-muscle-food-quarter',recordType:'online-candidate',barcode:'0001',name:'Quarter pounder with cheese',brand:'Muscle Food',aliases:['Quarter pounder with cheese'],category:'Online Product',country:'International',market:'international',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'Reference per 100 g',servingBasis:'per100-reference',packageServingExplicit:false,nutrients:{calories:301},source:'Open Food Facts · Community Supplied · Verify Package',verified:false};

function productionFunction(name){const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,name);const body=runtime.indexOf('{',start);let depth=0,end=body;for(;end<runtime.length;end++){if(runtime[end]==='{')depth++;else if(runtime[end]==='}'&&!--depth){end++;break;}}return runtime.slice(start,end);}
function decisionHarness(){const foods=[community,...official],context={foods,foodCatalogue,console,window:null,globalThis:null};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(`
  const C8=foodCatalogue,REG29={stripRecognisedEntities(value){return String(value).replace(/mcdonald['’]?s|mcdonalds|maccas|macca['’]?s/ig,' ').trim();}};
  function normalise(value){return C8.norm(value);}function allFoods(){return foods;}function s23ProductLike(){return true;}function searchRank(){return 0;}
  function s23Parsed(value){return{food:normalise(value)}}function rc4SourceFoods(id){return foods.filter(food=>food.foodSourceId===id);}
  function rc5ExactProductBase(query){return foods.map(food=>({food,result:C8.rank(food,query)})).filter(item=>['exact-name','exact-alias'].includes(item.result.tier)).sort((a,b)=>b.result.score-a.result.score||Number(!!b.food.foodSourceId)-Number(!!a.food.foodSourceId))[0]?.food||null;}
  ${productionFunction('rc5PackagedBrand')}
  ${productionFunction('rc5SearchContext')}
  ${productionFunction('rc5ExactCandidates')}
  ${productionFunction('rc5ExactDecision')}
  window.decide=value=>{const d=rc5ExactDecision(value);return{kind:d.kind,primary:d.primary?.name||'',choices:d.choices.map(food=>[food.name,food.sourceDisplayName||food.brand,C8.recordType(food)]),context:{mcdonalds:d.context.mcdonalds,packaged:d.context.packaged?.food?.brand||'',product:d.context.product}};};
  window.natural=${productionFunction('alpha0615NaturalUnits')};
  `,context);return context;}

test('reviewed aliases do not invent a with-cheese equivalence',()=>{
  const quarter=official.find(food=>food.name==='Quarter Pounder'),cheesy=official.find(food=>food.name==='Cheesy Quarter Pounder');
  assert.ok(quarter);assert.ok(cheesy);assert.ok(!quarter.aliases.some(alias=>/with cheese/i.test(alias)));assert.ok(!cheesy.aliases.some(alias=>/with cheese/i.test(alias)));
});

test('unqualified Quarter pounder with cheese becomes an official-first short choice',()=>{
  const result=decisionHarness().decide('Quarter pounder with cheese');assert.equal(result.kind,'choice');assert.equal(result.primary,'');
  assert.deepEqual(Array.from(result.choices.slice(0,2),choice=>choice[0]),['Quarter Pounder','Cheesy Quarter Pounder']);
  assert.equal(result.choices[0][1],"McDonald's Australia");assert.equal(result.choices[2][2],'online-candidate');
});

test('explicit McDonald’s context keeps the reviewed official choices first',()=>{
  const result=decisionHarness().decide("McDonald's Quarter pounder with cheese");assert.equal(result.kind,'choice');assert.equal(result.context.mcdonalds,true);
  assert.deepEqual(Array.from(result.choices.slice(0,2),choice=>choice[0]),['Quarter Pounder','Cheesy Quarter Pounder']);
});

test('explicit Muscle Food context permits the packaged record to lead',()=>{
  const result=decisionHarness().decide('Muscle Food Quarter pounder with cheese');assert.equal(result.kind,'exact');assert.equal(result.primary,'Quarter pounder with cheese');assert.equal(result.context.packaged,'Muscle Food');
});

test('genuinely exact official names remain single exact products',()=>{
  for(const query of ['Big Mac',"McDonald's Big Mac"]){const result=decisionHarness().decide(query);assert.equal(result.kind,'exact',query);assert.equal(result.primary,'Big Mac',query);}
});

test('a community per-100-only product cannot gain Slice from words in its title',()=>{
  const harness=decisionHarness(),copy=structuredClone(community);harness.natural(copy);assert.deepEqual(Object.keys(copy.units),['g']);assert.equal(copy.defaultUnit,'g');assert.equal(copy.servingBasis,'per100-reference');
});

test('generic cheese can retain a reviewed category-based slice estimate',()=>{
  const harness=decisionHarness(),cheese={id:'generic-cheese',name:'Cheddar Cheese',category:'Dairy & Eggs',units:{g:.01},unitLabels:{g:'g'},serving:'100 g',nutrients:{calories:400}};harness.natural(cheese);assert.ok(cheese.units.slice>0);assert.match(cheese.unitLabels.slice,/Slice/);
});

test('Big Mac Special Sauce is a condiment serve and never a burger',()=>{
  const sauce=official.find(food=>food.name==='Big Mac Special Sauce');assert.equal(sauce.browseCategory,'Sauces');assert.equal(sauce.defaultUnit,'serve');assert.equal(sauce.unitLabels.serve,'Condiment Serve');assert.equal(sauce.units.burger,undefined);
});

test('official provenance stays official after the item is saved',()=>{
  const bigMac=official.find(food=>food.name==='Big Mac'),provenance=foodCatalogue.provenance(bigMac);assert.equal(provenance.label,"McDonald's Australia");assert.equal(provenance.verified,true);
  const badgeBlock=runtime.slice(runtime.indexOf('const alpha0615ResourceFoodRow='),runtime.indexOf("by('start-voice-log')",runtime.indexOf('const alpha0615ResourceFoodRow=')));assert.doesNotMatch(badgeBlock,/savedFoodIds/);assert.match(badgeBlock,/food\.source==='User Created'/);
});

test('source-choice copy is neutral about community data and requires explicit brand context',()=>{
  assert.match(runtime,/community-supplied packaged record is not treated as the restaurant product unless you name its brand/);
  assert.match(runtime,/Name a packaged brand to select that source explicitly/);
});
