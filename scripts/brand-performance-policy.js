'use strict';
const assert=require('node:assert/strict');

const operations=Object.freeze(['freshFoodLibrary','blankNewSearch','genericShortlist','exactBrand','brandProduct','brandBrowse','brandCategory','conceptBrandName','retailerBrowse','allItems']);
const policy=Object.freeze({
  id:'brand-rendered-50-and-cold-v1',
  normalSamples:50,
  coldSamples:1,
  percentile:'sorted[min(n-1, floor(n * .95))]',
  median:'sorted[floor(n * .5)]',
  genericMedianLimitMs:100,
  genericP95LimitMs:300,
  coldFirstLimitMs:500,
  otherP95LimitMs:250,
  otherComparison:'<',
  warmupIterations:0
});

function stats(values){
  assert(Array.isArray(values)&&values.length,'Samples must be nonempty');
  assert(values.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0),'Samples must be finite nonnegative milliseconds');
  const sorted=[...values].sort((a,b)=>a-b);
  return {iterations:values.length,firstMs:values[0],medianMs:sorted[Math.floor(values.length*.5)],p95Ms:sorted[Math.min(values.length-1,Math.floor(values.length*.95))],maxMs:sorted.at(-1)};
}

function normalResult(key,values){
  assert(operations.includes(key),'Unknown rendered operation: '+key);
  assert.equal(values.length,policy.normalSamples,'Normal acceptance requires exactly 50 samples');
  const result=stats(values),generic=key==='genericShortlist';
  const gates=generic?{
    median:{valueMs:result.medianMs,limitMs:policy.genericMedianLimitMs,comparison:'<=',pass:result.medianMs<=policy.genericMedianLimitMs},
    p95:{valueMs:result.p95Ms,limitMs:policy.genericP95LimitMs,comparison:'<=',pass:result.p95Ms<=policy.genericP95LimitMs}
  }:{p95:{valueMs:+result.p95Ms.toFixed(3),limitMs:policy.otherP95LimitMs,comparison:'<',pass:+result.p95Ms.toFixed(3)<policy.otherP95LimitMs}};
  return {...result,samplesMs:[...values],gates,pass:Object.values(gates).every(g=>g.pass)};
}

function coldResult(values){
  assert.equal(values.length,policy.coldSamples,'Cold acceptance requires exactly one sample');
  const result=stats(values);
  return {...result,samplesMs:[...values],limitMs:policy.coldFirstLimitMs,comparison:'<=',pass:result.firstMs<=policy.coldFirstLimitMs};
}

function acceptanceResult(cold,official,confirmation){
  assert.equal(cold.mode,'cold-first');
  assert.equal(official.mode,'normal');
  assert.equal(confirmation.mode,'normal');
  const failures=[];
  if(!cold.pass)failures.push('cold-first');
  if(!official.pass)failures.push('official');
  if(!confirmation.pass)failures.push('confirmation');
  return {policy,pass:failures.length===0,failures,coldFirst:cold.measurement,official:official.measurements,confirmation:confirmation.measurements};
}

module.exports={policy,operations,stats,normalResult,coldResult,acceptanceResult};
