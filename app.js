const $ = id => document.getElementById(id);
const APP = window.HEC_APP;
if(!APP?.version)throw new Error("HEC canonical configuration was not loaded");
const KEY = APP.storageKey;
const LEGACY_KEYS = APP.legacyMainKeys || [];
const VERSION = APP.version;
const COMPANIONS = window.HEC_COMPANIONS || [];
const VOICE_SYSTEM = window.HECCompanionVoices || null;
const STAGE4 = window.HECStage4 || null;
const WEIGHT_PROGRESS = window.HECWeightProgress || null;

const DEFAULTS = {
  version: VERSION,
  email: "",
  code: "",
  passwordSet: false,
  completed: false,
  preferences: { language: "en-AU", theme: "garden", inspirationIndex: 0 },
  personal: {
    givenName: "", surname: "", fullName: "", preferredName: "", preferredPronunciation: "", email: "", dob: "",
    energyUnit: "kJ", country: "Australia", region: "", postcode: "", suburb: "",
    streetAddress: "", mobile: "", mobileInternational: "", phone: "", phoneInternational: "",
    homeTimeZone: "", activeTimeZone: "", timeZoneBehaviour: "ask"
  },
  health: {
    sex: "", heightCm: 0, startingWeightKg: 0, currentWeightKg: 0,
    goal: "", lossRate: "recommended", fasting: "none", fastingDays: [],
    fastingEnergyKj: 2092, activity: 0, exerciseCredit: 0,
    selectedGoalWeight: 0, recommendedGoalWeight: 0, lastCalculationWeightKg: 0
  },
  recommendations: {},
  companion: {
    enabled: true, configured: false, id: "percy-pelican", character: "🐦", characterName: "Percy the Pelican",
    name: "Percy", gender: "male", customName: "", pronunciation: "", personality: "planner", voice: "", voiceStyleId: "calm-organised",
    speechEnabled: true, needsReselection: false, selectionStatus: "active"
  },
  heightUnit: "metric",
  weightUnit: "metric",
  goalMilestones: [],
  weightHistory: []
};

let data = clone(DEFAULTS);
let voices = [];
let voiceCatalog = null;
let editMode = null;
let returnToSettingsAfterRecommendations = false;

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function persistentId(prefix){ return window.HECMigrations?.createId?.(prefix) || `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`; }
function mergeDeep(target, source){
  if(!source || typeof source !== "object") return target;
  for(const [key, value] of Object.entries(source)){
    if(value && typeof value === "object" && !Array.isArray(value)){
      target[key] = mergeDeep(target[key] && typeof target[key] === "object" ? target[key] : {}, value);
    } else if(value !== undefined) target[key] = value;
  }
  return target;
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}
function validEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value).trim()); }
function selected(name){ return document.querySelector(`input[name="${name}"]:checked`)?.value || ""; }
function checkedValues(name){ return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value); }
function setRadio(name, value){
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if(el) el.checked = true;
}
function roundWhole(value){ return Math.round(Number(value) || 0); }
function roundWeight(value){ return Math.round((Number(value) || 0) * 10) / 10; }
function formatWeight(value){
  return roundWeight(value).toFixed(1);
}
function deviceTimeZone(){ try{return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Brisbane";}catch{return "Australia/Brisbane";} }
function activeTimeZone(){ return data?.personal?.activeTimeZone || data?.personal?.homeTimeZone || deviceTimeZone(); }
function zonedParts(date=new Date(), timeZone=activeTimeZone()){
  try{return Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));}catch{return {year:String(date.getFullYear()),month:String(date.getMonth()+1).padStart(2,"0"),day:String(date.getDate()).padStart(2,"0"),hour:String(date.getHours()),minute:String(date.getMinutes())};}
}
function todayISO(){ const z=zonedParts(); return `${z.year}-${z.month}-${z.day}`; }
window.HECDate={deviceTimeZone,activeTimeZone,zonedParts,todayISO};
function ageFromDob(value){
  return STAGE4?.ageFromDob(value,todayISO()) ?? NaN;
}
function displayName(){
  return (data.personal.preferredName || data.personal.fullName || "").trim().split(/\s+/)[0] || "";
}
function spokenUserName(){ return (data.personal.preferredPronunciation || displayName()).trim(); }
function companionDisplayName(){ return data.companion.customName || data.companion.name || data.companion.characterName || "Companion"; }
function spokenCompanionName(){ return (data.companion.pronunciation || data.companion.customName || data.companion.name || "Companion").trim(); }
function personaliseSpeech(text){
  return String(text || "")
    .replaceAll("{name}", spokenUserName())
    .replaceAll("{companion}", spokenCompanionName());
}
function toast(message){
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => element.classList.remove("show"), 2000);
}
function friendlyError(id, text, spoken, inputId){
  $(id).textContent = text;
  if(inputId) $(inputId)?.classList.add("invalid");
  speakText(spoken || text);
  return false;
}
function setInlineError(errorId,controls,message){
  const error=$(errorId);if(error)error.textContent=message||"";
  controls.filter(Boolean).forEach(control=>{
    control.setAttribute("aria-invalid",message?"true":"false");
    control.classList.toggle("invalid",!!message);
  });
}
function save(){ localStorage.setItem(KEY, JSON.stringify(data)); }

function migrateLegacy(legacy){
  const migrated = clone(DEFAULTS);
  migrated.email = legacy.email || "";
  migrated.code = legacy.code || "";
  migrated.passwordSet = !!legacy.passwordSet;
  migrated.completed = !!legacy.completed;

  const oldPersonal = legacy.personal || {};
  migrated.personal.fullName = oldPersonal.name || "";
  migrated.personal.preferredName = (oldPersonal.name || "").trim().split(/\s+/)[0] || "";
  migrated.personal.email = oldPersonal.email || legacy.email || "";
  migrated.personal.dob = oldPersonal.dob || "";
  migrated.personal.energyUnit = oldPersonal.energyUnit === "Calories" ? "Cal" : (oldPersonal.energyUnit || "kJ");
  migrated.personal.country = oldPersonal.country || "Australia";
  migrated.personal.streetAddress = oldPersonal.address || "";
  migrated.personal.mobile = oldPersonal.mobile || "";
  migrated.personal.phone = oldPersonal.phone || "";

  const oldHealth = legacy.health || {};
  migrated.health.sex = oldHealth.sex || "";
  migrated.health.heightCm = Number(oldHealth.heightCm) || 0;
  migrated.health.startingWeightKg = Number(oldHealth.weightKg) || 0;
  migrated.health.currentWeightKg = Number(oldHealth.weightKg) || 0;
  migrated.health.goal = oldHealth.goal || "";
  migrated.health.lossRate = oldHealth.lossRate === "faster" ? "fast" : (oldHealth.lossRate === "slow" ? "slow" : "recommended");
  migrated.health.fasting = oldHealth.fasting === "none" ? "none" : "custom";
  migrated.health.fastingDays = oldHealth.fasting === "52" ? ["Monday","Thursday"] : [];
  migrated.health.activity = Number(oldHealth.activity) || 0;
  migrated.health.exerciseCredit = Number(oldHealth.exerciseCredit) || 0;

  const oldRec = legacy.recommendations || {};
  migrated.recommendations = {...oldRec};
  migrated.health.recommendedGoalWeight = Number(oldRec.goalWeight) || 0;
  migrated.health.selectedGoalWeight = Number(oldRec.goalWeight) || 0;
  migrated.health.lastCalculationWeightKg = migrated.health.currentWeightKg;
  if(migrated.health.selectedGoalWeight){
    migrated.goalMilestones = [{weightKg:migrated.health.selectedGoalWeight, targetDate:""}];
  }

  const oldCompanion = legacy.companion || {};
  migrated.companion = mergeDeep(migrated.companion, oldCompanion);
  migrated.companion.enabled = true;
  migrated.companion.configured = true;
  migrated.preferences.theme = oldCompanion.theme || "garden";
  migrated.heightUnit = legacy.heightUnit || "metric";
  migrated.weightUnit = legacy.weightUnit || "metric";
  return migrated;
}
function normaliseCompanionRecord(record){
  const result = mergeDeep(clone(DEFAULTS.companion), record || {});
  const savedId=String(record?.id||"").trim();
  const id=String(result.id||"").toLowerCase();
  let selectedCompanion = COMPANIONS.find(item => item.id === id || (item.aliases||[]).some(alias=>String(alias).toLowerCase()===id));
  if(!selectedCompanion && !savedId){
    const oldName = String(result.name || result.characterName || "").toLowerCase();
    selectedCompanion = COMPANIONS.find(item => oldName.includes(item.name.toLowerCase()) || oldName.includes(item.species.toLowerCase()));
  }
  if(selectedCompanion){
    result.id = selectedCompanion.id;
    result.name = selectedCompanion.name;
    result.gender = selectedCompanion.gender;
    result.character = selectedCompanion.icon;
    result.characterName = `${selectedCompanion.name} the ${selectedCompanion.species}`;
    result.personality = selectedCompanion.personality;
    if(!String(result.voiceStyleId||"").trim())result.voiceStyleId=VOICE_SYSTEM?.defaultVoiceStyleId(selectedCompanion.id)||null;
  }else if(savedId){
    result.id=savedId;
    result.name=record?.name??"";
    result.gender=record?.gender??null;
    result.character=record?.character??"🧭";
    result.characterName=record?.characterName??record?.name??"";
    result.personality=record?.personality??"";
  }
  return result;
}
function loadStoredData(){
  try{
    const current = JSON.parse(localStorage.getItem(KEY));
    if(current){
      const loaded = mergeDeep(clone(DEFAULTS), current);
      loaded.companion = normaliseCompanionRecord(loaded.companion);
      return loaded;
    }
  }catch(error){}
  for(const key of LEGACY_KEYS){
    try{
      const legacy = JSON.parse(localStorage.getItem(key));
      if(legacy){
        const migrated = mergeDeep(clone(DEFAULTS), legacy);
        migrated.version = VERSION;
        migrated.companion = normaliseCompanionRecord(migrated.companion);
        return migrated;
      }
    }catch(error){}
  }
  const fresh = clone(DEFAULTS);
  fresh.companion = normaliseCompanionRecord(fresh.companion);
  return fresh;
}

const THEME_COLOURS = {garden:"#2e6d4d",coast:"#17759b",outback:"#a64f2b",classic:"#385f84"};
function applyTheme(theme = data.preferences.theme){
  const safe = THEME_COLOURS[theme] ? theme : "garden";
  data.preferences.theme = safe;
  document.body.dataset.theme = safe;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOURS[safe]);
  document.querySelectorAll("[data-theme-choice]").forEach(card => card.classList.toggle("selected", card.dataset.themeChoice === safe));
}
function applyLanguage(){
  document.documentElement.lang = data.preferences.language || "en-AU";
  setRadio("language", data.preferences.language || "en-AU");
}
function currentCompanionChoice(){
  const radio = selected("companion-choice");
  return $("companion")?.classList.contains("active") && radio ? radio === "yes" : !!data.companion.enabled;
}
function updateCompanionUI(){
  const enabled = currentCompanionChoice();
  $("companion-details")?.classList.toggle("hidden", !enabled);
  if($("companion-guide-copy")){
    $("companion-guide-copy").textContent = enabled
      ? "A Companion can explain, encourage and speak instructions. You can turn it off at any time."
      : "Healthy Eating Companion will use clear written instructions. You can turn the Companion on later in Settings.";
  }
  document.querySelectorAll(".companion-only").forEach(el => el.classList.toggle("hidden", !enabled));
  document.querySelectorAll(".live-avatar").forEach(el => el.textContent = enabled ? data.companion.character : "🧭");
  if($("setup-avatar")) $("setup-avatar").textContent = enabled ? data.companion.character : "🧭";
  renderCompanionVoiceStyles();
}
function show(id, {speak=true} = {}){
  // Alpha 0.6.32: allow the functional layer to cancel stale search/overlay
  // work before ANY screen switch, including data-go Home buttons that bypass
  // openAlpha05Feature.
  window.HECBeforeScreenShow?.(id);
  if(id!=="scan-centre")window.HECStopBarcodeCamera?.();
  window.speechSynthesis?.cancel?.();
  document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0,0);

  if($("language-back")) $("language-back").dataset.go = editMode === "language" ? "settings" : "welcome";
  if($("companion-back")) $("companion-back").dataset.go = editMode === "companion" ? "settings" : "password";
  if($("personal-back")) $("personal-back").dataset.go = editMode === "personal" ? "settings" : "companion";
  if($("health-back")) $("health-back").dataset.go = editMode === "health" ? "settings" : "personal";
  if(id === "personal") updateSurnameVisibility();

  applyTheme();
  applyLanguage();
  updateCompanionUI();
  if(id === "settings") renderSettings();
  if(id === "home") renderHome();
  if(id === "weight-checkin") renderWeightCheckin();

  const text = $(id).dataset.speech;
  if(speak && text && data.companion.enabled && data.companion.configured && data.companion.speechEnabled){
    setTimeout(() => speakText(personaliseSpeech(text)), 260);
  }
  if(id === "settings"){
    editMode = null;
    returnToSettingsAfterRecommendations = false;
  }
}

