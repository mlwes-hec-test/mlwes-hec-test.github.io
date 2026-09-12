'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../food-catalogue'),S=require('../search-foundation');
C.registerBrandDirectory(['Cedar','Morning',"Miller's Bakery",'Miller'].map(name=>({name,count:3})));
const food=(extra={})=>({id:'example-product',name:'Cedar Seeds & Grains',brand:"Miller's Bakery",recordType:'packaged',market:'AU',units:{serve:1,g:.01},manufacturerServing:{amount:100,unit:'g'},nutrients:{calories:200,energyKj:837,protein:8,fat:4,carbs:30},...extra});

test('complete stored brand plus product survives a longer inferred brand consuming product words',()=>{
  C.registerBrandDirectory([{name:"Rowan's Kitchen",count:3},{name:"Rowan's Kitchen Cedar Seeds",count:1}]);const record=food({brand:"Rowan's Kitchen"}),before=JSON.stringify(record);
  for(const brand of ["Rowan's Kitchen",'Rowan’s Kitchen','Rowans Kitchen']){
    const query=brand+' Cedar Seeds & Grains',intent=C.queryIntent(query);
    assert.equal(intent.entity.name,"Rowan's Kitchen Cedar Seeds");assert.equal(C.consumerBrandMembership(intent.entity,record).matches,false);
    assert(C.explicitIdentityMatch(record,query,intent));assert.equal(C.submittedResultModel([record],query).groups[0].items[0].recordId,record.id);
  }
  assert.equal(JSON.stringify(record),before);
});
test('longer-prefix exception does not license partial, alias-only, wrong-brand or missing-word queries',()=>{
  C.registerBrandDirectory([{name:'Rowan Kitchen',count:3}]);
  const record=food({brand:"Rowan's Kitchen",aliases:["Rowan's Kitchen Cedar Seeds Breakfast"]});
  const competingQuery='Rowan Kitchen Cedar Seeds & Grains',competingIntent=C.queryIntent(competingQuery);
  assert.equal(competingIntent.reason,'indexed-brand-plus-product');assert.equal(competingIntent.entity.name,'Rowan Kitchen');
  assert.equal(C.consumerBrandMembership(competingIntent.entity,record).matches,false);
  assert.equal(C.explicitIdentityMatch(record,competingQuery,competingIntent),false);
  for(const query of ["Rowan's Kitchen Cedar Seeds", "Rowan's Kitchen Cedar Seeds Breakfast", "Rowan's Kitchen Cedar Seeds Grains", "Rowan Kitchen Cedar Seeds & Grains", "Other Bakery Cedar Seeds & Grains"]){
    assert.equal(C.explicitIdentityMatch(record,query),false,query);
  }
  const distinct=food({id:'other',barcode:'9310000000020',brand:'Rowan Kitchen'}),original=food({brand:"Rowan's Kitchen",barcode:'9310000000013'});
  assert.notEqual(C.brandKey(distinct.brand),C.brandKey(original.brand));assert.equal(C.canonicaliseRecords([original,distinct]).length,2);
  for(const extra of [{itemStatus:'retired'},{legacyPreviewOnly:true}])assert.equal(C.explicitIdentityMatch(food({brand:"Rowan's Kitchen",...extra}),"Rowan's Kitchen Cedar Seeds & Grains"),false);
});
test('unregistered text fallback does not claim registered brand identity',()=>{
  const record=food({brand:"Willow's Kitchen"}),query='Willow Kitchen Cedar Seeds & Grains',intent=C.queryIntent(query);
  assert.equal(intent.entity,null);assert.equal(intent.reason,'product');
  assert.equal(C.explicitIdentityMatch(record,query,intent),true);
  assert.notEqual(C.brandKey(record.brand),C.brandKey('Willow Kitchen'));
});
test('complete product names survive an inferred indexed-brand prefix collision',()=>{
  for(const [name,query] of [['Cedar Seeds & Grains','CEDAR SEEDS AND GRAINS'],['Morning Seed Bites','morning seed bite']]){
    const record=food({name}),intent=C.queryIntent(query);
    assert.equal(intent.reason,'indexed-brand-plus-product');assert.equal(C.consumerBrandMembership(intent.entity,record).matches,false);
    assert(C.explicitIdentityMatch(record,query,intent));
    const model=C.submittedResultModel([record],query),item=model.groups.flatMap(group=>group.items).find(item=>item.recordId===record.id);
    assert(item);assert.equal(item.addability.status,'loggable-now');
  }
});
test('partial names, aliases and explicit brand qualifiers cannot cross brand boundaries',()=>{
  const record=food({aliases:['Cedar Breakfast']}),wrong=food({name:'Seeds & Grains'});
  for(const [candidate,query] of [[record,'Cedar Seeds'],[record,'Cedar Breakfast'],[wrong,'Cedar Seeds & Grains'],[record,"Other Brand Cedar Seeds & Grains"]])assert.equal(C.explicitIdentityMatch(candidate,query),false,query);
  assert.equal(C.queryIntent('Cedar').kind,'brand-family');assert.equal(C.brandResultModel([record],'Cedar').total,0);
});
test('exact-name matching preserves retired, legacy and nutrition eligibility restrictions',()=>{
  for(const extra of [{itemStatus:'retired'},{legacyPreviewOnly:true}])assert.equal(C.explicitIdentityMatch(food(extra),'Cedar Seeds & Grains'),false);
  const incomplete=food({nutrients:{}});assert(C.explicitIdentityMatch(incomplete,incomplete.name));assert.equal(C.productEligibility(incomplete).addability.normalLoggingAllowed,false);
});
test('explicit runtime lookup preserves possessive brand spelling after quantity removal',async()=>{
  const record=food(),raw="two Miller's Bakery Cedar Seeds & Grains",result=await require('./fixtures/product-name-runtime-harness').lookup(raw,[record]);
  assert.notEqual(result.intent.identityQuery,result.intent.quantity.identityQuery);assert.equal(result.handled,true);
  const query=result.requests.find(request=>request.provider==='OFF').query;assert.equal(query,result.intent.quantity.identityQuery);assert.equal(C.queryIntent(query).entity.name,"Miller's Bakery");
  const selected=result.model.groups.flatMap(group=>group.items);assert.equal(selected.length,1);assert.equal(selected[0].recordId,record.id);assert.equal(selected[0].food.brand,record.brand);assert.equal(selected[0].addability.status,'loggable-now');assert.equal(result.model.quantity.consumedQuantity,2);assert.equal(result.rawAfter,raw);
});

