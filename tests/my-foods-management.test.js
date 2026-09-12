'use strict';
const test=require('node:test');
test('My Foods removes exact current, legacy, migrated and protected identities through real controls and persists after reopen',{timeout:180000},async()=>{
  await require('../scripts/audit_my_foods_management_edge').run({outputDirectory:process.env.HEC_MY_FOODS_OUTPUT});
});
