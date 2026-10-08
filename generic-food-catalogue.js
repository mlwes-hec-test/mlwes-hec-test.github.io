/* One generic catalogue authority; reviewed identity data carries no nutrition. */
(function(global){
  'use strict';
  const EVIDENCE=global.HECGenericFoodEvidence||(typeof require==='function'?require('./generic-food-evidence.js'):null);
  const VERSION='1.1.0',norm=value=>String(value||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const methods=freeze({raw:'Raw',boiled:'Boiled','soft-boiled':'Soft-Boiled','hard-boiled':'Hard-Boiled',steamed:'Steamed',microwaved:'Microwaved',baked:'Baked',roasted:'Roasted',grilled:'Grilled',barbecued:'Barbecued','air-fried':'Air-Fried','pan-fried':'Pan-Fried','deep-fried':'Deep-Fried',fried:'Fried',poached:'Poached',scrambled:'Scrambled',omelette:'Omelette',mashed:'Mashed / puréed',cooked:'Cooked','ready-to-eat':'Ready to eat','ready-to-drink':'Ready to drink',toasted:'Toasted'});
  const eggMeasures=['smallEgg','mediumEgg','largeEgg','xLargeEgg','jumboEgg','kingEgg'];
  const concepts=freeze(Object.fromEntries(EVIDENCE.definitions.map(def=>{
    const references=def.references.map(row=>{
      const attributes={...row.attributes},name=norm(row.expectedName),ingredients=[def.label.toLowerCase()];
      if(attributes.additions==='milk')ingredients.push("regular-fat cow's milk");
      if(attributes.additions==='water'||attributes.preparation==='boiled')ingredients.push('water used in preparation');
      return {...row,attributes,nutritionReferenceState:attributes.cookingState,quantityWeightState:attributes.cookingState,includedIngredients:ingredients,
        assumptions:row.expectedName,exclusions:['Other preparations or additions','As-purchased weight including refuse'],uncertainty:'Published food composition and portion estimates vary between individual foods.',
        provenance:{source:'AFCD Release 3',basis:'per 100 g edible portion',review:EVIDENCE.review},requiresApproval:/no (?:added )?fat|no added salt/.test(name)||!!attributes.additions,
        measures:['g','kg',...(def.physicalForm==='liquid'?['mL','L','cup']:[]),...(def.id==='egg'&&attributes.part==='whole'&&['raw','hard-boiled','boiled','poached'].includes(attributes.preparation)?eggMeasures:[])]};
    });
    return [def.id,{...def,simple:true,physicalForm:def.physicalForm||'solid-weight',references,forms:[...new Set(references.map(row=>row.attributes.form))],capabilities:[...new Set(references.map(row=>row.attributes.preparation))],typicalPolicy:null,presentation:{primary:'concept',referenceLimit:6},relations:[]}];
  })));
  const referenceIdentities=new Map(Object.values(concepts).flatMap(c=>c.references.map(mapping=>[mapping.key,{c,mapping}])));
  const headIdentities=new Map(Object.values(concepts).flatMap(c=>c.aliases.map(alias=>[norm(alias),c])));
  const facets=freeze([
    {key:'form',rules:[['mashed',/\b(?:mashed|mash|pureed|puree)\b/],['frozen',/\bfrozen\b/],['dried',/\bdried\b/],['porridge',/\bporridge\b/],['fresh',/\bfresh pasta\b/]]},
    {key:'preparation',rules:[['microwave-poached',/\bmicrowave poached\b/],['soft-boiled',/\bsoft boiled\b/],['hard-boiled',/\bhard boiled\b/],['air-fried',/\bair (?:fried|fryer)\b/],['pan-fried',/\bpan fried\b/],['deep-fried',/\bdeep fried\b/],['scrambled',/\bscrambled\b/],['omelette',/\b(?:omelette|omelet)\b/],['boiled',/\b(?:boiled|boil|rice cooker)\b/],['baked',/\b(?:baked|bake)\b/],['roasted',/\b(?:roast|roasted)\b/],['steamed',/\bsteamed\b/],['microwaved',/\b(?:microwaved|microwave)\b/],['poached',/\bpoached\b/],['grilled',/\bgrilled\b/],['barbecued',/\b(?:barbecued|bbq)\b/],['fried',/\bfried\b/],['toasted',/\b(?:toast|toasted)\b/],['raw',/\b(?:raw|uncooked)\b/]]},
    {key:'cookingState',rules:[['raw',/\b(?:raw|uncooked|dry)\b/],['cooked',/\bcooked\b/]]},
    {key:'skin',rules:[['unpeeled',/\b(?:unpeeled|skin on|with skin)\b/],['peeled',/\b(?:peeled|skin off|without skin)\b/],['skinless',/\bskinless\b/]]},
    {key:'species',rules:[['Chicken',/\bchicken\b/],['Duck',/\bduck\b/],['Quail',/\bquail\b/],['Other',/\b(?:goose|ostrich|emu|turkey)\b/]]},
    {key:'enrichment',rules:[['Omega-3',/\bomega 3(?: enriched)?\b/],['Ordinary',/\b(?:ordinary|standard)\b/]]},
    {key:'size',rules:[['xLargeEgg',/\b(?:extra large|x large)\b/],['jumboEgg',/\bjumbo\b/],['kingEgg',/\bking size\b/],['largeEgg',/\blarge\b/],['mediumEgg',/\bmedium\b/],['smallEgg',/\bsmall\b/]]},
    {key:'part',rules:[['white',/\begg whites?\b/],['yolk',/\byolks?\b/],['whole',/\bwhole\b/]]},
    {key:'additions',rules:[['none',/\b(?:plain|no added fat|without additions|no additions|without milk)\b/],['custom',/\b(?:butter|oil|margarine|sauce|salt|sugar|garlic)\b/],['milk',/\b(?:with |in )milk\b/],['water',/\b(?:with |in )water\b/]]}
  ]);
  const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function parse(query,{quantity=null,sourceIntent=null}={}){
    if(sourceIntent?.entity||['source','brand-family','retailer'].includes(sourceIntent?.kind))return null;
    const text=norm(quantity?.identityQuery||query);
    const matches=Object.values(concepts).flatMap(c=>c.aliases.map(alias=>({c,alias:norm(alias)}))).filter(({alias})=>new RegExp(`\\b${escape(alias)}\\b`).test(text)).sort((a,b)=>b.alias.length-a.alias.length);
    if(!matches.length)return null;
    const {c:found,alias}=matches[0],known={},conflicts=[];let residual=text;
    // Consume disjoint, longest phrases first. Unconsumed ingredient/brand
    // words block admission instead of establishing a whole-food identity.
    for(const facet of facets){
      if(['species','enrichment','part'].includes(facet.key)&&found.id!=='egg')continue;
      if(facet.key==='size'&&found.family!=='fruit'&&found.id!=='egg')continue;
      const hits=[];for(const [value,pattern] of facet.rules){if(pattern.test(residual)){hits.push(value);residual=residual.replace(pattern,' ');}}
      if(hits.length>1)conflicts.push(facet.key);if(hits.length)known[facet.key]=hits[0];
    }
    for(const key of ['variety','meat','cut','trim','fat']){
      const values=[...new Set(found.references.map(row=>row.attributes[key]).filter(Boolean))].sort((a,b)=>b.length-a.length);
      for(const value of values){const pattern=new RegExp(`\\b${escape(norm(value))}\\b`);if(pattern.test(residual)){known[key]=value;residual=residual.replace(pattern,' ');break;}}
    }
    // An alias can contain an already-consumed attribute, e.g. white bread.
    for(const word of alias.split(' '))residual=residual.replace(new RegExp(`\\b${escape(word)}\\b`),' ');
    for(const a of [...found.aliases].sort((a,b)=>b.length-a.length))residual=residual.replace(new RegExp(`\\b${escape(norm(a))}\\b`,'g'),' ');
    if(found.family==='fruit'&&known.size)known.size={smallEgg:'smallFruit',mediumEgg:'mediumFruit',largeEgg:'largeFruit'}[known.size]||known.size;
    if(found.id==='egg'&&known.preparation==='boiled')known.boilExtent='unspecified';
    if(known.preparation){const cookingState=known.preparation==='raw'?'raw':'cooked';if(known.cookingState&&known.cookingState!==cookingState)conflicts.push('cookingState');else known.cookingState=cookingState;}
    if(known.preparation==='scrambled')known.form='scrambled';if(known.form==='porridge')known.cookingState='cooked';
    if(known.additions==='custom'&&/\b(?:salt|garlic)\b/.test(text)&&/\b(?:cooking|boiling) water\b/.test(text)&&! /\b(?:butter|oil|sugar|sauce)\b/.test(text)){
      delete known.additions;known.seasoningWater=true;residual=residual.replace(/\b(?:salt|garlic|cooking|boiling|water|flavouring)\b/g,' ');
    }
    residual=residual.replace(/\b\d+(?:\.\d+)?\s*(?:g|grams?|kg|ml|l|cups?|eggs?|items?|pieces?|fruits?)?\b/g,' ').replace(/\b(?:one|two|three|four|half|a|an|home|prepared|homemade|made|generic|food|add|log|record|please|of|with|and|in|to|for|today|tomorrow|breakfast|lunch|dinner|snacks?|fresh)\b/g,' ').replace(/\s+/g,' ').trim();
    if(residual)return null;
    return {owner:'generic-v2',rawQuery:String(query||''),identityQuery:text,conceptId:found.id,kind:Object.keys(known).length?'concept-with-facets':'generic-concept',generic:true,known,conflicts,quantity,sourceContext:/\b(?:home|homemade)\b/.test(text)?'home-prepared':'',confidence:'high',evidence:'shared-generic-catalogue',residual:''};
  }
  function identity(food={}){
    const owned=concepts[food.genericResolution?.conceptId];if(owned)return {conceptId:owned.id,category:owned.id==='egg'?'egg':owned.family==='prepared-meat'?'meat':owned.family,form:owned.physicalForm};
    const head=norm(String(food.canonicalName||food.name||'').split(',')[0]),text=norm(food.canonicalName||food.name),reference=food.afcd===true||food.recordType==='afcd'||!!food.afcdKey;
    if(!reference&&(food.foodSourceId||food.physicalFormSource&&food.physicalFormSource!=='inferred-source-units'||(food.categories||[]).some(value=>/\b(?:drinks?|beverages?|juices?|cakes?|pies?|meals?)\b/.test(norm(value)))))return null;
    const entry=referenceIdentities.get(food.afcdKey),exact=entry?.mapping.expectedName===(food.canonicalName||food.name)?entry.c:null;
    if(exact)return {conceptId:exact.id,category:exact.id==='egg'?'egg':exact.family==='prepared-meat'?'meat':exact.family,form:exact.physicalForm};
    if(/^(?:porridge|oatmeal)$/.test(head))return {category:'grain',form:'solid-weight'};
    if(/\bsteak\b/.test(head))return {category:'meat',form:'solid-weight'};
    if(/^(?:water crackers?|crackers?|biscuit savoury)$/.test(head))return {category:'snack',form:'countable'};
    if(/\b(?:chips?|crisps?|fries|wedges|bread|pies?|juice|cider|sauce|cake|salad|pudding|chocolate|vinegar|noodles?|dried|frozen)\b/.test(text))return null;
    const c=headIdentities.get(head);
    if(!c)return null;return {conceptId:c.id,category:c.id==='egg'?'egg':c.family==='prepared-meat'?'meat':c.family,form:c.physicalForm};
  }
  function displayName(concept,mapping){
    const c=typeof concept==='string'?concepts[concept]:concept,a=mapping.attributes,prep=['raw','ready-to-eat','ready-to-drink','cooked'].includes(a.preparation)?'':methods[a.preparation];
    const variety=a.variety&&!['General','Mature','Pale skin','Common','Rolled'].includes(a.variety)?a.variety:'';
    return [prep,a.enrichment==='Omega-3'?'Omega-3':'',a.species,a.meat,variety,a.cut&&!norm(c.label).includes(norm(a.cut))?a.cut:'',c.id==='oats'&&a.form==='porridge'?'Porridge':c.label,a.trim?`(${a.trim.toLowerCase()})`:'',a.fat?`(${a.fat.toLowerCase()})`:''].filter(Boolean).join(' ');
  }
  const api={version:VERSION,concepts,facets,methods,norm,parse,identity,displayName};global.HECGenericFoodCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
