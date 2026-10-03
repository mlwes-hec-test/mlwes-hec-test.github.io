'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const {workerContext}=require('./release-worker-context'),build=require('../scripts/build_release'),manifest=require('../release-manifest.json');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate){for(let i=0;i<150;i++){if(predicate())return;await pause(10);}assert.fail('Lifecycle did not settle');}

// Use the accepted predecessor's actual worker protocol, including its unsafe
// cleanup. No browser profile, personal data or deployment directory is read.
const legacySource=cp.execFileSync('git',['show','29ef9ab:service-worker.js'],{cwd:build.ROOT,encoding:'utf8',maxBuffer:4e6});
const legacyManifest=JSON.parse(legacySource.split('\n')[1].slice('const RELEASE = '.length,-1));
const oldRead=file=>cp.execFileSync('git',['show','29ef9ab:'+file],{cwd:build.ROOT,maxBuffer:20e6});
test('legacy client-ready pruning during install cannot publish a detached new core cache',async()=>{
  const old=workerContext({source:legacySource,fetchAsset:file=>new Response(oldRead(file))});await old.run('install');
  let release;const gate=new Promise(resolve=>release=resolve),w=workerContext({stores:old.stores,fetchAsset:async(file,options,read)=>{if(file==='alpha06.js')await gate;return new Response(read(file));}});
  const pending=w.run('install');await pause(30);await old.message('HEC_RELEASE_CLIENT_READY',legacyManifest.generation);
  assert(old.events.deleted.includes('healthy-eating-companion-my-data-core-'+manifest.generation));
  release();await pending;await w.run('activate');assert.equal((await w.message('HEC_RELEASE_STATUS')).ready,true);
  assert.equal((await w.fetchRequest('index.html',{mode:'navigate',destination:'document'})).status,200);
});
test('late client readiness cannot delete a future generation staged after installation',async()=>{
  const w=workerContext();await w.run('install');const future='healthy-eating-companion-my-data-core-future';await w.cache.open(future);
  await w.message('HEC_RELEASE_CLIENT_READY');assert(w.stores.has(future));
});
test('core readiness precedes lazy data cache; a missing required entry invalidates a surviving marker',async()=>{
  const w=workerContext({role:'test'});await w.run('install');assert.equal((await w.message('HEC_RELEASE_STATUS')).ready,true);
  assert(![...w.stores.keys()].some(key=>key.includes('-data-')));
  const core=w.stores.get('healthy-eating-companion-test-core-'+manifest.generation);core.delete(w.origin+'/alpha06.js?g='+manifest.generation);
  assert.equal((await w.message('HEC_RELEASE_STATUS')).ready,false);await w.message('HEC_RELEASE_RESUME');
  assert.equal((await w.message('HEC_RELEASE_STATUS')).ready,true);
});
test('activation repairs completion lost after install before claiming clients',async()=>{
  const w=workerContext();await w.run('install');w.stores.delete('healthy-eating-companion-my-data-core-'+manifest.generation);
  await w.run('activate');assert.equal(w.events.claimed,1);assert.equal((await w.message('HEC_RELEASE_STATUS')).ready,true);
});
test('navigation during cache loss repairs online; offline recovery has actionable Retry and no runtime',async()=>{
  let offline=false;const w=workerContext({fetchAsset:(file,options,read)=>{if(offline)throw Error('offline');return new Response(read(file));}});
  await w.run('install');w.stores.delete('healthy-eating-companion-my-data-core-'+manifest.generation);offline=true;
  const fallback=await w.fetchRequest('index.html',{mode:'navigate',destination:'document'}),html=await fallback.text();
  assert.equal(fallback.status,503);assert.match(fallback.headers.get('Content-Type'),/text\/html/);assert.match(html,/Retry update/);assert.match(html,/reg.update\(\)/);assert.match(html,/HEC_RELEASE_RESUME/);assert.doesNotMatch(html,/<script src|localStorage|indexedDB|unregister/);
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  offline=false;const restored=await w.fetchRequest('index.html',{mode:'navigate',destination:'document'});assert.equal(restored.status,200);assert.equal(build.hash(await restored.text()),manifest.files['index.html']);
});
test('concurrent Retry joins pending core repair and never reports premature readiness',async()=>{
  let release;const gate=new Promise(resolve=>release=resolve),w=workerContext({fetchAsset:async(file,options,read)=>{if(file==='alpha06.js')await gate;return new Response(read(file));}});
  const installing=w.run('install'),retry=w.message('HEC_RELEASE_RESUME');await pause(30);
  assert.equal((await w.message('HEC_RELEASE_STATUS')).ready,false);assert.equal(w.events.skipped,0);
  release();await Promise.all([installing,retry]);assert.equal(w.events.requests.filter(x=>x.file==='alpha06.js').length,1);assert.equal((await w.message('HEC_RELEASE_STATUS')).ready,true);
});

