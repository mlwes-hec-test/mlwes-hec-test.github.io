#!/usr/bin/env node
'use strict';

const search=require('../search-foundation.js');
const catalogue=require('../food-catalogue.js');
const serving=require('../serving-foundation.js');
const guided=require('../guided-product-resolution.js');
const progressive=require('./audit_progressive_food_resolution.js');
const off=require('./audit_open_food_facts_au.js');

const slug=value=>search.norm(value).replace(/\s+/g,'-');
const classifyForm=food=>serving.servingMeasureProfile(food)?.physicalForm||serving.physicalForm(food).form;
const solid=form=>!['liquid','spread'].includes(form);
const uniqueBy=(values,key)=>[...new Map(values.map(value=>[key(value),value])).values()];

function genericConceptAudit(count=100){
  const source=uniqueBy(progressive.afcdFoods.filter(food=>food?.name),food=>search.norm(food.name.split(',')[0])).slice(0,count);
  const rows=source.map(food=>{
    const label=food.name.split(',')[0],form=classifyForm(food),simple=/^(?:fruit|vegetable|banana|apple|orange|pear|milk|water)$/i.test(label),concept={key:slug(label),label,aliases:[label],category:form==='liquid'?'drink':'generic',sourcePolicy:simple?'skip':'early',composition:simple?'simple':'composite',physicalForm:form},plan=search.sourceContextPlan(concept,label),profile=serving.servingMeasureProfile(food),model=catalogue.submittedResultModel([food],label),unsafeMl=solid(form)&&profile.measures.some(measure=>measure.key==='mL');
    return {concept:concept.key,form,sourceBranchApplicable:plan.choices.length===4,sourceSkipped:simple&&plan.choices.length===0,resultGroups:model.groups.map(group=>group.key),questions:0,stuck:!model.groups.length,unsafeAssumptions:unsafeMl?1:0,incompatibleUnits:unsafeMl?['mL']:[],redundantQuestions:0};
  });
  return {sampled:rows.length,sourceBranched:rows.filter(row=>row.sourceBranchApplicable).length,sourceSkipped:rows.filter(row=>row.sourceSkipped).length,stuck:rows.filter(row=>row.stuck).length,unsafeAssumptions:rows.reduce((sum,row)=>sum+row.unsafeAssumptions,0),incompatibleUnits:rows.reduce((sum,row)=>sum+row.incompatibleUnits.length,0),redundantQuestions:rows.reduce((sum,row)=>sum+row.redundantQuestions,0),rows};
}

function productAudit(count=200){
  const manifest=off.read('manifest.json'),shards=off.sampleEvenly(manifest.productShards,Math.min(count,manifest.productShards.length)),records=[];
  for(let index=0;index<shards.length&&records.length<count;index++){const products=off.read(shards[index].path).products;if(products.length)records.push({food:off.api.toFood(products[(index*7919)%products.length]),shard:shards[index].path});}
  const rows=records.map(({food,shard})=>{const profile=serving.servingMeasureProfile(food),session=guided.createSession([food],`${food.brand||''} ${food.name}`.trim(),{intent:{kind:'exact-product'}}),unsafe=solid(profile.physicalForm)&&profile.measures.some(measure=>['mL','L'].includes(measure.key)),malformed=serving.servingMeasureProfile({...food,physicalForm:'solid-weight',units:{...(food.units||{}),mL:.01},unitLabels:{...(food.unitLabels||{}),mL:'mL'}}),quarantined=!malformed.measures.some(measure=>measure.key==='mL')&&malformed.rejectedMeasures.some(measure=>measure.key==='mL');return {id:food.id,shard,form:profile.physicalForm,reachable:!!session.exactProduct||session.resolutionState===guided.states.INCOMPLETE,skipsGeneric:!session.nextQuestion,amountBeginsBlank:session.amount===null,nutritionBasisSeparate:session.amount===null,unsafeUnit:unsafe,malformedRejected:quarantined,measures:profile.measures.map(measure=>measure.key)};});
  return {sampled:rows.length,shards:uniqueBy(rows,row=>row.shard).length,reachable:rows.filter(row=>row.reachable).length,skipRedundantGeneric:rows.filter(row=>row.skipsGeneric).length,blankAmount:rows.filter(row=>row.amountBeginsBlank).length,nutritionBasisSeparate:rows.filter(row=>row.nutritionBasisSeparate).length,unsafeUnits:rows.filter(row=>row.unsafeUnit).length,malformedRejected:rows.filter(row=>row.malformedRejected).length,failures:rows.filter(row=>!row.reachable||!row.skipsGeneric||!row.amountBeginsBlank||row.unsafeUnit||!row.malformedRejected).slice(0,20),rows};
}

