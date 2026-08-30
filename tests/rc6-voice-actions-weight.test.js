'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const conversation=require('../conversation-foundation.js');
const ROOT=path.join(__dirname,'..'),runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8'),app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const TODAY='2026-08-28',options={today:TODAY,selectedDate:TODAY,selectedMeal:'Dinner',companionNames:['Shelly']};
const entry=(id,amount=1,extra={})=>({id,foodId:'big-mac',canonicalId:'food-source:mcdonalds-au:big-mac',name:'Big Mac',meal:'Dinner',amount,nutrients:{calories:621*amount,protein:25*amount},foodGroups:{},waterMl:20*amount,...extra});

test('central action routing keeps add, remove and weight intents separate',()=>{
  assert.equal(conversation.parseActionRequest('Add a Big Mac to dinner',options).actionType,'ADD_FOOD');assert.equal(conversation.parseActionRequest('Remove one Big Mac from dinner',options).actionType,'REMOVE_FOOD');assert.equal(conversation.parseActionRequest('My weight today is 105.9 kg',options).actionType,'RECORD_WEIGHT');
});

test('supported removal language resolves date, meal, mode and exact food text',()=>{
  const cases=[['Remove one Big Mac from dinner.','quantity',1],['Take one Big Mac out of dinner.','quantity',1],['Remove all Big Macs from dinner.','all',null],["I didn't have that Big Mac at dinner — remove it.",'unspecified',null]];
  for(const [text,mode,quantity] of cases){const parsed=conversation.parseRemoveRequest(text,options);assert.equal(parsed.meal,'Dinner');assert.equal(parsed.localDate,TODAY);assert.equal(parsed.removeMode,mode);assert.equal(parsed.removeQuantity,quantity);assert.match(parsed.foodText,/big mac/i);}
});

test('unclear multiple removal quantities produce a targeted clarification',()=>{
  const pending=conversation.parseRemoveRequest('Remove the Big Mac from dinner',options),match=conversation.matchRemoval([entry('one'),entry('two')],pending);assert.equal(match.status,'ambiguous-quantity');assert.match(match.message,/Remove one or all/);
});

test('remove one decrements quantity two to one and recalculates stored nutrition',()=>{
  const pending={...conversation.parseRemoveRequest('Remove one Big Mac from dinner',options),canonicalId:'food-source:mcdonalds-au:big-mac'},result=conversation.applyRemoval([entry('double',2)],pending);assert.equal(result.status,'applied');assert.equal(result.records[0].amount,1);assert.equal(result.records[0].nutrients.calories,621);assert.equal(result.removedQuantity,1);
});

test('remove all removes every exact canonical match only',()=>{
  const pending={...conversation.parseRemoveRequest('Remove all Big Macs from dinner',options),canonicalId:'food-source:mcdonalds-au:big-mac'},other=entry('other',1,{foodId:'mcchicken',canonicalId:'food-source:mcdonalds-au:mcchicken',name:'McChicken'}),result=conversation.applyRemoval([entry('one'),entry('two'),other],pending);assert.equal(result.records.length,1);assert.equal(result.records[0].name,'McChicken');assert.equal(result.removedQuantity,2);
});

test('removal save adapter requires a resolved action and blocks double confirmation',()=>{
  let saves=0;const adapter=conversation.createSaveAdapter({save:pending=>{saves++;return conversation.applyRemoval([entry('one')],pending);}}),pending={...conversation.parseRemoveRequest('Remove one Big Mac from dinner',options),canonicalId:'food-source:mcdonalds-au:big-mac',actionId:'remove-1'};assert.equal(adapter.confirm(pending).saved,true);assert.equal(adapter.confirm(pending).duplicate,true);assert.equal(saves,1);
});

test('weight voice parses decimal today and yesterday using local dates',()=>{
  const today=conversation.parseActionRequest('Shelly, my weight today is 105.9 kilos.',options),yesterday=conversation.parseActionRequest('I weighed 105.7 yesterday.',options);assert.equal(today.weightKg,105.9);assert.equal(today.localDate,TODAY);assert.equal(yesterday.weightKg,105.7);assert.equal(yesterday.localDate,'2026-08-27');
});

test('future voice weight is blocked before confirmation',()=>{
  const pending=conversation.parseActionRequest('Record my weight as 105.9 kg tomorrow.',options);assert.ok(pending.unresolved.some(item=>item.field==='date'&&/Future-dated/.test(item.message)));
});

