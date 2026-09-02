/* Healthy Eating Companion — KFC Australia Founder-Trial catalogue 0.6.33.
   Uses the reusable restaurant-source schema and shared serving semantics.
   No image, marketing copy, inferred macro or configurable-meal estimate is
   stored here.
*/
(function(global){
  'use strict';

  const registry=global.HECFoodSources||(typeof require==='function'?require('./food-sources.js'):null);
  const raw=global.HECKFCAustraliaRawCatalogueData||(typeof require==='function'?require('./kfc-au-catalogue-data.js'):null);
  if(!registry||!raw)throw new Error('KFC Australia catalogue dependencies were not loaded');

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
  const registered=registry.registerCatalogue(catalogue);
  global.HECKFCAustraliaCatalogue=registered;if(typeof module!=='undefined'&&module.exports)module.exports=registered;
})(typeof window!=='undefined'?window:globalThis);
