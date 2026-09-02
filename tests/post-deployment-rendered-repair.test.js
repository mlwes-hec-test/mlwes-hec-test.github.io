'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const catalogue=require('../food-catalogue.js');
const search=require('../search-foundation.js');
const sources=require('../food-sources.js');
const entities=require('../entity-registry.js');
const conversation=require('../conversation-foundation.js');
const packaged=require('../packaged-foods.js');
const guided=require('../guided-product-resolution.js');
const portionAudit=require('../scripts/audit_progressive_food_resolution.js');
require('../mcdonalds-au-catalogue.js');
require('../kfc-au-catalogue.js');

const ROOT=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const kfc=sources.foodRecords({sourceId:'kfc-au'});
const mcd=sources.foodRecords({sourceId:'mcdonalds-au'});
const genericChips={id:'afcd-hot-chips',recordType:'afcd',afcd:true,name:'Potato chips, regular, takeaway',brand:'Australian Food Composition Database',aliases:['chips','hot chips'],category:'Takeaway',country:'Australia',market:'AU',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'100 g reference',nutrients:{energyKj:1000,calories:239},verified:true};

function productionFunction(name){
  const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,`${name} exists`);let brace=-1,paren=0,quote='',escaped=false;
  for(let index=runtime.indexOf('(',start);index<runtime.length;index++){const char=runtime[index];if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote='';continue;}if(char==='"'||char==="'"||char==='`'){quote=char;continue;}if(char==='(')paren++;else if(char===')'&&--paren===0){brace=runtime.indexOf('{',index);break;}}
  let depth=0;quote='';escaped=false;for(let index=brace;index<runtime.length;index++){const char=runtime[index];if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote='';continue;}if(char==='"'||char==="'"||char==='`'){quote=char;continue;}if(char==='{')depth++;else if(char==='}'&&--depth===0)return runtime.slice(start,index+1);}throw new Error(`Could not extract ${name}`);
}

function decisionHarness(){
  const foods=[genericChips,...mcd,...kfc],context={foods,catalogue,search,sources,entities,console,window:null,globalThis:null};context.window=context;context.globalThis=context;context.HECFoodSources=sources;vm.createContext(context);
  vm.runInContext(`
    const C8=catalogue,REG29=entities;function normalise(value){return C8.norm(value);}function allFoods(){return foods;}function s23ProductLike(){return true;}function searchRank(food,query){return C8.rank(food,query).score;}function s23Parsed(value){return search.parseQuery(value);}
    function rc4SourceFoods(id){return foods.filter(food=>food.foodSourceId===id&&food.itemStatus!=='retired');}
    function rc5ExactProductBase(query){return foods.map(food=>({food,result:C8.rank(food,query)})).filter(item=>['exact-name','exact-alias'].includes(item.result.tier)).sort((a,b)=>b.result.score-a.result.score||Number(!!b.food.foodSourceId)-Number(!!a.food.foodSourceId))[0]?.food||null;}
    ${productionFunction('rc4NamedRestaurantSource')}
    ${productionFunction('rc5PackagedBrand')}
    ${productionFunction('rc5SearchContext')}
    ${productionFunction('rc5ExactCandidates')}
    ${productionFunction('rc5SourceFamilyChoice')}
    ${productionFunction('rc5SourceCountedExact')}
    ${productionFunction('rc5ExactDecision')}
    window.decide=value=>{const result=rc5ExactDecision(value);return{kind:result.kind,primary:result.primary?.name||'',choices:result.choices.map(food=>food.name),sourceId:result.context.source?.id||'',product:result.context.product};};
  `,context);return context.decide;
}

class Surface{
  constructor(){this.innerHTML='';this.attributes=new Map();this.classes=new Set();this.classList={add:(...values)=>values.forEach(value=>this.classes.add(value)),remove:(...values)=>values.forEach(value=>this.classes.delete(value)),contains:value=>this.classes.has(value)};}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  removeAttribute(name){this.attributes.delete(name);}
}
function surfaceHarness(focused=true){
  const input={},live=new Surface(),main=new Surface(),document={activeElement:focused?input:null},elements={'food-search':input,'food-live-results':live,'food-results':main},context={document,by:id=>elements[id]||null,window:null};context.window=context;vm.createContext(context);vm.runInContext(`${productionFunction('ps33ResultSurfaceOwner')}\n${productionFunction('ps33EnforceResultSurfaceOwnership')}\nwindow.enforce=ps33EnforceResultSurfaceOwnership;`,context);return{input,live,main,document,enforce:context.enforce};
}
const sourceLabel=new Function(`return (${productionFunction('ps33DecisionSourceLabel')});`)();
const decide=decisionHarness();
const surfaceState=(query,focused=true)=>{const app=surfaceHarness(focused);app.live.innerHTML=`<button>${query}</button>`;app.main.innerHTML=`<button>${query}</button>`;return{app,owner:app.enforce()};};

