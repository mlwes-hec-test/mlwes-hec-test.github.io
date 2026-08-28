/* Healthy Eating Companion — food-group attribution semantics 0.6.33.
   Pure helpers keep "not classified" distinct from a trustworthy zero. */
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const KEYS=Object.freeze(['vegetables','fruit','grains','proteinFoods','dairy']);
  const STATES=Object.freeze({CLASSIFIED:'classified',PARTIAL:'partially-classified',UNAVAILABLE:'unavailable'});
  const zero=()=>Object.fromEntries(KEYS.map(key=>[key,0]));
  const number=value=>Number.isFinite(Number(value))?Number(value):0;

  function explicitState(record){
    const raw=String(record?.foodGroupAttribution?.state||record?.foodGroupAttributionState||record?.foodGroupAttribution||'').toLowerCase();
    if(raw==='classified')return STATES.CLASSIFIED;
    if(raw==='partial'||raw==='partially-classified'||raw==='partially classified')return STATES.PARTIAL;
    if(raw==='unavailable'||raw==='not-classified'||raw==='not classified')return STATES.UNAVAILABLE;
    return '';
  }
  function attribution(record){
    const groups=record?.foodGroups&&typeof record.foodGroups==='object'?record.foodGroups:{},values=zero();
    for(const key of KEYS)values[key]=number(groups[key]);
    const stated=explicitState(record),mappedKeys=KEYS.filter(key=>Object.prototype.hasOwnProperty.call(groups,key)&&Number.isFinite(Number(groups[key]))),hasContribution=mappedKeys.some(key=>number(groups[key])!==0);
    let state=stated;
    if(!state)state=hasContribution?STATES.CLASSIFIED:STATES.UNAVAILABLE;
    return {state,values,mappedKeys,hasContribution};
  }
  function summarise(records,{emptyIsClassified=true}={}){
    const items=(records||[]).filter(Boolean),values=zero();
    if(!items.length)return {state:emptyIsClassified?STATES.CLASSIFIED:STATES.UNAVAILABLE,values,classifiedCount:0,unclassifiedCount:0,incomplete:false,totalCount:0};
    let classifiedCount=0,unclassifiedCount=0,partialCount=0;
    for(const item of items){
      const profile=attribution(item);for(const key of KEYS)values[key]+=profile.values[key];
      if(profile.state===STATES.CLASSIFIED)classifiedCount++;
      else if(profile.state===STATES.PARTIAL){partialCount++;unclassifiedCount++;}
      else unclassifiedCount++;
    }
    const state=unclassifiedCount?(classifiedCount||partialCount?STATES.PARTIAL:STATES.UNAVAILABLE):STATES.CLASSIFIED;
    return {state,values,classifiedCount,unclassifiedCount,incomplete:state!==STATES.CLASSIFIED,totalCount:items.length};
  }
  function average(daySummaries,days=7){
    const values=zero(),list=(daySummaries||[]),divisor=Math.max(1,Number(days)||list.length||1);let incomplete=false,available=false;
    for(const day of list){for(const key of KEYS)values[key]+=number(day?.values?.[key]);if(day?.state!==STATES.CLASSIFIED)incomplete=true;if(day?.state!==STATES.UNAVAILABLE)available=true;}
    for(const key of KEYS)values[key]/=divisor;
    return {state:incomplete?(available?STATES.PARTIAL:STATES.UNAVAILABLE):STATES.CLASSIFIED,values,incomplete,days:divisor};
  }
  function stateForFood(food){return attribution(food).state;}

  const api={version:VERSION,keys:KEYS,states:STATES,zero,attribution,summarise,average,stateForFood};
  global.HECFoodGroups=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
