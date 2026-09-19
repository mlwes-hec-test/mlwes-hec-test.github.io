/* Private product capture; catalogue evidence is never mutated or published. */
(function(global){
  'use strict';
  const VERSION='0.6.33',KEYS=['energyKj','calories','protein','carbs','fat','satFat','fibre','sugar','sodium','calcium','iron','potassium'];
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value)),P=()=>global.HECPackagedFoods;
  function valueOrNull(value){if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
  function emptyNutrients(){return Object.fromEntries(KEYS.map(key=>[key,null]));}
  function validBarcode(value){const clean=String(value||'').replace(/\D/g,'');return clean.length>=8&&clean.length<=14?clean:'';}
  function createScanSession(){return {state:'ready',barcode:'',locked:false,food:null};}
  function acceptDetection(session,raw){const barcode=validBarcode(raw);if(!barcode||session?.locked)return {accepted:false,session:{...session}};return {accepted:true,session:{...session,state:'detected',barcode,locked:true}};}
  function finishLookup(session,food,error=''){return {...session,state:food?'review':'not-found',food:food||null,error:String(error||''),locked:true};}
  function resetScanSession(){return createScanSession();}
  const ROWS=[['energyKj',/^(?:energy|calories?)\b/i,'kj'],['calories',/^(?:energy|calories?)\b/i,'kcal'],['protein',/^protein\b/i,'g'],['fat',/^(?:total\s+fat|fat(?:,?\s*total)?)\b/i,'g'],['satFat',/^(?:[-–]\s*)?(?:saturated|saturates)(?:\s+fat)?/i,'g'],['carbs',/^(?:carbohydrate|carbs)\b/i,'g'],['sugar',/^(?:[-–]\s*|of which\s+)?sugars?\b/i,'g'],['fibre',/^(?:dietary\s+)?fib(?:re|er)\b/i,'g'],['sodium',/^sodium\b/i,'mg'],['calcium',/^calcium\b/i,'mg'],['iron',/^iron\b/i,'mg'],['potassium',/^potassium\b/i,'mg']];
  function parseNutritionPanel(text){
    const clean=String(text||'').replace(/\r\n?/g,'\n'),lines=clean.split(/\n+/).map(line=>line.trim()).filter(Boolean),issues=[];
    const serveLine=lines.find(line=>/serv(?:ing|e|lng)\s*(?:size|slze)/i.test(line))||'',size=serveLine.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i),count=serveLine.match(/(\d+(?:[.,]\d+)?)\s*(pieces?|slices?|biscuits?|bars?|crackers?)\b/i),pack=clean.match(/servings?\s+per\s+pack(?:age)?\s*:?\s*(\d+(?:[.,]\d+)?)/i),number=value=>Number(value.replace(',','.')),servingAmount=size?number(size[1]):null;
    const headings=lines.filter(line=>/per\s*(?:serv(?:e|ing)\b|100\s*(?:g|ml)\b)/i.test(line)&&!/^serv(?:ing|e)\s*size/i.test(line)).join(' '),headers=[...headings.matchAll(/per\s*(serv(?:e|ing)\b|100\s*(g|ml)\b)/gi)].map(m=>({basis:/^100/i.test(m[1])?'per100':'perServing',unit:m[2]?(/ml/i.test(m[2])?'mL':'g'):''})).filter((h,i,a)=>a.findIndex(x=>x.basis===h.basis)===i);
    const per100Unit=headers.find(h=>h.basis==='per100')?.unit||'',servingUnit=size?(/ml/i.test(size[2])?'mL':'g'):per100Unit,perServing=emptyNutrients(),per100=emptyNutrients(),columns={perServing,per100};
    for(const [key,pattern,unit] of ROWS){
      const energy=key==='energyKj'||key==='calories',unitPattern=unit==='kj'?/\bkj\b/i:/\b(?:kcal|cal)\b/i;
      const line=lines.find(line=>pattern.test(line)&&(!energy||unitPattern.test(line)));if(!line)continue;
      const labelled=line.replace(pattern,''),rowUnit=labelled.match(/^\s*[,:(]?\s*(kJ|kcal|Cal|mg|g)\s*\)?\s*[:)]?/i)?.[1]?.toLowerCase().replace(/^cal$/,'kcal');
      const body=labelled.replace(/^\s*[,:(]?\s*(?:kJ|kcal|Cal|mg|g)\s*\)?\s*[:)]?/i,'');
      const tokens=[...body.matchAll(/([<>≤≥]?\s*[-+]?\d+(?:[.,]\d+)?)\s*(kcal|cal|kj|mg|g)?\b|(\?+|[—–])/gi)].map(m=>({raw:(m[1]||m[3]).trim(),unit:(m[2]||'').toLowerCase().replace(/^cal$/,'kcal')}));
      const values=energy?tokens.filter(t=>t.unit===unit||(!t.unit&&rowUnit===unit)):tokens;
      if(energy&&!values.length)continue;
      // One surviving token cannot establish which of two columns was unreadable.
      if(!headers.length||values.length!==headers.length){issues.push('uncertain-'+key+'-columns');continue;}
      values.forEach((token,index)=>{if(!/^\d+(?:[.,]\d+)?$/.test(token.raw)||(token.unit&&token.unit!==unit)){issues.push('confirm-'+headers[index].basis+'-'+key);return;}columns[headers[index].basis][key]=number(token.raw);});
    }
    for(const column of Object.values(columns))if(column.calories===null&&column.energyKj!==null)column.calories=column.energyKj/4.184;
    for(const [basis,column] of Object.entries(columns))for(const [part,total] of [['sugar','carbs'],['satFat','fat']])if(column[part]!==null&&column[total]!==null&&column[part]>column[total]+.2){column[part]=null;issues.push('confirm-'+basis+'-'+part);}
    if(!headers.length)issues.push('column-headings-not-recognised');
    if(perServing.calories===null&&per100.calories===null)issues.push('energy-not-recognised');
    const model=P().basisModel({perServing,per100,servingAmount,servingUnit,per100Unit,selectedBasis:perServing.calories!==null?'perServing':per100.calories!==null?'per100':'',servingText:serveLine,manufacturerServing:!!servingAmount,servingsPerPack:pack?number(pack[1]):null,servingCount:count?number(count[1]):null,servingCountUnit:count?count[2].toLowerCase().replace(/s$/,''):''});
    const ingredients=clean.match(/ingredients\s*:\s*([^\n]*(?:\n(?!\s*(?:nutrition|allergen|contains|storage)\b)[^\n]*)*)/i)?.[1]?.trim()||'';
    return {text:clean,...model,model,ingredients,detected:{perServing:headers.some(h=>h.basis==='perServing'),per100:headers.some(h=>h.basis==='per100')},issues:[...new Set(issues)],discrepancies:P().basisDiscrepancies(model),questionable:issues.length>0};
  }
  function chosenBasis(model){return model?.selectedBasis||((valueOrNull(model?.perServing?.calories)!==null||valueOrNull(model?.perServing?.energyKj)!==null)?'perServing':'per100');}
  function reviewStatus({name='',model,confirmed=false,discrepancyConfirmed=false}={}){
    const missing=[],basis=chosenBasis(model),values=model?.[basis]||{},energy=P().normalisedEnergy(values);
    if(!String(name).trim())missing.push('name');
    if(!['perServing','per100'].includes(basis))missing.push('basis');
    if(valueOrNull(energy.nutrients.calories)===null)missing.push('energy');
    if(basis==='per100'&&!['g','mL'].includes(model?.per100Unit||model?.servingUnit))missing.push('per100-unit');
    if(model?.servingAmount!=null&&(!(Number(model.servingAmount)>0)||!['g','mL'].includes(model.servingUnit)))missing.push('serving-size');
    if(basis==='per100'&&model?.manufacturerServing&&model.servingUnit!==(model.per100Unit||model.servingUnit))missing.push('basis-unit-conflict');
    for(const [key,value] of Object.entries(values))if(value!=null&&(valueOrNull(value)===null||Number(value)<0))missing.push('invalid-'+key);
    for(const [part,total] of [['sugar','carbs'],['satFat','fat']])if(valueOrNull(values[part])!==null&&valueOrNull(values[total])!==null&&Number(values[part])>Number(values[total])+.2)missing.push(part+'-exceeds-'+total);
    if(energy.integrity.status==='conflict')missing.push('energy-unit-conflict');
    const discrepancies=P().basisDiscrepancies(model);
    if(!confirmed)missing.push('package-confirmation');if(discrepancies.length&&!discrepancyConfirmed)missing.push('discrepancy-confirmation');
    return {ready:missing.length===0,missing,discrepancies,basis};
  }
  function validationMessage(status,model){
    const labels={name:'Enter the food name.',basis:'Confirm whether the values are per serve or per 100 g / mL.',energy:'Enter energy for '+(chosenBasis(model)==='perServing'?'one serve':'100 '+(model?.per100Unit||model?.servingUnit||'g / mL'))+'.','per100-unit':'Choose g or mL for the per-100 column.','serving-size':'Enter a positive serving size and its unit, or leave size blank for a fixed serve.','basis-unit-conflict':'Serving and per-100 units differ; confirm the correct basis.','package-confirmation':'Check the package and confirm the values.','discrepancy-confirmation':'Review the differing columns and confirm the selected calculation basis.','energy-unit-conflict':'The kJ and Cal values disagree. Correct them or clear the unreadable value.'};
    return status.missing.map(key=>labels[key]||'Check '+key.replace(/-/g,' ')+'.').join(' ');
  }
  function buildPanelFood({id,name,brand='',barcode='',model,confirmed=false,discrepancyConfirmed=false,ingredients='',packageSize='',catalogueFood=null,choice='panel',extracted=null}={}){
    const status=reviewStatus({name,model,confirmed,discrepancyConfirmed});if(!status.ready)return {food:null,status};
    const basis=status.basis,useServing=basis==='perServing',amount=model.manufacturerServing?valueOrNull(model.servingAmount):null,unit=useServing?model.servingUnit:(model.per100Unit||model.servingUnit),nutrients=P().normalisedEnergy(model[basis]).nutrients,units={},unitLabels={};
    let defaultAmount=useServing?1:100,defaultUnit=useServing?'serve':unit,serving=useServing?'Manufacturer serve':'Reference per 100 '+unit;
    if(useServing){units.serve=1;unitLabels.serve=amount?'Manufacturer Serve ('+amount+' '+unit+')':'Manufacturer Serve';if(amount)units[unit]=1/amount;}
    else{units[unit]=.01;if(amount&&model.servingUnit===unit){units.serve=amount/100;unitLabels.serve='Manufacturer Serve ('+amount+' '+unit+'; calculated from per 100 '+unit+')';defaultAmount=1;defaultUnit='serve';serving='Manufacturer serving '+amount+' '+unit+' · calculated from per 100 '+unit;}}
    if(amount&&useServing)serving='Manufacturer serving '+amount+' '+unit;
    if(units[unit])unitLabels[unit]=unit;
    if(Number(model.servingCount)>0&&/^(piece|slice|biscuit|bar|cracker)$/.test(model.servingCountUnit)&&units.serve){units[model.servingCountUnit]=units.serve/Number(model.servingCount);unitLabels[model.servingCountUnit]=model.servingCountUnit;}
    const food={id:String(id||'panel-'+Date.now()),recordType:'private',verificationStatus:'package-confirmed',market:'AU',barcode:validBarcode(barcode),name:String(name).trim(),brand:String(brand).trim(),category:'Packaged Food',country:'Australia',aliases:[name,brand].filter(Boolean),defaultAmount,defaultUnit,units,unitLabels,serving,nutrients,foodGroups:{},waterMl:null,hydrationType:unit==='mL'?'drink':'food',score:6,source:choice==='catalogue'?'Barcode Nutrition · User Checked':'Current Package Nutrition Panel · User Checked',verified:false,packageServingExplicit:!!amount,ingredients:String(ingredients).trim(),packageSize:String(packageSize).trim(),servingsPerPack:valueOrNull(model.servingsPerPack),nutritionStatus:'user-confirmed',loggable:true,recognisedOnly:false,productSemantics:{type:'packaged-serving',confidence:'high'},captureEvidence:{barcode:validBarcode(barcode),catalogue:catalogueFood?{id:catalogueFood.id,canonicalId:catalogueFood.canonicalId||null,barcode:catalogueFood.barcode||null,name:catalogueFood.name,brand:catalogueFood.brand||null,source:catalogueFood.source||null,nutrients:clone(catalogueFood.nutrients),units:clone(catalogueFood.units),nutritionBasis:reviewModelFor(catalogueFood)}:null,extracted:clone(extracted),confirmedPanel:clone(model),choice,confirmed:true}};
    P().attachBasis(food,{...model,selectedBasis:basis});return {food,status};
  }
  // Review adapter only: opening a legacy record never migrates or rewrites it.
  function reviewModelFor(food){
    if(food?.nutritionBasis&&typeof food.nutritionBasis==='object'){const unit=food.nutritionBasis.per100Unit||food.nutritionPer100Unit||(food.units?.g>0&&!food.units?.mL?'g':food.units?.mL>0&&!food.units?.g?'mL':'');return P().basisModel({...food.nutritionBasis,per100Unit:unit});}
    if(food?.nutritionPer100||food?.nutritionPerServing)return P().basisModel({per100:food.nutritionPer100,perServing:food.nutritionPerServing,per100Unit:food.nutritionPer100Unit||'',servingAmount:food.manufacturerServing?.amount,servingUnit:food.manufacturerServing?.unit||'',manufacturerServing:!!food.manufacturerServing});
    const unit=food?.units?.g>0?'g':food?.units?.mL>0?'mL':'',scale=unit?food.units[unit]:null,serve=food?.units?.serve;
    return P().basisModel({perServing:serve>0?P().scale(food.nutrients,serve):{},per100:scale?P().scale(food.nutrients,scale*100):{},servingAmount:serve>0&&scale?serve/scale:null,servingUnit:unit,per100Unit:unit,manufacturerServing:serve>0&&!!scale,selectedBasis:serve>0?'perServing':unit?'per100':''});
  }
  function comparePanel(catalogueFood,model){
    if(!catalogueFood)return {status:'none',rows:[]};
    const old=reviewModelFor(catalogueFood),basis=chosenBasis(model),newValues=P().normalisedEnergy(model?.[basis]).nutrients;let oldValues=old[basis];
    if(basis==='perServing'&&model.manufacturerServing&&model.servingUnit===(old.per100Unit||old.servingUnit)&&valueOrNull(old.per100.calories)!==null)oldValues=P().scale(old.per100,model.servingAmount/100);
    if(basis==='perServing'&&old.manufacturerServing&&model.manufacturerServing&&(old.servingAmount!==model.servingAmount||old.servingUnit!==model.servingUnit)&&valueOrNull(old.per100.calories)===null)oldValues={};
    if(basis==='per100'&&(old.per100Unit||old.servingUnit)!==(model.per100Unit||model.servingUnit))oldValues={};
    oldValues=P().normalisedEnergy(oldValues).nutrients;
    const rows=KEYS.filter(key=>key!=='energyKj'&&valueOrNull(newValues[key])!==null&&valueOrNull(oldValues[key])!==null).map(key=>({key,catalogue:oldValues[key],panel:newValues[key],different:Math.abs(oldValues[key]-newValues[key])>Math.max(['sodium','calcium','potassium'].includes(key)?5:.2,Math.abs(oldValues[key])*.05)}));
    return {status:!rows.length?'incomplete':rows.some(row=>row.different)?'different':'compatible',basis,rows};
  }
  function barcodeStatus(food){
    const status=P().completeness(food);
    // User-confirmed private nutrition is not subject to a catalogue macro
    // plausibility heuristic. The same Diary amount gate still applies.
    if(food?.recordType==='private'&&food.captureEvidence?.confirmed){const decision=global.HECFoodCatalogue?.addability?.(food);status.canAddToDiary=decision?decision.normalLoggingAllowed:!!food.name&&valueOrNull(food.nutrients?.calories)!==null&&P().supportedUnits(food).length>0;}
    return {...status,recognised:!!food?.name};
  }
  function actionsFor(food){const status=barcodeStatus(food);return {save:status.canSaveToMyFoods,add:status.canAddToDiary,both:status.canAddToDiary};}
  const api={version:VERSION,nutrientKeys:KEYS,valueOrNull,emptyNutrients,validBarcode,createScanSession,acceptDetection,finishLookup,resetScanSession,parseNutritionPanel,reviewStatus,validationMessage,chosenBasis,buildPanelFood,reviewModelFor,comparePanel,barcodeStatus,actionsFor};
  global.HECCaptureFoundation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
