'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const runtime=read('alpha06.js'),styles=read('styles.css');
const catalogue=require('../food-catalogue.js');
const guided=require('../guided-product-resolution.js');
const auditModule=require('../scripts/audit_open_food_facts_au.js');
const progressiveAudit=require('../scripts/audit_progressive_food_resolution.js');
const manifest=auditModule.read('manifest.json');
auditModule.allProducts(manifest);
let actualFlora,actualMeadow;
test.before(async()=>{[actualFlora,actualMeadow]=await Promise.all([auditModule.api.search('Flora',{limit:500}),auditModule.api.search('Meadow Lea',{limit:500})]);});

const packaged=(values={})=>({recordType:'packaged',market:'AU',country:'Australia',verified:true,verificationStatus:'verified',current:true,defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.1},unitLabels:{serve:'Manufacturer Serve (10 g)',g:'g'},manufacturerServing:{amount:10,unit:'g'},nutrients:{calories:40,energyKj:168},...values});
const floraLight=packaged({id:'flora-light-au-official',canonicalId:'packaged:flora-light-au',name:'Flora Light',brand:'Flora',score:6,nutrients:{calories:43,energyKj:178}});
const floraPro=packaged({id:'flora-proactiv-light-au-official',canonicalId:'packaged:flora-proactiv-light-au',name:'Flora ProActiv Light',brand:'Flora',aliases:['flora proactiv light','proactiv light'],score:7,nutrients:{calories:37,energyKj:154}});
const brandReference={id:'flora-reference',recordType:'online-candidate',name:'Flora',brand:'Flora',market:'unknown',serving:'100 g reference',units:{g:.01},unitLabels:{g:'g'},nutrients:{calories:400}};
const becel={id:'becel',recordType:'online-candidate',name:'Becel Classic',brand:'Becel, Flora',market:'international',aliases:['flora'],source:'Open Food Facts · Community Supplied',nutrients:{calories:400}};
const butter={id:'butter',recordType:'online-candidate',name:'Butter',brand:'',market:'international',aliases:['flora butter'],source:'Online Product',nutrients:{calories:720}};
const foreignFlora={id:'foreign-flora',recordType:'online-candidate',name:'Flora 100% végétal Doux 250g',brand:'Flora',market:'FR',country:'France',source:'Open Food Facts · Community Supplied',nutrients:{calories:360}};
const margarina={id:'margarina',recordType:'online-candidate',name:'Margarina flora 400 g',brand:'Flora',market:'BR',country:'Brazil',source:'Open Food Facts · Community Supplied',nutrients:{calories:350}};
const broad=[becel,butter,brandReference,foreignFlora,margarina,floraPro,floraLight];

