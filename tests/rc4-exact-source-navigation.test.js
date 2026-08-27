'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const runtime=read('alpha06.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const catalogue=require('../food-catalogue.js');
const sourceFoods=sources.foodRecords({sourceId:'mcdonalds-au'});
const reviewedSupermarket={id:'weetbix-au',name:'Sanitarium Weet-Bix Original',brand:'Sanitarium',aliases:['weet bix','weetbix','weet-bix'],category:'Breakfast Cereals',defaultAmount:2,defaultUnit:'biscuit',units:{biscuit:.5},source:'Verified From Australian Package Sample',verified:true,nutrients:{calories:110}};
const foods=[reviewedSupermarket,...sourceFoods];

function productionFunction(name){
  const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,`${name} must exist in alpha06.js`);
  const body=runtime.indexOf('{',start);let depth=0,end=body;
  for(;end<runtime.length;end++){if(runtime[end]==='{')depth++;else if(runtime[end]==='}'&&!--depth){end++;break;}}
  assert.equal(depth,0,`Could not extract ${name}`);return runtime.slice(start,end);
}
function fakeElement(value=''){
  const classes=new Set();
  return{value,innerHTML:'',className:'',dataset:{},classList:{add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),toggle:(name,force)=>force===undefined?(classes.has(name)?classes.delete(name):classes.add(name)):(force?classes.add(name):classes.delete(name)),contains:name=>classes.has(name)},focus(){documentRef.activeElement=this;},classes};
}
let documentRef=null;

