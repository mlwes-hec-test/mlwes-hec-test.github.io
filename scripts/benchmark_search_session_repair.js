#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const catalogue=require('../food-catalogue.js');
const sources=require('../food-sources.js');
require('../mcdonalds-au-catalogue.js');
require('../kfc-au-catalogue.js');
const largeAudit=require('./audit_open_food_facts_au.js');
const progressiveAudit=require('./audit_progressive_food_resolution.js');
const ROOT=path.resolve(__dirname,'..'),modules=process.env.HEC_WORKSPACE_NODE_MODULES;

function percentile(values,fraction){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*fraction))]||0;}
function stats(values){return{iterations:values.length,medianMs:Number(percentile(values,.5).toFixed(3)),p95Ms:Number(percentile(values,.95).toFixed(3)),maxMs:Number(Math.max(...values).toFixed(3))};}
async function genericSearch(){const queries=['chips','margarine','milk','bread'],values=[];for(let index=0;index<100;index++){const start=performance.now();await largeAudit.api.search(queries[index%queries.length],{limit:24});values.push(performance.now()-start);}return stats(values);}
function kfcRanking(){const records=sources.foodRecords({sourceId:'kfc-au'}),queries=['KFC','KFC Zinger Burger','KFC Wicked Wings','KFC Popcorn Chicken','KFC chips','banana'],values=[];for(let run=0;run<25;run++)for(const query of queries){const start=performance.now();for(const food of records)catalogue.rank(food,query);values.push(performance.now()-start);}return stats(values);}
function server(){const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};return http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname),relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),file=path.resolve(ROOT,relative);if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){response.writeHead(404);response.end('Not found');return;}response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);});}
async function characterRecognition(){if(!modules)return{available:false,reason:'HEC_WORKSPACE_NODE_MODULES is not set'};const {chromium}=require(path.join(modules,'playwright')),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);if(!edge)return{available:false,reason:'Microsoft Edge is not installed'};const app=server();await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,executablePath:edge});try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(`http://127.0.0.1:${app.address().port}/index.html`,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.HEC_SEARCH_SESSION_TEST);return await page.evaluate(()=>{const phrases=['KFC','KFC 6 Wicked Wings',"McDonald's Big Mac",'Flora ProActiv Light'],values=[];for(let run=0;run<100;run++)for(const phrase of phrases){let prefix='';for(const character of phrase){prefix+=character;const start=performance.now();window.HEC_SEARCH_SESSION_TEST.intent(prefix);values.push(performance.now()-start);}}values.sort((a,b)=>a-b);const at=fraction=>values[Math.min(values.length-1,Math.floor(values.length*fraction))]||0;return{available:true,iterations:values.length,medianMs:Number(at(.5).toFixed(3)),p95Ms:Number(at(.95).toFixed(3)),maxMs:Number(Math.max(...values).toFixed(3))};});}finally{await browser.close();await new Promise(resolve=>app.close(resolve));}}

async function run(){const products=largeAudit.allProducts(largeAudit.read('manifest.json')),report={genericSearch:await genericSearch(),largeCatalogueSearch:await largeAudit.performanceAudit(products,500),kfcRanking:kfcRanking(),progressiveResolution:progressiveAudit.resolutionPerformance(500),portionProfile:progressiveAudit.portionPerformance(500),characterRecognition:await characterRecognition()};const limits={genericSearch:250,largeCatalogueSearch:250,kfcRanking:250,progressiveResolution:250,portionProfile:100,characterRecognition:20},failures=Object.entries(limits).filter(([key,limit])=>report[key]?.available!==false&&report[key].p95Ms>=limit).map(([key,limit])=>`${key} p95 ${report[key].p95Ms} ms >= ${limit} ms`);report.thresholdsMs=limits;report.failures=failures;process.stdout.write(`${JSON.stringify(report,null,2)}\n`);if(failures.length)process.exitCode=1;}
if(require.main===module)run().catch(error=>{console.error(error);process.exit(1);});
module.exports={run};
