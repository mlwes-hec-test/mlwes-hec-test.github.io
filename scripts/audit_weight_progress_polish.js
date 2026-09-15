'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const {chromium,edge}=require(path.join(ROOT,'scripts/audit_physical_form_measures_edge.js')).browserTools();
const weight=require(path.join(ROOT,'weight-progress-foundation.js'));
const ORIGIN='http://127.0.0.1:4178',OUT=process.argv[2]||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'hec-weight-polish-')),phase=process.argv[3]||'after';
const today='2026-09-15',record=(date,weightKg,id)=>({id:id||'synthetic-'+date,date,weightKg,note:'Synthetic check-in',recordedAt:date+'T06:00:00.000Z'});
const fixtures={normal:[record('2026-08-18',85),record('2026-08-22',84.7),record('2026-08-29',84.9),record('2026-09-03',84.2),record('2026-09-08',83.8),record('2026-09-14',83.4)],empty:[],single:[record('2026-09-14',83.4)],two:[record('2026-09-08',84),record('2026-09-14',83.4)],close:Array.from({length:16},(_,i)=>record(weight.shiftDate('2026-08-30',i),84+[0,.1,-.1,0][i%4])),long:Array.from({length:400},(_,i)=>record(weight.shiftDate('2025-08-12',i),Math.round((90-i*.016+Math.sin(i)*.2)*10)/10)),gain:[record('2026-08-18',83),record('2026-09-14',84.2)]};
const seed=records=>({version:'0.6.33',completed:true,firstHomeWelcomeShown:true,profileStartedDate:'2025-08-01',companion:{enabled:false,configured:true,speechEnabled:false},personal:{givenName:'Synthetic weight fixture',dob:'1980-01-01',activeTimeZone:'Australia/Brisbane',homeTimeZone:'Australia/Brisbane'},health:{sex:'male',heightCm:175,goal:'lose',startingWeightKg:records[0]?.weightKg||0,currentWeightKg:records.at(-1)?.weightKg||0,startingWeightDate:records[0]?.date||'2025-08-01',selectedGoalWeight:75,lastCalculationWeightKg:records.at(-1)?.weightKg||0},weightHistory:records});
async function open(page,records){await page.evaluate(value=>localStorage.setItem('healthyEatingCompanionAlpha06',JSON.stringify(value)),seed(records));await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>typeof window.openAlpha05Feature==='function');await page.evaluate(()=>window.openAlpha05Feature('progress-history'));await page.locator('[data-period="all"]').click();}
async function audit(page,name){await page.evaluate(()=>document.fonts.ready);return page.evaluate(name=>{const svg=document.querySelector('.stage6-weight-chart svg'),r=svg?.getBoundingClientRect();const text=[...(svg?.querySelectorAll('text')||[])].map(n=>({text:n.textContent,r:n.getBoundingClientRect().toJSON()})),overlaps=[];for(let i=0;i<text.length;i++)for(let j=i+1;j<text.length;j++){const a=text[i].r,b=text[j].r;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([text[i].text,text[j].text]);}return {name,viewport:innerWidth,graph:r?.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,overlaps,clipped:text.filter(t=>t.r.left<r.left-1||t.r.right>r.right+1||t.r.top<r.top-1||t.r.bottom>r.bottom+1),points:svg?.querySelectorAll('[data-weight-point-id]').length||0,summary:document.querySelector('#weight-journey-summary').innerText,rangeControls:[...document.querySelectorAll('.history-period button')].map(n=>({text:n.innerText,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),valueLabels:[...(svg?.querySelectorAll('.stage6-value-label')||[])].map(n=>n.textContent)};},name);}
async function interactions(page,result){
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('healthyEatingCompanionAlpha06')));
  await open(page,fixtures.normal);
  const original=await saved();
  for(const range of weight.RANGES){
    await page.locator(`[data-period="${range.id}"]`).click();
    const ids=await page.locator('.stage6-weight-chart [data-weight-point-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.weightPointId));
    assert.deepEqual(ids,weight.recordsInRange(fixtures.normal,range.id,today).map(record=>record.id));
    assert.equal(await page.locator(`[data-period="${range.id}"]`).getAttribute('aria-pressed'),'true');
  }
  assert.deepEqual((await saved()).weightHistory,original.weightHistory);
  result.interactions.push('All seven ranges retain the exact expected saved records without writes');
  await page.locator('.stage6-weight-point').first().click();
  assert.match(await page.locator('.stage6-weight-point[aria-pressed="true"]').getAttribute('aria-label'),/85.0 kilograms/);
  await page.locator('.stage6-weight-point').first().focus();
  await page.keyboard.press('ArrowRight');
  assert.match(await page.locator('.stage6-weight-point[aria-pressed="true"]').getAttribute('aria-label'),/84.7 kilograms/);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.weightPointId),fixtures.normal[1].id);
  await page.keyboard.press('End');
  assert.match(await page.locator('.stage6-weight-point[aria-pressed="true"]').getAttribute('aria-label'),/83.4 kilograms/);
  result.interactions.push('Point tap, arrow-key selection, End and keyboard focus');
  await page.setViewportSize({width:320,height:568});
  await page.waitForFunction(()=>document.querySelector('.stage6-weight-chart svg').viewBox.baseVal.width<300);
  const resized=await audit(page,'live resize');assert(!resized.overflow);assert.deepEqual(resized.clipped,[]);assert.deepEqual(resized.overlaps,[]);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('.stage6-weight-chart svg').viewBox.baseVal.width>300);
  assert.deepEqual((await saved()).weightHistory,original.weightHistory);
  result.interactions.push('Live viewport resize reflows labels without changing weight records');
  await page.locator('#progress-history [data-go="home"]').click();
  await page.locator('#home.active').waitFor();
  await page.locator('[data-room="progress-weight"]').click();
  await page.locator('#progress-history.active').waitFor();
  result.interactions.push('Progress → Home → Weight & Progress');
  await page.locator('#progress-history .stage6-chart-heading [data-open-weight-checkin]').first().click();
  await page.locator('#weight-checkin.active').waitFor();
  assert.equal(await page.locator('#checkin-date').getAttribute('min'),'2025-08-01');
  assert.equal(await page.locator('#checkin-date').getAttribute('max'),today);
  await page.locator('#checkin-date').fill('2026-09-16');
  await page.locator('#save-checkin').click();
  assert.match(await page.locator('#checkin-error').innerText(),/Future-dated/);
  assert.deepEqual((await saved()).weightHistory,original.weightHistory);
  await page.locator('#checkin-date').fill('2025-07-31');
  await page.locator('#save-checkin').click();
  assert.match(await page.locator('#checkin-error').innerText(),/cannot be dated before/);
  assert.deepEqual((await saved()).weightHistory,original.weightHistory);
  result.interactions.push('Future and pre-profile dates rejected; input bounds and unchanged records confirmed');
  await page.locator('#checkin-date').fill(today);
  await page.locator('#checkin-weight').fill('83.2');
  await page.locator('#save-checkin-view').click();
  await page.locator('#progress-history.active').waitFor();
  let state=await saved();assert.equal(state.weightHistory.length,7);assert.equal(state.health.currentWeightKg,83.2);
  assert.match(await page.locator('#weight-journey-summary').innerText(),/1.8 kg/);
  result.interactions.push('Save & View creates one reading and updates current/loss to 83.2 / 1.8 kg');
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#weight-room-history [data-edit-weight-date="2026-08-22"]').click();
  await page.locator('#checkin-weight').fill('84.6');
  await page.locator('#save-checkin').click();
  state=await saved();assert.equal(state.weightHistory.length,7);assert.equal(state.weightHistory.find(r=>r.date==='2026-08-22').id,fixtures.normal[1].id);assert.equal(state.weightHistory.find(r=>r.date==='2026-08-22').weightKg,84.6);assert.equal(state.health.currentWeightKg,83.2);
  result.interactions.push('Historical edit confirms same-date replacement, preserves record ID/count and latest current weight');
  await page.locator('#checkin-date').fill('2026-09-13');
  await page.locator('#checkin-weight').fill('88');
  await page.locator('#save-checkin').click();
  assert.match(await page.locator('#a05-modal').innerText(),/That Weight Looks Quite Different/);
  assert.equal((await saved()).weightHistory.length,7);
  await page.locator('#a05-modal-cancel').click();
  assert.equal((await saved()).weightHistory.length,7);
  await page.locator('#save-checkin').click();
  await page.locator('#a05-modal-confirm').click();
  state=await saved();assert.equal(state.weightHistory.length,8);assert.equal(state.weightHistory.find(r=>r.date==='2026-09-13').weightKg,88);assert.equal(state.health.currentWeightKg,83.2);
  result.interactions.push('Large discrepancy prompts before save; cancel preserves data; explicit confirm saves once');
}

