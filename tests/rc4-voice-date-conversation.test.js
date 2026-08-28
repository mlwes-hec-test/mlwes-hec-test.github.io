'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const conversation=require('../conversation-foundation.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
const catalogue=require('../food-catalogue.js');

const ROOT=path.join(__dirname,'..'),TODAY='2026-08-27';
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const runtime=read('alpha06.js'),html=read('index.html'),styles=read('styles.css'),worker=read('service-worker.js');
const foods=sources.foodRecords({sourceId:'mcdonalds-au'});
const section=id=>{const start=html.indexOf(`<section id="${id}"`),end=html.indexOf('\n  <section id=',start+12);return html.slice(start,end<0?html.length:end);};

function productionFunction(name){
  const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,`${name} must exist`);const body=runtime.indexOf('){',start)+1;assert.ok(body>0,`${name} body must exist`);let depth=0,end=body;
  for(;end<runtime.length;end++){if(runtime[end]==='{')depth++;else if(runtime[end]==='}'&&!--depth){end++;break;}}return runtime.slice(start,end);
}
function resolveRequest(text,{selectedDate=TODAY,selectedMeal=''}={}){
  const pending=conversation.parseRequest(text,{today:TODAY,selectedDate,selectedMeal,companionNames:['Shelly','Shelley'],maxEntries:conversation.maxBatchEntries});
  const ranked=foods.map(food=>({food,result:catalogue.rank(food,pending.foodText)})).filter(item=>item.result.score>=700).sort((a,b)=>Number(['exact-name','exact-alias'].includes(b.result.tier))-Number(['exact-name','exact-alias'].includes(a.result.tier))||b.result.score-a.result.score);
  const best=ranked[0];pending.items=best?[{foodId:best.food.id,canonicalId:catalogue.canonicalKey(best.food),name:best.food.name,source:best.food.sourceDisplayName,amount:pending.quantity.explicit?pending.quantity.amount:best.food.defaultAmount,unit:best.food.defaultUnit,confidence:['exact-name','exact-alias'].includes(best.result.tier)?'high':'moderate',loggable:catalogue.canLog(best.food),provenance:catalogue.provenance(best.food)}]:[];
  if(!pending.items.length&&!pending.unresolved.some(item=>item.field==='food'))pending.unresolved.push({field:'food',message:'No confident food match.'});
  if(pending.items.some(item=>!item.loggable))pending.unresolved.push({field:'nutrition',message:'Nutrition incomplete.'});
  pending.actionId='voice-action-test';pending.entryCount=(pending.recurrence?.count||1)*pending.items.length;pending.confidence=pending.unresolved.length?'low':pending.items.every(item=>item.confidence==='high')?'high':'moderate';pending.saveLockIdentity=conversation.saveLockKey(pending);return pending;
}
function createDiaryAdapter(){
  const diary={};
  const adapter=conversation.createSaveAdapter({save(pending){const dates=pending.recurrence?Array.from({length:pending.recurrence.count},(_,index)=>conversation.shiftISO(pending.recurrence.startDate,index)):[pending.localDate],created=[];for(const date of dates){diary[date]||=[];for(const item of pending.items){const entry={id:`${pending.actionId}-${date}-${item.foodId}`,date,meal:pending.meal,status:pending.recurrence||date>TODAY||pending.status==='planned'?'planned':'eaten',foodId:item.foodId,plannerRef:`voice-plan|${pending.actionId}|${date}`};diary[date].push(entry);created.push(entry);}}return created;},undo(created){for(const entry of created)diary[entry.date]=diary[entry.date].filter(item=>item.id!==entry.id);return created.length;}});
  return{diary,adapter,count:()=>Object.values(diary).flat().length};
}

