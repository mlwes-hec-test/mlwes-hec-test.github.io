'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const catalogue=require('../food-catalogue'),search=require('../search-foundation');
const {afcdFoods}=require('../scripts/audit_progressive_food_resolution');
const off=require('../scripts/audit_open_food_facts_au');
const rows=model=>model.groups.flatMap(group=>group.items);
const product=(id,name,brand,categories=[])=>({id,name,brand,categories,recordType:'external-catalogue',country:'Australia',market:'AU',countries:['en:australia'],defaultUnit:'g',units:{g:.01},nutrients:{calories:100,energyKj:420,protein:2,carbs:10,fat:5}});

test('shared quality preserves base, semantic groups, alphabetical references and bounds',()=>{
  for(const query of ['Bread','Milk','Cheese','Yoghurt','Cereal','Hash Brown']){
    const intent=search.interpretFoodIntent(query),model=catalogue.conceptShortlist(afcdFoods,intent),items=rows(model);
    assert.equal(items[0].kind,'generic-concept');assert.equal(items[0].conceptKey,intent.conceptId);assert(items.length<=20);
    const keys=model.groups.map(g=>g.key),order=['generic','direct','related','branded','supermarket'];assert.deepEqual(keys,[...keys].sort((a,b)=>order.indexOf(a)-order.indexOf(b)));
    const direct=model.groups.find(g=>g.key==='direct')?.items.map(i=>i.name)||[];
    assert.deepEqual(direct,[...direct].sort((a,b)=>catalogue.norm(a).localeCompare(catalogue.norm(b),'en-AU',{sensitivity:'base'})));
  }
});

test('strong AU names and variants precede category-only foreign names despite brand diversity',()=>{
  for(const [query,foreign,category] of [['Bread','Biscottes Au froment','Breads'],['Milk','Lait Entier','Milks'],['Cheese','Fromage affiné','Cheeses'],['Yoghurt','Yaourt nature','Yoghurts'],['Cereal','Céréales complètes','Breakfast cereals'],['Hash Brown','Galettes de pomme de terre','Hash browns']]){
    const intent=search.interpretFoodIntent(query),weak=product('weak',foreign,'Aldi',[category]);weak.countries.push('en:france');
    const strong=Array.from({length:6},(_,i)=>product('au-'+i,`${query} regular ${i}`,'Coles',[category]));
    const model=catalogue.conceptShortlist([weak,...strong],intent);
    assert(!rows(model).some(row=>row.recordId==='weak'),query);assert.equal(rows(model).filter(row=>row.food).length,4);
    assert(catalogue.submittedResultModel([weak,...strong],foreign).groups.flatMap(g=>g.items).some(row=>row.recordId==='weak'),`${foreign} remains reachable`);
    assert(!/popularity/i.test(JSON.stringify(model)), 'No invented popularity field');
  }
});

test('plain milk precedes a recognised flavoured restaurant product',()=>{
  const plain={...product('plain','Fresh Full Cream Milk','Local Dairy'),defaultUnit:'mL',units:{mL:.01}},flavoured={...product('flavour','Chocolate Flavoured Milk',"McDonald's"),recordType:'food-source',foodSourceId:'mcdonalds-au'};
  const items=rows(catalogue.conceptShortlist([flavoured,plain],search.interpretFoodIntent('Milk')));
  assert(items.findIndex(i=>i.recordId==='plain')<items.findIndex(i=>i.recordId==='flavour'));
});

test('containing dishes cannot outrank direct identities through source or brand trust',()=>{
  for(const [query,name,unit] of [['Cheese',"Chicken 'n' Cheese",'burger'],['Cheese','Ham & Cheese Pocket','item'],['Cheese','Macaroni cheese','g'],['Chicken','Chicken soup','g'],['Rice','Rice pasta','g']]){
    const direct=product('direct',`${query} plain`,'Local Producer'),dish={...product('dish',name,'San Remo'),recordType:'food-source',foodSourceId:'verified-au-menu',defaultUnit:unit};
    const model=rows(catalogue.conceptShortlist([dish,direct],search.interpretFoodIntent(query)));
    assert.equal(model[1].recordId,'direct',query+' / '+name);
    assert(rows(catalogue.submittedResultModel([dish,direct],name)).some(row=>row.recordId==='dish'));
  }
});

test('catalogue prevalence is distinct compatible AU records, cached per growing snapshot',()=>{
  const a={...product('a','Wholemeal Bread','Unlisted Local'),barcode:'9310128002499'},b=product('b','White Bread','Unlisted Local');
  const records=[a,{...a,name:'Rye Bread'},product('cheese','Cheddar Cheese','Unlisted Local'),{...b,market:'FR'}],intent=search.interpretFoodIntent('Bread');
  const count=()=>rows(catalogue.conceptShortlist(records,intent)).find(i=>i.recordId==='a').decisionTrace.quality.catalogueBrandCount;
  assert.equal(count(),1);assert.equal(count(),1);records.push(b);assert.equal(count(),2);
});

test('committed Bread and Milk discovery replaces weak first-list probes and retains exact foreign products',async()=>{
  for(const [query,weakId] of [['Bread','off:26042855'],['Milk','off:26006017']]){
    const intent=search.interpretFoodIntent(query),results=await Promise.all(search.conceptSearchQueries(intent).map(q=>off.api.search(q,{limit:500})));
    const records=[...afcdFoods,...new Map(results.flatMap(r=>r.foods).map(f=>[f.id,f])).values()],model=catalogue.conceptShortlist(records,intent),items=rows(model);
    assert(items.length<=20);assert(!items.some(i=>i.recordId===weakId));
    if(query==='Bread'){
      assert(items.some(i=>/helga/i.test(i.food?.brand||'')));assert(items.some(i=>/tip top/i.test(i.food?.brand||'')));
      const wholemeal=records.find(f=>f.id==='off:9310128002499');assert(wholemeal&&catalogue.canLog(wholemeal)&&search.conceptCompatibility(wholemeal,intent).compatible);
      const pair=rows(catalogue.conceptShortlist([wholemeal,records.find(f=>f.id===weakId)],intent));
      assert(pair.findIndex(i=>i.recordId===wholemeal.id)<pair.findIndex(i=>i.recordId===weakId));
    }
    const weak=await off.api.lookupBarcode(weakId.slice(4)),exact=await off.api.search(weak.name,{limit:20});
    assert(exact.foods.some(f=>f.id===weakId));assert(rows(catalogue.submittedResultModel(exact.foods,weak.name)).some(i=>i.recordId===weakId));
  }
});