function companionVoiceResolution(companion=selectedCompanionDefinition()||data.companion,voiceStyleId=data.companion.voiceStyleId){
  if(VOICE_SYSTEM)return VOICE_SYSTEM.resolveCompanionVoice(companion,voiceStyleId,voices,{savedVoiceName:data.companion.voice});
  const chosen=voices.find(voice=>voice.name===data.companion.voice)||null;
  return {voice:chosen,voiceName:chosen?.name||"",voiceStyleId,rate:.96,pitch:1,pending:voices.length===0};
}
function selectedCompanionVoiceStyleId(companion=selectedCompanionDefinition()){
  const config=VOICE_SYSTEM?.voiceConfigFor(companion);
  if(!config)return null;
  const selectedStyle=selected("companion-voice-style");
  if(config.styles.some(style=>style.id===selectedStyle))return selectedStyle;
  return config.styles.some(style=>style.id===data.companion.voiceStyleId)?data.companion.voiceStyleId:config.defaultStyleId;
}
function updateCompanionVoiceStatus(companion=selectedCompanionDefinition()){
  const status=$("voice-style-status");
  if(!status)return;
  if(!("speechSynthesis" in window)){
    status.textContent="Voice preview is not supported by this browser. Your style choice will still be saved.";
    return;
  }
  status.textContent=voices.length
    ? `Ready to preview ${companion?.name||"your Companion"} using the best suitable voice on this device.`
    : "Your device is preparing its available voices. Your selected style will stay in place while they load.";
}
function renderCompanionVoiceStyles(){
  const fieldset=$("companion-voice-styles"),options=$("voice-style-options"),heading=$("companion-voice-heading");
  if(!fieldset||!options)return;
  const companion=selectedCompanionDefinition();
  const config=VOICE_SYSTEM?.voiceConfigFor(companion);
  const visible=currentCompanionChoice()&&!!config;
  fieldset.classList.toggle("hidden",!visible);
  if(!visible){options.innerHTML="";return;}
  const selectedStyleId=selectedCompanionVoiceStyleId(companion);
  if(heading)heading.textContent=`Choose ${companion.name}’s Voice`;
  options.innerHTML=config.styles.map((style,index)=>
    `<label class="voice-style-choice"><input type="radio" name="companion-voice-style" value="${escapeHtml(style.id)}" ${style.id===selectedStyleId?"checked":""}><span><strong>${escapeHtml(style.label)}</strong>${index===0?"<small>Recommended</small>":""}</span></label>`
  ).join("");
  options.querySelectorAll('input[name="companion-voice-style"]').forEach(input=>input.addEventListener("change",()=>{
    window.speechSynthesis?.cancel?.();
    updateCompanionVoiceStatus(companion);
  }));
  updateCompanionVoiceStatus(companion);
}
function initialiseCompanionVoices(){
  if(voiceCatalog||!("speechSynthesis" in window)||!VOICE_SYSTEM?.createVoiceCatalog)return;
  voiceCatalog=VOICE_SYSTEM.createVoiceCatalog(window.speechSynthesis,available=>{
    voices=available;
    renderCompanionVoiceStyles();
  });
  voiceCatalog.start();
}
function speakText(text, {force=false, allowWithoutCompanion=false,companion=null,voiceStyleId=null} = {}){
  if(!("speechSynthesis" in window)){
    toast("Spoken guidance is not supported by this browser.");
    return;
  }
  if(!force){
    if(!data.companion.enabled || !data.companion.configured || !data.companion.speechEnabled) return;
  }else if(!allowWithoutCompanion && !currentCompanionChoice()) return;

  const speechCompanion=companion||selectedCompanionDefinition()||data.companion;
  const resolution=companionVoiceResolution(speechCompanion,voiceStyleId||data.companion.voiceStyleId);
  if(VOICE_SYSTEM?.speakResolvedVoice){
    VOICE_SYSTEM.speakResolvedVoice(window.speechSynthesis,window.SpeechSynthesisUtterance,String(text||""),resolution,{language:data.preferences.language||"en-AU"});
    return;
  }
  const utterance=new SpeechSynthesisUtterance(String(text||""));
  if(resolution.voice)utterance.voice=resolution.voice;
  utterance.lang=resolution.voice?.lang||data.preferences.language||"en-AU";
  utterance.rate=resolution.rate;utterance.pitch=resolution.pitch;
  window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
}

