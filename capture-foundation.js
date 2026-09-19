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
  function parseNutritionPanel(text,{uncertainLines=[]}={}){
    const clean=String(text||'').replace(/\r\n?/g,'\n'),lines=clean.split(/\n+/).map(line=>line.trim()).filter(Boolean),issues=[];
    const serveLine=lines.find(line=>/serv(?:ing|e|lng)\s*(?:size|slze)/i.test(line))||'',size=serveLine.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i),count=serveLine.match(/(\d+(?:[.,]\d+)?)\s*(pieces?|slices?|biscuits?|bars?|crackers?)\b/i),pack=clean.match(/servings?\s+per\s+pack(?:age)?\s*:?\s*(\d+(?:[.,]\d+)?)/i),number=value=>Number(value.replace(',','.')),servingAmount=size?number(size[1]):null;
    const headings=lines.filter(line=>/per\s*(?:serv(?:e|ing)\b|100\s*(?:g|ml)\b)/i.test(line)&&!/^serv(?:ing|e)\s*size/i.test(line)).join(' '),headers=[...headings.matchAll(/per\s*(serv(?:e|ing)\b|100\s*(g|ml)\b)/gi)].map(m=>({basis:/^100/i.test(m[1])?'per100':'perServing',unit:m[2]?(/ml/i.test(m[2])?'mL':'g'):''})).filter((h,i,a)=>a.findIndex(x=>x.basis===h.basis)===i);
    const per100Unit=headers.find(h=>h.basis==='per100')?.unit||'',servingUnit=size?(/ml/i.test(size[2])?'mL':'g'):per100Unit,perServing=emptyNutrients(),per100=emptyNutrients(),columns={perServing,per100};
    for(const [key,pattern,unit] of ROWS){
      const energy=key==='energyKj'||key==='calories',unitPattern=unit==='kj'?/\bkj\b/i:/\b(?:kcal|cal)\b/i;
      const line=lines.find(line=>pattern.test(line)&&(!energy||unitPattern.test(line)));if(!line)continue;
      if(uncertainLines.some(value=>value.trim()===line)){issues.push('uncertain-'+key+'-columns');continue;}
      const labelled=line.replace(pattern,''),rowUnit=labelled.match(/^\s*[,:(]?\s*(kJ|kcal|Cal|mg|g)\s*\)?\s*[:)]?/i)?.[1]?.toLowerCase().replace(/^cal$/,'kcal');
      const printedUnit=labelled.match(/^\s*\(([^)]+)\)/)?.[1];if(printedUnit&&!/^(kj|kcal|cal|mg|g)$/i.test(printedUnit)){issues.push('uncertain-'+key+'-columns');continue;}
      const body=labelled.replace(/^\s*[,:(]?\s*(?:kJ|kcal|Cal|mg|g)\s*\)?\s*[:)]?/i,'');
      if(/\d\s+[.,]|[.,]\s+\d/.test(body)){issues.push('uncertain-'+key+'-columns');continue;}
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
  // Missing OCR cells are unknown, never instructions to delete saved values.
  // A changed serving/metric basis cannot safely inherit the old column.
  function mergePanelBaseline(food,panel){
    const old=reviewModelFor(food),next=clone(old),readBases=['perServing','per100'].filter(basis=>KEYS.some(key=>valueOrNull(panel[basis]?.[key])!==null));
    if(!readBases.length)return next;
    for(const key of ['servingAmount','servingUnit','per100Unit','servingsPerPack','servingCount','servingCountUnit','servingText'])if(panel[key]!==null&&panel[key]!==undefined&&panel[key]!=='')next[key]=panel[key];
    next.manufacturerServing=!!next.servingAmount;
    for(const basis of ['perServing','per100']){
      const same=basis==='perServing'?next.servingAmount===old.servingAmount&&next.servingUnit===old.servingUnit&&next.servingCount===old.servingCount&&next.servingCountUnit===old.servingCountUnit:next.per100Unit===old.per100Unit;
      next[basis]=same?clone(old[basis]):emptyNutrients();
      for(const key of KEYS)if(valueOrNull(panel[basis]?.[key])!==null)next[basis][key]=panel[basis][key];
      if(valueOrNull(panel[basis]?.energyKj)!==null&&valueOrNull(panel[basis]?.calories)===null)next[basis].calories=panel[basis].energyKj/4.184;
      if(valueOrNull(panel[basis]?.calories)!==null&&valueOrNull(panel[basis]?.energyKj)===null)next[basis].energyKj=panel[basis].calories*4.184;
    }
    next.selectedBasis=panel.selectedBasis||(readBases.length===1?readBases[0]:old.selectedBasis)||chosenBasis(next);
    return P().basisModel(next);
  }
  // Rebuild physical rows across OCR blocks. Tesseract may emit each table
  // column as its own line/block; text order alone then loses column ownership.
  function geometryPanel(data){
    const words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[]))).filter(w=>w.text&&w.bbox&&['x0','x1','y0','y1'].every(k=>Number.isFinite(w.bbox[k])));
    if(!words.length)return null;
    const height=words.map(w=>w.bbox.y1-w.bbox.y0).filter(h=>h>0).sort((a,b)=>a-b),h=height[Math.floor(height.length/2)]||20,rows=[];
    for(const w of words.sort((a,b)=>(a.bbox.y0+a.bbox.y1)-(b.bbox.y0+b.bbox.y1))){const y=(w.bbox.y0+w.bbox.y1)/2;let row=rows.find(r=>Math.abs(r.y-y)<h*.6);if(!row){row={y,words:[]};rows.push(row);}row.words.push(w);}
    for(const r of rows){r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0);r.text=r.words.map(w=>w.text.trim()).join(' ');}
    const headers=[];
    for(const row of rows)for(let i=0;i<row.words.length;i++){
      const ws=row.words.slice(i,i+4),text=ws.map(w=>w.text).join(' '),match=text.match(/^per\s+(serv(?:e|ing)\b|100\s*(g|ml)\b)/i);
      if(!match)continue;let used=[],joined='';for(const w of ws){used.push(w);joined+=(joined?' ':'')+w.text;if(joined.length>=match[0].length)break;}
      if(used.some(w=>valueOrNull(w.confidence)===null||w.confidence<80))continue;
      const basis=/^100/i.test(match[1])?'per100':'perServing';if(headers.some(x=>x.basis===basis))return null;
      headers.push({basis,unit:match[2]||'',x:(used[0].bbox.x0+used.at(-1).bbox.x1)/2,y:row.y,left:used[0].bbox.x0});
    }
    if(headers.length!==2)return null;headers.sort((a,b)=>a.x-b.x);const gap=headers[1].x-headers[0].x;if(gap<h*4)return null;
    const body=[],issues=[],evidence=[],tableEnd=rows.find(r=>/^ingredients\b/i.test(r.text)&&r.y>Math.max(...headers.map(x=>x.y)))?.y??Infinity;
    for(const row of rows){
      if(row.y<=Math.max(...headers.map(x=>x.y))+h*.5||row.y>=tableEnd)continue;
      const definition=ROWS.find(([key,pattern])=>pattern.test(row.text));if(!definition)continue;
      const [key,pattern,unit]=definition,labelEnd=row.text.match(pattern)[0].length;let length=0,lastLabel=-1;
      for(let i=0;i<row.words.length;i++){length+=(i?1:0)+row.words[i].text.length;if(length>=labelEnd){lastLabel=i;break;}}
      const labelWords=row.words.slice(0,lastLabel+1);if(labelWords.some(w=>valueOrNull(w.confidence)===null||w.confidence<70)){issues.push('uncertain-'+key+'-columns');continue;}
      const suffix=row.words.slice(lastLabel+1),unitWord=suffix[0],labelUnit=unitWord?.text.match(/^\(([^)]+)\)$/)?.[1]||(unitWord&&/^(g|mg|kj|kcal|cal)$/i.test(unitWord.text)&&unitWord.bbox.x1<headers[0].left-h*2?unitWord.text:null);
      if(labelUnit&&!/^(g|mg|kj|kcal|cal)$/i.test(labelUnit)){issues.push('uncertain-'+key+'-columns');continue;}
      const groups=headers.map(()=>[]);let ambiguous=false;
      for(const w of suffix){if(w===suffix[0]&&labelUnit)continue;const x=(w.bbox.x0+w.bbox.x1)/2,dist=headers.map(c=>Math.abs(c.x-x)),i=dist[0]<dist[1]?0:1;
        if(dist[i]>gap*.48||Math.abs(dist[0]-dist[1])<gap*.12){ambiguous=true;continue;}groups[i].push(w);
      }
      if(ambiguous){issues.push('uncertain-'+key+'-columns');continue;}
      const cells=groups.map((ws,i)=>{const text=ws.map(w=>w.text).join(' ').trim();const numeric=ws.filter(w=>/\d/.test(w.text));const confident=numeric.length===1&&numeric.every(w=>valueOrNull(w.confidence)!==null&&w.confidence>=80)&&!(/\d\s+[.,]|[.,]\s+\d/.test(text));
        const valid=/^\d+(?:[.,]\d+)?\s*(?:g|mg|kj|kcal|cal)?$/i.test(text);
        if(!confident||!valid){issues.push('confirm-'+headers[i].basis+'-'+key);return '?';}evidence.push({key,basis:headers[i].basis,text,confidence:numeric[0].confidence});return text;});
      // Use the recognised row unit when present. Never repair a damaged unit
      // or infer the location of a missing decimal point.
      const printed=labelUnit||(key==='energyKj'?null:unit);if(key==='energyKj'&&!printed&&!cells.some(c=>/kj|cal/i.test(c)))continue;
      body.push(row.text.match(pattern)[0]+(printed?' ('+printed+')':'')+' '+cells.join(' '));
    }
    if(!body.length)return null;
    const metadata=rows.filter(r=>/serv(?:ing|e|lng)\s*(?:size|slze)|servings?\s+per\s+pack/i.test(r.text)).map(r=>r.text);
    const text=[...metadata,headers.map(x=>'Per '+(x.basis==='perServing'?'Serving':'100 '+x.unit)).join(' '),...body].join('\n');
    return {text,issues,evidence};
  }
  function parseOcrResult(data={}){
    const uncertainLines=[];
    for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){
      if((line.words||[]).some(word=>/\d/.test(word.text||'')&&Number(word.confidence)<80))uncertainLines.push(line.text||'');
    }
    if(valueOrNull(data.confidence)!==null&&Number(data.confidence)<70)uncertainLines.push(...String(data.text||'').split('\n').filter(line=>/\d/.test(line)));
    const plain=parseNutritionPanel(data.text,{uncertainLines}),table=geometryPanel(data);
    if(!table){plain.extractionConfidence=valueOrNull(data.confidence);return plain;}
    const parsed=parseNutritionPanel(table.text);parsed.text=String(data.text||'');parsed.ingredients=plain.ingredients;parsed.issues=[...new Set([...parsed.issues,...table.issues])];parsed.questionable=parsed.issues.length>0;parsed.extractionConfidence=valueOrNull(data.confidence);parsed.tableEvidence=table.evidence;return parsed;
  }
  function privateIdentityStatus({name='',brand='',barcode=''}={}){
    const candidate={name,brand,barcode,recordType:'private',market:'AU',nutrients:{calories:0}};
    const quality=global.HECFoodCatalogue?.exactProductQuality?.(candidate);
    const named=quality?quality.exactEligible:!!String(name).trim()&&!/^(food|product|unknown|barcode\s*\d+)$/i.test(String(name).trim());
    return {ready:!!validBarcode(barcode)&&named,message:!validBarcode(barcode)?'Scan or enter the product barcode.':!named?'Enter the specific product name from this packet (and brand if shown).':''};
  }
  function buildBarcodeFood({food,id,confirmed=false}={}){
    const identity=privateIdentityStatus(food);
    if(!identity.ready)return {food:null,status:{ready:false,missing:['product-identity']},message:identity.message};
    return buildPanelFood({id,name:food.name,brand:food.brand,barcode:food.barcode,model:reviewModelFor(food),confirmed,ingredients:food.ingredients,packageSize:food.packageSize||food.packageQuantity||food.quantity||'',catalogueFood:food,choice:'catalogue'});
  }
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
    const labels={'product-identity':'Enter the specific product name from the packet, and brand if shown.',name:'Enter the food name.',basis:'Confirm whether the values are per serve or per 100 g / mL.',energy:'Enter energy for '+(chosenBasis(model)==='perServing'?'one serve':'100 '+(model?.per100Unit||model?.servingUnit||'g / mL'))+'.','per100-unit':'Choose g or mL for the per-100 column.','serving-size':'Enter a positive serving size and its unit, or leave size blank for a fixed serve.','basis-unit-conflict':'Serving and per-100 units differ; confirm the correct basis.','package-confirmation':'Check the package and confirm the values.','discrepancy-confirmation':'Review the differing columns and confirm the selected calculation basis.','energy-unit-conflict':'The kJ and Cal values disagree. Correct them or clear the unreadable value.'};
    return status.missing.map(key=>labels[key]||'Check '+key.replace(/-/g,' ')+'.').join(' ');
  }
  function buildPanelFood({id,name,brand='',barcode='',model,confirmed=false,discrepancyConfirmed=false,ingredients='',packageSize='',catalogueFood=null,choice='panel',extracted=null}={}){
    const status=reviewStatus({name,model,confirmed,discrepancyConfirmed});if(!status.ready)return {food:null,status};
    if(validBarcode(barcode)&&!privateIdentityStatus({name,brand,barcode}).ready)return {food:null,status:{...status,ready:false,missing:['product-identity']}};
    const basis=status.basis,useServing=basis==='perServing',amount=model.manufacturerServing?valueOrNull(model.servingAmount):null,unit=useServing?model.servingUnit:(model.per100Unit||model.servingUnit),nutrients=P().normalisedEnergy(model[basis]).nutrients,units={},unitLabels={};
    let defaultAmount=useServing?1:100,defaultUnit=useServing?'serve':unit,serving=useServing?'Manufacturer serve':'Reference per 100 '+unit;
    if(useServing){units.serve=1;unitLabels.serve=amount?'Manufacturer Serve ('+amount+' '+unit+')':'Manufacturer Serve';if(amount)units[unit]=1/amount;}
    else{units[unit]=.01;if(amount&&model.servingUnit===unit){units.serve=amount/100;unitLabels.serve='Manufacturer Serve ('+amount+' '+unit+'; calculated from per 100 '+unit+')';defaultAmount=1;defaultUnit='serve';serving='Manufacturer serving '+amount+' '+unit+' · calculated from per 100 '+unit;}}
    if(amount&&useServing)serving='Manufacturer serving '+amount+' '+unit;
    if(units[unit])unitLabels[unit]=unit;
    if(Number(model.servingCount)>0&&/^(piece|slice|biscuit|bar|cracker)$/.test(model.servingCountUnit)&&units.serve){units[model.servingCountUnit]=units.serve/Number(model.servingCount);unitLabels[model.servingCountUnit]=model.servingCountUnit;}
    const food={id:String(id||'panel-'+Date.now()),recordType:'private',verificationStatus:'package-confirmed',market:'AU',barcode:validBarcode(barcode),name:String(name).trim(),brand:String(brand).trim(),category:'Packaged Food',country:'Australia',aliases:[name,brand].filter(Boolean),defaultAmount,defaultUnit,units,unitLabels,serving,nutrients,foodGroups:{},waterMl:null,hydrationType:unit==='mL'?'drink':'food',score:6,source:choice==='catalogue'?'Barcode Nutrition · User Checked':'Current Package Nutrition Panel · User Checked',verified:false,packageServingExplicit:!!amount,ingredients:String(ingredients).trim(),packageSize:String(packageSize).trim(),servingsPerPack:valueOrNull(model.servingsPerPack),nutritionStatus:'user-confirmed',loggable:true,recognisedOnly:false,productSemantics:{type:'packaged-serving',confidence:'high'},captureEvidence:{barcode:validBarcode(barcode),catalogue:catalogueFood?{id:catalogueFood.id,canonicalId:catalogueFood.canonicalId||null,barcode:catalogueFood.barcode||null,name:catalogueFood.name,brand:catalogueFood.brand||null,source:catalogueFood.source||null,nutrients:clone(catalogueFood.nutrients),units:clone(catalogueFood.units),nutritionBasis:reviewModelFor(catalogueFood)}:null,extracted:clone(extracted),confirmedPanel:clone(model),choice,confirmed:true}};
    food.canonicalId='private:'+food.id;food.privateProductIdentity={id:food.canonicalId,gtin:food.barcode||null,name:food.name,brand:food.brand||null,packageSize:food.packageSize||null};
    food.captureEvidence.confirmedAt=new Date().toISOString();
    P().attachBasis(food,{...model,selectedBasis:basis});return {food,status};
  }
  // Review adapter only: opening a legacy record never migrates or rewrites it.
  function reviewModelFor(food){
    if(food?.nutritionBasis&&['perServing','per100'].some(basis=>['calories','energyKj'].some(key=>valueOrNull(food.nutritionBasis[basis]?.[key])!==null))){const unit=food.nutritionBasis.per100Unit||food.nutritionPer100Unit||(food.units?.g>0&&!food.units?.mL?'g':food.units?.mL>0&&!food.units?.g?'mL':'');return P().basisModel({...food.nutritionBasis,per100Unit:unit});}
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
  const api={version:VERSION,nutrientKeys:KEYS,valueOrNull,emptyNutrients,validBarcode,createScanSession,acceptDetection,finishLookup,resetScanSession,parseNutritionPanel,parseOcrResult,reviewStatus,validationMessage,chosenBasis,mergePanelBaseline,privateIdentityStatus,buildBarcodeFood,buildPanelFood,reviewModelFor,comparePanel,barcodeStatus,actionsFor};
  global.HECCaptureFoundation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
