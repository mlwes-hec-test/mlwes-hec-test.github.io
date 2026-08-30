"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const migrations=require("../migrations.js");
const voiceMetadata=require("../companion-voice-metadata.js");
const voiceSystem=require("../companion-voices.js");

const ROOT=path.join(__dirname,"..");
const readText=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const makeVoice=(name,lang,gender,extra={})=>({name,lang,gender,voiceURI:`test:${name}`,localService:true,...extra});

const EXPECTED_STYLES={
  "percy-pelican":["Calm & Organised","Warm & Reassuring","Clear & Practical"],
  "wally-wombat":["Warm & Down-to-earth","Relaxed & Friendly","Steady & Reassuring"],
  "anna-goanna":["Bright & Resourceful","Friendly & Adventurous","Clear & Encouraging"],
  "shelly-turtle":["Calm & Mature","Warm & Gentle","Wise & Reassuring"],
  "ruby-ringneck":["Bright & Easy-going","Cheerful & Friendly","Lively & Encouraging"],
  "bonnie-bilby":["Warm & Curious","Gentle & Friendly","Bright & Supportive"],
  "skip-kangaroo":["Upbeat & Encouraging","Strong & Friendly","Relaxed & Confident"],
  "rusty-dingo":["Friendly & Dependable","Warm & Practical","Steady & Encouraging"],
  "gary-galah":["Conversational & Lively","Cheeky & Friendly","Bright & Easy-going"],
  "monty-python":["Calm & Relaxed","Warm & Thoughtful","Easy-going & Friendly"],
  "chuckles-kookaburra":["Cheerful & Friendly","Lively & Playful","Warm & Easy-going"],
  "ernie-echidna":["Thoughtful & Clear","Gentle & Reassuring","Warm & Practical"],
  "spike-thorny-devil":["Gentle & Protective","Calm & Reassuring","Friendly & Steady"],
  "cassie-cassowary":["Confident & Clear","Strong & Supportive","Warm & Direct"],
  "salty-crocodile":["Warm & Easy-going","Friendly & Relaxed","Upbeat & Practical"],
  "bushy-koala":["Calm & Wise","Laid-back & Friendly","Warm & Reassuring"]
};

const EXPECTED_DEFAULTS={
  "percy-pelican":"calm-organised",
  "wally-wombat":"warm-down-to-earth",
  "anna-goanna":"bright-resourceful",
  "shelly-turtle":"calm-mature",
  "ruby-ringneck":"bright-easy-going",
  "bonnie-bilby":"warm-curious",
  "skip-kangaroo":"upbeat-encouraging",
  "rusty-dingo":"friendly-dependable",
  "gary-galah":"conversational-lively",
  "monty-python":"calm-relaxed",
  "chuckles-kookaburra":"cheerful-friendly",
  "ernie-echidna":"thoughtful-clear",
  "spike-thorny-devil":"gentle-protective",
  "cassie-cassowary":"confident-clear",
  "salty-crocodile":"warm-easy-going",
  "bushy-koala":"calm-wise"
};

const EXPECTED_SEX={
  "percy-pelican":"male","wally-wombat":"male","anna-goanna":"female","shelly-turtle":"female",
  "ruby-ringneck":"female","bonnie-bilby":"female","skip-kangaroo":"male","rusty-dingo":"male",
  "gary-galah":"male","monty-python":"male","chuckles-kookaburra":"male","ernie-echidna":"male",
  "spike-thorny-devil":"male","cassie-cassowary":"female","salty-crocodile":"male","bushy-koala":"male"
};

test("voice configuration covers exactly the 16 canonical active companions",()=>{
  const expected=migrations.CANONICAL_COMPANIONS.map(companion=>companion.id);
  assert.deepEqual(voiceSystem.CONFIGURATIONS.map(config=>config.id),expected);
  assert.equal(voiceSystem.CONFIGURATIONS.length,16);
  assert.equal(voiceSystem.voiceConfigFor("koko-koala").id,"bushy-koala");
  assert.equal(voiceSystem.voiceConfigFor("sunny"),null);
});

test("each companion retains three approved internal profiles and its predefined default",()=>{
  for(const config of voiceSystem.CONFIGURATIONS){
    assert.equal(config.styles.length,3,config.id);
    assert.deepEqual(config.styles.map(style=>style.label),EXPECTED_STYLES[config.id],config.id);
    assert.equal(config.defaultStyleId,EXPECTED_DEFAULTS[config.id],config.id);
    assert.equal(config.styles[0].id,config.defaultStyleId,config.id);
  }
});

