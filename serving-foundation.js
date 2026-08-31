/* Healthy Eating Companion — Serving & Measure Foundation 0.6.32
   Data-driven serving/measure resolver shared by generic foods and products.
   Priorities:
   1) explicit package serving/count data;
   2) existing source-specific measures with known conversion;
   3) Australian Dietary Guidelines standard-serve measures;
   4) safe grams/mL fallback when no defensible conversion is known.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const REG=global.HECAustralianEntityRegistry;
  const SEM=global.HECProductServingSemantics||(typeof require==='function'?require('./product-serving-semantics.js'):null);
  const GUIDELINE_SOURCE='Australian Dietary Guidelines · Eat for Health standard serves';

  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function finite(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function fmt(v){const x=finite(v);return Number.isInteger(x)?String(x):String(Number(x.toFixed(1)));}
  function words(v){return new Set(norm(v).split(' ').filter(Boolean));}
  function has(text,re){return re.test(norm(text));}
  function clone(v){return JSON.parse(JSON.stringify(v));}

  function basisInfo(food){
    const units=food?.units||{};
    const gScale=finite(units.g);       // nutrient-basis multiplier per gram
    const mlScale=finite(units.mL);     // nutrient-basis multiplier per mL
    const servingG=gScale>0?1/gScale:0;
    const servingMl=mlScale>0?1/mlScale:0;
    return {gScale,mlScale,servingG,servingMl};
  }

  function isPackageFood(food){
    const source=norm(food?.source||''),category=norm(food?.category||''),brand=norm(food?.brand||'');
    const recordType=norm(food?.recordType||'');
    return !!food?.foodSourceId||!!food?.barcode||['packaged','online candidate'].includes(recordType)||!!food?.manufacturerServing||food?.packageServingExplicit===true||food?.servingBasis==='package-explicit'||/open food facts|barcode|package|online product|product data|nutrition panel|official .* product/.test(source+' '+category)||(/user created/.test(source)&&!!brand);
  }

  function explicitPackageServing(food){
    if(!isPackageFood(food))return false;
    if(food?.servingBasis==='package-explicit'||food?.packageServingExplicit===true)return true;
    const s=String(food?.serving||'');
    if(/reference values per 100|100\s*[gm]l?\s*reference|per 100/i.test(s))return false;
    const units=food?.units||{};
    return units.serve!==undefined&&(units.g!==undefined||units.mL!==undefined)&&/\d/.test(s);
  }

  function inferCategory(food,context={}){
    if(context.conceptCategory)return context.conceptCategory;
    if(context.concept?.category)return context.concept.category;
    const identityText=`${context.query||''} ${food?.brand||''} ${food?.name||''}`;
    const regConcept=REG?.foodConcept?REG.foodConcept(identityText):'';
    if(regConcept==='corn-chip')return 'snack';
    if(['cereal','bread','pasta'].includes(regConcept))return 'grain';
    if(regConcept==='coffee')return 'drink';
    const name=norm(`${food?.name||''} ${food?.category||''} ${food?.ingredients||''}`);
    // Resolve the food family before descriptors such as "cheese" flavour.
    // A Cheese Supreme Corn Chip is still a corn chip, not a cheese slice.
    if(/\b(corn chip|corn chips|tortilla chip|tortilla chips|potato chip|potato chips|rice cracker|rice crackers|cracker|crackers|snack)\b/.test(name))return 'snack';
    if(/\b(apple|banana|orange|pear|mandarin|tangerine|mango|grape|berry|berries|kiwi|plum|apricot|peach|nectarine|melon|watermelon|pineapple|fruit)\b/.test(name))return 'fruit';
    if(/\b(lettuce|spinach|rocket|cabbage|kale|broccoli|cauliflower|carrot|pumpkin|tomato|potato|capsicum|onion|vegetable|vegetables|salad|beans|peas|lentil|chickpea)\b/.test(name))return 'vegetable';
    if(/\b(milk|cheese|yoghurt|yogurt|ricotta|dairy|buttermilk)\b/.test(name))return 'dairy';
    if(/\b(beef|lamb|veal|pork|goat|kangaroo|chicken|turkey|duck|meat|poultry|sausage)\b/.test(name))return 'meat';
    if(/\b(fish|salmon|tuna|prawn|shrimp|seafood|snapper|barramundi|cod|trout|sardine)\b/.test(name))return 'seafood';
    if(/\b(egg|eggs)\b/.test(name))return 'egg';
    if(/\b(bread|roll|rice|pasta|noodle|barley|buckwheat|semolina|polenta|bulgur|quinoa|porridge|oat|cereal|muesli|crispbread|crumpet|muffin|scone|grain)\b/.test(name))return 'grain';
    if(/\b(coffee|tea|juice|drink|beverage|water|milkshake|smoothie)\b/.test(name))return 'drink';
    return context.conceptCategory||'generic';
  }

  function stateInfo(food,context={}){
    const n=norm(`${food?.name||''} ${context.query||''} ${Object.values(context.selected||{}).join(' ')}`);
    return {
      raw:/\braw\b/.test(n), cooked:/\b(cooked|boiled|steamed|roasted|grilled|fried|baked|poached|microwaved|stewed)\b/.test(n),
      dried:/\b(dried|dehydrated)\b/.test(n), canned:/\b(canned|tinned)\b/.test(n),
      leafy:/\b(lettuce|spinach|rocket|kale|leafy|salad greens|green leafy|raw salad)\b/.test(n),
      hardCheese:/\b(cheddar|tasty cheese|hard cheese|parmesan|edam|gouda|colby)\b/.test(n),
      ricotta:/\bricotta\b/.test(n), yoghurt:/\b(yoghurt|yogurt)\b/.test(n), milk:/\b(milk|buttermilk|soy drink|rice drink|cereal drink)\b/.test(n),
      evaporatedMilk:/\bevaporated milk\b/.test(n),
      redMeat:/\b(beef|lamb|veal|pork|goat|kangaroo|red meat)\b/.test(n), poultry:/\b(chicken|turkey|duck|poultry)\b/.test(n),
      fish:/\b(fish|salmon|tuna|snapper|barramundi|cod|trout|sardine)\b/.test(n),
      legumes:/\b(bean|beans|lentil|lentils|chickpea|chickpeas|split pea|split peas|legume|legumes)\b/.test(n), tofu:/\btofu\b/.test(n),
      nuts:/\b(nut|nuts|almond|walnut|macadamia|hazelnut|cashew|peanut|seed|seeds|tahini)\b/.test(n),
      bread:/\bbread\b/.test(n), sausage:/\bsausage\b/.test(n), roll:/\b(roll|flat bread|flatbread|pita|lavash|naan|focaccia)\b/.test(n),
      cookedGrain:/\b(rice|pasta|noodle|barley|buckwheat|semolina|polenta|bulgur|quinoa|couscous)\b/.test(n)&&/\b(cooked|boiled|prepared)\b/.test(n),
      porridge:/\b(porridge|cooked oats|oatmeal)\b/.test(n), flakes:/\b(cereal flakes|corn flakes|wheat flakes|flakes)\b/.test(n), muesli:/\bmuesli\b/.test(n),
      crispbread:/\b(crispbread|crispbreads|cruskit|cruskits)\b/.test(n), cornChip:/\bcorn chips?\b/.test(n), eggWhite:/\b(egg )?white|albumen\b/.test(n), eggYolk:/\b(egg )?yolk\b/.test(n), crumpet:/\bcrumpet\b/.test(n), englishMuffin:/\benglish muffin\b/.test(n), scone:/\bscone\b/.test(n)
    };
  }

  function setUnit(food,key,label,multiplier,{replace=false,origin='',confidence='high'}={}){
    const m=finite(multiplier);if(!food||!key||m<=0)return false;
    food.units ||= {}; food.unitLabels ||= {}; food.unitOrigins ||= {};
    if(replace||food.units[key]===undefined){food.units[key]=m;food.unitLabels[key]=label;food.unitOrigins[key]={origin,confidence};return true;}
    if(!food.unitLabels[key])food.unitLabels[key]=label;
    return false;
  }

  function addGramMeasure(food,key,label,grams,meta={}){
    const b=basisInfo(food);if(!b.gScale||finite(grams)<=0)return false;
    return setUnit(food,key,label,finite(grams)*b.gScale,meta);
  }
  function addMlMeasure(food,key,label,ml,meta={}){
    const b=basisInfo(food);if(!b.mlScale||finite(ml)<=0)return false;
    return setUnit(food,key,label,finite(ml)*b.mlScale,meta);
  }

  function addMetricVolumeMeasures(food,context={}){
    const b=basisInfo(food);if(!b.mlScale)return food;
    const category=inferCategory(food,context),s=stateInfo(food,context),name=norm(`${food?.name||''} ${food?.category||''}`);
    const metric={origin:'Metric household volume measure',confidence:'high'};
    if(category==='drink'||s.milk)addMlMeasure(food,'cup','Cup (250 mL)',250,metric);
    if(category==='egg'&&s.eggWhite){addMlMeasure(food,'tsp','Teaspoon Egg White (5 mL)',5,metric);addMlMeasure(food,'tbsp','Tablespoon Egg White (15 mL)',15,{...metric,replace:false});return food;}
    if(/\b(oil|dressing|sauce|gravy|syrup|vinegar|pouring cream|liquid seasoning)\b/.test(name)){
      addMlMeasure(food,'tsp','Teaspoon (5 mL)',5,metric);
      addMlMeasure(food,'tbsp','Tablespoon (15 mL)',15,metric);
      addMlMeasure(food,'cup','Cup (250 mL)',250,metric);
      addMlMeasure(food,'drizzle','Small Drizzle (about 5 mL)',5,{origin:'HEC practical pourable-food measure; drizzle size varies',confidence:'approximate'});
    }
    return food;
  }

  function addGuidelineMeasures(food,context={}){
    const category=inferCategory(food,context),s=stateInfo(food,context),name=norm(`${food?.name||''} ${context.query||''}`);
    const meta={origin:GUIDELINE_SOURCE,confidence:'authoritative-standard-serve'};
    const notes=[];
    if(category==='fruit'){
      if(s.dried){if(addGramMeasure(food,'standardServe','Occasional dried-fruit serve (30 g)',30,meta))notes.push('30 g dried-fruit serve');}
      else if(/\b(apple|banana|orange|pear)\b/.test(name)){
        if(addGramMeasure(food,'item',`Medium ${/apple/.test(name)?'Apple':/banana/.test(name)?'Banana':/orange/.test(name)?'Orange':'Pear'} (150 g Australian standard fruit serve)`,150,{...meta,replace:true}))notes.push('150 g medium-fruit standard serve');
      }else{
        if(addGramMeasure(food,'standardServe','Australian standard fruit serve (150 g)',150,meta))notes.push('150 g fruit standard serve');
        if(/\b(apricot|kiwi|plum)\b/.test(name))addGramMeasure(food,'twoSmall','2 Small Fruit (150 g standard serve)',150,meta);
        if(/\b(diced|canned|tinned|pieces|fruit salad)\b/.test(name))addGramMeasure(food,'cup','1 Cup Diced/Canned Fruit (150 g standard serve)',150,meta);
      }
    }
    if(category==='vegetable'){
      if(s.leafy&&!s.cooked){if(addGramMeasure(food,'cup','1 Cup Raw Leafy/Salad Vegetable (75 g Australian standard serve)',75,meta))notes.push('1 cup / 75 g raw leafy standard serve');}
      else if(/\btomato\b/.test(name)){if(addGramMeasure(food,'standardServe','1 Medium Tomato (75 g Australian standard vegetable serve)',75,meta))notes.push('75 g medium-tomato standard serve');}
      else if(/\b(potato|sweet potato|taro|cassava)\b/.test(name)){if(addGramMeasure(food,'halfMedium','½ Medium Starchy Vegetable (75 g Australian standard serve)',75,meta))notes.push('75 g starchy-vegetable standard serve');}
      else if(s.legumes){if(addGramMeasure(food,'halfCup','½ Cup Cooked/Canned Legumes (75 g vegetable-group serve)',75,meta))notes.push('75 g vegetable-group serve');addGramMeasure(food,'cup','1 Cup Cooked/Canned Legumes (150 g protein-group serve)',150,meta);}
      else{
        if(addGramMeasure(food,'standardServe','Australian standard vegetable serve (75 g)',75,meta))notes.push('75 g vegetable standard serve');
        if(s.cooked||/\b(broccoli|spinach|carrot|pumpkin|cauliflower|beans|peas)\b/.test(name))addGramMeasure(food,'halfCup','½ Cup Cooked Vegetables (75 g standard serve)',75,meta);
      }
    }
    if(category==='grain'){
      if(s.bread){
        if(addGramMeasure(food,'regularSlice','Regular Slice Bread (40 g Australian standard grain serve)',40,{...meta,replace:false}))notes.push('40 g bread slice standard serve');
        addGramMeasure(food,'thickSlice','Thick / Toast Slice (about 45 g — check loaf/package)',45,{origin:'HEC practical bread measure · verify loaf/package',confidence:'approximate'});
      }
      else if(s.roll){if(addGramMeasure(food,'halfRoll','½ Medium Roll/Flat Bread (40 g standard serve)',40,meta))notes.push('40 g grain standard serve');}
      else if(s.porridge){if(addGramMeasure(food,'halfCup','½ Cup Cooked Porridge (120 g standard serve)',120,meta))notes.push('120 g cooked porridge serve');}
      else if(s.flakes){if(addGramMeasure(food,'twoThirdCup','⅔ Cup Cereal Flakes (30 g standard serve)',30,meta))notes.push('30 g cereal-flake serve');}
      else if(s.muesli){if(addGramMeasure(food,'quarterCup','¼ Cup Muesli (30 g standard serve)',30,meta))notes.push('30 g muesli serve');}
      else if(s.crispbread){if(addGramMeasure(food,'crispbread','Crispbread (about 11.7 g; 3 = 35 g standard serve)',35/3,{...meta,confidence:'guideline-derived'}))notes.push('crispbread count derived from 35 g / 3 crispbreads standard serve');addGramMeasure(food,'threeCrispbreads','3 Crispbreads (35 g standard serve)',35,meta);}
      else if(s.crumpet){if(addGramMeasure(food,'item','1 Crumpet (60 g standard serve)',60,meta))notes.push('60 g crumpet serve');}
      else if(s.englishMuffin||s.scone){if(addGramMeasure(food,'item',`1 Small ${s.englishMuffin?'English Muffin':'Scone'} (35 g standard serve)`,35,meta))notes.push('35 g grain serve');}
      else if(s.cookedGrain){
        // Eat for Health gives a 75–120 g range for 1/2 cup cooked grains. A range
        // cannot safely drive one exact nutrient multiplier, so grams stay primary.
        food.servingRangeHint='½ cup cooked grain is an Australian standard serve; the guideline range is 75–120 g. Use grams for an exact calculation.';
      }
    }
    if(s.cornChip){
      const cmeta={origin:'HEC practical snack measure · verify package where available',confidence:'approximate'};
      addGramMeasure(food,'smallHandful','Small Handful Corn Chips (about 25 g)',25,cmeta);
      notes.push('corn-chip handful is approximate; package serve or grams is more exact');
    }
    if(category==='meat'){
      if(s.sausage){
        const smeta={origin:'HEC practical sausage measures · approximate; verify butcher/package',confidence:'approximate'};
        addGramMeasure(food,'sausage','Sausage (about 75 g)',75,smeta);
        addGramMeasure(food,'thinSausage','Long Thin Sausage (about 73 g)',73,smeta);
        addGramMeasure(food,'thickSausage','Long Thick Sausage (about 101 g)',101,smeta);
        addGramMeasure(food,'cocktailSausage','Cocktail / Small Sausage (about 38 g)',38,smeta);
        notes.push('practical sausage sizes are approximate; grams/package are more exact');
      }
      if(s.redMeat&&s.cooked&&!s.sausage){if(addGramMeasure(food,'standardServe','Cooked Lean Red Meat — Australian standard serve (65 g)',65,meta))notes.push('65 g cooked red-meat serve');}
      else if(s.redMeat&&s.raw){food.servingRangeHint='Australian standard lean red-meat serve is about 90–100 g raw (65 g cooked). Use grams for an exact raw amount.';}
      else if(s.poultry){const g=s.raw?100:80;if(addGramMeasure(food,'standardServe',`${s.raw?'Raw':'Cooked'} Lean Poultry — Australian standard serve (${g} g)`,g,meta))notes.push(`${g} g poultry serve`);}
    }
    if(category==='seafood'||s.fish){const g=s.raw?115:100;if(addGramMeasure(food,'standardServe',`${s.raw?'Raw':'Cooked'} Fish — Australian standard serve (${g} g)`,g,meta))notes.push(`${g} g fish serve`);}
    if(category==='egg'){
      const emeta={origin:'HEC practical egg-size / separated-egg measures · verify package where applicable',confidence:'approximate'};
      const part=norm(context?.selected?.part||'');
      if(/yolk/.test(part)||s.eggYolk){
        addGramMeasure(food,'yolk','Egg Yolk (about 17 g)',17,emeta);notes.push('yolk count uses a practical large-egg yolk estimate');
      }else if(/white/.test(part)||s.eggWhite){
        addGramMeasure(food,'eggWhite','Egg White (about 33 g)',33,emeta);
        addGramMeasure(food,'tbsp','Tablespoon Egg White (15 mL / about 15 g)',15,{...emeta,confidence:'practical'});
        addGramMeasure(food,'mL','mL Egg White',1,{...emeta,confidence:'practical'});
        notes.push('egg white can be entered by white, tablespoon, mL or grams');
      }else{
        addGramMeasure(food,'smallEgg','Small Egg (~31 g edible portion)',31,emeta);
        addGramMeasure(food,'mediumEgg','Medium Egg (~37 g edible portion)',37,emeta);
        addGramMeasure(food,'largeEgg','Large Egg (~45 g edible portion)',45,emeta);
        addGramMeasure(food,'xLargeEgg','X-Large Egg (~52 g edible portion)',52,emeta);
        addGramMeasure(food,'jumboEgg','Jumbo Egg (~59 g edible portion)',59,emeta);
        addGramMeasure(food,'kingEgg','King-Size Egg (~64 g edible portion)',64,emeta);
        notes.push('whole-egg size/count measures use edible-portion references');
      }
    }
    if(s.legumes&&category!=='vegetable'){if(addGramMeasure(food,'cup','1 Cup Cooked/Canned Legumes (150 g Australian standard protein serve)',150,meta))notes.push('150 g legumes protein serve');}
    if(s.tofu){if(addGramMeasure(food,'standardServe','Tofu — Australian standard protein serve (170 g)',170,meta))notes.push('170 g tofu serve');}
    if(s.nuts){if(addGramMeasure(food,'standardServe','Nuts/Seeds — Australian standard protein serve (30 g)',30,meta))notes.push('30 g nuts/seeds serve');}
    if(category==='dairy'){
      if(s.evaporatedMilk){if(addMlMeasure(food,'halfCup','½ Cup Evaporated Milk (120 mL Australian standard dairy serve)',120,meta))notes.push('120 mL evaporated-milk serve');}
      else if(s.milk){if(addMlMeasure(food,'cup','1 Cup Milk (250 mL Australian standard dairy serve)',250,meta))notes.push('250 mL milk serve');}
      else if(s.hardCheese){if(addGramMeasure(food,'standardServe','2 Slices Hard Cheese (40 g Australian standard dairy serve)',40,meta))notes.push('40 g hard-cheese serve');addGramMeasure(food,'slice','Slice Hard Cheese (20 g; half standard serve)',20,meta);}
      else if(s.ricotta){if(addGramMeasure(food,'halfCup','½ Cup Ricotta (120 g Australian standard dairy serve)',120,meta))notes.push('120 g ricotta serve');}
      else if(s.yoghurt){if(addGramMeasure(food,'threeQuarterCup','¾ Cup Yoghurt (200 g Australian standard dairy serve)',200,meta))notes.push('200 g yoghurt serve');}
    }
    if(category==='drink'&&!isPackageFood(food)){
      const b=basisInfo(food);if(b.mlScale)addMlMeasure(food,'cup','1 Cup (250 mL)',250,{origin:'Metric household measure',confidence:'high'});
    }
    if(notes.length){food.servingFoundationSource=category==='egg'?'HEC practical egg-size / separated-egg measures · verify package where applicable':GUIDELINE_SOURCE;food.servingFoundationNotes=notes;}
    return food;
  }

  function addPackageCountUnits(food){
    if(!isPackageFood(food))return food;
    const text=String(food?.packageServingText||food?.serving||'');
    const b=basisInfo(food),serveScale=finite(food?.units?.serve);
    if(!serveScale)return food;
    const count=text.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(biscuits?|crackers?|slices?|pieces?|chips?|nuggets?|bars?|sachets?|sticks?|wafers?|rolls?|cakes?|teaspoons?|tablespoons?|tsp|tbsp|serves?|servings?)\b/i);
    if(count){
      const qty=finite(String(count[1]).replace(',','.')),raw=norm(count[2]).replace(/s$/,''),key=raw==='serving'?'serve':raw==='piece'?'piece':/^tea|^tsp/.test(raw)?'tsp':/^table|^tbsp/.test(raw)?'tbsp':raw;
      if(qty>0&&key!=='serve'){
        const mass=b.servingG?` (${fmt(b.servingG/qty)} g each)`:b.servingMl?` (${fmt(b.servingMl/qty)} mL each)`:'';
        const household=key==='tsp'?'Teaspoon':key==='tbsp'?'Tablespoon':raw.charAt(0).toUpperCase()+raw.slice(1);setUnit(food,key,`${household}${mass}`,serveScale/qty,{origin:'Explicit package serving count',confidence:'package-explicit'});
      }
    }
    return food;
  }

  function chooseDefault(food,context={}){
    const units=food?.units||{},category=inferCategory(food,context),s=stateInfo(food,context);
    if(explicitPackageServing(food)){
      const preferred=['bar','sachet','biscuit','cracker','crispbread','slice','chip','piece','nugget','stick','wafer','roll','cake','tsp','tbsp','serve'].find(k=>units[k]!==undefined);
      return preferred||food.defaultUnit||Object.keys(units)[0]||'g';
    }
    if(category==='fruit'){if(units.item!==undefined)return 'item';if(units.standardServe!==undefined)return 'standardServe';}
    if(category==='vegetable'){
      if(s.leafy&&units.cup!==undefined)return 'cup';
      if(/\btomato\b/.test(norm(food?.name))&&units.standardServe!==undefined)return 'standardServe';
      if(/\bpotato\b/.test(norm(food?.name))&&units.halfMedium!==undefined)return 'halfMedium';
      if(s.cooked&&units.halfCup!==undefined)return 'halfCup';
      if(units.standardServe!==undefined)return 'standardServe';
    }
    if(category==='dairy'){
      if(s.milk&&units.cup!==undefined)return 'cup';
      if(s.hardCheese&&units.slice!==undefined)return 'slice';
      if(s.ricotta&&units.halfCup!==undefined)return 'halfCup';
      if(s.yoghurt&&units.threeQuarterCup!==undefined)return 'threeQuarterCup';
    }
    if(category==='grain'){
      for(const k of ['regularSlice','slice','crispbread','halfRoll','halfCup','twoThirdCup','quarterCup','threeCrispbreads','item'])if(units[k]!==undefined)return k;
    }
    if(category==='meat'&&s.sausage&&units.sausage!==undefined)return 'sausage';
    if(s.cornChip&&units.smallHandful!==undefined)return 'smallHandful';
    if(category==='egg'){
      const part=norm(context?.selected?.part||'');
      if(/yolk/.test(part)&&units.yolk!==undefined)return 'yolk';
      if(/white/.test(part)&&units.tbsp!==undefined)return 'tbsp';
      const chosen=norm(context?.selected?.size||'');
      if(/x large|extra large/.test(chosen)&&units.xLargeEgg!==undefined)return 'xLargeEgg';
      if(/jumbo/.test(chosen)&&units.jumboEgg!==undefined)return 'jumboEgg';
      if(/king/.test(chosen)&&units.kingEgg!==undefined)return 'kingEgg';
      if(/medium/.test(chosen)&&units.mediumEgg!==undefined)return 'mediumEgg';
      if(/large/.test(chosen)&&units.largeEgg!==undefined)return 'largeEgg';
      if(/small/.test(chosen)&&units.smallEgg!==undefined)return 'smallEgg';
      if(units.largeEgg!==undefined)return 'largeEgg';
    }
    if(['meat','seafood','egg'].includes(category)&&units.standardServe!==undefined)return 'standardServe';
    if(units.cup!==undefined&&category==='drink')return 'cup';
    return (food.defaultUnit&&units[food.defaultUnit]!==undefined)?food.defaultUnit:(Object.keys(units)[0]||'g');
  }

  function sanitizeUnits(food,context={}){
    if(!food)return food;
    food.units ||= {}; food.unitLabels ||= {};
    const category=inferCategory(food,context);
    const selectedPart=norm(context?.selected?.part||food?.guidedSelections?.part||'');
    if(category==='egg'&&/yolk|white/.test(selectedPart)){for(const k of ['egg','smallEgg','mediumEgg','largeEgg','xLargeEgg','jumboEgg','kingEgg','standardServe']){delete food.units[k];delete food.unitLabels[k];}}
    if(category==='egg'&&!/yolk|white/.test(selectedPart)){
      const chosen=norm(context?.selected?.size||food?.guidedSelections?.size||'');
      const sizeKey=/x large|extra large/.test(chosen)?'xLargeEgg':/jumbo/.test(chosen)?'jumboEgg':/king/.test(chosen)?'kingEgg':/medium/.test(chosen)?'mediumEgg':/large/.test(chosen)?'largeEgg':/small/.test(chosen)?'smallEgg':'';
      if(sizeKey){
        for(const k of ['egg','smallEgg','mediumEgg','largeEgg','xLargeEgg','jumboEgg','kingEgg','standardServe'])if(k!==sizeKey){delete food.units[k];delete food.unitLabels[k];}
        food.lockedServingUnit=sizeKey;
      }
    }
    // Remove stale guideline measures that were attached because a flavour word
    // looked like another food family (e.g. Cheese Supreme Corn Chips -> Slice).
    if(category==='snack'){
      const snackState=stateInfo(food,context);
      for(const k of ['slice','regularSlice','thickSlice','standardServe']){
        const label=norm(food.unitLabels?.[k]||''),origin=norm(food.unitOrigins?.[k]?.origin||'');
        if((snackState.cornChip&&/slice/i.test(k))||/cheese|bread|grain serve|dairy/.test(label+' '+origin)){delete food.units[k];delete food.unitLabels[k];if(food.unitOrigins)delete food.unitOrigins[k];}
      }
    }
    if(isPackageFood(food)){
      for(const key of Object.keys(food.units)){
        const label=norm(food.unitLabels?.[key]||''),origin=norm(food.unitOrigins?.[key]?.origin||'');
        if(/australian standard|vegetable group|fruit serve|grain serve|dietary guidelines/.test(`${label} ${origin}`)){delete food.units[key];delete food.unitLabels[key];if(food.unitOrigins)delete food.unitOrigins[key];}
      }
      const basis=basisInfo(food);if(basis.servingG>0&&basis.servingG<=250){delete food.units.kg;delete food.unitLabels.kg;if(food.unitOrigins)delete food.unitOrigins.kg;}
    }
    // Category-specific measures must never leak into another food (the 0.6.25
    // cheese test exposed an Egg measure in a cheese unit list).
    if(category!=='egg'){for(const k of ['egg','smallEgg','mediumEgg','largeEgg','xLargeEgg','jumboEgg','kingEgg','eggWhite','yolk']){delete food.units[k];delete food.unitLabels[k];}}
    for(const [k,label] of Object.entries({...food.unitLabels})){if(/^(?:1\s*)?100\s*g\s*(?:serving|serve)$/i.test(String(label||'').trim())&&food.units.g!==undefined){delete food.units[k];delete food.unitLabels[k];}}
    // Suppress exact duplicate labels when two source keys describe the same
    // practical measure. Keep the food's own default key first.
    const preferred=[food.defaultUnit,'slice','serve','item','piece','g','mL'].filter(Boolean),seen=new Map();
    for(const key of [...new Set([...preferred,...Object.keys(food.units)])]){
      if(food.units[key]===undefined)continue;const label=norm(food.unitLabels[key]||key);if(!label)continue;
      if(seen.has(label)&&key!==food.defaultUnit){delete food.units[key];delete food.unitLabels[key];continue;}seen.set(label,key);
    }
    return food;
  }

  function applyToFood(food,context={}){
    if(!food)return food;
    if(SEM?.applyToFood)SEM.applyToFood(food);
    const originalDefaultUnit=food.defaultUnit,originalDefaultAmount=Number(food.defaultAmount);
    food.units ||= {}; food.unitLabels ||= {};
    sanitizeUnits(food,context);
    // Always retain safe base units already present. Do not create an invented gram
    // conversion from a package serve whose mass is unknown.
    addPackageCountUnits(food);
    if(isPackageFood(food)){
      // Package/product foods must not borrow a household measure merely from a
      // descriptive word in the product name. Use package metadata or safe metric
      // units only; never invent a cheese slice for cheese-flavoured corn chips.
      food.servingFoundationSource=explicitPackageServing(food)?'Explicit package serving data':'Package/product data · no invented household conversion';
    }else addGuidelineMeasures(food,context);
    addMetricVolumeMeasures(food,context);
    if(Number(food.units.g)>0&&food.units.kg===undefined)setUnit(food,'kg','kg',Number(food.units.g)*1000,{origin:'Exact metric conversion',confidence:'high'});
    if(Number(food.units.mL)>0&&food.units.L===undefined)setUnit(food,'L','L',Number(food.units.mL)*1000,{origin:'Exact metric conversion',confidence:'high'});
    // A second sanitation pass is deliberate: category measures are added above,
    // then any alternatives made redundant by a guided choice (for example egg
    // sizes other than the selected Large) are removed before the dropdown/default.
    sanitizeUnits(food,context);
    const chosen=chooseDefault(food,context);if(chosen&&food.units[chosen]!==undefined){food.servingDefaultUnit=chosen;food.defaultUnit=chosen;if(chosen===originalDefaultUnit&&Number.isFinite(originalDefaultAmount)&&originalDefaultAmount>0)food.defaultAmount=originalDefaultAmount;else if(chosen==='g')food.defaultAmount=100;else if(chosen==='mL')food.defaultAmount=100;else food.defaultAmount=1;}
    const fractionCandidates=['bar','bottle','can','tub','pie','slice','regularSlice','thickSlice','serve','portion','chip','cracker','crispbread','item'];food.fractionUnits=fractionCandidates.filter(k=>food.units?.[k]!==undefined);
    food.servingMeasureVersion=VERSION;
    return SEM?.applyToFood?SEM.applyToFood(food):food;
  }

  function diagnostic(food,context={}){
    const f=applyToFood(clone(food),context),policy=SEM?.servingPolicy?.(f);return {defaultUnit:f.servingDefaultUnit||f.defaultUnit,units:Object.entries(f.units||{}).map(([key,multiplier])=>({key,label:f.unitLabels?.[key]||key,multiplier})),source:f.servingFoundationSource||'',hint:f.servingRangeHint||'',category:inferCategory(f,context),packageExplicit:explicitPackageServing(f),semanticType:policy?.semanticType||'',nutritionBasis:policy?.nutritionBasis||'',allowedUnitFamily:policy?.allowedUnitFamily||''};
  }

  global.HECServingFoundation={version:VERSION,GUIDELINE_SOURCE,norm,basisInfo,isPackageFood,explicitPackageServing,inferCategory,stateInfo,sanitizeUnits,applyToFood,diagnostic};
})(typeof window!=='undefined'?window:globalThis);
