'use strict';
// Disposable, synthetic SOURCE-only browser checks. No real browser profile or network fallthrough.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixtures,open:openFixture,audit,ORIGIN}=require('./audit_weight_progress_polish');
const {browserTools}=require('./audit_physical_form_measures_edge');
const ROOT=path.resolve(__dirname,'..');
const OUT=process.argv[2]||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'hec-weight-history-'));
const phase=process.argv[3]||'after';
const cases={single:fixtures.single,two:fixtures.two,several:fixtures.normal,long:fixtures.long};
// Match the existing baseline-note normalisation from the start, keeping the app and mirror fixture consistent.
const open=(page,records)=>openFixture(page,records.map((record,index)=>index===0?{...record,note:'Starting Weight',isStartingWeight:true}:{...record}));
const dateLabel=date=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00')).replace(',','');
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('healthyEatingCompanionAlpha06')));
const rowFor=(page,record)=>page.locator(`#weight-room-history [data-edit-weight-date="${record.date}"]`);
async function progress(page){await page.evaluate(()=>window.openAlpha05Feature('progress-history'));await page.locator('[data-period="all"]').click();}
async function fields(page,record){
  const actual=(await saved(page)).weightHistory.find(item=>item.date===record.date);
  await page.locator('#weight-checkin.active').waitFor();
  assert.equal(await page.locator('#checkin-date').inputValue(),record.date);
  assert.equal(Number(await page.locator('#checkin-weight').inputValue()),record.weightKg);
  assert.equal(await page.locator('#checkin-note').inputValue(),actual.note);
  assert.match(await page.locator('#checkin-result').innerText(),/Editing Historical Entry/);
}
async function geometry(page){return page.locator('#weight-room-history .weight-room-history-row').evaluateAll(rows=>rows.map(row=>{
  const box=row.getBoundingClientRect(),style=getComputedStyle(row);
  const children=[...row.querySelectorAll('time,strong,.weight-room-edit-cue,small')];
  return {width:box.width,height:box.height,tag:row.tagName,name:row.getAttribute('aria-label'),
    outline:style.outlineStyle,overflow:row.scrollWidth>row.clientWidth,
    clipped:children.some(child=>{const b=child.getBoundingClientRect();return b.left<box.left||b.right>box.right||b.bottom>box.bottom||b.top<box.top;}),
    nested:row.querySelectorAll('button,a,input,[tabindex]').length};
}));}
async function capture(page,name){
  await page.locator('.weight-room-history-card').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(OUT,`${phase}-${name}-history-screen.png`)});
  if(!name.endsWith('long'))await page.locator('.weight-room-history-card').screenshot({path:path.join(OUT,`${phase}-${name}-history.png`)});
}
async function editing(page,records){
  await open(page,records);
  const baseline=await saved(page),indices=[...new Set([0,Math.floor(records.length/2),records.length-1])];
  for(const index of indices){
    const record=records[index];
    // Activate well away from the pencil: the row's left inset is still part of its button.
    await rowFor(page,record).click({position:{x:5,y:24}});
    await fields(page,record);
    await page.locator('#checkin-weight').fill((record.weightKg-.1).toFixed(1));
    await page.locator('#weight-checkin [data-go="home"]').click();
    assert.deepEqual((await saved(page)).weightHistory,baseline.weightHistory,'Back without saving preserves history');
    await progress(page);
  }
  // Exercise both the oldest and current record (one distinct target for a single-entry fixture).
  for(const index of [...new Set([0,records.length-1])]){
    const record=records[index],before=await saved(page),value=Number((record.weightKg-.1).toFixed(1));
    await rowFor(page,record).click();await fields(page,record);
    await page.locator('#checkin-weight').fill(value.toFixed(1));
    let prompt='';
    page.once('dialog',async dialog=>{prompt=dialog.message();await dialog.dismiss();});
    await page.locator('#save-checkin').click();
    assert.match(prompt,/already recorded/);
    assert.deepEqual((await saved(page)).weightHistory,before.weightHistory,'Cancel replacement preserves history');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#save-checkin-view').click();
    await page.locator('#progress-history.active').waitFor();
    const after=await saved(page),edited=after.weightHistory.find(item=>item.id===record.id);
    assert.equal(after.weightHistory.length,before.weightHistory.length);assert.equal(edited.weightKg,value);
    assert.equal(edited.date,record.date);assert.equal(edited.note,before.weightHistory.find(item=>item.id===record.id).note);
    assert.deepEqual(after.weightHistory.filter(item=>item.id!==record.id),before.weightHistory.filter(item=>item.id!==record.id));
    const latest=index===records.length-1?value:records.at(-1).weightKg;
    assert.equal(after.health.currentWeightKg,latest);
    assert((await page.locator('#weight-journey-summary').innerText()).includes(latest.toFixed(1)+' kg'));
    assert((await rowFor(page,record).innerText()).includes(value.toFixed(1)+' kg'));
    await page.locator('[data-period="all"]').click();
    assert.equal(await page.locator('.stage6-weight-chart [data-weight-point-id]').count(),records.length);
    assert((await page.locator(`.stage6-weight-chart [data-weight-point-id="${record.id}"]`).getAttribute('aria-label')).includes(value.toFixed(1)));
  }
}
async function run(){
  fs.mkdirSync(OUT,{recursive:true});
  const result={phase,passed:0,failed:0,checks:[],errors:[],external:[],reports:[]};
  const check=async(name,fn)=>{try{await fn();result.passed++;result.checks.push({name,pass:true});}catch(error){result.failed++;result.checks.push({name,pass:false,error:error.message});throw error;}};
  const {chromium,edge}=browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024}]){
      const context=await browser.newContext({viewport,serviceWorkers:'block',timezoneId:'Australia/Brisbane',locale:'en-AU',hasTouch:true});
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.origin!==ORIGIN){result.external.push(url.href);return route.abort();}
        const file=path.resolve(ROOT,decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).slice(1));
        assert(file.startsWith(ROOT+path.sep));assert(fs.realpathSync(file).startsWith(fs.realpathSync(ROOT)+path.sep));
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.webp':'image/webp'};
        await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      const page=await context.newPage();
      page.on('pageerror',error=>result.errors.push({type:'runtime',message:error.message}));
      page.on('console',message=>{if(message.type()==='error')result.errors.push({type:'console',message:message.text()});});
      await page.clock.setFixedTime(new Date('2026-09-15T06:00:00Z'));
      await page.goto(ORIGIN,{waitUntil:'networkidle'});
      for(const [name,records] of Object.entries(phase==='before'?{several:cases.several}:cases)){
        await check(`${viewport.width}: ${name} history and graph`,async()=>{
          await open(page,records);const graph=await audit(page,name),rows=await geometry(page);
          const svg=await page.locator('.stage6-weight-chart svg').evaluate(node=>node.outerHTML);
          result.reports.push({viewport,name,graph,rows,svg});
          assert.equal(rows.length,records.length);assert.equal(graph.points,records.length);assert(!graph.overflow);
          await capture(page,`${viewport.width}-${name}`);
          if(phase==='before')return;
          assert.deepEqual(graph.clipped,[]);assert.deepEqual(graph.overlaps,[]);
          assert(rows.every(row=>row.tag==='BUTTON'&&row.height>=48&&!row.clipped&&!row.overflow&&!row.nested));
          assert.equal(await page.locator('#weight-room-history button').count(),records.length);
          const rendered=await page.locator('#weight-room-history button').evaluateAll(nodes=>nodes.map(node=>({date:node.dataset.editWeightDate,text:node.innerText,name:node.getAttribute('aria-label'),cue:node.querySelector('.weight-room-edit-cue')?.getAttribute('aria-hidden')})));
          records.slice().reverse().forEach((record,index)=>{
            const row=rendered[index];assert.equal(row.date,record.date);assert(row.text.includes(dateLabel(record.date)));
            assert(row.text.includes(record.weightKg.toFixed(1)+' kg'));assert.equal(row.name,`Edit weight for ${dateLabel(record.date)}, ${record.weightKg.toFixed(1)} kilograms`);assert.equal(row.cue,'true');
          });
          assert.equal(await page.locator('#weight-room-history').getByRole('button',{name:/delete/i}).count(),0);
          if(name==='several'){
            const before=JSON.parse(fs.readFileSync(path.join(OUT,'before-report.json'),'utf8')).reports.find(report=>report.viewport.width===viewport.width);
            assert.equal(svg,before.svg,'graph SVG is unchanged for identical synthetic records');
          }
        });
      }
      if(phase!=='before'){
        await check(`${viewport.width}: long localised date/note wrapping and touch`,async()=>{
          await open(page,cases.several);
          await rowFor(page,cases.several.at(-1)).locator('time').evaluate(node=>{node.textContent='Monday, 14 September 2026 / Montag, 14. September 2026';});
          await rowFor(page,cases.several.at(-1)).locator('small').evaluate(node=>{node.textContent='SyntheticVeryLongUnbrokenNote'.repeat(5);});
          const rows=await geometry(page);assert(rows.every(row=>!row.clipped&&!row.overflow&&row.height>=48));
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
          await capture(page,`${viewport.width}-long-date`);
          await rowFor(page,cases.several.at(-1)).tap();await fields(page,cases.several.at(-1));
        });
        if(viewport.width===390){
          for(const [name,records] of Object.entries(cases))await check(`${name}: correct record, Back, Cancel and Save`,()=>editing(page,records));
          await check('Tab focus, Enter and Space activate the existing editor',async()=>{
            for(const key of ['Enter','Space']){
              await open(page,cases.two);
              await page.locator('.weight-room-history-card [data-open-weight-checkin]').focus();await page.keyboard.press('Tab');
              const row=rowFor(page,cases.two.at(-1));
              assert(await row.evaluate(node=>node===document.activeElement&&node.matches(':focus-visible')));
              const focus=await row.evaluate(node=>({width:parseFloat(getComputedStyle(node).outlineWidth),style:getComputedStyle(node).outlineStyle}));
              assert(focus.width>=2&&focus.style!=='none');
              await capture(page,`390-focus-${key}`);await page.keyboard.press(key);await fields(page,cases.two.at(-1));
            }
          });
          await check('Existing edit rejects future and pre-profile dates',async()=>{
            await open(page,cases.two);await rowFor(page,cases.two[0]).click();const before=await saved(page);
            for(const [date,message] of [['2026-09-16',/Future-dated/],['2025-07-31',/cannot be dated before/]]){
              await page.locator('#checkin-date').fill(date);await page.locator('#save-checkin').click();
              assert.match(await page.locator('#checkin-error').innerText(),message);assert.deepEqual((await saved(page)).weightHistory,before.weightHistory);
            }
          });
          await check('Existing >2 kg warning, cancellation and confirmed save',async()=>{
            await open(page,cases.two);await rowFor(page,cases.two.at(-1)).click();const before=await saved(page);
            await page.locator('#checkin-weight').fill('87');await page.locator('#save-checkin').click();
            assert.match(await page.locator('#a05-modal').innerText(),/That Weight Looks Quite Different/);
            assert.deepEqual((await saved(page)).weightHistory,before.weightHistory);
            await page.locator('#a05-modal-cancel').click();assert.deepEqual((await saved(page)).weightHistory,before.weightHistory);
            await page.locator('#save-checkin-view').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#a05-modal-confirm').click();
            await page.locator('#progress-history.active').waitFor();
            const after=await saved(page);assert.equal(after.weightHistory.length,2);assert.equal(after.health.currentWeightKg,87);
            assert.deepEqual(after.weightHistory.find(record=>record.id===cases.two[0].id),before.weightHistory.find(record=>record.id===cases.two[0].id));
          });
          await check('Weight / Progress → Home → Weight / Progress navigation',async()=>{
            await progress(page);await page.locator('#progress-history [data-go="home"]').click();await page.locator('#home.active').waitFor();
            await page.locator('[data-room="progress-weight"]').click();await page.locator('#progress-history.active').waitFor();
            assert.equal(await page.locator('.stage6-weight-chart svg').count(),1);
          });
        }
      }
      await context.close();
    }
    await check('Zero material runtime/console errors and zero external requests',async()=>{assert.deepEqual(result.errors,[]);assert.deepEqual(result.external,[]);});
  }finally{
    await browser.close();fs.writeFileSync(path.join(OUT,phase+'-report.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({phase,passed:result.passed,failed:result.failed,errors:result.errors,external:result.external,output:OUT}));
  }
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
