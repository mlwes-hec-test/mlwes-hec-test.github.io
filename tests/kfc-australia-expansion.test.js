'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const sources=require('../food-sources.js');
const kfc=require('../kfc-au-catalogue.js'),facts=require('../kfc-au-supplement-data.js');
require('../mcdonalds-au-catalogue.js');
const catalogue=require('../food-catalogue.js'),semantics=require('../product-serving-semantics.js'),serving=require('../serving-foundation.js'),guided=require('../guided-product-resolution.js');
const records=sources.foodRecords({sourceId:'kfc-au'}),byName=name=>{const food=records.find(f=>f.name===name);assert(food,name);return food;};
const model=query=>catalogue.submittedResultModel(sources.foodRecords(),query);
function consume(name,unit,amount){const food=byName(name),session=guided.createSession([food],`KFC ${name}`,{intent:{kind:'exact-product'}});guided.selectMeasure(session,unit);guided.selectAmount(session,amount);assert.equal(session.stage,guided.stages.CONFIRMATION);return session;}

test('protected foundation stays intact; the supplement uses one canonical registry',()=>{
  const audit=require('../scripts/audit_kfc_au.js').manifest();assert(audit.hashMatches);assert.equal(kfc.source.inventory.protectedUniqueProducts,126);assert.equal(kfc.source.inventory.menuRows,144);assert.equal(kfc.source.inventory.duplicateMenuAppearances,18);
  assert.equal(records.length,148);assert.equal(catalogue.canonicaliseRecords(records).length,148);assert.equal(new Set(records.map(f=>f.canonicalId)).size,148);
  assert.deepEqual(records.reduce((counts,food)=>{const status=catalogue.productEligibility(food).addability.status;counts[status]=(counts[status]||0)+1;return counts;},{}),{'details-only':61,'needs-nutrition-completion':9,'loggable-now':78});
});
test('every new identity is exact-searchable with official Australian provenance',()=>{
  const names=[...facts.newMenuRows.map(r=>r[0]),...facts.newComponents.map(r=>r.name),...facts.individualRows.map(r=>r[0])];assert.equal(names.length,22);
  for(const name of names){const food=byName(name),product=catalogue.canonicalProduct(food);assert.equal(product.sourceTrust,'official-au-restaurant');assert.equal(product.market,'AU');assert.equal(product.currentState,'listed-at-retrieval');assert(product.sourceReferences.length>1);assert.equal(model(`KFC ${name}`).groups.flatMap(g=>g.items).filter(i=>i.recordId===food.id).length,1,name);}
});
test('reviewed full tables preserve every supplied nutrient and unknown fibre stays absent',()=>{
  const keys=['energyKj','protein','fat','satFat','carbs','sugar','sodium'];
  for(const [name,serve,per100] of facts.nutritionRows){const food=byName(name);assert.equal(food.nutritionStatus,'complete');assert.equal(food.servingWeightG,serve[0]);keys.forEach((key,index)=>{assert.equal(food.nutrients[key],serve[index+1],`${name} ${key}`);assert.equal(food.nutritionPer100[key],per100[index]);});assert(!Object.hasOwn(food.nutrients,'fibre'));assert.equal(food.calorieSource.method,'derived');assert.match(food.nutritionFreshness.nutritionPublishedLabel,/September 2023/);}
});
test('individual pieces retain partial macros and quarantine ambiguous sodium units',()=>{
  for(const [name,weight,serve,per100,sodium,unit] of facts.individualRows){const food=byName(name);assert.equal(food.nutritionStatus,'partial');assert.equal(food.defaultUnit,unit);assert.equal(food.servingWeightG,weight);assert(!Object.hasOwn(food.nutrients,'sodium'));assert(!Object.hasOwn(food.nutritionPer100,'sodium'));assert.deepEqual(food.canonicalEvidence.find(e=>e.unresolvedSodium).unresolvedSodium.values,sodium);assert.equal(food.sourceProvenance.publishedDate,'2025-03-24');}
  const consumed=consume('Chicken Nugget (plain)','nugget',6);assert.equal(consumed.nutrition.energyKj,1050);assert.equal(consumed.nutrition.sodium,null);assert.equal(consumed.nutrition.sugar,0);
});
test('defined orders include their dips without a false individual-piece conversion',()=>{
  for(const [name,order] of Object.entries(facts.standardOrders)){const food=byName(name),profile=serving.servingMeasureProfile(food);assert.deepEqual(profile.measures.map(m=>m.key),['portion']);assert.equal(profile.measures[0].label,order.label);assert.match(serving.amountPrompt(profile.measures[0],food),/Dip/);assert.equal(serving.resolveMeasureRequest(food,'piece',1).ok,false);const consumed=consume(name,'portion',2);assert.equal(consumed.nutrition.energyKj,order.energyKj*2);assert.equal(consumed.consumedPortion.baseUnit,'order');assert.equal(consumed.consumedPortion.baseQuantity,2);}
});
test('whole-order policy is shared and validates an unrelated declared component order',()=>{
  const food=semantics.applyToFood({id:'fixture',name:'Three dumplings and dipping oil',productSemantics:{type:'counted-item',count:3,individualScaling:false,standardOrderLabel:'3 dumplings + dipping oil'},units:{piece:1/3,portion:1},unitLabels:{},defaultAmount:3,defaultUnit:'piece',nutrients:{energyKj:900,calories:215},loggable:true});
  assert.deepEqual(food.units,{portion:1});assert.deepEqual(semantics.validate(food),[]);const broken={...semantics.servingPolicy(food),defaultUnit:'piece'};assert(semantics.validate(food,broken).includes('fixed-order-semantics'));
});
test('unresolved nugget composition blocks ordinary logging before measure or amount',()=>{
  const food=byName('6 Nuggets'),decision=catalogue.productEligibility(food);assert.equal(decision.addability.status,'needs-nutrition-completion');assert.equal(decision.addability.normalLoggingAllowed,false);assert(decision.conflicts.some(c=>c.code==='order-dip-configuration-conflict'&&c.resolution==='unresolved'));
  const session=guided.createSession([food],'KFC 6 Nuggets',{intent:{kind:'exact-product'}});assert.notEqual(session.stage,guided.stages.MEASURE);assert.notEqual(session.stage,guided.stages.AMOUNT);assert.equal(catalogue.canLog(food),false);
  assert.equal(catalogue.productEligibility(byName('Giant Liquid Gold Sauce')).addability.status,'needs-nutrition-completion');assert.equal(byName('Giant Liquid Gold Sauce').nutrients.energyKj,undefined);
});
test('shared family choices preserve count and size neutrality, including family aliases',()=>{
  for(const [query,names] of [['KFC Wicked Wings',['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings']],['KFC Original Recipe',['1 Piece of Chicken','3 Pieces of Chicken','6 Pieces of Chicken','21 Pieces of Chicken']],['KFC chips',['Regular Chips','Large Chips']],['KFC Popcorn Chicken',['Snack Popcorn Chicken','Regular Popcorn Chicken','Maxi Popcorn Chicken']],['KFC Pepsi Max',['Regular Pepsi Max','Large Pepsi Max']]]){const result=model(query);assert.deepEqual(result.groups[0].items.map(i=>i.name),names,query);assert.equal(result.groups[0].key,'restaurant-family',query);assert(!result.groups.some(g=>g.key==='best'&&g.items.some(i=>names.includes(i.name))),query);}
  for(const count of [3,6,10])assert.equal(model(`KFC ${count} Wicked Wings`).groups[0].items[0].name,`${count} Wicked Wings`);
});
test('exact standalone and configurable meal remain different identities and eligibility',()=>{
  assert.equal(model('KFC Zinger Burger').groups[0].items[0].name,'Zinger Burger');const combo=byName('Zinger Burger Combo');assert.notEqual(combo.canonicalId,byName('Zinger Burger').canonicalId);assert.equal(catalogue.productEligibility(combo).addability.status,'details-only');assert.deepEqual(combo.nutrients,{});assert(model('KFC Zinger Burger Combo').groups.flatMap(g=>g.items).some(i=>i.recordId===combo.id));
});
test('an absent explicitly named restaurant food never falls back to another source',()=>{
  const result=model('KFC hash brown');assert.equal(result.total,0);assert(!result.groups.some(g=>g.items.some(i=>/McDonald|Generic/i.test(i.name))));
  const fake={id:'foreign',name:'Hash Brown',brand:'KFC',recordType:'online-candidate',market:'US',nutrients:{calories:100}};assert.equal(catalogue.submittedResultModel([...sources.foodRecords(),fake],'KFC hash brown').total,0);
});
test('a component brand cannot take ownership from an explicitly named restaurant',()=>{
  const query='KFC Large Pepsi Max',intent=catalogue.queryIntent(query);assert.equal(intent.entity.type,'restaurant');assert.equal(intent.productQuery,'large pepsi max');assert(catalogue.explicitIdentityMatch(byName('Large Pepsi Max'),query,intent));
  assert.equal(catalogue.queryIntent("McDonald's Coca-Cola").entity.type,'restaurant');assert.notEqual(catalogue.queryIntent('Pepsi Max').entity?.type,'restaurant');
});
test('all loggable solids have safe natural measures and unknown metrics are never invented',()=>{
  for(const food of records.filter(f=>catalogue.canLog(f))){const profile=serving.servingMeasureProfile(food);assert(profile.measures.length,food.name);if(profile.physicalForm!=='liquid')assert(!profile.measures.some(m=>['mL','L','cup'].includes(m.key)),food.name);if(!food.servingWeightG)assert(!profile.measures.some(m=>['g','kg'].includes(m.key)),food.name);assert.notEqual(food.defaultUnit,'g',food.name);}
});
test('menu disagreement stays explicit and older identities are retained for history',()=>{
  assert.match(facts.findings.menuConflict,/disagree/);for(const name of facts.uncertainPromotions){const food=byName(name);assert.equal(food.currentState,'uncertain');assert.notEqual(food.itemStatus,'retired');}assert.equal(byName('Regular Gravy').nutrients.energyKj,241);assert.equal(byName('3 Pieces of Chicken').nutrients.energyKj,3093);
});
test('rendered mobile KFC acceptance reaches one Review and leaves the disposable Diary unchanged',{timeout:180000},async()=>{
  const report=await require('../scripts/audit_kfc_expansion_edge.js').run({outputDirectory:process.env.HEC_KFC_EXPANSION_OUTPUT});assert.equal(report.pass,true);assert.equal(report.scenarios.length,16);assert.equal(report.diaryUnchanged,true);
});
