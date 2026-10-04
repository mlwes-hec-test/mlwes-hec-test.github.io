'use strict';
// A single complete SOURCE run after the focused and rendered gates are green.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-wave-3a'),X=require('./catalogue-round-two');
const plan=require('../data/catalogue-wave-3a/acceptance-plan.json'),resultFile=path.join(BASE,'verification/acceptance-result.json');
assert(!fs.existsSync(resultFile),'Complete acceptance already recorded; do not rerun broad suites for a favourable result');
const rendered=require('../data/catalogue-wave-3a/verification/rendered/wave-3a-rendered.json');assert(rendered.pass);assert.equal(rendered.generation,require('../release-manifest.json').generation);
const focused=require('../data/catalogue-wave-3a/verification/focused-result.json');assert(focused.pass);assert.equal(focused.generation,rendered.generation);assert.equal(focused.logSha256,X.hash(fs.readFileSync(path.join(BASE,'focused-final.log'))));
const startedAt=new Date().toISOString(),args=['--test','--test-concurrency='+plan.concurrency,...plan.testFiles],run=cp.spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',maxBuffer:30*1024*1024}),log=(run.stdout||'')+(run.stderr||'');
fs.writeFileSync(path.join(BASE,'verification/acceptance.log'),log);
const result={pass:run.status===0,exitCode:run.status,signal:run.signal,startedAt,completedAt:new Date().toISOString(),generation:require('../release-manifest.json').generation,command:[process.execPath,...args],testFiles:plan.testFiles.length,tests:Number(log.match(/(?:ℹ |# )tests (\d+)/)?.[1]||0),passed:Number(log.match(/(?:ℹ |# )pass (\d+)/)?.[1]||0),failed:Number(log.match(/(?:ℹ |# )fail (\d+)/)?.[1]||0),logSha256:X.hash(log),error:run.error?.message||null};
fs.writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=run.status===0?0:1;