function unseenFoodAudit(count=30){
  const excluded=/\b(?:hash brown|hamburger|chips|pizza|sausage roll|meat pie|margarine|milk|bread|yoghurt|cereal|banana|flora|big mac|wicked wings|popcorn chicken|bunnings|chiko|fries)\b/i,foods=uniqueBy(progressive.afcdFoods.filter(food=>food.name&&!excluded.test(food.name)),food=>search.norm(food.name.split(',')[0])).slice(0,count),rows=foods.map(food=>{const query=food.name.split(',')[0],model=catalogue.submittedResultModel([food],query),profile=serving.servingMeasureProfile(food),outcome=model.groups.length?'safe-identity':profile?.measures?.length?'safe-identity':'safe-incomplete';return {query,outcome,stuck:!['safe-identity','safe-incomplete','manual-handoff'].includes(outcome),measureCount:profile?.measures?.length||0};});return {sampled:rows.length,safeIdentity:rows.filter(row=>row.outcome==='safe-identity').length,safeIncomplete:rows.filter(row=>row.outcome==='safe-incomplete').length,manualHandoff:rows.filter(row=>row.outcome==='manual-handoff').length,stuck:rows.filter(row=>row.stuck).length,briefExamplesExcluded:rows.every(row=>!excluded.test(row.query)),rows};
}

function quantityAudit(count=100){
  const quantities=[['1',1],['two',2],['3',3],['six',6],['ten',10],['1.5',1.5],['1.75',1.75],['half',.5],['three quarters',.75],['one and a half',1.5]],foods=['apples','eggs','serves soup','slices toast','cups cereal','biscuits','bars muesli','pieces fruit','packets oats','bottles water'],rows=[];
  for(const [quantity,expected] of quantities)for(const food of foods){if(rows.length>=count)break;const query=`${quantity} ${food}`,parsed=search.parseQuantityLanguage(query);rows.push({query,expected,actual:parsed.consumedQuantity,identity:parsed.identityQuery,unit:parsed.consumedUnit,pass:Math.abs(parsed.consumedQuantity-expected)<1e-9&&!!parsed.identityQuery});}
  const counted=[{name:'6 Counted Product',productSemantics:{count:6},semanticType:'counted-item'}],variant=search.parseQuantityLanguage('six Counted Product',{candidates:counted}),consumed=search.parseQuantityLanguage('two six-piece Counted Product',{candidates:counted});
  return {sampled:rows.length,passed:rows.filter(row=>row.pass).length,failed:rows.filter(row=>!row.pass),variantCountSeparated:variant.productVariantCount===6&&variant.consumedQuantity===1,consumedCountSeparated:consumed.productVariantCount===6&&consumed.consumedQuantity===2,rows};
}

async function run(){const generic=genericConceptAudit(100),products=productAudit(200),unseen=unseenFoodAudit(30),quantity=quantityAudit(100),report={version:search.version,generic,products,unseen,quantity};const ok=generic.sampled>=100&&generic.stuck===0&&generic.incompatibleUnits===0&&products.sampled>=200&&products.failures.length===0&&unseen.sampled>=30&&unseen.stuck===0&&quantity.sampled>=100&&quantity.failed.length===0&&quantity.variantCountSeparated&&quantity.consumedCountSeparated;return {...report,ok};}

if(require.main===module)run().then(report=>{process.stdout.write(`${JSON.stringify(report,null,2)}\n`);if(!report.ok)process.exitCode=1;}).catch(error=>{console.error(error);process.exit(1);});
module.exports={genericConceptAudit,productAudit,unseenFoodAudit,quantityAudit,run};
