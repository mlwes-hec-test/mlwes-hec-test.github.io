/* One generic identity/session owner. No nutrient aggregation or persistence. */
(function(global){
  'use strict';
  const DATA=global.HECGenericFoodCatalogue||(typeof require==='function'?require('./generic-food-catalogue.js'):null),clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const ignored=['size','boilExtent','seasoningWater'];
  const supported=(mapping,facts)=>Object.entries(facts).every(([key,value])=>{
    if(!value||ignored.includes(key)||key==='physicalForm')return true;
    if(key==='quantityWeightState')return value===mapping.quantityWeightState;
    if(key==='additions')return value==='none'?!mapping.attributes.additions:value===mapping.attributes.additions;
    if(key==='preparation'&&value==='boiled')return ['boiled','hard-boiled'].includes(mapping.attributes.preparation);
    return mapping.attributes[key]===value;
  });
  function referenceRecords(concept,records){return concept.references.flatMap(mapping=>{
    const food=records.find(food=>(food.afcd||food.recordType==='afcd')&&food.afcdKey===mapping.key&&food.name===mapping.expectedName&&Number(food.units?.g)===.01&&/100\s*g/i.test(food.serving||''));
    return food?[{mapping,food}]:[];
  });}
  const factsFor=intent=>intent?.attributes||intent?.known||{};
  function matchFood(food,intent){
    const concept=DATA.concepts[typeof intent==='string'?intent:intent?.conceptId],facts=typeof intent==='string'?{}:factsFor(intent),identity=DATA.identity(food),reference=concept?.references.find(item=>item.key===food?.afcdKey&&item.expectedName===food?.name),compatible=!!reference&&supported(reference,facts);
    return {candidateConceptId:identity?.conceptId||'',compatible,relationship:compatible?'applicable-reference':identity?.conceptId===concept?.id?'different-state-or-unreviewed-reference':'different-concept',evidence:reference?'reviewed-source-mapping':'no-reviewed-mapping',confidence:reference?'high':'unknown',conflicts:reference?Object.keys(facts).filter(key=>!supported(reference,{[key]:facts[key]})):[]};
  }
  const labels={form:'What form?',preparation:'How was it prepared?',species:'What type of egg?',variety:'What type?',skin:'Did you eat the skin?',meat:'What meat?',cut:'What cut?',trim:'Was the visible fat eaten?',fat:'What fat level?',additions:'What was it prepared with?',enrichment:'What type of egg?'};
  const choiceLabel=(key,value)=>key==='preparation'?DATA.methods[value]||value:({unpeeled:'Skin on',peeled:'Peeled',skinless:'Skin removed','skin-on':'Skin on',whole:'Whole',dry:'Dry / uncooked','dry-origin':'Cooked from dried pasta',fresh:'Fresh pasta',porridge:'Porridge',water:'Water',milk:'Regular-fat milk',none:'No additions',General:'General / mixed varieties'})[value]||value;
  function question(session,key,values,wording){session.stage='question';session.unresolvedAttributes=[key];session.nextQuestion={key,question:wording||labels[key]||'What type?',options:values.map(value=>({value,label:choiceLabel(key,value)}))};return session;}
  function refresh(session){
    session.currentReference=null;session.resolvedFood=null;session.nextQuestion=null;session.unresolvedAttributes=[];session.alternatives=[];
    const c=DATA.concepts[session.conceptId];if(!c){session.stage='unsupported';session.reason='This food has no reviewed generic mapping yet.';return session;}
    if(session.conflicts.length){session.stage='unsupported';session.reason=`The supplied ${session.conflicts.join(', ')} facts conflict. Change the description before continuing.`;return session;}
    // Ordinary egg nutrition is a disclosed source assumption. Enriched-only
    // states must not appear as ordinary preparation choices before selection.
    const facts=session.facts,all=referenceRecords(c,session.records).filter(({mapping})=>!c.recognisedSpecies||facts.enrichment||mapping.attributes.enrichment==='Ordinary');
    if(c.recognisedSpecies&&!facts.species)return question(session,'species',c.recognisedSpecies);
    session.candidates=all.filter(({mapping})=>supported(mapping,facts));
    // A limitation always offers a deliberate, labelled change to a real
    // supported state. Recognition never grants numerical equivalence.
    if(!session.candidates.length){
      session.stage=facts.form==='mashed'||facts.additions==='custom'?'preparation-required':'unsupported';
      session.reason=facts.seasoningWater?'Seasoning retention is unknown.':facts.species&&facts.species!=='Chicken'?'This egg species has no reviewed nutrition here. Chicken nutrition has not been substituted.':'No reviewed nutrition matches these details. Oil, ingredients and cooking changes cannot be guessed.';
      if(session.stage==='preparation-required')session.reason+=' The Stage 2 preparation calculator is not available yet.';
      const keys=Object.keys(facts).filter(key=>!ignored.includes(key));
      const relaxed=all.filter(({mapping})=>supported(mapping,Object.fromEntries(Object.entries(facts).filter(([key])=>!['preparation','cookingState','form','additions','species'].includes(key)))));
      session.alternatives=relaxed.slice(0,6).map(({mapping})=>({value:mapping.key,label:`Choose ${DATA.displayName(c,mapping)}`,changes:keys.filter(key=>!supported(mapping,{[key]:facts[key]}))}));
      return session;
    }
    if(c.recognisedSpecies&&facts.preparation==='boiled'&&facts.boilExtent==='unspecified'&&facts.enrichment!=='Omega-3')return question(session,'preparation',['hard-boiled'],'How was it boiled? (Soft-boiled nutrition is not available yet.)');
    // Questions use distinct data attributes, never a page of database rows.
    for(const key of ['meat','preparation','variety','skin','cut','trim','fat','form','additions']){
      if(facts[key])continue;
      const values=[...new Set(session.candidates.map(({mapping})=>mapping.attributes[key]).filter(Boolean))];
      if(values.length>1)return question(session,key,values);
    }
    const selected=session.candidates.find(({mapping})=>mapping.key===session.approvedReference);
    const first=session.candidates[0];if(!first){session.stage='unsupported';session.reason='No compatible ordinary reference is available.';return session;}
    if(!selected&&(first.mapping.requiresApproval||session.candidates.length>1||facts.seasoningWater||session.equivalence)){
      session.stage='question';session.nextQuestion={key:'reference',question:session.equivalence?'Use this generic estimate?':'Does this match your food?',options:session.candidates.map(({mapping,food})=>({value:mapping.key,label:DATA.displayName(c,mapping)+(mapping.attributes.additions==='milk'?' — with regular-fat milk':/no (?:added )?fat/.test(DATA.norm(mapping.expectedName))?' — no added fat':''),sourceId:mapping.key,derivation:food.derivation||'Not recorded'}))};session.unresolvedAttributes=['reference'];return session;
    }
    const {mapping,food}=selected||first;session.currentReference=clone(mapping);session.stage='resolved';session.reason='';session.approvedFacts={...mapping.attributes,quantityWeightState:mapping.quantityWeightState};
    const displayName=DATA.displayName(c,mapping)+(session.equivalence?' (generic estimate)':''),measureEvidence=(global.HECGenericFoodMeasures||(typeof require==='function'?require('./generic-food-measures.js'):null))?.references?.[mapping.key]||[];
    session.resolvedFood={...clone(food),displayName,canonicalName:food.name,physicalForm:c.physicalForm,physicalFormSource:'reviewed-generic-catalogue',genericMeasurePolicy:{allowed:[...mapping.measures,...measureEvidence.map(m=>m.key)],evidence:clone(measureEvidence)},genericResolution:{version:DATA.version,conceptId:c.id,originalQuery:session.originalQuery,displayName,canonicalName:food.name,userFacts:clone(facts),factProvenance:clone(session.factProvenance),approvedFacts:clone(session.approvedFacts),referenceKey:mapping.key,referenceName:food.name,nutritionReferenceState:mapping.nutritionReferenceState,quantityWeightState:mapping.quantityWeightState,includedIngredients:[...mapping.includedIngredients],assumptions:mapping.assumptions,uncertainty:mapping.uncertainty,seasoningWater:!!facts.seasoningWater,equivalence:clone(session.equivalence||null),provenance:{...mapping.provenance,derivation:food.derivation||'Not recorded'},mode:session.equivalence?'generic-estimate':'published-reference'}};
    // Preserve unknown seasoning contributions rather than claiming the source
    // sodium is an exact total for salted cooking water.
    if(session.equivalence){session.resolvedFood.verified=false;session.resolvedFood.source='Generic estimate · '+food.source;}
    if(facts.seasoningWater){session.resolvedFood.nutrients.sodium=null;session.resolvedFood.genericResolution.uncertainty+=' Sodium and retained seasoning are unknown; unseasoned reference used for other nutrients.';}
    return session;
  }
  function createSession(records,input,options={}){
    const request=typeof input==='string'?{foodText:input}:input||{},query=request.foodText||request.originalQuery||'',intent=options.intent||DATA.parse(query,{quantity:options.quantity,sourceIntent:request.sourceContext?.entity?request.sourceContext:null});
    const supplied={...factsFor(intent)},known={...(request.knownAttributes||{}),...(options.knownAttributes||{})},conflicts=[...(intent?.conflicts||[])];
    for(const [key,value] of Object.entries(known)){if(supplied[key]&&supplied[key]!==value)conflicts.push(key);else supplied[key]=value;}
    const quantity=request.amount!=null?{amount:request.amount,measure:request.measure||request.unit||'',explicit:true}:options.quantity||intent?.quantity||null;
    const session={owner:'generic-v2',version:DATA.version,originalQuery:query,rawQuery:query,conceptId:intent?.conceptId||'',facts:supplied,known:supplied,initialFacts:clone(supplied),factProvenance:Object.fromEntries(Object.keys(supplied).map(key=>[key,known[key]?'adapter-input':'query'])),conflicts,sourceContext:request.sourceContext||intent?.sourceContext||'',quantity:clone(quantity),equivalence:clone(request.equivalence||null),destination:clone(request.destination||options.destination||null),records,history:[],approvedReference:'',approvedFacts:{},currentReference:null,resolvedFood:null,candidates:[],unresolvedAttributes:[],nextQuestion:null,stage:'question',reason:'',measure:null,amount:null,revision:0};return refresh(session);
  }
  function invalidate(session){session.currentReference=null;session.resolvedFood=null;session.approvedReference='';session.approvedFacts={};session.measure=null;session.amount=null;session.guided=null;session.revision++;}
  function answer(session,key,value){
    const q=session.nextQuestion;if(!q||q.key!==key||!q.options.some(option=>option.value===value))return session;
    session.history.push({facts:clone(session.facts),factProvenance:clone(session.factProvenance),approvedReference:session.approvedReference,key,value});invalidate(session);
    if(key==='reference')session.approvedReference=value;
    else {session.facts[key]=value;session.factProvenance[key]='user-answer';if(key==='preparation'){session.facts.cookingState=value==='raw'?'raw':value.startsWith('ready-to-')?'as-consumed':'cooked';delete session.facts.boilExtent;if(value==='scrambled')session.facts.form='scrambled';}}
    return refresh(session);
  }
  function back(session){const previous=session.history.pop();invalidate(session);if(previous){session.facts=previous.facts;session.known=session.facts;session.factProvenance=previous.factProvenance;session.approvedReference=previous.approvedReference;}return refresh(session);}
  function changeFacts(session,updates){
    if(Object.entries(updates).some(([key,value])=>['form','cookingState','preparation','part','skin','quantityWeightState','species'].includes(key)&&value!==session.facts[key]))session.quantity=null;
    invalidate(session);for(const [key,value] of Object.entries(updates)){if(value==null)delete session.facts[key];else session.facts[key]=value;session.factProvenance[key]='user-change';}if(updates.preparation)session.facts.cookingState=updates.preparation==='raw'?'raw':updates.preparation.startsWith('ready-to-')?'as-consumed':'cooked';session.conflicts=[];return refresh(session);
  }
  function chooseAlternative(session,key){const choice=session.alternatives.find(item=>item.value===key);if(!choice)return session;const m=DATA.concepts[session.conceptId].references.find(row=>row.key===key);session.history.push({facts:clone(session.facts),factProvenance:clone(session.factProvenance),approvedReference:session.approvedReference});session.quantity=null;invalidate(session);session.facts={...m.attributes};session.factProvenance=Object.fromEntries(Object.keys(session.facts).map(key=>[key,'explicit-alternative']));return refresh(session);}
  function handoff(session,guided){
    if(session.stage!=='resolved'||!session.resolvedFood)return null;
    const q=session.quantity,explicit=q?.explicit||q?.quantityExplicit,amount=q?.amount??q?.consumedQuantity,measure=q?.measure||q?.consumedUnit||'';
    const evidence=session.resolvedFood.genericMeasurePolicy.evidence,size=session.facts.size;
    const sized=evidence.find(item=>item.key===size||item.sizeAliases?.includes(size))?.key||(session.resolvedFood.genericMeasurePolicy.allowed.includes(size)?size:'');
    const requested=/^(?:g|kg|ml|l)$/i.test(measure)?measure:sized||measure;
    const hasMeasure=!!requested;
    const next=guided.createSession([session.resolvedFood],session.originalQuery,{intent:{kind:'exact-product',product:{id:session.resolvedFood.id,name:session.resolvedFood.name}},destination:session.destination,consumption:{identityQuery:session.resolvedFood.name,amount:explicit&&hasMeasure?amount:null,measure:explicit&&hasMeasure?requested:'',explicit:!!explicit&&hasMeasure}});
    if(explicit&&!hasMeasure)next.pendingGenericCount=amount;
    next.genericOwner='generic-v2';session.guided=next;return next;
  }
  function shortlist(records,intent){
    const c=DATA.concepts[intent.conceptId],facts=factsFor(intent),label=[facts.form==='mashed'?'Mashed':facts.preparation&&facts.preparation!=='raw'?DATA.methods[facts.preparation]:'',facts.variety,c.label].filter(Boolean).join(' ');
    const groups=[{key:'generic',label:'Generic food',items:[{kind:'generic-concept',conceptKey:c.id,name:label,owner:'generic-v2',sourcePlan:{choices:[],explicitSource:intent.sourceContext||'',owner:'generic-v2'}}]}];
    if(!facts.preparation&&!facts.form){const methods=c.capabilities.filter(value=>!['raw','ready-to-eat','ready-to-drink'].includes(value)).slice(0,3);if(methods.length)groups.push({key:'preparations',label:'Ways to prepare it',items:methods.map(value=>({kind:'generic-preparation',conceptKey:c.id,preparation:value,name:`${DATA.methods[value]} ${c.label}`}))});}
    return {rawQuery:intent.rawQuery,identityQuery:intent.identityQuery,conceptIntent:intent,concept:{key:c.id,label:c.label},groups,total:groups.reduce((n,g)=>n+g.items.length,0)};
  }
  // Commercial fallback requires both a recognised source request and absence
  // of a trustworthy exact matching product. It only proposes a user choice.
  function genericEquivalent(records,query,sourceIntent,isUsable){
    const entity=sourceIntent?.entity;if(!entity||!['retailer','brand'].includes(entity.type))return null;
    const withoutSource=sourceIntent.productQuery||DATA.norm(query).replace(new RegExp('\\b'+DATA.norm(entity.name)+'\\b'),' ').trim(),intent=DATA.parse(withoutSource);
    const c=DATA.concepts[intent?.conceptId];if(!c?.fallback)return null;
    if(records.some(food=>isUsable(food)))return null;
    return {label:`Try a Similar Generic ${[intent.known.meat,c.label].filter(Boolean).join(' ')}`,intent,foodText:withoutSource,equivalence:{requestedIdentity:String(query),requestedSource:entity.name,kind:'user-selected-generic-estimate',limitation:'A generic estimate can differ in meat content, fat, fillers and preparation. It is not verified nutrition for the requested product.'}};
  }
  const api={createSession,refresh,answer,back,changeFacts,chooseAlternative,handoff,matchFood,referenceRecords,shortlist,supported,genericEquivalent};global.HECGenericFoodResolution=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
