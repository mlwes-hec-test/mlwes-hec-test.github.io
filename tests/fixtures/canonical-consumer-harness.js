'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),C=require('../../food-catalogue');
const runtime=fs.readFileSync(path.join(__dirname,'../../alpha06.js'),'utf8');
function productionFunction(name){const start=runtime.indexOf(`function ${name}(`);assert(start>=0,name);let depth=0,end=runtime.indexOf('{',start);for(;end<runtime.length;end++){if(runtime[end]==='{')depth++;else if(runtime[end]==='}'&&!--depth){end++;break;}}assert.equal(depth,0);return runtime.slice(start,end);}
function harness({local=[],online=[],rank=(food,query)=>C.rank(food,query).score}={}){
  const rows=[],legacyRows=[],results={innerHTML:''},context={window:{},C8:C,FOODS:local,ext:{onlineFoods:online},searchRank:rank,canonicalCatalogueRecords:new Map(),alpha0630ProductMatchCache:new Map(),allFoods:()=>[...local,...online],by:()=>results,resourceFoodRow:food=>{rows.push(food);return `<article data-id="${food.id}">${food.name}</article>`;},legacyFoodRow:item=>{legacyRows.push(item);return `<article data-details="${item.food.id}">${item.food.name}</article>`;}};
  vm.createContext(context);vm.runInContext(['rememberCanonicalFoods','getFood','canonicalCachedOnlinePolicy','cachedOnlineMatches','cachedLegacyMatches','renderOnlineLibrary','s23CacheProductMatches'].map(productionFunction).join('\n'),context);
  return Object.assign(context,{rows,legacyRows,results});
}
module.exports={harness};
