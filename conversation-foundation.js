/* Healthy Eating Companion — reusable confirmed-action conversation foundation 0.6.33.
   Pure local-calendar intent parsing and state transitions. Food resolution,
   speech recognition, DOM rendering and persistence remain adapter concerns. */
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const MAX_BATCH_ENTRIES=31;
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
    value=value.replace(/\b(?:add|log|record|plan|planned|please|i had|i ate|had|ate|i want|want|put|include|make that|change it|change|that is|that's|to|for|at|on|in|my|the|a|an)\b/gi,' ');
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
    return {actionType:'food-log',raw,transcript:raw,cleanText:withoutWake,foodText,meal,localDate:date,dateIntent,recurrence,quantity,intent,status,entryCount:recurrence?.count||1,confidence:dateIntent.invalid?'low':'pending-food',unresolved,ambiguities:dateIntent.ambiguous?[{field:'date',message:`I resolved ${dateIntent.phrase} as ${date}.`}]:[],provenance:{parser:`hec-conversation-${VERSION}`,localCalendar:true}};
  }
  function classifyResponse(text){const clean=norm(text);if(/^(?:yes|confirm|confirmed|that's correct|that is correct|correct|yep|yeah|ok|okay)$/.test(clean))return'confirm';if(/^(?:cancel|stop|forget it|never mind|nevermind)$/.test(clean))return'cancel';if(/^(?:no|change|change it|that's wrong|that is wrong)$/.test(clean))return'change';return'correction';}
  function applyCorrection(pending,text,options={}){
    const response=classifyResponse(text);if(response!=='correction')return {response,pending};
    const parsed=parseRequest(text,{...options,selectedDate:pending?.localDate,selectedMeal:pending?.meal,allowMissingFood:true}),next={...pending};
    if(parsed.dateIntent.spoken&&!parsed.dateIntent.invalid)next.localDate=parsed.localDate;
    if(parseMeal(text))next.meal=parsed.meal;
    if(parsed.quantity.explicit)next.quantity=parsed.quantity;
    if(parsed.recurrence){next.recurrence=parsed.recurrence;next.entryCount=parsed.recurrence.count;}
    next.status=deriveStatus(parsed.intent==='add'?pending.intent:parsed.intent,next.localDate,options.today,next.recurrence);
    next.transcript=`${pending.transcript}\nCorrection: ${String(text||'').trim()}`;next.unresolved=(pending.unresolved||[]).filter(item=>!(item.field==='meal'&&next.meal)&&!(item.field==='date'&&parsed.dateIntent.spoken&&!parsed.dateIntent.invalid)&&!(item.field==='recurrence'&&next.recurrence&&!next.recurrence.overLimit));
    return {response:'correction',pending:next,parsed};
  }
  function createConversation(){return {state:STATES.IDLE,pendingAction:null,lastTranscript:'',error:'',revision:0};}
  function transition(conversation,event,payload={}){
    const next={...createConversation(),...(conversation||{}),revision:Number(conversation?.revision||0)+1};
    const states={open:STATES.PROMPTING,startListening:STATES.LISTENING,captured:STATES.CAPTURED,interpret:STATES.INTERPRETING,clarify:STATES.CLARIFICATION,ready:STATES.READY,await:STATES.AWAITING,save:STATES.SAVING,saved:STATES.SAVED,cancel:STATES.CANCELLED,error:STATES.ERROR,reset:STATES.IDLE};
    if(states[event])next.state=states[event];if(Object.hasOwn(payload,'pendingAction'))next.pendingAction=payload.pendingAction;if(Object.hasOwn(payload,'transcript'))next.lastTranscript=payload.transcript;if(Object.hasOwn(payload,'error'))next.error=payload.error;return next;
  }
  function saveLockKey(pending){return [pending?.actionId||'',pending?.actionType||'',pending?.items?.map(item=>`${item.canonicalId||item.foodId}:${item.amount}:${item.unit}`).join(',')||'',pending?.localDate||'',pending?.meal||'',pending?.recurrence?.endDate||''].join('|');}

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

  const api={version:VERSION,maxBatchEntries:MAX_BATCH_ENTRIES,states:STATES,weekdays:WEEKDAYS,months:MONTHS,norm,validISO,toISO,fromISO,shiftISO,compareISO,daysBetween,weekdayOf,parseNumber,stripWake,parseDateIntent,parseMeal,parseRecurrence,extractQuantity,parseRequest,classifyResponse,applyCorrection,createConversation,transition,saveLockKey,createSaveAdapter};
  global.HECConversationFoundation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
