'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const guided=require('../guided-product-resolution.js');
const semantics=require('../product-serving-semantics.js');
const catalogue=require('../food-catalogue.js');
const serving=require('../serving-foundation.js');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const runtime=read('alpha06.js'),styles=read('styles.css'),index=read('index.html'),worker=read('service-worker.js');
const packaged=(values={})=>({recordType:'packaged',market:'AU',country:'Australia',verified:true,verificationStatus:'verified',defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.1},unitLabels:{serve:'Serve (10 g)',g:'g'},manufacturerServing:{amount:10,unit:'g'},nutrients:{calories:40},...values});
const floraLight=packaged({id:'flora-light',canonicalId:'packaged:flora-light-au',name:'Flora Light',brand:'Flora',aliases:['flora light'],nutrients:{calories:43,energyKj:178}});
const floraPro=packaged({id:'flora-pro',canonicalId:'packaged:flora-proactiv-light-au',name:'Flora ProActiv Light',brand:'Flora',aliases:['flora proactiv light','proactiv light'],nutrients:{calories:37,energyKj:154}});
const floraReference={id:'flora-reference',recordType:'online-candidate',name:'Flora',brand:'Flora',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'Reference per 100 g',nutrients:{calories:400}};
const flora=[floraReference,floraLight,floraPro];
const meadow=[
  packaged({id:'meadow-original',canonicalId:'meadow-original',name:'MeadowLea Original',brand:'MeadowLea',productFamily:'Core Range',variantLabel:'Original'}),
  packaged({id:'meadow-light',canonicalId:'meadow-light',name:'MeadowLea Light',brand:'MeadowLea',productFamily:'Core Range',variantLabel:'Light'}),
  packaged({id:'meadow-pro-light',canonicalId:'meadow-pro-light',name:'MeadowLea Pro Range Light',brand:'MeadowLea',productFamily:'Pro Range',variantLabel:'Light'}),
  packaged({id:'meadow-pro-buttery',canonicalId:'meadow-pro-buttery',name:'MeadowLea Pro Range Buttery',brand:'MeadowLea',productFamily:'Pro Range',variantLabel:'Buttery'})
];
const milk=[
  packaged({id:'milk-full',canonicalId:'milk-full',name:'Dairy Co Full Cream Milk 1 L',brand:'Dairy Co',productFamily:'Milk',fatLevel:'Full Cream',packSize:'1 L',defaultUnit:'mL',defaultAmount:250,units:{mL:.004,cup:1},unitLabels:{mL:'mL',cup:'Cup (250 mL)'},manufacturerServing:{amount:250,unit:'mL'},nutrients:{calories:160}}),
  packaged({id:'milk-skim',canonicalId:'milk-skim',name:'Dairy Co Skim Milk 1 L',brand:'Dairy Co',productFamily:'Milk',fatLevel:'Skim',packSize:'1 L',defaultUnit:'mL',defaultAmount:250,units:{mL:.004,cup:1},unitLabels:{mL:'mL',cup:'Cup (250 mL)'},manufacturerServing:{amount:250,unit:'mL'},nutrients:{calories:90}})
];
const cereal=[packaged({id:'cereal-original',canonicalId:'cereal-original',name:'Grain Co Original Cereal 500 g',brand:'Grain Co',productFamily:'Breakfast Cereal',variantLabel:'Original',packSize:'500 g',defaultAmount:40,defaultUnit:'g',units:{g:.025},unitLabels:{g:'g'},manufacturerServing:{amount:40,unit:'g'},nutrients:{calories:150}}),packaged({id:'cereal-honey',canonicalId:'cereal-honey',name:'Grain Co Honey Cereal 500 g',brand:'Grain Co',productFamily:'Breakfast Cereal',variantLabel:'Honey',packSize:'500 g',defaultAmount:40,defaultUnit:'g',units:{g:.025},unitLabels:{g:'g'},manufacturerServing:{amount:40,unit:'g'},nutrients:{calories:160}})];
const peanut=[packaged({id:'pb-smooth',canonicalId:'pb-smooth',name:'Nut Co Smooth Peanut Butter',brand:'Nut Co',productFamily:'Peanut Butter',texture:'Smooth'}),packaged({id:'pb-crunchy',canonicalId:'pb-crunchy',name:'Nut Co Crunchy Peanut Butter',brand:'Nut Co',productFamily:'Peanut Butter',texture:'Crunchy'})];
const bread=[{id:'bread-white',canonicalId:'bread-white',name:'Baker White Bread',brand:'Baker',productFamily:'Bread',grainType:'White',defaultAmount:1,defaultUnit:'slice',units:{slice:1,g:.025},unitLabels:{slice:'Slice (40 g)',g:'g'},nutrients:{calories:95}},{id:'bread-whole',canonicalId:'bread-whole',name:'Baker Wholemeal Bread',brand:'Baker',productFamily:'Bread',grainType:'Wholemeal',defaultAmount:1,defaultUnit:'slice',units:{slice:1,g:.025},unitLabels:{slice:'Slice (40 g)',g:'g'},nutrients:{calories:90}}];
const yoghurt=[packaged({id:'yoghurt-tub',canonicalId:'yoghurt-tub',name:'Yogo Plain Yoghurt Tub',brand:'Yogo',productFamily:'Yoghurt',productFormat:'Tub',defaultAmount:1,defaultUnit:'tub',units:{tub:1,g:1/170},unitLabels:{tub:'Tub (170 g)',g:'g'},manufacturerServing:{amount:170,unit:'g'},nutrients:{calories:120}}),packaged({id:'yoghurt-pouch',canonicalId:'yoghurt-pouch',name:'Yogo Plain Yoghurt Pouch',brand:'Yogo',productFamily:'Yoghurt',productFormat:'Pouch',defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:1/140},unitLabels:{serve:'Pouch (140 g)',g:'g'},manufacturerServing:{amount:140,unit:'g'},nutrients:{calories:105}})];
const bigMac={id:'big-mac',canonicalId:'mcd:big-mac',name:'Big Mac',brand:"McDonald's",aliases:['big mac','big macs'],productSemantics:{type:'single-item'},defaultAmount:1,defaultUnit:'burger',units:{burger:1},unitLabels:{burger:'Burger'},nutrients:{calories:564}};
const fries=['Small','Medium','Large'].map((size,index)=>({id:`fries-${size}`,canonicalId:`mcd:fries-${size}`,name:`${size} Fries`,brand:"McDonald's",aliases:[`mcdonalds fries`,`${size} maccas fries`],size,productSemantics:{type:'sized-variant',size},defaultAmount:1,defaultUnit:'portion',units:{portion:1},unitLabels:{portion:`${size} Portion`},nutrients:{calories:250+index*100}}));
const bunnings={id:'bunnings',canonicalId:'local:bunnings',name:'Bunnings-Style Sausage In Bread',brand:'Australian Sausage Sizzle Estimate',category:'Meals & Takeaway',country:'Australia',source:'Australian Sausage-Sizzle Estimate — varies by sausage, bread, onion and sauce',ingredients:'Beef sausage, white bread; onion and sauce may be added',productSemantics:{type:'single-item'},foodGroupUnitPolicy:{allowed:false},defaultAmount:1,defaultUnit:'item',units:{item:1,g:1/145,standardServe:75/145},unitLabels:{item:'Sausage in bread',g:'g',standardServe:'Australian Standard Vegetable Serve (75 g)'},nutrients:{calories:285}};
const chiko={id:'chiko',canonicalId:'local:chiko',name:'Chiko Roll',brand:'Chiko',defaultAmount:1,defaultUnit:'roll',units:{roll:1,g:1/162},unitLabels:{roll:'Roll',g:'g'},nutrients:{calories:313}};
const hotcakes={id:'hotcakes',canonicalId:'mcd:hotcakes',name:'Hotcakes with Butter & Syrup',brand:"McDonald's",productSemantics:{type:'complete-meal'},defaultAmount:1,defaultUnit:'meal',units:{meal:1},unitLabels:{meal:'Complete Meal'},nutrients:{calories:595}};
const syrup={id:'syrup',canonicalId:'mcd:syrup',name:'Hotcake Syrup',brand:"McDonald's",productSemantics:{type:'component',parentKey:'hotcakes'},defaultAmount:1,defaultUnit:'serve',units:{serve:1},unitLabels:{serve:'Component Serve'},nutrients:{calories:180}};
const genericFries={id:'afcd-fries',canonicalId:'afcd:fries',recordType:'afcd',afcd:true,name:'Potato Fries, Deep Fried',brand:'Australian Food Composition Database',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'Reference per 100 g',nutrients:{calories:300}};

