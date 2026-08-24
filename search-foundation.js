/* Healthy Eating Companion — Food Intelligence Foundation 0.6.32
   Pure query/taxonomy utilities. UI and food-database access remain in alpha06.js.

   Alpha 0.6.32 principles:
   - Partial text is a search prefix, never automatically a food identity.
   - Known food concepts are predicted before raw product/database rows.
   - The user's words pre-fill attributes so HEC never asks the same question twice.
   - Source/origin is an early branch only when it materially changes the search path.
   - Nutrition records remain evidence; they do not dictate the wording/order of every question.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const REG=global.HECAustralianEntityRegistry;
  const WORD_NUMBERS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,half:.5,a:1,an:1};
  const IRREGULAR={bananas:'banana',oranges:'orange',apples:'apple',potatoes:'potato',tomatoes:'tomato',berries:'berry',cherries:'cherry',loaves:'loaf',leaves:'leaf',fries:'fries',fish:'fish',cheese:'cheese',rice:'rice',pasta:'pasta',couscous:'couscous',eggs:'egg',sausages:'sausage'};
  const UNIT_WORDS={
    g:['g','gram','grams'],ml:['ml','millilitre','millilitres','milliliter','milliliters'],kg:['kg','kilogram','kilograms'],L:['l','litre','litres','liter','liters'],
    item:['item','items'],piece:['piece','pieces'],slice:['slice','slices'],serve:['serve','serves','serving','servings'],
    cup:['cup','cups'],tbsp:['tablespoon','tablespoons','tbsp'],tsp:['teaspoon','teaspoons','tsp'],
    bar:['bar','bars'],biscuit:['biscuit','biscuits'],cracker:['cracker','crackers'],sachet:['sachet','sachets'],packet:['packet','packets'],can:['can','cans'],bottle:['bottle','bottles'],
    pie:['pie','pies'],sausage:['sausage','sausages'],egg:['egg','eggs']
  };
  const UNIT_LOOKUP={};Object.entries(UNIT_WORDS).forEach(([u,words])=>words.forEach(w=>UNIT_LOOKUP[w]=u));

  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function singularWord(w){if(IRREGULAR[w])return IRREGULAR[w];if(/ies$/.test(w)&&w.length>4)return w.slice(0,-3)+'y';if(/(ches|shes|xes|zes)$/.test(w))return w.slice(0,-2);if(/s$/.test(w)&&!/(ss|us|is)$/.test(w)&&w.length>3)return w.slice(0,-1);return w;}
  function singular(v){return norm(v).split(' ').filter(Boolean).map(singularWord).join(' ');}
  function title(v){return String(v||'').replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bAnd\b/g,'&');}
  function tokens(v){return singular(v).split(' ').filter(Boolean);}

  // sourcePolicy: early = source changes the search universe; contextual = ask only
  // when records make it useful; skip = not normally useful for the basic food.
  const CONCEPTS=[
    {key:'pie',label:'Pie',aliases:['pie'],category:'pie',sourcePolicy:'early',facetOrder:['kind','filling','protein','source','form','size'],natural:{unit:'pie',label:'Individual Pie (about 175 g)',grams:175}},
    {key:'sausage',label:'Sausage',aliases:['sausage','snag','sausage sizzle','bunnings sausage','bunnings snag'],category:'meat',sourcePolicy:'early',facetOrder:['protein','flavour','source','prep','addedFat','size'],natural:{unit:'sausage',label:'Sausage (about 75 g)',grams:75}},
    {key:'banana',label:'Banana',aliases:['banana'],category:'fruit',sourcePolicy:'skip',facetOrder:['variety','form'],natural:{unit:'item',label:'Medium Banana (150 g Australian standard fruit serve)',grams:150}},
    {key:'orange',label:'Orange',aliases:['orange'],category:'fruit',sourcePolicy:'skip',facetOrder:['variety','form'],natural:{unit:'item',label:'Medium Orange (150 g Australian standard fruit serve)',grams:150}},
    {key:'apple',label:'Apple',aliases:['apple'],category:'fruit',sourcePolicy:'skip',facetOrder:['variety','form'],natural:{unit:'item',label:'Medium Apple (150 g Australian standard fruit serve)',grams:150}},
    {key:'pear',label:'Pear',aliases:['pear'],category:'fruit',sourcePolicy:'skip',facetOrder:['variety','form'],natural:{unit:'item',label:'Medium Pear (150 g Australian standard fruit serve)',grams:150}},
    {key:'mandarin',label:'Mandarin',aliases:['mandarin','tangerine'],category:'fruit',sourcePolicy:'skip',facetOrder:['variety','form'],natural:{unit:'item',label:'Mandarin (about 90 g edible portion)',grams:90}},
    {key:'grape',label:'Grapes',aliases:['grape'],category:'fruit',sourcePolicy:'skip',facetOrder:['variety','form'],natural:{unit:'g',label:'g',grams:1}},
    {key:'mango',label:'Mango',aliases:['mango'],category:'fruit',sourcePolicy:'skip',facetOrder:['variety','form'],natural:{unit:'item',label:'Mango',grams:200}},
    {key:'strawberry',label:'Strawberries',aliases:['strawberry'],category:'fruit',sourcePolicy:'skip',facetOrder:['form'],natural:{unit:'g',label:'g',grams:1}},
    {key:'potato',label:'Potato',aliases:['potato','spud','potato scallop','potato cake','potato fritter'],category:'vegetable',sourcePolicy:'contextual',facetOrder:['variety','form','prep','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'tomato',label:'Tomato',aliases:['tomato'],category:'vegetable',sourcePolicy:'skip',facetOrder:['variety','form','prep'],natural:{unit:'item',label:'Medium Tomato (about 120 g)',grams:120}},
    {key:'capsicum',label:'Capsicum',aliases:['capsicum','bell pepper'],category:'vegetable',sourcePolicy:'skip',facetOrder:['variety','form','prep'],natural:{unit:'g',label:'g',grams:1}},
    {key:'carrot',label:'Carrot',aliases:['carrot'],category:'vegetable',sourcePolicy:'skip',facetOrder:['form','prep'],natural:{unit:'g',label:'g',grams:1}},
    {key:'pumpkin',label:'Pumpkin',aliases:['pumpkin'],category:'vegetable',sourcePolicy:'contextual',facetOrder:['variety','form','prep','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'broccoli',label:'Broccoli',aliases:['broccoli'],category:'vegetable',sourcePolicy:'skip',facetOrder:['form','prep'],natural:{unit:'g',label:'g',grams:1}},
    {key:'cauliflower',label:'Cauliflower',aliases:['cauliflower'],category:'vegetable',sourcePolicy:'skip',facetOrder:['form','prep'],natural:{unit:'g',label:'g',grams:1}},
    {key:'onion',label:'Onion',aliases:['onion'],category:'vegetable',sourcePolicy:'skip',facetOrder:['variety','form','prep'],natural:{unit:'g',label:'g',grams:1}},
    {key:'cheese',label:'Cheese',aliases:['cheese'],category:'dairy',sourcePolicy:'early',facetOrder:['type','fat','style','form','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'milk',label:'Milk',aliases:['milk'],category:'dairy',sourcePolicy:'early',facetOrder:['type','fat','source'],natural:{unit:'mL',label:'mL',grams:1}},
    {key:'yoghurt',label:'Yoghurt',aliases:['yoghurt','yogurt'],category:'dairy',sourcePolicy:'early',facetOrder:['type','fat','flavour','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'egg',label:'Egg',aliases:['egg'],category:'egg',sourcePolicy:'skip',facetOrder:['species','part','size','prep','addedFat'],natural:{unit:'egg',label:'Egg',grams:52},supplemental:{species:['Chicken','Duck','Quail'],part:['Whole','Yolk','White'],prep:['Raw','Boiled','Poached','Microwave Poached','Fried','Baked / Oven','Air Fried'],size:['Small','Medium','Large','X-Large','Jumbo','King-Size'],addedFat:['No added fat/oil']}},
    {key:'bread',label:'Bread',aliases:['bread','toast','toasted bread'],category:'grain',sourcePolicy:'early',facetOrder:['type','grain','source','prep','size'],natural:{unit:'slice',label:'Slice',grams:40}},
    {key:'rice',label:'Rice',aliases:['rice'],category:'grain',sourcePolicy:'contextual',facetOrder:['type','grain','prep','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'pasta',label:'Pasta',aliases:['pasta','spaghetti','macaroni','penne','fettuccine'],category:'grain',sourcePolicy:'contextual',facetOrder:['type','prep','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'cereal',label:'Breakfast Cereal',aliases:['cereal'],category:'grain',sourcePolicy:'early',facetOrder:['type','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'oats',label:'Oats',aliases:['oats','oatmeal','porridge'],category:'grain',sourcePolicy:'contextual',facetOrder:['type','prep','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'beef',label:'Beef',aliases:['beef'],category:'meat',sourcePolicy:'contextual',facetOrder:['cut','fat','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'chicken',label:'Chicken',aliases:['chicken'],category:'meat',sourcePolicy:'contextual',facetOrder:['cut','skin','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'pork',label:'Pork',aliases:['pork'],category:'meat',sourcePolicy:'contextual',facetOrder:['cut','fat','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'lamb',label:'Lamb',aliases:['lamb'],category:'meat',sourcePolicy:'contextual',facetOrder:['cut','fat','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'steak',label:'Steak',aliases:['steak'],category:'meat',sourcePolicy:'contextual',facetOrder:['protein','cut','fat','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'fish',label:'Fish',aliases:['fish'],category:'seafood',sourcePolicy:'contextual',facetOrder:['type','form','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'salmon',label:'Salmon',aliases:['salmon'],category:'seafood',sourcePolicy:'contextual',facetOrder:['form','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'tuna',label:'Tuna',aliases:['tuna'],category:'seafood',sourcePolicy:'early',facetOrder:['form','prep','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'prawn',label:'Prawns',aliases:['prawn','shrimp'],category:'seafood',sourcePolicy:'contextual',facetOrder:['type','prep','addedFat','source'],natural:{unit:'g',label:'g',grams:1}},
    {key:'coffee',label:'Coffee',aliases:['coffee','cappuccino','latte','flat white','espresso'],category:'drink',sourcePolicy:'early',facetOrder:['type','milk','size','source'],natural:{unit:'serve',label:'Serve',grams:1}},
    {key:'tea',label:'Tea',aliases:['tea'],category:'drink',sourcePolicy:'contextual',facetOrder:['type','milk','size','source'],natural:{unit:'serve',label:'Serve',grams:1}},
    {key:'juice',label:'Juice',aliases:['juice'],category:'drink',sourcePolicy:'early',facetOrder:['type','source','size'],natural:{unit:'mL',label:'mL',grams:1}},
    {key:'burger',label:'Burger',aliases:['burger','hamburger'],category:'prepared',sourcePolicy:'early',facetOrder:['protein','type','source','size'],natural:{unit:'serve',label:'Burger',grams:1}},
    {key:'sandwich',label:'Sandwich',aliases:['sandwich','toastie'],category:'prepared',sourcePolicy:'early',facetOrder:['type','protein','source','size'],natural:{unit:'serve',label:'Sandwich',grams:1}},
    {key:'pizza',label:'Pizza',aliases:['pizza'],category:'prepared',sourcePolicy:'early',facetOrder:['type','topping','source','size'],natural:{unit:'slice',label:'Slice',grams:1}},
    {key:'curry',label:'Curry',aliases:['curry'],category:'prepared',sourcePolicy:'early',facetOrder:['protein','type','source','size'],natural:{unit:'g',label:'g',grams:1}},
    {key:'soup',label:'Soup',aliases:['soup'],category:'prepared',sourcePolicy:'early',facetOrder:['type','source','size'],natural:{unit:'g',label:'g',grams:1}},
    {key:'sausage-roll',label:'Sausage Roll',aliases:['sausage roll'],category:'prepared',sourcePolicy:'early',facetOrder:['source','size'],natural:{unit:'serve',label:'Sausage Roll',grams:1}},
    {key:'cake',label:'Cake',aliases:['cake'],category:'prepared',sourcePolicy:'early',facetOrder:['type','source','size'],natural:{unit:'slice',label:'Slice (check serving size)',grams:1}},
    {key:'corn-chip',label:'Corn Chips',aliases:['corn chip'],category:'snack',sourcePolicy:'early',facetOrder:['flavour','source','size'],natural:{unit:'g',label:'g',grams:1},supplemental:{flavour:['Plain / Salted','Flavoured']}},
    {key:'cracker',label:'Crackers',aliases:['cracker','sao'],category:'snack',sourcePolicy:'early',facetOrder:['type','flavour','source','size'],natural:{unit:'biscuit',label:'Cracker / Biscuit',grams:1}},
    {key:'biscuit',label:'Biscuit',aliases:['biscuit','cookie'],category:'snack',sourcePolicy:'early',facetOrder:['type','flavour','source','size'],natural:{unit:'biscuit',label:'Biscuit',grams:1}},
    {key:'chocolate',label:'Chocolate',aliases:['chocolate'],category:'snack',sourcePolicy:'early',facetOrder:['type','source','size'],natural:{unit:'g',label:'g',grams:1}},
    {key:'icecream',label:'Ice Cream',aliases:['ice cream','gelato'],category:'dairy',sourcePolicy:'early',facetOrder:['type','flavour','source','size'],natural:{unit:'g',label:'g',grams:1}}
  ];

  const MODIFIER_WORDS=new Set(norm(`homemade home grown homegrown home made commercial packaged ready eat bakery fresh frozen purchased takeaway restaurant raw cooked boiled poached fried grilled baked roasted oven steamed microwaved microwave toasted toast air fryer air fried bbq barbecued plain salted flavoured flavored regular reduced low light full fat lean skin skinless peeled unpeeled sliced slice diced chopped whole white yolk albumen canned tinned dry dried prepared individual family jumbo xlarge extra large large medium small beef lamb pork chicken duck quail turkey kangaroo fish seafood vegetable veggie fruit sweet savoury savory curry garlic herb honey natural tasty cheddar processed cottage blue vein brie camembert sourdough white brown wholemeal wholegrain multigrain basmati jasmine long grain short grain red green yellow navel valencia cavendish lady finger granny smith pink royal gala fuji no added fat oil with oil`).split(' '));

  const PATTERNS={
    kind:[['Savoury',/\bsavou?ry\b/],['Sweet',/\bsweet\b/]],
    source:[['Home Made / Grown',/\bhome\s*made\b|\bhomemade\b|\bhome\s*grown\b|\bhomegrown\b/],['Bakery / Fresh',/\bbakery\b|\bcafe\b/],['Purchased Frozen',/\bpurchased frozen\b|\bfrozen\b/],['Takeaway / Restaurant',/\btakeaway\b|\brestaurant\b|\bfast food\b|\bfood outlet\b/],['Commercial / Packaged',/\bcommercial\b|\bpackaged\b|\bready to eat\b|\bbought\b|\bstore brand\b|\bsupermarket\b/],['Canned / Tinned',/\bcanned\b|\btinned\b/]],
    prep:[['Raw',/\braw\b/],['Boiled',/\bboiled\b|\bhard boiled\b/],['Microwave Poached',/\bmicrowave\s*poached\b/],['Poached',/\bpoached\b/],['Toasted',/\btoast(?:ed)?\b/],['Air Fried',/\bair\s*fried\b|\bair\s*fryer\b/],['Fried',/\bfried\b|\bpan\s*fried\b/],['Grilled',/\bgrilled\b/],['Baked / Oven',/\bbaked\b|\boven\s*baked\b|\boven\b/],['Roasted',/\broasted\b/],['Steamed',/\bsteamed\b/],['Microwaved',/\bmicrowav/],['Barbecued / BBQ',/\bbbq\b|\bbarbecu/],['Cooked',/\bcooked\b/]],
    protein:[['Beef',/\bbeef\b/],['Lamb',/\blamb\b|\bmutton\b/],['Pork',/\bpork\b/],['Chicken',/\bchicken\b/],['Turkey',/\bturkey\b/],['Kangaroo',/\bkangaroo\b/],['Fish / Seafood',/\bfish\b|\bseafood\b|\bsalmon\b|\btuna\b|\bprawn\b/],['Vegetarian',/\bvegetarian\b|\bveggie\b|\bplant based\b|\bmeat alternative\b/]],
    species:[['Chicken',/\bchicken\b/],['Duck',/\bduck\b/],['Quail',/\bquail\b/]],
    size:[['King-Size',/\bking[ -]?size\b/],['Jumbo',/\bjumbo\b/],['X-Large',/\bx\s*large\b|\bextra\s*large\b/],['Large',/\blarge\b/],['Medium',/\bmedium\b/],['Small',/\bsmall\b/],['Long Thin',/\blong\s*thin\b/],['Long Thick',/\blong\s*thick\b/],['Thin',/\bthin\b/],['Thick',/\bthick\b/],['Cocktail / Small',/\bcocktail\b/]],
    part:[['Whole',/\bwhole\b/],['White',/\bwhite\b|\balbumen\b/],['Yolk',/\byolk\b/]],
    addedFat:[['No added fat/oil',/\bno\s+(?:added\s+)?(?:fat|oil)\b|\bwithout\s+(?:fat|oil)\b/],['Added fat/oil',/\badded\s+(?:fat|oil)\b|\bwith\s+(?:fat|oil)\b/]],
    fat:[['Regular Fat',/\bregular fat\b/],['Reduced / Light',/\breduced fat\b|\blow fat\b|\blight\b/],['Lean',/\blean\b/],['Untrimmed',/\buntrimmed\b/]],
    flavour:[['Plain / Salted',/\bplain\b|\bsalted\b/],['Flavoured',/\bflavou?red\b|\bherb\b|\bgarlic\b|\bhoney\b|\bchilli\b|\bpepper\b|\bcheese\b|\bnacho\b|\bbarbecue\b|\bbbq\b/]],
    style:[['Natural',/\bnatural\b/],['Processed',/\bprocessed\b/]],
    form:[['Peeled',/\bpeeled\b/],['Unpeeled',/\bunpeeled\b/],['Sliced',/\bsliced\b/],['Diced / Chopped',/\bdiced\b|\bchopped\b/],['Dried',/\bdried\b/],['Frozen',/\bfrozen\b/],['Juice',/\bjuice\b/],['Whole',/\bwhole\b/],['Grated',/\bgrated\b|\bshredded\b/],['Block / Piece',/\bblock\b|\bpiece\b/]],
    skin:[['Skinless',/\bskinless\b|\bwithout skin\b/],['With Skin',/\bwith skin\b|\bskin and fat\b/]],
    grain:[['White',/\bwhite\b/],['Wholemeal / Wholegrain',/\bwholemeal\b|\bwholegrain\b/],['Multigrain',/\bmultigrain\b|\bmixed grain\b/],['Brown',/\bbrown\b/],['Sourdough',/\bsour\s*dough\b|\bsourdough\b/]],
    milk:[['No Milk',/\bblack\b|\bno milk\b/],['Full Cream Milk',/\bfull cream\b|\bwhole milk\b/],['Light Milk',/\blight milk\b|\breduced fat milk\b/],['Skim Milk',/\bskim\b/],['Plant Milk',/\bsoy\b|\balmond\b|\boat milk\b/]]
  };

  function parseQuery(raw){
    let rawText=String(raw||''),explicitFraction=null;
    const fm=rawText.match(/^\s*(\d+)\s*\/\s*(\d+)(?=\s|$)/);
    if(fm&&Number(fm[2])){explicitFraction=Number(fm[1])/Number(fm[2]);rawText=rawText.slice(fm[0].length).trim();}
    const n=norm(rawText),ws=n.split(' ').filter(Boolean);let quantity=explicitFraction,unit='',keep=[];
    for(let i=0;i<ws.length;i++){
      const w=ws[i];
      if(quantity===null&&(Number.isFinite(Number(w))||WORD_NUMBERS[w]!==undefined)){quantity=Number.isFinite(Number(w))?Number(w):WORD_NUMBERS[w];continue;}
      if(!unit&&UNIT_LOOKUP[w]){unit=UNIT_LOOKUP[w];if(['item','piece','slice','serve','pie','sausage','egg','biscuit','cracker','bar','sachet','packet','can','bottle'].includes(unit))keep.push(singularWord(w));continue;}
      keep.push(w);
    }
    const food=singular(keep.join(' ')),entities=REG?.identify?REG.identify(raw):[];return {raw:String(raw||''),normalised:n,food,quantity:quantity===null?1:quantity,unit,tokens:tokens(food),entities,entityResidual:REG?.stripRecognisedEntities?REG.stripRecognisedEntities(food):food};
  }

  function conceptFromQuery(raw){
    const p=typeof raw==='object'&&raw.food!==undefined?raw:parseQuery(raw),q=` ${p.food} `;let hits=[];
    CONCEPTS.forEach(c=>(c.aliases||[]).forEach(a=>{const an=singular(a);if(q.includes(` ${an} `))hits.push({c,a:an,len:an.split(' ').length,pos:p.food.lastIndexOf(an)});}));
    if(!hits.length){const registryConcept=REG?.foodConcept?REG.foodConcept(p.raw||p.food):'';if(registryConcept)return CONCEPTS.find(c=>c.key===registryConcept)||null;return null;}hits.sort((a,b)=>b.len-a.len||b.pos-a.pos);return hits[0].c;
  }

  // Predict concepts before a complete word is typed. Predictions do not become
  // the selected food until the user taps them or completes an exact concept.
  function predictConcepts(raw,limit=6){
    const p=parseQuery(raw),q=p.food;if(!q)return [];
    const words=q.split(' '),last=words[words.length-1]||'',before=words.slice(0,-1).join(' ');
    if(last.length<2)return [];
    const scored=[];
    for(const c of CONCEPTS){
      for(const aliasRaw of c.aliases||[]){
        const alias=singular(aliasRaw),aWords=alias.split(' '),aLast=aWords[aWords.length-1]||'';
        let score=0;
        if(alias===q)score=2000;
        else if(alias.startsWith(q))score=1500-q.length;
        else if(last.length>=2&&aLast.startsWith(last)&&(!before||alias.startsWith(before)))score=1200-last.length;
        // Predict by genuine prefixes, not arbitrary substrings (e.g. App must not
        // suggest Cappuccino merely because it contains those letters).
        else if(q.length>=4&&aWords.some(w=>w.startsWith(last))&&(!before||alias.startsWith(before)))score=700;
        if(score)scored.push({concept:c,alias,score});
      }
    }
    const best=new Map();for(const x of scored){const old=best.get(x.concept.key);if(!old||x.score>old.score)best.set(x.concept.key,x);}
    return [...best.values()].sort((a,b)=>b.score-a.score||a.concept.label.localeCompare(b.concept.label)).slice(0,limit).map(x=>({...x.concept,predictedAlias:x.alias,predictionScore:x.score}));
  }

  function knownFacetToken(t){if(MODIFIER_WORDS.has(t))return true;for(const list of Object.values(PATTERNS))for(const [,re] of list)if(re.test(t))return true;return false;}
  function likelyBrandPrefix(parsed,concept){
    const regBrand=REG?.primary?REG.primary(parsed.raw||parsed.food,['brand']):null;if(regBrand)return norm(regBrand.entity.name);
    if(!concept)return '';
    const q=parsed.food,aliases=(concept.aliases||[]).map(singular).sort((a,b)=>b.length-a.length),a=aliases.find(x=>q.includes(x));if(!a)return '';
    const before=q.slice(0,q.indexOf(a)).trim();if(!before)return '';
    const b=before.split(' ').filter(Boolean),unknown=b.filter(x=>!knownFacetToken(x));return unknown.join(' ');
  }
  function labelFor(parsed,concept){const exact=REG?.exactEntity?REG.exactEntity(parsed.raw||parsed.food,['brand','retailer','restaurant']):null;if(exact)return exact.name;if(!concept)return title(parsed.food);const brandPrefix=likelyBrandPrefix(parsed,concept);if(brandPrefix)return title(parsed.food);return title(parsed.food||singular(concept.label));}

  function classifyText(text){const n=norm(text),out={};Object.entries(PATTERNS).forEach(([facet,list])=>{for(const [label,re] of list){if(re.test(n)){out[facet]=label;break;}}});return out;}

  function descriptorFeatures(name,concept){
    const raw=String(name||''),parts=raw.split(',').map(x=>norm(x)).filter(Boolean),out=classifyText(raw),category=concept?.category||'generic';let extras=[];
    // Egg records are structured enough to derive the requested sequence.
    if(category==='egg'){
      const n=norm(raw);if(/\begg\s*,\s*chicken\b|\bchicken\b/.test(n))out.species='Chicken';if(/\bduck\b/.test(n))out.species='Duck';if(/\bquail\b/.test(n))out.species='Quail';
      if(/\byolk\b/.test(n))out.part='Yolk';else if(/\bwhite\b|\balbumen\b/.test(n))out.part='White';else if(/\bwhole\b/.test(n))out.part='Whole';
      if(/no fat added|no added fat/.test(n))out.addedFat='No added fat/oil';
    }
    for(let i=1;i<parts.length;i++){
      const s=parts[i];if(!s)continue;let claimed=false;
      for(const list of Object.values(PATTERNS)){if(list.some(([,re])=>re.test(s))){claimed=true;break;}}
      if(claimed)continue;if(/^(no added|added |approx|with |without |from |as purchased|flesh|skin|fat|drained|edible)/.test(s))continue;extras.push(s);
    }
    if(extras.length){
      if(category==='fruit'||category==='vegetable')out.variety=title(extras[0]);
      else if(category==='dairy'||category==='seafood'||category==='grain'||category==='drink'||category==='snack')out.type=title(extras[0]);
      else if(category==='meat')out.cut=title(extras[0]);
      else if(category==='prepared')out.type=title(extras[0]);
      else if(category==='pie')out.filling=title(extras[0]);
      else if(category!=='egg')out.type=title(extras[0]);
    }
    if(category==='pie'){
      const n=norm(raw);if(/\bsweet\b|\bapple\b|\bfruit\b|\bcustard\b|\blemon\b/.test(n))out.kind='Sweet';else if(/\bsavou?ry\b|\bmeat\b|\bchicken\b|\bsteak\b|\bkidney\b|\bvegetable\b|\bseafood\b|\bfish\b/.test(n))out.kind='Savoury';
      if(/\bchicken\b.*\bvegetable\b|\bvegetable\b.*\bchicken\b/.test(n))out.filling='Chicken & Vegetable';else if(/\bsteak\b.*\bkidney\b|\bsteak and kidney\b/.test(n))out.filling='Steak & Kidney';else if(/\bapple\b/.test(n))out.filling='Apple';else if(/\bmeat\b/.test(n))out.filling='Meat';else if(/\bseafood\b|\bfish\b|\bsalmon\b|\btuna\b|\bprawn\b/.test(n))out.filling='Seafood';else if(/\bvegetable\b/.test(n))out.filling='Vegetable';
    }
    return out;
  }

  function queryFacetSeeds(parsed,concept){
    const out=classifyText(parsed.food),q=parsed.food;
    if(concept){
      const aliases=(concept.aliases||[]).map(singular),conceptWords=new Set(aliases.flatMap(a=>a.split(' '))),remaining=q.split(' ').filter(w=>!conceptWords.has(w));
      if((concept.category==='fruit'||concept.category==='vegetable')&&remaining.length){const known=remaining.filter(w=>!knownFacetToken(w));if(known.length)out.variety=title(known.join(' '));}
      if(concept.key==='sausage'&&/\bherb\b|\bgarlic\b|\bhoney\b|\bchilli\b|\bpepper\b/.test(q))out.flavour='Flavoured';
      if(concept.key==='steak'&&/\bsteak\b/.test(q))out.cut='Steak';
      if(concept.key==='bread'&&/\bsourdough\b|\bsour dough\b/.test(q))out.type='Sourdough';
      if(concept.key==='cheese'&&/\bcheddar\b/.test(q))out.type='Cheddar';
      if(concept.key==='egg'){if(!out.part&&out.prep)out.part='Whole';}
      if(concept.key==='corn-chip'&&/\bplain\b|\bsalted\b/.test(q))out.flavour='Plain / Salted';
    }
    return out;
  }

  function sourceModeFromQuery(raw){const text=typeof raw==='object'?(raw.raw||raw.food):raw;const registered=REG?.sourceMode?REG.sourceMode(text):'';if(registered)return registered;const x=classifyText(typeof raw==='object'?raw.food:parseQuery(raw).food).source||'';if(/home made|grown/i.test(x))return 'home';if(/takeaway|restaurant/i.test(x))return 'restaurant';if(/bakery|fresh/i.test(x))return 'bakery';if(/commercial|packaged|frozen|canned|bought|store|supermarket/i.test(x))return 'commercial';return '';}
  function shouldOfferSourceFirst(concept,parsedOrRaw){if(!concept||concept.sourcePolicy!=='early')return false;const parsed=typeof parsedOrRaw==='object'?parsedOrRaw:parseQuery(parsedOrRaw);if(sourceModeFromQuery(parsed))return false;if(likelyBrandPrefix(parsed,concept))return false;return true;}
  function sourceChoices(concept){
    if(!concept||concept.sourcePolicy==='skip')return[];
    if(concept.key==='bread')return ['Homemade','Commercial / Bought','Not Sure / Typical'];
    if(concept.key==='corn-chip')return ['Homemade','Commercial / Packaged','Takeaway / Restaurant','Not Sure / Typical'];
    if(['fruit','vegetable'].includes(concept.category))return ['Home Grown','Commercial / Bought','Not Sure / Typical'];
    const choices=['Homemade','Commercial / Bought'];
    if(['prepared','pie','meat','drink','snack'].includes(concept.category))choices.push('Takeaway / Restaurant');
    choices.push('Not Sure / Typical');return choices;
  }

  function splitCompoundQuery(raw){
    const text=String(raw||'').trim();if(!text)return[];
    const supported=(left,right,connector)=>{const a=conceptFromQuery(left),b=conceptFromQuery(right),ak=a?.key,bk=b?.key,brand=REG?.primary?REG.primary(right,['brand']):null;if(connector==='on')return ak==='egg'&&bk==='bread';if(connector==='and')return (ak==='egg'&&bk==='bread')||(ak==='banana'&&bk==='yoghurt')||(ak==='cereal'&&bk==='milk');if(connector==='with')return (ak==='cereal'&&bk==='milk')||(ak==='bread'&&(bk==='spread'||brand?.entity?.id==='flora'));return false;};
    for(const connector of ['on','and','with']){const parts=text.split(new RegExp(`\\s+${connector}\\s+`,'i'));if(parts.length===2&&parts.every(Boolean)&&supported(parts[0],parts[1],connector))return parts.map(x=>x.trim());}
    return [];
  }

  global.HECSearchFoundation={version:VERSION,norm,singular,title,tokens,parseQuery,conceptFromQuery,predictConcepts,labelFor,likelyBrandPrefix,knownFacetToken,classifyText,descriptorFeatures,queryFacetSeeds,sourceModeFromQuery,shouldOfferSourceFirst,sourceChoices,splitCompoundQuery,registry:REG,concepts:CONCEPTS,patterns:PATTERNS,modifierWords:MODIFIER_WORDS};
})(typeof window!=='undefined'?window:globalThis);