test('current simple voice requests keep exact product identity and current-day recorded behavior',()=>{
  for(const [query,name,meal] of [['Add a Big Mac for lunch.','Big Mac','Lunch'],['Add a McChicken for breakfast.','McChicken','Breakfast'],['Hi Shelley had a Big Mac for lunch.','Big Mac','Lunch'],['Hey Shelly, add a Big Mac for lunch.','Big Mac','Lunch']]){const pending=resolveRequest(query);assert.equal(pending.items[0].name,name);assert.equal(pending.meal,meal);assert.equal(pending.localDate,TODAY);assert.equal(pending.status,'eaten');assert.equal(pending.confidence,'high');}
  assert.equal(conversation.parseMeal('morning tea'),'Snacks');assert.equal(conversation.parseMeal('tea'),'Dinner');
});

test('relative dates are local-calendar values and are removed before food resolution',()=>{
  const cases=[
    ["Add a Big Mac to tomorrow's lunch.",'2026-08-28','Lunch','planned','Big Mac'],
    ['Add a Big Mac for lunch tomorrow.','2026-08-28','Lunch','planned','Big Mac'],
    ['I had a Big Mac yesterday for lunch.','2026-08-26','Lunch','eaten','Big Mac'],
    ['Add a McChicken today for dinner.','2026-08-27','Dinner','eaten','McChicken']
  ];
  for(const [query,date,meal,status,name] of cases){const pending=resolveRequest(query);assert.equal(pending.localDate,date);assert.equal(pending.meal,meal);assert.equal(pending.status,status);assert.equal(pending.items[0].name,name);assert.doesNotMatch(pending.foodText,/today|tomorrow|yesterday/);}
  assert.doesNotMatch(read('conversation-foundation.js'),/toISOString\(\)\.slice|toISOString\(\)\.substring/);
});

test('weekday phrases resolve deterministically and surface ambiguity where confirmation is required',()=>{
  const bare=resolveRequest("Add a Big Mac for Wednesday's lunch.");assert.equal(bare.localDate,'2026-09-02');assert.equal(bare.items[0].name,'Big Mac');assert.equal(bare.ambiguities[0].field,'date');assert.doesNotMatch(bare.foodText,/wednesday/);
  const next=resolveRequest('Add a Big Mac next Wednesday for lunch.');assert.equal(next.localDate,'2026-09-02');assert.equal(next.ambiguities.length,0);
  const friday=resolveRequest("Plan a McChicken for next Friday's dinner.");assert.equal(friday.localDate,'2026-08-28');assert.equal(friday.status,'planned');assert.equal(friday.meal,'Dinner');
  assert.equal(resolveRequest("Add a Big Mac for next Monday's dinner.").localDate,'2026-08-31');
  const thisWednesday=resolveRequest('Add a Big Mac this Wednesday for lunch.');assert.equal(thisWednesday.localDate,'2026-08-26');assert.equal(thisWednesday.ambiguities.length,1);
});

test('explicit Australian date forms validate weekday combinations',()=>{
  for(const [phrase,date] of [['Wednesday the 26th','2026-08-26'],['26 August','2026-08-26'],['August 26','2026-08-26'],['26 August 2026','2026-08-26'],['Wednesday 26 August','2026-08-26']]){const pending=resolveRequest(`Add a Bacon & Egg McMuffin for ${phrase} at lunch.`);assert.equal(pending.localDate,date,phrase);assert.equal(pending.items[0].name,'Bacon & Egg McMuffin');assert.doesNotMatch(pending.foodText,/wednesday|26|august/);}
  const invalid=resolveRequest('Add a Bacon & Egg McMuffin for Thursday 26 August 2026 at lunch.');assert.equal(invalid.dateIntent.invalid,true);assert.ok(invalid.unresolved.some(item=>item.field==='date'));assert.equal(invalid.confidence,'low');
});

