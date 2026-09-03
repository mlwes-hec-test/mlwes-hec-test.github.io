'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const catalogue=require('../food-catalogue.js');
const search=require('../search-foundation.js');
const entities=require('../entity-registry.js');
const guided=require('../guided-product-resolution.js');
const serving=require('../serving-foundation.js');
const packaged=require('../packaged-foods.js');
const sources=require('../food-sources.js');
const progressiveAudit=require('../scripts/audit_progressive_food_resolution.js');
require('../mcdonalds-au-catalogue.js');
require('../kfc-au-catalogue.js');

const ROOT=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const kfc=sources.foodRecords({sourceId:'kfc-au'});
const mcd=sources.foodRecords({sourceId:'mcdonalds-au'});

function productionFunction(name){
  const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,`${name} exists`);let brace=-1,paren=0,quote='',escaped=false;
  for(let index=runtime.indexOf('(',start);index<runtime.length;index++){const char=runtime[index];if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote='';continue;}if(char==='"'||char==="'"||char==='`'){quote=char;continue;}if(char==='(')paren++;else if(char===')'&&--paren===0){brace=runtime.indexOf('{',index);break;}}
  let depth=0;quote='';escaped=false;for(let index=brace;index<runtime.length;index++){const char=runtime[index];if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote='';continue;}if(char==='"'||char==="'"||char==='`'){quote=char;continue;}if(char==='{')depth++;else if(char==='}'&&--depth===0)return runtime.slice(start,index+1);}throw new Error(`Could not extract ${name}`);
}

