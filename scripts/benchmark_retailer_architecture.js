'use strict';
const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const C=require('../food-catalogue'),R=require('../retailer-catalogue'),F=require('../tests/fixtures/retailer-catalogue');
const stats=values=>{const a=[...values].sort((a,b)=>a-b),at=q=>+a[Math.min(a.length-1,Math.floor(a.length*q))].toFixed(3);return {iterations:a.length,medianMs:at(.5),p95Ms:at(.95),maxMs:at(1)};};
async function run(){
  const fixture=F.fixture({extraProducts:9996}),records=new Map(fixture.records.map(r=>[r.id,r])),loads=[],canonicalSizes=[],canonicalise=C.canonicaliseRecords,report={products:10000,synthetic:true};
  C.canonicaliseRecords=rows=>{canonicalSizes.push(rows.length);return canonicalise(rows);};
  try{
    let start=performance.now();R.registerCatalogue({...fixture,entries:fixture.entries.map(entry=>({...entry,name:records.get(entry.id).name})),loadRecords:async ids=>{loads.push(ids.length);return ids.map(id=>records.get(id))}});report.oneTimeRegistrationMs=+(performance.now()-start).toFixed(3);
    const recognition=[],startup=[],category=[],switching=[];
    for(let i=0;i<200;i++){
      for(let length=1;length<=10;length++){start=performance.now();C.queryIntent('Woolworths'.slice(0,length));recognition.push(performance.now()-start);}
      start=performance.now();const session=R.createSession('woolworths',{ownerQuery:'Woolworths',ownerRevision:i});await R.load(session);startup.push(performance.now()-start);
    }
    assert.equal(loads.length,0);assert.equal(canonicalSizes.length,0);report.recognition=stats(recognition);report.submittedDirectory=stats(startup);report.keystrokeHydrations=0;
    for(let i=0;i<100;i++){
      const session=R.createSession('woolworths',{ownerQuery:'Woolworths',ownerRevision:i});start=performance.now();await R.load(session,{categoryId:'bread',offset:i*20});category.push(performance.now()-start);assert.equal(session.result.foods.length,20);
      start=performance.now();R.cancel(session);assert.equal(C.queryIntent('Bread').kind,'product');assert.equal(C.queryIntent("Kellogg's").kind,'brand-family');switching.push(performance.now()-start);
    }
    const search=[];for(let i=0;i<20;i++){start=performance.now();const result=await R.search('Fixture bread');search.push(performance.now()-start);assert(result.total>9000);assert.equal(result.foods.length,20);}
    report.indexedSearch=stats(search);report.indexedCategoryHydration=stats(category);report.querySwitch=stats(switching);report.maxHydratedRows=Math.max(...loads);report.maxCanonicalSubset=Math.max(...canonicalSizes);assert.equal(report.maxHydratedRows,20);assert.equal(report.maxCanonicalSubset,1);
    // Reuse the established recognition and single-query limits.
    report.limitsMs={recognition:20,submittedDirectory:250,indexedCategoryHydration:250,querySwitch:250,indexedSearch:250};report.failures=Object.entries(report.limitsMs).filter(([key,limit])=>report[key].p95Ms>=limit).map(([key])=>key);report.pass=report.failures.length===0;assert(report.pass,JSON.stringify(report));return report;
  }finally{C.canonicaliseRecords=canonicalise;R.unregisterCatalogue('woolworths');}
}
if(require.main===module)run().then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error);process.exitCode=1});
module.exports={run};
