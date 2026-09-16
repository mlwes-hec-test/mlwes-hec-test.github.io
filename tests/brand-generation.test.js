'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const build=require('../scripts/build_brand_catalogue');
test('audited brand generation is byte deterministic and committed outputs match',()=>{
  const first=build.outputs(),second=build.outputs();assert.deepEqual(first,second);
  for(const [file,raw] of Object.entries(first))assert.equal(fs.readFileSync(path.resolve(__dirname,'../data/brand-au',file),'utf8'),raw,file);
  const report=JSON.parse(first['build-report.json']);assert.equal(report.products,1922);assert.equal(report.brands,342);assert.equal(report.retailerCanonicalReuse,34);assert.equal(report.newCanonicalIdentities,0);
});