test('1. brand-family query is not an exact product',()=>{const s=guided.createSession(flora,'Flora');assert.equal(s.resolutionState,guided.states.BRAND_FAMILY);assert.equal(s.exactProduct,null);});
test('2. exact product query resolves one canonical identity',()=>{const s=guided.createSession(flora,'Flora ProActiv Light');assert.equal(s.resolutionState,guided.states.EXACT);assert.equal(s.exactProduct,floraPro);});
test('3. manageable candidate sets present concrete products',()=>{const s=guided.createSession(meadow,'MeadowLea');assert.equal(s.nextQuestion.key,'product');assert.equal(guided.presentationForSession(s),'direct-products');});
test('4. known family words narrow the direct product list',()=>{const s=guided.createSession(meadow,'MeadowLea Pro Range');assert.equal(s.nextQuestion.key,'product');assert.deepEqual(s.nextQuestion.options.map(x=>x.label),['MeadowLea Pro Range Light','MeadowLea Pro Range Buttery']);});
test('5. choosing one canonical product reaches serving measure',()=>{const s=guided.createSession(meadow,'MeadowLea');guided.answerDistinction(s,'product','meadow-pro-light');assert.equal(s.exactProduct.id,'meadow-pro-light');assert.equal(s.stage,guided.stages.MEASURE);});
test('6. back recomputes and permits a different concrete product',()=>{let s=guided.createSession(meadow,'MeadowLea');guided.answerDistinction(s,'product','meadow-pro-light');s=guided.back(s);assert.equal(s.nextQuestion.key,'product');guided.answerDistinction(s,'product','meadow-original');assert.equal(s.exactProduct.id,'meadow-original');});

