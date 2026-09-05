'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const guided=require('../guided-product-resolution.js');
const serving=require('../serving-foundation.js');
const catalogue=require('../food-catalogue.js');
const audit=require('../scripts/audit_progressive_food_resolution.js');

const ROOT=path.resolve(__dirname,'..'),runtime=fs.readFileSync(path.join(ROOT,'alpha06.js'),'utf8'),styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8'),docs=fs.readFileSync(path.join(ROOT,'PROGRESSIVE_FOOD_RESOLUTION_AND_PORTION_POLICY.md'),'utf8');
const packaged=(values={})=>({id:'product',canonicalId:`packaged:${values.id||'product'}`,recordType:'packaged',market:'AU',verified:true,verificationStatus:'verified',name:'Example Product',brand:'Example',category:'Spreads',categories:['Spreads'],defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.1},unitLabels:{serve:'Manufacturer Serve (10 g)',g:'g'},manufacturerServing:{amount:10,unit:'g'},nutrients:{calories:40,energyKj:167.4},...values});
const floraLight=packaged({id:'flora-light',name:'Flora Light',brand:'Flora',aliases:['flora light'],fatLevel:'Light',productFamily:'Margarine'}),floraPro=packaged({id:'flora-pro',name:'Flora ProActiv Light',brand:'Flora',aliases:['flora proactiv light'],fatLevel:'Light',productLine:'ProActiv',productFamily:'Margarine',nutrients:{calories:37,energyKj:154}}),flora=[floraLight,floraPro];
function answerLabel(session,label){const choice=session.nextQuestion?.options.find(item=>item.label===label);assert.ok(choice,`${label} offered for ${session.nextQuestion?.key}`);guided.answerDistinction(session,session.nextQuestion.key,choice.value);return session;}
function margarine(){const session=guided.createSession(audit.afcdFoods,'margarine');answerLabel(session,'Monounsaturated');answerLabel(session,'Reduced fat');answerLabel(session,'Regular salt');return session;}
function milk(){const session=guided.createSession(audit.afcdFoods,'milk');answerLabel(session,'Regular fat');answerLabel(session,'Standard lactose');answerLabel(session,'Standard');return session;}
function bread(){const session=guided.createSession(audit.afcdFoods,'bread');answerLabel(session,'Wholemeal');return session;}

test('1. generic concept initialized',()=>assert.equal(guided.createSession(audit.afcdFoods,'margarine').genericConcept.name,'Margarine'));
test('2. brand product initialized',()=>assert.equal(guided.createSession(flora,'Flora',{intent:{kind:'consumer-brand'}}).consumerBrand.name,'Flora'));
test('3. known attributes populated',()=>assert.equal(guided.createSession(audit.afcdFoods,'reduced fat monounsaturated margarine').knownAttributes.fatLevel,'Reduced fat'));
test('4. unresolved attributes identified',()=>assert.ok(guided.createSession(audit.afcdFoods,'margarine').unresolvedAttributes.includes('oilType')));
test('5. one-value attributes auto-inherited',()=>assert.equal(guided.createSession(audit.afcdFoods,'milk').knownAttributes.milkSource,'Dairy'));
test('6. best next question selected',()=>assert.equal(guided.createSession(audit.afcdFoods,'margarine').nextQuestion.key,'oilType'));
test('7. answer narrows state',()=>{const session=guided.createSession(audit.afcdFoods,'margarine'),before=session.candidates.length;answerLabel(session,'Polyunsaturated');assert.ok(session.candidates.length<before);});
test('8. exact generic identity reached',()=>assert.equal(margarine().identityKind,'generic-reference'));
test('9. exact branded identity reached',()=>assert.equal(guided.createSession(flora,'Flora ProActiv Light').exactProduct,floraPro));
test('10. Back clears invalid downstream state',()=>{const session=margarine();guided.selectMeasure(session,'g');guided.selectAmount(session,5);guided.back(session);assert.equal(session.amount,null);assert.equal(session.stage,guided.stages.AMOUNT);});

test('11. generic margarine enters progressive flow',()=>assert.equal(guided.createSession(audit.afcdFoods,'margarine').stage,guided.stages.IDENTITY));
test('12. real supported margarine attributes are asked',()=>assert.deepEqual(guided.genericSchemas.margarine.dimensions.map(item=>item.key),['oilType','fatLevel','saltLevel','functionalVariant']));
test('13. unsupported margarine attributes are not invented',()=>assert.doesNotMatch(JSON.stringify(guided.genericSchemas.margarine),/thinSpread|regularSpread|thickSpread/));
test('14. final generic nutritional identity achieved',()=>assert.match(margarine().exactNutritionalIdentity.name,/Margarine spread/));
test('15. generic margarine requires no brand',()=>assert.equal(margarine().genericConcept.name,'Margarine'));
test('16. serving appears only after identity',()=>{const unresolved=guided.createSession(audit.afcdFoods,'margarine');assert.equal(unresolved.servingProfile,null);assert.ok(margarine().servingProfile);});
test('17. amount appears only after serving',()=>{const session=margarine();guided.selectAmount(session,5);assert.equal(session.amount,null);guided.selectMeasure(session,'g');guided.selectAmount(session,5);assert.equal(session.amount,5);});