test('1. generic chips rendering selects one active result surface',()=>{const {app,owner}=surfaceState('chips');assert.equal(owner,'live');assert.ok(app.live.innerHTML);assert.equal(app.main.innerHTML,'');});
test('2. focused-to-main transition removes the prior actionable surface',()=>{const {app}=surfaceState('query');app.document.activeElement=null;app.main.innerHTML='<button>Main result</button>';assert.equal(app.enforce(),'main');assert.equal(app.live.innerHTML,'');assert.equal(app.live.classList.contains('hidden'),true);});
test('3. result actions use a container-bounded width contract',()=>{assert.match(styles,/alpha0627-source-first>\.live-match-row[^}]*width:100%;max-width:100%;min-width:0;box-sizing:border-box/);});
test('4. active result containers prevent horizontal overflow',()=>{assert.match(styles,/food-live-results[^}]*width:100%;max-width:100%;min-width:0;box-sizing:border-box/);assert.match(styles,/food-search-focused #food-library\{overflow-x:hidden/);});

test('5. KFC 3 Wicked Wings is an exact counted identity',()=>{const result=decide('KFC 3 Wicked Wings');assert.equal(result.kind,'exact');assert.equal(result.primary,'3 Wicked Wings');});
test('6. KFC 6 Wicked Wings is an exact counted identity',()=>{const result=decide('KFC 6 Wicked Wings');assert.equal(result.kind,'exact');assert.equal(result.primary,'6 Wicked Wings');});
test('7. KFC 10 Wicked Wings is an exact counted identity',()=>{const result=decide('KFC 10 Wicked Wings');assert.equal(result.kind,'exact');assert.equal(result.primary,'10 Wicked Wings');});
test('8. unspecified KFC Wicked Wings retains the three official count choices',()=>{const result=decide('KFC Wicked Wings');assert.equal(result.kind,'choice');assert.deepEqual(Array.from(result.choices),['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings']);});

function voiceHarness(){
  const foods=kfc,context={foods,catalogue,console,window:null,globalThis:null};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(`
    const C8=catalogue,GUIDED_PRODUCTS=null,PS33=null;function normalise(value){return C8.norm(value);}function allFoods(){return foods;}function getFood(id){return foods.find(food=>food.id===id);}function defaultAmount(food){return food.defaultAmount;}function defaultUnit(food){return food.defaultUnit;}function unitOptions(food){return food.units||{};}function searchRank(food,query){return C8.rank(food,query).score;}function hasEnergyValue(value){return Number.isFinite(Number(value));}function formatNaturalAmount(value){return String(value);}function friendlyUnitLabel(food,unit,amount){return unit==='piece'?(Number(amount)===1?'Piece':'Pieces'):unit;}function alpha0634GuidedIntentFood(){return{handled:false,items:[]};}
    ${productionFunction('alpha0633NormalUnit')}
    ${productionFunction('alpha0633ResolvedItem')}
    ${productionFunction('alpha0633CountIdentityFood')}
    ${productionFunction('alpha0633ResolveIntentFood')}
    ${productionFunction('alpha0633ItemPhrase')}
    window.api={resolve:alpha0633ResolveIntentFood,phrase:alpha0633ItemPhrase};
  `,context);return context.api;
}
test('9. voice six Wicked Wings resolves one six-piece menu identity without double multiplication',()=>{const intent=conversation.parseActionRequest('Add six Wicked Wings for lunch',{today:'2026-09-02'}),voice=voiceHarness(),items=voice.resolve(intent);assert.equal(items.length,1);assert.equal(items[0].name,'6 Wicked Wings');assert.equal(items[0].countIdentity,true);assert.equal(items[0].amount,6);assert.equal(items[0].unit,'piece');assert.equal(packaged.nutritionForFood(kfc.find(food=>food.name===items[0].name),items[0]).energyKj,3259);assert.match(voice.phrase(items[0]),/^one 6 Wicked Wings menu product \(6 Pieces total\)$/);});

test('10. KFC Popcorn Chicken presents the valid Snack, Regular and Maxi sizes',()=>assert.deepEqual(Array.from(decide('KFC Popcorn Chicken').choices),['Snack Popcorn Chicken','Regular Popcorn Chicken','Maxi Popcorn Chicken']));
test('11. KFC Regular Popcorn Chicken resolves exact',()=>{const result=decide('KFC Regular Popcorn Chicken');assert.equal(result.kind,'exact');assert.equal(result.primary,'Regular Popcorn Chicken');});
test('12. legitimate Popcorn Chicken size records remain distinct',()=>{const records=kfc.filter(food=>food.choiceFamily==='popcorn-chicken');assert.equal(records.length,3);assert.equal(new Set(records.map(food=>food.canonicalId)).size,3);});

const kfcDecision={context:{source:{id:'kfc-au',displayName:'stale value'}},choices:[kfc.find(food=>food.name==='Regular Popcorn Chicken')]};
const mcdDecision={context:{source:{id:'mcdonalds-au',displayName:'stale value'}},choices:[mcd.find(food=>food.name==='Big Mac')]};
test('13. KFC provenance comes from the active KFC record',()=>assert.equal(sourceLabel(kfcDecision),'KFC Australia'));
test('14. McDonald’s provenance comes from the active McDonald’s record',()=>assert.equal(sourceLabel(mcdDecision),"McDonald's Australia"));
test('15. McDonald’s-to-KFC switching cannot retain the earlier label',()=>{assert.equal(sourceLabel(mcdDecision),"McDonald's Australia");assert.equal(sourceLabel(kfcDecision),'KFC Australia');});
test('16. KFC-to-McDonald’s switching cannot retain the earlier label',()=>{assert.equal(sourceLabel(kfcDecision),'KFC Australia');assert.equal(sourceLabel(mcdDecision),"McDonald's Australia");});
test('17. Popcorn Chicken provenance contains no McDonald’s label',()=>assert.doesNotMatch(sourceLabel(kfcDecision),/McDonald/i));

test('18. Popcorn Chicken duplicate rendering is reduced to one owner',()=>{const {app,owner}=surfaceState('KFC Popcorn Chicken');assert.equal(owner,'live');assert.equal(Number(!!app.live.innerHTML)+Number(!!app.main.innerHTML),1);});
test('19. generic chips duplicate rendering is reduced to one owner',()=>{const {app}=surfaceState('chips');assert.equal(Number(!!app.live.innerHTML)+Number(!!app.main.innerHTML),1);assert.equal(app.main.classList.contains('result-surface-inactive'),true);});

const answer=(session,label)=>{const option=session.nextQuestion.options.find(item=>item.label===label);assert.ok(option,label);guided.answerDistinction(session,session.nextQuestion.key,option.value);return session;};
const margarine=()=>answer(answer(answer(guided.createSession(portionAudit.afcdFoods,'margarine'),'Monounsaturated'),'Reduced fat'),'Regular salt');
const milk=()=>answer(answer(answer(guided.createSession(portionAudit.afcdFoods,'milk'),'Regular fat'),'Standard lactose'),'Standard');
const biscuit={id:'countable-biscuit',canonicalId:'packaged:countable-biscuit',recordType:'packaged',name:'Countable Biscuit',brand:'Example',market:'AU',country:'Australia',verified:true,verificationStatus:'verified',physicalForm:'countable',defaultAmount:1,defaultUnit:'biscuit',units:{biscuit:1,g:1/15},unitLabels:{biscuit:'Biscuit (15 g)',g:'g'},serving:'1 biscuit (15 g)',nutrients:{calories:60,energyKj:251}};
function consumed(session,measure,amount){guided.selectMeasure(session,measure);guided.selectAmount(session,amount);assert.equal(session.stage,guided.stages.CONFIRMATION);guided.reviewFood(session);return session.consumedPortion;}
test('20. final Margarine Review preserves one teaspoon as 5 g',()=>{const value=consumed(margarine(),'tsp',1);assert.equal(value.amount,1);assert.equal(value.baseQuantity,5);assert.equal(value.baseUnit,'g');});
test('21. final Review preserves an arbitrary 7 g selection',()=>{const value=consumed(margarine(),'g',7);assert.equal(value.amount,7);assert.equal(value.baseQuantity,7);assert.equal(value.baseUnit,'g');});
test('22. final Review preserves a 250 mL selection',()=>{const value=consumed(milk(),'mL',250);assert.equal(value.amount,250);assert.equal(value.baseQuantity,250);assert.equal(value.baseUnit,'mL');});
test('23. final Review preserves two countable items',()=>{const value=consumed(guided.createSession([biscuit],biscuit.name,{intent:{kind:'exact-product'}}),'biscuit',2);assert.equal(value.amount,2);assert.equal(value.baseQuantity,30);assert.equal(value.baseUnit,'g');});

test('24. generic chips retains the generic path without KFC source intent',()=>{const result=decide('chips');assert.notEqual(result.sourceId,'kfc-au');assert.equal(result.kind,'none');assert.equal(search.conceptFromQuery('chips').key,'chips');});
test('25. the final choice renderer has no fixed restaurant provenance',()=>{const finalBlock=runtime.slice(runtime.lastIndexOf('rc5RenderChoiceSurface='),runtime.indexOf('\n\nfunction ps33BrandFamily'));assert.match(finalBlock,/ps33DecisionSourceLabel/);assert.doesNotMatch(finalBlock,/Reviewed McDonald/);});
test('26. counted restaurant selection depends on source metadata and semantic count',()=>{const block=productionFunction('rc5SourceCountedExact');assert.match(block,/context\.source/);assert.match(block,/semanticType==='counted-item'/);assert.match(block,/productSemantics\?\.count/);assert.doesNotMatch(block,/Wicked Wings|Popcorn Chicken|chips/i);});
test('27. KFC counted serving data scales the official six-piece product exactly once',()=>{const food=kfc.find(item=>item.name==='6 Wicked Wings');assert.equal(food.defaultAmount,6);assert.equal(food.defaultUnit,'piece');assert.equal(food.units.piece,1/6);assert.equal(packaged.nutritionForFood(food,{amount:6,unit:'piece'}).energyKj,3259);});
