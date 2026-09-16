'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const C=require('../food-catalogue'),S=require('../search-foundation'),V=require('../serving-foundation'),I=require('../brand-au-catalogue');
const foods=I.files.flatMap(f=>require('../data/brand-au/'+f.path).records),copy=v=>JSON.parse(JSON.stringify(v));
const searchFilename=path.resolve(__dirname,'../search-foundation.js'),searchModule=new Module(searchFilename,module);searchModule.filename=searchFilename;searchModule.paths=module.paths;
let searchSource=fs.readFileSync(searchFilename,'utf8'),searchStart=searchSource.indexOf('  function foodConceptEvidence(food){'),searchEnd=searchSource.indexOf('  function conceptAttributes(',searchStart);assert(searchStart>=0&&searchEnd>searchStart);
searchModule._compile(searchSource.slice(0,searchStart)+'  function foodConceptEvidence(food){return classifyFoodConcept(food);}\n'+searchSource.slice(searchEnd),searchFilename);
const referenceSearch=searchModule.exports;
// Run the same safety/ranking implementation with serving-decision memoization
// removed. This retains an executable reference rather than expected snapshots
// that could accidentally approve a changed candidate set or ordering.
const filename=path.resolve(__dirname,'../food-catalogue.js'),referenceModule=new Module(filename,module);
referenceModule.filename=filename;referenceModule.paths=module.paths;
let source=fs.readFileSync(filename,'utf8');const call='?catalogueAddability(food,central,profile):';
assert(source.includes(call));source=source.replace(call,'?central.evaluateAddability(food,{profile}):');
const factsStart=source.indexOf('    const facts=new Map(),hasKnown='),factsEnd=source.indexOf('    for(const food of dedupe(eligible)){',factsStart);assert(factsStart>=0&&factsEnd>factsStart);
source=source.slice(0,factsStart)+`    const facts=new Map(records.map(food=>{const evidence=SEARCH.foodConceptEvidence(food);return [food,{evidence,compatibility:SEARCH.conceptCompatibility(food,intent,evidence)}];}));
    const eligible=records.filter(food=>{const {evidence,compatibility}=facts.get(food);return !evidence.excluded&&(compatibility.compatible||!Object.keys(intent.known).length&&((policy.related||[]).includes(evidence.conceptId)||recordType(food)==='afcd'&&(policy.direct||[]).includes(evidence.conceptId)));});
    const brandCounts=shortlistBrandCounts(records,intent.conceptId,Object.keys(intent.known).length?null:facts),identityIndex=identityCandidateIndex(eligible);
`+source.slice(factsEnd);
referenceModule._compile(source,filename);
const reference=referenceModule.exports;global.HECFoodCatalogue=C;global.HECSearchFoundation=S;

test('classification snapshots match uncached decisions after scalar and in-place category/source mutations',()=>{
  const food={name:'Example',categories:['chocolate'],categoryMemberships:[],brand:'Example'};
  const check=()=>{assert.deepEqual(S.foodConceptEvidence(food),referenceSearch.foodConceptEvidence(food));assert.deepEqual(S.foodConceptEvidence(copy(food)),referenceSearch.foodConceptEvidence(food));};
  check();food.categories[0]='bread';check();assert.equal(S.foodConceptEvidence(food).conceptId,'bread');
  food.categories=[];food.categoryMemberships.push('milk');check();food.name='White Bread';check();food.brand='Different brand';check();
  food.foodSourceId='test-source';food.sourceConceptId='cheese';food.sourceProvenance={trustClass:'official-au-restaurant'};check();assert.equal(S.foodConceptEvidence(food).conceptId,'cheese');
  food.sourceConceptId='milk';check();food.sourceProvenance.trustClass='candidate';check();assert.equal(S.foodConceptEvidence(food).conceptId,'bread');
  food.productSemantics={type:'configurable-bundle'};check();food.afcd=true;food.name='Milk, cow, fluid';check();
  for(const record of foods){assert.deepEqual(S.foodConceptEvidence(record),referenceSearch.foodConceptEvidence(record),record.id);assert.deepEqual(S.foodConceptEvidence(record),referenceSearch.foodConceptEvidence(record),record.id+' hit');}
});

