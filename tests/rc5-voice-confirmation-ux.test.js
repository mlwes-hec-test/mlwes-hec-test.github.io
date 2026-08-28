'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const conversation=require('../conversation-foundation.js');
const ROOT=path.join(__dirname,'..'),runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const voiceSection=html.slice(html.indexOf('<section id="quick-log"'),html.indexOf('\n  <section id=',html.indexOf('<section id="quick-log"')+12));

function productionFunction(name){const start=runtime.indexOf(`function ${name}(`);assert.notEqual(start,-1,name);const body=runtime.indexOf('){',start)+1;assert.ok(body>0,name);let depth=0,end=body;for(;end<runtime.length;end++){if(runtime[end]==='{')depth++;else if(runtime[end]==='}'&&!--depth){end++;break;}}return runtime.slice(start,end);}

test('affirmative spoken variants route to confirmation rather than correction parsing',()=>{
  for(const phrase of ['Yes, that is correct.','yes please','yes confirm','yes correct',"yes that's right",'okay please'])assert.equal(conversation.classifyResponse(phrase),'confirm',phrase);
});

test('change, cancellation and genuine correction language remain separate',()=>{
  assert.equal(conversation.classifyResponse('cancel'),'cancel');assert.equal(conversation.classifyResponse("that's not correct"),'change');assert.equal(conversation.classifyResponse('make that two'),'correction');
});

test('for, to, into, in and at all leave the same food identity',()=>{
  for(const connector of ['for','to','into','in','at']){const parsed=conversation.parseRequest(`Add a Big Mac ${connector} today's lunch`,{today:'2026-08-28'});assert.equal(parsed.foodText,'big mac',connector);assert.equal(parsed.meal,'Lunch',connector);}
});

test('companion wake phrasing still composes with into grammar',()=>{
  const parsed=conversation.parseRequest("Hey Shelly, add a Big Mac into tomorrow's lunch",{today:'2026-08-28',companionNames:['Shelly']});assert.equal(parsed.foodText,'big mac');assert.equal(parsed.localDate,'2026-08-29');assert.equal(parsed.meal,'Lunch');
});

test('conversation state stores original request, response and corrections independently',()=>{
  let state=conversation.createConversation();state=conversation.transition(state,'captured',{transcript:'Add a Big Mac for lunch',originalTranscript:'Add a Big Mac for lunch'});state=conversation.transition(state,'captured',{transcript:'make that two',responseTranscript:'make that two',correction:'make that two'});
  assert.equal(state.originalTranscript,'Add a Big Mac for lunch');assert.equal(state.responseTranscript,'make that two');assert.equal(state.lastTranscript,'make that two');assert.deepEqual(state.correctionHistory,['make that two']);
});

test('response recognition never overwrites the original request textarea',()=>{
  const source=productionFunction('alpha0633StartListening');assert.match(source,/if\(mode==='request'&&by\('voice-transcript'\)\)by\('voice-transcript'\)\.value=captured/);
  assert.doesNotMatch(source,/mode==='response'[\s\S]{0,180}voice-transcript/);assert.match(source,/else alpha0633HandleResponse\(captured\)/);
});

test('confirmation handler saves affirmative speech directly through the one guarded save path',()=>{
  const source=productionFunction('alpha0633HandleResponse');assert.match(source,/if\(response==='confirm'\)\{alpha0633SavePending\(\);return;\}/);assert.match(runtime,/alpha0633VoiceSaveLocked/);assert.match(runtime,/createSaveAdapter/);
});

test('spoken summary is concise while the visible destination retains full detail',()=>{
  const context={conversation,window:null,globalThis:null,Set,console};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(`
    function getFood(){return{name:'Big Mac'}}function formatNaturalAmount(value){return String(value)}function friendlyUnitLabel(){return'Burger'}function isoToday(){return'2026-08-28'}function shiftISO(value,days){return conversation.shiftISO(value,days)}function formatDate(value){return value==='2026-08-28'?'Fri 28 Aug 2026':value}
    ${productionFunction('alpha0633ItemPhrase')}
    ${productionFunction('alpha0633NaturalDate')}
    ${productionFunction('alpha0633SpokenSummary')}
    ${productionFunction('alpha0633Summary')}
    window.test={spoken:alpha0633SpokenSummary,visual:alpha0633Summary};
  `,context);
  const pending={items:[{foodId:'big-mac',name:'Big Mac',amount:1,unit:'burger'}],meal:'Lunch',localDate:'2026-08-28',status:'eaten',dateIntent:{spoken:true,phrase:'today'}};
  assert.equal(context.test.spoken(pending),'Add a Big Mac to today’s lunch. Is that correct?');assert.match(context.test.visual(pending),/Fri 28 Aug 2026/);assert.ok(context.test.spoken(pending).length<context.test.visual(pending).length);
});

test('Quick Voice has one opening question and no duplicate idle helper',()=>{
  assert.equal((voiceSection.match(/What would you like to do\?/g)||[]).length,1);assert.doesNotMatch(voiceSection,/quick-log-entry-title/);assert.doesNotMatch(voiceSection,/Nothing is listening yet/);assert.match(voiceSection,/id="voice-status"[^>]*><\/p>/);
});

test('confirmation-ready layout collapses capture surfaces and keeps two-column controls on a 390px phone',()=>{
  assert.match(styles,/data-conversation-state="confirmation-ready"[^}]*quick-voice-companion-card/);assert.match(styles,/data-conversation-state="confirmation-ready"[^}]*quick-voice-listen-card/);
  assert.match(styles,/@media\(max-width:520px\)[\s\S]*confirmation-ready[^}]*quick-voice-confirm-actions\{grid-template-columns:repeat\(2/);
});

test('ready review collapses manual capture and scrolls confirmation into view',()=>{
  const source=productionFunction('alpha0633RenderVoiceReview');assert.match(source,/removeAttribute\('open'\)/);assert.match(source,/scrollIntoView/);assert.match(source,/block:'start'/);
});

test('all confirmation controls remain accessible before any save',()=>{
  for(const label of ['Yes, Confirm','Change','View Details / Edit','Cancel','Respond By Voice'])assert.match(voiceSection,new RegExp(label.replace('/','\\/')));
  assert.match(voiceSection,/Nothing is saved until you confirm/);assert.match(voiceSection,/aria-live="polite"/);
});
