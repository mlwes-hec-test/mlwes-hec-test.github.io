'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),registry=require('../entity-registry'),serving=require('../serving-foundation');
const off=require('../scripts/audit_open_food_facts_au');
C.registerBrandDirectory(require('../australian-catalogue-data').brands);
test('declared consumer family retains a manufacturer product without moving other manufacturer products',()=>{
  const original={id:'fixture-original',name:'Plain cereal biscuits',brand:'Example Manufacturer',consumerFamilyIds:['weet-bix'],recordType:'packaged',country:'Australia',verified:true,source:'Verified From Australian Package Sample',units:{g:.01},nutrients:{calories:100,protein:4,carbs:20,fat:1}},other={...original,id:'fixture-other',consumerFamilyIds:[],name:'Unrelated breakfast product'};
  const entity=C.queryIntent('Weet-bix').entity;
  assert.equal(C.consumerBrandMembership(entity,original).reason,'declared-consumer-family');assert(!C.consumerBrandMembership(entity,other).matches);
  const result=C.brandResultModel([other,original],'Weet-bix');assert.deepEqual(result.groups.flatMap(g=>g.items.map(i=>i.recordId)),[original.id]);assert.equal(original.brand,'Example Manufacturer');
  assert(!C.consumerBrandMembership(C.queryIntent('Nescafe').entity,original).matches);
});
test('approved Nescafe spellings retrieve the same protected GTINs on cold and loaded lookups',async()=>{
  const a=await off.api.search('Nescafe',{limit:500}),b=await off.api.search('Nescafé',{limit:500});
  assert.equal(a.total,80);assert.equal(b.total,80);assert.deepEqual(a.foods.map(f=>f.id).sort(),b.foods.map(f=>f.id).sort());assert.equal(new Set(a.foods.map(f=>f.barcode)).size,80);
  assert.equal(registry.brandSearchEvidence('Nescafé').type,'registered-brand-alias');assert.equal(registry.brandSearchEvidence('Côte'),null);assert.notEqual(C.brandKey('Côte'),C.brandKey('Cote'));
  for(const query of ['Nescafé cappuccino strong','Nescafe strong cappuccino']){const result=await off.api.search(query,{limit:500});for(const id of ['off:9300605156852','off:8801055062287','off:9300605112872'])assert(result.foods.some(f=>f.id===id),query+' '+id);}
});
test('a loggable flavour superset cannot become the best identity of a less specific brand query',()=>{
  const plain={id:'plain',name:'Cedar Biscuits',brand:'Flora',recordType:'external-catalogue',market:'AU',units:{g:.01},nutrients:{},loggable:false},variant={...plain,id:'variant',name:'Cedar Biscuits Salted Caramel',nutrients:{calories:200,protein:5,carbs:30,fat:7},loggable:true};
  const model=C.submittedResultModel([plain,variant],'Flora Cedar Biscuits');assert(!model.groups.find(g=>g.key==='best')?.items.some(i=>i.recordId==='variant'));assert(model.groups.flatMap(g=>g.items).some(i=>i.recordId==='variant'));
  const explicit=C.submittedResultModel([plain,variant],'Flora Cedar Biscuits Salted Caramel');assert(explicit.groups.find(g=>g.key==='best')?.items.some(i=>i.recordId==='variant'));
});
test('Strong identity and raw conflicting nutrition remain distinct, blocked, and on a dry reference',async()=>{
  const ids=['off:9300605156852','off:8801055062287','off:9300605112872'],foods=[];
  for(const id of ids)foods.push(await off.api.lookupBarcode(id.slice(4)));
  assert.equal(C.canonicaliseRecords(foods).length,3);
  const strong=foods[0];assert.equal(strong.sourceName,'Cappuccino Strong');assert.equal(strong.sourceNutritionBasis,'per-100g-off-csv');assert.equal(strong.nutritionPer100Unit,'g');assert.equal(strong.rawSourceNutrients.calories,376);assert.equal(strong.rawSourceNutrients.energyKj,200);assert.equal(strong.nutritionIntegrity.status,'suspect');assert.deepEqual(strong.manufacturerServing,{amount:12.5,unit:'g',text:'1 portion (12.5 g)'});
  for(const food of foods){assert(!C.productEligibility(food).addability.normalLoggingAllowed);assert(!Object.keys(food.units).some(k=>['mL','L','cup'].includes(k)));}
  assert.deepEqual(foods.slice(1).map(f=>f.rawSourceNutrients),[{},{}]);
});
test('specific instant preparation metadata outranks drink ancestry without changing prepared drinks',()=>{
  assert.equal(serving.physicalForm({name:'Coffee with milk',categories:['Beverages','Dairy drinks','Instant coffees']}).form,'weight');
  assert.equal(serving.physicalForm({name:'Ready coffee drink',categories:['Beverages','Coffee drinks']}).form,'liquid');
  assert.equal(serving.physicalForm({name:'Powdered chocolate',categories:['Beverages','Powders']}).form,'weight');
});
test('reported paths survive real phone controls through source browse, product choice and Review',{timeout:360000},async()=>{
  await require('../scripts/audit_post_kfc_search_edge').run({outputDirectory:process.env.HEC_POST_KFC_EDGE_OUTPUT});
});