test('complete-record cache hits are identical, isolated, and invalidate every safety/ranking input',()=>{
  const original=V.evaluateAddability;let calls=0;V.evaluateAddability=function(...args){calls++;return original.apply(this,args);};
  try{
    const food=copy(foods.find(f=>f.id==='off:4061462249464'));
    const expected=reference.productEligibility(food),first=C.productEligibility(food),before=calls;
    assert.deepEqual(first,expected);assert.deepEqual(C.productEligibility(copy(food)),expected);assert.equal(calls,before,'equal record content reuses evaluation');
    first.addability.actions[0].label='Mutated caller action';assert.deepEqual(C.productEligibility(food),expected,'a caller cannot alter cached decisions');
    const mutations=[
      f=>{f.category='Milk';f.categories=['milk'];},f=>{f.brand='A different brand';},f=>{f.name='Chocolate milk';},
      f=>{f.sourceProvenance={...f.sourceProvenance,trustClass:'candidate'};},f=>{f.nutrients.calories=null;},
      f=>{f.units={mL:0};},f=>{f.barcode='0000000000000';},f=>{f.itemStatus='retired';},
      f=>{f.evidenceConflicts=[{code:'same-gtin-identity-conflict',severity:'material',resolution:'unresolved'}];},
      f=>{f.catalogueEligibility={normalLoggingAllowed:false,status:'details-only',reasonCode:'review-required'};}
    ];
    for(const mutate of mutations){mutate(food);const old=calls,result=C.productEligibility(food);assert.equal(calls,old+1,'changed full content invalidates evaluation');assert.deepEqual(result,reference.productEligibility(food));assert.deepEqual(C.productEligibility(copy(food)),result);}
    const beforeProfile=calls;C.productEligibility(food,{profile:V.servingMeasureProfile(food)});assert.equal(calls,beforeProfile+1,'explicit profiles bypass memoization');
    food.optional=undefined;let previous=calls;C.productEligibility(food);C.productEligibility(food);assert.equal(calls,previous+1,'undefined adapter metadata can safely hit');
    food.optional=null;previous=calls;C.productEligibility(food);assert.equal(calls,previous+1,'null differs from undefined');
    food.optional={['\u0000hec-undefined']:true};previous=calls;C.productEligibility(food);C.productEligibility(food);assert.equal(calls,previous+2,'input cannot collide with the undefined marker');
    food.optional=()=>null;previous=calls;C.productEligibility(food);C.productEligibility(food);assert.equal(calls,previous+2,'function-valued input bypasses memoization');
  }finally{V.evaluateAddability=original;}
});

test('hydrated OFF adapter records reuse unchanged decisions despite optional undefined metadata',async()=>{
  const O=require('../scripts/audit_open_food_facts_au').api,result=await O.search('Bread',{limit:500}),original=V.evaluateAddability;let calls=0;
  V.evaluateAddability=function(...args){calls++;return original.apply(this,args);};
  try{assert(result.foods.length);for(const food of result.foods){const expected=reference.productEligibility(food),decision=C.productEligibility(food),before=calls;assert.deepEqual(decision,expected);assert.deepEqual(C.productEligibility(food),expected);assert.equal(calls,before,food.id+' hydrated cache hit');}}finally{V.evaluateAddability=original;}
});

test('memoized and uncached addability agree across all 1922 admitted products',()=>{
  for(const food of foods){assert.deepEqual(C.productEligibility(food),reference.productEligibility(food),food.id);assert.deepEqual(C.productEligibility(copy(food)),reference.productEligibility(food),food.id+' copy');}
});

test('complete concept candidate groups, diagnostics and ranking match the uncached reference',()=>{
  const {afcdFoods}=require('../scripts/audit_progressive_food_resolution'),records=[...afcdFoods,...foods];
  for(const query of ['Bread','White bread','Milk','Cereal','Cheese','Hash Brown','Potato','Soup']){
    const intent=S.interpretFoodIntent(query,{records});if(!S.foodConceptRegistry[intent.conceptId])continue;
    assert.deepEqual(C.conceptShortlist(records,intent),reference.conceptShortlist(records,intent),query);
    // In-place metadata edits on the SAME array must not retain stale brand counts.
    const changed=copy(records);C.conceptShortlist(changed,intent);for(const f of changed.filter(f=>f.recordType==='external-catalogue'&&S.conceptCompatibility(f,intent).compatible).slice(0,3)){f.brand='Changed source brand';f.name='Changed '+f.name;f.sourceProvenance={...f.sourceProvenance,trustClass:'candidate'};}
    assert.deepEqual(C.conceptShortlist(changed,intent),reference.conceptShortlist(copy(changed),intent),query+' edited');
  }
});

test('serving normalization preserves the uncached text algorithm',()=>{
  const old=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  for(const value of [null,undefined,'','Nescafé — Café','Kellogg’s & McCain',...foods.map(f=>f.name)]){assert.equal(V.norm(value),old(value));assert.equal(V.norm(value),old(value));}
});
