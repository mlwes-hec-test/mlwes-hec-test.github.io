'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const search=require('../search-foundation.js');
const catalogue=require('../food-catalogue.js');
const serving=require('../serving-foundation.js');
const guided=require('../guided-product-resolution.js');

const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');

test('1. bare Hash Brown has a reusable generic concept',()=>{
  assert.equal(search.conceptFromQuery('Hash Brown')?.key,'hash-brown');
});

test('2. submitted bare generic search ranks the generic concept first',()=>{
  assert.equal(typeof catalogue.submittedResultModel,'function');
  const model=catalogue.submittedResultModel([
    {id:'restaurant',name:'Hash Brown',brand:"McDonald's",foodSourceId:'restaurant-au',recordType:'food-source',market:'AU',verified:true,nutrients:{calories:144}}
  ],'Hash Brown');
  assert.equal(model.groups[0].key,'generic');
  assert.equal(model.groups[0].label,'Generic Food');
  assert.equal(model.groups[0].items[0].kind,'generic-concept');
  assert.equal(model.groups[0].items[0].name,'Hash Brown — Generic');
});

test('3. solid identity quarantines an incompatible source mL measure',()=>{
  const profile=serving.servingMeasureProfile({id:'solid',name:'Frozen potato patty',genericName:'Potato patty',categories:['Frozen potato products'],recordType:'packaged',physicalForm:'solid-countable',units:{mL:.01,g:.01,item:1},unitLabels:{mL:'mL',g:'g',item:'Item'},nutrients:{calories:100}});
  assert.equal(profile.physicalForm,'solid-countable');
  assert.equal(profile.measures.some(item=>item.key==='mL'),false);
  assert.ok(profile.rejectedMeasures.some(item=>item.key==='mL'));
});

test('3a. generic concept metadata outranks malformed source volume inference',()=>{
  const profile=serving.servingMeasureProfile({id:'malformed',name:'Example Hash Brown',recordType:'packaged',units:{mL:.01,g:.01},unitLabels:{mL:'mL',g:'g'},nutrients:{calories:100}});
  assert.equal(profile.physicalForm,'solid-countable');
  assert.equal(profile.measures.some(item=>item.key==='mL'),false);
  assert.ok(profile.rejectedMeasures.some(item=>item.key==='mL'));
});

test('4. composite generic source plan keeps four canonical paths separate',()=>{
  assert.equal(typeof search.sourceContextPlan,'function');
  const plan=search.sourceContextPlan(search.conceptFromQuery('Hamburger'),'Hamburger');
  assert.deepEqual(plan.choices.map(item=>item.key),['home-prepared','ready-to-eat','packaged-frozen','typical']);
});

test('5. purchased frozen and home-prepared are never one guided state',()=>{
  const dimension=guided.genericSchemas.chips.dimensions.find(item=>item.key==='sourceContext');
  assert.equal(dimension.rules.some(rule=>/Frozen \/ Home-Cooked/i.test(rule[0])),false);
  assert.ok(dimension.rules.some(rule=>rule[0]==='Home-Prepared'));
  assert.ok(dimension.rules.some(rule=>rule[0]==='Purchased Packaged / Frozen'));
});

test('6. answer history wraps readable labels at phone width',()=>{
  assert.match(styles,/\.guided-resolution-answer-summary\{[^}]*flex-wrap:wrap/);
  assert.doesNotMatch(styles,/\.guided-resolution-answer-summary b\{[^}]*text-overflow:ellipsis/);
});

test('7. main food search exposes semantic form and visible submit control',()=>{
  assert.match(html,/<form[^>]+id="food-search-form"[^>]+role="search"/);
  assert.match(html,/id="food-search"[^>]+enterkeyhint="search"/);
  assert.match(html,/id="submit-food-search"[^>]+aria-label="Search foods"/);
});

