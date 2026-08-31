/* Healthy Eating Companion — Guided Product Resolution 0.6.33
   Resolves one canonical product before exposing measure, amount or nutrition.
   Candidate distinctions are derived from data; no brand owns a question tree.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const CATALOGUE=global.HECFoodCatalogue||(typeof require==='function'?require('./food-catalogue.js'):null);
  const SERVING=global.HECServingFoundation||(typeof require==='function'?require('./serving-foundation.js'):null);
  const PACKAGED=global.HECPackagedFoods||(typeof require==='function'?require('./packaged-foods.js'):null);
  const SEMANTICS=global.HECProductServingSemantics||(typeof require==='function'?require('./product-serving-semantics.js'):null);
  const STATES=Object.freeze({EXACT:'exact-product',NEEDS_DISTINCTION:'needs-distinction',BRAND_FAMILY:'brand-family',GENERIC:'generic-food-concept',CONFIGURABLE:'configurable-product',NO_MATCH:'no-confident-match'});
  const STAGES=Object.freeze({IDENTITY:'product-identity',MEASURE:'serving-measure',AMOUNT:'consumption-amount',CONFIRMATION:'confirmation'});
  const DIMENSIONS=Object.freeze(['family','productLine','variant','flavour','fatLevel','saltLevel','texture','grain','format','dietaryVariant','packSize','size']);
  const LABELS=Object.freeze({family:'product family',productLine:'product line',variant:'variant',flavour:'flavour',fatLevel:'type',saltLevel:'salt level',texture:'texture',grain:'bread or grain type',format:'format',dietaryVariant:'dietary variant',packSize:'pack size',size:'size',product:'product'});
  const MEASURE_ALIASES=Object.freeze({gram:'g',grams:'g',g:'g',kilogram:'kg',kilograms:'kg',kg:'kg',millilitre:'mL',millilitres:'mL',milliliter:'mL',milliliters:'mL',ml:'mL',litre:'L',litres:'L',liter:'L',liters:'L',l:'L',serving:'serve',servings:'serve',serve:'serve',serves:'serve',teaspoon:'tsp',teaspoons:'tsp',tsp:'tsp',tablespoon:'tbsp',tablespoons:'tbsp',tbsp:'tbsp',cups:'cup',cup:'cup',slices:'slice',slice:'slice',pieces:'piece',piece:'piece',items:'item',item:'item',biscuits:'biscuit',biscuit:'biscuit',bars:'bar',bar:'bar',sachets:'sachet',sachet:'sachet',tubs:'tub',tub:'tub',bottles:'bottle',bottle:'bottle',cans:'can',can:'can',burgers:'burger',burger:'burger',wraps:'wrap',wrap:'wrap',muffins:'muffin',muffin:'muffin',portions:'portion',portion:'portion',meals:'meal',meal:'meal',rolls:'roll',roll:'roll'});
  const WORD_NUMBERS=Object.freeze({a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,half:.5,quarter:.25});

  function norm(value){return CATALOGUE?.norm?CATALOGUE.norm(value):String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
  function title(value){return String(value||'').replace(/\b\w/g,char=>char.toUpperCase());}
  function finite(value){if(value===null||value===undefined||value==='')return null;const number=Number(value);return Number.isFinite(number)?number:null;}
  function nutrientSignature(food){return ['calories','energyKj','protein','carbs','fat','satFat','fibre','sugar','sodium'].map(key=>finite(food?.nutrients?.[key])??'').join('|');}
  function explicitAttributes(food={}){
    return {
      brand:String(food.brand||''),family:String(food.familyName||food.productFamily||''),productLine:String(food.productLine||''),variant:String(food.variantLabel||food.productVariant||''),
      flavour:String(food.flavour||food.flavor||''),fatLevel:String(food.fatLevel||''),saltLevel:String(food.saltLevel||''),texture:String(food.texture||''),grain:String(food.grainType||food.grain||''),
      format:String(food.productFormat||food.format||''),dietaryVariant:String(food.dietaryVariant||''),packSize:String(food.packSize||food.packageQuantity||''),size:String(food.size||food.productSize||'')
    };
  }
  function inferredAttributes(food={}){
    const values=explicitAttributes(food),name=norm(food.name),brand=norm(food.brand),remainder=norm(name.replace(new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*`),' '));
    if(!values.family){const common=new Set(['original','light','lite','buttery','smooth','crunchy','plain','skim','multigrain','wholegrain','wholemeal','white','reduced','fat','salt','free','small','medium','large']);const words=remainder.split(' ').filter(word=>word&&!common.has(word));if(words.length&&words.length<4)values.family=title(words.join(' '));}
    if(!values.variant){const hit=name.match(/\b(original|light|lite|buttery|classic|regular|salt reduced|reduced salt|lactose free)\b/);if(hit)values.variant=title(hit[1].replace(/^lite$/,'light'));}
    if(!values.fatLevel){const hit=name.match(/\b(full cream|whole milk|skim|reduced fat|low fat|light)\b/);if(hit)values.fatLevel=title(hit[1]);}
    if(!values.texture){const hit=name.match(/\b(smooth|crunchy)\b/);if(hit)values.texture=title(hit[1]);}
    if(!values.grain){const hit=name.match(/\b(wholemeal|wholegrain|multigrain|white|sourdough)\b/);if(hit)values.grain=title(hit[1]);}
    if(!values.packSize){const hit=String(food.name||'').match(/\b\d+(?:\.\d+)?\s*(?:g|kg|mL|L)\b/);if(hit)values.packSize=hit[0];}
    return values;
  }
  function productAttributes(food){return inferredAttributes(food);}
  function canonicalProductKey(food={}){
    if(food.canonicalId)return String(food.canonicalId);
    if(food.barcode)return `barcode:${String(food.barcode).replace(/\D/g,'')}`;
    if(food.foodSourceId&&food.sourceItemId)return `food-source:${food.foodSourceId}:${food.sourceItemId}${food.sourceVariantId?`:${food.sourceVariantId}`:''}`;
    const attrs=productAttributes(food);return `product:${norm(food.brand)}:${norm(food.name)}:${norm(attrs.packSize)}`;
  }
  function candidateQuality(food){return Number(CATALOGUE?.brandProductQuality?.(food)||0)+(food?.verified?100:0)+(finite(food?.nutrients?.calories)!==null?20:0);}
  function canonicalizeCandidates(records=[]){
    const groups=new Map();for(const food of records||[]){if(!food)continue;const key=canonicalProductKey(food),group=groups.get(key)||[];group.push(food);groups.set(key,group);}
    return [...groups.entries()].map(([key,group])=>{const ordered=[...group].sort((a,b)=>candidateQuality(b)-candidateQuality(a)),chosen=ordered[0],signatures=new Set(group.map(nutrientSignature).filter(signature=>signature.replace(/\|/g,'')));if(group.length===1)return chosen;return {...chosen,canonicalId:chosen.canonicalId||key,resolutionAlternates:group.map(item=>({id:item.id||'',source:item.source||'',nutritionBasis:clone(item.nutritionBasis||null),nutrients:clone(item.nutrients||{})})),identityReviewRequired:signatures.size>1};});
  }
  function isNonSpecificBrandRecord(food){const attrs=productAttributes(food),brand=norm(food?.brand),name=norm(food?.name);return !!brand&&name===brand&&!DIMENSIONS.some(key=>norm(attrs[key]));}
  function phrasePresent(query,value){const q=` ${norm(query)} `,v=norm(value);return !!v&&q.includes(` ${v} `);}
  function knownAttributesFromQuery(candidates,query,seed={}){
    const known={...seed};for(const key of DIMENSIONS){if(known[key])continue;const values=[...new Set(candidates.map(food=>productAttributes(food)[key]).filter(Boolean))];const matches=values.filter(value=>phrasePresent(query,value));if(matches.length===1)known[key]=matches[0];}return known;
  }
  function filterKnown(candidates,known={}){return candidates.filter(food=>{const attrs=productAttributes(food);return Object.entries(known).every(([key,value])=>{if(!value)return true;if(key==='product')return canonicalProductKey(food)===value;return norm(attrs[key])===norm(value);});});}
  function optionFor(key,value,candidates){const matching=key==='product'?candidates.filter(food=>canonicalProductKey(food)===value):candidates.filter(food=>norm(productAttributes(food)[key])===norm(value));const sample=matching[0];return {value,label:key==='product'?String(sample?.name||value):String(value),count:matching.length,productKey:key==='product'?value:''};}
  function getNextProductDistinction(candidates,knownAttributes={}){
    if((candidates||[]).length<=1)return null;
    for(const key of DIMENSIONS){if(knownAttributes[key])continue;const values=candidates.map(food=>productAttributes(food)[key]),usable=values.every(Boolean),unique=[...new Set(values.map(norm))];if(usable&&unique.length>1){const originals=[...new Map(values.map(value=>[norm(value),value])).values()];return {key,label:LABELS[key],question:`Which ${LABELS[key]}?`,options:originals.map(value=>optionFor(key,value,candidates))};}}
    return {key:'product',label:LABELS.product,question:'Which exact product?',options:candidates.map(food=>optionFor('product',canonicalProductKey(food),candidates))};
  }
  function normalizeMeasure(value){return MEASURE_ALIASES[norm(value).replace(/\s/g,'')]||MEASURE_ALIASES[norm(value)]||String(value||'');}
  function parseConsumption(raw){
    const text=String(raw||''),normal=norm(text),unitPattern=Object.keys(MEASURE_ALIASES).sort((a,b)=>b.length-a.length).map(value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
    const withUnit=normal.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?|${Object.keys(WORD_NUMBERS).join('|')})\\s*(${unitPattern})\\b`));let amount=null,measure='',phrase='';
    if(withUnit){amount=WORD_NUMBERS[withUnit[1]]??Number(withUnit[1]);measure=normalizeMeasure(withUnit[2]);phrase=withUnit[0];}
    else{const count=normal.match(new RegExp(`^\\s*(\\d+(?:\\.\\d+)?|${Object.keys(WORD_NUMBERS).join('|')})\\b`));if(count){amount=WORD_NUMBERS[count[1]]??Number(count[1]);phrase=count[0];}}
    const identityQuery=norm(normal.replace(phrase,' ').replace(/\b(?:add|log|record|plan|please|for|to|today|tomorrow|breakfast|lunch|dinner|snacks?|other)\b/g,' '));return {identityQuery:identityQuery||normal,amount:finite(amount),measure,explicit:finite(amount)!==null,phrase};
  }
  function identityQueries(query){const normal=norm(query),singular=normal.replace(/\b(macs|burgers|wraps|muffins|rolls|items|biscuits|slices|tubs|bottles|cans)\b/g,word=>word.slice(0,-1));return [...new Set([normal,singular].filter(Boolean))];}
  function servingProfile(food){
    if(!food)return null;const original=clone(food),semantic=SEMANTICS?.classify?.(original),policy=SEMANTICS?.servingPolicy?.(original,semantic),boundaryLocked=policy?.foodGroupUnitEligibility?.allowed===false||(semantic?.type===SEMANTICS?.types?.REFERENCE&&policy?.allowedUnitFamily==='metric-reference'),resolved=boundaryLocked&&SEMANTICS?.applyToFood?SEMANTICS.applyToFood(clone(food)):SERVING?.applyToFood?SERVING.applyToFood(clone(food)):clone(food),units=resolved.units||{},labels=resolved.unitLabels||{},origins=resolved.unitOrigins||{},measures=[];
    for(const [key,multiplierRaw] of Object.entries(units)){const multiplier=finite(multiplierRaw);if(multiplier===null||multiplier<=0)continue;let source='central-serving-profile';if(original.units?.[key]!==undefined)source=original.manufacturerServing||original.packageServingExplicit?'explicit-product-metadata':'source-product-metadata';else if(origins[key]?.origin)source=String(origins[key].origin);measures.push({key,label:String(labels[key]||key),multiplier,source,confidence:String(origins[key]?.confidence||'')});}
    if(!measures.length){const metric=/drink|beverage|milk|juice|water/i.test(`${food.category||''} ${food.name||''}`)?'mL':'g',per100=food.nutritionPer100||food.nutritionPer100g||/per 100|reference/i.test(String(food.serving||''));if(per100)measures.push({key:metric,label:metric,multiplier:.01,source:'conservative-metric-fallback',confidence:'high'});}
    const preferred=measures.some(item=>item.key===resolved.defaultUnit)?resolved.defaultUnit:measures[0]?.key||'';
    return {productKey:canonicalProductKey(food),measures,preferredMeasure:preferred,selectedMeasure:null,amount:null,nutritionBasis:clone(food.nutritionBasis||{semanticBasis:SEMANTICS?.servingPolicy?.(food)?.nutritionBasis||''}),referenceServing:clone(food.manufacturerServing||null),packageSize:String(food.packSize||food.packageQuantity||''),sourceDefault:{amount:finite(food.defaultAmount),unit:String(food.defaultUnit||'')},resolvedFood:resolved};
  }
  function workflowState(session){
    const candidates=filterKnown(session.initialCandidates,session.knownAttributes);session.candidates=candidates;
    if(!candidates.length){session.resolutionState=STATES.NO_MATCH;session.stage=STAGES.IDENTITY;session.nextQuestion=null;session.exactProduct=null;return session;}
    if(candidates.length===1){const food=candidates[0],type=SEMANTICS?.classify?.(food)?.type;session.exactProduct=food;session.resolutionState=type===SEMANTICS?.types?.CONFIGURABLE?STATES.CONFIGURABLE:STATES.EXACT;session.nextQuestion=null;session.servingProfile=servingProfile(food);session.stage=session.resolutionState===STATES.CONFIGURABLE?STAGES.IDENTITY:STAGES.MEASURE;return session;}
    session.exactProduct=null;session.resolutionState=session.initialResolutionState===STATES.BRAND_FAMILY&&!session.answers.length?STATES.BRAND_FAMILY:session.initialResolutionState===STATES.GENERIC&&!session.answers.length?STATES.GENERIC:STATES.NEEDS_DISTINCTION;session.stage=STAGES.IDENTITY;session.nextQuestion=getNextProductDistinction(candidates,session.knownAttributes);return session;
  }
  function candidatePool(records,query){
    const all=canonicalizeCandidates(records).filter(food=>!isNonSpecificBrandRecord(food)),queries=identityQueries(query),intent=CATALOGUE?.queryIntent?.(query)||{kind:'product'},family=CATALOGUE?.brandFamilyResults?.(all,query);
    if(family?.products?.length)return {candidates:canonicalizeCandidates(family.products).filter(food=>!isNonSpecificBrandRecord(food)),intent,state:STATES.BRAND_FAMILY};
    const exact=queries.map(value=>CATALOGUE?.resolve?.(all,value)).find(value=>value?.status==='exact'&&value.food);if(exact?.food)return {candidates:[exact.food],intent,state:STATES.EXACT};
    let ranked=all.map(food=>({food,score:Math.max(...queries.map(value=>Number(CATALOGUE?.rank?.(food,value)?.score)||0))})).filter(item=>item.score>=650).sort((a,b)=>b.score-a.score).map(item=>item.food);
    if(!ranked.length){const tokens=norm(query).split(' ').filter(Boolean);ranked=all.filter(food=>tokens.every(token=>norm(`${food.brand||''} ${food.name||''} ${Object.values(productAttributes(food)).join(' ')}`).includes(token)));}
    const brands=[...new Set(ranked.map(food=>norm(food.brand)).filter(Boolean))],brandOnly=brands.length===1&&norm(query)===brands[0],state=brandOnly?STATES.BRAND_FAMILY:(!intent.entity&&ranked.length>1?STATES.GENERIC:STATES.NEEDS_DISTINCTION);return {candidates:canonicalizeCandidates(ranked),intent,state};
  }
  function createSession(records,query,{knownAttributes={},consumption=null,destination=null}={}){
    let parsed=consumption?{...parseConsumption(query),...consumption,identityQuery:consumption.identityQuery||parseConsumption(query).identityQuery}:parseConsumption(query),pool=candidatePool(records,parsed.identityQuery);const packageIdentity=parsed.explicit&&parsed.measure&&pool.candidates.length===1&&norm(productAttributes(pool.candidates[0]).packSize)===norm(parsed.phrase);if(packageIdentity){parsed={...parsed,identityQuery:norm(query),amount:null,measure:'',explicit:false,phrase:''};pool=candidatePool(records,parsed.identityQuery);}const initial=pool.candidates,known=knownAttributesFromQuery(initial,parsed.identityQuery,knownAttributes),session={version:VERSION,query:String(query||''),identityQuery:parsed.identityQuery,intent:pool.intent,initialCandidates:initial,candidates:initial,initialResolutionState:pool.state,resolutionState:pool.state,stage:STAGES.IDENTITY,knownAttributes:known,answers:[],nextQuestion:null,exactProduct:null,servingProfile:null,selectedMeasure:null,amount:null,nutrition:null,destination:clone(destination||null),consumption:parsed};
    workflowState(session);if(session.resolutionState===STATES.EXACT&&parsed.explicit){const measure=parsed.measure||((SEMANTICS?.classify?.(session.exactProduct)?.type!==SEMANTICS?.types?.PACKAGED)?session.servingProfile?.preferredMeasure:'');if(measure&&session.servingProfile?.measures.some(item=>item.key===measure)){selectMeasure(session,measure);selectAmount(session,parsed.amount);}}return session;
  }
  function rebuild(session){const fresh=createSession(session.initialCandidates,session.identityQuery,{knownAttributes:{},destination:session.destination});for(const answer of session.answers)answerDistinction(fresh,answer.key,answer.value);return fresh;}
  function answerDistinction(session,key,value){if(!session||session.stage!==STAGES.IDENTITY)return session;const question=session.nextQuestion,choice=question?.key===key&&question.options?.find(option=>String(option.value)===String(value));if(!choice)return session;const answer={key,value};session.answers.push(answer);if(key==='product')session.knownAttributes.product=value;else session.knownAttributes[key]=value;return workflowState(session);}
  function changeAnswer(session,key,value){if(!session)return session;const index=session.answers.findIndex(answer=>answer.key===key);session.answers=index<0?session.answers:session.answers.slice(0,index);const rebuilt=rebuild(session);return answerDistinction(rebuilt,key,value);}
  function selectMeasure(session,measure){if(!session?.exactProduct||session.stage!==STAGES.MEASURE)return session;const key=normalizeMeasure(measure),choice=session.servingProfile?.measures.find(item=>item.key===key);if(!choice)return session;session.selectedMeasure=choice;session.servingProfile.selectedMeasure=choice.key;session.stage=STAGES.AMOUNT;return session;}
  function calculateNutrition(session){if(!session?.exactProduct||!session.selectedMeasure||!(session.amount>0))return null;const factor=session.selectedMeasure.multiplier*session.amount;return PACKAGED?.scale?PACKAGED.scale(session.exactProduct.nutrients||{},factor):Object.fromEntries(Object.entries(session.exactProduct.nutrients||{}).map(([key,value])=>[key,finite(value)===null?null:Number(value)*factor]));}
  function selectAmount(session,amount){if(!session||session.stage!==STAGES.AMOUNT)return session;const value=finite(amount);if(value===null||value<=0)return session;session.amount=value;session.servingProfile.amount=value;session.nutrition=calculateNutrition(session);session.stage=STAGES.CONFIRMATION;return session;}
  function back(session){if(!session)return session;if(session.stage===STAGES.CONFIRMATION){session.amount=null;session.nutrition=null;session.servingProfile.amount=null;session.stage=STAGES.AMOUNT;return session;}if(session.stage===STAGES.AMOUNT){session.selectedMeasure=null;session.servingProfile.selectedMeasure=null;session.stage=STAGES.MEASURE;return session;}if(session.answers.length){session.answers.pop();return rebuild(session);}return session;}
  function resolveRequest(records,query,options={}){return createSession(records,query,options);}
  function separationAudit(session){return {productIdentity:!!session?.exactProduct||[STATES.BRAND_FAMILY,STATES.GENERIC,STATES.NEEDS_DISTINCTION,STATES.NO_MATCH].includes(session?.resolutionState),servingMeasure:session?.servingProfile===null||session?.servingProfile?.selectedMeasure===null||typeof session?.servingProfile?.selectedMeasure==='string',amount:session?.amount===null||Number.isFinite(session?.amount),nutritionBasis:session?.servingProfile===null||Object.prototype.hasOwnProperty.call(session.servingProfile,'nutritionBasis'),packageSize:session?.servingProfile===null||Object.prototype.hasOwnProperty.call(session.servingProfile,'packageSize')};}
  function summary(session){return {resolutionState:session?.resolutionState||STATES.NO_MATCH,stage:session?.stage||STAGES.IDENTITY,product:session?.exactProduct?.name||'',question:session?.nextQuestion?.question||'',options:(session?.nextQuestion?.options||[]).map(option=>option.label),measure:session?.selectedMeasure?.key||'',amount:session?.amount??null,nutrition:clone(session?.nutrition||null)};}

  const api={version:VERSION,states:STATES,stages:STAGES,dimensions:DIMENSIONS,labels:LABELS,norm,normalizeMeasure,parseConsumption,productAttributes,canonicalProductKey,canonicalizeCandidates,isNonSpecificBrandRecord,knownAttributesFromQuery,getNextProductDistinction,servingProfile,createSession,answerDistinction,changeAnswer,selectMeasure,selectAmount,calculateNutrition,back,resolveRequest,separationAudit,summary};
  global.HECGuidedProductResolution=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
