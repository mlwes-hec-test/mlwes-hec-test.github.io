"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const migrations=require("../migrations.js");

const ROOT=path.join(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(ROOT,relative));
const readText=relative=>read(relative).toString("utf8");
const listFiles=relative=>fs.readdirSync(path.join(ROOT,relative),{withFileTypes:true}).filter(item=>item.isFile()).map(item=>item.name).sort();

function loadCompanionRuntime(){
  const context={window:{}};
  vm.runInNewContext(readText("companions.js"),context);
  vm.runInNewContext(readText("companion-artwork.js"),context);
  return context.window;
}

function webpDimensions(relative){
  const data=read(relative);
  assert.equal(data.subarray(0,4).toString("ascii"),"RIFF",`${relative} RIFF header`);
  assert.equal(data.subarray(8,12).toString("ascii"),"WEBP",`${relative} WebP header`);
  const chunk=data.indexOf(Buffer.from("VP8X"));
  assert.notEqual(chunk,-1,`${relative} extended WebP header`);
  const payload=chunk+8;
  return [1+data.readUIntLE(payload+4,3),1+data.readUIntLE(payload+7,3)];
}

test("artwork manifest exposes exactly the canonical 16 in picker order",()=>{
  const runtime=loadCompanionRuntime();
  const expected=migrations.CANONICAL_COMPANIONS.map(companion=>companion.id);
  assert.deepEqual(Array.from(runtime.HEC_COMPANION_ARTWORK_ROSTER),expected);
  assert.deepEqual(Object.keys(runtime.HEC_COMPANION_ARTWORK),expected);
  assert.equal(Object.keys(runtime.HEC_COMPANION_ARTWORK).length,16);
  assert.equal(Object.values(runtime.HEC_COMPANION_ARTWORK).filter(mapping=>mapping.picker?.src).length,16);
  assert.equal(Object.values(runtime.HEC_COMPANION_ARTWORK).filter(mapping=>mapping.hero?.src&&mapping.hero?.srcset).length,16);
  assert.equal(runtime.HEC_COMPANION_ARTWORK_ROSTER.includes("koko-koala"),false);
  assert.equal(runtime.HEC_COMPANION_ARTWORK_ROSTER.includes("salty-crocodile"),true);
});

test("companion identity records own identity only, not runtime artwork paths",()=>{
  const runtime=loadCompanionRuntime();
  assert.equal(runtime.HEC_COMPANIONS.length,16);
  runtime.HEC_COMPANIONS.forEach(companion=>assert.equal(Object.hasOwn(companion,"artworkId"),false,companion.id));
});

test("all hero and picker mappings are distinct and point to real runtime files",()=>{
  const runtime=loadCompanionRuntime();
  for(const id of runtime.HEC_COMPANION_ARTWORK_ROSTER){
    const mapping=runtime.HEC_COMPANION_ARTWORK[id];
    assert.ok(mapping.hero.src.endsWith(`/hero/512/${id}.webp`),id);
    assert.ok(mapping.hero.srcset.includes(`/hero/1024/${id}.webp 2x`),id);
    assert.ok(mapping.picker.src.endsWith(`/picker/${id}.webp`),id);
    assert.notEqual(mapping.hero.src,mapping.picker.src,id);
    for(const relative of [mapping.hero.src,mapping.picker.src,`assets/companions/runtime/hero/1024/${id}.webp`]){
      assert.equal(fs.existsSync(path.join(ROOT,relative)),true,relative);
    }
  }
  assert.equal(runtime.companionArtwork("not-a-companion","hero"),null);
  assert.equal(runtime.companionArtwork("not-a-companion","picker"),null);
  assert.equal(runtime.companionArtwork("koko-koala","hero"),null);
  assert.ok(runtime.companionArtwork("bushy-koala","hero").includes("bushy-koala"));
});

test("runtime assets have exact counts, responsive canvases and real alpha",()=>{
  const groups=[
    ["assets/companions/runtime/picker",[320,360]],
    ["assets/companions/runtime/hero/512",[512,640]],
    ["assets/companions/runtime/hero/1024",[1024,1280]]
  ];
  for(const [directory,size] of groups){
    const files=listFiles(directory);
    assert.equal(files.length,16,directory);
    assert.equal(files.every(file=>file.endsWith(".webp")),true,directory);
    files.forEach(file=>assert.deepEqual(webpDimensions(`${directory}/${file}`),size,`${directory}/${file}`));
  }
});

