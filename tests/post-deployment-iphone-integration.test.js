'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const search=require('../search-foundation.js');
const catalogue=require('../food-catalogue.js');
const serving=require('../serving-foundation.js');
const guided=require('../guided-product-resolution.js');
const packaged=require('../packaged-foods.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
require('../kfc-au-catalogue.js');

const ROOT=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const STATUS={LOGGABLE:'loggable-now',COMPLETION:'needs-nutrition-completion',DETAILS:'details-only'};

const complete=(overrides={})=>({id:'complete',name:'Complete Product',brand:'Example',recordType:'packaged',market:'AU',verificationStatus:'verified',physicalForm:'solid-weight',defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.01},unitLabels:{serve:'Manufacturer serve (100 g)',g:'g'},manufacturerServing:{amount:100,unit:'g'},nutrients:{calories:200,energyKj:837,protein:5,carbs:30,fat:6},...overrides});
const incomplete=(overrides={})=>({id:'incomplete',name:'Incomplete Product',brand:'Example',recordType:'online-candidate',market:'AU',barcode:'9300000000001',physicalForm:'solid-weight',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},nutrients:{calories:null,protein:null},verificationStatus:'recognised-only',recognisedOnly:true,...overrides});

test('A01 central addability exposes semantic statuses and reason codes',()=>{
  assert.equal(typeof serving.evaluateAddability,'function');
  assert.deepEqual(Object.values(serving.addabilityStatuses),Object.values(STATUS));
  const value=serving.evaluateAddability(complete());
  assert.equal(value.status,STATUS.LOGGABLE);
  assert.match(value.reasonCode,/^[a-z0-9-]+$/);
});

test('A02 incomplete packaged and barcode identities are classified before portion entry',()=>{
  for(const food of [incomplete(),incomplete({id:'saved',recordType:'private',private:true}),incomplete({id:'barcode',recordType:'packaged'})]){
    const value=serving.evaluateAddability(food);
    assert.equal(value.status,STATUS.COMPLETION,food.id);
    assert(value.actions.some(action=>action.id==='nutrition-panel'));
    assert(value.actions.some(action=>action.id==='manual-nutrition'));
  }
});

test('A03 configurable and non-loggable detail identities never receive the normal logging contract',()=>{
  const food={id:'configurable',name:'Configurable Meal',foodSourceId:'restaurant-au',recordType:'food-source',productSemantics:{type:'configurable-bundle',confidence:'high'},nutritionStatus:'configurable',loggable:false,units:{bundle:1},unitLabels:{bundle:'Bundle'},nutrients:{calories:null}};
  const value=serving.evaluateAddability(food);
  assert.equal(value.status,STATUS.DETAILS);
  assert.equal(value.normalLoggingAllowed,false);
});

test('A04 every supported source route converges on the same central loggable decision',()=>{
  for(const recordType of ['afcd','packaged','online-candidate','food-source','private']){
    const food=complete({id:`route-${recordType}`,recordType,...(recordType==='food-source'?{foodSourceId:'fixture-au'}:{}),...(recordType==='private'?{private:true}: {})});
    assert.equal(serving.evaluateAddability(food).status,STATUS.LOGGABLE,recordType);
  }
});

test('A05 guided identity hydration applies addability before ordinary measure and amount entry',()=>{
  const session=guided.createSession([incomplete()],'Example Incomplete Product',{intent:{kind:'exact-product'}});
  assert.equal(session.addability.status,STATUS.COMPLETION);
  assert.equal(session.stage,guided.stages.IDENTITY);
  assert.equal(session.selectedMeasure,null);
  assert.equal(session.amount,null);
});

test('M01 a per-100-g basis adds safe grams without deleting a manufacturer serving',()=>{
  const food=complete({units:{serve:1},unitLabels:{serve:'Manufacturer serve (75 g)'},manufacturerServing:{amount:75,unit:'g'},nutritionPer100:{calories:220},nutritionPer100Unit:'g'});
  const profile=serving.servingMeasureProfile(food);
  assert(profile.measures.some(measure=>measure.key==='serve'));
  assert(profile.measures.some(measure=>measure.key==='g'));
});

test('M02 equivalent restaurant natural and manufacturer measures merge centrally',()=>{
  const food={id:'burger',name:'Example Burger',foodSourceId:'restaurant-au',recordType:'food-source',market:'AU',physicalForm:'restaurant-serving',productSemantics:{type:'single-item',confidence:'high'},defaultAmount:1,defaultUnit:'burger',units:{burger:1,serve:1},unitLabels:{burger:'Burger',serve:'Manufacturer serve'},nutrients:{calories:500}};
  const profile=serving.servingMeasureProfile(food);
  assert.deepEqual(profile.measures.map(measure=>measure.key),['burger']);
});