class Events{constructor(){this.handlers={};}addEventListener(type,fn){(this.handlers[type]||=[]).push(fn);}removeEventListener(type,fn){this.handlers[type]=(this.handlers[type]||[]).filter(item=>item!==fn);}emit(type){for(const fn of this.handlers[type]||[])fn({type});}}
function worker(generation=manifest.generation,ready=true,state='activated'){
  const w=Object.assign(new Events(),{generation,ready,state,resumes:0});
  w.postMessage=(message,ports)=>{if(message.type==='HEC_RELEASE_RESUME'){w.resumes++;w.resume?.();}if(message.type==='HEC_RELEASE_STATUS'){const reply=()=>ports[0].send({generation:w.generation,ready:w.ready,role:'my-data',cache:'healthy-eating-companion-my-data-core-'+w.generation});if(w.replyDelay)setTimeout(reply,w.replyDelay);else queueMicrotask(reply);}};
  w.transition=state=>{w.state=state;w.emit('statechange');};return w;
}
function bootstrap({controller=worker(),waiting=null,installing=null,loadFailure=null}={}){
  const app={hidden:true,inert:true},notice={hidden:false,dataset:{},children:[],replaceChildren(){this.children=[];},append(node){this.children.push(node);}};
  const reg=Object.assign(new Events(),{active:controller,waiting,installing,updates:0,update:async()=>{reg.updates++;}});
  const sw=Object.assign(new Events(),{controller,getRegistration:async()=>reg,register:async()=>reg});
  const win=Object.assign(new Events(),{HEC_RELEASE:manifest,HEC_APP:{installationRole:'my-data',version:manifest.version},HECFoodCatalogue:{retailerMembership:true},HEC_SEARCH_SESSION_TEST:{},HECRetailerCatalogue:{directory:true},HECRetailerSource:{register:true}});
  let reloads=0;const timers=new Set(),setTimer=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},Math.max(1,ms/50));timers.add(id);return id;};
  const doc=Object.assign(new Events(),{visibilityState:'visible',documentElement:{setAttribute(){},removeAttribute(){}},getElementById:id=>id==='app'?app:notice,createElement:tag=>({tag}),head:{append:load},body:{append:load}});
  function load(node){queueMicrotask(()=>{if(loadFailure&&node.src?.includes(loadFailure))node.onerror();else node.onload?.();});}
  class Channel{constructor(){this.port1={close(){},onmessage:null};this.port2={send:data=>this.port1.onmessage?.({data})};}}
  class FastDate extends Date{static now(){return Date.now()*50;}}
  vm.runInNewContext(fs.readFileSync(build.ROOT+'/release-bootstrap.js','utf8'),{window:win,document:doc,navigator:{serviceWorker:sw,onLine:true},location:{origin:'https://example.test',protocol:'https:',href:'https://example.test/',reload:()=>reloads++},URL,MessageChannel:Channel,Date:FastDate,setTimeout:setTimer,clearTimeout,btoa:s=>Buffer.from(s,'binary').toString('base64')});
  return {app,notice,reg,sw,win,snapshot:()=>win.HECRelease.snapshot(),get reloads(){return reloads;},control(w){reg.active=w;sw.controller=w;sw.emit('controllerchange');},retry:()=>notice.children.find(n=>n.tag==='button').onclick(),dispose(){for(const timer of timers)clearTimeout(timer);}};
}
test('delayed install and waiting worker under old controller do not reload the new shell backwards',async()=>{
  const old=worker('previous'),next=worker(manifest.generation,false,'installing'),b=bootstrap({controller:old,installing:next});
  try{await pause(30);assert.equal(b.reloads,0);assert.equal(b.snapshot().executed.length,0);
    b.reg.installing=null;b.reg.waiting=next;next.ready=true;next.transition('installed');await pause(30);assert(next.resumes>0);assert.equal(b.reloads,0);
    b.reg.waiting=null;next.transition('activated');b.control(next);await until(()=>b.snapshot().state==='ready');assert.equal(b.reloads,0);
  }finally{b.dispose();}
});
test('controllerchange after the original readiness deadline resumes the paused page',async()=>{
  const old=worker('previous'),next=worker(manifest.generation,false,'installing'),b=bootstrap({controller:old,installing:next});
  try{await until(()=>b.snapshot().state==='paused');assert.equal(b.reloads,0);b.reg.installing=null;next.ready=true;next.transition('activated');b.control(next);await until(()=>b.snapshot().state==='ready');assert.equal(b.snapshot().pageGeneration,manifest.generation);}finally{b.dispose();}
});
test('cache completion after initial check and Retry during progress converge without reload loops',async()=>{
  const current=worker(manifest.generation,false),b=bootstrap({controller:current});
  try{await until(()=>b.snapshot().state==='paused');const retry=b.notice.children.find(n=>n.tag==='button').onclick;const first=retry();const second=retry();await pause(25);assert.equal(b.reloads,0);assert.equal(b.snapshot().executed.length,0);current.ready=true;await Promise.all([first,second]);assert.equal(b.snapshot().state,'ready');assert(current.resumes>=2);assert(b.reg.updates>=2);assert.equal(b.reloads,0);}finally{b.dispose();}
});
test('Retry after partial runtime execution verifies the core before its one explicit reload',async()=>{
  const current=worker(),b=bootstrap({controller:current,loadFailure:'migrations.js'});
  try{await until(()=>b.snapshot().state==='paused');assert(b.snapshot().executed.length>0);current.ready=false;const retry=b.retry();await pause(30);assert.equal(b.reloads,0);current.ready=true;await retry;assert.equal(b.reloads,1);}finally{b.dispose();}
});
test('late reply from a replaced controller cannot cause a reload to the wrong generation',async()=>{
  const old=worker('previous'),next=worker(),b=bootstrap({controller:old,installing:next});old.replyDelay=12;
  try{await pause(5);b.reg.installing=null;b.control(next);await until(()=>b.snapshot().state==='ready');assert.equal(b.reloads,0);}finally{b.dispose();}
});
test('existing waiting worker is resumed even when the current old page is already coherent',async()=>{
  const waiting=worker('future',true,'installed'),b=bootstrap({waiting});
  try{await until(()=>b.snapshot().state==='ready');assert(waiting.resumes>0);b.reg.waiting=null;waiting.transition('activated');b.control(waiting);await until(()=>b.reloads===1);assert(b.app.hidden);}finally{b.dispose();}
});
test('controller replacement during registration lookup cannot pass the old readiness reply',async()=>{
  const b=bootstrap(),next=worker('future');let switched=false;
  b.sw.getRegistration=async()=>{if(!switched){switched=true;b.control(next);}return b.reg;};
  try{await until(()=>b.reloads===1);assert.equal(b.snapshot().executed.length,0);}finally{b.dispose();}
});
test('recovery document Retry advances waiting activation, waits for control and reloads once',async()=>{
  const w=workerContext({fetchAsset:()=>{throw Error('offline');}}),response=await w.fetchRequest('index.html',{mode:'navigate',destination:'document'}),html=await response.text();
  const old=worker('previous',false),next=worker(manifest.generation,false,'installed'),reg={active:old,waiting:next,installing:null,updates:0,update:async()=>{reg.updates++;}},sw={controller:old,register:async()=>reg},button={},status={};let reloads=0;
  class Channel{constructor(){this.port1={close(){}};this.port2={send:data=>this.port1.onmessage?.({data})};}}
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document:{getElementById:id=>id==='retry'?button:status},navigator:{serviceWorker:sw,onLine:true},window:{addEventListener(){}},location:{reload:()=>reloads++},MessageChannel:Channel,setTimeout,clearTimeout});
  const retry=button.onclick();await button.onclick();await pause(30);assert.equal(reloads,0);assert(next.resumes>0);next.ready=true;next.state='activated';reg.waiting=null;reg.active=next;await pause(180);assert.equal(reloads,0);
  sw.controller=next;await retry;assert.equal(reloads,1);assert.equal(reg.updates,1);
});