const COUNTRY_CONFIG = {
  "Australia": {
    regionLabel:"State or territory", postcodeLabel:"Postcode", suburbLabel:"Suburb or town",
    postcodePlaceholder:"0000", phonePlaceholder:"0412 345 678",
    regions:["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"],
    postcode:/^\d{4}$/
  },
  "New Zealand": {
    regionLabel:"Region", postcodeLabel:"Postcode", suburbLabel:"Suburb or town",
    postcodePlaceholder:"0000", phonePlaceholder:"021 123 4567",
    regions:["Auckland","Bay of Plenty","Canterbury","Gisborne","Hawke's Bay","Manawatū-Whanganui","Marlborough","Nelson","Northland","Otago","Southland","Taranaki","Tasman","Waikato","Wellington","West Coast"],
    postcode:/^\d{4}$/
  },
  "United Kingdom": {
    regionLabel:"County or region", postcodeLabel:"Postcode", suburbLabel:"Town or city",
    postcodePlaceholder:"SW1A 1AA", phonePlaceholder:"07123 456789",
    regions:[], postcode:/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i
  },
  "United States": {
    regionLabel:"State", postcodeLabel:"ZIP code", suburbLabel:"City",
    postcodePlaceholder:"12345", phonePlaceholder:"(555) 123-4567",
    regions:["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"],
    postcode:/^\d{5}(?:-\d{4})?$/
  },
  "Canada": {
    regionLabel:"Province or territory", postcodeLabel:"Postal code", suburbLabel:"City",
    postcodePlaceholder:"A1A 1A1", phonePlaceholder:"(555) 123-4567",
    regions:["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"],
    postcode:/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i
  },
  "Other": {
    regionLabel:"State, province or region", postcodeLabel:"Postcode or postal code", suburbLabel:"Town or city",
    postcodePlaceholder:"", phonePlaceholder:"+00 000 000 000",
    regions:[], postcode:null
  }
};
const PROFILE_REGION_OPTIONS = {
  "Australia":[["Australian Capital Territory","ACT"],["New South Wales","NSW"],["Northern Territory","NT"],["Queensland","QLD"],["South Australia","SA"],["Tasmania","TAS"],["Victoria","VIC"],["Western Australia","WA"]],
  "New Zealand":[["Auckland","Auckland"],["Bay of Plenty","Bay of Plenty"],["Canterbury","Canterbury"],["Gisborne","Gisborne"],["Hawke's Bay","Hawke's Bay"],["Manawatū-Whanganui","Manawatū-Whanganui"],["Marlborough","Marlborough"],["Nelson","Nelson"],["Northland","Northland"],["Otago","Otago"],["Southland","Southland"],["Taranaki","Taranaki"],["Tasman","Tasman"],["Waikato","Waikato"],["Wellington","Wellington"],["West Coast","West Coast"]],
  "United States": COUNTRY_CONFIG["United States"].regions.map(x=>[x,x]),
  "Canada": COUNTRY_CONFIG.Canada.regions.map(x=>[x,x]),
  "United Kingdom": [["England","England"],["Northern Ireland","Northern Ireland"],["Scotland","Scotland"],["Wales","Wales"]],
  "Other": []
};
const AU_TIMEZONE_BY_REGION={ACT:"Australia/Sydney",NSW:"Australia/Sydney",NT:"Australia/Darwin",QLD:"Australia/Brisbane",SA:"Australia/Adelaide",TAS:"Australia/Hobart",VIC:"Australia/Melbourne",WA:"Australia/Perth"};
function profileRegionCode(){return $("profile-region")?.value||"";}
function updateProfileRegionOptions(preserve=true){
  const country=$("profile-country")?.value||"Australia",select=$("profile-region");if(!select)return;
  const prior=preserve?select.value:"",opts=PROFILE_REGION_OPTIONS[country]||[];
  const label=$("profile-region-label");if(label){const text=country==="Australia"?"State Or Territory":country==="United States"?"State":country==="Canada"?"Province Or Territory":country==="New Zealand"?"Region":country==="United Kingdom"?"Country": "State, Territory Or Province";label.childNodes[0].nodeValue=text;}
  select.innerHTML=`<option value="">Select</option>`+opts.map(([name,value])=>`<option value="${escapeHtml(value)}">${escapeHtml(name)}</option>`).join("");
  if(prior&&opts.some(([,value])=>value===prior))select.value=prior;
  if(country==="Australia"&&select.value&&AU_TIMEZONE_BY_REGION[select.value]&&$("home-timezone"))$("home-timezone").value=AU_TIMEZONE_BY_REGION[select.value];
}
function australianPostcodeMatchesRegion(postcode,region){
  if(!postcode||!region)return true;const p=Number(String(postcode).replace(/\D/g,""));if(!Number.isFinite(p))return false;
  const inRange=(a,b)=>p>=a&&p<=b;
  return ({ACT:inRange(200,299)||inRange(2600,2618)||inRange(2900,2920),NSW:inRange(1000,2599)||inRange(2619,2899)||inRange(2921,2999),NT:inRange(800,999),QLD:inRange(4000,4999)||inRange(9000,9999),SA:inRange(5000,5999),TAS:inRange(7000,7999),VIC:inRange(3000,3999)||inRange(8000,8999),WA:inRange(6000,6999)})[region] ?? true;
}
$("profile-country")?.addEventListener("change",()=>{updateProfileRegionOptions(false);if($("profile-country").value!=="Australia"&&$("home-timezone"))$("home-timezone").value=deviceTimeZone();});
$("profile-region")?.addEventListener("change",()=>{if($("profile-country")?.value==="Australia"&&AU_TIMEZONE_BY_REGION[profileRegionCode()]&&$("home-timezone"))$("home-timezone").value=AU_TIMEZONE_BY_REGION[profileRegionCode()];});
function suggestedCountryForLanguage(language){
  return {"en-AU":"Australia","en-NZ":"New Zealand","en-GB":"United Kingdom","en-US":"United States"}[language] || "Australia";
}
function updateCountryFields(){
  const country = $("country").value || "Other";
  const config = COUNTRY_CONFIG[country] || COUNTRY_CONFIG.Other;
  $("region-label").textContent = config.regionLabel;
  $("postcode-label").textContent = config.postcodeLabel;
  $("suburb-label").textContent = config.suburbLabel;
  $("postcode").placeholder = config.postcodePlaceholder;
  $("mobile").placeholder = config.phonePlaceholder;
  $("region-options").innerHTML = config.regions.map(region => `<option value="${escapeHtml(region)}"></option>`).join("");
  updateAddressPreview();
}
function formatPostcode(value, country){
  let result = String(value || "").trim().toUpperCase().replace(/\s+/g,"");
  if(country === "United Kingdom" && result.length > 3) result = result.slice(0,-3) + " " + result.slice(-3);
  if(country === "Canada" && result.length > 3) result = result.slice(0,3) + " " + result.slice(3,6);
  return result;
}
function validPostcode(value, country){
  if(!value) return true;
  const rule = (COUNTRY_CONFIG[country] || COUNTRY_CONFIG.Other).postcode;
  return !rule || rule.test(value.trim());
}
function updateAddressPreview(){
  if(!$("address-preview")) return;
  const country = $("country").value;
  const street = $("street-address").value.trim();
  const suburb = $("suburb").value.trim();
  const region = $("region").value.trim();
  const postcode = formatPostcode($("postcode").value, country);
  const parts = [];
  if(street) parts.push(street);
  const locality = [suburb, region, postcode].filter(Boolean).join(" ");
  if(locality) parts.push(locality);
  if(country) parts.push(country);
  $("address-preview").querySelector("p").textContent =
    parts.length > 1 || street || suburb || region || postcode ? parts.join(", ") : "No address entered yet.";
}
function phoneDigits(value){ return String(value || "").replace(/\D/g,""); }
function normaliseLocalDigits(value, country){
  let digits = phoneDigits(value);
  const prefixes = {"Australia":"61","New Zealand":"64","United Kingdom":"44","United States":"1","Canada":"1"};
  const prefix = prefixes[country];
  if(prefix && digits.startsWith(prefix)){
    digits = digits.slice(prefix.length);
    if(["Australia","New Zealand","United Kingdom"].includes(country)) digits = "0" + digits;
  }
  return digits;
}
function formatPhone(value, country){
  const digits = normaliseLocalDigits(value, country);
  if(!digits) return "";
  if(country === "Australia"){
    if(/^04\d{8}$/.test(digits)) return `${digits.slice(0,4)} ${digits.slice(4,7)} ${digits.slice(7)}`;
    if(/^0[2378]\d{8}$/.test(digits)) return `(${digits.slice(0,2)}) ${digits.slice(2,6)} ${digits.slice(6)}`;
  }
  if(country === "New Zealand"){
    if(/^02\d{7,9}$/.test(digits)) return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`.trim();
    if(/^0\d{8}$/.test(digits)) return `(${digits.slice(0,2)}) ${digits.slice(2,5)} ${digits.slice(5)}`;
  }
  if(country === "United Kingdom"){
    if(/^07\d{9}$/.test(digits)) return `${digits.slice(0,5)} ${digits.slice(5)}`;
    if(/^0\d{9,10}$/.test(digits)) return `${digits.slice(0,4)} ${digits.slice(4)}`;
  }
  if((country === "United States" || country === "Canada") && digits.length === 10){
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return String(value || "").trim().replace(/\s+/g," ");
}
function toInternationalPhone(value, country){
  const digits = normaliseLocalDigits(value, country);
  const prefixes = {"Australia":"61","New Zealand":"64","United Kingdom":"44","United States":"1","Canada":"1"};
  const prefix = prefixes[country];
  if(!digits) return "";
  if(!prefix) return "+" + digits;
  if(["Australia","New Zealand","United Kingdom"].includes(country) && digits.startsWith("0")) return "+" + prefix + digits.slice(1);
  return "+" + prefix + digits;
}
function validPhone(value, country){
  if(!value.trim()) return true;
  const digits = normaliseLocalDigits(value, country);
  if(country === "Australia") return /^(?:04\d{8}|0[2378]\d{8})$/.test(digits);
  if(country === "New Zealand") return /^0\d{7,10}$/.test(digits);
  if(country === "United Kingdom") return /^0\d{9,10}$/.test(digits);
  if(country === "United States" || country === "Canada") return digits.length === 10;
  return digits.length >= 7 && digits.length <= 15;
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-go]");
  if(nav){
    show(nav.dataset.go);
    return;
  }
  const repeat = event.target.closest(".speak-note");
  if(repeat){
    const screen = repeat.closest(".screen");
    const message = repeat.closest(".guide-note,.home-message")?.querySelector("p")?.textContent || screen?.dataset.speech || "";
    speakText(personaliseSpeech(message), {force:true});
  }
});

$("join-check").addEventListener("change", event => $("join-button").disabled = !event.target.checked);
$("join-button").addEventListener("click", () => show("language"));
$("cancel-button").addEventListener("click", () => show("goodbye"));

$("language-next").addEventListener("click", () => {
  const language = selected("language");
  if(!language) return friendlyError("language-error", "Please choose a language.", "Please choose a language before we continue.");
  const oldSuggested = suggestedCountryForLanguage(data.preferences.language);
  data.preferences.language = language;
  if(!data.personal.country || data.personal.country === oldSuggested) data.personal.country = suggestedCountryForLanguage(language);
  save();
  applyLanguage();
  if(editMode === "language"){
    editMode = null;
    populateForms();
    show("settings", {speak:false});
  }else show("register");
});

$("register-email").addEventListener("input", () => {
  const value = $("register-email").value;
  const okay = validEmail(value);
  $("register-email").classList.toggle("invalid", value.length > 2 && !okay);
  $("email-error").textContent = value.length > 2 && !okay ? "Please enter a valid email address." : "";
});
function generateCode(){
  data.code = String(Math.floor(100000 + Math.random() * 900000));
  $("preview-code").textContent = data.code.slice(0,3) + " " + data.code.slice(3);
}
$("send-code").addEventListener("click", () => {
  const email = $("register-email").value.trim();
  if(!validEmail(email)){
    return friendlyError("email-error", "Please enter a valid email address.", "It looks like that email address is not complete yet. Please check it and try again.", "register-email");
  }
  data.email = email;
  data.personal.email = email;
  generateCode();
  save();
  $("verify-message").textContent = `A six-digit verification code has been prepared for ${email}.`;
  $("verify-code").value = "";
  show("verify");
});
$("resend-code").addEventListener("click", () => {
  generateCode();
  save();
  toast("A new prototype code has been generated.");
  speakText("I have generated a new six digit code for you.");
});
$("verify-code").addEventListener("input", event => event.target.value = event.target.value.replace(/\D/g,"").slice(0,6));
$("verify-button").addEventListener("click", () => {
  if($("verify-code").value !== data.code){
    return friendlyError("code-error", "That code does not match. Check the six digits and try again.", "That code does not match yet. Please check all six digits and try again.", "verify-code");
  }
  $("code-error").textContent = "";
  show("password");
});
function passwordScore(value){
  let score = 0;
  if(value.length >= 8) score++;
  if(/[A-Za-z]/.test(value) && /\d/.test(value)) score++;
  if(/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if(/[^A-Za-z0-9]/.test(value)) score++;
  return score;
}
$("password-one").addEventListener("input", () => {
  const score = passwordScore($("password-one").value);
  const labels = ["Not entered","Weak","Fair","Good","Strong"];
  const widths = [0,25,50,75,100];
  const bar = $("password-strength").querySelector("span");
  bar.style.width = widths[score] + "%";
  bar.style.background = score < 2 ? "#ad4646" : score < 3 ? "#b88a2c" : "#3b7e58";
  $("password-strength").querySelector("small").textContent = labels[score];
});
$("password-next").addEventListener("click", () => {
  const first = $("password-one").value;
  const second = $("password-two").value;
  if(first.length < 8 || !/[A-Za-z]/.test(first) || !/\d/.test(first)){
    return friendlyError("password-error", "Use at least eight characters, including a letter and a number.", "Your password needs at least eight characters, including a letter and a number.");
  }
  if(first !== second){
    return friendlyError("password-error", "The passwords do not match. Please enter them again.", "It looks like your passwords do not match yet. Let us fix that together.");
  }
  data.passwordSet = true;
  save();
  show("companion", {speak:false});
});

function selectedCompanionDefinition(){
  return COMPANIONS.find(item => item.id === data.companion.id) || null;
}
function applyCompanionDefinition(definition){
  if(!definition) return;
  const changedCompanion=data.companion.id!==definition.id;
  data.companion.id = definition.id;
  data.companion.name = definition.name;
  data.companion.gender = definition.gender;
  data.companion.character = definition.icon;
  data.companion.characterName = `${definition.name} the ${definition.species}`;
  data.companion.personality = definition.personality;
  if(changedCompanion||!String(data.companion.voiceStyleId||"").trim())data.companion.voiceStyleId=VOICE_SYSTEM?.defaultVoiceStyleId(definition.id)||null;
  data.companion.needsReselection = false;
  data.companion.selectionStatus = "active";
  if(data.migrationState?.companionReselection?.required){
    data.migrationState.companionReselection.required=false;
    data.migrationState.companionReselection.resolvedAt ||= new Date().toISOString();
  }
}
function companionAltText(companion){return companion?`${companion.name} the ${companion.species}`:"Companion";}
function companionArtworkSource(companion,variant){return companion?window.companionArtwork?.(companion.id,variant)||null:null;}
function companionArtworkMarkup(companion,variant,className=""){
  if(!companion)return "";
  const source=companionArtworkSource(companion,variant),alt=companionAltText(companion);
  if(!source)return `<span class="companion-artwork-fallback ${escapeHtml(className)}" role="img" aria-label="${escapeHtml(alt)}">${escapeHtml(companion.icon)}</span>`;
  const sourceSet=window.companionArtworkSrcSet?.(companion.id,variant)||"";
  return `<img class="${escapeHtml(className)}" data-companion-artwork="${escapeHtml(companion.id)}" data-companion-variant="${escapeHtml(variant)}" src="${escapeHtml(source)}"${sourceSet?` srcset="${escapeHtml(sourceSet)}"`:""} alt="${escapeHtml(alt)}" decoding="async"><span class="companion-artwork-fallback ${escapeHtml(className)} hidden" aria-hidden="true">${escapeHtml(companion.icon)}</span>`;
}
function bindCompanionArtworkFallbacks(root=document){
  root.querySelectorAll?.("img[data-companion-artwork]").forEach(image=>{
    const fallback=image.nextElementSibling?.classList.contains("companion-artwork-fallback")?image.nextElementSibling:null;
    image.addEventListener("error",()=>{
      image.classList.add("hidden");image.removeAttribute("srcset");image.removeAttribute("src");
      if(fallback){fallback.classList.remove("hidden");fallback.removeAttribute("aria-hidden");fallback.setAttribute("role","img");fallback.setAttribute("aria-label",image.alt);}
    },{once:true});
  });
}
function setCompanionArtworkImage(image,companion,variant,fallback){
  if(!image)return false;
  const source=companionArtworkSource(companion,variant),sourceSet=companion?window.companionArtworkSrcSet?.(companion.id,variant)||"":"";
  const showFallback=()=>{
    image.classList.add("hidden");image.removeAttribute("srcset");image.removeAttribute("src");
    fallback?.classList.remove("hidden");
  };
  if(!source){image.alt="";showFallback();return false;}
  image.onerror=showFallback;
  image.alt=companionAltText(companion);
  if(sourceSet)image.srcset=sourceSet;else image.removeAttribute("srcset");
  image.src=source;image.classList.remove("hidden");fallback?.classList.add("hidden");
  return true;
}
function companionRoster(){
  const ids=window.HEC_COMPANION_ARTWORK_ROSTER||COMPANIONS.map(companion=>companion.id);
  return ids.map(id=>COMPANIONS.find(companion=>companion.id===id)).filter(Boolean);
}
let companionPreviewCandidateId = null;
function companionPreviewMarkup(companion,titleId="companion-preview-title"){
  if(!companion) return "";
  return `<div class="companion-preview-portrait">${companionArtworkMarkup(companion,"hero","companion-preview-image")}</div><div><span class="source-chip verified">Australian Companion</span><h3 id="${escapeHtml(titleId)}">${escapeHtml(companion.name)} the ${escapeHtml(companion.species)}</h3><p class="companion-tagline">${escapeHtml(companion.tagline)}</p><p><strong>Speaking Style:</strong> ${escapeHtml(companion.speakingStyle)}</p><p><strong>Especially Helpful With:</strong> ${companion.strengths.map(escapeHtml).join(" · ")}</p><blockquote>“${escapeHtml(companion.intro)}”</blockquote></div>`;
}
function renderCompanionPreview(){
  const companion = selectedCompanionDefinition();
  const panel = $("companion-preview");
  if(panel){panel.innerHTML = companion ? companionPreviewMarkup(companion) : "";bindCompanionArtworkFallbacks(panel);}
}
function closeCompanionPreviewModal(){
  $("companion-preview-modal")?.classList.add("hidden");
  companionPreviewCandidateId=null;
}
function openCompanionPreviewModal(companion){
  if(!companion)return;
  companionPreviewCandidateId=companion.id;
  const body=$("companion-preview-modal-body");
  if(body){body.innerHTML=companionPreviewMarkup(companion,"companion-preview-modal-title");bindCompanionArtworkFallbacks(body);}
  const choose=$("companion-preview-modal-choose");
  if(choose)choose.textContent=`Choose ${companion.name}`;
  $("companion-preview-modal")?.classList.remove("hidden");
}
function renderCharacters(){
  const grid = $("character-grid");
  if(!grid) return;
  grid.innerHTML = companionRoster().map(companion =>
    `<button type="button" class="character companion-card ${data.companion.id === companion.id ? "selected" : ""}" data-companion-id="${escapeHtml(companion.id)}" aria-pressed="${data.companion.id === companion.id}"><span class="companion-card-art">${companionArtworkMarkup(companion,"picker","companion-picker-image")}</span><span class="companion-card-copy"><strong>${escapeHtml(companion.name)}</strong><small>${escapeHtml(companion.species)}</small></span></button>`
  ).join("");
  bindCompanionArtworkFallbacks(grid);
  grid.querySelectorAll("[data-companion-id]").forEach(button => button.addEventListener("click", () => {
    const definition = COMPANIONS.find(item => item.id === button.dataset.companionId);
    openCompanionPreviewModal(definition);
  }));
  renderCompanionPreview();
}
$("companion-preview-modal-back")?.addEventListener("click",closeCompanionPreviewModal);
$("companion-preview-modal-close")?.addEventListener("click",closeCompanionPreviewModal);
$("companion-preview-modal")?.addEventListener("click",event=>{if(event.target===$("companion-preview-modal"))closeCompanionPreviewModal();});
$("companion-preview-modal-choose")?.addEventListener("click",()=>{
  const definition=COMPANIONS.find(item=>item.id===companionPreviewCandidateId);if(!definition)return;
  applyCompanionDefinition(definition);
  $("character-grid")?.querySelectorAll("[data-companion-id]").forEach(item=>{const chosen=item.dataset.companionId===definition.id;item.classList.toggle("selected",chosen);item.setAttribute("aria-pressed",String(chosen));});
  renderCompanionPreview();updateCompanionUI();save();closeCompanionPreviewModal();
});
function syncCompanionForm(){
  data.companion.enabled = selected("companion-choice") !== "no";
  applyCompanionDefinition(selectedCompanionDefinition());
  const companion=selectedCompanionDefinition();
  const voiceStyleId=selectedCompanionVoiceStyleId(companion);
  if(data.companion.enabled&&voiceStyleId)data.companion.voiceStyleId=voiceStyleId;
  const resolution=companionVoiceResolution(companion,voiceStyleId);
  if(!data.companion.voice&&resolution.voiceName)data.companion.voice=resolution.voiceName;
  data.companion.speechEnabled = $("speech-enabled")?.checked !== false;
  data.preferences.theme = document.body.dataset.theme || data.preferences.theme;
}
document.querySelectorAll('input[name="companion-choice"]').forEach(input => input.addEventListener("change", () => {
  updateCompanionUI();
  if(selected("companion-choice") === "no") window.speechSynthesis?.cancel?.();
}));
document.querySelectorAll("[data-theme-choice]").forEach(card => card.addEventListener("click", () => {
  data.preferences.theme = card.dataset.themeChoice;
  applyTheme();
}));
$("preview-voice")?.addEventListener("click", () => {
  const companion = selectedCompanionDefinition();
  const voiceStyleId=selectedCompanionVoiceStyleId(companion);
  speakText(companion?.intro || `Hello ${spokenUserName() || "there"}. I am ${spokenCompanionName()}.`, {force:true,allowWithoutCompanion:true,companion,voiceStyleId});
});
$("companion-next")?.addEventListener("click", () => {
  syncCompanionForm();
  data.companion.configured = true;
  $("companion-error").textContent = "";
  save();
  updateCompanionUI();
  if(editMode === "companion"){
    editMode = null;
    show("settings", {speak:false});
  }else{
    $("personal-email").value = data.email;
    show("personal");
  }
});

["street-address","suburb","region","postcode"].forEach(id => $(id).addEventListener("input", updateAddressPreview));
$("country").addEventListener("change", () => {
  updateCountryFields();
  $("postcode").value = formatPostcode($("postcode").value, $("country").value);
  if($("mobile").value) $("mobile").value = formatPhone($("mobile").value, $("country").value);
  if($("phone").value) $("phone").value = formatPhone($("phone").value, $("country").value);
});
$("postcode").addEventListener("blur", () => {
  $("postcode").value = formatPostcode($("postcode").value, $("country").value);
  updateAddressPreview();
});
["mobile","phone"].forEach(id => $(id).addEventListener("blur", () => {
  $(id).value = formatPhone($(id).value, $("country").value);
}));

$("preview-user-name")?.addEventListener("click", () => {
  const given = $("full-name").value.trim();
  const preferred = $("preferred-name").value.trim() || given;
  const pronunciation = $("preferred-pronunciation").value.trim() || preferred;
  if(!preferred) return friendlyError("personal-error", "Enter your given name before previewing it.", "Please enter your given name first.");
  speakText(`Hello ${pronunciation}.`, {force:true,allowWithoutCompanion:true});
});

function updateSurnameVisibility(){
  $("surname-field")?.classList.toggle("hidden",editMode!=="personal");
}
$("full-name")?.addEventListener("input",()=>{
  if($("full-name").value.trim())setInlineError("full-name-error",[$("full-name")],"");
});

$("personal-next").addEventListener("click", () => {
  const givenName = $("full-name").value.trim();
  const surname = $("surname")?.value.trim() || data.personal.surname || "";
  const preferredName = $("preferred-name").value.trim() || givenName;
  const email = (data.email || $("personal-email")?.value || "").trim();
  let error = "", spoken = "";
  setInlineError("full-name-error",[$("full-name")],givenName?"":"Enter your given name.");
  if(!givenName){ error = "Please enter your given name."; spoken = "Please enter your given name before we continue."; }
  else if(!validEmail(email)){ error = "Please check your email address."; spoken = "Please check your email address before we continue."; }
  if(error&&givenName){return friendlyError("personal-error", error, spoken);}
  if(error){
    $("full-name").scrollIntoView({behavior:"smooth",block:"center"});
    $("full-name").focus({preventScroll:true});
    return friendlyError("personal-error", error, spoken);
  }
  const profileCountry=$("profile-country")?.value||"Australia",profileRegion=$("profile-region")?.value||"",profilePostcode=$("profile-postcode")?.value.trim()||"";
  if(profileCountry==="Australia"&&profilePostcode&&!australianPostcodeMatchesRegion(profilePostcode,profileRegion)) return friendlyError("personal-error","That postcode does not appear to match the selected state or territory. Please check both entries.","Please check that your postcode matches the selected state or territory.");

  const chosenHomeTimeZone=$("home-timezone")?.value.trim() || data.personal.homeTimeZone || deviceTimeZone();
  data.personal = {
    ...data.personal,
    givenName,
    surname,
    fullName: [givenName,surname].filter(Boolean).join(" "),
    preferredName,
    preferredPronunciation: $("preferred-pronunciation").value.trim(),
    country: $("profile-country")?.value || data.personal.country || "Australia",
    region: $("profile-region")?.value || "",
    postcode: $("profile-postcode")?.value.trim() || "",
    homeTimeZone: chosenHomeTimeZone,
    activeTimeZone: data.personal.activeTimeZone || chosenHomeTimeZone,
    timeZoneBehaviour: STAGE4?.normaliseTimeZoneBehaviour($("timezone-behaviour")?.value) || "ask",
    email
  };
  data.email = email;
  save();
  if(editMode === "personal"){
    editMode = null;
    show("settings", {speak:false});
  }else show("health");
});

document.querySelectorAll(".segmented").forEach(group => group.addEventListener("click", event => {
  if(event.target.tagName !== "BUTTON") return;
  group.querySelectorAll("button").forEach(button => button.classList.toggle("active", button === event.target));
  const type = group.dataset.group;
  const value = event.target.dataset.value;
  if(type === "height-unit"){
    data.heightUnit = value;
    $("height-metric").classList.toggle("hidden", value !== "metric");
    $("height-imperial").classList.toggle("hidden", value !== "imperial");
    refreshVisibleHealthError("height");
  }else if(type === "weight-unit"){
    data.weightUnit = value;
    $("weight-metric").classList.toggle("hidden", value !== "metric");
    $("weight-imperial").classList.toggle("hidden", value !== "imperial");
    refreshVisibleHealthError("weight");
  }
}));
function updateGoalOptions(){
  const goal = selected("goal");
  $("goal-options").classList.toggle("hidden", !goal);
  $("loss-options").classList.toggle("hidden", goal !== "lose");
  if(goal === "maintain"){
    const current = getWeightKg();
    if(current) $("selected-goal-weight").value = formatWeight(current);
  }
}
document.querySelectorAll('input[name="goal"]').forEach(input => input.addEventListener("change", () => {
  const changedGoal=selected("goal");
  if(changedGoal !== data.health.goal) $("selected-goal-weight").value="";
  updateGoalOptions();
}));
function updateFastingOptions(){
  const custom = selected("fasting") === "custom";
  $("custom-fasting").classList.toggle("hidden", !custom);
}
document.querySelectorAll('input[name="fasting"]').forEach(input => input.addEventListener("change", updateFastingOptions));

function getHeightCm(){
  return data.heightUnit === "metric"
    ? Number($("height-cm").value)
    : Number($("height-ft").value) * 30.48 + Number($("height-in").value) * 2.54;
}
function getWeightKg(){
  return data.weightUnit === "metric"
    ? Number($("weight-kg").value)
    : Number($("weight-st").value) * 6.35029318 + Number($("weight-lb").value) * 0.45359237;
}
function fastingInputToKj(){
  const value = Number($("fasting-energy").value);
  if(!value) return 0;
  return data.personal.energyUnit === "Cal" ? roundWhole(value * 4.184) : roundWhole(value);
}
function fastingKjToDisplay(value){
  if(!value) return data.personal.energyUnit === "Cal" ? 500 : 2092;
  return data.personal.energyUnit === "Cal" ? roundWhole(value / 4.184) : roundWhole(value);
}
function energyDisplay(kj){
  if(!kj) return "Set manually";
  return data.personal.energyUnit === "Cal"
    ? `${roundWhole(kj / 4.184).toLocaleString()} Cal`
    : `${roundWhole(kj).toLocaleString()} kJ`;
}
function goalLabel(value){
  return value === "lose" ? "Lose weight" : value === "maintain" ? "Maintain weight" : value === "gain" ? "Gain weight" : "Not set";
}
function lossRateLabel(value){
  return value === "slow" ? "Slow & Steady" : value === "fast" ? "Fast" : "Recommended";
}
function recommendedGoalFor(goal, weightKg, healthyLow, healthyHigh){
  if(goal === "maintain") return roundWeight(weightKg);
  if(goal === "lose") return roundWhole(Math.max(healthyLow, Math.min(weightKg - 1, healthyHigh)));
  return roundWhole(Math.max(weightKg + 1, healthyLow));
}
function validateGoalWeight(goal, currentWeight, targetWeight, healthyLow){
  if(!targetWeight || targetWeight < 30 || targetWeight > 400) return "Please enter a valid selected goal weight.";
  if(goal === "lose" && targetWeight >= currentWeight) return "For a weight-loss goal, your selected goal must be below your current weight.";
  if(goal === "lose" && targetWeight < roundWhole(healthyLow)) return "The selected goal is below the healthy-range estimate used by this trial. Please choose a higher goal or seek professional guidance.";
  if(goal === "gain" && targetWeight <= currentWeight) return "For a weight-gain goal, your selected goal must be above your current weight.";
  if(goal === "maintain" && Math.abs(targetWeight - currentWeight) > 1) return "For a maintenance goal, choose a goal close to your current weight.";
  return "";
}
function calculateRecommendationSet({
  sex, heightCm, weightKg, goal, lossRate, activity, age, selectedGoalWeight
}){
  const bmiRaw = weightKg / ((heightCm / 100) ** 2);
  const healthyLowRaw = 18.5 * ((heightCm / 100) ** 2);
  const healthyHighRaw = 24.9 * ((heightCm / 100) ** 2);
  const recommendedGoalWeight = recommendedGoalFor(goal, weightKg, healthyLowRaw, healthyHighRaw);
  let energyKj = null;
  let bmrCal = null;
  let tdeeCal = null;
  let adjustmentCal = 0;
  let minimumCal = null;
  let targetCal = null;

  if(sex !== "manual"){
    bmrCal = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
    tdeeCal = bmrCal * activity;
    adjustmentCal = goal === "lose"
      ? (lossRate === "slow" ? -250 : lossRate === "fast" ? -750 : -500)
      : goal === "gain" ? 250 : 0;
    minimumCal = sex === "male" ? 1500 : 1200;
    targetCal = Math.max(tdeeCal + adjustmentCal, minimumCal);
    energyKj = Math.round((targetCal * 4.184) / 100) * 100;
  }

  // Alpha 0.6.12: keep the displayed macro targets inside a practical whole-day balance.
  // Weight-loss plans use a moderately higher protein share without allowing protein to consume nearly half of total energy.
  const targetCalories = energyKj ? energyKj / 4.184 : null;
  const proteinShare = goal === "lose" ? 0.25 : 0.20;
  const fatShare = 0.30;
  const protein = targetCalories ? roundWhole((targetCalories * proteinShare) / 4) : roundWhole(1.0 * weightKg);
  const fat = targetCalories ? roundWhole((targetCalories * fatShare) / 9) : roundWhole(0.8 * weightKg);
  const carbs = targetCalories ? Math.max(0, roundWhole((targetCalories - protein * 4 - fat * 9) / 4)) : 0;
  const chosenGoal = selectedGoalWeight || recommendedGoalWeight;
  const activityOptions = {1.2:"Mostly seated",1.375:"Lightly active",1.55:"Moderately active",1.725:"Very active",1.9:"Heavy physical work"};

  return {
    bmi: roundWeight(bmiRaw),
    healthyLow: roundWhole(healthyLowRaw),
    healthyHigh: roundWhole(healthyHighRaw),
    recommendedGoalWeight,
    selectedGoalWeight: roundWeight(chosenGoal),
    energyKj,
    protein,
    fat,
    carbs,
    basedOnWeightKg: roundWeight(weightKg),
    formulaName: "Mifflin–St Jeor",
    formulaVersion: "HEC-MSJ-1.0",
    bmrCal: bmrCal === null ? null : roundWhole(bmrCal),
    activityFactor: activity,
    activityLabel: activityOptions[activity] || "Manual activity factor",
    tdeeCal: tdeeCal === null ? null : roundWhole(tdeeCal),
    adjustmentCal,
    minimumCal,
    targetCal: targetCal === null ? null : roundWhole(targetCal),
    calculatedAt: new Date().toISOString()
  };
}
function collectHealthForm(){
  return {
    sex: $("calculation-sex").value,
    heightCm: getHeightCm(),
    weightKg: getWeightKg(),
    goal: selected("goal"),
    lossRate: selected("loss-rate") || "recommended",
    fasting: selected("fasting") || "none",
    fastingDays: checkedValues("fasting-day"),
    fastingEnergyKj: fastingInputToKj(),
    activity: Number($("activity").value),
    exerciseCredit: Number(selected("exercise-credit") || 0),
    selectedGoalWeight: selected("goal") === data.health.goal ? (Number($("selected-goal-weight").value) || 0) : 0
  };
}
const HEALTH_VALIDATION_ORDER=["dob","sex","height","weight","goal","activity"];
function healthFieldControls(field){
  if(field==="dob")return [$("dob")];
  if(field==="sex")return [$("calculation-sex")];
  if(field==="height")return data.heightUnit==="metric"?[$("height-cm")]:[$("height-ft"),$("height-in")];
  if(field==="weight")return data.weightUnit==="metric"?[$("weight-kg")]:[$("weight-st"),$("weight-lb")];
  if(field==="goal")return [...document.querySelectorAll('input[name="goal"]')];
  if(field==="activity")return [$("activity")];
  return [];
}
function healthValidationErrors(form=collectHealthForm()){
  return STAGE4.validateRecommendationFields({
    dob:$("dob").value,today:todayISO(),sex:form.sex,heightCm:form.heightCm,
    weightKg:form.weightKg,goal:form.goal,activity:form.activity
  });
}
function allHealthFieldControls(field){
  if(field==="height")return [$("height-cm"),$("height-ft"),$("height-in")];
  if(field==="weight")return [$("weight-kg"),$("weight-st"),$("weight-lb")];
  return healthFieldControls(field);
}
function renderHealthFieldError(field,message){
  const errorId=`${field==="sex"?"calculation-sex":field}-error`;
  setInlineError(errorId,allHealthFieldControls(field),"");
  setInlineError(errorId,healthFieldControls(field),message);
}
function firstHealthControl(field){return healthFieldControls(field).find(control=>control&&!control.closest(".hidden"))||healthFieldControls(field)[0];}
function focusFirstHealthError(errors){
  const field=HEALTH_VALIDATION_ORDER.find(name=>errors[name]);if(!field)return;
  const control=firstHealthControl(field);if(!control)return;
  control.focus({preventScroll:true});
  control.scrollIntoView({behavior:"smooth",block:"center"});
}
function refreshVisibleHealthError(field){
  const errorId=`${field==="sex"?"calculation-sex":field}-error`;
  if(!$(errorId)?.textContent)return;
  const errors=healthValidationErrors();renderHealthFieldError(field,errors[field]);
  if(!HEALTH_VALIDATION_ORDER.some(name=>errors[name]))$("health-error").textContent="";
}
$("dob")?.addEventListener("input",()=>refreshVisibleHealthError("dob"));
$("calculation-sex")?.addEventListener("change",()=>refreshVisibleHealthError("sex"));
["height-cm","height-ft","height-in"].forEach(id=>$(id)?.addEventListener("input",()=>refreshVisibleHealthError("height")));
["weight-kg","weight-st","weight-lb"].forEach(id=>$(id)?.addEventListener("input",()=>refreshVisibleHealthError("weight")));
document.querySelectorAll('input[name="goal"]').forEach(input=>input.addEventListener("change",()=>refreshVisibleHealthError("goal")));
$("activity")?.addEventListener("change",()=>refreshVisibleHealthError("activity"));
$("calculate-button").addEventListener("click", () => {
  data.personal.dob = $("dob").value;
  data.personal.energyUnit = $("energy-unit").value;
  const form = collectHealthForm();
  const age = ageFromDob(data.personal.dob);
  const errors=healthValidationErrors(form);
  HEALTH_VALIDATION_ORDER.forEach(field=>renderHealthFieldError(field,errors[field]));
  const firstError=HEALTH_VALIDATION_ORDER.find(field=>errors[field]);
  // Flexible fasting tools do not require permanent days or a fixed energy target during setup.
  if(firstError){
    focusFirstHealthError(errors);
    return friendlyError("health-error","Please correct the highlighted fields before calculating.",errors[firstError]);
  }
  $("health-error").textContent="";

  const preview = calculateRecommendationSet({
    sex: form.sex, heightCm: form.heightCm, weightKg: form.weightKg, goal: form.goal,
    lossRate: form.lossRate, activity: form.activity, age, selectedGoalWeight: form.selectedGoalWeight
  });
  const selectedError = validateGoalWeight(form.goal, form.weightKg, preview.selectedGoalWeight, preview.healthyLow);
  if(selectedError && form.selectedGoalWeight) return friendlyError("health-error", selectedError, selectedError);

  const startingWeight = data.health.startingWeightKg || form.weightKg;
  data.health = {
    ...data.health,
    sex: form.sex,
    heightCm: roundWeight(form.heightCm),
    startingWeightKg: roundWeight(startingWeight),
    currentWeightKg: roundWeight(form.weightKg),
    goal: form.goal,
    lossRate: form.lossRate,
    fasting: form.fasting,
    fastingDays: form.fasting === "custom" ? form.fastingDays : [],
    fastingEnergyKj: form.fasting === "custom" ? form.fastingEnergyKj : 0,
    activity: form.activity,
    exerciseCredit: form.exerciseCredit,
    selectedGoalWeight: preview.selectedGoalWeight,
    recommendedGoalWeight: preview.recommendedGoalWeight,
    lastCalculationWeightKg: roundWeight(form.weightKg)
  };
  data.recommendations = preview;
  if(form.goal === "maintain") data.goalMilestones = [];
  else if(!data.goalMilestones.length) data.goalMilestones = [];
  save();
  renderRecommendations();
  returnToSettingsAfterRecommendations = editMode === "health";
  show("recommendations");
});


function hydrationReference(){
  const status = String(data.dietary?.["pregnancy-status"] || "none").toLowerCase();
  if(status.includes("breast")) return {totalMl:2600, fluidsMl:2600, foodWaterMl:900, label:"Breastfeeding fluids reference"};
  if(status.includes("pregnant")) return {totalMl:2300, fluidsMl:2300, foodWaterMl:800, label:"Pregnancy fluids reference"};
  if(data.health.sex === "female") return {totalMl:2100, fluidsMl:2100, foodWaterMl:700, label:"Adult women fluids reference"};
  if(data.health.sex === "male") return {totalMl:2600, fluidsMl:2600, foodWaterMl:800, label:"Adult men fluids reference"};
  return {totalMl:2100, fluidsMl:2100, foodWaterMl:700, label:"General adult fluids reference"};
}

function renderRecommendations(){
  const r = data.recommendations;
  if(!r || !Object.keys(r).length) return;
  const items = [
    ["BMI Planning Estimate", formatWeight(r.bmi), "One screening measure only; it does not define your health"],
    ["Reference Weight Range", `${r.healthyLow}–${r.healthyHigh} kg`, "General BMI reference, not a compulsory destination"],
    ["HEC Suggested Starting Goal", `${formatWeight(r.recommendedGoalWeight)} kg`, "Guidance, not a compulsory target"],
    ["Daily Energy", energyDisplay(r.energyKj), `Based on ${formatWeight(r.basedOnWeightKg)} kg`],
    ["Daily Protein", `${roundWhole(r.protein)} g`, "Rounded starting estimate"],
    ["Daily Fat", `${roundWhole(r.fat)} g`, "Rounded starting estimate"],
    ["Daily Carbohydrate", r.carbs ? `${roundWhole(r.carbs)} g` : "Set manually", "Remaining energy estimate"]
  ];
  $("recommendation-grid").innerHTML = items.map(item =>
    `<div class="recommendation"><span>${escapeHtml(item[0])}</span><strong>${escapeHtml(item[1])}</strong><small>${escapeHtml(item[2])}</small></div>`
  ).join("");
  if($("calculation-breakdown")){
    if(r.targetCal){
      const adjustmentCal = Number(r.adjustmentCal) || 0;
      const minimumCal = Number(r.minimumCal) || 0;
      const bmrCal = roundWhole(r.bmrCal);
      const tdeeCal = roundWhole(r.tdeeCal);
      const finalCal = roundWhole(r.targetCal || (Number(r.energyKj)||0)/4.184);
      const adjustmentText = adjustmentCal === 0 ? "No goal adjustment" : `${adjustmentCal > 0 ? "+" : ""}${adjustmentCal.toLocaleString()} Cal goal adjustment`;
      const minimumText = minimumCal && finalCal === minimumCal ? ` The ${minimumCal.toLocaleString()} Cal founder-trial minimum was applied.` : "";
      $("calculation-breakdown").innerHTML = `<h3>How this energy figure was calculated</h3><div class="calculation-steps"><div><span>1 · Resting estimate</span><strong>${bmrCal ? `${bmrCal.toLocaleString()} Cal` : "Not available"}</strong><small>${escapeHtml(r.formulaName || "Calculation method")} · age, sex, height and weight</small></div><div><span>2 · Daily activity</span><strong>${r.activityFactor ? `× ${r.activityFactor}` : "Not available"}</strong><small>${escapeHtml(r.activityLabel || "Activity estimate")}${tdeeCal ? ` → ${tdeeCal.toLocaleString()} Cal maintenance estimate` : ""}</small></div><div><span>3 · Goal adjustment</span><strong>${escapeHtml(adjustmentText)}</strong><small>Selected goal: ${escapeHtml(goalLabel(data.health.goal))} · ${escapeHtml(lossRateLabel(data.health.lossRate))}</small></div><div><span>4 · Starting target</span><strong>${finalCal.toLocaleString()} Cal</strong><small>Final daily target after rounding.${escapeHtml(minimumText)}</small></div></div><p class="fine">Calculation record: ${escapeHtml(r.formulaVersion || "HEC calculation")}. You can adjust the target manually before accepting it.</p>`;
    }else{
      $("calculation-breakdown").innerHTML = `<h3>Energy target set manually</h3><p>You chose not to use the automatic sex-based calculation. Enter the daily energy target you want to use.</p>`;
    }
  }
  if($("micronutrient-grid")){
    const age = ageFromDob(data.personal.dob);
    const hydration = hydrationReference();
    const micros = [["Fibre", data.health.sex === "male" ? "30 g" : "25 g"],["Sodium Limit", "2,000 mg"],["Added Sugar Limit", "50 g"],["Calcium", age >= 70 ? "1,300 mg" : "1,000 mg"],["Iron", data.health.sex === "female" && age < 51 ? "18 mg" : "8 mg"],["Potassium", "3,500 mg"],["Magnesium", data.health.sex === "male" ? "420 mg" : "320 mg"],["Vitamin C", data.health.sex === "male" ? "90 mg" : "75 mg"],["Vitamin D", age >= 70 ? "20 µg" : "15 µg"],["Vitamin B12", "2.4 µg"],["Folate", "400 µg"]];
    $("micronutrient-grid").innerHTML = micros.map(x=>`<div class="recommendation"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]||"General Daily Reference"}</small></div>`).join("");
    if($("daily-fluid-recommendation"))$("daily-fluid-recommendation").innerHTML=`<div class="recommendation"><span>Daily Fluids</span><strong>${hydration.fluidsMl.toLocaleString()} mL</strong><small>Includes water and other logged drinks. Estimated moisture in solid food is shown separately.</small></div>`;
    data.recommendations.waterMl=hydration.totalMl;
    data.recommendations.fluidsMl=hydration.fluidsMl;
    data.recommendations.hydrationReference=hydration.label;
  }
  $("recommended-goal-display").textContent = `${formatWeight(r.recommendedGoalWeight)} kg`;
  $("review-selected-goal").value = formatWeight(data.health.selectedGoalWeight || r.selectedGoalWeight);
  $("manual-energy-unit").textContent = data.personal.energyUnit;
  $("manual-energy").value = data.personal.energyUnit === "Cal" && r.energyKj ? roundWhole(r.energyKj / 4.184) : (r.energyKj || "");
  $("manual-protein").value = r.protein || "";
  $("manual-fat").value = r.fat || "";
  $("manual-carbs").value = r.carbs || "";
  $("accept-recommendations").checked = false;
  $("recommendation-error").textContent = "";
  $("milestone-error").textContent = "";
  data.goalMilestones = [];
  if(!r.energyKj){
    $("manual-fields").classList.remove("hidden");
    $("accept-recommendations").checked = false;
  }else $("manual-fields").classList.add("hidden");
}
function renderMilestones(){
  const container = $("milestone-list");
  if(!data.goalMilestones.length){
    container.innerHTML = '<div class="empty-state">No future goal stages added yet. Your selected goal above is your current target.</div>';
    return;
  }
  container.innerHTML = data.goalMilestones.map((milestone, index) => `
    <div class="milestone-row" data-index="${index}">
      <label>Future stage ${index + 1} weight (kg)<input class="milestone-weight" type="number" min="30" max="400" step="0.1" value="${escapeHtml(formatWeight(milestone.weightKg || ""))}"></label>
      <label>Optional target date<input class="milestone-date" type="date" value="${escapeHtml(milestone.targetDate || "")}"></label>
      <button type="button" class="remove-milestone" aria-label="Remove future goal stage">Remove</button>
    </div>`).join("");
  container.querySelectorAll(".remove-milestone").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.closest(".milestone-row").dataset.index);
    data.goalMilestones.splice(index,1);
    renderMilestones();
  }));
}
$("add-milestone")?.addEventListener("click", () => {
  if(data.goalMilestones.length >= 5){
    toast("Up to five future goal stages can be added in this trial.");
    return;
  }
  data.goalMilestones.push({weightKg:"",targetDate:""});
  renderMilestones();
});
function collectMilestones(selectedGoalWeight){
  const rows = [...document.querySelectorAll(".milestone-row")];
  const milestones = rows.map(row => ({
    weightKg: Number(row.querySelector(".milestone-weight").value),
    targetDate: row.querySelector(".milestone-date").value
  }));
  let previous = selectedGoalWeight;
  for(let index=0; index<milestones.length; index++){
    const milestone = milestones[index];
    if(!milestone.weightKg || milestone.weightKg < 30 || milestone.weightKg > 400){
      return {error:`Please enter a valid weight for future stage ${index + 1}.`,milestones:[]};
    }
    if(data.health.goal === "lose" && milestone.weightKg >= previous){
      return {error:`Future stage ${index + 1} must be lower than the goal before it.`,milestones:[]};
    }
    if(data.health.goal === "gain" && milestone.weightKg <= previous){
      return {error:`Future stage ${index + 1} must be higher than the goal before it.`,milestones:[]};
    }
    previous = milestone.weightKg;
  }
  return {error:"", milestones:milestones.map(m => ({weightKg:roundWeight(m.weightKg),targetDate:m.targetDate}))};
}
$("manual-toggle").addEventListener("click", () => {
  $("manual-fields").classList.toggle("hidden");
  $("accept-recommendations").checked = false;
});
$("finish-setup").addEventListener("click", () => {
  const selectedGoalWeight = Number($("review-selected-goal").value);
  const goalError = validateGoalWeight(data.health.goal, data.health.currentWeightKg, selectedGoalWeight, data.recommendations.healthyLow);
  if(goalError) return friendlyError("milestone-error", goalError, goalError);

  const manual = !$("manual-fields").classList.contains("hidden");
  if(manual){
    const energy = Number($("manual-energy").value);
    const protein = Number($("manual-protein").value);
    const fat = Number($("manual-fat").value);
    const carbs = Number($("manual-carbs").value);
    if([energy,protein,fat,carbs].some(value => !value || value <= 0)){
      return friendlyError("recommendation-error", "Please enter a positive number in every manual field.", "Please complete every manual recommendation field with a positive number.");
    }
    data.recommendations.energyKj = data.personal.energyUnit === "Cal" ? roundWhole(energy * 4.184) : roundWhole(energy);
    data.recommendations.protein = roundWhole(protein);
    data.recommendations.fat = roundWhole(fat);
    data.recommendations.carbs = roundWhole(carbs);
  }else if(!$("accept-recommendations").checked){
    return friendlyError("recommendation-error", "Please accept the recommendations or choose manual adjustments.", "Please accept the recommendations, or choose manual adjustments before we continue.");
  }

  data.health.selectedGoalWeight = roundWeight(selectedGoalWeight);
  data.recommendations.selectedGoalWeight = roundWeight(selectedGoalWeight);
  data.recommendations.manual = manual;
  data.goalMilestones = [];
  data.completed = true;
  data.firstHomePending = false;
  data.profileStartedDate = data.profileStartedDate || todayISO();
  if(!data.weightHistory.length){
    const startingDate=todayISO();data.health.startingWeightDate=startingDate;
    const recordedAt=new Date().toISOString();
    data.weightHistory.push({id:persistentId("weight"),date:startingDate,weightKg:data.health.startingWeightKg,note:"Starting weight",isStartingWeight:true,timeZone:activeTimeZone(),recordedAt,createdAt:recordedAt,updatedAt:recordedAt});
  }
  save();
  if(returnToSettingsAfterRecommendations){
    returnToSettingsAfterRecommendations = false;
    editMode = null;
    show("settings", {speak:false});
   }else if(typeof window.openAlpha05Feature === "function") window.openAlpha05Feature("home");
  else show("home", {speak:false});
});

function greeting(){
  const hour = Number(zonedParts().hour);
  return hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
}
const HOME_GUIDANCE = [
  "Your plan is a flexible starting point. It can change as your life and progress change.",
  "You do not need a perfect day. Focus on the next helpful choice.",
  "Use Weight Check-in when your weight or selected goal changes.",
  "Planning tomorrow’s meals today can make healthy choices easier.",
  "A difficult meal does not spoil the whole day. Your next choice is a fresh start."
];
const INSPIRATION = [
  {type:"Joke",text:"Why did the tomato blush? It saw the salad dressing."},
  {type:"Healthy eating tip",text:"Build meals around foods you enjoy, then make small changes you can repeat."},
  {type:"Quote",text:"Progress grows from ordinary choices repeated often."},
  {type:"Food fact",text:"Frozen vegetables can be just as useful as fresh vegetables and are often easier to keep on hand."},
  {type:"Joke",text:"What is a vegetable’s favourite kind of music? Anything with a good beet."},
  {type:"Food thought",text:"One unplanned choice does not undo the helpful food choices you made before it."},
  {type:"Planning tip",text:"Deciding on lunch before the day becomes busy can reduce last-minute decisions."},
  {type:"Quote",text:"A realistic plan is more powerful than a perfect plan you cannot live with."},
  {type:"Food fact",text:"Protein and fibre can help a meal feel more satisfying."},
  {type:"Joke",text:"Why did the banana visit the doctor? It was not peeling well."},
  {type:"Hydration tip",text:"Keep water where you can see it. Visible reminders are easier to act on."},
  {type:"Food thought",text:"Today’s eating does not need to be flawless to be worthwhile."}
];
function currentDayIsFasting(){
  try{
    const functional = JSON.parse(localStorage.getItem(APP.functionalStorageKey)) || {};
    const date = todayISO();
    return functional.daySettings?.[date]?.type === "fasting";
  }catch(error){ return false; }
}
function homeMessage(){
  const name = displayName();
  const companion = selectedCompanionDefinition();
  if(data.companion.enabled){
    const support = currentDayIsFasting() && companion?.fasting ? companion.fasting : companion?.tagline || "Your plan is ready, and I’m here whenever you need guidance.";
    return `${greeting()}${name ? ", " + name : ""}. I’m ${companionDisplayName()}. ${support}`;
  }
  return `${greeting()}${name ? ", " + name : ""}. Your Healthy Eating Companion plan is ready. Written guidance is available throughout the app.`;
}
function renderHome(){
  const name = displayName();
  $("home-greeting").textContent = `${greeting()}${name ? ", " + name : ""}`;
  const lastWeight=[...(data.weightHistory||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
  $("home-summary").innerHTML = "";
  $("home-summary").classList.add("hidden");

  const enabled = data.companion.enabled;
  const avatar = enabled ? data.companion.character : "🥗";
  const companionDefinition = selectedCompanionDefinition();
  const portrait = $("home-avatar-image");
  const avatarFallback=$("home-avatar");
  avatarFallback.textContent = avatar;
  if(enabled&&companionDefinition)setCompanionArtworkImage(portrait,companionDefinition,"hero",avatarFallback);
  else{if(portrait){portrait.alt="";portrait.classList.add("hidden");portrait.removeAttribute("srcset");portrait.removeAttribute("src");}avatarFallback.classList.remove("hidden");}
  if($("message-avatar")) $("message-avatar").textContent = avatar;
  $("home-companion-name").textContent = enabled ? companionDisplayName() : "Healthy Eating Companion";
  if($("message-name")) $("message-name").textContent = enabled ? `${companionDisplayName()} Says` : "Healthy Eating Companion";
  $("home-companion-action").textContent = enabled ? "Tap for guidance" : "Tap for written guidance";
  $("home-companion").classList.toggle("no-companion", !enabled);
  const dayNumber = Math.floor(Date.now() / 86400000);
  const index = Math.abs(dayNumber) % INSPIRATION.length;
  const item = INSPIRATION[index];
  if($("message-type")) $("message-type").textContent = item.type;
  if($("message-text")) $("message-text").textContent = item.text;
  if($("home-companion-message")) $("home-companion-message").textContent = item.text;
  updateCompanionUI();
}
function personalityGuidance(companion){
  const bank={calm:["No rush. Pick one useful thing to do next and we’ll build from there.","A steady day beats a perfect one. Let’s keep the next choice simple."],encouraging:["You’re moving forward. Let’s make the next meal fit the day you actually have.","Good start. We can adjust the plan as the day changes."],steady:["Keep it practical. Familiar food and a clear portion are a perfectly good plan.","No fuss. Let’s sort the next meal and get on with the day."],thoughtful:["Let’s check the details that matter, then leave the rest alone.","A quick portion and ingredient check can make this much clearer."],loyal:["Busy day? I’m still here. We’ll adapt the plan instead of throwing it out.","Tell me what changed and we’ll work around it."],curious:["There may be an easy swap here. Want to see another way to build this meal?","Let’s find an option you’ll actually enjoy eating."],"light-hearted":["No food police here. Let’s find the next useful choice and keep moving.","A rough meal doesn’t ruin a good day. What’s next?"],social:["Tell me what’s happening today and we’ll fit the food around real life.","Eating with other people counts as real life, so let’s plan for it."],planner:["Let’s look at the whole day before we worry about one meal.","We can reserve room for the meal that matters most and build around it."],confident:["Let’s keep the non-negotiables clear and make the rest easy.","One clear decision at a time. I’ll flag anything that doesn’t fit."],energetic:["Let’s get the important bit sorted quickly and keep moving.","Quick win: choose the next meal, then we’re done here."],direct:["The numbers are information, not a drama. Let’s use them and move on.","Keep it realistic. We only need the next decision to make sense."],protective:["I’ll keep an eye on the restrictions that matter while you choose freely around them.","Safety first, then flexibility. Let’s check this one properly."],resourceful:["If the ideal option isn’t available, we’ll find the best realistic one.","There’s nearly always another workable option. Let’s find it."],relaxed:["No need to force it. A plan that feels natural is easier to keep.","Slow it down. One comfortable adjustment is enough."],patient:["There’s no rush. Steady choices are doing the work over time.","We’re looking for progress you can live with, not speed."]};
  const pool=bank[companion?.personality]||HOME_GUIDANCE;return pool[Math.floor(Math.random()*pool.length)];
}
$("home-companion").addEventListener("click", () => {
  const companion = selectedCompanionDefinition();
  const message = currentDayIsFasting() && companion?.fasting ? companion.fasting : personalityGuidance(companion);
  const full = data.companion.enabled ? `${displayName() ? displayName() + ", " : ""}${message}` : message;
  toast(full);
  if(data.companion.enabled) speakText(personaliseSpeech(full));
});
$("speak-home")?.addEventListener("click", () => speakText($("message-text")?.textContent || "", {force:true}));

document.querySelectorAll(".room").forEach(button => button.addEventListener("click", () => {
  const room = button.dataset.room;
  if(room === "settings"){ show("settings"); return; }
  if(room === "quick-weight"){ show("weight-checkin", {speak:false}); return; }
  if(room === "quick-food" && typeof window.openAlpha05Feature === "function"){ window.openAlpha05Feature("quick-log",{fromHome:true}); return; }
  if(room === "progress-weight"){
    if(typeof window.openAlpha05Feature === "function")window.openAlpha05Feature("progress-history",{fromHome:true,progressView:"weight"});
    else show("progress-history",{speak:false});
    return;
  }
  if(typeof window.openAlpha05Feature === "function"){
    if(room === "exercise-activity"){ window.openAlpha05Feature("exercise-log",{fromHome:true}); return; }
    if(room === "daily-progress"){ window.openAlpha05Feature("daily-progress",{fromHome:true}); return; }
    if(room === "diary"){ window.openAlpha05Feature("food-diary",{fromHome:true}); return; }
    if(room === "database"){ window.openAlpha05Feature("food-library",{fromHome:true}); return; }
    if(room === "meal-planner"){ window.openAlpha05Feature("meal-planner",{fromHome:true}); return; }
    if(room === "shopping-list"){ window.openAlpha05Feature("shopping-list",{fromHome:true}); return; }
  }
  const map = {
    "daily-progress":["Daily Progress","📊","Today’s progress is loading."],
    diary:["Food Diary & Day Plan","🍽️","Meal planning and food logging are loading."],
    database:["Australian Food Library","🥕","The food library is loading."],
    "meal-planner":["Meal Planner","🗓️","Meal planning is loading."],
    "shopping-list":["Shopping List","🛒","Your shopping list is loading."]
  };
  const [title,icon,copy] = map[room] || ["Healthy Eating Companion","🧭","This room is being prepared."];
  $("placeholder-title").textContent = title;
  $("placeholder-icon").textContent = icon;
  $("placeholder-copy").textContent = copy;
  show("placeholder");
}));

function formatSavedLocation(){
  const p=data.personal||{},country=p.country||"";
  let region=p.region||"";
  const match=(PROFILE_REGION_OPTIONS[country]||[]).find(([,value])=>value===region);if(match)region=match[0];
  const locality=[p.suburb,region,p.postcode].filter(Boolean).join(" ").trim();
  return [locality,country].filter(Boolean).join(", ")||"Location Not Set";
}
function renderSettings(){
  const companionText = data.companion.enabled
    ? `${escapeHtml(companionDisplayName())} ${data.companion.character}`
    : "Off — written guidance only";
  $("settings-summary").innerHTML = `
    <h3>${escapeHtml(data.personal.preferredName || data.personal.fullName || "Founder tester")}</h3>
    <div class="summary-grid">
      <div class="summary-item"><span>Language</span><strong>${escapeHtml(data.preferences.language)}</strong></div>
      <div class="summary-item"><span>Theme</span><strong>${escapeHtml(data.preferences.theme[0].toUpperCase() + data.preferences.theme.slice(1))}</strong></div>
      <div class="summary-item"><span>Email</span><strong>${escapeHtml(data.personal.email || data.email)}</strong></div>
      <div class="summary-item"><span>Location</span><strong>${escapeHtml(formatSavedLocation())}</strong></div>
      <div class="summary-item"><span>Companion</span><strong>${companionText}</strong></div>
      <div class="summary-item"><span>Goal</span><strong>${escapeHtml(goalLabel(data.health.goal))}: ${escapeHtml(formatWeight(data.health.selectedGoalWeight))} kg</strong></div>
      <div class="summary-item"><span>Current weight</span><strong>${escapeHtml(formatWeight(data.health.currentWeightKg))} kg</strong></div>
      <div class="summary-item"><span>Daily energy</span><strong>${escapeHtml(energyDisplay(data.recommendations.energyKj))}</strong></div>
      ${data.companion.enabled?`<div class="summary-item"><span>Spoken guidance</span><strong>${data.companion.speechEnabled ? "On" : "Off"}</strong></div>`:""}
    </div>`;
  $("toggle-companion").textContent = data.companion.enabled ? "Turn Companion off" : "Turn Companion on";
  $("toggle-speech").textContent = data.companion.speechEnabled ? "Turn spoken guidance off" : "Turn spoken guidance on";
  $("toggle-speech").disabled = !data.companion.enabled;
  $("toggle-speech").classList.toggle("hidden",!data.companion.enabled);
}
$("edit-language").addEventListener("click", () => {
  editMode = "language";
  populateForms();
  show("language", {speak:false});
});
$("edit-personal").addEventListener("click", () => {
  editMode = "personal";
  populateForms();
  show("personal");
});
$("edit-health").addEventListener("click", () => {
  editMode = "health";
  populateForms();
  show("health");
});
$("edit-companion").addEventListener("click", () => {
  editMode = "companion";
  populateForms();
  show("companion", {speak:false});
});
$("toggle-companion").addEventListener("click", () => {
  if(data.companion.enabled){
    data.companion.enabled = false;
    window.speechSynthesis?.cancel?.();
    save();
    renderSettings();
    toast("Companion turned off. The full app remains available with written guidance.");
  }else if(!data.companion.name){
    data.companion.enabled = true;
    setRadio("companion-choice","yes");
    editMode = "companion";
    populateForms();
    show("companion", {speak:false});
  }else{
    data.companion.enabled = true;
    data.companion.configured = true;
    save();
    renderSettings();
    toast("Companion turned on.");
    if(data.companion.speechEnabled) speakText(`Hello ${spokenUserName() || "there"}. ${spokenCompanionName()} is ready.`, {force:true});
  }
});
$("toggle-speech").addEventListener("click", () => {
  if(!data.companion.enabled) return;
  data.companion.speechEnabled = !data.companion.speechEnabled;
  $("speech-enabled").checked = data.companion.speechEnabled;
  save();
  renderSettings();
  toast(`Spoken guidance turned ${data.companion.speechEnabled ? "on" : "off"}.`);
  if(data.companion.speechEnabled) speakText("Spoken guidance is now on.", {force:true});
});

function recalculateFromStored(){
  const age = ageFromDob(data.personal.dob);
  const fresh = calculateRecommendationSet({
    sex:data.health.sex,
    heightCm:data.health.heightCm,
    weightKg:data.health.currentWeightKg,
    goal:data.health.goal,
    lossRate:data.health.lossRate,
    activity:data.health.activity,
    age,
    selectedGoalWeight:data.health.selectedGoalWeight
  });
  if(data.recommendations.manual){
    fresh.energyKj = data.recommendations.energyKj;
    fresh.protein = data.recommendations.protein;
    fresh.fat = data.recommendations.fat;
    fresh.carbs = data.recommendations.carbs;
    fresh.manual = true;
  }else fresh.manual = false;
  data.recommendations = fresh;
  data.health.recommendedGoalWeight = fresh.recommendedGoalWeight;
  data.health.lastCalculationWeightKg = data.health.currentWeightKg;
}
function latestApplicableWeightRecord(){
  if(WEIGHT_PROGRESS)return WEIGHT_PROGRESS.latestApplicable(data.weightHistory,todayISO());
  const today=todayISO();return [...(data.weightHistory||[])].filter(item=>item?.date&&item.date<=today&&Number(item.weightKg)>0).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.recordedAt||"").localeCompare(String(a.recordedAt||"")))[0]||null;
}
function nearestWeightRecordForDate(date){
  const target=new Date(`${date}T12:00:00`).getTime();return [...(data.weightHistory||[])].filter(item=>item?.date&&item.date!==date&&Number(item.weightKg)>0).sort((a,b)=>Math.abs(new Date(`${a.date}T12:00:00`).getTime()-target)-Math.abs(new Date(`${b.date}T12:00:00`).getTime()-target)||String(b.date).localeCompare(String(a.date)))[0]||null;
}
function friendlyWeightDate(value){
  if(!value)return "";
  return new Intl.DateTimeFormat("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date(`${value}T12:00:00`)).replace(",","");
}
function shiftWeightISO(value,days){const d=new Date(`${value||todayISO()}T12:00:00`);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function friendlyWeightRelativeDate(value){const today=todayISO();if(value===today)return `Today — ${friendlyWeightDate(value)}`;if(value===shiftWeightISO(today,-1))return `Yesterday — ${friendlyWeightDate(value)}`;if(value===shiftWeightISO(today,1))return `Tomorrow — ${friendlyWeightDate(value)}`;return friendlyWeightDate(value);}
function updateCheckinDateDisplay(){const value=$("checkin-date")?.value||todayISO(),relative=$("checkin-date-relative"),full=$("checkin-date-full");if(!relative||!full)return;const today=todayISO();relative.textContent=value===today?"Today":value===shiftWeightISO(today,-1)?"Yesterday":value===shiftWeightISO(today,1)?"Tomorrow":"Selected Date";full.textContent=friendlyWeightDate(value);}
function startingWeightRecord(){
  const profileStart=data.profileStartedDate||"",history=[...(data.weightHistory||[])].filter(item=>item?.date&&Number(item.weightKg)>0&&(!profileStart||item.date>=profileStart));if(!history.length)return null;
  const date=data.health?.startingWeightDate;if(date){const exact=history.find(item=>item.date===date&&(item.isStartingWeight||/starting weight/i.test(item.note||"")))||history.find(item=>item.date===date);if(exact)return exact;}
  const marked=history.filter(item=>item.isStartingWeight||/starting weight/i.test(item.note||"")).sort((a,b)=>String(a.recordedAt||"").localeCompare(String(b.recordedAt||"")));return marked[0]||history.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.recordedAt||"").localeCompare(String(b.recordedAt||"")))[0];
}
let lastSavedCheckinSnapshot = null;
let checkinSavePending = false;
function currentCheckinSnapshot(){return {date:$("checkin-date")?.value||todayISO(),weight:roundWeight(Number($("checkin-weight")?.value)||0),goal:roundWeight(Number($("checkin-goal")?.value)||0),note:$("checkin-note")?.value.trim()||""};}
function checkinSnapshotsEqual(a,b){return !!a&&!!b&&a.date===b.date&&Number(a.weight)===Number(b.weight)&&Number(a.goal)===Number(b.goal)&&(a.note||"")===(b.note||"");}
function setCheckinSaveState(saved){[$("save-checkin"),$("save-checkin-view")].filter(Boolean).forEach(button=>{button.disabled=!!saved||checkinSavePending;button.setAttribute("aria-busy",checkinSavePending?"true":"false");});}
function markCheckinDirty(){if(!lastSavedCheckinSnapshot)return;setCheckinSaveState(checkinSnapshotsEqual(currentCheckinSnapshot(),lastSavedCheckinSnapshot));}
function renderWeightCheckin(){
  const latest=latestApplicableWeightRecord();
  $("checkin-date").value = todayISO();
  const profileStart=data.profileStartedDate||data.health?.startingWeightDate||todayISO();
  $("checkin-date").min=profileStart;$("checkin-date").max=todayISO();updateCheckinDateDisplay();
  $("checkin-weight").value = formatWeight(latest?.weightKg || data.health.currentWeightKg || data.health.startingWeightKg);
  $("checkin-goal").value = formatWeight(data.health.selectedGoalWeight || data.health.recommendedGoalWeight);
  if($("checkin-note"))$("checkin-note").value="";
  $("checkin-error").textContent = "";
  $("checkin-result").classList.add("hidden");
  lastSavedCheckinSnapshot=null;setCheckinSaveState(false);
  renderWeightHistoryOnly();updateCompanionUI();
}
["checkin-weight","checkin-goal","checkin-note"].forEach(id=>$(id)?.addEventListener("input",markCheckinDirty));
$("checkin-date")?.addEventListener("input",()=>{updateCheckinDateDisplay();markCheckinDirty();});$("checkin-date")?.addEventListener("change",()=>{updateCheckinDateDisplay();markCheckinDirty();});
function openWeightProgressGraph(){
  if(typeof window.openAlpha05Feature==="function")window.openAlpha05Feature("progress-history",{progressView:"weight"});else show("progress-history",{speak:false});
}
function renderSavedCheckinResult(record,message,recommendationsUpdated){
  const updated=recommendationsUpdated?`<h4>Updated Recommendations</h4><p>${escapeHtml(message)} Current daily energy: ${escapeHtml(energyDisplay(data.recommendations.energyKj))}.</p>`:`<p>${escapeHtml(message)}</p>`;
  $("checkin-result").innerHTML=`<strong>Saved</strong>${updated}<div class="checkin-result-actions"><button class="primary" data-view-weight-graph type="button">View Weight Graph</button><button class="secondary" data-edit-weight-date="${escapeHtml(record.date)}" type="button">Edit Weight</button></div>`;
  $("checkin-result").classList.remove("hidden");
}
function saveCheckinSnapshot(snapshot,{outlierConfirmed=false,navigateAfter=false}={}){
  if(checkinSavePending)return {status:"pending"};
  checkinSavePending=true;setCheckinSaveState(false);
  const date=snapshot.date,weight=snapshot.weight,goal=snapshot.goal,note=snapshot.note||"Progress Check-In";
  const profileStart=data.profileStartedDate||data.health?.startingWeightDate||todayISO();
  const stop=(status,action)=>{checkinSavePending=false;setCheckinSaveState(checkinSnapshotsEqual(snapshot,lastSavedCheckinSnapshot));action?.();return {status};};
  const dateStatus=WEIGHT_PROGRESS?.validateDate(date,{profileStart,today:todayISO()});
  if(dateStatus==="invalid")return stop("invalid-date",()=>friendlyError("checkin-error","Please choose a valid Check-In Date.","Choose a valid date."));
  if(dateStatus==="future"||(!dateStatus&&date>todayISO()))return stop("future",()=>friendlyError("checkin-error","Future-dated weight check-ins are not allowed.","Choose today or an earlier date."));
  if(dateStatus==="before-profile"||(!dateStatus&&date<profileStart))return stop("before-profile",()=>friendlyError("checkin-error",`Weight entries cannot be dated before your Companion profile started on ${friendlyWeightDate(profileStart)}.`,`Choose your profile start date or later.`));
  if(checkinSnapshotsEqual(snapshot,lastSavedCheckinSnapshot))return stop("unchanged",()=>{toast("Already Saved — No Changes To Save");if(navigateAfter)openWeightProgressGraph();});
  if(!weight || weight < 30 || weight > 400)return stop("invalid-weight",()=>friendlyError("checkin-error", "Please enter a valid weight.", "Please check your weight."));
  const latestBefore=latestApplicableWeightRecord(),currentWeightBefore=Number(latestBefore?.weightKg || data.health.currentWeightKg || weight);
  const goalError = validateGoalWeight(data.health.goal, currentWeightBefore, goal, data.recommendations.healthyLow || 0);if(goalError)return stop("invalid-goal",()=>friendlyError("checkin-error", goalError, goalError));
  const existing = data.weightHistory.find(item => item.date === date);
  const nearby=nearestWeightRecordForDate(date),signedDifference=nearby?roundWeight(Number(weight)-Number(nearby.weightKg)):0,nearbyDifference=Math.abs(signedDifference);
  if(nearby&&nearbyDifference>2.0&&!outlierConfirmed){
    const title="That Weight Looks Quite Different";
    const copy=`Your nearest recorded weight is ${formatWeight(nearby.weightKg)} kg on ${friendlyWeightRelativeDate(nearby.date)}. You entered ${formatWeight(weight)} kg, a change of ${signedDifference>0?"+":""}${formatWeight(signedDifference)} kg. Please check that the new weight is correct.`;
    const extra=`<div class="weight-warning-comparison"><div><span>Nearest Weight</span><strong>${escapeHtml(formatWeight(nearby.weightKg))} kg</strong><small>${escapeHtml(friendlyWeightRelativeDate(nearby.date))}</small></div><div><span>Entered Weight</span><strong>${escapeHtml(formatWeight(weight))} kg</strong><small>Change ${signedDifference>0?"+":""}${escapeHtml(formatWeight(signedDifference))} kg</small></div></div><p class="fine">A large change can be genuine. This check is only here to catch typing mistakes before they affect your progress and recommendations.</p>`;
    checkinSavePending=false;setCheckinSaveState(false);
    if(typeof window.HECOpenModal==="function"){
      window.HECOpenModal(title,copy,`Yes, Save ${formatWeight(weight)} kg`,()=>saveCheckinSnapshot(snapshot,{outlierConfirmed:true,navigateAfter}),extra);
      const cancel=$("a05-modal-cancel");if(cancel)cancel.textContent="No, Let Me Correct It";
    }else if(confirm(`${copy}\n\nIs ${formatWeight(weight)} kg correct?`))saveCheckinSnapshot(snapshot,{outlierConfirmed:true,navigateAfter});
    else $("checkin-weight")?.focus();
    return {status:"confirmation-required"};
  }
  if(existing && Number(existing.weightKg)===Number(weight) && (existing.note||"Progress Check-In")===note && Number(data.health.selectedGoalWeight||goal)===Number(goal)){
    lastSavedCheckinSnapshot=snapshot;return stop("unchanged",()=>{toast("Already Saved — No Changes To Save");if(navigateAfter)openWeightProgressGraph();});
  }
  const persist=()=>{
    const recordedAt=new Date().toISOString();
    const upsert=WEIGHT_PROGRESS?.upsertWeightRecord(data.weightHistory,{date,weightKg:weight,note},{id:persistentId("weight"),now:recordedAt,timeZone:activeTimeZone()});
    if(upsert?.record)data.weightHistory=upsert.records;
    else if(existing){const originalRecordedAt=existing.recordedAt;existing.id ||= persistentId("weight");existing.createdAt ||= originalRecordedAt||recordedAt;existing.weightKg=roundWeight(weight);existing.note=note;existing.timeZone=activeTimeZone();existing.recordedAt=recordedAt;existing.updatedAt=recordedAt;}
    else data.weightHistory.push({id:persistentId("weight"),date,weightKg:roundWeight(weight),note,timeZone:activeTimeZone(),recordedAt,createdAt:recordedAt,updatedAt:recordedAt});
    const savedRecord=upsert?.record||(data.weightHistory||[]).find(item=>item.date===date);
    const latestAfter=latestApplicableWeightRecord(),latestWeight=Number(latestAfter?.weightKg || data.health.currentWeightKg || weight),savedIsCurrent=!!latestAfter&&latestAfter.date===date,previousCalculationWeight=Number(data.health.lastCalculationWeightKg||currentWeightBefore||latestWeight),goalChanged=Math.abs(goal-Number(data.health.selectedGoalWeight||0))>=0.1,meaningfulCurrentWeightChange=savedIsCurrent&&Math.abs(latestWeight-previousCalculationWeight)>=1;
    data.health.currentWeightKg=roundWeight(latestWeight);data.health.selectedGoalWeight=roundWeight(goal);data.recommendations.selectedGoalWeight=roundWeight(goal);
    let message,recommendationsUpdated=false;
    if(meaningfulCurrentWeightChange||goalChanged){recalculateFromStored();recommendationsUpdated=true;message=data.recommendations.manual?"Your health estimates were refreshed while your manual targets were retained.":`Recommendations were recalculated using ${formatWeight(latestWeight)} kg.`;}
    else if(!savedIsCurrent)message=`Historical weight saved for ${friendlyWeightRelativeDate(date)}. Your current weight remains ${formatWeight(latestWeight)} kg because a newer entry exists.`;
    else message="Your recommendations stayed steady because the current change was less than 1 kg.";
    save();lastSavedCheckinSnapshot=currentCheckinSnapshot();checkinSavePending=false;setCheckinSaveState(true);renderSavedCheckinResult(savedRecord,message,recommendationsUpdated);renderWeightHistoryOnly();if(data.companion.enabled)speakText("Weight and date saved.");if(navigateAfter)openWeightProgressGraph();
    return {status:"saved",record:savedRecord,recommendationsUpdated};
  };
  if(existing && Number(existing.weightKg)!==Number(weight)){
    if(confirm(`A weight is already recorded for ${friendlyWeightRelativeDate(date)}. Replace ${formatWeight(existing.weightKg)} kg with ${formatWeight(weight)} kg?`))return persist();
    return stop("cancelled");
  }
  return persist();
}
$("save-checkin")?.addEventListener("click", () => saveCheckinSnapshot(currentCheckinSnapshot()));
$("save-checkin-view")?.addEventListener("click", () => saveCheckinSnapshot(currentCheckinSnapshot(),{navigateAfter:true}));

function renderWeightHistoryOnly(){
  const history=[...(data.weightHistory||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.recordedAt||"").localeCompare(String(a.recordedAt||"")));
  const latest=latestApplicableWeightRecord(),start=startingWeightRecord();
  const change=latest&&start?roundWeight(Number(latest.weightKg)-Number(start.weightKg)):0;
  const summary=latest?`<div class="weight-history-summary"><div><span>Current Weight</span><strong>${escapeHtml(formatWeight(latest.weightKg))} kg</strong></div><div><span>Goal Weight</span><strong>${escapeHtml(formatWeight(data.health.selectedGoalWeight))} kg</strong></div><div><span>Change Since Start</span><strong>${change>0?"+":""}${escapeHtml(formatWeight(change))} kg</strong></div><div><span>Last Recorded</span><strong>${escapeHtml(friendlyWeightRelativeDate(latest.date))}</strong></div></div>`:"";
  const rows=items=>items.map(item=>`<button type="button" class="weight-history-row" data-edit-weight-date="${escapeHtml(item.date)}"><span><strong>${escapeHtml(friendlyWeightRelativeDate(item.date))}</strong><small>${escapeHtml(item.note||"")}</small></span><b>${escapeHtml(formatWeight(item.weightKg))} kg</b><em>Edit</em></button>`).join("");
  $("weight-history").innerHTML=history.length?`${summary}<h4>Recent Weight Entries</h4>${rows(history.slice(0,5))}${history.length>5?`<details class="weight-history-all"><summary>View All Weight History (${history.length})</summary>${rows(history.slice(5))}</details>`:""}`:'<div class="empty-state">No weight check-ins have been recorded yet.</div>';
}
document.addEventListener("click",event=>{
  const view=event.target.closest("[data-view-weight-graph]");if(view){event.preventDefault();openWeightProgressGraph();return;}
  const add=event.target.closest("[data-open-weight-checkin]");if(add){event.preventDefault();show("weight-checkin",{speak:false});return;}
  const row=event.target.closest("[data-edit-weight-date]");if(!row)return;
  const item=(data.weightHistory||[]).find(x=>x.date===row.dataset.editWeightDate);if(!item)return;
  if(!$("weight-checkin")?.classList.contains("active"))show("weight-checkin",{speak:false});
  $("checkin-date").value=item.date;updateCheckinDateDisplay();$("checkin-weight").value=formatWeight(item.weightKg);if($("checkin-note"))$("checkin-note").value=item.note||"";
  $("checkin-result").innerHTML=`<strong>Editing Historical Entry</strong><p>Saving ${escapeHtml(friendlyWeightDate(item.date))} will not replace your current weight if a newer dated entry exists.</p>`;$("checkin-result").classList.remove("hidden");
  lastSavedCheckinSnapshot=null;setCheckinSaveState(false);
  $("checkin-date").scrollIntoView({behavior:"smooth",block:"center"});
});

function populateForms(){
  applyTheme();
  applyLanguage();

  $("register-email").value = data.email || "";
  $("personal-email").value = data.personal.email || data.email || "";
  $("full-name").value = data.personal.givenName || data.personal.fullName || "";
  if($("surname")) $("surname").value = data.personal.surname || "";
  $("preferred-name").value = data.personal.preferredName || "";
  $("preferred-pronunciation").value = data.personal.preferredPronunciation || "";
  if($("profile-country")) $("profile-country").value=data.personal.country||"Australia";
  updateProfileRegionOptions(false);
  if($("profile-region")) $("profile-region").value=data.personal.region||"";
  updateProfileRegionOptions(true);
  if($("profile-postcode")) $("profile-postcode").value=data.personal.postcode||"";
  if($("home-timezone")) $("home-timezone").value=data.personal.homeTimeZone||deviceTimeZone();
  if($("timezone-behaviour")) $("timezone-behaviour").value=STAGE4?.normaliseTimeZoneBehaviour(data.personal.timeZoneBehaviour)||"ask";
  if($("detected-timezone")) $("detected-timezone").textContent=`Device time zone: ${deviceTimeZone()}`;
  $("dob").value = data.personal.dob || "";
  const dobLimits=STAGE4?.dobBounds(todayISO());
  if(dobLimits){$("dob").min=dobLimits.min;$("dob").max=dobLimits.max;$("dob").dataset.pickerStart=dobLimits.pickerStart;}
  $("energy-unit").value = data.personal.energyUnit || "kJ";

  $("country").value = data.personal.country || suggestedCountryForLanguage(data.preferences.language);
  $("region").value = data.personal.region || "";
  $("postcode").value = data.personal.postcode || "";
  $("suburb").value = data.personal.suburb || "";
  $("street-address").value = data.personal.streetAddress || "";
  $("mobile").value = data.personal.mobile || "";
  $("phone").value = data.personal.phone || "";
  updateCountryFields();

  data.companion = normaliseCompanionRecord(data.companion);
  setRadio("companion-choice", data.companion.enabled ? "yes" : "no");
  if($("speech-enabled")) $("speech-enabled").checked = data.companion.speechEnabled !== false;

  $("calculation-sex").value = data.health.sex || "";
  const height = Number(data.health.heightCm) || 0;
  $("height-cm").value = height ? formatWeight(height) : "";
  if(height){
    const totalInches = height / 2.54;
    $("height-ft").value = Math.floor(totalInches / 12);
    $("height-in").value = roundWeight(totalInches % 12);
  }else{
    $("height-ft").value = "";
    $("height-in").value = "";
  }

  const weight = Number(data.health.currentWeightKg || data.health.startingWeightKg) || 0;
  $("weight-kg").value = weight ? formatWeight(weight) : "";
  if(weight){
    const totalPounds = weight / 0.45359237;
    $("weight-st").value = Math.floor(totalPounds / 14);
    $("weight-lb").value = roundWeight(totalPounds % 14);
  }else{
    $("weight-st").value = "";
    $("weight-lb").value = "";
  }

  document.querySelectorAll('[data-group="height-unit"] button').forEach(button => button.classList.toggle("active", button.dataset.value === data.heightUnit));
  document.querySelectorAll('[data-group="weight-unit"] button').forEach(button => button.classList.toggle("active", button.dataset.value === data.weightUnit));
  $("height-metric").classList.toggle("hidden", data.heightUnit !== "metric");
  $("height-imperial").classList.toggle("hidden", data.heightUnit !== "imperial");
  $("weight-metric").classList.toggle("hidden", data.weightUnit !== "metric");
  $("weight-imperial").classList.toggle("hidden", data.weightUnit !== "imperial");

  setRadio("goal", data.health.goal);
  setRadio("loss-rate", data.health.lossRate || "recommended");
  setRadio("fasting", data.health.fasting || "none");
  setRadio("exercise-credit", String(data.health.exerciseCredit || 0));
  $("selected-goal-weight").value = data.health.selectedGoalWeight ? formatWeight(data.health.selectedGoalWeight) : "";
  $("activity").value = data.health.activity || "";
  document.querySelectorAll('input[name="fasting-day"]').forEach(input => input.checked = (data.health.fastingDays || []).includes(input.value));
  $("fasting-unit-label").textContent = data.personal.energyUnit || "kJ";
  $("fasting-energy").value = fastingKjToDisplay(data.health.fastingEnergyKj);
  $("weight-legend").textContent = data.completed ? "Current weight *" : "Starting weight *";
  updateGoalOptions();
  updateFastingOptions();

  renderCharacters();
  renderCompanionVoiceStyles();
  updateCompanionUI();
  updateAddressPreview();
  if(Object.keys(data.recommendations || {}).length) renderRecommendations();
}

data = loadStoredData();
data.version = VERSION;
if(data.personal.energyUnit === "Calories") data.personal.energyUnit = "Cal";
if(!data.personal.givenName && data.personal.fullName) data.personal.givenName = data.personal.fullName.trim().split(/\s+/)[0];
if(data.personal.surname===undefined) data.personal.surname="";
if(!data.personal.homeTimeZone) data.personal.homeTimeZone=deviceTimeZone();
if(!data.personal.activeTimeZone) data.personal.activeTimeZone=data.personal.homeTimeZone;
if(!data.personal.timeZoneBehaviour) data.personal.timeZoneBehaviour="ask";
if(!data.personal.fullName && data.personal.givenName) data.personal.fullName = data.personal.givenName;
if(!data.personal.preferredName && (data.personal.givenName || data.personal.fullName)) data.personal.preferredName = (data.personal.givenName || data.personal.fullName).trim().split(/\s+/)[0];
data.companion = normaliseCompanionRecord(data.companion);
if(!data.preferences) data.preferences = clone(DEFAULTS.preferences);
if(!data.goalMilestones) data.goalMilestones = [];
if(!data.weightHistory) data.weightHistory = [];
if(!data.health.startingWeightDate){const start=startingWeightRecord();if(start)data.health.startingWeightDate=start.date;}
applyTheme();
initialiseCompanionVoices();
populateForms();
save();
if(data.completed) show("home", {speak:false}); // alpha06.js immediately opens Daily Progress once functional data is ready.
else show("welcome", {speak:false});

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  let refreshingForNewWorker=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(refreshingForNewWorker)return;refreshingForNewWorker=true;location.reload();});
  if(window.HECInstallation?.isOriginSafe(APP,location.origin))navigator.serviceWorker.register(`service-worker.js?v=${encodeURIComponent(VERSION)}&role=${encodeURIComponent(APP.installationRole)}`,{scope:APP.serviceWorkerScope,updateViaCache:"none"}).then(reg=>reg.update()).catch(() => {});
}

/* Alpha 0.6.23 — compact companion message card below the Home circle. */
(function alpha0622CompanionMessageCard(){
  let last=-1;
  function categoryMatches(item,category){
    const t=String(item?.type||'').toLowerCase();
    if(!category||category==='mix')return true;
    if(category==='tip')return /tip|thought|planning|hydration/.test(t);
    if(category==='quote')return /quote/.test(t);
    if(category==='joke')return /joke/.test(t);
    if(category==='fact')return /fact/.test(t);
    if(category==='encouragement')return /thought|quote/.test(t);
    return true;
  }
  function nextMessage(){
    const category=$('inspiration-category')?.value||'mix',pool=INSPIRATION.map((x,i)=>({x,i})).filter(v=>categoryMatches(v.x,category));
    if(!pool.length)return;let pick=pool[Math.floor(Math.random()*pool.length)];if(pool.length>1&&pick.i===last)pick=pool[(pool.findIndex(v=>v.i===pick.i)+1)%pool.length];last=pick.i;
    if($('message-type'))$('message-type').textContent=pick.x.type;if($('message-text'))$('message-text').textContent=pick.x.text;
  }
  $('inspiration-category')?.addEventListener('change',e=>{e.stopPropagation();nextMessage();});
  $('inspiration-card')?.addEventListener('click',e=>{if(e.target.closest('select,button'))return;nextMessage();});
  $('inspiration-card')?.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('select,button')){e.preventDefault();nextMessage();}});
})();
