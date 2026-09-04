#!/usr/bin/env node
'use strict';

const {performance}=require('node:perf_hooks');
const search=require('../search-foundation.js');
const catalogue=require('../food-catalogue.js');
const serving=require('../serving-foundation.js');
const guided=require('../guided-product-resolution.js');
const progressive=require('./audit_progressive_food_resolution.js');
const off=require('./audit_open_food_facts_au.js');

function stats(values){const ordered=[...values].sort((a,b)=>a-b),pick=p=>ordered[Math.min(ordered.length-1,Math.floor((ordered.length-1)*p))]||0;return {samples:ordered.length,medianMs:Number(pick(.5).toFixed(3)),p95Ms:Number(pick(.95).toFixed(3)),worstMs:Number((ordered.at(-1)||0).toFixed(3))};}
function measure(samples,operation){const values=[];for(let index=0;index<samples;index++){const start=performance.now();operation(index);values.push(performance.now()-start);}return stats(values);}
function resolveToAmount(session){let guard=0;while(session.stage===guided.stages.IDENTITY&&session.nextQuestion&&guard++<20)guided.answerDistinction(session,session.nextQuestion.key,session.nextQuestion.options.find(option=>option.value!=='__unsure__')?.value||session.nextQuestion.options[0]?.value);if(session.stage===guided.stages.MEASURE&&session.servingProfile?.measures[0])guided.selectMeasure(session,session.servingProfile.measures[0].key);return session;}

async function run(samples=300){
  const afcd=progressive.afcdFoods,manifest=off.read('manifest.json'),productRecords=off.sampleEvenly(off.allProducts(manifest).filter(product=>product.name),200).map(off.api.toFood),records=[...afcd.slice(0,200),...productRecords],genericQueries=['pizza','sausage roll','curry','soup'],exactProducts=productRecords.filter(food=>food.name&&food.units&&Object.keys(food.units).length).slice(0,20),exactQueries=exactProducts.map(food=>`${food.brand||''} ${food.name}`.trim()),composite=search.conceptFromQuery('pizza'),genericCandidates=afcd.filter(food=>/^Margarine spread\b/i.test(food.name)),profileFoods=[...exactProducts.slice(0,10),...afcd.slice(0,10)],amountFood=exactProducts.find(food=>serving.servingMeasureProfile(food)?.measures?.length)||afcd[0];
  const report={
    previewRecognition:measure(samples,index=>search.predictConcepts(genericQueries[index%genericQueries.length])),
    submittedGenericSearch:measure(Math.min(samples,150),index=>catalogue.submittedResultModel(records,genericQueries[index%genericQueries.length])),
    submittedExactProductSearch:measure(Math.min(samples,150),index=>catalogue.submittedResultModel(records,exactQueries[index%exactQueries.length])),
    groupedResultCreation:measure(Math.min(samples,150),index=>catalogue.submittedResultModel(records,index%2?'pizza':'soup',{savedIds:[]})),
    sourceBranching:measure(samples,index=>search.sourceContextPlan(composite,genericQueries[index%genericQueries.length])),
    progressiveCandidateResolution:measure(Math.min(samples,150),()=>{const session=guided.createSession(genericCandidates,'Margarine',{intent:{kind:'generic-category'}});if(session.nextQuestion)guided.answerDistinction(session,session.nextQuestion.key,session.nextQuestion.options[0].value);}),
    quantityParsing:measure(samples,index=>search.parseQuantityLanguage(index%2?'two six-piece Counted Product':'one and a half serves soup',{candidates:[{name:'6 Counted Product',productSemantics:{count:6}}]})),
    physicalFormProfile:measure(samples,index=>serving.physicalForm(profileFoods[index%profileFoods.length])),
    portionProfileCreation:measure(Math.min(samples,200),index=>serving.servingMeasureProfile(profileFoods[index%profileFoods.length])),
    amountToReview:measure(Math.min(samples,200),()=>{const session=resolveToAmount(guided.createSession([amountFood],`${amountFood.brand||''} ${amountFood.name}`.trim(),{intent:{kind:'exact-product'}}));if(session.stage===guided.stages.AMOUNT)guided.selectAmount(session,1);})
  };
  return {version:search.version,catalogueRecords:records.length,samplesRequested:samples,operations:report};
}

if(require.main===module)run(Number(process.argv[2])||300).then(report=>process.stdout.write(`${JSON.stringify(report,null,2)}\n`)).catch(error=>{console.error(error);process.exit(1);});
module.exports={stats,measure,run};
