((root,factory)=>{
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.HECActivity=api;
})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";

  const INTENSITIES=Object.freeze(["Light","Moderate","Vigorous"]);
  const PRESETS=Object.freeze([
    Object.freeze({id:"walking",label:"Walking",icon:"🚶",distance:true,estimate:true,mets:{Light:2.8,Moderate:3.5,Vigorous:5}}),
    Object.freeze({id:"cycling",label:"Cycling",icon:"🚲",distance:true,estimate:true,mets:{Light:4,Moderate:6.8,Vigorous:10}}),
    Object.freeze({id:"swimming",label:"Swimming",icon:"🏊",distance:false,estimate:true,mets:{Light:4.8,Moderate:7,Vigorous:9.8}}),
    Object.freeze({id:"gym-work",label:"Gym Work",icon:"🏋️",distance:false,estimate:true,mets:{Light:3.5,Moderate:5,Vigorous:7}}),
    Object.freeze({id:"gardening",label:"Gardening",icon:"🌱",distance:false,estimate:true,mets:{Light:3,Moderate:4,Vigorous:5.5}}),
    Object.freeze({id:"mowing",label:"Mowing",icon:"🌿",distance:false,estimate:true,mets:{Light:4,Moderate:5.5,Vigorous:7}}),
    Object.freeze({id:"hiking",label:"Hiking",icon:"🥾",distance:true,estimate:true,mets:{Light:4.5,Moderate:6.5,Vigorous:8}}),
    Object.freeze({id:"manual-other",label:"Manual / Other Activity",icon:"✍️",distance:false,estimate:false,mets:{}})
  ]);
  const PRESET_BY_ID=new Map(PRESETS.map(preset=>[preset.id,preset]));
  const POLICY_PERCENTAGES=Object.freeze([0,50,100]);

  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const whole=value=>Math.max(0,Math.round(number(value)));
  const localDateOf=record=>String(record?.localDate||record?.date||"").slice(0,10);
  const presetById=id=>PRESET_BY_ID.get(String(id||""))||PRESET_BY_ID.get("manual-other");
  const policyLabel=percent=>({0:"No additional exercise energy",50:"Add back half",100:"Add back all"}[normalisePolicyPercent(percent)]);
  function normalisePolicyPercent(value){const percent=Number(value);return POLICY_PERCENTAGES.includes(percent)?percent:0;}
  function policyKey(percent){return `${normalisePolicyPercent(percent)}-percent`;}
  function rawEnergy(record){return whole(record?.caloriesBurned??record?.calories);}
  function inferredLegacyPercent(record){
    const snapshot=Number(record?.creditPercentAtLog);
    if(Number.isFinite(snapshot)&&snapshot>=0)return snapshot;
    const raw=rawEnergy(record),credit=Number(record?.creditedCalories??record?.credit);
    return raw>0&&Number.isFinite(credit)?Math.round(credit/raw*1000)/10:0;
  }
  function policyAtDate(history,date){
    const target=String(date||"").slice(0,10);
    const sorted=(Array.isArray(history)?history:[]).filter(item=>item&&/^\d{4}-\d{2}-\d{2}$/.test(item.effectiveDate||"")).slice().sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
    return sorted.filter(item=>item.effectiveDate<=target).pop()||null;
  }
  function recordPolicy(history,{percent,effectiveDate,id,now}){
    const date=String(effectiveDate||"").slice(0,10),stamp=now||new Date().toISOString(),value=normalisePolicyPercent(percent),items=(Array.isArray(history)?history:[]).map(item=>({...item}));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return items;
    const existing=items.find(item=>item.effectiveDate===date);
    if(existing){
      if(normalisePolicyPercent(existing.percent)===value)return items;
      existing.percent=value;existing.label=policyLabel(value);existing.updatedAt=stamp;
    }else items.push({id:id||`exercise-policy-${date}`,effectiveDate:date,percent:value,label:policyLabel(value),source:"profile-exercise-credit",createdAt:stamp,updatedAt:stamp});
    return items.sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate));
  }
  function creditPercent(record,history){
    if(record?.creditPolicyManaged||record?.creditPolicyId){
      const policy=policyAtDate(history,localDateOf(record));
      if(policy)return normalisePolicyPercent(policy.percent);
    }
    return inferredLegacyPercent(record);
  }
  function allowanceCredit(record,history){return whole(rawEnergy(record)*creditPercent(record,history)/100);}
  function totalsForDate(records,date,history){
    return (Array.isArray(records)?records:[]).filter(record=>localDateOf(record)===date).reduce((totals,record)=>({raw:totals.raw+rawEnergy(record),credit:totals.credit+allowanceCredit(record,history)}),{raw:0,credit:0});
  }
  function estimateEnergy({presetId,intensity="Moderate",minutes,weightKg,weightSource="profile"}){
    const preset=presetById(presetId),level=INTENSITIES.includes(intensity)?intensity:"Moderate",duration=Math.max(0,number(minutes)),weight=Math.max(0,number(weightKg));
    if(!preset.estimate||!duration||!weight)return {calories:0,met:null,kind:"hec-estimate",method:"HEC estimate unavailable until duration and weight are available"};
    const met=number(preset.mets[level]),calories=whole(met*3.5*weight/200*duration);
    return {calories,met,kind:"hec-estimate",method:weightSource==="fallback"?"HEC estimate from activity, duration, intensity and a clearly identified 70 kg reference because no profile weight was available":"HEC estimate from activity, duration, intensity and current profile weight"};
  }
  function activityTypeForRecord(record){
    if(PRESET_BY_ID.has(record?.activityType))return record.activityType;
    const name=String(record?.name||"").trim().toLowerCase();
    return PRESETS.find(preset=>preset.id!=="manual-other"&&preset.label.toLowerCase()===name)?.id||"manual-other";
  }
  function buildRecord(input,{existing=null,policy=null,id,now,timeZone,weightKg=0,weightSource="profile",preserveLegacyPolicy=false}={}){
    const stamp=now||new Date().toISOString(),preset=presetById(input.activityType),activityType=preset.id,localDate=String(input.localDate||"").slice(0,10),intensity=preset.estimate&&INTENSITIES.includes(input.intensity)?input.intensity:"";
    const energyMode=preset.estimate&&input.energyMode!=="manual"?"hec-estimate":"manual";
    const estimate=energyMode==="hec-estimate"?estimateEnergy({presetId:activityType,intensity,minutes:input.minutes,weightKg,weightSource}):null;
    const calories=energyMode==="hec-estimate"?estimate.calories:whole(input.caloriesBurned);
    const legacy=!!(existing&&preserveLegacyPolicy&&!existing.creditPolicyManaged&&!existing.creditPolicyId&&localDateOf(existing)===localDate);
    const percent=legacy?inferredLegacyPercent(existing):normalisePolicyPercent(policy?.percent);
    const credited=whole(calories*percent/100),name=activityType==="manual-other"?String(input.name||existing?.name||"Other Activity").trim():preset.label;
    const provenance=energyMode==="hec-estimate"?estimate.method:"Energy entered manually by the user";
    const result={
      ...(existing||{}),id:existing?.id||id,date:existing?.date||stamp,localDate,timeZone:timeZone||existing?.timeZone||"",name,activityType,
      minutes:whole(input.minutes),durationMinutes:whole(input.minutes),distanceKm:preset.distance&&number(input.distanceKm)>0?Math.round(number(input.distanceKm)*100)/100:null,
      intensity,calories,caloriesBurned:calories,energySource:energyMode,energyProvenance:provenance,
      estimateProvenance:energyMode==="hec-estimate"?{kind:estimate.kind,method:estimate.method,met:estimate.met,weightKg:number(weightKg),weightSource}:{kind:"manual",method:provenance},
      credit:credited,creditedCalories:credited,creditPolicyAtLog:legacy?(existing.creditPolicyAtLog||"legacy-snapshot"):policyKey(percent),creditPercentAtLog:percent,
      creditPolicyManaged:!legacy,creditPolicyId:legacy?(existing.creditPolicyId||""):(policy?.id||""),notes:String(input.notes||"").trim(),createdAt:existing?.createdAt||stamp,updatedAt:stamp
    };
    return result;
  }
  function upsertRecord(records,record){
    const items=Array.isArray(records)?records.slice():[],index=items.findIndex(item=>item?.id===record?.id);
    if(index>=0)items[index]=record;else items.push(record);
    return items.filter((item,itemIndex)=>item?.id!==record?.id||itemIndex===(index>=0?index:items.length-1));
  }
  function deleteRecord(records,id){
    const items=Array.isArray(records)?records:[],index=items.findIndex(item=>item?.id===id);
    return index<0?{records:items.slice(),removed:null}:{records:items.filter((_,itemIndex)=>itemIndex!==index),removed:items[index]};
  }

  return Object.freeze({PRESETS,INTENSITIES,POLICY_PERCENTAGES,presetById,activityTypeForRecord,normalisePolicyPercent,policyLabel,policyKey,localDateOf,rawEnergy,inferredLegacyPercent,policyAtDate,recordPolicy,creditPercent,allowanceCredit,totalsForDate,estimateEnergy,buildRecord,upsertRecord,deleteRecord});
});
