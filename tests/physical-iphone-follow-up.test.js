const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const deployment=require('./deployment-test-context.js');

const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const runtime=read('alpha06.js'),html=read('index.html'),styles=read('styles.css');
const installationContext=deployment.contextFromSources(read('installation-config.js'),read('config.js'),read('manifest.webmanifest'));
const catalogue=require(path.join(ROOT,'food-catalogue.js'));
const search=require(path.join(ROOT,'search-foundation.js'));

function productionFunction(name){
  const marker=`function ${name}(`,start=runtime.indexOf(marker);assert.ok(start>=0,`${name} exists`);let paren=runtime.indexOf('(',start),parenDepth=0,brace=-1,paramQuote='',paramEscaped=false;for(let index=paren;index<runtime.length;index++){const char=runtime[index];if(paramQuote){if(paramEscaped)paramEscaped=false;else if(char==='\\')paramEscaped=true;else if(char===paramQuote)paramQuote='';continue;}if(char==='"'||char==="'"||char==='`'){paramQuote=char;continue;}if(char==='(')parenDepth++;if(char===')'&&--parenDepth===0){brace=runtime.indexOf('{',index);break;}}let depth=0,quote='',escaped=false;
  for(let index=brace;index<runtime.length;index++){const char=runtime[index];if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote='';continue;}if(char==='"'||char==="'"||char==='`'){quote=char;continue;}if(char==='{')depth++;if(char==='}'&&--depth===0)return runtime.slice(start,index+1);}
  throw new Error(`Could not extract ${name}`);
}
function pngDimensions(file){const buffer=fs.readFileSync(path.join(ROOT,file));assert.equal(buffer.subarray(1,4).toString(),'PNG');return{width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};}
function servingFoundation(){const context={console};context.globalThis=context;vm.runInNewContext(read('serving-foundation.js'),context);return context.HECServingFoundation;}

