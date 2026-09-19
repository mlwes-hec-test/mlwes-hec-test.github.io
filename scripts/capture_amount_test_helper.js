'use strict';
const assert=require('assert/strict');
module.exports=async function amount(page){if(await page.locator('#capture-amount:visible').count()){assert.equal(await page.locator('#capture-amount').inputValue(),'');assert.equal(await page.locator('#food-entry-editor.active').count(),0);await page.locator('#capture-amount').fill('1');await page.locator('#capture-amount-review').click();}};
