"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const stage4=require("../stage4-foundation.js");

const ROOT=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const html=read("index.html"),app=read("app.js"),styles=read("styles.css"),timeZoneRuntime=read("alpha064.js"),worker=read("service-worker.js");

test("fresh onboarding hides Surname while profile editing retains the existing field and value",()=>{
  assert.match(html,/<label id="surname-field" class="hidden">Surname/);
  assert.match(app,/classList\.toggle\("hidden",editMode!=="personal"\)/);
  assert.match(app,/const surname = \$\("surname"\)\?\.value\.trim\(\) \|\| data\.personal\.surname \|\| "";/);
  assert.match(app,/surname,\s*\n\s*fullName: \[givenName,surname\]/);
  assert.doesNotMatch(html,/Surname \*/);
});

test("DOB bounds preserve the existing 18 to 100 adult eligibility rule",()=>{
  assert.equal(stage4.MINIMUM_AGE,18);
  assert.equal(stage4.MAXIMUM_AGE,100);
  assert.deepEqual(stage4.dobBounds("2026-08-24"),{min:"1925-08-25",max:"2008-08-24",pickerStart:"2008-08-24"});
  assert.equal(stage4.ageFromDob("2008-08-24","2026-08-24"),18);
  assert.equal(stage4.ageFromDob("1925-08-25","2026-08-24"),100);
});

test("DOB remains unanswered until deliberately selected",()=>{
  const dobTag=html.match(/<input id="dob"[^>]*>/)?.[0]||"";
  assert.ok(dobTag);
  assert.doesNotMatch(dobTag,/\svalue=/);
  assert.match(app,/\$\("dob"\)\.value = data\.personal\.dob \|\| "";/);
  assert.match(app,/dataset\.pickerStart=dobLimits\.pickerStart/);
});

test("DOB calculations use calendar dates and do not shift birthdays through UTC parsing",()=>{
  assert.equal(stage4.ageFromDob("2000-08-25","2026-08-24"),25);
  assert.equal(stage4.ageFromDob("2000-08-24","2026-08-24"),26);
  assert.equal(stage4.localDateISO(new Date("2026-08-24T14:30:00.000Z"),"Australia/Brisbane"),"2026-08-25");
  assert.equal(stage4.localDateISO(new Date("2026-08-24T14:30:00.000Z"),"America/Los_Angeles"),"2026-08-24");
});

test("all recommendation-critical fields are validated in one pass",()=>{
  const errors=stage4.validateRecommendationFields({dob:"",today:"2026-08-24",sex:"",heightCm:0,weightKg:0,goal:"",activity:0});
  assert.deepEqual(Object.keys(errors),["dob","sex","height","weight","goal","activity"]);
  Object.values(errors).forEach(message=>assert.ok(message));
});

test("valid DOB, height, weight, sex, goal and activity clear their inline errors",()=>{
  const errors=stage4.validateRecommendationFields({dob:"1980-02-29",today:"2026-08-24",sex:"female",heightCm:165.2,weightKg:70.4,goal:"maintain",activity:1.375});
  assert.deepEqual(errors,{dob:"",sex:"",height:"",weight:"",goal:"",activity:""});
  assert.match(app,/refreshVisibleHealthError\("dob"\)/);
  assert.match(app,/setAttribute\("aria-invalid",message\?"true":"false"\)/);
});

test("each critical field has an adjacent live error and an accessible association",()=>{
  const associations={dob:["dob","dob-error"],height:["height-cm","height-error"],weight:["weight-kg","weight-error"],activity:["activity","activity-error"]};
  for(const [control,error] of Object.values(associations)){
    assert.match(html,new RegExp(`id="${control}"[^>]*aria-describedby="[^"]*${error}`));
    assert.match(html,new RegExp(`id="${error}" class="field-error" aria-live="polite"`));
  }
  assert.match(html,/id="calculation-sex"[^>]*aria-describedby="[^"]*calculation-sex-error/);
  assert.match(html,/name="goal"[^>]*aria-describedby="goal-error"/);
});

test("Calculate focuses and scrolls to the first invalid field after showing every error",()=>{
  assert.match(app,/HEALTH_VALIDATION_ORDER=\["dob","sex","height","weight","goal","activity"\]/);
  assert.match(app,/HEALTH_VALIDATION_ORDER\.forEach\(field=>renderHealthFieldError\(field,errors\[field\]\)\)/);
  assert.match(app,/control\.focus\(\{preventScroll:true\}\);\s*control\.scrollIntoView\(\{behavior:"smooth",block:"center"\}\)/);
});

