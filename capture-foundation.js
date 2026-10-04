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
  function countUnits(){const serving=global.HECServingFoundation||(typeof module!=='undefined'?require('./serving-foundation'):null);return Object.values(serving?.PORTION_VOCABULARY||{}).filter(item=>['countable','sliced','household'].includes(item.family));}
  const PREPARED_HEADING='(?:as[\\s-]*prepared|prepared\\s+product|when\\s+prepared|prepared\\s+according\\s+to\\s+directions|prepared)';
  const COUNT_NUMBERS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
  function nearLabel(value,target,limit){
    if(Math.abs(value.length-target.length)>limit)return false;
    let row=Array.from({length:target.length+1},(_,i)=>i);
    for(const c of value){const next=[row[0]+1];for(let j=1;j<=target.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(c===target[j-1]?0:1));row=next;}
    return row[target.length]<=limit;
  }
  function servingSizeLine(line){
    // Match the whole short label at the start of a declaration. Only letters
    // and separators are normalised; the numeric payload is never corrected.
    const match=line.match(new RegExp('^([a-z][a-z\\s.:_-]*?)\\s*([\\d(].*|(?:'+Object.keys(COUNT_NUMBERS).join('|')+')\\b.*)$','i'));
    if(!match)return '';
    const label=match[1].toLowerCase().replace(/[\s.:_-]/g,'');
    return ['servingsize','servesize'].some(target=>nearLabel(label,target,2))?match[2]:'';
  }
  function servingMetadataRegion(lines,index){
    const start=Math.max(0,index-5),before=lines.slice(start,index),after=lines.slice(index+1,index+7);
    if(before.some(s=>ROWS.some(([,p])=>p.test(s))||/^(?:ingredients|directions|contains|preparation)\b/i.test(s)))return false;
    return before.some(s=>/^nutrition\s+information\b/i.test(s))||after.some(s=>/^(?:quantity\s+)?(?:per\s*serv(?:e|ing)|per\s*100\s*(?:g|ml)|serving\s*\|)/i.test(s));
  }
  function packPayload(lines,index){
    // A noisy prefix separated from the metadata by a table rule is harmless.
    // Fuzzy/masked serving words still need a nutrition metadata region.
    const match=lines[index].split('|').at(-1).trim().match(/^([a-z?]+)\s+per\s+pack(?:age)?\s*:?\s*(.*)$/i);
    if(!match)return '';
    const token=match[1].toLowerCase(),exact=/^(?:servings?|serves)$/.test(token);
    const payload=match[2]||(/^\d/.test(lines[index+1]||'')?lines[index+1]:'');
    return exact||servingMetadataRegion(lines,index)&&(token==='?'||['servings','serves'].some(target=>nearLabel(token,target,Math.abs(token.length-target.length)===1?2:1)))?payload:'';
  }
  const ENERGY_CELLS=/^(?:\(?\d+(?:[.,]\d+)?\s*(?:kj|kcal|cal)\)?\s*(?:[|/]\s*)?)+$/i;
  function unresolvedPreparedCalories(lines,serving,uncertainLines=[]){
    // Two damaged headings can identify a prepared reference without stating
    // its denominator. Never turn that reference into a per-100 column.
    const safe=lines.map(line=>uncertainLines.some(value=>value.trim()&&line.includes(value.trim()))?'?':line);
    const heading=safe.findIndex((line,i)=>/^(?:quantity\s+)?(?:per\s+)?serving\s*\|\s*(?:per\s+)?serving$/i.test(line)&&/^as[\s-]*prepared\s*\|?$/i.test(safe[i+1]||''));
    if(heading<0)return null;
    const reference={heading:safe[heading+1],basis:null,calories:null},nearby=safe.slice(heading+2,heading+5),boundary=nearby.findIndex(line=>/^(?:ingredients|directions|preparation|contains|storage)\b/i.test(line)),rows=nearby.slice(0,boundary<0?nearby.length:boundary).filter(line=>ENERGY_CELLS.test(line));
    const row=rows.length===1?rows[0]:null,cells=row?[...row.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:kcal|cal)\b/gi)].map(m=>Number(m[1].replace(',','.'))):[];
    const statements=[];
    for(const line of safe){
      const match=line.match(/^(?:contains\s+on\s+average\s+)?(\d+(?:[.,]\d+)?)\s+calories\s+per\s+([a-z]+)\s*\.?$/i);
      if(!match)continue;
      const unit=match[2].toLowerCase(),item=countUnits().find(item=>item.aliases.includes(unit));
      if(/^serv(?:e|ing)$/.test(unit)||serving.servingCount===1&&item?.id===serving.servingCountUnit)statements.push({value:Number(match[1].replace(',','.')),text:line});
    }
    // Supporting prose corroborates a complete, ordered two-cell Cal row. It
    // cannot repair digits, select among conflicting statements or supply kJ.
    if(cells.length===2&&!/kj/i.test(row)&&statements.length&&statements.every(s=>s.value===cells[0])&&cells[0]!==cells[1]){
      reference.calories=cells[1];return {reference,perServingCal:cells[0],evidence:{row,statement:statements[0].text}};
    }
    return {reference,perServingCal:null,evidence:null};
  }
  function waterPreparationAllowed(model={}){
    return model.servingUnit!=='mL'&&(model.per100Unit!=='mL'||model.per100Context==='as-prepared');
  }
  // Capture destinations are explicit, in-memory intent, never persisted UI dates.
  function captureDestination({today,intent=null}={}){
    return intent?.source==='diary-add'&&/^\d{4}-\d{2}-\d{2}$/.test(intent.date)&&intent.meal?{source:'diary-add',date:intent.date,meal:intent.meal}:{source:'neutral',date:today,meal:''};
  }
  function panelLines(text){
    // Join wrapped declarations/headings, never arbitrary prose or two numbers.
    return String(text||'').replace(/\r\n?/g,'\n')
      .replace(/\b(per|servings?\s+per)\s*\n\s*(?=serv(?:e|ing)\b|100\b|pack(?:age)?\b)/gi,'$1 ')
      .replace(/\b(serv(?:ing|e|lng))\s*\n\s*(?=s(?:i|l)ze\b)/gi,'$1 ')
      .replace(/\b100\s*\n\s*(g|ml)\b/gi,'100 $1')
      .replace(new RegExp('\\b(per\\s*100\\s*(?:ml|g))\\s*\\n\\s*('+PREPARED_HEADING+')\\b','gi'),'$1 $2')
      .replace(new RegExp('\\b(per\\s*100\\s*(?:ml|g))[^\\S\\n]*\\n[ \\t]*serv(?:e|ing)[ \\t]*[|:][ \\t]*('+PREPARED_HEADING+')[ \\t]*(?=\\n|$)','gi'),'$1 $2')
      .replace(/\b(serv(?:ing|e|lng)\s*s(?:i|l)ze|servings?\s+per\s+pack(?:age)?)\s*:?\s*\n\s*(?=\d|one\b)/gi,'$1: ')
      .split(/\n+/).map(line=>line.trim()).filter(Boolean);
  }
  function parseServing(text){
    const lines=panelLines(text),clean=lines.join('\n'),number=v=>Number(v.replace(',','.'));
    let line=lines.map((s,i)=>servingSizeLine(s)||(/^\d/.test(lines[i+1]||'')?servingSizeLine(s+' '+lines[i+1]):'')).find(Boolean)||'';
    const aliases=countUnits().flatMap(item=>item.aliases.map(alias=>({alias,key:item.id}))).sort((a,b)=>b.alias.length-a.alias.length);
    const numbers=COUNT_NUMBERS,quantity='(?:\\d+(?:[.,]\\d+)?|'+Object.keys(numbers).join('|')+')';
    if(!line){
      // Recover a damaged label only in the declaration region, with BOTH an
      // intact metric amount and explicit count. Never search ingredient prose.
      const heading=lines.findIndex(s=>/per\s*(?:serv(?:e|ing)\b|100\s*(?:g|ml)\b)/i.test(s)),end=lines.findIndex(s=>ROWS.some(([,p])=>p.test(s))||/^(?:ingredients|directions|net\s+weight)\b/i.test(s));
      const candidates=[];
      const nearServing=token=>nearLabel(token.toLowerCase(),'serving',2);
      for(let i=0;i<lines.length;i++){
        if(heading<0||i>=heading||heading-i>6||end>=0&&i>=end||!lines.slice(Math.max(0,i-3),i).some(s=>/^servings?\s+per\s+pack(?:age)?\b/i.test(s)))continue;
        const m=lines[i].match(new RegExp('^([a-z? :]*?)((?:\\d+(?:[.,]\\d+)?)\\s*(?:g|ml)\\s*\\(\\s*'+quantity+'\\s+(?:'+aliases.map(a=>a.alias).join('|')+')\\s*\\))$','i'));
        if(m&&(!m[1].trim()||/^[? :]+$/.test(m[1])||m[1].trim().split(/\s+/).some(nearServing)))candidates.push(m[2]);
      }
      if(candidates.length===1)line=candidates[0];
    }
    const size=line.match(/(?:^|\(\s*)(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
    let count=null,countUnit='';
    for(const {alias,key} of aliases){const direct=line.match(new RegExp('(?:^|[\\s(])('+quantity+')\\s*'+alias+'\\b','i')),match=direct||clean.match(new RegExp('(?<![\\w.,+\\-])('+quantity+')\\s+'+alias+'\\s*(?:=|equals?|is)\\s*(?:one|1)\\s+serv(?:ing|e)\\b','i'));if(match&&!/[\d.,+\-]\s*$/.test((direct?line:clean).slice(0,match.index))){count=numbers[match[1].toLowerCase()]||number(match[1]);countUnit=key;break;}}
    if(count===null&&size){
      // One edit, one unambiguous natural unit, only inside parentheses directly
      // attached to an explicit metric serving. Short/household words stay exact.
      const attached=line.slice(size.index+size[0].length).match(new RegExp('^\\s*\\(\\s*('+quantity+')\\s*([a-z]{4,})\\s*\\)\\s*$','i'));
      if(attached){const word=attached[2].toLowerCase(),matches=new Set(countUnits().filter(item=>item.family!=='household'&&item.aliases.some(alias=>/^[a-z]{4,}$/.test(alias)&&nearLabel(word,alias,1))).map(item=>item.id));if(matches.size===1){count=numbers[attached[1].toLowerCase()]||number(attached[1]);countUnit=[...matches][0];}}
    }
    const packLine=lines.map((_,index)=>packPayload(lines,index)).find(Boolean)||'',packMatch=packLine.match(/^(?:about\s+)?(\d+(?:[.,]\d+)?)(?=$|\s|\()/i),tail=packMatch?packLine.slice(packMatch[0].length).trimStart():'';
    // Validate the count token and its boundary, not unrelated trailing notes.
    const pack=packMatch&&!/^(?:[\d.,+\-/#–—<>≤≥±]|(?:g|mg|ml|kg|to|or|x)\b)/i.test(tail)?packMatch:null;
    return {servingAmount:size?number(size[1]):null,servingUnit:size?(/ml/i.test(size[2])?'mL':'g'):'',servingText:line,manufacturerServing:!!size,servingCount:count,servingCountUnit:countUnit,servingsPerPack:pack?number(pack[1]):null};
  }
  function parseNutritionPanel(text,{uncertainLines=[]}={}){
    const clean=String(text||'').replace(/\r\n?/g,'\n'),raw=panelLines(clean),lines=[],issues=[],number=value=>Number(value.replace(',','.'));
    // OCR frequently separates a row label from its cells. Join only adjacent
    // numeric continuations, stopping at the next label, heading or prose.
    for(let i=0;i<raw.length;i++){
      let line=raw[i];
      if(ENERGY_CELLS.test(line)&&raw.slice(0,i).some(s=>/^(?:(?:average\s+)?quantity\s+)?per\s*(?:serv(?:e|ing)\b|100\s*(?:g|ml)\b)/i.test(s))&&!raw.slice(0,i).some(s=>/^(?:ingredients|directions|contains|preparation)\b/i.test(s)))line='Energy '+line;
      if(ROWS.some(([,p])=>p.test(line)))while(i+1<raw.length&&/^\(?[<>≤≥]?\s*\d/.test(raw[i+1])&&!/per\s*100/i.test(raw[i+1]))line+=' '+raw[++i];
      lines.push(line);
    }
    const serving=parseServing(raw.filter(line=>!uncertainLines.some(value=>value.trim()&&line.includes(value.trim()))).join('\n'));
    const headings=lines.filter(line=>/per\s*(?:serv(?:e|ing)\b|100\s*(?:g|ml)\b)/i.test(line)&&!/^serv(?:ing|e)\s*size/i.test(line)).join(' '),headers=[...headings.matchAll(new RegExp('per\\s*(serv(?:e|ing)\\b|100\\s*(g|ml)\\b)(\\s+'+PREPARED_HEADING+')?','gi'))].map(m=>({basis:/^100/i.test(m[1])?'per100':'perServing',unit:m[2]?(/ml/i.test(m[2])?'mL':'g'):'',context:m[3]?'as-prepared':'product'}));
    // More than one reference column cannot fit the current two-basis model.
    // Keep the unambiguous serving cells; do not merge dry and prepared data.
    const duplicate=basis=>headers.filter(h=>h.basis===basis).length>1;
    if(uncertainLines.some(value=>/per\s*(?:serv(?:e|ing)\b|100\b)/i.test(value)))headers.length=0;
    const originalLines=clean.split('\n'),firstNutrient=originalLines.findIndex(line=>ROWS.some(([,p])=>p.test(line.trim()))),headerRegion=originalLines.slice(0,firstNutrient<0?originalLines.length:firstNutrient).join('\n');
    if(uncertainLines.some(value=>value.trim()&&headerRegion.includes(value.trim())&&new RegExp('\\b'+PREPARED_HEADING+'\\b','i').test(value)))headers.forEach(h=>h.context='product');
    const per100Context=headers.find(h=>h.basis==='per100')?.context||'product';
    const per100Unit=headers.find(h=>h.basis==='per100')?.unit||'',perServing=emptyNutrients(),per100=emptyNutrients(),columns={perServing,per100},qualifiers={perServing:{},per100:{}},energyProvenance={perServing:{},per100:{}};
    for(const [key,pattern,unit] of ROWS){
      const energy=key==='energyKj'||key==='calories',unitPattern=unit==='kj'?/(?<![a-z])kj\b/i:/(?<![a-z])(?:kcal|cal)\b/i;
      const line=lines.find(line=>pattern.test(line)&&(!energy||unitPattern.test(line)));if(!line)continue;
      if(uncertainLines.some(value=>value.trim()&&line.includes(value.trim()))){issues.push('uncertain-'+key+'-columns');continue;}
      const labelled=line.replace(pattern,''),rowUnit=labelled.match(/^\s*[,:(]?\s*(kJ|kcal|Cal|mg|g)\s*\)?\s*[:)]?/i)?.[1]?.toLowerCase().replace(/^cal$/,'kcal');
      if(!energy&&rowUnit&&rowUnit!==unit){issues.push('uncertain-'+key+'-columns');continue;}
      const printedUnit=labelled.match(/^\s*\(([^)]+)\)/)?.[1];if(printedUnit&&!/^(kj|kcal|cal|mg|g)$/i.test(printedUnit)){issues.push('uncertain-'+key+'-columns');continue;}
      const body=labelled.replace(/^\s*[,:(]?\s*(?:kJ|kcal|Cal|mg|g)\s*\)?\s*[:)]?/i,'').replace(/\b\d+(?:[.,]\d+)?\s*%\s*(?:DI\b)?/gi,'');
      if(/\d\s+[.,]|[.,]\s+\d/.test(body)){issues.push('uncertain-'+key+'-columns');continue;}
      const cellPattern=/([<>≤≥]?\s*[-+]?\d+(?:[.,]\d+)?|\?+)\s*(kcal|cal|kj|mg|g)?\b|([—–]|\?+)/gi;
      if(body.replace(cellPattern,'').replace(/[\s/|(),:]/g,'')){issues.push('uncertain-'+key+'-columns');continue;}
      const tokens=[...body.matchAll(cellPattern)].map(m=>({raw:(m[1]||m[3]).trim(),unit:(m[2]||'').toLowerCase().replace(/^cal$/,'kcal')}));
      let values=energy?tokens.filter(t=>t.unit===unit||(!t.unit&&rowUnit===unit)):tokens;
      if(energy&&!rowUnit&&values.length!==headers.length){
        // A complete ordered run can retain a cell with a printed unit while
        // its unitless neighbour stays unknown. Do not shift a lone Cal/kJ.
        const runs=[];let run=[];
        for(const token of tokens){if(token.unit&&token.unit!==unit){if(run.length)runs.push(run);run=[];}else run.push(token);}
        if(run.length)runs.push(run);
        const matching=runs.filter(r=>r.length===headers.length&&r[0]?.unit===unit);
        if(matching.length===1)values=matching[0].map(t=>t.unit===unit?t:{raw:'?',unit});
      }
      if(energy&&!values.length)continue;
      // One surviving token cannot establish which of two columns was unreadable.
      if(!headers.length||values.length!==headers.length){issues.push('uncertain-'+key+'-columns');continue;}
      values.forEach((token,index)=>{const basis=headers[index].basis;if(duplicate(basis)){issues.push('uncertain-'+key+'-columns');return;}if(!energy&&!token.unit&&!rowUnit){issues.push('confirm-'+basis+'-'+key);return;}const less=token.raw.match(/^(<|≤)\s*(\d+(?:[.,]\d+)?)$/);if(less&&(!token.unit||token.unit===unit)){qualifiers[basis][key]={operator:less[1],limit:number(less[2])};return;}if(!/^\d+(?:[.,]\d+)?$/.test(token.raw)||(token.unit&&token.unit!==unit)){issues.push('confirm-'+basis+'-'+key);return;}columns[basis][key]=number(token.raw);if(energy)energyProvenance[basis][key]='printed';});
    }
    const partial=!headers.some(h=>h.basis==='per100')?unresolvedPreparedCalories(raw,serving,uncertainLines):null;
    if(partial){issues.push('prepared-reference-basis-unresolved');if(perServing.calories===null&&partial.perServingCal!==null){perServing.calories=partial.perServingCal;energyProvenance.perServing.calories='printed';if(!headers.some(h=>h.basis==='perServing'))headers.push({basis:'perServing',unit:'',context:'product'});}}
    for(const [basis,column] of Object.entries(columns)){
      if(column.calories===null&&column.energyKj!==null){column.calories=column.energyKj/4.184;energyProvenance[basis].calories='derived-from-kj';}
      for(const [key,factor] of Object.entries({protein:4,carbs:4,sugar:4,fat:9,satFat:9,fibre:2})){
        const massLimit=basis==='per100'&&per100Unit==='g'?100:basis==='perServing'&&serving.servingUnit==='g'?serving.servingAmount:null;
        if(column[key]!==null&&(massLimit!==null&&column[key]>massLimit+.2||column.calories!==null&&column[key]*factor>column.calories*2.2+20)){column[key]=null;issues.push('confirm-'+basis+'-'+key);}
      }
    }
    for(const [basis,column] of Object.entries(columns))for(const [part,total] of [['sugar','carbs'],['satFat','fat']])if(column[part]!==null&&column[total]!==null&&column[part]>column[total]+.2){column[part]=null;issues.push('confirm-'+basis+'-'+part);}
    if(!headers.length)issues.push('column-headings-not-recognised');
    if(perServing.calories===null&&per100.calories===null)issues.push('energy-not-recognised');
    const model=guidePanelModel(P().basisModel({...serving,perServing,per100,per100Unit,per100Context,qualifiers,energyProvenance,servingProvenance:serving.servingAmount||serving.servingCount?{source:'printed'}:null,printedColumns:headers.map(h=>h.basis),selectedBasis:perServing.calories!==null?'perServing':per100.calories!==null&&per100Context!=='as-prepared'?'per100':''}),{text:raw.filter(line=>!uncertainLines.some(value=>value.trim()&&line.includes(value.trim()))).join('\n')});
    const ingredients=clean.match(/ingredients\s*:\s*([^\n]*(?:\n(?!\s*(?:nutrition|allergen|contains|storage)\b)[^\n]*)*)/i)?.[1]?.trim()||'';
    return {text:clean,readMethod:'text',...model,model,ingredients,...(partial?{preparedReference:partial.reference,calorieEvidence:partial.evidence}:{}),detected:{perServing:headers.some(h=>h.basis==='perServing'),per100:headers.some(h=>h.basis==='per100')},issues:[...new Set(issues)],discrepancies:P().basisDiscrepancies(model),questionable:issues.length>0};
  }
  function guidePanelModel(model,{text='',food=null}={}){
    const next=P().basisModel(model),dry=next.servingUnit==='g'||!next.servingUnit&&next.per100Unit!=='mL';
    if(next.servingUnit==='g'&&next.per100Unit==='mL'&&next.per100Context==='as-prepared'&&['calories','energyKj'].some(key=>valueOrNull(next.perServing[key])!==null))next.selectedBasis='perServing';
    if(!waterPreparationAllowed(next)){next.waterPreparation=false;next.preparationEvidence=null;return next;}
    if(next.waterPreparation&&!next.preparationEvidence)next.preparationEvidence={kind:'dry-beverage',liquid:'water',source:'user-entered'};
    const family=[text,food?.name,food?.category,food?.productFamily].filter(Boolean).join(' '),beverage=/\b(?:cappuccino|latte|hot\s+chocolate|instant\s+coffee|(?:drink|beverage)\s+(?:mix|powder)|powdered\s+(?:drink|beverage))\b/i.test(family);
    if(dry&&beverage&&!next.preparationEvidence){
      // Preparation directions, never the words "as prepared" alone, establish
      // the liquid. Milk alternatives and additions make water-only uncertain.
      const instructions=String(text).split(/\n|[.!;]/).filter(line=>/\b(?:add|mix|stir|prepare|pour)\b/i.test(line)),water=instructions.some(line=>/\bwater\b/i.test(line)),milk=instructions.some(line=>/\bmilk\b/i.test(line)),other=instructions.some(line=>/\b(?:juice|cream|syrup|sugar|honey)\b/i.test(line)),ambiguous=instructions.some(line=>/\b(?:no|not|never|avoid|without|instead|or|optional)\b/i.test(line));
      const liquid=!ambiguous&&water&&!milk&&!other?'water':!ambiguous&&milk&&!water&&!other?'milk':'unknown';
      next.preparationEvidence={kind:'dry-beverage',liquid,source:liquid==='unknown'?'product-family':'printed-instructions'};
      next.waterPreparation=liquid==='water';
    }
    return next;
  }
  function servingAttention(model){
    const hasCount=model?.servingCount!==null&&model?.servingCount!==undefined,hasUnit=!!model?.servingCountUnit;
    return hasCount||hasUnit?!(Number(model.servingCount)>0&&countUnits().some(item=>item.id===model.servingCountUnit)):false;
  }
  function basisGuidance(model){
    if(model?.servingUnit==='g'&&model?.per100Unit==='mL'&&model?.per100Context==='as-prepared')return model.selectedBasis==='perServing'?'The packet shows a '+model.servingAmount+' g dry serving and a separate 100 mL as-prepared column. HEC will use the Per Serve values for the dry product. Check this is correct.':'Choose Per Serve under “Which printed column should HEC use?” and enter the dry serving energy. The 100 mL as-prepared column is a separate reference.';
    return '';
  }
  function chosenBasis(model){return model?.selectedBasis||((valueOrNull(model?.perServing?.calories)!==null||valueOrNull(model?.perServing?.energyKj)!==null)?'perServing':'per100');}
  // Missing OCR cells are unknown, never instructions to delete saved values.
  // A changed serving/metric basis cannot safely inherit the old column.
  function mergePanelBaseline(food,panel){
    const old=reviewModelFor(food),next=clone(old),readBases=['perServing','per100'].filter(basis=>KEYS.some(key=>valueOrNull(panel[basis]?.[key])!==null||panel.qualifiers?.[basis]?.[key]));
    // Pack count does not change the nutrition basis, so it survives a
    // metadata-only read. A conflicting serving still cannot erase saved cells.
    if(valueOrNull(panel.servingsPerPack)!==null)next.servingsPerPack=panel.servingsPerPack;
    if(!readBases.length){
      const sameServing=panel.servingAmount===old.servingAmount&&panel.servingUnit===old.servingUnit;
      if(sameServing&&panel.servingCount>0&&panel.servingCountUnit){next.servingCount=panel.servingCount;next.servingCountUnit=panel.servingCountUnit;next.servingProvenance=clone(panel.servingProvenance);}
      return next;
    }
    for(const key of ['servingAmount','servingUnit','per100Unit','per100Context','servingsPerPack','servingCount','servingCountUnit','servingText'])if(panel[key]!==null&&panel[key]!==undefined&&panel[key]!==''&&!(key==='servingText'&&!panel.servingAmount&&old.servingAmount)&&!(panel.printedColumns&&!panel.printedColumns.includes('per100')&&['per100Unit','per100Context'].includes(key)))next[key]=panel[key];
    if((next.servingAmount!==old.servingAmount||next.servingUnit!==old.servingUnit)&&!(panel.servingCount>0&&panel.servingCountUnit)){next.servingCount=null;next.servingCountUnit='';next.servingProvenance=null;}
    next.manufacturerServing=!!next.servingAmount;
    for(const basis of ['perServing','per100']){
      const sameCount=next.servingCount===old.servingCount&&next.servingCountUnit===old.servingCountUnit,addedCount=!old.servingCount&&!old.servingCountUnit&&old.servingAmount>0;
      const same=basis==='perServing'?next.servingAmount===old.servingAmount&&next.servingUnit===old.servingUnit&&(sameCount||addedCount):next.per100Unit===old.per100Unit&&next.per100Context===old.per100Context;
      next[basis]=same?clone(old[basis]):emptyNutrients();
      next.qualifiers[basis]=same?clone(old.qualifiers?.[basis]||{}):{};next.energyProvenance[basis]=same?clone(old.energyProvenance?.[basis]||{}):{};
      for(const key of KEYS){
        const qualifier=panel.qualifiers?.[basis]?.[key],source=panel.energyProvenance?.[basis]?.[key];
        if(qualifier){next[basis][key]=null;next.qualifiers[basis][key]=clone(qualifier);}
        else if(valueOrNull(panel[basis]?.[key])!==null&&!(source?.startsWith('derived')&&next[basis][key]!==null&&!next.energyProvenance[basis][key]?.startsWith('derived'))){next[basis][key]=panel[basis][key];delete next.qualifiers[basis][key];if(source)next.energyProvenance[basis][key]=source;}
      }
    }
    next.selectedBasis=panel.selectedBasis||(readBases.length===1?readBases[0]:old.selectedBasis)||chosenBasis(next);
    if(panel.preparationEvidence){next.preparationEvidence=clone(panel.preparationEvidence);next.waterPreparation=panel.waterPreparation===true;}
    else if(panel.waterPreparation)next.waterPreparation=true;
    // A printed item count cannot relabel an unread, retained metric serving as
    // panel evidence. The new count remains in captureEvidence.extracted.
    if(panel.servingProvenance&&(panel.servingAmount||!old.servingAmount))next.servingProvenance=clone(panel.servingProvenance);
    return guidePanelModel(next);
  }
  // Rebuild physical rows across OCR blocks. Tesseract may emit each table
  // column as its own line/block; text order alone then loses column ownership.
  function spatialRows(data){
    const words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[]))).filter(w=>w.text&&w.bbox&&['x0','x1','y0','y1'].every(k=>Number.isFinite(w.bbox[k])));
    if(!words.length)return {rows:[],h:20};
    const height=words.map(w=>w.bbox.y1-w.bbox.y0).filter(h=>h>0).sort((a,b)=>a-b),h=height[Math.floor(height.length/2)]||20,rows=[];
    for(const w of words.sort((a,b)=>(a.bbox.y0+a.bbox.y1)-(b.bbox.y0+b.bbox.y1))){const y=(w.bbox.y0+w.bbox.y1)/2;let row=rows.find(r=>Math.abs(r.y-y)<h*.6);if(!row){row={y,words:[]};rows.push(row);}row.words.push(w);}
    for(const r of rows){r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0);r.text=r.words.map(w=>w.text.trim()).join(' ');}
    return {rows,h};
  }
  function trustedRowText(row){
    // Keep a damaged numeric continuation distinguishable from noisy prose:
    // masking "10 .5" as "10 ?" must not turn it into a trusted pack count.
    return row.words.map(w=>valueOrNull(w.confidence)!==null&&w.confidence>=(/\d/.test(w.text)?80:70)?w.text:/^[\d.,+\-]/.test(w.text)?'#':w.text.startsWith('(')?'(?':'?').join(' ');
  }
  function geometryPanel(data){
    const {rows,h}=spatialRows(data),headers=[];
    for(const row of rows)for(let i=0;i<row.words.length;i++){
      const start=row.words[i];if(!/^per(?=\s|100\b|$)/i.test(start.text))continue;
      const ws=row.words.slice(i,i+4).filter(w=>w.bbox.x0-start.bbox.x0<h*7);
      // Headings often wrap across two or three physical lines on narrow packs.
      for(const below of rows.filter(r=>r.y>row.y+h*.5&&r.y<=row.y+h*3)){
        if(/^per\s*(serv(?:e|ing)\b|100\s*(g|ml)\b)/i.test(ws.map(w=>w.text).join(' ')))break;
        ws.push(...below.words.filter(w=>Math.abs(w.bbox.x0-start.bbox.x0)<h*2&&/^(?:serv(?:e|ing)|100|g|ml)\b/i.test(w.text)));
      }
      const text=ws.map(w=>w.text).join(' '),match=text.match(/^per\s*(serv(?:e|ing)\b|100\s*(g|ml)\b)/i);
      if(!match)continue;let used=[],joined='';for(const w of ws){used.push(w);joined+=(joined?' ':'')+w.text;if(joined.length>=match[0].length)break;}
      if(used.some(w=>valueOrNull(w.confidence)===null||w.confidence<80))continue;
      const basis=/^100/i.test(match[1])?'per100':'perServing';if(headers.some(x=>x.basis===basis))return null;
      headers.push({basis,unit:match[2]||'',x:(Math.min(...used.map(w=>w.bbox.x0))+Math.max(...used.map(w=>w.bbox.x1)))/2,y:Math.max(...used.map(w=>(w.bbox.y0+w.bbox.y1)/2)),left:used[0].bbox.x0});
    }
    if(!headers.length||headers.length>2)return null;headers.sort((a,b)=>a.x-b.x);const gap=headers.length===2?headers[1].x-headers[0].x:h*20;if(gap<h*4)return null;
    const tableTop=Math.max(...headers.map(x=>x.y)),firstBody=rows.find(r=>r.y>tableTop&&(ROWS.some(([,p])=>p.test(r.text))||ENERGY_CELLS.test(r.text)))?.y??tableTop+h*4;
    const percentColumns=rows.filter(r=>r.y<=firstBody).flatMap(r=>r.words.filter(w=>/%\s*(?:DI|RDI)|^(?:DI|RDI)%?$/i.test(w.text)).map(w=>(w.bbox.x0+w.bbox.x1)/2));
    for(const header of headers){const local=rows.filter(r=>r.y>=header.y-h*3&&r.y<firstBody).map(r=>r.words.filter(w=>Math.abs((w.bbox.x0+w.bbox.x1)/2-header.x)<gap*.45).map(w=>w.confidence>=70?w.text:'?').join(' ')).join(' ');header.prepared=header.basis==='per100'&&new RegExp('\\b'+PREPARED_HEADING+'\\b','i').test(local);}
    const body=[],issues=[],evidence=[],tableEnd=rows.find(r=>/^(?:ingredients|directions|preparation|contains|storage)\b/i.test(r.text)&&r.y>tableTop)?.y??Infinity,logicalRows=[];
    for(const row of rows){const previous=logicalRows.at(-1);if(previous&&ROWS.some(([,p])=>p.test(previous.text))&&/^\(?[<>≤≥]?\s*\d/.test(row.text)&&row.y-previous.lastY<=h*2.6){previous.words.push(...row.words);previous.lastY=row.y;}else logicalRows.push({...row,words:[...row.words],lastY:row.y});}
    for(const row of logicalRows){
      if(row.y<=Math.max(...headers.map(x=>x.y))+h*.5||row.y>=tableEnd)continue;
      const definition=ROWS.find(([key,pattern])=>pattern.test(row.text))||(ENERGY_CELLS.test(row.text)?['energyKj',/^/,'kj']:null);if(!definition)continue;
      const [key,pattern,unit]=definition,labelEnd=row.text.match(pattern)[0].length;let length=0,lastLabel=-1;
      for(let i=0;labelEnd&&i<row.words.length;i++){length+=(i?1:0)+row.words[i].text.length;if(length>=labelEnd){lastLabel=i;break;}}
      const labelWords=row.words.slice(0,lastLabel+1);if(labelWords.some(w=>valueOrNull(w.confidence)===null||w.confidence<70)){issues.push('uncertain-'+key+'-columns');continue;}
      const suffix=row.words.slice(lastLabel+1),unitWord=suffix[0],labelUnit=unitWord?.text.match(/^\(([^)]+)\)$/)?.[1]||(unitWord&&/^(g|mg|kj|kcal|cal)$/i.test(unitWord.text)&&unitWord.bbox.x1<headers[0].left-h*2?unitWord.text:null);
      if(labelUnit&&!/^(g|mg|kj|kcal|cal)$/i.test(labelUnit)){issues.push('uncertain-'+key+'-columns');continue;}
      const groups=headers.map(()=>[]);let ambiguous=false;
      for(const w of suffix){if(w===suffix[0]&&labelUnit)continue;const x=(w.bbox.x0+w.bbox.x1)/2,dist=headers.map(c=>Math.abs(c.x-x)),i=dist[0]<dist[1]?0:1;
        const column=headers.length===1?0:i;
        if(/%/.test(w.text)||percentColumns.some(px=>Math.abs(px-x)<dist[column]&&Math.abs(px-x)<gap*.4))continue;
        if(dist[column]>gap*.48||(headers.length===2&&Math.abs(dist[0]-dist[1])<gap*.12)){ambiguous=true;continue;}groups[column].push(w);
      }
      if(ambiguous){issues.push('uncertain-'+key+'-columns');continue;}
      if(key==='energyKj'){
        // Each printed energy unit owns its own cell. A damaged Cal token must
        // not erase a legible kJ token in the same physical table cell.
        for(const [energyKey,energyUnit] of [['energyKj','kj'],['calories','kcal']]){
          const normalizedUnit=value=>String(value||'').toLowerCase().replace(/^cal$/,'kcal');
          if(normalizedUnit(labelUnit)!==energyUnit&&!groups.some(ws=>new RegExp(energyUnit==='kj'?'(?<![a-z])kj\\b':'(?<![a-z])(?:kcal|cal)\\b','i').test(ws.map(w=>w.text).join(' '))))continue;
          const cells=groups.map((ws,i)=>{
            let offset=0;const spans=ws.map(w=>{const start=offset;offset+=w.text.length+1;return {w,start,end:offset-1};}),text=ws.map(w=>w.text).join(' ');
            const matches=[...text.matchAll(/(?<![\w.,+\-])([<≤]?\s*\d+(?:[.,]\d+)?)\s*(kj|kcal|cal)\b/gi)].filter(m=>normalizedUnit(m[2])===energyUnit);
            if(!matches.length&&normalizedUnit(labelUnit)===energyUnit&&/^[<≤]?\s*\d+(?:[.,]\d+)?$/.test(text))matches.push({0:text,1:text,index:0});
            const match=matches.length===1?matches[0]:null,relevant=match?spans.filter(s=>s.end>match.index&&s.start<match.index+match[0].length).map(s=>s.w):[];
            if(!match||/[>≥+\-]\s*$/.test(text.slice(0,match.index))||relevant.filter(w=>/\d/.test(w.text)).length!==1||relevant.some(w=>valueOrNull(w.confidence)===null||w.confidence<80)||/\d\s+[.,]|[.,]\s+\d/.test(text)){issues.push('confirm-'+headers[i].basis+'-'+energyKey);return '?';}
            evidence.push({key:energyKey,basis:headers[i].basis,text:match[1],confidence:Math.min(...relevant.map(w=>w.confidence))});return match[1].trim();
          });
          body.push('Energy ('+energyUnit+') '+cells.join(' '));
        }
        continue;
      }
      const cells=groups.map((ws,i)=>{const text=ws.map(w=>w.text).join(' ').trim();const numeric=ws.filter(w=>/\d/.test(w.text));const confident=numeric.length===1&&ws.every(w=>valueOrNull(w.confidence)!==null&&w.confidence>=80)&&!(/\d\s+[.,]|[.,]\s+\d/.test(text));
        const valid=/^[<≤]?\s*\d+(?:[.,]\d+)?\s*(?:g|mg|kj|kcal|cal)?$/i.test(text);
        if(!confident||!valid){issues.push('confirm-'+headers[i].basis+'-'+key);return '?';}evidence.push({key,basis:headers[i].basis,text,confidence:numeric[0].confidence});return text;});
      // Use the recognised row unit when present. Never repair a damaged unit
      // or infer the location of a missing decimal point.
      const printed=labelUnit; if(key==='energyKj'&&!printed&&!cells.some(c=>/kj|cal/i.test(c)))continue;
      body.push(row.text.match(pattern)[0]+(printed?' ('+printed+')':'')+' '+cells.join(' '));
    }
    if(!body.length)return null;
    const text=[headers.map(x=>'Per '+(x.basis==='perServing'?'Serving':'100 '+x.unit+(x.prepared?' As Prepared':''))).join(' '),...body].join('\n');
    return {text,issues,evidence};
  }
  function parseOcrResult(data={}){
    const uncertainLines=[],confidentLines=[];
    for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){
      const words=line.words||[];
      if(words.some(word=>valueOrNull(word.confidence)===null||Number(word.confidence)<(/\d/.test(word.text||'')?80:70)))uncertainLines.push(line.text||'');
      else if(words.length&&words.map(w=>w.text).join(' ').trim()===(line.text||'').trim())confidentLines.push((line.text||'').trim());
    }
    // A noisy ingredients block must not veto independently confident panel cells.
    if(valueOrNull(data.confidence)!==null&&Number(data.confidence)<70)uncertainLines.push(...String(data.text||'').split('\n').filter(line=>/\d/.test(line)&&!confidentLines.includes(line.trim())));
    const plain=parseNutritionPanel(data.text,{uncertainLines}),table=geometryPanel(data);
    // Declaration numbers have independent confidence. Noisy words inside a
    // pack-count parenthesis must not veto the legible count preceding it.
    const rows=spatialRows(data).rows,layoutLines=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[])),trusted=rows.length?rows.map(trustedRowText).join('\n'):layoutLines.filter(l=>l.words?.length).map(trustedRowText).join('\n');
    const metadata=parseServing(trusted);
    for(const key of ['servingAmount','servingUnit','servingText','servingCount','servingCountUnit','servingsPerPack'])if(metadata[key]!=null&&metadata[key]!=='')plain.model[key]=metadata[key];
    if(metadata.servingAmount||metadata.servingCount)plain.model.servingProvenance={source:'printed'};
    const partial=!plain.printedColumns.includes('per100')?unresolvedPreparedCalories(panelLines(trusted),metadata):null;
    if(partial){plain.preparedReference=partial.reference;plain.calorieEvidence=partial.evidence;plain.issues=[...new Set([...plain.issues,'prepared-reference-basis-unresolved'])];if(partial.perServingCal!==null&&plain.model.perServing.calories===null){plain.model.perServing.calories=partial.perServingCal;plain.model.energyProvenance.perServing.calories='printed';plain.model.selectedBasis='perServing';plain.model.printedColumns=['perServing'];plain.detected.perServing=true;plain.issues=plain.issues.filter(issue=>!['column-headings-not-recognised','energy-not-recognised'].includes(issue));}}
    plain.model.manufacturerServing=!!plain.model.servingAmount;Object.assign(plain,plain.model);
    if(!table){plain.readMethod='ocr';plain.extractionConfidence=valueOrNull(data.confidence);return plain;}
    const parsed=parseNutritionPanel(table.text);
    if(plain.preparedReference&&!parsed.printedColumns.includes('per100')){parsed.preparedReference=plain.preparedReference;parsed.calorieEvidence=plain.calorieEvidence;parsed.issues.push('prepared-reference-basis-unresolved');}
    // Retain independently legible metadata/rows that the geometry adapter did
    // not handle (for example a separate Cal continuation below an energy row).
    for(const key of ['servingAmount','servingUnit','servingText','servingCount','servingCountUnit','servingsPerPack'])if(parsed.model[key]==null||parsed.model[key]==='')parsed.model[key]=plain.model[key];
    if(plain.model.per100Context==='as-prepared')parsed.model.per100Context='as-prepared';
    for(const basis of ['perServing','per100'])for(const key of KEYS)if(!table.evidence.some(e=>e.basis===basis&&e.key===key)&&!table.issues.some(issue=>issue==='confirm-'+basis+'-'+key||issue==='uncertain-'+key+'-columns')){
      if(plain[basis][key]!==null&&!(plain.energyProvenance[basis]?.[key]?.startsWith('derived')&&parsed.model.energyProvenance[basis]?.[key]==='printed')){parsed.model[basis][key]=plain[basis][key];if(plain.energyProvenance[basis]?.[key])parsed.model.energyProvenance[basis][key]=plain.energyProvenance[basis][key];}
      if(plain.qualifiers[basis]?.[key]){parsed.model[basis][key]=null;parsed.model.qualifiers[basis][key]=clone(plain.qualifiers[basis][key]);}
    }
    parsed.model=guidePanelModel({...parsed.model,preparationEvidence:plain.model.preparationEvidence,waterPreparation:plain.model.waterPreparation,servingProvenance:plain.model.servingProvenance,manufacturerServing:!!parsed.model.servingAmount,selectedBasis:parsed.model.selectedBasis||plain.model.selectedBasis},{text:trusted});
    Object.assign(parsed,parsed.model);parsed.readMethod='ocr';parsed.text=String(data.text||'');parsed.ingredients=plain.ingredients;parsed.issues=[...new Set([...parsed.issues,...table.issues])];parsed.discrepancies=P().basisDiscrepancies(parsed.model);parsed.questionable=parsed.issues.length>0;parsed.extractionConfidence=valueOrNull(data.confidence);parsed.tableEvidence=table.evidence;return parsed;
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
    const result=buildPanelFood({id,name:food.name,brand:food.brand,barcode:food.barcode,model:reviewModelFor(food),confirmed,ingredients:food.ingredients,packageSize:food.packageSize||food.packageQuantity||food.quantity||'',catalogueFood:food,choice:'catalogue'});
    if(result.food&&food.privateServingOverlay){result.food.captureEvidence.privateServingOverlay=clone(food.privateServingOverlay);result.food.captureEvidence.catalogue.nutritionBasis=clone(food.privateServingOverlay.catalogueBasis);}
    return result;
  }
  function privateServingOverlay(food,privateFoods=[]){
    if(!validBarcode(food?.barcode))return food;
    const current=reviewModelFor(food),norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const compatible=privateFoods.filter(saved=>{
      if(saved.recordType!=='private'||saved.captureEvidence?.confirmed!==true||saved.verificationStatus!=='package-confirmed'||validBarcode(saved.barcode)!==validBarcode(food.barcode))return false;
      const original=saved.captureEvidence.catalogue,sameIdentity=norm(saved.name)===norm(food.name)&&norm(saved.brand)===norm(food.brand)||original&&original.id===food.id&&norm(original.name)===norm(food.name)&&norm(original.brand)===norm(food.brand);
      if(!sameIdentity)return false;
      const known=reviewModelFor(saved);
      return known.servingAmount>0&&known.servingUnit==='g'&&known.servingCount>0&&countUnits().some(unit=>unit.id===known.servingCountUnit)&&
        (!current.servingAmount||current.servingAmount===known.servingAmount&&current.servingUnit===known.servingUnit)&&
        (!current.per100Unit||current.per100Unit===known.servingUnit||current.per100Context==='as-prepared')&&
        (!current.servingCount||current.servingCount===known.servingCount&&current.servingCountUnit===known.servingCountUnit);
    });
    if(!compatible.length)return food;
    const signatures=new Set(compatible.map(saved=>{const m=reviewModelFor(saved);return JSON.stringify([m.servingAmount,m.servingUnit,m.servingCount,m.servingCountUnit]);}));
    if(signatures.size!==1)return food;
    compatible.sort((a,b)=>String(b.captureEvidence.confirmedAt||'').localeCompare(String(a.captureEvidence.confirmedAt||'')));
    const saved=compatible[0],known=reviewModelFor(saved),overlay=clone(food),provenance={source:'user-verified',privateFoodId:saved.id,confirmedAt:saved.captureEvidence.confirmedAt||null};
    overlay.nutritionBasis=P().basisModel({...current,servingAmount:known.servingAmount,servingUnit:known.servingUnit,manufacturerServing:true,servingCount:known.servingCount,servingCountUnit:known.servingCountUnit,servingProvenance:provenance,waterPreparation:known.waterPreparation,preparationEvidence:known.preparationEvidence,usualWaterMl:known.usualWaterMl});
    overlay.privateServingOverlay={...provenance,catalogueBasis:clone(current)};return overlay;
  }
  function reviewStatus({name='',model,confirmed=false,discrepancyConfirmed=false}={}){
    const missing=[],basis=chosenBasis(model),values=model?.[basis]||{},energy=P().normalisedEnergy(values);
    if(!String(name).trim())missing.push('name');
    if(!['perServing','per100'].includes(basis))missing.push('basis');
    if(valueOrNull(energy.nutrients.calories)===null)missing.push('energy');
    if(basis==='per100'&&!['g','mL'].includes(model?.per100Unit||model?.servingUnit))missing.push('per100-unit');
    if(basis==='per100'&&model?.per100Context==='as-prepared')missing.push('prepared-reference');
    if(model?.servingAmount!=null&&(!(Number(model.servingAmount)>0)||!['g','mL'].includes(model.servingUnit)))missing.push('serving-size');
    if(servingAttention(model))missing.push('serving-count');
    if(waterPreparationAllowed(model)&&model?.preparationEvidence?.kind==='dry-beverage'&&model.preparationEvidence.liquid==='unknown'&&!model.waterPreparation)missing.push('preparation-liquid');
    if(basis==='per100'&&model?.manufacturerServing&&model.servingUnit!==(model.per100Unit||model.servingUnit))missing.push('basis-unit-conflict');
    for(const [key,value] of Object.entries(values))if(value!=null&&(valueOrNull(value)===null||Number(value)<0))missing.push('invalid-'+key);
    for(const [part,total] of [['sugar','carbs'],['satFat','fat']])if(valueOrNull(values[part])!==null&&valueOrNull(values[total])!==null&&Number(values[part])>Number(values[total])+.2)missing.push(part+'-exceeds-'+total);
    if(energy.integrity.status==='conflict')missing.push('energy-unit-conflict');
    const discrepancies=P().basisDiscrepancies(model);
    if(!confirmed)missing.push('package-confirmation');if(discrepancies.length&&!discrepancyConfirmed)missing.push('discrepancy-confirmation');
    return {ready:missing.length===0,missing,discrepancies,basis};
  }
  function validationMessage(status,model){
    const labels={'product-identity':'Enter the specific product name from the packet, and brand if shown.',name:'Enter the food name.',basis:'Confirm whether the values are per serve or per 100 g / mL.',energy:'Enter energy for '+(chosenBasis(model)==='perServing'?'one serve':'100 '+(model?.per100Unit||model?.servingUnit||'g / mL'))+' from the packet (kJ or Cal).','per100-unit':'Choose g or mL for the per-100 column.','serving-size':'Enter a positive serving size and its unit, or leave size blank for a fixed serve.','basis-unit-conflict':'Serving and per-100 units differ; confirm the correct basis.','package-confirmation':'Check the package and confirm the values.','discrepancy-confirmation':'Review the differing columns and confirm the selected calculation basis.','energy-unit-conflict':'The kJ and Cal values disagree. Correct them or clear the unreadable value.'};
    labels['prepared-reference']='Use the dry product per-serving values. The as-prepared column is a separate reference, not a powder or preparation-water amount.';
    labels['serving-count']='In Serving details, enter a positive Items Per Serve and choose its Item Unit, or clear both if the packet does not state them.';
    labels['preparation-liquid']='In Preparation, confirm whether this dry drink mix uses water, milk or another liquid.';
    if(!model?.selectedBasis)labels.energy='Choose Per Serve or Per 100 g / mL, then enter energy from that printed column (kJ or Cal).';
    labels['basis-unit-conflict']='Open “Which printed column should HEC use?” and choose Per Serve for the dry serving, or correct the serving and per-100 units from the packet.';
    if(basisGuidance(model))labels['prepared-reference']=basisGuidance(model);
    return status.missing.map(key=>labels[key]||'Check '+key.replace(/-/g,' ')+'.').join(' ');
  }
  function buildPanelFood({id,name,brand='',barcode='',model,confirmed=false,discrepancyConfirmed=false,ingredients='',packageSize='',catalogueFood=null,choice='panel',extracted=null}={}){
    const status=reviewStatus({name,model,confirmed,discrepancyConfirmed});if(!status.ready)return {food:null,status};
    if(validBarcode(barcode)&&!privateIdentityStatus({name,brand,barcode}).ready)return {food:null,status:{...status,ready:false,missing:['product-identity']}};
    const basis=status.basis,useServing=basis==='perServing',amount=model.manufacturerServing?valueOrNull(model.servingAmount):null,unit=useServing?model.servingUnit:(model.per100Unit||model.servingUnit),nutrients=P().normalisedEnergy(model[basis],{preservePrintedPair:true}).nutrients,units={},unitLabels={};
    let defaultAmount=useServing?1:100,defaultUnit=useServing?'serve':unit,serving=useServing?'Manufacturer serve':'Reference per 100 '+unit;
    if(useServing){units.serve=1;unitLabels.serve=amount?'Manufacturer Serve ('+amount+' '+unit+')':'Manufacturer Serve';if(amount)units[unit]=1/amount;}
    else{units[unit]=.01;if(amount&&model.servingUnit===unit){units.serve=amount/100;unitLabels.serve='Manufacturer Serve ('+amount+' '+unit+'; calculated from per 100 '+unit+')';defaultAmount=1;defaultUnit='serve';serving='Manufacturer serving '+amount+' '+unit+' · calculated from per 100 '+unit;}}
    if(amount&&useServing)serving='Manufacturer serving '+amount+' '+unit;
    if(units[unit])unitLabels[unit]=unit;
    const natural=countUnits().find(item=>item.id===model.servingCountUnit);
    if(Number(model.servingCount)>0&&natural&&units.serve&&unit!=='mL'){units[natural.id]=units.serve/Number(model.servingCount);unitLabels[natural.id]=natural.displayLabel+(amount?' ('+Number((amount/model.servingCount).toFixed(6))+' '+unit+')':'');defaultUnit=natural.id;defaultAmount=1;}
    const food={id:String(id||'panel-'+Date.now()),recordType:'private',verificationStatus:'package-confirmed',market:'AU',barcode:validBarcode(barcode),name:String(name).trim(),brand:String(brand).trim(),category:'Packaged Food',country:'Australia',aliases:[name,brand].filter(Boolean),defaultAmount,defaultUnit,units,unitLabels,serving,nutrients,foodGroups:{},waterMl:null,hydrationType:unit==='mL'?'drink':'food',score:6,source:choice==='catalogue'?'Barcode Nutrition · User Checked':'Current Package Nutrition Panel · User Checked',verified:false,packageServingExplicit:!!amount,ingredients:String(ingredients).trim(),packageSize:String(packageSize).trim(),servingsPerPack:valueOrNull(model.servingsPerPack),nutritionStatus:'user-confirmed',loggable:true,recognisedOnly:false,productSemantics:{type:'packaged-serving',confidence:'high'},captureEvidence:{barcode:validBarcode(barcode),catalogue:catalogueFood?{id:catalogueFood.id,canonicalId:catalogueFood.canonicalId||null,barcode:catalogueFood.barcode||null,name:catalogueFood.name,brand:catalogueFood.brand||null,source:catalogueFood.source||null,nutrients:clone(catalogueFood.nutrients),units:clone(catalogueFood.units),nutritionBasis:reviewModelFor(catalogueFood)}:null,extracted:clone(extracted),confirmedPanel:clone(model),choice,confirmed:true}};
    food.canonicalId='private:'+food.id;food.privateProductIdentity={id:food.canonicalId,gtin:food.barcode||null,name:food.name,brand:food.brand||null,packageSize:food.packageSize||null};
    food.captureEvidence.confirmedAt=new Date().toISOString();
    food.captureEvidence.energyProvenance=Object.fromEntries(['energyKj','calories'].map(key=>[key,valueOrNull(model[basis][key])===null?(key==='energyKj'?'derived-from-calories':'derived-from-kj'):model.energyProvenance?.[basis]?.[key]||(choice==='catalogue'?'catalogue':'user-entered')]));
    if(unit==='g'||unit==='mL'){food.physicalForm=unit==='mL'?'liquid':model.servingCountUnit==='slice'?'sliced':model.servingCount>0&&natural?.family!=='household'?'countable':'weight';food.physicalFormSource='confirmed-packet-basis';}
    if(natural&&units[natural.id])food.unitOrigins={[natural.id]:{origin:'User-verified package serving relationship',confidence:'package-explicit',sourceType:'product-metadata',privateFoodId:model.servingProvenance?.privateFoodId||food.id}};
    food.nutrientQualifiers=clone(model.qualifiers?.[basis]||{});
    if(model.waterPreparation&&waterPreparationAllowed(model))food.preparation={type:'water',usualWaterMl:valueOrNull(model.usualWaterMl)};
    P().attachBasis(food,{...model,selectedBasis:basis,servingProvenance:{...model.servingProvenance,source:'user-verified',inputSource:model.servingProvenance?.source||'user-entered'}});return {food,status};
  }
  // Review adapter only: opening a legacy record never migrates or rewrites it.
  function reviewModelFor(food){
    if(food?.nutritionBasis&&['perServing','per100'].some(basis=>['calories','energyKj'].some(key=>valueOrNull(food.nutritionBasis[basis]?.[key])!==null))){const unit=food.nutritionBasis.per100Unit||food.nutritionPer100Unit||(food.units?.g>0&&!food.units?.mL?'g':food.units?.mL>0&&!food.units?.g?'mL':'');return P().basisModel({...food.nutritionBasis,per100Unit:unit});}
    if(food?.nutritionPer100||food?.nutritionPerServing)return P().basisModel({per100:food.nutritionPer100,perServing:food.nutritionPerServing,per100Unit:food.nutritionPer100Unit||'',servingAmount:food.manufacturerServing?.amount,servingUnit:food.manufacturerServing?.unit||'',manufacturerServing:!!food.manufacturerServing});
    const unit=food?.units?.g>0?'g':food?.units?.mL>0?'mL':'',scale=unit?food.units[unit]:null,serve=food?.units?.serve;
    return P().basisModel({perServing:serve>0?P().scale(food.nutrients,serve):{},per100:scale?P().scale(food.nutrients,scale*100):{},servingAmount:serve>0&&scale?serve/scale:null,servingUnit:unit,per100Unit:unit,manufacturerServing:serve>0&&!!scale,selectedBasis:serve>0?'perServing':unit?'per100':''});
  }
  function comparePanel(catalogueFood,model){
    if(!catalogueFood||!model)return {status:'none',rows:[]};
    const old=reviewModelFor(catalogueFood),basis=chosenBasis(model),sameServing=old.servingAmount===model.servingAmount&&old.servingUnit===model.servingUnit;let oldValues=old[basis];
    if(basis==='perServing'&&(!sameServing||!['calories','energyKj'].some(key=>valueOrNull(old.perServing[key])!==null))&&old.per100Context!=='as-prepared'&&model.manufacturerServing&&model.servingUnit===(old.per100Unit||old.servingUnit)&&valueOrNull(old.per100.calories)!==null)oldValues=P().scale(old.per100,model.servingAmount/100);
    if(basis==='perServing'&&old.manufacturerServing&&model.manufacturerServing&&(old.servingAmount!==model.servingAmount||old.servingUnit!==model.servingUnit)&&valueOrNull(old.per100.calories)===null)oldValues={};
    if(basis==='per100'&&((old.per100Unit||old.servingUnit)!==(model.per100Unit||model.servingUnit)||old.per100Context!==model.per100Context))oldValues={};
    oldValues=P().normalisedEnergy(oldValues,{preservePrintedPair:true}).nutrients;
    const rows=KEYS.filter(key=>!model.energyProvenance?.[basis]?.[key]?.startsWith('derived')&&valueOrNull(model[basis]?.[key])!==null&&valueOrNull(oldValues[key])!==null).map(key=>({key,catalogue:oldValues[key],panel:model[basis][key],different:Math.abs(oldValues[key]-model[basis][key])>Math.max(['sodium','calcium','potassium'].includes(key)?5:.2,Math.abs(oldValues[key])*.05)}));
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
  function preparationWater(food,{amountMl=null,alreadyLoggedSeparately=false}={}){
    if(food?.preparation?.type!=='water')return null;
    const amount=valueOrNull(amountMl),valid=amount!==null&&amount>=0?amount:null;
    return {amountMl:valid,alreadyLoggedSeparately:alreadyLoggedSeparately===true,fluidMl:alreadyLoggedSeparately?0:valid};
  }
  function frontIdentity(data={}, {name='',brand='',identifyBrand=()=>false}={}){
    const reject=/health\s*star|\brating\b|nutrition|ingredients|servings?|energy|protein|sodium|carbohydrate|storage|instructions?|best before|use by|barcode|www\.|\b(?:kj|kcal|cal)\b|%|\baustralian\b|\b(?:made|grown)\s+in\b|\bno\s+added\b|\b(?:source\s+of|high\s+in|low\s+in)\b|\b\d+\s*(?:pack|slices?|sachets?|g|kg|ml|l)\b/i;
    const layout=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
    const candidates=String(data.text||'').split(/\n+/).map(text=>text.replace(/\s+/g,' ').trim()).filter(text=>text.length>=3&&text.length<=70&&!reject.test(text)&&/^[a-z][a-z '&’-]+$/i.test(text)).map(text=>{const line=layout.find(l=>String(l.text||'').trim()===text),words=line?.words||[],confidence=words.length?Math.min(...words.map(w=>Number(w.confidence??0))):Number(data.confidence??85),height=words.length?Math.max(...words.map(w=>(w.bbox?.y1||0)-(w.bbox?.y0||0))):0;return {text,confidence,height};}).filter(row=>row.confidence>=80);
    const detectedBrand=candidates.find(row=>identifyBrand(row.text)||brand&&row.text.toLowerCase()===brand.toLowerCase());
    let brandText=brand||detectedBrand?.text||'',remaining=candidates.filter(row=>row!==detectedBrand&&row.text.toLowerCase()!==brandText.toLowerCase());
    if(!brandText&&remaining.length===2&&remaining.every(row=>row.text.split(' ').length>=2)){brandText=remaining.shift().text;}
    remaining.sort((a,b)=>b.height-a.height);
    return {name:name||remaining[0]?.text||'',brand:brandText,confidence:candidates.length?'review-required':'low'};
  }
  const api={version:VERSION,nutrientKeys:KEYS,valueOrNull,emptyNutrients,validBarcode,createScanSession,acceptDetection,finishLookup,resetScanSession,countUnits,waterPreparationAllowed,captureDestination,parseServing,parseNutritionPanel,parseOcrResult,guidePanelModel,servingAttention,basisGuidance,privateServingOverlay,reviewStatus,validationMessage,chosenBasis,mergePanelBaseline,privateIdentityStatus,buildBarcodeFood,buildPanelFood,reviewModelFor,comparePanel,barcodeStatus,actionsFor,preparationWater,frontIdentity};
  global.HECCaptureFoundation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