test("every companion has the authoritative Stage 3B sex mapping",()=>{
  for(const config of voiceSystem.CONFIGURATIONS){
    assert.equal(config.sex,EXPECTED_SEX[config.id],config.id);
    const identity=migrations.CANONICAL_COMPANIONS.find(companion=>companion.id===config.id);
    assert.equal(identity.gender,EXPECTED_SEX[config.id],`${config.id}:identity`);
  }
  assert.equal(Object.values(EXPECTED_SEX).filter(sex=>sex==="male").length,11);
  assert.equal(Object.values(EXPECTED_SEX).filter(sex=>sex==="female").length,5);
});

test("curated Microsoft, Apple and browser voice metadata recognises only known names",()=>{
  const cases=[
    ["Microsoft Catherine","", "en-AU","female"],
    ["Microsoft James","", "en-AU","male"],
    ["Microsoft David Desktop - English (United States)","", "en-US","male"],
    ["Microsoft Mark","MSTTS_V110_enUS_MarkM", "en-US","male"],
    ["Microsoft Zira Desktop - English (United States)","", "en-US","female"],
    ["Karen (Enhanced)","com.apple.voice.enhanced.en-AU.Karen", "en-AU","female"],
    ["Lee","com.apple.voice.compact.en-AU.Lee", "en-AU","male"],
    ["Samantha","com.apple.voice.compact.en-US.Samantha", "en-US","female"],
    ["Daniel","com.apple.voice.compact.en-GB.Daniel", "en-GB","male"],
    ["Google UK English Male","Google UK English Male", "en-GB","male"],
    ["Google UK English Female","Google UK English Female", "en-GB","female"]
  ];
  cases.forEach(([name,uri,lang,sex])=>assert.equal(voiceMetadata.knownVoiceSex(name,uri,lang),sex,name));
  for(const name of ["Jordan","Michael","Siri Voice 1","Microsoft Jordan"]){
    assert.equal(voiceMetadata.knownVoiceSex(name,"", "en-AU"),"unknown",name);
  }
  assert.equal(voiceMetadata.knownVoiceSex("Karen","", "en-US"),"unknown","known name with incompatible locale");
});

test("explicit sex metadata remains stronger than curated name metadata",()=>{
  const evidence=voiceSystem.voiceSexEvidence({name:"Microsoft Catherine",lang:"en-AU",gender:"male"});
  assert.equal(evidence.sex,"male");
  assert.equal(evidence.source,"explicit");
});

test("style IDs are stable machine keys and tuning remains conservative",()=>{
  for(const config of voiceSystem.CONFIGURATIONS){
    const ids=config.styles.map(style=>style.id);
    assert.equal(new Set(ids).size,3,config.id);
    ids.forEach(id=>assert.match(id,/^[a-z0-9]+(?:-[a-z0-9]+)+$/,`${config.id}:${id}`));
    const companion=migrations.CANONICAL_COMPANIONS.find(item=>item.id===config.id);
    for(const style of config.styles){
      const tuning=voiceSystem.speechTuning(companion,style.id);
      assert.ok(tuning.rate>=.86&&tuning.rate<=1.08,`${config.id}:${style.id}:rate`);
      assert.ok(tuning.pitch>=.94&&tuning.pitch<=1.08,`${config.id}:${style.id}:pitch`);
    }
  }
  const percy=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="percy-pelican");
  assert.ok(voiceSystem.speechTuning(percy,"calm-organised").rate<voiceSystem.speechTuning(percy,"clear-practical").rate);
});

test("suitable en-AU voices are preferred and reliable sex metadata is respected",()=>{
  const percy=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="percy-pelican");
  const anna=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="anna-goanna");
  const voices=[
    makeVoice("British Male","en-GB","male"),
    makeVoice("Australian Female","en-AU","female"),
    makeVoice("Australian Male","en-AU","male")
  ];
  assert.equal(voiceSystem.resolveCompanionVoice(percy,"calm-organised",voices).voiceName,"Australian Male");
  assert.equal(voiceSystem.resolveCompanionVoice(anna,"bright-resourceful",voices).voiceName,"Australian Female");
});

