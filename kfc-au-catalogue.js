/* Healthy Eating Companion — KFC Australia Founder-Trial catalogue 0.6.33.
   Uses the reusable restaurant-source schema and shared serving semantics.
   No image, marketing copy, inferred macro or configurable-meal estimate is
   stored here.
*/
(function(global){
  'use strict';

  const registry=global.HECFoodSources||(typeof require==='function'?require('./food-sources.js'):null);
  const raw=global.HECKFCAustraliaRawCatalogueData||(typeof require==='function'?require('./kfc-au-catalogue-data.js'):null);
  const supplement=global.HECKFCAustraliaSupplement||(typeof require==='function'?require('./kfc-au-supplement-data.js'):null);
  if(!registry||!raw||!supplement)throw new Error('KFC Australia catalogue dependencies were not loaded');

  const unique=values=>[...new Set((values||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  const cleanName=value=>String(value||'').replace(/[®™]/g,'').replace(/[’]/g,"'").replace(/\s+/g,' ').trim();
  const norm=value=>cleanName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const slug=value=>norm(value).replace(/\s+/g,'-');
  const calorieFromKj=value=>Math.round((Number(value)/4.184)*10)/10;
  const fixedCount=name=>{const value=Number(name.match(/^(\d+)\s+(?:pieces?\b|wicked wings?\b|original tenders?\b|nuggets?\b)/i)?.[1]||0);return value>1?value:0;};
  const sizeFor=name=>name.match(/^(Snack|Regular|Maxi|Large)\b/i)?.[1]||'';
  const component=name=>/\b(?:sauce|gravy|dipping sauces?)\b/i.test(name);
  const configurable=(name,memberships)=>raw.configurablePatterns.some(pattern=>pattern.test(name))||memberships.some(value=>['Boxed Meals','Shared Meals','Go Buckets & Kids Meals','Everyday Value'].includes(value))||name==='4 Dipping Sauces';
  const choiceFamily=name=>{
    if(/\bchips\b/i.test(name))return'chips';
    if(/popcorn chicken/i.test(name)&&!/combo/i.test(name))return'popcorn-chicken';
    if(/wicked wings/i.test(name)&&!/combo/i.test(name))return'wicked-wings';
    if(/wicked boneless/i.test(name)&&!/combo/i.test(name))return'wicked-boneless';
    if(/original tenders/i.test(name)&&!/combo|bowl/i.test(name))return'original-tenders';
    if(/pieces? of chicken/i.test(name))return'chicken-pieces';
    if(/^\d+ nuggets$/i.test(name))return'nuggets';
    return'';
  };
  const choiceOrder=name=>({Snack:1,Regular:2,Maxi:3,Small:1,Large:3}[sizeFor(name)]||fixedCount(name)||0);
  function servingFor(name,{count=0,size='',isConfigurable=false,isComponent=false}={}){
    if(isConfigurable)return {unitKey:'bundle',unitLabel:'Configuration Required',standardServingLabel:'Configuration required'};
    if(count)return {unitKey:'portion',unitLabel:`${count}-Piece Portion`,standardServingLabel:`${count} pieces`};
    if(isComponent)return {unitKey:'serve',unitLabel:'Component Serve',standardServingLabel:'1 component serve'};
    if(/burger/i.test(name))return {unitKey:'burger',unitLabel:'Burger',standardServingLabel:'1 burger'};
    if(/twister/i.test(name))return {unitKey:'wrap',unitLabel:'Twister',standardServingLabel:'1 Twister'};
    if(/bowl/i.test(name))return {unitKey:'bowl',unitLabel:'Bowl',standardServingLabel:'1 bowl'};
    if(/chips|popcorn chicken/i.test(name))return {unitKey:'portion',unitLabel:`${size||'Menu'} Portion`,standardServingLabel:`1 ${(size||'menu').toLowerCase()} portion`};
    if(/freeze|pepsi|max|7up|mountain dew|solo|sunkist|water|juice|ice tea/i.test(name))return {unitKey:'drink',unitLabel:size?`${size} Drink`:'Drink',standardServingLabel:`1 ${size?`${size.toLowerCase()} `:''}drink`};
    if(/fillet piece|piece of chicken/i.test(name))return {unitKey:'piece',unitLabel:'Piece',standardServingLabel:'1 piece'};
    return {unitKey:'item',unitLabel:'Menu Item',standardServingLabel:'1 menu item'};
  }
  function semanticsFor(name,{count=0,size='',isConfigurable=false,isComponent=false}={}){
    if(isConfigurable)return {type:'configurable-bundle',confidence:'high'};
    if(isComponent)return {type:'component',confidence:'high'};
    if(count)return {type:'counted-item',count,confidence:'high'};
    if(size)return {type:'sized-variant',size,confidence:'high'};
    return {type:'single-item',confidence:'high'};
  }
  function aliasesFor(name,officialName){
    const aliases=[name,officialName,`KFC ${name}`,`Kentucky Fried Chicken ${name}`,`Kentucky ${name}`];
    if(name==='Zinger Burger')aliases.push('Zinger','KFC Zinger','Kentucky Zinger');
    if(/\bBurger$/i.test(name))aliases.push(`${name}s`,`KFC ${name}s`);
    if(/\bpieces\b/i.test(name))aliases.push(name.replace(/\bPieces\b/i,'Piece'));
    if(/\bpiece\b/i.test(name))aliases.push(name.replace(/\bPiece\b/i,'Pieces'));
    if(/\b&\b/.test(name))aliases.push(name.replace(/\b&\b/g,'and'));
    return unique(aliases);
  }
  function provenanceFor(name,energyKnown){
    const page=raw.currentProductPages[name]||raw.menuUrl,current=raw.currentComponentEnergy[name];
    return {
      publisher:'KFC Australia',url:page,currentMenuReference:raw.menuUrl,supportingNutritionReference:energyKnown?raw.nutritionUrl:'',
      referenceType:current?'Official current Australian product/component page with older official guide corroboration':energyKnown?'Official current Australian menu identity with exact-name September 2023 energy corroboration':'Official current Australian menu identity only',
      tableBasis:energyKnown?'Official kJ per named fixed serving; kcal derived as kJ ÷ 4.184; macros unknown':'No usable fixed energy published in the reviewed sources'
    };
  }

  const byIdentity=new Map();
  for(const category of raw.categories)for(const officialName of category.items){
    const name=cleanName(officialName),key=norm(name),existing=byIdentity.get(key);
    if(existing){existing.categoryMemberships=unique([...existing.categoryMemberships,category.name]);existing.sourceOccurrences.push({category:category.name,officialName});continue;}
    byIdentity.set(key,{name,officialName,categoryMemberships:[category.name],sourceOccurrences:[{category:category.name,officialName}]});
  }
  const items=[...byIdentity.values()].map(row=>{
    const name=row.name,count=fixedCount(name),size=sizeFor(name),isConfigurable=configurable(name,row.categoryMemberships),isComponent=component(name),energyKj=raw.energyKj[name],energyKnown=Number.isFinite(Number(energyKj)),nutritionStatus=isConfigurable?'configurable':energyKnown?'energy-only':'identity-only',serving=servingFor(name,{count,size,isConfigurable,isComponent}),family=isConfigurable?'':choiceFamily(name),currentEnergy=raw.currentComponentEnergy[name],sourceConflict=raw.sourceConflicts[name]||null;
    const item={
      id:slug(name),name,officialName:row.officialName,aliases:aliasesFor(name,row.officialName),category:row.categoryMemberships[0],categoryMemberships:row.categoryMemberships,browseCategory:row.categoryMemberships[0],browseTags:unique([...row.categoryMemberships,name,...name.split(/\s+/)]),status:'current',itemKind:isConfigurable?'configurable-assembly':isComponent?'component':'product',
      productSemantics:semanticsFor(name,{count,size,isConfigurable,isComponent}),semanticCount:count,choiceFamily:family,choiceOrder:choiceOrder(name),nutritionStatus,loggable:energyKnown&&!isConfigurable,standardServingLabel:serving.standardServingLabel,serving:{unitKey:serving.unitKey,unitLabel:serving.unitLabel},servingWeightG:null,servingVolumeMl:null,nutritionPer100Unit:'',
      nutritionPerServing:energyKnown?{energyKj:Number(energyKj),calories:calorieFromKj(energyKj)}:{},nutritionPer100:{},provenance:provenanceFor(name,energyKnown),sourceLastCheckedDate:raw.checkedDate,lastSeenAt:raw.checkedAt,effectiveDate:raw.checkedDate,officialCurrentIdentity:true,
      energySource:energyKnown?{publisher:'KFC Australia',publishedEnergyKj:Number(energyKj),url:currentEnergy?.url||raw.nutritionUrl,basis:currentEnergy?'current-product-component':'exact-name-match-in-September-2023-official-guide'}:null,
      calorieSource:energyKnown?{method:'derived',formula:'published kJ / 4.184',precision:'one decimal place'}:null,
      nutritionFreshness:{identityCheckedAt:raw.checkedAt,nutritionPublishedLabel:energyKnown?raw.nutritionPublishedLabel:'not available',classification:currentEnergy?'current-component-corroborated':energyKnown?'older-exact-correspondence':'identity-only'},
      sourceConflict,sourceAnomalies:sourceConflict?[`Current official component page publishes ${sourceConflict.resolvedEnergyKj} kJ; the September 2023 guide publishes ${sourceConflict.olderEnergyKj} kJ. Current component value retained.`]:[],
      optionalExtras:(raw.productOptions[name]||[]).map(option=>{const known=option.energyKj!==null&&option.energyKj!==undefined&&option.energyKj!==''&&Number.isFinite(Number(option.energyKj));return {...option,calories:known?calorieFromKj(option.energyKj):null,calorieSource:known?'derived from official kJ':null,sourceUrl:raw.currentProductPages[name]||raw.menuUrl};}),
      promotional:row.categoryMemberships.includes('Featured Offers'),promotionalStatus:row.categoryMemberships.includes('Featured Offers')?'limited-time':'standard',limitedTime:row.categoryMemberships.includes('Featured Offers'),promotionExpiry:'',sourceOccurrences:row.sourceOccurrences,
      assemblyModel:isConfigurable?{type:'configurable-assembly',nutritionAggregation:'sum-selected-components',componentSlots:[{id:'main',label:'Selected main item(s)'},{id:'side',label:'Selected side/size'},{id:'drink',label:'Selected drink/size'}],implementationStatus:'future-configurator',sourceDescription:name}:null
    };
    if(isConfigurable)item.entryBlockedReason='This KFC meal has current product or size choices, so one fixed nutrition value would be unsafe. Choose components in a future configurator.';
    else if(!energyKnown)item.entryBlockedReason='KFC Australia confirms this current menu identity, but the reviewed official sources do not provide a usable fixed energy value. No estimate has been used.';
    return item;
  });

  // Supplement the same identities/registry. Never rewrite the protected raw
  // snapshot or merge a named order with an individual piece or chosen dip.
  const nutrientKeys=['energyKj','protein','fat','satFat','carbs','sugar','sodium'];
  const nutrients=values=>Object.fromEntries(values.flatMap((value,index)=>value===null||value===undefined?[]:[[nutrientKeys[index],Number(value)]]));
  const fact=(url,recordId,publishedDate=null)=>({sourceId:'kfc-au',recordId,url,trustClass:'official-au-restaurant',retrievedAt:supplement.checkedAt,verifiedAt:supplement.checkedDate,publishedDate,sourceType:'restaurant/fast food',market:'AU'});
  const evidenceFor=(item,url,publishedDate=null)=>{
    item.canonicalEvidence=[...(item.canonicalEvidence||[]),{source:{...fact(item.provenance.url,item.id),retrievedAt:item.lastSeenAt||raw.checkedAt,verifiedAt:item.sourceLastCheckedDate||raw.checkedDate},nutrients:{...item.nutritionPerServing},categoryMemberships:[...item.categoryMemberships],sourceOccurrences:item.sourceOccurrences}];
    item.sourceProvenance=fact(url,item.id,publishedDate);item.sourceLastCheckedDate=supplement.checkedDate;item.lastSeenAt=supplement.checkedAt;
    item.currentState='listed-at-retrieval';item.provenance={...item.provenance,url,publisher:'KFC Australia',tableBasis:'Published named serving; Calories derived from official kJ / 4.184. Unknown fields remain absent.'};
    item.nutritionFreshness={identityCheckedAt:supplement.checkedAt,nutritionPublishedLabel:publishedDate||supplement.guidePublishedLabel,classification:'reviewed-official-supplement'};
  };
  const addItem=(name,categories,unit,url,{size='',family='',component=false,promotional=false}={})=>{
    if(items.some(item=>item.id===slug(name)))throw new Error('Duplicate supplemental KFC identity '+name);
    const item={id:slug(name),name,officialName:name,aliases:aliasesFor(name,name),category:categories[0],categoryMemberships:categories,browseCategory:categories[0],browseTags:unique([...categories,name]),status:'current',currentState:'listed-at-retrieval',itemKind:component?'component':'product',productSemantics:{type:component?'component':size?'sized-variant':'single-item',...(size?{size}:{}),confidence:'high'},semanticCount:0,choiceFamily:family,choiceOrder:size==='Large'?3:0,nutritionStatus:'identity-only',loggable:false,standardServingLabel:`1 ${size?size.toLowerCase()+' ':''}${unit}`,serving:{unitKey:unit,unitLabel:size?`${size} ${unit}`:unit[0].toUpperCase()+unit.slice(1)},servingWeightG:null,servingVolumeMl:null,nutritionPer100Unit:'',nutritionPerServing:{},nutritionPer100:{},provenance:{publisher:'KFC Australia',url},officialCurrentIdentity:true,sourceOccurrences:categories.map(category=>({category,officialName:name,sourceUrl:url})),promotional,limitedTime:promotional,promotionalStatus:promotional?'limited-time':'standard',optionalExtras:[],sourceAnomalies:[]};
    evidenceFor(item,url);items.push(item);return item;
  };
  for(const [name,categories,unit] of supplement.newMenuRows)addItem(name,categories,unit,supplement.menuUrl,{component:/Sauce$/.test(name),promotional:true});
  for(const row of supplement.newComponents){
    const item=addItem(row.name,[row.category],row.unit,row.url,{size:row.size,family:row.family,component:row.unit==='serve'});
    item.nutritionPerServing={energyKj:row.energyKj,calories:calorieFromKj(row.energyKj)};item.nutritionStatus='energy-only';item.loggable=true;item.energySource={publishedEnergyKj:row.energyKj,url:row.url,basis:'current-product-component'};item.calorieSource={method:'derived',formula:'published kJ / 4.184'};
    if(row.family){const regular=items.find(value=>value.name===row.name.replace(/^Large /,'Regular '));if(regular){regular.choiceFamily=row.family;regular.choiceOrder=2;}}
  }
  for(const [name,serve,per100] of supplement.nutritionRows){
    const item=items.find(value=>value.name===name);if(!item)throw new Error('Unknown KFC nutrition identity '+name);
    if(item.nutritionPerServing.energyKj!==undefined&&item.nutritionPerServing.energyKj!==serve[1])throw new Error('Unreviewed KFC energy conflict '+name);
    evidenceFor(item,supplement.guide);item.nutritionPerServing={...nutrients(serve.slice(1)),calories:calorieFromKj(serve[1])};item.nutritionPer100=nutrients(per100);item.servingWeightG=serve[0];item.nutritionPer100Unit='g';item.nutritionStatus='complete';item.loggable=true;
    item.energySource={publisher:'KFC Australia',publishedEnergyKj:serve[1],url:supplement.guide,basis:'named-serving-in-reviewed-official-nutrition-dialog'};item.calorieSource={method:'derived',formula:'published kJ / 4.184',precision:'one decimal place'};
  }
  for(const [name,weight,serve,per100,ambiguousSodium,unit] of supplement.individualRows){
    const item=addItem(name,['Chicken'],unit,supplement.individual);evidenceFor(item,supplement.individual,supplement.individualPublishedDate);
    item.nutritionPerServing={...nutrients(serve),calories:calorieFromKj(serve[0])};item.nutritionPer100=nutrients(per100);item.servingWeightG=weight;item.nutritionPer100Unit='g';item.nutritionStatus='partial';item.loggable=true;
    item.standardServingLabel=`1 ${unit} (${weight} g), plain`;item.serving.unitLabel=`${unit[0].toUpperCase()+unit.slice(1)} (${weight} g)`;
    item.sourceAnomalies=['Individual table sodium header says g/serve and g/100g. Sodium is excluded pending unit clarification.'];
    item.canonicalEvidence.push({source:fact(supplement.individual,item.id,supplement.individualPublishedDate),unresolvedSodium:{header:['g/serve','g/100g'],values:ambiguousSodium}});
    item.energySource={publishedEnergyKj:serve[0],url:supplement.individual,basis:'published-individual-piece'};item.calorieSource={method:'derived',formula:'published kJ / 4.184'};
  }
  for(const [name,order] of Object.entries(supplement.standardOrders)){
    if(items.find(value=>value.name===name)?.nutritionPerServing.energyKj!==order.energyKj)throw new Error('Unreviewed KFC standard-order energy '+name);
    const item=items.find(value=>value.name===name);evidenceFor(item,order.url);item.productSemantics={...item.productSemantics,individualScaling:false,standardOrderLabel:order.label};item.standardServingLabel=`1 order: ${order.label}`;item.provenance.tableBasis=`Published standard order only: ${order.label}. Do not divide into plain pieces or substitute dips.`;
  }
  for(const row of supplement.findings.blockedOrders){
    const item=items.find(value=>value.name===row.name);evidenceFor(item,row.url);item.loggable=false;item.nutritionStatus='conflict';item.productSemantics={...item.productSemantics,individualScaling:false};item.entryBlockedReason=row.reason+' Choose a plain nugget and log the selected dip separately.';
    item.evidenceConflicts=[{code:'order-dip-configuration-conflict',field:'nutrition',severity:'material',resolution:'unresolved',evidence:row}];
  }
  for(const item of items){
    if(supplement.uncertainPromotions.includes(item.name)){item.currentState='uncertain';item.nutritionFreshness={...item.nutritionFreshness,menuFreshness:'Conflicting official menu surfaces; retained without asserting discontinuation.'};}
    if(/^(?:1 Piece|\d+ Pieces) of Chicken$/.test(item.name)){item.choiceFamilyAliases=['original recipe','original recipe chicken'];item.aliases=unique([...item.aliases,`KFC ${item.name.replace(/of Chicken/,'Original Recipe Chicken')}`,'KFC Original Recipe Chicken','KFC Original Recipe']);}
  }
  const categorySurfaces=raw.categories.map(category=>({name:category.name,url:raw.menuUrl,count:category.items.length}));
  const catalogue={
    source:{
      id:'kfc-au',displayName:'KFC Australia',sourceType:'restaurant/fast food',country:'Australia',market:'AU',aliases:['KFC','KFC Australia','Kentucky Fried Chicken','Kentucky'],officialUrl:raw.menuUrl,
      referenceUrls:[raw.menuUrl,raw.nutritionUrl,...Object.values(raw.currentProductPages)],referenceMetadata:{publisher:'KFC Australia',identityBasis:'Official live Australian menu and reviewed product pages',nutritionBasis:'Current product/component pages where available; otherwise exact-name energy corroboration only from the official page labelled September 2023',retrievalMethod:'Founder-Trial manual review of public official KFC Australia pages',sourceCaptures:raw.sourceCaptures,normalisedSnapshotSha256:raw.normalisedSnapshotSha256,termsCheckedDate:raw.checkedDate},
      usageScope:'development/founder-trial',licenceStatus:'no-affirmative-production-catalogue-reuse-licence-granted',productionApproved:false,licensingInheritedByItems:true,lastCheckedDate:raw.checkedDate,catalogueVersion:`kfc-au-${raw.checkedDate}-founder-trial.1`,catalogueCheckedAt:raw.checkedAt,effectiveDate:raw.checkedDate,
      inventory:{menuRows:raw.categories.reduce((sum,category)=>sum+category.items.length,0),uniqueProducts:items.length,energyOnlyProducts:items.filter(item=>item.nutritionStatus==='energy-only').length,identityOnlyProducts:items.filter(item=>item.nutritionStatus==='identity-only').length,configurableProducts:items.filter(item=>item.nutritionStatus==='configurable').length,sourceConflicts:items.filter(item=>item.sourceConflict).length,limitedTimeProducts:items.filter(item=>item.limitedTime).length,browseCategories:raw.categories.map(category=>category.name),categorySurfaces},
      refreshPolicy:{cadence:'proposed-weekly-manual-review',schedulerIncluded:false,retainLastApprovedOnFailure:true,humanApprovalRequired:true,retireMissingItems:true,neverInferMissingNutrition:true,auditFields:['retrievedAt','sourceUrls','normalisedSnapshotSha256','diff','validation','humanApproval']}
    },items
  };
  catalogue.source.lastCheckedDate=supplement.checkedDate;catalogue.source.catalogueCheckedAt=supplement.checkedAt;catalogue.source.catalogueVersion='kfc-au-2026-09-11-founder-trial.2';
  catalogue.source.referenceUrls=unique([...catalogue.source.referenceUrls,supplement.guide,supplement.individual,supplement.menuUrl,...supplement.newComponents.map(row=>row.url),...Object.values(supplement.standardOrders).map(row=>row.url)]);
  catalogue.source.referenceMetadata.supplement={checkedAt:supplement.checkedAt,guidePublishedLabel:supplement.guidePublishedLabel,individualPublishedDate:supplement.individualPublishedDate,recordCounts:{nutritionDialogs:supplement.nutritionRows.length,individualRows:supplement.individualRows.length,components:supplement.newComponents.length},findings:supplement.findings};
  Object.assign(catalogue.source.inventory,{protectedUniqueProducts:126,duplicateMenuAppearances:18,completeProducts:items.filter(item=>item.nutritionStatus==='complete').length,partialProducts:items.filter(item=>item.nutritionStatus==='partial').length,conflictProducts:items.filter(item=>item.nutritionStatus==='conflict').length,supplementalProducts:items.length-126});
  const registered=registry.registerCatalogue(catalogue);
  global.HECKFCAustraliaCatalogue=registered;if(typeof module!=='undefined'&&module.exports)module.exports=registered;
})(typeof window!=='undefined'?window:globalThis);
