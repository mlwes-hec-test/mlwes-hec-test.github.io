"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const activity=require("../activity-foundation.js");
const migrations=require("../migrations.js");
const fixtures=require("./fixtures/alpha-0.6.32-migration-fixtures.js");

const ROOT=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const html=read("index.html"),app=read("app.js"),runtime=read("alpha06.js"),styles=read("styles.css"),worker=read("service-worker.js");
const NOW="2026-08-24T06:00:00.000Z",DATE="2026-08-24";
const policy=(percent,date="2026-01-01",id=`policy-${percent}`)=>({id,effectiveDate:date,percent});
const make=(type,overrides={},context={})=>activity.buildRecord({activityType:type,localDate:DATE,minutes:30,intensity:"Moderate",energyMode:type==="manual-other"?"manual":"hec-estimate",caloriesBurned:240,name:type==="manual-other"?"Kayaking":"",notes:"",...overrides},{policy:policy(50),id:`activity-${type}`,now:NOW,timeZone:"Australia/Brisbane",weightKg:80,...context});
const circlePositions=()=>Array.from({length:8},(_,index)=>{const n=index+1,match=styles.match(new RegExp(`\\.eight-room-circle \\.r${n}\\{left:([\\d.]+)%!important;top:([\\d.]+)%!important\\}`));assert.ok(match,`r${n} position`);return {x:Number(match[1]),y:Number(match[2])};});
function assertOrbit(viewport,circleWidth,roomWidthPercent,roomHeightPercent){
  assert.ok(circleWidth(viewport)>0);const points=circlePositions();
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const dx=Math.abs(points[i].x-points[j].x),dy=Math.abs(points[i].y-points[j].y);assert.ok(dx>roomWidthPercent||dy>roomHeightPercent,`${viewport.w}x${viewport.h}: rooms ${i+1}/${j+1}`);}
  points.forEach(({x,y},index)=>{assert.ok(x-roomWidthPercent/2>=-1&&x+roomWidthPercent/2<=101,`r${index+1} horizontal`);assert.ok(y-roomHeightPercent/2>=-1&&y+roomHeightPercent/2<=101,`r${index+1} vertical`);});
}

