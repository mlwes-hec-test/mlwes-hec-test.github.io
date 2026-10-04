'use strict';
// Explicit bounded manifest only. No crawler, assortment expansion or runtime IO.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),X=require('./catalogue-round-two');
const BASE=path.resolve(__dirname,'../data/catalogue-wave-3a'),manifest=require('../data/catalogue-wave-3a/candidate-manifest.json');
async function run(){
 const records=[],targets=manifest.candidates.filter(c=>c.url).map(c=>({id:c.candidateId,url:c.url}));
 targets.push({id:'3A-A-hash-browns',url:'https://www.aldi.com.au/product/seasons-pride-hash-browns-1kg-000000000000621236'});
 fs.mkdirSync(path.join(BASE,'evidence'),{recursive:true});
 for(const target of targets){const retrievedAt=new Date().toISOString(),response=await fetch(target.url,{signal:AbortSignal.timeout(30000)}),html=await response.text(),file='evidence/'+target.id+'.html.gz';fs.writeFileSync(path.join(BASE,file),zlib.gzipSync(html));
  const record={...target,retrievedAt,status:response.status,file,sha256:X.hash(html),hashBasis:'uncompressed-public-response-bytes',lastModified:response.headers.get('last-modified'),images:[]};
  if(response.ok)for(const match of html.matchAll(/<button[^>]*aria-label="((?:Nutrients|Front shot) [^"]+)"[^>]*><img[^>]+>/g)){
   const imageUrl=[...match[0].matchAll(/https[^"\s,<>]+/g)].map(m=>m[0]).filter(u=>u.includes('dm.apac.cms.aldi.cx')).find(u=>u.includes('/864/'));if(!imageUrl)continue;
   const imageResponse=await fetch(imageUrl,{signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await imageResponse.arrayBuffer()),imageFile='evidence/'+target.id+'-'+(record.images.length+1)+'.jpg';fs.writeFileSync(path.join(BASE,imageFile),bytes);record.images.push({label:match[1],url:imageUrl,status:imageResponse.status,file:imageFile,sha256:X.hash(bytes)});
  }
  records.push(record);console.log(JSON.stringify({id:record.id,status:record.status,images:record.images.length}));
 }
 fs.writeFileSync(path.join(BASE,'public-captures.json'),JSON.stringify({capturedAt:new Date().toISOString(),scope:'Seven enrolled source identities and one corroboration for an enrolled retained hold',records},null,2)+'\n');
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
