'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const search=require('../search-foundation.js'),catalogue=require('../food-catalogue.js'),off=require('./audit_open_food_facts_au.js'),{afcdFoods}=require('./audit_progressive_food_resolution.js');
const sources=require('../food-sources.js');require('../mcdonalds-au-catalogue.js');require('../kfc-au-catalogue.js');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const collisionChecks=[
  {concept:'bread',pattern:/\b(?:banana bread|garlic bread|crispbread|sausage in bread)\b|^bread, (?:banana|garlic)/i},
  {concept:'milk',pattern:/\b(?:milk chocolate|milkshake|breast milk|human milk)\b/i},
  {concept:'hash-brown',pattern:/hash.?brown.*(?:quiche|burger|wrap|meal)|(?:quiche|burger|wrap|meal).*hash.?brown/i},
  {concept:'cereal',pattern:/(?:cereal|muesli|granola) bars?\b/i},
  {concept:'cheese',pattern:/cheeseburger/i},
  {concept:'apple',pattern:/\bapple (?:pie|juice|cider|dried)\b|^Apple, dried/i},
  {concept:'egg',pattern:/chocolate.*egg|egg.*chocolate|egg noodle/i},
  {concept:'bread',pattern:/\bwholemeal wraps?\b/i}
];
function coverage(records){const report={};for(const concept of Object.keys(search.foodConceptRegistry)){
  const members=records.filter(food=>search.conceptCompatibility(food,concept).compatible),groups={};
  for(const food of members){const type=catalogue.recordType(food),source=food.foodSourceId||type,brand=food.brand||'Brand not listed',key=`${source} | ${brand}`,group=groups[key]||{source,type,brand,count:0,products:[]};group.count++;if(concept==='hash-brown')group.products.push({id:food.id,name:food.name});groups[key]=group;}
  report[concept]={count:members.length,groups:Object.values(groups).sort((a,b)=>a.source.localeCompare(b.source)||a.brand.localeCompare(b.brand))};
}return report;}
function run(output=path.join(os.tmpdir(),'hec-food-concept-catalogue.json')){
  const start=performance.now(),manifest=off.read('manifest.json'),raw=off.allProducts(manifest),before=hash(raw),counts={},violations=[],probes=Object.fromEntries(collisionChecks.map(check=>[check.concept,0]));
  assert.equal(raw.length,73300);assert.equal(manifest.sourceSha256.toUpperCase(),'F72687EE8BC6522054FE69DBFDA6B91902C16AF1EC2E043CDE27BC6C29AD8176');
  const records=raw.map(product=>({...product,recordType:'external-catalogue'}));
  for(const food of records){const evidence=search.foodConceptEvidence(food);counts[evidence.conceptId]=(counts[evidence.conceptId]||0)+1;
    for(const check of collisionChecks)if(check.pattern.test(food.name)){probes[check.concept]++;if(search.conceptCompatibility(food,check.concept).compatible)violations.push({id:food.id,name:food.name,expectedExclusion:check.concept,evidence});}
  }
  const restaurant=sources.foodRecords(),exactVariants=[];
  for(const base of restaurant)for(const variant of restaurant){if(base.id===variant.id||base.foodSourceId!==variant.foodSourceId)continue;const exact=search.semanticProductExactness(base,base.name),related=search.semanticProductExactness(variant,base.name);if(related.class!=='variant-superset')continue;exactVariants.push({base:base.name,variant:variant.name,source:base.foodSourceId});if(exact.priority<=related.priority)violations.push({base:base.name,variant:variant.name,reason:'exact-identity-not-prioritised'});}
  assert.equal(hash(raw),before,'Source catalogue mutated');const report={pass:violations.length===0,productsAudited:raw.length,source:{date:manifest.sourceSnapshotDate,hash:manifest.sourceSha256,imported:manifest.importedProducts,searchable:manifest.searchableProducts,brands:manifest.uniqueBrands,validGtins:manifest.validGtins},counts,collisionProbeCounts:probes,violations,exactVariants,coverage:coverage([...afcdFoods,...restaurant,...records]),durationMs:performance.now()-start};
  fs.writeFileSync(output,JSON.stringify(report,null,2));return {...report,output};
}
if(require.main===module){const report=run(process.argv[2]);console.log(JSON.stringify({...report,coverage:undefined,exactVariants:undefined},null,2));if(!report.pass)process.exitCode=1;}
module.exports={run,coverage,collisionChecks};