test("known same-sex voices beat known opposite-sex voices for male and female companions",()=>{
  const skip=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="skip-kangaroo");
  const shelly=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="shelly-turtle");
  const voices=[
    makeVoice("Microsoft Catherine","en-AU",undefined,{voiceURI:"MSTTS_V110_enAU_CatherineM"}),
    makeVoice("Microsoft James","en-AU",undefined,{voiceURI:"MSTTS_V110_enAU_JamesM"})
  ];
  const skipResolution=voiceSystem.resolveCompanionVoice(skip,"upbeat-encouraging",voices);
  const shellyResolution=voiceSystem.resolveCompanionVoice(shelly,"calm-mature",voices);
  assert.equal(skipResolution.voiceName,"Microsoft James");
  assert.equal(skipResolution.detectedVoiceSex,"male");
  assert.equal(skipResolution.sexMatch,"confirmed");
  assert.equal(shellyResolution.voiceName,"Microsoft Catherine");
  assert.equal(shellyResolution.detectedVoiceSex,"female");
  assert.equal(shellyResolution.sexMatch,"confirmed");
});

test("known opposite-sex en-AU does not beat a known same-sex English fallback",()=>{
  const skip=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="skip-kangaroo");
  const voices=[
    makeVoice("Microsoft Catherine","en-AU",undefined,{voiceURI:"MSTTS_V110_enAU_CatherineM"}),
    makeVoice("Daniel","en-GB",undefined,{voiceURI:"com.apple.voice.compact.en-GB.Daniel"})
  ];
  const resolution=voiceSystem.resolveCompanionVoice(skip,"upbeat-encouraging",voices);
  assert.equal(resolution.voiceName,"Daniel");
  assert.equal(resolution.resolvedLanguage,"en-GB");
  assert.equal(resolution.detectedVoiceSex,"male");
  assert.equal(resolution.companionRequiredSex,"male");
  const onlyOpposite=voiceSystem.resolveCompanionVoice(skip,"upbeat-encouraging",[voices[0]]);
  assert.equal(onlyOpposite.voice,null);
  assert.equal(onlyOpposite.usedBrowserDefault,true);
  assert.equal(onlyOpposite.sexMatch,"browser-default");
});

test("unknown-sex English voices remain safe fallbacks without invented classification",()=>{
  const shelly=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="shelly-turtle");
  const voices=[makeVoice("Jordan Natural","en-AU",undefined),makeVoice("Taylor English","en-GB",undefined)];
  const resolution=voiceSystem.resolveCompanionVoice(shelly,"wise-reassuring",voices);
  assert.equal(resolution.voiceName,"Jordan Natural");
  assert.equal(resolution.detectedVoiceSex,"unknown");
  assert.equal(resolution.voiceSexSource,"unknown");
  assert.equal(resolution.sexMatch,"unknown-fallback");
});

test("the resolver uses deterministic Australian-English and English fallbacks",()=>{
  const percy=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="percy-pelican");
  const australianNamed=makeVoice("Australian English Natural","en","male");
  const gb=makeVoice("British","en-GB","male");
  const nz=makeVoice("New Zealand","en-NZ","male");
  const us=makeVoice("United States","en-US","male");
  assert.equal(voiceSystem.resolveCompanionVoice(percy,"calm-organised",[gb,australianNamed]).voiceName,australianNamed.name);
  assert.equal(voiceSystem.resolveCompanionVoice(percy,"calm-organised",[us,nz,gb]).voiceName,gb.name);
  assert.equal(voiceSystem.resolveCompanionVoice(percy,"calm-organised",[us]).voiceName,us.name);
  assert.equal(voiceSystem.resolveCompanionVoice(percy,"calm-organised",[makeVoice("French","fr-FR","male")]).voice,null);
});

test("an empty voice list safely retains the portable style and uses browser default",()=>{
  const companion=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="shelly-turtle");
  const resolution=voiceSystem.resolveCompanionVoice(companion,"warm-gentle",[]);
  assert.equal(resolution.voiceStyleId,"warm-gentle");
  assert.equal(resolution.voice,null);
  assert.equal(resolution.usedBrowserDefault,true);
  assert.equal(resolution.pending,true);
});

