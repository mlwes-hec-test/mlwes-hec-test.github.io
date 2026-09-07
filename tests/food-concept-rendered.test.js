'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('actual Search renders shortlists before guided questions, exact identities and complete Hash Brown source choices',{timeout:300000},async()=>{const report=await require('../scripts/audit_food_concept_resolution_edge.js').run();assert.equal(report.pass,true,JSON.stringify(report.failures));assert.equal(report.contexts[0].scenarios.length,27);assert.equal(report.contexts[0].sourceBreadth['packaged-frozen'].candidates.length,23);});