test('an unspoken date preserves the selected Date field and a spoken meal replaces the selected meal',()=>{
  const selected=resolveRequest('Add a Big Mac for dinner.',{selectedDate:'2026-09-04',selectedMeal:'Lunch'});assert.equal(selected.localDate,'2026-09-04');assert.equal(selected.meal,'Dinner');
  const noMeal=resolveRequest('Add a Big Mac.',{selectedDate:'2026-09-04',selectedMeal:'Lunch'});assert.equal(noMeal.localDate,'2026-09-04');assert.equal(noMeal.meal,'Lunch');
  assert.match(runtime,/if\(pending\.meal&&by\('voice-meal'\)\)by\('voice-meal'\)\.value=pending\.meal/);assert.match(runtime,/if\(pending\.localDate&&by\('voice-date'\)\)by\('voice-date'\)\.value=pending\.localDate/);
});

test('past, future, plan and conflicting tense semantics remain explicit',()=>{
  assert.equal(resolveRequest('I ate a Big Mac yesterday for lunch.').status,'eaten');assert.equal(resolveRequest("Plan a McChicken for next Wednesday's dinner.").status,'planned');assert.equal(resolveRequest("Add a Big Mac to tomorrow's lunch.").status,'planned');
  const conflict=resolveRequest('I had a Big Mac tomorrow for lunch.');assert.ok(conflict.unresolved.some(item=>item.field==='timing'));assert.equal(conflict.confidence,'low');
});

test('daily recurrence produces a reviewed 14-entry future plan without saving early',()=>{
  const pending=resolveRequest('Add a Big Mac every day for lunch for the next two weeks.');assert.equal(pending.recurrence.frequency,'daily');assert.equal(pending.recurrence.startDate,'2026-08-28');assert.equal(pending.recurrence.endDate,'2026-09-10');assert.equal(pending.entryCount,14);assert.equal(pending.status,'planned');
  const store=createDiaryAdapter();assert.equal(store.count(),0);assert.equal(store.adapter.state().locked,false);const outcome=store.adapter.confirm(pending);assert.equal(outcome.saved,true);assert.equal(outcome.result.length,14);assert.equal(store.count(),14);assert.ok(Object.values(store.diary).flat().every(entry=>entry.status==='planned'&&entry.plannerRef));
  assert.match(runtime,/every day from \$\{formatDate\(pending\.recurrence\.startDate\)\} to \$\{formatDate\(pending\.recurrence\.endDate\)\}/);assert.match(runtime,/— \$\{pending\.entryCount\} planned/);
});

test('one confirmation is one atomic batch, double confirmation cannot duplicate, and undo is available',()=>{
  const pending=resolveRequest('Add a Big Mac every day for lunch for the next two weeks.'),store=createDiaryAdapter(),first=store.adapter.confirm(pending),second=store.adapter.confirm(pending);assert.equal(first.saved,true);assert.equal(second.saved,false);assert.equal(second.duplicate,true);assert.equal(store.count(),14);const undo=store.adapter.undo();assert.equal(undo.undone,true);assert.equal(store.count(),0);
  assert.match(runtime,/const dates=pending\.recurrence\?Array\.from/);assert.match(runtime,/staged\.push/);assert.match(runtime,/for\(const record of staged\).*saveExt\(\);return staged/s);
});

test('cancel saves zero, recurrence corrections re-confirm with a new count, and over-limit ranges stay blocked',()=>{
  const pending=resolveRequest('Add a Big Mac every day for lunch for the next two weeks.'),cancelled=createDiaryAdapter();assert.equal(cancelled.adapter.cancel(pending).reason,'cancelled');assert.equal(cancelled.count(),0);
  const changed=conversation.applyCorrection(pending,'every day for lunch for the next ten days',{today:TODAY,selectedDate:pending.localDate,selectedMeal:pending.meal,companionNames:['Shelly']});assert.equal(changed.pending.recurrence.count,10);assert.equal(changed.pending.recurrence.endDate,'2026-09-06');assert.equal(changed.pending.entryCount,10);
  const tooLarge=resolveRequest('Add a Big Mac every day for lunch for the next five weeks.');assert.equal(tooLarge.recurrence.count,35);assert.ok(tooLarge.unresolved.some(item=>item.field==='recurrence'));const blocked=createDiaryAdapter().adapter.confirm(tooLarge);assert.equal(blocked.saved,false);assert.equal(blocked.reason,'unresolved');
});

