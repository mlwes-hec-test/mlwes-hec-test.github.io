'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('canonical cached results, shared retailer browse and GTIN conflicts on two mobile viewports',{timeout:240000},async()=>{const report=await require('../scripts/audit_retailer_architecture_edge').run({outputDirectory:process.env.HEC_RETAILER_OUTPUT});assert(report.pass);assert.equal(report.contexts.length,2);for(const context of report.contexts){assert.equal(context.scenarios.length,13);assert.equal(context.reviews.length,2);}});
