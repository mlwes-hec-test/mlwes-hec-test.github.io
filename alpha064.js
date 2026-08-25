(() => {
"use strict";
const APP=window.HEC_APP;
if(!APP?.version)throw new Error("HEC canonical configuration was not loaded");
const MAIN_KEY=APP.storageKey;
const EXT_KEY=APP.functionalStorageKey;
const ADMIN_KEY=APP.adminStorageKey;
const STAGE4=window.HECStage4;
const RELEASE_SLUG=APP.version.replace(/\./g,"-");
const INSTALLATION_SLUG=APP.installationRole;
const $=id=>document.getElementById(id);
const qa=s=>[...document.querySelectorAll(s)];
const clone=v=>JSON.parse(JSON.stringify(v));
const read=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const activeScreen=()=>document.querySelector(".screen.active")?.id||"";
const deviceTZ=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"Australia/Brisbane";}catch{return "Australia/Brisbane";}};
const toast=message=>{const t=$("toast")||$("a05-toast-copy");if(!t)return; if(t.id==="toast"){t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}else t.textContent=message;};

function ensureSchemas(){
  const main=read(MAIN_KEY,{});main.version=APP.version||"0.6.14";main.personal||={};main.personal.surname??="";main.personal.homeTimeZone||=deviceTZ();main.personal.activeTimeZone||=main.personal.homeTimeZone;main.personal.timeZoneBehaviour||="ask";main.analytics||={consent:false};main.developer||={founderEnabled:false};main.trial||={};
  if(new URLSearchParams(location.search).get("founder")==="1")main.developer.founderEnabled=true;
  const params=new URLSearchParams(location.search);if(params.get("invite")){main.trial.inviteCode=params.get("invite");main.trial.invitedBy=params.get("from")||"Founder Trial";main.trial.feedbackEmail=params.get("feedback")||main.trial.feedbackEmail||"";}
  write(MAIN_KEY,main);
  const ext=read(EXT_KEY,{});ext.version=APP.version||"0.6.14";ext.fluidTargets||={};ext.ui||={};write(EXT_KEY,ext);
  const admin=read(ADMIN_KEY,{usage:{},feedback:[],invites:[],sessions:0});admin.usage||={};admin.feedback||=[];admin.invites||=[];admin.sessions=(admin.sessions||0)+1;write(ADMIN_KEY,admin);
}
ensureSchemas();

function handleTimeZone(){
  const main=read(MAIN_KEY,{}),p=main.personal||{},device=deviceTZ();
  p.homeTimeZone||=device;p.activeTimeZone||=p.homeTimeZone;p.timeZoneBehaviour||="ask";
  const previousActive=p.activeTimeZone;
  let decision=STAGE4.evaluateTimeZoneChange({completed:main.completed,deviceTimeZone:device,activeTimeZone:p.activeTimeZone,homeTimeZone:p.homeTimeZone,behaviour:p.timeZoneBehaviour,lastDecision:p.timeZoneDecision});
  if(decision.prompt){
    const approved=confirm(`Your device time zone is now ${device}.\n\nWould you like HEC to use it as your active time zone?\n\nChoose Cancel to keep ${p.activeTimeZone}. Existing Diary, meal and weight dates will not be changed.`);
    decision=STAGE4.evaluateTimeZoneChange({completed:main.completed,deviceTimeZone:device,activeTimeZone:p.activeTimeZone,homeTimeZone:p.homeTimeZone,behaviour:p.timeZoneBehaviour,lastDecision:p.timeZoneDecision,approved});
  }
  p.activeTimeZone=decision.activeTimeZone;
  p.timeZoneBehaviour=decision.behaviour;
  if(decision.lastDecision&&decision.lastDecision!==p.timeZoneDecision)p.timeZoneDecision={...decision.lastDecision,decidedAt:new Date().toISOString()};
  const changed=p.activeTimeZone!==previousActive;
  main.personal=p;write(MAIN_KEY,main);
  if(changed)setTimeout(()=>location.reload(),0);
}
handleTimeZone();

