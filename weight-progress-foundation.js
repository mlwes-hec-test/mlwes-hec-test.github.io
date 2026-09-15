((root,factory)=>{
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.HECWeightProgress=api;
})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";

  const RANGES=Object.freeze([
    Object.freeze({id:"7",label:"7 Days",days:7}),
    Object.freeze({id:"14",label:"14 Days",days:14}),
    Object.freeze({id:"30",label:"30 Days",days:30}),
    Object.freeze({id:"90",label:"3 Months",days:90}),
    Object.freeze({id:"180",label:"6 Months",days:180}),
    Object.freeze({id:"365",label:"1 Year",days:365}),
    Object.freeze({id:"all",label:"All",days:null})
  ]);
  const RANGE_BY_ID=new Map(RANGES.map(range=>[range.id,range]));
  const datePattern=/^\d{4}-\d{2}-\d{2}$/;
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const roundWeight=value=>Math.round(number(value)*10)/10;
  const validRecord=record=>!!record&&datePattern.test(String(record.date||""))&&number(record.weightKg)>0;
  const recordStamp=record=>String(record?.updatedAt||record?.recordedAt||record?.createdAt||"");
  function shiftDate(date,days){
    const parsed=new Date(`${date}T12:00:00Z`);parsed.setUTCDate(parsed.getUTCDate()+days);
    return parsed.toISOString().slice(0,10);
  }
  function rangeById(id){return RANGE_BY_ID.get(String(id||""))||RANGE_BY_ID.get("30");}
  function effectiveRecords(records,{today="9999-12-31"}={}){
    const byDate=new Map();
    (Array.isArray(records)?records:[]).forEach((record,index)=>{
      if(!validRecord(record)||record.date>today)return;
      const previous=byDate.get(record.date),candidate={record,index};
      if(!previous||recordStamp(record)>recordStamp(previous.record)||(recordStamp(record)===recordStamp(previous.record)&&index>previous.index))byDate.set(record.date,candidate);
    });
    return [...byDate.values()].map(item=>item.record).sort((a,b)=>a.date.localeCompare(b.date)||recordStamp(a).localeCompare(recordStamp(b)));
  }
  function recordsInRange(records,period,today){
    const range=rangeById(period),date=String(today||new Date().toISOString().slice(0,10)),cutoff=range.days?shiftDate(date,-(range.days-1)):null;
    return effectiveRecords(records,{today:date}).filter(record=>!cutoff||record.date>=cutoff);
  }
  function localDomain(records){
    const values=(Array.isArray(records)?records:[]).filter(validRecord).map(record=>number(record.weightKg));
    if(!values.length)return {min:null,max:null,span:0};
    const low=Math.min(...values),high=Math.max(...values),spread=high-low,pad=Math.max(.5,spread*.16);
    const centre=(high+low)/2,span=Math.max(2,spread+pad*2);
    let min=Math.floor((centre-span/2)*10)/10,max=Math.ceil((centre+span/2)*10)/10;
    return {min,max,span:max-min};
  }
  // Screen-sized coordinates keep text and strokes readable on narrow phones.
  // Only annotations are thinned; every effective saved record remains plotted.
  function chartLayout(model,{width=360,height=340}={}){
    const W=Math.max(240,Math.round(width)),H=Math.max(260,Math.round(height)),L=54,R=30,T=36,B=56;
    const plotW=W-L-R,plotH=H-T-B,points=model.points.map(point=>({...point,x:L+point.x*plotW,y:T+point.y*plotH}));
    const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const labels=[],count=Math.min(10,Math.max(3,Math.floor(plotW/48)*2));
    const candidates=[points.findIndex(point=>point.selected),0,points.length-1,...labelIndices(points.length,count)];
    for(const index of new Set(candidates)){
      const point=points[index];if(!point)continue;
      const text=number(point.record.weightKg).toFixed(1),width=text.length*8+8;
      const x=Math.max(L+width/2,Math.min(W-8-width/2,point.x));
      const neighbours=[points[index-1],points[index+1]].filter(Boolean),above=!neighbours.length||point.y<=neighbours.reduce((sum,item)=>sum+item.y,0)/neighbours.length;
      const offsets=above?[-22,28,-42,48]:[28,-22,48,-42];
      for(const offset of offsets){
        const y=point.y+offset,box={left:x-width/2,right:x+width/2,top:y-14,bottom:y+4};
        if(box.top<T-22||box.bottom>H-B+20||labels.some(label=>intersects(box,label.box)))continue;
        if(points.some(other=>intersects(box,{left:other.x-8,right:other.x+8,top:other.y-8,bottom:other.y+8})))continue;
        // Keep the connecting line out of the text box as well as the dots.
        if(points.slice(1).some((end,i)=>{const start=points[i],left=Math.max(box.left,start.x),right=Math.min(box.right,end.x);if(left>right)return false;const at=x=>start.y+(end.y-start.y)*(x-start.x)/(end.x-start.x||1),a=at(left),b=at(right);return Math.min(a,b)<box.bottom&&Math.max(a,b)>box.top;}))continue;
        labels.push({index,text,x,y,box});break;
      }
    }
    const dateIndices=labelIndices(points.length,Math.max(2,Math.floor(plotW/90)));
    return {width:W,height:H,left:L,right:W-R,top:T,bottom:H-B,points,labels,dateIndices};
  }
  function labelIndices(count,maxLabels=6){
    if(count<=0)return [];
    const slots=Math.max(2,Math.min(count,Math.floor(maxLabels)||6));
    if(count<=slots)return Array.from({length:count},(_,index)=>index);
    return [...new Set(Array.from({length:slots},(_,index)=>Math.round(index*(count-1)/(slots-1))))];
  }
  function chartModel(records,{period="30",today,selectedId="",maxLabels=6}={}){
    const items=recordsInRange(records,period,today),domain=localDomain(items),labels=new Set(labelIndices(items.length,maxLabels));
    const selected=items.find(record=>String(record.id||record.date)===String(selectedId||""))||items[items.length-1]||null;
    const points=items.map((record,index)=>({
      record,index,x:items.length===1?.5:index/(items.length-1),y:domain.span?(domain.max-number(record.weightKg))/domain.span:.5,labelled:labels.has(index),selected:record===selected
    }));
    return {period:rangeById(period).id,state:items.length===0?"empty":items.length===1?"single":"series",records:items,domain,points,selected,rangeChange:items.length>1?roundWeight(number(items[items.length-1].weightKg)-number(items[0].weightKg)):0};
  }
  function changeDescription(delta,goal){
    const value=roundWeight(delta);
    if(goal==="lose"&&value<0)return {label:"Weight loss since start",value:Math.abs(value),direction:"towards-goal"};
    if(goal==="gain"&&value>0)return {label:"Weight gain since start",value:Math.abs(value),direction:"towards-goal"};
    if(goal==="maintain"&&value===0)return {label:"Change since start",value:0,direction:"steady"};
    return {label:"Change since start",value,direction:"neutral"};
  }
  function startingRecord(records,{today,profileStart="",startingWeightDate=""}={}){
    const all=effectiveRecords(records,{today:String(today||"9999-12-31")}),eligible=all.filter(record=>!profileStart||record.date>=profileStart);
    if(!eligible.length)return null;
    // A later marker must never replace an earlier effective record that is
    // visibly part of the same history. An explicit start date is valid here
    // only when it identifies that earliest effective record.
    const earliest=eligible[0],explicit=eligible.find(record=>record.date===startingWeightDate);
    return explicit&&explicit.date===earliest.date?explicit:earliest;
  }
  function journeySummary(records,{today,goalWeight=0,goal="",selectedId="",period="30",profileStart="",startingWeightDate=""}={}){
    const all=effectiveRecords(records,{today:String(today||"9999-12-31")}),view=chartModel(records,{period,today,selectedId}),start=startingRecord(records,{today,profileStart,startingWeightDate}),current=all[all.length-1]||null;
    return {start,current,goalWeight:number(goalWeight)>0?roundWeight(goalWeight):null,selected:view.selected,rangeChange:view.rangeChange,totalChange:start&&current?roundWeight(number(current.weightKg)-number(start.weightKg)):0,change:changeDescription(start&&current?number(current.weightKg)-number(start.weightKg):0,goal)};
  }
  function upsertWeightRecord(records,input,{id,now,timeZone}={}){
    const items=Array.isArray(records)?records.slice():[],date=String(input?.date||"").slice(0,10),weightKg=roundWeight(input?.weightKg),stamp=now||new Date().toISOString();
    if(!datePattern.test(date)||weightKg<=0)return {records:items,record:null,created:false,replaced:false};
    const index=items.findIndex(record=>record?.date===date),existing=index>=0?items[index]:null;
    const record={...(existing||{}),id:existing?.id||id,date,weightKg,note:String(input?.note||"Progress Check-In"),timeZone:timeZone||existing?.timeZone||"",recordedAt:stamp,createdAt:existing?.createdAt||existing?.recordedAt||stamp,updatedAt:stamp};
    if(index>=0)items[index]=record;else items.push(record);
    return {records:items,record,created:index<0,replaced:index>=0};
  }
  function latestApplicable(records,today){const items=effectiveRecords(records,{today:String(today||"9999-12-31")});return items[items.length-1]||null;}
  function validateDate(date,{profileStart="",today}={}){
    const value=String(date||"").slice(0,10),current=String(today||new Date().toISOString().slice(0,10));
    if(!datePattern.test(value))return "invalid";
    if(value>current)return "future";
    if(profileStart&&value<profileStart)return "before-profile";
    return "valid";
  }

  return Object.freeze({RANGES,rangeById,shiftDate,effectiveRecords,recordsInRange,localDomain,labelIndices,chartModel,chartLayout,startingRecord,journeySummary,changeDescription,upsertWeightRecord,latestApplicable,validateDate,roundWeight});
});