test('spoken confirmation, change, cancel and corrections update pending actions without saving',()=>{
  assert.equal(conversation.classifyResponse('yes'),'confirm');assert.equal(conversation.classifyResponse("that's correct"),'confirm');assert.equal(conversation.classifyResponse('cancel'),'cancel');assert.equal(conversation.classifyResponse('no'),'change');assert.equal(conversation.classifyResponse('change it'),'change');
  const pending=resolveRequest("Add a Big Mac for next Wednesday's lunch."),dateChange=conversation.applyCorrection(pending,"make that Thursday's lunch",{today:TODAY,companionNames:['Shelly']});assert.equal(dateChange.pending.localDate,'2026-08-27');assert.equal(dateChange.pending.meal,'Lunch');
  const mealChange=conversation.applyCorrection(pending,'change it to dinner',{today:TODAY,companionNames:['Shelly']});assert.equal(mealChange.pending.meal,'Dinner');
  const quantityChange=conversation.applyCorrection(pending,'make that two Big Macs',{today:TODAY,companionNames:['Shelly']});assert.equal(quantityChange.parsed.quantity.amount,2);assert.match(runtime,/voiceParsed\.items=\(voiceParsed\.items\|\|\[\]\)\.map\(item=>\(\{\.\.\.item,amount:changed\.parsed\.quantity\.amount\}\)\)/);
});

test('conversation states are explicit and reusable independent of food DOM handlers',()=>{
  let state=conversation.createConversation();for(const [event,expected] of [['open','prompting'],['startListening','listening'],['captured','transcript-captured'],['interpret','interpreting'],['clarify','clarification-required'],['ready','confirmation-ready'],['await','awaiting-confirmation'],['save','saving'],['saved','saved'],['cancel','cancelled'],['error','recoverable-error']]){state=conversation.transition(state,event);assert.equal(state.state,expected,event);}assert.ok(state.revision>=11);
});

function createListeningHarness(){
  const elements={},make=()=>({value:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return{dataset:{}}}});for(const id of ['quick-log','start-voice-log','stop-voice-log','voice-status','voice-response-mic','quick-voice-fallback','quick-voice-manual-fallback','voice-transcript'])elements[id]=make();let starts=0,aborts=0;
  class Recognition{start(){starts++;}abort(){aborts++;}stop(){}}
  const context={conversation,elements,Recognition,console,setTimeout,clearTimeout,window:null,globalThis:null};context.window=context;context.globalThis=context;vm.createContext(context);
  vm.runInContext(`
    const CONVERSATION=conversation,ext={ui:{}},main={preferences:{language:'en-AU'}};let recognition=null,voiceParsed=[],alpha0633ListenMode='request',alpha0633Conversation=CONVERSATION.createConversation(),alpha0633ResponseTimer=null,alpha0633GestureSession=false;
    window.SpeechRecognition=Recognition;window.speechSynthesis={cancel(){}};
    function by(id){return elements[id]||null;}function mainData(){return main;}function saveExt(){}function alpha0633Companion(){return{enabled:true,name:'Shelly',speech:true};}function alpha0633InterpretTranscript(){}function alpha0633HandleResponse(){}function alpha0633CancelSpeech(){}function alpha0633ShowAnswerFallback(){}
    ${productionFunction('alpha0633SetState')}
    ${productionFunction('alpha0633StopVoice')}
    ${productionFunction('alpha0633StartListening')}
    window.TEST={start:alpha0633StartListening,stop:alpha0633StopVoice,state:()=>alpha0633Conversation.state};
  `,context);return{start:context.TEST.start,stop:context.TEST.stop,state:context.TEST.state,starts:()=>starts,aborts:()=>aborts};
}

