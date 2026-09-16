'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {policy,operations,stats,normalResult,coldResult,acceptanceResult}=require('../scripts/brand-performance-policy');

test('the established percentile is the maximum at 20 and index 47 at 50',()=>{
  assert.equal(stats(Array.from({length:20},(_,i)=>i+1)).p95Ms,20);
  assert.equal(stats(Array.from({length:50},(_,i)=>i+1)).p95Ms,48);
  assert.equal(stats(Array.from({length:50},(_,i)=>i+1)).medianMs,26);
});
test('all samples including a slow first search remain in arrival order',()=>{
  const values=[1000,...Array(49).fill(40)],before=[...values];
  const result=normalResult('genericShortlist',values);
  assert.equal(result.firstMs,1000);assert.equal(result.maxMs,1000);
  assert.equal(result.medianMs,40);assert.equal(result.p95Ms,40);assert(result.pass);
  assert.deepEqual(values,before);assert.deepEqual(result.samplesMs,before);
  result.samplesMs[0]=0;assert.deepEqual(values,before);
});
test('generic median and p95 are independent inclusive gates, evaluated without rounding',()=>{
  const values=[...Array(47).fill(100),300,300,300];
  assert(normalResult('genericShortlist',values).pass);
  assert(!normalResult('genericShortlist',Array(50).fill(100.0001)).pass);
  values[47]=values[48]=values[49]=300.0001;
  const result=normalResult('genericShortlist',values);
  assert(result.gates.median.pass);assert(!result.gates.p95.pass);assert(!result.pass);
});
test('cold check is separate, exactly one observation, and inclusive at 500 ms',()=>{
  assert(coldResult([500]).pass);assert(!coldResult([500.0001]).pass);
  assert.throws(()=>coldResult([10,10]));assert.throws(()=>coldResult([]));
});
test('all other rendered operations retain their existing strict 250 ms p95 gate',()=>{
  for(const key of operations.filter(key=>key!=='genericShortlist')){
    assert(normalResult(key,Array(50).fill(249.9)).pass,key);
    const result=normalResult(key,Array(50).fill(250));
    assert(!result.pass,key);assert.equal(result.gates.p95.limitMs,250);
    assert.equal(result.gates.p95.comparison,'<');
    assert(!normalResult(key,Array(50).fill(249.9999)).pass,'existing three-decimal boundary rounding');
  }
});
test('incomplete distributions, unknown operations and invalid durations cannot pass',()=>{
  for(const n of [0,20,49,51])assert.throws(()=>normalResult('genericShortlist',Array(n).fill(10)));
  assert.throws(()=>normalResult('unknown',Array(50).fill(10)));
  for(const value of [NaN,Infinity,-1,'10'])assert.throws(()=>stats([value]));
  assert.equal(policy.normalSamples,50);assert.equal(policy.coldSamples,1);
});
test('one failing independent run or cold check fails acceptance without averaging',()=>{
  const cold={mode:'cold-first',pass:true,measurement:coldResult([400])};
  const official={mode:'normal',pass:true,measurements:{genericShortlist:normalResult('genericShortlist',Array(50).fill(50))}};
  const confirmation={...official};
  assert(acceptanceResult(cold,official,confirmation).pass);
  assert.deepEqual(acceptanceResult(cold,{...official,pass:false},confirmation).failures,['official']);
  assert.deepEqual(acceptanceResult(cold,official,{...confirmation,pass:false}).failures,['confirmation']);
  assert.deepEqual(acceptanceResult({...cold,pass:false},official,confirmation).failures,['cold-first']);
});
