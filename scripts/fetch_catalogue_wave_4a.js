'use strict';
// Explicit bounded public captures only. No discovery crawler or authenticated requests.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const BASE=path.resolve(__dirname,'../data/catalogue-wave-4a');
const urls={
 'iga-brands':'https://www.iga.com.au/our-brands/',
 'iga-banners':'https://www.iga.com.au/have-your-say-at-iga/',
 'metcash-brands':'https://www.metcash.com/about-us/latest-news/iga-partnership-the-great-unwaste/',
 'chia-melton':'https://melton.shop.morgansiga.com.au/lines/community-co-aussie-black-chia-seeds-350g',
 'quick-oats':'https://www.igashop.com.au/product/black-gold-quick-oats-73833',
 'tuna-brine':'https://www.igashop.com.au/product/black-gold-tuna-in-brine-22298',
 'date-crackers':'https://www.igashop.com.au/product/community-co-date-apricot-fruit-crackers-545563',
 'milk-3l':'https://communityco.com.au/product/milk/community-co-full-cream-milk-3l/'
};
async function capture(){const records=[];fs.mkdirSync(path.join(BASE,'public'),{recursive:true});for(const [id,url]of Object.entries(urls)){const target=path.join(BASE,'public',id+'.html.gz');if(fs.existsSync(target))throw Error('Refuse to replace capture '+id);const retrievedAt=new Date().toISOString();try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)}),raw=Buffer.from(await r.arrayBuffer());fs.writeFileSync(target,zlib.gzipSync(raw));records.push({id,url,finalUrl:r.url,status:r.status,retrievedAt,file:'public/'+id+'.html.gz',sha256:crypto.createHash('sha256').update(raw).digest('hex'),hashBasis:'uncompressed-response-body',usable:r.ok});console.log(id,r.status,raw.length);}catch(e){records.push({id,url,retrievedAt,usable:false,error:e.message});console.log(id,e.message);}}fs.writeFileSync(path.join(BASE,'public-captures.json'),JSON.stringify(records,null,2)+'\n');}
if(require.main===module)capture().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={urls};