test('18. Flora recognizes brand intent',()=>assert.equal(catalogue.brandFamilyResults(flora,'Flora').entity.name,'Flora'));
test('19. exact product metadata skips generic attributes',()=>{const session=guided.createSession(flora,'Flora');guided.answerDistinction(session,'product',floraPro.canonicalId);assert.equal(session.stage,guided.stages.MEASURE);assert.equal(session.nextQuestion,null);assert.equal(session.knownAttributes.fatLevel,'Light');assert.equal(session.attributeProvenance.productLine,'selected-product-metadata');});
test('20. ProActive family shell does not wrongly become exact',()=>{const shell=packaged({id:'shell',name:'Flora ProActiv',brand:'Flora',productLine:'ProActiv'}),specific=packaged({id:'specific',name:'Flora ProActiv Light',brand:'Flora',productLine:'ProActiv'});assert.equal(catalogue.exactProductQuality(shell,{candidates:[shell,specific]}).exactEligible,false);});
test('21. exact selection locks search state',()=>assert.equal(guided.createSession(flora,'Flora ProActiv Light').searchLock.locked,true));
test('22. delayed online response is gated from locked flow',()=>assert.match(runtime,/token!==psLargeSearchToken\|\|\(!forceBranded&&ps34GuidedSession\)/));

test('23. grams remain available',()=>assert.ok(margarine().servingProfile.measures.some(item=>item.key==='g')));
test('24. trusted teaspoon remains available',()=>{const tsp=margarine().servingProfile.measures.find(item=>item.key==='tsp');assert.equal(tsp.multiplier,.05);assert.equal(tsp.confidence,'reviewed-generic-form');});
test('25. manufacturer serving remains explicit',()=>{const serve=guided.servingProfile(floraPro).measures.find(item=>item.key==='serve');assert.equal(serve.confidence,'package-explicit');});
test('26. only validated spread presets are enabled',()=>{const profile=margarine().servingProfile;assert.deepEqual(profile.portionPresets.map(item=>item.key),['tsp','tbsp']);assert.equal(profile.measures.find(item=>item.key==='tbsp').conversionToBase.baseQuantity,19);for(const key of ['thinSpread','regularSpread','thickSpread'])assert.ok(!profile.measures.some(item=>item.key===key));});
test('27. arbitrary gram amount is supported',()=>{const session=margarine();guided.selectMeasure(session,'g');guided.selectAmount(session,12.5);assert.equal(session.amount,12.5);});
test('28. fractional household amount is supported',()=>{const session=margarine();guided.selectMeasure(session,'tsp');guided.selectAmount(session,.5);assert.equal(session.amount,.5);});
test('29. package size is not consumption',()=>assert.equal(guided.createSession([packaged({packSize:'500 g'})],'Example Product 500 g').amount,null));
test('30. nutrition basis is not consumption',()=>assert.equal(guided.createSession([floraPro],'Flora ProActiv Light').amount,null));

test('31. generic milk uses progressive resolution',()=>assert.equal(guided.createSession(audit.afcdFoods,'milk').nextQuestion.key,'fatLevel'));
test('32. exact generic milk identity is reached',()=>assert.match(milk().exactProduct.name,/regular fat/));
test('33. generic milk offers mL',()=>assert.ok(milk().servingProfile.measures.some(item=>item.key==='mL')));
test('34. generic milk offers a 250 mL cup',()=>{const profile=milk().servingProfile,cup=profile.measures.find(item=>item.key==='cup'),ml=profile.measures.find(item=>item.key==='mL');assert.equal(cup.multiplier/ml.multiplier,250);});
test('35. generic milk accepts arbitrary mL',()=>{const session=milk();guided.selectMeasure(session,'mL');guided.selectAmount(session,375);assert.equal(session.amount,375);});

test('36. sliced generic bread reaches an exact identity',()=>assert.match(bread().exactProduct.name,/wholemeal flour/));
test('37. sliced generic bread has a trusted natural unit',()=>assert.ok(bread().servingProfile.portionPresets.some(item=>item.key==='regularSlice')));
test('38. sliced generic bread accepts an amount',()=>{const session=bread();guided.selectMeasure(session,'regularSlice');guided.selectAmount(session,1.5);assert.equal(session.amount,1.5);});

