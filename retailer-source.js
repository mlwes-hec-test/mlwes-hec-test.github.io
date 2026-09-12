/* Reusable loader for committed public retailer indexes and bounded evidence shards. */
(function(global){
  'use strict';
  const R=global.HECRetailerCatalogue||(typeof require==='function'?require('./retailer-catalogue'):null);
  function register(index,{loadJSON}={}){
    const entries=new Map(index.entries.map(entry=>[entry.id,entry])),files=new Set(index.files.map(file=>file.path)),cache=new Map();
    const read=loadJSON|| (typeof window==='undefined'&&typeof require==='function'?async file=>JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,index.base,file),'utf8')):async file=>{const response=await fetch(index.base+file);if(!response.ok)throw Error('Retailer product facts could not be loaded');return response.json();});
    async function load(file){if(!files.has(file))throw Error('Unlisted retailer evidence shard');if(!cache.has(file)){const pending=read(file);cache.set(file,pending);pending.catch(()=>cache.delete(file));if(cache.size>16)cache.delete(cache.keys().next().value);}return cache.get(file);}
    return R.registerCatalogue({...index,loadRecords:async(ids,{isCurrent=()=>true}={})=>{
      const wanted=[...new Set(ids.map(id=>entries.get(id)?.shard))],pages=await Promise.all(wanted.map(load));if(!isCurrent())return [];
      const records=new Map(pages.flatMap(page=>page.records).map(food=>[food.id,food]));return ids.map(id=>records.get(id));
    }});
  }
  const api={register};global.HECRetailerSource=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