test('M03 genuinely different counted units and whole orders remain distinct',()=>{
  const food=sources.foodRecords({sourceId:'kfc-au'}).find(item=>item.name==='10 Wicked Wings');
  const profile=serving.servingMeasureProfile(food);
  assert.deepEqual(profile.measures.map(measure=>measure.key),['piece','portion']);
  assert.deepEqual(profile.measures.map(measure=>measure.conversionToBase.baseQuantity),[1,10]);
});

test('M04 one meaningful measure auto-selects and opens amount; multiple measures still ask',()=>{
  const bigMac=sources.foodRecords({sourceId:'mcdonalds-au'}).find(food=>food.name==='Big Mac');
  const single=guided.createSession([bigMac],'Big Mac',{intent:{kind:'exact-product'}});
  assert.equal(single.stage,guided.stages.AMOUNT);
  assert.equal(single.selectedMeasure.key,'burger');
  assert.equal(single.measureAutoSelected,true);
  const wings=sources.foodRecords({sourceId:'kfc-au'}).find(food=>food.name==='10 Wicked Wings');
  const multiple=guided.createSession([wings],wings.name,{intent:{kind:'exact-product'}});
  assert.equal(multiple.stage,guided.stages.MEASURE);
  assert.equal(multiple.selectedMeasure,null);
});

test('M05 counted prompts distinguish an individual unit from a full order',()=>{
  const wings=sources.foodRecords({sourceId:'kfc-au'}).find(food=>food.name==='10 Wicked Wings');
  const session=guided.createSession([wings],wings.name,{intent:{kind:'exact-product'}});
  guided.selectMeasure(session,'piece');
  assert.match(guided.amountPrompt(session),/individual wings/i);
  guided.back(session);guided.selectMeasure(session,'portion');
  assert.match(guided.amountPrompt(session),/10-wing orders/i);
});

