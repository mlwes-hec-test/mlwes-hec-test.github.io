(function(root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./tools/sync-foundation-0a"));
  else factory(root.HECSyncFoundation).install(root);
})(typeof window === "object" ? window : null, function(sync) {
  "use strict";

  // Enumerate first so an absent database is never created. Opening an existing
  // database has no version argument. Abort any creation/upgrade race immediately.
  async function readMirror(idb, sources = sync.SOURCES, timeoutMs = 2000) {
    const MIRROR = sources.mirror, mirrorKey = `${MIRROR.database}/${MIRROR.store}`;
    if (!idb || typeof idb.databases !== "function") return {status: "UNAVAILABLE"};
    let timer, db, settled = false;
    return new Promise(resolve => {
      const finish = result => {if (settled) return; settled=true; clearTimeout(timer); db?.close(); resolve(result);};
      timer = setTimeout(() => finish({status: "UNAVAILABLE"}), timeoutMs);
      Promise.resolve().then(() => idb.databases()).then(databases => {
        if (settled) return;
        const info = databases.find(item => item.name === MIRROR.database);
        if (!info) return finish({status: "ABSENT"});
        if (info.version !== MIRROR.version) return finish({status: "UNSUPPORTED VERSION"});
        const request = idb.open(MIRROR.database);
        request.onupgradeneeded = () => {request.transaction.abort(); finish({status: "UNAVAILABLE"});};
        request.onerror = request.onblocked = () => finish({status: "UNAVAILABLE"});
        request.onsuccess = () => {
          db = request.result;
          if (settled) {db.close(); return;}
          db.onversionchange = () => finish({status: "UNAVAILABLE"});
          if (db.version !== MIRROR.version) return finish({status: "UNSUPPORTED VERSION"});
          if (!db.objectStoreNames.contains(MIRROR.store)) return finish({status: "MISSING STORE"});
          try {
            const tx = db.transaction(MIRROR.store, "readonly"), store = tx.objectStore(MIRROR.store);
            const values = {};
            tx.onabort = tx.onerror = () => finish({status: "READ FAILED"});
            tx.oncomplete = () => {
              try {finish({status: "CAPTURED", source: {kind: "mirror", key: mirrorKey,
                raw: JSON.stringify(values), supplied_metadata: {database: MIRROR.database, version: db.version, store: MIRROR.store}}});}
              catch {finish({status: "READ FAILED"});}
            };
            for (const key of [sources.main, sources.functional, "savedAt"]) {
              const get = store.get(key);
              get.onsuccess = () => {if (get.result !== undefined) values[key] = get.result;};
            }
          } catch {finish({status: "READ FAILED"});}
        };
      }).catch(() => finish({status: "UNAVAILABLE"}));
    });
  }

  async function capture({storage, idb, role, generation, version, capturedAt, ids, catalogueReferences = []}) {
    if (!["test", "my-data"].includes(role)) throw new Error("INVALID_ROLE");
    const definitions = sync.sourceDefinitions(role);
    const sources = [];
    for (const kind of ["main", "functional", "protected", "administration", "legacy"]) {
      for (const key of kind === "legacy" ? definitions.legacy : [definitions[kind]]) {
        const raw = storage.getItem(key);
        if (raw !== null) sources.push({kind, key, raw});
      }
    }
    // Missing required documents are a capture failure, never replaced with defaults.
    if (!sources.some(source => source.kind === "main") || !sources.some(source => source.kind === "functional")) throw new Error("MISSING_STORAGE");
    const mirror = await readMirror(idb, definitions);
    sources.find(source => source.kind === "main").supplied_metadata = {mirror_capture: mirror.status};
    if (mirror.source) sources.push(mirror.source);
    const snapshot = sync.createSnapshot({captured_at: capturedAt,
      source_installation: {role, installation_id: ids.installation}, app: {version, generation}, catalogue_references: catalogueReferences, sources});
    const manifest = sync.createManifest(snapshot, {dataset_id: ids.dataset, manifest_id: ids.manifest, prepared_at: capturedAt});
    return {snapshot, manifest};
  }

  function artifacts(captured, prepare = sync.prepare) {
    const {snapshot, manifest} = captured;
    let completed = manifest, summary;
    try {
      const prepared = prepare(snapshot, manifest);
      completed = prepared.manifest;
      summary = sync.safeSummary(snapshot, prepared);
    } catch {
      // Keep the complete raw capture and original manifest available for recovery.
      // Never include exception messages, source values or stack traces in output.
      summary = {format: "HEC-SYNC-SAFETY-FAILURE-0A-1", dataset_id: manifest.dataset_id,
        source_role: snapshot.source_installation.role, source_generation: snapshot.app.generation,
        captured_at: snapshot.captured_at, source_snapshot_hash: snapshot.source_snapshot_hash,
        diagnostic: "PREPARATION_FAILED", readiness: "NOT READY — REVIEW REQUIRED", import_performed: false};
    }
    const stamp = snapshot.captured_at.slice(0,16).replace("T","-").replace(":","");
    return {snapshot: {...sync.recoveryExport(snapshot, completed), filename: `HEC-Sync-Safety-Snapshot-${stamp}.json`},
      summary: {filename: `HEC-Sync-Safety-Summary-${stamp}.json`, media_type: "application/json", content: JSON.stringify(summary,null,2)},
      readiness: summary.readiness};
  }

  function download(root, file) {
    const url = root.URL.createObjectURL(new root.Blob([file.content], {type: file.media_type}));
    const anchor = root.document.createElement("a");
    try {anchor.href=url; anchor.download=file.filename; root.document.body.append(anchor); anchor.click();}
    finally {anchor.remove(); root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);}
  }

  function install(root) {
    const by = id => root.document.getElementById(id);
    const start=by("sync-safety-start"), dialog=by("sync-safety-confirm"), create=by("sync-safety-create"),
      cancel=by("sync-safety-cancel"), status=by("sync-safety-status"), summaryButton=by("sync-safety-summary");
    if (!start || !dialog || !create || !cancel || !status || !summaryButton) return;
    let busy=false, safeSummaryFile=null;
    const close = () => {dialog.close(); start.focus();};
    start.addEventListener("click", () => {if (!busy) dialog.showModal();});
    cancel.addEventListener("click", close);
    summaryButton.addEventListener("click", () => {if (safeSummaryFile) download(root,safeSummaryFile);});
    create.addEventListener("click", async () => {
      if (busy || !dialog.open) return;
      busy=true; start.disabled=true; create.disabled=true; safeSummaryFile=null; summaryButton.hidden=true;
      close(); status.textContent="Creating a private snapshot on this device…";
      try {
        const app=root.HEC_APP;
        // This action is available through the existing founder-only tools surface.
        // No setting, receipt, ID or snapshot is written back to HEC storage.
        if (by("founder-tools-button")?.classList.contains("hidden")) throw new Error("FOUNDER_TOOLS_DISABLED");
        const definitions=sync.sourceDefinitions(app.installationRole);
        if (app.storageKey !== definitions.main || app.functionalStorageKey !== definitions.functional
          || app.protectedLibraryKey !== definitions.protected || app.adminStorageKey !== definitions.administration
          || app.mirrorDatabaseName !== definitions.mirror.database) throw new Error("ROLE_STORAGE_MISMATCH");
        const uuid=prefix => `${prefix}-${root.crypto.randomUUID()}`;
        const captured=await capture({storage:root.localStorage,idb:root.indexedDB,role:app.installationRole,
          generation:root.HEC_RELEASE.generation,version:app.version,capturedAt:new Date().toISOString(),
          ids:{dataset:uuid("dataset"),manifest:uuid("manifest"),installation:uuid("installation")}});
        const files=artifacts(captured);
        download(root,files.snapshot);
        // A second deliberate download works even when browsers block multiple downloads.
        // Retain only the value-free summary, never the private snapshot or prepared records.
        safeSummaryFile=files.summary; summaryButton.hidden=false;
        status.textContent="Private snapshot created locally. Nothing was uploaded and existing HEC data was not changed. Keep the downloaded file private: it may contain personal health and Diary information. "
          + (files.readiness === "READY FOR FUTURE IMPORT REHEARSAL" ? "Ready for future import rehearsal." : "Some records need review before future sync.")
          + " Download the safe summary separately for review.";
      } catch {status.textContent="Storage could not be safely read or the snapshot download could not be created. No changes were made. You can try again.";}
      finally {busy=false; start.disabled=false; create.disabled=false;}
    });
  }
  return {readMirror, capture, artifacts, download, install};
});