class Classes{
  constructor(values=[]){this.values=new Set(values);}
  add(value){this.values.add(value);}
  remove(value){this.values.delete(value);}
  contains(value){return this.values.has(value);}
  toggle(value,force){const on=force===undefined?!this.values.has(value):!!force;if(on)this.values.add(value);else this.values.delete(value);return on;}
}
class Control{
  constructor(attrs,text,parent){this.parent=parent;this.textContent=text.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();this.dataset={};this.value='';for(const match of attrs.matchAll(/\s(data-[\w-]+)(?:="([^"]*)")?/g)){const key=match[1].slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());this.dataset[key]=match[2]??'';}const value=attrs.match(/\svalue="([^"]*)"/);if(value)this.value=value[1];}
  closest(selector){if(selector==='.guided-resolution-card')return this.parent.card;const match=selector.match(/^\[data-([\w-]+)\]$/);if(!match)return null;const key=match[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return Object.hasOwn(this.dataset,key)?this:null;}
}
class Surface{
  constructor(id){this.id=id;this.className='';this.classList=new Classes();this.controls=[];this.inputs=[];this.card={querySelector:selector=>selector==='[data-gpr-amount]'?this.inputs.find(input=>Object.hasOwn(input.dataset,'gprAmount'))||null:null};this._html='';}
  set innerHTML(value){this._html=String(value);this.controls=[...this._html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(match=>new Control(match[1],match[2],this));this.inputs=[...this._html.matchAll(/<input([^>]*)>/g)].map(match=>new Control(match[1],'',this));}
  get innerHTML(){return this._html;}
  querySelector(selector){const data=selector.match(/^\[data-([\w-]+)\]$/);if(!data)return null;const key=data[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());return [...this.controls,...this.inputs].find(control=>Object.hasOwn(control.dataset,key))||null;}
  choice(label){return this.controls.find(control=>control.textContent.replace(/›/g,'').trim()===label);}
}
class FoodDocument{
  constructor(search){this.listeners={};this.body={classList:new Classes()};this.documentElement={style:{setProperty(){}}};this.activeElement=search;}
  addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}
  click(target){const event={target,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};for(const handler of this.listeners.click||[])handler(event);return event;}
}
function runtimeController(foods=[floraLight,floraPro],{focused=true,query='Flora'}={}){
  const search={id:'food-search',value:query},live=new Surface('food-live-results'),results=new Surface('food-results'),elements=new Map([['food-search',search],['food-live-results',live],['food-results',results]]),document=new FoodDocument(search);if(focused)document.body.classList.add('food-search-compact');else document.activeElement=null;
  const context={console,structuredClone,window:{},document,C8:catalogue,GUIDED_PRODUCTS:guided,allFoods:()=>foods,s23ProductLike:()=>true,ext:{ui:{diaryDate:'2026-08-31',pendingMeal:'Snacks',foodSearch:query}},isoToday:()=> '2026-08-31',by:id=>elements.get(id)||null,esc:value=>String(value??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),formatNaturalAmount:value=>String(value),energyText:(calories,energyKj)=>`${calories} Cal / ${energyKj} kJ`,rc6SyncFoodSearchViewport(){},saveExt(){},renderLibrary(){},getFood:id=>foods.find(food=>food.id===id),prepareEntry(){},clone:structuredClone};
  const start=runtime.indexOf('function ps33BrandFamily('),end=runtime.indexOf('const ps33ExactProductBase',start);assert.ok(start>0&&end>start,'production guided UI block is extractable');vm.createContext(context);vm.runInContext(`${runtime.slice(start,end)};globalThis.__ui={render:ps34RenderGuided,start:ps34StartCatalogueGuide,select:ps34SelectGuidedProductChoice,state:()=>({query:ps34GuidedQuery,session:ps34GuidedSession})};`,context);
  context.__ui.render();return {foods,search,live,results,document,api:context.__ui,active(){return live.innerHTML?live:results;},clickLabel(label){const control=live.choice(label)||results.choice(label);assert.ok(control,`rendered control ${label}`);return document.click(control);},control(label){return live.choice(label)||results.choice(label);}};
}

test('1. Flora uses trusted current Australian candidates as active tier one',()=>assert.equal(catalogue.brandFamilyResults(broad,'Flora').activeTier,1));
test('2. Becel Classic is excluded from Flora active candidates',()=>assert.ok(!catalogue.brandFamilyResults(broad,'Flora').products.includes(becel)));
test('3. generic Butter is excluded from Flora active candidates',()=>assert.ok(!catalogue.brandFamilyResults(broad,'Flora').products.includes(butter)));
test('4. foreign-language Flora is excluded while trusted Australian products exist',()=>assert.ok(!catalogue.brandFamilyResults(broad,'Flora').products.includes(foreignFlora)));
test('5. a brand-level Flora reference is excluded from exact choices',()=>assert.equal(catalogue.brandFamilyResults(broad,'Flora').excluded.find(item=>item.food===brandReference).reason,'non-specific-brand-reference'));
test('6. broader exact-brand products remain separate from active choices',()=>assert.deepEqual(catalogue.brandFamilyResults(broad,'Flora').broader.map(food=>food.id).sort(),['foreign-flora','margarina']));
test('7. company/source alias evidence is not consumer-brand membership',()=>assert.equal(catalogue.consumerBrandMembership(catalogue.queryIntent('Flora').entity,becel).matches,false));
test('8. plain Flora orders the simpler exact identity first',()=>assert.deepEqual(catalogue.brandFamilyResults(broad,'Flora').products.map(food=>food.name),['Flora Light','Flora ProActiv Light']));
test('9. Flora ProActiv query evidence narrows to ProActiv',()=>assert.equal(guided.createSession([floraLight,floraPro],'Flora ProActiv').exactProduct,floraPro));
test('10. Flora ProActiv Light resolves exact immediately',()=>assert.equal(guided.createSession([floraLight,floraPro],'Flora ProActiv Light').exactProduct,floraPro));

test('11. actual rendered Flora Light control follows the delegated click path',()=>{const app=runtimeController();const event=app.clickLabel('Flora Light');assert.equal(event.prevented,true);assert.match(app.active().innerHTML,/Exact canonical product[\s\S]*Flora Light[\s\S]*How are you measuring it\?/);});
test('12. actual rendered Flora ProActiv Light control follows the delegated click path',()=>{const app=runtimeController();app.clickLabel('Flora ProActiv Light');assert.equal(app.api.state().session.exactProduct.canonicalId,'packaged:flora-proactiv-light-au');assert.match(app.active().innerHTML,/How are you measuring it\?/);});
test('13. rendered click works in focused mobile mode',()=>{const app=runtimeController(undefined,{focused:true});assert.equal(app.document.body.classList.contains('food-search-compact'),true);app.clickLabel('Flora ProActiv Light');assert.equal(app.api.state().session.stage,guided.stages.MEASURE);});
test('14. rendered click works with the keyboard dismissed',()=>{const app=runtimeController(undefined,{focused:false});app.clickLabel('Flora Light');assert.equal(app.api.state().session.stage,guided.stages.MEASURE);});
test('15. stale choice IDs are rejected without changing the guide',()=>{const app=runtimeController();assert.equal(app.api.select('packaged:not-active','product'),false);assert.equal(app.api.state().session.stage,guided.stages.IDENTITY);});
test('16. guided choices are genuine type button controls',()=>{const app=runtimeController();assert.match(app.live.innerHTML,/<button type="button" class="guided-resolution-choice" data-gpr-answer="product"/);});
test('17. unresolved guide suppresses the floating global action',()=>{const app=runtimeController();assert.equal(app.document.body.classList.contains('guided-product-unresolved'),true);assert.match(styles,/body\.guided-product-unresolved #resource-add-button[^}]*display:none!important/);});

test('18. exact product is reached after a rendered tap',()=>{const app=runtimeController();app.clickLabel('Flora ProActiv Light');assert.equal(app.api.state().session.exactProduct.name,'Flora ProActiv Light');});
test('19. serving UI is absent before exact product and present after tap',()=>{const app=runtimeController();assert.doesNotMatch(app.live.innerHTML,/How are you measuring it\?/);app.clickLabel('Flora Light');assert.match(app.active().innerHTML,/How are you measuring it\?/);});
test('20. rendered selection preserves destination date and meal',()=>{const app=runtimeController();app.clickLabel('Flora ProActiv Light');assert.deepEqual({...app.api.state().session.destination},{date:'2026-08-31',meal:'Snacks'});});
test('21. rendered Back returns from exact product to brand choices',()=>{const app=runtimeController();app.clickLabel('Flora Light');app.clickLabel('← Back');assert.equal(app.api.state().session.stage,guided.stages.IDENTITY);assert.match(app.live.innerHTML,/Which exact product/);});
test('22. changing product after Back clears downstream serving state',()=>{const app=runtimeController();app.clickLabel('Flora ProActiv Light');app.clickLabel('g');app.clickLabel('← Back');app.clickLabel('← Back');app.clickLabel('Flora Light');assert.equal(app.api.state().session.selectedMeasure,null);assert.equal(app.api.state().session.exactProduct,floraLight);});
test('23. an active session candidate snapshot does not absorb later catalogue arrivals',()=>{const app=runtimeController();app.foods.push(packaged({id:'new-flora',canonicalId:'new-flora',name:'Flora Original',brand:'Flora'}));app.api.render();assert.deepEqual(app.api.state().session.initialCandidates.map(food=>food.name),['Flora Light','Flora ProActiv Light']);assert.doesNotMatch(app.live.innerHTML,/Flora Original/);});

test('24. rendered grams control accepts amount 5 through the selected-surface event path',()=>{const app=runtimeController();app.clickLabel('Flora ProActiv Light');app.clickLabel('g');const amount=app.active().querySelector('[data-gpr-amount]');amount.value='5';app.clickLabel('Continue');assert.equal(app.api.state().session.amount,5);});
test('25. rendered 5 g flow calculates about 18.5 Cal and 77 kJ',()=>{const app=runtimeController();app.clickLabel('Flora ProActiv Light');app.clickLabel('g');app.active().querySelector('[data-gpr-amount]').value='5';app.clickLabel('Continue');assert.match(app.active().innerHTML,/18\.5 Cal \/ 77 kJ/);});
test('26. one manufacturer serve calculates 37 Cal and 154 kJ',()=>{const app=runtimeController();app.clickLabel('Flora ProActiv Light');app.clickLabel('Manufacturer Serve (10 g)');app.active().querySelector('[data-gpr-amount]').value='1';app.clickLabel('Continue');assert.match(app.active().innerHTML,/37 Cal \/ 154 kJ/);});
test('27. nutrition reference does not preselect consumption amount',()=>{const session=guided.createSession([floraPro],'Flora ProActiv Light');assert.equal(session.amount,null);assert.equal(session.selectedMeasure,null);});

test('28. exact Flora ProActiv Light skips the brand stage',()=>assert.equal(guided.createSession([floraLight,floraPro],'Flora ProActiv Light').stage,guided.stages.MEASURE));
test('29. product filtering now retains a selected canonical product',()=>{const session=guided.createSession([floraLight,floraPro],'Flora');guided.answerDistinction(session,'product',floraPro.canonicalId);assert.equal(session.exactProduct,floraPro);});
test('30. an invalid engine answer cannot enter the answer history',()=>{const session=guided.createSession([floraLight,floraPro],'Flora');guided.answerDistinction(session,'product','invalid');assert.equal(session.answers.length,0);});
test('31. manageable synthetic families present concrete products',()=>{const a=packaged({id:'a',canonicalId:'a',name:'Example Original',brand:'Example',productFamily:'Core',variantLabel:'Original'}),b=packaged({id:'b',canonicalId:'b',name:'Example Light',brand:'Example',productFamily:'Core',variantLabel:'Light'}),session=guided.createSession([a,b],'Example');assert.equal(session.nextQuestion.key,'product');assert.equal(guided.presentationForSession(session),'direct-products');});
test('32. production source contains only the two current canonical Flora records',()=>{const names=[...runtime.matchAll(/id:'flora-(?:proactiv-)?light-au-official'[\s\S]*?name:'([^']+)'/g)].map(match=>match[1]);assert.deepEqual(names,['Flora ProActiv Light','Flora Light']);});
test('33. the repair contains no Flora-specific resolver branch',()=>{assert.doesNotMatch(read('guided-product-resolution.js'),/if\s*\([^)]*Flora|case\s+['"]Flora/);assert.doesNotMatch(read('food-catalogue.js'),/if\s*\([^)]*Flora|case\s+['"]Flora/);});
test('34. touch controls remain at least 48 px with manipulation semantics',()=>assert.match(styles,/guided-resolution-choice\{[^}]*min-height:48px[^}]*touch-action:manipulation/));
test('35. nested arrow decoration cannot steal pointer targeting',()=>assert.match(styles,/guided-resolution-choice b\{[^}]*pointer-events:none/));
test('36. compact mode retains one-column bounded choices',()=>assert.match(styles,/food-search-compact[\s\S]*?guided-resolution-choices\{grid-template-columns:1fr/));
test('37. 390x844 keyboard model remains compact and usable',()=>{const model=new Function(`${runtime.match(/function rc6FocusedSearchModel\([^\n]+/)?.[0]};return rc6FocusedSearchModel`)();assert.equal(model({innerWidth:390,innerHeight:844,visualWidth:390,visualHeight:520,focused:true}).compact,true);});
test('38. 390x520 dismissed keyboard model restores full mode',()=>{const model=new Function(`${runtime.match(/function rc6FocusedSearchModel\([^\n]+/)?.[0]};return rc6FocusedSearchModel`)();assert.equal(model({innerWidth:390,innerHeight:520,visualWidth:390,visualHeight:520,focused:false}).compact,false);});
test('39. 430x932 reduced viewport follows the existing compact policy',()=>{const model=new Function(`${runtime.match(/function rc6FocusedSearchModel\([^\n]+/)?.[0]};return rc6FocusedSearchModel`)();assert.equal(model({innerWidth:430,innerHeight:932,visualWidth:430,visualHeight:560,focused:true}).compact,true);});
test('40. the central handler rerenders exactly once after a valid product choice',()=>{const block=runtime.slice(runtime.indexOf('function ps34SelectGuidedProductChoice'),runtime.indexOf("document.addEventListener('click'",runtime.indexOf('function ps34SelectGuidedProductChoice')));assert.equal((block.match(/ps34RenderGuided\(\)/g)||[]).length,1);});
test('41. actual 30-member Flora renders meaningful products and completes measure to review',()=>{const app=runtimeController(actualFlora.foods,{query:'Flora'}),choices=app.api.state().session.nextQuestion.options;assert.equal(guided.presentationForSession(app.api.state().session),'direct-products');assert.ok(choices.length>1);assert.ok(choices.every(choice=>!/^(?:Proactiv|Butter|Margarine|Barcode \d+)$/i.test(choice.label)));app.clickLabel(choices[0].label);assert.equal(app.api.state().session.stage,guided.stages.MEASURE);assert.equal(catalogue.exactProductQuality(app.api.state().session.exactProduct,{candidates:actualFlora.foods}).exactEligible,true);app.clickLabel('g');app.active().querySelector('[data-gpr-amount]').value='5';app.clickLabel('Continue');assert.equal(app.api.state().session.stage,guided.stages.CONFIRMATION);});
test('42. actual Meadow Lea renders products without a mandatory taxonomy detour',()=>{const app=runtimeController(actualMeadow.foods,{query:'Meadow Lea'});app.api.start('Meadow Lea',actualMeadow.foods,actualMeadow.intent);const session=app.api.state().session,labels=session.nextQuestion.options.map(option=>option.label);assert.equal(guided.presentationForSession(session),'direct-products');assert.equal(session.nextQuestion.key,'product');assert.ok(labels.length>1);assert.ok(labels.every(label=>!/^(?:Fats|Dairies|Other products|Beurre)$/i.test(label)));assert.equal(new Set(labels.map(catalogue.norm)).size,labels.length);});
test('43. Meadow, Meadow le and Meadow lea keep product-list-first rendered state',async()=>{for(const query of ['Meadow','Meadow le','Meadow lea']){const result=await auditModule.api.search(query,{limit:500});if(result.foods.length>1){const session=guided.createSession(result.foods,query,{intent:result.intent});assert.equal(session.nextQuestion.key,'product',query);assert.notEqual(guided.presentationForSession(session),'useful-facet',query);}}});
test('44. production controller renders generic Margarine through identity, measure, amount and review',()=>{const app=runtimeController(progressiveAudit.afcdFoods,{query:'Margarine'});assert.equal(app.api.state().session.genericConcept.name,'Margarine');app.clickLabel('Monounsaturated');app.clickLabel('Reduced fat');app.clickLabel('Regular salt');assert.equal(app.api.state().session.stage,guided.stages.MEASURE);app.clickLabel('Teaspoon (5 g)');app.active().querySelector('[data-gpr-amount]').value='.5';app.clickLabel('Continue');assert.equal(app.api.state().session.stage,guided.stages.CONFIRMATION);assert.match(app.active().innerHTML,/Ready for review/);});
test('45. locked generic identity freezes the rendered surface against later arrivals',()=>{const app=runtimeController(progressiveAudit.afcdFoods,{query:'Margarine'});app.clickLabel('Polyunsaturated');app.clickLabel('Regular salt');const identity=app.api.state().session.exactProduct.name,before=app.results.innerHTML;app.foods.push(packaged({id:'late',name:'Late Online Margarine',brand:'Late'}));app.api.render();assert.equal(app.api.state().session.exactProduct.name,identity);assert.equal(app.results.innerHTML,before);assert.equal(app.live.innerHTML,'');});
test('46. production controller renders generic Milk without a branded detour',()=>{const app=runtimeController(progressiveAudit.afcdFoods,{query:'Milk'});assert.equal(app.api.state().session.genericConcept.name,'Milk');assert.equal(app.api.state().session.nextQuestion.key,'fatLevel');assert.match(app.active().innerHTML,/What fat level/);});
test('47. production controller renders sliced Bread and its trusted regular-slice measure',()=>{const app=runtimeController(progressiveAudit.afcdFoods,{query:'Bread'});app.clickLabel('Wholemeal');assert.equal(app.api.state().session.stage,guided.stages.MEASURE);assert.ok(app.control('Regular Slice Bread (40 g Australian standard grain serve)'));});
