/* One generic identity/session owner. No nutrient aggregation or persistence. */
(function(global){
  'use strict';
  const DATA=global.HECGenericFoodCatalogue||(typeof require==='function'?require('./generic-food-catalogue.js'):null),clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const supported=(mapping,facts)=>Object.entries(facts).every(([key,value])=>{
    if(!value||['quantityWeightState','physicalForm'].includes(key))return key!=='quantityWeightState'||value===mapping.quantityWeightState;
    if(key==='additions')return value==='none'?!mapping.attributes.additions:value===mapping.attributes.additions;
    return mapping.attributes[key]===value;
  });
  function referenceRecords(concept,records){return concept.references.flatMap(mapping=>{
    const food=records.find(food=>(food.afcd||food.recordType==='afcd')&&food.afcdKey===mapping.key&&food.name===mapping.expectedName&&Number(food.units?.g)===.01&&/100\s*g/i.test(food.serving||''));
    return food?[{mapping,food}]:[];
  });}
  function factsFor(intent){return intent?.attributes||intent?.known||{};}
  function matchFood(food,intent){
    const concept=DATA.concepts[typeof intent==='string'?intent:intent?.conceptId],facts=typeof intent==='string'?{}:factsFor(intent);
    const identity=DATA.identity(food),reference=concept?.references.find(item=>item.key===food?.afcdKey&&item.expectedName===food?.name);
    const compatible=!!reference&&supported(reference,facts);
    return {candidateConceptId:identity?.conceptId||'',compatible,relationship:compatible?'applicable-reference':identity?.conceptId===concept?.id?'different-state-or-unreviewed-reference':'different-concept',evidence:reference?'reviewed-source-mapping':'no-reviewed-mapping',confidence:reference?'high':'unknown',conflicts:reference?Object.keys(facts).filter(key=>!supported(reference,{[key]:facts[key]})):[]};
  }
  function refresh(session){
    session.currentReference=null;session.resolvedFood=null;session.nextQuestion=null;session.unresolvedAttributes=[];
    const c=DATA.concepts[session.conceptId];if(!c){session.stage='unsupported';session.reason='This food is outside the Stage 1 generic catalogue.';return session;}
    if(session.conflicts.length){session.stage='unsupported';session.reason=`The supplied ${session.conflicts.join(', ')} facts conflict. Change the food description before continuing.`;return session;}
    const facts=session.facts;
    session.candidates=referenceRecords(c,session.records).filter(({mapping})=>supported(mapping,facts));
    if(facts.form==='mashed'||facts.additions==='custom'){
      session.stage='preparation-required';session.reason='This preparation needs cooked ingredient quantities, additions and a final batch or portion basis. The Stage 2 preparation calculator is not available yet.';return session;
    }
    if(!session.candidates.length){session.stage='unsupported';session.reason='No reviewed reference matches this form, preparation and edible state. Change the description or choose another food; nutrition has not been assumed.';return session;}
    const methods=[...new Set(session.candidates.map(({mapping})=>mapping.attributes.preparation))];
    if(!facts.preparation&&methods.length>1&&!(facts.cookingState==='cooked'&&methods.length===1)){
      // Each option represents a supported state, not an obligatory static facet.
      session.nextQuestion={key:'preparation',question:facts.cookingState==='cooked'?'How was it cooked?':'Which preparation did you have?',options:methods.map(value=>({value,label:({raw:'Raw / uncooked',boiled:'Boiled',baked:'Baked — no added fat',scrambled:'Scrambled'})[value]||value}))};
      if(c.capabilities.includes('mash'))session.nextQuestion.options.push({value:'mashed',label:'Mashed / puréed — preparation needed'});
      session.unresolvedAttributes=['preparation'];session.stage='question';return session;
    }
    // A reference choice explicitly approves its full scope, including variety,
    // peel and additions. No candidate-frequency default or guessed Typical.
    const selected=session.candidates.find(({mapping})=>mapping.key===session.approvedReference);
    if(!selected){
      session.stage='question';session.nextQuestion={key:'reference',question:'Which reference matches your food?',options:session.candidates.map(({mapping,food})=>({value:mapping.key,label:mapping.assumptions,sourceId:mapping.key,derivation:food.derivation||'Not recorded'}))};
      if(c.typicalPolicy){const typical=session.candidates.find(({mapping})=>mapping.key===c.typicalPolicy.reference);if(typical)session.nextQuestion.options.push({value:'__typical__',label:`Typical / Not sure — ${c.typicalPolicy.assumptions}`});}
      session.nextQuestion.options.push({value:'__custom__',label:'Different preparation / additions'});session.unresolvedAttributes=['reference'];return session;
    }
    const {mapping,food}=selected;session.currentReference=clone(mapping);session.stage='resolved';session.reason='';
    session.approvedFacts={...mapping.attributes,quantityWeightState:mapping.quantityWeightState};
    session.resolvedFood={...clone(food),physicalForm:c.physicalForm,physicalFormSource:'reviewed-generic-catalogue',genericMeasurePolicy:{allowed:[...mapping.measures]},genericResolution:{version:DATA.version,conceptId:c.id,originalQuery:session.originalQuery,userFacts:clone(session.facts),factProvenance:clone(session.factProvenance),approvedFacts:clone(session.approvedFacts),referenceKey:mapping.key,referenceName:food.name,nutritionReferenceState:mapping.nutritionReferenceState,quantityWeightState:mapping.quantityWeightState,includedIngredients:[...mapping.includedIngredients],assumptions:mapping.assumptions,uncertainty:mapping.uncertainty,provenance:{...mapping.provenance,derivation:food.derivation||'Not recorded'},mode:'published-reference'}};
    return session;
  }
  function createSession(records,input,options={}){
    const request=typeof input==='string'?{foodText:input}:input||{},query=request.foodText||request.originalQuery||'',intent=options.intent||DATA.parse(query,{quantity:options.quantity,sourceIntent:request.sourceContext?.entity?request.sourceContext:null});
    const supplied={...factsFor(intent)},known={...(request.knownAttributes||{}),...(options.knownAttributes||{})},conflicts=[...(intent?.conflicts||[])];
    for(const [key,value] of Object.entries(known)){if(supplied[key]&&supplied[key]!==value)conflicts.push(key);else supplied[key]=value;}
    const quantity=request.amount!=null?{amount:request.amount,measure:request.measure||request.unit||'',explicit:true}:options.quantity||intent?.quantity||null;
    const session={owner:'generic-v2',version:DATA.version,originalQuery:query,rawQuery:query,conceptId:intent?.conceptId||'',facts:supplied,known:supplied,initialFacts:clone(supplied),factProvenance:Object.fromEntries(Object.keys(supplied).map(key=>[key,known[key]?'adapter-input':'query'])),conflicts,sourceContext:request.sourceContext||intent?.sourceContext||'',quantity:clone(quantity),destination:clone(request.destination||options.destination||null),records,history:[],approvedReference:'',approvedFacts:{},currentReference:null,resolvedFood:null,candidates:[],unresolvedAttributes:[],nextQuestion:null,stage:'question',reason:'',measure:null,amount:null,revision:0};
    return refresh(session);
  }
  function invalidate(session){session.currentReference=null;session.resolvedFood=null;session.approvedReference='';session.approvedFacts={};session.measure=null;session.amount=null;session.guided=null;session.revision++;}
  function answer(session,key,value){
    const q=session.nextQuestion;if(!q||q.key!==key||!q.options.some(option=>option.value===value))return session;
    session.history.push({facts:clone(session.facts),factProvenance:clone(session.factProvenance),approvedReference:session.approvedReference,key,value});invalidate(session);
    if(value==='__custom__'){session.facts.additions='custom';session.factProvenance.additions='user-answer';}
    else if(key==='reference'){session.approvedReference=value==='__typical__'?DATA.concepts[session.conceptId].typicalPolicy.reference:value;}
    else if(key==='preparation'){
      if(value==='mashed')session.facts.form='mashed';else {session.facts.preparation=value;session.facts.cookingState=value==='raw'?'raw':'cooked';if(value==='scrambled')session.facts.form='scrambled';}
      session.factProvenance[key]='user-answer';
    }
    return refresh(session);
  }
  function back(session){const previous=session.history.pop();invalidate(session);if(previous){session.facts=previous.facts;session.known=session.facts;session.factProvenance=previous.factProvenance;session.approvedReference=previous.approvedReference;}return refresh(session);}
  function changeFacts(session,updates){
    if(Object.entries(updates).some(([key,value])=>['form','cookingState','preparation','part','skin','quantityWeightState'].includes(key)&&value!==session.facts[key]))session.quantity=null;
    invalidate(session);for(const [key,value] of Object.entries(updates)){if(value==null)delete session.facts[key];else session.facts[key]=value;session.factProvenance[key]='user-change';}if(updates.preparation)session.facts.cookingState=updates.preparation==='raw'?'raw':'cooked';session.conflicts=[];return refresh(session);
  }
  function handoff(session,guided){
    if(session.stage!=='resolved'||!session.resolvedFood)return null;
    const q=session.quantity,explicit=q?.explicit||q?.quantityExplicit,amount=q?.amount??q?.consumedQuantity,measure=q?.measure||q?.consumedUnit||'';
    const next=guided.createSession([session.resolvedFood],session.originalQuery,{intent:{kind:'exact-product',product:{id:session.resolvedFood.id,name:session.resolvedFood.name}},destination:session.destination,consumption:{identityQuery:session.resolvedFood.name,amount:explicit?amount:null,measure:explicit?measure:'',explicit:!!explicit}});
    next.genericOwner='generic-v2';session.guided=next;return next;
  }
  function shortlist(records,intent){
    const c=DATA.concepts[intent.conceptId],facts=factsFor(intent),label=[facts.form==='mashed'?'Mashed':facts.preparation&&facts.preparation!=='raw'?facts.preparation[0].toUpperCase()+facts.preparation.slice(1):'',facts.variety,c.label].filter(Boolean).join(' ');
    const groups=[{key:'generic',label:'Generic food',items:[{kind:'generic-concept',conceptKey:c.id,name:label,owner:'generic-v2',sourcePlan:{choices:[],explicitSource:intent.sourceContext||'',owner:'generic-v2'}}]}];
    if(!facts.preparation&&!facts.form&&c.capabilities.includes('mash'))groups.push({key:'preparations',label:'Common preparations',items:['boiled','baked','mashed'].map(value=>({kind:'generic-preparation',conceptKey:c.id,preparation:value,name:`${value[0].toUpperCase()+value.slice(1)} ${c.label.toLowerCase()}`}))});
    const related=records.filter(food=>!food.afcd&&!['afcd','private','recipe'].includes(food.recordType)&&DATA.norm(food.name).includes(c.id)&&!DATA.identity(food)?.conceptId).slice(0,3).map(food=>({kind:'exact-product',recordId:food.id,name:food.name,food}));
    if(related.length)groups.push({key:'related',label:'Distinct products and containing foods',items:related});
    return {rawQuery:intent.rawQuery,identityQuery:intent.identityQuery,conceptIntent:intent,concept:{key:c.id,label:c.label},groups,total:groups.reduce((n,g)=>n+g.items.length,0)};
  }
  const api={createSession,refresh,answer,back,changeFacts,handoff,matchFood,referenceRecords,shortlist,supported};global.HECGenericFoodResolution=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
