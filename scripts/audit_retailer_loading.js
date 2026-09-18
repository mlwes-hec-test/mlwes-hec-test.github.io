'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),C=require('../food-catalogue'),R=require('../retailer-catalogue'),X=require('./catalogue-round-two');
async function run(){
 const report={generation:require('../release-manifest.json').generation,retailers:{},routes:[]};
 for(const id of ['aldi','woolworths','coles']){
  const index=require('../'+id+'-au-catalogue').index,d=R.directory(id),families=new Set(index.retailer.houseBrandFamilies.map(f=>f.key));
  // Derive expected membership from complete source facts, independently of runtime postings.
  const raw=index.files.flatMap(s=>require('../data/'+id+'-au/'+s.path).records);
  const eligible=C.canonicaliseRecords(raw).filter(f=>families.has(C.brandKey(f.brand))&&X.membership(f,id).length&&!f.legacyPreviewOnly&&f.itemStatus!=='retired'&&(!index.selectableOnly||f.browseEligible===true&&C.productEligibility(f).addability.normalLoggingAllowed));
  const loggable=eligible.filter(f=>C.productEligibility(f).addability.normalLoggingAllowed).length;
  report.retailers[id]={visible:eligible.length,loggable,restricted:eligible.length-loggable,categories:d.categories.length,brands:d.brands.length};
  assert.equal(d.total,eligible.length);
  for(const choice of [...[...d.categories,{id:'*',label:'All Items',count:d.total}].map(c=>({kind:'category',key:c.id,label:c.label,count:c.count})),...d.brands.map(b=>({kind:'brand',key:b.key,label:b.name,count:b.count}))]){
   const expected=eligible.filter(f=>choice.kind==='brand'?C.brandKey(f.brand)===choice.key:choice.key==='*'||(f.browseCategoryId?[f.browseCategoryId]:X.membership(f,id).flatMap(m=>m.categoryIds)).includes(choice.key));
   const keys=new Set(expected.map(C.canonicalKey)),session=R.createSession(id),actual=[];
   const options=choice.kind==='brand'?{categoryId:'*',brandKey:choice.key}:{categoryId:choice.key};
   for(let offset=0;;offset+=20){await R.load(session,{...options,offset});assert.equal(session.loading,false);assert.equal(session.error,'');assert(session.result);actual.push(...session.result.foods);if(!session.result.hasMore)break;}
   const row={retailer:id,...choice,expected:keys.size,expectedLoggable:expected.filter(f=>C.productEligibility(f).addability.normalLoggingAllowed).length,actual:actual.length,settled:!session.loading,state:'PASS'};
   assert(row.expected>0);if(choice.kind==='brand')assert(row.expectedLoggable>0);assert.equal(choice.count,keys.size);assert.deepEqual(new Set(actual.map(C.canonicalKey)),keys);assert.equal(actual.length,keys.size);report.routes.push(row);
  }
 }
 return report;
}
if(require.main===module)run().then(r=>{const out=process.argv[2];if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');}console.log(JSON.stringify({retailers:r.retailers,routes:r.routes.length}));}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
