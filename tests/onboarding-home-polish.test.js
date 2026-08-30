"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const stage4=require("../stage4-foundation.js");
const voices=require("../companion-voices.js");

const ROOT=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const html=read("index.html"),app=read("app.js"),styles=read("styles.css"),installation=read("installation-foundation.js"),runtime=read("alpha06.js");
const section=id=>{const start=html.indexOf(`<section id="${id}"`);if(start<0)return "";const end=html.indexOf("\n  <section id=",start+12);return html.slice(start,end<0?html.length:end);};
const health=section("health"),companion=section("companion"),home=section("home");

test("1. Australian English is the automatic launch language",()=>{
  assert.match(app,/preferences: \{ language: "en-AU"/);assert.match(app,/data\.preferences\.language = "en-AU"|data\.preferences\.language="en-AU"/);assert.match(app,/document\.documentElement\.lang = "en-AU"/);
});
test("2. current onboarding exposes no NZ UK US or language-choice screen",()=>{
  assert.doesNotMatch(html,/id="language"|name="language"|English \(New Zealand\)|English \(United Kingdom\)|English \(United States\)/);assert.match(app,/show\("register"\)/);
});
test("3. Australian device time zones are used without one-zone hard-coding",()=>{
  for(const zone of ["Australia/Brisbane","Australia/Perth","Australia/Adelaide","Australia/Hobart","Australia/Lord_Howe"])assert.equal(stage4.initialAustralianTimeZone(zone),zone);
  assert.equal(stage4.initialAustralianTimeZone("Europe/London"),"Australia/Brisbane");assert.match(app,/initialAustralianTimeZone\(deviceTimeZone\(\)\)/);
});
test("4. seven visible onboarding steps are contiguous and derived",()=>{
  assert.deepEqual(stage4.ONBOARDING_STEPS,["register","verify","password","companion","personal","health","recommendations"]);
  assert.deepEqual(stage4.ONBOARDING_STEPS.map(stage4.onboardingProgress),stage4.ONBOARDING_STEPS.map((_,i)=>`Step ${i+1} of 7`));
  assert.equal((html.match(/data-onboarding-step=/g)||[]).length,7);assert.doesNotMatch(html,/Step \d+ of \d+/);
});
test("5. separate companion voice-style choices are absent from onboarding",()=>{
  assert.doesNotMatch(companion,/companion-voice-styles|voice-style-options|Calm &amp; Relaxed|Warm &amp; Thoughtful|Easy-going &amp; Friendly|Recommended/);
});
test("6. companion selection remains available",()=>{assert.match(companion,/Would You Like A Companion/);assert.match(companion,/id="character-grid"/);assert.equal((read("companions.js").match(/"id":/g)||[]).length,16);});
test("7. companion introduction preview remains available",()=>{assert.match(companion,/id="preview-voice"[^>]*>🔊 Hear this Companion’s introduction/);assert.match(app,/companion\?\.intro/);});
test("8. automatic companion speech remains an explicit preference",()=>{assert.match(companion,/id="speech-enabled"[^>]*checked/);assert.match(app,/data\.companion\.speechEnabled = \$\("speech-enabled"\)\?\.checked !== false/);});
test("9. stored voice-style values safely resolve through internal profiles",()=>{
  assert.equal(voices.voiceStyleFor("percy-pelican","old-device-style").id,voices.defaultVoiceStyleId("percy-pelican"));assert.match(app,/voiceStyleId=VOICE_SYSTEM\?\.defaultVoiceStyleId/);
});
test("10. normal activity now appears immediately before fasting",()=>{
  const activity=health.indexOf('id="activity-exercise-block"'),fasting=health.indexOf("Fasting Interest"),dietary=health.indexOf("Dietary And Medical Information");assert.ok(activity>0&&activity<fasting&&fasting<dietary);
});
test("11. Exercise Energy remains attached to the normal-activity block",()=>{
  const block=health.match(/<section id="activity-exercise-block"[\s\S]*?<\/section>/)?.[0]||"";assert.match(block,/How Active Is Your Normal Day/);assert.match(block,/<legend>Exercise Energy<\/legend>/);assert.match(block,/not counted twice/);
});
test("12. energy calculations still use activity and store exercise credit separately",()=>{
  assert.match(app,/tdeeCal = bmrCal \* activity/);assert.match(app,/activity: form\.activity,[\s\S]*?exerciseCredit: form\.exerciseCredit/);assert.doesNotMatch(app,/tdeeCal[^\n]*exerciseCredit/);
});
test("13. decorative theme selection is absent from onboarding",()=>{assert.doesNotMatch(companion,/Choose An App Theme|data-theme-choice|Garden[\s\S]*Coast[\s\S]*Outback[\s\S]*Classic/);});
test("14. legacy stored theme names remain readable but do not control rendering",()=>{
  for(const legacy of ["garden","coast","outback","classic"])assert.ok(app.includes(`${legacy}:`)||app.includes(`${legacy}:"`));
  assert.match(app,/function applyTheme\(\)/);assert.doesNotMatch(app,/data\.preferences\.theme\s*=\s*STANDARD_APPEARANCE/);
});
test("15. every user receives the HEC standard appearance",()=>{assert.match(app,/STANDARD_APPEARANCE=\{id:"hec-standard"/);assert.match(app,/document\.body\.dataset\.theme = STANDARD_APPEARANCE\.id/);assert.match(styles,/body\[data-theme="hec-standard"\]/);});
test("16. completing onboarding arms the welcome exactly once",()=>{assert.match(app,/data\.completed = true;[\s\S]*?data\.firstHomeWelcomePending = true;[\s\S]*?data\.firstHomeWelcomeShown = false;/);assert.match(app,/!data\.firstHomeWelcomePending\|\|data\.firstHomeWelcomeShown/);});
test("17. showing the welcome prevents an ordinary Home return from showing it again",()=>{assert.match(app,/data\.firstHomeWelcomePending=false;data\.firstHomeWelcomeShown=true;save\(\)/);});
test("18. a TEST reset makes welcome eligibility fresh with the profile store",()=>{assert.match(runtime,/keys\.forEach\(key=>localStorage\.removeItem\(key\)\)/);assert.match(read("installation-foundation.js"),/const base=\[app\.storageKey,app\.functionalStorageKey/);});
test("19. both the X and obvious action close the welcome immediately",()=>{assert.match(home,/id="first-home-welcome-close"[^>]*aria-label="Close welcome"/);assert.match(home,/id="first-home-welcome-done"/);assert.match(app,/first-home-welcome-close"\)\?\.addEventListener\("click",dismissFirstHomeWelcome\)/);});
test("20. text-only welcome starts its dismissal timer normally",()=>{
  const scheduled=[];const session=stage4.createWelcomeSession({schedule:(fn,delay)=>{scheduled.push({fn,delay});return 1;},cancel:()=>{},onDismiss:()=>{}});assert.equal(session.beginTimer(),true);assert.equal(scheduled[0].delay,9000);
});
test("21. spoken welcome waits for actual speech completion before timing",()=>{
  const listeners={},scheduled=[];const utterance={addEventListener:(type,handler)=>{listeners[type]=handler;}};
  const session=stage4.createWelcomeSession({schedule:(fn,delay)=>{scheduled.push({fn,delay});return 1;},cancel:()=>{},onDismiss:()=>{}});session.waitForSpeech(utterance);
  assert.equal(session.waitingForSpeech,true);assert.equal(scheduled.length,0);listeners.end();assert.equal(session.waitingForSpeech,false);assert.equal(scheduled[0].delay,9000);
});
test("22. the welcome timer dismisses after the configured delay",()=>{
  let scheduled,dismissed="";const session=stage4.createWelcomeSession({delay:8000,schedule:fn=>{scheduled=fn;return 1;},cancel:()=>{},onDismiss:reason=>{dismissed=reason;}});session.beginTimer();scheduled();assert.equal(dismissed,"timer");assert.equal(session.dismissed,true);
});
test("23. Quick Log has readable primary and supporting wording",()=>{assert.match(home,/class="room r2 quick-log-room"[\s\S]*?<b>Quick Log<\/b><small>Food or Weight<\/small>/);});
test("24. all eight approved Home routes remain intact",()=>{
  assert.deepEqual([...home.matchAll(/data-room="([^"]+)"/g)].map(match=>match[1]),["daily-progress","quick-voice","diary","database","settings","shopping-list","progress-weight","exercise-activity"]);
});
test("25. companion tap guidance route is unchanged",()=>{assert.match(app,/\$\("home-companion"\)\.addEventListener\("click"/);assert.match(app,/personalityGuidance\(companion\)/);assert.match(app,/speakText\(personaliseSpeech\(full\)\)/);});
test("26. TEST banner spacing is measured and role-aware",()=>{assert.match(installation,/role===ROLES\.TEST&&testBanner/);assert.match(installation,/--hec-installation-banner-inset/);assert.match(styles,/html\[data-hec-installation-role="test"\] body\{padding-top:var\(--hec-installation-banner-inset,54px\)\}/);});
test("27. non-TEST layout receives no TEST-only top inset",()=>{assert.doesNotMatch(styles,/(^|\n)body\{[^}]*hec-installation-banner-inset/);assert.match(installation,/else document\.documentElement\.style\.removeProperty\("--hec-installation-banner-inset"\)/);});
test("28. responsive Home rules retain bounded screens and touch targets",()=>{assert.match(styles,/body,#app,\.screen\{width:100%;max-width:100vw;overflow-x:hidden\}/);assert.match(styles,/min-width:82px!important;min-height:70px!important/);assert.match(styles,/@media\(max-height:600px\) and \(max-width:700px\)/);});
test("29. the prototype dotted orbit is removed",()=>{assert.doesNotMatch(home,/class="orbit"/);assert.match(styles,/\.eight-room-circle \.orbit\{display:none!important\}/);});
test("30. Home hierarchy enlarges artwork while reducing its centre panel",()=>{assert.match(styles,/companion-centre[^\n]*width:36%!important;height:42%!important/);assert.match(styles,/home-avatar-image[^\n]*width:114%!important;height:88%!important/);assert.match(styles,/\.eight-room-circle \.room\{width:clamp\(94px,19\.5%,136px\)!important/);});
test("31. navigation cancels stale onboarding speech before the Home welcome",()=>{assert.match(app,/if\(screenSpeechTimer!==null\)clearTimeout\(screenSpeechTimer\)/);assert.match(app,/screenSpeechTimer=setTimeout\(\(\) => \{screenSpeechTimer=null;speakText/);});