test('real Arnott’s and Kellogg’s products retain possessive identity and separate quantity through the complete controller',async()=>{
  const {index}=require('../woolworths-au-catalogue'),records=index.files.flatMap(file=>require('../data/woolworths-au/'+file.path).records),lookup=require('./fixtures/product-name-runtime-harness').lookup;
  for(const id of ['woolworths-au:36009','woolworths-au:702098']){const record=records.find(food=>food.id===id);assert(record);
    for(const spelling of [record.brand,record.brand.replace("'",'’'),record.brand.replace("'",'')]){
      const productName=id==='woolworths-au:702098'?'Corn Flakes':record.name.replace(new RegExp('^'+record.brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*','i'),''),raw='two '+spelling+' '+productName,result=await lookup(raw,records.filter(food=>food.id===id||food.id==='woolworths-au:233922'));
      assert.equal(result.handled,true);assert.equal(result.intent.quantity.consumedQuantity,2);assert.equal(result.model.quantity.consumedQuantity,2);assert.equal(result.rawAfter,raw);
      const query=result.requests.find(request=>request.provider==='OFF').query;assert.equal(C.norm(query),C.norm(record.brand+' '+productName));assert(!/^two\b/.test(query));
      const selected=result.model.groups.flatMap(group=>group.items);assert.equal(selected.length,1,raw);assert.equal(selected[0].recordId,id);assert.equal(selected[0].food.brand,record.brand);assert.equal(selected[0].addability.normalLoggingAllowed,id==='woolworths-au:36009');
    }
  }
});
