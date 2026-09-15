'use strict';
const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const C=require('../food-catalogue'),R=require('../retailer-catalogue'),A=require('../retailer-source');
require('../woolworths-au-catalogue');require('../coles-au-catalogue');const {index}=require('../aldi-au-catalogue');
const stats=values=>{const a=[...values].sort((a,b)=>a-b),at=q=>+a[Math.min(a.length-1,Math.floor(a.length*q))].toFixed(3);return {iterations:a.length,medianMs:at(.5),p95Ms:at(.95),maxMs:at(1)};};
async function run(){
  const times={recognition:[],rootOpen:[],category:[],allItems:[],retailerSearch:[],guidedConcept:[]};let cold;
  for(let i=0;i<100;i++){
    A.register(index); // Each iteration includes uncached product hydration.
    const measured=async(key,fn)=>{const start=performance.now(),r=await fn();times[key].push(performance.now()-start);return r;};
    assert.equal((await measured('recognition',()=>C.queryIntent('Aldi'))).kind,'retailer');
    assert.equal((await measured('rootOpen',()=>R.load(R.createSession('aldi',{ownerQuery:'Aldi',ownerRevision:i})))).total,20);
    assert.equal((await measured('category',()=>R.page('aldi',{categoryId:'bread'}))).foods.length,1);
    assert.equal((await measured('allItems',()=>R.page('aldi'))).foods.length,20);
    assert.equal((await measured('retailerSearch',()=>R.search('Aldi bread'))).foods.length,1);
    assert.equal((await measured('guidedConcept',()=>R.page('aldi',{scope:'commercial-identity',conceptId:'bread'}))).foods.length,1);
    if(i===0)cold=Object.fromEntries(Object.entries(times).map(([k,v])=>[k,+v[0].toFixed(3)]));
  }
  const measurements=Object.fromEntries(Object.entries(times).map(([k,v])=>[k,stats(v)])),limitsMs={recognition:20,rootOpen:250,category:250,allItems:250,retailerSearch:250,guidedConcept:250},failures=Object.entries(limitsMs).filter(([key,limit])=>measurements[key].p95Ms>=limit).map(([key])=>key),report={pass:!failures.length,products:20,categories:10,coldMs:cold,measurements,limitsMs,failures};assert(report.pass,JSON.stringify(report));return report;
}
if(require.main===module)run().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1});
module.exports={run};