test('7. Flora enters family resolution',()=>assert.equal(guided.createSession(flora,'Flora').stage,guided.stages.IDENTITY));
test('8. Flora does not preselect 10 g',()=>{const s=guided.createSession(flora,'Flora');assert.equal(s.amount,null);assert.equal(s.selectedMeasure,null);});
test('9. Flora does not preselect 5 g',()=>assert.equal(guided.createSession(flora,'Flora').consumption.explicit,false));
test('10. generic Flora reference is not an exact consumable food',()=>{const s=guided.createSession(flora,'Flora');assert.ok(!s.candidates.includes(floraReference));});
test('11. Flora ProActiv narrows without an unnecessary question',()=>{const s=guided.createSession(flora,'Flora ProActiv');assert.equal(s.exactProduct,floraPro);});
test('12. Flora ProActiv Light becomes one exact product',()=>assert.equal(guided.createSession(flora,'Flora ProActiv Light').exactProduct.canonicalId,'packaged:flora-proactiv-light-au'));
test('13. exact Flora then exposes serving stage',()=>assert.equal(guided.createSession(flora,'Flora ProActiv Light').stage,guided.stages.MEASURE));
test('14. serving stage is separate from product results',()=>{const s=guided.createSession(flora,'Flora');assert.equal(s.servingProfile,null);assert.ok(s.nextQuestion.options.every(option=>!/\b(?:5|10)\s*g\b/i.test(option.label)));});
test('15. 5 g can be chosen after exact identity',()=>{const s=guided.createSession(flora,'Flora ProActiv Light');guided.selectMeasure(s,'g');guided.selectAmount(s,5);assert.equal(s.amount,5);});
test('16. 10 g serving can be chosen after exact identity',()=>{const s=guided.createSession(flora,'Flora ProActiv Light');guided.selectMeasure(s,'serve');guided.selectAmount(s,1);assert.equal(s.stage,guided.stages.CONFIRMATION);});
test('17. Flora nutrition scales correctly',()=>{const s=guided.createSession(flora,'Flora ProActiv Light 5 g');assert.equal(s.nutrition.calories,18.5);assert.equal(s.nutrition.energyKj,77);});
test('18. explicit Flora ProActiv Light 5 g skips resolved stages',()=>{const s=guided.resolveRequest(flora,'Flora ProActiv Light 5 grams');assert.equal(s.stage,guided.stages.CONFIRMATION);assert.equal(s.selectedMeasure.key,'g');});

