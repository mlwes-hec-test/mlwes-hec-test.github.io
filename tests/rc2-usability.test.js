"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const trends=require("../nutrition-trends-foundation.js");
const weight=require("../weight-progress-foundation.js");

const ROOT=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const html=read("index.html"),runtime=read("alpha06.js"),app=read("app.js"),styles=read("styles.css"),worker=read("service-worker.js"),alpha064=read("alpha064.js");
const section=id=>{const start=html.indexOf(`<section id="${id}"`);if(start<0)return "";const end=html.indexOf("\n  <section id=",start+12);return html.slice(start,end<0?html.length:end);};
const nutrientEntry=(values,status="eaten")=>({status,nutrients:values});

test("Home contains only the approved eight rooms and no permanent content panel",()=>{
  const home=section("home"),rooms=[...home.matchAll(/data-room="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(rooms,["daily-progress","quick-voice","diary","database","settings","shopping-list","progress-weight","exercise-activity"]);
  assert.doesNotMatch(home,/inspiration-card|Did You Know|quick-weight|r9/);
  assert.match(home,/class="circle eight-room-circle"/);
});

test("personality content data remains available while its Home panel is absent",()=>{
  assert.match(alpha064,/const CONTENT=/);assert.doesNotMatch(section("home"),/id="inspiration-card"/);
});

test("Daily Progress sections follow the approved information hierarchy",()=>{
  const daily=section("daily-progress"),labels=["daily-progress-explanation","Meals","Fluids","Activity / Exercise / Steps","Detailed Nutrition Progress","Nutrients To Watch","Five Food Groups"];
  let prior=-1;for(const label of labels){const index=daily.indexOf(label);assert.ok(index>prior,label);prior=index;}
  assert.equal((daily.match(/id="daily-fluids-card"/g)||[]).length,1);assert.equal((daily.match(/id="daily-activity-card"/g)||[]).length,1);
  assert.doesNotMatch(daily,/compact-update-strip|daily-balance-score|daily-balance-fill/);
  assert.match(runtime,/data-progress-edit/);assert.match(runtime,/data-entry-delete/);assert.match(runtime,/data-progress-open-meal/);
  assert.match(daily,/Add Water/);assert.match(daily,/Add Drink/);assert.match(daily,/Add Activity/);assert.match(daily,/Steps Recorded In HEC/);
});

test("Daily detailed nutrition does not duplicate Fluids or Steps",()=>{
  const render=runtime.match(/function renderDailyProgress\(\)[\s\S]*?function updateQuickDrinkButtonState/)?.[0]||"";
  assert.doesNotMatch(render,/progressCard\("Fluids"|progressCard\("Steps"/);
  assert.match(render,/daily-fluid-card-summary/);assert.match(render,/daily-activity-card-summary/);assert.match(render,/No steps recorded in HEC/);
});

test("Nutrients To Watch uses neutral recorded indicators and no arbitrary score",()=>{
  const assessment=runtime.match(/function dailyBalanceAssessment[\s\S]*?function renderDailyProgress/)?.[0]||"";
  assert.match(assessment,/Needs More Recorded Food/);assert.match(assessment,/Building Balance/);assert.match(assessment,/On Track/);
  assert.doesNotMatch(assessment,/score\/10|foodGroupScore|nutrientScore|energyFit/);
});

test("weight is consolidated into a weight-only screen",()=>{
  const screen=section("progress-history");assert.match(screen,/Weight Check-In &amp; Progress/);assert.match(screen,/weight-journey-summary|weight-room-history/);
  assert.doesNotMatch(screen,/progress-nutrition-panel|activity-history-summary|data-progress-view/);
});

test("earliest valid weight stays the start even when a later marker exists",()=>{
  const records=[{id:"early",date:"2026-01-01",weightKg:90},{id:"marked",date:"2026-02-01",weightKg:88,isStartingWeight:true},{id:"now",date:"2026-08-24",weightKg:82}];
  assert.equal(weight.startingRecord(records,{today:"2026-08-24",profileStart:"2026-01-01",startingWeightDate:"2026-02-01"}).id,"early");
  assert.equal(weight.journeySummary(records,{today:"2026-08-24",profileStart:"2026-01-01",startingWeightDate:"2026-02-01"}).totalChange,-8);
});

test("weight selected point, range change and total change remain independent",()=>{
  assert.match(runtime,/weightChangeText\(model\.rangeChange\)/);assert.match(runtime,/weightChangeText\(journey\.totalChange\)/);assert.match(runtime,/window\.HECSelectWeightPoint/);
  assert.match(app,/HECSelectWeightPoint\?\.\(savedRecord\?\.id\|\|savedRecord\?\.date\)/);
});

test("Nutrition Trends supports all four metrics and seven ranges",()=>{
  assert.deepEqual(Object.keys(trends.METRICS),["energy","protein","fibre","sodium"]);assert.deepEqual(trends.RANGES.map(item=>item.id),["7","14","30","90","180","365","all"]);
  assert.match(section("nutrition-trends"),/Energy[\s\S]*Protein[\s\S]*Fibre[\s\S]*Sodium/);assert.match(alpha064,/"nutrition-trends"/);
});

test("Nutrition Trends counts recorded complete days only and never invents zero",()=>{
  const diary={
    "2026-08-20":[nutrientEntry({calories:500,protein:20,fibre:8,sodium:600})],
    "2026-08-21":[],
    "2026-08-22":[nutrientEntry({calories:0,protein:0,fibre:null,sodium:0})],
    "2026-08-23":[nutrientEntry({calories:300,protein:10,fibre:4,sodium:400}),nutrientEntry({calories:100,protein:5,fibre:2,sodium:100},"skipped")]
  };
  assert.deepEqual(trends.recordedDayValues(diary,"energy").map(item=>[item.date,item.value]),[["2026-08-20",500],["2026-08-22",0],["2026-08-23",300]]);
  assert.deepEqual(trends.recordedDayValues(diary,"fibre").map(item=>item.date),["2026-08-20","2026-08-23"]);
});

test("Nutrition Trends renders useful zero, one, two and dense-point states with target context",()=>{
  const makeDiary=count=>Object.fromEntries(Array.from({length:count},(_,index)=>[`2026-08-${String(index+1).padStart(2,"0")}`,[nutrientEntry({calories:100+index,protein:10,fibre:5,sodium:300})]]));
  assert.equal(trends.trendModel({},{}).state,"empty");assert.equal(trends.trendModel(makeDiary(1),{today:"2026-08-31",period:"all"}).state,"single");assert.equal(trends.trendModel(makeDiary(2),{today:"2026-08-31",period:"all"}).state,"series");
  const dense=trends.trendModel(makeDiary(20),{today:"2026-08-31",period:"all",target:2000,maxLabels:4});assert.equal(dense.target,2000);assert.ok(dense.points.filter(point=>point.labelled).length<=4);
  assert.match(runtime,/currentGoals\(today\)/);assert.match(runtime,/goals\[definition\.targetKey\]/);
});

test("Quick Voice is companion-first, explicit-start and has no method chooser",()=>{
  const voice=section("quick-log");assert.match(voice,/Quick Voice Log/);assert.match(voice,/quick-voice-companion/);assert.match(voice,/Tap To Speak/);assert.match(voice,/Review Request/);
  assert.doesNotMatch(voice,/data-quick-log-method|Keyboard Entry|Barcode Scanning|Nutrition Panel/);assert.doesNotMatch(runtime,/setTimeout\(\(\)=>startVoice\(\),80\)/);
});

test("Quick Voice keeps date and meal editable and offers a safe fallback",()=>{
  const voice=section("quick-log");assert.match(voice,/id="voice-date"/);assert.match(voice,/id="voice-meal"/);assert.match(voice,/id="quick-voice-fallback"/);assert.match(voice,/Open Diary Add Food/);
  assert.match(voice,/quick-voice-manual-fallback/);assert.match(voice,/voice-transcript/);assert.match(voice,/View Details \/ Edit/);assert.match(runtime,/not-allowed/);assert.match(runtime,/quick-voice-open-diary/);
  assert.match(runtime,/by\('voice-date'\)\?\.addEventListener\('change',[^\n]*alpha0633StopVoice/);assert.match(runtime,/by\('voice-meal'\)\?\.addEventListener\('change',[^\n]*alpha0633StopVoice/);
  assert.match(runtime,/prompt='What would you like to do\?'/);assert.doesNotMatch(runtime,/setTimeout\(\(\)=>alpha0633StartListening/);
});

test("Quick Voice review is structured, uses central foods and saves exactly once",()=>{
  const voice=section("quick-log");
  assert.match(runtime,/allFoods\(\)\.map\(food=>\(\{food,rank:Math\.max\(searchRank\(food,q\),C8\?\.rank/);assert.match(runtime,/structured-voice-review/);assert.match(runtime,/data-voice-item-amount/);assert.match(runtime,/data-voice-item-unit/);
  assert.match(runtime,/alpha0633VoiceSaveLocked/);assert.match(runtime,/if\(alpha0633VoiceSaveLocked\|\|!voiceParsed/);assert.match(runtime,/createSaveAdapter/);assert.match(runtime,/alpha0633CommitPending/);assert.match(runtime,/status=pending\.recurrence\|\|date>isoToday\(\)\|\|pending\.status==='planned'\?'planned':'eaten'/);
  assert.match(app,/window\.HECSpeakText=speakText/);assert.match(runtime,/alpha0633Speak\(acknowledgement\)/);assert.match(voice,/Nothing is saved until you confirm/);
  assert.match(runtime,/energyText\(values\.calories\).*nutrientText\(values\.protein,'g',true\).*nutrientText\(values\.fibre,'g',true\).*nutrientText\(values\.sodium,'mg'\)/);
});

test("Quick Voice recognises companion wake phrasing, spoken destinations and natural water",()=>{
  assert.match(runtime,/alpha0633StripWake/);assert.match(runtime,/CONVERSATION\?\.parseRequest/);assert.match(runtime,/selectedDate:by\('voice-date'\)/);assert.match(runtime,/selectedMeal:by\('voice-meal'\)/);assert.match(runtime,/spokenUnit==='glass'&&food\.id==='water'/);assert.match(runtime,/amount\*=250;unit='mL'/);assert.match(runtime,/splitCompoundQuery/);
});

test("responsive RC2 rules cover small phones, tablets and short-height devices",()=>{
  assert.match(styles,/@media\(max-width:390px\)[\s\S]*?eight-room-circle/);assert.match(styles,/@media\(min-width:700px\) and \(max-width:1200px\)/);assert.match(styles,/@media\(min-width:700px\) and \(orientation:landscape\) and \(max-height:900px\)/);assert.match(styles,/@media\(max-height:700px\) and \(max-width:700px\)/);
});

test("new trend foundation is loaded and offline-cached without changing release version",()=>{
  assert.ok(html.indexOf("nutrition-trends-foundation.js")<html.indexOf("app.js"));assert.match(worker,/nutrition-trends-foundation\.js/);assert.match(html,/0\.6\.33/);assert.match(worker,/const VERSION = "0\.6\.33"/);
});
