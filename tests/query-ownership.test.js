'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../food-catalogue'),registry=require('../entity-registry');
const runtime=fs.readFileSync(path.join(__dirname,'../alpha06.js'),'utf8');
const pairs=[['Cote','Côte'],['Côte','Cote'],['resume','résumé'],['résumé','resume'],['Burgen','Bürgen'],['Häagen-Dazs','Haagen-Dazs'],['Milk','milk'],['milk','milk '],['Bürgen','Bu\u0308rgen']];
for(const [a,b]of pairs)test(`exact query ownership retires ${a} for ${b}`,()=>{
  const state=C.newUniversalSearchSession();C.previewUniversalSearch(state,a);C.commitUniversalSearch(state,[]);const ticket={...state.ownedAsync},revision=state.previewRevision;
  state.selectedResult={id:'old'};state.sourceContext={sourceKey:'packaged-frozen'};state.errorOwner={message:'old'};
  C.previewUniversalSearch(state,b);assert.equal(state.rawQuery,b);assert.equal(state.previewRevision,revision+1);assert.equal(C.ownsUniversalAsync(state,ticket),false);
  for(const key of ['selectedResult','sourceContext','submittedModel','ownedAsync','errorOwner','intent','quantity'])assert.equal(state[key],null,key);
  const fed=C.newFederatedSearchState(),old=C.beginQueryRevision(fed,a);assert(C.commitLocalSnapshot(fed,old,a,[{id:'old'}]));const fresh=C.beginQueryRevision(fed,b);assert(fresh>old);assert.equal(fed.query,b);assert.equal(fed.local.length,0);
  assert.equal(C.commitLocalSnapshot(fed,old,a,[{id:'late'}]),false);assert.equal(C.appendOnlineSnapshot(fed,fresh,a,[{id:'wrong-owner'}]),false);assert(C.commitLocalSnapshot(fed,fresh,b,[{id:'fresh'}]));assert.equal(fed.local[0].id,'fresh');
  const changed=C.transitionSearch({query:a,revision:7,snapshot:{id:'old'},sourceIntent:'old',pendingDrink:{}},b);assert.equal(changed.revision,8);assert.equal(changed.snapshot,null);assert.equal(changed.sourceIntent,'');assert.equal(changed.pendingDrink,null);
});
test('returning to an earlier exact spelling cannot revive its old ticket',()=>{
  const state=C.newUniversalSearchSession();C.previewUniversalSearch(state,'Cote');C.commitUniversalSearch(state,[]);const old={...state.ownedAsync};for(const query of ['','Milk','Côte','Cote'])C.previewUniversalSearch(state,query);C.commitUniversalSearch(state,[]);assert(!C.ownsUniversalAsync(state,old));assert(C.ownsUniversalAsync(state,state.ownedAsync));
});
test('approved retrieval equivalence never defines input identity',()=>{
  assert.equal(C.brandKey('Burgen'),C.brandKey('Bürgen'));assert.equal(C.brandKey('Häagen-Dazs'),C.brandKey('Haagen-Dazs'));assert.notEqual(C.brandKey('Cote'),C.brandKey('Côte'));assert.equal(registry.brandSearchEvidence('Cote'),null);
});
function block(start,end){const from=runtime.indexOf(start),to=runtime.indexOf(end,from+start.length);assert(from>=0&&to>from);return runtime.slice(from,to);}
function brandHarness(){
  const input={value:'Cote'},pending=[],renders=[],state={revision:1,rawQuery:'Cote'};
  const context={C8:C,searchSession633:state,by:()=>input,allFoods:()=>[],window:{HECOpenFoodFactsAU:{search:query=>new Promise((resolve,reject)=>pending.push({query,resolve,reject}))}},au633RenderBrand:owner=>renders.push({query:owner.query,revision:owner.revision,ids:owner.records.map(r=>r.id)})};
  vm.createContext(context);vm.runInContext(`let au633BrandState=null;${block('function ss633Current(', '\nfunction rc6GroupGenericFries')}${block('function au633BrandQueryCurrent(', '\nfunction au633BrandModel')}${block('function au633LoadBrand(', '\nfunction au633SubmitBrand')}globalThis.load=au633LoadBrand;`,context);
  C.registerBrandDirectory(['Cote','Côte','resume','résumé'].map(name=>({name,count:2})));
  return {context,input,state,pending,renders};
}
for(const [a,b]of pairs.slice(0,6))test(`production brand cache and late hydration stay owned across ${a} → ${b}`,async()=>{
  const app=brandHarness();app.input.value=app.state.rawQuery=a;
  const old=app.context.load(a);assert.equal(app.context.load(a),old);assert.equal(app.pending.length,1);
  app.input.value=app.state.rawQuery=b;app.state.revision++;const current=app.context.load(b);assert.notEqual(current,old);assert.equal(current.records.length,0);
  const food=brand=>({id:'fixture:'+brand,brand,name:'Golden Seed Bites',recordType:'packaged'});
  app.pending[1].resolve({foods:[food(b)],total:1});await current.promise;const rendered=app.renders.length;
  app.pending[0].resolve({foods:[food(a)],total:1});await old.promise;assert.equal(app.renders.length,rendered);assert.equal(current.records[0].id,'fixture:'+b);assert.equal(old.records.length,0);
});
test('currentness checks require exact input even if a caller supplies the current revision',()=>{
  const app=brandHarness();assert(app.context.ss633Current(1,'Cote'));assert(!app.context.ss633Current(1,'Côte'));app.input.value='Côte';assert(!app.context.ss633Current(1,'Cote'));
});
test('production OFF await rejects a late response after an exact-input edit',async()=>{
  const app=brandHarness(),context=app.context;Object.assign(context,{ps34GuidedSession:null,rc5SearchContext:()=>({source:null}),psLargeRender:()=>{throw Error('Stale render');},console});
  vm.runInContext(`let psLargeSearchToken=0,psLargeState=null,psFederatedSearchState=C8.newFederatedSearchState();${block('function psSearchBeginRevision(', '\nfunction psLargeRows')}${block('async function psLargeSearch(', '\nfunction psLargeSchedule')}globalThis.large=psLargeSearch;globalThis.federated=psFederatedSearchState;`,context);
  const response=context.large('Cote');app.input.value=app.state.rawQuery='Côte';app.state.revision++;context.psSearchBeginRevision('Côte');app.pending[0].resolve({query:'Cote',foods:[{id:'late'}],total:1,intent:{kind:'product'}});assert.equal(await response,null);assert.equal(context.federated.local.length,0);
});
test('production delayed preview cannot revive a retired query',()=>{
  const app=brandHarness(),timers=[],requests=[];Object.assign(app.context,{ps34GuidedSession:null,psLargeSearchToken:0,rc5SearchContext:()=>({source:null}),setTimeout:fn=>timers.push(fn),psLargeSearch:raw=>requests.push(raw)});
  vm.runInContext(block('function psLargeSchedule(', '\ndocument.addEventListener'),app.context);app.context.psLargeSchedule('Cote');app.state.revision++;app.input.value=app.state.rawQuery='Côte';timers[0]();assert.deepEqual(requests,[]);app.context.psLargeSchedule('Côte');timers[1]();assert.deepEqual(requests,['Côte']);
});
test('production explicit-product hydration ignores a retired owner even with the same local request token',async()=>{
  const app=brandHarness(),context=app.context,target={innerHTML:''};Object.assign(context,{REG29:registry,fc633Revision:0,ext:{ui:{}},ps34SyncGuidedUiState(){},ss633Commit(){},saveExt(){},us633RenderSubmitted(){throw Error('Stale submitted result');},by:id=>id==='food-search'?app.input:target});
  vm.runInContext(block('async function fc633StartExplicit(', '\nfunction fc633Candidates'),context);
  const response=context.fc633StartExplicit('Cote',{identityQuery:'Cote'},'enter');app.state.revision++;app.state.rawQuery=app.input.value='Côte';app.pending[0].resolve({foods:[{id:'late',brand:'Cote',name:'Seed Bites'}]});assert.equal(await response,false);assert.equal(context.searchSession633.submittedModel.total,0);
});
test('production guided-source hydration rejects a retired central owner',async()=>{
  const app=brandHarness(),context=app.context,session={conceptId:'probe',ownerRevision:1,ownerQuery:'Cote',records:[],loading:true};Object.assign(context,{fc633Session:session,fc633Revision:1,S23:{conceptSearchQueries:()=>['Cote'],conceptFacets:{type:{}},foodConceptRegistry:{probe:{facets:['type']}}},fc633Render:()=>{throw Error('Stale guided render');}});
  vm.runInContext(block('async function fc633Enrich(', '\nfunction fc633Start('),context);const response=context.fc633Enrich(session,1);app.state.revision++;app.state.rawQuery=app.input.value='Côte';app.pending[0].resolve({foods:[{id:'late'}]});await response;assert.equal(session.records.length,0);assert.equal(session.loading,true);
});
