'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const qa = require('./audit_physical_form_measures_edge');
const { returningProfile } = require('./audit_navigation_startup_edge');

const tabSelector = key => `[data-library-tab="${key}"]`;
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function openMealLibrary(page) {
  await page.goto(qa.ORIGIN + '/', { waitUntil: 'load' });
  await page.locator('#home [data-room="diary"]').click();
  await page.locator('[data-add-to-meal="Breakfast"]').click();
  await page.locator(tabSelector('recent')).waitFor({ state: 'visible' });
  await settle(page);
}
async function inspect(page) {
  return page.evaluate(() => {
    const list = document.querySelector('.library-tabs');
    const rect = node => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const tabs = [...list.querySelectorAll('button')].map(node => {
      const s = getComputedStyle(node), r = rect(node);
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        key: node.dataset.libraryTab, label: node.textContent.trim(), rect: r,
        active: node.classList.contains('active'), focused: node === document.activeElement,
        focusVisible: node.matches(':focus-visible'), outlineStyle: s.outlineStyle,
        outlineWidth: s.outlineWidth, outlineColor: s.outlineColor,
        borderColor: s.borderBottomColor, borderWidth: s.borderBottomWidth,
        color: s.color, pointerEvents: s.pointerEvents,
        display: s.display, visibility: s.visibility, opacity: s.opacity,
        clipped: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1,
        uncovered: node === hit || node.contains(hit)
      };
    });
    const s = getComputedStyle(list);
    return {
      viewport: { width: innerWidth, height: innerHeight }, list: rect(list),
      display: s.display, visibility: s.visibility, opacity: s.opacity,
      pointerEvents: s.pointerEvents, tabs,
      search: rect(document.querySelector('#food-search-form')),
      results: rect(document.querySelector('#food-results')),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      activeElement: document.activeElement.outerHTML.slice(0, 250),
      bodyClasses: document.body.className
    };
  });
}
function assertLayout(state) {
  assert.equal(state.display, 'flex', 'shared tab list stays displayed');
  assert.equal(state.visibility, 'visible');
  assert.equal(state.opacity, '1');
  assert.notEqual(state.pointerEvents, 'none');
  assert(!state.overflow, 'no horizontal page overflow');
  assert(state.search.bottom <= state.list.y, 'tabs do not overlap search');
  assert(state.list.bottom <= state.results.y, 'tabs do not overlap results');
  for (const tab of state.tabs) {
    assert(tab.rect.width > 0 && tab.rect.height > 0, tab.key + ' has layout');
    assert(tab.rect.x >= 0 && tab.rect.right <= state.viewport.width + 1, tab.key + ' fits width');
    assert(!tab.clipped, tab.key + ' label is not clipped');
    assert.equal(tab.visibility, 'visible');
    assert.notEqual(tab.pointerEvents, 'none');
  }
}
async function assertSelection(page, key) {
  await page.waitForFunction(key => document.querySelector('[data-library-tab].active')?.dataset.libraryTab === key, key);
  await settle(page);
  const state = await inspect(page);
  assertLayout(state);
  assert.deepEqual(state.tabs.filter(tab => tab.active).map(tab => tab.key), [key]);
  const active = state.tabs.find(tab => tab.active), inactive = state.tabs.find(tab => !tab.active);
  assert.notEqual(active.borderColor, inactive.borderColor, 'active underline remains distinguishable');
  assert.equal(active.borderWidth, '4px');
  assert.notEqual(active.color, inactive.color, 'active foreground remains distinguishable');
  const results = await page.locator('#food-results').innerText();
  assert(results.trim(), 'selected tab renders content or an empty state');
  if (key === 'recent') assert.match(results, /Recent 14 Days/);
  return { key, state, results: results.slice(0, 600) };
}
async function run({ viewport, output = fs.mkdtempSync(path.join(os.tmpdir(), 'hec-mobile-tabs-')) }) {
  fs.mkdirSync(output, { recursive: true });
  const report = { ...qa.evidence(), viewport, output, actions: [], pass: false };
  const { chromium, edge } = qa.browserTools();
  const browser = await chromium.launch({ headless: true, executablePath: edge });
  let page;
  try {
    const context = await qa.contextFor({ newContext: options => browser.newContext({ ...options, isMobile: true, hasTouch: true }) }, viewport, report);
    await context.addInitScript(returningProfile);
    page = await context.newPage();
    await openMealLibrary(page);
    assert.deepEqual(await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), viewport);
    // Real pointer input, including the focus interval between down and up.
    const recent = page.locator(tabSelector('recent'));
    await recent.scrollIntoViewIfNeeded();
    await settle(page);
    const before = await inspect(page), beforeRecent = before.tabs.find(tab => tab.key === 'recent');
    assert(beforeRecent.uncovered, 'Recent has no pointer blocker before click');
    await page.evaluate(() => { window.__tabOriginal = document.querySelector('[data-library-tab="recent"]'); });
    await page.mouse.move(beforeRecent.rect.x + beforeRecent.rect.width / 2, beforeRecent.rect.y + beforeRecent.rect.height / 2);
    await page.mouse.down();
    await settle(page);
    const during = await inspect(page), focused = during.tabs.find(tab => tab.key === 'recent');
    assertLayout(during);
    assert(focused.focused, 'pointer focus stays on Recent');
    assert(focused.uncovered, 'focused Recent remains the pointer hit target');
    assert.deepEqual(during.list, before.list, 'tab focus does not move or resize the list');
    assert(await page.evaluate(() => __tabOriginal.isConnected && __tabOriginal === document.querySelector('[data-library-tab="recent"]')), 'focus does not replace or remove the control');
    await page.mouse.up();
    report.actions.push({ method: 'pointer-down/up', before, during, ...await assertSelection(page, 'recent') });
    // Shared behavior: leave, select both neighboring tabs, and return.
    for (const key of ['saved', 'combined', 'all', 'recent']) {
      await page.locator(tabSelector(key)).click();
      report.actions.push({ method: 'click', ...await assertSelection(page, key) });
    }
    // Touch emulation sends trusted touchstart and click events, not DOM click().
    for (const key of ['all', 'recent', 'saved', 'combined', 'recent']) {
      await page.locator(tabSelector(key)).tap();
      report.actions.push({ method: 'touch', ...await assertSelection(page, key) });
    }
    const events = await page.evaluate(() => __navigationEvents);
    for (const type of ['pointerdown', 'touchstart', 'click']) assert(events.some(e => e.type === type && e.trusted && e.target.includes('data-library-tab="recent"')), 'trusted Recent ' + type);
    report.events = events.filter(e => e.target.includes('data-library-tab'));

    await openMealLibrary(page);
    report.traversal = [];
    // Start at the actual page's navigation control, then use Tab exclusively.
    await page.locator('#food-library [data-go="home"]').focus();
    let reached = false;
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press('Tab');
      await settle(page);
      const state = await inspect(page);
      report.traversal.push(state.activeElement);
      const focusedTab = state.tabs.find(tab => tab.focused);
      if (focusedTab) {
        assertLayout(state);
        assert(focusedTab.focusVisible, 'keyboard focus is visible');
        assert.notEqual(focusedTab.outlineStyle, 'none');
        assert(parseFloat(focusedTab.outlineWidth) > 0, 'keyboard focus has an outline');
        if (focusedTab.key === 'recent') { reached = true; report.keyboardFocus = state; break; }
      }
    }
    assert(reached, 'Tab traversal reaches Recent');
    assert(report.traversal.some(html => html.includes('data-library-tab="all"')), 'All precedes Recent in tab order');
    await page.screenshot({ path: path.join(output, 'keyboard-focus.png'), fullPage: true });
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      report.actions.push({ method: key, ...await assertSelection(page, 'recent') });
      await page.keyboard.press('Tab');
      await settle(page);
      const other = await inspect(page);
      assert(other.tabs.find(tab => tab.key === 'saved').focused, 'Tab reaches My Foods after Recent');
      assertLayout(other);
      await page.keyboard.press('Enter');
      await assertSelection(page, 'saved');
      await page.keyboard.press('Shift+Tab');
      await settle(page);
      assert((await inspect(page)).tabs.find(tab => tab.key === 'recent').focused);
    }
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await settle(page);
    assert((await inspect(page)).tabs.find(tab => tab.key === 'combined').focused);
    await page.keyboard.press('Space');
    await assertSelection(page, 'combined');
    await page.keyboard.press('Tab');
    assert(!await page.locator('.library-tabs').evaluate(node => node.contains(document.activeElement)), 'keyboard leaves the tab list without a trap');

    // Small adjacent check; no catalogue audit or typing profiling.
    await page.locator('#food-search').click();
    await page.locator('#food-search').pressSequentially('zz');
    assert.equal(await page.locator('#food-search').inputValue(), 'zz');
    await page.locator('#clear-food-search').click();
    assert.equal(await page.locator('#food-search').inputValue(), '');
    await page.locator('#food-library [data-go="home"]').click();
    await page.locator('#home.active').waitFor({ state: 'visible' });
    await page.locator('#home [data-room="database"]').click();
    await page.locator('#food-library [data-hec-back]').click();
    await page.locator('#home.active').waitFor({ state: 'visible' });
    report.adjacent = { searchInputAndClear: true, home: true, back: true };
    qa.requireEvidence(report);
    report.pass = true;
    return report;
  } catch (error) {
    report.error = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    if (page) await page.screenshot({ path: path.join(output, 'final.png'), fullPage: true }).catch(() => {});
    await browser.close();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log('Mobile tab evidence: ' + output);
  }
}
module.exports = { run };
