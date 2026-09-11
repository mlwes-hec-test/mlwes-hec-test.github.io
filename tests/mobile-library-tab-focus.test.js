'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../scripts/audit_mobile_library_tabs_edge');

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(`Food Library tabs retain rendered pointer, touch and keyboard activation at ${viewport.width}x${viewport.height}`, { timeout: 120000 }, async () => {
    const report = await run({ viewport });
    assert(report.pass);
    assert.equal(report.liveFallthrough, 0);
  });
}
