'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),audit=require('../scripts/audit_navigation_startup_edge');
for(const viewport of [{width:390,height:844},{width:320,height:568}])test(`returning TEST profile retains real navigation and search ownership at ${viewport.width}x${viewport.height}`,{timeout:90000},async()=>{const report=await audit.run({viewport});assert(report.pass);assert(report.actions.length>=25);});
