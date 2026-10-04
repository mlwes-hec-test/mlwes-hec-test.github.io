'use strict';
// Explicit, offline extraction from the already captured public manufacturer HTML.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'../data/catalogue-wave-1b');
function extract(raw,capture){
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),capture.sha256);
  assert.equal(capture.status,200);
  const slug=new URL(capture.url).pathname.split('/').pop(),found=[];
  function walk(value){
    if(!value||typeof value!=='object')return;
    if(value.fields?.slug===slug&&value.fields?.nutritionalInformation)found.push(value);
    for(const child of Object.values(value))if(typeof child==='object')walk(child);
  }
  for(const match of raw.toString().matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)){
    const text=JSON.parse(match[1])[1];if(typeof text!=='string')continue;
    for(const line of text.split('\n')){const at=line.indexOf(':');if(at<0)continue;let value;try{value=JSON.parse(line.slice(at+1));}catch{continue;}walk(value);}
  }
  assert(found.length,'Captured page has no matching product');
  const p=found[0],f=p.fields,n=f.nutritionalInformation;
  for(const other of found)assert.deepEqual(other.fields.nutritionalInformation,n);
  return {schemaVersion:1,sourceType:'official-au-manufacturer',sourceId:'campbells-au',recordId:p.sys.id,
    provenance:capture,sourceContentUpdatedAt:p.sys.updatedAt,nutritionContentUpdatedAt:n.sys.updatedAt,
    dateNote:'Source CMS modification dates, not asserted formulation or publication dates.',
    title:f.title,displayName:f.buyNow.fields.displayName,brand:"Campbell's",packLabel:f.productVariationLabel,
    ingredients:f.ingredients,nutrition:n.fields,
    australianRetailerLinks:f.buyNow.fields.stores.filter(s=>s.fields?.country?.includes('Australia')).map(s=>({name:s.fields.name,url:s.fields.productUrl})),
    privateTestingApproved:false,publicReleaseReviewRequired:true};
}
if(require.main===module){const capture=JSON.parse(fs.readFileSync(path.join(base,'manufacturer-capture.json'))),record=extract(fs.readFileSync(path.join(process.argv[2],capture.sha256+'.html')),capture);fs.writeFileSync(path.join(base,'manufacturer-facts.json'),JSON.stringify(record,null,2)+'\n');console.log(record.title);}
module.exports={extract};
