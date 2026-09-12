'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),S=require('../serving-foundation'),G=require('../guided-product-resolution'),sources=require('../food-sources');
require('../australian-catalogue-data');
const sourceId='hungry-jacks-au';
function run(){
  const input=require('../data/australian-catalogue/supplemental.json'),raw=input.records.filter(r=>r.sourceId===sourceId),foods=sources.foodRecords({sourceId}),counts={},issues=[],families={},unknowns=[];
  const record=(condition,id,code)=>{if(!condition)issues.push({id,code});};
  record(new Set(foods.map(f=>f.id)).size===foods.length,sourceId,'duplicate-canonical-id');
  record(C.canonicaliseRecords(foods).length===foods.length,sourceId,'runtime-dedupe-drift');
  for(const food of foods){
    const e=C.productEligibility(food),profile=S.servingMeasureProfile(food);counts[e.addability.status]=(counts[e.addability.status]||0)+1;(families[food.browseCategory]||=[]).push(food.name);
    record(e.source.trustClass==='official-au-restaurant'&&e.source.market==='AU',food.id,'source-trust');
    record(/^https:\/\/www.hungryjacks.com.au\//.test(food.sourceProvenance.url)&&/^[a-f0-9]{64}$/.test(food.sourceProvenance.sha256),food.id,'provenance');
    const conflicts=e.conflicts.filter(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved'));
    record(!conflicts.length||!e.addability.normalLoggingAllowed,food.id,'conflict-loggable');
    const evidence=raw.filter(r=>C.norm(r.canonicalSourceRecordId||r.name).replace(/\s+/g,'-')===food.sourceItemId);
    record(evidence.length>0,food.id,'raw-reference');
    if(e.addability.normalLoggingAllowed){
      record(profile.measures.length>0,food.id,'missing-measure');
      if(profile.physicalForm!=='liquid')record(!profile.measures.some(m=>['mL','L','cup'].includes(m.key)),food.id,'liquid-solid-measure');
      record(food.defaultUnit!=='g',food.id,'unnatural-default');
      const session=G.createSession([food],`${food.brand} ${food.name}`,{intent:{kind:'exact-product'}}),unit=profile.preferredMeasure;
      G.selectMeasure(session,unit);G.selectAmount(session,2);
      record(session.stage===G.stages.CONFIRMATION,food.id,'review-unreachable');
      record(Math.abs(session.nutrition.energyKj-food.nutrients.energyKj*Number(food.units[unit])*2)<.1,food.id,'amount-scaling');
      for(const key of ['protein','carbs','fat','satFat','sugar','sodium','fibre'])if(food.nutrients[key]==null){unknowns.push({id:food.id,key});record(session.nutrition[key]==null,food.id,'unknown-became-zero');}
    }
  }
  const build=require('../data/australian-catalogue/build-report.json').sourceCounts[sourceId];
  record(build.raw===raw.length&&build.canonical===foods.length&&build.loggable===counts['loggable-now'],sourceId,'builder-runtime-counts');
  return {pass:issues.length===0,rawRows:raw.length,canonical:foods.length,eligibility:counts,collapsedAppearances:raw.length-foods.length,conflictBlocked:foods.filter(f=>C.productEligibility(f).conflicts.some(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved'))).length,current:foods.filter(f=>f.currentState==='listed-at-retrieval').length,uncertain:foods.filter(f=>f.currentState==='uncertain').length,families,unknownFieldsChecked:unknowns.length,issues};
}
if(require.main===module){const report=run();if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2));console.log(JSON.stringify({...report,families:Object.fromEntries(Object.entries(report.families).map(([k,v])=>[k,v.length]))},null,2));assert(report.pass);}
module.exports={run};
