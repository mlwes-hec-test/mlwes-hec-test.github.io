'use strict';

const assert=require('node:assert/strict');
const path=require('node:path');

// Read the production form: result-card visibility alone misses extra grid items.
async function inspect(page,label){
  return page.evaluate(label=>{
    const form=document.querySelector('#food-search-form'),input=form.querySelector('#food-search');
    const hidden=form.querySelector('label.sr-only'),css=getComputedStyle(hidden),box=hidden.getBoundingClientRect();
    const rect=n=>n.getBoundingClientRect().toJSON();
    const visible=n=>{const r=rect(n),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
    const controls=[input,form.querySelector('#clear-food-search'),form.querySelector('#submit-food-search')];
    const bounds=rect(form),overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5;
    const boxes=controls.map(n=>({id:n.id,...rect(n),marginTop:parseFloat(getComputedStyle(n).marginTop)||0,marginBottom:parseFloat(getComputedStyle(n).marginBottom)||0,visible:visible(n),reachable:n.contains(document.elementFromPoint(rect(n).x+rect(n).width/2,rect(n).y+rect(n).height/2))}));
    const plus=document.querySelector('#resource-add-button');
    return {label,viewport:{width:innerWidth,height:innerHeight},bounds,controls:boxes,gridRows:getComputedStyle(form).gridTemplateRows,
      hidden:{position:css.position,width:box.width,height:box.height,overflow:css.overflow,clip:css.clip,whiteSpace:css.whiteSpace,display:css.display,visibility:css.visibility,associated:hidden.control===input,ariaHidden:!!hidden.closest('[aria-hidden="true"],[hidden]')},
      gridItems:[...form.children].filter(n=>visible(n)&&!['absolute','fixed'].includes(getComputedStyle(n).position)).map(n=>n.id||n.tagName),
      placeholder:input.placeholder,searchInputs:form.querySelectorAll('input[type="search"]').length,placeholderShown:input.matches(':placeholder-shown'),
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1||form.scrollWidth>form.clientWidth+1,
      overlaps:boxes.flatMap((a,i)=>boxes.slice(i+1).filter(b=>overlap(a,b)).map(b=>[a.id,b.id])),
      plusCollision:!!plus&&visible(plus)&&overlap(rect(plus),bounds),
      focused:document.activeElement===input,caret:input.selectionStart,value:input.value};
  },label);
}

function requireLayout(r){
  const h=r.hidden,message=JSON.stringify(r);
  assert(h.position==='absolute'&&h.width<=1&&h.height<=1&&h.overflow==='hidden'&&h.clip==='rect(0px, 0px, 0px, 0px)'&&h.whiteSpace==='nowrap',`Search label is visibly rendered or occupies a grid cell: ${message}`);
  assert(h.associated&&!h.ariaHidden&&h.display!=='none'&&h.visibility!=='hidden','Search label must remain accessible');
  assert.deepEqual(r.gridItems,r.viewport.width<=520?['food-search','clear-food-search','submit-food-search']:['SPAN','food-search','clear-food-search','submit-food-search']);
  assert.equal(r.searchInputs,1);
  assert.equal(r.placeholder,'Search foods, meals and recipes');
  assert(r.controls[0].width>=120&&r.controls[0].width>=r.bounds.width*.4,`Search input squeezed: ${message}`);
  const maxHeight=Math.max(...r.controls.map(c=>c.height+c.marginTop+c.marginBottom));
  assert.equal(r.gridRows.trim().split(/\s+/).length,1,`Search has extra grid rows: ${message}`);
  assert(r.bounds.height<=maxHeight+12&&r.bounds.height<=64,`Search became a multi-row oval: ${message}`);
  for(const c of r.controls){
    assert(c.visible&&c.reachable,`Search control obscured or unreachable: ${message}`);
    assert(c.left>=r.bounds.left&&c.right<=r.bounds.right&&c.top>=0&&c.bottom<=r.viewport.height,`Search control outside bounds: ${message}`);
    const center=n=>n.top-n.marginTop+(n.height+n.marginTop+n.marginBottom)/2;
    assert(Math.abs(center(c)-center(r.controls[0]))<=1,`Search controls occupy different rows: ${message}`);
    const minimum=r.viewport.width<=520?44:24;
    assert(c.width>=minimum&&c.height>=minimum,`Search tap target too small: ${message}`);
  }
  assert(!r.overflow&&!r.plusCollision,`Search overflow or floating-plus collision: ${message}`);
  assert.deepEqual(r.overlaps,[]);
  return r;
}

async function audit(page,label){
  // Submission may scroll to results; confirm Search can be brought back into
  // view without focusing it or changing the user's caret/amount focus.
  await page.locator('#food-search-form').evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
  const r=requireLayout(await inspect(page,label));
  const accessible=await page.locator('#food-search').ariaSnapshot();
  assert.match(accessible,/searchbox "Search foods, meals and recipes"/,'Search accessible name missing');
  return {...r,accessible};
}

async function interaction(page,outputDirectory){
  const input=page.locator('#food-search'),rows=[];
  rows.push(await audit(page,'Search empty'));
  assert(rows[0].placeholderShown);
  const prefix=`${page.viewportSize().width}x${page.viewportSize().height}`;
  await page.screenshot({path:path.join(outputDirectory,`${prefix}-search-empty.png`),fullPage:true});
  await input.click();
  await input.pressSequentially('KFC',{delay:10});
  rows.push(await audit(page,'Search typing'));
  assert(rows.at(-1).focused&&rows.at(-1).caret===3&&rows.at(-1).value==='KFC');
  assert.notEqual((await page.evaluate(()=>window.HEC_SEARCH_SESSION_TEST.state())).mode,'explicit-committed');
  await input.press('Tab');
  assert(await page.locator('#clear-food-search').evaluate(n=>document.activeElement===n));
  await page.keyboard.press('Tab');
  assert(await page.locator('#submit-food-search').evaluate(n=>document.activeElement===n));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  rows.push(await audit(page,'Search button keyboard submit'));
  assert.equal((await page.evaluate(()=>window.HEC_SEARCH_SESSION_TEST.state())).mode,'explicit-committed');
  await page.locator('#clear-food-search').click();
  rows.push(await audit(page,'Search Clear'));
  assert.equal(await input.inputValue(),'');
  await input.pressSequentially('Milk',{delay:10});
  await input.press('Enter');
  await page.waitForTimeout(350);
  rows.push(await audit(page,'Search Return submit'));
  assert.equal((await page.evaluate(()=>window.HEC_SEARCH_SESSION_TEST.state())).mode,'explicit-committed');
  await page.screenshot({path:path.join(outputDirectory,`${prefix}-search-submitted.png`),fullPage:true});
  return rows;
}

module.exports={inspect,requireLayout,audit,interaction};