// Navigation: every working room has both Back and Home.
const APP_SCREEN_EXCLUSIONS=new Set(["welcome","language","register","verify","password","companion","personal","health","recommendations","home"]);
const functionalScreens=new Set(["food-diary","food-library","food-entry-editor","custom-food","recipe-builder","quick-log","scan-centre","meal-planner","daily-progress","nutrition-trends","exercise-log","progress-history","shopping-list","food-preferences","family-connections","printable-report"]);
let navStack=[],lastActive=activeScreen(),goingBack=false;
const scrollByScreen={};
function installNavigation(){
  qa(".screen.content-screen").forEach(screen=>{
    if(APP_SCREEN_EXCLUSIONS.has(screen.id))return;
    const header=screen.querySelector("header.topbar");if(!header)return;
    [...header.children].filter(x=>x.matches?.(".back,.home-nav-button,.hec-nav-pair")).forEach(x=>x.remove());
    const group=document.createElement("div");group.className="hec-nav-pair";group.innerHTML='<button type="button" class="back" data-hec-back>← Back</button><button type="button" class="home-nav-button" data-go="home">🏠 Home</button>';
    header.prepend(group);
  });
}
installNavigation();
function openScreen(id){
  if(functionalScreens.has(id)&&typeof window.openAlpha05Feature==="function")window.openAlpha05Feature(id);
  else if(typeof window.show==="function")window.show(id,{speak:false});
}
document.addEventListener("click",event=>{
  const navigation=event.target.closest("[data-go],[data-open-feature],.room,#home-companion");if(navigation){const current=activeScreen();if(current)scrollByScreen[current]=window.scrollY;}
  const back=event.target.closest("[data-hec-back]");if(!back)return;event.preventDefault();event.stopImmediatePropagation();
  const current=activeScreen();let target=navStack.pop();while(target&&target.id===current)target=navStack.pop();if(!target)target={id:"home",scroll:0};goingBack=true;openScreen(target.id);setTimeout(()=>{window.scrollTo(0,target.scroll||0);goingBack=false;},50);
},true);
const navObserver=new MutationObserver(()=>{
  const current=activeScreen();if(!current||current===lastActive)return;
  if(!goingBack&&lastActive)navStack.push({id:lastActive,scroll:scrollByScreen[lastActive]||0});
  lastActive=current;track(`screen:${current}`);installNavigation();
});
qa(".screen").forEach(s=>navObserver.observe(s,{attributes:true,attributeFilter:["class"]}));

// Energy calculation details are available without dominating setup.
$("calculation-help-toggle")?.addEventListener("click",()=>{
  const details=$("calculation-breakdown"),button=$("calculation-help-toggle");const open=details.classList.toggle("hidden")===false;button.setAttribute("aria-expanded",String(open));button.textContent=open?"×":"?";
});

