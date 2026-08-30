(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.HECStage4=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";

  const MINIMUM_AGE=18;
  const MAXIMUM_AGE=100;
  const DATE_PATTERN=/^(\d{4})-(\d{2})-(\d{2})$/;
  const ONBOARDING_STEPS=Object.freeze(["register","verify","password","companion","personal","health","recommendations"]);
  const AUSTRALIAN_TIME_ZONES=Object.freeze([
    "Australia/Adelaide","Australia/Brisbane","Australia/Broken_Hill","Australia/Currie","Australia/Darwin",
    "Australia/Eucla","Australia/Hobart","Australia/Lindeman","Australia/Lord_Howe","Australia/Melbourne",
    "Australia/Perth","Australia/Sydney","Antarctica/Macquarie","Indian/Christmas","Indian/Cocos","Pacific/Norfolk"
  ]);
  const AUSTRALIAN_TIME_ZONE_SET=new Set(AUSTRALIAN_TIME_ZONES);

  function parseCalendarDate(value){
    const match=DATE_PATTERN.exec(String(value||""));
    if(!match)return null;
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    const probe=new Date(Date.UTC(year,month-1,day));
    if(probe.getUTCFullYear()!==year||probe.getUTCMonth()!==month-1||probe.getUTCDate()!==day)return null;
    return {year,month,day};
  }
  function formatCalendarDate({year,month,day}){
    return `${String(year).padStart(4,"0")}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }
  function daysInMonth(year,month){return new Date(Date.UTC(year,month,0)).getUTCDate();}
  function yearsBefore(value,years){
    const date=parseCalendarDate(value);if(!date)return "";
    const year=date.year-Number(years||0),day=Math.min(date.day,daysInMonth(year,date.month));
    return formatCalendarDate({year,month:date.month,day});
  }
  function nextCalendarDay(value){
    const date=parseCalendarDate(value);if(!date)return "";
    const probe=new Date(Date.UTC(date.year,date.month-1,date.day+1));
    return formatCalendarDate({year:probe.getUTCFullYear(),month:probe.getUTCMonth()+1,day:probe.getUTCDate()});
  }
  function localDateISO(now=new Date(),timeZone){
    try{
      const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).filter(part=>part.type!=="literal").map(part=>[part.type,part.value]));
      return `${parts.year}-${parts.month}-${parts.day}`;
    }catch{
      return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    }
  }
  function dobBounds(today){
    if(!parseCalendarDate(today))return {min:"",max:"",pickerStart:""};
    const max=yearsBefore(today,MINIMUM_AGE);
    const min=nextCalendarDay(yearsBefore(today,MAXIMUM_AGE+1));
    return {min,max,pickerStart:max};
  }
  function ageFromDob(dob,today){
    const birth=parseCalendarDate(dob),current=parseCalendarDate(today);
    if(!birth||!current)return NaN;
    let age=current.year-birth.year;
    if(current.month<birth.month||(current.month===birth.month&&current.day<birth.day))age--;
    return age;
  }
  function validateRecommendationFields(values){
    const age=ageFromDob(values.dob,values.today);
    return {
      dob:!values.dob||!Number.isFinite(age)||age<MINIMUM_AGE||age>MAXIMUM_AGE?"Enter a valid date of birth for an adult user.":"",
      sex:values.sex?"":"Select the option used for your energy calculation.",
      height:!Number.isFinite(Number(values.heightCm))||Number(values.heightCm)<100||Number(values.heightCm)>250?"Enter a height between 100 and 250 cm.":"",
      weight:!Number.isFinite(Number(values.weightKg))||Number(values.weightKg)<30||Number(values.weightKg)>400?"Enter a weight between 30 and 400 kg.":"",
      goal:values.goal?"":"Choose whether you want to lose, maintain or gain weight.",
      activity:Number(values.activity)>0?"":"Choose the activity level that best matches your normal day."
    };
  }
  function isAustralianTimeZone(value){return AUSTRALIAN_TIME_ZONE_SET.has(String(value||""));}
  function initialAustralianTimeZone(deviceTimeZone,fallback="Australia/Brisbane"){
    return isAustralianTimeZone(deviceTimeZone)?String(deviceTimeZone):isAustralianTimeZone(fallback)?String(fallback):"Australia/Brisbane";
  }
  function onboardingProgress(step){
    const index=ONBOARDING_STEPS.indexOf(String(step||""));
    return index<0?"":`Step ${index+1} of ${ONBOARDING_STEPS.length}`;
  }
  function createWelcomeSession({delay=9000,schedule=setTimeout,cancel=clearTimeout,onDismiss=()=>{}}={}){
    let timer=null,dismissed=false,waitingForSpeech=false;
    function dismiss(reason="manual"){
      if(dismissed)return false;
      dismissed=true;waitingForSpeech=false;
      if(timer!==null)cancel(timer);
      timer=null;onDismiss(reason);return true;
    }
    function beginTimer(){
      if(dismissed||timer!==null)return false;
      waitingForSpeech=false;
      timer=schedule(()=>dismiss("timer"),delay);
      return true;
    }
    function waitForSpeech(utterance){
      if(!utterance){beginTimer();return null;}
      waitingForSpeech=true;let finished=false;
      const complete=()=>{if(finished)return;finished=true;beginTimer();};
      if(typeof utterance.addEventListener==="function"){
        utterance.addEventListener("end",complete,{once:true});
        utterance.addEventListener("error",complete,{once:true});
      }else{
        const previousEnd=utterance.onend,previousError=utterance.onerror;
        utterance.onend=event=>{previousEnd?.call(utterance,event);complete();};
        utterance.onerror=event=>{previousError?.call(utterance,event);complete();};
      }
      return complete;
    }
    return Object.freeze({beginTimer,waitForSpeech,dismiss,get dismissed(){return dismissed;},get waitingForSpeech(){return waitingForSpeech;},get timerActive(){return timer!==null;}});
  }
  function normaliseTimeZoneBehaviour(value){return value==="home"?"home":"ask";}
  function timeZoneDecisionToken(deviceTimeZone,activeTimeZone){return `${deviceTimeZone||""}|${activeTimeZone||""}`;}
  function evaluateTimeZoneChange({completed,deviceTimeZone,activeTimeZone,homeTimeZone,behaviour,lastDecision,approved}){
    const active=activeTimeZone||homeTimeZone||deviceTimeZone;
    const normalisedBehaviour=normaliseTimeZoneBehaviour(behaviour);
    const token=timeZoneDecisionToken(deviceTimeZone,active);
    const result={activeTimeZone:active,behaviour:normalisedBehaviour,prompt:false,lastDecision:lastDecision||null,changed:false};
    if(!completed||!deviceTimeZone||deviceTimeZone===active||normalisedBehaviour==="home")return result;
    if(lastDecision?.token===token&&lastDecision?.choice==="keep")return result;
    if(approved===undefined)return {...result,prompt:true};
    if(approved===true)return {...result,activeTimeZone:deviceTimeZone,lastDecision:{token,choice:"use-device"},changed:deviceTimeZone!==active};
    return {...result,lastDecision:{token,choice:"keep"}};
  }

  return Object.freeze({
    MINIMUM_AGE,MAXIMUM_AGE,ONBOARDING_STEPS,AUSTRALIAN_TIME_ZONES,parseCalendarDate,localDateISO,dobBounds,ageFromDob,
    validateRecommendationFields,isAustralianTimeZone,initialAustralianTimeZone,onboardingProgress,createWelcomeSession,
    normaliseTimeZoneBehaviour,timeZoneDecisionToken,evaluateTimeZoneChange
  });
});