test('F01 amount completion hands directly to the one final Review screen',()=>{
  assert.match(runtime,/function ps34OpenFinalReview\(/);
  assert.doesNotMatch(runtime,/Ready for review/);
  assert.doesNotMatch(runtime,/Review And Confirm/);
  assert.match(runtime,/selectAmount[\s\S]{0,500}ps34OpenFinalReview/);
});

test('F02 Back from an auto-selected measure cannot create a one-choice dead end',()=>{
  const bigMac=sources.foodRecords({sourceId:'mcdonalds-au'}).find(food=>food.name==='Big Mac');
  const session=guided.createSession([bigMac],'Big Mac',{intent:{kind:'exact-product'}});
  guided.back(session);
  assert.notEqual(session.stage,guided.stages.MEASURE);
  assert.equal(session.restoreSearchRequested,true);
});

test('Q01 reusable compound normalisation makes whole meal and wholemeal equivalent',()=>{
  assert.equal(search.normaliseIntent('whole meal bread'),search.normaliseIntent('wholemeal bread'));
  assert.equal(catalogue.corrected('whole meal bread'),catalogue.corrected('wholemeal bread'));
});

test('Q02 bare milk skips irrelevant source/location branching and retains identity facets',()=>{
  const concept=search.conceptFromQuery('milk');
  assert.equal(search.sourceContextPlan(concept,'milk').choices.length,0);
  assert.deepEqual(guided.genericSchemas.milk.dimensions.map(item=>item.key),['milkSource','fatLevel','lactose','flavour']);
});

test('R01 generic intent keeps a trusted complete reference above incomplete products',()=>{
  const generic={id:'milk-afcd',afcd:true,afcdKey:'F-MILK',recordType:'afcd',name:'Milk, cow, fluid, regular fat',brand:'Australian Food Composition Database',market:'AU',verified:true,physicalForm:'liquid',units:{mL:.01},unitLabels:{mL:'mL'},nutrients:{calories:64}};
  const model=catalogue.submittedResultModel([incomplete({id:'milk-incomplete',name:'Milk',brand:'Weak Brand'}),generic],'milk');
  assert.equal(model.groups[0].key,'generic');
  const exactGroups=model.groups.filter(group=>group.key!=='generic');
  assert.equal(exactGroups[0].items[0].recordId,'milk-afcd');
  assert.equal(model.groups.find(group=>group.key==='completion').items[0].recordId,'milk-incomplete');
});

test('R02 explicit complete branded identity retains Best match',()=>{
  const model=catalogue.submittedResultModel([complete({id:'brand-product',name:'Example Complete Product'})],'Example Complete Product');
  assert.equal(model.groups[0].key,'best');
  assert.equal(model.groups[0].items[0].addability.status,STATUS.LOGGABLE);
});

test('R03 unsized restaurant families expose neutral direct variants before configurable meals',()=>{
  const rows=sources.foodRecords({sourceId:'kfc-au'}).filter(food=>/Wicked Wings/.test(food.name));
  const family=rows.filter(food=>food.choiceFamily==='wicked-wings').sort((a,b)=>a.choiceOrder-b.choiceOrder);
  assert.deepEqual(family.map(food=>food.name),['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings']);
  assert(family.every(food=>food.productSemantics.type==='counted-item'));
  assert(rows.filter(food=>/Combo/.test(food.name)).every(food=>!food.choiceFamily&&food.productSemantics.type==='configurable-bundle'));
  const submitted=catalogue.submittedResultModel(rows,'KFC Wicked Wings');
  assert.equal(submitted.groups[0].key,'restaurant-family');
  assert.deepEqual(submitted.groups[0].items.map(item=>item.name),family.map(food=>food.name));
  assert(!submitted.groups.some(group=>group.key==='best'));
});

test('R04 identity-weak shells cannot outrank a specific loggable product',()=>{
  const weak=complete({id:'weak-shell',name:'Beurre',brand:'Meadow Lea'}),specific=complete({id:'specific-product',name:'Meadowlea Original Canola Butter',brand:'Meadow Lea'});
  const model=catalogue.submittedResultModel([weak,specific],'Meadow Lea');
  assert.equal(model.groups[0].key,'best');
  assert.equal(model.groups[0].items[0].recordId,'specific-product');
  assert.equal(model.groups.find(group=>group.key==='details').items[0].recordId,'weak-shell');
});

test('O01 exact GTIN duplicates retain the strongest complete Australian representative',()=>{
  const weak=incomplete({id:'weak',barcode:'9300000000999',name:'Duplicate Product',market:'international'}),strong=complete({id:'strong',barcode:'9300000000999',name:'Duplicate Product',verified:true});
  assert.equal(catalogue.dedupe([weak,strong])[0],strong);
});

test('O02 an online append cannot duplicate an existing canonical product',()=>{
  const local=complete({id:'local',barcode:'9300000000888',name:'Same Product'}),online={...local,id:'online',recordType:'online-candidate',verified:false};
  const initial=catalogue.submittedResultModel([local],'Same Product'),next=catalogue.appendSubmittedOnline(initial,[online]);
  assert.equal(next.total,initial.total);
  assert.equal(next.groups.some(group=>group.key==='online'),false);
});

test('O03 provenance display parts are canonical and never repeat brand/source text',()=>{
  const kfc=sources.foodRecords({sourceId:'kfc-au'}).find(food=>food.name==='3 Wicked Wings');
  assert.deepEqual(catalogue.provenanceParts(kfc),['KFC Australia']);
});

test('U01 missing nutrient values remain null through scaling and display contracts',()=>{
  const values=packaged.scale({calories:100,protein:null,waterMl:null},.5);
  assert.equal(values.protein,null);
  assert.match(runtime,/function availableValueText\(/);
  assert.doesNotMatch(runtime,/waterMl:food\.waterMl\|\|0/);
  assert.doesNotMatch(runtime,/Estimated water:<\/strong> \$\{formatNumber\(food\.waterMl\)\}/);
});

test('U02 the production search control stays compact and conventional at narrow widths',()=>{
  assert.match(html,/id="food-search"[^>]+placeholder="Search foods, meals and recipes"/);
  assert.match(html,/id="submit-food-search"[^>]+type="submit"/);
  assert.match(html,/id="clear-food-search"[^>]+aria-label="Clear search"/);
  assert.match(styles,/@media\(max-width:520px\)[\s\S]*\.resource-search>span\{display:none/);
  assert.match(styles,/\.resource-search #clear-food-search\{[^}]*min-width:44px[^}]*min-height:44px/);
});

test('U03 floating create control and sticky Review footer cannot cover active flow content',()=>{
  assert.match(styles,/#food-library:has\(\.universal-search-submitted/);
  assert.match(styles,/--hec-entry-footer-height/);
  assert.match(runtime,/function syncEntryFooterInset\(/);
  assert.match(runtime,/ResizeObserver/);
});

test('U04 responsive acceptance matrix names 320, 375, 390, 430 and a wider control',()=>{
  const audit=fs.readFileSync(path.join(ROOT,'scripts','audit_physical_form_responsive.js'),'utf8');
  for(const width of [320,375,390,430,834])assert.match(audit,new RegExp(`width:${width}\\b`));
});

test('U05 an already loaded catalogue snapshot joins Search and remains selectable',()=>{
  assert.match(runtime,/const loadedCatalogue=psLargeState&&C8\?\.corrected\?\.\(psLargeState\.query\)===C8\?\.corrected\?\.\(raw\)/);
  assert.match(runtime,/getFood\(control\.dataset\.universalResult\)\|\|window\.HECOpenFoodFactsAU\?\.getLoaded/);
  assert.match(runtime,/data-gpr-catalogue-product/);
});
