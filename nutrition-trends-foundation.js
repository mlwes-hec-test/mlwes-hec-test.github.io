/* Healthy Eating Companion — recorded-day nutrition trend foundation 0.6.33.
   Pure modelling only: unrecorded days and incomplete nutrient days are omitted,
   never converted to zero.
*/
((root,factory)=>{
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.HECNutritionTrends=api;
})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";

  const RANGES=Object.freeze([
    Object.freeze({id:"7",label:"7 Days",days:7}),Object.freeze({id:"14",label:"14 Days",days:14}),Object.freeze({id:"30",label:"30 Days",days:30}),
    Object.freeze({id:"90",label:"3 Months",days:90}),Object.freeze({id:"180",label:"6 Months",days:180}),Object.freeze({id:"365",label:"1 Year",days:365}),Object.freeze({id:"all",label:"All",days:null})
  ]);
  const METRICS=Object.freeze({
    energy:Object.freeze({id:"energy",key:"calories",label:"Energy",unit:"Cal",targetKey:"calories"}),
    protein:Object.freeze({id:"protein",key:"protein",label:"Protein",unit:"g",targetKey:"protein"}),
    fibre:Object.freeze({id:"fibre",key:"fibre",label:"Fibre",unit:"g",targetKey:"fibre"}),
    sodium:Object.freeze({id:"sodium",key:"sodium",label:"Sodium",unit:"mg",targetKey:"sodium"})
  });
  const datePattern=/^\d{4}-\d{2}-\d{2}$/;
  const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
  function shiftDate(date,days){const parsed=new Date(`${date}T12:00:00Z`);parsed.setUTCDate(parsed.getUTCDate()+days);return parsed.toISOString().slice(0,10);}
  function metricById(id){return METRICS[id]||METRICS.energy;}
  function rangeById(id){return RANGES.find(range=>range.id===String(id||""))||RANGES[2];}
  function recordedDayValues(diary,metricId){
    const metric=metricById(metricId),out=[];
    for(const [date,rawEntries] of Object.entries(diary||{})){
      if(!datePattern.test(date))continue;
      const entries=(Array.isArray(rawEntries)?rawEntries:[]).filter(entry=>entry&&entry.status!=="skipped");
      if(!entries.length||entries.some(entry=>!finite(entry.nutrients?.[metric.key])))continue;
      out.push({date,value:entries.reduce((sum,entry)=>sum+Number(entry.nutrients[metric.key]),0),foodCount:entries.length});
    }
    return out.sort((a,b)=>a.date.localeCompare(b.date));
  }
  function labelIndices(count,maxLabels=6){if(count<=0)return[];const slots=Math.max(2,Math.min(count,Math.floor(maxLabels)||6));if(count<=slots)return Array.from({length:count},(_,index)=>index);return [...new Set(Array.from({length:slots},(_,index)=>Math.round(index*(count-1)/(slots-1))))];}
  function trendModel(diary,{metric="energy",period="30",today="9999-12-31",target=null,selectedDate="",maxLabels=6}={}){
    const definition=metricById(metric),range=rangeById(period),cutoff=range.days?shiftDate(today,-(range.days-1)):null;
    const records=recordedDayValues(diary,definition.id).filter(record=>record.date<=today&&(!cutoff||record.date>=cutoff));
    const targetValue=finite(target)&&Number(target)>0?Number(target):null,values=records.map(record=>record.value),domainValues=targetValue===null?values:[...values,targetValue];
    let min=domainValues.length?Math.min(...domainValues):0,max=domainValues.length?Math.max(...domainValues):0;
    const spread=max-min,pad=spread?Math.max(spread*.12,definition.id==="sodium"?25:1):Math.max(max*.08,definition.id==="sodium"?50:5);
    min=Math.max(0,min-pad);max=max+pad;if(max<=min)max=min+1;
    const selected=records.find(record=>record.date===selectedDate)||records[records.length-1]||null,labels=new Set(labelIndices(records.length,maxLabels));
    const points=records.map((record,index)=>({record,index,x:records.length===1?.5:index/(records.length-1),y:(max-record.value)/(max-min),labelled:labels.has(index),selected:record===selected}));
    return {metric:definition,period:range.id,state:records.length===0?"empty":records.length===1?"single":"series",records,points,selected,target:targetValue,domain:{min,max,span:max-min}};
  }

  return Object.freeze({RANGES,METRICS,metricById,rangeById,shiftDate,recordedDayValues,labelIndices,trendModel});
});