// Companion content categories and tap-to-refresh.
const CONTENT={
  tip:["Build meals around foods you enjoy, then make small changes you can repeat.","Plan one meal ahead when the day is likely to become busy.","Include protein and fibre to help a meal feel satisfying.","Frozen vegetables are practical, nutritious and easy to keep on hand.","Keep water visible so remembering to drink is easier."],
  quote:["A realistic plan is more powerful than a perfect plan you cannot live with.","Progress grows from ordinary choices repeated often.","The next helpful choice matters more than the last imperfect one.","Good food planning should make life easier, not stricter."],
  joke:["Why did the tomato blush? It saw the salad dressing.","What is a vegetable’s favourite music? Anything with a good beet.","Why did the banana visit the doctor? It was not peeling well.","Why did the mushroom get invited to dinner? Because it was a fungi."],
  fact:["Frozen vegetables can be nutritionally comparable with fresh vegetables.","Water, tea, coffee, milk, soup and other drinks can all contribute to fluid intake.","Serving size and cooking method can substantially change a food’s energy value.","A recipe can be a single homemade item, not only a large family meal."],
  encouragement:["You do not need a perfect day. Focus on the next helpful choice.","An unplanned meal does not undo the useful choices you made earlier.","Your plan can change as your day changes.","Small repeatable changes are worth celebrating."]
};
let lastContent="";
function contentLabel(category){return {tip:"Healthy Eating Tip",quote:"Food Quote",joke:"Food Joke",fact:"Did You Know?",encouragement:"Encouragement"}[category]||"Companion Mix";}
function nextContent(){
  const select=$("inspiration-category"),chosen=select?.value||"mix",categories=Object.keys(CONTENT),category=chosen==="mix"?categories[Math.floor(Math.random()*categories.length)]:chosen,pool=CONTENT[category]||CONTENT.tip;
  let text=pool[Math.floor(Math.random()*pool.length)];if(pool.length>1&&text===lastContent)text=pool[(pool.indexOf(text)+1)%pool.length];lastContent=text;
  if($("message-type"))$("message-type").textContent=contentLabel(category);if($("message-text"))$("message-text").textContent=text;if($("home-companion-message"))$("home-companion-message").textContent=text;
  const main=read(MAIN_KEY,{});main.preferences||={};main.preferences.inspirationCategory=chosen;main.preferences.lastInspiration={category,text};write(MAIN_KEY,main);track(`inspiration:${category}`);
}
$("inspiration-card")?.addEventListener("click",event=>{if(event.target.closest("select,button"))return;nextContent();});
$("inspiration-card")?.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();nextContent();}});
$("inspiration-category")?.addEventListener("change",nextContent);
const mainAtLoad=read(MAIN_KEY,{});if($("inspiration-category"))$("inspiration-category").value=mainAtLoad.preferences?.inspirationCategory||"mix";

// Local privacy-conscious analytics.
function analyticsEnabled(){return !!read(MAIN_KEY,{}).analytics?.consent;}
function track(name){if(!analyticsEnabled())return;const admin=read(ADMIN_KEY,{usage:{}});admin.usage||={};admin.usage[name]=(admin.usage[name]||0)+1;write(ADMIN_KEY,admin);}
$("analytics-consent")?.addEventListener("change",event=>{const main=read(MAIN_KEY,{});main.analytics||={};main.analytics.consent=event.target.checked;write(MAIN_KEY,main);if(event.target.checked)track("analytics:enabled");});
if($("analytics-consent"))$("analytics-consent").checked=analyticsEnabled();
document.addEventListener("click",event=>{
  const b=event.target.closest("button");if(!b)return;
  const safe=b.dataset.room||b.dataset.openFeature||b.dataset.libraryTab||b.id;
  const allowed=["shopping-list","meal-planner","food-library","daily-progress","food-diary","progress-weight","settings","generate-meal-suggestions","search-online-foods","resource-add-button","submit-feedback"];
  if(allowed.includes(safe))track(`action:${safe}`);
  if(b.id==="companion-next"){
    const choice=document.querySelector('input[name="companion-choice"]:checked')?.value||"unknown";const companion=document.querySelector('[data-companion-id].selected')?.dataset.companionId||"not-recorded";track(choice==="no"?"companion:none":`companion:${companion}`);
  }
},true);

// Backup and restore.
function downloadJson(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
$("export-all-data")?.addEventListener("click",()=>{downloadJson(`healthy-eating-companion-${INSTALLATION_SLUG}-alpha-${RELEASE_SLUG}-backup-${window.HECDate?.todayISO?.()||"today"}.json`,{format:"HEC-BACKUP-1",version:APP.version,installationRole:APP.installationRole,exportedAt:new Date().toISOString(),profile:read(MAIN_KEY,{}),functional:read(EXT_KEY,{})});track("data:backup");});
$("import-all-data")?.addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(!payload.profile||!payload.functional)throw new Error("This is not a complete Healthy Eating Companion backup.");if(APP.installationRole==="my-data"&&payload.installationRole==="test")throw new Error("A HEC — TEST backup cannot replace the historical HEC — My Data installation.");if(!confirm(`Restore this backup into ${APP.displayName} and replace the data currently stored in this installation?`))return;write(MAIN_KEY,payload.profile);write(EXT_KEY,payload.functional);location.reload();}catch(error){alert(`Backup could not be restored: ${error.message}`);}finally{event.target.value="";}
});

