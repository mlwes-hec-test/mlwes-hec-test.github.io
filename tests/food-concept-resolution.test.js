'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const search=require('../search-foundation.js'),catalogue=require('../food-catalogue.js'),serving=require('../serving-foundation.js');
const {afcdFoods}=require('../scripts/audit_progressive_food_resolution.js');
const sources=require('../food-sources.js');require('../mcdonalds-au-catalogue.js');require('../kfc-au-catalogue.js');
const food=name=>({name,recordType:'packaged'});
const candidatePool=query=>{const intent=search.interpretFoodIntent(query);return {intent,records:afcdFoods.filter(record=>search.conceptCompatibility(record,intent).compatible)};};

test('base bread asks origin, then supported bread types',()=>{
  const {intent,records}=candidatePool('Bread');assert.equal(search.nextConceptQuestion(intent,records).key,'breadOrigin');intent.known.breadOrigin='home';const question=search.nextConceptQuestion(intent,records);
  assert.equal(question.question,'What type of bread?');
  for(const value of ['White','Wholemeal','Multigrain / seeded','Rye','Sourdough','Gluten-free','Low-GI / high-fibre / speciality'])assert(question.options.some(option=>option.value===value),value);
});
test('compound bread identities cannot compete with ordinary bread',()=>{
  for(const name of ['Bunnings-Style Sausage In Bread','Banana Bread','Bread, banana, commercial','Garlic Bread','Bread, garlic or herb, homemade, cooked','Crispbread','Bread rolls','Flatbread'])assert.equal(search.conceptCompatibility(food(name),'bread').compatible,false,name);
});
test('whole meal spelling and supplied white/wholemeal facets agree',()=>{
  for(const [query,value] of [['whole meal bread','Wholemeal'],['wholemeal bread','Wholemeal'],['white bread','White']]){
    const {intent,records}=candidatePool(query);assert.equal(intent.known.breadType,value);assert(records.length);assert.notEqual(search.nextConceptQuestion(intent,records)?.key,'breadType');
  }
});
test('quantity, food identity and supplied bread type remain separate',()=>{
  const intent=search.interpretFoodIntent('2 slices wholemeal bread');assert.equal(intent.conceptId,'bread');assert.equal(intent.generic,true);assert.equal(intent.known.breadType,'Wholemeal');assert.equal(intent.quantity.consumedQuantity,2);assert.equal(intent.quantity.consumedUnit,'slice');
});
test('milk source is unresolved before cow, oat and other source choices',()=>{
  const {intent,records}=candidatePool('Milk'),question=search.nextConceptQuestion(intent,records);assert.equal(intent.known.milkSource,undefined);assert.equal(question.key,'milkSource');
  for(const value of ['Cow','Oat','Almond','Rice','Soy'])assert(question.options.some(option=>option.value===value));
  assert(!records.some(record=>/human|breast|^Milk, cow, powder|condensed|evaporated/i.test(record.name)));
});
test('milk compounds are excluded while genuine chocolate flavoured milk remains fluid milk',()=>{
  for(const name of ['Milk Chocolate','Milkshake','Milk chocolate biscuit','Goat milk formula','Milk, human/breast, mature, fluid','Goat’s Milk Cheese Slices'])assert.equal(search.conceptCompatibility(food(name),'milk').compatible,false,name);
  assert(search.conceptCompatibility(food('Chocolate flavoured cow milk'),'milk').compatible);
});
test('plant source queries never acquire cow fat/lactose questions',()=>{
  for(const query of ['Oat milk','Almond milk','Rice milk','Soy milk']){const {intent,records}=candidatePool(query),question=search.nextConceptQuestion(intent,records);assert(records.length,query);assert(!['milkSource','fatLevel','lactose'].includes(question?.key),query);}
});
test('cow source and milk fat/lactose intent are preserved independently',()=>{
  const cow=candidatePool('Cow milk');assert.equal(search.nextConceptQuestion(cow.intent,cow.records).key,'fatLevel');
  assert.equal(search.interpretFoodIntent('Skim milk').known.fatLevel,'Skim');assert.equal(search.interpretFoodIntent('Lactose-free milk').known.lactose,'Lactose free');
});
test('AFCD ingredient qualifiers cannot replace an egg or bread head concept',()=>{
  for(const [name,concept] of [['Egg, chicken, whole, raw','egg'],['Bread, from rye flour, sour dough','bread'],['Milk, cow, fluid, flavoured, chocolate, reduced fat','milk']])assert.equal(search.foodConceptEvidence({name,recordType:'afcd'}).conceptId,concept);
});
test('plain cereal, cheese, chicken, apple and rice exclude containing foods',()=>{
  for(const [concept,name] of [['cheese','Cheeseburger'],['cereal','Muesli bar'],['chicken','Chicken curry'],['apple','Apple pie'],['apple','Apple juice'],['rice','Rice pudding']])assert.equal(search.conceptCompatibility(food(name),concept).compatible,false,`${concept}: ${name}`);
});
test('specific confectionery and condiment categories outrank ingredient-like product names',()=>{
  for(const [concept,name,categories] of [['milk','Dairy Milk',['Chocolates']],['egg','Mini Eggs',['Chocolate eggs']],['apple','Apple and mango juice',[]],['apple','Organic apple cider vinegar',[]]])assert.equal(search.conceptCompatibility({name,categories},concept).compatible,false,name);
});
test('edited identity metadata invalidates classification and facet caches',()=>{
  const record={name:'Wholemeal bread',recordType:'packaged',categories:[]};assert(search.conceptCompatibility(record,{conceptId:'bread',known:{breadType:'Wholemeal'}}).compatible);record.name='Milk chocolate';assert(!search.conceptCompatibility(record,'bread').compatible);assert(!search.conceptCompatibility(record,'milk').compatible);
});
test('fresh apple is distinct from dried apple and whole eggs never acquire poultry measures',()=>{
  assert(!search.conceptCompatibility({name:'Apple, dried',recordType:'afcd'},'apple').compatible);
  const egg=afcdFoods.find(record=>record.name==='Egg, chicken, whole, hard-boiled'),profile=serving.servingMeasureProfile(egg);assert(profile.measures.some(measure=>measure.key==='largeEgg'));assert(!profile.measures.some(measure=>/poultry/i.test(measure.label)));
});
test('hash-brown identity supports plural and spacing without admitting composed dishes',()=>{
  for(const query of ['hash brown','hash browns','Hashbrown'])assert.equal(search.interpretFoodIntent(query).conceptId,'hash-brown');
  assert(search.conceptCompatibility(food('Oval Hash Browns'),'hash-brown').compatible);
  assert(!search.conceptCompatibility(food('Bacon & Hash Brown Crustless Quiche'),'hash-brown').compatible);
});
test('chips asks food class before preparation and distinguishes fries from crisps',()=>{
  const {intent,records}=candidatePool('Chips'),question=search.nextConceptQuestion(intent,records);assert.equal(question.key,'chipType');assert(question.options.some(option=>/Hot chips/.test(option.label)));assert(question.options.some(option=>/Packet/.test(option.label)));
  assert.equal(search.interpretFoodIntent('fries').conceptId,'fries');assert.equal(search.interpretFoodIntent('hot chips').conceptId,'fries');
});
test('declared restaurant identities survive an unrelated same-title incomplete record',()=>{
  const official=sources.foodRecords({sourceId:'mcdonalds-au'}),exact=official.find(record=>record.name==='Big Mac'),shadow={id:'incomplete-copy',name:'Big Mac',recordType:'external-catalogue',brand:'',nutrients:{calories:null}};
  const model=catalogue.submittedResultModel([...official,shadow],'Big Mac');assert.equal(model.groups[0].items[0].recordId,exact.id);assert(catalogue.exactProductQuality(exact,{candidates:[shadow]}).exactEligible);
});
test('exact product semantics beat a longer variant independently of product names and scores',()=>{
  const base={id:'base',name:'Garden Stack',brand:'Example Kitchen',recordType:'food-source',foodSourceId:'example',sourceItemId:'base',verified:true,market:'AU',units:{burger:1},defaultUnit:'burger',defaultAmount:1,physicalForm:'restaurant-serving',nutrients:{calories:200}},variant={...base,id:'variant',sourceItemId:'variant',name:'Double Garden Stack'};
  for(const records of [[variant,base],[base,variant]]){const model=catalogue.submittedResultModel(records,'Garden Stack',{savedIds:['variant']});assert.equal(model.groups[0].items[0].recordId,'base');}
  assert.equal(search.semanticProductExactness(variant,'Garden Stack').class,'variant-superset');
});
test('restaurant aliases and explicit counts retain distinct shared intent',()=>{
  const kfc=sources.foodRecords({sourceId:'kfc-au'});assert.equal(catalogue.submittedResultModel(kfc,'KFC Wicked Wings').conceptIntent.kind,'restaurant-family');assert.equal(catalogue.submittedResultModel(kfc,'KFC 6 Wicked Wings').conceptIntent.kind,'restaurant-explicit-size');
  const mcd=sources.foodRecords({sourceId:'mcdonalds-au'}).find(record=>record.name==='Big Mac');for(const query of ["McDonald's Big mac",'McDonald Big Mac','Maccas Big Mac'])assert.equal(search.semanticProductExactness(mcd,query).priority,5,query);
});
test('natural measure utility prioritises slices and fluid volumes without restoring rejected units',()=>{
  const bread=afcdFoods.find(record=>record.name==='Bread, from wholemeal flour'),milk=afcdFoods.find(record=>/^Milk, cow, fluid, regular fat/.test(record.name));
  assert(/Slice$|^slice$/.test(serving.servingMeasureProfile(bread).measures[0].key));assert.equal(serving.servingMeasureProfile(milk).measures[0].key,'mL');
  for(const measure of serving.servingMeasureProfile(bread).measures)assert(!['cup','mL','L'].includes(measure.key));
});
test('thin/thick spread cannot acquire invented conversions',()=>{
  const profile=serving.servingMeasureProfile({name:'Margarine spread',physicalForm:'spread',recordType:'packaged',units:{g:.01},nutrients:{calories:400}});
  assert(profile.unavailablePresets.some(gap=>gap.keys.includes('thinSpread')&&gap.keys.includes('thickSpread')));assert(!profile.measures.some(measure=>/^(thin|thick)Spread$/.test(measure.key)));
});
test('submitted generic diagnostics separate related concepts from equivalent identities',()=>{
  const model=catalogue.submittedResultModel([{id:'bread',name:'Plain bread',recordType:'afcd',afcd:true,market:'AU',units:{g:.01},nutrients:{calories:200}},{id:'banana',name:'Banana bread',recordType:'packaged',market:'AU',units:{g:.01},nutrients:{calories:300}}],'bread');
  const related=model.groups.find(group=>group.key==='related');assert(related.items.some(item=>item.recordId==='banana'));assert.equal(related.items[0].decisionTrace.compatibility.compatible,false);
});

