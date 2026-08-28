/* Healthy Eating Companion — reusable confirmed-action conversation foundation 0.6.33.
   Pure local-calendar intent parsing and state transitions. Food resolution,
   speech recognition, DOM rendering and persistence remain adapter concerns. */
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const MAX_BATCH_ENTRIES=31;
  const ACTION_TYPES=Object.freeze({ADD_FOOD:'ADD_FOOD',REMOVE_FOOD:'REMOVE_FOOD',RECORD_WEIGHT:'RECORD_WEIGHT'});
  const STATES=Object.freeze({
    IDLE:'idle',PROMPTING:'prompting',LISTENING:'listening',CAPTURED:'transcript-captured',
    INTERPRETING:'interpreting',CLARIFICATION:'clarification-required',READY:'confirmation-ready',
    AWAITING:'awaiting-confirmation',SAVING:'saving',SAVED:'saved',CANCELLED:'cancelled',ERROR:'recoverable-error'
  });
  const WEEKDAYS=Object.freeze(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
  const MONTHS=Object.freeze(['January','February','March','April','May','June','July','August','September','October','November','December']);
  const NUMBER_WORDS=Object.freeze({
    a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
    eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,
    nineteen:19,twenty:20,'twenty one':21,'twenty two':22,'twenty three':23,'twenty four':24,
    'twenty five':25,'twenty six':26,'twenty seven':27,'twenty eight':28,'twenty nine':29,thirty:30,
    'thirty one':31,half:.5
  });

  function norm(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’]/g,"'").replace(/[^a-z0-9'&]+/g,' ').replace(/\s+/g,' ').trim();}
  function isoParts(value){const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?{year:Number(match[1]),month:Number(match[2]),day:Number(match[3])}:null;}
  function validISO(value){const p=isoParts(value);if(!p)return false;const date=new Date(p.year,p.month-1,p.day,12);return date.getFullYear()===p.year&&date.getMonth()===p.month-1&&date.getDate()===p.day;}
  function toISO(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
  function fromISO(value){const p=isoParts(value);return p?new Date(p.year,p.month-1,p.day,12):new Date(NaN);}
  function shiftISO(value,days){const date=fromISO(value);date.setDate(date.getDate()+Number(days||0));return toISO(date);}
  function compareISO(a,b){return String(a||'').localeCompare(String(b||''));}
  function daysBetween(a,b){return Math.round((fromISO(b)-fromISO(a))/86400000);}
  function weekdayOf(value){return WEEKDAYS[fromISO(value).getDay()]||'';}
  function parseNumber(value,fallback=null){const key=norm(value).replace(/-/g,' ');const numeric=Number(key);return Number.isFinite(numeric)&&numeric>0?numeric:(NUMBER_WORDS[key]??fallback);}
  function escapeRegex(value){return String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function stripWake(text,names=[]){
    const choices=['companion','hec','healthy eating companion','shelly','shelley',...(names||[])].map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);
    const pattern=choices.map(escapeRegex).join('|');
    return String(text||'').trim().replace(new RegExp(`^(?:hey|hi|hello)\\s+(?:${pattern})\\b[,.!?]*\\s*`,'i'),'').trim();
  }
  function monthIndex(value){const key=norm(value);return MONTHS.findIndex(month=>norm(month)===key);}
  function weekdayIndex(value){const key=norm(value);return WEEKDAYS.findIndex(day=>norm(day)===key);}
  function dateFromParts(year,month,day){const date=new Date(year,month,day,12);return date.getFullYear()===year&&date.getMonth()===month&&date.getDate()===day?toISO(date):'';}
  function nearestDayWithWeekday(today,day,weekday){
    const base=fromISO(today),candidates=[];
    for(let offset=-6;offset<=6;offset++){
      const month=new Date(base.getFullYear(),base.getMonth()+offset,day,12);
      if(month.getDate()===day&&month.getDay()===weekday)candidates.push({iso:toISO(month),distance:Math.abs(daysBetween(today,toISO(month)))});
    }
    return candidates.sort((a,b)=>a.distance-b.distance||a.iso.localeCompare(b.iso))[0]?.iso||'';
  }
  function nextWeekday(today,weekday,{strict=false,thisWeek=false}={}){
    const base=fromISO(today),current=base.getDay();
    let delta=(weekday-current+7)%7;
    if(strict&&delta===0)delta=7;
    if(thisWeek){const mondayOffset=(current+6)%7,targetOffset=(weekday+6)%7;delta=targetOffset-mondayOffset;}
    return shiftISO(today,delta);
  }
  function parseDateIntent(text,{today,selectedDate}={}){
    const localToday=validISO(today)?today:toISO(new Date()),fallback=validISO(selectedDate)?selectedDate:localToday;
    const raw=String(text||''),clean=norm(raw),result={date:fallback,spoken:false,phrase:'',kind:'default',ambiguous:false,invalid:false,reason:'',weekday:'',removePhrases:[]};
    const relative=clean.match(/\b(today|tomorrow|yesterday)(?:'s)?\b/);
    if(relative){const offsets={today:0,tomorrow:1,yesterday:-1};result.date=shiftISO(localToday,offsets[relative[1]]);result.spoken=true;result.phrase=relative[0];result.kind='relative';result.removePhrases.push(relative[0]);return result;}

    const monthNames=MONTHS.map(norm).join('|'),weekdayNames=WEEKDAYS.map(norm).join('|');
    let match=clean.match(new RegExp(`\\b(?:(${weekdayNames})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:\\s+(\\d{4}))?\\b`));
    if(match){
      const weekday=weekdayIndex(match[1]),month=monthIndex(match[3]),year=Number(match[4]||fromISO(localToday).getFullYear()),date=dateFromParts(year,month,Number(match[2]));
      Object.assign(result,{date:date||fallback,spoken:true,phrase:match[0],kind:'explicit',ambiguous:!match[4],invalid:!date,weekday:match[1]?WEEKDAYS[weekday]:'',reason:date?'':'That calendar date is invalid.'});
      if(date&&weekday>=0&&fromISO(date).getDay()!==weekday){result.invalid=true;result.reason=`${match[1]} does not match ${Number(match[2])} ${MONTHS[month]} ${year}.`;}
      result.removePhrases.push(match[0]);return result;
    }
    match=clean.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?\\b`));
    if(match){
      const month=monthIndex(match[1]),year=Number(match[3]||fromISO(localToday).getFullYear()),date=dateFromParts(year,month,Number(match[2]));
      Object.assign(result,{date:date||fallback,spoken:true,phrase:match[0],kind:'explicit',ambiguous:!match[3],invalid:!date,reason:date?'':'That calendar date is invalid.'});result.removePhrases.push(match[0]);return result;
    }
    match=clean.match(new RegExp(`\\b(${weekdayNames})\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)\\b`));
    if(match){
      const weekday=weekdayIndex(match[1]),date=nearestDayWithWeekday(localToday,Number(match[2]),weekday);
      Object.assign(result,{date:date||fallback,spoken:true,phrase:match[0],kind:'weekday-day',ambiguous:true,invalid:!date,weekday:WEEKDAYS[weekday],reason:date?'':'No nearby date matches that weekday and day number.'});result.removePhrases.push(match[0]);return result;
    }
    match=clean.match(new RegExp(`\\b(?:(next|this)\\s+)?(${weekdayNames})(?:'s)?\\b`));
    if(match){
      const modifier=match[1]||'',weekday=weekdayIndex(match[2]);result.date=nextWeekday(localToday,weekday,{strict:modifier==='next',thisWeek:modifier==='this'});result.spoken=true;result.phrase=match[0];result.kind=modifier?`${modifier}-weekday`:'weekday';result.ambiguous=modifier!=='next';result.weekday=WEEKDAYS[weekday];result.removePhrases.push(match[0]);return result;
    }
    return result;
  }
  function parseMeal(text){const clean=norm(text);if(/\bbreakfast\b/.test(clean))return'Breakfast';if(/\blunch\b/.test(clean))return'Lunch';if(/\bmorning tea\b|\bafternoon tea\b|\bsmoko\b|\bsupper\b|\bsnacks?\b/.test(clean))return'Snacks';if(/\bdinner\b|\btea\b/.test(clean))return'Dinner';if(/\bother\b/.test(clean))return'Other';return'';}
  function parseRecurrence(text,{today,dateIntent,maxEntries=MAX_BATCH_ENTRIES}={}){
    const clean=norm(text),match=clean.match(/\bevery\s+day(?:\s+for\s+(?:breakfast|lunch|dinner|snacks?|other))?\s+for\s+(?:the\s+)?next\s+((?:twenty|thirty)(?:\s+(?:one|two|three|four|five|six|seven|eight|nine))?|[a-z]+|\d+)\s+(days?|weeks?)\b/);
    if(!match)return null;
    const value=parseNumber(match[1]),unit=match[2],requested=Number(value)*(unit.startsWith('week')?7:1),start=dateIntent?.spoken?dateIntent.date:shiftISO(today,1),count=Math.max(0,Math.floor(requested||0));
    return {frequency:'daily',phrase:match[0],startDate:start,endDate:count?shiftISO(start,count-1):start,count,requestedCount:count,limit:maxEntries,overLimit:!count||count>maxEntries};
  }
  function extractQuantity(text){
    const clean=norm(text),numberPattern='(?:thirty(?:\\s+one)?|twenty(?:\\s+(?:one|two|three|four|five|six|seven|eight|nine))?|nineteen|eighteen|seventeen|sixteen|fifteen|fourteen|thirteen|twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one|half|an?|\\d+(?:\\.\\d+)?)';
    const withUnit=clean.match(new RegExp(`\\b(${numberPattern})\\s+(ml|millilitres?|milliliters?|grams?|g|kg|litres?|liters?|glasses|glass|burgers?|wraps?|mcmuffins?|serves?|servings?|items?|drinks?)\\b`));
    if(withUnit)return {amount:parseNumber(withUnit[1],1),unit:withUnit[2],phrase:withUnit[0],explicit:true};
    const article=clean.match(new RegExp(`\\b(${numberPattern})\\s+(?=[a-z])`));
    return article?{amount:parseNumber(article[1],1),unit:'',phrase:article[1],explicit:true}:{amount:1,unit:'',phrase:'',explicit:false};
  }
  function removePhrase(text,phrase){if(!phrase)return text;return text.replace(new RegExp(`\\b${escapeRegex(phrase).replace(/\\ /g,'\\s+')}\\b`,'i'),' ');}
  function foodPhrase(text,{dateIntent,recurrence,meal,quantity}={}){
    let value=norm(text);
    for(const phrase of dateIntent?.removePhrases||[])value=removePhrase(value,phrase);
    if(recurrence?.phrase)value=removePhrase(value,recurrence.phrase);
    if(quantity?.explicit&&quantity.phrase)value=removePhrase(value,quantity.phrase);
    value=value.replace(/\b(?:breakfast|lunch|dinner|morning tea|afternoon tea|tea|smoko|supper|snacks?|other)\b/gi,' ');
    value=value.replace(/\b(?:add|log|record|plan|planned|please|i had|i ate|had|ate|i want|want|put|include|make that|change it|change|that is|that's|to|into|for|at|on|in|my|the|a|an)\b/gi,' ');
    value=value.replace(/[,.!?]+/g,' ').replace(/\s+/g,' ').trim();
    return value;
  }
  function actionIntent(text){const clean=norm(text);if(/\b(?:i\s+had|i\s+ate|had|ate)\b/.test(clean))return'past';if(/\bplan(?:ned|ning)?\b/.test(clean))return'plan';return'add';}
  function deriveStatus(intent,date,today,recurrence){if(recurrence||intent==='plan'||compareISO(date,today)>0)return'planned';return'eaten';}
  function parseRequest(text,{today,selectedDate,selectedMeal='',companionNames=[],maxEntries=MAX_BATCH_ENTRIES,allowMissingFood=false}={}){
    const localToday=validISO(today)?today:toISO(new Date()),raw=String(text||'').trim(),withoutWake=stripWake(raw,companionNames),dateIntent=parseDateIntent(withoutWake,{today:localToday,selectedDate}),recurrence=parseRecurrence(withoutWake,{today:localToday,dateIntent,maxEntries}),meal=parseMeal(withoutWake)||selectedMeal||'',quantity=extractQuantity(recurrence?removePhrase(withoutWake,recurrence.phrase):withoutWake),intent=actionIntent(withoutWake),foodText=foodPhrase(withoutWake,{dateIntent,recurrence,meal,quantity}),date=recurrence?.startDate||dateIntent.date,status=deriveStatus(intent,date,localToday,recurrence),unresolved=[];
    if(!meal)unresolved.push({field:'meal',message:'Which meal should I use?'});
    if(dateIntent.invalid)unresolved.push({field:'date',message:dateIntent.reason||'The date could not be resolved safely.'});
    if(recurrence?.overLimit)unresolved.push({field:'recurrence',message:`Daily voice planning is limited to ${maxEntries} entries. Choose a smaller range or use Meal Planner.`});
    if(intent==='past'&&compareISO(date,localToday)>0)unresolved.push({field:'timing',message:'That sounds eaten, but the date is in the future. Should this be planned instead?'});
    if(intent==='plan'&&compareISO(date,localToday)<0)unresolved.push({field:'timing',message:'That sounds planned, but the date is in the past. Should this be recorded as eaten instead?'});
    if(!foodText&&!allowMissingFood)unresolved.push({field:'food',message:'Which food or product did you mean?'});
    return {actionType:ACTION_TYPES.ADD_FOOD,raw,transcript:raw,cleanText:withoutWake,foodText,meal,localDate:date,dateIntent,recurrence,quantity,intent,status,entryCount:recurrence?.count||1,confidence:dateIntent.invalid?'low':'pending-food',unresolved,ambiguities:dateIntent.ambiguous?[{field:'date',message:`I resolved ${dateIntent.phrase} as ${date}.`}]:[],provenance:{parser:`hec-conversation-${VERSION}`,localCalendar:true}};
  }
  function detectActionType(text){
    const clean=norm(text);
    if(/\b(?:remove|delete|take)\b/.test(clean)||/\bi\s+didn'?t\s+(?:have|eat)\b/.test(clean))return ACTION_TYPES.REMOVE_FOOD;
    if(/\b(?:weigh|weighed|weight)\b/.test(clean)&&(/\b(?:kg|kilos?|kilograms?)\b/.test(clean)||/\b\d{2,3}(?:\s+\d+)?\b/.test(clean)))return ACTION_TYPES.RECORD_WEIGHT;
    return ACTION_TYPES.ADD_FOOD;
  }
  function parseWeightRequest(text,{today,selectedDate,companionNames=[]}={}){
    const localToday=validISO(today)?today:toISO(new Date()),raw=String(text||'').trim(),cleanText=stripWake(raw,companionNames),dateIntent=parseDateIntent(cleanText,{today:localToday,selectedDate}),match=cleanText.match(/\b(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilos?|kilograms?)?\b/i),weightKg=match?Math.round(Number(match[1].replace(',','.'))*10)/10:null,unresolved=[];
    if(!weightKg||weightKg<30||weightKg>400)unresolved.push({field:'weight',message:'Please say a weight from 30 to 400 kilograms.'});
    if(dateIntent.invalid)unresolved.push({field:'date',message:dateIntent.reason||'The date could not be resolved safely.'});
    if(compareISO(dateIntent.date,localToday)>0)unresolved.push({field:'date',message:'Future-dated weight check-ins are not allowed.'});
    return {actionType:ACTION_TYPES.RECORD_WEIGHT,raw,transcript:raw,cleanText,weightKg,localDate:dateIntent.date,dateIntent,unresolved,ambiguities:dateIntent.ambiguous?[{field:'date',message:`I resolved ${dateIntent.phrase} as ${dateIntent.date}.`}]:[],confidence:unresolved.length?'low':'high',provenance:{parser:`hec-conversation-${VERSION}`,localCalendar:true}};
  }
  function removalFoodPhrase(text,{dateIntent,quantity}={}){
    let value=norm(text);for(const phrase of dateIntent?.removePhrases||[])value=removePhrase(value,phrase);
    if(quantity?.explicit&&quantity.phrase)value=removePhrase(value,quantity.phrase);
    value=value.replace(/\b(?:breakfast|lunch|dinner|morning tea|afternoon tea|tea|smoko|supper|snacks?|other)\b/g,' ');
    value=value.replace(/\bi\s+didn'?t\s+(?:have|eat)\s+(?:that\s+)?/g,' ').replace(/\b(?:remove|delete|take|out|from|of|at|on|in|my|the|that|please|all|one|it)\b/g,' ');
    return value.replace(/\s+/g,' ').trim();
  }
  function parseRemoveRequest(text,{today,selectedDate,selectedMeal='',companionNames=[]}={}){
    const localToday=validISO(today)?today:toISO(new Date()),raw=String(text||'').trim(),cleanText=stripWake(raw,companionNames),dateIntent=parseDateIntent(cleanText,{today:localToday,selectedDate}),meal=parseMeal(cleanText)||selectedMeal||'',all=/\b(?:all|both)\b/.test(norm(cleanText)),quantity=extractQuantity(cleanText),foodText=removalFoodPhrase(cleanText,{dateIntent,quantity}),unresolved=[];
    const removeMode=all?'all':quantity.explicit?'quantity':'unspecified',removeQuantity=all?null:quantity.explicit?Number(quantity.amount)||1:null;
    if(!meal)unresolved.push({field:'meal',message:'Which meal should I remove it from?'});
    if(dateIntent.invalid)unresolved.push({field:'date',message:dateIntent.reason||'The date could not be resolved safely.'});
    if(compareISO(dateIntent.date,localToday)>0)unresolved.push({field:'date',message:'Diary removal is limited to today or an earlier date.'});
    if(!foodText)unresolved.push({field:'food',message:'Which Diary food should I remove?'});
    return {actionType:ACTION_TYPES.REMOVE_FOOD,raw,transcript:raw,cleanText,foodText,meal,localDate:dateIntent.date,dateIntent,removeMode,removeQuantity,quantity,unresolved,ambiguities:[],confidence:unresolved.length?'low':'pending-diary-match',provenance:{parser:`hec-conversation-${VERSION}`,localCalendar:true}};
  }
  function parseActionRequest(text,options={}){
    const actionType=detectActionType(stripWake(text,options.companionNames||[]));
    if(actionType===ACTION_TYPES.RECORD_WEIGHT)return parseWeightRequest(text,options);
    if(actionType===ACTION_TYPES.REMOVE_FOOD)return parseRemoveRequest(text,options);
    return parseRequest(text,options);
  }
  function entryIdentity(entry){return String(entry?.canonicalId||entry?.foodSnapshot?.canonicalId||entry?.foodSnapshot?.id||entry?.foodId||'');}
  function singularIdentity(value){return norm(value).split(' ').map(word=>word.length>3&&/s$/.test(word)&&!/ss$/.test(word)?word.slice(0,-1):word).join(' ');}
  function matchRemoval(entries,pending){
    const targetCanonical=String(pending?.canonicalId||pending?.items?.[0]?.canonicalId||''),targetName=norm(pending?.foodText||pending?.items?.[0]?.name||''),candidates=(entries||[]).filter(entry=>{
      if(entry?.status==='skipped')return false;if(targetCanonical&&entryIdentity(entry)===targetCanonical)return true;
      const names=[entry?.name,entry?.foodSnapshot?.name,...(entry?.foodSnapshot?.aliases||[])].map(singularIdentity).filter(Boolean);return !!targetName&&names.includes(singularIdentity(targetName));
    });
    if(!candidates.length)return {status:'none',matches:[],totalQuantity:0,message:`I could not find ${pending?.foodText||'that food'} in ${pending?.meal||'that meal'}.`};
    const identities=new Set(candidates.map(entryIdentity).filter(Boolean)),totalQuantity=candidates.reduce((sum,entry)=>sum+Math.max(0,Number(entry.amount)||0),0);
    if(!targetCanonical&&identities.size>1)return {status:'ambiguous',matches:candidates,totalQuantity,message:`Several Diary products match “${pending?.foodText}”. Open the Diary to choose the exact one.`};
    if(pending?.removeMode==='unspecified'&&totalQuantity>1)return {status:'ambiguous-quantity',matches:candidates,totalQuantity,message:`You have ${totalQuantity} ${pending?.foodText}. Remove one or all?`};
    return {status:'exact',matches:candidates,totalQuantity,message:''};
  }
  function scaleRecord(entry,remaining){
    const previous=Math.max(0,Number(entry.amount)||0),ratio=previous?remaining/previous:0,scaleObject=value=>Object.fromEntries(Object.entries(value||{}).map(([key,item])=>[key,item===null||item===undefined?item:Number(item)*ratio]));
    return {...entry,amount:remaining,nutrients:scaleObject(entry.nutrients),foodGroups:scaleObject(entry.foodGroups),waterMl:Number(entry.waterMl||0)*ratio,updatedAt:new Date().toISOString()};
  }
  function applyRemoval(entries,pending){
    const matched=matchRemoval(entries,pending);if(matched.status!=='exact')return {...matched,records:[...(entries||[])],changes:[]};
    const ids=new Set(matched.matches.map(entry=>entry.id)),removeAll=pending.removeMode==='all',requested=removeAll?Infinity:Math.max(1,Number(pending.removeQuantity)||1);let remainingToRemove=requested;const changes=[],records=[];
    for(const entry of entries||[]){if(!ids.has(entry.id)||remainingToRemove<=0){records.push(entry);continue;}const amount=Math.max(0,Number(entry.amount)||0),taken=removeAll?amount:Math.min(amount,remainingToRemove),left=amount-taken;remainingToRemove-=taken;if(left>0){const updated=scaleRecord(entry,left);records.push(updated);changes.push({type:'reduced',id:entry.id,from:amount,to:left});}else changes.push({type:'removed',id:entry.id,from:amount,to:0});}
    return {status:'applied',records,changes,removedQuantity:removeAll?matched.totalQuantity:requested-remainingToRemove};
  }
  function classifyResponse(text){const clean=norm(text);if(/^(?:(?:yes|yep|yeah|ok|okay)(?: (?:please|confirm|confirmed|correct|that is correct|that's correct|thats correct|that is right|that's right|thats right))?|confirm|confirmed|that's correct|thats correct|that is correct|correct|that's right|thats right|that is right)$/.test(clean))return'confirm';if(/^(?:cancel|stop|forget it|never mind|nevermind)$/.test(clean))return'cancel';if(/^(?:no|change|change it|that's wrong|thats wrong|that is wrong|that's not correct|thats not correct|that is not correct)$/.test(clean))return'change';return'correction';}
  function applyCorrection(pending,text,options={}){
    const response=classifyResponse(text);if(response!=='correction')return {response,pending};
    if(pending?.actionType===ACTION_TYPES.RECORD_WEIGHT){const match=String(text||'').match(/\b(\d{2,3}(?:[.,]\d+)?)\b/),parsed=parseWeightRequest(`${match?.[1]||''} kg ${text}`,{...options,selectedDate:pending.localDate}),next={...pending};if(parsed.weightKg)next.weightKg=parsed.weightKg;if(parsed.dateIntent.spoken&&!parsed.dateIntent.invalid)next.localDate=parsed.localDate;next.transcript=`${pending.transcript}\nCorrection: ${String(text||'').trim()}`;next.unresolved=parsed.unresolved;return {response:'correction',pending:next,parsed};}
    if(pending?.actionType===ACTION_TYPES.REMOVE_FOOD){const parsed=parseRemoveRequest(text,{...options,selectedDate:pending.localDate,selectedMeal:pending.meal}),next={...pending};if(parseMeal(text))next.meal=parsed.meal;if(parsed.dateIntent.spoken&&!parsed.dateIntent.invalid)next.localDate=parsed.localDate;if(/\b(?:all|both)\b/.test(norm(text))){next.removeMode='all';next.removeQuantity=null;}else if(parsed.quantity.explicit){next.removeMode='quantity';next.removeQuantity=parsed.quantity.amount;}next.transcript=`${pending.transcript}\nCorrection: ${String(text||'').trim()}`;next.unresolved=(pending.unresolved||[]).filter(item=>!(item.field==='meal'&&next.meal)&&!(item.field==='date'&&parsed.dateIntent.spoken&&!parsed.dateIntent.invalid)&&!(item.field==='quantity'&&next.removeMode!=='unspecified'));return {response:'correction',pending:next,parsed};}
    const parsed=parseRequest(text,{...options,selectedDate:pending?.localDate,selectedMeal:pending?.meal,allowMissingFood:true}),next={...pending};
    if(parsed.dateIntent.spoken&&!parsed.dateIntent.invalid)next.localDate=parsed.localDate;
    if(parseMeal(text))next.meal=parsed.meal;
    if(parsed.quantity.explicit)next.quantity=parsed.quantity;
    if(parsed.recurrence){next.recurrence=parsed.recurrence;next.entryCount=parsed.recurrence.count;}
    next.status=deriveStatus(parsed.intent==='add'?pending.intent:parsed.intent,next.localDate,options.today,next.recurrence);
    next.transcript=`${pending.transcript}\nCorrection: ${String(text||'').trim()}`;next.unresolved=(pending.unresolved||[]).filter(item=>!(item.field==='meal'&&next.meal)&&!(item.field==='date'&&parsed.dateIntent.spoken&&!parsed.dateIntent.invalid)&&!(item.field==='recurrence'&&next.recurrence&&!next.recurrence.overLimit));
    return {response:'correction',pending:next,parsed};
  }
  function createConversation(){return {state:STATES.IDLE,pendingAction:null,lastTranscript:'',originalTranscript:'',responseTranscript:'',correctionHistory:[],error:'',revision:0};}
  function transition(conversation,event,payload={}){
    const next={...createConversation(),...(conversation||{}),revision:Number(conversation?.revision||0)+1};
    const states={open:STATES.PROMPTING,startListening:STATES.LISTENING,captured:STATES.CAPTURED,interpret:STATES.INTERPRETING,clarify:STATES.CLARIFICATION,ready:STATES.READY,await:STATES.AWAITING,save:STATES.SAVING,saved:STATES.SAVED,cancel:STATES.CANCELLED,error:STATES.ERROR,reset:STATES.IDLE};
    if(states[event])next.state=states[event];if(Object.hasOwn(payload,'pendingAction'))next.pendingAction=payload.pendingAction;if(Object.hasOwn(payload,'transcript'))next.lastTranscript=payload.transcript;if(Object.hasOwn(payload,'originalTranscript'))next.originalTranscript=payload.originalTranscript;if(Object.hasOwn(payload,'responseTranscript'))next.responseTranscript=payload.responseTranscript;if(Object.hasOwn(payload,'correction'))next.correctionHistory=[...(next.correctionHistory||[]),payload.correction];if(Object.hasOwn(payload,'error'))next.error=payload.error;return next;
  }
  function saveLockKey(pending){return [pending?.actionId||'',pending?.actionType||'',pending?.items?.map(item=>`${item.canonicalId||item.foodId}:${item.amount}:${item.unit}`).join(',')||'',pending?.weightKg||'',pending?.removeMode||'',pending?.removeQuantity||'',pending?.localDate||'',pending?.meal||'',pending?.recurrence?.endDate||''].join('|');}

  function createVoiceSession({timeoutMs=7000,onListen=()=>true,onFallback=()=>{},onStop=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}={}){
    let active=false,listening=false,timer=null,restartAttempted=false;
    const clear=()=>{if(timer)clearTimer(timer);timer=null;};
    const stop=reason=>{clear();const wasActive=active;active=false;listening=false;if(wasActive)onStop(reason);return snapshot();};
    const fallback=reason=>{clear();active=false;listening=false;onFallback(reason);return snapshot();};
    const snapshot=()=>({active,listening,restartAttempted,timeoutMs});
    return {
      begin({userGesture=false}={}){clear();active=!!userGesture;listening=false;restartAttempted=false;return snapshot();},
      afterPrompt(){if(!active||restartAttempted)return snapshot();restartAttempted=true;let started=false;try{started=onListen()!==false;}catch{started=false;}if(!started)return fallback('restart-blocked');listening=true;timer=setTimer(()=>{if(active)fallback('timeout');},timeoutMs);return snapshot();},
      response(){return stop('response');},cancel(){return stop('cancel');},leave(){return stop('leave');},fallback,snapshot
    };
  }

  function createSaveAdapter({save,undo}={}){
    if(typeof save!=='function')throw new TypeError('A confirmed-action save function is required.');
    let saving=false,lastKey='',lastResult=null;
    return {
      confirm(pending){
        const unresolved=pending?.unresolved||[],key=saveLockKey(pending);
        if(!pending||unresolved.length)return {saved:false,reason:'unresolved',key};
        if(saving)return {saved:false,reason:'busy',key};
        if(key&&key===lastKey)return {saved:false,reason:'duplicate',duplicate:true,key,result:lastResult};
        saving=true;
        try{lastResult=save(pending);lastKey=key;return {saved:true,key,result:lastResult};}
        finally{saving=false;}
      },
      cancel(){return {saved:false,reason:'cancelled'};},
      undo(){if(!lastKey||typeof undo!=='function')return {undone:false};const result=undo(lastResult);lastKey='';lastResult=null;return {undone:true,result};},
      reset(){saving=false;lastKey='';lastResult=null;},
      state(){return {saving,locked:!!lastKey,key:lastKey,result:lastResult};}
    };
  }

  const api={version:VERSION,maxBatchEntries:MAX_BATCH_ENTRIES,states:STATES,actionTypes:ACTION_TYPES,weekdays:WEEKDAYS,months:MONTHS,norm,validISO,toISO,fromISO,shiftISO,compareISO,daysBetween,weekdayOf,parseNumber,stripWake,parseDateIntent,parseMeal,parseRecurrence,extractQuantity,detectActionType,parseRequest,parseWeightRequest,parseRemoveRequest,parseActionRequest,matchRemoval,applyRemoval,classifyResponse,applyCorrection,createConversation,transition,saveLockKey,createSaveAdapter,createVoiceSession};
  global.HECConversationFoundation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