// Feedback: local record plus email/share handoff for cross-device founder delivery.
function feedbackPayload(){const main=read(MAIN_KEY,{});return {id:`feedback-${Date.now().toString(36)}`,type:$("feedback-type")?.value||"Other Feedback",screen:$("feedback-screen")?.value.trim()||activeScreen(),message:$("feedback-message")?.value.trim()||"",responseOk:!!$("feedback-response-ok")?.checked,version:APP.version,installationRole:APP.installationRole,device:`${navigator.platform||"Device"} · ${navigator.userAgent}`,submittedAt:new Date().toISOString()};}
$("submit-feedback")?.addEventListener("click",async()=>{
  const item=feedbackPayload();if(!item.message){toast("Please enter your feedback first.");return;}const admin=read(ADMIN_KEY,{feedback:[]});admin.feedback||=[];admin.feedback.unshift(item);write(ADMIN_KEY,admin);track(`feedback:${item.type}`);
  const main=read(MAIN_KEY,{}),recipient=main.trial?.feedbackEmail||"",subject=`Healthy Eating Companion ${APP.version} Feedback — ${item.type}`,body=`Type: ${item.type}\nScreen: ${item.screen}\nApp version: ${item.version}\nSubmitted: ${item.submittedAt}\n\n${item.message}\n\nTechnical information:\n${item.device}`;
  const status=$("feedback-status");if(status){status.classList.remove("hidden");status.innerHTML=`<strong>Feedback Prepared</strong><p>Your feedback is saved on this device. ${recipient?`Your email app will also be opened so it can be sent to the founder.`:"Use Share or Copy below to send it to the founder."}</p><div class="quick-action-row"><button id="share-prepared-feedback" class="secondary">Share</button><button id="copy-prepared-feedback" class="secondary">Copy</button></div>`;}
  const share=async()=>{if(navigator.share){try{await navigator.share({title:subject,text:body});return;}catch{}}await navigator.clipboard?.writeText(body);toast("Feedback copied. Paste it into a message or email to the founder.");};
  $("share-prepared-feedback")?.addEventListener("click",share,{once:true});$("copy-prepared-feedback")?.addEventListener("click",async()=>{await navigator.clipboard?.writeText(body);toast("Feedback copied.");},{once:true});
  if(recipient)location.href=`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

// Founder tools: local PIN, invites and local insights.
async function hashText(text){if(crypto?.subtle){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");}return btoa(text);}
function founderEnabled(){return !!read(MAIN_KEY,{}).developer?.founderEnabled;}
if(founderEnabled())$("founder-tools-button")?.classList.remove("hidden");
function renderFounder(){
  const admin=read(ADMIN_KEY,{invites:[],usage:{},feedback:[]});
  if($("founder-feedback-email"))$("founder-feedback-email").value=admin.feedbackEmail||"";
  if($("invite-list"))$("invite-list").innerHTML=admin.invites.length?admin.invites.map((invite,index)=>`<article class="invite-row"><div><strong>${escapeHtml(invite.name||"Trial Tester")}</strong><small>${escapeHtml(invite.contact||"")} · ${escapeHtml(invite.code)}</small></div><div><button data-share-invite="${index}">Share</button><button data-copy-invite="${index}">Copy</button><button data-remove-invite="${index}">Remove</button></div></article>`).join(""):'<p class="empty-state">No Invitations Created Yet.</p>';
  const usage=Object.entries(admin.usage||{}).sort((a,b)=>b[1]-a[1]);if($("developer-insights"))$("developer-insights").innerHTML=usage.length?`<div class="insight-grid">${usage.map(([name,count])=>`<div><span>${escapeHtml(name.replace(/[:_-]/g," "))}</span><strong>${count}</strong></div>`).join("")}</div><p><strong>Local Sessions:</strong> ${admin.sessions||0}</p>`:'<p class="empty-state">No Anonymous Usage Counts Yet.</p>';
  if($("founder-feedback-list"))$("founder-feedback-list").innerHTML=(admin.feedback||[]).length?admin.feedback.map(f=>`<article class="feedback-row"><strong>${escapeHtml(f.type)}</strong><small>${escapeHtml(f.screen)} · ${escapeHtml(f.submittedAt)}</small><p>${escapeHtml(f.message)}</p></article>`).join(""):'<p class="empty-state">No Feedback Stored on This Device.</p>';
}
$("founder-unlock")?.addEventListener("click",async()=>{if(!founderEnabled()){alert("Founder tools are not enabled on this installation.");return;}const pin=$("founder-pin").value.trim();if(!/^\d{6}$/.test(pin)){$("founder-lock-status").textContent="Enter a six-digit PIN.";return;}const admin=read(ADMIN_KEY,{}),hash=await hashText(pin);if(!admin.pinHash){admin.pinHash=hash;write(ADMIN_KEY,admin);}else if(admin.pinHash!==hash){$("founder-lock-status").textContent="That PIN is not correct.";return;}$("founder-lock-card").classList.add("hidden");$("founder-dashboard").classList.remove("hidden");renderFounder();});
$("founder-feedback-email")?.addEventListener("change",event=>{const admin=read(ADMIN_KEY,{});admin.feedbackEmail=event.target.value.trim();write(ADMIN_KEY,admin);});
$("create-invite")?.addEventListener("click",()=>{const admin=read(ADMIN_KEY,{invites:[]});admin.invites||=[];if(admin.invites.length>=10){alert("This founder trial currently allows up to 10 invitation slots.");return;}const code=Math.random().toString(36).slice(2,8).toUpperCase(),name=$("invite-name").value.trim()||`Trial Tester ${admin.invites.length+1}`,contact=$("invite-contact").value.trim(),base=`${location.origin}${location.pathname}`,url=`${base}?invite=${encodeURIComponent(code)}&from=${encodeURIComponent("Mal")}${admin.feedbackEmail?`&feedback=${encodeURIComponent(admin.feedbackEmail)}`:""}`;admin.invites.push({code,name,contact,url,createdAt:new Date().toISOString()});write(ADMIN_KEY,admin);$("invite-name").value="";$("invite-contact").value="";renderFounder();});
document.addEventListener("click",async event=>{const share=event.target.closest("[data-share-invite]"),copy=event.target.closest("[data-copy-invite]"),remove=event.target.closest("[data-remove-invite]");if(!share&&!copy&&!remove)return;const admin=read(ADMIN_KEY,{invites:[]}),index=Number((share||copy||remove).dataset.shareInvite??(share||copy||remove).dataset.copyInvite??(share||copy||remove).dataset.removeInvite),invite=admin.invites[index];if(!invite)return;if(remove){admin.invites.splice(index,1);write(ADMIN_KEY,admin);renderFounder();return;}if(share&&navigator.share){try{await navigator.share({title:"Healthy Eating Companion Founder Trial",text:`${invite.name}, use this private trial link:`,url:invite.url});return;}catch{}}await navigator.clipboard?.writeText(invite.url);toast("Invitation link copied.");});
$("export-insights")?.addEventListener("click",()=>downloadJson(`hec-${INSTALLATION_SLUG}-alpha-${RELEASE_SLUG}-local-insights.json`,read(ADMIN_KEY,{})));

// Data deletion / deregistration.
function deleteOwnedMirror(){return new Promise(resolve=>{try{const request=indexedDB.deleteDatabase(APP.mirrorDatabaseName);request.onsuccess=request.onerror=request.onblocked=()=>resolve();}catch{resolve();}});}
async function clearInstalledData(includeFounder=true){
  window.HECInstallation.assertDestructiveOrigin(APP,location.origin);
  const keys=window.HECInstallation.resetStorageKeys(APP,includeFounder?"full":"keep-library");
  keys.forEach(key=>localStorage.removeItem(key));
  await deleteOwnedMirror();
  if("caches" in window)for(const key of await caches.keys())if(window.HECInstallation.ownsCacheName(APP,key))await caches.delete(key);
  if(navigator.serviceWorker)for(const registration of await navigator.serviceWorker.getRegistrations())if(window.HECInstallation.ownsServiceWorkerRegistration(APP,registration,location.href))await registration.unregister();
}
$("leave-app")?.addEventListener("click",async()=>{if(APP.installationRole!=="test"){alert("HEC — My Data can only be permanently cleared from its advanced data deletion controls after a backup warning.");return;}if(!confirm("Delete every record stored only inside HEC — TEST? HEC — My Data is not accessed."))return;try{await clearInstalledData(true);location.reload();}catch(error){alert(error.message);}});

// Restore view-specific controls whenever screens are opened.
const screenRenderObserver=new MutationObserver(()=>{if(activeScreen()==="founder-tools"&&founderEnabled())renderFounder();if(activeScreen()==="home"){const stored=read(MAIN_KEY,{}).preferences?.lastInspiration;if(stored&&$("message-text")){ $("message-type").textContent=contentLabel(stored.category);$("message-text").textContent=stored.text;}}});
qa(".screen").forEach(s=>screenRenderObserver.observe(s,{attributes:true,attributeFilter:["class"]}));


// Alpha 0.6.13 — first Companion polish pass and permission guidance.
function polishCompanionHome(){
  const centre=document.getElementById('home-companion'),img=document.getElementById('home-avatar-image'),name=document.getElementById('home-companion-name');if(!centre)return;
  const main=read(MAIN_KEY,{}),enabled=main.companion?.enabled!==false,cid=main.companion?.id||main.companion?.characterId||'';const c=(window.HEC_COMPANIONS||[]).find(x=>x.id===cid||x.name===main.companion?.name),action=document.getElementById('home-companion-action');
  centre.classList.add('companion-polished');centre.setAttribute('aria-label',`${name?.textContent||'Companion'} — ${enabled?'tap for guidance':'tap for written guidance'}`);
  if(img&&!img.classList.contains('hidden'))img.classList.add('companion-idle-animation');
  if(c&&enabled){centre.dataset.personality=c.personality||'';if(action)action.textContent=`Tap for guidance`;}
  else if(!enabled){delete centre.dataset.personality;if(action)action.textContent=`Tap for written guidance`;}
}
function installPermissionGuidance(){
  const shopping=document.getElementById('shopping-add-status');if(shopping&&!shopping.dataset.permissionCopy){shopping.dataset.permissionCopy='1';shopping.insertAdjacentHTML('afterend','<p class="fine permission-guidance">Speech permission is normally requested only the first time. If iPhone asks again, check Safari/HE Companion permissions in Settings.</p>');}
}
setTimeout(()=>{polishCompanionHome();installPermissionGuidance();},400);
const polishObserver=new MutationObserver(()=>{if(activeScreen()==='home')setTimeout(polishCompanionHome,30);});document.querySelectorAll('.screen').forEach(x=>polishObserver.observe(x,{attributes:true,attributeFilter:['class']}));

// Invitation acknowledgement is deliberately non-blocking.
const params=new URLSearchParams(location.search);if(params.get("invite"))setTimeout(()=>toast(`Founder trial invitation ${params.get("invite")} recognised. Complete setup or continue your existing profile.`),900);
})();
