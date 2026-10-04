'use strict';
// Compare an exact query against accepted SOURCE bytes without altering Git state.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge'),t=require('./audit_brand_wave_edge'),w=require('./audit_catalogue_wave_1b_edge');
async function run(out){
 fs.mkdirSync(out,{recursive:true});const head=require('../data/catalogue-wave-3a/baseline.json').startingHead,files=cp.execFileSync('git',['-c','core.safecrlf=false','diff','--name-only',head],{cwd:qa.ROOT,encoding:'utf8'}).trim().split('\n').filter(f=>/^(?:(?:brand|coles|woolworths|aldi)-au-catalogue\.js|brand-catalogue\.js|index\.html|release-manifest\.json|service-worker\.js|data\/(?:brand|coles|woolworths|aldi)-au\/products\/)/.test(f));
 const old=new Map(files.map(file=>[file,cp.execFileSync('git',['show',head+':'+file],{cwd:qa.ROOT,maxBuffer:30*1024*1024})])),report={pass:false,head,contexts:[]},{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
 try{for(const query of ['Seafood','frozen fries','Flat White'])for(const phase of ['accepted-source','wave-3a']){const diagnostic=qa.evidence(),context=await qa.contextFor(browser,{width:390,height:844},diagnostic,phase==='accepted-source'?{readBody:(relative,file)=>old.get(relative)||fs.readFileSync(file)}:{}),page=await context.newPage();await qa.openLibrary(page);await t.submit(page,query);const choices=(await w.rows(page)).map(r=>({id:r.id,name:r.food.name,brand:r.food.brand,eligible:r.eligible,group:r.group}));report.contexts.push({query,phase,choices,diagnostic});await page.screenshot({path:path.join(out,query.replaceAll(' ','-')+'-'+phase+'.png'),fullPage:true});qa.requireEvidence(diagnostic);await context.close();}
  for(let i=0;i<report.contexts.length;i+=2)assert.deepEqual(report.contexts[i].choices,report.contexts[i+1].choices,report.contexts[i].query);report.pass=true;return report;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(report,null,2)+'\n');}
}
if(require.main===module)run(process.argv[2]).then(r=>console.log(JSON.stringify({pass:r.pass,choices:r.contexts.map(c=>({phase:c.phase,choices:c.choices}))}))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
