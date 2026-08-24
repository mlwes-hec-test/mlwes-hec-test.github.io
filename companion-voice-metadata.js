((root,factory)=>{
  "use strict";

  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.HECVoiceMetadata=api;
})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";

  const freezeVoice=(name,languages)=>Object.freeze({name,languages:Object.freeze(languages)});
  const freezeFamily=(platform,sex,voices)=>Object.freeze({platform,sex,voices:Object.freeze(voices)});

  // Only voices whose published/platform identity is well established belong here.
  // Names that are not listed remain unknown, even when they sound person-like.
  const KNOWN_VOICE_FAMILIES=Object.freeze([
    freezeFamily("microsoft","male",[
      freezeVoice("james",["en-au"]),freezeVoice("william",["en-au"]),
      freezeVoice("david",["en-us"]),freezeVoice("mark",["en-us"]),freezeVoice("guy",["en-us"]),
      freezeVoice("george",["en-gb"]),freezeVoice("ryan",["en-gb"])
    ]),
    freezeFamily("microsoft","female",[
      freezeVoice("catherine",["en-au"]),freezeVoice("natasha",["en-au"]),
      freezeVoice("zira",["en-us"]),freezeVoice("aria",["en-us"]),freezeVoice("jenny",["en-us"]),
      freezeVoice("hazel",["en-gb"]),freezeVoice("sonia",["en-gb"])
    ]),
    freezeFamily("apple","male",[
      freezeVoice("lee",["en-au"]),freezeVoice("gordon",["en-au"]),
      freezeVoice("alex",["en-us"]),freezeVoice("fred",["en-us"]),freezeVoice("tom",["en-us"]),
      freezeVoice("daniel",["en-gb"]),freezeVoice("oliver",["en-gb"])
    ]),
    freezeFamily("apple","female",[
      freezeVoice("karen",["en-au"]),freezeVoice("matilda",["en-au"]),
      freezeVoice("samantha",["en-us"]),freezeVoice("victoria",["en-us"]),
      freezeVoice("serena",["en-gb"]),freezeVoice("kate",["en-gb"]),
      freezeVoice("moira",["en-ie"]),freezeVoice("tessa",["en-za"])
    ]),
    freezeFamily("google","male",[freezeVoice("google uk english male",["en-gb"])]),
    freezeFamily("google","female",[freezeVoice("google uk english female",["en-gb"])])
  ]);

  function normaliseLanguage(value){return String(value||"").trim().replace(/_/g,"-").toLowerCase();}
  function normaliseText(value){
    return String(value||"").toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  }
  function platformEvidence(platform,name,voiceURI){
    const evidence=`${name||""} ${voiceURI||""}`;
    if(platform==="microsoft")return /microsoft|mstts|tts[_-]ms/i.test(evidence);
    if(platform==="google")return /google|chrome/i.test(evidence);
    if(platform==="apple")return /apple|com\.apple/i.test(evidence);
    return false;
  }
  function microsoftName(name){
    return normaliseText(name)
      .replace(/^microsoft\s+/,"")
      .replace(/\s+english\s+(australia|united states|united kingdom).*$/,"")
      .replace(/\b(online|natural|desktop)\b/g,"")
      .replace(/\s+/g," ").trim();
  }
  function appleName(name){
    return normaliseText(name).replace(/\b(enhanced|premium|compact)\b/g,"").replace(/\s+/g," ").trim();
  }
  function uriContainsName(voiceURI,name){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    return new RegExp(`(?:^|[._:/-])${escaped}(?:$|[._:/-])`,"i").test(String(voiceURI||""));
  }
  function languageMatches(actual,expected){
    const language=normaliseLanguage(actual);
    return expected.some(item=>language===item||language.startsWith(`${item}-`));
  }
  function knownVoiceSexDetails(name,voiceURI,lang){
    const normalised=normaliseText(name);
    for(const family of KNOWN_VOICE_FAMILIES){
      for(const voice of family.voices){
        if(!languageMatches(lang,voice.languages))continue;
        let matched=false;
        if(family.platform==="microsoft"&&platformEvidence("microsoft",name,voiceURI)){
          matched=microsoftName(name)===voice.name||uriContainsName(voiceURI,voice.name);
        }else if(family.platform==="apple"){
          const hasOtherVendor=/microsoft|google/i.test(`${name||""} ${voiceURI||""}`);
          matched=!hasOtherVendor&&(appleName(name)===voice.name||(platformEvidence("apple",name,voiceURI)&&uriContainsName(voiceURI,voice.name)));
        }else if(family.platform==="google"&&platformEvidence("google",name,voiceURI)){
          matched=normalised===voice.name;
        }
        if(matched)return Object.freeze({sex:family.sex,source:"curated-name",platform:family.platform,name:voice.name});
      }
    }
    return Object.freeze({sex:"unknown",source:"unknown",platform:null,name:null});
  }
  function knownVoiceSex(name,voiceURI,lang){return knownVoiceSexDetails(name,voiceURI,lang).sex;}

  return Object.freeze({KNOWN_VOICE_FAMILIES,knownVoiceSex,knownVoiceSexDetails});
});
