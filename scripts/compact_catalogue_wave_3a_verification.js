'use strict';
// Keep readable summaries beside lossless, hash-verified browser evidence.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),X=require('./catalogue-round-two');
const base=path.resolve(__dirname,'../data/catalogue-wave-3a/verification/rendered');
assert(require(path.join(base,'wave-3a-rendered.json')).pass,'Only compact completed checks');
function diagnostic(d){return Object.fromEntries(Object.entries(d).map(([k,v])=>[k,Array.isArray(v)?{count:v.length}:v]));}
function concepts(r){return {...r,contexts:r.contexts.map(c=>({viewport:c.viewport,diagnostic:diagnostic(c.diagnostic),scenarios:c.scenarios.map(s=>({query:s.query,failures:s.failures})),flows:c.flows.map(f=>({query:f.query,identity:f.identity,measures:f.measures,review:f.review,diary:f.diary}))}))};}
for(const relative of ['wave-1b-regression/concepts/food-concepts.json','wave-1b-regression/wave-1b-rendered.json']){
 const file=path.resolve(base,relative);assert(file.startsWith(base+path.sep));const raw=fs.readFileSync(file),report=JSON.parse(raw);assert(report.pass);if(report.storage)continue;
 const packed=zlib.gzipSync(raw,{level:9});assert.deepEqual(zlib.gunzipSync(packed),raw);fs.writeFileSync(file+'.gz',packed);
 const summary=report.concepts?{...report,diagnostic:diagnostic(report.diagnostic),concepts:concepts(report.concepts)}:concepts(report);
 summary.storage={format:'Readable summary; lossless full evidence retained alongside',fullReport:path.basename(file)+'.gz',fullSha256:X.hash(raw),fullBytes:raw.length};
 fs.writeFileSync(file,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({file:relative,fullBytes:raw.length,compressedBytes:packed.length,sha256:summary.storage.fullSha256}));
}