function createHarness(){
  const input=fakeElement(),live=fakeElement(),results=fakeElement(),onlineActions=fakeElement(),onlineStatus=fakeElement(),listeners={};
  const elements={'food-search':input,'food-live-results':live,'food-results':results,'online-search-actions':onlineActions,'online-food-status':onlineStatus};
  documentRef={activeElement:input,addEventListener(type,handler){(listeners[type]||=[]).push(handler);}};
  const context={console,foods,catalogue,input,live,results,onlineActions,onlineStatus,document:documentRef,window:null,globalThis:null};
  context.window=context;context.globalThis=context;vm.createContext(context);
  vm.runInContext(read('entity-registry.js'),context);vm.runInContext(read('search-foundation.js'),context);context.HECFoodCatalogue=catalogue;
  const functions=['s23Parsed','s23ProductLike','rc4ExactProduct','rc4SourceOnly','rc4SourceMeta','rc4SourceFoods','rc4SourceProductQuery','rc4RelatedProducts','rc4SourceButton','rc4RenderExactLive','rc4RenderLive','rc4RenderExactSurface','rc4SourceRanked','rc4RenderSourceSurface','rc4ApplySearchSurface'].map(productionFunction).join('\n');
  const clickStart=runtime.indexOf("document.addEventListener('click',event=>{\n  const source=event.target.closest?.('[data-rc4-source-browse]')",runtime.indexOf('Alpha 0.6.33 RC4'));
  const clickEnd=runtime.indexOf('\n\nentryCard=function',clickStart);assert.ok(clickStart>0&&clickEnd>clickStart,'RC4 click handler must be extractable');const clickStatement=runtime.slice(clickStart,clickEnd);
  vm.runInContext(`
    const REG29=window.HECAustralianEntityRegistry,S23=window.HECSearchFoundation,C8=catalogue;
    const ext={ui:{foodSearch:'',libraryTab:'all'}};
    function allFoods(){return foods;}
    function by(id){return {'food-search':input,'food-live-results':live,'food-results':results,'online-search-actions':onlineActions,'online-food-status':onlineStatus}[id]||null;}
    function normalise(value){return C8.norm(value);}
    function esc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
    function searchRank(){return 0;}
    function s23ProductRow(food){return '<button type="button" class="live-match-row" data-food-card="'+esc(food.id)+'"><strong>'+esc(food.name)+'</strong></button>';}
    function resourceFoodRow(food){return '<button type="button" class="resource-row" data-food-card="'+esc(food.id)+'"><strong>'+esc(food.name)+'</strong><small>'+esc(food.categoryMemberships?.[0]||food.category||'')+'</small></button>';}
    function s23RenderLive(raw){live.innerHTML='<button type="button" data-generic-guide><strong>HEC Thinks You May Mean</strong><small>'+esc(raw)+'</small></button>';live.classList.remove('hidden');}
    let renderFoodLiveMatches=s23RenderLive;
    function renderLibrary(){results.innerHTML='<section data-general-results>General search</section>';}
    function rc3ClearSearchContext(){input.value='';ext.ui.foodSearch='';live.innerHTML='';live.classList.add('hidden');}
    function saveExt(){}
    ${functions}
    const rc4RenderLiveBase=s23RenderLive;s23RenderLive=rc4RenderLive;renderFoodLiveMatches=rc4RenderLive;
    const rc4RenderLibraryBase=renderLibrary;renderLibrary=function(){rc4RenderLibraryBase();rc4ApplySearchSurface();};
    const rc4ClearSearchContextBase=rc3ClearSearchContext;rc3ClearSearchContext=function(options={}){delete ext.ui.foodSourceBrowse;rc4ClearSearchContextBase(options);};
    ${clickStatement}
    window.RC4_TEST={
      type(value){input.value='';for(const char of value){input.value+=char;rc4RenderLive(input.value);renderLibrary();}return {live:live.innerHTML,results:results.innerHTML};},
      direct(value){input.value=value;rc4RenderLive(value);renderLibrary();return {live:live.innerHTML,results:results.innerHTML};},
      exact(value){return rc4ExactProduct(value)?.name||'';},sourceOnly:rc4SourceOnly,
      sourceNames(query){return rc4SourceRanked('mcdonalds-au',query).matched.map(food=>food.name);},
      state(){return JSON.parse(JSON.stringify(ext.ui));},clear(){rc3ClearSearchContext();},render(){renderLibrary();}
    };
  `,context);
  function click(kind,dataset={}){const node={dataset,closest(selector){if(kind==='source'&&selector==='[data-rc4-source-browse]')return this;if(kind==='clear'&&selector==='[data-rc4-clear-source-filter]')return this;if(kind==='leave'&&selector==='[data-rc4-leave-source]')return this;if(kind==='more'&&selector==='[data-rc4-source-more]')return this;return null;}};const event={target:node,preventDefault(){},stopImmediatePropagation(){}};for(const handler of listeners.click||[])handler(event);}
  return{api:context.RC4_TEST,input,live,results,click};
}
function cardNames(html){return[...html.matchAll(/data-food-card="[^"]+"><strong>([^<]+)<\/strong>/g)].map(match=>match[1].replace(/&amp;/g,'&'));}

test('typed and direct Big Mac put the exact product before every other selectable surface',()=>{
  const ui=createHarness();
  for(const view of [ui.api.type('Big Mac'),ui.api.direct('Big Mac')]){
    assert.equal(cardNames(view.live)[0],'Big Mac');assert.equal(cardNames(view.results)[0],'Big Mac');
    assert.ok(view.live.indexOf('Big Mac')<view.live.indexOf('Browse McDonald&#39;s Australia'));
    assert.ok(view.live.indexOf('Browse McDonald&#39;s Australia')<view.live.indexOf('Broader guidance'));
    assert.doesNotMatch(view.live,/HEC Thinks You May Mean[\s\S]*Big Mac/);
  }
});

test('representative exact products use the general exact-first rule',()=>{
  const ui=createHarness();
  for(const name of ['Quarter Pounder','McChicken','Bacon & Egg McMuffin','Mega Brekkie McWrap','Sanitarium Weet-Bix Original']){
    assert.equal(ui.api.exact(name),name,name);assert.equal(cardNames(ui.api.direct(name).live)[0],name,name);
  }
});

test('generic Big, burger and wrap queries remain on the broad path',()=>{
  const ui=createHarness();for(const query of ['Big','burger','wrap']){const view=ui.api.direct(query);assert.equal(ui.api.exact(query),'',query);assert.match(view.live,/HEC Thinks You May Mean/,query);}
});

test('source-card click preserves Big Mac and keeps it first in the filtered source view',()=>{
  const ui=createHarness();ui.api.direct('Big Mac');ui.click('source',{rc4SourceBrowse:'mcdonalds-au',rc4SourceLabel:"McDonald's Australia",rc4SourceQuery:'Big Mac'});
  const state=ui.api.state(),names=cardNames(ui.results.innerHTML);assert.equal(ui.input.value,'Big Mac');assert.equal(state.foodSearch,'Big Mac');assert.equal(state.foodSourceBrowse.query,'Big Mac');assert.equal(names[0],'Big Mac');assert.match(ui.results.innerHTML,/Showing \d+ matching items from 209 loaded McDonald&#39;s Australia entries/);assert.match(ui.results.innerHTML,/Clear Product Filter/);
  assert.ok(!names.length||names.indexOf('10pc Chicken McNuggets')<0||names.indexOf('10pc Chicken McNuggets')>names.indexOf('Big Mac'));
});

test('clearing only the source product filter opens an honest progressive 209-entry browse',()=>{
  const ui=createHarness();ui.api.direct('Big Mac');ui.click('source',{rc4SourceBrowse:'mcdonalds-au',rc4SourceLabel:"McDonald's Australia",rc4SourceQuery:'Big Mac'});ui.click('clear');
  assert.equal(ui.input.value,'');assert.match(ui.results.innerHTML,/Showing 20 of 209 loaded McDonald&#39;s Australia entries/);assert.match(ui.results.innerHTML,/Show More \(189 remaining\)/);
  for(let index=0;index<10;index++)ui.click('more');
  const names=cardNames(ui.results.innerHTML),representatives=[];for(const food of sourceFoods){const category=food.categoryMemberships?.[0]||food.category;if(category&&!representatives.some(item=>item.category===category))representatives.push({category,name:food.name});if(representatives.length===4)break;}
  assert.equal(names.length,209);for(const item of representatives)assert.ok(names.includes(item.name),`${item.category}: ${item.name}`);assert.doesNotMatch(ui.results.innerHTML,/Show More/);
});

test('source-only spellings intentionally open the broad McDonald’s browse',()=>{
  const ui=createHarness();for(const query of ["McDonald's",'McDonalds','Maccas',"Macca's"]){const view=ui.api.direct(query);assert.equal(ui.api.sourceOnly(query),true,query);assert.match(view.results,/McDonald&#39;s Australia/);assert.match(view.results,/Showing 20 of 209 loaded/);}
});

test('source ranking retains exact identity and the complete loaded scope',()=>{
  const ui=createHarness(),names=ui.api.sourceNames('Big Mac');assert.equal(names[0],'Big Mac');assert.equal(ui.api.sourceNames('').length,209);assert.ok(names.indexOf('Double Big Mac')>0);
});

test('clearing the general search invalidates source state and stale live cards',()=>{
  const ui=createHarness();ui.api.direct('Big Mac');ui.click('source',{rc4SourceBrowse:'mcdonalds-au',rc4SourceLabel:"McDonald's Australia",rc4SourceQuery:'Big Mac'});ui.api.clear();assert.equal(ui.api.state().foodSourceBrowse,undefined);assert.equal(ui.live.innerHTML,'');assert.equal(ui.live.classList.contains('hidden'),true);
});