test("voiceStyleId survives a device change while the resolved exact voice may differ",()=>{
  const companion=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="percy-pelican");
  const saved={voiceStyleId:"calm-organised",voice:"Device A Australian"};
  const deviceA=[makeVoice("Device A Australian","en-AU","male")];
  const deviceB=[makeVoice("Device B Australian","en-AU","male")];
  const first=voiceSystem.resolveCompanionVoice(companion,saved.voiceStyleId,deviceA,{savedVoiceName:saved.voice});
  const second=voiceSystem.resolveCompanionVoice(companion,saved.voiceStyleId,deviceB,{savedVoiceName:saved.voice});
  assert.equal(first.voiceName,"Device A Australian");
  assert.equal(first.exactVoiceMatched,true);
  assert.equal(second.voiceName,"Device B Australian");
  assert.equal(second.exactVoiceMatched,false);
  assert.equal(second.voiceStyleId,"calm-organised");
  assert.deepEqual(saved,{voiceStyleId:"calm-organised",voice:"Device A Australian"});
});

test("a compatible saved exact voice remains preferred within the best local tier",()=>{
  const companion=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="cassie-cassowary");
  const voices=[makeVoice("AU Default","en-AU","female",{default:true}),makeVoice("Saved AU Voice","en-AU","female")];
  const resolution=voiceSystem.resolveCompanionVoice(companion,"confident-clear",voices,{savedVoiceName:"Saved AU Voice"});
  assert.equal(resolution.voiceName,"Saved AU Voice");
  assert.equal(resolution.exactVoiceMatched,true);
});

test("a saved exact known opposite-sex voice is preserved but does not force resolution",()=>{
  const skip=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="skip-kangaroo");
  const saved={voiceStyleId:"upbeat-encouraging",voice:"Microsoft Catherine"};
  const voices=[
    makeVoice("Microsoft Catherine","en-AU",undefined,{voiceURI:"MSTTS_V110_enAU_CatherineM"}),
    makeVoice("Microsoft James","en-AU",undefined,{voiceURI:"MSTTS_V110_enAU_JamesM"})
  ];
  const resolution=voiceSystem.resolveCompanionVoice(skip,saved.voiceStyleId,voices,{savedVoiceName:saved.voice});
  assert.equal(resolution.voiceName,"Microsoft James");
  assert.equal(resolution.exactVoiceMatched,false);
  assert.deepEqual(saved,{voiceStyleId:"upbeat-encouraging",voice:"Microsoft Catherine"});
});

test("delayed voiceschanged refreshes resolution without duplicate listeners",()=>{
  let installed=[];
  const handlers=[];
  const resolved=[];
  const synthesis={
    getVoices:()=>installed,
    addEventListener:(type,handler)=>{assert.equal(type,"voiceschanged");handlers.push(handler);},
    removeEventListener:()=>{}
  };
  const companion=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="anna-goanna");
  const catalog=voiceSystem.createVoiceCatalog(synthesis,voices=>resolved.push(voiceSystem.resolveCompanionVoice(companion,"bright-resourceful",voices).voiceName));
  catalog.start();
  catalog.start();
  assert.equal(handlers.length,1);
  assert.deepEqual(resolved,[""]);
  installed=[makeVoice("Late Australian Female","en-AU","female")];
  handlers[0]();
  assert.deepEqual(resolved,["","Late Australian Female"]);
  assert.equal(catalog.getVoices()[0].name,"Late Australian Female");
});

test("Safari-style onvoiceschanged fallback refreshes voices safely",()=>{
  let installed=[];
  const seen=[];
  const synthesis={getVoices:()=>installed,onvoiceschanged:null};
  const catalog=voiceSystem.createVoiceCatalog(synthesis,voices=>seen.push(voices.length));
  catalog.start();
  assert.equal(typeof synthesis.onvoiceschanged,"function");
  installed=[makeVoice("Safari AU","en-AU","male")];
  synthesis.onvoiceschanged();
  assert.deepEqual(seen,[0,1]);
  catalog.stop();
  assert.equal(synthesis.onvoiceschanged,null);
});

test("speech previews cancel the previous utterance before speaking the replacement",()=>{
  const active=[];
  const events=[];
  const synthesis={
    cancel:()=>{events.push("cancel");active.length=0;},
    speak:utterance=>{events.push(`speak:${utterance.text}`);active.push(utterance);}
  };
  class Utterance{constructor(text){this.text=text;}}
  const companion=migrations.CANONICAL_COMPANIONS.find(item=>item.id==="skip-kangaroo");
  const resolution=voiceSystem.resolveCompanionVoice(companion,"upbeat-encouraging",[makeVoice("Skip AU","en-AU","male")]);
  voiceSystem.speakResolvedVoice(synthesis,Utterance,"First introduction",resolution);
  voiceSystem.speakResolvedVoice(synthesis,Utterance,"Replacement introduction",resolution);
  assert.deepEqual(events,["cancel","speak:First introduction","cancel","speak:Replacement introduction"]);
  assert.equal(active.length,1);
  assert.equal(active[0].text,"Replacement introduction");
});

