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
  const runtime=fs.readFileSync(path.join(__dirname,'../alpha06.js'),'utf8'),start=runtime.indexOf('async function fc633StartExplicit('),end=runtime.indexOf('\nfunction fc633Candidates(',start);
  assert(start>=0&&end>start);const record=food(),raw="two Miller's Bakery Cedar Seeds & Grains",intent=S.interpretFoodIntent(raw,{records:[record],sourceIntent:C.queryIntent(raw)}),requests=[],results={innerHTML:''};
  assert.notEqual(intent.identityQuery,intent.quantity.identityQuery);
  const context={C8:C,REG29:require('../entity-registry'),fc633Revision:0,searchSession633:{rawQuery:raw,revision:1},ss633Current:(revision,query)=>revision===1&&query===raw,ext:{ui:{}},allFoods:()=>[],ps34SyncGuidedUiState(){},ss633Commit(){},saveExt(){},us633RenderSubmitted(){},by:id=>id==='food-search'?{blur(){}}:results,window:{HECOpenFoodFactsAU:{async search(query){requests.push(query);return {foods:[record]};}}}};
  vm.runInNewContext(runtime.slice(start,end),context);assert.equal(await context.fc633StartExplicit(raw,intent,'enter'),true);
  assert.equal(requests[0],intent.quantity.identityQuery);assert.equal(C.queryIntent(requests[0]).entity.name,"Miller's Bakery");
  const selected=context.searchSession633.submittedModel.groups.flatMap(group=>group.items).find(item=>item.recordId===record.id);assert(selected);assert.equal(selected.addability.status,'loggable-now');
});
