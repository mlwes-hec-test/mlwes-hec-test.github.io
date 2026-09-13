'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),manifest=require('../release-manifest.json');
function workerContext({role='my-data',fetchAsset,clients=[{id:'client-1'}]}={}){
  const stores=new Map(),handlers={},events={requests:[],deleted:[],claimed:0,skipped:0},origin='https://example.test',base=role==='test'?'/':'/Lifestyle-Companion/';
  const cache={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {match:async request=>map.get(typeof request==='string'?request:request.url)?.clone(),put:async(request,response)=>map.set(typeof request==='string'?request:request.url,response.clone()),keys:async()=>[...map.keys()].map(url=>new Request(url))};},keys:async()=>[...stores.keys()],delete:async name=>{events.deleted.push(name);return stores.delete(name);}};
  const read=file=>fs.readFileSync(path.join(ROOT,role==='test'&&['installation-config.js','manifest.webmanifest'].includes(file)?'deployment/test/'+file:file));
  const context={URL,Promise,Error,Response,Request,AbortController,setTimeout,clearTimeout,crypto:crypto.webcrypto,caches:cache,fetch:async(request,options)=>{const url=new URL(typeof request==='string'?request:request.url),file=decodeURIComponent(url.pathname.slice(base.length));events.requests.push({file,url:url.href});return fetchAsset?fetchAsset(file,options,read):new Response(read(file));},self:{location:{href:origin+base+'service-worker.js?v=0.6.33&role='+role,origin},clients:{claim:async()=>{events.claimed++;},matchAll:async()=>clients},skipWaiting:async()=>{events.skipped++;},addEventListener:(type,handler)=>{handlers[type]=handler;}}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8'),context);
  const run=async(type,extra={})=>{let pending;handlers[type]({...extra,waitUntil:value=>{pending=value;}});return pending;};
  const fetchRequest=async(file,{generation=manifest.generation,destination='script',mode='same-origin'}={})=>{let pending;handlers.fetch({request:{url:origin+base+file+(generation?'?g='+generation:''),method:'GET',destination,mode},respondWith:value=>{pending=value;}});return pending;};
  const message=async(type,generation=manifest.generation)=>{let value;await run('message',{data:{type,generation},source:{id:'client-1'},ports:[{postMessage:body=>{value=body;}}]});return value;};
  return {run,fetchRequest,message,stores,cache,events,manifest,base,origin,read};
}
module.exports={workerContext};
