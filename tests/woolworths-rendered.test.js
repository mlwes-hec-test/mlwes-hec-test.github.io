'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('real Woolworths catalogue, brands, conflicts and eleven Review flows (optional synthetic Diary save) on both mobile viewports',{timeout:300000},async()=>{const report=await require('../scripts/audit_woolworths_edge').run({outputDirectory:process.env.HEC_WOOLWORTHS_OUTPUT});assert(report.pass);assert.equal(report.contexts.length,2);for(const c of report.contexts){assert.equal(c.reviews.length,11);assert.equal(c.restricted.length,3);}});