async function run(){
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:edge});
  const result={phase,errors:[],external:[],requests:0,reports:[],interactions:[]};
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024}]){
      const context=await browser.newContext({viewport,serviceWorkers:'block',timezoneId:'Australia/Brisbane'});
      // Fresh browser storage. Every request is served from SOURCE or rejected;
      // there is no network fallthrough and no protected deployment origin.
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.origin!==ORIGIN){result.external.push(url.href);return route.abort();}
        const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).slice(1),file=path.resolve(ROOT,relative);
        assert(file.startsWith(path.resolve(ROOT)+path.sep));assert(fs.existsSync(file),file);
        assert(fs.realpathSync(file).startsWith(fs.realpathSync(ROOT)+path.sep));
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.webp':'image/webp'};
        result.requests++;
        await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      const page=await context.newPage();
      page.on('pageerror',e=>result.errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
      await page.clock.setFixedTime(new Date(today+'T06:00:00Z'));
      await page.goto(ORIGIN,{waitUntil:'networkidle'});
      const cases=phase==='before'?['normal']:process.env.HEC_WEIGHT_CASES?process.env.HEC_WEIGHT_CASES.split(','):Object.keys(fixtures);
      for(const name of cases){
        await open(page,fixtures[name]);
        const r=await audit(page,name);result.reports.push(r);
        assert.equal(r.points,fixtures[name].length);
        const plotted=await page.locator('.stage6-weight-chart [data-weight-point-id]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.weightPointId,label:node.getAttribute('aria-label')})));
        plotted.forEach((point,i)=>{assert.equal(point.id,fixtures[name][i].id);assert(point.label.includes(fixtures[name][i].weightKg.toFixed(1)));});
        assert(r.summary.includes('75.0 kg'));
        const expected=weight.journeySummary(fixtures[name],{today,goal:'lose',goalWeight:75});
        if(expected.current){assert(r.summary.includes(expected.current.weightKg.toFixed(1)+' kg'));assert(r.summary.includes(expected.start.weightKg.toFixed(1)+' kg'));assert(r.summary.includes(expected.change.label.toUpperCase()));assert(r.summary.includes(expected.change.value.toFixed(1)+' kg'));}
        await page.screenshot({path:path.join(OUT,`${phase}-${viewport.width}-${name}-screen.png`)});
        await page.locator('.stage6-weight-chart-card').screenshot({path:path.join(OUT,`${phase}-${viewport.width}-${name}-chart.png`)});
        if(phase!=='before'){assert(!r.overflow,JSON.stringify(r));assert.deepEqual(r.overlaps,[],JSON.stringify(r));assert.deepEqual(r.clipped,[],JSON.stringify(r));assert(r.rangeControls.every(control=>control.height>=44));}
      }
      if(phase!=='before'&&viewport.width===390)await interactions(page,result);
      await context.close();
    }
  }finally{await browser.close();fs.writeFileSync(path.join(OUT,phase+'-report.json'),JSON.stringify(result,null,2));}
  console.log(JSON.stringify({phase,cases:result.reports.length,interactions:result.interactions,errors:result.errors,external:result.external,output:OUT}));
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);
}
module.exports={fixtures,open,audit,ORIGIN};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
