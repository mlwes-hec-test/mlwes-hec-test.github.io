/* Shared presentation and safety rules. Source nutrition and identity stay intact. */
(function(g){
  'use strict';
  const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  // Reviewed family relationships, not nutrition equivalence. These groups never
  // merge GTINs or Classic/Diet/Zero recipes. Evidence checked 2026-10-05.
  const families=[
    {key:'pepsi',name:'Pepsi',members:['pepsi','pepsimax'],url:'https://www.pepsimax.com.au/node/21'},
    {key:'cocacola',name:'Coca-Cola',members:['cocacola','coke'],url:'https://www.coca-cola.com/au/en/brands/coca-cola'}
  ];
  const holds={
    '9300675047272':'The source reports 142 kcal per 100 g for a ready-to-drink cola. The energy and volume basis need exact package evidence.',
    '9300675012089':'The Zero product identity conflicts with 10.67 g sugar per source reference. Exact nutrition and volume evidence are required.',
    '9313820001487':'This ready-to-drink can has only a mass nutrition basis. An exact volume panel is required; no density conversion is assumed.'
  };
  function family(key){return families.find(f=>f.key===key||f.members.includes(key));}
  function familyKeys(key){const f=family(key);return f&&key===f.key||key==='coke'?f.members:[key];}
  function readyToDrink(food){
    const name=norm(food?.name),tags=norm([...(food?.categories||[]),food?.sourceCategoryTags||'',food?.category||'',food?.preparationContext||'',food?.genericName||'',food?.productFamily||''].join(' '));
    if(/\b(powder|sachet|concentrate|syrup|cordial|instant|mix|chocolate|chips|soup|stock|broth)\b/.test(name))return false;
    if(/\b(chocolates?|confectionery|crisps|biscuits|powders|syrups|concentrates|desserts?|ice creams?|sorbets?|jellies|snacks)\b/.test(tags))return false;
    const liquidEvidence=food?.physicalForm==='liquid'||/\b(beverages|carbonated drinks|colas|sodas|iced teas|ready to drink|soft drinks?)\b/.test(tags);
    return liquidEvidence&&(/\b(cola|soda|lemonade|soft drink|iced tea|ice tea|fruit juice|mineral water|spring water)\b/.test(name+' '+tags)||/\b(carbonated drinks|colas|sodas)\b/.test(tags));
  }
  function category(food){
    const name=norm(food?.name),tags=norm([...(food?.categories||[]),food?.sourceCategoryTags||'',food?.preparationContext||''].join(' '));
    const result=(id,label)=>({id,label});
    // Whole food heads take priority over ingredients and flavour descriptions.
    if(/\b(chips|crisps)\b/.test(name)&&/\b(corn|potato|tortilla|hummus|crisps|flavou?red|snacks)\b/.test(name+' '+tags)&&! /\b(frozen|oven|fries|straight cut|chocolate|buns?|bread|cakes?|cookies?|biscuits?|muffins?|fish)\b/.test(name))return result('snacks','Snacks & Confectionery');
    if(/\b(peanut|nut|seed) butter\b/.test(name))return result('spreads','Spreads & Margarine');
    if(/\b(chocolate)\b/.test(name)&&! /\b(milk drink|flavoured milk|ice cream|cake|powder)\b/.test(name))return null;
    if(/\b(stock|broth|soups?|pickles?|stuffing|sauces?|pies?|pizzas?|sandwich(?:es)?|wraps?|croquettes?|flavoured|flavored)\b/.test(name))return null;
    if(/\bham\b/.test(name)&&! /\b(with|filled|and|roll|bread|salad|meal)\b/.test(name))return result('protein','Meat & Protein');
    if(/\b(snack sticks?|snack stix)\b/.test(name)&&/\b(meat|pork|beef|salami|sausages)\b/.test(tags))return result('protein','Meat & Protein');
    if(readyToDrink(food))return /\b(cola|soda|lemonade|soft drink|carbonated drinks|colas|sodas)\b/.test(name+' '+tags)?result('soft-drinks','Soft Drinks'):result('drinks','Drinks');
    return null;
  }
  function project(food){const c=category(food);return c?{...food,categoryId:c.id,browseCategoryId:c.id,category:c.label}:food;}
  function matches(food,query){const hay=norm([food.name,food.brand,food.sourceBrands,food.pack,food.packageSize,...(food.aliases||[])].join(' '));return norm(query).split(' ').filter(Boolean).every(t=>hay.includes(t));}
  function alphabetic(a,b){return String(a.name).localeCompare(String(b.name),'en')||String(a.barcode||a.id).localeCompare(String(b.barcode||b.id));}
  // Callers supply canonical, usable membership, never raw backend totals.
  function direct(model){return (model.usableTotal??model.total)<=20;}
  function redundantBrowse(model){return direct(model);}
  function usableProducts(records){
    const C=g.HECFoodCatalogue||(typeof require==='function'?require('./food-catalogue'):null);
    return C.canonicaliseRecords(records).filter(food=>!food.legacyPreviewOnly&&food.current!==false&&food.itemStatus!=='retired'&&C.productEligibility(food).addability.normalLoggingAllowed).sort(alphabetic);
  }
  function resultItems(items){
    const brands=new Map();
    for(const item of items){const key=norm(item.name||item.food?.name),brand=norm(item.food?.brand);if(!key||!brand)continue;const set=brands.get(key)||new Set();set.add(brand);brands.set(key,set);}
    return items.map(item=>({...item,emphasizeBrand:(brands.get(norm(item.name||item.food?.name))?.size||0)>1}));
  }
  function submittedGroups(model,{restaurant=false}={}){
    const groups=model?.groups||[],family=groups.some(group=>group.key==='restaurant-family');
    // Keep unavailable identities discoverable when specifically requested.
    // Presentation never removes the underlying catalogue or grants addability.
    const search=g.HECSearchFoundation||(typeof require==='function'?require('./search-foundation'):null);
    let remaining=24;
    const visible=groups.map(group=>{
      const items=group.items.filter(item=>item.kind==='generic-concept'||item.addability?.normalLoggingAllowed||
        group.key==='restaurant-family'&&item.addability?.status==='needs-nutrition-completion'||
        !!(model.identityQuery||model.rawQuery)&&(item.decisionTrace?.exactness||search?.semanticProductExactness(item.food,model.identityQuery||model.rawQuery))?.priority>=4
      ).slice(0,family?undefined:restaurant?24:remaining);
      remaining-=items.length;return {...group,items};
    }).filter(group=>group.items.length);
    const items=resultItems(visible.flatMap(group=>group.items));let index=0;
    return visible.map(group=>({...group,items:group.items.map(()=>items[index++])}));
  }
  const products=[{"id":"manufacturer:au:pepsi-regular","canonicalId":"manufacturer:au:pepsi-regular","sourceId":"manufacturer:au:pepsi-regular","name":"Pepsi Regular","brand":"Pepsi","aliases":["Pepsi Regular","Pepsi standard cola"],"recordType":"packaged","market":"AU","country":"Australia","verified":true,"source":"Australian manufacturer nutrition","sourceUrl":"https://www.pepsimax.com.au/products/pepsi","sourceProvenance":{"trustClass":"official-au-manufacturer","sourceId":"manufacturer-au","recordId":"manufacturer:au:pepsi-regular","url":"https://www.pepsimax.com.au/products/pepsi","checkedAt":"2026-10-05","sha256":"748cd45d79f176808408eebaf9fa7a412b25c9b3e0519914f84e21df89cbaa67"},"categories":["Beverages","Carbonated drinks","Colas"],"categoryId":"soft-drinks","category":"Soft Drinks","conceptIds":[],"physicalForm":"liquid","physicalFormSource":"Official Australian ready-to-drink product and per-100 mL panel","nutritionPer100Unit":"mL","sourceNutritionBasis":{"basis":"per-100","amount":100,"unit":"mL","state":"as-sold"},"nutritionBasis":{"per100Unit":"mL","sourceBasis":"per-100mL","state":"as-sold"},"nutritionBasisNote":"as-sold","nutrients":{"energyKj":111,"protein":0,"fat":0,"satFat":0,"carbs":7,"sugar":7,"sodium":10,"calories":26.52963671128107},"units":{"mL":0.01,"cup":2.5,"serve":3.75},"unitLabels":{"mL":"mL","cup":"Metric Cup (250 mL)","serve":"Manufacturer Serve (375 mL)"},"manufacturerServing":{"amount":375,"unit":"mL","text":"375 mL"},"packageServingText":"375 mL","packageServingExplicit":true,"defaultUnit":"mL","defaultAmount":100,"serving":"Nutrition per 100 mL","nutritionStatus":"usable","loggable":true,"privateTestingApproved":true,"publicReleaseReviewRequired":true},{"id":"manufacturer:au:coca-cola-zero-sugar","canonicalId":"manufacturer:au:coca-cola-zero-sugar","sourceId":"manufacturer:au:coca-cola-zero-sugar","name":"Coca-Cola Zero Sugar","brand":"Coca-Cola","aliases":["Coke Zero","Coca Cola Zero Sugar"],"recordType":"packaged","market":"AU","country":"Australia","verified":true,"source":"Australian manufacturer nutrition","sourceUrl":"https://www.coca-cola.com/au/en/brands/coca-cola/products","sourceProvenance":{"trustClass":"official-au-manufacturer","sourceId":"manufacturer-au","recordId":"manufacturer:au:coca-cola-zero-sugar","url":"https://www.coca-cola.com/au/en/brands/coca-cola/products","checkedAt":"2026-10-05","sha256":"748cd45d79f176808408eebaf9fa7a412b25c9b3e0519914f84e21df89cbaa67"},"categories":["Beverages","Carbonated drinks","Colas"],"categoryId":"soft-drinks","category":"Soft Drinks","conceptIds":[],"physicalForm":"liquid","physicalFormSource":"Official Australian ready-to-drink product and per-100 mL panel","nutritionPer100Unit":"mL","sourceNutritionBasis":{"basis":"per-100","amount":100,"unit":"mL","state":"as-sold"},"nutritionBasis":{"per100Unit":"mL","sourceBasis":"per-100mL","state":"as-sold"},"nutritionBasisNote":"as-sold","nutrients":{"energyKj":1.2,"calories":0.3,"protein":0.02,"fat":0,"satFat":0,"carbs":0.03,"sugar":0,"fibre":0,"sodium":4.1},"units":{"mL":0.01,"cup":2.5},"unitLabels":{"mL":"mL","cup":"Metric Cup (250 mL)"},"defaultUnit":"mL","defaultAmount":100,"serving":"Nutrition per 100 mL","nutritionStatus":"usable","loggable":true,"privateTestingApproved":true,"publicReleaseReviewRequired":true}];
  const api={products,families,holds,family,familyKeys,readyToDrink,category,project,matches,alphabetic,direct,redundantBrowse,usableProducts,resultItems,submittedGroups};
  g.HECCatalogueDiscovery=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