test('19. one exact product does not appear once per serving basis',()=>{const rows=guided.canonicalizeCandidates([{...floraPro,id:'serve-source',nutritionBasis:{perServing:{calories:37}}},{...floraPro,id:'per100-source',nutritionBasis:{per100:{calories:368}}}]);assert.equal(rows.length,1);assert.equal(rows[0].resolutionAlternates.length,2);});
test('20. conflicting source nutrition stays attached for review without duplicate identity rows',()=>{const rows=guided.canonicalizeCandidates([floraPro,{...floraPro,id:'conflict',nutrients:{calories:40}}]);assert.equal(rows.length,1);assert.equal(rows[0].identityReviewRequired,true);});

test('21. Big Mac exact product bypasses grocery narrowing',()=>{const s=guided.createSession([bigMac],'Big Mac');assert.equal(s.exactProduct,bigMac);assert.equal(s.nextQuestion,null);});
test('22. two Big Macs preserves quantity two',()=>{const s=guided.resolveRequest([bigMac],'two Big Macs');assert.equal(s.stage,guided.stages.CONFIRMATION);assert.equal(s.amount,2);assert.equal(s.selectedMeasure.key,'burger');});
test('23. McDonald’s fries presents the concrete size products directly',()=>{const s=guided.createSession(fries,"McDonald's fries");assert.equal(s.nextQuestion.key,'product');assert.deepEqual(s.nextQuestion.options.map(x=>x.label),['Small Fries','Medium Fries','Large Fries']);});
test('24. Large Macca’s Fries does not ask size again',()=>{const s=guided.resolveRequest(fries,'two Large Maccas Fries');assert.equal(s.exactProduct.name,'Large Fries');assert.equal(s.amount,2);});

test('25. MeadowLea-like family presents real products first',()=>{const s=guided.createSession(meadow,'MeadowLea');assert.equal(s.nextQuestion.key,'product');});
test('26. milk-like family selects a named product before serving',()=>{const s=guided.createSession(milk,'Dairy Co Milk');assert.equal(s.nextQuestion.key,'product');guided.answerDistinction(s,'product','milk-skim');assert.equal(s.stage,guided.stages.MEASURE);});
test('27. cereal-like family selects a named product before serving',()=>{const s=guided.createSession(cereal,'Grain Co Cereal');assert.equal(s.nextQuestion.key,'product');guided.answerDistinction(s,'product','cereal-honey');assert.equal(s.stage,guided.stages.MEASURE);});
test('28. peanut-butter-like family presents named products',()=>assert.equal(guided.createSession(peanut,'Nut Co Peanut Butter').nextQuestion.key,'product'));
test('29. bread resolves a named identity before slice amount',()=>{const s=guided.createSession(bread,'Baker Bread');assert.equal(s.nextQuestion.key,'product');assert.equal(s.amount,null);});
test('30. yoghurt resolves a named identity before tub or grams',()=>{const s=guided.createSession(yoghurt,'Yogo Yoghurt');assert.equal(s.nextQuestion.key,'product');assert.equal(s.servingProfile,null);});

test('31. pack size is identity metadata and never automatic consumption',()=>{const s=guided.createSession([cereal[0]],'Grain Co Original Cereal 500 g');assert.equal(s.servingProfile.packageSize,'500 g');assert.equal(s.amount,null);});
test('32. nutrition reference serving is not automatic user amount',()=>{const s=guided.createSession([floraPro],'Flora ProActiv Light');assert.deepEqual(s.servingProfile.referenceServing,{amount:10,unit:'g'});assert.equal(s.amount,null);});
test('33. measure stage occurs only after exact identity',()=>{assert.equal(guided.createSession(flora,'Flora').servingProfile,null);assert.ok(guided.createSession(flora,'Flora ProActiv Light').servingProfile);});
test('34. amount occurs after measure',()=>{const s=guided.createSession([floraPro],'Flora ProActiv Light');guided.selectAmount(s,5);assert.equal(s.amount,null);guided.selectMeasure(s,'g');guided.selectAmount(s,5);assert.equal(s.amount,5);});
test('35. invalid household measures are not offered',()=>{const p=guided.servingProfile(packaged({id:'plain',name:'Plain Packaged Food',brand:'Brand',units:{serve:1,g:.1},unitLabels:{serve:'Serve',g:'g'}}));assert.ok(!p.measures.some(x=>x.key==='cup'||x.key==='tsp'));});
test('36. grams or mL fallback works only from a defensible per-100 basis',()=>{const g=guided.servingProfile({id:'ref',name:'Reference Food',serving:'Reference per 100 g',nutritionPer100:{calories:100},nutrients:{calories:100}}),none=guided.servingProfile({id:'unknown',name:'Unknown Food',nutrients:{calories:100}});assert.equal(g.measures[0].key,'g');assert.equal(none.measures.length,0);});

