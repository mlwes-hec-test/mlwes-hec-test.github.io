((root,factory)=>{
  "use strict";

  const metadata=typeof module==="object"&&module.exports?require("./companion-voice-metadata.js"):root?.HECVoiceMetadata;
  const api=factory(metadata);
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.HECCompanionVoices=api;
})(typeof globalThis!=="undefined"?globalThis:this,VOICE_METADATA=>{
  "use strict";

  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const freezeStyle=(id,label,rateOffset=0,pitchOffset=0,tags=[])=>Object.freeze({
    id,label,rateOffset,pitchOffset,tags:Object.freeze([...tags])
  });
  const freezeConfig=(id,name,sex,styles)=>Object.freeze({
    id,name,sex,defaultStyleId:styles[0].id,styles:Object.freeze(styles)
  });

  const CONFIGURATIONS=Object.freeze([
    freezeConfig("percy-pelican","Percy","male",[
      freezeStyle("calm-organised","Calm & Organised",-.02,0,["calm","organised"]),
      freezeStyle("warm-reassuring","Warm & Reassuring",-.025,0,["warm","reassuring"]),
      freezeStyle("clear-practical","Clear & Practical",0,0,["clear","practical"])
    ]),
    freezeConfig("wally-wombat","Wally","male",[
      freezeStyle("warm-down-to-earth","Warm & Down-to-earth",-.01,0,["warm","steady"]),
      freezeStyle("relaxed-friendly","Relaxed & Friendly",-.025,0,["relaxed","friendly"]),
      freezeStyle("steady-reassuring","Steady & Reassuring",-.015,0,["steady","reassuring"])
    ]),
    freezeConfig("anna-goanna","Anna","female",[
      freezeStyle("bright-resourceful","Bright & Resourceful",.015,.005,["bright","resourceful"]),
      freezeStyle("friendly-adventurous","Friendly & Adventurous",.02,0,["friendly","adventurous"]),
      freezeStyle("clear-encouraging","Clear & Encouraging",.005,0,["clear","encouraging"])
    ]),
    freezeConfig("shelly-turtle","Shelly","female",[
      freezeStyle("calm-mature","Calm & Mature",-.025,0,["calm","mature"]),
      freezeStyle("warm-gentle","Warm & Gentle",-.02,0,["warm","gentle"]),
      freezeStyle("wise-reassuring","Wise & Reassuring",-.03,0,["wise","reassuring"])
    ]),
    freezeConfig("ruby-ringneck","Ruby","female",[
      freezeStyle("bright-easy-going","Bright & Easy-going",0,.005,["bright","easy-going"]),
      freezeStyle("cheerful-friendly","Cheerful & Friendly",-.005,0,["cheerful","friendly"]),
      freezeStyle("lively-encouraging","Lively & Encouraging",.01,.005,["lively","encouraging"])
    ]),
    freezeConfig("bonnie-bilby","Bonnie","female",[
      freezeStyle("warm-curious","Warm & Curious",0,0,["warm","curious"]),
      freezeStyle("gentle-friendly","Gentle & Friendly",-.02,-.005,["gentle","friendly"]),
      freezeStyle("bright-supportive","Bright & Supportive",.015,0,["bright","supportive"])
    ]),
    freezeConfig("skip-kangaroo","Skip","male",[
      freezeStyle("upbeat-encouraging","Upbeat & Encouraging",.01,.005,["upbeat","encouraging"]),
      freezeStyle("strong-friendly","Strong & Friendly",-.005,0,["strong","friendly"]),
      freezeStyle("relaxed-confident","Relaxed & Confident",-.02,-.005,["relaxed","confident"])
    ]),
    freezeConfig("rusty-dingo","Rusty","male",[
      freezeStyle("friendly-dependable","Friendly & Dependable",0,0,["friendly","dependable"]),
      freezeStyle("warm-practical","Warm & Practical",-.01,0,["warm","practical"]),
      freezeStyle("steady-encouraging","Steady & Encouraging",-.015,0,["steady","encouraging"])
    ]),
    freezeConfig("gary-galah","Gary","male",[
      freezeStyle("conversational-lively","Conversational & Lively",.01,.005,["conversational","lively"]),
      freezeStyle("cheeky-friendly","Cheeky & Friendly",.015,.005,["cheeky","friendly"]),
      freezeStyle("bright-easy-going","Bright & Easy-going",0,0,["bright","easy-going"])
    ]),
    freezeConfig("monty-python","Monty","male",[
      freezeStyle("calm-relaxed","Calm & Relaxed",-.015,0,["calm","relaxed"]),
      freezeStyle("warm-thoughtful","Warm & Thoughtful",-.01,0,["warm","thoughtful"]),
      freezeStyle("easy-going-friendly","Easy-going & Friendly",.005,0,["easy-going","friendly"])
    ]),
    freezeConfig("chuckles-kookaburra","Chuckles","male",[
      freezeStyle("cheerful-friendly","Cheerful & Friendly",0,0,["cheerful","friendly"]),
      freezeStyle("lively-playful","Lively & Playful",.015,.005,["lively","playful"]),
      freezeStyle("warm-easy-going","Warm & Easy-going",-.01,0,["warm","easy-going"])
    ]),
    freezeConfig("ernie-echidna","Ernie","male",[
      freezeStyle("thoughtful-clear","Thoughtful & Clear",0,0,["thoughtful","clear"]),
      freezeStyle("gentle-reassuring","Gentle & Reassuring",-.02,0,["gentle","reassuring"]),
      freezeStyle("warm-practical","Warm & Practical",.005,0,["warm","practical"])
    ]),
    freezeConfig("spike-thorny-devil","Spike","male",[
      freezeStyle("gentle-protective","Gentle & Protective",-.015,0,["gentle","protective"]),
      freezeStyle("calm-reassuring","Calm & Reassuring",-.025,0,["calm","reassuring"]),
      freezeStyle("friendly-steady","Friendly & Steady",0,0,["friendly","steady"])
    ]),
    freezeConfig("cassie-cassowary","Cassie","female",[
      freezeStyle("confident-clear","Confident & Clear",0,0,["confident","clear"]),
      freezeStyle("strong-supportive","Strong & Supportive",-.005,-.005,["strong","supportive"]),
      freezeStyle("warm-direct","Warm & Direct",-.01,0,["warm","direct"])
    ]),
    freezeConfig("salty-crocodile","Salty","male",[
      freezeStyle("warm-easy-going","Warm & Easy-going",-.01,0,["warm","easy-going"]),
      freezeStyle("friendly-relaxed","Friendly & Relaxed",-.02,0,["friendly","relaxed"]),
      freezeStyle("upbeat-practical","Upbeat & Practical",.01,0,["upbeat","practical"])
    ]),
    freezeConfig("bushy-koala","Bushy","male",[
      freezeStyle("calm-wise","Calm & Wise",-.025,0,["calm","wise"]),
      freezeStyle("laid-back-friendly","Laid-back & Friendly",-.015,0,["laid-back","friendly"]),
      freezeStyle("warm-reassuring","Warm & Reassuring",-.02,0,["warm","reassuring"])
    ])
  ]);

  const CONFIG_BY_ID=new Map(CONFIGURATIONS.map(config=>[config.id,config]));
  const LEGACY_IDS=Object.freeze({
    "rowdy-ringneck":"ruby-ringneck",
    "barnaby-bilby":"bonnie-bilby",
    "clancy-cassowary":"cassie-cassowary",
    "koko-koala":"bushy-koala"
  });
  const PERSONALITY_TUNING=Object.freeze({
    calm:[.92,1],encouraging:[1,1.03],steady:[.94,.98],thoughtful:[.9,1],
    loyal:[.98,1],curious:[1,1.04],"light-hearted":[1.02,1.07],social:[1.03,1.05],
    planner:[.95,1],confident:[.98,.97],energetic:[1.07,1.06],direct:[1,.95],
    protective:[.93,1],resourceful:[1,1.02],relaxed:[.9,.98],patient:[.88,1]
  });

  function companionId(companion){
    const value=typeof companion==="string"?companion:companion?.id;
    const id=String(value||"").trim().toLowerCase();
    return LEGACY_IDS[id]||id;
  }
  function voiceConfigFor(companion){return CONFIG_BY_ID.get(companionId(companion))||null;}
  function defaultVoiceStyleId(companion){return voiceConfigFor(companion)?.defaultStyleId||null;}
  function voiceStyleFor(companion,voiceStyleId){
    const config=voiceConfigFor(companion);
    if(!config)return null;
    return config.styles.find(style=>style.id===String(voiceStyleId||""))||config.styles[0];
  }
  function normaliseVoiceStyleId(companion,voiceStyleId){return voiceStyleFor(companion,voiceStyleId)?.id||null;}
  function speechTuning(companion,voiceStyleId){
    const personality=String(typeof companion==="object"?companion?.personality||"":"");
    const base=PERSONALITY_TUNING[personality]||[.96,1];
    const style=voiceStyleFor(companion,voiceStyleId);
    return Object.freeze({
      rate:Number(clamp(base[0]+(style?.rateOffset||0),.86,1.08).toFixed(3)),
      pitch:Number(clamp(base[1]+(style?.pitchOffset||0),.94,1.08).toFixed(3))
    });
  }

  function normaliseLanguage(value){return String(value||"").trim().replace(/_/g,"-").toLowerCase();}
  function australianEnglishMarker(voice){
    return /(^|[^a-z])(australian|australia|en[-_]?au)([^a-z]|$)/i.test(`${voice?.name||""} ${voice?.voiceURI||""}`);
  }
  function languageTier(voice){
    const language=normaliseLanguage(voice?.lang);
    if(language==="en-au"||language.startsWith("en-au-"))return 0;
    if(language.startsWith("en")&&australianEnglishMarker(voice))return 1;
    if(language==="en-gb"||language.startsWith("en-gb-"))return 2;
    if(language==="en-nz"||language.startsWith("en-nz-"))return 3;
    if(language==="en-us"||language.startsWith("en-us-"))return 4;
    if(language==="en"||language.startsWith("en-"))return 5;
    return Number.POSITIVE_INFINITY;
  }
  function voiceSexEvidence(voice){
    const value=String(voice?.sex||voice?.gender||"").trim().toLowerCase();
    if(["female","woman","f"].includes(value))return Object.freeze({sex:"female",source:"explicit"});
    if(["male","man","m"].includes(value))return Object.freeze({sex:"male",source:"explicit"});
    return VOICE_METADATA?.knownVoiceSexDetails?.(voice?.name,voice?.voiceURI,voice?.lang)||Object.freeze({sex:"unknown",source:"unknown"});
  }
  function explicitVoiceSex(voice){const sex=voiceSexEvidence(voice).sex;return sex==="unknown"?null:sex;}
  function styleAffinity(voice,style){
    const metadata=voice?.styleTags??voice?.styles??voice?.characteristics;
    const values=Array.isArray(metadata)?metadata:[metadata];
    const words=values.filter(Boolean).map(value=>String(value).toLowerCase());
    if(!words.length||!style?.tags?.length)return 1;
    return style.tags.some(tag=>words.some(value=>value.includes(tag)))?0:1;
  }
  function stableVoiceKey(voice){
    return `${String(voice?.name||"").toLowerCase()}\u0000${normaliseLanguage(voice?.lang)}\u0000${String(voice?.voiceURI||"").toLowerCase()}`;
  }
  function resolveCompanionVoice(companion,voiceStyleId,availableVoices,options={}){
    const config=voiceConfigFor(companion);
    const style=voiceStyleFor(companion,voiceStyleId);
    const tuning=speechTuning(companion,style?.id);
    const list=Array.from(availableVoices||[]).filter(voice=>voice&&typeof voice==="object");
    const english=list.filter(voice=>Number.isFinite(languageTier(voice)));
    const expectedSex=String((typeof companion==="object"&&companion?.gender)||config?.sex||"").toLowerCase();
    const pool=english.filter(voice=>{
      const sex=voiceSexEvidence(voice).sex;
      return sex==="unknown"||!expectedSex||sex===expectedSex;
    });
    const savedVoiceName=String(options.savedVoiceName||"");
    const ranked=pool.map(voice=>({
      voice,
      tier:languageTier(voice),
      evidence:voiceSexEvidence(voice),
      saved:voice.name===savedVoiceName?0:1,
      affinity:styleAffinity(voice,style),
      preferredDefault:voice.default?0:1,
      local:voice.localService===false?1:0,
      key:stableVoiceKey(voice)
    })).sort((a,b)=>a.tier-b.tier||(a.evidence.sex===expectedSex?0:1)-(b.evidence.sex===expectedSex?0:1)||a.saved-b.saved||a.affinity-b.affinity||a.preferredDefault-b.preferredDefault||a.local-b.local||a.key.localeCompare(b.key));
    const selected=ranked[0]||null;
    const voice=selected?.voice||null;
    const detectedVoiceSex=selected?.evidence?.sex||"unknown";
    return Object.freeze({
      companionId:config?.id||companionId(companion)||null,
      voiceStyleId:style?.id||null,
      voice,
      voiceName:voice?.name||"",
      exactVoiceMatched:!!voice&&!!savedVoiceName&&voice.name===savedVoiceName,
      usedBrowserDefault:!voice,
      pending:list.length===0,
      languageTier:voice?languageTier(voice):null,
      resolvedLanguage:voice?.lang||null,
      detectedVoiceSex,
      voiceSexSource:selected?.evidence?.source||"unknown",
      companionRequiredSex:expectedSex||"unknown",
      sexMatch:!voice?"browser-default":detectedVoiceSex==="unknown"?"unknown-fallback":detectedVoiceSex===expectedSex?"confirmed":"opposite-fallback",
      rate:tuning.rate,
      pitch:tuning.pitch
    });
  }

  function createVoiceCatalog(synthesis,onChange=()=>{}){
    let voices=[];
    let started=false;
    let previousHandler=null;
    let propertyHandler=false;
    const read=()=>{
      try{return Array.from(synthesis?.getVoices?.()||[]);}catch{return [];}
    };
    const refresh=()=>{
      voices=read();
      onChange([...voices]);
      return [...voices];
    };
    const handleChange=()=>refresh();
    const start=()=>{
      if(started)return [...voices];
      started=true;
      if(typeof synthesis?.addEventListener==="function")synthesis.addEventListener("voiceschanged",handleChange);
      else if(synthesis){
        propertyHandler=true;
        previousHandler=typeof synthesis.onvoiceschanged==="function"?synthesis.onvoiceschanged:null;
        synthesis.onvoiceschanged=event=>{previousHandler?.call(synthesis,event);handleChange();};
      }
      return refresh();
    };
    const stop=()=>{
      if(!started)return;
      if(typeof synthesis?.removeEventListener==="function")synthesis.removeEventListener("voiceschanged",handleChange);
      else if(propertyHandler&&synthesis)synthesis.onvoiceschanged=previousHandler;
      started=false;
    };
    return Object.freeze({start,stop,refresh,getVoices:()=>[...voices]});
  }

  function speakResolvedVoice(synthesis,Utterance,text,resolution,options={}){
    if(!synthesis||typeof synthesis.speak!=="function"||typeof Utterance!=="function")return null;
    const utterance=new Utterance(String(text||""));
    if(resolution?.voice)utterance.voice=resolution.voice;
    utterance.lang=resolution?.voice?.lang||options.language||"en-AU";
    utterance.rate=resolution?.rate||.96;
    utterance.pitch=resolution?.pitch||1;
    synthesis.cancel?.();
    synthesis.speak(utterance);
    return utterance;
  }

  return Object.freeze({
    CONFIGURATIONS,
    LEGACY_IDS,
    PERSONALITY_TUNING,
    voiceConfigFor,
    defaultVoiceStyleId,
    voiceStyleFor,
    normaliseVoiceStyleId,
    speechTuning,
    languageTier,
    explicitVoiceSex,
    voiceSexEvidence,
    resolveCompanionVoice,
    createVoiceCatalog,
    speakResolvedVoice
  });
});