test("legacy companion identities use canonical styles while Salty remains active",()=>{
  const pairs={
    "rowdy-ringneck":"ruby-ringneck",
    "barnaby-bilby":"bonnie-bilby",
    "clancy-cassowary":"cassie-cassowary",
    "koko-koala":"bushy-koala"
  };
  for(const [legacy,canonical] of Object.entries(pairs)){
    const result=migrations.migrateRecords({companion:{id:legacy,name:legacy,voice:"Legacy Exact",speechEnabled:false}},{}).main.companion;
    assert.equal(result.id,canonical,legacy);
    assert.equal(voiceSystem.voiceConfigFor(result).id,canonical,legacy);
    assert.equal(result.voice,"Legacy Exact",legacy);
    assert.equal(result.speechEnabled,false,legacy);
  }
  const salty=migrations.migrateRecords({companion:{id:"salty-crocodile",name:"Salty"}},{}).main.companion;
  assert.equal(salty.id,"salty-crocodile");
  assert.equal(salty.selectionStatus,"active");
  assert.equal(voiceSystem.defaultVoiceStyleId(salty),"warm-easy-going");
});

test("normal UI uses each companion's predefined profile without a duplicate style selector",()=>{
  const html=readText("index.html");
  const app=readText("app.js");
  assert.doesNotMatch(html,/id="voice-select"|>Device voice</);
  assert.doesNotMatch(html,/id="companion-voice-styles"|id="voice-style-options"/);
  assert.match(html,/id="speech-enabled"/);
  assert.match(html,/id="preview-voice"/);
  assert.match(app,/data\.companion\.voiceStyleId=voiceStyleId/);
  assert.match(app,/if\(!data\.companion\.voice&&resolution\.voiceName\)data\.companion\.voice=resolution\.voiceName/);
  assert.match(app,/if\(!String\(result\.voiceStyleId\|\|""\)\.trim\(\)\)result\.voiceStyleId=/);
  assert.match(app,/\$\("toggle-speech"\)\.classList\.toggle\("hidden",!data\.companion\.enabled\)/);
  const preview=app.match(/\$\("preview-voice"\)\?\.addEventListener\("click", \(\) => \{([\s\S]*?)\n\}\);/)[1];
  assert.doesNotMatch(preview,/syncCompanionForm|save\(\)|data\.[\w.]+\s*=/);
  assert.match(preview,/selectedCompanionVoiceStyleId/);
  assert.match(preview,/companion\?\.intro/);
});

test("spoken-guidance off remains a persistent speech gate",()=>{
  const app=readText("app.js");
  const speech=app.slice(app.indexOf("function speakText"),app.indexOf("const COUNTRY_CONFIG"));
  assert.match(speech,/!data\.companion\.speechEnabled\) return/);
  assert.match(app,/data\.companion\.speechEnabled = \$\("speech-enabled"\)\?\.checked !== false/);
  assert.match(app,/\$\("speech-enabled"\)\.checked = data\.companion\.speechEnabled/);
  assert.doesNotMatch(app,/preview-voice[\s\S]{0,700}speechEnabled\s*=\s*true/);
});

test("voice module is loaded and precached before app startup",()=>{
  const html=readText("index.html");
  const worker=readText("service-worker.js");
  assert.ok(html.indexOf('"companion-voice-metadata.js"')>html.indexOf('"companion-artwork.js"'));
  assert.ok(html.indexOf('"companion-voice-metadata.js"')<html.indexOf('"companion-voices.js"'));
  assert.ok(html.indexOf('"companion-voices.js"')<html.indexOf('"app.js"'));
  assert.match(worker,/`\.\/companion-voice-metadata\.js\?v=\$\{VERSION\}`/);
  assert.match(worker,/`\.\/companion-voices\.js\?v=\$\{VERSION\}`/);
});

test("Stage 3A artwork roster remains identical to the voice roster",()=>{
  const context={window:{}};
  vm.runInNewContext(readText("companion-artwork.js"),context);
  assert.deepEqual(Array.from(context.window.HEC_COMPANION_ARTWORK_ROSTER),voiceSystem.CONFIGURATIONS.map(config=>config.id));
  assert.equal(Object.keys(context.window.HEC_COMPANION_ARTWORK).length,16);
});
