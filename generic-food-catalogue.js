/* Generic Food Catalogue v2, Stage 1. Identities and reviewed mappings only.
   Nutrients and conversions remain owned by the existing source/serving layers. */
(function(global){
  'use strict';
  const VERSION='1.0.0',norm=value=>String(value||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const mapping=(key,name,attributes,assumptions,includedIngredients,measures=['g','kg'])=>({key,expectedName:name,attributes:{form:'whole',...attributes},nutritionReferenceState:attributes.cookingState,quantityWeightState:attributes.cookingState,includedIngredients,assumptions,exclusions:['Other preparations or additions','As-purchased weight including refuse'],uncertainty:'Published reference; individual food composition can vary',provenance:{source:'AFCD Release 3',basis:'per 100 g edible portion',review:'Stage 1 source-description review, 8 October 2026'},measures});
  const vegetable=(key,name,preparation,variety='Unspecified')=>mapping(key,name,{cookingState:preparation==='raw'?'raw':'cooked',preparation,skin:'peeled',variety},`${variety==='Unspecified'?'':variety+'; '}peeled edible portion${preparation==='raw'?'':preparation==='boiled'?'; boiled in unsalted water, drained; no added fat':'; baked; no added fat'}`,preparation==='boiled'?['vegetable','water used in cooking']:['vegetable']);
  const fruit=(key,name,variety,skin)=>mapping(key,name,{cookingState:'raw',preparation:'raw',skin,variety},`Raw; ${skin==='peeled'?'peeled edible portion':'skin on; core excluded'}; ${variety}`,['fruit']);
  const concept=(id,label,aliases,family,references,capabilities=[])=>({id,label,aliases,family,simple:true,forms:['whole',...(capabilities.includes('mash')?['mashed']:[]),...(capabilities.includes('scramble')?['scrambled']:[])],physicalForm:'solid-weight',capabilities,references,typicalPolicy:null,presentation:{primary:'concept',referenceLimit:6},relations:[]});
  const concepts=freeze({
    potato:concept('potato','Potato',['potato','potatoes'],'tuber',[
      vegetable('F007325','Potato, pale skin, peeled, raw','raw','Pale skin'),
      vegetable('F007320','Potato, pale skin, peeled, boiled, drained','boiled','Pale skin'),
      vegetable('F007314','Potato, pale skin, peeled, baked, no added fat','baked','Pale skin')
    ],['water-cooking','dry-heat','mash']),
    pumpkin:concept('pumpkin','Pumpkin',['pumpkin','pumpkins'],'vegetable',[
      vegetable('F007555','Pumpkin, peeled, fresh, raw','raw'),
      vegetable('F007554','Pumpkin, peeled, fresh, boiled, drained','boiled'),
      vegetable('F007553','Pumpkin, peeled, fresh, baked, no added fat','baked'),
      vegetable('F007535','Pumpkin, butternut, peeled, fresh, raw','raw','Butternut'),
      vegetable('F007534','Pumpkin, butternut, peeled, fresh, boiled, drained','boiled','Butternut'),
      vegetable('F007533','Pumpkin, butternut, peeled, fresh, baked, no added fat','baked','Butternut')
    ],['water-cooking','dry-heat','mash']),
    apple:concept('apple','Apple',['apple','apples'],'fruit',[
      fruit('F000110','Apple, red skin, unpeeled, raw','Red-skinned mix','unpeeled'),
      fruit('F000098','Apple, green skin, unpeeled, raw','Green-skinned mix','unpeeled'),
      fruit('F000105','Apple, pink lady, unpeeled, raw','Pink Lady','unpeeled'),
      fruit('F000095','Apple, granny-smith, unpeeled, raw','Granny Smith','unpeeled'),
      fruit('F000108','Apple, red skin, peeled, raw','Red-skinned mix','peeled')
    ]),
    banana:concept('banana','Banana',['banana','bananas'],'fruit',[
      fruit('F000262','Banana, cavendish, peeled, raw','Cavendish','peeled'),
      fruit('F000267','Banana, lady finger or sugar, peeled, raw','Lady Finger','peeled')
    ]),
    egg:concept('egg','Egg',['egg','eggs'],'protein',[
      mapping('F003729','Egg, chicken, whole, raw',{cookingState:'raw',preparation:'raw',part:'whole'},'Whole chicken egg; shell excluded',['egg'],['g','kg','smallEgg','mediumEgg','largeEgg','xLargeEgg','jumboEgg','kingEgg']),
      mapping('F003721','Egg, chicken, whole, hard-boiled',{cookingState:'cooked',preparation:'boiled',part:'whole'},'Whole chicken egg; hard-boiled in unsalted water; shell excluded',['egg','water used in cooking'],['g','kg','smallEgg','mediumEgg','largeEgg','xLargeEgg','jumboEgg','kingEgg']),
      mapping('F003732',"Egg, chicken, whole, scrambled, with regular fat cow's milk, no fat added",{form:'scrambled',cookingState:'cooked',preparation:'scrambled',part:'whole',additions:'milk'},'Published scrambled-egg recipe WITH regular-fat cow milk; no added fat; use grams of the finished food',['egg','regular-fat cow milk'])
    ],['water-cooking','scramble']),
    rice:concept('rice','Rice',['rice'],'grain',[
      mapping('F007661','Rice, white, boiled or rice cooker, no added salt',{cookingState:'cooked',preparation:'boiled',variety:'White'},'White rice; boiled or rice cooker; no added salt; cooked edible grams',['rice','water']),
      mapping('F007641','Rice, brown, boiled, no added salt',{cookingState:'cooked',preparation:'boiled',variety:'Brown'},'Brown rice; boiled; no added salt; cooked edible grams',['rice','water']),
      mapping('F007682','Rice, white, uncooked',{cookingState:'raw',preparation:'raw',variety:'White'},'White rice; uncooked dry grams',['rice']),
      mapping('F007648','Rice, brown, uncooked',{cookingState:'raw',preparation:'raw',variety:'Brown'},'Brown rice; uncooked dry grams',['rice'])
    ],['water-cooking'])
  });
  const facets=freeze([
    {key:'form',rules:[['mashed',/\b(?:mashed|mash|pureed|puree)\b/],['frozen',/\bfrozen\b/],['dried',/\bdried\b/]]},
    {key:'preparation',rules:[['scrambled',/\bscrambled\b/],['boiled',/\b(?:hard boiled|boiled|boil)\b/],['baked',/\b(?:baked|bake)\b/],['roasted',/\b(?:roast|roasted)\b/],['steamed',/\bsteamed\b/],['poached',/\bpoached\b/],['fried',/\bfried\b/],['raw',/\b(?:raw|uncooked|fresh)\b/]]},
    {key:'cookingState',rules:[['raw',/\b(?:raw|uncooked|dry)\b/],['cooked',/\bcooked\b/]]},
    {key:'skin',rules:[['unpeeled',/\b(?:unpeeled|skin on|with skin)\b/],['peeled',/\b(?:peeled|skin off|without skin)\b/]]},
    {key:'variety',rules:[['Pink Lady',/\bpink lady\b/],['Granny Smith',/\bgranny smith\b/],['Lady Finger',/\b(?:lady finger|sugar banana)\b/],['Cavendish',/\bcavendish\b/],['Butternut',/\bbutternut\b/],['White',/\bwhite\b/],['Brown',/\bbrown\b/]]},
    {key:'additions',rules:[['none',/\b(?:plain|no added fat|without additions|no additions|without milk)\b/],['custom',/\b(?:butter|oil|margarine|cheese|sauce|salt|sugar)\b/],['milk',/\bmilk\b/]]},
    {key:'part',rules:[['white',/\b(?:egg whites?|albumen)\b/],['yolk',/\byolks?\b/],['whole',/\bwhole\b/]]}
  ]);
  const excluded=/\b(?:sweet potato|chips?|crisps?|fries|wedges|bread|pies?|juice|cider|sauce|cake|salad|pudding|chocolate|vinegar|rolls?|noodles?)\b/;
  function parse(query,{quantity=null,sourceIntent=null}={}){
    if(sourceIntent?.entity||['source','brand-family','retailer'].includes(sourceIntent?.kind))return null;
    let text=norm(quantity?.identityQuery||query);if(excluded.test(text)||/\brice milk\b/.test(text))return null;
    const found=Object.values(concepts).find(c=>c.aliases.some(alias=>new RegExp(`\\b${alias}\\b`).test(text)));if(!found)return null;
    const known={},conflicts=[];for(const facet of facets){const hits=facet.rules.filter(([,pattern])=>pattern.test(text));if(hits.length>1)conflicts.push(facet.key);if(hits.length)known[facet.key]=hits[0][0];}
    if(found.id!=='egg'&&known.part==='whole'){known.form='whole';delete known.part;}
    if(known.preparation){const state=known.preparation==='raw'?'raw':'cooked';if(known.cookingState&&known.cookingState!==state)conflicts.push('cookingState');else known.cookingState=state;}
    if(known.preparation==='scrambled')known.form='scrambled';
    let residual=text;for(const alias of found.aliases)residual=residual.replace(new RegExp(`\\b${alias}\\b`,'g'),' ');for(const facet of facets)for(const [,pattern] of facet.rules)residual=residual.replace(pattern,' ');
    residual=residual.replace(/\b\d+(?:\.\d+)?\s*(?:g|grams?|kg|ml|l|cups?|eggs?|items?|pieces?)?\b/g,' ').replace(/\b(?:one|two|three|four|half|a|an|home|prepared|homemade|made|generic|food|add|log|record|please|of|with|and|in|to|for|today|tomorrow|breakfast|lunch|dinner|snacks?)\b/g,' ').replace(/\s+/g,' ').trim();
    if(residual)return null;
    return {owner:'generic-v2',rawQuery:String(query||''),identityQuery:text,conceptId:found.id,kind:Object.keys(known).length?'concept-with-facets':'generic-concept',generic:true,known,conflicts,quantity,sourceContext:/\bhome|homemade\b/.test(text)?'home-prepared':'',confidence:'high',evidence:'shared-generic-catalogue',residual:''};
  }
  // Structured source heads outrank ingredient prose. Keep this deliberately
  // narrow: it does not turn every currently blocked AFCD row into a usable food.
  function identity(food={}){
    const text=norm(food.name),head=norm(String(food.name||'').split(',')[0]);
    const reference=food.afcd===true||food.recordType==='afcd'||!!food.afcdKey;
    if(!reference&&!food.genericResolution&&(food.foodSourceId||food.physicalFormSource&&food.physicalFormSource!=='inferred-source-units'||(food.categories||[]).some(value=>/\b(?:drinks?|beverages?|milks?|juices?|chocolates?|confectionery|cakes?|pies?|sandwiches?|meals?)\b/.test(norm(value)))))return null;
    if(excluded.test(text))return null;
    if(/^(?:porridge|oatmeal)\b/.test(head))return {category:'grain',form:'solid-weight'};
    if(/\bsteak\b/.test(head))return {category:'meat',form:'solid-weight'};
    if(/\b(?:water crackers?|crackers?|biscuit savoury)\b/.test(head))return {category:'snack',form:'countable'};
    const c=Object.values(concepts).find(c=>c.aliases.includes(head)||c.id==='egg'&&/^eggs?\b/.test(head));
    if(!c)return null;
    if(c.id==='rice'&&/\b(?:fried|pudding)\b/.test(text))return null;
    if(c.family==='fruit'&&/\b(?:dried|frozen)\b/.test(text))return null;
    return {conceptId:c.id,category:{tuber:'vegetable',vegetable:'vegetable',fruit:'fruit',protein:'egg',grain:'grain'}[c.family],form:c.physicalForm};
  }
  const api={version:VERSION,concepts,facets,norm,parse,identity};global.HECGenericFoodCatalogue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