test('official supplied logo master is preserved byte-for-byte',()=>{
  const bytes=fs.readFileSync(path.join(ROOT,'assets/app-icons/hec-official-current-1024.png'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'7236332209a640a78bf055b35f61ee0df35e4428b81e695f4cefb8ff49326135');
  assert.deepEqual(pngDimensions('assets/app-icons/hec-official-current-1024.png'),{width:1254,height:1254});
});

test('active installation has role-appropriate Home Screen and touch assets',()=>{
  for(const [file,size] of [['assets/app-icons/hec-my-data-180.png',180],['assets/app-icons/hec-my-data-192.png',192],['assets/app-icons/hec-my-data-512.png',512],['assets/app-icons/hec-test-180.png',180],['assets/app-icons/hec-test-192.png',192],['assets/app-icons/hec-test-512.png',512]])assert.deepEqual(pngDimensions(file),{width:size,height:size});
  const {expected}=deployment.assertInstallationContext(assert,installationContext);assert.deepEqual(pngDimensions(expected.iconApple),{width:180,height:180});
  assert.match(read('installation-foundation.js'),/app\.iconApple\|\|app\.icon192/);assert.match(read('installation-foundation.js'),/hec-test-installation-banner/);
});

test('Quick Voice visibly supports food and weight while confirmation remains mandatory',()=>{
  const section=html.slice(html.indexOf('<section id="quick-log"'),html.indexOf('</section>',html.indexOf('<section id="quick-log"'))+10);
  assert.match(section,/food or weight/i);assert.match(section,/I’ll confirm before saving/);assert.match(section,/Nothing is saved or removed until you confirm/);assert.match(section,/record 82\.4 kg today/);
});

test('speech watchdog waits for actual speech completion and has a long dynamic emergency window',()=>{
  const timers=[];let cancelled=0,finished=0,endHandler,errorHandler;const elements=new Map();const make=()=>({textContent:'',classList:{add(){},remove(){}}});elements.set('voice-response-mic',make());elements.set('voice-status',make());
  const context={console,Date,window:null,globalThis:null,setTimeout:(callback,delay)=>{timers.push({callback,delay});return timers.length;},clearTimeout:()=>{},by:id=>elements.get(id)||null,alpha0633Companion:()=>({enabled:true,speech:true}),HECSpeakText:()=>({addEventListener(type,callback){if(type==='end')endHandler=callback;if(type==='error')errorHandler=callback;}})};context.window=context;context.globalThis=context;context.speechSynthesis={speaking:true,cancel(){cancelled++;}};vm.createContext(context);
  vm.runInContext(`let alpha0633PromptTimer=null,alpha0633SpeechToken=0,alpha0633SpeechActive=false;${productionFunction('alpha0633SpeechWatchdogDelay')}\n${productionFunction('alpha0633CancelSpeech')}\n${productionFunction('alpha0633Speak')}\nwindow.test={speak:alpha0633Speak,delay:alpha0633SpeechWatchdogDelay,active:()=>alpha0633SpeechActive};`,context);
  context.test.speak('This is a deliberately long confirmation prompt that must finish before the microphone starts.',()=>finished++);assert.equal(cancelled,1);assert.equal(context.test.active(),true);assert.ok(timers[0].delay>=15000);timers.shift().callback();assert.equal(finished,0);assert.equal(cancelled,1);assert.equal(timers[0].delay,750);context.speechSynthesis.speaking=false;timers.shift().callback();assert.equal(finished,1);assert.equal(context.test.active(),false);assert.equal(typeof endHandler,'function');assert.equal(typeof errorHandler,'function');
});

test('Tap to Answer cannot appear while the companion is speaking',()=>{
  const source=productionFunction('alpha0633ShowAnswerFallback');assert.match(source,/alpha0633SpeechActive\|\|window\.speechSynthesis\?\.speaking/);assert.match(source,/classList\.add\('hidden'\)/);assert.match(productionFunction('alpha0633AutoListenForResponse'),/alpha0633SpeechActive\|\|window\.speechSynthesis\?\.speaking/);
});

test('response timeout begins only after response recognition starts',()=>{
  const source=productionFunction('alpha0633StartListening'),start=source.indexOf('recognition.start()'),timer=source.indexOf('alpha0633ResponseTimer=setTimeout');assert.ok(start>=0&&timer>start);assert.match(source,/7000/);
});

test('typed and dictated product variants resolve through the shared conservative catalogue',()=>{
  const chiko={id:'chiko',name:'Chiko Roll',aliases:['chiko roll'],nutrients:{calories:300}},proactiv={id:'pro',canonicalId:'packaged:flora-proactiv-light-au',recordType:'packaged',name:'Flora ProActiv Light',brand:'Flora',market:'AU',verified:true,aliases:['flora proactiv light','flora proactive light','flora pro activ light'],nutrients:{calories:37}},light={id:'light',recordType:'packaged',name:'Flora Light',brand:'Flora',market:'AU',verified:true,aliases:['flora light'],nutrients:{calories:43}};
  assert.equal(catalogue.resolve([chiko],'chicko roll').food,chiko);assert.equal(catalogue.resolve([proactiv,light],'flora proactive light').food,proactiv);assert.equal(catalogue.resolve([proactiv,light],'flora pro active light').food,proactiv);assert.equal(catalogue.resolve([proactiv,light],'flora light').food,light);assert.equal(catalogue.resolve([chiko],'chicken roll').status,'none');
  assert.match(runtime,/const shared=C8\?\.resolve\?\.\(allFoods\(\),query\)/);assert.match(runtime,/shared=C8\?\.resolve\?\.\(diaryRecords\.map/);
});

test('verified Flora ProActiv confines a conflicting cached record to legacy review',()=>{
  const official={id:'official',canonicalId:'packaged:flora-proactiv-light-au',recordType:'packaged',name:'Flora ProActiv Light',brand:'Flora',market:'AU',verified:true,verificationStatus:'verified',aliases:['flora proactiv light'],nutrients:{calories:37}},legacy={id:'legacy',recordType:'online-candidate',name:'Flora ProActiv Light',brand:'Flora',market:'unknown',nutrients:{calories:252}},ordinary={id:'ordinary',recordType:'packaged',name:'Flora Light',brand:'Flora',market:'AU',verified:true,verificationStatus:'verified',nutrients:{calories:43}};
  const result=catalogue.partitionSearchRecords([legacy,ordinary,official]);assert.ok(result.primary.includes(official));assert.ok(result.primary.includes(ordinary));assert.equal(result.legacy[0].food,legacy);assert.doesNotMatch(productionFunction('legacyFoodRow'),/data-food-add|data-food-save/);
});

test('Flora ProActiv exposes manufacturer serve, grams and the validated central spread measures',()=>{
  const foundation=servingFoundation(),food={id:'flora',recordType:'packaged',name:'Flora ProActiv Light',brand:'Flora',market:'AU',verified:true,category:'Spreads',ingredients:'Vegetable oils',defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.1},unitLabels:{serve:'Serve (10 g)',g:'g'},serving:'1 serve (10 g)',manufacturerServing:{amount:10,unit:'g'},nutrients:{calories:37}};
  const applied=foundation.applyToFood(JSON.parse(JSON.stringify(food)));assert.deepEqual(Object.keys(applied.units).sort(),['g','serve','tbsp','tsp']);assert.equal(applied.defaultUnit,'serve');assert.equal(applied.defaultAmount,1);assert.equal(applied.nutrients.calories*applied.units.serve,37);assert.equal(applied.nutrients.calories*10*applied.units.g,37);assert.equal(applied.nutrients.calories*applied.units.tsp,18.5);assert.equal(applied.units.tbsp/applied.units.g,19);assert.doesNotMatch(JSON.stringify(applied),/vegetable serve|standard vegetable|thin spread|thick spread|"kg"/i);
});

test('generic fries use six defensible AFCD variants and exclude crisps and straws',()=>{
  const names=['Potato, chips, regular, fast food outlet, deep fried, blended oil, salted','Potato, chips, regular, fast food outlet, deep fried, monounsaturated oil, salted','Potato, chips, regular, independent takeaway outlet, deep fried, blended oil, salted','Potato, chips, regular, purchased frozen, baked, no added fat','Potato, fries, fast food outlet, deep fried, monounsaturated oil, salted','Potato, fries, independent takeaway outlet, deep fried, blended oil, salted','Potato straws, French fries, plain','Potato crisps or chips, plain, salted'],records=names.map((name,index)=>({id:String(index),afcd:true,afcdKey:String(index),name,market:'AU'})),found=catalogue.genericFriesCandidates(records);
  assert.equal(found.length,6);assert.ok(found.every(food=>! /straw|crisp/i.test(food.name)));assert.equal(search.descriptorFeatures(names[0],{key:'fries',category:'snack'}).source,'Fast-Food Outlet');assert.equal(search.descriptorFeatures(names[2],{key:'fries',category:'snack'}).source,'Independent Takeaway');assert.equal(search.descriptorFeatures(names[3],{key:'fries',category:'snack'}).prep,'Oven-Baked');
});

test('Diary Dinner Add Food guided handoff preserves food defaults when search has no quantity',()=>{
  const foundation=servingFoundation();
  const finishReview=(query,food,conceptKey)=>{
    const review={},context={B25:{validateWithQuery:()=>({valid:true})},s23BestSource:()=>food,s23Naturalise:()=>food,ext:{ui:{pendingMeal:'Dinner',diaryDate:'2026-08-30'}},isoToday:()=> '2026-08-30',unitOptions:selected=>selected.units,defaultUnit:selected=>selected.defaultUnit,prepareEntry:(selected,options)=>{review.amount=options.amount??selected.defaultAmount;review.unit=options.unit??selected.defaultUnit;review.calories=selected.nutrients.calories*review.amount*selected.units[review.unit];},w:{query,parsed:search.parseQuery(query),state:{},concept:{key:conceptKey,label:food.name}}};
    vm.createContext(context);vm.runInContext(`${productionFunction('s23FinishWizard')}\ns23FinishWizard(w);`,context);return review;
  };
  const fries=foundation.applyToFood({id:'fries',afcd:true,name:'Potato, fries, fast food outlet, deep fried',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'Reference quantity: 100 g',nutrients:{calories:300}},{conceptCategory:'snack',conceptKey:'fries'});
  const per100={id:'per-100-generic',afcd:true,name:'Generic per-100 food',defaultAmount:100,defaultUnit:'g',units:{g:.01},unitLabels:{g:'g'},serving:'Reference quantity: 100 g',nutrients:{calories:35}};
  const natural={id:'natural-serving',name:'Generic Natural Serving',defaultAmount:1,defaultUnit:'item',units:{item:1,g:1/162},unitLabels:{item:'Item (162 g)',g:'g'},serving:'1 item (162 g)',nutrients:{calories:313}};
  assert.deepEqual(finishReview('Fries',fries,'fries'),{amount:100,unit:'g',calories:300});
  assert.deepEqual(finishReview('Generic food',per100,'generic'),{amount:100,unit:'g',calories:35});
  assert.deepEqual(finishReview('Generic Natural Serving',natural,'generic'),{amount:1,unit:'item',calories:313});
  assert.deepEqual(finishReview('250 g fries',fries,'fries'),{amount:250,unit:'g',calories:750});
  assert.equal(catalogue.fullReviewPolicy(fries).amount,100);assert.match(runtime,/Reference quantity: \$\{formatNumber\(f\.defaultAmount,true\)\} g/);
});

test('Diary count wording reports live total mass without changing stored nutrition',()=>{
  const context={window:null,globalThis:null};context.window=context;context.globalThis=context;context.getFood=()=>({units:{roll:1,g:1/162},unitLabels:{roll:'Roll (162 g)',g:'g'}});context.unitOptions=food=>food.units;context.cleanUserUnitLabel=value=>String(value);context.unitLabel=(food,unit)=>food.unitLabels[unit];context.formatNaturalAmount=value=>String(value);context.formatNumber=value=>String(Math.round(value));vm.createContext(context);vm.runInContext(`${productionFunction('naturalMetricEquivalent')}\n${productionFunction('entryNaturalQuantity')}\nwindow.format=entryNaturalQuantity;`,context);
  assert.equal(context.format({foodId:'roll',amount:1,unit:'roll',unitLabel:'Roll (162 g)',metricEquivalent:{value:162,unit:'g'}}),'1 Roll (162 g)');assert.equal(context.format({foodId:'roll',amount:2,unit:'roll',unitLabel:'Roll (162 g)',metricEquivalent:{value:162,unit:'g'}}),'2 Rolls · 324 g total');assert.match(runtime,/entryCard=function\(entry\)[\s\S]*?entryNaturalQuantity\(entry\)/);
});

test('mobile search never smooth-scrolls on each keystroke and uses the visual viewport',()=>{
  const keep=productionFunction('keepLiveFoodResultsVisible'),input=productionFunction('alpha0630HandleFoodSearchInput');assert.doesNotMatch(keep,/scrollBy|behavior:\s*["']smooth/);assert.match(keep,/--hec-keyboard-top/);assert.match(input,/requestAnimationFrame/);assert.match(runtime,/visualViewport\?\.addEventListener\('resize'/);assert.match(styles,/--hec-visual-viewport-height/);assert.match(styles,/max\(150px,calc\(var\(--hec-visual-viewport-height/);assert.match(styles,/entry-context-banner/);
});

test('release identity, cache role isolation and line endings remain intact',async()=>{
  const worker=read('service-worker.js');assert.match(read('config.js'),/const version = "0\.6\.33"/);await deployment.assertCacheActivation(assert,worker,installationContext.app);assert.match(worker,/INSTALLATION_ROLE === "test"/);assert.match(read('installation-foundation.js'),/hec-test-installation-banner/);for(const file of ['alpha06.js','food-catalogue.js','index.html','serving-foundation.js','styles.css','service-worker.js'])assert.equal(fs.readFileSync(path.join(ROOT,file)).includes(13),false,`${file} uses LF`);
});
