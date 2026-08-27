const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const runtime=read('alpha06.js');
const conversation=require('../conversation-foundation.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const catalogue=require('../food-catalogue.js');
const foods=sources.foodRecords({sourceId:'mcdonalds-au'});

function productionFunction(name){
  const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,`${name} must exist in alpha06.js`);
  const body=runtime.indexOf('{',start);let depth=0,end=body;
  for(;end<runtime.length;end++){if(runtime[end]==='{')depth++;else if(runtime[end]==='}'&&!--depth){end++;break;}}
  assert.equal(depth,0,`Could not extract ${name} from alpha06.js`);return runtime.slice(start,end);
}
function productionAssignment(name){
  const start=runtime.lastIndexOf(`${name}=function(`);assert.notEqual(start,-1,`${name} assignment must exist in alpha06.js`);
  const match=runtime.slice(start).match(new RegExp(`^${name}=function\\([^\\n]*?[\\s\\S]*?\\r?\\n};`));
  assert.ok(match,`Could not extract ${name} assignment from alpha06.js`);return match[0];
}
function fakeElement(value=''){
  const classes=new Set();return{value,innerHTML:'',classList:{add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),contains:name=>classes.has(name)},classes};
}

function createFoodLibraryHarness(){
  const input=fakeElement(),live=fakeElement(),results=fakeElement();
  const elements={'food-search':input,'food-live-results':live,'food-results':results};
  const context={
    console,foods,catalogue,conversation,input,live,results,
    setTimeout,clearTimeout,requestAnimationFrame:callback=>setTimeout(callback,0),
    AbortController,
    document:{activeElement:input},
    window:null,globalThis:null
  };
  context.window=context;context.globalThis=context;vm.createContext(context);
  vm.runInContext(read('entity-registry.js'),context);
  vm.runInContext(read('search-foundation.js'),context);
  context.HECFoodCatalogue=catalogue;

  const support=[
    's23Norm','s23Singular','s23Parsed','alpha0630QueryContext','alpha0629EntityMatch',
  ].map(productionFunction).join('\n');
  const integrated=[
    's23ProductLike','alpha0630InvalidateFoodSearchCaches','s23BrandIndex','s23BrandMatch',
    's23LikelyProduct','s23ProductMatches','s23EnergyMeta','s23ProductRow',
    'alpha0627StableProductMatches','s23RenderLive','alpha0630HandleFoodSearchInput','rc3NeutralSearch'
  ].map(productionFunction).join('\n');
  const rankAssignment=productionAssignment('searchRank');
  vm.runInContext(`
    const REG29=window.HECAustralianEntityRegistry,S23=window.HECSearchFoundation,C8=window.HECFoodCatalogue,CONVERSATION=conversation;
    const ACTIVE_VERSION='0.6.33',alpha0623LegacyRank=()=>0;
    const ext={ui:{foodSearch:'',libraryTab:'all'},savedFoodIds:[],foodVerification:{}};
    const alpha0630QueryContextCache=new Map(),alpha0630ProductMatchCache=new Map(),alpha0630ProductIntentCache=new Map(),alpha0627StableSearchCache=new Map();
    let alpha0630FoodSearchRevision=0,alpha0630BrandIndexRevision=-1,alpha0630BrandIndexValues=[];
    let alpha0630FoodSearchUiToken=0,alpha0630FoodSearchTimer=null,allResourcesOnlineTimer=null,onlineSearchToken=0,onlineAbortController=null;
    function allFoods(){return foods;}
    function getFood(id){return foods.find(food=>String(food.id)===String(id));}
    function by(id){return ${JSON.stringify(Object.keys(elements))}.includes(id)?({
      'food-search':input,'food-live-results':live,'food-results':results
    })[id]:null;}
    function q(selector){return selector==='#food-library.active'?{}:null;}
    function esc(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function cleanMeasureText(value){return String(value||'');}
    function energyText(calories){return Number.isFinite(Number(calories))?Math.round(Number(calories))+' Cal':'';}
    function normalise(value){return C8.norm(value);}
    function numberFrom(value,fallback=1){const words={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,half:.5};return words[value]??(Number(value)||fallback);}
    function defaultUnit(food){return food.defaultUnit||'serve';}
    function defaultAmount(food){return Number(food.defaultAmount)||1;}
    function unitOptions(food){return food.units||{[defaultUnit(food)]:1};}
    function hasEnergyValue(value){return Number.isFinite(Number(value));}
    function mealFromText(value){return /\\bbreakfast\\b/i.test(value)?'Breakfast':'';}
    function isoToday(){return '2026-08-26';}
    function shiftISO(value){return value;}
    function uid(prefix){return prefix+'-test';}
    function alpha0633Companion(){return{name:'Percy'};}
    function editDistance(a,b){const rows=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)rows[i][0]=i;for(let j=0;j<=b.length;j++)rows[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return rows[a.length][b.length];}
    function fuzzyTokenMatch(queryToken,foodToken){if(queryToken.length<4||foodToken.length<4||queryToken[0]!==foodToken[0])return false;const limit=Math.max(queryToken.length,foodToken.length)>=8?2:1;return editDistance(queryToken,foodToken)<=limit;}
    function alpha0618ChainFor(){return null;}
    function s23DynamicConcept(){return null;}
    function s23Concept(raw){return S23.conceptFromQuery(raw)||null;}
    function alpha0627ChainItemSuggestions(){return[];}
    function alpha0627SourceRows(){return'';}
    function s23GuideLabel(raw,concept){return concept?.label||raw;}
    function s23GuideButton(raw){return '<button data-alpha0623-guide="'+esc(raw)+'"><strong>'+esc(raw)+'</strong></button>';}
    function alpha0627ConceptSuggestions(){return[];}
    function keepLiveFoodResultsVisible(){}
    function scheduleAllResourcesOnlineSearch(){}
    function renderLibrary(){}
    function activeLibraryTab(){return ext.ui.libraryTab||'all';}
    ${support}
    ${rankAssignment}
    ${integrated}
  `,context);

  async function dispatch(value,{typed=false}={}){
    input.value='';
    const values=typed?[...value].map((_,index)=>value.slice(0,index+1)):[value];
    for(const next of values){input.value=next;context.alpha0630HandleFoodSearchInput();await new Promise(resolve=>setTimeout(resolve,typed?1:0));}
    if(!value){context.rc3NeutralSearch();}
    await new Promise(resolve=>setTimeout(resolve,90));
    return{live:live.innerHTML,results:results.innerHTML,hidden:live.classList.contains('hidden')};
  }
  function voiceRequest(text){
    const intent=conversation.parseRequest(text,{today:'2026-08-26',selectedDate:'2026-08-26',companionNames:['Percy']});
    const found=foods.map(food=>({food,result:catalogue.rank(food,intent.foodText)})).sort((a,b)=>b.result.score-a.result.score)[0];
    return{...intent,items:found?.result.score>=700?[{foodId:found.food.id,amount:intent.quantity.explicit?intent.quantity.amount:found.food.defaultAmount,unit:found.food.defaultUnit}]:[]};
  }
  return{context,input,live,results,dispatch,voiceRequest};
}