test('weight correction changes the pending decimal without losing original transcript',()=>{
  const pending={...conversation.parseActionRequest('My weight today is 105.9 kg',options),actionId:'weight-1'},changed=conversation.applyCorrection(pending,'Make that 105.7',options);assert.equal(changed.pending.weightKg,105.7);assert.equal(pending.transcript,'My weight today is 105.9 kg');assert.match(changed.pending.transcript,/Correction: Make that 105\.7/);
});

test('voice session auto-listens only after an explicit initial gesture',()=>{
  let listens=0;const session=conversation.createVoiceSession({onListen:()=>{listens++;return true;},setTimer:()=>1,clearTimer:()=>{}});assert.equal(session.afterPrompt().active,false);session.begin({userGesture:true});const state=session.afterPrompt();assert.equal(state.active,true);assert.equal(state.listening,true);assert.equal(listens,1);
});

test('voice session uses Tap to Answer fallback when restart is blocked',()=>{
  let fallback='';const session=conversation.createVoiceSession({onListen:()=>false,onFallback:reason=>fallback=reason});session.begin({userGesture:true});const state=session.afterPrompt();assert.equal(state.listening,false);assert.equal(fallback,'restart-blocked');assert.match(html,/Tap to Answer/);
});

test('a missing speech-finished event cannot trap the confirmation session',()=>{
  assert.match(runtime,/function alpha0633SpeechWatchdogDelay/);assert.match(runtime,/if\(synthesis\?\.speaking&&elapsed<120000\)/);assert.match(runtime,/alpha0633PromptTimer=setTimeout\(watch,alpha0633SpeechWatchdogDelay\(text\)\)/);assert.doesNotMatch(runtime,/done\(\);\},6000\)/);assert.match(runtime,/function alpha0633AutoListenForResponse/);
});

test('voice session timeout and cancellation stop the short session',()=>{
  let timer,stopped='';const session=conversation.createVoiceSession({timeoutMs:7000,onListen:()=>true,onFallback:reason=>stopped=reason,onStop:reason=>stopped=reason,setTimer:callback=>{timer=callback;return 1;},clearTimer:()=>{}});session.begin({userGesture:true});session.afterPrompt();timer();assert.equal(stopped,'timeout');assert.equal(session.snapshot().active,false);session.begin({userGesture:true});session.cancel();assert.equal(stopped,'cancel');assert.equal(session.snapshot().active,false);
});

test('runtime has no always-on microphone and ends the session on room exit',()=>{
  assert.match(runtime,/alpha0633ResponseTimer=setTimeout[\s\S]*?7000/);assert.match(runtime,/alpha0633GestureSession=false;alpha0633StopVoice\(\);alpha0633CancelSpeech\(\)/);assert.doesNotMatch(runtime,/continuous=true/);assert.doesNotMatch(runtime,/permission.*(?:bypass|permanent)/i);
});

test('weight voice reuses existing validated save and same-date upsert path',()=>{
  assert.match(app,/window\.HECWeightCheckIn=/);assert.match(app,/saveVoice\(\{date,weightKg\}\)/);assert.match(app,/saveCheckinSnapshot\(snapshot,\{sameDateConfirmed:true,navigateAfter:true\}\)/);assert.match(app,/WEIGHT_PROGRESS\?\.upsertWeightRecord/);assert.match(runtime,/window\.HECWeightCheckIn\?\.saveVoice/);
});

test('weight voice preserves profile-date, future, discrepancy and recalculation checks',()=>{
  assert.match(app,/dateStatus==="future"/);assert.match(app,/dateStatus==="before-profile"/);assert.match(app,/nearbyDifference>2\.0&&!outlierConfirmed/);assert.match(app,/meaningfulCurrentWeightChange/);assert.match(app,/recalculateFromStored\(\)/);assert.match(runtime,/status==='confirmation-required'\)\{alpha0633VoiceSaveLocked=false;if\(confirm\)confirm\.disabled=false/);
});

test('same-date voice confirmation says update and never creates a duplicate record',()=>{
  assert.match(runtime,/Update \$\{when\}’s weight from/);assert.match(app,/if\(sameDateConfirmed\)return persist\(\)/);assert.match(app,/upsertWeightRecord/);
});

test('weight screen and Quick Voice share the one conversation entry point',()=>{
  assert.match(html,/id="weight-log-by-voice"/);assert.match(runtime,/weight-log-by-voice[\s\S]*?openFeature\('quick-log'\)[\s\S]*?alpha0633StartListening\('request'\)/);
});