function decisionHarness(){
  const foods=[...progressiveAudit.afcdFoods,...mcd,...kfc],context={foods,catalogue,search,entities,console,window:null,globalThis:null};context.window=context;context.globalThis=context;context.HECFoodSources=sources;context.HECGuidedProductResolution=guided;vm.createContext(context);
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
const decide=decisionHarness();
const answer=(session,label)=>{const choice=session.nextQuestion?.options.find(item=>item.label===label);assert.ok(choice,`${label} offered by ${session.nextQuestion?.key}`);guided.answerDistinction(session,session.nextQuestion.key,choice.value);return session;};
const chipsHot=()=>answer(answer(answer(guided.createSession(progressiveAudit.afcdFoods,'chips'),'Hot Chips'),'Fast-Food Outlet'),'Monounsaturated Oil');
const exactSession=food=>guided.createSession([food],`KFC ${food.name}`,{intent:{kind:'exact-product'}});
const consumed=(session,measure,amount)=>{guided.selectMeasure(session,measure);guided.selectAmount(session,amount);assert.equal(session.stage,guided.stages.CONFIRMATION);return session;};

function sourceInputHarness(){
  const statement=runtime.split(/\r?\n/).find(line=>line.includes("ss633BeginTyping(input);},true"));
  assert.ok(statement,'production restaurant-source input listener exists');
  const controller=runtime.slice(runtime.indexOf('const searchSession633='),runtime.indexOf('function rc6GroupGenericFries'));
  const listeners={},timers=[],document={activeElement:null},input={id:'food-search',value:'',selectionStart:0,selectionEnd:0,blurCount:0,blur(){this.blurCount++;document.activeElement=null;}},context={
    window:{addEventListener(type,handler){listeners[type]=handler;}},document,input,ext:{ui:{}},C8:catalogue,GUIDED_PRODUCTS:guided,
    rc5SearchContext(value){return String(value).toLowerCase().startsWith('kfc')?{source:{id:'kfc-au',displayName:'KFC Australia'}}:{source:null};},rc4SourceOnly:value=>String(value).toLowerCase()==='kfc',
    by:id=>id==='food-search'?input:null,q:()=>null,normalise:catalogue.norm,clearTimeout(){},setTimeout(callback,delay){timers.push({callback,delay});return timers.length;},openModal(){},console
  };
  vm.runInNewContext(`${controller}\n${statement}\nwindow.api={state:()=>({...searchSession633}),intent:ss633Intent};`,context);document.activeElement=input;
  return {input,document,ext:context.ext,api:context.window.api,type(value){input.value=value;input.selectionStart=input.selectionEnd=value.length;listeners.input({target:input});},settle(delay){for(const timer of timers.splice(0))if(timer.delay<=delay)timer.callback();}};
}

test('recognising KFC does not call application blur',()=>{const app=sourceInputHarness();app.type('KFC');assert.equal(app.input.blurCount,0);});
test('KFC remains focused so typing can continue',()=>{const app=sourceInputHarness();app.type('KFC');assert.equal(app.document.activeElement,app.input);});
test('recognition does not commit restaurant browse state',()=>{const app=sourceInputHarness();app.type('KFC');assert.equal(app.ext.ui.foodSourceBrowse,undefined);assert.equal(app.api.state().mode,'typing-preview');});
test('one central search-session controller owns typing state',()=>assert.match(runtime,/HEC_SEARCH_SESSION_TEST/));
for(const delay of [0,250,750,1500])test(`KFC retains focus through a ${delay} ms result delay`,()=>{const app=sourceInputHarness();let query='';for(const char of 'KFC'){query+=char;app.type(query);}app.settle(delay);assert.equal(app.document.activeElement,app.input);assert.equal(app.input.value,'KFC');assert.equal(app.input.selectionStart,3);assert.equal(app.input.selectionEnd,3);assert.equal(app.input.blurCount,0);});
test('the same input DOM node survives character-by-character updates',()=>{const app=sourceInputHarness(),node=app.input;let query='';for(const char of 'KFC 6 Wicked Wings'){query+=char;app.type(query);assert.equal(app.input,node);}assert.equal(app.input.value,'KFC 6 Wicked Wings');assert.equal(app.input.selectionEnd,query.length);});
test('McDonald’s and Flora ProActiv Light remain continuously typeable',()=>{for(const phrase of ["McDonald's",'Flora ProActiv Light']){const app=sourceInputHarness();let value='';for(const char of phrase){value+=char;app.type(value);assert.equal(app.document.activeElement,app.input);}assert.equal(app.input.value,phrase);assert.equal(app.input.blurCount,0);}});
test('explicit source tap is the only source path allowed to dismiss the keyboard',()=>{const inputBlock=runtime.slice(runtime.indexOf("window.addEventListener('input',event=>{const input=event.target;if(input?.id!=='food-search')"),runtime.indexOf("by('food-search')?.addEventListener('focus'")),clickBlock=runtime.slice(runtime.indexOf("const source=event.target.closest?.('[data-rc4-source-browse]')"),runtime.indexOf("if(event.target.closest?.('[data-rc4-clear-source-filter]'))"));assert.doesNotMatch(inputBlock,/\.blur/);assert.match(clickBlock,/ss633Commit\('source-tap'/);assert.match(clickBlock,/\.blur\?\.\(\)/);});
test('recognition preview cannot instantiate Guided Product Resolution',()=>{const block=runtime.slice(runtime.indexOf('const ps33RenderLiveBase='),runtime.indexOf('let psLargeSearchToken='));assert.match(block,/ps33PreviewSource/);assert.match(block,/ps33PreviewFamily/);assert.doesNotMatch(block,/ps34EnsureGuided/);});

test('chips has a data-backed generic schema',()=>assert.equal(guided.genericSchemas.chips.name,'Chips'));
test('chips begins generic progressive resolution',()=>{const session=guided.createSession(progressiveAudit.afcdFoods,'chips');assert.equal(session.genericConcept.name,'Chips');assert.equal(session.stage,guided.stages.IDENTITY);});
test('food family is the first chips question',()=>{const session=guided.createSession(progressiveAudit.afcdFoods,'chips');assert.equal(session.nextQuestion.key,'foodFamily');});
test('chips amount begins blank and no 100 g is committed',()=>{const session=guided.createSession(progressiveAudit.afcdFoods,'hot chips takeaway');assert.equal(session.amount,null);assert.equal(session.selectedMeasure,null);});
test('verified AUSNUT chip measures are available for the matching AFCD row',()=>{const food=progressiveAudit.afcdFoods.find(item=>item.afcdKey==='F007236');assert.ok(food);const keys=serving.servingMeasureProfile(food).measures.map(item=>item.key);assert.ok(keys.includes('smallTakeawayServe'));assert.ok(keys.includes('chip'));});

test('KFC alone is a restaurant source and not an arbitrary product',()=>{const result=decide('KFC');assert.equal(result.kind,'none');assert.equal(result.sourceId,'kfc-au');assert.equal(result.primary,'');});
test('KFC source inventory exposes all 12 categories and 126 products',()=>{const source=sources.getCatalogue('kfc-au').source;assert.equal(source.inventory.browseCategories.length,12);assert.equal(kfc.length,126);assert.equal(new Set(kfc.map(food=>food.canonicalId)).size,126);});
test('KFC product terms remain restricted to authoritative KFC records',()=>{for(const query of ['KFC Wicked Wings','KFC Popcorn Chicken','KFC chips']){const result=decide(query);assert.equal(result.sourceId,'kfc-au');const names=[result.primary,...result.choices].filter(Boolean);assert.ok(names.length);assert.ok(names.every(name=>kfc.some(food=>food.name===name)),query);}});
test('consumer/OFF records cannot masquerade as the KFC restaurant source',()=>{const off={recordType:'online-candidate',brand:'KFC',name:'Corn Chips',foodSourceId:''};assert.notEqual(catalogue.recordType(off),'food-source');assert.equal(off.foodSourceId,'');});
test('Popcorn Chicken without a source infers the unique restaurant family',()=>assert.deepEqual(Array.from(decide('Popcorn Chicken').choices),['Snack Popcorn Chicken','Regular Popcorn Chicken','Maxi Popcorn Chicken']));
for(const count of [3,6,10])test(`KFC ${count} Wicked Wings resolves one official identity`,()=>{const result=decide(`KFC ${count} Wicked Wings`);assert.equal(result.kind,'exact');assert.equal(result.primary,`${count} Wicked Wings`);});
test('KFC Wicked Wings exposes exactly the three committed count choices',()=>assert.deepEqual(Array.from(decide('KFC Wicked Wings').choices),['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings']));
test('KFC Popcorn Chicken exposes Snack, Regular and Maxi sizes',()=>assert.deepEqual(Array.from(decide('KFC Popcorn Chicken').choices),['Snack Popcorn Chicken','Regular Popcorn Chicken','Maxi Popcorn Chicken']));
for(const size of ['Regular','Maxi'])test(`KFC ${size} Popcorn Chicken resolves exact`,()=>assert.equal(decide(`KFC ${size} Popcorn Chicken`).primary,`${size} Popcorn Chicken`));
test('KFC chips exposes only Regular and Large official sizes',()=>assert.deepEqual(Array.from(decide('KFC chips').choices),['Regular Chips','Large Chips']));

test('chips food family and source/context are separate dimensions',()=>assert.deepEqual(guided.genericSchemas.chips.dimensions.slice(0,3).map(item=>item.key),['foodFamily','sourceContext','preparation']));
test('Hot Chips path asks the data-backed source context next',()=>{const session=answer(guided.createSession(progressiveAudit.afcdFoods,'chips'),'Hot Chips');assert.equal(session.nextQuestion.key,'sourceContext');});
test('Packet Chips path is separate and asks its supported flavour',()=>{const session=answer(guided.createSession(progressiveAudit.afcdFoods,'chips'),'Packet Potato Chips / Crisps');assert.equal(session.knownAttributes.sourceContext,'Packaged Snack');assert.equal(session.nextQuestion.key,'flavour');});
test('typed oven-baked preparation skips the redundant question',()=>{const session=guided.createSession(progressiveAudit.afcdFoods,'oven-baked chips');assert.equal(session.knownAttributes.preparation,'Oven-Baked / Roasted');assert.equal(session.stage,guided.stages.MEASURE);});
test('an unsupported air-fried method is not silently mapped',()=>assert.equal(guided.genericSchemaForQuery('air-fried chips'),null));
test('generic chips exposes measure only after exact nutritional identity',()=>{const unresolved=guided.createSession(progressiveAudit.afcdFoods,'chips'),resolved=chipsHot();assert.equal(unresolved.servingProfile,null);assert.ok(resolved.exactNutritionalIdentity);assert.equal(resolved.stage,guided.stages.MEASURE);assert.equal(resolved.selectedMeasure,null);assert.equal(resolved.amount,null);});
test('generic chips grams persist to final Review',()=>{const session=consumed(chipsHot(),'g',125);assert.equal(session.consumedPortion.baseQuantity,125);assert.equal(session.consumedPortion.baseUnit,'g');assert.equal(guided.reviewLabel(session),'125 g');});
test('generic chips AUSNUT chip measure persists to final Review',()=>{const session=consumed(chipsHot(),'chip',2);assert.equal(session.consumedPortion.baseQuantity,7.8);assert.equal(session.consumedPortion.baseUnit,'g');assert.equal(guided.reviewLabel(session),'2 chips (7.8 g)');});
test('generic chips never substitutes a branded online product',()=>{const session=guided.createSession([...progressiveAudit.afcdFoods,{id:'online',recordType:'online-candidate',brand:'KFC',name:'Corn Chips'}],'chips');assert.ok(session.allCandidates.every(food=>food.recordType==='afcd'));});
test('source and data-backed generic typing do not launch racing automatic online searches',()=>{const source=productionFunction('scheduleAllResourcesOnlineSearch');assert.match(source,/rc5SearchContext\(query\)\.source/);assert.match(source,/genericSchemaForQuery/);});
test('stale no-record ownership is retired on query change and exact identity',()=>{assert.match(runtime,/function ss633RetireOwnedError/);assert.match(productionFunction('ss633BeginTyping'),/ss633RetireOwnedError\(\)/);assert.match(productionFunction('ps34SelectGuidedProductChoice'),/exactNutritionalIdentity.*ss633RetireOwnedError/);});

test('KFC Regular Popcorn Chicken final portion is one natural portion',()=>{const food=kfc.find(item=>item.name==='Regular Popcorn Chicken'),session=consumed(exactSession(food),'portion',1);assert.equal(session.consumedPortion.amount,1);assert.equal(session.selectedMeasure.key,'portion');assert.equal(session.nutrition.energyKj,1644);});
test('KFC Maxi Popcorn Chicken final portion is one natural portion',()=>{const food=kfc.find(item=>item.name==='Maxi Popcorn Chicken'),session=consumed(exactSession(food),'portion',1);assert.equal(session.consumedPortion.amount,1);assert.equal(session.nutrition.energyKj,3014);});
test('KFC Regular Chips final portion is one natural portion',()=>{const food=kfc.find(item=>item.name==='Regular Chips'),session=consumed(exactSession(food),'portion',1);assert.equal(session.consumedPortion.amount,1);assert.equal(session.nutrition.energyKj,1186);});
test('one six-piece Wicked Wings portion scales nutrition exactly once',()=>{const food=kfc.find(item=>item.name==='6 Wicked Wings'),session=consumed(exactSession(food),'portion',1);assert.equal(session.consumedPortion.baseQuantity,6);assert.equal(session.consumedPortion.baseUnit,'piece');assert.equal(session.nutrition.energyKj,3259);assert.equal(guided.reviewLabel(session),'1 6-piece portion');});
test('six individual Wicked Wings pieces also scale the identity exactly once',()=>{const food=kfc.find(item=>item.name==='6 Wicked Wings'),session=consumed(exactSession(food),'piece',6);assert.equal(session.consumedPortion.baseQuantity,6);assert.equal(session.nutrition.energyKj,3259);});
test('Big Mac remains one burger with official McDonald’s provenance',()=>{const food=mcd.find(item=>item.name==='Big Mac'),session=consumed(guided.createSession([food],'Big Mac',{intent:{kind:'exact-product'}}),'burger',1);assert.equal(session.nutrition.energyKj,2600);assert.equal(food.sourceDisplayName,"McDonald's Australia");});
test('source switching classifies McDonald’s, KFC and generic chips without bleed',()=>{assert.equal(decide("McDonald's Big Mac").sourceId,'mcdonalds-au');assert.equal(decide('KFC Popcorn Chicken').sourceId,'kfc-au');assert.equal(decide('chips').sourceId,'');assert.equal(decide('KFC 6 Wicked Wings').sourceId,'kfc-au');});

test('control: official KFC snapshot remains 126 unique products without standalone Corn Chips',()=>{assert.equal(kfc.length,126);assert.equal(kfc.some(food=>/^Corn Chips$/i.test(food.name)),false);});