test("Stage 4 wording is precise without replacing unrelated recommendations",()=>{
  assert.match(html,/HEC Suggested Starting Goal/);
  assert.match(app,/\["HEC Suggested Starting Goal"/);
  assert.doesNotMatch(html,/>Recommended Goal</);
  assert.match(html,/<legend>Exercise Energy<\/legend>/);
  assert.match(html,/You will choose the day and amount later; nothing is scheduled during setup\./);
  assert.match(html,/HEC will not lock you into the same days each week\./);
  assert.match(html,/Preferred Rate Of Weight Loss[\s\S]*?<strong>Recommended<\/strong>/);
});

test("theme selection is saved through onboarding and reapplied on load and navigation",()=>{
  assert.match(app,/data\.preferences\.theme = document\.body\.dataset\.theme \|\| data\.preferences\.theme;\s*\n\s*}/);
  assert.match(app,/function applyTheme\(theme = data\.preferences\.theme\)/);
  assert.match(app,/populateForms\(\)\{\s*\n\s*applyTheme\(\)/);
  assert.match(app,/function show[\s\S]*?applyTheme\(\);[\s\S]*?applyLanguage\(\)/);
});

test("legacy automatic-follow preference becomes ask/confirm and never changes silently",()=>{
  const result=stage4.evaluateTimeZoneChange({completed:true,deviceTimeZone:"Pacific/Auckland",activeTimeZone:"Australia/Brisbane",homeTimeZone:"Australia/Brisbane",behaviour:"device"});
  assert.equal(result.behaviour,"ask");
  assert.equal(result.prompt,true);
  assert.equal(result.activeTimeZone,"Australia/Brisbane");
  assert.doesNotMatch(timeZoneRuntime,/timeZoneBehaviour==="device"\)p\.activeTimeZone=device/);
});

test("explicit device-zone approval changes only the active HEC zone",()=>{
  const result=stage4.evaluateTimeZoneChange({completed:true,deviceTimeZone:"Pacific/Auckland",activeTimeZone:"Australia/Brisbane",homeTimeZone:"Australia/Brisbane",behaviour:"ask",approved:true});
  assert.equal(result.activeTimeZone,"Pacific/Auckland");
  assert.equal(result.changed,true);
  assert.equal(result.lastDecision.choice,"use-device");
});

test("declining a device-zone change keeps the active zone and prevents a repeated prompt",()=>{
  const first=stage4.evaluateTimeZoneChange({completed:true,deviceTimeZone:"Pacific/Auckland",activeTimeZone:"Australia/Brisbane",homeTimeZone:"Australia/Brisbane",behaviour:"ask",approved:false});
  assert.equal(first.activeTimeZone,"Australia/Brisbane");
  assert.equal(first.lastDecision.choice,"keep");
  const second=stage4.evaluateTimeZoneChange({completed:true,deviceTimeZone:"Pacific/Auckland",activeTimeZone:"Australia/Brisbane",homeTimeZone:"Australia/Brisbane",behaviour:"ask",lastDecision:first.lastDecision});
  assert.equal(second.prompt,false);
  assert.equal(second.activeTimeZone,"Australia/Brisbane");
});

test("keep-current-zone preference does not alter the active zone",()=>{
  const result=stage4.evaluateTimeZoneChange({completed:true,deviceTimeZone:"Europe/London",activeTimeZone:"Australia/Perth",homeTimeZone:"Australia/Brisbane",behaviour:"home"});
  assert.equal(result.prompt,false);
  assert.equal(result.activeTimeZone,"Australia/Perth");
  assert.equal(result.changed,false);
});

test("time-zone handling cannot rewrite historical Diary, meal or weight dates",()=>{
  const handler=timeZoneRuntime.match(/function handleTimeZone\(\)\{[\s\S]*?\n}\nhandleTimeZone\(\);/)?.[0]||"";
  assert.ok(handler);
  assert.doesNotMatch(handler,/main\.(health|weightHistory|diary)|p\.(weightHistory|diary|meals)/);
  assert.match(handler,/p\.activeTimeZone=decision\.activeTimeZone/);
});

test("time-zone UI explains explicit approval and Personal Details preserves active separately from home",()=>{
  assert.match(html,/Ask Before Using My Device's New Time Zone/);
  assert.match(html,/HEC never changes its active time zone unless you approve the change\./);
  assert.match(app,/activeTimeZone: data\.personal\.activeTimeZone \|\| chosenHomeTimeZone/);
  assert.doesNotMatch(app,/activeTimeZone: \$\("home-timezone"\)/);
});

test("responsive rules cover phone, iPad portrait, iPad landscape and keyboard-height layouts",()=>{
  assert.match(styles,/@media\(max-width:600px\)/);
  assert.match(styles,/@media\(min-width:700px\) and \(max-width:1200px\)/);
  assert.match(styles,/@media\(min-width:700px\) and \(orientation:landscape\) and \(max-height:900px\)/);
  assert.match(styles,/@media\(min-width:700px\) and \(max-height:650px\)/);
  assert.match(styles,/env\(safe-area-inset-bottom\)/);
  assert.match(styles,/\.a05-modal-card,\.companion-choice-sheet\{max-height:calc\(100dvh/);
  assert.match(styles,/\.weight-line-chart svg,\.history-bars \.weight-line-chart svg\{min-height:0!important;max-height:360px}/);
});

test("Stage 3 artwork and voice assets remain loaded before Stage 4 and app startup",()=>{
  const ordered=["companion-artwork.js","companion-voice-metadata.js","companion-voices.js","stage4-foundation.js","app.js"];
  ordered.reduce((position,item)=>{const next=html.indexOf(item);assert.ok(next>position,item);return next;},-1);
  assert.match(worker,/`\.\/stage4-foundation\.js\?v=\$\{VERSION\}`/);
  assert.match(html,/id="companion-voice-styles"/);
  assert.match(html,/id="companion-preview-modal"/);
  assert.match(app,/companionPreviewMarkup\(companion,"companion-preview-modal-title"\)/);
});
