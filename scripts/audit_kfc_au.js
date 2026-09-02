#!/usr/bin/env node
/* Read-only KFC Australia catalogue audit/refresh-review helper.
   It never edits the approved catalogue. A candidate JSON file can be diffed
   for human review before any future source update is accepted. */
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const sources=require(path.join(root,'food-sources.js'));
const raw=require(path.join(root,'kfc-au-catalogue-data.js'));
const current=require(path.join(root,'kfc-au-catalogue.js'));
const {buildIntegrityReport}=require(path.join(root,'kfc-au-integrity.js'));

function snapshotPayload(){return JSON.stringify({checkedDate:raw.checkedDate,categories:raw.categories,energyKj:raw.energyKj,currentProductPages:raw.currentProductPages,currentComponentEnergy:raw.currentComponentEnergy,sourceConflicts:raw.sourceConflicts,productOptions:raw.productOptions});}
function manifest(){
  const calculated=crypto.createHash('sha256').update(snapshotPayload()).digest('hex');
  return {sourceId:'kfc-au',checkedAt:raw.checkedAt,retrievalDate:raw.checkedDate,sourceUrls:raw.sourceCaptures,normalisedSnapshotSha256:raw.normalisedSnapshotSha256,calculatedSnapshotSha256:calculated,hashMatches:calculated===raw.normalisedSnapshotSha256,categories:raw.categories.map(category=>({name:category.name,rowCount:category.items.length})),inventory:current.source.inventory,refreshPolicy:current.source.refreshPolicy};
}
function candidateFrom(file){
  const parsed=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
  if(!parsed?.source||!Array.isArray(parsed?.items))throw new Error('Candidate must contain source and items arrays in the shared food-source schema.');
  return parsed;
}
async function fetchOfficialMenu(){
  const response=await fetch(raw.menuUrl,{headers:{accept:'text/html','user-agent':'HEC-Founder-Trial-KFC-Audit/0.6.33'}});if(!response.ok)throw new Error(`Official menu fetch returned HTTP ${response.status}`);const html=await response.text(),text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&(?:reg|trade);/gi,'').replace(/&#(?:174|8482);/g,'').replace(/\s+/g,' ').toLowerCase(),known=[...new Set(raw.categories.flatMap(category=>category.items))],normal=value=>String(value).replace(/[®™]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim().toLowerCase(),missingKnownProducts=known.filter(name=>!text.includes(normal(name))),missingKnownCategories=raw.categories.map(category=>category.name).filter(name=>!text.includes(normal(name)));
  return {url:raw.menuUrl,retrievedAt:new Date().toISOString(),httpStatus:response.status,contentLength:html.length,contentSha256:crypto.createHash('sha256').update(html).digest('hex'),knownProductsChecked:known.length,knownProductsPresent:known.length-missingKnownProducts.length,missingKnownProducts,knownCategoriesChecked:raw.categories.length,missingKnownCategories,reviewRequired:missingKnownProducts.length>0||missingKnownCategories.length>0};
}
async function run(argv=process.argv.slice(2)){
  const compareIndex=argv.indexOf('--compare'),report={integrity:buildIntegrityReport(),manifest:manifest()};
  if(compareIndex>=0){const file=argv[compareIndex+1];if(!file)throw new Error('--compare requires a candidate JSON path');const candidate=candidateFrom(file);report.candidate={path:path.resolve(file),diff:sources.diffCatalogues(current,candidate),validation:sources.normaliseCatalogue(candidate).items.length};}
  if(argv.includes('--fetch'))report.liveFetch=await fetchOfficialMenu();
  console.log(JSON.stringify(report,null,2));
  if(report.integrity.errorCount||!report.manifest.hashMatches)process.exitCode=1;
  return report;
}
if(require.main===module)run().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message,retainedCatalogueVersion:current.source.catalogueVersion,retainedLastKnownGood:true},null,2));process.exitCode=1;});
module.exports={snapshotPayload,manifest,fetchOfficialMenu,run};
