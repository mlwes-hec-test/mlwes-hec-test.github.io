'use strict';
// Explicit public HTML URLs only. Run manually for an authorised source wave.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
async function capture(directory,urls){
  fs.mkdirSync(directory,{recursive:true});const manifestPath=path.join(directory,'capture-manifest.json'),manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):[];
  for(const url of urls){const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||!['www.woolworths.com.au','www.woolworthsgroup.com.au'].includes(parsed.hostname)||!/^\/(shop\/(?:productdetails|browse|about)\/|au\/)/.test(parsed.pathname))throw Error('Only specified official public HTML pages are allowed');
    let row={url,retrievedAt:new Date().toISOString()};try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)}),raw=Buffer.from(await response.arrayBuffer()),sha256=crypto.createHash('sha256').update(raw).digest('hex'),file=sha256+'.html';fs.writeFileSync(path.join(directory,file),raw);row={...row,finalUrl:response.url,status:response.status,contentType:response.headers.get('content-type'),bytes:raw.length,sha256,file};}catch(error){row.error=String(error.message);}
    manifest.push(row);fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(row));if(row.error||row.status!==200)break;
  }
  return manifest;
}
if(require.main===module){const [directory,...urls]=process.argv.slice(2);if(!directory||!urls.length)throw Error('Usage: node scripts/capture_woolworths_public.js OUTPUT_DIRECTORY HTTPS_PUBLIC_URL ...');capture(directory,urls).catch(error=>{console.error(error);process.exitCode=1;});}
module.exports={capture};
