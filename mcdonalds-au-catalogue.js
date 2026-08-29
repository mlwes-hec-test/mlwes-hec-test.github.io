/* Healthy Eating Companion — McDonald's Australia Founder-Trial catalogue 0.6.33
   Current official Australian menu facts transformed from the reviewed source
   checkpoint in mcdonalds-au-catalogue-data.js. Published anomalies are retained
   and disclosed; missing values are never inferred or zero-filled.
*/
(function(global){
  'use strict';

  const registry=global.HECFoodSources||(typeof require==='function'?require('./food-sources.js'):null);
  const raw=global.HECMcDonaldsAustraliaRawCatalogueData||(typeof require==='function'?require('./mcdonalds-au-catalogue-data.js'):null);
  if(!registry||!raw)throw new Error("McDonald's Australia catalogue dependencies were not loaded");

  const BASE='https://www.mcdonalds.com/au/en-au/menu/';
  const CORE_MENU_PDF='https://www.mcdonalds.com/content/dam/sites/au/nfl/nutrition/PDFs/Aus%20Core%20Food%20Menu_January%202026.pdf';
  const NUTRIENTS=['energyKj','calories','protein','fat','satFat','carbs','sugar','sodium'];
  const BUNDLES=new Set(['The Big Breakfast Deal',"Macca's® Mega Meal",'Macca’s® Bundle for 2','Macca’s® Bundle for 4','Macca’s® Bundle for 6','McSmart® Saver','McSmart® Meal','McSmart® Plus']);
  const LIMITED_PATHS=new Set(['beef/cheesy-quarter-pounder.html','beef/cheesy-double-quarter-pounder.html','chicken-fish/cheesy-mccrispy.html','sides/mozzarella-sticks.html','value-bundle-meals/maccas-mega-meal.html']);
  const LEGACY_IDS=Object.freeze({
    'breakfast/hotcakes-butter-and-syrup.html':'hotcakes-butter-syrup',
    'desserts/oreo-cookie-mcflurry.html':'oreo-cookies-mcflurry',
    'desserts/hot-fudge-sundae-small.html':'hot-fudge-sundae'
  });
  const PUBLISHED_ANOMALIES=Object.freeze({
    'breakfast/double-bacon-egg-mcmuffin.html':['Official page publishes 1370 kJ and 518 Cal per serve; values retained without correction.'],
    'breakfast/double-sausage-mcmuffin.html':['Official page publishes 1880 kJ and 577 Cal per serve; values retained without correction.'],
    'breakfast/double-sausage-egg-mcmuffin.html':['Official page publishes 2180 kJ and 714 Cal per serve; values retained without correction.'],
    'condiments/ranch-sauce.html':['Official page publishes 553 kJ and 0 Cal per serve, and 2210 kJ and 0 Cal per 100 g; values retained without correction.'],
    'mccafe-drinks/iced-chai-latte-medium.html':['Official size selector links labelled Small and Large resolve to Iced Latte pages, while the current Iced Chai page has no complete nutrition table. No size nutrition was inferred.'],
    'cold-and-frozen-drinks/frozen-fanta-raspberry-medium.html':['Official page publishes total carbohydrate below published sugars; values retained without correction.']
  });

  const unique=values=>[...new Set((values||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  const cleanName=value=>String(value||'').replace(/[®™]/g,'').replace(/\s*\(I\)\s*$/,'').replace(/\s+/g,' ').trim();
  const slug=value=>cleanName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const pathSlug=path=>String(path||'').split('/').pop().replace(/\.html$/,'');
  const nutrients=values=>values?Object.fromEntries(NUTRIENTS.map((key,index)=>[key,values[index]])):{};
  const isMcCafe=family=>family.c.includes('McCafé® Drinks');
  const variantsByFamily=new Map();
  for(const variant of raw.variants){const list=variantsByFamily.get(variant.f)||[];list.push(variant);variantsByFamily.set(variant.f,list);}

  function familyId(family){
    if(LEGACY_IDS[family.u])return LEGACY_IDS[family.u];
    let value=pathSlug(family.u);
    if(isMcCafe(family))value=value.replace(/-(small|medium|large)$/,'');
    return value||slug(family.n);
  }
  function primaryCategory(family){
    const section=family.u.split('/')[0];
    return ({breakfast:'Breakfast',beef:'Burgers','chicken-fish':'Chicken & Fish',sides:'Sides','happy-meal':'Happy Meal',desserts:'Desserts','mccafe-drinks':'McCafé Drinks','mccafe-food':'McCafé Food','cold-and-frozen-drinks':'Drinks','shakes-frappes':'Shakes & Frappes',condiments:'Condiments','value-bundle-meals':'Bundle Meals'})[section]||cleanName(family.c[0]||'Menu');
  }
  const BROWSE_CATEGORIES=Object.freeze(['Meals & Bundles','Breakfast','Burgers','Chicken & Nuggets','Wraps','Sides & Fries','Cold Drinks','McCafé / Hot Drinks','Desserts & Treats','Sauces','Other']);
  function browseCategory(family,name,category){
    const text=`${name} ${(family.c||[]).join(' ')} ${category}`.toLowerCase();
    if(category==='Bundle Meals')return 'Meals & Bundles';
    if(category==='Breakfast')return 'Breakfast';
    if(category==='Burgers')return 'Burgers';
    if(category==='Chicken & Fish')return /wrap/.test(text)?'Wraps':'Chicken & Nuggets';
    if(category==='Sides')return 'Sides & Fries';
    if(category==='Happy Meal')return /\b(?:drink|milk|juice|water|cold & frozen)\b/.test(text)?'Cold Drinks':'Sides & Fries';
    if(category==='Condiments')return 'Sauces';
    if(category==='Drinks'||category==='Shakes & Frappes')return 'Cold Drinks';
    if(category==='McCafé Drinks')return /\b(?:iced|frozen|frappe|frappé|shake|smoothie|cooler)\b/.test(text)?'Cold Drinks':'McCafé / Hot Drinks';
    if(category==='Desserts')return 'Desserts & Treats';
    if(category==='McCafé Food')return /\b(?:muffin|banana bread)\b/.test(text)?'Desserts & Treats':'Other';
    return 'Other';
  }
  function browseTags(family,name,category){return unique([category,...(family.c||[]).map(cleanName),...name.toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>2)]);}
  function displayName(family){
    const name=cleanName(family.n),path=pathSlug(family.u);
    if(family.u==='sides/small-fries.html')return 'Small Fries';
    if(!isMcCafe(family)&&/(?:^|-)medium(?:\.|-|$)/.test(path)&&!/^Medium\b/i.test(name))return `Medium ${name}`;
    return name;
  }
  function naturalServing(name,category,{variantLabel='',configurable=false}={}){
    const lower=name.toLowerCase(),size=variantLabel?`${variantLabel} `:'';
    if(configurable)return {unitKey:'meal',unitLabel:'Configurable Meal',standardServingLabel:'1 configurable meal'};
    if(category==='McCafé Drinks'||category==='Drinks'||category==='Shakes & Frappes')return {unitKey:'drink',unitLabel:`${size}Drink`.trim(),standardServingLabel:`1 ${size.toLowerCase()}drink`.replace(/\s+/g,' ').trim()};
    if(/mcmuffin/i.test(name))return {unitKey:'muffin',unitLabel:'McMuffin',standardServingLabel:'1 McMuffin'};
    if(/mcwrap|wrap/i.test(name))return {unitKey:'wrap',unitLabel:'Wrap',standardServingLabel:'1 wrap'};
    if(/sauce|syrup|jam|butter|ketchup|aioli|mayonnaise/i.test(name))return {unitKey:'serve',unitLabel:'Condiment Serve',standardServingLabel:'1 condiment serve'};
    if(/burger|big mac|quarter pounder|cheeseburger|hamburger|mcchicken|mccrispy|mcspicy|chicken 'n' cheese|filet-o-fish|big arch/i.test(lower))return {unitKey:'burger',unitLabel:'Burger',standardServingLabel:'1 burger'};
    const pieces=name.match(/(\d+)\s*(?:pc|piece)/i);if(pieces)return {unitKey:'portion',unitLabel:`${pieces[1]}-Piece Portion`,standardServingLabel:`1 ${pieces[1]}-piece portion`};
    if(/fries/i.test(name)){const friesSize=cleanName(variantLabel||name.match(/\b(Small|Medium|Large)\b/i)?.[1]||'Small');return {unitKey:'portion',unitLabel:`${friesSize} Fries Portion`,standardServingLabel:`1 ${friesSize.toLowerCase()} fries portion`};}
    if(/sundae/i.test(name))return {unitKey:'sundae',unitLabel:'Sundae',standardServingLabel:'1 sundae'};
    if(/mcflurry/i.test(name))return {unitKey:'mcflurry',unitLabel:'McFlurry',standardServingLabel:'1 McFlurry'};
    if(/cone/i.test(name))return {unitKey:'cone',unitLabel:'Cone',standardServingLabel:'1 cone'};
    if(/pie/i.test(name))return {unitKey:'pie',unitLabel:'Pie',standardServingLabel:'1 pie'};
    if(/cookie/i.test(name))return {unitKey:'serve',unitLabel:'Cookie Serve',standardServingLabel:'1 cookie serve'};
    return {unitKey:'item',unitLabel:'Menu Item',standardServingLabel:'1 menu item'};
  }
  function aliasesFor(name,family,variantLabel=''){
    const base=cleanName(name),pathName=pathSlug(family.u).replace(/-/g,' '),out=[base,pathName,cleanName(family.n),`maccas ${base}`,`mcdonalds ${base}`];
    const brekkie=base.replace(/\bbreakfast\b/gi,'brekkie');if(brekkie!==base)out.push(brekkie,brekkie.replace(/\bbrekkie\b/gi,'breakie'),brekkie.replace(/\bbrekkie\b/gi,'breaky'),brekkie.replace(/\bmega\b/gi,'megga'),`maccas ${brekkie}`);
    if(/mcmuffin/i.test(base)){out.push(base.replace(/mcmuffin/ig,'mc muffin'),`maccas ${base.replace(/mcmuffin/ig,'mc muffin')}`);}
    if(/mcwrap|wrap/i.test(base)){const wrap=base.replace(/mcwrap/ig,'wrap');out.push(wrap,`maccas ${wrap}`,`mcdonalds ${wrap}`);}
    if(/coca-cola/i.test(base))out.push(base.replace(/coca-cola/i,'coke'));
    const nuggets=base.match(/^(\d+)pc Chicken McNuggets/i);if(nuggets)out.push(`${nuggets[1]} nuggets`,`${nuggets[1]} mcnuggets`);
    if(/cappuccino/i.test(base))out.push('maccas cappuccino','mcdonalds cappuccino');
    if(variantLabel)out.push(`${variantLabel} ${cleanName(family.n)}`,`${variantLabel} maccas ${cleanName(family.n)}`);
    return unique(out);
  }
  function officialVolume(name){const match=String(name).match(/\b(\d+)\s*m[lL]\b/);return match?Number(match[1]):null;}
  function provenance(path,hasNutrition=true){return {publisher:"McDonald's Australia",url:`${BASE}${path}`,referenceType:hasNutrition?'Official current Australian menu product nutrition table':'Official current Australian menu product page',tableBasis:hasNutrition?'Avg Qty / Serve and Per 100g or 100mL':'Nutrition unavailable/incomplete on the published product page'};}
  function friesVariant(size,path,values){
    const name=`${size} Fries`,serving=naturalServing(name,'Sides',{variantLabel:size});
    return {id:size.toLowerCase(),variantLabel:size,name,aliases:[name,`${size} Macca's Fries`,`${size} Maccas Fries`,`${size} McDonald's Fries`,`Maccas ${size} Fries`,`McDonald's ${size} Fries`,'Fries'],browseCategory:'Sides & Fries',browseTags:['Sides','Fries',size.toLowerCase()],nutritionStatus:'complete',loggable:true,standardServingLabel:serving.standardServingLabel,serving:{unitKey:serving.unitKey,unitLabel:serving.unitLabel},servingWeightG:null,servingVolumeMl:null,nutritionPer100Unit:'g',nutritionPerServing:nutrients(values),nutritionPer100:nutrients([1270,304,4.8,16,1.3,33.8,0,292]),provenance:{publisher:"McDonald's Australia",url:`${BASE}${path}`,supportingReference:CORE_MENU_PDF,referenceType:'Official current Australian menu size and published January 2026 core nutrition table',tableBasis:'Avg Qty / Serve and Avg Qty / 100g'},sourceLastCheckedDate:raw.checkedDate,lastSeenAt:raw.checkedAt,effectiveDate:'2026-01',sourceAnomalies:[]};
  }
  function assemblyModel(name){return {type:'configurable-assembly',nutritionAggregation:'sum-selected-components',componentSlots:[{id:'products',label:'Selected products'},{id:'sides',label:'Selected side sizes'},{id:'drinks',label:'Selected drink sizes'}],implementationStatus:'future-configurator',sourceDescription:name};}
  function itemFromFamily(family){
    const id=familyId(family),name=displayName(family),category=primaryCategory(family),configurable=BUNDLES.has(family.n),nutritionStatus=configurable?'configurable':family.v?'complete':'unavailable';
    const featured=family.c.includes('Featured')||family.n==="Macca's® Mega Meal",limited=LIMITED_PATHS.has(family.u),serving=naturalServing(name,category,{configurable}),menuBrowseCategory=browseCategory(family,name,category);
    const item={
      id,name,officialName:family.n,aliases:aliasesFor(name,family),category,categoryMemberships:family.c.map(cleanName),browseCategory:menuBrowseCategory,browseTags:browseTags(family,name,category),status:'current',itemKind:configurable?'configurable-assembly':isMcCafe(family)?'beverage-family':'product',
      nutritionStatus,loggable:nutritionStatus==='complete',standardServingLabel:serving.standardServingLabel,serving:{unitKey:serving.unitKey,unitLabel:serving.unitLabel},servingWeightG:null,servingVolumeMl:officialVolume(family.n),nutritionPer100Unit:family.b||'',
      nutritionPerServing:nutrients(family.v?.[0]),nutritionPer100:nutrients(family.v?.[1]),provenance:provenance(family.u,!!family.v),sourceLastCheckedDate:raw.checkedDate,lastSeenAt:raw.checkedAt,effectiveDate:raw.checkedDate,
      officialSizeLinks:(family.z||[]).map(([label,path])=>({label,url:`${BASE}${path}`})),sourceAnomalies:PUBLISHED_ANOMALIES[family.u]||[],promotional:featured,promotionalStatus:limited?'limited-time':featured?'featured':'standard',limitedTime:limited,promotionExpiry:'',assemblyModel:configurable?assemblyModel(name):null,variants:[]
    };
    if(nutritionStatus==='unavailable')item.entryBlockedReason="McDonald's Australia does not currently publish a complete fixed nutrition table for this product. No estimate has been used.";
    if(configurable)item.entryBlockedReason='This meal contains configurable product and size choices, so one fixed nutrition value would be unsafe. Choose components in a future configurator.';
    if(family.v){
      item.variants=(variantsByFamily.get(family.u)||[]).map(variant=>{
        const variantName=`${variant.l} ${cleanName(family.n)}`,variantServing=naturalServing(variantName,category,{variantLabel:variant.l});
        return {id:slug(variant.l),variantLabel:variant.l,name:variantName,aliases:aliasesFor(variantName,family,variant.l),browseCategory:browseCategory(family,variantName,category),browseTags:browseTags(family,variantName,category),nutritionStatus:'complete',loggable:true,standardServingLabel:variantServing.standardServingLabel,serving:{unitKey:variantServing.unitKey,unitLabel:variantServing.unitLabel},servingWeightG:null,servingVolumeMl:null,nutritionPer100Unit:variant.b||'',nutritionPerServing:nutrients(variant.v[0]),nutritionPer100:nutrients(variant.v[1]),provenance:provenance(variant.u,true),sourceLastCheckedDate:raw.checkedDate,lastSeenAt:raw.checkedAt,effectiveDate:raw.checkedDate,sourceAnomalies:PUBLISHED_ANOMALIES[variant.u]||[]};
      });
    }
    if(family.u==='sides/small-fries.html'){
      item.includeBaseRecord=true;
      item.familyDisplayName='Fries';
      item.variantAliasIsolation='size';
      item.variants.push(friesVariant('Medium','sides/medium-fries.html',[1320,316,5,16.6,1.4,35.2,0,304]),friesVariant('Large','sides/large-fries.html',[1630,389,6.1,20.5,1.7,43.3,0,374]));
    }
    return item;
  }

  const items=raw.families.map(itemFromFamily);
  const catalogue={
    source:{
      id:'mcdonalds-au',displayName:"McDonald's Australia",sourceType:'restaurant/fast food',country:'Australia',market:'AU',aliases:["McDonald's",'McDonalds','Macca’s','Maccas','Macca'],
      officialUrl:'https://www.mcdonalds.com/au/en-au/menu/featured.html',referenceUrls:['https://www.mcdonalds.com/au/en-au/about-us/our-impact/food-sourcing/nutrition.html','https://www.mcdonalds.com/au/en-au/terms-and-conditions.html',...raw.categorySurfaces.map(surface=>surface.url)],
      referenceMetadata:{publisher:"McDonald's Australia Limited",nutritionBasis:'Official live Australian menu product pages; Avg Qty / Serve and Per 100g or 100mL',retrievalMethod:'Founder-Trial catalogue transcription from reviewed official McDonald’s Australia category and product-page checkpoint',termsCheckedDate:raw.checkedDate},
      usageScope:'development/founder-trial',licenceStatus:'no-affirmative-production-catalogue-reuse-licence-granted',productionApproved:false,licensingInheritedByItems:true,
      lastCheckedDate:raw.checkedDate,catalogueVersion:`mcdonalds-au-${raw.checkedDate}-founder-trial.1`,catalogueCheckedAt:raw.checkedAt,effectiveDate:raw.checkedDate,
      inventory:{uniqueProductFamilies:167,completeNutritionFamilies:142,incompleteNutritionFamilies:17,configurableBundles:8,mccafeFamilies:42,mccafeNutritionVariants:63,promotionalFamilies:20,limitedTimeFamilies:5,browseCategories:BROWSE_CATEGORIES,categorySurfaces:raw.categorySurfaces},
      refreshPolicy:{cadence:'proposed-weekly-manual-review',schedulerIncluded:false,retainLastApprovedOnFailure:true,humanApprovalRequired:true,retireMissingItems:true,preservePublishedAnomalies:true,auditFields:['retrievedAt','sourceUrls','diff','validation','humanApproval']}
    },
    items
  };

  const registered=registry.registerCatalogue(catalogue);
  global.HECMcDonaldsAustraliaCatalogue=registered;
  if(typeof module!=='undefined'&&module.exports)module.exports=registered;
})(typeof window!=='undefined'?window:globalThis);
