'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto'),C=require('../food-catalogue'),R=require('../retailer-catalogue'),B=require('../brand-catalogue'),S=require('../scripts/food-category-semantics'),baseline=require('../data/catalogue-semantics-repair/baseline.json'),audit=require('../data/catalogue-round-three/family-audit-after.json');
const indices=Object.fromEntries(['aldi','woolworths','coles'].map(k=>[k,require('../'+k+'-au-catalogue').index]));
const brandFoods=B.index.files.flatMap(s=>require('../data/brand-au/'+s.path).records),byId=new Map(brandFoods.map(f=>[f.id,f]));
async function all(id,options={}){const foods=[];for(let offset=0;;offset+=20){const p=await R.page(id,{...options,offset});foods.push(...p.foods);if(!p.hasMore)break;}return foods;}
test('ordinary supermarket browse is relationship-gated, current or uncertain, never sale or provenance alone',async()=>{
 for(const [id,total]of [['aldi',222],['woolworths',362],['coles',417]]){const foods=await all(id);assert.equal(foods.length,total);assert.equal(new Set(foods.map(C.canonicalKey)).size,total);for(const f of foods){const family=audit.rows.find(r=>r.retailer===id&&r.key===C.brandKey(f.brand));assert(family?.relationshipVerified,f.brand);assert.notEqual(family.status,'legacy');}assert(!foods.some(f=>['pepsi','cocacola','kelloggs','mccain','birdseye','johnwest'].includes(C.brandKey(f.brand))));}
 const original=indices.aldi.entries.find(e=>C.brandKey(e.brand)==='pepsi');assert(original,'independent evidence retained');assert(C.sourceDeclaredRetailerMembership(original,'aldi').length);
});
test('independent and legacy products retain useful global search and canonical identity',async()=>{
 for(const query of ['Pepsi','Pepsi Max',"Kellogg's",'McCain','Birds Eye','John West','Woolworths Home Brand','Woolworths Select']){const result=await B.search(query)||await R.search(query);assert(result.foods.length,query);assert.equal(new Set(result.foods.map(C.canonicalKey)).size,result.foods.length,query);}
});
test('retailer Brands navigation reaches Seasons Pride and Elmsbury, with category intersection',async()=>{
 for(const key of ['seasonspride','elmsbury']){assert(R.directory('aldi').brands.some(b=>b.key===key));const foods=await all('aldi',{brandKey:key});assert(foods.length);assert(foods.every(f=>C.brandKey(f.brand)===key));}
 const jewels=(await all('aldi',{brandKey:'seasonspride',categoryId:'frozen-potato'}));assert.equal(jewels.length,1);assert.equal(jewels[0].id,'off:4061463000316');assert.equal(jewels[0].brand,'Seasons Pride');assert.deepEqual((await all('aldi',{brandKey:'pepsi'})),[]);
});
test('compound foods outrank ingredient and broad cake tokens in projected categories and concepts',()=>{
 for(const id of ['off:4061459674262','off:4061464959002','off:4061464962255']){assert.equal(byId.get(id).categoryId,'biscuits');assert.deepEqual(byId.get(id).conceptIds,['cracker']);}
 assert.equal(byId.get('off:4069365112922').categoryId,'bread');assert.deepEqual(byId.get('off:4069365112922').conceptIds,['bread-roll']);
 assert.equal(byId.get('off:4061461637392').categoryId,'desserts');
 for(const [name,id]of [['Thin Brown Rice Cake','biscuits'],['Thin Brown Rice Cakes','biscuits'],['Carrot Cake Hot Cross Bun','bread'],['Carrot Cake Hot Cross Buns','bread'],['Irish Cream Flavoured Ice Cream','desserts'],['Chocolate Cheesecake','desserts'],['Cookies And Cream Ice Cream','desserts']])assert.equal(S.classify({name}).id,id,name);
 for(const name of ['Rice Cake','Jelly belly ice cream mix','3 Cheese Potato Bake Recipe Base','Potato Cake','Fish Cakes','Pancake','Cake','Cakes','Korean Rice Cakes','Cheesecake Flavour Yogurt','Sweet & Spicy Hot Cross Buns Chocolates','Loaded Cookies Cheesecake Filling'])assert.equal(S.classify({name}),null,name);
});
test('Jewel/Gem aliases resolve one canonical product, preserve authentic names and exact branded intent',async()=>{
 for(const q of ['Potato Jewel','Potato Jewels','Potato Gem','Potato Gems','Seasons Pride Potato Jewels','Aldi Seasons Pride Potato Jewels']){const r=await R.search(q),f=r.foods.find(f=>f.barcode==='4061463000316');assert(f,q);assert.equal(f.name,'Potato Jewels');assert.equal(f.brand,'Seasons Pride');assert(q.startsWith('Aldi ')?C.explicitIdentityMatch(f,q):C.rank(f,q).score>=1000,q);assert.equal(new Set(r.foods.map(C.canonicalKey)).size,r.foods.length);}
 const direct=await B.search('Seasons Pride Potato Gems');assert.equal(direct.foods.length,1);assert.equal(direct.foods[0].barcode,'4061463000316');assert.deepEqual(C.potatoBiteAliases('Jewels chocolate'),[]);assert.deepEqual(C.potatoBiteAliases('Gem lettuce'),[]);
});
test('all accepted source identity, nutrition, measure and evidence facts remain byte-equivalent',()=>{
 const hash=f=>crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(baseline.fields.filter(k=>f[k]!==undefined).map(k=>[k,f[k]])))).digest('hex');
 for(const [kind,old,foods]of [['brand',baseline.brandRecords,brandFoods],...Object.entries(indices).map(([id,i])=>[id,baseline.retailers[id].records,i.files.flatMap(s=>require('../data/'+id+'-au/'+s.path).records)])]){assert.equal(foods.length,old.length,kind);const map=new Map(foods.map(f=>[f.id,f]));for(const f of old)assert.equal(hash(map.get(f.id)),f.coreSha256,kind+' '+f.id);}
 assert.equal(B.index.entries.length,7489);assert.equal(B.index.brands.length,2736);
});
test('protected McCain review still resolves its canonical alias and accepted energy',async()=>{const f=(await R.search('McCain Hash Browns')).foods.find(f=>f.barcode==='9310174025084');assert.equal(f.id,'woolworths-au:98299');assert.equal(Math.round(f.nutrients.calories*f.units.g*75),130);assert.equal(Math.round(f.nutrients.energyKj*f.units.g*75),543);});
