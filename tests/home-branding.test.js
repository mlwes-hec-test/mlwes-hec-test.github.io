'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(ROOT,file)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('Circle Balance artwork is the exact accepted production family at every installation size',()=>{
  assert.equal(hash(read('assets/app-icons/hec-official-current-1024.png')),'7236332209a640a78bf055b35f61ee0df35e4428b81e695f4cefb8ff49326135');
  for(const [size,expected] of [[180,'821ad74175976371f63744c5c6c2949c21e70089b5b4e673385849c9af692cf1'],[192,'bd16a47f77112c95b89983e6e5849fcce9c5331dce30dc48d1dd17182e4f737e'],[512,'915bb5322764baeaa2967ee987b92d86648a4540227e60693496238d6fd509b0']])for(const role of ['my-data','test']){
    const bytes=read(`assets/app-icons/hec-${role}-${size}.png`);assert.equal(hash(bytes),expected);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[size,size]);
  }
});
test('Home renders mutually exclusive brand states from the saved companion preference, including switching back',()=>{
  const source=read('app.js').toString(),block=source.slice(source.indexOf('function renderHome(){'),source.indexOf('\n$("first-home-welcome-close")'));
  const nodes=new Map(),node=id=>{if(!nodes.has(id)){const classes=new Set();nodes.set(id,{classList:{toggle(c,on){if(on)classes.add(c);else classes.delete(c);},add(c){classes.add(c);},remove(c){classes.delete(c);},contains:c=>classes.has(c)},removeAttribute(){}});}return nodes.get(id);};
  const context={Date,Math,data:{companion:{enabled:false,character:'🐦'}},APP:{installationRole:'my-data'},VERSION:'0.6.33',$:node,displayName:()=>'',greeting:()=> 'Welcome',selectedCompanionDefinition:()=>({id:'percy-pelican'}),companionDisplayName:()=> 'Percy',setCompanionArtworkImage(p,c,kind,f){p.classList.remove('hidden');f.classList.add('hidden');},INSPIRATION:[{type:'quote',text:'Test'}],updateCompanionUI(){},showFirstHomeWelcome(){}};
  vm.createContext(context);vm.runInContext(block,context);
  for(const enabled of [false,true,false]){
    context.data.companion.enabled=enabled;vm.runInContext('renderHome()',context);
    assert.equal(node('home-central-logo').classList.contains('hidden'),enabled);
    assert.equal(node('home-corner-logo').classList.contains('hidden'),!enabled);
    assert.equal(node('home-avatar-image').classList.contains('hidden'),!enabled);
    assert.equal(node('home-companion').classList.contains('no-companion'),!enabled);
  }
});
test('Branding is confined to Home and the small logo is decorative without a new control',()=>{
  const html=read('index.html').toString(),home=html.slice(html.indexOf('<section id="home"'),html.indexOf('<section id="food-diary"'));
  assert.equal((html.match(/class="home-brand-logo/g)||[]).length,2);
  assert.match(home,/<img id="home-corner-logo"[^>]*alt="" aria-hidden="true">/);
  assert.match(home,/<img id="home-central-logo"[^>]*alt="HEC Circle Balance logo">/);
  assert.equal((home.match(/data-room=/g)||[]).length,8);
});