test('39. fully specified brand product and measure skip questions',()=>{const session=guided.resolveRequest(flora,'Flora ProActiv Light one teaspoon');assert.equal(session.stage,guided.stages.CONFIRMATION);assert.equal(session.selectedMeasure.key,'tsp');assert.equal(session.amount,1);});
test('40. partially specified generic food retains answered attributes',()=>{const session=guided.createSession(audit.afcdFoods,'reduced fat monounsaturated margarine');assert.equal(session.knownAttributes.oilType,'Monounsaturated');assert.equal(session.nextQuestion.key,'saltLevel');});
test('41. voice and typed requests share the same exported engine',()=>{assert.equal(global.HECProgressiveFoodResolution,guided);assert.match(runtime,/GUIDED_PRODUCTS\.resolveRequest\(allFoods\(\),intent\.foodText/);});

test('42. incomplete nutrition is classified before portion entry',()=>{const food=packaged({id:'partial',name:'Specific Partial Product',nutrients:{protein:2}}),session=guided.createSession([food],food.name);assert.equal(session.stage,guided.stages.IDENTITY);assert.equal(session.addability.status,'needs-nutrition-completion');assert.equal(session.nutrition,null);});
test('43. missing nutrition cannot become a false-zero logging flow',()=>{const food=packaged({id:'missing',name:'Specific Missing Product',nutrients:{protein:2}}),session=guided.createSession([food],food.name);assert.equal(session.addability.normalLoggingAllowed,false);assert.equal(session.selectedMeasure,null);assert.equal(session.nutrition,null);});
test('44. kcal and kJ scale consistently',()=>{const food=packaged({id:'energy',name:'Specific Energy Product',defaultUnit:'g',defaultAmount:100,units:{g:.01},unitLabels:{g:'g'},manufacturerServing:null,nutrients:{calories:100,energyKj:418.4}}),session=guided.createSession([food],food.name);guided.selectMeasure(session,'g');guided.selectAmount(session,50);assert.equal(session.nutrition.calories,50);assert.equal(session.nutrition.energyKj,209.2);});
test('45. weak exact product is rejected',()=>assert.equal(catalogue.exactProductQuality(packaged({name:'Proactiv',genericName:'',quantity:'',packSize:''}),{candidates:flora}).exactEligible,false));

test('46. selected identity hides live and online result surfaces',()=>{assert.match(styles,/body\.progressive-food-resolution-active #food-live-results\.hidden/);assert.match(styles,/body\.progressive-food-resolution-active \[data-off-results\]/);assert.match(runtime,/progressive-food-resolution-locked/);});
test('47. active workflow renders one exact card surface',()=>{assert.match(runtime,/if\(ps34ResolutionLocked\(\)\|\|document\.activeElement!==by\('food-search'\)\)/);assert.match(runtime,/if\(!ps34ResolutionLocked\(\)&&document\.activeElement===by\('food-search'\)\)/);});
test('48. Back restores the previous search state',()=>{const session=guided.createSession([floraPro],'Flora ProActiv Light');guided.back(session);assert.equal(session.restoreSearchRequested,true);assert.match(runtime,/ps34RestoredQuery=ps34GuidedQuery/);});
test('49. stale async work is ignored after selection lock',()=>assert.match(runtime,/if\(locked&&!ps34WasLocked&&typeof psLargeSearchToken!=='undefined'\)psLargeSearchToken\+\+/));
test('50. online append cannot alter active portion flow',()=>assert.match(runtime,/function psLargeRender\(result,\{append=false\}=\{\}\)\{if\(ps34GuidedSession\)return/));

test('51. generic audit covers at least 50 AFCD concepts without stuck states',()=>{const report=audit.genericAudit(50);assert.equal(report.sampled,50);assert.equal(report.stuck,0);});
test('52. brand inheritance audit covers 100 real Australian products',()=>{const report=audit.brandInheritanceAudit(100);assert.equal(report.sampled,100);assert.equal(report.unnecessaryQuestionsAvoided,100);});
test('53. portion audit records spread evidence gap and six forms',()=>{const report=audit.portionAudit();assert.equal(report.sampled,6);assert.equal(report.spreadEvidenceGap.status,'unavailable');});
test('54. resolution benchmark executes bounded candidate steps',()=>{const report=audit.resolutionPerformance(50);assert.equal(report.iterations,50);assert.ok(report.p95Ms<250);});
test('55. portion policy documents provenance and metric fallback',()=>{assert.match(docs,/conversion provenance/i);assert.match(docs,/2\.5 g \/ 5 g \/ 7 g.*remain unavailable/i);});
test('56. selected generic identity preserves Diary destination',()=>{const session=guided.createSession(audit.afcdFoods,'bread',{destination:{date:'2026-09-01',meal:'Lunch'}});answerLabel(session,'Wholemeal');assert.deepEqual(session.destination,{date:'2026-09-01',meal:'Lunch'});});
test('57. generic route never substitutes a branded online product',()=>{const branded=packaged({id:'random',name:'Random Margarine',brand:'Random'}),session=guided.createSession([...audit.afcdFoods,branded],'margarine');assert.equal(session.identityKind,'generic-reference');assert.ok(session.allCandidates.every(food=>food.recordType==='afcd'));});
test('58. floating add is hidden throughout progressive resolution',()=>assert.match(styles,/body\.progressive-food-resolution-active #resource-add-button/));
test('59. locked flow remains horizontally bounded',()=>assert.match(styles,/body\.progressive-food-resolution-active #food-results\{max-width:100%;overflow-x:hidden/));
test('60. architecture preserves version 0.6.33',()=>{assert.equal(guided.version,'0.6.33');assert.equal(serving.version,'0.6.33');});
