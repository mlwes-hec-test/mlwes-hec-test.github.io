'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const R=require('../retailer-catalogue'),C=require('../food-catalogue'),adapter=require('../retailer-source'),{index}=require('../woolworths-au-catalogue');
const stats=values=>{const a=[...values].sort((a,b)=>a-b),at=q=>+a[Math.min(a.length-1,Math.floor(a.length*q))].toFixed(3);return {iterations:a.length,medianMs:at(.5),p95Ms:at(.95),maxMs:at(1)};};
async function run(){
  const original=R.registerCatalogue,canonicalise=C.canonicaliseRecords,requested=[],canonicalSizes=[],parsed=[],registration=[],directory=[],category=[],switching=[],search=[];
  R.registerCatalogue=options=>original({...options,loadRecords:async(ids,context)=>{requested.push(ids.length);return options.loadRecords(ids,context);}});C.canonicaliseRecords=rows=>{canonicalSizes.push(rows.length);return canonicalise(rows);};
  const register=()=>{const start=performance.now();adapter.register(index,{loadJSON:async file=>{const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/woolworths-au',file),'utf8'));parsed.push(data.records.length);return data;}});registration.push(performance.now()-start);};
  try{register();for(let i=0;i<100;i++){const start=performance.now();assert.equal(R.directory('woolworths').total,43);directory.push(performance.now()-start);}assert.equal(requested.length,0);assert.equal(parsed.length,0);assert.equal(canonicalSizes.length,0);
    for(let i=0;i<30;i++){register();let start=performance.now();const page=await R.page('woolworths',{categoryId:i%2?'bread':'*'});category.push(performance.now()-start);assert.equal(page.foods.length,i%2?3:20);start=performance.now();const session=R.createSession('woolworths',{ownerQuery:'Woolworths',ownerRevision:i});R.cancel(session);assert.equal(R.recognise('Milk'),null);switching.push(performance.now()-start);start=performance.now();const result=await R.search(i%2?'Woolworths milk':'McCain hash brown');search.push(performance.now()-start);assert(result.foods.length);}
    const result={pass:true,products:43,rawEvidenceRows:77,registration:stats(registration),bareDirectory:stats(directory),categoryPage:stats(category),querySwitch:stats(switching),indexedSearch:stats(search),directoryHydratedRows:0,maxRequestedEvidenceRows:Math.max(...requested),maxCanonicalGroupRows:Math.max(...canonicalSizes),maxParsedShardRows:Math.max(...parsed),pageCanonicalLimit:R.pageSize,requestedEvidenceRowsByLoad:requested,limitsMs:{registration:250,bareDirectory:250,categoryPage:250,querySwitch:250,indexedSearch:250}};
    assert(result.maxRequestedEvidenceRows<=40);assert(result.maxCanonicalGroupRows<=2);for(const [key,limit] of Object.entries(result.limitsMs))assert(result[key].p95Ms<limit,key+' exceeded its p95 bound');return result;
  }finally{R.registerCatalogue=original;C.canonicaliseRecords=canonicalise;adapter.register(index);}
}
if(require.main===module)run().then(report=>console.log(JSON.stringify(report,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