function productNames(html){return[...html.matchAll(/class="live-match-row"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/g)].map(match=>match[1]);}

test('integrated live cards resolve both approved aliases identically for typing and direct input',async()=>{
  const ui=createFoodLibraryHarness();
  for(const query of ['Mega breaky wrap','Megga breaky']){
    const typed=await ui.dispatch(query,{typed:true}),direct=await ui.dispatch(query);
    assert.equal(productNames(typed.live)[0],'Mega Brekkie McWrap',`${query} typed`);
    assert.equal(productNames(direct.live)[0],'Mega Brekkie McWrap',`${query} direct`);
  }
});

test('integrated alias controls keep the exact McWrap first',async()=>{
  const ui=createFoodLibraryHarness();
  for(const query of ['Mega breakie','Mega brekkie','Mega breakie wrap','Mega brekkie wrap','Mega brekkie McWrap','Mega Brekkie McWrap']){
    const view=await ui.dispatch(query);assert.equal(productNames(view.live)[0],'Mega Brekkie McWrap',query);
  }
});

test('generic terms stay generic while current McDonald’s source intent remains explicit',async()=>{
  const ui=createFoodLibraryHarness();
  const wrap=await ui.dispatch('wrap');assert.equal(productNames(wrap.live).includes('Mega Brekkie McWrap'),false);
  const mega=await ui.dispatch('Mega');assert.equal(ui.context.HECSearchFoundation.queryIntent('Mega').source,'');assert.doesNotMatch(mega.live,/<strong>McDonald's<\/strong>/);
  const maccas=await ui.dispatch('Maccas wrap');assert.match(maccas.live,/<strong>McDonald(?:'|&#39;)s<\/strong>/);assert.ok(productNames(maccas.live).some(name=>/McWrap|Wrap/.test(name)));
});

test('source removal, clearing and product metadata do not retain prior UI state',async()=>{
  const ui=createFoodLibraryHarness();
  await ui.dispatch('Maccas wrap');
  const current=await ui.dispatch('Mega breaky wrap');assert.doesNotMatch(current.live,/<strong>McDonald's<\/strong>/);assert.equal(productNames(current.live)[0],'Mega Brekkie McWrap');
  const cleared=await ui.dispatch('');assert.equal(cleared.live,'');assert.equal(cleared.hidden,true);assert.match(cleared.results,/Find A Food/);assert.doesNotMatch(cleared.results,/McDonald|McWrap/);
  const clean=await ui.dispatch('Megga breaky');assert.equal(productNames(clean.live)[0],'Mega Brekkie McWrap');
  const food=foods.find(item=>item.name==='Mega Brekkie McWrap'&&!item.sourceVariantId);
  assert.equal(food.sourceDisplayName,"McDonald's Australia");assert.equal(food.defaultAmount,1);assert.equal(food.defaultUnit,'wrap');assert.match(clean.live,/McDonald(?:'|&#39;)s Australia/);assert.match(clean.live,/1 wrap/i);
});

test('Quick Voice continues to resolve the corrected shared search identity',()=>{
  assert.match(runtime,/CONVERSATION\?\.parseRequest/);assert.match(runtime,/C8\?\.rank\?\.\(food,intent\.foodText\)/);
  const ui=createFoodLibraryHarness(),request=ui.voiceRequest('Hey Percy I had Mega breaky wrap for breakfast');
  assert.equal(request.items.length,1);assert.equal(foods.find(food=>food.id===request.items[0].foodId)?.name,'Mega Brekkie McWrap');assert.equal(request.items[0].unit,'wrap');
});
