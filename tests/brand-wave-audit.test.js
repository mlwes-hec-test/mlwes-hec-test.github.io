'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../scripts/audit_brand_wave');
test('missing source nutrients stay absent; explicit source zero remains zero',()=>{
  const f=A.inputFrom({code:'0123456789012',brands:'Example',product_name:'Example crackers','proteins_100g':'','fat_100g':'0','carbohydrates_100g':'NaN'});
  assert.deepEqual(f.nutrients,{fat:0});assert.equal(f.barcode,'0123456789012');
});
test('whole source brand field and separate tokens are preserved without ownership inference',()=>{
  const raw={brands:"Kellogg’s, Special K",brands_tags:'kellogg-s,special-k'};
  assert.equal(A.inputFrom(raw).brand,raw.brands);
  assert.deepEqual(A.brandTokens(raw).map(b=>b.name),['Kellogg’s','Special K']);
});
test('simple punctuation normalization does not merge unrelated accents or parent labels',()=>{
  assert.equal(A.brandTokens({brands:"Kellogg’s,Kellogg's"}).length,1);
  assert.equal(A.brandTokens({brands:'Nestlé,Nestle,Nescafé'}).length,3);
});
test('unsupported source domains cannot enter through a secondary food tag',()=>{
  for(const tag of ['pet-food','food-supplements','alcoholic-beverages','medications','non-food-products'])assert.equal(A.category({categories_tags:'en:'+tag+',en:beverages'}).id,null);
});
test('category assignment requires explicit supported source category; name or brand is insufficient',()=>{
  assert.equal(A.category({product_name:'Bread',brands:'Example'}).id,null);
  assert.equal(A.category({categories_tags:'en:breakfast-cereals'}).id,'cereal');
  assert.equal(A.category({categories_tags:'en:frozen-potatoes'}).id,'frozen-potato');
});
test('noise values are held rather than rewritten into a consumer brand',()=>{
  for(const value of ['Unknown','N/A','https://example.test','1234567890123','<brand>'])assert(A.brandNoise(value),value);
  assert(!A.brandNoise("Kellogg’s"));
});
test('ingredient suffixes cannot turn pizzas and pasta sauces into cheese',()=>{
  assert.equal(A.category({categories_tags:'en:pizzas,en:pizza-with-ham-and-cheese'}).id,null);
  assert.equal(A.category({categories_tags:'en:sauces,en:tomato-sauces-with-cheese'}).id,'sauces');
  assert.equal(A.category({categories_tags:'en:pastas,en:macaroni-and-cheese'}).id,'grains');
});
test('contradictory serving quantities and mixed cheese identities are excluded',()=>{
  assert(A.reviewHolds({serving_size:'30 g (100 g)'},{id:'bread'}).includes('contradictory-serving-text'));
  assert(A.reviewHolds({product_name:'Cheese & Crackers'},{id:'cheese'}).includes('composite-product-category-unresolved'));
  assert.deepEqual(A.reviewHolds({product_name:'Grated Cheese',serving_size:'1 portion (40 g)'},{id:'cheese'}),[]);
});
