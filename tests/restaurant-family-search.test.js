'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const catalogue=require('../food-catalogue.js'),sources=require('../food-sources.js');
require('../kfc-au-catalogue.js');
require('../mcdonalds-au-catalogue.js');
const foods=sources.foodRecords({sourceId:'kfc-au'}),model=(query,records=foods,options)=>catalogue.submittedResultModel(records,query,options);

test('submitted family grouping overrides lexical order and saved-score preference',()=>{
  const ten=foods.find(f=>f.name==='10 Wicked Wings');
  for(const records of [foods,[...foods].reverse()]){
    const result=model('KFC Wicked Wings',records,{savedIds:[ten.id]}),group=result.groups[0];
    assert.equal(group.key,'restaurant-family');assert.equal(group.unresolved,'size-or-count');assert.deepEqual(group.items.map(i=>i.name),['3 Wicked Wings','6 Wicked Wings','10 Wicked Wings']);assert(!result.groups.some(g=>g.key==='best'));
    assert(result.groups.slice(1).some(g=>g.items.some(i=>i.food.productSemantics?.type==='configurable-bundle')));
  }
});
for(const count of [3,6,10])test(`submitted explicit ${count} selects the matching direct identity`,()=>{for(const prefix of ['KFC ',''])assert.equal(model(`${prefix}${count} Wicked Wings`).groups[0].items[0].name,`${count} Wicked Wings`);});
test('committed named-size family remains neutral until a named size is supplied',()=>{
  assert.deepEqual(model('KFC Popcorn Chicken').groups[0].items.map(i=>i.name),['Snack Popcorn Chicken','Regular Popcorn Chicken','Maxi Popcorn Chicken']);
  for(const size of ['Snack','Regular','Maxi']){const group=model(`KFC ${size} Popcorn Chicken`).groups[0];assert.equal(group.key,'best');assert.equal(group.items[0].name,`${size} Popcorn Chicken`);}
});
const fixture=(size,index)=>({id:`fixture-${size}`,name:`${size} Rice Bowl`,brand:'Example Kitchen',sourceDisplayName:'Example Kitchen',sourceAliases:['Example'],foodSourceId:'example-kitchen',recordType:'food-source',market:'AU',verified:true,choiceFamily:'rice-bowl',choiceOrder:index,productSemantics:{type:'sized-variant',size,confidence:'high'},physicalForm:'restaurant-serving',serving:`1 ${size} bowl`,defaultAmount:1,defaultUnit:'bowl',units:{bowl:1},unitLabels:{bowl:'Bowl'},nutrients:{calories:200+index,energyKj:840+index}});
const sizes=['Small','Medium','Large'].map(fixture);
test('shared metadata handles an unrelated named-size fixture and explicit sizes',()=>{
  assert.deepEqual(model('Example Rice Bowl',sizes).groups[0].items.map(i=>i.name),sizes.map(f=>f.name));
  for(const food of sizes){const group=model(`Example ${food.name}`,sizes).groups[0];assert.equal(group.key,'best');assert.equal(group.items[0].recordId,food.id);}
});
test('unique products retain Best match; family metadata alone does not create ambiguity',()=>{const group=model('Example Small Rice Bowl',[sizes[0]]).groups[0];assert.equal(group.key,'best');assert.equal(group.items[0].recordId,sizes[0].id);});
test('additional identity modifiers and explicit combo intent do not become direct-family choices',()=>{
  assert(!model('KFC Wicked Wings Combo').groups.some(g=>g.key==='restaurant-family'));
  assert(!model('Example Spicy Rice Bowl',sizes).groups.some(g=>g.key==='restaurant-family'));
});
test('canonical duplicates cannot create a false family',()=>{assert(!model('Example Rice Bowl',[sizes[0],{...sizes[0]}]).groups.some(g=>g.key==='restaurant-family'));});
test('another source derives one family from source family fields and declared sizes',()=>{
  const records=sources.foodRecords({sourceId:'mcdonalds-au'});
  assert.deepEqual(model("McDonald's Fries",records).groups[0].items.map(i=>i.name),['Small Fries','Medium Fries','Large Fries']);
  for(const size of ['Small','Medium','Large']){const group=model(`McDonald's ${size} Fries`,records).groups[0];assert.equal(group.key,'best');assert.equal(group.items[0].name,`${size} Fries`);}
});
test('every committed KFC choice family includes all direct peers, including a single-piece order',()=>{
  for(const key of new Set(foods.map(food=>food.choiceFamily).filter(Boolean))){
    const peers=foods.filter(food=>food.choiceFamily===key).sort((a,b)=>a.choiceOrder-b.choiceOrder),result=model(`KFC ${key.replaceAll('-',' ')}`);
    assert.equal(result.groups[0].key,'restaurant-family',key);assert.deepEqual(result.groups[0].items.map(item=>item.recordId),peers.map(food=>food.id),key);assert(!result.groups.some(group=>group.key==='best'),key);
  }
});
test('incomplete size peers retain early completion actions in their neutral group',()=>{
  const incomplete={...sizes[1],nutrients:{calories:null},recognisedOnly:true,verificationStatus:'recognised-only'};
  const item=model('Example Rice Bowl',[sizes[0],incomplete]).groups[0].items.find(i=>i.recordId===incomplete.id);
  assert.equal(item.addability.normalLoggingAllowed,false);assert.equal(item.addability.status,'needs-nutrition-completion');
});
test('actual Search button/Return rendering preserves neutral and explicit families through persisted Review',{timeout:180000},async()=>{
  const report=await require('../scripts/audit_restaurant_family_search.js').run({outputDirectory:process.env.HEC_FAMILY_EDGE_OUTPUT});
  assert.equal(report.pass,true);assert.equal(report.contexts[0].scenarios.length,20);
});
