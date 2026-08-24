((root, factory) => {
  "use strict";
  const api = factory();
  if(typeof module === "object" && module.exports)module.exports = api;
  if(root){
    root.HECInstallation = api;
    if(root.document && root.HEC_APP)api.applyIdentity(root.document, root.HEC_APP, root.location);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const ROLES = Object.freeze({MY_DATA:"my-data", TEST:"test"});
  const originOf = value => {
    try{return new URL(String(value||"")).origin;}catch{return "";}
  };
  function isOriginSafe(app, origin){
    if(app?.installationRole !== ROLES.TEST)return true;
    const expected=originOf(app.expectedOrigin),actual=originOf(origin);
    return expected.startsWith("https://") && expected === actual;
  }
  function assertDestructiveOrigin(app, origin){
    if(isOriginSafe(app,origin))return true;
    const error=new Error("HEC TEST safety lock: this build is not running at its approved TEST origin");
    error.code="HEC_TEST_ORIGIN_MISMATCH";
    throw error;
  }
  function resetStorageKeys(app, mode="full"){
    const base=[app.storageKey,app.functionalStorageKey,...(app.legacyMainKeys||[]),...(app.legacyFunctionalKeys||[])];
    if(mode==="keep-library")return Object.freeze([...new Set(base.filter(Boolean))]);
    return Object.freeze([...new Set([...base,app.protectedLibraryKey,app.adminStorageKey].filter(Boolean))]);
  }
  function ownsCacheName(app, name){
    const prefix=String(app?.cachePrefix||"");
    const cacheName=String(name||"");
    if(prefix && cacheName.startsWith(`${prefix}-`))return true;
    return app?.installationRole===ROLES.MY_DATA && cacheName.startsWith("healthy-eating-companion-alpha-");
  }
  function serviceWorkerScopeUrl(app, locationHref){
    try{return new URL(app?.serviceWorkerScope||"./",locationHref).href;}catch{return "";}
  }
  function ownsServiceWorkerRegistration(app, registration, locationHref){
    const expected=serviceWorkerScopeUrl(app,locationHref);
    return !!expected && String(registration?.scope||"")===expected;
  }
  function diagnostics(app, locationLike={}){
    const actualOrigin=originOf(locationLike?.origin||locationLike?.href);
    return Object.freeze({
      role:app.installationRole,
      version:app.version,
      displayName:app.displayName,
      actualOrigin,
      expectedOrigin:app.expectedOrigin||"Current historical origin",
      originSafe:isOriginSafe(app,actualOrigin),
      storageKey:app.storageKey,
      functionalStorageKey:app.functionalStorageKey,
      mirrorDatabaseName:app.mirrorDatabaseName,
      cachePrefix:app.cachePrefix,
      manifestId:app.manifestId
    });
  }
  function applyIdentity(document, app, locationLike={}){
    const role=app.installationRole;
    document.documentElement.dataset.hecInstallationRole=role;
    const appleTitle=document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if(appleTitle)appleTitle.setAttribute("content",app.shortName);
    const theme=document.querySelector('meta[name="theme-color"]');
    if(theme&&app.themeColor)theme.setAttribute("content",app.themeColor);
    let touchIcon=document.querySelector('link[rel="apple-touch-icon"]');
    if(!touchIcon){touchIcon=document.createElement("link");touchIcon.setAttribute("rel","apple-touch-icon");document.head?.append(touchIcon);}
    if(app.icon192)touchIcon.setAttribute("href",app.icon192);
    document.body?.classList.toggle("hec-test-installation",role===ROLES.TEST);
    if(role===ROLES.TEST && !document.getElementById("hec-test-installation-banner")){
      const banner=document.createElement("div");
      banner.id="hec-test-installation-banner";
      banner.className="hec-test-installation-banner";
      banner.setAttribute("role","status");
      banner.setAttribute("aria-label","HEC TEST installation");
      banner.innerHTML="<strong>HEC — TEST</strong><span>Disposable isolated testing data</span>";
      document.body?.prepend(banner);
    }
    const identity=document.getElementById("installation-identity");
    if(identity){
      identity.classList.toggle("test-installation-identity",role===ROLES.TEST);
      identity.innerHTML=role===ROLES.TEST
        ? "<strong>HEC — TEST</strong><p>This is the isolated disposable testing installation. Resetting it does not operate on My Data.</p>"
        : "<strong>Installation: HEC — My Data</strong><p>This installation retains the historical HEC profile and records. Make a backup before advanced data operations.</p>";
    }
    document.querySelectorAll("[data-test-reset-control]").forEach(element=>element.classList.toggle("hidden",role!==ROLES.TEST));
    document.querySelectorAll("[data-my-data-reset-control]").forEach(element=>element.classList.toggle("hidden",role!==ROLES.MY_DATA));
    const details=diagnostics(app,locationLike);
    const diagnosticsHost=document.getElementById("installation-diagnostics");
    if(diagnosticsHost)diagnosticsHost.innerHTML=`<dl class="diagnostic-list"><div><dt>Installation</dt><dd>${details.displayName}</dd></div><div><dt>Role</dt><dd>${details.role}</dd></div><div><dt>Version</dt><dd>${details.version}</dd></div><div><dt>Origin safety</dt><dd>${details.originSafe?"confirmed":"LOCKED — origin mismatch"}</dd></div><div><dt>Current origin</dt><dd>${details.actualOrigin||"Unavailable"}</dd></div><div><dt>Expected origin</dt><dd>${details.expectedOrigin}</dd></div><div><dt>Storage</dt><dd>${details.storageKey}</dd></div><div><dt>Mirror</dt><dd>${details.mirrorDatabaseName}</dd></div><div><dt>Cache prefix</dt><dd>${details.cachePrefix}</dd></div></dl>`;
    if(role===ROLES.TEST)document.title=`HEC — TEST — Founder Trial Alpha ${app.version}`;
  }

  return Object.freeze({ROLES,isOriginSafe,assertDestructiveOrigin,resetStorageKeys,ownsCacheName,serviceWorkerScopeUrl,ownsServiceWorkerRegistration,diagnostics,applyIdentity});
});
