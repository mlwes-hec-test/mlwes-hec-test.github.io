'use strict';
const {performance}=require('node:perf_hooks');
const search=require('../search-foundation.js');
const {afcdFoods}=require('./audit_progressive_food_resolution.js');
const off=require('./audit_open_food_facts_au.js');
const {stats}=require('./benchmark_universal_food_search.js');
const queries=['Bread','Whole meal bread','White bread','Milk','Cow milk','Oat milk','Cheese','Yoghurt','Cereal','Sausages','Hash Brown','Chips','Fries','Chicken','Apple','Crackers','Margarine','Burger','Rice','Eggs'];
function measure(count,fn){const timings=[];for(let i=0;i<count;i++){const start=performance.now();fn(i);timings.push(performance.now()-start);}return stats(timings);}
function run(samples=300){
  const records=off.allProducts(),intentClassification=measure(samples,i=>search.interpretFoodIntent(queries[i%queries.length],{records:afcdFoods}));
  const familyFacetResolution=measure(samples,i=>{const intent=search.interpretFoodIntent(queries[i%queries.length]),candidates=afcdFoods.filter(food=>search.conceptCompatibility(food,intent).compatible);search.nextConceptQuestion(intent,candidates);});
  const catalogueConceptEvidence=measure(records.length,i=>search.foodConceptEvidence(records[i]));
  return {version:search.version,baseline:'No directly comparable concept-layer benchmark exists at the protected baseline.',thresholds:null,status:'Timing evidence only; no new pass threshold introduced.',operations:{intentClassification,familyFacetResolution,catalogueConceptEvidence}};
}
if(require.main===module)console.log(JSON.stringify(run(Number(process.argv[2])||300),null,2));
module.exports={run};