test('bare family aliases do not pre-answer catch-all subtype facets',()=>{for(const [query,key] of [['Cheese','cheeseType'],['Cereal','cerealType']]){const {intent,records}=candidatePool(query);assert.equal(intent.known[key],undefined);assert.equal(search.nextConceptQuestion(intent,records).key,key);}});
test('yoghurt cannot inherit the nut ingredient standard serve',()=>{const record=afcdFoods.find(food=>food.name==='Yoghurt, almond based, flavoured');assert(record);assert(!serving.servingMeasureProfile(record).measures.some(measure=>/nuts\/seeds/i.test(measure.label)));});
test('non-adjacent chocolate egg names are confectionery',()=>{for(const name of ['Chocolate flame egg','Dark Chocolate Mini Eggs','Chocolate Wafer Eggs'])assert(!search.conceptCompatibility(food(name),'egg').compatible);});
test('brand and subtype inference separates bread from wraps using committed category evidence',()=>{const records=[{name:'Traditional Wholemeal Bread',brand:'Example Bakery'},{name:'Wholemeal Wraps',brand:'Example Bakery',categories:['Breads']}],intent=search.interpretFoodIntent('Example Bakery wholemeal',{records});assert.equal(intent.conceptId,'bread');assert.equal(intent.known.breadType,'Wholemeal');assert(search.conceptCompatibility(records[0],intent).compatible);assert(!search.conceptCompatibility(records[1],intent).compatible);});

test('catalogue discovery expands declared alias inflections before concept filtering',()=>{for(const [query,forms] of [['Hash Brown',['hash brown','hash browns','hashbrown','hashbrowns']],['Bread',['bread','breads','toast','toasts']],['Eggs',['egg','eggs']]]){const plan=search.conceptSearchQueries(search.interpretFoodIntent(query));for(const form of forms)assert(plan.includes(form),form);assert.equal(new Set(plan).size,plan.length);}});

test('egg preparation preserves named methods and skips supplied cooking information',()=>{for(const [query,value] of [['Microwave poached eggs','Microwave poached'],['Poached eggs','Poached'],['Scrambled eggs','Scrambled'],['Omelette eggs','Omelette']]){const intent=search.interpretFoodIntent(query);assert.equal(intent.known.preparation,value);assert.notEqual(search.nextConceptQuestion(intent,afcdFoods.filter(food=>search.conceptCompatibility(food,intent).compatible))?.key,'preparation');}});