test('8. deliberate measure selection focuses the newly rendered amount field',()=>{
  assert.match(runtime,/data-gpr-measure[\s\S]{0,1800}ps34FocusAmountEntry/);
  assert.match(runtime,/function ps34FocusAmountEntry\(/);
});

test('9. written variant count resolves like a digit without multiplying consumption',()=>{
  assert.equal(typeof search.parseQuantityLanguage,'function');
  const result=search.parseQuantityLanguage('six Wicked Wings',{candidates:[{name:'6 Wicked Wings',productSemantics:{count:6},semanticType:'counted-item'}]});
  assert.equal(result.productVariantCount,6);
  assert.equal(result.consumedQuantity,1);
  assert.equal(result.identityQuery,'6 wicked wings');
});

test('10. consumed quantity remains separate from a counted product variant',()=>{
  const result=search.parseQuantityLanguage('two six-piece Wicked Wings',{candidates:[{name:'6 Wicked Wings',productSemantics:{count:6},semanticType:'counted-item'}]});
  assert.equal(result.productVariantCount,6);
  assert.equal(result.consumedQuantity,2);
  assert.equal(result.identityQuery,'6 wicked wings');
});

test('11. unfinished prefixes cannot claim the best-match slot',()=>{
  const model=catalogue.submittedResultModel([{id:'r',name:'Hash Brown',brand:"McDonald's",foodSourceId:'mcdonalds-au',recordType:'food-source',market:'AU',verified:true,nutrients:{calories:144}}],'Hash Bro');
  assert.notEqual(model.groups[0]?.key,'best');
});

test('12. a strong exact product submission leads with Best match',()=>{
  const model=catalogue.submittedResultModel([{id:'p',name:'McCain Hash Browns',brand:'McCain',recordType:'packaged',market:'AU',verified:true,nutrients:{calories:130}}],'McCain Hash Browns');
  assert.equal(model.groups[0].key,'best');
  assert.equal(model.groups[0].items[0].recordId,'p');
});

test('13. simple whole foods can skip source branching',()=>{
  assert.equal(search.sourceContextPlan(search.conceptFromQuery('banana'),'banana').choices.length,0);
});

test('14. submitted groups are immutable snapshots',()=>{
  const source={id:'x',name:'Pizza',recordType:'afcd',market:'AU',nutrients:{calories:200}};
  const model=catalogue.submittedResultModel([source],'Pizza');
  assert.equal(Object.isFrozen(model),true);
  assert.equal(Object.isFrozen(model.groups),true);
  source.name='Changed later';
  assert.notEqual(model.groups.flatMap(group=>group.items).find(item=>item.food)?.food.name,'Changed later');
});

test('15. stale asynchronous work loses ownership after a new preview',()=>{
  const state=catalogue.newUniversalSearchSession();
  catalogue.previewUniversalSearch(state,'pizza');
  catalogue.commitUniversalSearch(state,[],'search-button');
  const ticket={...state.ownedAsync};
  catalogue.previewUniversalSearch(state,'sausage roll');
  assert.equal(catalogue.ownsUniversalAsync(state,ticket),false);
});

test('16. decimal, common fraction and written mixed quantities share one parser',()=>{
  assert.equal(search.parseQuantityLanguage('1.75 servings pizza').consumedQuantity,1.75);
  assert.equal(search.parseQuantityLanguage('1/2 cup milk').consumedQuantity,.5);
  assert.equal(search.parseQuantityLanguage('one and a half serves soup').consumedQuantity,1.5);
  assert.equal(search.parseQuantityLanguage('three quarters cup milk').consumedQuantity,.75);
  assert.equal(search.parseQuantityLanguage('half a serving soup').productVariantCount,null);
});

test('17. quantity may follow the food phrase and dozen is explicit',()=>{
  assert.equal(search.parseQuantityLanguage('hash browns three').consumedQuantity,3);
  const dozen=search.parseQuantityLanguage('dozen eggs');
  assert.equal(dozen.consumedQuantity,12);
  assert.equal(dozen.consumedUnit,'egg');
});

test('18. an exact product-name count is identity metadata, not consumption',()=>{
  const result=search.parseQuantityLanguage('Birds Eye Hash Browns 6 Crispy & Golden',{candidates:[{name:'Hash Browns 6 Crispy & Golden',brand:'Birds Eye'}]});
  assert.equal(result.packageNameCount,6);
  assert.equal(result.quantityExplicit,false);
  assert.equal(result.consumedQuantity,1);
});

test('19. exact candidate context separates prefixed consumed count and variant count',()=>{
  const candidates=[{name:'6 Wicked Wings',productSemantics:{count:6},semanticType:'counted-item'}];
  const result=search.parseQuantityLanguage('Two KFC 6 Wicked Wings',{candidates});
  assert.equal(result.identityQuery,'kfc 6 wicked wings');
  assert.equal(result.productVariantCount,6);
  assert.equal(result.consumedQuantity,2);
});

test('20. explicit solid form wins over a malformed source volume',()=>{
  const profile=serving.servingMeasureProfile({id:'solid-2',name:'Reviewed savoury item',physicalForm:'solid-weight',units:{g:.01,mL:.01},unitLabels:{g:'g',mL:'mL'},nutrients:{calories:100}});
  assert.ok(profile.measures.some(item=>item.key==='g'));
  assert.equal(profile.measures.some(item=>item.key==='mL'),false);
  assert.ok(profile.rejectedMeasures.some(item=>item.key==='mL'));
});

test('21. liquid, spread and sliced forms retain compatible measure families',()=>{
  const liquid=serving.servingMeasureProfile({id:'l',name:'Reviewed drink',physicalForm:'liquid',units:{mL:.01},unitLabels:{mL:'mL'},nutrients:{calories:40}});
  const sliced=serving.servingMeasureProfile({id:'s',name:'Reviewed sliced food',physicalForm:'sliced',units:{slice:1,g:.02},unitLabels:{slice:'Slice',g:'g'},nutrients:{calories:80}});
  assert.ok(liquid.measures.some(item=>item.key==='mL'));
  assert.ok(sliced.measures.some(item=>item.key==='slice'));
});

test('22. source plans expose stable route metadata',()=>{
  const plan=search.sourceContextPlan(search.conceptFromQuery('Pizza'),'Pizza');
  assert.deepEqual(plan.choices.map(choice=>choice.route),['recipe-or-generic','verified-restaurant','brand-barcode-panel','safe-generic']);
});

test('23. ordinary technical source questions provide a Not Sure path',()=>{
  const source=guided.genericSchemas.chips.dimensions.find(item=>item.key==='sourceContext');
  const oil=guided.genericSchemas.chips.dimensions.find(item=>item.key==='oilType');
  assert.equal(source.allowNotSure,true);
  assert.equal(oil.allowNotSure,true);
});

test('24. the controller records universal destination, source and preparation state',()=>{
  assert.match(runtime,/suppliedSourceWords/);
  assert.match(runtime,/suppliedPreparationWords/);
  assert.match(runtime,/searchSession633\.destination/);
  assert.match(runtime,/ownsUniversalAsync/);
});

test('25. search and amount controls retain visible touch-sized responsive rules',()=>{
  assert.match(styles,/\.resource-search #submit-food-search\{[^}]*min-height:40px/);
  assert.match(styles,/\.guided-resolution-choice\{[^}]*min-height:48px/);
  assert.match(styles,/@media\(max-width:520px\)[\s\S]*\.universal-source-choices\{grid-template-columns:1fr/);
});

test('26. supplied generic source words keep a generic route and mark it direct',()=>{
  const model=catalogue.submittedResultModel([],'homemade hash brown');
  const item=model.groups[0].items[0];
  assert.equal(item.kind,'generic-concept');
  assert.equal(item.sourcePlan.explicitSource,'home');
  assert.match(runtime,/home:'home-prepared'/);
});

test('27. delayed online results append a labelled group without reordering primary results',()=>{
  const local=catalogue.submittedResultModel([{id:'local',name:'Pizza',recordType:'afcd',market:'AU',nutrients:{calories:200}}],'Pizza');
  const primary=local.groups[0];
  const appended=catalogue.appendSubmittedOnline(local,[{id:'online',name:'Pizza Supreme',brand:'Example',recordType:'online-candidate',market:'AU',nutrients:{calories:220}}]);
  assert.equal(appended.groups[0],primary);
  assert.equal(appended.groups.at(-1).key,'online');
  assert.equal(appended.groups.at(-1).label,'Online packaged results');
  assert.equal(Object.isFrozen(appended),true);
});

test('28. committed universal results guard the legacy asynchronous renderer',()=>{
  assert.match(runtime,/us633LargeRenderBase=psLargeRender/);
  assert.match(runtime,/explicit-committed'[\s\S]{0,140}submittedModel[\s\S]{0,80}return/);
});

test('29. online completion appends its group without replacing primary result nodes',()=>{
  assert.match(runtime,/function us633AppendOnlineGroup\(/);
  assert.match(runtime,/insertAdjacentHTML\('beforeend',markup\)/);
  assert.match(runtime,/appendSubmittedOnline[\s\S]{0,180}us633AppendOnlineGroup\(\)/);
});

test('30. repeated legacy render requests preserve the owned committed surface',()=>{
  assert.match(runtime,/const owns=searchSession633\.mode==='explicit-committed'/);
  assert.match(runtime,/universal-search-submitted,.universal-source-branch/);
  assert.match(runtime,/if\(stable\)return;us633RenderLibraryBase/);
});

test('31. pointer activation survives a legacy focus render without making scroll gestures select',()=>{
  assert.match(runtime,/us633PendingPointer=\{control,pointerId/);
  assert.match(runtime,/addEventListener\('pointerup'[\s\S]{0,420}Math\.hypot[\s\S]{0,240}us633ActivateControl/);
  assert.match(runtime,/addEventListener\('pointercancel'[\s\S]{0,80}us633PendingPointer=null/);
});

test('32. valid custom decimal amounts stay exact in the review label',()=>{
  const profile=serving.servingMeasureProfile({id:'spread',name:'Reviewed spread',physicalForm:'spread',units:{tsp:.05,g:.01},unitLabels:{tsp:'Teaspoon',g:'g'},nutrients:{calories:100}});
  const teaspoon=profile.measures.find(item=>item.key==='tsp');
  assert.match(serving.formatPortionAmount(teaspoon,1.75),/^1\.75 teaspoons/);
});

test('33. amount typing and quick amounts update one live nutrition preview',()=>{
  assert.match(runtime,/data-gpr-amount-preview/);
  assert.match(runtime,/function ps34UpdateAmountPreview\(/);
  assert.match(runtime,/Nutrition preview/);
  assert.match(runtime,/quick\.dataset\.gprQuickAmount[\s\S]{0,180}new Event\('input'/);
});

test('34. simple whole foods bypass source branching instead of opening an empty chooser',()=>{
  const model=catalogue.submittedResultModel([],'banana');
  const generic=model.groups[0].items[0];
  assert.equal(generic.sourcePlan.choices.length,0);
  assert.match(runtime,/direct=!choices\.length\?'typical'/);
});

test('35. exact result rows expose usable versus incomplete nutrition status',()=>{
  assert.match(runtime,/Nutrition available · choose an amount/);
  assert.match(runtime,/Incomplete or identity-only · review before Diary/);
});

test('36. fraction words in an exact product name remain identity language',()=>{
  const parsed=search.parseQuantityLanguage('Quarter Pounder',{candidates:[{name:'Quarter Pounder'}]});
  assert.equal(parsed.identityQuery,'quarter pounder');
  assert.equal(parsed.quantityExplicit,false);
  assert.equal(parsed.consumedQuantity,1);
  assert.equal(parsed.packageNameCount,null);
});

test('37. packaged catalogue arrivals append inside the owned packaged branch',()=>{
  assert.match(runtime,/function us633AppendPackagedRecords\(/);
  assert.match(runtime,/data-universal-packaged-online/);
  assert.match(runtime,/sourceContext\?\.sourceKey==='packaged-frozen'\)us633AppendPackagedRecords/);
});
