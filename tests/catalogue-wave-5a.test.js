'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../food-catalogue'),D=require('../catalogue-discovery'),B=require('../brand-catalogue'),R=require('../retailer-catalogue'),S=require('../serving-foundation');
for(const id of ['woolworths','coles','aldi','iga'])require('../'+id+'-au-catalogue');
const raw=B.index.files.flatMap(s=>require('../data/brand-au/'+s.path).records),byGtin=id=>raw.find(f=>f.barcode===id);
test('brand query families unite membership without merging variant nutrition identities',async()=>{
 for(const brand of ['pepsi','coke','cocacola','berg','kelloggs']){
  const search=await B.search(B.brands.get(brand).name,{limit:500}),pages=[];
  for(let offset=0;;offset+=20){const page=await B.page(brand,{offset});assert(page.foods.length<=20);pages.push(...page.foods);if(!page.hasMore)break;}
  assert.deepEqual(search.foods.map(C.canonicalKey).sort(),pages.map(C.canonicalKey).sort(),brand);
  assert.equal(B.directory(brand).categories.reduce((n,c)=>n+c.count,0),pages.length);
  assert(pages.every(f=>C.productEligibility(f).addability.normalLoggingAllowed));
 }
 const foods=(await B.search('Coke',{limit:100})).foods;assert(foods.some(f=>f.name==='Diet Coke'));assert(foods.some(f=>f.name==='Coca-Cola Zero Sugar'));assert(foods.some(f=>f.barcode==='9300675001410'));
 const max=(await B.search('Pepsi',{limit:100})).foods;assert(max.some(f=>f.barcode==='9313820004518'));assert(max.some(f=>f.name==='Pepsi Regular'));
});
test('bare roots and specific product queries retain distinct ownership',()=>{
 for(const q of ['Pepsi','Coke','Coca-Cola','Berg',"Kellogg's"])assert.equal(C.queryIntent(q).kind,'brand-family',q);
 for(const q of ['Pepsi Max 2L','Berg honey ham',"Kellogg's Corn Flakes",'Coke Zero','Coca-Cola Zero Sugar'])assert.equal(C.queryIntent(q).kind,'product',q);
 for(const q of ['Woolworths','Woolies','Coles','Aldi','IGA','Super IGA'])assert.equal(C.queryIntent(q).kind,'retailer',q);
});
test('reviewed unsafe beverage identities remain held across all canonical consumers',()=>{
 for(const gtin of Object.keys(D.holds)){const f=byGtin(gtin);assert(f,gtin);assert(!C.canLog(f));assert(!C.productEligibility(C.canonicaliseRecords([f,{...f}])[0]).addability.normalLoggingAllowed);}
 const bad=byGtin('9300675047272');assert.equal(bad.sourceNutrients.calories,142);assert.equal(bad.sourceNutrients.energyKj,595);assert.equal(bad.nutritionPer100Unit,'g');assert.equal(bad.nutrients.calories*2.5,355);
});
for(const gtin of ['9313820004518','9313820016108','9300675001410','9300675011419','9300675090667','9310021039028','9310077313011'])test('volume and energy audit '+gtin,()=>{
 const f=byGtin(gtin),p=S.servingMeasureProfile(f);assert(f);assert.equal(p.physicalForm,'liquid');assert.equal(f.nutritionPer100Unit,'mL');assert(p.measures.some(m=>m.key==='mL'));assert(p.measures.some(m=>m.key==='cup'));assert(!p.measures.every(m=>m.key==='g'));assert(C.canLog(f));
 const {calories,energyKj}=f.nutrients;assert(Math.abs(calories*4.184-energyKj)<=Math.max(2,energyKj*.05));
 if(gtin==='9313820004518'){assert.equal(Math.round(calories*2.5),1);assert.equal(energyKj*2.5,5);assert.equal(f.nutrients.sugar,0);}
});
test('mass, energy units, printed zero and Unknown remain distinct',()=>{
 const f=D.products[0];assert.equal(f.nutrients.sugar,7);assert.equal(f.nutrients.fat,0);assert.equal(f.nutrients.fibre,undefined);
 assert(!C.canLog({...f,nutritionPer100Unit:'g',sourceNutritionBasis:{per100Unit:'g'},units:{g:.01}}));
 assert(!C.canLog({...f,nutrients:{...f.nutrients,calories:111,energyKj:111}}));
 const dry={name:'Instant coffee powder',categories:['Instant coffees'],nutritionPer100Unit:'g',units:{g:.01},nutrients:{calories:200},recordType:'packaged',brand:'Probe',country:'Australia'};assert.notEqual(S.physicalForm(dry).form,'liquid');
});
test('food heads outrank ingredient words and unsupported snack-stick classification stays deferred',()=>{
 for(const name of ['Thinly Sliced Honey Leg Ham','Shaved Honey Ham 50 g Portion','Honey Leg Ham'])assert.equal(D.category({name}).id,'protein');
 for(const name of ['Cheese Flavoured Chips','Chicken Flavoured Chips'])assert.equal(D.category({name}).id,'snacks');
 assert.equal(D.category({name:'Peanut Butter'}).id,'spreads');
 for(const name of ['Milk Chocolate','Chicken Stock','Beef Broth','Bread Stuffing','Mild Snack Stix',"Lil Pizzas Ham & Pineapple",'Ham Pies'])assert.equal(D.category({name}),null);
 assert.equal(D.category({name:'Mild Snack Stix',categories:['Pork sausages']}).id,'protein');
 assert.equal(D.category(byGtin('9313820004518')).label,'Soft Drinks');assert.notEqual(D.category(byGtin('9310021039028')).label,'Soft Drinks');
});
test('retailer totals, ownership, filtering, paging and category membership stay consistent',async()=>{
 for(const [id,count,loggable] of [['woolworths',363,348],['coles',417,417],['aldi',224,224],['iga',8,8]]){
  assert.equal(R.directory(id).total,count);const all=[];for(let offset=0;;offset+=20){const p=await R.page(id,{offset});assert(p.foods.length<=20);all.push(...p.foods);if(!p.hasMore)break;}
  assert.equal(all.length,count);assert.equal(all.filter(C.canLog).length,loggable);assert.deepEqual(all.map(f=>f.name),all.slice().sort(D.alphabetic).map(f=>f.name));
  const filtered=await R.page(id,{filter:all[0].name});assert(filtered.foods.some(f=>C.canonicalKey(f)===C.canonicalKey(all[0])));
  for(const c of R.directory(id).categories){const expected=all.filter(f=>(f.browseCategoryId?[f.browseCategoryId]:[...C.retailerMembership(f,id),...C.privateLabelCollectionMembership(f,id),...C.sourceDeclaredRetailerMembership(f,id)].flatMap(m=>m.categoryIds)).includes(c.id));assert.equal(c.count,expected.length,id+':'+c.id);}
 }
 assert(!(await R.page('iga',{filter:'Pepsi'})).foods.length);assert((await R.page('iga',{filter:'sourdough',brandKey:'communityco'})).foods.length===1);
});
test('small catalogue navigation is adaptive and large catalogues stay bounded',()=>{assert(D.direct({total:1,categories:[{}]}));assert(D.direct({total:80,categories:[{}]}));assert(D.direct({total:8,categories:[{},{},{}]}));assert(!D.direct({total:363,categories:[{},{},{}]}));});

test('accepted local brand products cannot bypass conflicting same-GTIN retailer evidence',async()=>{
 const F=require('./fixtures/retailer-catalogue'),food=F.food('wave5-local-conflict',{barcode:'9300633476823',name:'Fixture Baked Beans Original',brand:'Fixture Foods',physicalForm:'solid',pack:{amount:420,unit:'g'},sourceProvenance:{...F.evidence('wave5-local'),trustClass:'official-au-manufacturer'}});
 assert(C.canLog(food));B.registerAccepted([food]);const search=R.search;R.search=async()=>({foods:[{...food,id:'wave5-peer-conflict',pack:{amount:840,unit:'g'}}]});
 try{assert.deepEqual(await B.hydrate([{...food,local:true,categoryId:'protein'}]),[]);assert(!B.isBrandMember(food,'fixturefoods'));}finally{R.search=search;}
});
