'use strict';
// Local TEST only; browser instrumentation never ships in the application.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const qa=require('./audit_physical_form_measures_edge');

function instrument(){
  const p=window.__typing={enabled:false,events:[],tasks:[],longTasks:[],interactions:[],mutations:[],pending:new Set(),fetches:0,sequence:0};
  const timer=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window),frame=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
  p.waiters=[];p.checkIdle=()=>timer(()=>{if(!p.pending.size&&!p.fetches){for(const resolve of p.waiters.splice(0))resolve();}},0);p.whenIdle=()=>new Promise(resolve=>{p.waiters.push(resolve);p.checkIdle();});
  function schedule(fn,delay,args,isFrame){
    const tracked=p.enabled&&typeof fn==='function'&&(isFrame||Number(delay||0)<=1000),kind=isFrame?'frame':'timer',start=performance.now();let id;
    const run=typeof fn!=='function'?fn:function(...values){const t=performance.now();try{return fn(...values);}finally{if(tracked){p.tasks.push({kind,delay:delay||0,queued:start,start:t,duration:performance.now()-t});p.pending.delete(kind+id);p.checkIdle();}}};
    id=isFrame?frame(run):timer(run,delay,...args);if(tracked)p.pending.add(kind+id);return id;
  }
  window.setTimeout=(fn,delay,...args)=>schedule(fn,delay,args,false);
  window.clearTimeout=id=>{p.pending.delete('timer'+id);clear(id);p.checkIdle();};
  window.requestAnimationFrame=fn=>schedule(fn,0,[],true);
  window.cancelAnimationFrame=id=>{p.pending.delete('frame'+id);cancel(id);p.checkIdle();};
  const fetchBase=window.fetch.bind(window);
  window.fetch=async(...args)=>{const tracked=p.enabled;if(tracked)p.fetches++;try{return await fetchBase(...args);}finally{if(tracked){p.fetches--;p.checkIdle();}}};
  const add=EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener=function(type,fn,options){
    if(!['input','keydown','keyup','search','resize','scroll'].includes(type)||typeof fn!=='function')return add.call(this,type,fn,options);
    return add.call(this,type,function(event){const track=p.enabled&&(event.target?.id==='food-search'||type==='resize'||type==='scroll'),t=performance.now();try{return fn.call(this,event);}finally{if(track)p.tasks.push({kind:'handler',type,name:fn.name||'anonymous',start:t,duration:performance.now()-t});}},options);
  };
  add.call(window,'input',event=>{if(event.target?.id!=='food-search'||!p.enabled)return;const input=event.target,t=performance.now(),row={type:event.inputType,value:input.value,start:t,eventDelay:Math.max(0,t-event.timeStamp),caret:[input.selectionStart,input.selectionEnd],stable:input===p.input,focused:document.activeElement===input};p.events.push(row);frame(()=>{row.frameMs=performance.now()-t;row.frameValue=input.value;row.frameCaret=[input.selectionStart,input.selectionEnd];row.frameFocused=document.activeElement===input;row.connected=input.isConnected;});},true);
  try{new PerformanceObserver(list=>{if(p.enabled)p.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})));}).observe({type:'longtask',buffered:true});}catch{}
  try{new PerformanceObserver(list=>{if(p.enabled)p.interactions.push(...list.getEntries().map(e=>({name:e.name,start:e.startTime,inputDelay:e.processingStart-e.startTime,handler:e.processingEnd-e.processingStart,renderDelay:e.startTime+e.duration-e.processingEnd,duration:e.duration,interactionId:e.interactionId})));}).observe({type:'event',buffered:true,durationThreshold:16});}catch{}
  p.begin=()=>{p.input=document.getElementById('food-search');p.enabled=true;p.events=[];p.tasks=[];p.longTasks=[];p.interactions=[];p.mutations=[];new MutationObserver(()=>p.mutations.push({at:performance.now(),value:p.input.value})).observe(document.getElementById('food-live-results'),{subtree:true,childList:true,attributes:true});};
}
function stats(values){const v=values.filter(Number.isFinite).sort((a,b)=>a-b),at=q=>+(v[Math.min(v.length-1,Math.floor(v.length*q))]||0).toFixed(2);return {count:v.length,p50:at(.5),p95:at(.95),max:at(1)};}
function cpuSummary(profile){const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map(),self=new Map(),total=new Map();for(const n of nodes.values())for(const id of n.children||[])parents.set(id,n.id);for(let i=0;i<(profile.samples||[]).length;i++){let id=profile.samples[i],dt=(profile.timeDeltas[i]||0)/1000;self.set(id,(self.get(id)||0)+dt);while(id){total.set(id,(total.get(id)||0)+dt);id=parents.get(id);}}return [...nodes.values()].map(n=>({name:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber+1,selfMs:+(self.get(n.id)||0).toFixed(1),totalMs:+(total.get(n.id)||0).toFixed(1)})).filter(n=>n.url.includes(qa.ORIGIN)).sort((a,b)=>b.selfMs-a.selfMs).slice(0,35);}
async function settled(page){await page.evaluate(()=>__typing.whenIdle());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function run({output=fs.mkdtempSync(path.join(os.tmpdir(),'hec-typing-')),rate=1,viewport={width:390,height:844}}={}){
  fs.mkdirSync(output,{recursive:true});const routing=qa.evidence(),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge}),report={browser:await browser.version(),viewport,cpuRate:rate,schedule:'pressSequentially, 20 ms requested between each genuine key; browser dispatch stalls remain observable',runs:[]};
  try{const context=await qa.contextFor(browser,viewport,routing);await context.addInitScript(instrument);const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate});await qa.openLibrary(page);await page.locator('#food-search').focus();await page.evaluate(()=>__typing.begin());await settled(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
    for(const [index,query] of ['Flora','McCain','Meadow lea','Chiko roll','Flora'].entries()){
      const input=page.locator('#food-search');await input.press('ControlOrMeta+A');
      const start=await page.evaluate(()=>{__typing.events=[];__typing.tasks=[];__typing.longTasks=[];__typing.interactions=[];__typing.mutations=[];return performance.now();});
      await input.pressSequentially(query,{delay:20});await settled(page);
      const result=await page.evaluate(()=>({events:__typing.events,tasks:__typing.tasks,longTasks:__typing.longTasks,interactions:__typing.interactions,mutations:__typing.mutations,finalValue:__typing.input.value,selection:[__typing.input.selectionStart,__typing.input.selectionEnd],focused:document.activeElement===__typing.input,stable:document.getElementById('food-search')===__typing.input,preview:document.getElementById('food-live-results').innerText,results:document.getElementById('food-results').innerText,cache:HEC_LARGE_CATALOGUE_TEST.state(),session:HEC_SEARCH_SESSION_TEST.state(),end:performance.now()}));
      result.query=query;result.phase=index===0?'first-search':index===4?'warm-repeat':'replacement-after-loaded';result.elapsed=result.end-start;result.summary={inputDelay:stats(result.events.map(e=>e.eventDelay)),inputHandlers:stats(result.tasks.filter(t=>t.kind==='handler'&&t.type==='input').map(t=>t.duration)),frameProxy:stats(result.events.map(e=>e.frameMs)),frameWork:stats(result.tasks.filter(t=>t.kind==='frame').map(t=>t.duration)),timerWork:stats(result.tasks.filter(t=>t.kind==='timer').map(t=>t.duration)),interKeyGap:stats(result.events.slice(1).map((e,i)=>e.start-result.events[i].start)),longTasks:stats(result.longTasks.map(t=>t.duration)),previewAfterLastInput:Math.max(0,(result.mutations.at(-1)?.at||0)-(result.events.at(-1)?.start||0))};report.runs.push(result);console.log(JSON.stringify({query,phase:result.phase,summary:result.summary,cache:result.cache}));
    }
    await page.locator('#food-search').press('ControlOrMeta+A');await page.locator('#food-search').press('Backspace');await settled(page);report.clear=await page.locator('#food-search').inputValue();const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(path.join(output,'cpu.json'),JSON.stringify(profile));report.cpu=cpuSummary(profile);await page.screenshot({path:path.join(output,'clear.png'),fullPage:true});qa.requireEvidence(routing);report.pass=true;
  }finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({...report,routing},null,2));console.log('Typing evidence: '+output);}return report;
}
if(require.main===module)run({output:process.argv[2],rate:Number(process.argv[3]||1)}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={instrument,settled,stats,run};
