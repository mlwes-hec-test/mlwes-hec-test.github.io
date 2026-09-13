'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),audit=require('../scripts/audit_navigation_startup_edge');
for(const viewport of [{width:390,height:844},{width:320,height:568}])test(`returning TEST profile retains real navigation and search ownership at ${viewport.width}x${viewport.height}`,{timeout:90000},async()=>{const report=await audit.run({viewport});assert(report.pass);assert(report.actions.length>=25);});

const readiness=require('../scripts/navigation_readiness_contract'),vm=require('node:vm');
const readyFixture=()=>({diag:{state:'ready',role:'test',pageGeneration:'generation',requiredCoreGeneration:'generation',workerGeneration:null,cacheGeneration:null,executed:[{file:'alpha06.js',generation:'generation',sha256:'digest'}]},generation:'generation',runtime:['alpha06.js'],files:{'alpha06.js':'digest'},roles:{test:{}},hidden:false,inert:false,readyAttribute:true,noticeHidden:true,screen:'home',apis:{search:true,catalogue:true,navigate:true},controller:null,profile:{completed:true,personal:{givenName:'Navigation fixture'}}});
for(const [name,mutate] of [
  ['handled failed readiness',v=>{v.diag.state='paused';}],
  ['late registration at settlement',v=>{v.apis.catalogue=false;}],
  ['missing navigation handler',v=>{v.apis.navigate=false;}],
  ['blocked Home after settlement',v=>{v.inert=true;}],
  ['mixed required-core generation',v=>{v.diag.requiredCoreGeneration='old';}],
  ['mixed active worker generation',v=>{v.controller='service-worker.js';v.diag.workerGeneration='old';}],
  ['missing runtime execution',v=>{v.diag.executed=[];}],
  ['lost returning sentinel',v=>{v.profile.personal.givenName='';}]
])test('readiness audit rejects '+name,()=>{const value=readyFixture();readiness.assertReady(value);mutate(value);assert.throws(()=>readiness.assertReady(value));});
test('readiness audit rejects premature interaction exposure',()=>{const value={diag:{state:'updating',executed:[]},hidden:true,inert:true,readyAttribute:false,noticeHidden:false};readiness.assertGated(value);value.hidden=false;assert.throws(()=>readiness.assertGated(value));});
test('readiness audit fails a never-settling real boundary',async()=>{
  const pending=new Promise(()=>{}),run=vm.runInNewContext('('+readiness.waitForReleaseInPage.toString()+')',{window:{__navigationReadiness:{completion:pending}},setTimeout,clearTimeout});
  await assert.rejects(run(10),/never completed/);
});
test('settled failed boundary is not accepted as successful readiness',async()=>{
  const value=readyFixture();value.diag.state='paused';
  const run=vm.runInNewContext('('+readiness.waitForReleaseInPage.toString()+')',{window:{__navigationReadiness:{completion:Promise.resolve(value)}},setTimeout,clearTimeout});
  assert.throws(()=>readiness.assertReady(value));assert.equal((await run()).diag.state,'paused');
});
