'use strict';
// Fresh synthetic contexts; all requests are fulfilled from source or blocked.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const qa=require('./audit_physical_form_measures_edge');
async function inspect(page,enabled){
  await page.locator("#toast.show").waitFor({state:"hidden"});
  await page.locator(enabled?'#home-avatar-image':'#home-central-logo').evaluate(img=>img.decode());
  const result=await page.evaluate(enabled=>{
    const rect=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};
    const visible=n=>!n.classList.contains('hidden')&&getComputedStyle(n).display!=='none';
    const logo=document.querySelector(enabled?'#home-corner-logo':'#home-central-logo'),box=rect(logo),hub=rect(document.querySelector('#home .circle'));
    const rooms=[...document.querySelectorAll('#home [data-room]')].map(n=>{const b=rect(n),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {room:n.dataset.room,box:b,hit:n===hit||n.contains(hit),enabled:!n.disabled};});
    const control=document.querySelector('#home-companion');
    return {enabled,box,hub,rooms,centre:rect(control),portrait:rect(document.querySelector('#home-avatar-image')),logoLoaded:logo.complete&&logo.naturalWidth>0,centralVisible:visible(document.querySelector('#home-central-logo')),cornerVisible:visible(document.querySelector('#home-corner-logo')),portraitVisible:visible(document.querySelector('#home-avatar-image')),fallbackVisible:visible(document.querySelector('#home-avatar')),width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,release:HECRelease.snapshot(),role:HEC_APP.installationRole,apple:document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href')};
  },enabled);
  const overlap=(a,b)=>a.x<b.right-1&&a.right>b.x+1&&a.y<b.bottom-1&&a.bottom>b.y+1;
  assert(result.logoLoaded);assert.equal(result.centralVisible,!enabled);assert.equal(result.cornerVisible,enabled);assert.equal(result.portraitVisible,enabled);assert(!result.fallbackVisible);
  assert(result.box.x>=0&&result.box.y>=0&&result.box.right<=result.width&&result.box.bottom<=result.height,'Logo clipped');assert(result.scrollWidth<=result.width+1,'Horizontal overflow');
  assert.equal(result.rooms.length,8);for(const room of result.rooms){assert(room.enabled&&room.hit,room.room+' unavailable');assert(!overlap(result.box,room.box),room.room+' logo overlap '+JSON.stringify({logo:result.box,room:room.box,hub:result.hub}));}
  if(enabled){assert(result.box.x>result.width/2);assert(result.box.y<result.hub.y);assert(result.box.width<=40);assert(result.portrait.width>result.box.width*2);}
  else {assert(Math.abs(result.box.x+result.box.width/2-(result.hub.x+result.hub.width/2))<2,'Logo not centred');assert(result.box.width>=100);}
  assert.equal(result.release.state,'ready');return result;
}
async function run(output){
  fs.mkdirSync(output,{recursive:true});const report={pass:false,scenarios:[]},{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024}]){
      const network=qa.evidence(),context=await qa.contextFor({newContext:opts=>browser.newContext({...opts,isMobile:true,hasTouch:true})},viewport,network);
      await context.addInitScript(()=>{if(location.origin!=='https://mlwes-hec-test.github.io')return;localStorage.setItem('healthyEatingCompanionTestAlpha06',JSON.stringify({version:'0.6.33',completed:true,firstHomeWelcomeShown:true,companion:{enabled:false,configured:true,speechEnabled:false,id:'percy-pelican',name:'Percy'},personal:{givenName:'Brand fixture'},health:{}}));});
      const page=await context.newPage();await page.goto(qa.ORIGIN+'/',{waitUntil:'load'});await page.waitForFunction(()=>HECRelease?.snapshot().state==='ready');
      for(const enabled of [false,true]){
        const result=await inspect(page,enabled);report.scenarios.push({viewport,...result});await page.screenshot({path:path.join(output,`${viewport.width}x${viewport.height}-${enabled?'companion':'no-companion'}.png`)});
        await page.locator('#home [data-room="diary"]').tap();await page.locator('#food-diary.active').waitFor();await page.locator('#food-diary [data-go="home"]').tap();
        await page.locator('#home [data-room="settings"]').tap();await page.locator('#settings.active').waitFor();await page.locator('#toggle-companion').tap();await page.locator('#settings [data-go="home"]').first().tap();
      }
      // Returning through Settings must remove the corner logo immediately.
      await inspect(page,false);qa.requireEvidence(network);report.scenarios.push({viewport,network:{requests:network.localResponses,liveFallthrough:network.liveFallthrough,pageErrors:network.pageErrors}});await context.close();
    }
    report.pass=true;
  }finally{await browser.close();fs.writeFileSync(path.join(output,'branding-rendered.json'),JSON.stringify(report,null,2));}
  console.log(JSON.stringify({pass:report.pass,viewports:3,homeStates:6,output}));
}
if(require.main===module)run(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