test("1. Home contains exactly the eight approved room controls",()=>{assert.equal((html.match(/class="room r\d+(?: [^"]*)?"/g)||[]).length,8);assert.equal((html.match(/data-room=/g)||[]).length,8);assert.doesNotMatch(html,/data-room="quick-weight"/);});
test("2. Exercise & Activity opens the existing activity screen from Home",()=>{assert.match(html,/data-room="exercise-activity"[\s\S]*?<b>Exercise &amp; Activity/);assert.match(app,/room === "exercise-activity"[\s\S]*?openAlpha05Feature\("exercise-log"/);assert.equal((html.match(/id="exercise-log"/g)||[]).length,1);});
test("3. the eight approved activity presets are exact",()=>{assert.deepEqual(activity.PRESETS.map(x=>x.label),["Walking","Cycling","Swimming","Gym Work","Gardening","Mowing","Hiking","Manual / Other Activity"]);assert.equal((html.match(/data-activity-preset=/g)||[]).length,8);});
test("4. Walking saves with a conservative HEC estimate",()=>{const r=make("walking");assert.equal(r.name,"Walking");assert.ok(r.caloriesBurned>0);assert.equal(r.energySource,"hec-estimate");});
test("5. Cycling supports optional distance",()=>{const r=make("cycling",{distanceKm:12.34});assert.equal(r.distanceKm,12.34);assert.equal(activity.presetById("cycling").distance,true);});
test("6. Swimming saves without requiring distance",()=>{const r=make("swimming",{distanceKm:1});assert.equal(r.name,"Swimming");assert.equal(r.distanceKm,null);});
test("7. Gym Work does not require or retain distance",()=>{const r=make("gym-work",{distanceKm:5});assert.equal(r.distanceKm,null);assert.equal(r.intensity,"Moderate");});
test("8. Gardening has estimation metadata",()=>{const r=make("gardening");assert.equal(r.activityType,"gardening");assert.ok(r.estimateProvenance.met>0);});
test("9. Mowing has estimation metadata and no distance demand",()=>{const r=make("mowing",{distanceKm:4});assert.equal(r.distanceKm,null);assert.equal(r.estimateProvenance.kind,"hec-estimate");});
test("10. Hiking supports distance",()=>{const r=make("hiking",{distanceKm:8.5});assert.equal(r.distanceKm,8.5);});
test("11. Manual activity retains its name and manual raw energy",()=>{const r=make("manual-other",{name:"Kayaking",caloriesBurned:321});assert.equal(r.name,"Kayaking");assert.equal(r.caloriesBurned,321);assert.equal(r.energySource,"manual");});
test("12. stable IDs and created timestamps survive edits",()=>{const original=make("walking"),edited=make("walking",{minutes:45},{existing:original,id:"ignored",now:"2026-08-24T07:00:00.000Z"});assert.equal(edited.id,original.id);assert.equal(edited.createdAt,original.createdAt);assert.notEqual(edited.updatedAt,original.updatedAt);});
test("13. local dates are preserved independently from timestamps",()=>{const r=make("walking",{localDate:"2026-08-23"});assert.equal(r.localDate,"2026-08-23");assert.equal(r.date,NOW);});
test("14. optional notes are retained and can be empty",()=>{assert.equal(make("walking",{notes:"Morning river path"}).notes,"Morning river path");assert.equal(make("walking").notes,"");});
test("15. estimated and manual provenance remain explicit",()=>{const estimated=make("walking"),manual=make("manual-other",{caloriesBurned:200});assert.equal(estimated.estimateProvenance.kind,"hec-estimate");assert.match(estimated.energyProvenance,/HEC estimate/);assert.deepEqual(manual.estimateProvenance,{kind:"manual",method:"Energy entered manually by the user"});});
test("16. 0 percent adds no food allowance energy",()=>{const r=make("manual-other",{caloriesBurned:400},{policy:policy(0)});assert.equal(activity.allowanceCredit(r,[policy(0)]),0);});
test("17. 50 percent adds half the raw energy",()=>{const r=make("manual-other",{caloriesBurned:400});assert.equal(activity.allowanceCredit(r,[policy(50)]),200);});
test("18. 100 percent adds all raw energy",()=>{const r=make("manual-other",{caloriesBurned:400},{policy:policy(100)});assert.equal(activity.allowanceCredit(r,[policy(100)]),400);});
test("19. raw energy is unchanged by allowance policy",()=>{for(const percent of [0,50,100]){const r=make("manual-other",{caloriesBurned:400},{policy:policy(percent)});assert.equal(activity.rawEnergy(r),400);}});
test("20. baseline activity alone adds zero extra exercise energy",()=>{assert.deepEqual(activity.totalsForDate([],DATE,[policy(100)]),{raw:0,credit:0});assert.match(html,/Your everyday movement is already included/);});
test("21. a prospective policy change does not rewrite a prior completed day",()=>{const history=[policy(50,"2026-01-01","old"),policy(100,DATE,"new")],yesterday=make("manual-other",{localDate:"2026-08-23",caloriesBurned:400},{policy:history[0]}),today=make("manual-other",{caloriesBurned:400},{policy:history[1]});assert.equal(activity.allowanceCredit(yesterday,history),200);assert.equal(activity.allowanceCredit(today,history),400);});
test("22. edit upserts exactly one existing record",()=>{const original=make("walking"),edited=make("walking",{minutes:60},{existing:original,now:"2026-08-24T07:00:00.000Z"}),records=activity.upsertRecord([original],edited);assert.equal(records.length,1);assert.equal(records[0].minutes,60);});
test("23. editing a date moves totals from old day to new day once",()=>{const old=make("manual-other",{localDate:"2026-08-23",caloriesBurned:400}),moved=make("manual-other",{localDate:DATE,caloriesBurned:400},{existing:old,policy:policy(50)}),records=activity.upsertRecord([old],moved);assert.equal(activity.totalsForDate(records,"2026-08-23",[policy(50)]).credit,0);assert.equal(activity.totalsForDate(records,DATE,[policy(50)]).credit,200);});
test("24. delete removes exactly one stable-ID record",()=>{const a=make("walking"),b=make("cycling",{}, {id:"activity-cycling"}),result=activity.deleteRecord([a,b],a.id);assert.equal(result.records.length,1);assert.equal(result.removed.id,a.id);});
test("25. delete adjusts the correct daily allowance exactly once",()=>{const a=make("manual-other",{caloriesBurned:400}),before=activity.totalsForDate([a],DATE,[policy(50)]),after=activity.totalsForDate(activity.deleteRecord([a],a.id).records,DATE,[policy(50)]);assert.equal(before.credit-after.credit,200);});
test("26. repeated Save identity cannot create duplicate activities",()=>{const r=make("walking"),records=activity.upsertRecord(activity.upsertRecord([],r),r);assert.equal(records.length,1);assert.match(runtime,/if\(activitySavePending\)return/);assert.match(runtime,/button\.disabled=true/);});
test("27. migrated Alpha 0.6.32 activity retains raw and credited totals",()=>{let count=0;const fixture=fixtures.establishedUser(),result=migrations.migrateRecords(fixture.main,fixture.ext,{now:NOW,idFactory:prefix=>`${prefix}-${++count}`}),record=result.ext.exercise[0];assert.equal(activity.rawEnergy(record),300);assert.equal(activity.allowanceCredit(record,[]),150);assert.equal(record.creditPercentAtLog,50);});
test("28. Recent Activity identifies date, duration, raw energy and allowance credit",()=>{assert.match(html,/<h3>Recent Activity<\/h3>/);assert.match(runtime,/Cal raw exercise energy · \$\{formatNumber\(credit\)\} Cal added to food allowance/);assert.match(runtime,/data-activity-edit/);});
test("29. eight-room orbit geometry works on 375x667 and 430x932 iPhones",()=>{assertOrbit({w:375,h:667},v=>Math.min(v.w-12,520),21,15);assertOrbit({w:430,h:932},v=>Math.min(v.w-12,520),21,15);});
test("30. eight-room orbit geometry works on 768x1024 and 820x1180 iPad portrait",()=>{assertOrbit({w:768,h:1024},v=>Math.min(v.w-24,760),18,16);assertOrbit({w:820,h:1180},v=>Math.min(v.w-24,760),18,16);});
test("31. eight-room orbit geometry works on 1024x768 and 1180x820 iPad landscape",()=>{assertOrbit({w:1024,h:768},v=>Math.min(v.w-24,760),18,16);assertOrbit({w:1180,h:820},v=>Math.min(v.w-24,760),18,16);});
test("32. Stage 3A artwork remains intact",()=>{assert.equal((worker.match(/assets\/companions\/runtime\/picker\//g)||[]).length,16);assert.doesNotMatch(worker,/companions\/source|companion-[a-z-]+\.svg/);});
test("33. Stage 3B voice system remains intact",()=>{const voices=require("../companion-voices.js");assert.equal(voices.CONFIGURATIONS.length,16);voices.CONFIGURATIONS.forEach(config=>assert.equal(config.styles.length,3));});
test("34. Stage 4 onboarding and time-zone foundation remains loaded first",()=>{const stage4=require("../stage4-foundation.js"),timeZoneRuntime=read("alpha064.js");assert.equal(stage4.MINIMUM_AGE,18);assert.ok(html.indexOf("stage4-foundation.js")<html.indexOf("app.js"));assert.match(timeZoneRuntime,/handleTimeZone/);});
test("35. Stage 5 foundation is loaded and precached at the release version without migration changes",()=>{const activityScreen=html.match(/<section id="exercise-log"[\s\S]*?<section id="progress-weight-hub"/)?.[0]||"";assert.ok(html.indexOf("activity-foundation.js")<html.indexOf("alpha06.js"));assert.match(worker,/activity-foundation\.js/);assert.match(html,/Alpha 0\.6\.33/);assert.equal(read("config.js").includes('const version = "0.6.33"'),true);assert.doesNotMatch(activityScreen,/streak|badge|leaderboard|you failed|punishment/i);});