test('37. exact product plus quantity and destination reaches confirmation',()=>{const s=guided.createSession([bigMac],'2 Big Macs',{destination:{date:'2026-08-31',meal:'Lunch'}});assert.equal(s.stage,guided.stages.CONFIRMATION);assert.equal(s.destination.meal,'Lunch');});
test('38. brand-only voice-equivalent request enters guided resolution',()=>assert.equal(guided.resolveRequest(flora,'Flora').resolutionState,guided.states.BRAND_FAMILY));
test('39. brand exact variant and measure skips answered questions through the shared voice hook',()=>{const s=guided.resolveRequest(flora,'Flora ProActiv Light 5 g');assert.equal(s.nextQuestion,null);assert.equal(s.stage,guided.stages.CONFIRMATION);assert.match(runtime,/function alpha0634GuidedIntentFood/);assert.match(runtime,/GUIDED_PRODUCTS\.resolveRequest\(allFoods\(\),intent\.foodText/);});

test('40. Bunnings does not regain Vegetable Serve',()=>{const food=serving.applyToFood(structuredClone(bunnings));assert.equal(food.defaultUnit,'item');assert.equal(food.unitLabels.item,'Sausage in bread');assert.doesNotMatch(JSON.stringify(food.unitLabels),/vegetable serve/i);});
test('41. Chiko remains deduplicated',()=>{const mirror={...chiko,id:'mirror'};assert.equal(guided.canonicalizeCandidates([chiko,mirror]).length,1);assert.equal(catalogue.dedupe([chiko,mirror]).length,1);});
test('42. Hotcakes remains complete meal ahead of syrup',()=>{assert.equal(semantics.classify(hotcakes).type,semantics.types.MEAL);assert.ok(catalogue.rank(hotcakes,'Hotcakes').score>catalogue.rank(syrup,'Hotcakes').score);});
test('43. generic Fries remains a 100 g reference',()=>{const s=guided.createSession([genericFries],'Potato Fries Deep Fried');assert.equal(s.servingProfile.sourceDefault.amount,100);assert.equal(s.servingProfile.preferredMeasure,'g');});
test('44. Flora ProActiv Light nutrition remains 37 Cal per 10 g serve',()=>{const s=guided.createSession([floraPro],'Flora ProActiv Light');guided.selectMeasure(s,'serve');guided.selectAmount(s,1);assert.equal(s.nutrition.calories,37);});

test('45. architecture audit separates all five required concepts',()=>{const audit=guided.separationAudit(guided.createSession([cereal[0]],'Grain Co Original Cereal'));assert.deepEqual(audit,{productIdentity:true,servingMeasure:true,amount:true,nutritionBasis:true,packageSize:true});});
test('46. module loads before alpha and is cached offline',()=>{assert.ok(index.indexOf('guided-product-resolution.js')<index.indexOf('alpha06.js'));assert.match(worker,/guided-product-resolution\.js\?v=\$\{VERSION\}/);});
test('47. UI presents identity, measure, amount and review as distinct stages',()=>{for(const text of ['Which exact product?','How are you measuring it?','How much?','Review And Confirm'])assert.match(runtime,new RegExp(text.replace(/[?]/g,'\\?')));});
test('48. responsive guided choices remain bounded at required mobile widths',()=>{assert.match(styles,/guided-resolution-card\{[^}]*max-width:100%/);assert.match(styles,/guided-resolution-choice\{[^}]*min-height:48px/);assert.match(styles,/food-search-compact[\s\S]*?guided-resolution-choice\{min-height:44px/);});
test('49. guided UI exposes Back and Cancel without a trapped modal',()=>{assert.match(runtime,/data-gpr-back/);assert.match(runtime,/data-gpr-cancel/);assert.doesNotMatch(runtime.slice(runtime.indexOf('function ps34GuidedMarkup'),runtime.indexOf('function ps33RenderBrandFamilyLive')),/openModal/);});
test('50. scalability brands exist only in fixtures, not production resolution code',()=>{const moduleSource=read('guided-product-resolution.js');for(const name of ['MeadowLea','Dairy Co','Grain Co','Nut Co','Yogo'])assert.doesNotMatch(moduleSource,new RegExp(name));});
