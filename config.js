(() => {
  "use strict";

  const version = "0.6.33";
  const installation = window.HEC_INSTALLATION;
  if(!installation?.role)throw new Error("HEC installation configuration was not loaded");
  if(!["my-data","test"].includes(installation.role))throw new Error("HEC installation role is invalid");
  window.HEC_APP = Object.freeze({
    name: "Healthy Eating Companion",
    shortName: installation.shortName,
    displayName: installation.displayName,
    version,
    buildLabel: `Founder Trial Alpha ${version}`,
    installationRole: installation.role,
    manifestId: installation.manifestId,
    icon192: installation.icon192,
    icon512: installation.icon512,
    themeColor: installation.themeColor,
    expectedOrigin: installation.expectedOrigin,
    storageKey: installation.storageKey,
    functionalStorageKey: installation.functionalStorageKey,
    protectedLibraryKey: installation.protectedLibraryKey,
    adminStorageKey: installation.adminStorageKey,
    resetSessionKey: installation.resetSessionKey,
    mirrorDatabaseName: installation.mirrorDatabaseName,
    cachePrefix: installation.cachePrefix,
    serviceWorkerScope: installation.serviceWorkerScope,
    legacyMainKeys: Object.freeze([...(installation.legacyMainKeys||[])]),
    legacyFunctionalKeys: Object.freeze([...(installation.legacyFunctionalKeys||[])]),
    locale: "en-AU"
  });
})();
