'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const groups=require('../food-groups-foundation.js');
const ROOT=path.join(__dirname,'..'),runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

test('an explicitly classified zero remains a trustworthy zero',()=>{
  const result=groups.summarise([{foodGroups:{},foodGroupAttribution:'classified'}]);assert.equal(result.state,'classified');assert.deepEqual(result.values,groups.zero());
});

test('classified non-zero serves are retained exactly',()=>{
  const result=groups.summarise([{foodGroups:{vegetables:1.5,grains:.5}}]);assert.equal(result.state,'classified');assert.equal(result.values.vegetables,1.5);assert.equal(result.values.grains,.5);
});

test('an unclassified branded-food day is unavailable rather than zero',()=>{
  const result=groups.summarise([{name:'Big Mac',foodGroups:{}}]);assert.equal(result.state,'unavailable');assert.equal(result.incomplete,true);assert.deepEqual(result.values,groups.zero());
});

test('mixed known and unknown foods expose the known partial contribution',()=>{
  const result=groups.summarise([{foodGroups:{vegetables:1.5}},{name:'Bacon & Egg McMuffin',foodGroups:{}}]);assert.equal(result.state,'partially-classified');assert.equal(result.values.vegetables,1.5);assert.equal(result.unclassifiedCount,1);
});

test('seven-day averages remain marked incomplete when any recorded food is unclassified',()=>{
  const days=[groups.summarise([{foodGroups:{fruit:1}}]),groups.summarise([{foodGroups:{}}]),...Array.from({length:5},()=>groups.summarise([]))],average=groups.average(days,7);
  assert.equal(average.state,'partially-classified');assert.equal(average.incomplete,true);assert.equal(average.values.fruit,1/7);
});

test('food-group foundation never invents serves for an empty mapping',()=>{
  for(const state of ['unavailable','partially-classified']){const result=groups.summarise([{foodGroups:{},foodGroupAttribution:state}]);for(const value of Object.values(result.values))assert.equal(value,0);}
});

test('Diary and Daily Progress clearly label incomplete classification',()=>{
  assert.match(html,/id="food-group-attribution-status"/);assert.match(runtime,/Food-group breakdown not fully available/);assert.match(runtime,/classified serves recorded/);assert.match(runtime,/incomplete classified averages/);
});

test('new Diary records persist attribution state without mutating historical records',()=>{
  assert.match(runtime,/foodGroupAttribution:foodGroupAttributionState\(food\)/);assert.doesNotMatch(runtime,/for\s*\([^)]*ext\.diary[^)]*\)[\s\S]{0,160}foodGroupAttribution\s*=/);
});
