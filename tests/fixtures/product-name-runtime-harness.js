'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../../food-catalogue'),S=require('../../search-foundation'),R=require('../../retailer-catalogue'),adapter=require('../../retailer-source'),{index}=require('../../woolworths-au-catalogue');
const root=path.resolve(__dirname,'../..');
async function lookup(raw,records,{runtime=fs.readFileSync(path.join(root,'alpha06.js'),'utf8')}={}){
  adapter.register(index,{loadJSON:async file=>JSON.parse(fs.readFileSync(path.join(root,'data/woolworths-au',file)))});
  const block=(start,end)=>{const from=runtime.indexOf(start),to=runtime.indexOf(end,from);if(from<0||to<=from)throw Error('Missing production controller dependency: '+start);return runtime.slice(from,to);};
  const intent=S.interpretFoodIntent(raw,{records,sourceIntent:C.queryIntent(raw)}),requests=[],results={innerHTML:''},commits=[];
  const context={C8:C,REG29:require('../../entity-registry'),fc633Revision:0,searchSession633:{rawQuery:raw,revision:1},ss633Current:(revision,query)=>revision===1&&query===raw,ext:{ui:{}},allFoods:()=>[],ps34SyncGuidedUiState(){},ss633Commit:(reason,value)=>commits.push({reason,intent:value}),saveExt(){},us633RenderSubmitted(){},by:id=>id==='food-search'?{blur(){}}:results,window:{HECOpenFoodFactsAU:{async search(query){requests.push({provider:'OFF',query});return {total:records.length,foods:records.filter(food=>C.explicitIdentityMatch(food,query)),hasMore:false};}},HECRetailerCatalogue:{async search(query,options){requests.push({provider:'retailer',query});return R.search(query,options);}}}};
  const shared=runtime.includes('async function catalogueSearch633(')?block('async function catalogueSearch633(','\nasync function catalogueBarcode633')+block('const canonicalCatalogueRecords=','\nfunction getFood('):'';
  vm.runInNewContext(shared+block('async function fc633StartExplicit(','\nfunction fc633Candidates('),context);
  const handled=await context.fc633StartExplicit(raw,intent,'enter');
  return {handled,intent,requests,commits,model:context.searchSession633.submittedModel,rawAfter:context.searchSession633.rawQuery,renderedText:results.innerHTML};
}
module.exports={lookup};