test("authoring assets stay external and the rebuild script writes runtime outputs only",()=>{
  assert.equal(fs.existsSync(path.join(ROOT,"assets/companions/source")),false);
  const builder=readText("scripts/build_companion_assets.py");
  assert.match(builder,/external approved audited source pack/);
  assert.match(builder,/"audited_zip"/);
  assert.match(builder,/runtime_root = output_root \/ "runtime"/);
  assert.match(builder,/AUDIT RESULT: PASS/);
  assert.doesNotMatch(builder,/source_root/);
  assert.doesNotMatch(builder,/write_bytes/);
  const runtime=loadCompanionRuntime();
  const skipIdentity=runtime.HEC_COMPANIONS.find(companion=>companion.id==="skip-kangaroo");
  assert.match(skipIdentity.physicalDescription,/Large Red Kangaroo; no pouch/);
});

test("picker, preview and Home use the correct variants with same-companion emoji fallback",()=>{
  const app=readText("app.js");
  const polish=readText("alpha064.js");
  const html=readText("index.html");
  const styles=readText("styles.css");
  assert.match(app,/companionArtworkMarkup\(companion,"picker","companion-picker-image"\)/);
  assert.match(app,/companionArtworkMarkup\(companion,"hero","companion-preview-image"\)/);
  assert.match(app,/setCompanionArtworkImage\(portrait,companionDefinition,"hero",avatarFallback\)/);
  assert.match(app,/if\(!source\)return `<span[^`]+\$\{escapeHtml\(companion\.icon\)\}/);
  assert.match(app,/\$\("home-companion"\)\.addEventListener\("click"/);
  assert.match(html,/<button id="home-companion" class="companion-centre">/);
  assert.ok(html.indexOf('"companion-artwork.js"')<html.indexOf('"app.js"'));
  assert.match(styles,/\.home-avatar-image\{[\s\S]*?object-fit:contain;[\s\S]*?object-position:center bottom;/);
  assert.match(styles,/\.companion-centre\.no-companion\{[\s\S]*?background:linear-gradient/);
  assert.match(polish,/enabled\?'tap for guidance':'tap for written guidance'/);
  assert.match(polish,/if\(action\)action\.textContent=`Tap for written guidance`/);
});

test("service worker precaches all pickers, lazily caches heroes and has no prototype SVGs",()=>{
  const worker=readText("service-worker.js");
  const staticSource=worker.match(/const STATIC_FILES = (\[[\s\S]*?\]);/)[1];
  const staticFiles=vm.runInNewContext(staticSource);
  const pickers=staticFiles.filter(file=>file.includes("/runtime/picker/"));
  const installationIcons=staticFiles.filter(file=>file.includes("/app-icons/"));
  assert.equal(pickers.length,16);
  assert.equal(pickers.every(file=>file.endsWith(".webp")),true);
  assert.equal(installationIcons.length,4);
  assert.match(worker,/companion-artwork\.js/);
  assert.match(worker,/companion-voice-metadata\.js/);
  assert.match(worker,/companion-voices\.js/);
  assert.match(worker,/COMPANION_HERO_PATH/);
  assert.doesNotMatch(worker,/assets\/companions\/[^"']+\.svg/);
  assert.doesNotMatch(readText("app.js"),/assets\/companions\/[^"'`]+\.svg/);
  for(const file of ["companion-artwork.js","app.js","index.html","service-worker.js"]){
    assert.doesNotMatch(readText(file),/assets\/companions\/source\//,file);
  }
});

test("service worker install and first-use hero policy execute successfully",async()=>{
  const handlers={},stored=[];
  const cache={
    match:async()=>null,
    put:async request=>stored.push(typeof request==="string"?request:request.url)
  };
  const context={
    URL,Promise,Error,
    setTimeout:()=>0,
    clearTimeout:()=>{},
    caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},
    fetch:async()=>({ok:true,clone(){return this;}}),
    self:{
      location:{href:"https://hec.example/service-worker.js",origin:"https://hec.example"},
      clients:{claim:async()=>{}},
      skipWaiting:()=>{},
      addEventListener:(type,handler)=>{handlers[type]=handler;}
    }
  };
  vm.runInNewContext(readText("service-worker.js"),context);

  let installPromise;
  handlers.install({waitUntil:promise=>{installPromise=promise;}});
  await installPromise;
  assert.equal(stored.filter(item=>item.includes("/runtime/picker/")).length,16);
  assert.equal(stored.some(item=>item.includes("companion-artwork.js")),true);
  assert.equal(stored.some(item=>item.includes("/runtime/hero/")),false);

  const heroUrl="https://hec.example/assets/companions/runtime/hero/512/percy-pelican.webp";
  let heroPromise;
  handlers.fetch({
    request:{method:"GET",url:heroUrl,mode:"no-cors",destination:"image"},
    respondWith:promise=>{heroPromise=promise;}
  });
  await heroPromise;
  assert.equal(stored.includes(heroUrl),true);
});
