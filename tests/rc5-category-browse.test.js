'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const catalogue=sources.getCatalogue('mcdonalds-au');
const foods=sources.foodRecords({sourceId:'mcdonalds-au'});
const approved=['Meals & Bundles','Breakfast','Burgers','Chicken & Nuggets','Wraps','Sides & Fries','Cold Drinks','McCafé / Hot Drinks','Desserts & Treats','Sauces','Other'];
const counts=foods.reduce((out,food)=>(out[food.browseCategory]=(out[food.browseCategory]||0)+1,out),{});

test('reviewed browse taxonomy is presentation metadata beside the official source taxonomy',()=>{
  assert.deepEqual(catalogue.source.inventory.browseCategories,approved);
  assert.ok(foods.every(food=>food.category&&food.categoryMemberships.length&&food.browseCategory));
  assert.ok(foods.every(food=>approved.includes(food.browseCategory)));
});

test('all 209 runtime records have exactly one primary browse category',()=>{
  assert.equal(foods.length,209);assert.equal(Object.values(counts).reduce((sum,value)=>sum+value,0),209);
  assert.equal(foods.filter(food=>typeof food.browseCategory==='string').length,209);
});

test('all eleven reviewed category counts are stable, including the safe Other group',()=>{
  assert.deepEqual(counts,{'Burgers':15,'Chicken & Nuggets':15,'Sides & Fries':4,'Cold Drinks':70,'Breakfast':19,'Desserts & Treats':16,'Wraps':3,'McCafé / Hot Drinks':40,'Sauces':14,'Meals & Bundles':7,'Other':6});
  assert.equal(Object.keys(counts).length,11);
});

test('category adapter separates common menu families users browse differently',()=>{
  const category=name=>foods.find(food=>food.name===name)?.browseCategory;
  assert.equal(category('Big Mac'),'Burgers');assert.equal(category('Mega Brekkie McWrap'),'Breakfast');
  assert.equal(category('Classic Chicken McWrap'),'Wraps');assert.equal(category('6pc Chicken McNuggets'),'Chicken & Nuggets');
  assert.equal(category('Small Fries'),'Sides & Fries');assert.equal(category('Large Cappuccino'),'McCafé / Hot Drinks');
  assert.equal(category('Medium Iced Latte'),'Cold Drinks');assert.equal(category('Big Mac Special Sauce'),'Sauces');
  assert.equal(category('Pop Tops Water'),'Cold Drinks');assert.equal(category('Ham & Cheese Toastie'),'Other');
});

test('size-prefixed products are distributed by meaning rather than forming one alphabetical wall',()=>{
  const sized=foods.filter(food=>/^(?:Small|Medium|Large)\b/.test(food.name));assert.equal(sized.length,80);
  assert.deepEqual([...new Set(sized.map(food=>food.browseCategory))].sort(),['Cold Drinks','McCafé / Hot Drinks','Sides & Fries']);
});

test('browse tags retain useful official memberships and product language for source search',()=>{
  const wrap=foods.find(food=>food.name==='Classic Chicken McWrap'),latte=foods.find(food=>food.name==='Medium Iced Latte');
  assert.ok(wrap.browseTags.includes('Chicken & Fish'));assert.ok(wrap.browseTags.includes('mcwrap'));
  assert.ok(latte.browseTags.includes('McCafé Drinks'));assert.ok(latte.browseTags.includes('iced'));
});

test('source hub renders category counts, All Items and an honest 209-item scope',()=>{
  assert.match(runtime,/RC5_SOURCE_CATEGORIES/);assert.match(runtime,/data-rc5-source-category/);assert.match(runtime,/All Items/);
  assert.match(runtime,/Browse \$\{grouped\.foods\.length\} loaded products by reviewed menu category/);
});

test('category product views preserve progressive loading and explicit navigation',()=>{
  assert.match(runtime,/data-rc5-back-categories>Back To Categories/);assert.match(runtime,/data-rc5-source-more>Show More/);
  assert.match(runtime,/slice\(0,shown\)/);assert.match(runtime,/Back To All Resources/);assert.match(runtime,/Clear Product Filter/);
});

test('source navigation clears duplicate live results and cannot immediately reopen stale source state',()=>{
  assert.match(runtime,/if\(state\)\{const live=by\('food-live-results'\);if\(live\)\{live\.innerHTML='';live\.classList\.add\('hidden'\);\}/);
  assert.match(runtime,/data-rc5-source-category[\s\S]{0,420}by\('food-search'\)\.value=''/);
  assert.match(runtime,/data-rc4-leave-source[\s\S]{0,260}by\('food-search'\)\.value=''/);
});

test('source search can match names, aliases and browse tags without leaving the source',()=>{
  assert.match(runtime,/food\.browseTags/);assert.match(runtime,/tokens\.every\(token=>hay\.includes\(token\)\)/);
  assert.match(runtime,/rc5RenderSourceSurface\(state,raw\)/);
});

test('category controls have responsive card and phone layouts',()=>{
  assert.match(styles,/\.rc5-category-grid\{display:grid/);assert.match(styles,/\.rc5-category-card\{/);
  assert.match(styles,/@media\(max-width:520px\)[\s\S]*\.rc5-category-grid\{grid-template-columns:1fr\}/);
});
