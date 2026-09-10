'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const registry=require('../entity-registry'),C=require('../food-catalogue');
const source=fs.readFileSync(path.join(__dirname,'../off-catalogue.js'),'utf8');
function fixture(){
  let directoryReads=0;const requests=[];
  const names=['Häagen-Dazs','Haagen-Dazs','Bürgen','Burgen','Côte','Cote','Ácorn’s & Co'];
  const records=names.flatMap((brand,i)=>[0,1].map(j=>({id:`fixture:${i}:${j}`,barcode:String(10000000+i*10+j),brand,name:j?'Golden Seed Bites':'Cedar Seeds & Grains',nutrients:{},categories:[]})));
  const key=name=>(name.toLowerCase().replace(/&/g,' and ').match(/[a-z0-9]+/g)||[]).join('');
  const files={'products/fixture.json':{products:records}};
  for(const [i,record] of records.entries()){
    const indexed=key(record.brand),file=`intelligence/${indexed.slice(0,2)}.json`,data=files[file]||(files[file]={brands:{}}),entry=data.brands[indexed]||(data.brands[indexed]={name:record.brand,refs:[],names:{},facets:[]});
    entry.refs.push(`fixture:${i}`);const product=record.name.toLowerCase().replace('&','and');entry.names[product]=[...(entry.names[product]||[]),`fixture:${i}`];
  }
  files['manifest.json']={intelligenceShards:Object.keys(files).filter(file=>file.startsWith('intelligence/')).map(path=>({path}))};
  const directory={get brands(){directoryReads++;return names.map(name=>({name,count:2}));}};
  const context={HECFoodCatalogue:C,HECAustralianEntityRegistry:registry,HECAustralianCatalogueData:directory,fetch:async url=>{const file=String(url).replace('./data/open-food-facts-au/','');requests.push(file);return {ok:!!files[file],status:files[file]?200:404,json:async()=>files[file]};}};
  vm.runInNewContext(source,context);return {api:context.HECOpenFoodFactsAU,records,requests,directoryReads:()=>directoryReads};
}
test('approved historical compatibility preserves NFC/NFD, unaccented and hyphen queries',async()=>{
  const {api,records}=fixture(),before=JSON.stringify(records);
  for(const brand of ['Häagen-Dazs','Haagen-Dazs','Häagen Dazs','Haagen Dazs','HAAGEN–DAZS','Häagen‑Dazs','Ha\u0308agen-Dazs']){
    const result=await api.search(brand+' Cedar Seeds & Grains');assert.deepEqual(Array.from(result.foods,f=>f.id).sort(),['fixture:0:0','fixture:1:0']);assert.equal(result.intent.kind,'brand-product');
    for(const food of result.foods){const original=records.find(r=>r.id===food.id);assert.equal(food.brand,original.brand);assert.equal(food.barcode,original.barcode);assert.equal(food.name,original.name);}
  }
  assert.equal(JSON.stringify(records),before);
});
test('verified alias metadata authorizes widening independently of index compatibility',async()=>{
  const {api}=fixture();assert.equal(registry.brandSearchEvidence('Bürgen').type,'verified-brand-alias');assert.equal(registry.brandSearchEvidence('Häagen-Dazs').type,'historical-index-compatibility');
  for(const query of ['Burgen','Bürgen','BU\u0308RGEN']){const result=await api.search(query);assert.equal(result.total,4);assert.deepEqual(Array.from(result.foods,f=>f.id).sort(),['fixture:2:0','fixture:2:1','fixture:3:0','fixture:3:1']);}
});
test('unapproved same-folded diacritic brands remain separate in brand and exact product retrieval',async()=>{
  const {api}=fixture();assert.equal(api.norm('Côte'),api.norm('Cote'));assert.notEqual(api.brandKey('Côte'),api.brandKey('Cote'));assert.equal(registry.brandSearchEvidence('Côte'),null);
  for(const [brand,index]of [['Côte',4],['Cote',5]]){
    const family=await api.search(brand),product=await api.search(brand+' Cedar Seeds & Grains');assert.equal(family.total,2);assert(family.foods.every(food=>food.brand===brand));assert.deepEqual(Array.from(product.foods,f=>f.id),[`fixture:${index}:0`]);
  }
  assert.equal(await api.exactBrandRefs('Cotte'),null);
});
test('unapproved exact accented spelling can address its own historical shard without enabling an unaccented alias',async()=>{
  const {api}=fixture();for(const query of ['Ácorn’s & Co',"Ácorn's and Co",'A\u0301corns and Co']){const result=await api.search(query+' Cedar Seeds & Grains');assert.deepEqual(Array.from(result.foods,f=>f.id),['fixture:6:0']);}
  assert.equal(await api.exactBrandRefs('Acorns and Co'),null);
});
test('approved alias pagination preserves distinct records and GTINs',async()=>{
  const {api}=fixture(),first=await api.search('Burgen',{limit:2}),second=await api.search('Bürgen',{offset:2,limit:2});assert.equal(first.total,4);assert(first.hasMore);assert.equal(second.hasMore,false);assert.equal(new Set([...first.foods,...second.foods].map(f=>f.id)).size,4);assert.equal(new Set([...first.foods,...second.foods].map(f=>f.barcode)).size,4);
});
test('evidence lookup and successful historical shard access are cached',async()=>{
  const f=fixture();await f.api.exactBrandRefs('Burgen');const initial=f.requests.length;for(let i=0;i<10;i++)await f.api.exactBrandRefs('Bürgen');assert.equal(f.directoryReads(),1);assert.equal(f.requests.length,initial);assert.equal(f.requests.filter(file=>file.startsWith('products/')).length,0);
});
test('switching approved and unapproved brands never reuses prior family members',async()=>{
  const {api}=fixture();await api.search('Haagen Dazs');assert((await api.search('Burgen')).foods.every(f=>['Burgen','Bürgen'].includes(f.brand)));assert((await api.search('Côte')).foods.every(f=>f.brand==='Côte'));const absent=await api.search('Unlisted Kitchen');assert.equal(absent.foods.length,0);assert.equal(absent.intent.kind,'no-confident-match');
});
test('same-folded unrelated brand names do not bypass canonical membership or the complete-name collision guard',()=>{
  C.registerBrandDirectory([{name:'Côte',count:2},{name:'Cote',count:2}]);const food=brand=>({id:'synthetic-'+brand,brand,name:'Cedar Seeds & Grains',recordType:'packaged',units:{g:.01},nutrients:{calories:200},pack:{amount:100,unit:'g'}});
  for(const [query,other]of [['Côte','Cote'],['Cote','Côte']]){const intent=C.queryIntent(query+' Cedar Seeds & Grains');assert.equal(intent.entity.name,query);assert.equal(C.consumerBrandMembership(intent.entity,food(other)).matches,false);assert.equal(C.explicitIdentityMatch(food(other),query+' Cedar Seeds & Grains',intent),false);assert(C.explicitIdentityMatch(food(query),query+' Cedar Seeds & Grains',intent));assert.equal(C.brandResultModel([food(query),food(other)],query).total,1);}
  assert.equal(C.canonicaliseRecords([food('Côte'),food('Cote')]).length,2);
  assert.equal(registry.preserveSearchSpelling('two Côte Cedar Seeds & Grains','cote cedar seeds and grains'),'côte cedar seeds and grains');
});
test('real approved family retains all eight protected GTINs and exact source spellings',async()=>{
  const off=require('../scripts/audit_open_food_facts_au'),raw=off.allProducts().filter(p=>['Burgen','Bürgen'].includes(p.brand)),ids=raw.map(p=>p.id).sort();assert.equal(raw.length,8);assert.equal(new Set(raw.map(p=>p.barcode)).size,8);
  for(const brand of ['Burgen','Bürgen']){const result=await off.api.search(brand,{limit:500});assert.deepEqual(result.foods.map(p=>p.id).sort(),ids);assert.equal(C.canonicaliseRecords(result.foods).length,8);for(const p of raw){const exact=await off.api.search(brand+' '+p.name,{limit:500}),found=exact.foods.find(f=>f.id===p.id);assert(found,p.id);assert.equal(found.brand,p.brand);assert.equal(found.barcode,p.barcode);assert.equal(C.canonicalKey(found),'barcode:'+p.barcode);}}
});
test('protected apostrophe and historical-index products remain reachable through shared matching',async()=>{
  const off=require('../scripts/audit_open_food_facts_au');C.registerBrandDirectory(require('../australian-catalogue-data').brands);
  for(const id of ['off:9339423004229','off:9319133334670','off:3415581105360']){
    const raw=off.allProducts().find(p=>p.id===id);assert(raw,id);
    for(const brand of new Set([raw.brand,raw.brand.replace(/[’']/g,''),raw.brand.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')])){const query=brand+' '+raw.name,result=await off.api.search(query,{limit:500}),food=result.foods.find(p=>p.id===id);assert(food,query);assert(C.explicitIdentityMatch(food,query),query);assert.equal(C.canonicalKey(food),'barcode:'+raw.barcode);}
  }
});