test('microphone remains deliberate and duplicate listening starts are rejected',()=>{
  const mic=createListeningHarness();assert.equal(mic.starts(),0);mic.start('request');assert.equal(mic.starts(),1);assert.equal(mic.state(),'listening');mic.start('request');assert.equal(mic.starts(),1);mic.stop();assert.equal(mic.aborts(),1);
});

test('companion speech is gated, non-overlapping, and the written prompt is always present',()=>{
  let enabled=true,spoken=[],cancelled=0;const context={console,setTimeout,clearTimeout,window:null,globalThis:null};context.window=context;context.globalThis=context;context.speechSynthesis={cancel(){cancelled++;}};context.HECSpeakText=text=>{spoken.push(text);return null;};context.alpha0633Companion=()=>({enabled:true,speech:enabled,name:'Shelly'});vm.createContext(context);vm.runInContext(`let alpha0633PromptTimer=null;${productionFunction('alpha0633CancelSpeech')}\n${productionFunction('alpha0633Speak')}`,context);
  context.alpha0633Speak('What would you like to do?');assert.deepEqual(spoken,['What would you like to do?']);assert.equal(cancelled,1);enabled=false;context.alpha0633Speak('Hidden speech');assert.equal(spoken.length,1);
  const voice=section('quick-log');assert.match(voice,/What would you like to do\?/);assert.match(voice,/id="start-voice-log"/);assert.match(voice,/Nothing is saved or removed until you confirm/);assert.match(runtime,/alpha0633PromptTimer=setTimeout\(\(\)=>alpha0633Speak\(prompt\),120\)/);assert.doesNotMatch(runtime,/setTimeout\(\(\)=>alpha0633StartListening/);
});

test('confirmation controls, manual detail fallback and accessibility remain present',()=>{
  const voice=section('quick-log');for(const label of ['Yes, Confirm','Change','View Details / Edit','Cancel','Tap to Answer','Review Request','Open Diary Add Food'])assert.match(voice,new RegExp(label.replace(/[/?]/g,'\\$&')));for(const label of ['Start microphone for a food request','Yes, confirm this action','Change this action','View details and edit this action','Cancel this action','Tap to answer this confirmation'])assert.match(voice,new RegExp(label));
  assert.match(voice,/id="voice-transcript"/);assert.match(voice,/id="voice-date"/);assert.match(voice,/id="voice-meal"/);assert.match(runtime,/if\(ready\)alpha0633SetState\('ready'/);assert.match(runtime,/else\{alpha0633SetState\('clarify'/);assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});

test('typed fallback, speech transcript and corrections share one parser and unsafe matches cannot save',()=>{
  assert.equal((runtime.match(/CONVERSATION\?\.parseRequest\?\./g)||[]).length,1);assert.match(runtime,/alpha0633InterpretTranscript/);assert.match(runtime,/mode==='request'.*alpha0633InterpretTranscript/s);assert.match(runtime,/CONVERSATION\?\.applyCorrection/);
  const missing=resolveRequest('Please add something mysterious for lunch.');assert.equal(missing.items.length,0);assert.ok(missing.unresolved.some(item=>item.field==='food'));assert.equal(createDiaryAdapter().adapter.confirm(missing).saved,false);
});

test('leaving Quick Voice cancels recognition and companion speech without changing Weight',()=>{
  assert.match(runtime,/if\(id!=='quick-log'\)\{alpha0633GestureSession=false;alpha0633StopVoice\(\);alpha0633CancelSpeech\(\);\}/);assert.match(runtime,/RECORD_WEIGHT/);assert.match(section('weight-checkin'),/Log Weight by Voice/);
  assert.match(worker,/conversation-foundation\.js/);assert.match(html,/"conversation-foundation\.js"/);assert.match(html,/Founder Trial Alpha 0\.6\.33/);assert.doesNotMatch(`${read('conversation-foundation.js')}\n${section('quick-log')}`,/family sharing|household sharing|cloud synchroni[sz]ation|iphone-to-ipad/i);
});
