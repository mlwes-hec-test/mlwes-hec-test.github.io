(() => {
"use strict";

const APP = window.HEC_APP;
if(!APP?.version)throw new Error("HEC canonical configuration was not loaded");
const ACTIVITY = window.HECActivity;
const WEIGHT_PROGRESS = window.HECWeightProgress;
const NUTRITION_TRENDS = window.HECNutritionTrends;
const CONVERSATION = window.HECConversationFoundation;
const GUIDED_PRODUCTS = window.HECGuidedProductResolution;
const FOOD_GROUPS = window.HECFoodGroups;
const ACTIVE_VERSION = APP.version;
const MAIN_KEY = APP.storageKey;
const EXT_KEY = APP.functionalStorageKey;
const LEGACY_EXT_KEYS = APP.legacyFunctionalKeys || [];
const RESET_RELOAD_SESSION_KEY = APP.resetSessionKey;
let resetInProgress = false;
const by = id => document.getElementById(id);
const q = selector => document.querySelector(selector);
const qa = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n = value => Number(value) || 0;
const round1 = value => Math.round((Number(value) || 0) * 10) / 10;
const whole = value => Math.round(Number(value) || 0);
const isoToday = () => window.HECDate?.todayISO?.() || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;
const activeTimeZone = () => window.HECDate?.activeTimeZone?.() || Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Brisbane";
const localClock = () => { const z=window.HECDate?.zonedParts?.() || {}; return `${String(z.hour ?? new Date().getHours()).padStart(2,"0")}:${String(z.minute ?? new Date().getMinutes()).padStart(2,"0")}`; };
const uid = prefix => window.HECMigrations?.createId?.(prefix) || `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const recordTimestamps = createdAt => {const updatedAt=new Date().toISOString();return {createdAt:createdAt||updatedAt,updatedAt};};
const clone = value => JSON.parse(JSON.stringify(value));
const formatDate = value => value ? new Intl.DateTimeFormat("en-AU", {weekday:"short", day:"numeric", month:"short", year:"numeric"}).format(new Date(value + "T12:00:00")).replace(",","") : "";
const formatNumber = (value, precise=false) => {
  const num = Number(value) || 0;
  if(precise && Math.abs(num) < 10 && !Number.isInteger(round1(num))) return round1(num).toFixed(1);
  return Math.round(num).toLocaleString("en-AU");
};
const normalise = value => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
const mainData = () => {
  try { return JSON.parse(localStorage.getItem(MAIN_KEY)) || {}; } catch { return {}; }
};

const NUTRIENT_KEYS = ["calories","protein","carbs","fat","satFat","fibre","sugar","addedSugar","freeSugar","sodium"];
const ZERO_NUTRIENTS = Object.fromEntries(NUTRIENT_KEYS.map(k => [k,0]));
const nutrient = (calories, protein, carbs, fat, satFat, fibre, sugar, sodium, extra={}) => ({calories,protein,carbs,fat,satFat,fibre,sugar,sodium,...extra});

const FOODS = [
  {id:"weetbix-au",name:"Sanitarium Weet-Bix Original",brand:"Sanitarium",category:"Breakfast Cereals",country:"Australia",aliases:["weet bix","weetbix","weet-bix","wheat bix"],defaultAmount:2,defaultUnit:"biscuit",units:{biscuit:.5,serving:1,g:1/31},unitLabels:{biscuit:"biscuit",serving:"serving (2 biscuits)",g:"g"},serving:"2 biscuits (31 g)",nutrients:nutrient(110,3.8,20.4,.4,.1,4,.9,84,{potassium:113,iron:3}),score:8,source:"Verified From Australian Package Sample",verified:true,ingredients:"Wholegrain wheat, sugar, salt, barley malt extract, vitamins and minerals",allergens:["wheat","gluten"]},
  {id:"light-milk-au",name:"Australian Light Milk",brand:"Generic Australian Dairy",category:"Dairy & Eggs",country:"Australia",aliases:["light milk","lite milk","low fat milk","1 percent milk"],defaultAmount:200,defaultUnit:"mL",units:{mL:1/200,cup:1.25,serving:1},unitLabels:{mL:"mL",cup:"cup (250 mL)",serving:"serving (200 mL)"},serving:"200 mL",nutrients:nutrient(86,7,10,2.8,1.8,0,10,90,{calcium:240}),score:8,source:"Australian Generic Trial Record",verified:false,ingredients:"Reduced-fat cow's milk",allergens:["milk","dairy"]},
  {id:"baby-carrot",name:"Baby Snacking Carrot",brand:"Fresh Produce",category:"Fruit & Vegetables",country:"Australia",aliases:["baby carrot","snacking carrot","snackables carrot","snack ables carrot","carrot"],defaultAmount:31,defaultUnit:"g",units:{g:1/31,item:1},unitLabels:{g:"g",item:"small carrot (about 31 g)"},serving:"31 g",nutrients:nutrient(13,.3,3,.1,0,1,.7,21),score:9,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Carrot",allergens:[]},
  {id:"banana",name:"Banana",brand:"Fresh Produce",category:"Fruit & Vegetables",country:"Australia",aliases:["banana","lady finger banana"],defaultAmount:1,defaultUnit:"item",units:{item:1,g:1/118},unitLabels:{item:"medium banana",g:"g"},serving:"1 medium banana (118 g)",nutrients:nutrient(105,1.3,27,.4,.1,3.1,14.4,1),score:8,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Banana",allergens:[]},
  {id:"apple",name:"Apple",brand:"Fresh Produce",category:"Fruit & Vegetables",country:"Australia",aliases:["apple","pink lady","royal gala","granny smith"],defaultAmount:1,defaultUnit:"item",units:{item:1,g:1/182},unitLabels:{item:"medium apple",g:"g"},serving:"1 medium apple (182 g)",nutrients:nutrient(95,.5,25,.3,.1,4.4,19,2),score:8,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Apple",allergens:[]},
  {id:"berries",name:"Mixed Berries",brand:"Fresh or Frozen",category:"Fruit & Vegetables",country:"Australia",aliases:["berries","mixed berries","strawberries","blueberries"],defaultAmount:100,defaultUnit:"g",units:{g:.01,cup:1.4,serving:1},unitLabels:{g:"g",cup:"cup",serving:"100 g serving"},serving:"100 g",nutrients:nutrient(50,.8,12,.4,.1,4.5,7,1),score:9,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Mixed berries",allergens:[]},
  {id:"wholemeal-bread",name:"Wholemeal Bread",brand:"Generic Australian",category:"Bakery",country:"Australia",aliases:["wholemeal bread","whole wheat bread","brown bread","toast"],defaultAmount:1,defaultUnit:"slice",units:{slice:1,g:1/40},unitLabels:{slice:"slice (40 g)",g:"g"},serving:"1 slice (40 g)",nutrients:nutrient(95,4,16,1.4,.3,3,2,180),score:7,source:"Australian Generic Trial Record",verified:false,ingredients:"Wholemeal wheat flour, water, yeast, salt",allergens:["wheat","gluten"]},
  {id:"egg",name:"Egg",brand:"Australian Eggs",category:"Dairy & Eggs",country:"Australia",aliases:["egg","eggs","boiled egg","poached egg"],defaultAmount:1,defaultUnit:"item",units:{item:1,g:1/50},unitLabels:{item:"large egg",g:"g"},serving:"1 large egg (50 g)",nutrients:nutrient(72,6.3,.4,4.8,1.6,0,.2,71),score:8,source:"Australian Generic Trial Record",verified:false,ingredients:"Egg",allergens:["egg"]},
  {id:"chicken-breast",name:"Chicken Breast, Cooked",brand:"Fresh",category:"Meat & Seafood",country:"Australia",aliases:["chicken breast","grilled chicken","roast chicken"],defaultAmount:100,defaultUnit:"g",units:{g:.01,serving:1},unitLabels:{g:"g",serving:"100 g serving"},serving:"100 g",nutrients:nutrient(165,31,0,3.6,1,0,0,74),score:8,source:"Australian Generic Trial Record",verified:false,ingredients:"Chicken breast",allergens:[]},
  {id:"tuna",name:"Tuna in Springwater, Drained",brand:"Generic Australian",category:"Meat & Seafood",country:"Australia",aliases:["tuna","tinned tuna","canned tuna"],defaultAmount:95,defaultUnit:"g",units:{g:1/95,can:1,serving:1},unitLabels:{g:"g",can:"small can (95 g drained)",serving:"95 g serving"},serving:"95 g drained",nutrients:nutrient(100,22,0,1,.3,0,0,300),score:8,source:"Australian Generic Trial Record",verified:false,ingredients:"Tuna, springwater, salt",allergens:["fish"]},
  {id:"brown-rice",name:"Brown Rice, Cooked",brand:"Generic",category:"Pantry",country:"Australia",aliases:["brown rice","rice"],defaultAmount:150,defaultUnit:"g",units:{g:1/150,cup:1.3,serving:1},unitLabels:{g:"g",cup:"cup",serving:"150 g serving"},serving:"150 g",nutrients:nutrient(170,3.8,35,1.4,.3,2.4,.7,6),score:8,source:"Australian Generic Trial Record",verified:false,ingredients:"Brown rice",allergens:[]},
  {id:"potato",name:"Potato, Boiled",brand:"Fresh Produce",category:"Fruit & Vegetables",country:"Australia",aliases:["potato","boiled potato","spud"],defaultAmount:150,defaultUnit:"g",units:{g:1/150,item:1,serving:1},unitLabels:{g:"g",item:"medium potato",serving:"150 g serving"},serving:"150 g",nutrients:nutrient(116,3,26,.2,.1,2.7,1.2,10),score:8,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Potato",allergens:[]},
  {id:"broccoli",name:"Broccoli, Steamed",brand:"Fresh Produce",category:"Fruit & Vegetables",country:"Australia",aliases:["broccoli","steamed broccoli"],defaultAmount:100,defaultUnit:"g",units:{g:.01,cup:1.5,serving:1},unitLabels:{g:"g",cup:"cup",serving:"100 g serving"},serving:"100 g",nutrients:nutrient(35,2.4,7,.4,.1,3.3,1.4,41),score:9,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Broccoli",allergens:[]},
  {id:"salad",name:"Mixed Garden Salad",brand:"Fresh",category:"Fruit & Vegetables",country:"Australia",aliases:["salad","garden salad","mixed salad"],defaultAmount:150,defaultUnit:"g",units:{g:1/150,bowl:1,serving:1},unitLabels:{g:"g",bowl:"medium bowl",serving:"150 g serving"},serving:"150 g",nutrients:nutrient(60,2.5,10,1,0.2,4,5,70),score:9,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Lettuce, tomato, cucumber, carrot; dressing not included",allergens:[]},
  {id:"avocado",name:"Avocado",brand:"Fresh Produce",category:"Fruit & Vegetables",country:"Australia",aliases:["avocado","avo"],defaultAmount:50,defaultUnit:"g",units:{g:1/50,quarter:1,serving:1},unitLabels:{g:"g",quarter:"quarter avocado",serving:"50 g serving"},serving:"50 g",nutrients:nutrient(80,1,4.3,7.4,1.1,3.4,.3,4),score:8,source:"Australian Fresh Food Estimate",verified:false,ingredients:"Avocado",allergens:[]},
  {id:"greek-yoghurt",name:"Greek-Style Yoghurt, Plain",brand:"Generic Australian",category:"Dairy & Eggs",country:"Australia",aliases:["greek yoghurt","greek yogurt","plain yoghurt","yogurt"],defaultAmount:170,defaultUnit:"g",units:{g:1/170,tub:1,serving:1},unitLabels:{g:"g",tub:"small tub (170 g)",serving:"170 g serving"},serving:"170 g",nutrients:nutrient(120,15,7,3.5,2.2,0,6,60),score:8,source:"Australian Generic Trial Record",verified:false,ingredients:"Milk, live cultures",allergens:["milk","dairy"]},
  {id:"oats",name:"Rolled Oats, Dry",brand:"Generic Australian",category:"Breakfast Cereals",country:"Australia",aliases:["oats","porridge","rolled oats"],defaultAmount:40,defaultUnit:"g",units:{g:1/40,cup:2,serving:1},unitLabels:{g:"g",cup:"cup",serving:"40 g serving"},serving:"40 g",nutrients:nutrient(150,5.2,24,3.2,.6,4,0.4,2),score:9,source:"Australian Generic Trial Record",verified:false,ingredients:"Wholegrain oats",allergens:["oats","gluten"]},
  {id:"beef-rissole",name:"Beef Rissole, Homemade Estimate",brand:"Recipe Estimate",category:"Meat & Seafood",country:"Australia",aliases:["rissole","beef rissole","meat patty"],defaultAmount:1,defaultUnit:"item",units:{item:1,g:1/100},unitLabels:{item:"medium rissole (about 100 g)",g:"g"},serving:"1 medium rissole (100 g)",nutrients:nutrient(220,20,5,13,5,1,1,330),score:6,source:"Estimated—Create Your Own Recipe for Accuracy",verified:false,ingredients:"Beef mince, onion, egg, breadcrumbs and seasoning may vary",allergens:["egg","wheat","gluten"]},
  {id:"cappuccino",name:"Cappuccino With Light Milk",brand:"Café Estimate",category:"Drinks",country:"Australia",aliases:["cappuccino","capp","coffee with milk"],defaultAmount:250,defaultUnit:"mL",units:{mL:1/250,cup:1,serving:1},unitLabels:{mL:"mL",cup:"regular cup",serving:"250 mL cup"},serving:"250 mL",nutrients:nutrient(90,6,10,2.5,1.6,0,9,85),score:7,source:"Australian Café Estimate",verified:false,ingredients:"Espresso coffee and light milk",allergens:["milk","dairy"]},
  {id:"water",name:"Water",brand:"",category:"Drinks",country:"Australia",aliases:["water","glass of water"],defaultAmount:250,defaultUnit:"mL",units:{mL:1/250,glass:1},unitLabels:{mL:"mL",glass:"glass (250 mL)"},serving:"250 mL",nutrients:nutrient(0,0,0,0,0,0,0,0),score:10,source:"Confirmed",verified:true,ingredients:"Water",allergens:[]}
];
const FOOD_GROUP_KEYS = ["vegetables","fruit","grains","proteinFoods","dairy"];
const FOOD_GROUP_LABELS = {vegetables:"Veges & Legumes",fruit:"Fruit",grains:"Grains",proteinFoods:"Protein Foods",dairy:"Dairy & Alternatives"};
const FOOD_METADATA = {
  "weetbix-au":{waterMl:2,foodGroups:{grains:1}},
  "light-milk-au":{waterMl:180,hydrationType:"drink",foodGroups:{dairy:.8}},
  "baby-carrot":{waterMl:28,foodGroups:{vegetables:.4}},
  banana:{waterMl:88,foodGroups:{fruit:1}},
  apple:{waterMl:155,foodGroups:{fruit:1}},
  berries:{waterMl:86,foodGroups:{fruit:.7}},
  "wholemeal-bread":{waterMl:15,foodGroups:{grains:1}},
  egg:{waterMl:38,foodGroups:{proteinFoods:.5}},
  "chicken-breast":{waterMl:65,foodGroups:{proteinFoods:1.25}},
  tuna:{waterMl:70,foodGroups:{proteinFoods:1}},
  "brown-rice":{waterMl:105,foodGroups:{grains:1.25}},
  potato:{waterMl:120,foodGroups:{vegetables:2}},
  broccoli:{waterMl:90,foodGroups:{vegetables:1.3}},
  salad:{waterMl:135,foodGroups:{vegetables:2}},
  avocado:{waterMl:36,foodGroups:{vegetables:.7}},
  "greek-yoghurt":{waterMl:135,foodGroups:{dairy:.85}},
  oats:{waterMl:4,foodGroups:{grains:1}},
  "beef-rissole":{waterMl:60,foodGroups:{proteinFoods:1.2,grains:.15}},
  cappuccino:{waterMl:230,hydrationType:"drink",foodGroups:{dairy:1}},
  water:{waterMl:250,hydrationType:"drink",foodGroups:{},foodGroupAttribution:"classified"}
};

FOODS.push(
  {id:"english-muffin",name:"English Muffin",brand:"Generic Australian",category:"Bakery",country:"Australia",aliases:["muffin","english muffin"],defaultAmount:1,defaultUnit:"item",units:{item:1,g:1/65},unitLabels:{item:"1 Muffin (65 g)",g:"g"},serving:"1 Muffin (65 g)",nutrients:nutrient(160,5.5,30,1.5,.4,2,2.5,320),score:7,source:"Australian Generic Trial Estimate",verified:false,ingredients:"Wheat flour, water, yeast, salt",allergens:["wheat","gluten"],waterMl:20,foodGroups:{grains:2}},
  {id:"shortcut-bacon",name:"Shortcut Bacon, Cooked",brand:"Generic Australian",category:"Meat & Seafood",country:"Australia",aliases:["bacon","shortcut bacon","bacon rasher"],defaultAmount:1,defaultUnit:"rasher",units:{rasher:1,g:1/35},unitLabels:{rasher:"1 Rasher (35 g)",g:"g"},serving:"1 Rasher (35 g)",nutrients:nutrient(95,10,.5,6,2.2,0,.3,520),score:5,source:"Australian Generic Trial Estimate",verified:false,ingredients:"Pork, salt, curing ingredients",allergens:[],waterMl:18,foodGroups:{proteinFoods:.5}},
  {id:"cheddar-cheese",name:"Cheddar Cheese",brand:"Generic Australian",category:"Dairy & Eggs",country:"Australia",aliases:["cheese","cheddar","cheese slice"],defaultAmount:1,defaultUnit:"slice",units:{slice:1,g:1/25},unitLabels:{slice:"1 Slice (25 g)",g:"g"},serving:"1 Slice (25 g)",nutrients:nutrient(101,6.3,.3,8.4,5.3,0,.1,155),score:6,source:"Australian Generic Trial Estimate",verified:false,ingredients:"Milk, cultures, salt, enzyme",allergens:["milk","dairy"],waterMl:9,foodGroups:{dairy:.5}},
  {id:"tomato-sauce",name:"Tomato Sauce",brand:"Generic Australian",category:"Pantry",country:"Australia",aliases:["tomato sauce","ketchup","sauce"],defaultAmount:15,defaultUnit:"mL",units:{mL:1/15,teaspoon:1/3,tablespoon:1},unitLabels:{mL:"mL",teaspoon:"1 Teaspoon (5 mL)",tablespoon:"1 Tablespoon (15 mL)"},serving:"1 Tablespoon (15 mL)",nutrients:nutrient(18,.2,4.2,0,0,.1,3.5,180),score:5,source:"Australian Generic Trial Estimate",verified:false,ingredients:"Tomato, sugar, vinegar, salt, spices",allergens:[],waterMl:10,foodGroups:{vegetables:.1}},
  {id:"margarine",name:"Margarine",brand:"Generic Australian",category:"Dairy & Eggs",country:"Australia",aliases:["margarine","spread","table spread"],defaultAmount:5,defaultUnit:"g",units:{g:1/5,teaspoon:1},unitLabels:{g:"g",teaspoon:"1 Teaspoon (5 g)"},serving:"1 Teaspoon (5 g)",nutrients:nutrient(27,0,0,3,.7,0,0,30),score:5,source:"Australian Generic Trial Estimate",verified:false,ingredients:"Vegetable oils, water, salt",allergens:[],waterMl:1,foodGroups:{}},
  {id:"beef-sausage",name:"Beef Sausage, Cooked",brand:"Generic Australian",category:"Meat & Seafood",country:"Australia",aliases:["sausage","beef sausage","snag"],defaultAmount:1,defaultUnit:"medium",units:{thin:.72,medium:1,large:1.45,g:1/75},unitLabels:{thin:"1 Long Thin Sausage (54 g)",medium:"1 Medium Sausage (75 g)",large:"1 Large Thick Sausage (109 g)",g:"g"},serving:"1 Medium Sausage (75 g)",nutrients:nutrient(210,12,5,16,6,0,1,620),score:4,source:"Australian Generic Trial Estimate",verified:false,ingredients:"Beef, water, cereal, seasoning",allergens:["wheat","gluten"],waterMl:35,foodGroups:{proteinFoods:.8,grains:.1}},
  {id:"beef-steak",name:"Beef Steak, Grilled",brand:"Generic Australian",category:"Meat & Seafood",country:"Australia",aliases:["steak","beef steak","grilled steak"],defaultAmount:1,defaultUnit:"medium",units:{small:.67,medium:1,large:1.5,g:1/150},unitLabels:{small:"1 Small Steak (100 g)",medium:"1 Medium Steak (150 g)",large:"1 Large Steak (225 g)",g:"g"},serving:"1 Medium Steak (150 g)",nutrients:nutrient(330,42,0,18,7,0,0,110),score:7,source:"Australian Generic Trial Estimate",verified:false,ingredients:"Beef",allergens:[],waterMl:85,foodGroups:{proteinFoods:2}}
);
FOODS.forEach(food => Object.assign(food, FOOD_METADATA[food.id] || {waterMl:food.waterMl||0,foodGroups:food.foodGroups||{}}));
// Alpha 0.6.16: keep a plain egg separate from egg dishes so search and preparation are easier to understand.
FOODS.push(
  {id:"scrambled-eggs",name:"Scrambled Eggs",brand:"Generic Australian",category:"Dairy & Eggs",country:"Australia",aliases:["scrambled egg","scrambled eggs"],defaultAmount:1,defaultUnit:"serve",units:{serve:1,g:1/100},unitLabels:{serve:"1 Serving (about 2 Large Eggs)",g:"g"},serving:"1 Serving (about 2 Large Eggs)",nutrients:nutrient(144,12.6,.8,9.6,3.2,0,.4,142),score:8,source:"Guided Australian Egg Dish Estimate",verified:false,ingredients:"Eggs; additions vary",allergens:["egg"],waterMl:76,foodGroups:{proteinFoods:1}},
  {id:"omelette",name:"Omelette",brand:"Generic Australian",category:"Dairy & Eggs",country:"Australia",aliases:["omelet","omelette","egg omelette"],defaultAmount:1,defaultUnit:"serve",units:{serve:1,g:1/120},unitLabels:{serve:"1 Omelette (about 2 Large Eggs)",g:"g"},serving:"1 Omelette (about 2 Large Eggs)",nutrients:nutrient(150,13,1.2,10,3.4,0,.5,155),score:8,source:"Guided Australian Egg Dish Estimate",verified:false,ingredients:"Eggs; fillings vary",allergens:["egg"],waterMl:76,foodGroups:{proteinFoods:1}},
  {id:"eggs-benedict",name:"Eggs Benedict",brand:"Generic Café Estimate",category:"Dairy & Eggs",country:"Australia",aliases:["egg benedict","eggs benedict","benedict"],defaultAmount:1,defaultUnit:"serve",units:{serve:1},unitLabels:{serve:"1 Serving"},serving:"1 Serving",nutrients:nutrient(480,23,32,29,12,2,4,1150),score:5,source:"Generic Café Estimate — Ingredients Vary Widely",verified:false,ingredients:"Poached eggs, English muffin, hollandaise sauce and ham or similar protein",allergens:["egg","milk","wheat","gluten"],waterMl:90,foodGroups:{proteinFoods:1,dairy:.3,grains:2}}
);

// Prebuilt restaurant/supermarket catalogues join the same central FOODS
// collection used by Food Library, Diary, My Foods, Recent and recipes.
FOODS.push(...(window.HECFoodSources?.foodRecords?.()||[]));

// RC6 Founder Polish: current Australian manufacturer records keep Flora Light
// and Flora ProActiv Light as separate canonical products. Values are per the
// manufacturers' 10 g serving tables; kJ-to-Cal conversion is rounded only for
// the Cal display because the source tables publish energy in kJ.
FOODS.push(
  {id:'flora-proactiv-light-au-official',canonicalId:'packaged:flora-proactiv-light-au',sourceId:'flora-proactiv-light-au',recordType:'packaged',name:'Flora ProActiv Light',brand:'Flora',category:'Spreads',country:'Australia',market:'AU',aliases:['flora proactiv light','flora proactive light','flora pro activ light','flora pro-active light','proactiv light','proactive light','pro activ light','pro-active light'],defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.1},unitLabels:{serve:'Serve (10 g)',g:'g'},serving:'1 serve (10 g)',manufacturerServing:{amount:10,unit:'g'},nutrients:nutrient(37,null,null,4.1,.9,null,null,36,{energyKj:154,plantSterols:.8}),nutritionPer100:nutrient(368,null,1.9,40.5,9,null,.1,360,{energyKj:1540,plantSterols:8}),score:7,source:'Official Flora ProActiv Australia Product Page · checked 2026-08-29',sourceUrl:'https://www.pro-activ.com/en-au/products/flora-proactiv-light',verified:true,verificationStatus:'verified',ingredients:'Water, vegetable oils, phytosterol esters (8% plant sterols), salt, potato starch, emulsifiers (471, soy lecithin), milk solids, lactic acid, preservative (202), natural flavours, vitamins A and D, beta-carotene',allergens:['soy','milk'],sourceAnomalies:['Fibre is not published, and protein, carbohydrate and sugars below 0.1 g per serve remain unavailable rather than being converted to exact zero values.'],foodGroups:{},waterMl:5},
  {id:'flora-light-au-official',canonicalId:'packaged:flora-light-au',sourceId:'flora-light-au',recordType:'packaged',name:'Flora Light',brand:'Flora',category:'Spreads',country:'Australia',market:'AU',aliases:['flora light','light'],defaultAmount:1,defaultUnit:'serve',units:{serve:1,g:.1},unitLabels:{serve:'10 g Serve',g:'g'},serving:'1 serve (10 g)',manufacturerServing:{amount:10,unit:'g'},nutrients:nutrient(43,null,null,4.7,1.2,null,null,35,{energyKj:178}),nutritionPer100:nutrient(425,null,null,47,12,null,null,350,{energyKj:1780}),score:6,source:'Official Flora Australia Product Page · checked 2026-08-29',sourceUrl:'https://www.floraspread.com.au/products/flora-spreads/flora-light',verified:true,verificationStatus:'verified',ingredients:'Vegetable oils (including sunflower oil), water, salt, potato starch, emulsifiers (471, soy lecithin), milk solids, preservative (202), citric acid, natural flavours, vitamins A and D, beta-carotene',allergens:['soy','milk'],sourceAnomalies:['Fibre is not published, and protein, carbohydrate and sugars below 1 g remain unavailable rather than being converted to exact zero values.'],foodGroups:{},waterMl:5}
);

const FOOD_BY_ID = new Map(FOODS.map(f => [f.id,f]));

const MEAL_SUGGESTIONS = [
  {id:"suggest-breakfast-1",name:"Weet-Bix, Light Milk & Berries",meal:"Breakfast",score:8,reason:"Wholegrain cereal, fibre, fruit and dairy protein.",items:[{foodId:"weetbix-au",amount:2,unit:"biscuit"},{foodId:"light-milk-au",amount:200,unit:"mL"},{foodId:"berries",amount:100,unit:"g"}]},
  {id:"suggest-breakfast-2",name:"Eggs on Wholemeal Toast",meal:"Breakfast",score:8,reason:"Balanced protein and wholegrain carbohydrate.",items:[{foodId:"egg",amount:2,unit:"item"},{foodId:"wholemeal-bread",amount:2,unit:"slice"},{foodId:"baby-carrot",amount:62,unit:"g"}]},
  {id:"suggest-lunch-1",name:"Chicken & Salad Lunch",meal:"Lunch",score:9,reason:"Lean protein, vegetables and a high-volume salad.",items:[{foodId:"chicken-breast",amount:120,unit:"g"},{foodId:"salad",amount:200,unit:"g"},{foodId:"avocado",amount:50,unit:"g"}]},
  {id:"suggest-lunch-2",name:"Tuna & Wholemeal Sandwich",meal:"Lunch",score:7,reason:"Convenient protein with wholemeal bread; sodium is worth checking.",items:[{foodId:"tuna",amount:95,unit:"g"},{foodId:"wholemeal-bread",amount:2,unit:"slice"},{foodId:"salad",amount:100,unit:"g"}]},
  {id:"suggest-dinner-1",name:"Chicken, Potato & Broccoli",meal:"Dinner",score:9,reason:"A straightforward balanced plate with lean protein and vegetables.",items:[{foodId:"chicken-breast",amount:150,unit:"g"},{foodId:"potato",amount:180,unit:"g"},{foodId:"broccoli",amount:150,unit:"g"}]},
  {id:"suggest-dinner-2",name:"Beef Rissole & Vegetables",meal:"Dinner",score:7,reason:"A familiar Australian dinner; a saved homemade recipe will improve accuracy.",items:[{foodId:"beef-rissole",amount:1,unit:"item"},{foodId:"potato",amount:150,unit:"g"},{foodId:"broccoli",amount:150,unit:"g"}]},
  {id:"suggest-snack-1",name:"Greek Yoghurt & Berries",meal:"Snacks",score:8,reason:"Protein, calcium and fruit in a practical snack.",items:[{foodId:"greek-yoghurt",amount:170,unit:"g"},{foodId:"berries",amount:100,unit:"g"}]},
  {id:"suggest-snack-2",name:"Apple",meal:"Snacks",score:8,reason:"Simple fruit snack with fibre.",items:[{foodId:"apple",amount:1,unit:"item"}]},
  {id:"suggest-breakfast-3",name:"Oats, Milk & Banana",meal:"Breakfast",score:9,reason:"Wholegrain breakfast with fruit and dairy.",items:[{foodId:"oats",amount:40,unit:"g"},{foodId:"light-milk-au",amount:200,unit:"mL"},{foodId:"banana",amount:1,unit:"item"}]},
  {id:"suggest-smoko-2",name:"Yoghurt & Berries",meal:"Snacks",score:8,reason:"Fruit, dairy and protein in a practical snack.",items:[{foodId:"greek-yoghurt",amount:120,unit:"g"},{foodId:"berries",amount:80,unit:"g"}]},
  {id:"suggest-afternoon-2",name:"Apple & Yoghurt",meal:"Snacks",score:8,reason:"Fruit and dairy with useful fibre and protein.",items:[{foodId:"apple",amount:1,unit:"item"},{foodId:"greek-yoghurt",amount:100,unit:"g"}]},
  {id:"suggest-supper-1",name:"Light Milk & Banana",meal:"Snacks",score:8,reason:"Simple fruit and dairy option for a lighter supper.",items:[{foodId:"light-milk-au",amount:200,unit:"mL"},{foodId:"banana",amount:1,unit:"item"}]},
  {id:"suggest-supper-2",name:"Greek Yoghurt & Berries",meal:"Snacks",score:8,reason:"A modest dairy and fruit option.",items:[{foodId:"greek-yoghurt",amount:120,unit:"g"},{foodId:"berries",amount:80,unit:"g"}]},
  {id:"suggest-breakfast-light",name:"Egg & Berries",meal:"Breakfast",score:8,reason:"A small protein-and-fruit option when the available energy is limited.",items:[{foodId:"egg",amount:1,unit:"item"},{foodId:"berries",amount:50,unit:"g"}]},
  {id:"suggest-morning-light",name:"Small Berry Snack",meal:"Snacks",score:9,reason:"A very light fruit option for a tightly budgeted day.",items:[{foodId:"berries",amount:80,unit:"g"}]},
  {id:"suggest-lunch-light",name:"Tuna & Garden Salad",meal:"Lunch",score:9,reason:"Lean protein and vegetables in a light lunch that leaves room for other selected meals.",items:[{foodId:"tuna",amount:60,unit:"g"},{foodId:"salad",amount:100,unit:"g"}]},
  {id:"suggest-lunch-light-grain",name:"Tuna, Salad & Wholemeal Toast",meal:"Lunch",score:9,reason:"A lighter lunch with protein, vegetables and one grain serve.",items:[{foodId:"tuna",amount:60,unit:"g"},{foodId:"salad",amount:100,unit:"g"},{foodId:"wholemeal-bread",amount:1,unit:"slice"}]},
  {id:"suggest-afternoon-light",name:"Small Plain Yoghurt",meal:"Snacks",score:8,reason:"A small dairy-and-protein option for a lower-energy day.",items:[{foodId:"greek-yoghurt",amount:60,unit:"g"}]},
  {id:"suggest-dinner-light",name:"Light Chicken, Potato & Broccoli",meal:"Dinner",score:9,reason:"A smaller balanced dinner for a day with a tight remaining energy allowance.",items:[{foodId:"chicken-breast",amount:80,unit:"g"},{foodId:"potato",amount:80,unit:"g"},{foodId:"broccoli",amount:100,unit:"g"}]},
  {id:"suggest-dinner-very-light",name:"Chicken & Broccoli",meal:"Dinner",score:9,reason:"A very light protein-and-vegetable dinner when little energy remains.",items:[{foodId:"chicken-breast",amount:60,unit:"g"},{foodId:"broccoli",amount:100,unit:"g"}]},
  {id:"suggest-snacks-light",name:"Small Berry Bowl",meal:"Snacks",score:9,reason:"A small fruit snack for a tightly budgeted day.",items:[{foodId:"berries",amount:50,unit:"g"}]},

  {id:"suggest-lunch-grain",name:"Chicken, Brown Rice & Salad",meal:"Lunch",score:9,reason:"Adds wholegrain-style carbohydrate while keeping vegetables and lean protein balanced.",items:[{foodId:"chicken-breast",amount:80,unit:"g"},{foodId:"brown-rice",amount:150,unit:"g"},{foodId:"salad",amount:100,unit:"g"}]},
  {id:"suggest-dinner-rice",name:"Chicken, Brown Rice & Broccoli",meal:"Dinner",score:9,reason:"Balances a main protein with grains and vegetables.",items:[{foodId:"chicken-breast",amount:100,unit:"g"},{foodId:"brown-rice",amount:150,unit:"g"},{foodId:"broccoli",amount:100,unit:"g"}]},
  {id:"suggest-dinner-toast",name:"Eggs, Wholemeal Toast & Vegetables",meal:"Dinner",score:8,reason:"A lighter dinner that contributes grains, protein and vegetables.",items:[{foodId:"egg",amount:2,unit:"item"},{foodId:"wholemeal-bread",amount:2,unit:"slice"},{foodId:"salad",amount:100,unit:"g"}]},
  {id:"suggest-breakfast-muffin",name:"Egg & Bacon Muffin",meal:"Breakfast",score:7,reason:"A familiar cooked breakfast with protein and a grain serve.",items:[{foodId:"english-muffin",amount:1,unit:"item"},{foodId:"egg",amount:1,unit:"item"},{foodId:"shortcut-bacon",amount:1,unit:"rasher"}]},
  {id:"suggest-breakfast-yoghurt",name:"Yoghurt, Oats & Berries",meal:"Breakfast",score:9,reason:"A lighter breakfast with dairy, wholegrain oats and fruit.",items:[{foodId:"greek-yoghurt",amount:120,unit:"g"},{foodId:"oats",amount:30,unit:"g"},{foodId:"berries",amount:80,unit:"g"}]},
  {id:"suggest-morning-egg",name:"Boiled Egg",meal:"Snacks",score:8,reason:"A compact protein snack when fruit is already well covered.",items:[{foodId:"egg",amount:1,unit:"item"}]},
  {id:"suggest-morning-yoghurt",name:"Small Yoghurt",meal:"Snacks",score:8,reason:"A modest dairy and protein snack.",items:[{foodId:"greek-yoghurt",amount:100,unit:"g"}]},
  {id:"suggest-lunch-rice",name:"Tuna, Brown Rice & Salad",meal:"Lunch",score:9,reason:"Adds grains, vegetables and lean protein in one meal.",items:[{foodId:"tuna",amount:75,unit:"g"},{foodId:"brown-rice",amount:120,unit:"g"},{foodId:"salad",amount:120,unit:"g"}]},
  {id:"suggest-lunch-eggs",name:"Eggs, Toast & Salad",meal:"Lunch",score:8,reason:"A simple lunch with protein, grains and vegetables.",items:[{foodId:"egg",amount:2,unit:"item"},{foodId:"wholemeal-bread",amount:2,unit:"slice"},{foodId:"salad",amount:120,unit:"g"}]},
  {id:"suggest-afternoon-egg",name:"Egg & Apple",meal:"Snacks",score:8,reason:"A compact protein and fruit snack.",items:[{foodId:"egg",amount:1,unit:"item"},{foodId:"apple",amount:1,unit:"item"}]},
  {id:"suggest-afternoon-toast",name:"Wholemeal Toast & Avocado",meal:"Snacks",score:8,reason:"A savoury snack that contributes grains and healthy fats.",items:[{foodId:"wholemeal-bread",amount:1,unit:"slice"},{foodId:"avocado",amount:30,unit:"g"}]},
  {id:"suggest-dinner-steak",name:"Steak, Potato & Salad",meal:"Dinner",score:8,reason:"A familiar dinner with protein, vegetables and a starchy side.",items:[{foodId:"beef-steak",amount:120,unit:"g"},{foodId:"potato",amount:150,unit:"g"},{foodId:"salad",amount:150,unit:"g"}]},
  {id:"suggest-dinner-sausage",name:"Sausage, Brown Rice & Vegetables",meal:"Dinner",score:7,reason:"A familiar meal balanced with grains and vegetables.",items:[{foodId:"beef-sausage",amount:1,unit:"item"},{foodId:"brown-rice",amount:120,unit:"g"},{foodId:"broccoli",amount:120,unit:"g"}]},
  {id:"suggest-snacks-milk",name:"Light Milk",meal:"Snacks",score:8,reason:"A simple dairy option when only a small snack is needed.",items:[{foodId:"light-milk-au",amount:200,unit:"mL"}]},
];

const EXT_DEFAULTS = {
  version:"0.6.16", diary:{}, daySettings:{}, water:{}, fluidTargets:{}, steps:{}, dailyNotes:{}, exercise:[], exerciseCreditPolicies:[], shopping:[], onlineFoods:[], onlineSearchCache:{},
  family:{enabled:false,name:"",email:""}, connections:{}, customFoods:[], savedFoodIds:[], recipes:[], mealTemplates:[], shoppingVoiceAliases:{},
  ui:{diaryDate:isoToday(),progressDate:isoToday(),plannerDate:isoToday(),diaryView:"all",libraryTab:"all",foodSearch:"",foodSearchByTab:{},scanMode:"food",pendingMeal:"",plannerResults:{},plannerRejected:{},plannerAccepted:{},plannerSessionActive:false,singleMealPreferences:{},recipeDraft:[],recipeName:"",recipeServings:4,recipeNotes:"",returnToRecipe:false,replacingEntryId:"",pendingDrink:null}
};
function merge(target, source){
  if(!source || typeof source !== "object") return target;
  Object.entries(source).forEach(([key,value]) => {
    if(value && typeof value === "object" && !Array.isArray(value)) target[key] = merge(target[key] && typeof target[key] === "object" ? target[key] : {}, value);
    else if(value !== undefined) target[key] = value;
  });
  return target;
}
function loadExt(){
  let current = null;
  try { current = JSON.parse(localStorage.getItem(EXT_KEY)); } catch {}
  if(current){ const loaded=merge(clone(EXT_DEFAULTS),current); loaded.version="0.6.16"; return loaded; }
  for(const legacyKey of LEGACY_EXT_KEYS){
    try {
      const legacy = JSON.parse(localStorage.getItem(legacyKey));
      if(legacy){
        const migrated = merge(clone(EXT_DEFAULTS),legacy);
        migrated.version = "0.6.16";
        if(legacy.daily?.date){
          migrated.water[legacy.daily.date] = legacy.daily.water || 0;
          migrated.steps[legacy.daily.date] = legacy.daily.steps || 0;
        }
        return migrated;
      }
    } catch {}
  }
  return clone(EXT_DEFAULTS);
}
const ext = loadExt();
const saveExt = () => localStorage.setItem(EXT_KEY,JSON.stringify(ext));
const activityPolicies = () => Array.isArray(ext.exerciseCreditPolicies)?ext.exerciseCreditPolicies:[];
const activityAllowanceCredit = record => ACTIVITY.allowanceCredit(record,activityPolicies());
const activityRawEnergy = record => ACTIVITY.rawEnergy(record);
function ensureActivityCreditPolicy(){
  const main=mainData(),effectiveDate=main.profileStartedDate||isoToday(),before=JSON.stringify(activityPolicies());
  if(!ext.exerciseCreditPolicies?.length)ext.exerciseCreditPolicies=ACTIVITY.recordPolicy([], {percent:main.health?.exerciseCredit,effectiveDate,id:uid("exercise-policy"),now:new Date().toISOString()});
  return before!==JSON.stringify(activityPolicies());
}
function syncActivityCreditPolicy(){
  ensureActivityCreditPolicy();const main=mainData(),next=ACTIVITY.recordPolicy(activityPolicies(),{percent:main.health?.exerciseCredit,effectiveDate:isoToday(),id:uid("exercise-policy"),now:new Date().toISOString()});
  if(JSON.stringify(next)!==JSON.stringify(activityPolicies())){ext.exerciseCreditPolicies=next;saveExt();if(q("#exercise-log.active"))renderExercise();}
}

let AFCD_FOODS=[];
let afcdLoaded=false;
function afcdCategory(food){
  const name=normalise(food.name),code=String(food.classification||"");
  if(/water|juice|drink|beverage|coffee|tea|cordial|soft drink|milk/.test(name))return "Australian AFCD · Drinks";
  if(/bread|roll|biscuit|cracker|cereal|oat|rice|pasta|noodle|flour|grain|muffin/.test(name))return "Australian AFCD · Grains & Bakery";
  if(/yoghurt|yogurt|cheese|custard|cream|dairy/.test(name))return "Australian AFCD · Dairy";
  if(/beef|pork|lamb|veal|chicken|turkey|fish|tuna|salmon|prawn|seafood|sausage|bacon|egg/.test(name))return "Australian AFCD · Protein Foods";
  if(/apple|banana|berry|berries|orange|mandarin|mango|melon|grape|pear|peach|plum|fruit/.test(name))return "Australian AFCD · Fruit";
  if(/potato|carrot|broccoli|pumpkin|zucchini|spinach|lettuce|tomato|vegetable|onion|capsicum|bean|pea/.test(name))return "Australian AFCD · Vegetables";
  return code.startsWith("2")?"Australian AFCD · Plant Foods":"Australian AFCD";
}
function afcdFoodGroups(food){
  const category=afcdCategory(food),nrm=normalise(food.name),per100={};
  if(category.includes("Vegetables"))per100.vegetables=100/75;
  else if(category.includes("Fruit"))per100.fruit=100/150;
  else if(category.includes("Grains"))per100.grains=/bread|roll|muffin/.test(nrm)?2:1;
  else if(category.includes("Dairy"))per100.dairy=0.6;
  else if(category.includes("Protein"))per100.proteinFoods=/egg/.test(nrm)?1:1.25;
  return per100;
}
function friendlyAliasesForAfcd(name){
  const nrm=normalise(name), aliases=[];
  const add=(...values)=>values.forEach(v=>{if(v&&!aliases.includes(v))aliases.push(v);});
  if(/flat white|latte|cappuccino/.test(nrm))add("cappuccino","cappuccino with milk","coffee with milk","flat white","latte");
  if(/cake, carrot|carrot cake/.test(nrm))add("carrot cake","homemade carrot cake","cake carrot");
  if(/egg/.test(nrm)&&/poach/.test(nrm))add("poached egg","egg poached");
  if(/egg/.test(nrm)&&/boil/.test(nrm))add("boiled egg","hard boiled egg","egg boiled");
  if(/egg/.test(nrm)&&/fried/.test(nrm))add("fried egg","egg fried");
  if(/egg/.test(nrm)&&/scrambl/.test(nrm))add("scrambled egg","scrambled eggs");
  if(/omelette|omelet/.test(nrm))add("omelette","egg omelette","omelet");
  if(/^bacon\b/.test(nrm))add("bacon","bacon rasher","shortcut bacon","short cut bacon");
  if(/muffin/.test(nrm)&&/english/.test(nrm))add("english muffin","breakfast muffin");
  if(/^sausage/.test(nrm))add("sausage","sausages");
  if(/beef/.test(nrm)&&/steak/.test(nrm))add("beef steak","steak");
  if(/yoghurt|yogurt/.test(nrm))add("yoghurt","yogurt","greek yoghurt","greek yogurt");
  if(/cheese/.test(nrm))add("cheese");
  if(/potato/.test(nrm))add("potato","potatoes");
  if(/pumpkin/.test(nrm))add("pumpkin");
  if(/carrot/.test(nrm)&&!/cake/.test(nrm))add("carrot","carrots");
  if(/bread/.test(nrm)&&/wholemeal/.test(nrm))add("wholemeal bread","whole wheat bread");
  if(/soft drink/.test(nrm))add("soft drink","soda");
  return aliases;
}
function everydayAfcdFamily(food){
  const name=normalise(food.name), tests=[
    ["Coffee",/cappuccino|flat white|latte/],["Eggs",/\begg\b/],["Bacon",/\bbacon\b/],["English Muffins",/english.*muffin|muffin.*english/],["Bread",/\bbread\b/],
    ["Milk",/\bmilk\b/],["Yoghurt",/yoghurt|yogurt/],["Cheese",/\bcheese\b/],["Chicken",/\bchicken\b/],["Steak",/beef.*steak|steak.*beef/],["Sausages",/sausage/],
    ["Fish",/\btuna\b|\bsalmon\b|\bfish\b/],["Potatoes",/\bpotato/],["Pumpkin",/\bpumpkin\b/],["Carrots",/\bcarrot/],["Broccoli",/\bbroccoli\b/],["Tomatoes",/\btomato/],["Onions",/\bonion/],
    ["Fruit",/\bapple\b|\bbanana\b|\borange\b|mandarin|\bpear\b|berries|strawberry/],["Oats & Cereal",/rolled oat|oatmeal|\bcereal\b/],["Rice",/\brice\b/],["Pasta & Noodles",/\bpasta\b|\bnoodle/],
    ["Biscuits & Crackers",/biscuit|cracker/],["Carrot Cake",/cake, carrot|carrot cake/],["Baked Beans",/baked bean/],["Soup",/\bsoup\b/],["Pizza",/\bpizza\b/],["Burgers",/hamburger|\bburger\b/],
    ["Juice",/\bjuice\b/],["Soft Drink",/soft drink/]
  ];
  return tests.find(([,re])=>re.test(name))?.[0]||"";
}
function everydayAfcdPriority(food){const family=everydayAfcdFamily(food);if(!family)return 0;const order=["Coffee","Eggs","Bacon","English Muffins","Bread","Milk","Yoghurt","Cheese","Chicken","Steak","Sausages","Fish","Potatoes","Pumpkin","Carrots","Broccoli","Tomatoes","Onions","Fruit","Oats & Cereal","Rice","Pasta & Noodles","Biscuits & Crackers","Carrot Cake","Baked Beans","Soup","Pizza","Burgers","Juice","Soft Drink"];return 200-order.indexOf(family);}

function convertAfcdFood(raw){
  const gravity=n(raw.specificGravity),liquid=/water|juice|drink|beverage|coffee|tea|cordial|soft drink|milk/.test(normalise(raw.name));
  const units={g:.01,serving:1},labels={g:"g",serving:"100 g Serving"};
  if(liquid&&gravity>0){units.mL=gravity/100;labels.mL="mL";}
  return {id:raw.id,afcdKey:raw.afcdKey,sourceId:raw.afcdKey||raw.id,recordType:"afcd",verificationStatus:"verified",market:"AU",name:raw.name,brand:"Australian Food Composition Database",category:afcdCategory(raw),country:"Australia",aliases:friendlyAliasesForAfcd(raw.name),defaultAmount:liquid&&gravity>0?100:100,defaultUnit:liquid&&gravity>0?"mL":"g",units,unitLabels:labels,serving:"Reference Values per 100 g",nutrients:raw.nutrients,score:7,source:"Food Standards Australia New Zealand · AFCD Release 3",verified:true,ingredients:raw.description||"",allergens:[],waterMl:n(raw.moisture),hydrationType:liquid?"drink":"food",foodGroups:afcdFoodGroups(raw),afcd:true,derivation:raw.derivation||""};
}
async function loadAfcdFoods(){
  if(afcdLoaded)return AFCD_FOODS;
  try{const response=await fetch("./afcd-release-3.json",{cache:"force-cache"});if(!response.ok)throw new Error("AFCD file unavailable");const data=await response.json();AFCD_FOODS=(data.foods||[]).map(convertAfcdFood);afcdLoaded=true;if(by("food-results")&&q("#food-library.active"))renderLibrary();if(by("recipe-search")&&q("#recipe-builder.active"))renderRecipeSearch();return AFCD_FOODS;}catch(error){console.warn("AFCD local database could not be loaded",error);AFCD_FOODS=[];afcdLoaded=true;return AFCD_FOODS;}
}
function nonRecipeFoods(){
  const custom = (ext.customFoods || []).map(f => ({...f,source:f.source || "User Created",verified:false}));
  return [...FOODS,...custom,...AFCD_FOODS,...(ext.onlineFoods||[])];
}
function allFoods(){
  const recipes = (ext.recipes || []).map(r => recipeAsFood(r));
  return [...nonRecipeFoods(),...recipes,...(window.HECOpenFoodFactsAU?.loadedFoods?.values?.()||[])];
}
function getFood(id){ return allFoods().find(f => f.id === id)||window.HECOpenFoodFactsAU?.getLoaded?.(id); }
function unitOptions(food){ return food?.units || {serving:1}; }
function defaultAmount(food){ return food?.defaultAmount ?? 1; }
function defaultUnit(food){ return food?.defaultUnit || Object.keys(unitOptions(food))[0] || "serving"; }
function cleanMeasureText(value){return String(value||'').replace(/-?\d+(?:\.\d+)?(?=\s*(?:g|ml)\b)/gi,token=>window.HECFoodCatalogue?.displayQuantity?.(token)??token).replace(/\s+/g,' ').trim();}
function unitLabel(food,unit){ const label=titleUnit(food?.unitLabels?.[unit] || unit);return cleanMeasureText(label.replace(/^1\s+(?=[A-Za-z])/,'') ); }
function cleanUserUnitLabel(label){return cleanMeasureText(String(label||'').replace(/Package Serve\s*\((?:1\s*)?Serving\s*\(([^)]+)\)\)/i,'Serve ($1)').replace(/Package Serve/i,'Serve').replace(/(?:1\s*)?100\s*g\s*Serving/i,'100 g').replace(/\bMpara\b/gi,'Serve'));}
function friendlyUnitLabel(food,unit,amount=1){let label=cleanUserUnitLabel(unitLabel(food,unit));const a=Number(amount);if(a>0&&a<=1)return label;const simple={egg:'Egg',largeEgg:'Large Egg',mediumEgg:'Medium Egg',smallEgg:'Small Egg',xLargeEgg:'X-Large Egg',jumboEgg:'Jumbo Egg',kingEgg:'King-Size Egg',eggWhite:'Egg White',yolk:'Egg Yolk',sausage:'Sausage',thinSausage:'Long Thin Sausage',thickSausage:'Long Thick Sausage',cocktailSausage:'Cocktail Sausage',slice:'Slice',regularSlice:'Regular Slice',thickSlice:'Thick Slice',bar:'Bar',sachet:'Sachet',biscuit:'Biscuit',cracker:'Cracker',crispbread:'Crispbread',chip:'Chip',tbsp:'Tablespoon',tsp:'Teaspoon',mL:'mL',g:'g',piece:'Piece',item:'Item',serve:'Serve',bottle:'Bottle',can:'Can',tub:'Tub'};let base=simple[unit]||label;if(/\([^)]*\)/.test(base)){const m=base.match(/^(.*?)\s*(\([^)]*\))$/);if(m){let word=m[1].trim();if(!/s$/i.test(word))word+='s';return `${word} ${m[2]}`;}}if(!/s$/i.test(base)&&!/^(g|mL|kg|L)$/i.test(base))base+='s';return base;}
function formatNaturalAmount(value){const x=Number(value);if(Math.abs(x-.25)<.001)return '¼';if(Math.abs(x-.5)<.001)return '½';if(Math.abs(x-.75)<.001)return '¾';return window.HECFoodCatalogue?.displayQuantity?.(x)??formatNumber(x,true);}
function naturalMetricEquivalent(food,amount,unit){const a=Number(amount),units=unitOptions(food||{}),m=Number(units?.[unit]);if(!Number.isFinite(a)||!Number.isFinite(m)||a<=0||m<=0||unit==='g'||unit==='mL')return null;const volumeUnit=['tbsp','tsp','cup','drizzle'].includes(unit);if(volumeUnit&&Number(units.mL)>0){const v=a*m/Number(units.mL);if(Number.isFinite(v)&&v>0)return{value:v,unit:'mL'};}if(Number(units.g)>0){const v=a*m/Number(units.g);if(Number.isFinite(v)&&v>0)return{value:v,unit:'g'};}if(Number(units.mL)>0){const v=a*m/Number(units.mL);if(Number.isFinite(v)&&v>0)return{value:v,unit:'mL'};}return null;}
function entryNaturalQuantity(entry){const unit=entry?.unit||'serving',amount=Number(entry?.amount),food=getFood(entry?.foodId)||{units:{[unit]:1},unitLabels:{[unit]:entry?.unitLabel||unit}};const names={egg:'Egg',largeEgg:'Large Egg',mediumEgg:'Medium Egg',smallEgg:'Small Egg',xLargeEgg:'X-Large Egg',jumboEgg:'Jumbo Egg',kingEgg:'King-Size Egg',eggWhite:'Egg White',yolk:'Egg Yolk',sausage:'Sausage',thinSausage:'Long Thin Sausage',thickSausage:'Long Thick Sausage',cocktailSausage:'Cocktail Sausage',slice:'Slice',regularSlice:'Regular Slice',thickSlice:'Thick Slice',bar:'Bar',sachet:'Sachet',biscuit:'Biscuit',cracker:'Cracker',crispbread:'Crispbread',chip:'Chip',tbsp:'Tablespoon',tsp:'Teaspoon',cup:'Cup',drizzle:'Small Drizzle',mL:'mL',g:'g',piece:'Piece',item:'Item',serve:'Serve',bottle:'Bottle',can:'Can',tub:'Tub',smallHandful:'Small Handful'};let label=names[unit]||cleanUserUnitLabel(entry?.unitLabel||unitLabel(food,unit)).replace(/\s*\([^)]*(?:g|mL)[^)]*\)\s*$/i,'').trim();if(amount>1&&!/^(g|mL|kg|L)$/i.test(label)&&!/s$/i.test(label))label+='s';let metric=naturalMetricEquivalent(food,amount,unit)||entry?.metricEquivalent;const metricText=metric&&Number(metric.value)>0?(amount>1?` · ${formatNumber(metric.value,true)} ${metric.unit} total`:` (${formatNumber(metric.value,true)} ${metric.unit})`):'';return `${formatNaturalAmount(amount)} ${label}${metricText}`.trim();}

function foodMultiplier(food,amount,unit){ return Math.max(0,n(amount)) * (unitOptions(food)[unit] ?? 1); }
function scaledNutrients(food,amount,unit){
  const multiplier = foodMultiplier(food,amount,unit);
  const result = {};
  NUTRIENT_KEYS.forEach(key => {
    const value = food?.nutrients?.[key];
    result[key] = value === null || value === undefined || value === "" ? null : Number(value) * multiplier;
  });
  Object.entries(food?.nutrients || {}).forEach(([key,value]) => {
    if(!(key in result)) result[key] = value === null || value === undefined ? null : Number(value) * multiplier;
  });
  return result;
}
function scaledFoodGroups(food,amount,unit){
  const multiplier = foodMultiplier(food,amount,unit);
  const result = Object.fromEntries(FOOD_GROUP_KEYS.map(key => [key,0]));
  FOOD_GROUP_KEYS.forEach(key => { result[key] = n(food?.foodGroups?.[key]) * multiplier; });
  return result;
}
function foodGroupAttributionState(food){return FOOD_GROUPS?.stateForFood?.(food)||((food?.foodGroups&&Object.values(food.foodGroups).some(value=>Number(value)!==0))?'classified':'unavailable');}
function scaledWaterMl(food,amount,unit){ return Math.max(0,n(food?.waterMl) * foodMultiplier(food,amount,unit)); }
function sumNutrients(items){
  const totals = {...ZERO_NUTRIENTS};
  items.forEach(item => NUTRIENT_KEYS.forEach(key => { if(item?.nutrients?.[key] !== null && item?.nutrients?.[key] !== undefined) totals[key] += Number(item.nutrients[key]) || 0; }));
  return totals;
}
function sumGroupValues(items){
  const totals = Object.fromEntries(FOOD_GROUP_KEYS.map(key => [key,0]));
  items.forEach(item => FOOD_GROUP_KEYS.forEach(key => { totals[key] += n(item?.foodGroups?.[key]); }));
  return totals;
}
function ageForProfile(){
  const dob=mainData().personal?.dob;if(!dob)return 40;
  const born=new Date(`${dob}T12:00:00`),now=new Date();let age=now.getFullYear()-born.getFullYear();
  if(now.getMonth()<born.getMonth()||(now.getMonth()===born.getMonth()&&now.getDate()<born.getDate()))age--;
  return age;
}
function foodGroupGoals(){
  const main=mainData(),age=ageForProfile(),sex=main.health?.sex,status=String(main.dietary?.["pregnancy-status"]||"").toLowerCase();
  if(status.includes("pregnant")) return {vegetables:5,fruit:2,grains:8.5,proteinFoods:3.5,dairy:2.5};
  if(status.includes("breast")) return {vegetables:7.5,fruit:2,grains:9,proteinFoods:2.5,dairy:2.5};
  if(sex==="male"){
    if(age>=71)return {vegetables:5,fruit:2,grains:4.5,proteinFoods:2.5,dairy:3.5};
    if(age>=51)return {vegetables:5.5,fruit:2,grains:6,proteinFoods:2.5,dairy:2.5};
    return {vegetables:6,fruit:2,grains:6,proteinFoods:3,dairy:2.5};
  }
  if(age>=71)return {vegetables:5,fruit:2,grains:3,proteinFoods:2,dairy:4};
  if(age>=51)return {vegetables:5,fruit:2,grains:4,proteinFoods:2,dairy:4};
  return {vegetables:5,fruit:2,grains:6,proteinFoods:2.5,dairy:2.5};
}
function hydrationReference(){
  const main=mainData(),status=String(main.dietary?.["pregnancy-status"]||"").toLowerCase();
  if(status.includes("breast"))return {total:3500,fluids:2600};
  if(status.includes("pregnant"))return {total:3100,fluids:2300};
  if(main.health?.sex==="male")return {total:3400,fluids:2600};
  return {total:2800,fluids:2100};
}
function hasEnergyValue(value){ return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)); }
function energyText(value,officialKj=null){
  if(!hasEnergyValue(value))return "Energy Not Available";
  const cal=Number(value),kj=hasEnergyValue(officialKj)?Number(officialKj):Math.round(cal*4.184);
  return `${formatNumber(cal)} Cal · ${formatNumber(kj)} kJ`;
}
function calculationDiagnostics(date){
  const recorded = recordedEntriesForDate(date);
  const missing = recorded.filter(entry => !hasEnergyValue(entry?.nutrients?.calories));
  return {recorded,missing,total:dayNutrition(date).calories};
}
function nutrientText(value,unit,detail=false){ return value === null || value === undefined ? "Not Available" : `${formatNumber(value,detail)} ${unit}`; }
function nutritionCards(values){
  const cards = [
    ["Protein",values.protein,"g",true],["Carbohydrate",values.carbs,"g",true],["Fat",values.fat,"g",true],
    ["Saturated Fat",values.satFat,"g",true],["Fibre",values.fibre,"g",true],["Sugars",values.sugar,"g",true],["Sodium",values.sodium,"mg",false]
  ];
  return `<div class="nutrition-card-grid"><div><span>Energy</span><strong>${energyText(values.calories,values.energyKj)}</strong></div>${cards.map(([label,value,unit,detail]) => `<div><span>${label}</span><strong>${nutrientText(value,unit,detail)}</strong></div>`).join("")}</div>`;
}
function foodSafety(food){
  const main = mainData();
  const d = main.dietary || {};
  const absolute = normalise([d["food-allergies"],d["food-intolerances"],d["medical-restrictions"],d["foods-never"]].filter(Boolean).join(" "));
  if(!absolute) return {blocked:false,message:""};
  const haystack = normalise([food.name,food.ingredients,(food.allergens||[]).join(" ")].join(" "));
  const tokens = absolute.split(" ").filter(t => t.length > 2);
  const hits = [...new Set(tokens.filter(t => haystack.includes(t)))];
  return hits.length ? {blocked:true,message:`Check your profile restriction: ${hits.join(", ")}.`} : {blocked:false,message:""};
}
function scoreExplanation(score){
  if(score >= 9) return "Strong everyday choice with useful nutrients and minimal processing.";
  if(score >= 8) return "A good fit for many balanced meal plans.";
  if(score >= 7) return "Generally suitable; consider the complete meal and daily plan.";
  if(score >= 5) return "Can fit, but serving size or meal balance may need attention.";
  return "Review the portion, ingredients and how it fits your day.";
}
function recipeProfile(recipe){
  const servings=Math.max(1,n(recipe.servings)||1);
  const items=(recipe.ingredients||[]).map(i=>{const food=nonRecipeFoods().find(f=>f.id===i.foodId);return {foodGroups:scaledFoodGroups(food,i.amount,i.unit),waterMl:scaledWaterMl(food,i.amount,i.unit),hydrationType:food?.hydrationType||"food"};});
  const groups=sumGroupValues(items);FOOD_GROUP_KEYS.forEach(key=>groups[key]/=servings);
  return {foodGroups:groups,waterMl:items.reduce((sum,i)=>sum+n(i.waterMl),0)/servings,hydrationType:"food"};
}
function recipeAsFood(recipe){
  const profile=recipeProfile(recipe);
  return {id:recipe.id,sourceId:recipe.id,recordType:"recipe",verificationStatus:"user-confirmed",market:"AU",name:recipe.name,brand:"My Recipe",category:"Recipe",country:"Australia",aliases:[recipe.name],defaultAmount:1,defaultUnit:"serve",units:{serve:1},unitLabels:{serve:"recipe serving"},serving:`1 of ${recipe.servings} servings`,nutrients:recipe.perServe,foodGroups:recipe.foodGroups||profile.foodGroups,waterMl:n(recipe.waterMl)||profile.waterMl,hydrationType:"food",score:recipe.score || 7,source:"User Recipe",verified:false,ingredients:recipe.ingredients.map(i => i.name).join(", "),allergens:[]};
}
function recommendedNormalTarget(){
  const main=mainData(),r=main.recommendations||{};
  const exact=n(r.targetCal);if(exact>=300)return whole(exact);
  const fromKj=n(r.energyKj)/4.184;if(fromKj>=300)return whole(fromKj);
  const stored=n(ext.dayTypeTargets?.normal);if(stored>=300&&ext.dayTypeTargets?.normalSource==="profile")return whole(stored);
  return 0;
}
function balancedMacroTargets(calories){
  const main=mainData(),r=main.recommendations||{},profileProtein=n(r.protein),profileFat=n(r.fat),profileCarbs=n(r.carbs),cal=Math.max(300,n(calories));
  const profileEnergy=profileProtein*4+profileFat*9+profileCarbs*4,proteinShare=profileEnergy?profileProtein*4/profileEnergy:0;
  if(profileEnergy&&proteinShare>=.15&&proteinShare<=.30)return {protein:profileProtein,fat:profileFat,carbs:profileCarbs};
  const goal=main.health?.goal||"maintain",proteinPct=goal==="lose"?.25:.20,fatPct=.30;
  const protein=whole(cal*proteinPct/4),fat=whole(cal*fatPct/9),carbs=Math.max(0,whole((cal-protein*4-fat*9)/4));return {protein,fat,carbs};
}
function currentGoals(date=isoToday()){
  const settings=ext.daySettings[date]||{},type=settings.type||"normal";
  const standard=type==="fasting"?(n(ext.dayTypeTargets?.fasting)||500):recommendedNormalTarget();
  const calTarget=settings.customTarget?(n(settings.targetCal)||standard):standard;
  const exerciseCredit=(ext.exercise||[]).filter(x=>ACTIVITY.localDateOf(x)===date).reduce((sum,x)=>sum+activityAllowanceCredit(x),0),hydration=hydrationReference(),macros=balancedMacroTargets(calTarget||300);
  return {calories:calTarget?calTarget+exerciseCredit:0,baseCalories:calTarget,exerciseCredit,hydration:hydration.fluids,fluids:hydration.fluids,protein:calTarget?macros.protein:0,fat:calTarget?macros.fat:0,carbs:calTarget?macros.carbs:0,fibre:30,sugar:null,freeSugar:calTarget?calTarget*.10/4:0,addedSugar:calTarget?calTarget*.10/4:0,sodium:2000,steps:10000,foodGroups:foodGroupGoals(),dayType:type};
}
function entriesForDate(date){ return ext.diary[date] || []; }
function recordedEntriesForDate(date){ return entriesForDate(date).filter(e => e && e.status!=="skipped"); }
function dayNutrition(date){ return sumNutrients(recordedEntriesForDate(date)); }
function entryFoodProfile(entry){
  const food=getFood(entry.foodId),foodGroups=entry.foodGroups||scaledFoodGroups(food,entry.amount,entry.unit),foodGroupAttribution=entry.foodGroupAttribution||foodGroupAttributionState(food);
  return {foodGroups,foodGroupAttribution,waterMl:entry.waterMl!==undefined?n(entry.waterMl):scaledWaterMl(food,entry.amount,entry.unit),hydrationType:entry.hydrationType||food?.hydrationType||"food"};
}
function dayFoodGroupSummary(date){return FOOD_GROUPS?.summarise?.(recordedEntriesForDate(date).map(entry=>entryFoodProfile(entry)))||{state:'classified',values:sumGroupValues(recordedEntriesForDate(date).map(entry=>entryFoodProfile(entry))),incomplete:false};}
function dayFoodGroups(date){
  return dayFoodGroupSummary(date).values;
}
function dayHydration(date,includeManual=true){
  const manual=includeManual?n(ext.water[date]):0;let drinks=manual,foodMoisture=0;
  recordedEntriesForDate(date).forEach(entry=>{const profile=entryFoodProfile(entry);if(profile.hydrationType==="drink")drinks+=profile.waterMl;else foodMoisture+=profile.waterMl;});
  return {manual,drinks,foodMoisture,total:drinks+foodMoisture};
}
function daySummary(date){
  const nutrients = dayNutrition(date);
  const hydration=dayHydration(date,true);
  const foodGroupSummary=dayFoodGroupSummary(date);return {nutrients,hydration,water:hydration.drinks,steps:n(ext.steps[date]),foodGroups:foodGroupSummary.values,foodGroupSummary,goals:currentGoals(date)};
}

function openFeature(id,options={}){
  // app.js show() owns normal screen switching. This fallback keeps the same
  // cleanup contract if a host ever runs without that show() helper.
  if(typeof window.show !== "function")window.HECBeforeScreenShow?.(id);
  if(options.fromHome){
    const today=isoToday();
    if(id==="food-diary")ext.ui.diaryDate=today;
    if(id==="daily-progress")ext.ui.progressDate=today;
    if(id==="meal-planner"){ext.ui.plannerDate=today;resetPlannerSelections();}
    if(id==="food-library"){ext.ui.pendingMeal="";ext.ui.foodSearch="";ext.ui.libraryTab="all";}
    saveExt();
  }
  if(id==="food-library"&&options.freshSearch){ext.ui.foodSearch="";ext.ui.libraryTab="all";saveExt();}
  if(typeof window.show === "function") window.show(id,{speak:false});
  else { qa(".screen").forEach(s => s.classList.remove("active")); by(id)?.classList.add("active"); window.scrollTo(0,0); }
  if(id === "home") renderHomeSummary();
  if(id === "food-diary") renderDiary();
  if(id === "food-library") renderLibrary();
  if(id === "daily-progress") renderDailyProgress();
  if(id === "exercise-log") renderExercise();
  if(id === "progress-history")renderHistory(currentPeriod());
  if(id === "nutrition-trends")renderNutritionTrends();
  if(id === "shopping-list") renderShopping();
  if(id === "food-preferences") renderFoodPreferences();
  if(id === "family-connections") renderConnections();
  if(id === "recipe-builder") renderRecipeBuilder();
  if(id === "meal-planner") initialisePlanner();
  if(id === "scan-centre") renderScanSelect();
  if(id === "printable-report") initialiseReport();
  if(id === "quick-log") initialiseVoice();
}
window.openAlpha05Feature = openFeature;

document.addEventListener("click",event => {
  const scanButton=event.target.closest("[data-open-scan-mode]");
  if(scanButton){event.preventDefault();const mode=scanButton.dataset.openScanMode||"barcode";stopBarcodeCamera();ext.ui.scanMode=mode;saveExt();openFeature("scan-centre");if(mode==="barcode")startBarcodeCamera();return;}
  const button = event.target.closest("[data-open-feature]");
  if(button){ event.preventDefault();if(button.id==="diary-plan-multiple"){resetPlannerSelections();ext.ui.singleMealPreferences={};saveExt();} openFeature(button.dataset.openFeature); }
});

function shiftISO(date,days){ const d=new Date((date||isoToday())+"T12:00:00");d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function mealNames(){ return ["Breakfast","Lunch","Dinner","Snacks","Other"]; }
function plannerMealNames(){ return ["Breakfast","Lunch","Dinner","Snacks","Other"]; }

const FOOD_VARIANT_SCHEMAS={
  egg:{fields:[
    {key:"eggType",label:"Egg Type",options:[["chicken","Chicken Egg"],["duck","Duck Egg"],["quail","Quail Egg"]]},
    {key:"eggSize",label:"Size",options:[["small","Small"],["medium","Medium"],["large","Large"],["xlarge","Extra Large"]]},
    {key:"eggPrep",label:"Cooking Method",options:[["raw","Raw"],["boiled","Boiled"],["poached","Poached in Water"],["microwave-poached","Microwave-Poached"],["fried","Fried"],["oven-baked","Oven-Baked"],["other","Other Cooking Method"]]}
  ],defaults:{eggType:"chicken",eggSize:"large",eggPrep:"boiled",eggAdded:"none",eggOther:""}},
  "scrambled-eggs":{fields:[
    {key:"eggDishAppliance",label:"Cooking Method",options:[["stovetop","Stovetop"],["microwave","Microwave"],["oven","Oven-Baked"],["other","Other Cooking Method"]]},
    {key:"eggDishFat",label:"Cooking Fat",options:[["none","None"],["spray","Cooking Spray"],["oil","Oil"],["butter","Butter"],["margarine","Margarine"]]},
    {key:"eggDishLiquid",label:"Liquid / Protein Addition",options:[["none","None"],["water","Water"],["milk","Milk"],["cottage-cheese","Cottage Cheese"],["cream","Cream"]]},
    {key:"eggDishExtra",label:"Common Extra",options:[["plain","Plain"],["cheese","Cheese"],["bacon","Bacon"],["ham","Ham"],["vegetables","Vegetables"],["custom","Customise in Recipe Builder"]]}
  ],defaults:{eggDishAppliance:"stovetop",eggDishFat:"none",eggDishLiquid:"none",eggDishExtra:"plain",eggDishOther:""}},
  omelette:{fields:[
    {key:"eggDishAppliance",label:"Cooking Method",options:[["stovetop","Stovetop"],["microwave","Microwave Omelette Container"],["oven","Oven-Baked"],["air-fryer","Air-Fried"],["other","Other Cooking Method"]]},
    {key:"eggDishFat",label:"Cooking Fat",options:[["none","None"],["spray","Cooking Spray"],["oil","Oil"],["butter","Butter"],["margarine","Margarine"]]},
    {key:"eggDishLiquid",label:"Liquid / Protein Addition",options:[["none","None"],["water","Water"],["milk","Milk"],["cottage-cheese","Cottage Cheese"],["cream","Cream"]]},
    {key:"eggDishExtra",label:"Filling",options:[["plain","Plain"],["cheese","Cheese"],["ham-cheese","Ham & Cheese"],["bacon-cheese","Bacon & Cheese"],["vegetables","Vegetables"],["custom","Customise in Recipe Builder"]]}
  ],defaults:{eggDishAppliance:"stovetop",eggDishFat:"none",eggDishLiquid:"none",eggDishExtra:"plain",eggDishOther:""}},
  potato:{fields:[
    {key:"potatoType",label:"Potato Type",options:[["pale","Pale Skin"],["red","Red / Dark Skin"]]},
    {key:"potatoSkin",label:"Skin",options:[["peeled","Peeled"],["unpeeled","Unpeeled"]]},
    {key:"potatoPrep",label:"Cooking Method",options:[["raw","Raw"],["boiled","Boiled"],["steamed","Steamed"],["microwaved","Microwaved"],["baked","Oven-Baked"],["roasted","Roasted"],["air-fried","Air-Fried"],["mashed","Mashed"],["fried","Fried"],["other","Other Cooking Method"]]},
    {key:"potatoAdded",label:"Added Ingredients",options:[["none","No Additions"],["milk","With Milk"],["milk-margarine","Milk & Margarine"],["milk-dairyblend","Milk & Dairy Blend"],["milk-butter","Milk & Butter"],["oil","Oil Added"]]}
  ],defaults:{potatoType:"pale",potatoSkin:"unpeeled",potatoPrep:"boiled",potatoAdded:"none",potatoOther:""}},
  "beef-sausage":{fields:[{key:"cookMethod",label:"Cooking Method",options:[["grilled","Grilled"],["air-fried","Air-Fried"],["barbecued","Barbecued"],["oven-baked","Oven-Baked"],["pan-fried","Pan-Fried"],["other","Other Cooking Method"]]},{key:"cookFat",label:"Added Cooking Fat",options:[["none","None"],["spray","Cooking Spray"],["oil","Oil"],["butter","Butter"],["margarine","Margarine"]]}],defaults:{cookMethod:"air-fried",cookFat:"none",cookOther:""}},
  "beef-steak":{fields:[{key:"cookMethod",label:"Cooking Method",options:[["grilled","Grilled"],["air-fried","Air-Fried"],["barbecued","Barbecued"],["oven-baked","Oven-Baked"],["pan-fried","Pan-Fried"],["other","Other Cooking Method"]]},{key:"cookFat",label:"Added Cooking Fat",options:[["none","None"],["spray","Cooking Spray"],["oil","Oil"],["butter","Butter"],["margarine","Margarine"]]}],defaults:{cookMethod:"grilled",cookFat:"none",cookOther:""}},
  "beef-rissole":{fields:[{key:"cookMethod",label:"Cooking Method",options:[["grilled","Grilled"],["air-fried","Air-Fried"],["barbecued","Barbecued"],["oven-baked","Oven-Baked"],["pan-fried","Pan-Fried"],["other","Other Cooking Method"]]},{key:"cookFat",label:"Added Cooking Fat",options:[["none","None"],["spray","Cooking Spray"],["oil","Oil"],["butter","Butter"],["margarine","Margarine"]]}],defaults:{cookMethod:"air-fried",cookFat:"none",cookOther:""}},
  "chicken-breast":{fields:[{key:"cookMethod",label:"Cooking Method",options:[["grilled","Grilled"],["air-fried","Air-Fried"],["barbecued","Barbecued"],["oven-baked","Oven-Baked"],["pan-fried","Pan-Fried"],["other","Other Cooking Method"]]},{key:"cookFat",label:"Added Cooking Fat",options:[["none","None"],["spray","Cooking Spray"],["oil","Oil"],["butter","Butter"],["margarine","Margarine"]]}],defaults:{cookMethod:"grilled",cookFat:"none",cookOther:""}}
};
function variantSchema(food){return FOOD_VARIANT_SCHEMAS[food?.id]||null;}
function selectedVariantValues(){const out={};qa("[data-variant-key]").forEach(select=>out[select.dataset.variantKey]=select.value);return out;}
function resolveVariantFood(food,values={}){
  if(!food)return food;const schema=variantSchema(food);if(!schema)return food;
  const v={...schema.defaults,...values};const resolved=clone(food);
  const addCalories=(cal)=>{resolved.nutrients.calories=n(resolved.nutrients.calories)+cal;resolved.nutrients.fat=n(resolved.nutrients.fat)+cal/9;};
  if(food.id==="egg"){
    const bases={chicken:{small:54,medium:63,large:72,xlarge:80},duck:{small:110,medium:120,large:130,xlarge:145},quail:{small:12,medium:14,large:16,xlarge:18}};
    const cal=bases[v.eggType]?.[v.eggSize]||72,ratio=cal/72;resolved.nutrients=Object.fromEntries(Object.entries(food.nutrients).map(([k,val])=>[k,val==null?val:Number(val)*ratio]));
    const prepLabels={raw:"Raw",boiled:"Boiled",poached:"Poached", "microwave-poached":"Microwave-Poached",fried:"Fried","oven-baked":"Oven-Baked",other:"Other Method"};
    if(v.eggPrep==="fried")addCalories({none:0,spray:5,oil:40,butter:36,margarine:34}[v.eggAdded]||0);
    resolved.name=`${v.eggSize==="xlarge"?"Extra Large":titleUnit(v.eggSize)} ${titleUnit(v.eggType)} Egg, ${prepLabels[v.eggPrep]||titleUnit(v.eggPrep)}`;
    if(v.eggPrep==="fried"&&v.eggAdded!=="none")resolved.name+=` (${titleUnit(v.eggAdded)})`;
    if(v.eggPrep==="other"&&v.eggOther)resolved.name+=` — ${v.eggOther}`;
    resolved.serving="1 Egg";resolved.source="Guided Preparation Estimate · Review Ingredients";
  } else if(food.id==="scrambled-eggs"||food.id==="omelette"){
    const fat={none:0,spray:5,oil:40,butter:36,margarine:34}[v.eggDishFat]||0;
    const liquid={none:0,water:0,milk:12,"cottage-cheese":25,cream:35}[v.eggDishLiquid]||0;
    const extras=food.id==="omelette"?{plain:0,cheese:55,"ham-cheese":85,"bacon-cheese":105,vegetables:25,custom:0}:{plain:0,cheese:55,bacon:55,ham:30,vegetables:25,custom:0};
    addCalories(fat+liquid+(extras[v.eggDishExtra]||0));
    const appliance={stovetop:"Stovetop",microwave:"Microwave",oven:"Oven-Baked","air-fryer":"Air-Fried",other:"Other Method"}[v.eggDishAppliance]||titleUnit(v.eggDishAppliance);
    resolved.name=`${food.name}, ${appliance}`;
    if(v.eggDishLiquid!=="none")resolved.name+=` + ${titleUnit(v.eggDishLiquid)}`;
    if(v.eggDishExtra!=="plain"&&v.eggDishExtra!=="custom")resolved.name+=` + ${titleUnit(v.eggDishExtra.replace(/-/g," "))}`;
    if(v.eggDishExtra==="custom")resolved.source="Quick Estimate Only · Use Recipe Builder for Exact Custom Ingredients";
  } else if(food.id==="potato"){
    const per100={raw:77,boiled:77,steamed:80,microwaved:82,baked:93,roasted:150,"air-fried":135,mashed:88,fried:290,other:90};let cal=per100[v.potatoPrep]||77;
    const add={none:0,milk:12,"milk-margarine":42,"milk-dairyblend":38,"milk-butter":50,oil:45}[v.potatoAdded]||0;cal+=add;const ratio=(cal*1.5)/116;resolved.nutrients=Object.fromEntries(Object.entries(food.nutrients).map(([k,val])=>[k,val==null?val:Number(val)*ratio]));resolved.nutrients.calories=cal*1.5;resolved.name=`Potato, ${titleUnit(v.potatoSkin)}, ${titleUnit(v.potatoPrep.replace(/-/g," "))}`;if(v.potatoAdded!=="none")resolved.name+=` (${titleUnit(v.potatoAdded.replace(/-/g," "))})`;resolved.source="Guided Preparation Estimate · 150 g Serving";
  } else if(["beef-sausage","beef-steak","beef-rissole","chicken-breast"].includes(food.id)){
    addCalories({none:0,spray:5,oil:40,butter:36,margarine:34}[v.cookFat]||0);resolved.name=`${food.name.replace(/, (Cooked|Grilled)$/i,"")}, ${titleUnit(v.cookMethod.replace(/-/g," "))}`;if(v.cookFat!=="none")resolved.name+=` + ${titleUnit(v.cookFat)}`;resolved.source="Guided Cooking-Method Estimate · Review Quantity";
  }
  resolved.variantSelections=v;return resolved;
}
function renderVariantOptions(food,existing={}){
  const holder=by("entry-variant-options"),schema=variantSchema(food);if(!holder)return;
  holder.classList.toggle("hidden",!schema);if(!schema){holder.innerHTML="";return;}
  const values={...schema.defaults,...existing};
  const visibleFields=schema.fields.filter(field=>{
    if(food.id==="egg"&&field.key==="eggAdded")return values.eggPrep==="fried";
    return true;
  });
  const otherKey=food.id==="egg"?"eggPrep":(["scrambled-eggs","omelette"].includes(food.id)?"eggDishAppliance":food.id==="potato"?"potatoPrep":"cookMethod");
  const otherValue=values[otherKey];
  holder.innerHTML=`<h3>Choose the Exact Food and Preparation</h3><p class="fine">Only choices that can affect identification or nutrition are shown. Review each selection.</p><div class="form-grid">${visibleFields.map(field=>`<label>${esc(field.label)}<select data-variant-key="${esc(field.key)}">${field.options.map(([value,label])=>`<option value="${esc(value)}" ${values[field.key]===value?"selected":""}>${esc(label)}</option>`).join("")}</select></label>`).join("")}${otherValue==="other"?`<label class="variant-other-note">Describe the Other Cooking Method<input data-variant-key="${food.id==="egg"?"eggOther":["scrambled-eggs","omelette"].includes(food.id)?"eggDishOther":food.id==="potato"?"potatoOther":"cookOther"}" value="${esc(values[food.id==="egg"?"eggOther":["scrambled-eggs","omelette"].includes(food.id)?"eggDishOther":food.id==="potato"?"potatoOther":"cookOther"]||"")}" placeholder="Briefly describe how it was cooked"></label>`:""}</div>${otherValue==="other"?'<p class="variant-help">Other methods are kept as a reviewed description. This trial will not silently guess calories from an unknown cooking method.</p>':""}`;
  qa("[data-variant-key]").forEach(el=>el.addEventListener(el.tagName==="SELECT"?"change":"input",()=>{if(el.tagName==="SELECT")renderVariantOptions(food,selectedVariantValues());updateEntryPreview();}));
}


function statusLabel(status){ return status === "skipped" ? "Removed" : status === "planned" ? "Planned" : "Recorded"; }
function relativeDateLabel(value){
  const today=isoToday(),tomorrow=shiftISO(today,1),yesterday=shiftISO(today,-1),formatted=formatDate(value);
  if(value===today)return `Today · ${formatted}`;
  if(value===tomorrow)return `Tomorrow · ${formatted}`;
  if(value===yesterday)return `Yesterday · ${formatted}`;
  return formatted;
}
function contextDate(context){
  if(context==="diary")return by("diary-date")?.value||ext.ui.diaryDate||isoToday();
  if(context==="planner")return by("planner-date")?.value||ext.ui.plannerDate||ext.ui.diaryDate||isoToday();
  return by("progress-date")?.value||ext.ui.progressDate||ext.ui.diaryDate||isoToday();
}
function updateDateControl(context,value){
  const input=by(`${context}-date`),label=by(`${context}-date-label`);if(input)input.value=value;if(label)label.textContent=relativeDateLabel(value);
}
let daySettingsDirty=false;
let daySettingsBaseline={type:"normal",targetCal:0,customTarget:false};
function setDaySettingsDirty(dirty){daySettingsDirty=!!dirty;by("save-day-settings")?.classList.toggle("hidden",!daySettingsDirty);}
function updateDaySettingsDirty(){
  const current={type:by("day-type")?.value||"normal",targetCal:whole(by("day-cal-target")?.value),customTarget:!!by("day-custom-target")?.checked};
  setDaySettingsDirty(current.type!==daySettingsBaseline.type||current.targetCal!==daySettingsBaseline.targetCal||current.customTarget!==daySettingsBaseline.customTarget);
}
function applyContextDate(context,value){
  if(context==="diary"){ext.ui.diaryDate=value;updateDateControl("diary",value);renderDiary();}
  else if(context==="planner"){ext.ui.plannerDate=value;updateDateControl("planner",value);resetPlannerSelections();saveExt();renderMealSuggestions();renderPlannerEnergySummary();}
  else{ext.ui.progressDate=value;updateDateControl("progress",value);renderDailyProgress();}
  saveExt();
}
function requestContextDate(context,value){
  if(context==="diary"&&daySettingsDirty){promptUnsavedDaySettings(()=>applyContextDate(context,value));return;}
  applyContextDate(context,value);
}
function initialiseDateControls(){
  ["diary","planner","progress"].forEach(context=>{
    const control=by(`${context}-date-control`),input=by(`${context}-date`);if(!control||!input)return;
    let startX=null;
    control.addEventListener("touchstart",event=>{startX=event.changedTouches?.[0]?.clientX??null;},{passive:true});
    control.addEventListener("touchend",event=>{if(startX===null)return;const endX=event.changedTouches?.[0]?.clientX??startX,delta=endX-startX;startX=null;if(Math.abs(delta)>45)requestContextDate(context,shiftISO(contextDate(context),delta<0?1:-1));},{passive:true});
    input.addEventListener("change",()=>requestContextDate(context,input.value||isoToday()));
  });
}
document.addEventListener("click",event=>{
  const shift=event.target.closest("[data-date-shift]");if(shift){const context=shift.dataset.dateTarget;requestContextDate(context,shiftISO(contextDate(context),n(shift.dataset.dateShift)));return;}
  const picker=event.target.closest("[data-date-picker]");if(picker){const input=by(`${picker.dataset.datePicker}-date`);if(input?.showPicker)input.showPicker();else input?.click();}
});

function renderHomeSummary(){
  if(!by("a05-home-summary")) return;
  const date = isoToday();
  const {nutrients,hydration,steps,goals} = daySummary(date);
  by("a05-home-date").textContent = formatDate(date);
  const settings = ext.daySettings[date];
  by("a05-home-context").textContent = settings?.type === "fasting" ? `Flexible fasting day · ${goals.baseCalories} Cal target` : "Your live progress comes directly from your diary entries.";
  const cards = [
    ["Energy",nutrients.calories,goals.calories,"Cal",false],["Protein",nutrients.protein,goals.protein,"g",false],
    ["Fluids",hydration.drinks,goals.hydration,"mL",false],["Steps",steps,goals.steps,"",false]
  ];
  by("a05-home-summary").innerHTML = cards.map(([label,value,target,unit]) => progressCard(label,value,target,unit,label === "Energy" ? "energy" : "positive",date)).join("");
}
window.renderAlpha05Home = renderHomeSummary;

function progressState(value,target,type,date){
  const ratio = target ? value/target : 0;
  if(type === "limit") return ratio > 1 ? ["red","Above Recommended Limit"] : ratio > .75 ? ["yellow","Approaching Daily Limit"] : ratio > .4 ? ["neutral","Below Daily Limit"] : ["neutral","Well Below Daily Limit"];
  if(type === "minimum") return ratio >= 1 ? ["green","Minimum Reached"] : ratio >= .65 ? ["yellow","Building Toward Goal"] : ["neutral","Still Building"];
  if(type === "energy" && ratio > 1.1) return ["red","Above Today’s Plan"];
  const now = new Date();
  const isToday = date === isoToday();
  const expected = isToday ? Math.min(1,Math.max(.08,(now.getHours()+now.getMinutes()/60-6)/16)) : 1;
  const recordedMeals=entriesForDate(date).filter(e=>e.status!=="skipped").length;
  if(isToday&&recordedMeals<3) return ["neutral","Early / Still Building"];
  if(ratio >= expected*.75 && ratio <= Math.max(expected*1.35,1.05)) return ["green","Around Today’s Target"];
  if(ratio >= expected*.45) return ["yellow","Still Building"];
  return ["neutral",isToday ? "Still Building" : "Below Goal"];
}
function progressCard(label,value,target,unit,type,date){
  const [state,text] = progressState(value,target,type,date);
  const pct = Math.min(100,Math.max(0,target ? value/target*100 : 0));
  return `<div class="progress-card ${state}"><div><strong>${esc(label)}</strong><span>${formatNumber(value)} / ${formatNumber(target)} ${esc(unit)}</span></div><div class="progress-track"><i style="width:${pct}%"></i></div><small>${text}</small></div>`;
}
function foodGroupCard(key,value,target,date,state='classified'){
  const pct=Math.min(100,Math.max(0,target?value/target*100:0));
  const incomplete=state!=='classified',label=incomplete?`${formatNumber(value,true)} classified serves recorded`:`${formatNumber(value,true)} of ${formatNumber(target,true)} serves`;
  return `<div class="food-group-card ${incomplete?'incomplete':''}"><div><strong>${esc(FOOD_GROUP_LABELS[key])}</strong><span>${label}</span></div><div class="progress-track"><i style="width:${pct}%"></i></div>${incomplete?'<small>Some recorded foods are not yet classified.</small>':''}</div>`;
}

// Diary and entries
function diaryDate(){ return by("diary-date")?.value || ext.ui.diaryDate || isoToday(); }
function renderDiary(){
  const date=ext.ui.diaryDate||by("diary-date")?.value||isoToday();ext.ui.diaryDate=date;updateDateControl("diary",date);
  const savedSettings=ext.daySettings[date]||{},type=savedSettings.type||"normal",normalTarget=recommendedNormalTarget(),baseTarget=type==="fasting"?(n(ext.dayTypeTargets?.fasting)||500):normalTarget,customTarget=!!savedSettings.customTarget,activeTarget=customTarget?(n(savedSettings.targetCal)||baseTarget):baseTarget;
  by("day-type").value=type;by("day-custom-target").checked=customTarget;by("day-cal-target").value=activeTarget?whole(activeTarget):"";by("day-cal-target-label").classList.toggle("hidden",!customTarget);by("day-base-target").textContent=baseTarget?`${formatNumber(baseTarget)} Cal`:"Recommendation Unavailable";by("day-target-label").textContent=type==="fasting"?"Preferred Fasting-Day Target":"Recommended Normal Target";
  daySettingsBaseline={type,targetCal:whole(activeTarget),customTarget};setDaySettingsDirty(false);
  by("day-settings-note").textContent=!baseTarget&&type==="normal"?"Your profile recommendation could not be recovered. Open Edit Health Profile and calculate your recommendations before saving this day.":type==="fasting"?"Fasting Day. Companion suggestions account for every food already recorded and keep the day within your fasting target.":"Normal Day. Your current accepted profile recommendation is used unless you deliberately choose a different target for this date.";
  const goals=currentGoals(date),summary=daySummary(date),recorded=summary.nutrients.calories,remaining=Math.max(0,(summary.goals.calories||0)-recorded);
  if(by("diary-day-type-summary"))by("diary-day-type-summary").textContent=baseTarget?`${type==="fasting"?"Fasting Day":"Normal Day"} · ${formatNumber(goals.baseCalories)} Cal`:`${type==="fasting"?"Fasting Day":"Normal Day"} · Target Needs Attention`;
  if(by("diary-day-plan-summary"))by("diary-day-plan-summary").textContent=`${formatNumber(recorded)} Cal Recorded${goals.calories?` · ${formatNumber(remaining)} Cal Remaining`:""}`;
  const groupState=summary.foodGroupSummary?.state||'classified',groupIncomplete=groupState!=='classified';by("diary-day-summary").innerHTML=`<article class="summary-slide"><span>${date===isoToday()?"Today’s Energy":relativeDateLabel(date).split(" · ")[0]+" Energy"}</span><div class="diary-kpi-row"><div><small>Goal</small><strong>${goals.calories?`${formatNumber(goals.calories)} Cal`:"Needs Review"}</strong></div><div><small>Recorded</small><strong>${formatNumber(recorded)} Cal</strong></div><div><small>Remaining</small><strong>${goals.calories?`${formatNumber(remaining)} Cal`:"—"}</strong></div></div></article><article class="summary-slide"><span>Macronutrients</span><div class="diary-kpi-row"><div><small>Protein</small><strong>${formatNumber(summary.nutrients.protein)} g</strong></div><div><small>Fat</small><strong>${formatNumber(summary.nutrients.fat)} g</strong></div><div><small>Carbs</small><strong>${formatNumber(summary.nutrients.carbs)} g</strong></div></div></article><article class="summary-slide"><span>Five Food Groups</span>${groupIncomplete?'<p class="fine">Breakdown not fully available · values below are classified serves only.</p>':''}<div class="mini-food-groups">${FOOD_GROUP_KEYS.map(key=>`<div><small>${esc(FOOD_GROUP_LABELS[key])}</small><strong>${formatNumber(summary.foodGroups[key],true)}${groupIncomplete?' classified':`/${formatNumber(summary.goals.foodGroups[key],true)}`}</strong></div>`).join("")}</div></article>`;
  const diagnostics=calculationDiagnostics(date),diagnosticBox=by("diary-calculation-status");diagnosticBox.className=`calculation-status compact-diary-status ${diagnostics.missing.length?"warning":"neutral"}`;diagnosticBox.classList.toggle("hidden",!diagnostics.missing.length);diagnosticBox.innerHTML=diagnostics.missing.length?`<strong>Check ${diagnostics.missing.length} ${diagnostics.missing.length===1?"Food":"Foods"}</strong><span>Energy is unavailable, so the day total may be incomplete.</span>`:"";
  const entries=entriesForDate(date).filter(e=>e.status!=="skipped");ext.ui.diaryView="all";
  by("diary-meals").innerHTML=mealNames().map(meal=>{const mealEntries=entries.filter(e=>e.meal===meal),totals=sumNutrients(mealEntries);return `<section class="meal-list-section redesigned-meal-section" data-meal-name="${esc(meal)}"><header class="meal-list-heading redesigned-meal-heading"><div><h3>${esc(meal)}</h3><strong>${formatNumber(totals.calories)} Cal</strong></div><small>${mealEntries.length?`${mealEntries.length} ${mealEntries.length===1?"Food":"Foods"}`:"No Foods Yet"}</small></header><div class="meal-simple-list">${mealEntries.length?mealEntries.map(entryCard).join(""):`<p class="meal-empty">No Foods Yet.</p>`}</div><footer class="meal-list-actions redesigned-meal-actions"><button class="meal-add-text" data-add-to-meal="${esc(meal)}" aria-label="Add food to ${esc(meal)}">＋ Add Food</button><button class="meal-suggest-text" data-suggest-context-meal="${esc(meal)}" aria-label="Ask the companion to suggest ${esc(meal)}">✨ Suggest</button><button class="meal-more-text" data-meal-menu="${esc(meal)}" aria-label="More ${esc(meal)} actions">•••</button></footer><div class="meal-menu-actions hidden" data-meal-actions="${esc(meal)}">${mealEntries.length?`<button data-copy-diary-meal="${esc(meal)}">Copy Meal</button><button data-move-diary-meal="${esc(meal)}">Move Meal</button><button data-save-meal-template="${esc(meal)}">Save As Reusable Meal</button><button data-clear-diary-meal="${esc(meal)}" class="delete-action">Clear ${esc(meal)}</button>`:`<span>No Additional Meal Actions Yet.</span>`}</div></section>`;}).join("");
  if(ext.ui.focusMeal){setTimeout(()=>{q(`[data-meal-name="${CSS.escape(ext.ui.focusMeal)}"]`)?.scrollIntoView({block:"start",behavior:"smooth"});ext.ui.focusMeal="";saveExt();},60);}saveExt();
}
function entryCard(entry){
  return `<article class="simple-diary-entry recorded-entry" data-entry-id="${esc(entry.id)}"><button class="entry-open" data-entry-edit="${esc(entry.id)}"><span><strong>${esc(entry.name)}</strong><small>${formatNaturalAmount(entry.amount)} ${esc(friendlyUnitLabel(getFood(entry.foodId)||{},entry.unit,entry.amount))}</small></span><b>${energyText(entry.nutrients?.calories)}</b></button><button class="entry-more" data-entry-menu="${esc(entry.id)}" aria-label="More actions for ${esc(entry.name)}">•••</button><div class="entry-inline-actions hidden" data-entry-actions="${esc(entry.id)}"><button data-entry-copy="${esc(entry.id)}">Copy</button><button data-entry-delete="${esc(entry.id)}" class="delete-action">Delete Food</button></div></article>`;
}
function addEntry(entry){
  const date = entry.date || isoToday();
  ext.diary[date] ||= [];
  ext.diary[date].push(entry);
  saveExt();
}
function findEntry(id){
  for(const [date,list] of Object.entries(ext.diary)){
    const index = list.findIndex(e => e.id === id);
    if(index >= 0) return {date,index,entry:list[index]};
  }
  return null;
}

let editorState = null;
function prepareEntry(food,{entry=null,date=null,meal=null,status="eaten",source=null,amount=null,unit=null}={}){
  if(!food)return;
  if(!entry&&window.HECFoodCatalogue&&!window.HECFoodCatalogue.canLog(food)){showActionToast(food.entryBlockedReason||'This item cannot be added to Diary as one fixed nutrition value.',null,8000);showFoodDetails(food.id);return;}
  const selectedMeal=entry?.meal||meal||ext.ui.pendingMeal||"";
  const defaultDate=date||entry?.date||(selectedMeal?(ext.ui?.mealEntrySession?.date||ext.ui.diaryDate||isoToday()):isoToday());
  editorState={foodId:food.id,entryId:entry?.id||null,returnTo:selectedMeal?"food-diary":"food-library",source:source||food.source,variantSelections:entry?.variantSelections||{},libraryOnly:!entry&&!selectedMeal,pendingDiarySave:false};
  by("entry-editor-title").textContent=entry?`Edit ${entry.name}`:`Review ${food.name}`;by("entry-date").value=entry?.date||defaultDate;by("entry-meal").value=selectedMeal;
  const destinationGrid=by("entry-date")?.closest(".form-grid");if(destinationGrid)destinationGrid.classList.toggle("hidden",editorState.libraryOnly);by("entry-status").value="eaten";by("entry-time").value=entry?.time||localClock();by("entry-notes").value=entry?.notes||"";
  by("entry-unit").innerHTML=Object.keys(unitOptions(food)).filter(x=>unitOptions(food)[x]!==undefined).map(u=>`<option value="${esc(u)}">${esc(cleanUserUnitLabel(unitLabel(food,u)))}</option>`).join("");const chosenUnit=entry?.unit||unit||defaultUnit(food);by("entry-unit").value=chosenUnit;by("entry-amount").value=entry?.amount??amount??defaultAmount(food);renderEntryFractionChoices(food,chosenUnit);
  renderVariantOptions(food,entry?.variantSelections||{});const safety=foodSafety(food);by("entry-source-warning").innerHTML=`<strong>${food.verified?"Verified Trial Source":"Review the Source"}</strong><p>${esc(food.source||"Source not supplied")}. ${safety.blocked?`<b class="danger-text">${esc(safety.message)}</b>`:"Check the quantity and details before adding."}</p>`;
  by("save-food-entry").textContent=entry?"Save Changes":editorState.libraryOnly?"Save Food":"Add To Diary";
  by("save-food-entry-and-food").classList.toggle("hidden",!!entry);
  if(!entry)by("save-food-entry-and-food").textContent=editorState.libraryOnly?"Add to Diary & Save to My Foods":"Add & Save to My Foods";updateEntryPreview();openFeature("food-entry-editor");
}
function renderEntryFractionChoices(food,unit){const box=by('entry-fraction-choices');if(!box)return;const allowed=(food?.fractionUnits||[]).includes(unit)||['bar','bottle','can','tub','pie','slice','regularSlice','thickSlice','serve'].includes(unit);box.classList.toggle('hidden',!allowed);box.innerHTML=allowed?'<small>Quick amount</small><div class="entry-fraction-buttons"><button type="button" data-entry-fraction="0.25">¼</button><button type="button" data-entry-fraction="0.5">½</button><button type="button" data-entry-fraction="0.75">¾</button><button type="button" data-entry-fraction="1">1</button></div>':'';}
function updateEntryPreview(){
  if(!editorState)return;const baseFood=getFood(editorState.foodId);if(!baseFood)return;const food=resolveVariantFood(baseFood,selectedVariantValues()),amount=by("entry-amount").value,unit=by("entry-unit").value,values=scaledNutrients(food,amount,unit);
  by("entry-nutrition-preview").innerHTML=`<details class="entry-nutrition-details"><summary><span>View Nutrition Details</span><strong>${energyText(values.calories,values.energyKj)}</strong></summary><div class="entry-nutrition-details-body"><div class="food-detail-title"><div><h3>${esc(food.name)}</h3><p>${esc(food.brand||food.sourceDisplayName||"")} · ${esc(cleanMeasureText(food.serving||""))}</p></div></div>${nutritionCards(values)}<p class="fine"><strong>Nutrition guidance:</strong> ${esc(rc3NutritionGuidance(values))}</p></div></details>`;
  if(by("entry-selection-summary"))by("entry-selection-summary").innerHTML=`<strong>${editorState?.libraryOnly?'Food To Save':'You Are Adding'}: ${formatNaturalAmount(amount)} ${esc(friendlyUnitLabel(food,unit,amount))}</strong><span>${energyText(values.calories,values.energyKj)} · ${editorState?.libraryOnly?'Save this source record to My Foods for later use.':'Will be added only after you confirm Add to Diary.'}</span>`;
}
by("entry-amount")?.addEventListener("input",updateEntryPreview);
by("entry-unit")?.addEventListener("change",()=>{if(by("entry-amount"))by("entry-amount").value=1;const food=getFood(editorState?.foodId);if(food)renderEntryFractionChoices(food,by("entry-unit").value);updateEntryPreview();});
document.addEventListener('click',event=>{const b=event.target.closest('[data-entry-fraction]');if(!b)return;if(by('entry-amount'))by('entry-amount').value=b.dataset.entryFraction;updateEntryPreview();});
by("entry-status")?.addEventListener("change",updateEntryPreview);
by("entry-editor-back")?.addEventListener("click",() => openFeature(editorState?.returnTo || "food-library"));
function saveEditorEntry(andSaveFood=false){
  const baseFood = getFood(editorState?.foodId);
  if(!baseFood) return;
  if(window.HECFoodCatalogue&&!window.HECFoodCatalogue.canLog(baseFood)){showActionToast(baseFood.entryBlockedReason||'This item cannot be added to Diary as one fixed nutrition value.',null,8000);return;}
  const food=resolveVariantFood(baseFood,selectedVariantValues());
  const amount = n(by("entry-amount").value);
  const unit = by("entry-unit").value;
  if(amount <= 0){ showActionToast("Enter an amount greater than zero."); return; }
  if(editorState?.libraryOnly&&!andSaveFood){if(!ext.savedFoodIds.includes(baseFood.id))ext.savedFoodIds.push(baseFood.id);ext.foodVerification ||= {};ext.foodVerification[baseFood.id]={...(ext.foodVerification[baseFood.id]||{}),savedAt:new Date().toISOString(),method:baseFood.barcode?'barcode-online':'saved-food'};saveExt();ext.ui.libraryTab='saved';openFeature('food-library');showActionToast(`${food.name} saved to My Foods.`,null,3000);return;}
  if(editorState?.libraryOnly&&andSaveFood&&!by("entry-meal").value){editorState.libraryOnly=false;editorState.pendingDiarySave=true;const grid=by("entry-date")?.closest(".form-grid");grid?.classList.remove('hidden');by("entry-date").value=isoToday();by("save-food-entry").classList.add('hidden');by("save-food-entry-and-food").textContent='Confirm Add & Save to My Foods';showActionToast('Choose the Diary meal, then confirm Add & Save to My Foods.',null,5000);by("entry-meal")?.focus();return;}
  const date = by("entry-date").value || isoToday();
  const selectedMeal=by("entry-meal").value;
  if(!selectedMeal){ showActionToast("Choose a meal before adding this food.",null,5000); return; }
  const values = scaledNutrients(food,amount,unit);
  if(!hasEnergyValue(values.calories)){
    showActionToast(`${food.name} has no usable energy value. Add or correct its Calories before logging it.`,null,8000);
    return;
  }
  const existingEntry=editorState.entryId?findEntry(editorState.entryId):null;
  const record = {
    id:editorState.entryId || uid("entry"),foodId:baseFood.id,name:food.name,brand:food.brand || "",date,meal:selectedMeal,status:"eaten",
    amount,unit,unitLabel:cleanUserUnitLabel(unitLabel(food,unit)),metricEquivalent:naturalMetricEquivalent(food,amount,unit),time:by("entry-time").value,notes:by("entry-notes").value,nutrients:values,foodGroups:scaledFoodGroups(food,amount,unit),foodGroupAttribution:foodGroupAttributionState(food),waterMl:scaledWaterMl(food,amount,unit),hydrationType:food.hydrationType||"food",score:food.score,source:food.source || editorState.source,variantSelections:food.variantSelections||{},foodSnapshot:P8?.diarySnapshot?.(food,{amount,unit,unitLabel:cleanUserUnitLabel(unitLabel(food,unit)),nutrients:values})||null,localDate:date,timeZone:activeTimeZone(),...recordTimestamps(existingEntry?.entry?.createdAt||existingEntry?.entry?.recordedAt)
  };
  if(editorState.entryId){
    const found = existingEntry;
    if(found){ ext.diary[found.date].splice(found.index,1); if(!ext.diary[found.date].length) delete ext.diary[found.date]; }
  }
  if(ext.ui.replacingEntryId && !editorState.entryId){
    const replaced=findEntry(ext.ui.replacingEntryId);if(replaced){ext.diary[replaced.date].splice(replaced.index,1);if(!ext.diary[replaced.date].length)delete ext.diary[replaced.date];}
    ext.ui.replacingEntryId="";ext.ui.pendingMeal="";
  }
  addEntry(record);
  if((andSaveFood||editorState?.pendingDiarySave) && !ext.savedFoodIds.includes(baseFood.id)) ext.savedFoodIds.push(baseFood.id);
  ext.ui.diaryDate = date;
  saveExt();
  const itemEnergy = formatNumber(values.calories);
  const dailyTotal = formatNumber(dayNutrition(date,["eaten"]).calories);
  const confirmation = `${food.name} ${editorState.entryId ? "updated" : "added"} — ${energyText(values.calories)}. New daily total: ${dailyTotal} Cal.`;
  showActionToast(confirmation,null,2000);
  if(Array.isArray(ext.ui.compoundFoodQueue)&&ext.ui.compoundFoodQueue.length){const next=ext.ui.compoundFoodQueue.shift();ext.ui.foodSearch=next;saveExt();openFeature('food-library');setTimeout(()=>{if(by('food-search')){by('food-search').value=next;by('food-search').focus();}renderLibrary();renderFoodLiveMatches(next);showActionToast(`${food.name} ready — now add ${next}.`,null,3500);},50);return;}
  openFeature("food-diary");
}
by("save-food-entry")?.addEventListener("click",() => saveEditorEntry(false));
by("save-food-entry-and-food")?.addEventListener("click",() => saveEditorEntry(true));

by("open-day-settings")?.addEventListener("click",()=>{const panel=by("day-settings-details");if(panel){panel.open=!panel.open;if(panel.open)panel.scrollIntoView({behavior:"smooth",block:"nearest"});}});
by("day-type")?.addEventListener("change",()=>{
  const type=by("day-type").value,target=type==="fasting"?(n(ext.dayTypeTargets?.fasting)||500):recommendedNormalTarget();by("day-custom-target").checked=false;by("day-cal-target-label").classList.add("hidden");by("day-cal-target").value=target?whole(target):"";by("day-base-target").textContent=target?`${formatNumber(target)} Cal`:"Recommendation Unavailable";by("day-target-label").textContent=type==="fasting"?"Preferred Fasting-Day Target":"Recommended Normal Target";by("day-settings-note").textContent=!target&&type==="normal"?"Your Normal Day recommendation is unavailable. Recalculate it in Edit Health Profile, or choose a deliberate one-day custom target.":type==="fasting"?"Fasting Day. The companion plans only the meal occasions you select and keeps the projected day within your fasting target.":"Normal Day. Your current accepted profile recommendation is used unless you deliberately choose a different target for this date.";if(by("diary-day-type-summary"))by("diary-day-type-summary").textContent=target?`${type==="fasting"?"Fasting Day":"Normal Day"} · ${formatNumber(target)} Cal`:`${type==="fasting"?"Fasting Day":"Normal Day"} · Target Needs Attention`;updateDaySettingsDirty();refreshDiaryEnergyPreview(target);
});
by("day-custom-target")?.addEventListener("change",()=>{const custom=by("day-custom-target").checked;by("day-cal-target-label").classList.toggle("hidden",!custom);if(custom&&!n(by("day-cal-target").value)){by("day-cal-target").value=by("day-type").value==="fasting"?(n(ext.dayTypeTargets?.fasting)||500):(recommendedNormalTarget()||"");}if(!custom){const type=by("day-type").value,target=type==="fasting"?(n(ext.dayTypeTargets?.fasting)||500):recommendedNormalTarget();by("day-cal-target").value=target?whole(target):"";refreshDiaryEnergyPreview(target);}updateDaySettingsDirty();});
by("day-cal-target")?.addEventListener("input",()=>{updateDaySettingsDirty();if(by("day-custom-target")?.checked)refreshDiaryEnergyPreview(by("day-cal-target").value);});
document.addEventListener("click",event => {
  const add = event.target.closest("[data-add-to-meal]");
  if(add){ ext.ui.recentPlanMode=false;ext.ui.pendingMeal=add.dataset.addToMeal;ext.ui.libraryTab="all";ext.ui.foodSearch="";saveExt();openFeature("food-library",{freshSearch:true});return; }
  const edit = event.target.closest("[data-entry-edit]");
  if(edit){ const found=findEntry(edit.dataset.entryEdit); if(found) prepareEntry(getFood(found.entry.foodId) || snapshotFood(found.entry),{entry:found.entry}); return; }
  const menu=event.target.closest("[data-entry-menu]");
  if(menu){const panel=q(`[data-entry-actions="${CSS.escape(menu.dataset.entryMenu)}"]`);panel?.classList.toggle("hidden");return;}
  const mealMenu=event.target.closest("[data-meal-menu]");
  if(mealMenu){q(`[data-meal-actions="${CSS.escape(mealMenu.dataset.mealMenu)}"]`)?.classList.toggle("hidden");return;}
  const del = event.target.closest("[data-entry-delete]");
  if(del){ requestDeleteEntry(del.dataset.entryDelete);return; }
  const copy = event.target.closest("[data-entry-copy]");
  if(copy){ requestCopyEntry(copy.dataset.entryCopy);return; }
  const move = event.target.closest("[data-entry-move]");
  if(move){ requestMoveEntry(move.dataset.entryMove);return; }
  const copyMeal = event.target.closest("[data-copy-diary-meal]");
  if(copyMeal){ requestMealTransfer(copyMeal.dataset.copyDiaryMeal,"copy");return; }
  const moveMeal = event.target.closest("[data-move-diary-meal]");
  if(moveMeal){ requestMealTransfer(moveMeal.dataset.moveDiaryMeal,"move");return; }
  const template = event.target.closest("[data-save-meal-template]");
  if(template){ saveMealTemplatePrompt(template.dataset.saveMealTemplate);return; }
  const clearMeal=event.target.closest("[data-clear-diary-meal]");
  if(clearMeal){const meal=clearMeal.dataset.clearDiaryMeal,date=diaryDate(),items=entriesForDate(date).filter(e=>e.meal===meal&&e.status!=="skipped");if(!items.length)return;openModal(`Clear ${meal}?`,`This will remove ${items.length} ${items.length===1?"entry":"entries"} from ${formatDate(date)}.`,`Clear Meal`,()=>{const removed=clone(items);ext.diary[date]=(ext.diary[date]||[]).filter(e=>e.meal!==meal||e.status==="skipped");saveExt();renderDiary();renderDailyProgress();showActionToast(`${meal} cleared.`,()=>{ext.diary[date]||=[];ext.diary[date].push(...removed);saveExt();renderDiary();renderDailyProgress();},8000);});return;}
});
function saveDaySettings(showMessage=true){
  const date=diaryDate(),type=by("day-type").value,customTarget=!!by("day-custom-target")?.checked,baseTarget=type==="fasting"?(n(ext.dayTypeTargets?.fasting)||500):recommendedNormalTarget(),targetCal=customTarget?whole(by("day-cal-target").value):whole(baseTarget);
  if(!targetCal||targetCal<300){showActionToast("A valid energy target is needed. Recalculate your Health Profile or enter a deliberate custom target for this date.",null,7500);return;}
  ext.daySettings[date]={type,targetCal,customTarget};if(type==="fasting"&&!customTarget)ext.dayTypeTargets.fasting=targetCal;saveExt();daySettingsBaseline=clone(ext.daySettings[date]);setDaySettingsDirty(false);if(by("day-settings-details"))by("day-settings-details").open=false;renderDiary();if(showMessage)showActionToast("Day Settings Saved.",null,2000);
}
by("save-day-settings")?.addEventListener("click",()=>saveDaySettings(true));

function snapshotFood(entry){
  const stored=P8?.foodFromSnapshot?.(entry);if(stored)return {...stored,foodGroups:entry.foodGroups||{},waterMl:n(entry.waterMl),hydrationType:entry.hydrationType||"food",score:entry.score};
  return {id:entry.foodId || uid("snapshot"),name:entry.name,brand:entry.brand,defaultAmount:entry.amount,defaultUnit:entry.unit,units:{[entry.unit]:1/entry.amount},unitLabels:{[entry.unit]:entry.unitLabel},serving:`${entry.amount} ${entry.unitLabel}`,nutrients:entry.nutrients,foodGroups:entry.foodGroups||{},waterMl:n(entry.waterMl),hydrationType:entry.hydrationType||"food",score:entry.score,source:entry.source};
}
const diaryDeleteLocks=new Set();
function deleteDiaryEntryWithUndo(id,{reopenMeal=false}={}){
  if(!id||diaryDeleteLocks.has(id))return false;const found=findEntry(id);if(!found)return false;
  const snapshot={date:found.date,index:found.index,entry:clone(found.entry)};diaryDeleteLocks.add(id);ext.diary[found.date].splice(found.index,1);if(!ext.diary[found.date].length)delete ext.diary[found.date];saveExt();renderDiary();renderDailyProgress();
  if(reopenMeal&&typeof alpha0615OpenMealOverview==='function')alpha0615OpenMealOverview(snapshot.entry.meal);
  const release=()=>diaryDeleteLocks.delete(id);setTimeout(release,5200);
  showActionToast(`${snapshot.entry.name} deleted.`,()=>{if(findEntry(id)){release();return;}ext.diary[snapshot.date]||=[];ext.diary[snapshot.date].splice(Math.min(snapshot.index,ext.diary[snapshot.date].length),0,clone(snapshot.entry));saveExt();renderDiary();renderDailyProgress();if(reopenMeal&&typeof alpha0615OpenMealOverview==='function')alpha0615OpenMealOverview(snapshot.entry.meal);release();},5000);return true;
}
function requestDeleteEntry(id){return deleteDiaryEntryWithUndo(id);}
function requestCopyEntry(id){
  const found=findEntry(id);if(!found)return;
  const target=shiftISO(found.date,1);
  openModal(`Copy ${found.entry.name}`,`Choose the date for the independent copy.`,`Copy`,() => {
    const date=by("modal-copy-date")?.value || target;
    const copy={...clone(found.entry),id:uid("entry"),date,localDate:date,timeZone:activeTimeZone(),...recordTimestamps()};
    ext.diary[date] ||= [];ext.diary[date].push(copy);saveExt();showActionToast(`${copy.name} copied to ${formatDate(date)}.`,() => {ext.diary[date]=ext.diary[date].filter(e=>e.id!==copy.id);saveExt();},8000);
  },`<label>Copy To Date<input id="modal-copy-date" type="date" value="${target}"></label>`);
}

const ALPHA0632_MEALS=['Breakfast','Lunch','Dinner','Snacks','Other'];
function alpha0632MealSelect(id,selected){return `<select id="${id}">${ALPHA0632_MEALS.map(m=>`<option value="${esc(m)}" ${m===selected?'selected':''}>${esc(m)}</option>`).join('')}</select>`;}
function requestMoveEntry(id){
  const found=findEntry(id);if(!found)return;const target=found.date;
  openModal(`Move ${found.entry.name}`,'Choose the date and meal. Moving keeps one diary entry; it does not create a duplicate.','Move',()=>{
    const date=by('modal-move-date')?.value||target,meal=by('modal-move-meal')?.value||found.entry.meal;
    if(date===found.date&&meal===found.entry.meal){showActionToast('That food is already in that date and meal.',null,3500);return;}
    const original=clone(found.entry);ext.diary[found.date]=(ext.diary[found.date]||[]).filter(e=>e.id!==found.entry.id);if(!ext.diary[found.date]?.length)delete ext.diary[found.date];
    const moved={...clone(found.entry),date,localDate:date,meal,timeZone:activeTimeZone()};ext.diary[date]||=[];ext.diary[date].push(moved);saveExt();renderDiary();
    showActionToast(`${moved.name} moved to ${meal} on ${relativeDateLabel(date)}.`,()=>{ext.diary[date]=(ext.diary[date]||[]).filter(e=>e.id!==moved.id);ext.diary[found.date]||=[];ext.diary[found.date].push(original);saveExt();renderDiary();},8000);
  },`<label>Move To Date<input id="modal-move-date" type="date" value="${esc(target)}"></label><label>Move To Meal ${alpha0632MealSelect('modal-move-meal',found.entry.meal)}</label>`);
}
function alpha0632CopyDateOptions(sourceDate){
  const base=sourceDate<isoToday()?isoToday():sourceDate;const dates=Array.from({length:14},(_,i)=>shiftISO(base,i+1));
  return `<div class="alpha0632-copy-tools"><div class="quick-action-row"><button type="button" class="secondary" data-alpha0632-select-copy="7">Next 7 Days</button><button type="button" class="secondary" data-alpha0632-select-copy="weekday">Same Weekday × 4</button><button type="button" class="secondary" data-alpha0632-select-copy="clear">Clear</button></div><div class="alpha0632-date-grid">${dates.map((d,i)=>`<label><input type="checkbox" data-alpha0632-copy-date value="${esc(d)}" ${i===0?'checked':''}><span>${esc(relativeDateLabel(d))}<small>${esc(formatDate(d))}</small></span></label>`).join('')}</div></div>`;
}
function alpha0632WireCopyDateTools(sourceDate){
  const boxes=()=>qa('[data-alpha0632-copy-date]');
  qa('[data-alpha0632-select-copy]').forEach(b=>b.addEventListener('click',()=>{const mode=b.dataset.alpha0632SelectCopy,list=boxes();if(mode==='clear'){list.forEach(x=>x.checked=false);return;}if(mode==='7'){list.forEach((x,i)=>x.checked=i<7);return;}if(mode==='weekday'){const sourceDay=new Date(`${sourceDate}T12:00:00`).getDay();list.forEach(x=>x.checked=new Date(`${x.value}T12:00:00`).getDay()===sourceDay);}}, {once:false}));
}
function requestMealTransfer(meal,mode='copy'){
  const sourceDate=diaryDate(),items=entriesForDate(sourceDate).filter(e=>e.meal===meal&&e.status!=='skipped');if(!items.length){showActionToast(`There is nothing in ${meal} to ${mode}.`,null,3000);return;}
  if(mode==='move'){
    openModal(`Move ${meal}`,`Move all ${items.length} ${items.length===1?'item':'items'} together to another date or meal.`,`Move Meal`,()=>{
      const date=by('modal-transfer-date')?.value||sourceDate,targetMeal=by('modal-transfer-meal')?.value||meal;if(date===sourceDate&&targetMeal===meal){showActionToast(`${meal} is already there.`,null,3000);return;}
      const originals=clone(items),ids=new Set(items.map(e=>e.id));ext.diary[sourceDate]=(ext.diary[sourceDate]||[]).filter(e=>!ids.has(e.id));if(!ext.diary[sourceDate]?.length)delete ext.diary[sourceDate];ext.diary[date]||=[];
      items.forEach(e=>ext.diary[date].push({...clone(e),date,localDate:date,meal:targetMeal,timeZone:activeTimeZone()}));saveExt();renderDiary();showActionToast(`${meal} moved to ${targetMeal} on ${relativeDateLabel(date)}.`,()=>{ext.diary[date]=(ext.diary[date]||[]).filter(e=>!ids.has(e.id));ext.diary[sourceDate]||=[];ext.diary[sourceDate].push(...originals);saveExt();renderDiary();},8000);
    },`<label>Move To Date<input id="modal-transfer-date" type="date" value="${esc(sourceDate)}"></label><label>Move To Meal ${alpha0632MealSelect('modal-transfer-meal',meal)}</label>`);return;
  }
  openModal(`Copy ${meal}`,`Copy all ${items.length} ${items.length===1?'item':'items'} together. Select one or more future dates and the meal category.`,`Copy Meal`,()=>{
    const dates=qa('[data-alpha0632-copy-date]:checked').map(x=>x.value),targetMeal=by('modal-transfer-meal')?.value||meal;if(!dates.length){showActionToast('Choose at least one date to copy the meal to.',null,4000);return;}
    const created=[];for(const date of dates){for(const item of items){const copy=copyRecentEntry(item,date,targetMeal);created.push({date,id:copy.id});}}
    saveExt();renderDiary();showActionToast(`${meal} copied to ${dates.length} date${dates.length===1?'':'s'} as ${targetMeal}.`,()=>{for(const c of created)ext.diary[c.date]=(ext.diary[c.date]||[]).filter(e=>e.id!==c.id);saveExt();renderDiary();},8000);
  },`<label>Copy As Meal ${alpha0632MealSelect('modal-transfer-meal',meal)}</label>${alpha0632CopyDateOptions(sourceDate)}`);alpha0632WireCopyDateTools(sourceDate);
}

function saveMealTemplatePrompt(meal){
  const date=diaryDate();const entries=entriesForDate(date).filter(e=>e.meal===meal);if(!entries.length)return;
  openModal("Save This Meal",`Save these ${entries.length} ${entries.length===1?"item":"items"} as a reusable meal.`,`Save Meal`,() => {
    const name=by("modal-meal-name")?.value.trim() || `${meal} from ${formatDate(date)}`;
    ext.mealTemplates.push({id:uid("meal"),name,items:entries.map(e=>({...clone(e),id:undefined,date:undefined,status:"eaten"})),...recordTimestamps()});saveExt();showActionToast(`${name} saved to My Meals & Recipes.`,null,2000);
  },`<label>Meal Name<input id="modal-meal-name" value="${esc(meal)}"></label>`);
}

// Modal and persistent action toast
let modalConfirm = null;
function openModal(title,copy,confirmLabel,onConfirm,extra=""){
  by("a05-modal-title").textContent=title;by("a05-modal-copy").textContent=copy;by("a05-modal-extra").innerHTML=extra;by("a05-modal-confirm").textContent=confirmLabel;by("a05-modal-confirm").className=confirmLabel.toLowerCase().includes("delete")?"danger-button":"primary";modalConfirm=onConfirm;const card=by("a05-modal")?.querySelector(".a05-modal-card");card?.classList.toggle("info-only",confirmLabel.toLowerCase()==="close");by("a05-modal").classList.remove("hidden");card?.scrollTo?.(0,0);
}
function closeModal(){by("a05-modal").classList.add("hidden");modalConfirm=null;by("a05-modal")?.querySelector(".a05-modal-card")?.classList.remove("info-only");if(by("a05-modal-cancel"))by("a05-modal-cancel").textContent="Cancel";}
window.HECOpenModal=openModal;window.HECCloseModal=closeModal;

by("a05-modal-cancel")?.addEventListener("click",closeModal);
by("a05-modal-close")?.addEventListener("click",closeModal);
by("a05-modal")?.addEventListener("click",event=>{if(event.target===by("a05-modal"))closeModal();});
by("a05-modal-confirm")?.addEventListener("click",() => {const fn=modalConfirm;closeModal();fn?.();});
let toastUndo=null,toastTimer=null;
function showActionToast(copy,action=null,duration=2000){
  clearTimeout(toastTimer);toastUndo=action;by("a05-toast-copy").textContent=copy;by("a05-toast-action").classList.toggle("hidden",!action);by("a05-action-toast").classList.add("show");toastTimer=setTimeout(()=>{by("a05-action-toast").classList.remove("show");toastUndo=null;},duration);
}
by("a05-toast-action")?.addEventListener("click",() => {const fn=toastUndo;by("a05-action-toast").classList.remove("show");toastUndo=null;fn?.();showActionToast("Action Undone.",null,2000);});

// Food library
function editDistance(a,b){
  const left=String(a),right=String(b);const rows=Array.from({length:left.length+1},()=>Array(right.length+1).fill(0));
  for(let i=0;i<=left.length;i++)rows[i][0]=i;for(let j=0;j<=right.length;j++)rows[0][j]=j;
  for(let i=1;i<=left.length;i++)for(let j=1;j<=right.length;j++)rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(left[i-1]===right[j-1]?0:1));
  return rows[left.length][right.length];
}
function fuzzyTokenMatch(queryToken,foodToken){
  if(queryToken.length<4||foodToken.length<4||queryToken[0]!==foodToken[0])return false;
  const limit=Math.max(queryToken.length,foodToken.length)>=8?2:1;
  return editDistance(queryToken,foodToken)<=limit;
}
function searchRank(food,query){
  const nq=normalise(query);if(!nq)return 1;
  const name=normalise(food.name),brand=normalise(food.brand),aliases=(food.aliases||[]).map(normalise);
  if(name===nq)return 1300 + (food.afcd?40:80);
  if(aliases.includes(nq))return 1250 + (food.afcd?30:70);
  if(brand===nq)return 1200;
  if(name.startsWith(nq)||aliases.some(alias=>alias.startsWith(nq)))return 1050 + (food.afcd?35:60);
  const queryTokens=nq.split(" ").filter(Boolean);
  const fieldTokens=[name,brand,...aliases].flatMap(value=>value.split(" ").filter(Boolean));
  const tokenSet=new Set(fieldTokens);
  if(queryTokens.every(token=>tokenSet.has(token)))return 900+queryTokens.length;
  if(name.includes(nq)||aliases.some(alias=>alias.includes(nq)))return 760;
  if(queryTokens.every(token=>fieldTokens.some(field=>field===token||fuzzyTokenMatch(token,field))))return 620+queryTokens.length;
  return 0;
}
function foodRecordType(food){
  if(window.HECFoodCatalogue)return window.HECFoodCatalogue.provenance(food).label;
  if(food.category==="Recipe"||food.brand==="My Recipe")return "My Recipe";
  if(food.source==="User Created")return "My Food";
  if(food.afcd)return "Australian AFCD Food";
  if(food.verified&&food.brand)return "Verified Product";
  if(food.verified)return "Verified Food";
  return "Australian Trial Record";
}
function activeLibraryTab(){return ext.ui.libraryTab||"all";}
function recentGroups(days=14){
  const start=shiftISO(isoToday(),-(days-1)),groups=[];Object.keys(ext.diary).filter(date=>date>=start&&date<=isoToday()).sort().reverse().forEach(date=>{mealNames().forEach(meal=>{const items=entriesForDate(date).filter(e=>e.meal===meal&&e.status!=="skipped");if(items.length)groups.push({date,meal,items});});});return groups;
}
function renderRecentLibrary(query=""){
  const nq=normalise(query),groups=recentGroups(14).map(g=>({...g,items:g.items.filter(e=>!nq||normalise(`${e.name} ${e.brand||""}`).includes(nq))})).filter(g=>g.items.length);
  by("food-results").innerHTML=groups.length?groups.map(g=>`<section class="recent-meal-group"><header><div><strong>${esc(g.meal)} · ${g.items.length===1?'Recent Food':'Recent Meal'}</strong><small>${esc(relativeDateLabel(g.date))}</small></div>${g.items.length>1?`<button data-recent-meal-add="${esc(g.date)}|${esc(g.meal)}">Add To ${esc(g.meal)}</button>`:''}</header>${g.items.map(e=>`<div class="recent-entry-row"><span><strong>${esc(e.name)}</strong><small>${esc(entryNaturalQuantity(e))} · ${energyText(e.nutrients?.calories)}</small></span><button data-recent-entry-add="${esc(e.id)}" aria-label="Add ${esc(e.name)} to Diary">＋ Add Food</button></div>`).join("")}</section>`).join(""):`<div class="resource-empty"><strong>No Recent Foods Yet.</strong><p>Foods and meals from the last 14 days will appear here for quick reuse.</p></div>`;
}
function copyRecentEntry(entry,targetDate,targetMeal){const copy={...clone(entry),id:uid("entry"),date:targetDate,localDate:targetDate,meal:targetMeal,status:"eaten",time:localClock(),timeZone:activeTimeZone(),...recordTimestamps()};ext.diary[targetDate]||=[];ext.diary[targetDate].push(copy);return copy;}
function cachedOnlineMatches(query){
  if(!query || query.trim().length<3)return [];
  const matches=(ext.onlineFoods||[]).map(food=>({food,rank:searchRank(food,query)})).filter(item=>item.rank>=620).sort((a,b)=>b.rank-a.rank||Number(b.food.country==="Australia")-Number(a.food.country==="Australia")||a.food.name.localeCompare(b.food.name)).map(x=>x.food),policy=C8?.partitionSearchRecords?.([...FOODS,...matches]);return policy?matches.filter(food=>policy.primary.includes(food)):matches;
}
function cachedLegacyMatches(query){if(!query||query.trim().length<3)return[];const matches=(ext.onlineFoods||[]).map(food=>({food,rank:searchRank(food,query)})).filter(item=>item.rank>=620).sort((a,b)=>b.rank-a.rank).map(x=>x.food),policy=C8?.partitionSearchRecords?.([...FOODS,...matches]);return (policy?.legacy||[]).filter(item=>matches.includes(item.food));}
function legacyFoodRow(item){const food=item.food;return `<article class="resource-row legacy-review-row"><button class="resource-main" data-food-details="${esc(food.id)}"><strong>${esc(food.name)}</strong><small>${esc(food.brand||food.source||'Legacy cached result')} · Details only</small></button><span class="legacy-review-badge">Superseded</span></article>`;}
function renderFoodLiveMatches(query){
  const box=by("food-live-results");if(!box)return;const term=String(query||"").trim();
  if(!term||document.activeElement!==by("food-search")){box.classList.add("hidden");box.innerHTML="";return;}

  // Alpha 0.6.19: the live panel is a GUIDE FIRST surface. Database rows may
  // support the guide, but they are never allowed to replace the guided path.
  if(typeof alpha0618R2GuideLabels==="function" && typeof alpha0618R2Text==="function"){
    const qn=alpha0618R2Text(term);
    if(/\bburger king\b/.test(qn)){
      box.innerHTML=`<div class="live-match-heading"><strong>Top Matches</strong><small>Australian location rules applied · Alpha ${ACTIVE_VERSION}</small></div><button type="button" class="live-match-row alpha0618-r2-guide-row" data-alpha0618-r2-guide="Hungry Jacks"><span><strong>Hungry Jack’s</strong><small>Australian equivalent — guided menu</small></span><b>›</b></button>`;
      box.classList.remove("hidden");return;
    }
    const chain=typeof alpha0618ChainFor==="function"?alpha0618ChainFor(term):null;
    if(chain){
      const alias=(chain.aliases||[]).find(a=>qn.includes(a))||"";
      const tail=qn.replace(alias,"").trim();
      const items=(chain.items||[]).filter(x=>!tail||alpha0618R2Text(x).includes(tail)).slice(0,3);
      box.innerHTML=`<div class="live-match-heading"><strong>Top Matches</strong><small>Australian menu first · Alpha ${ACTIVE_VERSION}</small></div>${items.map(x=>`<button type="button" class="live-match-row" data-alpha0618-chain-item="${esc(chain.label)}|${esc(x)}"><span><strong>${esc(x)}</strong><small>${esc(chain.label)}</small></span><b>＋</b></button>`).join("")}`;
      box.classList.remove("hidden");return;
    }
    const guides=alpha0618R2GuideLabels(term);
    const guideHtml=guides.map(g=>`<button type="button" class="live-match-row alpha0618-r2-guide-row" data-alpha0618-r2-guide="${esc(g.label)}"><span><strong>${esc(g.label)}</strong><small>Guided entry · choose type, preparation and amount</small></span><b>›</b></button>`).join("");
    box.innerHTML=`<div class="live-match-heading"><strong>Top Matches</strong><small>Guided Food Entry · Alpha ${ACTIVE_VERSION}</small></div>${guideHtml}`;
    box.classList.remove("hidden");return;
  }

  // Safe fallback used only while the script is still initialising.
  box.innerHTML=`<div class="live-match-heading"><strong>Top Matches</strong><small>Preparing guided food choices…</small></div>`;box.classList.remove("hidden");
}
function renderLibrary(){
  qa("[data-library-tab]").forEach(b=>b.classList.toggle("active",b.dataset.libraryTab===activeLibraryTab()));
  by("food-search").value=ext.ui.foodSearch||"";
  const context=by("library-entry-context");
  if(context){
    const pending=ext.ui.pendingMeal,drink=ext.ui.pendingDrink;
    const hasContext=!!pending||!!drink;
    context.classList.toggle("hidden",!hasContext);
    context.innerHTML=drink?`<span>Choose the exact <strong>${esc(drink.label||drink.type)}</strong> for ${formatNumber(drink.amount,true)} mL. Nutrition will be recorded after you review it.</span>${pending?`<small>Meal: ${esc(pending)}</small>`:""}`:pending?`<span>Adding to <strong>${esc(pending)}</strong> on ${esc(relativeDateLabel(ext.ui.diaryDate||isoToday()))}</span>`:"";
  }
  const tab=activeLibraryTab(),query=by("food-search").value.trim();renderFoodLiveMatches(query);
  const showOnlineControls=tab==="all"||tab==="online";
  by("online-search-actions")?.classList.toggle("hidden",!showOnlineControls);
  by("online-food-status")?.classList.toggle("hidden",!showOnlineControls);
  if(tab==="recent"){renderRecentLibrary(query);return;}
  if(tab==="recipes"){renderRecipeLibrary(query);renderRecipeSelectOptions();renderScanSelect();return;}
  if(tab==="meals"){renderMealLibrary(query);renderRecipeSelectOptions();renderScanSelect();return;}
  if(tab==="online"){renderOnlineLibrary(query);return;}
  const localFoods=[...FOODS,...(ext.customFoods||[]),...AFCD_FOODS];
  const libraryFoods=tab==="saved"?allFoods().filter(food=>ext.savedFoodIds.includes(food.id)):localFoods.filter(food=>food.category!=="Recipe");
  let ranked=libraryFoods.filter(food=>tab==="custom"?food.source==="User Created":true).map(food=>({food,rank:searchRank(food,query)})).filter(item=>item.rank>0);if(window.HECFoodCatalogue?.dedupeRanked)ranked=window.HECFoodCatalogue.dedupeRanked(ranked);ranked.sort((a,b)=>b.rank-a.rank||Number(b.food.country==="Australia")-Number(a.food.country==="Australia")||a.food.name.localeCompare(b.food.name));
  const strongMatch=ranked.some(item=>item.rank>=760);
  let visible=query?ranked.filter(item=>item.rank>=(strongMatch?760:620)):ranked;
  let intro="";
  if(!query&&tab==="all"){
    const seed=visible.filter(item=>!item.food.afcd).slice(0,28);
    const everyday=visible.filter(item=>item.food.afcd).map(item=>({...item,everyday:everydayAfcdPriority(item.food)})).filter(item=>item.everyday>0).sort((a,b)=>b.everyday-a.everyday||a.food.name.localeCompare(b.food.name));
    const seen=new Set(seed.map(x=>normalise(x.food.name))),familyCounts={},curated=[];
    for(const item of everyday){
      const family=everydayAfcdFamily(item.food);if(!family||(familyCounts[family]||0)>=4)continue;
      const key=normalise(item.food.name);if(seen.has(key))continue;seen.add(key);familyCounts[family]=(familyCounts[family]||0)+1;curated.push(item);if(curated.length>=72)break;
    }
    visible=[...seed,...curated];
    intro=`<div class="search-guidance everyday-food-guidance"><strong>Everyday Australian Foods</strong><small>Browse familiar starter foods below, or search all ${AFCD_FOODS.length?AFCD_FOODS.length.toLocaleString():"1,588"} Australian food records by name.</small></div>`;
  }
  let closeNote="";
  if(query&&visible.length){const best=visible[0];if(normalise(best.food.name)!==normalise(query)&&best.rank>=620)closeNote=`<div class="search-guidance compact-search-guidance"><strong>Showing Results For ${esc(best.food.name)}</strong><small>Your search was “${esc(query)}”.</small></div>`;}
  let localHtml=visible.length?`${intro}${closeNote}${visible.map(item=>resourceFoodRow(item.food)).join("")}`:`<div class="resource-empty"><strong>No Close Australian Match Found.</strong><p>${query.length>=3?"Online packaged-food sources are also being checked below.":"Try another spelling, scan the barcode, read the nutrition panel, or create a private food entry."}</p></div>`;
  if(tab==="all"&&query.length>=3){
    const online=cachedOnlineMatches(query),legacy=cachedLegacyMatches(query),legacyHtml=legacy.length?`<details class="legacy-review-results"><summary>Legacy / conflicting results (${legacy.length})</summary><p>Kept for review only. The verified Australian record is used for logging.</p>${legacy.map(legacyFoodRow).join('')}</details>`:'',onlineHtml=online.length||legacy.length?`<section class="all-resources-online"><div class="online-source-banner"><strong>Online Packaged Foods — Review Required</strong><p>${online.length} current cached online match${online.length===1?"":"es"}. Compare the product with its package before adding.</p></div>${online.slice(0,24).map(resourceFoodRow).join("")}${legacyHtml}</section>`:`<section class="all-resources-online"><div class="online-source-banner pending-online-banner"><strong>Online Packaged Foods</strong><p id="all-online-inline-status">Checking online sources…</p></div></section>`;
    by("food-results").innerHTML=`${localHtml}${onlineHtml}`;
  }else by("food-results").innerHTML=localHtml;
  renderRecipeSelectOptions();renderScanSelect();
}

function foodResultSourceMeta(food){const value=window.HECFoodCatalogue?.provenance?.(food)?.label||'',brand=normalise(food?.brand||''),label=normalise(value);return !label||label===brand||['verified food','packaged food','food record'].includes(label)?'':value;}
function resourceFoodRow(food){
  const saved=ext.savedFoodIds.includes(food.id),safety=foodSafety(food),loggable=window.HECFoodCatalogue?.canLog?window.HECFoodCatalogue.canLog(food):hasEnergyValue(food?.nutrients?.calories);
  const blocked=food.entryBlockedReason||'A complete fixed nutrition value is not available for this item.';
  return `<article class="resource-row ${food.afcd?"afcd-row":""} ${safety.blocked||!loggable?"food-warning":""}"><button class="resource-main" data-food-details="${esc(food.id)}"><strong>${esc(food.name)}${food.afcd?'<span class="afcd-badge">AFCD</span>':""}</strong><small>${esc(loggable?[food.brand,foodResultSourceMeta(food),cleanMeasureText(food.serving),energyText(food.nutrients?.calories,food.nutrients?.energyKj)].filter(Boolean).join(" · "):[food.brand,foodResultSourceMeta(food),food.nutritionStatus==='configurable'?'Configurable meal':'Nutrition unavailable'].filter(Boolean).join(' · '))}</small></button><button class="resource-save ${saved?"saved":""}" data-food-save="${esc(food.id)}" aria-label="${saved?"Remove from":"Save to"} Favourite Foods">${saved?"✓":"☆"}</button><button class="resource-add" data-food-add="${esc(food.id)}" aria-label="${loggable?"Review and add":"Cannot add"} ${esc(food.name)}" ${loggable?'':`disabled title="Complete the nutrition information before adding to Diary" data-blocked-reason="${esc(blocked)}"`}>＋</button></article>`;
}
function foodCard(food){return resourceFoodRow(food);}
document.addEventListener("click",event=>{
  const tab=event.target.closest("[data-library-tab]");if(tab){ext.ui.libraryTab=tab.dataset.libraryTab;by("resource-add-menu")?.classList.add("hidden");saveExt();renderLibrary();if(tab.dataset.libraryTab==="all")scheduleAllResourcesOnlineSearch();return;}
  const add=event.target.closest("[data-food-add]");if(add){const food=getFood(add.dataset.foodAdd);if(window.HECFoodCatalogue&&!window.HECFoodCatalogue.canLog(food)){showActionToast('Complete And Confirm This Food’s Nutrition Before Adding It To Diary.',null,6000);return;}const drink=ext.ui.pendingDrink||null;prepareEntry(food,{date:ext.ui.diaryDate||isoToday(),meal:ext.ui.pendingMeal||"",status:"eaten",amount:drink?.amount||null,unit:drink&&unitOptions(food).mL!==undefined?"mL":null});if(drink){ext.ui.pendingDrink=null;saveExt();}return;}
  const save=event.target.closest("[data-food-save]");if(save){toggleSavedFood(save.dataset.foodSave);return;}
  const details=event.target.closest("[data-food-details]");if(details){showFoodDetails(details.dataset.foodDetails);return;}
  const recipeAdd=event.target.closest("[data-recipe-add]");if(recipeAdd){prepareEntry(getFood(recipeAdd.dataset.recipeAdd),{date:ext.ui.diaryDate||isoToday(),meal:ext.ui.pendingMeal||""});return;}
  const mealAdd=event.target.closest("[data-meal-add]");if(mealAdd){addMealTemplate(mealAdd.dataset.mealAdd);return;}
  const mealDelete=event.target.closest("[data-meal-delete]");if(mealDelete){deleteMealTemplate(mealDelete.dataset.mealDelete);return;}
  if(event.target.closest("[data-clear-pending-meal]")){ext.ui.pendingMeal="";ext.ui.pendingDrink=null;saveExt();renderLibrary();return;}
});
document.addEventListener("click",event=>{
  const one=event.target.closest("[data-recent-entry-add]");if(one){const found=findEntry(one.dataset.recentEntryAdd);if(!found)return;const targetDate=ext.ui.recentPlanMode?(ext.ui.plannerDate||isoToday()):(ext.ui.diaryDate||isoToday()),targetMeal=ext.ui.pendingMeal||found.entry.meal;const copy=copyRecentEntry(found.entry,targetDate,targetMeal);saveExt();showActionToast(`${copy.name} added to ${targetMeal}.`,null,2000);return;}
  const meal=event.target.closest("[data-recent-meal-add]");if(meal){const [sourceDate,sourceMeal]=meal.dataset.recentMealAdd.split("|"),items=entriesForDate(sourceDate).filter(e=>e.meal===sourceMeal&&e.status!=="skipped"),targetDate=ext.ui.recentPlanMode?(ext.ui.plannerDate||isoToday()):(ext.ui.diaryDate||isoToday()),targetMeal=ext.ui.pendingMeal||sourceMeal;items.forEach(e=>copyRecentEntry(e,targetDate,targetMeal));saveExt();showActionToast(`${items.length} ${items.length===1?"item":"items"} added to ${targetMeal}.`,null,2000);return;}
});
function prepareSingleMealSuggestion(meal,prefs={},retry=false){
  const date=ext.ui.diaryDate||isoToday();ext.ui.plannerDate=date;ext.ui.singleMealPreferences={meal,...prefs};if(!retry){ext.ui.plannerResults={};ext.ui.plannerRejected={};ext.ui.plannerAccepted={};}qa('input[name="planner-meal"]').forEach(x=>x.checked=x.value===meal);if(by("planner-select-all")){by("planner-select-all").checked=false;by("planner-select-all").indeterminate=false;}ext.ui.plannerSessionActive=true;const choice=plannerChoice(meal,retry);saveExt();return choice;
}
function showSingleMealSuggestion(meal,prefs={},retry=false){
  const suggestion=prepareSingleMealSuggestion(meal,prefs,retry),budget=plannerBudget();
  if(!suggestion){openModal(`Suggest ${meal}`,"The current day plan does not leave enough room for another sensible automatic suggestion in this meal.","Close",()=>{},`<p>Available for companion planning: <strong>${formatNumber(budget.available)} Cal</strong>. You can add a small food manually or adjust the day plan.</p>`);return;}
  const total=suggestionNutrition(suggestion),groups=suggestionGroups(suggestion),existing=budget.existingByMeal[meal]||0;
  const extra=`<div class="single-meal-suggestion"><div class="single-suggestion-heading"><span class="health-score">${suggestion.score}/10</span><div><h4>${esc(suggestion.name)}</h4><p>${formatNumber(total.calories)} Cal · Protein ${formatNumber(total.protein)} g · Carbs ${formatNumber(total.carbs)} g · Fat ${formatNumber(total.fat)} g</p></div></div>${existing?`<p class="companion-context-note"><strong>${formatNumber(existing)} Cal is already in ${esc(meal)}.</strong> This suggestion was calculated around those foods.</p>`:""}<p>${esc(suggestion.reason)}</p><ul class="compact-list">${suggestion.items.map(i=>{const f=getFood(i.foodId);return `<li>${esc(f.name)} — ${formatNumber(i.amount,true)} ${esc(unitLabel(f,i.unit))}</li>`}).join("")}</ul><div class="planner-group-line">${FOOD_GROUP_KEYS.filter(k=>groups[k]>0).map(k=>`<span>${esc(FOOD_GROUP_LABELS[k])}: ${formatNumber(groups[k],true)}</span>`).join("")}</div><div class="single-suggestion-secondary-actions"><button id="single-suggestion-retry" class="secondary" type="button">Try Another</button><button id="single-suggestion-questions" class="secondary" type="button">Change My Choices</button></div></div>`;
  openModal(`Companion Suggestion for ${meal}`,"Review the suggestion before adding it. Nothing is added until you confirm.","Add To Diary",()=>{acceptPlannedSuggestion(meal);setTimeout(()=>{if(q("#food-diary.active"))renderDiary();},50);},extra);
  by("single-suggestion-retry")?.addEventListener("click",()=>{closeModal();showSingleMealSuggestion(meal,prefs,true);},{once:true});
  by("single-suggestion-questions")?.addEventListener("click",()=>{closeModal();openSingleMealQuestions(meal);},{once:true});
}
function openSingleMealQuestions(meal){
  const date=ext.ui.diaryDate||isoToday(),goals=currentGoals(date),existing=entriesForDate(date).filter(e=>e.meal===meal&&e.status!=="skipped"),existingCal=existing.reduce((sum,e)=>sum+n(e.nutrients?.calories),0),fasting=goals.dayType==="fasting";
  const extra=`<div class="companion-question-list">${existing.length?`<p class="companion-context-note"><strong>${esc(meal)} already has ${formatNumber(existingCal)} Cal.</strong> The companion will build around those entries unless you later choose to replace existing items.</p>`:""}<label>How hungry are you?<select id="suggest-appetite"><option value="normal">Normal</option><option value="small">Small Meal</option><option value="hungry">Hungry</option><option value="none">No Preference</option></select></label><label>What suits you today?<select id="suggest-style"><option value="none">No Preference</option><option value="quick">Quick & Easy</option><option value="cooked">Cooked / Savoury</option><option value="light">Light</option><option value="protein">Higher Protein</option><option value="different">Something Different</option></select></label><label>Use familiar foods?<select id="suggest-familiar"><option value="mix">Mix Familiar & New</option><option value="familiar">Prefer My Usual Foods</option><option value="new">Prefer Something Different</option><option value="none">No Preference</option></select></label>${fasting?`<label>How much of today’s fasting allowance should this meal use?<select id="suggest-fasting-share"><option value="decide">Let Companion Decide</option><option value="small">Small Share</option><option value="moderate">Moderate Share</option><option value="most">Most of It</option></select></label>`:""}<button id="suggest-skip-questions" class="secondary wide" type="button">Just Suggest Something</button></div>`;
  openModal(`Suggest ${meal}`,"Choose only what matters today. You can leave everything at No Preference and the companion will use your day plan, nutrition gaps and existing foods.","Suggest My Meal",()=>showSingleMealSuggestion(meal,{appetite:by("suggest-appetite")?.value||"none",style:by("suggest-style")?.value||"none",familiar:by("suggest-familiar")?.value||"none",fastingShare:by("suggest-fasting-share")?.value||"decide"}),extra);
  by("suggest-skip-questions")?.addEventListener("click",()=>{closeModal();showSingleMealSuggestion(meal,{appetite:"none",style:"none",familiar:"none",fastingShare:"decide"});},{once:true});
}
document.addEventListener("click",event=>{const suggest=event.target.closest("[data-suggest-context-meal]");if(!suggest)return;openSingleMealQuestions(suggest.dataset.suggestContextMeal);});
by("browse-planner-recent")?.addEventListener("click",()=>{ext.ui.recentPlanMode=true;ext.ui.libraryTab="recent";ext.ui.diaryDate=ext.ui.plannerDate||isoToday();ext.ui.pendingMeal="";saveExt();openFeature("food-library");});
let alpha0633FoodSearchFocusAnchored=false;
function keepLiveFoodResultsVisible({anchorInput=false}={}){
  requestAnimationFrame(()=>{const input=by("food-search");if(!input||document.activeElement!==input)return;const vv=window.visualViewport,keyboardTop=vv?vv.offsetTop+vv.height:window.innerHeight;document.documentElement.style.setProperty('--hec-keyboard-top',`${Math.round(keyboardTop)}px`);if(anchorInput)rc6SyncFoodSearchViewport?.();});
}
by("food-search")?.addEventListener("input",alpha0630HandleFoodSearchInput);
by("food-search")?.addEventListener("focus",()=>{alpha0633FoodSearchFocusAnchored=false;setTimeout(()=>keepLiveFoodResultsVisible({anchorInput:true}),180);});
by("food-search")?.addEventListener("blur",()=>{alpha0633FoodSearchFocusAnchored=false;});
by("clear-food-search")?.addEventListener("click",()=>{ext.ui.foodSearch="";by("food-search").value="";saveExt();renderLibrary();});
by("resource-add-button")?.addEventListener("click",event=>{event.stopPropagation();by("resource-add-menu")?.classList.toggle("hidden");});
by("close-resource-menu")?.addEventListener("click",()=>by("resource-add-menu")?.classList.add("hidden"));
document.addEventListener("click",event=>{const menu=by("resource-add-menu");if(menu&&!menu.classList.contains("hidden")&&!event.target.closest("#resource-add-menu")&&!event.target.closest("#resource-add-button"))menu.classList.add("hidden");});

function onlineNutrientRecord(list,names,preferredUnits=[]){
  const wanted=names.map(normalise),units=preferredUnits.map(x=>String(x).toUpperCase());
  const matches=(list||[]).filter(x=>wanted.includes(normalise(x.nutrientName||x.nutrient?.name)));
  if(!matches.length)return null;
  if(units.length)return matches.find(x=>units.includes(String(x.unitName||x.nutrient?.unitName||x.nutrient?.unit||"").toUpperCase()))||null;
  return matches[0];
}
function onlineNutrientValue(list,names,preferredUnits=[]){let found=onlineNutrientRecord(list,names,preferredUnits);if(!found&&preferredUnits.length)found=onlineNutrientRecord(list,names);return found?n(found.value??found.amount):null;}
function onlineEnergyKcal(list){
  const names=["Energy","Energy (Atwater General Factors)","Energy (Atwater Specific Factors)"];
  const kcal=onlineNutrientRecord(list,names,["KCAL"]);if(kcal)return n(kcal.value??kcal.amount);
  const kj=onlineNutrientRecord(list,names,["KJ"]);if(kj)return n(kj.value??kj.amount)/4.184;
  return onlineNutrientValue(list,names);
}
function makeOpenFoodFactsFood(product){
  const nu=product.nutriments||{};
  const servingText=String(product.serving_size||"");
  const parsedServing=servingText.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  const servingQty=n(product.serving_quantity)||n(parsedServing?.[1])||100;
  const rawUnit=String(product.serving_quantity_unit||parsedServing?.[2]||"g").toLowerCase();
  const unit=rawUnit.includes("ml")?"mL":"g";
  const servingValue=(key)=>{const value=nu[`${key}_serving`];return value===undefined||value===null||value===""?null:n(value);};
  const per100Value=(key)=>{const value=nu[`${key}_100g`];return value===undefined||value===null||value===""?null:n(value);};
  const factor=servingQty/100,basisWarnings=[];
  const coherentServingValue=(key)=>{const direct=servingValue(key),per100=per100Value(key),scaled=per100===null?null:per100*factor;if(direct===null)return scaled;if(scaled===null||scaled===0)return direct;const delta=Math.abs(direct-scaled)/Math.max(Math.abs(scaled),.001);if(delta<=.25)return direct;basisWarnings.push(key);return scaled;};
  let calories=coherentServingValue("energy-kcal");
  let energyKj=coherentServingValue("energy-kj");if(calories===null&&energyKj!==null)calories=energyKj/4.184;
  const sodium=coherentServingValue("sodium"),rawNutrients={calories:calories===null?null:Number(calories),energyKj:energyKj===null?null:Number(energyKj),protein:coherentServingValue("proteins"),carbs:coherentServingValue("carbohydrates"),fat:coherentServingValue("fat"),satFat:coherentServingValue("saturated-fat"),fibre:coherentServingValue("fiber"),sugar:coherentServingValue("sugars"),sodium:sodium===null?null:sodium*1000},normalised=window.HECPackagedFoods?.normalisedEnergy?.(rawNutrients),nutrients=normalised?.nutrients||rawNutrients,integrity=window.HECPackagedFoods?.nutritionIntegrity?.(rawNutrients);
  const servingLabel=product.serving_size||`${formatNumber(servingQty,true)} ${unit}`;
  const countryText=[product.countries,...(product.countries_tags||[])].filter(Boolean).join(" ");
  const countMatch=servingText.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(biscuits?|slices?|bars?|pieces?|crackers?|cakes?|serves?|servings?)\b/i);const countQty=n(countMatch?.[1]),countWord=normalise(countMatch?.[2]||"").replace(/s$/,"");const units={serve:1,[unit]:1/servingQty},unitLabels={serve:`Serve (${servingLabel})`,[unit]:unit};if(countQty>0&&countWord){units[countWord]=1/countQty;unitLabels[countWord]=`${countWord.charAt(0).toUpperCase()+countWord.slice(1)} (${formatNumber(servingQty,true)} ${unit} per ${formatNumber(countQty,true)})`;}
  return {id:`off-${product.code}`,barcode:String(product.code||""),name:product.product_name||product.generic_name||`Barcode ${product.code}`,brand:product.brands||"",category:"Online Product",country:/australia/i.test(countryText)?"Australia":"International",aliases:[product.product_name,product.generic_name,product.brands].filter(Boolean),defaultAmount:1,defaultUnit:"serve",units,unitLabels,serving:servingLabel,nutrients,sourceNutrients:rawNutrients,nutritionIntegrity:integrity||null,nutritionStatus:integrity?.status||'',loggable:integrity?.loggable!==false,energyDisplaySource:normalised?.displayEnergySource||'',foodGroups:{},waterMl:unit==="mL"?servingQty*.9:0,hydrationType:unit==="mL"?"drink":"food",score:6,source:"Open Food Facts · Community Supplied · Verify Package",verified:false,ingredients:product.ingredients_text||"",allergens:product.allergens||[],imageUrl:product.image_front_small_url||product.image_front_url||"",servingBasisCheck:basisWarnings.length?`Corrected ${basisWarnings.length} inconsistent serving field${basisWarnings.length===1?'':'s'} from per-100 data`:"Serving fields coherent",servingBasisWarnings:basisWarnings};
}

function makeUsdaFood(item){
  const list=item.foodNutrients||[];const nutrients={calories:onlineEnergyKcal(list),protein:onlineNutrientValue(list,["Protein"],["G"]),carbs:onlineNutrientValue(list,["Carbohydrate, by difference"],["G"]),fat:onlineNutrientValue(list,["Total lipid (fat)"],["G"]),satFat:onlineNutrientValue(list,["Fatty acids, total saturated"],["G"]),fibre:onlineNutrientValue(list,["Fiber, total dietary"],["G"]),sugar:onlineNutrientValue(list,["Sugars, total including NLEA","Total Sugars"],["G"]),sodium:onlineNutrientValue(list,["Sodium, Na"],["MG"])};
  const moisture=onlineNutrientValue(list,["Water"],["G"]);
  return {id:`usda-${item.fdcId}`,fdcId:item.fdcId,name:item.description||"USDA Food",brand:item.brandOwner||item.brandName||"USDA",category:"Online Generic Food",country:"International",aliases:[item.description,item.brandOwner].filter(Boolean),defaultAmount:100,defaultUnit:"g",units:{g:.01,serving:1},unitLabels:{g:"g",serving:"100 g reference"},serving:"100 g reference",nutrients,foodGroups:{},waterMl:moisture,hydrationType:"food",score:6,source:"USDA FoodData Central · verify applicability to Australian product",verified:false,ingredients:item.ingredients||"",allergens:[]};
}
function alpha0630PruneOnlineFoods(maxUnsaved=220){
  const list=Array.isArray(ext.onlineFoods)?ext.onlineFoods:[],saved=new Set(ext.savedFoodIds||[]),keepSaved=list.filter(f=>saved.has(f.id)),unsaved=list.filter(f=>!saved.has(f.id)).slice(-maxUnsaved),seen=new Set();
  ext.onlineFoods=[...keepSaved,...unsaved].filter(f=>f?.id&&!seen.has(f.id)&&seen.add(f.id));
}
function alpha0631UsableOnlineFood(food){if(!food?.id||!food?.nutrients||!hasEnergyValue(food.nutrients.calories))return false;const cal=Number(food.nutrients.calories);if(cal>0)return true;const n=s23Norm(`${food?.name||''} ${food?.brand||''}`);return cal===0&&/\bwater\b|\bzero sugar\b|\bsugar free\b|\bdiet soft drink\b/.test(n);}
function upsertOnlineFoods(foods){foods.forEach(food=>{if(!alpha0631UsableOnlineFood(food))return;const i=ext.onlineFoods.findIndex(x=>x.id===food.id);if(i>=0){const existing=ext.onlineFoods[i];ext.onlineFoods[i]={...food,...recordTimestamps(existing.createdAt||existing.savedAt)};}else ext.onlineFoods.push({...food,...recordTimestamps(food.createdAt||food.savedAt)});});alpha0630PruneOnlineFoods();alpha0630InvalidateFoodSearchCaches();}
alpha0630PruneOnlineFoods(); // cache only; saved online foods are always retained
async function searchOpenFoodFacts(query,signal){
  const fields="code,product_name,generic_name,brands,countries,countries_tags,nutriments,serving_size,serving_quantity,serving_quantity_unit,ingredients_text,allergens,image_front_small_url";
  const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=24&fields=${encodeURIComponent(fields)}`;
  const response=await fetch(url,{headers:{Accept:"application/json"},signal});if(!response.ok)throw new Error(`Open Food Facts ${response.status}`);const data=await response.json();return (data.products||[]).map(makeOpenFoodFactsFood).filter(alpha0631UsableOnlineFood);
}
async function searchUsda(query,signal){
  const settings=ext.foodDataSettings||{},key=String(settings.usdaKey||"").trim();if(!key)return [];
  const url=`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&pageSize=20`;
  const response=await fetch(url,{headers:{Accept:"application/json"},signal});if(!response.ok)throw new Error(`FoodData Central ${response.status}`);const data=await response.json();return (data.foods||[]).map(makeUsdaFood).filter(alpha0631UsableOnlineFood);
}
function renderOnlineLibrary(query=""){
  const candidates=(ext.onlineFoods||[]).map(food=>({food,rank:query?searchRank(food,query):0})).filter(item=>query&&item.rank>=760).sort((a,b)=>b.rank-a.rank||Number(b.food.country==="Australia")-Number(a.food.country==="Australia")||a.food.name.localeCompare(b.food.name)).map(x=>x.food),policy=C8?.partitionSearchRecords?.([...FOODS,...candidates]),items=policy?candidates.filter(food=>policy.primary.includes(food)):candidates,legacy=(policy?.legacy||[]).filter(item=>candidates.includes(item.food)),legacyHtml=legacy.length?`<details class="legacy-review-results"><summary>Legacy / conflicting results (${legacy.length})</summary><p>Details only — these cannot be quick-added.</p>${legacy.map(legacyFoodRow).join('')}</details>`:'';
  by("food-results").innerHTML=items.length||legacy.length?`<div class="online-source-banner"><strong>Online results require review.</strong><p>Only reasonably close matches are shown. Open Food Facts is community supplied; USDA values may not match an Australian brand.</p></div>${items.map(resourceFoodRow).join("")}${legacyHtml}`:`<div class="resource-empty"><strong>No Relevant Online Results Found.</strong><p>Tap Search Online Databases to search this term, or try a broader food or brand name.</p></div>`;
}
let onlineSearchToken=0,allResourcesOnlineTimer=null,lastAutoOnlineQuery="",onlineAbortController=null;
let alpha0630FoodSearchTimer=null,alpha0630FoodSearchUiToken=0;
function alpha0630CancelFoodSearchWork({invalidateOnline=false}={}){
  clearTimeout(alpha0630FoodSearchTimer);alpha0630FoodSearchTimer=null;clearTimeout(allResourcesOnlineTimer);allResourcesOnlineTimer=null;alpha0630FoodSearchUiToken++;
  if(invalidateOnline){onlineSearchToken++;try{onlineAbortController?.abort();}catch{}onlineAbortController=null;}
}
window.HECBeforeScreenShow=function(id){
  if(id!=="food-library"){
    alpha0630CancelFoodSearchWork({invalidateOnline:true});
    const search=by("food-search");if(search&&document.activeElement===search)search.blur();
    by("food-live-results")?.classList.add("hidden");
    by("resource-add-menu")?.classList.add("hidden");
  }
  if(id==="home"){
    const modal=by("a05-modal");if(modal&&!modal.classList.contains("hidden"))closeModal();
    by("companion-preview-modal")?.classList.add("hidden");
  }
};
function alpha0630HandleFoodSearchInput(){
  const input=by("food-search");if(!input)return;const value=input.value;ext.ui.foodSearch=value;const token=++alpha0630FoodSearchUiToken;if(typeof psSearchBeginRevision==='function')psSearchBeginRevision(value);
  clearTimeout(alpha0630FoodSearchTimer);clearTimeout(allResourcesOnlineTimer);onlineSearchToken++;try{onlineAbortController?.abort();}catch{}onlineAbortController=null;
  if(!value.trim()){by("food-live-results")?.classList.add("hidden");alpha0630FoodSearchTimer=setTimeout(()=>{if(token!==alpha0630FoodSearchUiToken||!q('#food-library.active'))return;renderLibrary();},0);return;}
  // Let Safari/iOS paint the character, then show the lightweight predictive
  // surface almost immediately. Full local ranking follows after a short pause.
  requestAnimationFrame(()=>{if(token!==alpha0630FoodSearchUiToken||!q('#food-library.active'))return;s23RenderLive(value);keepLiveFoodResultsVisible();});
  const caret=input.selectionStart;alpha0630FoodSearchTimer=setTimeout(()=>{if(token!==alpha0630FoodSearchUiToken||!q('#food-library.active'))return;renderLibrary();if(document.activeElement===input&&Number.isInteger(caret))input.setSelectionRange(caret,caret);keepLiveFoodResultsVisible();scheduleAllResourcesOnlineSearch();},160);
}
function alpha0631ExternalSearchQuery(query){
  const entity=REG29?.primary?.(query,['brand','retailer','restaurant']);
  const residual=s23Singular(REG29?.stripRecognisedEntities?.(query)||'');
  if(entity?.entity?.name)return [entity.entity.name,residual].filter(Boolean).join(' ').trim();
  return REG29?.canonicalSearchText?.(query)||query;
}
function renderAllResourcesOnlineAppendOnly(query){
  const section=by('food-results')?.querySelector?.('.all-resources-online');if(!section)return false;const online=cachedOnlineMatches(query),legacy=cachedLegacyMatches(query),legacyHtml=legacy.length?`<details class="legacy-review-results"><summary>Legacy / conflicting results (${legacy.length})</summary><p>Kept for review only. The verified Australian record is used for logging.</p>${legacy.map(legacyFoodRow).join('')}</details>`:'';
  section.innerHTML=`<div class="online-source-banner"><strong>Broader Online Results — Review Required</strong><p>${online.length} online match${online.length===1?'':'es'} kept separate from the stable local Australian results.</p></div>${online.slice(0,24).map(resourceFoodRow).join('')}${legacyHtml}`;return true;
}
function alpha0631RenderOnlineProgress(query,loaded,checkingMore=false,revision=psSearchRevisionFor(query),arrivals=[]){
  if(!psSearchRevisionCurrent(revision,query)||(by("food-search")?.value.trim()||"")!==query||!q('#food-library.active'))return;
  psRecordOnlineResults(revision,query,arrivals);
  const status=by("online-food-status"),inline=by("all-online-inline-status");
  const copy=loaded?`Local results are ready · ${loaded} reviewable online result${loaded===1?'':'s'}${checkingMore?' · still checking additional references…':''}`:(checkingMore?'Local results are ready · still checking packaged products and Australian references…':'No reviewable online matches returned.');
  if(status)status.textContent=copy;if(inline)inline.textContent=copy;
  if(activeLibraryTab()==="online")renderOnlineLibrary(query);else if(activeLibraryTab()==="all")renderAllResourcesOnlineAppendOnly(query);
}
async function runOnlineFoodSearch({automatic=false}={}){
  const query=by("food-search")?.value.trim()||"",externalQuery=alpha0631ExternalSearchQuery(query),revision=psSearchRevisionFor(query),token=++onlineSearchToken;if(!query||query.length<3){if(!automatic)showActionToast("Enter at least three letters before searching online.",null,5000);return [];}
  try{onlineAbortController?.abort();}catch{}onlineAbortController=new AbortController();const signal=onlineAbortController.signal;
  const status=by("online-food-status"),button=by("search-online-foods");if(button)button.disabled=true;if(status)status.textContent="Checking packaged products…";const inline=by("all-online-inline-status");if(inline)inline.textContent="Checking packaged products…";
  const hasCommercialEntity=!!REG29?.primary?.(query,['brand','retailer','restaurant']);const all=[];
  try{
    const offPromise=searchOpenFoodFacts(externalQuery,signal);
    const usdaPromise=hasCommercialEntity?null:searchUsda(externalQuery,signal);
    try{
      const off=await offPromise;if(token!==onlineSearchToken||signal.aborted||!psSearchRevisionCurrent(revision,query))return[];if(off?.length){upsertOnlineFoods(off);all.push(...off);}alpha0631RenderOnlineProgress(query,all.length,!!usdaPromise,revision,off);
    }catch(error){if(error?.name==='AbortError'||token!==onlineSearchToken||!psSearchRevisionCurrent(revision,query))return[];}
    if(usdaPromise){try{const usda=await usdaPromise;if(token!==onlineSearchToken||signal.aborted||!psSearchRevisionCurrent(revision,query))return all;if(usda?.length){upsertOnlineFoods(usda);all.push(...usda);}alpha0631RenderOnlineProgress(query,all.length,false,revision,usda);}catch(error){if(error?.name==='AbortError'||token!==onlineSearchToken||!psSearchRevisionCurrent(revision,query))return all;alpha0631RenderOnlineProgress(query,all.length,false,revision);}}
    if(!all.length&&!automatic)showActionToast("No Online Matches Were Returned. Try A Broader Search Or Scan A Barcode.",null,5000);return all;
  }catch(error){if(error?.name==="AbortError"||token!==onlineSearchToken)return[];if(status)status.textContent="Online food search is temporarily unavailable. Local Australian foods remain available.";if(!automatic)showActionToast("Online Food Search Is Temporarily Unavailable.",null,6000);return [];}
  finally{if(token===onlineSearchToken&&button)button.disabled=false;if(onlineAbortController?.signal===signal)onlineAbortController=null;}
}
function scheduleAllResourcesOnlineSearch(){
  clearTimeout(allResourcesOnlineTimer);const query=by("food-search")?.value.trim()||"";if(!q('#food-library.active')||activeLibraryTab()!=="all"||query.length<3)return;if(query===lastAutoOnlineQuery&&cachedOnlineMatches(query).length)return;
  // A strong prebuilt Food Source result is already the authoritative local
  // answer. Keep explicit online refresh available, but do not query the web
  // automatically for a source alias or known source product.
  if(allFoods().some(food=>food.foodSourceId&&searchRank(food,query)>=760)){lastAutoOnlineQuery=query;return;}
  allResourcesOnlineTimer=setTimeout(()=>{if(!q('#food-library.active')||(by("food-search")?.value.trim()||"")!==query)return;lastAutoOnlineQuery=query;runOnlineFoodSearch({automatic:true});},180);
}
by("search-online-foods")?.addEventListener("click",()=>runOnlineFoodSearch({automatic:false}));

function toggleSavedFood(id){
  const food=getFood(id);if(!food)return;
  const idx=ext.savedFoodIds.indexOf(id);
  if(idx>=0){ext.savedFoodIds.splice(idx,1);showActionToast(`${food.name} removed from My Foods.`,()=>{ext.savedFoodIds.push(id);saveExt();renderLibrary();},8000);}else{ext.savedFoodIds.push(id);showActionToast(`${food.name} saved to My Foods.`,()=>{ext.savedFoodIds=ext.savedFoodIds.filter(x=>x!==id);saveExt();renderLibrary();},8000);}saveExt();renderLibrary();
}
function showFoodDetails(id){
  const food=getFood(id);if(!food)return;
  const safety=foodSafety(food),groups=scaledFoodGroups(food,defaultAmount(food),defaultUnit(food));
  const fixed=window.HECFoodCatalogue?.canLog?window.HECFoodCatalogue.canLog(food):true,licence=food.foodSourceId?`<p class="fine"><strong>Catalogue use:</strong> ${esc(food.usageScope||'development/founder-trial')} · ${food.productionApproved?'Production approved':esc(food.licenceStatus||'No production reuse approval recorded')}</p>`:'';
  openModal(food.name,`${cleanMeasureText(food.serving)} · ${food.source}`,"Close",()=>{},`${fixed?`${nutritionCards(food.nutrients)}<p class="fine"><strong>Nutrition guidance:</strong> ${esc(rc3NutritionGuidance(food.nutrients))}</p>`:`<p class="danger-text"><strong>Cannot add to Diary:</strong> ${esc(food.entryBlockedReason||'A complete fixed nutrition value is not available.')}</p>`}<p><strong>Food-group contribution:</strong> ${FOOD_GROUP_KEYS.filter(key=>groups[key]>0).map(key=>`${esc(FOOD_GROUP_LABELS[key])} ${formatNumber(groups[key],true)} serve`).join(" · ")||"Not yet classified"}</p><p><strong>Estimated water:</strong> ${formatNumber(food.waterMl)} mL per listed serving</p><p><strong>Ingredients:</strong> ${esc(food.ingredients||"Not Available")}</p>${licence}${(food.sourceAnomalies||[]).map(note=>`<p class="fine"><strong>Published-source note:</strong> ${esc(note)}</p>`).join('')}${safety.blocked?`<p class="danger-text"><strong>Profile warning:</strong> ${esc(safety.message)}</p>`:""}`);
  by("a05-modal-confirm").className="primary";
}
function renderRecipeLibrary(query=""){
  const recipes=ext.recipes.filter(r=>!query||searchRank(recipeAsFood(r),query)>0);
  by("food-results").innerHTML=recipes.length?recipes.map(r=>resourceFoodRow(recipeAsFood(r))).join(""):`<div class="resource-empty">No Recipes Saved Yet.</div>`;
}
function renderMealLibrary(query=""){
  const meals=ext.mealTemplates.filter(meal=>!query||normalise(meal.name).includes(normalise(query)));
  by("food-results").innerHTML=meals.length?meals.map(meal=>{const totals=sumNutrients(meal.items);return `<article class="resource-row"><button class="resource-main" data-meal-add="${esc(meal.id)}"><strong>${esc(meal.name)}</strong><small>${meal.items.length} ${meal.items.length===1?"item":"items"} · ${formatNumber(totals.calories)} Cal</small></button><button class="resource-delete" data-meal-delete="${esc(meal.id)}">•••</button><button class="resource-add" data-meal-add="${esc(meal.id)}">＋</button></article>`;}).join(""):`<div class="resource-empty">No saved meals yet. Save a meal from the Diary.</div>`;
}
function addMealTemplate(id){
  const template=ext.mealTemplates.find(m=>m.id===id);if(!template)return;
  const date=ext.ui.diaryDate||isoToday(),knownMeal=ext.ui.pendingMeal||"";
  const mealOptions=mealNames().map(name=>`<option value="${esc(name)}" ${knownMeal===name?"selected":""}>${esc(name)}</option>`).join("");
  openModal(`Add ${template.name}?`,`Choose where this reusable meal belongs. This creates independent Diary entries on ${formatDate(date)}.`,"Add To Diary",()=>{
    const meal=by("saved-meal-target-meal")?.value||knownMeal;if(!meal){showActionToast("Choose a meal before adding this saved meal.",null,5000);return;}
    ext.diary[date] ||= [];
    template.items.forEach(item=>ext.diary[date].push({...clone(item),id:uid("entry"),date,meal,status:"eaten",localDate:date,timeZone:activeTimeZone(),...recordTimestamps()}));saveExt();openFeature("food-diary");showActionToast(`${template.name} added to ${meal}.`,null,2000);
  },`<label>Meal<select id="saved-meal-target-meal"><option value="">Choose A Meal</option>${mealOptions}</select></label>`);
}
function deleteMealTemplate(id){const template=ext.mealTemplates.find(m=>m.id===id);if(!template)return;openModal(`Delete ${template.name}?`,`Past diary entries will not be changed.`,`Delete`,()=>{const idx=ext.mealTemplates.findIndex(m=>m.id===id);const removed=ext.mealTemplates.splice(idx,1)[0];saveExt();renderLibrary();showActionToast(`${removed.name} deleted from My Meals & Recipes.`,()=>{ext.mealTemplates.splice(idx,0,removed);saveExt();renderLibrary();},8000);});}

// Custom food
by("save-custom-food")?.addEventListener("click",()=>{
  const name=by("custom-food-name").value.trim(),cal=by("custom-cal").value;
  if(!name||cal===""){by("custom-food-error").textContent="Enter a food name and Calories.";return;}
  const nutrientValue=id=>by(id).value===""?null:Number(by(id).value);
  const amount=n(by("custom-serving-amount").value)||1,unit=by("custom-serving-unit").value;
  const food={id:uid("custom"),recordType:"private",verificationStatus:"user-confirmed",market:"AU",name,brand:by("custom-food-brand").value.trim(),category:"Custom Food",country:"Australia",aliases:[name],defaultAmount:amount,defaultUnit:unit,units:{[unit]:1/amount},unitLabels:{[unit]:unit},serving:`${amount} ${unit}`,nutrients:{calories:Number(cal),protein:nutrientValue("custom-protein"),carbs:nutrientValue("custom-carbs"),fat:nutrientValue("custom-fat"),satFat:nutrientValue("custom-sat-fat"),fibre:nutrientValue("custom-fibre"),sugar:nutrientValue("custom-sugar"),sodium:nutrientValue("custom-sodium")},foodGroups:{},waterMl:0,hydrationType:"food",score:7,source:"User Created",verified:false,ingredients:by("custom-ingredients").value.trim(),allergens:[],...recordTimestamps()};
  ext.customFoods.push(food);saveExt();["custom-food-name","custom-food-brand","custom-cal","custom-protein","custom-carbs","custom-fat","custom-sat-fat","custom-fibre","custom-sugar","custom-sodium","custom-ingredients"].forEach(id=>by(id).value="");if(ext.ui.returnToRecipe){ext.ui.returnToRecipe=false;ext.ui.recipeSelectedFoodId=food.id;saveExt();openFeature("recipe-builder");showActionToast(`${food.name} created and ready to add to your recipe.`,null,2000);}else{ext.ui.libraryTab="custom";openFeature("food-library");showActionToast(`${food.name} saved to My Foods.`,null,2000);}
});

// Recipe builder
let recipeDraft=Array.isArray(ext.ui.recipeDraft)?ext.ui.recipeDraft:[];
let recipeSelectedFoodId=ext.ui.recipeSelectedFoodId||"";
function saveRecipeDraft(){ext.ui.recipeDraft=recipeDraft;ext.ui.recipeSelectedFoodId=recipeSelectedFoodId;saveExt();}
function renderRecipeSelectOptions(){renderRecipeSearch();}
function recipeFoods(){return allFoods().filter(f=>f.category!=="Recipe");}
function renderRecipeSearch(){
  const input=by("recipe-food-search"),results=by("recipe-food-search-results");if(!input||!results)return;
  const query=input.value.trim();
  const ranked=recipeFoods().map(food=>({food,rank:searchRank(food,query)})).filter(x=>query?x.rank>0:true).sort((a,b)=>b.rank-a.rank||a.food.name.localeCompare(b.food.name)).slice(0,12);
  results.innerHTML=query?ranked.map(({food})=>`<button type="button" data-recipe-food-choice="${esc(food.id)}"><strong>${esc(food.name)}</strong><small>${esc(cleanMeasureText(food.serving))} · ${energyText(food.nutrients?.calories)}</small></button>`).join(""):'<p class="fine">Type at least part of an ingredient name.</p>';
  if(recipeSelectedFoodId)selectRecipeFood(recipeSelectedFoodId,false);
}
function selectRecipeFood(id,clearSearch=true){
  const food=getFood(id);if(!food)return;recipeSelectedFoodId=id;ext.ui.recipeSelectedFoodId=id;
  if(by("recipe-food-select"))by("recipe-food-select").value=id;
  if(by("recipe-selected-food"))by("recipe-selected-food").innerHTML=`<strong>${esc(food.name)}</strong><small>${esc(cleanMeasureText(food.serving))} · ${energyText(food.nutrients?.calories)}</small>`;
  const unit=by("recipe-ingredient-unit");if(unit){unit.innerHTML=Object.keys(unitOptions(food)).map(u=>`<option value="${esc(u)}">${esc(titleUnit(unitLabel(food,u)))}</option>`).join("");unit.value=defaultUnit(food);}
  if(by("recipe-ingredient-amount"))by("recipe-ingredient-amount").value=defaultAmount(food);
  if(clearSearch&&by("recipe-food-search")){by("recipe-food-search").value="";by("recipe-food-search-results").innerHTML="";}
  saveRecipeDraft();
}
function titleUnit(text){
  const metric={g:"g",kg:"kg",ml:"mL",l:"L",kj:"kJ",cal:"Cal"};
  return String(text||"").split(/(\s+|[()])/).map(part=>{
    const key=part.toLowerCase();
    if(metric[key]) return metric[key];
    if(/^[a-z][a-z-]*$/i.test(part)) return part.charAt(0).toUpperCase()+part.slice(1).toLowerCase();
    return part;
  }).join("");
}
by("recipe-food-search")?.addEventListener("input",renderRecipeSearch);
by("recipe-ingredient-unit")?.addEventListener("change",()=>{if(by("recipe-ingredient-amount"))by("recipe-ingredient-amount").value=1;});
by("recipe-name")?.addEventListener("input",event=>{ext.ui.recipeName=event.target.value;saveExt();});
by("recipe-servings")?.addEventListener("input",event=>{ext.ui.recipeServings=Math.max(1,n(event.target.value)||1);saveExt();});
by("recipe-notes")?.addEventListener("input",event=>{ext.ui.recipeNotes=event.target.value;saveExt();});
document.addEventListener("click",event=>{const choice=event.target.closest("[data-recipe-food-choice]");if(choice){selectRecipeFood(choice.dataset.recipeFoodChoice);return;}const remove=event.target.closest("[data-remove-recipe-ingredient]");if(remove){recipeDraft=recipeDraft.filter(i=>i.id!==remove.dataset.removeRecipeIngredient);saveRecipeDraft();renderRecipeDraft();}});
function renderRecipeBuilder(){recipeDraft=Array.isArray(ext.ui.recipeDraft)?ext.ui.recipeDraft:recipeDraft;recipeSelectedFoodId=ext.ui.recipeSelectedFoodId||recipeSelectedFoodId;if(by("recipe-name")&&!by("recipe-name").value)by("recipe-name").value=ext.ui.recipeName||"";if(by("recipe-servings"))by("recipe-servings").value=ext.ui.recipeServings||by("recipe-servings").value||4;if(by("recipe-notes")&&!by("recipe-notes").value)by("recipe-notes").value=ext.ui.recipeNotes||"";renderRecipeSearch();if(recipeSelectedFoodId)selectRecipeFood(recipeSelectedFoodId,false);renderRecipeDraft();}
by("add-recipe-ingredient")?.addEventListener("click",()=>{
  const food=getFood(recipeSelectedFoodId);if(!food){showActionToast("Search for and choose an ingredient first.",null,4500);return;}const amount=n(by("recipe-ingredient-amount").value),unit=by("recipe-ingredient-unit").value;if(amount<=0)return;
  recipeDraft.push({id:uid("ingredient"),foodId:food.id,name:food.name,amount,unit,unitLabel:titleUnit(unitLabel(food,unit)),nutrients:scaledNutrients(food,amount,unit),foodGroups:scaledFoodGroups(food,amount,unit),waterMl:scaledWaterMl(food,amount,unit),score:food.score});recipeSelectedFoodId="";if(by("recipe-selected-food"))by("recipe-selected-food").textContent="No Ingredient Selected.";saveRecipeDraft();renderRecipeDraft();
});
by("create-missing-ingredient")?.addEventListener("click",()=>{ext.ui.returnToRecipe=true;saveExt();openFeature("custom-food");});
by("scan-recipe-ingredient")?.addEventListener("click",()=>{ext.ui.returnToRecipe=true;saveExt();openFeature("scan-centre");});
function renderRecipeDraft(){
  if(!by("recipe-ingredient-list"))return;
  by("recipe-ingredient-list").innerHTML=recipeDraft.length?recipeDraft.map(i=>`<div class="recipe-row"><span><strong>${esc(i.name)}</strong><small>${formatNumber(i.amount,true)} ${esc(i.unitLabel)} · ${formatNumber(i.nutrients.calories)} Cal</small></span><button data-remove-recipe-ingredient="${esc(i.id)}" class="delete-action">Remove</button></div>`).join(""):`<p class="empty-state">No Ingredients Yet.</p>`;
  const servings=Math.max(1,n(by("recipe-servings")?.value)||1),total=sumNutrients(recipeDraft),per=Object.fromEntries(Object.entries(total).map(([k,v])=>[k,v/servings]));
  by("recipe-nutrition-preview").innerHTML=`<p><strong>Whole Recipe:</strong> ${formatNumber(total.calories)} Cal · <strong>Per Serving:</strong> ${formatNumber(per.calories)} Cal</p>${nutritionCards(per)}`;
  saveRecipeDraft();
}
by("recipe-servings")?.addEventListener("input",renderRecipeDraft);
by("save-recipe")?.addEventListener("click",()=>{
  const name=by("recipe-name").value.trim(),servings=Math.max(1,whole(by("recipe-servings").value));if(!name||!recipeDraft.length){by("recipe-error").textContent="Enter a Recipe Name and at least one Ingredient.";return;}
  const total=sumNutrients(recipeDraft),per=Object.fromEntries(Object.entries(total).map(([k,v])=>[k,v/servings]));const score=Math.max(1,Math.min(10,round1(recipeDraft.reduce((sum,i)=>sum+n(i.score),0)/recipeDraft.length)));
  const profile=recipeProfile({servings,ingredients:recipeDraft});const recipe={id:uid("recipe"),name,servings,notes:by("recipe-notes").value,ingredients:clone(recipeDraft),perServe:per,foodGroups:profile.foodGroups,waterMl:profile.waterMl,score,...recordTimestamps()};ext.recipes.push(recipe);recipeDraft=[];recipeSelectedFoodId="";ext.ui.recipeDraft=[];ext.ui.recipeSelectedFoodId="";ext.ui.recipeName="";ext.ui.recipeServings=4;ext.ui.recipeNotes="";by("recipe-name").value="";by("recipe-servings").value=4;by("recipe-notes").value="";ext.ui.libraryTab="recipes";saveExt();openFeature("food-library");showActionToast(`${recipe.name} saved in My Meals & Recipes. Tap its star to also add it to Favourite Foods.`,null,2000);
});

// Voice and text logging
let recognition=null,voiceParsed=[];
function initialiseVoice(){by("voice-date").value=isoToday();by("voice-review").classList.add("hidden");}
function startVoice(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){by("voice-status").textContent="Voice recognition is not supported in this browser. Type the request instead.";return;}
  recognition=new Recognition();recognition.lang=mainData().preferences?.language||"en-AU";recognition.continuous=false;recognition.interimResults=true;
  recognition.onstart=()=>by("voice-status").textContent="Listening… Speak naturally. Nothing will be added until you review and confirm.";
  recognition.onresult=event=>{let text="";for(let i=event.resultIndex;i<event.results.length;i++)text+=event.results[i][0].transcript;by("voice-transcript").value=text;if(text.trim())by("voice-status").textContent="Voice captured successfully. Review the transcript, then choose Review Request.";};
  recognition.onerror=event=>{by("stop-voice-log")?.classList.add("hidden");const captured=!!by("voice-transcript")?.value.trim();by("voice-status").textContent=(event.error==="audio-capture"&&captured)?"Voice captured successfully. Review the transcript, then choose Review Request.":(event.error==="not-allowed"||event.error==="service-not-allowed")?"Microphone permission was not granted. You can use Open Diary Add Food below; nothing was recorded.":`Voice recognition stopped: ${event.error}. Correct the transcript or use the Diary fallback.`;if(event.error==="not-allowed"||event.error==="service-not-allowed")by("quick-voice-fallback")?.classList.remove("hidden");};
  recognition.onend=()=>{by("stop-voice-log")?.classList.add("hidden");if(!/permission was not granted|captured successfully/i.test(by("voice-status")?.textContent||""))by("voice-status").textContent="Listening stopped. Review the words, correct anything needed, then choose Review Request.";};
  recognition.start();
}
by("start-voice-log")?.addEventListener("click",startVoice);by("stop-voice-log")?.addEventListener("click",()=>recognition?.stop());
const WORD_NUMBERS={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,half:.5};
function numberFrom(value,def=1){const key=normalise(value);return Number(value)||WORD_NUMBERS[key]||def;}
function mealFromText(text){const t=normalise(text);if(t.includes("breakfast"))return"Breakfast";if(t.includes("lunch"))return"Lunch";if(t.includes("dinner")||t==="tea")return"Dinner";if(t.includes("morning tea")||t.includes("afternoon tea")||t.includes("smoko")||t.includes("supper")||t.includes("snack"))return"Snacks";if(t.includes("other"))return"Other";return "";}
function parseVoice(text){
  const raw=String(text||"");const t=normalise(raw);const items=[];
  const weet=t.match(/(?:add\s+)?(a|an|one|two|three|four|five|six|\d+(?:\.\d+)?)?\s*(?:sanitarium\s+)?weet\s*bix/);if(weet)items.push({foodId:"weetbix-au",amount:numberFrom(weet[1],2),unit:"biscuit"});
  const milk=t.match(/(\d+(?:\.\d+)?)\s*(?:ml|millilitre|millilitres|milliliter|milliliters)\s+(?:of\s+)?(?:light|lite|low fat|1 percent)?\s*milk/);if(milk)items.push({foodId:"light-milk-au",amount:Number(milk[1]),unit:"mL"});
  if(t.includes("water")){const m=t.match(/(\d+(?:\.\d+)?)\s*(?:ml|millilitre|millilitres).*water/);items.push({foodId:"water",amount:m?Number(m[1]):250,unit:"mL"});}
  if(!items.length){
    const stripped=t.replace(/\b(add|log|record|please|for|to|my|the|a|an)\b/g," ").replace(/\b(breakfast|morning tea|lunch|afternoon tea|dinner|snacks|snack)\b/g," ").replace(/\s+/g," ").trim();
    const ranked=allFoods().filter(f=>f.category!=="Recipe").map(food=>({food,rank:searchRank(food,stripped)})).filter(x=>x.rank>=760).sort((a,b)=>b.rank-a.rank||Number(b.food.afcd)-Number(a.food.afcd));
    if(ranked.length){const food=ranked[0].food;items.push({foodId:food.id,amount:defaultAmount(food),unit:defaultUnit(food),heard:raw});}
  }
  return {items,meal:mealFromText(raw),heard:raw};
}
function renderVoiceReview(){
  by("voice-review").classList.remove("hidden");by("voice-meal").value=voiceParsed.meal||"";
  by("voice-review-items").innerHTML=voiceParsed.items.length?voiceParsed.items.map((item,index)=>{const food=getFood(item.foodId),values=scaledNutrients(food,item.amount,item.unit);return `<div class="voice-review-row"><div><strong>${esc(food.name)}</strong><small>${formatNumber(item.amount,true)} ${esc(unitLabel(food,item.unit))} · ${formatNumber(values.calories)} Cal</small></div><button data-remove-voice-item="${index}" class="delete-action">Remove</button></div>`}).join(""):`<p class="empty-state">No confident food match was identified for “${esc(voiceParsed.heard||by("voice-transcript").value)}”. Correct the text or search the Food Library.</p>`;
}
by("parse-voice-log")?.addEventListener("click",()=>{voiceParsed=parseVoice(by("voice-transcript").value);renderVoiceReview();});
document.addEventListener("click",event=>{const b=event.target.closest("[data-remove-voice-item]");if(b){voiceParsed.items.splice(Number(b.dataset.removeVoiceItem),1);renderVoiceReview();}});
by("cancel-voice-review")?.addEventListener("click",()=>by("voice-review").classList.add("hidden"));
by("confirm-voice-log")?.addEventListener("click",()=>{
  if(!voiceParsed.items?.length)return;const date=by("voice-date").value||isoToday(),meal=by("voice-meal").value;if(!meal){showActionToast("Choose a Meal before adding this food.",null,5000);by("voice-meal")?.focus();return;}ext.diary[date] ||= [];
  voiceParsed.items.forEach(item=>{const food=getFood(item.foodId),values=scaledNutrients(food,item.amount,item.unit),label=unitLabel(food,item.unit);ext.diary[date].push({id:uid("entry"),foodId:food.id,name:food.name,brand:food.brand,date,meal,status:"eaten",amount:item.amount,unit:item.unit,unitLabel:label,time:localClock(),notes:"Added after voice/text review",nutrients:values,foodSnapshot:window.HECPackagedFoods?.diarySnapshot?.(food,{amount:item.amount,unit:item.unit,unitLabel:label,nutrients:values})||null,foodGroups:scaledFoodGroups(food,item.amount,item.unit),waterMl:scaledWaterMl(food,item.amount,item.unit),hydrationType:food.hydrationType||"food",score:food.score,source:`Voice/Text Review · ${food.source}`,localDate:date,timeZone:activeTimeZone(),createdAt:new Date().toISOString()});});saveExt();ext.ui.diaryDate=date;openFeature("food-diary");showActionToast(`${voiceParsed.items.length} ${voiceParsed.items.length===1?"item":"items"} added after review.`,null,2000);voiceParsed=[];by("voice-transcript").value="";
});

// Scan capture and review
const X8=window.HECCaptureFoundation;
let scanFile=null,scanBarcodeControls=null,scanBarcodeStream=null,scanBarcodeTimer=null,barcodeDetectionLocked=false,scanBarcodeFood=null,ocrParsedPanel=null,ocrReviewedFood=null,captureActionLocked=false;
function loadExternalScript(src,test){
  if(test())return Promise.resolve(true);
  return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(x=>x.src===src);if(existing){const timer=setInterval(()=>{if(test()){clearInterval(timer);resolve(true);}},100);setTimeout(()=>{clearInterval(timer);test()?resolve(true):reject(new Error("Library unavailable"));},8000);return;}const script=document.createElement("script");script.src=src;script.crossOrigin="anonymous";script.onload=()=>test()?resolve(true):reject(new Error("Library did not initialise"));script.onerror=()=>reject(new Error("Library could not load"));document.head.appendChild(script);});
}
async function ensureBarcodeLibrary(){
  if(window.ZXingBrowser)return true;
  try{await loadExternalScript("https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js",()=>!!window.ZXing);await loadExternalScript("https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/umd/zxing-browser.min.js",()=>!!window.ZXingBrowser);return !!window.ZXingBrowser;}catch{return false;}
}
async function ensureOcrLibrary(){
  if(window.Tesseract)return true;
  try{await loadExternalScript("https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js",()=>!!window.Tesseract);return !!window.Tesseract;}catch{return false;}
}
function validBarcodeValue(value){return X8?.validBarcode?X8.validBarcode(value):(String(value||"").replace(/\D/g,"").match(/^\d{8,14}$/)?.[0]||"");}
function setCaptureActionState(source,actions={}){const root=source==="barcode"?by("scan-review-card"):by("ocr-review");if(!root)return;qa(`[data-capture-source="${source}"]`).forEach(button=>{button.disabled=!actions[button.dataset.captureAction];button.setAttribute("aria-disabled",String(button.disabled));});}
function keepCapturedFoodAvailable(food,{save=false}={}){
  if(!food)return false;const isPrivate=food.recordType==='private'||food.source==='User Created'||/nutrition panel/i.test(food.source||'');
  if(isPrivate&&save){const index=ext.customFoods.findIndex(item=>item.id===food.id);if(index>=0)ext.customFoods[index]=food;else ext.customFoods.push(food);}
  else if(!isPrivate){const index=ext.onlineFoods.findIndex(item=>item.id===food.id);if(index>=0)ext.onlineFoods[index]=food;else ext.onlineFoods.push(food);}
  else if(!FOOD_BY_ID.has(food.id)){FOODS.push(food);FOOD_BY_ID.set(food.id,food);}
  if(save&&!ext.savedFoodIds.includes(food.id))ext.savedFoodIds.push(food.id);
  if(save){ext.foodVerification||={};ext.foodVerification[food.id]={...(ext.foodVerification[food.id]||{}),savedAt:new Date().toISOString(),method:/nutrition panel/i.test(food.source||'')?'nutrition-panel-confirmed':'barcode-online'};}
  if(save||!isPrivate)saveExt();return true;
}
function openCapturedFoodForDiary(food,{save=false}={}){
  if(!X8?.barcodeStatus?.(food)?.canAddToDiary){showActionToast("Complete And Confirm The Nutrition Details Before Adding This Food.",null,6000);return false;}
  keepCapturedFoodAvailable(food,{save});const meal=ext.ui.pendingMeal||ext.ui?.mealEntrySession?.meal||'',date=ext.ui?.mealEntrySession?.date||ext.ui.diaryDate||isoToday();prepareEntry(food,{date,meal,source:food.source});if(!editorState)return false;
  editorState.returnTo='scan-centre';editorState.pendingDiarySave=save;editorState.libraryOnly=false;by("entry-date")?.closest(".form-grid")?.classList.remove("hidden");if(by("entry-date"))by("entry-date").value=date;if(by("entry-meal"))by("entry-meal").value=meal;if(by("save-food-entry")){by("save-food-entry").classList.remove("hidden");by("save-food-entry").textContent=save?'Confirm Save & Add To Diary':'Confirm Add To Diary';}by("save-food-entry-and-food")?.classList.add("hidden");updateEntryPreview();if(!meal){showActionToast('Choose a Diary meal, then confirm. No default meal has been selected.',null,6000);by('entry-meal')?.focus();}return true;
}
function updateBarcodeLookupState(){const input=by("scan-barcode-input"),button=by("lookup-barcode");if(button)button.disabled=!validBarcodeValue(input?.value);}
function updateScanModeUI(){
  const mode=ext.ui.scanMode||"food";qa("[data-scan-mode]").forEach(b=>b.classList.toggle("active",b.dataset.scanMode===mode));by("barcode-tools")?.classList.toggle("hidden",mode!=="barcode");by("label-tools")?.classList.toggle("hidden",mode!=="label");by("photo-tools")?.classList.toggle("hidden",mode!=="food");by("scan-photo-capture")?.classList.toggle("hidden",mode==="barcode");
  const copy={food:"Take a meal photo, then identify and confirm every food before anything is logged.",barcode:"Scan a retail barcode with the camera. Detection stops the camera and looks the product up automatically.",label:"Photograph the Nutrition Information Panel square-on in good light. Review and edit every recognised value before saving."}[mode];if(by("scan-mode-copy"))by("scan-mode-copy").textContent=copy;
  if(by("scan-photo-heading"))by("scan-photo-heading").textContent=mode==="label"?"Photograph Nutrition Panel":"Take Meal Photo";
  if(by("take-scan-photo"))by("take-scan-photo").textContent=mode==="label"?"📷 Photograph Nutrition Panel":"📷 Take Meal Photo";
  if(by("scan-photo-instruction"))by("scan-photo-instruction").textContent=mode==="label"?"Photograph the entire Nutrition Information Panel clearly, square-on and in good light.":"Take a clear photo showing all foods on the plate.";
  if(mode==="barcode"&&by("barcode-status"))by("barcode-status").textContent="Ready To Scan. If the barcode is not in the online product database, use Nutrition Panel instead.";updateBarcodeLookupState();
}
function renderScanSelect(){updateScanModeUI();updateBarcodeLookupState();}
qa("[data-scan-mode]").forEach(button=>button.addEventListener("click",()=>{const next=button.dataset.scanMode;if(next!=="barcode")stopBarcodeCamera();ext.ui.scanMode=next;saveExt();updateScanModeUI();if(next==="barcode")startBarcodeCamera();}));
function displayScanImage(dataUrl){by("scan-preview").className="scan-preview";by("scan-preview").innerHTML=`<img id="scan-preview-image" src="${dataUrl}" alt="Captured food or package"><p>Image Captured. Review The Applicable Tools Below.</p>`;}
by("scan-image")?.addEventListener("change",event=>{scanFile=event.target.files?.[0]||null;if(!scanFile)return;const reader=new FileReader();reader.onload=async()=>{displayScanImage(reader.result);by("run-label-ocr").disabled=false;if(ext.ui.scanMode==="barcode")await decodeBarcodeFromPreview();};reader.readAsDataURL(scanFile);});

by("take-scan-photo")?.addEventListener("click",()=>{const input=by("scan-image");if(!input)return;input.setAttribute("capture","environment");input.click();});
by("choose-scan-photo")?.addEventListener("click",()=>{const input=by("scan-image");if(!input)return;input.removeAttribute("capture");input.click();});
async function lookupBarcodeProduct(code){
  const clean=validBarcodeValue(code);if(!clean){showActionToast("Enter Or Scan A Valid Barcode.",null,2000);return null;}by("scan-barcode-input")?.blur();updateBarcodeLookupState();by("barcode-status").textContent=`Looking Up ${clean}…`;by("scan-review-card")?.classList.add("hidden");scanBarcodeFood=null;captureActionLocked=false;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const localExternal=await window.HECOpenFoodFactsAU?.lookupBarcode?.(clean);
    if(localExternal){scanBarcodeFood=localExternal;const review=X8?.barcodeStatus?.(localExternal)||{canAddToDiary:hasEnergyValue(localExternal.nutrients?.calories),canSaveToMyFoods:true,missing:[]};by("scan-food-preview").innerHTML=`<div class="food-detail-title"><div><h3>${esc(localExternal.name)}</h3><p>${esc(localExternal.brand||"Brand Not Listed")} · Barcode ${esc(clean)} · ${esc(localExternal.packageSize||localExternal.serving)}</p></div></div>${nutritionCards(localExternal.nutrients)}`;const status=by("scan-review-status");if(status)status.innerHTML=review.canAddToDiary?'<strong>Australian Catalogue Match — Review Before Choosing</strong><p>Compare this community-supplied record with the package.</p>':'<strong>Exact Product Found, But Nutrition Is Incomplete</strong><p>Use Read Nutrition Panel or enter nutrition manually before adding it to Diary.</p>';setCaptureActionState('barcode',X8?.actionsFor?.(localExternal)||{save:true,add:review.canAddToDiary,both:review.canAddToDiary});by("scan-review-card").classList.remove("hidden");by("barcode-status").textContent=`Found ${localExternal.name} in the Australian product catalogue.`;return localExternal;}
    const fields="code,product_name,generic_name,brands,countries,countries_tags,nutriments,serving_size,serving_quantity,serving_quantity_unit,ingredients_text,allergens,image_front_small_url,image_front_url";
    const response=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json?fields=${encodeURIComponent(fields)}`,{headers:{Accept:"application/json"},signal:controller.signal});
    if(!response.ok)throw new Error(`Lookup ${response.status}`);const data=await response.json();if(data.status===0||!data.product)throw new Error("Product not found");const food=makeOpenFoodFactsFood(data.product),review=X8?.barcodeStatus?.(food)||{canAddToDiary:hasEnergyValue(food.nutrients?.calories),canSaveToMyFoods:true,missing:[]};
    if(review.canAddToDiary)upsertOnlineFoods([food]);scanBarcodeFood=food;const image=food.imageUrl?`<img class="scan-product-image" src="${esc(food.imageUrl)}" alt="${esc(food.name)} package image">`:"";
    by("scan-food-preview").innerHTML=`<div class="food-detail-title">${image}<div><h3>${esc(food.name)}</h3><p>${esc(food.brand||"Brand Not Listed")} · Barcode ${esc(clean)} · ${esc(food.serving)}</p></div></div>${nutritionCards(food.nutrients)}<div class="status-box scan-review-warning"><strong>Package Check Required</strong><p>Online barcode data can be incomplete or outdated. Compare the serving size and every nutrition value with the package. If they differ, read the Nutrition Panel instead.</p></div>`;
    const status=by("scan-review-status");if(status)status.innerHTML=review.canAddToDiary?'<strong>Recognised — Review Before Choosing</strong><p>This record has usable energy and serving data. Choose one explicit action below after checking the package.</p>':`<strong>Recognised, But Nutrition Is Incomplete</strong><p>${esc((review.missing||[]).join(', ')||'Required nutrition')} is missing. Diary actions are blocked. You may save the identity to My Foods, then use Nutrition Panel to complete it.</p>`;setCaptureActionState('barcode',X8?.actionsFor?.(food)||{save:true,add:review.canAddToDiary,both:review.canAddToDiary});
    by("scan-review-card").classList.remove("hidden");by("barcode-status").textContent=review.canAddToDiary?`Found ${food.name}. Check It Against The Package Before Choosing An Action.`:`Found ${food.name}, But The Online Nutrition Is Incomplete.`;setTimeout(()=>by("scan-review-card")?.scrollIntoView({behavior:"smooth",block:"start"}),80);return food;
  }catch(error){by("barcode-status").innerHTML=`No Barcode Record Was Found For <strong>${esc(clean)}</strong>. Switch To <strong>Nutrition Panel</strong> to read the package directly, or create a custom food.`;showActionToast("Barcode Lookup Did Not Find This Product.",null,5000);return null;}finally{clearTimeout(timer);}
}
by("lookup-barcode")?.addEventListener("click",()=>lookupBarcodeProduct(by("scan-barcode-input").value));by("scan-barcode-input")?.addEventListener("input",updateBarcodeLookupState);by("scan-barcode-input")?.addEventListener("keydown",event=>{if(event.key==="Enter"&&validBarcodeValue(event.currentTarget.value)){event.preventDefault();lookupBarcodeProduct(event.currentTarget.value);}});
async function decodeBarcodeFromPreview(){
  const img=by("scan-preview-image");if(!img)return;by("barcode-status").textContent="Reading Barcode From Photo…";
  try{let text="";
    if(window.BarcodeDetector){let supported=[];if(typeof BarcodeDetector.getSupportedFormats==="function"){try{supported=await BarcodeDetector.getSupportedFormats();}catch{supported=[];}}const wanted=["ean_13","ean_8","upc_a","upc_e","code_128"].filter(x=>!supported.length||supported.includes(x));const detector=new BarcodeDetector({formats:wanted.length?wanted:undefined});const codes=await detector.detect(img);text=codes[0]?.rawValue||"";}
    if(!text){const ok=await ensureBarcodeLibrary();if(ok){const reader=new ZXingBrowser.BrowserMultiFormatReader();const result=await reader.decodeFromImageElement(img);text=result?.getText?.()||result?.text||"";}}
    if(text){by("scan-barcode-input").value=text;await lookupBarcodeProduct(text);}else by("barcode-status").textContent="No Barcode Was Detected. Try A Closer, Sharper Photo Or Enter The Number.";
  }catch{by("barcode-status").textContent="No Barcode Was Detected. Try A Closer Photo Or Manual Entry.";}
}
function stopBarcodeCamera(message=""){
  if(scanBarcodeTimer){clearTimeout(scanBarcodeTimer);scanBarcodeTimer=null;}
  scanBarcodeControls?.stop?.();scanBarcodeControls=null;
  if(scanBarcodeStream){scanBarcodeStream.getTracks().forEach(track=>track.stop());scanBarcodeStream=null;}
  const video=by("barcode-video");if(video){try{video.pause();}catch{}video.srcObject=null;}
  barcodeDetectionLocked=false;by("barcode-camera-shell")?.classList.add("hidden");by("stop-barcode-camera")?.classList.add("hidden");
  if(message&&by("barcode-status"))by("barcode-status").textContent=message;
}
async function handleDetectedBarcode(raw){
  const text=validBarcodeValue(raw);if(!text||barcodeDetectionLocked)return false;barcodeDetectionLocked=true;
  by("scan-barcode-input").value=text;updateBarcodeLookupState();stopBarcodeCamera();barcodeDetectionLocked=true;by("barcode-status").textContent=`Barcode ${text} Detected. Looking Up Product…`;await lookupBarcodeProduct(text);return true;
}
async function startNativeBarcodeCamera(video){
  if(!window.BarcodeDetector||!navigator.mediaDevices?.getUserMedia)return false;
  let supported=[];try{if(typeof BarcodeDetector.getSupportedFormats==="function")supported=await BarcodeDetector.getSupportedFormats();}catch{}
  const wanted=["ean_13","ean_8","upc_a","upc_e","code_128"].filter(format=>!supported.length||supported.includes(format));
  let detector;try{detector=new BarcodeDetector(wanted.length?{formats:wanted}:undefined);}catch{return false;}
  scanBarcodeStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}});
  video.srcObject=scanBarcodeStream;video.setAttribute("playsinline","");await video.play();
  const scan=async()=>{if(!scanBarcodeStream||barcodeDetectionLocked)return;try{const codes=await detector.detect(video);if(codes?.length&&await handleDetectedBarcode(codes[0].rawValue))return;}catch{}scanBarcodeTimer=setTimeout(scan,180);};
  scanBarcodeTimer=setTimeout(scan,120);return true;
}
async function startBarcodeCamera(){
  const video=by("barcode-video"),shell=by("barcode-camera-shell");if(!video||!shell)return;
  stopBarcodeCamera();captureActionLocked=false;scanBarcodeFood=null;by('scan-review-card')?.classList.add('hidden');ext.ui.scanMode="barcode";saveExt();updateScanModeUI();shell.classList.remove("hidden");by("stop-barcode-camera")?.classList.remove("hidden");by("barcode-status").textContent="Opening Camera… Hold The Barcode Steady Inside The Box.";shell.scrollIntoView({behavior:"smooth",block:"center"});
  try{
    if(await startNativeBarcodeCamera(video)){by("barcode-status").textContent="Camera Ready. Hold A Retail Barcode Steady Inside The Box — No Photo Is Needed.";return;}
    const ok=await ensureBarcodeLibrary();if(!ok)throw new Error("Scanner unavailable");
    const reader=new ZXingBrowser.BrowserMultiFormatReader();scanBarcodeControls=await reader.decodeFromVideoDevice(undefined,video,(result)=>{const text=result?.getText?.()||result?.text;if(text)handleDetectedBarcode(text);});
    by("barcode-status").textContent="Camera Ready. Hold A Retail Barcode Steady Inside The Box — No Photo Is Needed.";
  }catch(error){stopBarcodeCamera();by("barcode-status").textContent="Live Barcode Scanning Could Not Start. Check Camera Permission, Then Try Again Or Enter The Barcode Manually.";}
}
window.HECStopBarcodeCamera=stopBarcodeCamera;
by("start-barcode-camera")?.addEventListener("click",startBarcodeCamera);
by("stop-barcode-camera")?.addEventListener("click",()=>stopBarcodeCamera("Barcode Camera Stopped."));
function parsePanelNumber(text,patterns){for(const pattern of patterns){const m=text.match(pattern);if(m)return n(String(m[1]).replace(",","."));}return 0;}
function ocrNumbersWithUnit(line,unit){
  const pattern=unit==="energy"?/(\d+(?:[.,]\d+)?)\s*(kcal|kj)\b/gi:new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`,"gi");const out=[];let m;while((m=pattern.exec(line))){out.push({value:n(String(m[1]).replace(",",".")),unit:(m[2]||unit).toLowerCase()});}return out;
}
function nutritionRow(lines,tests){return lines.find(line=>tests.some(test=>test.test(line)))||"";}
function rowValues(lines,tests,unit="g"){
  const line=nutritionRow(lines,tests);if(!line)return [];
  if(unit==="energy"){const raw=ocrNumbersWithUnit(line,"energy");const kcal=raw.filter(x=>x.unit==="kcal").map(x=>x.value);if(kcal.length)return kcal;return raw.filter(x=>x.unit==="kj").map(x=>x.value/4.184);}
  return ocrNumbersWithUnit(line,unit).map(x=>x.value);
}
function parseNutritionPanel(text){
  return X8?.parseNutritionPanel?X8.parseNutritionPanel(text):{servingAmount:null,servingUnit:'g',perServing:{},per100:{},detected:{},issues:['capture-foundation-unavailable'],questionable:true,text:String(text||'')};
}
const ALPHA0631_OCR_FIELDS={calories:"ocr-calories",protein:"ocr-protein",carbs:"ocr-carbs",fat:"ocr-fat",satFat:"ocr-sat-fat",fibre:"ocr-fibre",sugar:"ocr-sugar",sodium:"ocr-sodium"};
const ALPHA08_OCR100_FIELDS={calories:"ocr100-calories",protein:"ocr100-protein",carbs:"ocr100-carbs",fat:"ocr100-fat",satFat:"ocr100-sat-fat",fibre:"ocr100-fibre",sugar:"ocr100-sugar",sodium:"ocr100-sodium"};
function alpha08SetOcrValues(fields,values={}){Object.entries(fields).forEach(([key,id])=>{if(by(id))by(id).value=values[key]===null||values[key]===undefined?'':round1(values[key]);});}
function alpha08ReadOcrValues(fields){return Object.fromEntries(Object.entries(fields).map(([key,id])=>{const value=by(id)?.value;return [key,value===undefined||value===''?null:Number(value)];}));}
function alpha08OcrModel(){return P8?.basisModel?.({perServing:alpha08ReadOcrValues(ALPHA0631_OCR_FIELDS),per100:alpha08ReadOcrValues(ALPHA08_OCR100_FIELDS),servingAmount:by('ocr-serving-amount')?.value||null,servingUnit:by('ocr-serving-unit')?.value||'g',servingText:'Current manufacturer serving',manufacturerServing:!!by('ocr-serving-amount')?.value})||null;}
function alpha08UpdateOcrReview(){
  const model=alpha08OcrModel(),status=X8?.reviewStatus?.({name:by('ocr-food-name')?.value||'',model,confirmed:!!by('ocr-package-confirmed')?.checked,discrepancyConfirmed:!!by('ocr-discrepancy-confirmed')?.checked})||{ready:false,missing:['review']},packageReady=status.ready,comparisonPending=!!ext.ui.compareBarcodeFoodId,box=by('ocr-review-status'),discrepancyRow=by('ocr-discrepancy-confirm-row');
  if(comparisonPending){status.ready=false;if(!status.missing.includes('barcode-panel-choice'))status.missing.push('barcode-panel-choice');}
  discrepancyRow?.classList.toggle('hidden',!status.discrepancies?.length);if(box){const labels={name:'food name',energy:'Calories / energy',"serving-size":'manufacturer serving size',"package-confirmation":'package confirmation',"discrepancy-confirmation":'discrepancy confirmation',"barcode-panel-choice":'the barcode versus current-package choice'};box.innerHTML=status.ready?'<strong>Ready For Your Chosen Action</strong><p>The current package values are complete and confirmed. Nothing is saved or logged until you choose below.</p>':`<strong>Review Still Required</strong><p>Check ${esc(status.missing.map(x=>labels[x]||x).join(', '))} before saving or adding.</p>`;}
  const usePackage=by('ocr-review')?.querySelector('[data-use-package-values]');if(usePackage)usePackage.disabled=!packageReady;
  setCaptureActionState('ocr',{save:status.ready,add:status.ready,both:status.ready});return {model,status};
}
function alpha0631ScaleOcrReview(){
  if(!ocrParsedPanel)return;const status=by('ocr-scale-status');if(status)status.textContent='Printed per-serving and per-100 values stay separate. HEC does not create a missing column.';alpha08UpdateOcrReview();
}
function fillOcrReview(parsed){
  if(!parsed)return;ocrParsedPanel=parsed;ocrReviewedFood=null;captureActionLocked=false;if(by("ocr-serving-amount"))by("ocr-serving-amount").value=parsed.servingAmount||'';if(by("ocr-serving-unit"))by("ocr-serving-unit").value=parsed.servingUnit||"g";alpha08SetOcrValues(ALPHA0631_OCR_FIELDS,parsed.perServing);alpha08SetOcrValues(ALPHA08_OCR100_FIELDS,parsed.per100);const noColumns=!parsed.detected?.perServing&&!parsed.detected?.per100;by('ocr-serving-column')?.classList.toggle('hidden',!noColumns&&!parsed.detected?.perServing);by('ocr-100-column')?.classList.toggle('hidden',!noColumns&&!parsed.detected?.per100);if(by('ocr-package-confirmed'))by('ocr-package-confirmed').checked=false;if(by('ocr-discrepancy-confirmed'))by('ocr-discrepancy-confirmed').checked=false;by("ocr-review")?.classList.remove("hidden");alpha0631ScaleOcrReview();
}
const alpha08FillOcrReview=fillOcrReview;
['ocr-food-name','ocr-food-brand','ocr-serving-amount','ocr-serving-unit','ocr-package-confirmed','ocr-discrepancy-confirmed',...Object.values(ALPHA0631_OCR_FIELDS),...Object.values(ALPHA08_OCR100_FIELDS)].forEach(id=>by(id)?.addEventListener(id.includes('confirmed')||id==='ocr-serving-unit'?'change':'input',()=>{ocrReviewedFood=null;captureActionLocked=false;alpha08UpdateOcrReview();}));
async function prepareOcrImage(file){
  try{const bitmap=await createImageBitmap(file),max=3000,scale=Math.min(3,max/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale)),canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(bitmap,0,0,w,h);const image=ctx.getImageData(0,0,w,h),d=image.data,hist=new Array(256).fill(0);let sum=0,count=0;for(let i=0;i<d.length;i+=4){const g=Math.max(0,Math.min(255,Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2])));hist[g]++;sum+=g;count++;d[i]=d[i+1]=d[i+2]=g;}let total=count,sumB=0,wB=0,maxVar=0,threshold=140,sumAll=0;for(let i=0;i<256;i++)sumAll+=i*hist[i];for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=total-wB;if(!wF)break;sumB+=t*hist[t];const mB=sumB/wB,mF=(sumAll-sumB)/wF,between=wB*wF*(mB-mF)*(mB-mF);if(between>maxVar){maxVar=between;threshold=t;}}const darkBackground=(sum/Math.max(count,1))<150;for(let i=0;i<d.length;i+=4){const g=d[i];const bw=darkBackground?(g>threshold?0:255):(g<threshold?0:255);d[i]=d[i+1]=d[i+2]=bw;d[i+3]=255;}ctx.putImageData(image,0,0);bitmap.close?.();return canvas;}catch{return file;}
}
by("run-label-ocr")?.addEventListener("click",async()=>{
  if(!scanFile)return;const box=by("ocr-progress");box.classList.remove("hidden");box.textContent="Preparing The Photo For Nutrition Panel Reading…";
  try{const ok=await ensureOcrLibrary();if(!ok)throw new Error("OCR library unavailable");const image=await prepareOcrImage(scanFile);const worker=await Tesseract.createWorker("eng",1,{logger:m=>{if(m.progress)box.textContent=`${String(m.status||"Reading").replace(/\b\w/g,c=>c.toUpperCase())} · ${Math.round(m.progress*100)}%`;}});try{await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"1",user_defined_dpi:"300"});}catch{}const result=await worker.recognize(image);await worker.terminate();const text=result.data?.text||"";by("ocr-text").value=text;const parsed=parseNutritionPanel(text);fillOcrReview(parsed);const found=[...Object.values(parsed.perServing||{}),...Object.values(parsed.per100||{})].filter(v=>v!==null&&v!==undefined).length;box.textContent=found?`Recognition Complete · ${found} Printed Nutrition Values Detected. Check Every Value Against The Package.`:"Text Was Read, But The Nutrition Columns Need Manual Review. Enter The Values From The Package Below.";
  }catch(error){box.textContent="OCR Could Not Reliably Read This Image. Try A Closer, Square-On Photo In Brighter Light, Or Enter The Values Manually.";fillOcrReview(parseNutritionPanel(''));}
});
function alpha08PanelFood(){const review=alpha08UpdateOcrReview();if(!review.status.ready)return null;const result=X8?.buildPanelFood?.({id:ocrReviewedFood?.id||uid('panel'),name:by('ocr-food-name')?.value||'',brand:by('ocr-food-brand')?.value||'',barcode:validBarcodeValue(by('scan-barcode-input')?.value),model:review.model,confirmed:!!by('ocr-package-confirmed')?.checked,discrepancyConfirmed:!!by('ocr-discrepancy-confirmed')?.checked});ocrReviewedFood=result?.food||null;return ocrReviewedFood;}
document.addEventListener('click',event=>{const button=event.target.closest('[data-capture-action][data-capture-source]');if(!button||button.disabled||captureActionLocked)return;const source=button.dataset.captureSource,action=button.dataset.captureAction,food=source==='barcode'?scanBarcodeFood:alpha08PanelFood();if(!food){showActionToast('Complete And Confirm The Review Before Choosing That Action.',null,6000);return;}const allowed=X8?.actionsFor?.(food)||{save:true,add:hasEnergyValue(food.nutrients?.calories),both:hasEnergyValue(food.nutrients?.calories)};if(!allowed[action]){showActionToast('This Food Is Not Complete Enough For That Action.',null,6000);return;}captureActionLocked=true;setCaptureActionState(source,{});if(action==='save'){keepCapturedFoodAvailable(food,{save:true});ext.ui.libraryTab='saved';ext.ui.foodSearch='';saveExt();openFeature('food-library');showActionToast(`${food.name} saved to My Foods. Nothing was added to the Diary.`,null,5000);return;}openCapturedFoodForDiary(food,{save:action==='both'});},true);
by("photo-find-food")?.addEventListener("click",()=>{ext.ui.libraryTab="all";ext.ui.pendingMeal=ext.ui.pendingMeal||"";saveExt();openFeature("food-library");showActionToast("Search And Add Each Food Visible In The Photo.",null,2000);});
by("photo-add-note")?.addEventListener("click",()=>showActionToast("Meal Photos Stay In This Browser Session Only In This Founder Trial.",null,5000));

// Meal planner
const PLANNER_WEIGHTS={Breakfast:.24,Lunch:.28,Dinner:.34,Snacks:.09,Other:.05};
function selectedPlannerMeals(){return qa('input[name="planner-meal"]:checked').map(input=>input.value);}
function resetPlannerSelections(){qa('input[name="planner-meal"]').forEach(x=>x.checked=false);if(by("planner-select-all")){by("planner-select-all").checked=false;by("planner-select-all").indeterminate=false;}ext.ui.plannerResults={};ext.ui.plannerRejected={};ext.ui.plannerAccepted={};ext.ui.plannerSessionActive=false;}
function updatePlannerSelectAll(){const boxes=qa('input[name="planner-meal"]'),regular=boxes.filter(x=>x.value!=="Other"),selected=regular.filter(x=>x.checked).length,all=by("planner-select-all");if(all){all.checked=regular.length>0&&selected===regular.length;all.indeterminate=selected>0&&selected<regular.length;}ext.ui.plannerSessionActive=boxes.some(x=>x.checked);saveExt();renderPlannerEnergySummary();}
function clearPlannerResults(){ext.ui.plannerResults={};ext.ui.plannerRejected={};ext.ui.plannerAccepted={};saveExt();renderMealSuggestions();renderPlannerEnergySummary();}
function initialisePlanner(){const date=ext.ui.plannerDate||ext.ui.diaryDate||isoToday();ext.ui.plannerDate=date;updateDateControl("planner",date);updatePlannerSelectAll();renderMealSuggestions();renderPlannerEnergySummary();}
function suggestionNutrition(suggestion){return sumNutrients(suggestion.items.map(i=>({nutrients:scaledNutrients(getFood(i.foodId),i.amount,i.unit)})));}
function suggestionGroups(suggestion){return sumGroupValues(suggestion.items.map(i=>({foodGroups:scaledFoodGroups(getFood(i.foodId),i.amount,i.unit)})));}
function suggestionSafety(suggestion){return suggestion.items.map(i=>foodSafety(getFood(i.foodId))).filter(x=>x.blocked).map(x=>x.message);}
function plannerProjectedState(date,excludeMeal=""){
  let nutrients=dayNutrition(date),groups=dayFoodGroups(date);
  Object.entries(ext.ui.plannerResults||{}).forEach(([meal,id])=>{
    if(meal===excludeMeal||ext.ui.plannerAccepted?.[meal]===id)return;
    const suggestion=MEAL_SUGGESTIONS.find(x=>x.id===id);if(!suggestion)return;
    nutrients=sumNutrients([{nutrients},{nutrients:suggestionNutrition(suggestion)}]);
    groups=sumGroupValues([{foodGroups:groups},{foodGroups:suggestionGroups(suggestion)}]);
  });
  return {nutrients,groups};
}
function plannerBudget(){
  const date=ext.ui.plannerDate||isoToday(),selected=selectedPlannerMeals(),goals=currentGoals(date),goal=goals.calories,entries=recordedEntriesForDate(date),fixed=entries.reduce((sum,e)=>sum+n(e.nutrients?.calories),0),type=goals.dayType||"normal";
  const existingByMeal=Object.fromEntries(plannerMealNames().map(m=>[m,entries.filter(e=>e.meal===m).reduce((sum,e)=>sum+n(e.nutrients?.calories),0)]));
  const remaining=Math.max(0,goal-fixed),guides={},unticked=plannerMealNames().filter(m=>!selected.includes(m));
  let reserve=0;
  if(type!=="fasting")reserve=unticked.reduce((sum,m)=>sum+(existingByMeal[m]>0?0:goal*(PLANNER_WEIGHTS[m]||0)),0);
  reserve=Math.min(reserve,remaining*.65);
  const available=Math.max(0,remaining-reserve);
  let desired=[];
  if(type==="fasting"){
    const selectedWeight=selected.reduce((sum,m)=>sum+(PLANNER_WEIGHTS[m]||.1),0)||1;
    desired=selected.map(m=>[m,Math.max(0,remaining*(PLANNER_WEIGHTS[m]||.1)/selectedWeight)]);
  }else desired=selected.map(m=>[m,Math.max(0,goal*(PLANNER_WEIGHTS[m]||.15)-existingByMeal[m])]);
  const prefs=ext.ui.singleMealPreferences||{};
  if(selected.length===1&&prefs.meal===selected[0]&&desired.length){
    let factor=1;
    if(prefs.appetite==="small")factor*=.72;else if(prefs.appetite==="hungry")factor*=1.12;
    if(prefs.style==="light")factor*=.78;
    if(type==="fasting"){
      const shares={small:.25,moderate:.5,most:.78};
      const decide={Breakfast:.42,Lunch:.50,Dinner:.62,Snacks:.24,Other:.30}[selected[0]]||.45;
      factor=Math.min(factor,prefs.fastingShare&&prefs.fastingShare!=="decide"?(shares[prefs.fastingShare]||decide):decide);
      desired[0][1]=Math.min(desired[0][1],remaining*factor);
    }else desired[0][1]*=factor;
  }
  const need=desired.reduce((sum,x)=>sum+x[1],0),scale=need>available&&need?available/need:1;desired.forEach(([m,v])=>guides[m]=Math.max(0,Math.round(v*scale/10)*10));
  return {date,goal,fixed,remaining,reserve,available,guides,unallocated:Math.max(0,remaining-reserve-Object.values(guides).reduce((a,b)=>a+b,0)),type,existingByMeal,goals};
}
function renderPlannerEnergySummary(){const box=by("planner-energy-summary");if(!box)return;const b=plannerBudget(),meals=selectedPlannerMeals(),mode=by("planner-day-mode-note");if(mode)mode.textContent=b.type==="fasting"?"Fasting Day: unticked meal categories are treated as meals you intend to skip. The remaining fasting allowance is divided only across the meals you select.":"Normal Day: the planner keeps a sensible reserve for unticked meals, unless you have already added food there.";box.innerHTML=meals.length?`<span class="eyebrow">Energy Available for Companion Planning</span><strong>${formatNumber(b.available)} Cal</strong><small>Daily goal ${formatNumber(b.goal)} Cal · ${formatNumber(b.fixed)} Cal already recorded${b.reserve?` · ${formatNumber(b.reserve)} Cal kept in reserve for unticked meals`:""}</small><div class="planner-guide-list">${meals.map(m=>`<span>${esc(m)} <b>about ${formatNumber(b.guides[m])} Cal more</b>${b.existingByMeal[m]?` <small>(${formatNumber(b.existingByMeal[m])} Cal already in this meal)</small>`:""}</span>`).join("")}</div>`:`<span class="eyebrow">Start a New Plan</span><strong>Select one or more meals</strong><small>The companion will account for everything already recorded before making suggestions.</small>`;}
function plannerCandidateScore(suggestion,meal,target){
  const b=plannerBudget(),state=plannerProjectedState(b.date,meal),total=suggestionNutrition(suggestion),groups=suggestionGroups(suggestion);let score=Math.abs(total.calories-target)/Math.max(90,target||90);
  FOOD_GROUP_KEYS.forEach(k=>{const gap=n(b.goals.foodGroups[k])-n(state.groups[k]),add=n(groups[k]);if(gap>0)score-=Math.min(add,gap)*.22;else if(add>0)score+=add*.18;});
  const nutrientGoals={protein:b.goals.protein,carbs:b.goals.carbs,fat:b.goals.fat,fibre:b.goals.fibre};Object.entries(nutrientGoals).forEach(([k,g])=>{const gap=n(g)-n(state.nutrients[k]),add=n(total[k]);if(gap>0&&add>0)score-=Math.min(1,add/gap)*.18;else if(gap<=0&&add>0)score+=.08;});
  const free=n(total.freeSugar);if(free>0)score+=Math.max(0,(n(state.nutrients.freeSugar)+free)-b.goals.freeSugar)/Math.max(10,b.goals.freeSugar);
  const prefs=ext.ui.singleMealPreferences||{};
  if(prefs.meal===meal){
    const label=normalise(`${suggestion.name} ${suggestion.reason}`);
    if(prefs.style==="protein")score-=Math.min(.35,n(total.protein)/40*.25);
    if(prefs.style==="quick"&&/oats|yoghurt|yogurt|toast|sandwich|apple|berries|milk/.test(label))score-=.12;
    if(prefs.style==="cooked"&&/egg|chicken|beef|steak|sausage|potato|toast/.test(label))score-=.12;
    if(prefs.style==="different")score-=.03*Math.min(3,suggestion.items.length);
    const recentIds=new Set(recentGroups(14).flatMap(g=>g.items.map(e=>e.foodId)));
    const familiarCount=suggestion.items.filter(i=>recentIds.has(i.foodId)||ext.savedFoodIds.includes(i.foodId)).length;
    if(prefs.familiar==="familiar")score-=familiarCount*.07;
    if(prefs.familiar==="new")score+=familiarCount*.07;
  }
  return score-(suggestion.score||0)*.025;
}
function plannerHardCapForMeal(meal){
  const budget=plannerBudget();if(budget.type!=="fasting")return Infinity;let usedByOtherSuggestions=0;
  Object.entries(ext.ui.plannerResults||{}).forEach(([other,id])=>{if(other===meal||id==="__none__"||ext.ui.plannerAccepted?.[other]===id)return;const suggestion=MEAL_SUGGESTIONS.find(x=>x.id===id);if(suggestion)usedByOtherSuggestions+=n(suggestionNutrition(suggestion).calories);});
  return Math.max(0,budget.available-usedByOtherSuggestions);
}
function plannerChoice(meal,retry=false){
  const min=n(by("planner-min-score")?.value),budget=plannerBudget(),target=budget.guides[meal]??0,current=ext.ui.plannerResults?.[meal],rejected=ext.ui.plannerRejected?.[meal]||[],hardCap=plannerHardCapForMeal(meal);let candidates=MEAL_SUGGESTIONS.filter(s=>(s.meal===meal||(meal==="Other"&&s.meal==="Snacks"))&&s.score>=min&&!suggestionSafety(s).length);
  if(budget.type==="fasting"){
    candidates=candidates.filter(s=>suggestionNutrition(s).calories<=hardCap+.01);
    if(target>0){const softCap=Math.max(80,target*1.35),softFit=candidates.filter(s=>suggestionNutrition(s).calories<=softCap);if(softFit.length)candidates=softFit;}
  }
  const smallest=candidates.length?Math.min(...candidates.map(s=>suggestionNutrition(s).calories)):Infinity;if(!candidates.length||target<=0||(target<80&&smallest>target*1.5)){ext.ui.plannerResults[meal]="__none__";ext.ui.plannerAccepted[meal]="__none__";ext.ui.plannerRejected[meal]=[];return null;}candidates.sort((a,b)=>plannerCandidateScore(a,meal,target)-plannerCandidateScore(b,meal,target));if(retry&&current&&!rejected.includes(current))rejected.push(current);let choice=candidates.find(s=>s.id!==current&&!rejected.includes(s.id));if(!choice){rejected.length=0;if(current)rejected.push(current);choice=candidates.find(s=>s.id!==current)||candidates[0];}if(choice)ext.ui.plannerResults[meal]=choice.id;ext.ui.plannerRejected[meal]=rejected;delete ext.ui.plannerAccepted?.[meal];return choice;
}
function renderMealSuggestions(){
  const results=ext.ui.plannerResults||{},accepted=ext.ui.plannerAccepted||{},meals=Object.keys(results),target=by("meal-suggestions");if(!target)return;const allAccepted=meals.length&&meals.every(m=>results[m]==="__none__"||accepted[m]===results[m]);
  target.innerHTML=meals.length?`<div class="planner-results">${meals.map(meal=>{if(results[meal]==="__none__")return `<article class="planner-result-card planner-no-additional"><header><div><span class="eyebrow">${esc(meal)}</span><h3>No Additional Food Suggested</h3><p>The current plan leaves too little energy for another sensible suggestion in this meal.</p></div></header><p>If you still intend to eat at this meal, change another Diary item, increase the day target only if appropriate, or choose a very small food manually.</p></article>`;const s=MEAL_SUGGESTIONS.find(x=>x.id===results[meal]);if(!s)return "";const total=suggestionNutrition(s),groups=suggestionGroups(s),isAccepted=accepted[meal]===s.id,existing=plannerBudget().existingByMeal[meal]||0;return `<article class="planner-result-card ${isAccepted?"planner-accepted":""}"><header><div><span class="eyebrow">${esc(meal)}</span><h3>${esc(s.name)}</h3><p>${formatNumber(total.calories)} Cal · Protein ${formatNumber(total.protein)} g · Carbohydrate ${formatNumber(total.carbs)} g · Fat ${formatNumber(total.fat)} g · Fibre ${formatNumber(total.fibre)} g · Guide ${formatNumber(plannerBudget().guides[meal])} Cal more</p>${existing?`<p class="fine">This meal already contains ${formatNumber(existing)} Cal you recorded yourself. The suggestion is being considered around those entries.</p>`:""}</div><span class="health-score">${s.score}/10</span></header><p>${esc(s.reason)}</p><ul class="compact-list">${s.items.map(i=>{const f=getFood(i.foodId);return `<li>${esc(f.name)} — ${formatNumber(i.amount,true)} ${esc(unitLabel(f,i.unit))}</li>`}).join("")}</ul><div class="planner-group-line">${FOOD_GROUP_KEYS.filter(k=>groups[k]>0).map(k=>`<span>${esc(FOOD_GROUP_LABELS[k])}: ${formatNumber(groups[k],true)}</span>`).join("")}</div>${isAccepted?`<div class="accepted-plan-confirmation"><strong>Added To Diary ✓</strong><span>${esc(meal)} is now included in Diary and Daily Progress totals.</span><div class="quick-action-row"><button data-open-feature="food-diary" class="secondary">View in Diary</button><button data-plan-undo="${esc(meal)}" class="secondary">Undo</button></div></div>`:`<div class="planner-card-actions"><button class="primary" data-plan-accept="${esc(meal)}">Accept Meal</button><button class="secondary" data-plan-retry="${esc(meal)}">Try Again</button></div>`}</article>`}).join("")}</div>${allAccepted?`<div class="card planner-complete-message"><strong>The companion has finished reviewing the selected meals.</strong><div class="quick-action-row"><button data-open-feature="food-diary" class="secondary">View Day Plan</button><button id="planner-plan-more" class="primary">Plan More Meals</button></div></div>`:""}`:`<div class="card empty-state">Select one or more meals to begin a new planning session.</div>`;
  by("generate-meal-suggestions")?.classList.toggle("hidden",allAccepted);by("try-all-meal-suggestions")?.classList.toggle("hidden",!meals.length||allAccepted);
}
function generatePlannerResults(retryAll=false){const meals=selectedPlannerMeals();if(!meals.length){showActionToast("Choose at least one meal to plan.",null,5000);return;}ext.ui.plannerResults||={};ext.ui.plannerRejected||={};ext.ui.plannerAccepted||={};meals.forEach(meal=>plannerChoice(meal,retryAll));Object.keys(ext.ui.plannerResults).forEach(meal=>{if(!meals.includes(meal))delete ext.ui.plannerResults[meal];});saveExt();renderPlannerEnergySummary();renderMealSuggestions();}
function addPlannedSuggestion(meal,mode="add"){
  const suggestion=MEAL_SUGGESTIONS.find(s=>s.id===ext.ui.plannerResults?.[meal]);if(!suggestion)return;const date=ext.ui.plannerDate||by("planner-date")?.value||isoToday();ext.diary[date]||=[];const uniqueRef=`${date}|${meal}|${suggestion.id}`;if(ext.diary[date].some(e=>e.plannerRef===uniqueRef)){ext.ui.plannerAccepted[meal]=suggestion.id;saveExt();renderMealSuggestions();showActionToast(`${suggestion.name} is already in the Diary.`,null,6000);return;}if(mode==="replace")ext.diary[date]=ext.diary[date].filter(e=>e.meal!==meal);suggestion.items.forEach(i=>{const f=getFood(i.foodId),values=scaledNutrients(f,i.amount,i.unit),label=unitLabel(f,i.unit);ext.diary[date].push({id:uid("entry"),foodId:f.id,name:f.name,brand:f.brand,date,meal,status:date>isoToday()?"planned":"eaten",amount:i.amount,unit:i.unit,unitLabel:label,time:"",notes:`Meal Planner · ${suggestion.name}`,nutrients:values,foodSnapshot:P8?.diarySnapshot?.(f,{amount:i.amount,unit:i.unit,unitLabel:label,nutrients:values})||null,foodGroups:scaledFoodGroups(f,i.amount,i.unit),waterMl:scaledWaterMl(f,i.amount,i.unit),hydrationType:f.hydrationType||"food",score:f.score,source:`Meal Planner · ${f.source}`,plannerRef:uniqueRef,localDate:date,timeZone:activeTimeZone(),createdAt:new Date().toISOString()});});ext.ui.diaryDate=date;ext.ui.progressDate=date;ext.ui.plannerAccepted[meal]=suggestion.id;saveExt();renderMealSuggestions();renderPlannerEnergySummary();if(q("#food-diary.active"))renderDiary();showActionToast(`${suggestion.name} added to ${meal}.`,()=>{ext.diary[date]=ext.diary[date].filter(e=>e.plannerRef!==uniqueRef);delete ext.ui.plannerAccepted[meal];saveExt();renderMealSuggestions();renderPlannerEnergySummary();if(q("#food-diary.active"))renderDiary();},2000);
}
function acceptPlannedSuggestion(meal){const date=ext.ui.plannerDate||by("planner-date")?.value||isoToday(),existing=entriesForDate(date).filter(e=>e.meal===meal&&e.status!=="skipped");if(!existing.length){addPlannedSuggestion(meal);return;}openModal(`${meal} already has entries`,`The companion has calculated around what you already recorded. Choose whether to add the suggestion alongside those entries or replace the existing meal entries.`,`Add Alongside Existing`,()=>addPlannedSuggestion(meal,"add"),`<button id="replace-planned-meal" class="secondary wide" type="button">Replace Existing Meal</button>`);by("replace-planned-meal")?.addEventListener("click",()=>{closeModal();addPlannedSuggestion(meal,"replace");},{once:true});}
by("planner-select-all")?.addEventListener("change",event=>{qa('input[name="planner-meal"]').forEach(x=>x.checked=x.value==="Other"?false:event.target.checked);updatePlannerSelectAll();});qa('input[name="planner-meal"]').forEach(input=>input.addEventListener("change",()=>{clearPlannerResults();updatePlannerSelectAll();}));by("planner-min-score")?.addEventListener("change",()=>{clearPlannerResults();renderPlannerEnergySummary();});by("cancel-meal-planning")?.addEventListener("click",()=>{resetPlannerSelections();saveExt();openFeature("food-diary");showActionToast("Meal planning cancelled. No unaccepted suggestions were added.",null,3000);});by("generate-meal-suggestions")?.addEventListener("click",()=>generatePlannerResults(false));by("try-all-meal-suggestions")?.addEventListener("click",()=>generatePlannerResults(true));document.addEventListener("click",event=>{const retry=event.target.closest("[data-plan-retry]");if(retry){plannerChoice(retry.dataset.planRetry,true);saveExt();renderMealSuggestions();return;}const skip=event.target.closest("[data-plan-skip]");if(skip){const meal=skip.dataset.planSkip;delete ext.ui.plannerResults[meal];delete ext.ui.plannerRejected[meal];qa(`input[name="planner-meal"][value="${CSS.escape(meal)}"]`).forEach(x=>x.checked=false);saveExt();renderMealSuggestions();updatePlannerSelectAll();showActionToast(`${meal} left unplanned.`,null,2500);return;}const accept=event.target.closest("[data-plan-accept]");if(accept){acceptPlannedSuggestion(accept.dataset.planAccept);return;}const more=event.target.closest("#planner-plan-more");if(more){resetPlannerSelections();saveExt();renderMealSuggestions();renderPlannerEnergySummary();window.scrollTo({top:0,behavior:"smooth"});return;}const undo=event.target.closest("[data-plan-undo]");if(undo){const meal=undo.dataset.planUndo,date=ext.ui.plannerDate||isoToday(),id=ext.ui.plannerAccepted?.[meal];ext.diary[date]=(ext.diary[date]||[]).filter(e=>!(e.meal===meal&&e.plannerRef?.endsWith(`|${id}`)));delete ext.ui.plannerAccepted[meal];saveExt();renderMealSuggestions();renderPlannerEnergySummary();showActionToast(`${meal} suggestion removed from the Diary.`,null,5000);}});

// Daily progress
function weeklyFoodGroupSummary(endDate){const days=[];for(let i=0;i<7;i++)days.push(dayFoodGroupSummary(shiftISO(endDate,-i)));return FOOD_GROUPS?.average?.(days,7)||{state:'classified',values:Object.fromEntries(FOOD_GROUP_KEYS.map(key=>[key,days.reduce((sum,day)=>sum+n(day.values?.[key]),0)/7])),incomplete:false};}
function weeklyFoodGroupAverages(endDate){return weeklyFoodGroupSummary(endDate).values;}
function dailyBalanceAssessment(date,summary){
  const entries=entriesForDate(date).filter(e=>e.status!=="skipped");
  const nutrients=summary.nutrients||{},goals=summary.goals||{},fg=summary.foodGroups||{};
  const hasMetric=key=>entries.length>0&&entries.every(entry=>entry.nutrients?.[key]!==null&&entry.nutrients?.[key]!==undefined&&Number.isFinite(Number(entry.nutrients[key])));
  const indicators=[];
  if(hasMetric('protein'))indicators.push({label:'Protein',value:n(nutrients.protein),target:n(goals.protein),unit:'g',kind:'minimum'});
  if(hasMetric('fibre'))indicators.push({label:'Fibre',value:n(nutrients.fibre),target:n(goals.fibre),unit:'g',kind:'minimum'});
  if(hasMetric('sodium'))indicators.push({label:'Sodium',value:n(nutrients.sodium),target:n(goals.sodium),unit:'mg',kind:'limit'});
  if(summary.foodGroupSummary?.state==='classified')FOOD_GROUP_KEYS.forEach(key=>indicators.push({label:FOOD_GROUP_LABELS[key],value:n(fg[key]),target:n(goals.foodGroups?.[key]),unit:'serves',kind:'minimum'}));
  const mealCount=new Set(entries.map(entry=>entry.meal).filter(Boolean)).size;
  const enoughRecorded=entries.length>=2&&mealCount>=2;
  const onTrack=enoughRecorded&&indicators.filter(item=>item.kind==='minimum'&&item.target>0).some(item=>item.value>=item.target*.5)&&indicators.filter(item=>item.kind==='limit'&&item.target>0).every(item=>item.value<=item.target);
  return {state:!entries.length?'empty':enoughRecorded?(onTrack?'on-track':'building'):'needs-more',label:!entries.length||!enoughRecorded?'Needs More Recorded Food':onTrack?'On Track':'Building Balance',entries,indicators};
}
function renderDailyBalance(date,summary){
  const card=by('daily-balance-card'),labelEl=by('daily-balance-label');if(!card||!labelEl)return;
  const a=dailyBalanceAssessment(date,summary);
  card.dataset.balanceDate=date;card.dataset.balanceState=a.state;labelEl.textContent=a.label;
}
by('daily-balance-card')?.addEventListener('click',()=>{
  const date=ext.ui.progressDate||isoToday(),a=dailyBalanceAssessment(date,daySummary(date));
  const rows=a.indicators.map(item=>`<li><strong>${esc(item.label)}:</strong> ${formatNumber(item.value,true)} ${esc(item.unit)}${item.target?` / ${formatNumber(item.target,true)} ${esc(item.unit)} ${item.kind==='limit'?'limit':'guide'}`:''}</li>`).join('');
  openModal('Nutrients To Watch',a.label,'Close',()=>{},`<div class="daily-balance-detail"><p>These are objective values from the food currently recorded. They are not a score or judgement.</p>${rows?`<ul>${rows}</ul>`:'<p>No food nutrition is available for this day yet.</p>'}<div class="quick-action-row"><button type="button" class="secondary" id="daily-balance-open-diary">Open Diary</button></div></div>`);
  by('a05-modal-confirm')?.classList.add('hidden');by('daily-balance-open-diary')?.addEventListener('click',()=>{closeModal();ext.ui.diaryDate=date;saveExt();openFeature('food-diary');},{once:true});
});

function renderDailyProgress(){
  const date=ext.ui.progressDate||by("progress-date")?.value||isoToday();ext.ui.progressDate=date;updateDateControl("progress",date);
  const summary=daySummary(date),{nutrients,hydration,steps,goals,foodGroups}=summary;goals.hydration=n(ext.fluidTargets[date])||goals.hydration;
  if(by("today-water"))by("today-water").value=ext.water[date]||0;if(by("today-fluid-target"))by("today-fluid-target").value=goals.hydration;if(by("today-steps"))by("today-steps").value=steps||"";if(by("today-fluid-summary"))by("today-fluid-summary").innerHTML=`<strong>${formatNumber(hydration.drinks)} / ${formatNumber(goals.hydration)} mL Fluids</strong><span>Manual drinks ${formatNumber(n(ext.water[date]))} mL · Diary drinks ${formatNumber(Math.max(0,hydration.drinks-n(ext.water[date])))} mL.</span>`;updateQuickDrinkButtonState();
  if(by('daily-fluid-card-summary'))by('daily-fluid-card-summary').innerHTML=`<strong>${formatNumber(hydration.drinks)} / ${formatNumber(goals.hydration)} mL recorded fluids</strong><small>${hydration.drinks?`${formatNumber(n(ext.water[date]))} mL quick-added · ${formatNumber(Math.max(0,hydration.drinks-n(ext.water[date])))} mL from Diary drinks`:'No fluids recorded in HEC'}</small>`;
  const dayActivities=(ext.exercise||[]).filter(record=>ACTIVITY.localDateOf(record)===date),activityMinutes=dayActivities.reduce((sum,record)=>sum+n(record.durationMinutes??record.minutes),0),activityRaw=dayActivities.reduce((sum,record)=>sum+activityRawEnergy(record),0),activityCredit=dayActivities.reduce((sum,record)=>sum+activityAllowanceCredit(record),0);
  if(by('daily-activity-card-summary'))by('daily-activity-card-summary').innerHTML=`<strong>${dayActivities.length?`${dayActivities.length} ${dayActivities.length===1?'activity':'activities'} · ${formatNumber(activityMinutes)} min`:'No activity recorded'}</strong><small>${dayActivities.length?`${formatNumber(activityRaw)} Cal raw · ${formatNumber(activityCredit)} Cal allowance credit`:''}${dayActivities.length&&steps?' · ':''}${steps?`${formatNumber(steps)} steps recorded in HEC`:(dayActivities.length?' · No steps recorded in HEC':'Tap for activity actions · No steps recorded in HEC')}</small>`;
  const recordedCount=entriesForDate(date).filter(e=>e.status!=="skipped").length,remaining=goals.calories-n(nutrients.calories),parts=[`${formatNumber(goals.calories)} Cal Goal`,`${formatNumber(nutrients.calories)} Cal Recorded`,remaining>=0?`${formatNumber(remaining)} Cal Remaining`:`${formatNumber(Math.abs(remaining))} Cal Above Target`];
  if(!recordedCount)parts.unshift("No Food Recorded Yet.");by("daily-progress-explanation").innerHTML=`<h3>${date===isoToday()?"Today’s":"Day"} Summary</h3><p>${parts.join(" · ")}</p>`;
  if(by("daily-meals-heading"))by("daily-meals-heading").textContent=date===isoToday()?"Today’s Meals":`${relativeDateLabel(date).split(" · ")[0]} Meals`;
  const allEntries=entriesForDate(date).filter(e=>e.status!=="skipped"),meals=plannerMealNames();
  by("daily-meal-status").innerHTML=meals.map(meal=>{const items=allEntries.filter(e=>e.meal===meal),totals=sumNutrients(items),reliable=key=>items.length&&items.every(item=>item.nutrients?.[key]!==null&&item.nutrients?.[key]!==undefined&&Number.isFinite(Number(item.nutrients[key]))),groups=sumGroupValues(items.map(entry=>entryFoodProfile(entry))),groupText=FOOD_GROUP_KEYS.filter(key=>n(groups[key])>0).map(key=>`${FOOD_GROUP_LABELS[key]} ${formatNumber(groups[key],true)}`).join(' · '),summaryBits=[`${items.length} ${items.length===1?'food':'foods'}`,reliable('protein')?`Protein ${formatNumber(totals.protein,true)} g`:'',reliable('fibre')?`Fibre ${formatNumber(totals.fibre,true)} g`:'',groupText].filter(Boolean);return `<div class="meal-progress-shell"><details class="meal-progress-card ${items.length?"complete":"empty"}"><summary><span class="meal-progress-title"><strong>${esc(meal)} · ${formatNumber(totals.calories)} Cal</strong><small>${items.length?esc(summaryBits.join(' · ')):"No Foods Yet"}</small></span><span class="meal-progress-state">${items.length?"Recorded":"Open Meal"}</span></summary><div class="meal-progress-body">${items.length?items.map(e=>`<div class="meal-progress-item recorded"><span><strong>${esc(e.name)}</strong><small>${esc(entryNaturalQuantity(e))} · ${energyText(e.nutrients?.calories)}</small></span><div class="meal-progress-item-actions"><button data-progress-edit="${esc(e.id)}">Edit</button><button data-entry-delete="${esc(e.id)}" class="delete-action">Delete</button></div></div>`).join(""):'<p class="empty-state">No Foods Yet.</p>'}<div class="meal-progress-actions"><button class="secondary" data-progress-open-meal="${esc(meal)}">Open ${esc(meal)}</button></div></div></details></div>`;}).join("");
  const cards=[["Energy","calories",goals.calories,"Cal","energy"],["Protein","protein",goals.protein,"g","positive"],["Carbohydrate","carbs",goals.carbs,"g","positive"],["Fat","fat",goals.fat,"g","positive"],["Fibre","fibre",goals.fibre,"g","minimum"],["Sodium","sodium",goals.sodium,"mg","limit"]];
  const totalSugar=`<div class="progress-card sugar-info-card"><div><strong>Total Sugars</strong><span>${formatNumber(n(nutrients.sugar))} g</span></div><small>Information only — total sugars include naturally occurring sugars in fruit and milk.</small></div>`,hasFree=entriesForDate(date).some(e=>e.status!=="skipped"&&e.nutrients?.freeSugar!==null&&e.nutrients?.freeSugar!==undefined),freeSugar=hasFree?progressCard("Free Sugars",n(nutrients.freeSugar),goals.freeSugar,"g","limit",date):`<div class="progress-card sugar-info-card"><div><strong>Free Sugars</strong><span>Not Available</span></div><small>This food data does not provide enough information to calculate free sugars reliably.</small></div>`;
  by("daily-progress-grid").innerHTML=cards.map(([label,key,target,unit,type])=>progressCard(label,n(nutrients[key]),target,unit,type,date)).join("")+totalSugar+freeSugar;
  renderDailyBalance(date,summary);
  const groupSummary=summary.foodGroupSummary||dayFoodGroupSummary(date),groupState=groupSummary.state||'classified';if(by('food-group-attribution-status'))by('food-group-attribution-status').textContent=groupState==='classified'?'Food-group serves are classified for all foods recorded on this day.':groupState==='unavailable'?'Food-group breakdown not fully available. Recorded foods are not yet classified.':'Known classified serves are shown below. Some recorded foods are not yet classified.';by("daily-food-group-progress").innerHTML=FOOD_GROUP_KEYS.map(key=>foodGroupCard(key,n(foodGroups[key]),goals.foodGroups[key],date,groupState)).join("");const weekly=weeklyFoodGroupSummary(date),weeklyIncomplete=weekly.state!=='classified';by("weekly-food-group-progress").innerHTML=`<h4>Seven-Day Diary Average</h4><div>${FOOD_GROUP_KEYS.map(key=>`<span><small>${esc(FOOD_GROUP_LABELS[key])}</small><strong>${formatNumber(weekly.values[key],true)}${weeklyIncomplete?' classified':` / ${formatNumber(goals.foodGroups[key],true)}`}</strong></span>`).join("")}</div><p>${weeklyIncomplete?'Some foods in this seven-day period are not yet classified, so these are incomplete classified averages.':'Averages use the foods currently recorded in each day’s Diary.'}</p>`;saveExt();
}
function updateQuickDrinkButtonState(){const type=by("quick-drink-type")?.value||"",amount=n(by("quick-drink-amount")?.value);if(by("add-quick-drink"))by("add-quick-drink").disabled=!type||amount<10;}
by("quick-drink-type")?.addEventListener("change",updateQuickDrinkButtonState);by("quick-drink-amount")?.addEventListener("input",updateQuickDrinkButtonState);
let progressSaveTimer=null;
function autoSaveProgressFields(){clearTimeout(progressSaveTimer);progressSaveTimer=setTimeout(()=>{const date=ext.ui.progressDate||isoToday();ext.fluidTargets[date]=Math.max(250,n(by("today-fluid-target")?.value)||currentGoals(date).hydration);ext.steps[date]=Math.max(0,whole(by("today-steps")?.value));saveExt();renderDailyProgress();showActionToast("Fluid Target and Steps Updated.",null,2000);},350);}
by("today-fluid-target")?.addEventListener("change",autoSaveProgressFields);by("today-steps")?.addEventListener("change",autoSaveProgressFields);
by("add-quick-drink")?.addEventListener("click",()=>{
  const date=ext.ui.progressDate||isoToday(),type=by("quick-drink-type")?.value||"",amount=Math.max(0,n(by("quick-drink-amount")?.value));if(!type){showActionToast("Choose A Drink Type First.",null,4000);return;}if(amount<10){showActionToast("Enter A Drink Amount Of At Least 10 mL.",null,4500);return;}
  const labels={water:"Water",zero:"Zero-Calorie Drink",coffee:"Tea Or Coffee",milk:"Milk",juice:"Juice","soft drink":"Soft Drink",cordial:"Cordial",smoothie:"Smoothie",soup:"Soup Or Broth",other:"Drink"},label=labels[type]||"Drink";
  if(type==="water"||type==="zero"){
    ext.water[date]=n(ext.water[date])+amount;saveExt();if(by("quick-drink-status"))by("quick-drink-status").textContent=`${label}: ${formatNumber(amount)} mL Added.`;if(by("quick-drink-type"))by("quick-drink-type").value="";if(by("quick-drink-amount"))by("quick-drink-amount").value="";renderDailyProgress();showActionToast(`${formatNumber(amount)} mL ${label} Added.`,null,2000);return;
  }
  ext.ui.pendingDrink={type,label,amount};ext.ui.diaryDate=date;ext.ui.pendingMeal="";ext.ui.libraryTab="all";ext.ui.foodSearch=type==="other"?"":type;if(by("quick-drink-type"))by("quick-drink-type").value="";if(by("quick-drink-amount"))by("quick-drink-amount").value="";saveExt();openFeature("food-library");
});
function toggleDailyAction(cardId,panelId,force){const card=by(cardId),panel=by(panelId);if(!card||!panel)return;const open=force===undefined?panel.classList.contains('hidden'):!!force;panel.classList.toggle('hidden',!open);card.setAttribute('aria-expanded',String(open));if(open)panel.scrollIntoView({block:'nearest'});}
by('daily-fluids-card')?.addEventListener('click',()=>toggleDailyAction('daily-fluids-card','daily-fluid-actions'));
by('daily-activity-card')?.addEventListener('click',()=>toggleDailyAction('daily-activity-card','daily-activity-actions'));
by('daily-add-water')?.addEventListener('click',()=>{toggleDailyAction('daily-fluids-card','daily-fluid-actions',true);if(by('quick-drink-type'))by('quick-drink-type').value='water';updateQuickDrinkButtonState();by('quick-drink-amount')?.focus();});
by('daily-add-drink')?.addEventListener('click',()=>{toggleDailyAction('daily-fluids-card','daily-fluid-actions',true);if(by('quick-drink-type'))by('quick-drink-type').value='';updateQuickDrinkButtonState();by('quick-drink-type')?.focus();});
by('daily-view-drinks')?.addEventListener('click',()=>{ext.ui.diaryDate=ext.ui.progressDate||isoToday();ext.ui.focusMeal='Other';saveExt();openFeature('food-diary');});
function openDailyActivity(focusHistory=false){const date=ext.ui.progressDate||isoToday();resetActivityForm();if(by('exercise-date'))by('exercise-date').value=date;openFeature('exercise-log');if(focusHistory)setTimeout(()=>by('exercise-history')?.scrollIntoView({block:'start',behavior:'smooth'}),80);}
by('daily-add-activity')?.addEventListener('click',()=>openDailyActivity(false));by('daily-view-activity')?.addEventListener('click',()=>openDailyActivity(true));by('daily-open-activity')?.addEventListener('click',()=>openDailyActivity(false));
document.addEventListener("click",event=>{const edit=event.target.closest("[data-progress-edit]");if(edit){const found=findEntry(edit.dataset.progressEdit);if(found)prepareEntry(getFood(found.entry.foodId)||snapshotFood(found.entry),{entry:found.entry});return;}});
document.addEventListener("click",event=>{const open=event.target.closest("[data-progress-open-meal]");if(!open)return;ext.ui.diaryDate=ext.ui.progressDate||isoToday();ext.ui.focusMeal=open.dataset.progressOpenMeal;saveExt();openFeature("food-diary");setTimeout(()=>{q(`[data-meal-name="${CSS.escape(open.dataset.progressOpenMeal)}"]`)?.scrollIntoView({block:"start",behavior:"smooth"});},80);});

// Exercise and activity
let activityEditingId="",activitySavePending=false,activitySavedTimer=0;
function activityProfileStart(){const main=mainData();return main.profileStartedDate||main.health?.startingWeightDate||isoToday();}
function activityWeightContext(){const existing=activityFormRecord(),savedWeight=n(existing?.estimateProvenance?.weightKg);if(savedWeight)return {weightKg:savedWeight,weightSource:existing.estimateProvenance.weightSource||"profile"};const main=mainData(),profileWeight=n(main.health?.currentWeightKg||main.recommendations?.basedOnWeightKg||main.health?.startingWeightKg||main.health?.weightKg);return {weightKg:profileWeight||70,weightSource:profileWeight?"profile":"fallback"};}
function activityPolicyForDate(date){ensureActivityCreditPolicy();return ACTIVITY.policyAtDate(activityPolicies(),date)||{id:"",effectiveDate:date,percent:ACTIVITY.normalisePolicyPercent(mainData().health?.exerciseCredit)};}
function activityRecordPolicy(record,date){
  if(record&&!record.creditPolicyManaged&&!record.creditPolicyId&&(ACTIVITY.localDateOf(record)===date||!ACTIVITY.policyAtDate(activityPolicies(),date)))return {id:"",effectiveDate:date,percent:ACTIVITY.inferredLegacyPercent(record)};
  return activityPolicyForDate(date);
}
function setActivitySaved(message=""){
  const box=by("exercise-saved-state");if(!box)return;clearTimeout(activitySavedTimer);box.textContent=message;box.classList.toggle("hidden",!message);if(message)activitySavedTimer=setTimeout(()=>box.classList.add("hidden"),4500);
}
function activityFormRecord(){return activityEditingId?ext.exercise.find(record=>record.id===activityEditingId)||null:null;}
function activityFormCredit(){
  const existing=activityFormRecord(),date=by("exercise-date")?.value||isoToday(),raw=n(by("exercise-calories")?.value),policy=activityRecordPolicy(existing,date),credit=whole(raw*n(policy.percent)/100);
  return {policy,credit};
}
function refreshActivityPolicySummary(){
  const box=by("exercise-policy-summary");if(!box)return;const {policy,credit}=activityFormCredit(),percent=n(policy.percent),date=by("exercise-date")?.value||isoToday();
  const label=ACTIVITY.POLICY_PERCENTAGES.includes(percent)?ACTIVITY.policyLabel(percent):"Saved historical allowance policy";box.innerHTML=`<strong>${esc(label)} · ${formatNumber(percent)}%</strong><small>For ${esc(formatDate(date))}, ${formatNumber(credit)} Cal would be added to the food allowance. Raw exercise energy remains separate.</small>`;
}
function refreshActivityEstimate(){
  const type=by("exercise-type")?.value||"walking",preset=ACTIVITY.presetById(type),source=by("exercise-energy-source"),calories=by("exercise-calories"),provenance=by("exercise-provenance");if(!source||!calories)return;
  if(!preset.estimate){source.value="manual";source.querySelector('option[value="estimate"]').disabled=true;}else source.querySelector('option[value="estimate"]').disabled=false;
  const estimated=preset.estimate&&source.value==="estimate";calories.readOnly=estimated;calories.setAttribute("aria-readonly",estimated?"true":"false");
  if(estimated){const weight=activityWeightContext(),result=ACTIVITY.estimateEnergy({presetId:type,intensity:by("exercise-intensity")?.value,minutes:by("exercise-minutes")?.value,...weight});calories.value=result.calories||"";provenance.innerHTML=`<strong>HEC estimate${result.calories?`: ${formatNumber(result.calories)} Cal`:""}</strong><small>${esc(result.method)}. This is an estimate and can be changed by choosing Enter Manually.</small>`;}
  else provenance.innerHTML=`<strong>Manual exercise energy</strong><small>Enter the raw energy from a source you trust. HEC keeps it separate from the amount added to your food allowance.</small>`;
  refreshActivityPolicySummary();
}
function refreshActivityForm(){
  const type=by("exercise-type")?.value||"walking",preset=ACTIVITY.presetById(type),manual=type==="manual-other";
  qa("[data-activity-preset]").forEach(button=>{const selected=button.dataset.activityPreset===type;button.classList.toggle("active",selected);button.setAttribute("aria-pressed",selected?"true":"false");});
  by("exercise-name-field")?.classList.toggle("hidden",!manual);by("exercise-distance-field")?.classList.toggle("hidden",!preset.distance);if(by("exercise-distance"))by("exercise-distance").disabled=!preset.distance;
  by("exercise-intensity-field")?.classList.toggle("hidden",!preset.estimate);if(by("exercise-intensity"))by("exercise-intensity").disabled=!preset.estimate;
  refreshActivityEstimate();
}
function resetActivityForm(){
  activityEditingId="";if(!by("exercise-type"))return;by("activity-form-title").textContent="Add Activity";by("cancel-exercise-edit").classList.add("hidden");by("add-exercise").textContent="Save Activity";
  by("exercise-type").value="walking";by("exercise-name").value="";by("exercise-date").value=isoToday();by("exercise-date").min=activityProfileStart();by("exercise-date").max=isoToday();by("exercise-minutes").value="";by("exercise-distance").value="";by("exercise-intensity").value="Moderate";by("exercise-energy-source").value="estimate";by("exercise-calories").value="";by("exercise-notes").value="";by("exercise-error").textContent="";refreshActivityForm();
}
function editActivity(id){
  const record=ext.exercise.find(item=>item.id===id);if(!record)return;activityEditingId=id;const type=ACTIVITY.activityTypeForRecord(record),date=ACTIVITY.localDateOf(record);
  by("activity-form-title").textContent=`Edit ${record.name||"Activity"}`;by("cancel-exercise-edit").classList.remove("hidden");by("add-exercise").textContent="Update Activity";by("exercise-type").value=type;by("exercise-name").value=type==="manual-other"?(record.name||""):"";by("exercise-date").value=date;by("exercise-date").min=date<activityProfileStart()?date:activityProfileStart();by("exercise-date").max=isoToday();by("exercise-minutes").value=record.durationMinutes??record.minutes??"";by("exercise-distance").value=n(record.distanceKm)||"";by("exercise-intensity").value=ACTIVITY.INTENSITIES.includes(record.intensity)?record.intensity:"Moderate";by("exercise-energy-source").value=record.energySource==="hec-estimate"?"estimate":"manual";by("exercise-calories").value=activityRawEnergy(record)||"";by("exercise-notes").value=record.notes||"";by("exercise-error").textContent="";setActivitySaved("");refreshActivityForm();by("activity-form-title").scrollIntoView({behavior:"smooth",block:"center"});
}
function renderExercise(){
  if(!by("exercise-history"))return;
  const recent=ext.exercise.slice().sort((a,b)=>ACTIVITY.localDateOf(b).localeCompare(ACTIVITY.localDateOf(a))||String(b.updatedAt||b.date||"").localeCompare(String(a.updatedAt||a.date||"")));
  by("exercise-history").innerHTML=recent.length?recent.map(record=>{const type=ACTIVITY.activityTypeForRecord(record),preset=ACTIVITY.presetById(type),raw=activityRawEnergy(record),credit=activityAllowanceCredit(record),details=[`${formatNumber(record.durationMinutes??record.minutes)} min`,n(record.distanceKm)?`${formatNumber(record.distanceKm,true)} km`:"",record.intensity||""].filter(Boolean).join(" · "),source=record.energySource==="hec-estimate"?"HEC estimate":record.energySource==="manual"?"Manual energy":"Saved legacy energy";return `<div class="activity-history-row"><span class="activity-history-icon">${preset.icon}</span><div class="activity-history-copy"><strong>${esc(record.name||preset.label)}</strong><small>${formatDate(ACTIVITY.localDateOf(record))} · ${details}</small><small>${formatNumber(raw)} Cal raw exercise energy · ${formatNumber(credit)} Cal added to food allowance · ${source}</small>${record.notes?`<p>${esc(record.notes)}</p>`:""}</div><div class="activity-history-actions"><button type="button" class="secondary" data-activity-edit="${esc(record.id)}">Edit</button><button type="button" class="delete-action" data-activity-delete="${esc(record.id)}">Delete</button></div></div>`;}).join(""):`<p class="empty-state">No extra activity logged yet.</p>`;
  refreshActivityPolicySummary();
}
by("add-exercise")?.addEventListener("click",()=>{
  if(activitySavePending)return;const button=by("add-exercise"),type=by("exercise-type").value,preset=ACTIVITY.presetById(type),date=by("exercise-date").value,minutes=n(by("exercise-minutes").value),manualName=by("exercise-name").value.trim(),raw=n(by("exercise-calories").value),distance=n(by("exercise-distance").value),error=by("exercise-error"),existing=activityFormRecord(),earliestAllowed=existing&&ACTIVITY.localDateOf(existing)<activityProfileStart()?ACTIVITY.localDateOf(existing):activityProfileStart();
  if(!date||date>isoToday()||date<earliestAllowed){error.textContent=`Choose a date from ${formatDate(earliestAllowed)} through today.`;return;}if(!minutes||minutes>1440){error.textContent="Enter a duration from 1 to 1,440 minutes.";return;}if(type==="manual-other"&&!manualName){error.textContent="Give the manual activity a short name.";return;}if(raw<0||raw>10000||!String(by("exercise-calories").value).trim()){error.textContent="Review the raw exercise energy before saving.";return;}if(preset.distance&&distance<0){error.textContent="Distance cannot be negative.";return;}
  activitySavePending=true;button.disabled=true;error.textContent="";const policy=activityRecordPolicy(existing,date),record=ACTIVITY.buildRecord({activityType:type,name:manualName,localDate:date,minutes,distanceKm:distance,intensity:by("exercise-intensity").value,energyMode:by("exercise-energy-source").value==="estimate"?"hec-estimate":"manual",caloriesBurned:raw,notes:by("exercise-notes").value},{existing,policy,id:uid("activity"),now:new Date().toISOString(),timeZone:activeTimeZone(),...activityWeightContext(),preserveLegacyPolicy:true});
  ext.exercise=ACTIVITY.upsertRecord(ext.exercise,record);saveExt();const wasEdit=!!existing,credit=activityAllowanceCredit(record),name=record.name;resetActivityForm();renderExercise();setActivitySaved(`${name} ${wasEdit?"updated":"saved"}. ${formatNumber(record.caloriesBurned)} Cal raw energy; ${formatNumber(credit)} Cal added to the food allowance.`);showActionToast(`${name} ${wasEdit?"updated":"saved"}.`,null,2000);setTimeout(()=>{activitySavePending=false;button.disabled=false;},500);
});
by("cancel-exercise-edit")?.addEventListener("click",resetActivityForm);
by("exercise-type")?.addEventListener("change",refreshActivityForm);by("exercise-energy-source")?.addEventListener("change",refreshActivityEstimate);by("exercise-intensity")?.addEventListener("change",refreshActivityEstimate);by("exercise-minutes")?.addEventListener("input",refreshActivityEstimate);by("exercise-date")?.addEventListener("change",refreshActivityPolicySummary);by("exercise-calories")?.addEventListener("input",refreshActivityPolicySummary);
by("activity-preset-grid")?.addEventListener("click",event=>{const button=event.target.closest("[data-activity-preset]");if(!button)return;by("exercise-type").value=button.dataset.activityPreset;refreshActivityForm();});
document.addEventListener("click",event=>{const edit=event.target.closest("[data-activity-edit]");if(edit){editActivity(edit.dataset.activityEdit);return;}const button=event.target.closest("[data-activity-delete]");if(!button)return;const item=ext.exercise.find(record=>record.id===button.dataset.activityDelete);if(!item)return;openModal(`Delete ${item.name}?`,`This removes ${formatDate(ACTIVITY.localDateOf(item))}, ${formatNumber(item.durationMinutes??item.minutes)} minutes. Its exercise energy and allowance credit will be removed once.`,`Delete`,()=>{const result=ACTIVITY.deleteRecord(ext.exercise,item.id);if(!result.removed)return;ext.exercise=result.records;saveExt();if(activityEditingId===item.id)resetActivityForm();renderExercise();showActionToast(`${result.removed.name} deleted.`,()=>{ext.exercise=ACTIVITY.upsertRecord(ext.exercise,result.removed);saveExt();renderExercise();},8000);});});

// Shopping list
const SHOPPING_CATEGORIES=["Fruit & Vegetables","Meat & Seafood","Dairy & Eggs","Bread & Bakery","Breakfast & Cereals","Pantry","Snacks","Frozen","Drinks","Household","Cleaning","Personal Care","Pet Supplies","Other"];
const GROCERY_CATALOG=[
  ["SAO Biscuits","Pantry",["sao","say yo","say-o","sao crackers","sao biscuits"]],["Shredded Cheese","Dairy & Eggs",["grated cheese","why grated cheese"]],["Cheese Slices","Dairy & Eggs",["sliced cheese"]],["Tasty Cheese","Dairy & Eggs",[]],["Mature Cheese","Dairy & Eggs",[]],
  ["Greek Yoghurt","Dairy & Eggs",["greek yogurt","yoghurt","yogurt"]],["Cottage Cheese","Dairy & Eggs",[]],["Light Milk","Dairy & Eggs",["lite milk","milk"]],["Eggs","Dairy & Eggs",["egg"]],["Butter","Dairy & Eggs",[]],["Margarine","Dairy & Eggs",[]],
  ["Chicken Drumsticks","Meat & Seafood",["drumsticks"]],["Hot Chook","Meat & Seafood",["hot chicken","roast chicken","chook"]],["Chicken Breast","Meat & Seafood",[]],["Bacon Pieces","Meat & Seafood",["bacon bits"]],["Shredded Ham","Meat & Seafood",[]],["Beef","Meat & Seafood",[]],["Fish","Meat & Seafood",[]],["Tuna","Meat & Seafood",[]],
  ["Granny Smith Apples","Fruit & Vegetables",["granny smith","green apples"]],["Red Apples","Fruit & Vegetables",[]],["Bananas","Fruit & Vegetables",["banana"]],["Potatoes","Fruit & Vegetables",["potato","spuds"]],["Brown Onions","Fruit & Vegetables",["onions"]],["Carrots","Fruit & Vegetables",["carrot"]],["Broccoli","Fruit & Vegetables",[]],["Salad","Fruit & Vegetables",[]],
  ["White Sandwich Bread","Bread & Bakery",["white bread","sandwich bread"]],["Wholemeal Bread","Bread & Bakery",["bread"]],["Bread Rolls","Bread & Bakery",["rolls"]],["Nutri-Grain Cereal","Breakfast & Cereals",["nutrigrain","nutri grain"]],["Rolled Oats","Breakfast & Cereals",["oats"]],
  ["Sugar","Pantry",[]],["Coffee","Pantry",[]],["Pasta","Pantry",[]],["Brown Rice","Pantry",["rice"]],["Olive Oil","Pantry",["oil"]],["Frozen Vegetables","Frozen",["frozen veges","frozen veggies"]],["Pepsi Max","Drinks",["pepsi"]],["Sparkling Water","Drinks",["water"]],
  ["Toilet Paper","Household",["toilet rolls"]],["Dishwashing Liquid","Cleaning",["dish soap"]]
].map(([name,category,aliases])=>({name,category,aliases}));
function afcdShoppingCategory(name){const nrm=normalise(name);if(/apple|banana|fruit|vegetable|potato|carrot|broccoli|pumpkin|onion|lettuce|tomato|zucchini/.test(nrm))return "Fruit & Vegetables";if(/beef|pork|lamb|chicken|fish|tuna|salmon|prawn|seafood|sausage|bacon|ham/.test(nrm))return "Meat & Seafood";if(/milk|cheese|yoghurt|yogurt|egg|cream|custard/.test(nrm))return "Dairy & Eggs";if(/bread|roll|muffin|bakery/.test(nrm))return "Bread & Bakery";if(/cereal|weet bix|oat|porridge/.test(nrm))return "Breakfast & Cereals";if(/soft drink|juice|water|coffee|tea|beverage|cordial/.test(nrm))return "Drinks";if(/ice cream|frozen/.test(nrm))return "Frozen";if(/biscuit|cracker|chip|snack/.test(nrm))return "Snacks";return "Pantry";}
function closestAfcdName(input){const qn=normalise(input);if(!qn||!AFCD_FOODS.length)return null;let best=null,bestScore=99;for(const food of AFCD_FOODS){const name=normalise(food.name);if(name===qn)return {name:food.name,category:afcdShoppingCategory(food.name),confidence:"exact",food};if(name.includes(qn)||qn.includes(name)){const d=Math.abs(name.length-qn.length);if(d<bestScore){bestScore=d;best=food;}}}return best?{name:best.name,category:afcdShoppingCategory(best.name),confidence:"related",food:best}:null;}
function catalogueMatch(input){const qn=normalise(input);if(!qn)return null;const learned=ext.shoppingVoiceAliases?.[qn];if(learned){const known=GROCERY_CATALOG.find(x=>normalise(x.name)===normalise(learned));if(known)return {...known,confidence:"learned"};const afcd=closestAfcdName(learned);if(afcd)return {...afcd,confidence:"learned"};return {name:learned,category:afcdShoppingCategory(learned),confidence:"learned"};}let best=null,bestScore=Infinity;for(const item of GROCERY_CATALOG){for(const term of [item.name,...item.aliases]){const tn=normalise(term);if(qn===tn)return {...item,confidence:"exact"};const d=editDistance(qn,tn);if((qn.length>=3||tn.length>=3)&&d<bestScore){bestScore=d;best=item;}}}if(best&&bestScore<=Math.max(2,Math.floor(qn.length/4)))return {...best,confidence:"typo"};return closestAfcdName(input);}
function parseShoppingSpeech(text){
  const raw=String(text||"").trim(),words={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,a:1,an:1};
  const m=raw.match(/^\s*(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(kilograms?|kilos?|kg|grams?|g|millilitres?|milliliters?|ml|litres?|liters?|litre|liter|l|packets?|packs?|bottles?|cans?|tins?|dozen|items?)?\s*(?:of\s+)?(.+)$/i);
  if(!m)return {item:raw,quantity:""};
  const number=Number(m[1])||words[m[1].toLowerCase()]||1,unitRaw=String(m[2]||"").toLowerCase(),item=m[3].trim();
  const unitMap={kilogram:"kg",kilograms:"kg",kilo:"kg",kilos:"kg",kg:"kg",gram:"g",grams:"g",g:"g",millilitre:"mL",millilitres:"mL",milliliter:"mL",milliliters:"mL",ml:"mL",litre:"L",litres:"L",liter:"L",liters:"L",l:"L",packet:"packet",packets:"packets",pack:"pack",packs:"packs",bottle:"bottle",bottles:"bottles",can:"can",cans:"cans",tin:"tin",tins:"tins",dozen:"dozen",item:"item",items:"items"};
  const unit=unitMap[unitRaw]||unitRaw;return {item,quantity:`${formatNumber(number,true)}${unit?` ${unit}`:""}`};
}
function inferShoppingCategory(name){const match=catalogueMatch(name);return match?.category||afcdShoppingCategory(name)||"Other";}
function parseQuantityText(value){const text=String(value||"").trim();const m=text.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);return m?{number:Number(m[1]),unit:m[2].trim().toLowerCase()}:null;}
function combineQuantities(a,b){const pa=parseQuantityText(a),pb=parseQuantityText(b);if(pa&&pb&&pa.unit===pb.unit){const total=round1(pa.number+pb.number);return `${formatNumber(total,true)}${pa.unit?` ${pa.unit}`:""}`;}return [a,b].filter(Boolean).join(" + ");}
function normaliseShoppingCategories(){const map={"Fruit & vegetables":"Fruit & Vegetables","Meat & seafood":"Meat & Seafood","Dairy & eggs":"Dairy & Eggs","Bakery":"Bread & Bakery"};ext.shopping.forEach(x=>{x.category=map[x.category]||x.category||inferShoppingCategory(x.item);if(x.category==="Other"){const inferred=inferShoppingCategory(x.item);if(inferred!=="Other")x.category=inferred;}});}
function renderShopping(){normaliseShoppingCategories();const groups={};ext.shopping.forEach((x,i)=>(groups[x.category||"Other"]??=[]).push({...x,index:i}));by("shopping-items").innerHTML=ext.shopping.length?Object.entries(groups).sort((a,b)=>SHOPPING_CATEGORIES.indexOf(a[0])-SHOPPING_CATEGORIES.indexOf(b[0])).map(([category,items])=>`<section class="shopping-category" aria-label="${esc(category)}"><header class="shopping-category-heading"><h4>${esc(category)}</h4><span>${items.length} ${items.length===1?"item":"items"}</span></header>${items.map(item=>{const details=[item.quantity,item.brand,item.notes].filter(Boolean).map(esc).join(" · ");return `<div class="shopping-row ${item.done?"done":""}"><label class="shopping-check-target"><input class="shopping-check" type="checkbox" data-shop-check="${item.index}" ${item.done?"checked":""} aria-label="Mark ${esc(item.item)} collected"></label><button type="button" class="shopping-item-main" data-shop-edit="${item.index}"><strong>${esc(item.item)}</strong>${details?`<small>${details}</small>`:""}</button><button type="button" data-shop-menu="${item.index}" class="shopping-more" aria-label="More options for ${esc(item.item)}">•••</button></div>`;}).join("")}</section>`).join(""):`<p class="empty-state">Your shopping list is empty. Add an item below or import ingredients from a meal plan.</p>`;by("shopping-suggestions").innerHTML=GROCERY_CATALOG.map(x=>`<option value="${esc(x.name)}">${esc(x.category)}</option>`).join("");const allDone=ext.shopping.length&&ext.shopping.every(x=>x.done);if(by("toggle-all-shopping"))by("toggle-all-shopping").textContent=allDone?"Deselect All":"Select All";renderShoppingPrint();saveExt();}
function shoppingShareText(){normaliseShoppingCategories();const active=ext.shopping.filter(x=>!x.done),groups={};active.forEach(x=>(groups[x.category||"Other"]??=[]).push(x));const sections=Object.entries(groups).sort((a,b)=>SHOPPING_CATEGORIES.indexOf(a[0])-SHOPPING_CATEGORIES.indexOf(b[0])).map(([cat,items])=>`${cat}\n${items.map(x=>`• ${x.item}${x.quantity?` — ${x.quantity}`:""}${x.brand?` · ${x.brand}`:""}`).join("\n")}`).join("\n\n");return `Healthy Eating Companion — Shopping List\n${formatDate(isoToday())}\n\n${sections||"No unchecked items."}`;}
function renderShoppingPrint(){const textGroups={};ext.shopping.filter(x=>!x.done).forEach(x=>(textGroups[x.category||"Other"]??=[]).push(x));by("shopping-print-area").innerHTML=`<h1>Healthy Eating Companion Shopping List</h1><p>${formatDate(isoToday())}</p>${Object.entries(textGroups).sort((a,b)=>SHOPPING_CATEGORIES.indexOf(a[0])-SHOPPING_CATEGORIES.indexOf(b[0])).map(([category,items])=>`<h2>${esc(category)}</h2><ul>${items.map(x=>`<li>☐ <strong>${esc(x.item)}</strong>${x.quantity?` — ${esc(x.quantity)}`:""}${x.brand?` · ${esc(x.brand)}`:""}${x.notes?` · ${esc(x.notes)}`:""}</li>`).join("")}</ul>`).join("")||"<p>No unchecked items.</p>"}`;}
function addShoppingRecord(record){ext.shopping.push({id:uid("shop"),done:false,notes:"",brand:"",...record,...recordTimestamps(record.createdAt)});saveExt();renderShopping();showActionToast(`${record.item} added to ${record.category}.`,null,2000);}
function requestAddShopping(){const raw=by("shopping-item").value.trim();if(!raw)return;const match=catalogueMatch(raw),quantity=by("shopping-quantity").value.trim(),brand=by("shopping-brand").value.trim(),notes=by("shopping-notes").value.trim(),selected=by("shopping-category").value,itemName=match?.name||raw,category=selected==="auto"?(match?.category||inferShoppingCategory(raw)):selected,exact=ext.shopping.find(x=>!x.done&&normalise(x.item)===normalise(itemName));const doAdd=()=>{const heard=ext.ui.lastShoppingVoiceHeard?parseShoppingSpeech(ext.ui.lastShoppingVoiceHeard).item:"";if(heard&&normalise(heard)!==normalise(itemName)){ext.shoppingVoiceAliases||={};ext.shoppingVoiceAliases[normalise(heard)]=itemName;}addShoppingRecord({item:itemName,quantity,category,brand,notes});ext.ui.lastShoppingVoiceHeard="";["shopping-item","shopping-quantity","shopping-brand","shopping-notes"].forEach(id=>by(id).value="");by("shopping-category").value="auto";};if(match?.confidence==="typo"&&normalise(match.name)!==normalise(raw)){openModal(`Did you mean ${match.name}?`,`We found a close grocery/food match in ${match.category}.`,`Use ${match.name}`,()=>{by("shopping-item").value=match.name;requestAddShopping();},`<button id="keep-shopping-spelling" class="secondary wide">Keep “${esc(raw)}”</button>`);by("keep-shopping-spelling")?.addEventListener("click",()=>{closeModal();addShoppingRecord({item:raw,quantity,category:inferShoppingCategory(raw),brand,notes});},{once:true});return;}if(exact){openModal(`${exact.item} is already on your list`,`Current quantity: ${exact.quantity||"not specified"}. Choose the new combined quantity.`,`Update Quantity`,()=>{exact.quantity=by("duplicate-shopping-quantity").value.trim();if(brand)exact.brand=brand;if(notes)exact.notes=notes;exact.updatedAt=new Date().toISOString();saveExt();renderShopping();showActionToast(`${exact.item} quantity updated.`,null,2000);},`<label>New Quantity<input id="duplicate-shopping-quantity" value="${esc(combineQuantities(exact.quantity,quantity))}"></label><button id="add-shopping-separately" class="secondary wide">Add as a Separate Item</button>`);by("add-shopping-separately")?.addEventListener("click",()=>{closeModal();doAdd();},{once:true});return;}doAdd();}
by("add-shopping-item")?.addEventListener("click",requestAddShopping);by("shopping-item")?.addEventListener("change",()=>{const match=catalogueMatch(by("shopping-item").value);by("shopping-add-status").textContent=match?`${match.name} will be filed under ${match.category}.`:"No confident category match yet. Review the category before adding.";});
function editShoppingItem(index){const item=ext.shopping[index];if(!item)return;openModal(`Edit ${item.item}`,"Change any detail without deleting and re-entering the item.","Save Changes",()=>{item.item=by("edit-shop-name").value.trim()||item.item;item.quantity=by("edit-shop-quantity").value.trim();item.category=by("edit-shop-category").value;item.brand=by("edit-shop-brand").value.trim();item.notes=by("edit-shop-notes").value.trim();item.updatedAt=new Date().toISOString();saveExt();renderShopping();showActionToast(`${item.item} updated.`,null,2000);},`<div class="form-grid"><label>Item<input id="edit-shop-name" value="${esc(item.item)}"></label><label>Quantity<input id="edit-shop-quantity" value="${esc(item.quantity||"")}"></label><label>Category<select id="edit-shop-category">${SHOPPING_CATEGORIES.map(c=>`<option ${c===item.category?"selected":""}>${esc(c)}</option>`).join("")}</select></label><label>Brand / Substitute<input id="edit-shop-brand" value="${esc(item.brand||"")}"></label><label class="full">Notes<input id="edit-shop-notes" value="${esc(item.notes||"")}"></label></div><button id="delete-shop-from-edit" class="danger-button wide">Delete Item</button>`);by("delete-shop-from-edit")?.addEventListener("click",()=>{closeModal();const removed=ext.shopping.splice(index,1)[0];saveExt();renderShopping();showActionToast(`${removed.item} deleted.`,()=>{ext.shopping.splice(index,0,removed);saveExt();renderShopping();},8000);},{once:true});}
document.addEventListener("change",event=>{if(event.target.dataset.shopCheck!==undefined){const item=ext.shopping[Number(event.target.dataset.shopCheck)];item.done=event.target.checked;item.updatedAt=new Date().toISOString();saveExt();renderShopping();}});document.addEventListener("click",event=>{const edit=event.target.closest("[data-shop-edit],[data-shop-menu]");if(edit){editShoppingItem(Number(edit.dataset.shopEdit??edit.dataset.shopMenu));return;}});
by("toggle-all-shopping")?.addEventListener("click",()=>{const makeDone=!(ext.shopping.length&&ext.shopping.every(x=>x.done)),updatedAt=new Date().toISOString();ext.shopping.forEach(x=>{x.done=makeDone;x.updatedAt=updatedAt;});saveExt();renderShopping();});
by("clear-checked-shopping")?.addEventListener("click",()=>{const removed=ext.shopping.filter(x=>x.done);if(!removed.length){showActionToast("No checked items to clear.",null,4000);return;}openModal("Clear Checked Items?",`Remove ${removed.length} checked item${removed.length===1?"":"s"}.`,`Clear Checked`,()=>{ext.shopping=ext.shopping.filter(x=>!x.done);saveExt();renderShopping();showActionToast("Checked items cleared.",()=>{ext.shopping.push(...removed);saveExt();renderShopping();},8000);});});
by("clear-all-shopping")?.addEventListener("click",()=>{if(!ext.shopping.length)return;openModal("Clear the Entire Shopping List?","This will remove every item from the current list.","Clear All",()=>{const removed=clone(ext.shopping);ext.shopping=[];saveExt();renderShopping();showActionToast("Shopping list cleared.",()=>{ext.shopping=removed;saveExt();renderShopping();},8000);});});
by("print-shopping-list")?.addEventListener("click",()=>{renderShoppingPrint();document.body.classList.add("printing-shopping");setTimeout(()=>{window.print();document.body.classList.remove("printing-shopping");},80);});by("share-shopping-list")?.addEventListener("click",async()=>{const text=shoppingShareText();if(navigator.share)try{await navigator.share({title:"Shopping List",text});}catch{}else{await navigator.clipboard?.writeText(text);showActionToast("Shopping list copied to the clipboard.",null,2000);}});
function speakShopping(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){showActionToast("Speech entry is unavailable in this browser.",null,5000);return;}const r=new SR();r.lang="en-AU";r.interimResults=false;r.maxAlternatives=3;r.onresult=e=>{const alternatives=[...e.results[0]].map(x=>x.transcript),matches=alternatives.map(text=>{const parsed=parseShoppingSpeech(text);return {text,parsed,match:catalogueMatch(parsed.item)}}),best=matches.find(x=>x.match?.confidence==="exact"||x.match?.confidence==="learned")||matches.find(x=>x.match)||matches[0];ext.ui.lastShoppingVoiceHeard=best.text;by("shopping-item").value=best.match?.name||best.parsed.item;if(best.parsed.quantity)by("shopping-quantity").value=best.parsed.quantity;saveExt();by("shopping-item").dispatchEvent(new Event("change"));const interpreted=best.match?.name||best.parsed.item;if(normalise(interpreted)!==normalise(best.text)||best.parsed.quantity)showActionToast(`Heard “${best.text}”. Interpreted as ${best.parsed.quantity?best.parsed.quantity+" ":""}${interpreted}. Review before adding.`,null,7000);};r.start();}
by("speak-shopping-item")?.addEventListener("click",speakShopping);by("shopping-quick-speak")?.addEventListener("click",speakShopping);by("shopping-quick-add")?.addEventListener("click",()=>{by("shopping-add-card")?.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>by("shopping-item")?.focus(),350);});

by("food-data-settings")?.addEventListener("click",()=>{const settings=ext.foodDataSettings||{};openModal("Food Data Sources","Australian verified records are prioritised. Online sources broaden coverage but must be reviewed.","Save",()=>{ext.foodDataSettings={usdaKey:by("usda-api-key")?.value.trim()||""};saveExt();showActionToast("Food data settings saved.",null,2000);},`<p><strong>Open Food Facts Australian catalogue</strong> supplies the large on-demand product and barcode index. It is a source-specific community database attributed to Open Food Facts contributors under its ODbL/database-contents terms; records may be incomplete and retain their provenance.</p><p><strong>Open Food Facts online lookup</strong> may broaden beyond the generated Australian snapshot and requires package review.</p><p><strong>Australian Food Composition Database Release 3</strong> is built in for local searching of 1,588 Australian foods. Values come from Food Standards Australia New Zealand and are shown per the selected quantity.</p><p class="fine">AFCD values are reference averages and can vary by brand, batch, season, processing and ingredient source. Australian data may not be appropriate in other countries. See the AFCD data notice supplied with this build for attribution and licence information.</p><label>USDA FoodData Central API key (optional)<input id="usda-api-key" value="${esc(settings.usdaKey||"")}" placeholder="Leave blank to skip this optional source"></label><p class="fine">HEC does not publish a USDA credential. When this field is blank, local Australian foods and other available sources continue without USDA.</p>`);});

// Food preferences and family readiness
function renderFoodPreferences(){
  const d=mainData().dietary||{};
  by("pref-foods-love").value=d["foods-love"]||"";
  by("pref-foods-like").value=d["foods-like"]||"";
  by("pref-foods-dislike").value=d["foods-dislike"]||"";
  by("pref-foods-never").value=d["foods-never"]||"";
  by("pref-food-context").value=d["food-context"]||"";
}
by("save-food-preferences")?.addEventListener("click",()=>{
  const d=mainData();d.dietary ||= {};
  d.dietary["foods-love"]=by("pref-foods-love").value.trim();
  d.dietary["foods-like"]=by("pref-foods-like").value.trim();
  d.dietary["foods-dislike"]=by("pref-foods-dislike").value.trim();
  d.dietary["foods-never"]=by("pref-foods-never").value.trim();
  d.dietary["food-context"]=by("pref-food-context").value.trim();
  localStorage.setItem(MAIN_KEY,JSON.stringify(d));
  showActionToast("Food Preferences saved. You can update them at any time.",null,2000);
});
const CONNECTIONS=["Apple Health & Apple Watch","Google Health Connect","Smart Scales","Fitness Trackers","Nutrition Apps","Calendar & Reminders","Private Household Sharing"];
function renderConnections(){by("family-sharing-enabled").checked=!!ext.family.enabled;by("household-name").value=ext.family.name||"";by("family-email").value=ext.family.email||"";by("connections-list").innerHTML=CONNECTIONS.map(name=>`<label class="connection-row"><span><strong>${esc(name)}</strong><small>Preference saved locally; secure connection not active in this static trial.</small></span><input type="checkbox" data-connection="${esc(name)}" ${ext.connections[name]?"checked":""}></label>`).join("");}
by("save-family")?.addEventListener("click",()=>{ext.family={enabled:by("family-sharing-enabled").checked,name:by("household-name").value,email:by("family-email").value};saveExt();showActionToast("Household-sharing preferences saved locally.",null,2000);});
document.addEventListener("change",event=>{if(event.target.dataset.connection){ext.connections[event.target.dataset.connection]=event.target.checked;saveExt();showActionToast(`${event.target.dataset.connection} preference ${event.target.checked?"enabled":"disabled"}.`,null,2000);}});

// Progress history
function currentPeriod(){return q(".history-period button.active")?.dataset.period||"30";}
function weightChangeText(value){const amount=round1(value);return `${amount>0?"+":""}${amount.toFixed(1)} kg`;}
function renderWeightJourney(main,model,period){
  const today=isoToday(),journey=WEIGHT_PROGRESS.journeySummary(main.weightHistory||[],{today,goalWeight:main.health?.selectedGoalWeight,goal:main.health?.goal,selectedId:ext.ui.selectedWeightPointId||"",period,profileStart:main.profileStartedDate||"",startingWeightDate:main.health?.startingWeightDate||""});
  const start=journey.start,current=journey.current,goal=journey.goalWeight,change=journey.change;
  by("weight-journey-summary").innerHTML=`<div class="stage6-summary-card"><span>Start</span><strong>${start?`${n(start.weightKg).toFixed(1)} kg`:"—"}</strong><small>${start?formatDate(start.date):"No check-in yet"}</small></div><div class="stage6-summary-card"><span>Current</span><strong>${current?`${n(current.weightKg).toFixed(1)} kg`:"—"}</strong><small>${current?formatDate(current.date):"No check-in yet"}</small></div><div class="stage6-summary-card"><span>Goal</span><strong>${goal?`${goal.toFixed(1)} kg`:"—"}</strong><small>${goal?"Your selected goal":"No goal selected"}</small></div><div class="stage6-summary-card"><span>${esc(change.label)}</span><strong>${start&&current?`${change.value>0&&change.label==="Change since start"?"+":""}${n(change.value).toFixed(1)} kg`:"—"}</strong><small>${start&&current?`Since ${formatDate(start.date)}`:"Add a check-in to begin"}</small></div>`;
  return journey;
}
function weightChartMarkup(model){
  if(model.state==="empty")return `<div class="stage6-chart-empty"><span aria-hidden="true">📈</span><h4>Your weight graph will appear here</h4><p>Add a Weight Check-In to begin. The graph only uses dates and weights you deliberately save.</p><button class="primary" data-open-weight-checkin type="button">Add Weight Check-In</button></div>`;
  const W=820,H=360,L=104,R=26,T=28,B=64,plotW=W-L-R,plotH=H-T-B,x=point=>L+point.x*plotW,y=point=>T+point.y*plotH;
  let grid="";for(let index=0;index<=4;index++){const value=model.domain.max-model.domain.span*index/4,yy=T+plotH*index/4;grid+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" class="stage6-weight-grid"/><text x="${L-9}" y="${yy+4}" text-anchor="end" class="stage6-axis-label">${value.toFixed(1)}</text>`;}
  const polyline=model.points.length>1?`<polyline points="${model.points.map(point=>`${x(point).toFixed(1)},${y(point).toFixed(1)}`).join(" ")}" class="stage6-weight-line"/>`:"";
  const points=model.points.map(point=>`<g class="stage6-weight-point ${point.selected?"selected":""}" data-weight-point-id="${esc(point.record.id||point.record.date)}" role="button" tabindex="0" aria-label="${esc(formatDate(point.record.date))}, ${n(point.record.weightKg).toFixed(1)} kilograms"><circle cx="${x(point).toFixed(1)}" cy="${y(point).toFixed(1)}" r="${point.selected?8:6}"/><title>${esc(formatDate(point.record.date))}: ${n(point.record.weightKg).toFixed(1)} kg</title></g>`).join("");
  const labels=model.points.filter(point=>point.labelled).map(point=>`<text x="${x(point).toFixed(1)}" y="${H-18}" text-anchor="middle" class="stage6-date-label">${esc(new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short"}).format(new Date(`${point.record.date}T12:00:00`)))}</text>`).join("");
  const lineLabel=model.state==="single"?`<text x="${W/2}" y="${T+16}" text-anchor="middle" class="stage6-single-label">First recorded point</text>`:"";
  return `<div class="stage6-weight-chart" role="group" aria-label="Weight trend. Select any point to review its date and weight."><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-label="Interactive weight trend plot">${grid}${polyline}${points}${labels}${lineLabel}<text x="27" y="${T+plotH/2}" text-anchor="middle" class="stage6-axis-title" transform="rotate(-90 27 ${T+plotH/2})">Weight (kg)</text></svg></div>`;
}
function renderSelectedWeightPoint(model,journey){
  const selected=model.selected,target=by("weight-point-summary");if(!target)return;
  if(!selected){target.innerHTML=`<strong>No point selected</strong><p>Your saved date and weight will appear here.</p>`;return;}
  target.innerHTML=`<div><span>Selected Point</span><strong>${n(selected.weightKg).toFixed(1)} kg</strong><small>${esc(formatDate(selected.date))}</small></div><div><span>Change In This Range</span><strong>${model.records.length>1?weightChangeText(model.rangeChange):"First point"}</strong><small>${model.records.length>1?`From ${esc(formatDate(model.records[0].date))}`:"One record in view"}</small></div><div><span>Total Change Since Start</span><strong>${journey.start&&journey.current?weightChangeText(journey.totalChange):"—"}</strong><small>${journey.start?`Current versus ${n(journey.start.weightKg).toFixed(1)} kg start`:"No starting record"}</small></div><button class="secondary" data-edit-weight-date="${esc(selected.date)}" type="button">Edit This Weight</button>`;
}
function renderHistory(period){
  const today=isoToday();
  qa(".history-period button").forEach(button=>button.classList.toggle("active",button.dataset.period===String(period)));
  const main=mainData(),model=WEIGHT_PROGRESS.chartModel(main.weightHistory||[],{period,today,selectedId:ext.ui.selectedWeightPointId||"",maxLabels:innerWidth<520?4:6});
  const journey=renderWeightJourney(main,model,period);if(model.selected)ext.ui.selectedWeightPointId=model.selected.id||model.selected.date;
  by("history-bars").innerHTML=weightChartMarkup(model);renderSelectedWeightPoint(model,journey);
  const history=WEIGHT_PROGRESS.effectiveRecords(main.weightHistory||[],{today}).slice().reverse();if(by('weight-room-history'))by('weight-room-history').innerHTML=history.length?history.map(record=>`<div class="weight-room-history-row"><span><strong>${n(record.weightKg).toFixed(1)} kg</strong><small>${esc(formatDate(record.date))}${record.note?` · ${esc(record.note)}`:''}</small></span><button class="secondary" data-edit-weight-date="${esc(record.date)}" type="button">Edit</button></div>`).join(''):'<p class="empty-state">No weight check-ins yet.</p>';
  saveExt();
}
q(".history-period")?.addEventListener("click",event=>{const button=event.target.closest("[data-period]");if(!button)return;renderHistory(button.dataset.period);});
document.addEventListener("click",event=>{const point=event.target.closest?.("[data-weight-point-id]");if(!point)return;ext.ui.selectedWeightPointId=point.dataset.weightPointId;renderHistory(currentPeriod());});
document.addEventListener("keydown",event=>{const point=event.target.closest?.("[data-weight-point-id]");if(!point||!(event.key==="Enter"||event.key===" "))return;event.preventDefault();ext.ui.selectedWeightPointId=point.dataset.weightPointId;renderHistory(currentPeriod());});
window.HECSelectWeightPoint=id=>{ext.ui.selectedWeightPointId=String(id||'');saveExt();};

// Nutrition Trends: recorded Diary days only. Missing nutrient values are
// deliberately omitted by the pure foundation rather than treated as zero.
function nutritionTrendChart(model){
  if(!NUTRITION_TRENDS)return '<p class="empty-state">Nutrition trends are unavailable in this build.</p>';
  if(model.state==='empty')return `<div class="stage6-chart-empty"><span aria-hidden="true">📊</span><h4>No recorded ${esc(model.metric.label.toLowerCase())} days in this range</h4><p>Only Diary days with complete published values for this nutrient can appear. Missing days are not zero.</p></div>`;
  const W=820,H=360,L=88,R=30,T=32,B=64,plotW=W-L-R,plotH=H-T-B,x=point=>L+point.x*plotW,yValue=value=>T+(model.domain.max-value)/model.domain.span*plotH,y=point=>yValue(point.record.value);
  let grid='';for(let index=0;index<=4;index++){const value=model.domain.max-model.domain.span*index/4,yy=T+plotH*index/4;grid+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" class="nutrition-trend-grid"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="nutrition-axis-label">${formatNumber(value,true)}</text>`;}
  const target=model.target===null?'':`<line x1="${L}" x2="${W-R}" y1="${yValue(model.target)}" y2="${yValue(model.target)}" class="nutrition-target-line"/><text x="${W-R}" y="${Math.max(T+12,yValue(model.target)-7)}" text-anchor="end" class="nutrition-target-label">Current target ${formatNumber(model.target,true)} ${esc(model.metric.unit)}</text>`;
  const line=model.points.length>1?`<polyline points="${model.points.map(point=>`${x(point).toFixed(1)},${y(point).toFixed(1)}`).join(' ')}" class="nutrition-trend-line"/>`:'';
  const points=model.points.map(point=>`<g class="nutrition-trend-point ${point.selected?'selected':''}" data-nutrition-point-date="${point.record.date}" role="button" tabindex="0" aria-label="${esc(formatDate(point.record.date))}, ${formatNumber(point.record.value,true)} ${esc(model.metric.unit)}"><circle cx="${x(point).toFixed(1)}" cy="${y(point).toFixed(1)}" r="${point.selected?8:6}"/><title>${esc(formatDate(point.record.date))}: ${formatNumber(point.record.value,true)} ${esc(model.metric.unit)}</title></g>`).join('');
  const labels=model.points.filter(point=>point.labelled).map(point=>`<text x="${x(point).toFixed(1)}" y="${H-20}" text-anchor="middle" class="nutrition-date-label">${esc(new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short'}).format(new Date(`${point.record.date}T12:00:00`)))}</text>`).join('');
  return `<div class="nutrition-trend-chart" role="group" aria-label="${esc(model.metric.label)} trend. Select a point for details."><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${target}${line}${points}${labels}<text x="25" y="${T+plotH/2}" text-anchor="middle" class="nutrition-axis-title" transform="rotate(-90 25 ${T+plotH/2})">${esc(model.metric.label)} (${esc(model.metric.unit)})</text></svg></div>`;
}
function renderNutritionTrends(){
  if(!NUTRITION_TRENDS||!by('nutrition-trend-chart'))return;ext.ui.nutritionTrendMetric||='energy';ext.ui.nutritionTrendPeriod||='30';
  const definition=NUTRITION_TRENDS.metricById(ext.ui.nutritionTrendMetric),today=isoToday(),goals=currentGoals(today),model=NUTRITION_TRENDS.trendModel(ext.diary,{metric:definition.id,period:ext.ui.nutritionTrendPeriod,today,target:goals[definition.targetKey],selectedDate:ext.ui.nutritionTrendSelectedDate||'',maxLabels:innerWidth<520?4:6});
  qa('[data-nutrition-metric]').forEach(button=>{const active=button.dataset.nutritionMetric===model.metric.id;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});qa('[data-nutrition-period]').forEach(button=>button.classList.toggle('active',button.dataset.nutritionPeriod===model.period));
  by('nutrition-trend-title').textContent=`${model.metric.label} Trend`;by('nutrition-trend-chart').innerHTML=nutritionTrendChart(model);
  if(model.selected)ext.ui.nutritionTrendSelectedDate=model.selected.date;
  by('nutrition-trend-selected').innerHTML=model.selected?`<div><span>Selected Recorded Day</span><strong>${formatNumber(model.selected.value,true)} ${esc(model.metric.unit)}</strong><small>${esc(formatDate(model.selected.date))}</small></div><div><span>Foods Included</span><strong>${model.selected.foodCount}</strong><small>Complete ${esc(model.metric.label.toLowerCase())} values</small></div><div><span>Current Daily Target</span><strong>${model.target===null?'Not Available':`${formatNumber(model.target,true)} ${esc(model.metric.unit)}`}</strong><small>Current profile target shown for context</small></div>`:'<strong>No recorded point selected</strong><p>Choose a range containing a complete recorded day.</p>';
  by('nutrition-trend-table').innerHTML=model.records.length?`<div class="history-list">${model.records.slice().reverse().map(record=>`<button type="button" data-nutrition-point-date="${record.date}"><span>${esc(formatDate(record.date))}</span><strong>${formatNumber(record.value,true)} ${esc(model.metric.unit)} · ${record.foodCount} ${record.foodCount===1?'food':'foods'}</strong></button>`).join('')}</div>`:'<p class="empty-state">No complete recorded days in this range.</p>';saveExt();
}
document.addEventListener('click',event=>{const metric=event.target.closest?.('[data-nutrition-metric]');if(metric){ext.ui.nutritionTrendMetric=metric.dataset.nutritionMetric;ext.ui.nutritionTrendSelectedDate='';renderNutritionTrends();return;}const period=event.target.closest?.('[data-nutrition-period]');if(period){ext.ui.nutritionTrendPeriod=period.dataset.nutritionPeriod;renderNutritionTrends();return;}const point=event.target.closest?.('[data-nutrition-point-date]');if(point){ext.ui.nutritionTrendSelectedDate=point.dataset.nutritionPointDate;renderNutritionTrends();}});
document.addEventListener('keydown',event=>{const point=event.target.closest?.('[data-nutrition-point-date]');if(!point||!(event.key==='Enter'||event.key===' '))return;event.preventDefault();ext.ui.nutritionTrendSelectedDate=point.dataset.nutritionPointDate;renderNutritionTrends();});

// Printable report
function initialiseReport(){const to=isoToday(),from=shiftISO(to,-6);by("report-from").value ||= from;by("report-to").value ||= to;}
function reportRows(from,to){return Object.keys(ext.diary).filter(d=>d>=from&&d<=to).sort().map(date=>({date,entries:entriesForDate(date),summary:daySummary(date)}));}
function buildReport(){
  const from=by("report-from").value,to=by("report-to").value;if(!from||!to||from>to){showActionToast("Choose a valid report date range.",null,5000);return;}
  const main=mainData(),rows=reportRows(from,to),foodOn=by("report-food").checked,weightOn=by("report-weight").checked,activityOn=by("report-activity").checked,waterOn=by("report-water").checked;const weights=(main.weightHistory||[]).filter(x=>x.date>=from&&x.date<=to);const activities=ext.exercise.filter(x=>(x.localDate||x.date.slice(0,10))>=from&&(x.localDate||x.date.slice(0,10))<=to);
  by("report-preview").innerHTML=`<header class="report-title"><h1>Healthy Eating Companion Progress Report</h1><p>${formatDate(from)} to ${formatDate(to)}</p><p>${esc(main.personal?.preferredName||main.personal?.fullName||"Founder Tester")}</p></header><section><h2>Plain-English Summary</h2><p>${rows.filter(r=>r.entries.some(e=>e.status==="eaten")).length} days contain food records. Unrecorded days are not counted as zero intake. This founder report is for personal review and is not medical advice.</p></section>${foodOn?`<section><h2>Food & Nutrition</h2>${rows.length?rows.map(r=>`<h3>${formatDate(r.date)}</h3><p><strong>${formatNumber(r.summary.nutrients.calories)} Cal</strong> · Protein ${formatNumber(r.summary.nutrients.protein)} g · Fibre ${formatNumber(r.summary.nutrients.fibre)} g · Sodium ${formatNumber(r.summary.nutrients.sodium)} mg</p><table><thead><tr><th>Meal</th><th>Food</th><th>Status</th><th>Amount</th><th>Cal</th></tr></thead><tbody>${r.entries.map(e=>`<tr><td>${esc(e.meal)}</td><td>${esc(e.name)}</td><td>${esc(statusLabel(e.status))}</td><td>${formatNumber(e.amount,true)} ${esc(e.unitLabel||e.unit)}</td><td>${formatNumber(e.nutrients.calories)}</td></tr>`).join("")}</tbody></table>`).join(""):`<p>No food records in this period.</p>`}</section>`:""}${weightOn?`<section><h2>Weight</h2>${weights.length?`<table><thead><tr><th>Date</th><th>Weight</th><th>Note</th></tr></thead><tbody>${weights.map(w=>`<tr><td>${esc(w.date)}</td><td>${formatNumber(w.weightKg,true)} kg</td><td>${esc(w.note||"")}</td></tr>`).join("")}</tbody></table>`:`<p>No weight entries in this period.</p>`}</section>`:""}${activityOn?`<section><h2>Activity</h2>${activities.length?`<table><thead><tr><th>Date</th><th>Activity</th><th>Minutes</th><th>Raw Energy</th><th>Allowance Credit</th></tr></thead><tbody>${activities.map(a=>`<tr><td>${esc(ACTIVITY.localDateOf(a))}</td><td>${esc(a.name)}</td><td>${formatNumber(a.durationMinutes??a.minutes)}</td><td>${formatNumber(activityRawEnergy(a))} Cal</td><td>${formatNumber(activityAllowanceCredit(a))} Cal</td></tr>`).join("")}</tbody></table>`:`<p>No activity entries in this period.</p>`}</section>`:""}${waterOn?`<section><h2>Hydration & Steps</h2><table><thead><tr><th>Date</th><th>Total Hydration</th><th>Steps</th></tr></thead><tbody>${Object.keys({...ext.diary,...ext.water,...ext.steps}).filter(d=>d>=from&&d<=to).sort().map(d=>`<tr><td>${esc(d)}</td><td>${formatNumber(dayHydration(d).total)} mL</td><td>${formatNumber(ext.steps[d])}</td></tr>`).join("")}</tbody></table></section>`:""}`;
}
by("preview-report")?.addEventListener("click",buildReport);by("print-report")?.addEventListener("click",()=>{buildReport();setTimeout(()=>window.print(),80);});
by("download-data")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify({profile:mainData(),functional:ext},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`healthy-eating-companion-alpha-0-6-13-data-${isoToday()}.json`;a.click();URL.revokeObjectURL(url);});

// Contextual help
const HELP={
  "food-diary":"The Diary is the main place to build your day. Add food directly inside a meal, or tap Suggest to ask the companion for that meal. Every entry counts immediately. If the day changes, edit the amount, replace the food, add something else or delete it. Edit Day opens Normal/Fasting settings only when you need them. Plan Multiple Meals opens the separate bulk planner.",
  "food-library":"Search prioritises exact Australian matches and your own foods. Review the serving size and source before adding. Save Food is labelled in words rather than relying on a bookmark icon.",
  "quick-log":"Quick Voice Log is companion-first and never starts listening automatically. Confirm the date and meal, tap to speak, correct the transcript, then review the matched food and quantity. Nothing is added until you choose Save Once To Diary. If voice is unavailable, use the Diary fallback.",
  "scan-centre":"Barcode photos and live camera scanning can look up products in Open Food Facts. Nutrition-panel OCR fills editable review fields. Meal photos never guess calories; identify and confirm every food before logging.",
  "meal-planner":"Use this screen for bulk planning several meals. For a single Breakfast, Lunch, Dinner or snack suggestion, use Suggest directly inside the Diary. Every food already recorded in the Diary is accounted for before new suggestions are calculated.",
  "daily-progress":"Your recorded meals appear first so you can amend the day quickly. Nutrition bars reflect everything currently in the Diary. Fluids include water and other logged drinks. Estimated moisture in solid foods is shown separately. Update entries whenever the day changes.",
  "progress-history":"Weight Check-In & Progress contains weight only. The range change belongs to the selected graph range; total change always compares the current valid weight with the earliest valid starting record."
};
document.addEventListener("click",event=>{const b=event.target.closest("[data-help]");if(!b)return;const copy=HELP[b.dataset.help]||"Help is available for this screen.";openModal("Help With This Screen",copy,"Close",()=>{});by("a05-modal-confirm").className="primary";if(mainData().companion?.enabled&&typeof window.speakText==="function")window.speakText(copy);});

// Alpha 0.6.16 migration: keep existing records, enforce the five agreed meal categories, and preserve explicit day targets.
function refreshDiaryEnergyPreview(target){const slide=by("diary-day-summary")?.querySelector(".summary-slide");if(!slide)return;const date=diaryDate(),recorded=dayNutrition(date,["eaten","planned"]).calories,exercise=(ext.exercise||[]).filter(x=>ACTIVITY.localDateOf(x)===date).reduce((sum,x)=>sum+activityAllowanceCredit(x),0),goal=n(target)?n(target)+exercise:0;slide.innerHTML=`<span>${date===isoToday()?"Today’s Energy":relativeDateLabel(date).split(" · ")[0]+" Energy"}</span><div class="diary-kpi-row"><div><small>Goal</small><strong>${goal?`${formatNumber(goal)} Cal`:"Needs Review"}</strong></div><div><small>Recorded</small><strong>${formatNumber(recorded)} Cal</strong></div><div><small>Remaining</small><strong>${goal?`${formatNumber(Math.max(0,goal-recorded))} Cal`:"—"}</strong></div></div>`;}
ext.version="0.6.16";Object.keys(ext.diary||{}).forEach(date=>{ext.diary[date]=(ext.diary[date]||[]).filter(entry=>entry&&entry.status!=="skipped").map(entry=>({...entry,status:entry.status==="planned"?"planned":"eaten",meal:(entry.meal==="Morning Tea"||entry.meal==="Afternoon Tea")?"Snacks":(mealNames().includes(entry.meal)?entry.meal:"Other")}));if(!ext.diary[date].length)delete ext.diary[date];});ext.ui.plannerResults={};ext.ui.plannerRejected={};ext.ui.plannerAccepted={};ext.ui.plannerSessionActive=false;ext.dayTypeTargets||={fasting:500};if(!n(ext.dayTypeTargets.fasting))ext.dayTypeTargets.fasting=500;const recoveredNormal=recommendedNormalTarget();if(recoveredNormal){ext.dayTypeTargets.normal=recoveredNormal;ext.dayTypeTargets.normalSource="profile";}else if(ext.dayTypeTargets.normalSource!=="profile"){delete ext.dayTypeTargets.normal;delete ext.dayTypeTargets.normalSource;}Object.values(ext.daySettings||{}).forEach(settings=>{if(!settings)return;if(settings.type==="normal"&&!settings.customTarget){if(recoveredNormal)settings.targetCal=recoveredNormal;else delete settings.targetCal;}if(settings.customTarget===undefined)settings.customTarget=false;});normaliseShoppingCategories();saveExt();

// Initial setup and integration
function init(){
  // Postal address behaviour and Alpha 0.6.2 profile extensions
  const postalSame=by("postal-same"),postalFields=by("postal-fields");const togglePostal=()=>postalFields?.classList.toggle("hidden",postalSame?.checked);postalSame?.addEventListener("change",togglePostal);togglePostal();
  const dietaryIds=["food-allergies","food-intolerances","medical-restrictions","eating-pattern","pregnancy-status","cultural-restrictions"];
  by("personal-next")?.addEventListener("click",()=>setTimeout(()=>{const d=mainData();d.personal=Object.assign(d.personal||{},{postalSame:postalSame?.checked,postalCountry:by("postal-country")?.value,postalRegion:by("postal-region")?.value,postalPostcode:by("postal-postcode")?.value,postalSuburb:by("postal-suburb")?.value,postalStreet:by("postal-street")?.value});localStorage.setItem(MAIN_KEY,JSON.stringify(d));},30));
  by("calculate-button")?.addEventListener("click",()=>setTimeout(()=>{const d=mainData();d.dietary=Object.assign({},d.dietary||{},Object.fromEntries(dietaryIds.map(id=>[id,by(id)?.value||""])));localStorage.setItem(MAIN_KEY,JSON.stringify(d));syncActivityCreditPolicy();},30));
  const d=mainData(),p=d.personal||{};if(postalSame){postalSame.checked=p.postalSame!==false;[["postal-country","postalCountry"],["postal-region","postalRegion"],["postal-postcode","postalPostcode"],["postal-suburb","postalSuburb"],["postal-street","postalStreet"]].forEach(([id,key])=>{if(by(id))by(id).value=p[key]||""});togglePostal();}dietaryIds.forEach(id=>{if(by(id))by(id).value=d.dietary?.[id]||""});
  initialiseDateControls();ensureActivityCreditPolicy();resetActivityForm();loadAfcdFoods();renderRecipeSelectOptions();renderScanSelect();renderHomeSummary();
  // Ensure earlier founder profiles can migrate without losing functional data.
  saveExt();
  if(mainData().completed){const profile=mainData();openFeature("home");if(profile.firstHomePending){profile.firstHomePending=false;localStorage.setItem(MAIN_KEY,JSON.stringify(profile));}}
}

/* ===== Alpha 0.6.16 integrated founder-testing refinements ===== */
const DAY_MS=86400000;
const el=id=>document.getElementById(id);
const norm=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const safe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

/* ---------- 1. Migration / version ---------- */
function migrate612(){
  try{
    ext.version=ACTIVE_VERSION;
    ext.ui ||= {};
    ext.foodVerification ||= {};
    ext.sharedImports ||= [];
    ext.connections ||= {};
    ext.connections.future ||= {appleHealth:false,healthConnect:false,social:false,cloudAccount:false};
    const main=mainData();
    main.version=ACTIVE_VERSION;
    window.HECMigrations.repairLegacyProfileStart(main);
    localStorage.setItem(MAIN_KEY,JSON.stringify(main));
    saveExt();
  }catch(error){console.warn('Alpha 0.6.16 migration',error);}
}
migrate612();

/* ---------- 2. Better natural food units ---------- */
const oldUnitOptions=unitOptions;
const oldDefaultUnit=defaultUnit;
function addNaturalUnit(food,key,label,multiplier){
  if(!food||!Number.isFinite(multiplier)||multiplier<=0)return;
  food.units ||= {};
  food.unitLabels ||= {};
  if(food.units[key]===undefined)food.units[key]=multiplier;
  if(!food.unitLabels[key])food.unitLabels[key]=label;
}
function enrichNaturalUnits(food){
  if(!food)return food;
  const name=norm(`${food.name} ${food.brand||''}`), serving=norm(food.serving||'');
  const baseUnits=food.units||{};
  const gPerServe=baseUnits.g?1/baseUnits.g:0;
  const mlPerServe=baseUnits.mL?1/baseUnits.mL:0;
  if(/\bbanana\b/.test(name)&&baseUnits.item===undefined&&gPerServe)addNaturalUnit(food,'item','Medium Banana (150 g Australian standard fruit serve)',150/gPerServe);
  if(/\bapple\b/.test(name)&&baseUnits.item===undefined&&gPerServe)addNaturalUnit(food,'item','Medium Apple (150 g Australian standard fruit serve)',150/gPerServe);
  if(/\borange\b/.test(name)&&baseUnits.item===undefined&&gPerServe)addNaturalUnit(food,'item','Medium Orange (150 g Australian standard fruit serve)',150/gPerServe);
  if(/\bavocado\b/.test(name)&&gPerServe){if(baseUnits.half===undefined)addNaturalUnit(food,'half','Half Avocado (about 100 g)',100/gPerServe);}
  if(/\b(bar|protein bar|muesli bar|snack bar)\b/.test(name)&&baseUnits.serve!==undefined&&baseUnits.bar===undefined){addNaturalUnit(food,'bar',`Bar${gPerServe?` (${Math.round(gPerServe)} g)`:''}`,baseUnits.serve);}
  if(/\b(cappuccino|coffee mix|instant coffee|hot chocolate)\b/.test(name)&&gPerServe>0&&gPerServe<=60&&baseUnits.serve!==undefined&&baseUnits.sachet===undefined){addNaturalUnit(food,'sachet',`Sachet (${Number(gPerServe.toFixed(1))} g)`,baseUnits.serve);}
  if(/\b(yoghurt|yogurt)\b/.test(name)&&gPerServe&&gPerServe<=250&&baseUnits.tub===undefined)addNaturalUnit(food,'tub',`Tub (${Math.round(gPerServe)} g)`,1);
  if(/\b(bottle|drink)\b/.test(name)&&mlPerServe&&baseUnits.bottle===undefined)addNaturalUnit(food,'bottle',`Bottle (${Math.round(mlPerServe)} mL)`,1);
  if(/\b(can|canned|tinned)\b/.test(name)&&gPerServe&&baseUnits.can===undefined)addNaturalUnit(food,'can',`Can (${Math.round(gPerServe)} g)`,1);
  return food;
}
unitOptions=function(food){return enrichNaturalUnits(food)?.units||oldUnitOptions(food);};
defaultUnit=function(food){
  enrichNaturalUnits(food);
  const name=norm(`${food?.name||''} ${food?.brand||''}`);
  if(food?.units?.bar!==undefined&&/\bbar\b/.test(name))return 'bar';
  if(food?.units?.sachet!==undefined&&/cappuccino|coffee mix|instant coffee|hot chocolate/.test(name))return 'sachet';
  return oldDefaultUnit(food);
};

/* Enrich Open Food Facts results with package language where available. */
const oldMakeOFF=makeOpenFoodFactsFood;
makeOpenFoodFactsFood=function(product){
  const food=oldMakeOFF(product);
  food.packageQuantity=product.quantity||'';
  food.packagingText=product.packaging_text||'';
  const serving=String(product.serving_size||'');
  const qty=String(product.quantity||'');
  const combined=`${serving} ${qty} ${product.product_name||''} ${product.categories||''} ${(product.categories_tags||[]).join(' ')}`;
  const gPerServe=food.units?.g?1/food.units.g:0;
  const unitMatch=combined.match(/(?:^|\b)(?:1\s*)?(bar|sachet|packet|pouch|biscuit|cracker|slice|piece|tub|bottle|can|capsule|pod)\b/i);
  if(unitMatch&&food.units?.serve!==undefined){
    const key=norm(unitMatch[1]).replace(/\s/g,'');
    const label=unitMatch[1].charAt(0).toUpperCase()+unitMatch[1].slice(1).toLowerCase();
    addNaturalUnit(food,key,`${label}${gPerServe?` (${Number(gPerServe.toFixed(1))} g)`:''}`,1);
    food.defaultUnit=key; food.defaultAmount=1;
  }
  if(/\b(bar|bars|protein bars|cereal bars|snack bars)\b/i.test(combined)&&food.units?.serve!==undefined&&food.units.bar===undefined){addNaturalUnit(food,'bar',`Bar${gPerServe?` (${Number(gPerServe.toFixed(1))} g)`:''}`,1);food.defaultUnit='bar';food.defaultAmount=1;}
  const packMatch=qty.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|ml)/i);
  if(packMatch&&food.units?.serve!==undefined){
    const count=Number(packMatch[1]);
    if(count>1){food.packCount=count;food.packUnit=food.defaultUnit||'serve';}
  }
  enrichNaturalUnits(food);
  return food;
};

/* Make barcode lookup request the fields needed for natural package units. */
const originalFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  if(typeof input==='string'&&input.includes('world.openfoodfacts.org/api/v2/product/')&&input.includes('fields=')){
    try{
      const url=new URL(input);const fields=(url.searchParams.get('fields')||'').split(',');
      ['quantity','product_quantity','product_quantity_unit','packaging_text','categories','categories_tags'].forEach(f=>{if(!fields.includes(f))fields.push(f);});
      url.searchParams.set('fields',fields.join(','));input=url.toString();
    }catch{}
  }
  return originalFetch(input,init);
};

/* ---------- 3. Search ranking: identity first, saved/verified first, common typo normalisation ---------- */
function searchNorm(value){
  return norm(value).replace(/\bcappucino\b/g,'cappuccino').replace(/\bcappacino\b/g,'cappuccino').replace(/\bcapuccino\b/g,'cappuccino');
}
const oldSearchRank=searchRank;
searchRank=function(food,query){
  const q=searchNorm(query);if(!q)return 1;
  enrichNaturalUnits(food);
  const name=searchNorm(food.name),brand=searchNorm(food.brand),aliases=(food.aliases||[]).map(searchNorm);
  let rank=oldSearchRank(food,q);
  if(name===q)rank=Math.max(rank,1600);
  else if(name.startsWith(q))rank=Math.max(rank,1450);
  else if(aliases.includes(q))rank=Math.max(rank,1425);
  const firstWord=name.split(' ')[0];
  if(firstWord===q)rank+=170;
  if(ext.savedFoodIds?.includes(food.id))rank+=500;
  if(food.source==='User Created'||food.brand==='My Recipe')rank+=360;
  if(food.country==='Australia')rank+=100;
  if(food.verified||ext.foodVerification?.[food.id]?.packageVerifiedAt)rank+=160;
  const flavourOnly=/gelato|ice cream|cake|dessert|chocolate|confection|flavour|flavor/.test(name)&&!name.startsWith(q);
  if(flavourOnly&&name.includes(q))rank-=350;
  return Math.max(0,rank);
};

/* ---------- 4. Profile-aware suggestion safety and preference ranking ---------- */
function splitPrefs(value){return String(value||'').split(/[,;\n]+/).map(part=>norm(part)).filter(s=>s.length>1);}
function containsAny(hay,terms){return terms.filter(t=>t&&hay.includes(t));}
foodSafety=function(food){
  const main=mainData(),d=main.dietary||{};
  const hay=norm([food?.name,food?.brand,food?.category,food?.ingredients,Array.isArray(food?.allergens)?food.allergens.join(' '):food?.allergens].filter(Boolean).join(' '));
  const restrictions=[...splitPrefs(d['food-allergies']),...splitPrefs(d['food-intolerances']),...splitPrefs(d['foods-never']),...splitPrefs(d['cultural-restrictions']),...splitPrefs(d['medical-restrictions']).filter(x=>/avoid|allerg|intoler|no |without|free/.test(x))];
  const direct=containsAny(hay,restrictions);
  if(direct.length)return {blocked:true,message:`Profile restriction match: ${direct.join(', ')}.`};
  const pattern=norm(d['eating-pattern']);
  const meat=/\b(beef|veal|lamb|pork|bacon|ham|chicken|turkey|duck|sausage|salami|meat)\b/.test(hay);
  const fish=/\b(fish|tuna|salmon|prawn|shrimp|seafood|sardine|cod|barramundi)\b/.test(hay);
  const animal=/\b(egg|milk|dairy|cheese|yoghurt|yogurt|cream|butter|honey)\b/.test(hay)||meat||fish;
  if(pattern==='vegetarian'&&(meat||fish))return {blocked:true,message:'Your Vegetarian eating pattern excludes this suggestion.'};
  if(pattern==='vegan'&&animal)return {blocked:true,message:'Your Vegan eating pattern excludes this suggestion.'};
  if(pattern==='pescatarian'&&meat)return {blocked:true,message:'Your Pescatarian eating pattern excludes this suggestion.'};
  if(pattern==='halal'&&/\b(pork|bacon|ham|prosciutto)\b/.test(hay))return {blocked:true,message:'Your Halal preference excludes this food.'};
  if(pattern==='kosher'&&/\b(pork|bacon|ham|shellfish|prawn|shrimp)\b/.test(hay))return {blocked:true,message:'Your Kosher preference excludes this food.'};
  return {blocked:false,message:''};
};
const oldPlannerCandidateScore=plannerCandidateScore;
plannerCandidateScore=function(suggestion,meal,target){
  let score=oldPlannerCandidateScore(suggestion,meal,target);
  const d=mainData().dietary||{};
  const love=splitPrefs(d['foods-love']),like=splitPrefs(d['foods-like']),dislike=splitPrefs(d['foods-dislike']);
  for(const item of suggestion.items||[]){
    const food=getFood(item.foodId),hay=norm(`${food?.name||''} ${food?.brand||''} ${food?.ingredients||''}`);
    if(containsAny(hay,love).length)score-=0.35;
    if(containsAny(hay,like).length)score-=0.16;
    if(containsAny(hay,dislike).length)score+=0.42;
  }
  return score;
};

/* ---------- 5. Voice/Text review gets editable amount + unit and understands quantities ---------- */
const oldParseVoice=parseVoice;
function spokenQuantity(text){
  const t=norm(text);const words={half:.5,a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
  const m=t.match(/^(half|a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+(?:\.\d+)?)\b/);return m?(Number(m[1])||words[m[1]]||1):1;
}
function spokenUnit(text){const t=norm(text);for(const [re,u] of [[/\bbars?\b/,'bar'],[/\bsachets?\b/,'sachet'],[/\bbiscuits?\b/,'biscuit'],[/\bslices?\b/,'slice'],[/\bbananas?\b/,'item'],[/\boranges?\b/,'item'],[/\bapples?\b/,'item'],[/\beggs?\b/,'item'],[/\bgrams?\b|\bg\b/,'g'],[/\bml\b|millilitres?|milliliters?/,'mL']])if(re.test(t))return u;return '';}
function searchTextWithoutQuantity(text){return norm(text).replace(/^(half|a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+(?:\.\d+)?)\s+/,'').replace(/\b(pieces?|bars?|sachets?|biscuits?|slices?|grams?|millilitres?|milliliters?)\b/g,' ').replace(/\s+/g,' ').trim();}
parseVoice=function(text){
  let parsed=oldParseVoice(text);
  const qty=spokenQuantity(text),askedUnit=spokenUnit(text);
  if(!parsed.items?.length){
    const query=searchTextWithoutQuantity(text).replace(/\b(add|log|record|please|for|to|my|the|breakfast|lunch|dinner|snacks?|other)\b/g,' ').replace(/\s+/g,' ').trim();
    const ranked=allFoods().filter(f=>f.category!=='Recipe').map(food=>({food,rank:searchRank(food,query)})).filter(x=>x.rank>=620).sort((a,b)=>b.rank-a.rank);
    if(ranked.length){const food=enrichNaturalUnits(ranked[0].food);let unit=askedUnit&&unitOptions(food)[askedUnit]!==undefined?askedUnit:defaultUnit(food);parsed.items=[{foodId:food.id,amount:qty||defaultAmount(food),unit,heard:String(text||'')}];}
  }else{
    parsed.items=parsed.items.map(item=>{const food=enrichNaturalUnits(getFood(item.foodId));let unit=askedUnit&&unitOptions(food)[askedUnit]!==undefined?askedUnit:item.unit;if(qty!==1||/^\s*(a|an|one|1)\b/i.test(String(text||'')))return {...item,amount:qty,unit};return item;});
  }
  return parsed;
};
renderVoiceReview=function(){
  el('voice-review')?.classList.remove('hidden');if(el('voice-meal'))el('voice-meal').value=voiceParsed.meal||'';
  const target=el('voice-review-items');if(!target)return;
  target.innerHTML=voiceParsed.items?.length?voiceParsed.items.map((item,index)=>{const food=enrichNaturalUnits(getFood(item.foodId)),values=scaledNutrients(food,item.amount,item.unit);return `<div class="voice-review-row voice-editable-row"><div class="voice-food-title"><strong>${safe(food.name)}</strong><small>${formatNumber(values.calories)} Cal</small></div><label>Amount<input type="number" min="0.1" step="0.1" value="${safe(item.amount)}" data-voice-amount="${index}"></label><label>Unit<select data-voice-unit="${index}">${Object.keys(unitOptions(food)).map(u=>`<option value="${safe(u)}" ${u===item.unit?'selected':''}>${safe(unitLabel(food,u))}</option>`).join('')}</select></label><button data-remove-voice-item="${index}" class="delete-action">Remove</button></div>`;}).join(''):`<p class="empty-state">No confident food match was identified. Correct the text or search the Food Library.</p>`;
};
document.addEventListener('input',event=>{const input=event.target.closest('[data-voice-amount]');if(!input)return;const i=Number(input.dataset.voiceAmount);if(voiceParsed.items?.[i]){voiceParsed.items[i].amount=Math.max(.1,Number(input.value)||1);renderVoiceReview();}});
document.addEventListener('change',event=>{const select=event.target.closest('[data-voice-unit]');if(!select)return;const i=Number(select.dataset.voiceUnit);if(voiceParsed.items?.[i]){voiceParsed.items[i].unit=select.value;voiceParsed.items[i].amount=1;renderVoiceReview();}});

/* ---------- 6. Daily Progress: remove redundant Recorded/Open Meal badges ---------- */
const oldRenderDailyProgress=renderDailyProgress;
renderDailyProgress=function(){oldRenderDailyProgress();document.querySelectorAll('#daily-meal-status .meal-progress-state').forEach(x=>x.remove());const copy=el('daily-meals-copy');if(copy)copy.textContent='Tap any meal to view, add or change its entries.';};

/* ---------- 8. Completed food-entry transactions cannot be accidentally re-submitted ---------- */
const oldPrepareEntry=prepareEntry;
prepareEntry=function(food,opts={}){oldPrepareEntry(food,opts);if(editorState){editorState.transactionId=`tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;editorState.completed=false;}const b=el('save-food-entry');if(b)b.disabled=false;const b2=el('save-food-entry-and-food');if(b2)b2.disabled=false;};
const oldSaveEditorEntry=saveEditorEntry;
saveEditorEntry=function(andSaveFood=false){
  if(editorState?.completed){showActionToast('This entry has already been added. Choose the food again if you intentionally want another serving.',null,5000);return;}
  const editing=!!editorState?.entryId;const beforeCount=Object.values(ext.diary||{}).reduce((sum,list)=>sum+(list?.length||0),0);oldSaveEditorEntry(andSaveFood);const afterCount=Object.values(ext.diary||{}).reduce((sum,list)=>sum+(list?.length||0),0);
  if(editorState&&!editing&&afterCount>beforeCount){editorState.completed=true;const b=el('save-food-entry');if(b){b.disabled=true;b.textContent='Added ✓';}const b2=el('save-food-entry-and-food');if(b2)b2.disabled=true;}
};

/* ---------- 9. Barcode/package verification metadata + compare path ---------- */
function markFoodVerified(foodId,method='package'){if(!foodId)return;ext.foodVerification[foodId]={...(ext.foodVerification[foodId]||{}),packageVerifiedAt:new Date().toISOString(),method};saveExt();}
const oldToggleSavedFood=toggleSavedFood;
toggleSavedFood=function(id){const wasSaved=ext.savedFoodIds.includes(id);oldToggleSavedFood(id);if(!wasSaved){const f=getFood(id);if(f?.barcode)ext.foodVerification[id] ||= {savedAt:new Date().toISOString(),method:'barcode-online'};saveExt();}};
function compareNutrients(food,parsed){
  const panel=parsed?.perServing||{},online=food?.nutrients||{};const keys=[['calories','Calories','Cal'],['protein','Protein','g'],['carbs','Carbohydrate','g'],['fat','Fat','g'],['satFat','Saturated Fat','g'],['fibre','Fibre','g'],['sugar','Sugars','g'],['sodium','Sodium','mg']];
  return keys.filter(([k])=>Number.isFinite(Number(panel[k]))&&Number(panel[k])>0).map(([k,label,unit])=>{const a=Number(online[k]||0),b=Number(panel[k]||0),diff=b-a,pct=a?Math.abs(diff)/Math.abs(a)*100:Infinity;return {k,label,unit,online:a,panel:b,diff,pct,close:pct<=5||Math.abs(diff)<(k==='sodium'?5:.2)};});
}
document.addEventListener('click',event=>{if(!event.target.closest('[data-compare-barcode-panel]'))return;const id=event.target.closest('[data-compare-barcode-panel]').dataset.compareBarcodePanel,food=scanBarcodeFood?.id===id?scanBarcodeFood:getFood(id);if(food)keepCapturedFoodAvailable(food,{save:false});ext.ui.compareBarcodeFoodId=id;ext.ui.scanMode='label';saveExt();updateScanModeUI();el('label-tools')?.scrollIntoView({behavior:'smooth',block:'start'});showActionToast('Photograph the package Nutrition Information Panel. The Companion will compare it with the barcode record.',null,5000);});
const oldLookupBarcodeProduct=lookupBarcodeProduct;
lookupBarcodeProduct=async function(code){const food=await oldLookupBarcodeProduct(code);if(food&&el('scan-food-preview')){el('scan-food-preview').insertAdjacentHTML('beforeend',`<button type="button" class="secondary wide compare-package-button" data-compare-barcode-panel="${safe(food.id)}">Compare With Nutrition Panel</button>`);}return food;};
document.addEventListener('click',event=>{
  const keep=event.target.closest('[data-keep-barcode-values]'),use=event.target.closest('[data-use-package-values]');if(!keep&&!use)return;const id=(keep||use).dataset.keepBarcodeValues||(keep||use).dataset.usePackageValues;const food=getFood(id);if(!food)return;
  if(use){const model=alpha08OcrModel(),packageValues=model?.perServing?.calories!==null?model.perServing:P8?.calculatedServingFrom100?.(model),energy=packageValues?.calories;if(energy===null||energy===undefined||energy===''||!Number.isFinite(Number(energy))){showActionToast('Confirm A Usable Current-Package Energy Value Before Using It.',null,5000);return;}food.nutrients={...food.nutrients,...packageValues};if(model?.servingAmount){food.serving=`${formatNumber(model.servingAmount,true)} ${model.servingUnit}`;food.units={serve:1,[model.servingUnit]:1/model.servingAmount};food.unitLabels={serve:`Serve (${food.serving})`,[model.servingUnit]:model.servingUnit};enrichNaturalUnits(food);}food.source='Current Package Nutrition Panel · User Checked';food.verificationStatus='package-confirmed';upsertOnlineFoods([food]);}
  markFoodVerified(id,use?'nutrition-panel-confirmed':'barcode-package-check');ext.ui.compareBarcodeFoodId='';saveExt();by('ocr-review')?.querySelector('.barcode-panel-comparison')?.remove();alpha08UpdateOcrReview();showActionToast(use?'Checked current-package values saved for this food.':'Barcode values kept after comparison.',null,3000);renderScanSelect();
});

/* ---------- 10. Periodic re-verification prompt ---------- */
function staleSavedFoods(){const now=Date.now();return (ext.savedFoodIds||[]).map(id=>({id,food:getFood(id),meta:ext.foodVerification?.[id]})).filter(x=>x.food&&(x.food.barcode||x.meta?.method)).filter(x=>{const stamp=x.meta?.packageVerifiedAt||x.meta?.savedAt;return stamp&&(now-new Date(stamp).getTime())>180*DAY_MS;});}
function maybePromptFoodReview(){const stale=staleSavedFoods();if(!stale.length)return;const last=Number(ext.ui.lastFoodReviewPromptAt||0);if(Date.now()-last<30*DAY_MS)return;ext.ui.lastFoodReviewPromptAt=Date.now();saveExt();setTimeout(()=>{openModal('Review Saved Package Foods?',`${stale.length} saved ${stale.length===1?'food has':'foods have'} not been checked against a package for more than six months. Manufacturers sometimes change recipes or serving sizes.`,'Review My Foods',()=>{ext.ui.libraryTab='saved';ext.ui.foodSearch='';saveExt();openFeature('food-library');showActionToast('Open a saved packaged food, then scan its barcode or compare its current Nutrition Panel.',null,5000);},`<p>You can keep using these foods. Nothing expires automatically.</p><ul class="compact-list">${stale.slice(0,6).map(x=>`<li>${safe(x.food.name)}</li>`).join('')}</ul>`);const cancel=el('a05-modal-cancel');if(cancel)cancel.textContent='Remind Me Later';},1200);}

/* ---------- 11. Sharing foods, meals, recipes now via a portable HEC package ---------- */
function downloadBlob(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function sharePackage(payload,label){const text=JSON.stringify(payload,null,2),file=new File([text],`${label.replace(/[^a-z0-9]+/gi,'_')}.hec.json`,{type:'application/json'});if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({title:`Healthy Eating Companion — ${label}`,text:'Shared from Healthy Eating Companion',files:[file]});return;}catch(e){if(e?.name==='AbortError')return;}}downloadBlob(file.name,file);showActionToast('Share package prepared. Send the file to the other Companion user.',null,4000);}
function foodSharePayload(id){const food=getFood(id);if(!food)return null;return {format:'HEC-SHARE-1',kind:'food',sharedAt:new Date().toISOString(),item:clone(food),verification:clone(ext.foodVerification?.[id]||{})};}
function recipeSharePayload(id){const r=ext.recipes.find(x=>x.id===id);return r?{format:'HEC-SHARE-1',kind:'recipe',sharedAt:new Date().toISOString(),item:clone(r)}:null;}
function mealSharePayload(id){const m=ext.mealTemplates.find(x=>x.id===id);return m?{format:'HEC-SHARE-1',kind:'meal',sharedAt:new Date().toISOString(),item:clone(m)}:null;}
const oldShowFoodDetails=showFoodDetails;
showFoodDetails=function(id){oldShowFoodDetails(id);const food=getFood(id),meta=ext.foodVerification?.[id];const extra=el('a05-modal-extra');if(extra&&meta&&!extra.querySelector('.food-verification-detail')){const stamp=meta.packageVerifiedAt||meta.savedAt;extra.insertAdjacentHTML('beforeend',`<p class="fine food-verification-detail"><strong>Package Record:</strong> ${meta.packageVerifiedAt?'Package Verified':'Barcode/Panel Saved'}${stamp?` · Last checked ${safe(new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(new Date(stamp)))}`:''}</p>`);}if(!ext.savedFoodIds.includes(id)&&!food?.barcode)return;if(extra&&!extra.querySelector('[data-share-food]'))extra.insertAdjacentHTML('beforeend',`<button type="button" class="secondary wide" data-share-food="${safe(id)}">Share This Food</button>`);};
const oldRenderMealLibrary=renderMealLibrary;
renderMealLibrary=function(query=''){oldRenderMealLibrary(query);document.querySelectorAll('[data-meal-add]').forEach(btn=>{const row=btn.closest('.resource-row');if(!row||row.querySelector('[data-share-meal]'))return;row.insertAdjacentHTML('beforeend',`<button class="resource-share" type="button" data-share-meal="${safe(btn.dataset.mealAdd)}" aria-label="Share saved meal">↗</button>`);});};
const oldRenderRecipeLibrary=renderRecipeLibrary;
renderRecipeLibrary=function(query=''){oldRenderRecipeLibrary(query);for(const r of ext.recipes){const row=document.querySelector(`[data-food-details="${CSS.escape(r.id)}"]`)?.closest('.resource-row');if(row&&!row.querySelector('[data-share-recipe]'))row.insertAdjacentHTML('beforeend',`<button class="resource-share" type="button" data-share-recipe="${safe(r.id)}" aria-label="Share recipe">↗</button>`);}};
document.addEventListener('click',event=>{const f=event.target.closest('[data-share-food]'),m=event.target.closest('[data-share-meal]'),r=event.target.closest('[data-share-recipe]');if(f){const p=foodSharePayload(f.dataset.shareFood);if(p)sharePackage(p,p.item.name);return;}if(m){const p=mealSharePayload(m.dataset.shareMeal);if(p)sharePackage(p,p.item.name);return;}if(r){const p=recipeSharePayload(r.dataset.shareRecipe);if(p)sharePackage(p,p.item.name);return;}});
function installSharingImportUI(){const page=document.querySelector('#family-connections main');if(!page||el('hec-share-import'))return;page.insertAdjacentHTML('beforeend',`<div class="card"><h3>Share Foods, Meals & Recipes</h3><p>Portable Companion share files let another user copy an item into their own private library without sharing your Diary, weight or profile.</p><label class="secondary file-button">Import A Shared Companion Item<input id="hec-share-import" type="file" accept="application/json,.json" hidden></label><p id="hec-share-import-status" class="fine"></p></div><div class="card"><h3>My Devices</h3><p><strong>Automatic iPhone/iPad sync needs the future secure cloud account service.</strong> Until that service is connected, use a full backup file to move a current copy between devices.</p><button id="share-full-device-copy" class="secondary" type="button">Share A Full Device Copy</button><label class="secondary file-button">Restore A Full Device Copy<input id="restore-full-device-copy" type="file" accept="application/json,.json" hidden></label><p class="fine">This is a manual transfer, not live automatic sync. Restoring replaces the data on this device.</p></div>`);
  el('hec-share-import')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const p=JSON.parse(await file.text());if(p.format!=='HEC-SHARE-1')throw new Error('Not a Companion share file');if(p.kind==='food'){const item=p.item;item.id=`shared-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;item.source=`Shared Copy · ${item.source||''}`;ext.customFoods.push(item);ext.savedFoodIds.push(item.id);if(p.verification)ext.foodVerification[item.id]=p.verification;}else if(p.kind==='recipe'){const item=p.item;item.id=`recipe-${Date.now().toString(36)}`;ext.recipes.push(item);}else if(p.kind==='meal'){const item=p.item;item.id=`meal-${Date.now().toString(36)}`;ext.mealTemplates.push(item);}else throw new Error('Unsupported shared item');ext.sharedImports.unshift({kind:p.kind,name:p.item?.name||'Shared item',importedAt:new Date().toISOString()});saveExt();el('hec-share-import-status').textContent=`${p.item?.name||'Item'} copied into this Companion.`;}catch(err){el('hec-share-import-status').textContent=`Could not import: ${err.message}`;}finally{e.target.value='';}});
  el('share-full-device-copy')?.addEventListener('click',async()=>{const payload={format:'HEC-BACKUP-1',version:ACTIVE_VERSION,installationRole:APP.installationRole,exportedAt:new Date().toISOString(),profile:JSON.parse(localStorage.getItem(MAIN_KEY)||'{}'),functional:JSON.parse(localStorage.getItem(EXT_KEY)||'{}')};await sharePackage(payload,`${APP.displayName} Device Copy`);});
  el('restore-full-device-copy')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const p=JSON.parse(await file.text());if(!p.profile||!p.functional)throw new Error('Not a complete Companion backup');if(APP.installationRole==='my-data'&&p.installationRole==='test')throw new Error('A HEC — TEST backup cannot replace HEC — My Data');if(!confirm(`Replace the data in ${APP.displayName} with this backup?`))return;localStorage.setItem(MAIN_KEY,JSON.stringify(p.profile));localStorage.setItem(EXT_KEY,JSON.stringify(p.functional));location.reload();}catch(err){alert(`Could not restore: ${err.message}`);}finally{e.target.value='';}});
}
installSharingImportUI();

/* ---------- 12. Stronger local persistence mirror (normal browsing); warn about Private Browsing ---------- */
const DB_NAME=APP.mirrorDatabaseName;
function openMirror(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(new Error('IndexedDB unavailable'));const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('kv'))req.result.createObjectStore('kv');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function mirrorWrite(){try{if(resetInProgress)return;const db=await openMirror(),tx=db.transaction('kv','readwrite'),s=tx.objectStore('kv');s.put(localStorage.getItem(MAIN_KEY)||'',MAIN_KEY);s.put(localStorage.getItem(EXT_KEY)||'',EXT_KEY);s.put(new Date().toISOString(),'savedAt');await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});db.close();}catch{}}
async function clearPersistentMirror(){try{const db=await openMirror(),tx=db.transaction('kv','readwrite');tx.objectStore('kv').clear();await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});db.close();}catch{}}
async function mirrorRestoreIfNeeded(){try{let resetReloadPending=false;try{resetReloadPending=sessionStorage.getItem(RESET_RELOAD_SESSION_KEY)==='1';if(resetReloadPending)sessionStorage.removeItem(RESET_RELOAD_SESSION_KEY);}catch{}if(resetReloadPending)return false;const current=JSON.parse(localStorage.getItem(MAIN_KEY)||'{}');if(current.completed)return false;const db=await openMirror(),tx=db.transaction('kv','readonly'),s=tx.objectStore('kv'),get=k=>new Promise((res,rej)=>{const r=s.get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});const mainRaw=await get(MAIN_KEY),extRaw=await get(EXT_KEY);db.close();if(mainRaw){const m=JSON.parse(mainRaw);if(m.completed){localStorage.setItem(MAIN_KEY,mainRaw);if(extRaw)localStorage.setItem(EXT_KEY,extRaw);location.reload();return true;}}}catch{}return false;}
window.addEventListener('pagehide',mirrorWrite);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')mirrorWrite();});setInterval(mirrorWrite,2500);
navigator.storage?.persist?.().catch(()=>{});
mirrorRestoreIfNeeded();mirrorWrite();
function addPersistenceNotice(){
  if(el('hec-private-storage-note'))return;const host=document.querySelector('#settings main')||document.querySelector('#welcome .welcome-card');if(!host)return;host.insertAdjacentHTML('afterbegin',`<div id="hec-private-storage-note" class="status-box storage-safety-note"><strong>Saving Your Companion Data</strong><p>Use Healthy Eating Companion in a normal Safari tab or Home Screen app. <strong>Private Browsing can delete website data when private tabs are closed</strong>, which no website can override. HEC also keeps a second local IndexedDB mirror when the browser allows it.</p></div>`);
}
addPersistenceNotice();

/* ---------- 13. Onboarding/profile future connection architecture (hidden for now) ---------- */
try{const main=mainData();main.futureConnections ||= {health:{appleHealth:false,healthConnect:false,wearables:false},sharing:{household:false,communityFoods:false},social:{enabled:false,providers:[]}};localStorage.setItem(MAIN_KEY,JSON.stringify(main));}catch{}

/* ---------- 14. Scan/saved-food verification metadata ---------- */
document.addEventListener('click',event=>{const addSave=event.target.closest('#save-food-entry-and-food');if(!addSave||!editorState?.foodId)return;const f=getFood(editorState.foodId);if(f?.barcode)setTimeout(()=>{ext.foodVerification[f.id]={...(ext.foodVerification[f.id]||{}),savedAt:new Date().toISOString(),method:'barcode-online'};saveExt();},50);});

/* ---------- 16. UI copy / version ---------- */
document.querySelectorAll('.badge').forEach(b=>{if(APP.installationRole==='test')b.textContent=`HEC — TEST · Alpha ${ACTIVE_VERSION}`;else if(/Founder Trial/.test(b.textContent))b.textContent=`Founder Trial · Alpha ${ACTIVE_VERSION}`;else if(/Healthy Eating Companion/.test(b.textContent))b.textContent=`Healthy Eating Companion · Alpha ${ACTIVE_VERSION}`;});
if(document.title.includes('Founder Trial'))document.title=`${APP.displayName||APP.name} — Founder Trial Alpha ${ACTIVE_VERSION}`;
setTimeout(()=>{if(mainData().completed)maybePromptFoodReview();if(document.querySelector('#weight-history'))renderWeightHistoryOnly();if(document.querySelector('#progress-history.active'))renderHistory(currentPeriod());},300);

/* ---------- Alpha 0.6.16 focused founder-testing refinements ---------- */
  const LIBRARY_BACKUP_KEY = APP.protectedLibraryKey;
  const RESET_STORAGE_KEYS = window.HECInstallation.resetStorageKeys(APP,'keep-library');
  const FULL_RESET_STORAGE_KEYS = window.HECInstallation.resetStorageKeys(APP,'full');
  const $ = id => document.getElementById(id);
  const safeText = value => (typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const finite = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
  const nutrientKeys = [
    ['calories','Calories','Cal'],['protein','Protein','g'],['carbs','Carbohydrate','g'],['fat','Fat','g'],
    ['satFat','Saturated Fat','g'],['fibre','Fibre','g'],['sugar','Sugars','g'],['sodium','Sodium','mg']
  ];

  // Restore a deliberately protected personal library after a testing reset.
  function protectedLibrary(){ try { return JSON.parse(localStorage.getItem(LIBRARY_BACKUP_KEY)||'null'); } catch { return null; } }
  function saveProtectedLibrary(){
    const saved = new Set(ext.savedFoodIds || []);
    const onlineFoods = (ext.onlineFoods || []).filter(f => saved.has(f.id));
    const payload = {
      version:ACTIVE_VERSION, savedAt:new Date().toISOString(),
      customFoods: clone(ext.customFoods || []),
      onlineFoods: clone(onlineFoods),
      savedFoodIds: clone(ext.savedFoodIds || []),
      foodVerification: clone(ext.foodVerification || {}),
      recipes: clone(ext.recipes || []),
      mealTemplates: clone(ext.mealTemplates || [])
    };
    localStorage.setItem(LIBRARY_BACKUP_KEY, JSON.stringify(payload));
    return payload;
  }
  function restoreProtectedLibrary(){
    const p = protectedLibrary(); if(!p) return;
    const mergeById=(base,incoming)=>{ const map=new Map((base||[]).map(x=>[x.id,x])); (incoming||[]).forEach(x=>x?.id&&map.set(x.id,x)); return [...map.values()]; };
    ext.customFoods = mergeById(ext.customFoods,p.customFoods);
    ext.onlineFoods = mergeById(ext.onlineFoods,p.onlineFoods);
    ext.savedFoodIds = [...new Set([...(ext.savedFoodIds||[]),...(p.savedFoodIds||[]),...(p.customFoods||[]).map(x=>x.id)])];
    ext.foodVerification = {...(p.foodVerification||{}),...(ext.foodVerification||{})};
    ext.recipes = mergeById(ext.recipes,p.recipes);
    ext.mealTemplates = mergeById(ext.mealTemplates,p.mealTemplates);
    saveExt();
  }
  restoreProtectedLibrary();

  // Library source language and compact badges.
  function sourceInfo(food){
    if(food?.foodSourceId){const source=C8?.provenance?.(food);return {icon:'✓',label:source?.label||food.sourceDisplayName||food.brand||'Official Source',cls:'official'};}
    const meta=ext.foodVerification?.[food.id]||{};
    if(meta.method==='nutrition-panel'||food.source==='Nutrition Panel') return {icon:'▤',label:'Nutrition Panel',cls:'panel'};
    if(food.barcode||String(meta.method||'').includes('barcode')) return {icon:'▦',label:'Barcode',cls:'barcode'};
    return {icon:'✎',label:'Manual',cls:'manual'};
  }
  const oldResourceFoodRow0614 = resourceFoodRow;
  resourceFoodRow = function(food){
    const html=oldResourceFoodRow0614(food);
    if(activeLibraryTab()!=='saved') return html;
    const info=sourceInfo(food);
    return html.replace('</strong><small>',` <span class="food-source-badge ${info.cls}" title="Saved from ${info.label}"><span aria-hidden="true">${info.icon}</span> ${safeText(info.label)}</span></strong><small>`);
  };

  // Three permanent library categories; Recent is contextual only while adding/planning.
  activeLibraryTab = function(){
    const raw=ext.ui.libraryTab||'all';
    if(['custom','saved'].includes(raw)) return 'saved';
    if(['recipes','meals','combined'].includes(raw)) return 'combined';
    if(raw==='online') return 'all';
    if(raw==='recent' && !(ext.ui.pendingMeal||ext.ui.pendingDrink)) return 'all';
    return raw;
  };
  function renderCombinedLibrary(query=''){
    const nq=normalise(query||'');
    const recipes=(ext.recipes||[]).filter(r=>!nq||searchRank(recipeAsFood(r),query)>0);
    const meals=(ext.mealTemplates||[]).filter(m=>!nq||normalise(m.name).includes(nq));
    const rows=[];
    recipes.forEach(r=>rows.push(resourceFoodRow(recipeAsFood(r)).replace('<article class="resource-row','<article data-library-kind="recipe" class="resource-row')));
    meals.forEach(meal=>{const totals=sumNutrients(meal.items);rows.push(`<article data-library-kind="meal" class="resource-row"><button class="resource-main" data-meal-add="${safeText(meal.id)}"><strong>${safeText(meal.name)} <span class="food-source-badge meal">Meal</span></strong><small>${meal.items.length} ${meal.items.length===1?'item':'items'} · ${formatNumber(totals.calories)} Cal</small></button><button class="resource-delete" data-meal-delete="${safeText(meal.id)}">•••</button><button class="resource-add" data-meal-add="${safeText(meal.id)}">＋</button></article>`);});
    $('food-results').innerHTML=rows.length?rows.join(''):'<div class="resource-empty"><strong>No Meals Or Recipes Saved Yet.</strong><p>Create a recipe or save a combination of foods you want to reuse.</p></div>';
  }
  renderLibrary = function(){
    const tab=activeLibraryTab(); ext.ui.libraryTab=tab;
    document.querySelectorAll('[data-library-tab]').forEach(b=>{
      const isRecent=b.dataset.libraryTab==='recent';
      b.classList.toggle('hidden',isRecent && !(ext.ui.pendingMeal||ext.ui.pendingDrink));
      b.classList.toggle('active',b.dataset.libraryTab===tab);
    });
    if($('food-search')) $('food-search').value=ext.ui.foodSearch||'';
    const context=$('library-entry-context');
    if(context){const pending=ext.ui.pendingMeal,drink=ext.ui.pendingDrink,has=!!pending||!!drink;context.classList.toggle('hidden',!has);context.innerHTML=drink?`<span>Choose the exact <strong>${safeText(drink.label||drink.type)}</strong> for ${formatNumber(drink.amount,true)} mL.</span>${pending?`<small>Meal: ${safeText(pending)}</small>`:''}`:pending?`<span>Adding to <strong>${safeText(pending)}</strong> on ${safeText(relativeDateLabel(ext.ui.diaryDate||isoToday()))}</span>`:'';}
    const query=($('food-search')?.value||'').trim(); renderFoodLiveMatches(query);
    $('online-search-actions')?.classList.toggle('hidden',tab!=='all'); $('online-food-status')?.classList.toggle('hidden',tab!=='all');
    if(tab==='recent'){renderRecentLibrary(query);return;}
    if(tab==='combined'){renderCombinedLibrary(query);renderRecipeSelectOptions();renderScanSelect();return;}
    if(tab==='saved'){
      const ids=new Set(ext.savedFoodIds||[]); (ext.customFoods||[]).forEach(f=>ids.add(f.id));
      const foods=allFoods().filter(f=>ids.has(f.id)&&f.category!=='Recipe').map(food=>({food,rank:searchRank(food,query)})).filter(x=>query?x.rank>0:true).sort((a,b)=>b.rank-a.rank||a.food.name.localeCompare(b.food.name));
      $('food-results').innerHTML=foods.length?foods.map(x=>resourceFoodRow(x.food)).join(''):'<div class="resource-empty"><strong>No Foods Saved Yet.</strong><p>Barcode scans, Nutrition Panel captures and foods you enter yourself will appear together here.</p></div>';
      renderRecipeSelectOptions();renderScanSelect();return;
    }
    // All Resources continues to include local and online resources; there is no Online Only tab.
    const local=[...FOODS,...(ext.customFoods||[]),...AFCD_FOODS].filter(f=>f.category!=='Recipe');
    const ranked=local.map(food=>({food,rank:searchRank(food,query)})).filter(x=>query?x.rank>0:true).sort((a,b)=>b.rank-a.rank||Number(b.food.country==='Australia')-Number(a.food.country==='Australia')||a.food.name.localeCompare(b.food.name));
    const visible=query?ranked.slice(0,45):ranked.filter(x=>!x.food.afcd).slice(0,18);
    let html=visible.length?visible.map(x=>resourceFoodRow(x.food)).join(''):'<div class="resource-empty"><strong>Search All Resources.</strong><p>Search My Foods, My Meals & Recipes, Australian reference foods and online packaged-food sources in one place.</p></div>';
    if(query.length>=3){const online=cachedOnlineMatches(query);if(online.length)html+=`<section class="all-resources-online"><div class="online-source-banner"><strong>Online Packaged Foods — Review Required</strong></div>${online.slice(0,24).map(resourceFoodRow).join('')}</section>`;}
    $('food-results').innerHTML=html; renderRecipeSelectOptions();renderScanSelect();
    if(query.length>=3) scheduleAllResourcesOnlineSearch?.();
  };

  // Custom food source: manual and Nutrition Panel items both live in My Foods.
  $('use-ocr-values')?.addEventListener('click',()=>{ ext.ui.customFoodOrigin='nutrition-panel'; saveExt(); });
  $('save-custom-food')?.addEventListener('click',()=>{
    setTimeout(()=>{
      const f=(ext.customFoods||[])[ext.customFoods.length-1]; if(!f)return;
      const origin=ext.ui.customFoodOrigin||'manual';
      f.source=origin==='nutrition-panel'?'Nutrition Panel':'Manual Entry';
      if(!ext.savedFoodIds.includes(f.id))ext.savedFoodIds.push(f.id);
      ext.foodVerification ||= {}; ext.foodVerification[f.id]={...(ext.foodVerification[f.id]||{}),savedAt:new Date().toISOString(),method:origin};
      ext.ui.customFoodOrigin=''; ext.ui.libraryTab='saved'; saveExt(); saveProtectedLibrary();
      if(document.querySelector('#food-library.active'))renderLibrary();
    },0);
  });
  const oldToggleSaved0614=toggleSavedFood;
  toggleSavedFood=function(id){oldToggleSaved0614(id);saveProtectedLibrary();};

  // Stage 8 keeps one authoritative parser. Legacy UI integrations delegate to
  // the capture foundation and must never synthesise a missing printed column.
  parseNutritionPanel=function(text){return X8?.parseNutritionPanel?X8.parseNutritionPanel(text):{servingAmount:null,servingUnit:'g',perServing:{},per100:{},detected:{},issues:['capture-foundation-unavailable'],questionable:true,text:String(text||'')};};
  function compareRows(food,parsed){
    const panel=parsed?.perServing||{},online=food?.nutrients||{};
    return nutrientKeys.map(([k,label,unit])=>{const a=finite(online[k])?Number(online[k]):null,b=finite(panel[k])?Number(panel[k]):null;if(b===null)return null;const diff=(a===null?null:b-a),pct=(a&&diff!==null?Math.abs(diff)/Math.abs(a)*100:Infinity),close=a!==null&&(pct<=5||Math.abs(diff)<(k==='sodium'?5:.2));return {k,label,unit,online:a,panel:b,diff,pct,close};}).filter(Boolean);
  }
  fillOcrReview=function(parsed){
    if(!parsed)return;alpha08FillOcrReview(parsed);
    const id=ext.ui.compareBarcodeFoodId,box=$('ocr-review');box?.querySelector('.barcode-panel-comparison')?.remove();
    if(id){
      const food=getFood(id),rows=compareRows(food,parsed); if(food&&box){
        const valid=rows.length,diffs=rows.filter(r=>r.online===null||!r.close),complete=valid>=5;
        const heading=!complete?`Comparison Incomplete — ${valid} Values Read`:diffs.length?'Package Differences Found — Review Before Saving':'Package Information Matches Closely ✓';
        const rowHtml=rows.map(r=>`<div class="${r.close?'match':'difference'}"><span>${safeText(r.label)}</span><b>${r.online===null?'Not Available':`${formatNumber(r.online,true)} ${r.unit}`}</b><span>→</span><b>${formatNumber(r.panel,true)} ${r.unit}</b><em>${r.online===null?'Package only':r.close?'Close':`${r.diff>0?'+':''}${formatNumber(r.diff,true)} ${r.unit}`}</em></div>`).join('');
        box.insertAdjacentHTML('afterbegin',`<div class="barcode-panel-comparison status-box"><strong>${heading}</strong><div class="compare-column-heads"><span>Nutrient</span><b>Barcode</b><i></i><b>Package</b><em>Difference</em></div><div class="compare-table">${rowHtml||'<p>No reliable package nutrient values were recognised. Please enter them from the label below.</p>'}</div><p class="fine"><strong>Recommended:</strong> use the current package values after checking the photographed panel. The package is the best source; OCR is only an assistant and can be corrected.</p><div class="quick-action-row"><button type="button" class="secondary" data-keep-barcode-values="${safeText(id)}">Keep Barcode Values</button><button type="button" class="primary" data-use-package-values="${safeText(id)}" disabled>Use Checked Package Values</button></div></div>`);alpha08UpdateOcrReview();
      }}
  };

  // The active camera owner stops every track after the first accepted code.
  // Restart is deliberate; an existing browser permission remains reusable.
  const fullStopBarcodeCamera = stopBarcodeCamera;
  handleDetectedBarcode=async function(raw){
    const text=validBarcodeValue(raw);if(!text||barcodeDetectionLocked)return false;barcodeDetectionLocked=true;
    $('scan-barcode-input').value=text;updateBarcodeLookupState();fullStopBarcodeCamera();barcodeDetectionLocked=true;$('barcode-status').textContent=`Barcode ${text} Detected. Looking Up Product…`;await lookupBarcodeProduct(text);return true;
  };
  startBarcodeCamera=async function(){
    const video=$('barcode-video'),shell=$('barcode-camera-shell');if(!video||!shell)return;
    fullStopBarcodeCamera();captureActionLocked=false;scanBarcodeFood=null;$('scan-review-card')?.classList.add('hidden');ext.ui.scanMode='barcode';saveExt();updateScanModeUI();shell.classList.remove('hidden');$('stop-barcode-camera')?.classList.remove('hidden');shell.scrollIntoView({behavior:'smooth',block:'center'});
    try{
      $('barcode-status').textContent='Opening Camera… Hold The Barcode Steady Inside The Box.';
      if(await startNativeBarcodeCamera(video)){$('barcode-status').textContent='Camera Ready. Hold A Retail Barcode Steady Inside The Box — No Photo Is Needed.';return;}
      const ok=await ensureBarcodeLibrary();if(!ok)throw new Error('Scanner unavailable');const reader=new ZXingBrowser.BrowserMultiFormatReader();scanBarcodeControls=await reader.decodeFromVideoDevice(undefined,video,result=>{const text=result?.getText?.()||result?.text;if(text)handleDetectedBarcode(text);});$('barcode-status').textContent='Camera Ready. Hold A Retail Barcode Steady Inside The Box — No Photo Is Needed.';
    }catch{$('barcode-status').textContent='Camera access is unavailable. If you previously allowed it, check the HE Companion/Safari camera permission in iPhone Settings. You can also enter the barcode manually.';}
  };
  // Replace old button handler with a cloned button so only the Alpha 0.6.16 handler runs.
  const oldStart=$('start-barcode-camera');if(oldStart){const b=oldStart.cloneNode(true);oldStart.replaceWith(b);b.addEventListener('click',startBarcodeCamera);}
  const oldStop=$('stop-barcode-camera');if(oldStop){const b=oldStop.cloneNode(true);oldStop.replaceWith(b);b.addEventListener('click',()=>fullStopBarcodeCamera('Barcode Camera Stopped.'));}

  // Reset for testing: one owner, with an explicit keep-library or full-delete path.
  function showResettingState(mode){
    resetInProgress=true;
    document.body.setAttribute('aria-busy','true');
    document.querySelectorAll('.danger-button,#reset-trial,#leave-app').forEach(button=>{button.disabled=true;button.setAttribute('aria-busy','true');});
    const resetButton=$('reset-trial');if(resetButton)resetButton.textContent='Resetting…';
    const title=$('a05-modal-title'),copy=$('a05-modal-copy'),extra=$('a05-modal-extra'),actions=$('a05-modal-actions'),modal=$('a05-modal');
    if(title)title.textContent='Resetting…';
    if(copy)copy.textContent=mode==='keep-library'?'Clearing profile and test-session data while keeping your personal food and meal library.':'Permanently clearing all profile, test-session and library data.';
    if(extra)extra.innerHTML='<div id="hec-reset-status" class="status-box" role="status"><strong>Resetting…</strong><p>Please wait while Healthy Eating Companion returns to Welcome.</p></div>';
    actions?.classList.add('hidden');
    ['a05-modal-cancel','a05-modal-confirm','a05-modal-close'].forEach(id=>{const button=$(id);if(button)button.disabled=true;});
    modal?.classList.remove('hidden');
  }
  function allowResettingStateToPaint(){return new Promise(resolve=>{if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(resolve));else setTimeout(resolve,0);});}
  async function runReset(mode){
    if(resetInProgress)return;
    try{window.HECInstallation.assertDestructiveOrigin(APP,location.origin);}catch(error){showActionToast(error.message,null,8000);return false;}
    showResettingState(mode);
    try{sessionStorage.setItem(RESET_RELOAD_SESSION_KEY,'1');}catch{}
    await allowResettingStateToPaint();
    if(mode==='keep-library')saveProtectedLibrary();
    const keys=mode==='keep-library'?RESET_STORAGE_KEYS:FULL_RESET_STORAGE_KEYS;
    keys.forEach(key=>localStorage.removeItem(key));
    await clearPersistentMirror();
    location.reload();
  }
  document.addEventListener('click',event=>{
    const resetButton=event.target.closest?.('#reset-trial'),fullResetButton=event.target.closest?.('#alpha0614-full-reset'),myDataFullResetButton=event.target.closest?.('#my-data-full-reset');
    if(!resetButton&&!fullResetButton&&!myDataFullResetButton)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(resetInProgress)return;
    if(myDataFullResetButton){
      if(APP.installationRole!=='my-data')return;
      if($('my-data-reset-confirm-text')?.value.trim()!=='DELETE MY DATA'){alert('Type DELETE MY DATA exactly before using the My Data Full Reset.');return;}
      if(confirm('FINAL WARNING: permanently delete the historical Profile, Diary, weights, activities, My Foods, My Recipes, Shopping, companion and preferences from HEC — My Data? Confirm only after verifying a downloaded backup.'))runReset('full');
      return;
    }
    if(resetButton){
      if(APP.installationRole!=='test')return;
      openModal('Reset HEC — TEST','Restart TEST onboarding and clear its profile, Diary, weight, progress and test activity while keeping its test food and meal library?','Reset TEST & Keep Its Library',()=>runReset('keep-library'),`<p><strong>TEST only.</strong> My Data is outside this installation and is not accessed.</p><p><strong>Kept in TEST:</strong> My Foods, package-verification records, My Meals & Recipes.</p><p><strong>Cleared from TEST:</strong> onboarding/profile, Diary, weight history, progress, shopping list and other test-session data.</p><button type="button" id="alpha0614-full-reset" class="danger-button wide">Full Reset HEC — TEST</button>`);
      return;
    }
    if(APP.installationRole==='test'&&confirm('Full Reset will delete everything stored only inside HEC — TEST. HEC — My Data is not accessed. Continue?'))runReset('full');
  },true);

  // Updated wording after old handlers move users to legacy tabs.
  document.addEventListener('click',()=>setTimeout(()=>{if(['custom','recipes','meals'].includes(ext.ui.libraryTab)){ext.ui.libraryTab=ext.ui.libraryTab==='custom'?'saved':'combined';saveExt();if(document.querySelector('#food-library.active'))renderLibrary();}saveProtectedLibrary();},20));

  setTimeout(()=>{ if(document.querySelector('#food-library.active'))renderLibrary(); },50);


/* ================================================================
   Alpha 0.6.16 founder-polish patch
   - stronger Australian food language recognition
   - context-aware serving units
   - safer Daily Progress colour bands + explicit over/under amounts
   - nutrient suggestion shortcuts
   - recent meal filtering
   - meal overview/edit/delete flow
   - selected Diary date carried into multi-meal planning
   - Quick Log cancel flow and cleaner listening state
   - Daily Progress always starts on Today after a fresh app load
   - wider, easier-to-read weight chart
   ================================================================ */

/* 1. Australian everyday foods and colloquial names. These founder records are
   intentionally labelled as estimates/package references so testers can still
   review the exact product or serving. */
FOODS.push(
  {id:'aussie-bunnings-snag',name:'Bunnings-Style Sausage In Bread',brand:'Australian Sausage Sizzle Estimate',category:'Meals & Takeaway',country:'Australia',aliases:['bunnings sausage','bunnings snag','sausage sizzle','snag in bread','sausage in bread','bunnings sausage sizzle','sausage on bread'],productSemantics:{type:'single-item',confidence:'high'},foodGroupUnitPolicy:{allowed:false,reason:'Composite countable product; food-group attribution is tracked separately.'},defaultAmount:1,defaultUnit:'item',units:{item:1,g:1/145},unitLabels:{item:'Sausage in bread',g:'g'},serving:'1 sausage in bread (about 145 g)',nutrients:nutrient(285,12,25,15,5,1.5,5,780),score:5,source:'Australian Sausage-Sizzle Estimate — varies by sausage, bread, onion and sauce',verified:false,ingredients:'Beef sausage, white bread; onion and sauce may be added',allergens:['wheat','gluten'],foodGroups:{grains:1,proteinFoods:1},waterMl:25},
  {id:'aussie-chiko-roll',name:'Chiko Roll',brand:'Chiko',category:'Snacks & Takeaway',country:'Australia',aliases:['chiko roll','chiko','chicko roll','chico roll','chicco roll','cheeko roll'],defaultAmount:1,defaultUnit:'roll',units:{roll:1,serve:1,g:1/162},unitLabels:{roll:'Roll (162 g)',serve:'Serving (1 roll)',g:'g'},serving:'1 roll (162 g)',nutrients:nutrient(313,9,45.5,9.8,2.3,3.9,3.7,580),score:5,source:'Australian Retail Package Reference — verify current package',verified:false,ingredients:'Vegetables, wheat flour, barley, beef, canola oil, soy protein and seasonings',allergens:['wheat','gluten','soy'],foodGroups:{vegetables:.7,grains:1,proteinFoods:.4},waterMl:45},
  {id:'aussie-potato-scallop',name:'Potato Scallop / Potato Cake',brand:'Fish & Chip Shop Estimate',category:'Takeaway',country:'Australia',aliases:['potato scallop','potato cake','potato fritter','battered potato scallop','battered potato cake','scallop potato'],defaultAmount:1,defaultUnit:'piece',units:{piece:1,serve:1,g:1/70},unitLabels:{piece:'Piece (about 70 g)',serve:'Serving (1 piece)',g:'g'},serving:'1 piece (about 70 g)',nutrients:nutrient(226,3,30,10,2,2,1,350),score:4,source:'Australian Fish-and-Chip Shop Estimate — size and oil absorption vary',verified:false,ingredients:'Potato, flour batter, frying oil, salt',allergens:['wheat','gluten'],foodGroups:{vegetables:.5,grains:.4},waterMl:22},
  {id:'aussie-dim-sim',name:'Dim Sim, Steamed',brand:'Australian Takeaway Estimate',category:'Takeaway',country:'Australia',aliases:['dim sim','dimsim','steamed dim sim'],defaultAmount:1,defaultUnit:'piece',units:{piece:1,serve:1,g:1/60},unitLabels:{piece:'Piece (about 60 g)',serve:'Serving (1 piece)',g:'g'},serving:'1 piece (about 60 g)',nutrients:nutrient(105,6,13,3,1,1,2,330),score:5,source:'Australian Takeaway Estimate — verify brand/package where available',verified:false,ingredients:'Meat and vegetable filling in wheat wrapper',allergens:['wheat','gluten'],foodGroups:{grains:.4,proteinFoods:.5,vegetables:.2},waterMl:20},
  {id:'aussie-lamington',name:'Lamington',brand:'Australian Bakery Estimate',category:'Bakery',country:'Australia',aliases:['lamington','lamington cake'],defaultAmount:1,defaultUnit:'piece',units:{piece:1,serve:1,g:1/70},unitLabels:{piece:'Piece (about 70 g)',serve:'Serving (1 piece)',g:'g'},serving:'1 piece (about 70 g)',nutrients:nutrient(235,3,34,10,6,1,22,120),score:4,source:'Australian Bakery Estimate — size and recipe vary',verified:false,ingredients:'Sponge cake, chocolate icing and coconut',allergens:['wheat','gluten','egg','milk'],foodGroups:{grains:.7},waterMl:15}
);

/* 2. Context-aware natural serving units. */
function alpha0615NaturalUnits(food){
  if(!food||food.__alpha0615Units)return food; food.__alpha0615Units=true;
  food.units={...(food.units||{serving:1})};food.unitLabels={...(food.unitLabels||{})};
  const text=normalise(`${food.name||''} ${food.category||''}`);
  const gramsPerBase=food.units.g?1/food.units.g:0;
  const add=(key,label,grams)=>{if(food.units[key]===undefined&&gramsPerBase&&grams>0){food.units[key]=grams/gramsPerBase;food.unitLabels[key]=label;}};
  const communityPer100=(food.recordType==='online-candidate'||/open food facts|community supplied/i.test(String(food.source||'')))&&food.packageServingExplicit!==true;
  if(communityPer100){if(food.units.serving===undefined&&food.units.serve===undefined&&food.units.g===undefined){food.units.serving=1;food.unitLabels.serving=food.serving||'Serving';}return food;}
  if(/bread|toast/.test(text))add('slice','Slice (about 40 g)',40);
  if(/biscuit|cracker/.test(text))add('biscuit','Biscuit / Cracker',15);
  if(/cake|slice/.test(text)&&!/pancake/.test(text))add('slice','Slice / Piece',80);
  if(/egg/.test(text))add('egg','Egg',50);
  if(/sausage(?! roll)|frankfurt|hot dog/.test(text))add('sausage','Sausage',75);
  if(/sausage roll/.test(text))add('piece','Piece / Sausage Roll',95);
  if(/pie/.test(text))add('piece','Pie / Piece',95);
  if(/chicken.*bite|nugget/.test(text))add('piece','Piece',20);
  if(/fruit|apple|orange|banana|pear|peach|plum/.test(text))add('piece','Piece',120);
  if(/cheese/.test(text)&&/(?:dairy|cheese)/.test(normalise(food.category||''))&&gramsPerBase)add('slice','Slice (about 20 g)',20);
  if(/drink|milk|juice|coffee|tea|water|soft drink|cordial/.test(text)&&food.units.mL===undefined&&gramsPerBase){food.units.mL=1/Math.max(1,gramsPerBase);food.unitLabels.mL='mL';}
  if(food.units.serving===undefined&&food.units.serve===undefined){food.units.serving=1;food.unitLabels.serving=food.serving||'Serving';}
  return food;
}
const alpha0615UnitOptions=unitOptions;
unitOptions=function(food){alpha0615NaturalUnits(food);return alpha0615UnitOptions(food);};
const alpha0615AllFoods=allFoods;
allFoods=function(){const list=alpha0615AllFoods();list.forEach(alpha0615NaturalUnits);return list;};

/* Give Australian slang and common speech slightly more authority than long
   technical names when the user uses an exact colloquial phrase. */
const alpha0615SearchRank=searchRank;
searchRank=function(food,query){
  const q=normalise(query).replace(/\bchicko\b/g,'chiko').replace(/\bchico\b/g,'chiko').replace(/\bpotatoe\b/g,'potato');
  let rank=alpha0615SearchRank(food,q);
  const aliases=(food.aliases||[]).map(normalise),name=normalise(food.name);
  if(aliases.includes(q))rank=Math.max(rank,1800);
  if(name===q)rank=Math.max(rank,1850);
  if(food.id==='aussie-bunnings-snag'&&/\b(bunnings|sausage sizzle|snag)\b/.test(q))rank+=500;
  if(food.id==='aussie-chiko-roll'&&/\bchiko\b/.test(q))rank+=500;
  if(food.id==='aussie-potato-scallop'&&/potato (scallop|cake|fritter)/.test(q))rank+=500;
  return rank;
};

/* 3. Daily Progress status rules: Grey → Yellow → Green → Orange → Red.
   Green deliberately allows a practical margin around a target, e.g. protein
   119 g against 109 g remains green (~109%). */
progressState=function(value,target,type,date){
  const ratio=target?value/target:0;
  if(!target)return ['neutral','Target Not Available'];
  if(type==='limit'){
    if(ratio<=.75)return ['green','Comfortably Below Limit'];
    if(ratio<=1)return ['yellow','Approaching Daily Limit'];
    if(ratio<=1.25)return ['orange','Above Recommended Limit'];
    return ['red','Well Above Recommended Limit'];
  }
  if(type==='minimum'){
    if(ratio<.5)return ['neutral','Early / Still Building'];
    if(ratio<.85)return ['yellow','Building Toward Goal'];
    return ['green','Goal Range Reached'];
  }
  if(ratio<.5)return ['neutral','Still Building'];
  if(ratio<.85)return ['yellow','Approaching Target'];
  if(ratio<=1.15)return ['green','Around Today’s Target'];
  if(ratio<=1.35)return ['orange','Above Target'];
  return ['red','Well Above Target'];
};
progressCard=function(label,value,target,unit,type,date){
  const [state,text]=progressState(value,target,type,date),pct=Math.min(100,Math.max(0,target?value/target*100:0)),delta=Number(value)-Number(target),under=delta<0,abs=Math.abs(delta);
  const deltaText=target?`${formatNumber(abs,true)} ${esc(unit)} ${under?'under':'over'} target`:'';
  const canSuggest=(type==='minimum'||type==='positive')&&under&&target&&value/target<.85;
  return `<div class="progress-card ${state}"><div><strong>${esc(label)}</strong><span>${formatNumber(value)} / ${formatNumber(target)} ${esc(unit)}</span></div><div class="progress-track"><i style="width:${pct}%"></i></div><div class="progress-status-line"><small>${text}${deltaText?` · ${deltaText}`:''}</small>${canSuggest?`<button type="button" class="progress-suggest-food" data-progress-suggest="${esc(label)}">Suggest Food</button>`:''}</div></div>`;
};
function alpha0615NutrientKey(label){return {Protein:'protein',Carbohydrate:'carbs',Fat:'fat',Fibre:'fibre',Fluids:'waterMl',Steps:''}[label]||'';}
function alpha0615SuggestFood(label){
  const key=alpha0615NutrientKey(label);if(!key||key==='waterMl'){showActionToast(label==='Fluids'?'Try water or another suitable drink from Add A Drink.':'No food suggestion is needed for this item.',null,4500);return;}
  const candidates=allFoods().filter(f=>f.category!=='Recipe'&&!foodSafety(f).blocked&&f.nutrients&&Number(f.nutrients[key])>0&&Number(f.nutrients.calories)>=0).map(f=>({f,score:(Number(f.nutrients[key])||0)/(Math.max(30,Number(f.nutrients.calories)||30))+(f.country==='Australia'?0.04:0)+(f.verified?0.03:0)})).sort((a,b)=>b.score-a.score).slice(0,6);
  openModal(`Foods To Help With ${label}`,`These are suggestions only. Choose one to review its serving before anything is added.`,`Close`,()=>{},`<div class="nutrient-suggestion-list">${candidates.map(({f})=>`<button type="button" data-nutrient-food="${esc(f.id)}"><strong>${esc(f.name)}</strong><small>${esc(f.serving||'Serving')} · ${energyText(f.nutrients?.calories)}</small></button>`).join('')}</div>`);
}
document.addEventListener('click',event=>{const b=event.target.closest('[data-progress-suggest]');if(b){alpha0615SuggestFood(b.dataset.progressSuggest);return;}const f=event.target.closest('[data-nutrient-food]');if(f){closeModal();ext.ui.pendingMeal='Snacks';saveExt();prepareEntry(getFood(f.dataset.nutrientFood),{date:ext.ui.progressDate||isoToday(),meal:'Snacks'});}});

/* 4. Daily Progress always starts on Today after a fresh load/relaunch. */
ext.ui.progressDate=isoToday();saveExt();

/* 5. Recent defaults to the meal the user is currently adding, with explicit
   meal filters so other recent meals remain one tap away. */
renderRecentLibrary=function(query=''){
  const nq=normalise(query),available=['All','Breakfast','Lunch','Dinner','Snacks','Other'];
  let filter=ext.ui.recentMealFilter||ext.ui.pendingMeal||'All';if(!available.includes(filter))filter='All';
  const groups=recentGroups(14).filter(g=>filter==='All'||g.meal===filter).map(g=>({...g,items:g.items.filter(e=>!nq||normalise(`${e.name} ${e.brand||''}`).includes(nq))})).filter(g=>g.items.length);
  const filters=available.map(m=>`<button type="button" data-recent-filter="${m}" class="${filter===m?'active':''}">${m}</button>`).join('');
  const groupHtml=groups.map(g=>{
    const rows=g.items.map(e=>`<div class="recent-entry-row"><span><strong>${esc(e.name)}</strong><small>${esc(entryNaturalQuantity(e))} · ${energyText(e.nutrients?.calories)}</small></span><button data-recent-entry-add="${esc(e.id)}">＋ Add Food</button></div>`).join('');
    const addMeal=g.items.length>1?`<button data-recent-meal-add="${esc(g.date)}|${esc(g.meal)}">Add To ${esc(g.meal)}</button>`:'';
    return `<section class="recent-meal-group"><header><div><strong>${esc(g.meal)} · ${g.items.length===1?'Recent Food':'Recent Meal'}</strong><small>${esc(relativeDateLabel(g.date))}</small></div>${addMeal}</header>${rows}</section>`;
  }).join('');
  const empty=`<div class="resource-empty"><strong>No Recent ${filter==='All'?'Foods Or Meals':filter} In The Last 14 Days.</strong><p>Choose another meal above, or add a new food.</p></div>`;
  by('food-results').innerHTML=`<div class="recent-meal-filter"><span>Recent 14 Days</span><div>${filters}</div></div>${groupHtml||empty}`;
};
document.addEventListener('click',event=>{const b=event.target.closest('[data-recent-filter]');if(!b)return;ext.ui.recentMealFilter=b.dataset.recentFilter;saveExt();renderRecentLibrary(by('food-search')?.value||'');});

/* 6. Diet-Diary-like meal overview: tap a meal heading to see the whole meal,
   then tap Edit or swipe a row left to reveal Delete. */
const alpha0615RenderDiary=renderDiary;
renderDiary=function(){alpha0615RenderDiary();qa('.redesigned-meal-heading').forEach(h=>{const section=h.closest('[data-meal-name]');if(!section)return;h.setAttribute('role','button');h.setAttribute('tabindex','0');h.dataset.mealOverview=section.dataset.mealName;h.title=`Open ${section.dataset.mealName}`;});};
function alpha0615OpenMealOverview(meal){
  const date=ext.ui.diaryDate||isoToday(),items=entriesForDate(date).filter(e=>e.meal===meal&&e.status!=='skipped'),total=sumNutrients(items).calories;
  openModal(`${meal} · ${formatNumber(total)} Cal`,`${relativeDateLabel(date)} · Tap a food to edit it. Swipe left on a row to reveal Delete.`,`Done`,()=>{},`<div class="meal-overview-list">${items.length?items.map(e=>`<div class="meal-overview-row" data-overview-row="${esc(e.id)}"><button type="button" class="meal-overview-edit" data-overview-edit="${esc(e.id)}"><span><strong>${esc(e.name)}</strong><small>${esc(entryNaturalQuantity(e))}</small></span><b>${energyText(e.nutrients?.calories)}</b></button><button type="button" class="meal-overview-delete" data-overview-delete="${esc(e.id)}">🗑 Delete</button></div>`).join(''):`<p class="empty-state">No Foods Yet.</p>`}</div><button type="button" class="secondary wide" data-overview-add="${esc(meal)}">＋ Add Food To ${esc(meal)}</button>`);
  setTimeout(()=>alpha0615EnableSwipeDelete(),0);
}
function alpha0615EnableSwipeDelete(){qa('[data-overview-row]').forEach(row=>{let start=0;row.addEventListener('touchstart',e=>{start=e.touches[0].clientX},{passive:true});row.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-start;if(dx<-40)row.classList.add('delete-revealed');if(dx>35)row.classList.remove('delete-revealed');},{passive:true});});}
document.addEventListener('click',event=>{const h=event.target.closest('[data-meal-overview]');if(h&&!event.target.closest('button')){alpha0615OpenMealOverview(h.dataset.mealOverview);return;}const edit=event.target.closest('[data-overview-edit]');if(edit){const found=findEntry(edit.dataset.overviewEdit);if(found){closeModal();prepareEntry(getFood(found.entry.foodId)||snapshotFood(found.entry),{entry:found.entry});}return;}const del=event.target.closest('[data-overview-delete]');if(del){deleteDiaryEntryWithUndo(del.dataset.overviewDelete,{reopenMeal:true});return;}const add=event.target.closest('[data-overview-add]');if(add){closeModal();ext.ui.pendingMeal=add.dataset.overviewAdd;ext.ui.libraryTab='all';ext.ui.foodSearch='';saveExt();openFeature('food-library',{freshSearch:true});}});

/* 7. Carry the Diary date into Plan Multiple Meals and Quick Log. */
document.addEventListener('click',event=>{const plan=event.target.closest('#diary-plan-multiple');if(plan){ext.ui.plannerDate=ext.ui.diaryDate||isoToday();saveExt();}const quick=event.target.closest('[data-open-feature="quick-log"]');if(quick){const current=document.querySelector('.screen.active')?.id||'home';ext.ui.quickLogOrigin=current==='food-diary'?'food-diary':'home';saveExt();}},true);
const alpha0615InitialisePlanner=initialisePlanner;
initialisePlanner=function(){if(!ext.ui.plannerDate)ext.ui.plannerDate=ext.ui.diaryDate||isoToday();alpha0615InitialisePlanner();};
const alpha0615InitialiseVoice=initialiseVoice;
function alpha0627QuickDestination(requireMeal=true){const date=by('voice-date')?.value||ext.ui.diaryDate||isoToday(),meal=by('voice-meal')?.value||'';if(requireMeal&&!meal){showActionToast('Choose the meal before selecting an entry method.',null,4500);by('voice-meal')?.focus();return null;}return{date,meal};}
function alpha0633Companion(){const main=mainData(),companion=main.companion||{};return {enabled:companion.enabled!==false&&!!(companion.id||companion.name||companion.customName),name:companion.customName||companion.name||companion.characterName||'Companion',speech:companion.speechEnabled!==false};}
let alpha0633Conversation=CONVERSATION?.createConversation?.()||{state:'idle',pendingAction:null},alpha0633ListenMode='request',alpha0633VoiceSaveLocked=false,alpha0633PromptTimer=null,alpha0633ResponseTimer=null,alpha0633GestureSession=false,alpha0633SpeechActive=false,alpha0633SpeechToken=0;
function alpha0633SetState(event,payload={}){alpha0633Conversation=CONVERSATION?.transition?.(alpha0633Conversation,event,payload)||{...alpha0633Conversation,state:event,pendingAction:payload.pendingAction??alpha0633Conversation.pendingAction};const page=by('quick-log')?.querySelector('.quick-log-page');if(page)page.dataset.conversationState=alpha0633Conversation.state;const mic=by('start-voice-log');if(mic)mic.setAttribute('aria-pressed',String(alpha0633Conversation.state==='listening'));}
function alpha0633SpeechWatchdogDelay(text){const words=String(text||'').trim().split(/\s+/).filter(Boolean).length,characters=String(text||'').length;return Math.max(15000,Math.min(60000,6000+words*520+characters*25));}
function alpha0633CancelSpeech(){alpha0633SpeechToken++;alpha0633SpeechActive=false;if(alpha0633PromptTimer)clearTimeout(alpha0633PromptTimer);alpha0633PromptTimer=null;window.speechSynthesis?.cancel?.();}
function alpha0633Speak(text,onEnd=null){
  const companion=alpha0633Companion();if(!companion.enabled||!companion.speech||!text){if(onEnd)setTimeout(onEnd,0);return null;}
  alpha0633CancelSpeech();const token=alpha0633SpeechToken,started=Date.now(),synthesis=window.speechSynthesis;alpha0633SpeechActive=true;by('voice-response-mic')?.classList.add('hidden');if(onEnd&&by('voice-status'))by('voice-status').textContent='Your companion is speaking…';const utterance=window.HECSpeakText?.(text);let finished=false;
  const done=()=>{if(finished||token!==alpha0633SpeechToken)return;finished=true;alpha0633SpeechActive=false;if(alpha0633PromptTimer)clearTimeout(alpha0633PromptTimer);alpha0633PromptTimer=null;if(onEnd)onEnd();};
  const watch=()=>{if(finished||token!==alpha0633SpeechToken)return;const elapsed=Date.now()-started;if(synthesis?.speaking&&elapsed<120000){alpha0633PromptTimer=setTimeout(watch,750);return;}if(synthesis?.speaking)synthesis.cancel?.();done();};
  const recover=()=>{if(finished||token!==alpha0633SpeechToken)return;if(synthesis?.speaking){alpha0633PromptTimer=setTimeout(watch,250);return;}done();};
  if(utterance){if(typeof utterance.addEventListener==='function'){utterance.addEventListener('end',done,{once:true});utterance.addEventListener('error',recover,{once:true});}else{utterance.onend=done;utterance.onerror=recover;}alpha0633PromptTimer=setTimeout(watch,alpha0633SpeechWatchdogDelay(text));}else setTimeout(done,0);return utterance;
}
function alpha0633StopVoice(abort=true){if(alpha0633ResponseTimer)clearTimeout(alpha0633ResponseTimer);alpha0633ResponseTimer=null;const active=recognition;recognition=null;try{abort?active?.abort?.():active?.stop?.();}catch{}by('stop-voice-log')?.classList.add('hidden');by('start-voice-log')?.setAttribute('aria-pressed','false');}
function alpha0633ShowAnswerFallback(message='Tap to Answer when you are ready.'){if(alpha0633SpeechActive||window.speechSynthesis?.speaking){by('voice-response-mic')?.classList.add('hidden');if(by('voice-status'))by('voice-status').textContent='Your companion is speaking…';return false;}alpha0633GestureSession=false;const button=by('voice-response-mic');button?.classList.remove('hidden');if(by('voice-status'))by('voice-status').textContent=message;return true;}
function alpha0633AutoListenForResponse(){if(alpha0633SpeechActive||window.speechSynthesis?.speaking||!alpha0633GestureSession||alpha0633Conversation.state!=='confirmation-ready')return false;if(by('voice-status'))by('voice-status').textContent='Listening for your answer…';const started=alpha0633StartListening('response',true);if(!started)alpha0633ShowAnswerFallback('Automatic listening is not available here. Tap to Answer.');return started;}
function alpha0633StripWake(text){return CONVERSATION?.stripWake?.(text,[alpha0633Companion().name])||S23?.stripVoiceWake?.(text,[alpha0633Companion().name])||normalise(text).replace(/^(?:hey|hi)\s+(?:companion|hec|shelly|shelley)\b\s*/,'').trim();}
function alpha0633NormalUnit(value){const key=normalise(value),map={burgers:'burger',wraps:'wrap',mcmuffins:'muffin',serves:'serve',servings:'serving',items:'item',drinks:'drink',grams:'g',gram:'g',millilitres:'mL',millilitre:'mL',milliliters:'mL',milliliter:'mL',ml:'mL',glasses:'glass'};return map[key]||value;}
function alpha0633ResolvedItem(food,intent,rankInfo={}){let unit=defaultUnit(food),amount=defaultAmount(food),spokenUnit=alpha0633NormalUnit(intent.quantity?.unit||'');const options=unitOptions(food);if(intent.quantity?.explicit){amount=Number(intent.quantity.amount)||1;if(spokenUnit==='glass'&&food.id==='water'){amount*=250;unit='mL';}else if(spokenUnit&&options[spokenUnit]!==undefined)unit=spokenUnit;}const catalogueRank=C8?.rank?.(food,intent.foodText)||{},exact=['exact-name','exact-alias'].includes(catalogueRank.tier);return {foodId:food.id,canonicalId:food.canonicalId||C8?.canonicalKey?.(food)||food.id,name:food.name,source:food.sourceDisplayName||food.brand||food.source||'',amount,unit,confidence:exact?'high':rankInfo.rank>=1400?'high':'moderate',resolverQuery:intent.foodText,loggable:C8?.canLog?C8.canLog(food):hasEnergyValue(food?.nutrients?.calories),provenance:C8?.provenance?.(food)||{label:food.source||''}};}
function alpha0634GuidedIntentFood(intent){
  if(!GUIDED_PRODUCTS?.resolveRequest||!intent?.foodText)return {handled:false,items:[]};
  const spokenUnit=alpha0633NormalUnit(intent.quantity?.unit||''),session=GUIDED_PRODUCTS.resolveRequest(allFoods(),intent.foodText,{consumption:{identityQuery:intent.foodText,amount:intent.quantity?.explicit?Number(intent.quantity.amount)||1:null,measure:spokenUnit,explicit:!!intent.quantity?.explicit}});intent.guidedProductResolution=GUIDED_PRODUCTS.summary(session);
  if([GUIDED_PRODUCTS.states.BRAND_FAMILY,GUIDED_PRODUCTS.states.GENERIC,GUIDED_PRODUCTS.states.NEEDS_DISTINCTION].includes(session.resolutionState)){intent.unresolved ||= [];if(!intent.unresolved.some(item=>item.field==='food'))intent.unresolved.push({field:'food',message:session.nextQuestion?.question||'Which exact product did you mean?',guidedOptions:(session.nextQuestion?.options||[]).map(option=>option.label)});return {handled:true,items:[]};}
  if(session.resolutionState!==GUIDED_PRODUCTS.states.EXACT)return {handled:false,items:[]};
  if(session.stage===GUIDED_PRODUCTS.stages.CONFIRMATION){const item=alpha0633ResolvedItem(session.exactProduct,{...intent,quantity:{amount:session.amount,unit:session.selectedMeasure.key,explicit:true}},{rank:2000});item.amount=session.amount;item.unit=session.selectedMeasure.key;item.guidedResolution=true;return {handled:true,items:[item]};}
  const type=PS33?.classify?.(session.exactProduct)?.type;if([PS33?.types?.PACKAGED,PS33?.types?.REFERENCE].includes(type)){intent.unresolved ||= [];if(!intent.unresolved.some(item=>item.field==='measure'))intent.unresolved.push({field:'measure',message:`Choose a serving measure and amount for ${session.exactProduct.name}.`,guidedOptions:(session.servingProfile?.measures||[]).map(measure=>measure.label)});return {handled:true,items:[]};}
  return {handled:false,items:[]};
}
function alpha0633ResolveIntentFood(intent){
  const query=intent.foodText;if(!query)return[];const guided=alpha0634GuidedIntentFood(intent);if(guided.handled)return guided.items;const shared=C8?.resolve?.(allFoods(),query);if(shared?.status==='ambiguous'){intent.unresolved=intent.unresolved||[];if(!intent.unresolved.some(item=>item.field==='food'))intent.unresolved.push({field:'food',message:shared.reason});return[];}if(shared?.status==='exact')return[alpha0633ResolvedItem(shared.food,intent,{rank:shared.rank})];const rank=q=>allFoods().map(food=>({food,rank:Math.max(searchRank(food,q),C8?.rank?.(food,q)?.score||0)})).filter(item=>item.rank>=700).sort((a,b)=>b.rank-a.rank||normalise(a.food.name).localeCompare(normalise(b.food.name)));
  const whole=rank(query);if(whole.length){const first=alpha0633ResolvedItem(whole[0].food,intent,whole[0]);if(first.confidence==='high'||!S23?.splitCompoundQuery)return[first];}
  const parts=S23?.splitCompoundQuery?.(query),resolved=[];for(const part of Array.isArray(parts)&&parts.length?parts:[query]){const found=rank(part)[0];if(found)resolved.push(alpha0633ResolvedItem(found.food,{...intent,foodText:part},found));}
  const seen=new Set();return resolved.filter(item=>{const key=`${item.foodId}|${item.amount}|${item.unit}`;if(seen.has(key))return false;seen.add(key);return true;});
}
function rc6ResolveRemovalPending(intent){
  const entries=entriesForDate(intent.localDate).filter(entry=>entry.meal===intent.meal&&entry.status!=='skipped'),diaryRecords=entries.map(entry=>({entry,food:getFood(entry.foodId)||snapshotFood(entry)})),shared=C8?.resolve?.(diaryRecords.map(record=>record.food),intent.foodText);intent.items=shared?.status==='exact'?[alpha0633ResolvedItem(shared.food,intent,{rank:shared.rank})]:shared?.status==='ambiguous'?[]:alpha0633ResolveIntentFood(intent).slice(0,1);
  if(intent.items[0]){const diaryRecord=diaryRecords.find(record=>record.food===shared?.food||record.food?.id===shared?.food?.id),persistedIdentity=diaryRecord?.entry?.canonicalId||diaryRecord?.entry?.foodSnapshot?.canonicalId||diaryRecord?.entry?.foodSnapshot?.id||diaryRecord?.entry?.foodId;intent.canonicalId=persistedIdentity||intent.items[0].canonicalId;intent.items[0].canonicalId=intent.canonicalId;intent.items[0].amount=intent.removeQuantity||intent.items[0].amount;}
  const matchTarget={...intent,foodText:intent.items?.[0]?.name||intent.foodText},match=CONVERSATION?.matchRemoval?.(entries,matchTarget)||{status:'none',matches:[],message:'No matching Diary food was found.'};intent.diaryMatch={status:match.status,totalQuantity:match.totalQuantity||0,ids:(match.matches||[]).map(entry=>entry.id)};intent.unresolved=(intent.unresolved||[]).filter(item=>!['diary-match','quantity'].includes(item.field));
  if(match.status==='none'||match.status==='ambiguous')intent.unresolved.push({field:'diary-match',message:match.message});else if(match.status==='ambiguous-quantity')intent.unresolved.push({field:'quantity',message:match.message});intent.confidence=intent.unresolved.length?'low':'high';return intent;
}
function alpha0633VoiceRequest(text){
  const companion=alpha0633Companion(),options={today:isoToday(),selectedDate:by('voice-date')?.value||ext.ui.diaryDate||isoToday(),selectedMeal:by('voice-meal')?.value||'',companionNames:[companion.name],maxEntries:CONVERSATION.maxBatchEntries},intent=CONVERSATION?.parseActionRequest?.(text,options)||CONVERSATION?.parseRequest?.(text,options)||{raw:text,transcript:text,foodText:alpha0633StripWake(text),meal:mealFromText(text),localDate:by('voice-date')?.value||isoToday(),status:'eaten',unresolved:[],quantity:{amount:1,explicit:false}};
  intent.heard=intent.raw;intent.originalTranscript=intent.raw;intent.responseTranscript='';intent.correctionHistory=[];intent.date=intent.localDate;intent.actionId=uid('voice-action');
  if(intent.actionType===CONVERSATION?.actionTypes?.RECORD_WEIGHT){intent.existingWeight=window.HECWeightCheckIn?.existing?.(intent.localDate)||null;intent.items=[];intent.confidence=intent.unresolved.length?'low':'high';intent.saveLockIdentity=CONVERSATION?.saveLockKey?.(intent)||intent.actionId;return intent;}
  if(intent.actionType===CONVERSATION?.actionTypes?.REMOVE_FOOD){rc6ResolveRemovalPending(intent);intent.saveLockIdentity=CONVERSATION?.saveLockKey?.(intent)||intent.actionId;return intent;}
  intent.items=alpha0633ResolveIntentFood(intent);if(!intent.items.length&&!intent.unresolved.some(item=>item.field==='food'))intent.unresolved.push({field:'food',message:`I could not confidently match “${intent.foodText||intent.raw}”.`});if(intent.items.some(item=>!item.loggable))intent.unresolved.push({field:'nutrition',message:'This product does not have complete fixed nutrition and cannot be saved through voice.'});intent.entryCount=(intent.recurrence?.count||1)*intent.items.length;intent.confidence=intent.unresolved.length?'low':intent.items.every(item=>item.confidence==='high')?'high':'moderate';intent.saveLockIdentity=CONVERSATION?.saveLockKey?.(intent)||intent.actionId;return intent;
}
function alpha0633ItemPhrase(item){const food=getFood(item.foodId),name=food?.name||item.name||'food',amount=Number(item.amount)||1,natural=new Set(['burger','wrap','muffin','serve','serving','item','drink','portion','sundae','mcflurry','cone','pie']);if(amount===1&&natural.has(item.unit))return `a ${name}`;if(amount>1&&natural.has(item.unit))return `${formatNaturalAmount(amount)} ${/s$/i.test(name)?name:`${name}s`}`;return `${formatNaturalAmount(amount)} ${friendlyUnitLabel(food||{},item.unit,amount)} ${name}`;}
function rc6WeightText(value){const amount=Math.round(Number(value)*10)/10;return Number.isInteger(amount)?String(amount):amount.toFixed(1);}
function alpha0633Summary(pending){
  if(pending.actionType==='RECORD_WEIGHT'){const when=alpha0633NaturalDate(pending),existing=pending.existingWeight;if(existing&&Number(existing.weightKg)!==Number(pending.weightKg))return `Update ${when}’s weight from ${rc6WeightText(existing.weightKg)} kg to ${rc6WeightText(pending.weightKg)} kg?`;return `Record ${rc6WeightText(pending.weightKg)} kg for ${when}. Is that correct?`;}
  if(pending.actionType==='REMOVE_FOOD'){const item=pending.items?.[0],name=item?.name||pending.foodText||'food',quantity=pending.removeMode==='all'?'all':formatNumber(pending.removeQuantity||1,true);return `Remove ${quantity==='all'?'all':quantity} ${name}${quantity==='all'||Number(quantity)!==1?' entries':''} from ${alpha0633NaturalDate(pending)}’s ${String(pending.meal||'meal').toLowerCase()}. Is that correct?`;}
  const itemText=(pending.items||[]).map(alpha0633ItemPhrase).join(' and '),meal=pending.meal||'an unspecified meal';if(pending.recurrence)return `You’d like to plan ${itemText} for ${meal} every day from ${formatDate(pending.recurrence.startDate)} to ${formatDate(pending.recurrence.endDate)} — ${pending.entryCount} planned ${pending.entryCount===1?'entry':'entries'}. Is that correct?`;
  const verb=pending.status==='planned'?'plan':'record';return `You’d like to ${verb} ${itemText||'this request'} for ${meal} on ${formatDate(pending.localDate)}. Is that correct?`;
}
function alpha0633NaturalDate(pending){const today=isoToday();if(pending.localDate===today)return 'today';if(pending.localDate===shiftISO(today,1))return 'tomorrow';const phrase=String(pending.dateIntent?.phrase||'').replace(/['’]s\b/gi,'').trim();return pending.dateIntent?.spoken&&phrase?phrase:formatDate(pending.localDate);}
function alpha0633SpokenSummary(pending){if(pending.actionType==='RECORD_WEIGHT')return alpha0633Summary(pending);if(pending.actionType==='REMOVE_FOOD')return alpha0633Summary(pending);const itemText=(pending.items||[]).map(alpha0633ItemPhrase).join(' and ')||'that',meal=String(pending.meal||'meal').toLowerCase();if(pending.recurrence)return `Plan ${itemText} for ${meal} every day for ${pending.entryCount} ${pending.entryCount===1?'entry':'entries'}. Is that correct?`;return `${pending.status==='planned'?'Plan':'Add'} ${itemText} to ${alpha0633NaturalDate(pending)}’s ${meal}. Is that correct?`;}
function alpha0633RenderDetails(){const target=by('voice-review-items');if(!target)return;if(voiceParsed.actionType===CONVERSATION?.actionTypes?.RECORD_WEIGHT){target.innerHTML=`<div class="voice-review-row structured-voice-review"><div><strong>${rc6WeightText(voiceParsed.weightKg)} kg</strong><small>${esc(formatDate(voiceParsed.localDate))} · Existing Weight Check-In validation will be used.</small></div></div>`;return;}if(voiceParsed.actionType===CONVERSATION?.actionTypes?.REMOVE_FOOD){const matches=(voiceParsed.diaryMatch?.ids||[]).map(id=>findEntry(id)?.entry).filter(Boolean);target.innerHTML=matches.length?matches.map(entry=>`<div class="voice-review-row structured-voice-review"><div><strong>${esc(entry.name)}</strong><small>${esc(entryNaturalQuantity(entry))} · ${esc(entry.meal)} · ${energyText(entry.nutrients?.calories)}</small></div></div>`).join(''):'<p class="empty-state">No exact Diary match is ready for removal.</p>';return;}target.innerHTML=(voiceParsed.items||[]).length?voiceParsed.items.map((item,index)=>{const food=getFood(item.foodId),values=scaledNutrients(food,item.amount,item.unit),options=Object.keys(unitOptions(food)).map(unit=>`<option value="${esc(unit)}" ${unit===item.unit?'selected':''}>${esc(titleUnit(unitLabel(food,unit)))}</option>`).join('');return `<div class="voice-review-row structured-voice-review"><div><strong>${esc(food.name)}</strong><small>${esc(food.sourceDisplayName||food.brand||food.source||'HEC Food Library')}</small><span class="source-chip ${food.verified?'verified':'trial'}">${esc(food.source||'Source recorded')}</span></div><div class="voice-review-quantity"><label>Quantity<input type="number" min="0.01" step="0.1" value="${esc(item.amount)}" data-voice-item-amount="${index}"></label><label>Unit<select data-voice-item-unit="${index}">${options}</select></label></div><small>${energyText(values.calories)} · Protein ${nutrientText(values.protein,'g',true)} · Fibre ${nutrientText(values.fibre,'g',true)} · Sodium ${nutrientText(values.sodium,'mg')} · ${item.loggable?'Ready after confirmation':'Details only — nutrition incomplete'}</small><button data-remove-voice-item="${index}" class="delete-action" type="button">Remove</button></div>`;}).join(''):`<p class="empty-state">No confident food match was identified. Correct the transcript or use Open Diary Add Food.</p>`;}
function rc6VoiceActionReady(pending){if(pending?.actionType==='RECORD_WEIGHT')return Number.isFinite(Number(pending.weightKg));if(pending?.actionType==='REMOVE_FOOD')return pending.diaryMatch?.status==='exact';return !!pending?.items?.length;}
function rc6ApplyVoiceDestination(pending){const target=by('quick-log-review-destination');if(!target)return;if(pending.actionType==='RECORD_WEIGHT')target.textContent=`${formatDate(pending.localDate)} · Existing Weight Check-In path`;else if(pending.actionType==='REMOVE_FOOD')target.textContent=`${formatDate(pending.localDate)} · ${pending.meal} · Diary removal after confirmation`;}
function alpha0633RenderVoiceReview({speak=true}={}){
  const pending=voiceParsed||{},review=by('voice-review');review?.classList.remove('hidden');if(pending.meal&&by('voice-meal'))by('voice-meal').value=pending.meal;if(pending.localDate&&by('voice-date'))by('voice-date').value=pending.localDate;const summary=alpha0633Summary(pending),spokenSummary=alpha0633SpokenSummary(pending),issues=(pending.unresolved||[]).map(item=>item.message),ambiguities=(pending.ambiguities||[]).map(item=>`${item.message} Please check the full date.`);if(by('quick-voice-summary'))by('quick-voice-summary').textContent=summary;if(by('quick-voice-clarification'))by('quick-voice-clarification').textContent=[...issues,...ambiguities].join(' ');if(by('quick-log-review-destination'))by('quick-log-review-destination').textContent=pending.meal?(pending.recurrence?`Every day from ${formatDate(pending.recurrence.startDate)} to ${formatDate(pending.recurrence.endDate)} · ${pending.meal} · ${pending.entryCount} planned ${pending.entryCount===1?'entry':'entries'}`:`${formatDate(pending.localDate)} · ${pending.meal} · ${pending.status==='planned'?'Planned':'Recorded'}`):'Choose a meal before saving.';rc6ApplyVoiceDestination(pending);alpha0633RenderDetails();const ready=rc6VoiceActionReady(pending)&&!issues.length;if(by('confirm-voice-log'))by('confirm-voice-log').disabled=!ready;if(ready)alpha0633SetState('ready',{pendingAction:pending});if(ready){by('quick-voice-manual-fallback')?.removeAttribute('open');setTimeout(()=>review?.scrollIntoView?.({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),0);}else{alpha0633SetState('clarify',{pendingAction:pending});by('quick-voice-manual-fallback')?.setAttribute('open','');}if(speak)alpha0633Speak(ready?spokenSummary:(issues[0]||'I need one detail before I can continue.'),ready?alpha0633AutoListenForResponse:null);
}
function alpha0633InterpretTranscript({speak=true}={}){const text=by('voice-transcript')?.value||'';if(!text.trim()){showActionToast('Say or enter a food request first.',null,3500);return;}alpha0633StopVoice();alpha0633SetState('interpret',{transcript:text,originalTranscript:text});voiceParsed=alpha0633VoiceRequest(text);alpha0633RenderVoiceReview({speak});}
function alpha0633ResetConversation({focusTranscript=false}={}){alpha0633StopVoice();alpha0633CancelSpeech();alpha0633GestureSession=false;voiceParsed=[];alpha0633VoiceSaveLocked=false;alpha0633SaveAdapter?.reset?.();alpha0633Conversation=CONVERSATION?.createConversation?.()||{state:'idle',pendingAction:null};alpha0633SetState('open');by('voice-review')?.classList.add('hidden');by('voice-review-items')?.classList.add('hidden');by('voice-response-mic')?.classList.add('hidden');if(by('voice-transcript'))by('voice-transcript').value='';if(by('voice-status'))by('voice-status').textContent='';if(by('confirm-voice-log'))by('confirm-voice-log').disabled=true;if(focusTranscript){by('quick-voice-manual-fallback')?.setAttribute('open','');by('voice-transcript')?.focus();}}
function alpha0633HandleResponse(text){const response=CONVERSATION?.classifyResponse?.(text)||'correction';if(voiceParsed&&typeof voiceParsed==='object'){voiceParsed.responseTranscript=String(text||'').trim();voiceParsed.correctionHistory=voiceParsed.correctionHistory||[];}alpha0633SetState('captured',{transcript:text,responseTranscript:text});if(response==='confirm'){alpha0633SavePending();return;}if(response==='cancel'){alpha0633ResetConversation();if(by('voice-status'))by('voice-status').textContent='Cancelled. Nothing was saved.';alpha0633Speak('Cancelled. Nothing was saved.');return;}if(response==='change'){alpha0633SetState('clarify',{pendingAction:voiceParsed});by('quick-voice-manual-fallback')?.setAttribute('open','');by('voice-review-items')?.classList.remove('hidden');if(by('voice-status'))by('voice-status').textContent='What would you like to change? Use the fields or tap the microphone again.';return;}alpha0633SetState('captured',{transcript:text,responseTranscript:text,correction:text});voiceParsed.correctionHistory.push(String(text||'').trim());const changed=CONVERSATION?.applyCorrection?.(voiceParsed,text,{today:isoToday(),selectedDate:voiceParsed.localDate,selectedMeal:voiceParsed.meal,companionNames:[alpha0633Companion().name]});if(changed?.pending){voiceParsed={...changed.pending,originalTranscript:voiceParsed.originalTranscript,responseTranscript:String(text||'').trim(),correctionHistory:[...(voiceParsed.correctionHistory||[])]};if(voiceParsed.actionType===CONVERSATION?.actionTypes?.REMOVE_FOOD)rc6ResolveRemovalPending(voiceParsed);else if(voiceParsed.actionType===CONVERSATION?.actionTypes?.RECORD_WEIGHT)voiceParsed.existingWeight=window.HECWeightCheckIn?.existing?.(voiceParsed.localDate)||null;else if(changed.parsed?.quantity?.explicit)voiceParsed.items=(voiceParsed.items||[]).map(item=>({...item,amount:changed.parsed.quantity.amount}));if(changed.parsed?.recurrence)voiceParsed.entryCount=changed.parsed.recurrence.count*(voiceParsed.items?.length||1);voiceParsed.saveLockIdentity=CONVERSATION?.saveLockKey?.(voiceParsed)||voiceParsed.actionId;alpha0633RenderVoiceReview({speak:true});}}
function alpha0633StartListening(mode='request',automatic=false){
  if(alpha0633Conversation.state==='listening')return false;if(mode==='request'&&!automatic)alpha0633GestureSession=true;const companion=alpha0633Companion(),Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!companion.enabled||!Recognition){by('quick-voice-fallback')?.classList.remove('hidden');by('quick-voice-manual-fallback')?.setAttribute('open','');if(mode==='response')alpha0633ShowAnswerFallback('Automatic listening is unavailable. Tap to Answer or use the confirmation buttons.');else if(by('voice-status'))by('voice-status').textContent=companion.enabled?'Voice recognition is unavailable. Type the request or open Diary Add Food.':'Choose a companion in Settings, or type the request below.';return false;}
  alpha0633ListenMode=mode;ext.ui.prefersVoiceEntry=true;saveExt();alpha0633CancelSpeech();alpha0633SetState('startListening');by('voice-response-mic')?.classList.add('hidden');by('stop-voice-log')?.classList.remove('hidden');if(by('voice-status'))by('voice-status').textContent=mode==='response'?'Listening for your answer…':'Listening… Speak naturally.';let captured='',ended=false;recognition=new Recognition();recognition.lang=mainData().preferences?.language||'en-AU';recognition.continuous=false;recognition.interimResults=true;recognition.onresult=event=>{let text='';for(let i=event.resultIndex;i<event.results.length;i++)text+=event.results[i][0].transcript;captured=text.trim()||captured;if(mode==='request'&&by('voice-transcript'))by('voice-transcript').value=captured;};recognition.onerror=event=>{ended=true;const denied=event.error==='not-allowed'||event.error==='service-not-allowed';alpha0633StopVoice();alpha0633SetState('error',{error:event.error});if(mode==='response')alpha0633ShowAnswerFallback(denied?'Microphone permission was not granted. Tap to Answer later or use the buttons.':'Automatic listening stopped. Tap to Answer or use the buttons.');else if(by('voice-status'))by('voice-status').textContent=denied?'Microphone permission was not granted. Type the request or use Diary Add Food.':`Voice recognition stopped: ${event.error}. Try again or type the request.`;if(denied){by('quick-voice-fallback')?.classList.remove('hidden');by('quick-voice-manual-fallback')?.setAttribute('open','');}};recognition.onend=()=>{if(alpha0633ResponseTimer)clearTimeout(alpha0633ResponseTimer);alpha0633ResponseTimer=null;recognition=null;by('stop-voice-log')?.classList.add('hidden');if(ended)return;if(!captured){if(mode==='response')alpha0633ShowAnswerFallback('I stopped listening. Tap to Answer or use the buttons.');return;}if(mode==='request'){if(by('voice-transcript'))by('voice-transcript').value=captured;alpha0633SetState('captured',{transcript:captured,originalTranscript:captured});alpha0633InterpretTranscript({speak:true});}else{alpha0633GestureSession=false;alpha0633HandleResponse(captured);}};try{recognition.start();if(mode==='response')alpha0633ResponseTimer=setTimeout(()=>{if(recognition){ended=true;alpha0633StopVoice(false);alpha0633ShowAnswerFallback('I stopped listening after 7 seconds. Tap to Answer or use the buttons.');}},7000);return true;}catch{alpha0633StopVoice();alpha0633SetState('error',{error:'start'});if(mode==='response')alpha0633ShowAnswerFallback('Automatic listening needs another gesture on this device. Tap to Answer.');return false;}
}
function alpha0633CommitPending(pending){
  if(pending.actionType===CONVERSATION?.actionTypes?.RECORD_WEIGHT){const outcome=window.HECWeightCheckIn?.saveVoice?.({date:pending.localDate,weightKg:pending.weightKg})||{status:'unavailable'},result=[];result.rc6={actionType:pending.actionType,outcome};return result;}
  if(pending.actionType===CONVERSATION?.actionTypes?.REMOVE_FOOD){const before=clone(entriesForDate(pending.localDate)),applied=CONVERSATION?.applyRemoval?.(before,pending);if(applied?.status!=='applied')throw new Error(applied?.message||'The Diary changed before removal could be confirmed.');ext.diary[pending.localDate]=applied.records;if(!ext.diary[pending.localDate].length)delete ext.diary[pending.localDate];ext.ui.diaryDate=pending.localDate;saveExt();const result=(applied.changes||[]).map(change=>({date:pending.localDate,id:change.id,change}));result.rc6={actionType:pending.actionType,before,removedQuantity:applied.removedQuantity};return result;}
  const dates=pending.recurrence?Array.from({length:pending.recurrence.count},(_,index)=>shiftISO(pending.recurrence.startDate,index)):[pending.localDate],staged=[];
  for(const date of dates){for(const item of pending.items){const food=getFood(item.foodId);if(!food||!item.loggable)continue;const ref=`${pending.actionId}|${date}|${pending.meal}|${item.canonicalId||item.foodId}`;if((ext.diary[date]||[]).some(entry=>entry.voiceActionRef===ref))continue;const values=scaledNutrients(food,item.amount,item.unit),label=unitLabel(food,item.unit),status=pending.recurrence||date>isoToday()||pending.status==='planned'?'planned':'eaten';staged.push({date,entry:{id:uid('entry'),foodId:food.id,canonicalId:item.canonicalId||C8?.canonicalKey?.(food)||food.id,name:food.name,brand:food.brand,date,meal:pending.meal,status,amount:item.amount,unit:item.unit,unitLabel:label,time:status==='planned'?'':localClock(),notes:status==='planned'?'Planned after companion voice confirmation':'Recorded after companion voice confirmation',nutrients:values,foodSnapshot:P8?.diarySnapshot?.(food,{amount:item.amount,unit:item.unit,unitLabel:label,nutrients:values})||null,foodGroups:scaledFoodGroups(food,item.amount,item.unit),foodGroupAttribution:foodGroupAttributionState(food),waterMl:scaledWaterMl(food,item.amount,item.unit),hydrationType:food.hydrationType||'food',score:food.score,source:`Companion Confirmed Action · ${food.source}`,localDate:date,timeZone:activeTimeZone(),voiceActionRef:ref,plannerRef:status==='planned'?`voice-plan|${ref}`:'',createdAt:new Date().toISOString()}});}}
  for(const record of staged){ext.diary[record.date]||=[];ext.diary[record.date].push(record.entry);}ext.ui.diaryDate=dates[0]||pending.localDate;saveExt();return staged.map(record=>({date:record.date,id:record.entry.id}));
}
function alpha0633UndoCreated(created=[]){if(created.rc6?.actionType===CONVERSATION?.actionTypes?.REMOVE_FOOD){ext.diary[created[0]?.date||voiceParsed.localDate]=clone(created.rc6.before);saveExt();renderDiary();return created.length;}for(const record of created){ext.diary[record.date]=(ext.diary[record.date]||[]).filter(entry=>entry.id!==record.id);if(!ext.diary[record.date].length)delete ext.diary[record.date];}saveExt();renderDiary();return created.length;}
const alpha0633SaveAdapter=CONVERSATION?.createSaveAdapter?.({save:alpha0633CommitPending,undo:alpha0633UndoCreated})||null;
function alpha0633SavePending(){
  if(alpha0633VoiceSaveLocked||!rc6VoiceActionReady(voiceParsed)||(voiceParsed.unresolved||[]).length)return;alpha0633VoiceSaveLocked=true;alpha0633GestureSession=false;alpha0633SetState('save',{pendingAction:voiceParsed});const confirm=by('confirm-voice-log');if(confirm)confirm.disabled=true;let outcome;
  try{outcome=alpha0633SaveAdapter?.confirm?.(voiceParsed)||{saved:true,result:alpha0633CommitPending(voiceParsed)};}catch(error){alpha0633VoiceSaveLocked=false;if(confirm)confirm.disabled=false;alpha0633SetState('error',{error:String(error?.message||error)});showActionToast('That request was not saved. Please review it and try again.',null,5000);return;}
  const created=outcome.result||[],count=created.length,meta=created.rc6||{},companion=alpha0633Companion();if(meta.actionType===CONVERSATION?.actionTypes?.RECORD_WEIGHT){const status=meta.outcome?.status;if(status==='confirmation-required'){alpha0633VoiceSaveLocked=false;if(confirm)confirm.disabled=false;alpha0633SetState('clarify',{pendingAction:voiceParsed});const message='Please complete the existing large-weight-change check. Nothing has been saved yet.';if(by('voice-status'))by('voice-status').textContent=message;showActionToast(message,null,6000);return;}if(!['saved','unchanged'].includes(status)){alpha0633VoiceSaveLocked=false;if(confirm)confirm.disabled=false;alpha0633SetState('clarify',{pendingAction:voiceParsed});const message=status==='before-profile'?'That date is before this Companion profile began. Choose a later date.':'The existing Weight Check-In validation did not save that entry. Review the date and weight.';showActionToast(message,null,6000);return;}const acknowledgement=status==='saved'?`${companion.name} recorded ${rc6WeightText(voiceParsed.weightKg)} kg for ${alpha0633NaturalDate(voiceParsed)}.`:'That date already has the same saved weight.';alpha0633SetState('saved');showActionToast(acknowledgement,null,5000);alpha0633Speak(acknowledgement);openFeature('progress-history',{progressView:'weight'});return;}const planned=created.some(record=>record.date>isoToday()||voiceParsed.status==='planned'),removed=meta.actionType===CONVERSATION?.actionTypes?.REMOVE_FOOD,acknowledgement=outcome.duplicate||!count?'That confirmed action was already completed.':removed?`${companion.name} removed ${formatNumber(meta.removedQuantity||count,true)} from ${voiceParsed.meal}.`:`${companion.name} ${planned?'planned':'recorded'} ${count} ${count===1?'entry':'entries'}.`;alpha0633SetState('saved');if(by('voice-status'))by('voice-status').textContent=acknowledgement;showActionToast(acknowledgement,count?()=>{if(alpha0633SaveAdapter?.state?.().locked)alpha0633SaveAdapter.undo();else alpha0633UndoCreated(created);}:null,8000);alpha0633Speak(acknowledgement);openFeature('food-diary');
}
initialiseVoice=function(){
  alpha0633StopVoice();const fromDiary=ext.ui.quickLogOrigin==='food-diary',date=fromDiary?(ext.ui.diaryDate||isoToday()):isoToday(),meal=fromDiary?(ext.ui.pendingMeal||''):'';if(by('voice-date'))by('voice-date').value=date;if(by('voice-meal'))by('voice-meal').value=meal;alpha0633ResetConversation();const companion=alpha0633Companion(),prompt='Tell me what food or weight you’d like to record. I’ll confirm before saving.',homeImage=by('home-avatar-image'),image=by('quick-voice-avatar-image'),fallback=by('quick-voice-avatar');if(by('quick-voice-companion-name'))by('quick-voice-companion-name').textContent=companion.enabled?companion.name:'Quick Voice Log';if(by('quick-voice-prompt'))by('quick-voice-prompt').textContent=prompt;if(by('quick-voice-wake-hint'))by('quick-voice-wake-hint').textContent=`You can begin with “Hey ${companion.enabled?companion.name:'Companion'}” if that feels natural.`;if(image&&homeImage?.src&&!homeImage.classList.contains('hidden')){image.src=homeImage.src;image.alt=companion.enabled?`${companion.name}, your selected companion`:'';image.classList.remove('hidden');fallback?.classList.add('hidden');}else{image?.classList.add('hidden');fallback?.classList.remove('hidden');}const available=companion.enabled&&!!(window.SpeechRecognition||window.webkitSpeechRecognition);if(by('start-voice-log'))by('start-voice-log').disabled=!available;by('quick-voice-fallback')?.classList.toggle('hidden',available);if(!available)by('quick-voice-manual-fallback')?.setAttribute('open','');alpha0633PromptTimer=setTimeout(()=>alpha0633Speak(prompt),120);
};
const alpha0615StartVoice=startVoice;startVoice=()=>alpha0633StartListening('request');
by('voice-date')?.addEventListener('change',()=>{alpha0633StopVoice();if(!voiceParsed?.items?.length)return;const next=by('voice-date').value;if(voiceParsed.recurrence){voiceParsed.recurrence.startDate=next;voiceParsed.recurrence.endDate=shiftISO(next,voiceParsed.recurrence.count-1);}voiceParsed.localDate=next;voiceParsed.status=voiceParsed.recurrence||next>isoToday()||voiceParsed.intent==='plan'?'planned':'eaten';voiceParsed.ambiguities=(voiceParsed.ambiguities||[]).filter(item=>item.field!=='date');voiceParsed.unresolved=(voiceParsed.unresolved||[]).filter(item=>!['date','timing'].includes(item.field));if(voiceParsed.intent==='past'&&next>isoToday())voiceParsed.unresolved.push({field:'timing',message:'That sounds eaten, but the date is in the future. Should this be planned instead?'});if(voiceParsed.intent==='plan'&&next<isoToday())voiceParsed.unresolved.push({field:'timing',message:'That sounds planned, but the date is in the past. Should this be recorded as eaten instead?'});alpha0633RenderVoiceReview({speak:false});});
by('voice-meal')?.addEventListener('change',()=>{alpha0633StopVoice();if(!voiceParsed?.items?.length)return;voiceParsed.meal=by('voice-meal').value;voiceParsed.unresolved=(voiceParsed.unresolved||[]).filter(item=>item.field!=='meal'||!voiceParsed.meal);alpha0633RenderVoiceReview({speak:false});});
document.addEventListener('click',event=>{const control=event.target.closest('#start-voice-log,#voice-response-mic,#stop-voice-log,#parse-voice-log,#confirm-voice-log,#change-voice-log,#view-voice-details,#cancel-voice-review,#clear-voice-log,#quick-log-cancel');if(!control)return;event.preventDefault();event.stopImmediatePropagation();if(control.id==='start-voice-log'){alpha0633StartListening('request');return;}if(control.id==='voice-response-mic'){alpha0633GestureSession=true;alpha0633StartListening('response');return;}if(control.id==='stop-voice-log'){alpha0633GestureSession=false;alpha0633StopVoice(false);return;}if(control.id==='parse-voice-log'){alpha0633InterpretTranscript({speak:true});return;}if(control.id==='confirm-voice-log'){alpha0633SavePending();return;}if(control.id==='change-voice-log'){alpha0633HandleResponse('change');return;}if(control.id==='view-voice-details'){by('voice-review-items')?.classList.toggle('hidden');by('quick-voice-manual-fallback')?.setAttribute('open','');return;}if(control.id==='cancel-voice-review'||control.id==='clear-voice-log'){alpha0633ResetConversation({focusTranscript:control.id==='clear-voice-log'});return;}if(control.id==='quick-log-cancel'){alpha0633GestureSession=false;alpha0633StopVoice();voiceParsed=[];alpha0633SetState('cancel');ext.ui.diaryDate=by('voice-date')?.value||ext.ui.diaryDate||isoToday();const dest=ext.ui.quickLogOrigin||'home';saveExt();openFeature(dest);}},true);
document.addEventListener('click',event=>{const remove=event.target.closest('[data-remove-voice-item]');if(!remove||!remove.closest('#voice-review'))return;event.preventDefault();event.stopImmediatePropagation();voiceParsed.items?.splice(Number(remove.dataset.removeVoiceItem),1);voiceParsed.entryCount=(voiceParsed.recurrence?.count||1)*(voiceParsed.items?.length||0);alpha0633RenderVoiceReview({speak:false});},true);
document.addEventListener('input',event=>{const amount=event.target.closest?.('[data-voice-item-amount]');if(amount&&voiceParsed.items?.[Number(amount.dataset.voiceItemAmount)]){voiceParsed.items[Number(amount.dataset.voiceItemAmount)].amount=Math.max(.01,n(amount.value)||.01);voiceParsed.saveLockIdentity=CONVERSATION?.saveLockKey?.(voiceParsed)||voiceParsed.actionId;}});
document.addEventListener('change',event=>{const amount=event.target.closest?.('[data-voice-item-amount]');if(amount&&voiceParsed.items?.[Number(amount.dataset.voiceItemAmount)]){voiceParsed.items[Number(amount.dataset.voiceItemAmount)].amount=Math.max(.01,n(amount.value)||.01);alpha0633RenderVoiceReview({speak:false});return;}const unit=event.target.closest?.('[data-voice-item-unit]');if(unit&&voiceParsed.items?.[Number(unit.dataset.voiceItemUnit)]){voiceParsed.items[Number(unit.dataset.voiceItemUnit)].unit=unit.value;alpha0633RenderVoiceReview({speak:false});}});
by('quick-voice-open-diary')?.addEventListener('click',()=>{alpha0633StopVoice();ext.ui.diaryDate=by('voice-date')?.value||isoToday();saveExt();openFeature('food-diary');});
const alpha0633BeforeScreenShow=window.HECBeforeScreenShow;window.HECBeforeScreenShow=function(id){if(id!=='quick-log'){alpha0633GestureSession=false;alpha0633StopVoice();alpha0633CancelSpeech();}alpha0633BeforeScreenShow?.(id);};
// Scan methods launched from Quick Food Log return to its method chooser, not to a stale Food Library state.
document.addEventListener('click',event=>{const back=event.target.closest('#scan-centre-back');if(!back||ext.ui.scanReturn!=='quick-log')return;event.preventDefault();event.stopImmediatePropagation();try{stopBarcodeCamera?.();}catch{}ext.ui.scanReturn='';saveExt();openFeature('quick-log');},true);

/* 9. Source badges stay visible wherever a saved/user-owned food appears, and
   saving/removing uses an explicit menu rather than a fragile tick target. */
const alpha0615ResourceFoodRow=resourceFoodRow;
resourceFoodRow=function(food){
  let html=alpha0615ResourceFoodRow(food);
  const owned=food.source==='User Created'||food.barcode||ext.foodVerification?.[food.id];
  if(owned&&!html.includes('food-source-badge')){
    const meta=ext.foodVerification?.[food.id]||{};let icon='✎',label='Manual',cls='manual';
    if(String(meta.method||'').includes('nutrition-panel')||/nutrition panel/i.test(food.source||'')){icon='▤';label='Nutrition Panel';cls='panel';}
    else if(food.barcode||String(meta.method||'').includes('barcode')){icon='▦';label='Barcode';cls='barcode';}
    html=html.replace('</strong><small>',` <span class="food-source-badge ${cls}" title="${label}"><span aria-hidden="true">${icon}</span> ${label}</span></strong><small>`);
  }
  return html;
};
by('start-voice-log')?.addEventListener('click',()=>by('stop-voice-log')?.classList.remove('hidden'));

ext.version='0.6.16';saveExt();


init();


/* ================================================================
   Alpha 0.6.16 founder workflow & food-integrity patch
   ================================================================ */
const ALPHA0616_BUILD='0.6.16';

/* A. Continuous meal-entry session: when Add Food was opened from Breakfast,
   Lunch, Dinner, Snacks or Other, a successful add returns to that same food
   search context so another item can be added immediately. A clear Done button
   ends the session and returns to the meal. */
function alpha0616MealSessionActive(){return !!(ext.ui?.mealEntrySession?.meal&&ext.ui?.mealEntrySession?.date);}
function alpha0616SetMealSession(meal,date){ext.ui.mealEntrySession={meal,date:date||ext.ui.diaryDate||isoToday()};ext.ui.pendingMeal=meal;ext.ui.diaryDate=date||ext.ui.diaryDate||isoToday();saveExt();}
function alpha0616ClearMealSession(){if(ext.ui){delete ext.ui.mealEntrySession;}saveExt();}
const alpha0616OpenFeature=openFeature;
openFeature=function(id,options={}){
  alpha0616OpenFeature(id,options);
  if(id==='food-library')setTimeout(alpha0616RenderMealSessionBanner,0);
};
function alpha0616RenderMealSessionBanner(){
  const context=by('library-entry-context'); if(!context)return;
  const session=ext.ui?.mealEntrySession;
  context.querySelector('.meal-entry-session-actions')?.remove();
  if(!session?.meal)return;
  context.classList.remove('hidden');
  if(!context.textContent.includes('Adding to')) context.insertAdjacentHTML('afterbegin',`<span>Adding to <strong>${esc(session.meal)}</strong> on ${esc(relativeDateLabel(session.date))}</span>`);
  context.insertAdjacentHTML('beforeend',`<div class="meal-entry-session-actions"><button type="button" class="primary" data-finish-meal-entry="${esc(session.meal)}">Done Adding To ${esc(session.meal)}</button><small>Add as many foods as you need. You will stay in ${esc(session.meal)} until you tap Done.</small></div>`);
}
const alpha0616RenderLibrary=renderLibrary;
renderLibrary=function(){alpha0616RenderLibrary();alpha0616RenderMealSessionBanner();};
document.addEventListener('click',event=>{
  const add=event.target.closest('[data-add-to-meal]');
  if(add){alpha0616SetMealSession(add.dataset.addToMeal,ext.ui.diaryDate||isoToday());}
  const finish=event.target.closest('[data-finish-meal-entry]');
  if(finish){const meal=finish.dataset.finishMealEntry,date=ext.ui?.mealEntrySession?.date||ext.ui.diaryDate||isoToday();alpha0616ClearMealSession();ext.ui.pendingMeal='';ext.ui.diaryDate=date;ext.ui.focusMeal=meal;saveExt();alpha0616OpenFeature('food-diary');return;}
},true);
const alpha0616SaveEditorEntry=saveEditorEntry;
saveEditorEntry=function(andSaveFood=false){
  const session=ext.ui?.mealEntrySession?{...ext.ui.mealEntrySession}:null;
  const wasEditing=!!editorState?.entryId;
  const before=Object.values(ext.diary||{}).reduce((n,list)=>n+(list?.length||0),0);
  alpha0616SaveEditorEntry(andSaveFood);
  const after=Object.values(ext.diary||{}).reduce((n,list)=>n+(list?.length||0),0);
  if(!wasEditing&&session?.meal&&after>before){
    ext.ui.mealEntrySession=session;ext.ui.pendingMeal=session.meal;ext.ui.diaryDate=session.date;ext.ui.libraryTab='all';ext.ui.foodSearch='';saveExt();
    setTimeout(()=>{alpha0616OpenFeature('food-library',{freshSearch:true});showActionToast(`Added to ${session.meal}. Add another food, or tap Done when ${session.meal} is complete.`,null,2800);},0);
  }
};

/* B. Delete/Undo refreshes whichever diary/progress screen is currently open,
   rather than leaving a deleted item visually present until navigation. */
function alpha0616RefreshVisibleDay(){
  if(q('#food-diary.active'))renderDiary();
  if(q('#daily-progress.active'))renderDailyProgress();
  if(q('#progress-history.active'))renderHistory(currentPeriod());
}
const alpha0616RequestDeleteEntry=requestDeleteEntry;
requestDeleteEntry=function(id){
  return deleteDiaryEntryWithUndo(id);
};

/* C. Energy is Australian-label friendly: always expose both Cal and kJ in
   review cards. Calories remain the app's planning unit, with kJ derived using
   the standard 4.184 kJ per kcal conversion. */
function alpha0616Kj(cal){const c=Number(cal);return Number.isFinite(c)?Math.round(c*4.184):0;}
const alpha0616NutritionCards=nutritionCards;
nutritionCards=function(values){
  let html=alpha0616NutritionCards(values||{});
  const cal=Number(values?.calories);
  if(Number.isFinite(cal)) html=html.replace(/(<strong>\s*Calories\s*<\/strong>[\s\S]*?<b>)([^<]*)(<\/b>)/i,(m,a,b,c)=>`${a}${formatNumber(cal)} Cal · ${alpha0616Kj(cal).toLocaleString('en-AU')} kJ${c}`);
  return html;
};

/* D. Stage 8 capture foundation now owns Nutrition Panel parsing. It converts
   printed kJ to Calories while preserving the two printed column identities. */

/* E. Saved-food integrity. Search hides records explicitly superseded by a
   newer canonical record and collapses exact barcode duplicates. Historical
   Diary entries are untouched because they remain nutrition snapshots. */
ext.foodCanonical ||= {superseded:{},lastIntegrityRun:null};
function alpha0616FoodAuthority(food){
  const meta=ext.foodVerification?.[food.id]||{};let score=0;
  if(meta.packageVerifiedAt)score+=500;if(meta.method==='nutrition-panel'||/nutrition panel/i.test(String(food.source||'')))score+=350;
  if(food.barcode)score+=220;if(food.verified)score+=150;if(food.source==='User Created')score+=120;
  const stamp=meta.packageVerifiedAt||meta.savedAt||food.updatedAt||food.createdAt;if(stamp){const t=new Date(stamp).getTime();if(Number.isFinite(t))score+=Math.min(100,Math.max(0,(t-Date.UTC(2020,0,1))/31557600000));}
  return score;
}
function alpha0616DedupeFoods(list){
  const out=[],seenBarcode=new Map();
  for(const food of list||[]){
    if(!food||ext.foodCanonical?.superseded?.[food.id])continue;
    const code=String(food.barcode||'').replace(/\D/g,'');
    if(code){const old=seenBarcode.get(code);if(old){if(alpha0616FoodAuthority(food)>alpha0616FoodAuthority(old)){const i=out.indexOf(old);if(i>=0)out[i]=food;seenBarcode.set(code,food);}continue;}seenBarcode.set(code,food);}
    out.push(food);
  }
  return out;
}
const alpha0616AllFoods=allFoods;
allFoods=function(){return alpha0616DedupeFoods(alpha0616AllFoods());};
function alpha0616MarkSuperseded(oldId,newId){if(!oldId||!newId||oldId===newId)return;ext.foodCanonical ||= {superseded:{}};ext.foodCanonical.superseded[oldId]={replacedBy:newId,at:new Date().toISOString()};saveExt();}

/* When a saved scanned product has the same barcode as an existing record,
   prefer the most recently package-verified copy in searches. */
function alpha0616RunFoodIntegrity(){
  const foods=[...FOODS,...(ext.customFoods||[]),...(ext.onlineFoods||[])];const groups={};
  foods.forEach(f=>{const code=String(f?.barcode||'').replace(/\D/g,'');if(code)(groups[code] ||= []).push(f);});
  Object.values(groups).forEach(group=>{if(group.length<2)return;const best=[...group].sort((a,b)=>alpha0616FoodAuthority(b)-alpha0616FoodAuthority(a))[0];group.forEach(f=>{if(f.id!==best.id&&alpha0616FoodAuthority(best)>alpha0616FoodAuthority(f))alpha0616MarkSuperseded(f.id,best.id);});});
  ext.foodCanonical.lastIntegrityRun=new Date().toISOString();saveExt();
}
setTimeout(alpha0616RunFoodIntegrity,300);

/* F. Source status made clearer: current package-verified foods say so, while
   unverified online/package data remains visibly reviewable. */
const alpha0616ResourceFoodRow=resourceFoodRow;
resourceFoodRow=function(food){
  let html=alpha0616ResourceFoodRow(food);const meta=ext.foodVerification?.[food.id];
  const badge=meta?.packageVerifiedAt?'Package Verified':(String(meta?.method||'').includes('nutrition-panel')||/nutrition panel/i.test(food.source||'')?'Nutrition Panel':food.barcode?'Barcode':food.source==='User Created'?'Manual':'');
  if(badge&&!html.includes(`>${badge}<`))html=html.replace(/<strong>([\s\S]*?)<\/strong>/,`<strong>$1 <span class="food-source-badge alpha0616-source">${esc(badge)}</span></strong>`);
  return html;
};

/* G. Back from an entry editor/search retains the active meal-entry session;
   Home or an explicit Done ends it. */
document.addEventListener('click',event=>{
  if(event.target.closest('[data-go="home"], #home-button, .home-button'))alpha0616ClearMealSession();
});

ext.version='0.6.16';saveExt();

/* ================================================================
   Alpha 0.6.17 founder search, flow & polish patch
   ================================================================ */
const ALPHA0617_BUILD='0.6.17';

/* Search language normalisation: Australians may type brand names and foods
   in natural variants. Keep the user's words meaningful, not punctuation. */
function alpha0617SearchText(value){
  return normalise(value)
    .replace(/\bwoolies\b/g,'woolworths')
    .replace(/\bwoolworth\b/g,'woolworths')
    .replace(/\bblack n gold\b/g,'black and gold')
    .replace(/\bblack gold\b/g,'black and gold')
    .replace(/\bchicko\b|\bchico\b/g,'chiko')
    .replace(/\bpotatoe\b/g,'potato')
    .replace(/\s+/g,' ').trim();
}
const alpha0617SearchRankBase=searchRank;
searchRank=function(food,query){
  const q=alpha0617SearchText(query); if(!q)return alpha0617SearchRankBase(food,q);
  const shadow={...food,
    name:alpha0617SearchText(food.name),
    brand:alpha0617SearchText(food.brand),
    aliases:[...(food.aliases||[]), ...(normalise(food.brand).includes('woolworths')?['woolies']:[])].map(alpha0617SearchText)
  };
  let rank=alpha0617SearchRankBase(shadow,q);
  const qt=q.split(' ').filter(Boolean), hay=alpha0617SearchText([food.name,food.brand,...(food.aliases||[])].join(' '));
  const matched=qt.filter(t=>hay.split(' ').some(h=>h===t||fuzzyTokenMatch(t,h))).length;
  // Specific multi-word searches must not fall back to unrelated foods.
  if(qt.length>=2&&matched<Math.ceil(qt.length*.67))return 0;
  if(qt.length>=3&&matched<qt.length-1)return 0;
  if(matched===qt.length)rank+=qt.length*90;
  if(alpha0617SearchText(food.brand)&&q.startsWith(alpha0617SearchText(food.brand)))rank+=180;
  return rank;
};

const ALPHA0617_BRANDS=['Woolworths','Coles','Aldi','Black & Gold','Seasons Pride','Home Brand','Westacre','Kellogg’s'];
function alpha0617SearchGuide(query){
  const q=alpha0617SearchText(query);if(!q)return '';
  const words=q.split(' '),hasSausage=words.includes('sausage'),hasRoll=words.includes('roll'),hasBeef=words.includes('beef'),hasPork=words.includes('pork'),hasChicken=words.includes('chicken');
  let html='';
  if(hasSausage&&!hasRoll){
    const meatKnown=hasBeef||hasPork||hasChicken;
    html+=`<section class="alpha0617-guide"><strong>${meatKnown?esc(q.replace(/\b\w/g,c=>c.toUpperCase())):'Sausage'}</strong><small>HEC has understood this as a sausage search. Choose only what is still unknown.</small><div class="alpha0617-chips">`;
    if(!meatKnown)html+=['Beef sausage','Pork sausage','Chicken sausage'].map(x=>`<button type="button" data-alpha-search-set="${esc(x)}">${esc(x.replace(' sausage',''))}</button>`).join('');
    if(!/herb|garlic|flavour|flavored|flavoured|plain/.test(q))html+=`<button type="button" data-alpha-search-append="plain">Plain</button><button type="button" data-alpha-search-append="flavoured">Flavoured</button>`;
    html+=`<button type="button" data-alpha-search-append="homemade">Homemade</button><button type="button" data-alpha-search-append="commercial">Commercial</button><button type="button" data-alpha-search-append="takeaway">Takeaway</button>`;
    if(!/grilled|fried|barbecued|bbq|baked|air fried/.test(q))html+=`<button type="button" data-alpha-search-append="grilled">Grilled</button><button type="button" data-alpha-search-append="barbecued">Barbecued</button><button type="button" data-alpha-search-append="fried">Fried</button><button type="button" data-alpha-search-append="baked">Baked</button>`;
    html+='</div></section>';
  }
  if(hasSausage&&hasRoll){
    html+=`<section class="alpha0617-guide"><strong>Sausage Roll</strong><small>Choose the generic food, a familiar retailer/brand, or keep typing. HEC will skip questions already answered by your search.</small><div class="alpha0617-chips"><button type="button" data-alpha-search-set="sausage roll">Generic sausage roll</button>${ALPHA0617_BRANDS.map(b=>`<button type="button" data-alpha-search-set="${esc(b+' sausage roll')}">${esc(b)}</button>`).join('')}</div></section>`;
  }
  const brand=ALPHA0617_BRANDS.find(b=>q.includes(alpha0617SearchText(b)));
  if(brand&&!hasSausage)html+=`<section class="alpha0617-guide"><strong>${esc(brand)} foods</strong><small>Keep typing a food name to narrow this retailer/brand search.</small></section>`;
  return html;
}
function alpha0617SetSearch(value){ext.ui.foodSearch=value;by('food-search').value=value;saveExt();renderLibrary();by('food-search')?.focus();scheduleAllResourcesOnlineSearch();}
document.addEventListener('click',e=>{const set=e.target.closest('[data-alpha-search-set]');if(set){alpha0617SetSearch(set.dataset.alphaSearchSet);return;}const app=e.target.closest('[data-alpha-search-append]');if(app){alpha0617SetSearch(`${by('food-search')?.value||''} ${app.dataset.alphaSearchAppend}`.trim());}});

/* Insert intent guidance above ordinary results without fabricating nutrition
   records for brands we have not yet package-verified. */
const alpha0617RenderLibraryBase=renderLibrary;
renderLibrary=function(){
  // Any meal-context Food Library is automatically a continuous add session.
  if(ext.ui.pendingMeal&&!alpha0616MealSessionActive())alpha0616SetMealSession(ext.ui.pendingMeal,ext.ui.diaryDate||isoToday());
  alpha0617RenderLibraryBase();
  const results=by('food-results'),q=by('food-search')?.value||'';if(results&&q){const guide=alpha0617SearchGuide(q);if(guide)results.insertAdjacentHTML('afterbegin',guide);}
  alpha0616RenderMealSessionBanner();
};

/* Back means back: preserve query, tab, loaded results and approximate scroll
   position while the user inspects a food. */
ext.ui.foodSearchSnapshot ||= null;
document.addEventListener('click',e=>{const pick=e.target.closest('[data-food-add],[data-food-details],[data-food-review]');if(!pick||!q('#food-library.active'))return;ext.ui.foodSearchSnapshot={query:by('food-search')?.value||ext.ui.foodSearch||'',tab:ext.ui.libraryTab||'all',scrollY:window.scrollY,at:Date.now()};saveExt();},true);
by('entry-editor-back')?.addEventListener('click',()=>{const s=ext.ui.foodSearchSnapshot;if(!s)return;ext.ui.foodSearch=s.query;ext.ui.libraryTab=s.tab;saveExt();setTimeout(()=>{openFeature('food-library');setTimeout(()=>window.scrollTo(0,s.scrollY||0),40);},0);});

/* Continuous meal adding: never lose Dinner/Breakfast/etc after a successful
   add merely because the base save handler briefly navigated away. */
const alpha0617SaveEditorEntryBase=saveEditorEntry;
saveEditorEntry=function(andSaveFood=false){
  const meal=ext.ui?.mealEntrySession?.meal||ext.ui.pendingMeal||by('entry-meal')?.value||'';
  const date=ext.ui?.mealEntrySession?.date||by('entry-date')?.value||ext.ui.diaryDate||isoToday();
  if(meal&&!editorState?.entryId)alpha0616SetMealSession(meal,date);
  alpha0617SaveEditorEntryBase(andSaveFood);
  if(meal&&!editorState?.entryId){setTimeout(()=>{ext.ui.pendingMeal=meal;ext.ui.diaryDate=date;ext.ui.libraryTab='all';ext.ui.foodSearch='';saveExt();openFeature('food-library',{freshSearch:true});},60);}
};

/* Human-facing energy wording: once above target say how far above, never
   imply there are simply zero Calories remaining. */
const alpha0617RenderDiaryBase=renderDiary;
renderDiary=function(){alpha0617RenderDiaryBase();const date=ext.ui.diaryDate||isoToday(),goal=currentGoals(date).calories,recorded=dayNutrition(date).calories,diff=goal-recorded;
  if(by('diary-day-plan-summary')&&goal)by('diary-day-plan-summary').textContent=`${formatNumber(recorded)} Cal Recorded · ${diff>=0?formatNumber(diff)+' Cal Remaining':formatNumber(Math.abs(diff))+' Cal Over'}`;
  const slide=by('diary-day-summary')?.querySelector('.summary-slide');if(slide&&goal){const boxes=slide.querySelectorAll('.diary-kpi-row>div');if(boxes[2])boxes[2].innerHTML=`<small>${diff>=0?'Remaining':'Over'}</small><strong>${formatNumber(Math.abs(diff))} Cal</strong>`;}
};

/* Missing energy is unknown, not zero, for obviously caloric foods. */
const alpha0617ResourceFoodRowBase=resourceFoodRow;
resourceFoodRow=function(food){let html=alpha0617ResourceFoodRowBase(food);const cal=Number(food?.nutrients?.calories);const caloric=/cake|bavarian|pie|sausage|bread|biscuit|cracker|chocolate|bar|cereal|spread|margarine|cheese|meat|chicken|beef|pork/i.test(`${food?.name||''} ${food?.category||''}`);if(cal===0&&caloric)html=html.replace(/0\s*Cal/g,'Nutrition incomplete').replace('resource-row ','resource-row food-warning ');return html;};

ext.version='0.6.17';saveExt();


/* ================================================================
   Alpha 0.6.18 founder workflow, recent-food and Australian-menu patch
   ================================================================ */
const ALPHA0618_BUILD='0.6.18';

/* B. Natural piece units. Online/community databases often expose only 100 g;
   HEC can still let a person say “4 fish fingers”. The conversion is explicitly
   labelled as an estimate unless a package-verified per-piece weight exists. */
function alpha0618NaturalUnits(food){
  if(!food)return food;
  const name=normalise(food.name);
  if(/fish finger/.test(name) && !Object.keys(food.units||{}).some(k=>/finger|piece|item/.test(k))){
    const c=clone(food), baseG=/100\s*g/i.test(c.serving||'')?100:(n(c.defaultUnit==='g'&&c.defaultAmount)||100);
    c.units={...(c.units||{}),finger:25/baseG};
    c.unitLabels={...(c.unitLabels||{}),finger:'fish finger (est. 25 g)'};
    c.aliases=[...(c.aliases||[]),'fish finger','fish fingers','finger'];
    return c;
  }
  return food;
}
const alpha0618GetFoodBase=getFood;
getFood=function(id){return alpha0618NaturalUnits(alpha0618GetFoodBase(id));};

/* C. Copy means copy anywhere: same date is allowed and destination meal is
   explicit. This fixes “Breakfast tomorrow only” when the user meant Dinner today. */
requestCopyEntry=function(id){
  const found=findEntry(id);if(!found)return;
  const meals=['Breakfast','Lunch','Dinner','Snacks','Other'];
  openModal(`Copy ${found.entry.name}`,'Choose where the independent copy should go.','Copy',()=>{
    const date=by('modal-copy-date')?.value||found.date,meal=by('modal-copy-meal')?.value||found.entry.meal;
    const copy={...clone(found.entry),id:uid('entry'),date,localDate:date,meal,status:'eaten',timeZone:activeTimeZone(),...recordTimestamps()};
    ext.diary[date]||=[];ext.diary[date].push(copy);saveExt();
    if(date===ext.ui.diaryDate)renderDiary();
    showActionToast(`${copy.name} copied to ${meal} on ${relativeDateLabel(date)}.`,()=>{ext.diary[date]=(ext.diary[date]||[]).filter(e=>e.id!==copy.id);saveExt();if(date===ext.ui.diaryDate)renderDiary();},8000);
  },`<label>Copy To Date<input id="modal-copy-date" type="date" value="${esc(found.date)}"></label><label>Copy To Meal<select id="modal-copy-meal">${meals.map(m=>`<option ${m===found.entry.meal?'selected':''}>${m}</option>`).join('')}</select></label>`);
};

/* D. Recent foods retain the current meal context/filter. Tapping the food row
   opens the normal quantity/unit review; the + control remains a deliberate
   quick-add. Rapid double taps are ignored for 650 ms, but intentional repeats
   are still allowed after feedback (e.g. three cappuccinos). */
ext.ui.recentMealFilter ||= '';
function alpha0618RecentTargetMeal(entry){return ext.ui.pendingMeal||entry?.meal||'Snacks';}
function alpha0618RenderRecent(){
  const targetDate=ext.ui.recentPlanMode?(ext.ui.plannerDate||isoToday()):(ext.ui.diaryDate||isoToday());
  if(!ext.ui.recentMealFilter)ext.ui.recentMealFilter=ext.ui.pendingMeal||'All';
  const cutoff=shiftISO(isoToday(),-13),all=[];
  Object.entries(ext.diary||{}).forEach(([date,items])=>{if(date<cutoff||date>isoToday())return;(items||[]).forEach(e=>{if(e.status!=='skipped')all.push({date,...e});});});
  all.sort((a,b)=>`${b.date} ${b.time||''}`.localeCompare(`${a.date} ${a.time||''}`));
  const filter=ext.ui.recentMealFilter||'All',filtered=filter==='All'?all:all.filter(e=>e.meal===filter);
  const groups=[];for(const e of filtered){let g=groups.find(x=>x.date===e.date&&x.meal===e.meal);if(!g){g={date:e.date,meal:e.meal,items:[]};groups.push(g);}g.items.push(e);}
  const chips=['All','Breakfast','Lunch','Dinner','Snacks','Other'].map(m=>`<button type="button" data-alpha0618-recent-filter="${m}" class="${m===filter?'active':''}">${m}</button>`).join('');
  const destination=ext.ui.pendingMeal||'';const html=groups.map(g=>`<section class="recent-meal-group" aria-label="${esc(relativeDateLabel(g.date))}, ${esc(g.meal)}"><header class="recent-group-header"><div class="recent-group-title"><small class="recent-day-label">${esc(relativeDateLabel(g.date))}</small><strong>${esc(g.meal)}</strong><span>${g.items.length} ${g.items.length===1?'food':'foods'}</span></div>${g.items.length>1?`<button type="button" data-recent-meal-add="${esc(g.date)}|${esc(g.meal)}">Add To ${esc(destination||g.meal)}</button>`:''}</header><div class="recent-group-foods">${g.items.map(e=>`<div class="recent-entry-row alpha0618-recent-row" data-alpha0618-recent-edit="${esc(e.id)}"><span><strong>${esc(e.name)}</strong><small>${esc(entryNaturalQuantity(e))} · ${energyText(e.nutrients?.calories)}</small></span><button type="button" data-recent-entry-add="${esc(e.id)}" aria-label="Quick add ${esc(e.name)} to ${esc(destination||e.meal)}">＋ Add to ${esc(destination||e.meal)}</button></div>`).join('')}</div></section>`).join('');
  by('food-results').innerHTML=`<div class="recent-meal-filter"><span>Recent 14 Days</span><div>${chips}</div><small>Tap a food to change its amount or unit. Use + Add Food for a quick repeat.</small></div>${html?`<div class="recent-group-list">${html}</div>`:'<div class="resource-empty"><strong>No Recent Foods Yet.</strong><p>Foods used in the last 14 days will appear here.</p></div>'}`;
}
const alpha0618RenderLibraryBase=renderLibrary;
renderLibrary=function(){alpha0618RenderLibraryBase();if((ext.ui.libraryTab||'all')==='recent')alpha0618RenderRecent();};
let alpha0618RecentLockUntil=0;
document.addEventListener('click',e=>{
  const filter=e.target.closest('[data-alpha0618-recent-filter]');if(filter){ext.ui.recentMealFilter=filter.dataset.alpha0618RecentFilter;saveExt();alpha0618RenderRecent();return;}
  const quick=e.target.closest('[data-recent-entry-add]');if(quick){const now=Date.now();if(now<alpha0618RecentLockUntil){e.preventDefault();e.stopImmediatePropagation();return;}alpha0618RecentLockUntil=now+650;return;}
  const row=e.target.closest('[data-alpha0618-recent-edit]');if(row&&!e.target.closest('button')){const found=findEntry(row.dataset.alpha0618RecentEdit);if(!found)return;const food=getFood(found.entry.foodId)||snapshotFood(found.entry),targetMeal=alpha0618RecentTargetMeal(found.entry),targetDate=ext.ui.recentPlanMode?(ext.ui.plannerDate||isoToday()):(ext.ui.diaryDate||isoToday());prepareEntry(food,{date:targetDate,meal:targetMeal,status:'eaten',amount:found.entry.amount,unit:found.entry.unit});}
},true);

/* Returning to Recent keeps the destination meal instead of snapping back to
   Breakfast simply because Breakfast was the last filter shown. */
document.addEventListener('click',e=>{const tab=e.target.closest('[data-library-tab="recent"]');if(tab&&ext.ui.pendingMeal)ext.ui.recentMealFilter=ext.ui.pendingMeal;},true);

/* E. Reliable search Back. Capture the click before older handlers run and
   restore the exact search state once. */
by('entry-editor-back')?.addEventListener('click',e=>{
  const snap=ext.ui.foodSearchSnapshot;if(!snap)return;
  e.preventDefault();e.stopImmediatePropagation();
  ext.ui.foodSearch=snap.query||'';ext.ui.libraryTab=snap.tab||'all';saveExt();
  openFeature('food-library');setTimeout(()=>{if(by('food-search'))by('food-search').value=snap.query||'';renderLibrary();window.scrollTo(0,snap.scrollY||0);},50);
},true);

/* F. DD-like guided sausage path. Search words already supplied by the user
   skip redundant questions. This is a generic Australian estimate, not a
   claim about a butcher/brand product. */
function alpha0618SausageDefaults(query){const q=alpha0617SearchText(query);return {meat:/\bpork\b/.test(q)?'Pork':/\bchicken\b/.test(q)?'Chicken':/\blamb\b/.test(q)?'Lamb':/\bkangaroo\b/.test(q)?'Kangaroo':/\bvegetarian|veggie\b/.test(q)?'Vegetarian':/\bbeef\b/.test(q)?'Beef':'',flavour:/herb|garlic|flavour|flavored|flavoured/.test(q)?'Flavoured':/\bplain\b/.test(q)?'Plain':'',cook:/barbecue|barbecued|bbq/.test(q)?'Barbecued':/\bgrill/.test(q)?'Grilled':/\bfried/.test(q)?'Fried':/\bbaked/.test(q)?'Baked':''};}
function alpha0618Choice(title,choices,onPick){openModal('Sausage',title,'Close',()=>{},`<div class="alpha0618-wizard-list">${choices.map(c=>`<button type="button" class="secondary wide" data-alpha0618-wizard-choice="${esc(c)}">${esc(c)}</button>`).join('')}</div>`);by('a05-modal-confirm')?.classList.add('hidden');qa('[data-alpha0618-wizard-choice]').forEach(b=>b.addEventListener('click',()=>{closeModal();onPick(b.dataset.alpha0618WizardChoice);},{once:true}));}
function alpha0618SausageFood(state){
  const per100={Beef:[280,16,6,22,8,0,1,827],Pork:[300,16,5,24,9,0,1,780],Chicken:[201,17,5,13,4,0,1,650],Lamb:[285,17,5,22,9,0,1,760],Kangaroo:[190,23,4,9,3,0,1,650],Vegetarian:[190,14,11,10,2,4,2,620]}[state.meat]||[260,16,6,19,7,0,1,750];
  const grams={"Long Thin":73,"Long Thick":101,"Cocktail":38}[state.size]||100;const ratio=grams/100;
  const vals=per100.map((v,i)=>i===7?v*ratio:v*ratio); const names=['calories','protein','carbs','fat','satFat','fibre','sugar','sodium'];const nuts={};names.forEach((k,i)=>nuts[k]=round1(vals[i]));
  const id=`guided-sausage-${Date.now()}`;const f={id,name:`${state.meat} Sausage, ${state.flavour}, ${state.cook}`,brand:'Generic Australian Guided Entry',category:'Meat & Seafood',country:'Australia',aliases:['sausage','snag'],defaultAmount:1,defaultUnit:'item',units:{item:1,g:1/grams},unitLabels:{item:`${state.size.toLowerCase()} sausage (${grams} g)`,g:'g'},serving:`1 ${state.size.toLowerCase()} sausage (${grams} g)`,nutrients:nuts,score:5,source:'HEC Guided Australian Estimate · Verify Butcher/Package for Exact Values',verified:false};FOODS.push(f);FOOD_BY_ID.set(id,f);return f;
}
function alpha0618StartSausageWizard(query){const s=alpha0618SausageDefaults(query);const nextMeat=()=>s.meat?nextFlavour():alpha0618Choice('What kind of sausage?',['Beef','Pork','Chicken','Lamb','Kangaroo','Vegetarian','Other'],v=>{s.meat=v==='Other'?'Beef':v;nextFlavour();});const nextFlavour=()=>s.flavour?nextCook():alpha0618Choice('Is it plain or flavoured?',['Plain','Flavoured'],v=>{s.flavour=v;nextCook();});const nextCook=()=>s.cook?nextSize():alpha0618Choice('How was it cooked?',['Grilled','Barbecued','Baked','Fried','Air-Fried','Raw'],v=>{s.cook=v;nextSize();});const nextSize=()=>alpha0618Choice('Choose the closest size. You can use grams instead.',['Long Thin','Long Thick','Cocktail','Grams'],v=>{s.size=v==='Grams'?'Long Thin':v;const f=alpha0618SausageFood(s);prepareEntry(f,{date:ext.ui.diaryDate||isoToday(),meal:ext.ui.pendingMeal||''});if(v==='Grams'){setTimeout(()=>{if(by('entry-unit'))by('entry-unit').value='g';if(by('entry-amount'))by('entry-amount').value=100;updateEntryPreview();},20);}});nextMeat();}

/* G. Australian chain menus. These are menu-discovery guides. Items for which
   this static founder build does not hold current full nutrition are clearly
   marked “Current nutrition verification required” rather than added as 0 Cal.
   Current official menu names are intentionally separated from nutrition data
   so a future protected updater can refresh values without redesigning search. */
const ALPHA0618_CHAIN_MENUS={
  kfc:{label:'KFC Australia',aliases:['kfc'],updated:'21 Aug 2026',groups:{
    'Featured & Value':['Liquid Gold Zinger® Box','Christmas in July Feast','Giant Liquid Gold Sauce','Footy Feed','$24.95 Burger Dinner','$24.95 Boneless Dinner'],
    'Burgers':['Original Crispy Burger','Original Crispy Burger Combo','Original Crispy Bacon & Cheese Burger','Original Crispy Bacon & Cheese Burger Combo','Original Crispy BBQ Bacon Stacker® Burger','Original Crispy BBQ Bacon Stacker® Burger Combo','Double Tender™ Burger','Double Tender™ Burger Combo','Zinger® Burger','Zinger® Burger Combo','Zinger® Bacon & Cheese Burger','Zinger® Bacon & Cheese Burger Combo','Zinger Stacker® Burger','Zinger Stacker® Burger Combo','Zinger® Crunch Burger™','Zinger® Crunch Burger™ Combo'],
    'Boxed Meals':['Liquid Gold Zinger® Box','Zinger® Burger Box','Mega Chicken Box','Original Crispy Burger Box','Original Crispy Bacon & Cheese Burger Box','Original Crispy BBQ Bacon Stacker® Burger Box','3 Piece Box','Original Tenders™ Box','Zinger® Bacon & Cheese Burger Box','Zinger Stacker® Burger Box','Zinger® Crunch Burger™ Box','Original Crunch Twister® Box','Zinger® Crunch Twister® Box'],
    'Chicken':['3 Pieces Wicked Boneless','3 Pieces Wicked Boneless Combo','6 Pieces Wicked Boneless','6 Pieces Wicked Boneless Combo','1 Piece of Chicken','3 Pieces of Chicken','3 Piece Combo','6 Pieces of Chicken','21 Pieces of Chicken','Original Crispy Fillet Piece','Zinger® Fillet Piece','Snack Popcorn Chicken®','Snack Popcorn Chicken® Combo','Regular Popcorn Chicken®','Regular Popcorn Chicken® Combo','Maxi Popcorn Chicken®','Maxi Popcorn Chicken® Combo','3 Wicked Wings®','3 Wicked Wings® Combo','6 Wicked Wings®','6 Wicked Wings® Combo','10 Wicked Wings®','10 Wicked Wings® Combo','3 Original Tenders™','3 Original Tenders™ Combo','5 Original Tenders™','5 Original Tenders™ Combo','6 Nuggets','6 Nugget Combo','10 Nuggets','10 Nugget Combo'],
    'Snack Hacks':['Giant Liquid Gold Sauce','Regular Chips','Original Pepper Mayo Slider','Original BBQ Slider','Original Supercharged Slider','Snack Popcorn Chicken®','3 Nuggets','1 Piece of Chicken','Double Chocolate Mousse','Pepsi Freeze','Mountain Dew Freeze','Raspberry Freeze','Regular Pepsi Max','Regular Pepsi','Regular 7Up','Regular Mountain Dew','Regular Solo','Regular Sunkist No Sugar','Bottled Water','Sparkling Water'],
    'Protein Picks':['Zinger® Protein Pack','Zinger® Protein Bowl','Zinger® Protein Bowl Combo',"Chris' Big Bro Combo"],
    'Shared Meals':['Christmas in July Feast','Footy Feed','Family Feast','Value Feast','Burger Feast','Giant Feast','Mega Burger Feast','Delivery Feast'],
    'Twisters & Bowls':['Zinger® Crunch Twister®','Zinger® Crunch Twister® Combo','Original Crunch Twister®','Original Crunch Twister® Combo','Zinger® Crunch Bowl','Zinger® Crunch Bowl Combo','Original Tenders™ Crunch Bowl','Original Tenders™ Crunch Bowl Combo','Zinger® Protein Bowl','Zinger® Protein Bowl Combo'],
    'Go Buckets & Kids Meals':['Go Bucket® Wicked Boneless','Go Bucket® Popcorn Chicken®','Go Bucket® 1 Original Tender','Go Bucket® 2 Wicked Wings®','Go Bucket® 3 Nuggets','Kids Meal with BBQ Slider','Kids Meal with Nuggets','Kids Meal with Snack Popcorn Chicken®'],
    'Sides & Desserts':['Large Chips','Regular Chips','Double Chocolate Mousse','Crunchy Jalapeno Slaw','Large Potato & Gravy','Regular Potato & Gravy','Large Coleslaw','Regular Coleslaw','Regular Gravy','Dinner Roll','4 Dipping Sauces','Dipping Sauces','Giant Liquid Gold Sauce'],
    'Cold Drinks':['Raspberry Freeze','Pepsi Freeze','Mountain Dew Freeze','Pepsi Max','Pepsi','7Up','Mountain Dew','Solo','Sunkist No Sugar','Bottled Water','Sparkling Water','Apple Juice','Lipton Peach Ice Tea']
  }},
  hj:{label:"Hungry Jack’s Australia",aliases:['hungry jacks','hungry jack s','hungryjack'],updated:'21 Aug 2026',groups:{
    'Whopper & Beef':['Whopper®','Whopper® Cheese','Double Whopper®','Ultimate Double Whopper®','Angry Whopper®','Cowboy Whopper®','Bacon Deluxe','Cheeseburger','Double Cheeseburger'],
    'Chicken Burgers':['Grilled Chicken Burger',"Jack's Fried Chicken Burger",'Spicy Fried Chicken Burger'],
    'Breakfast':['BBQ Brekky Wrap','Big BBQ Brekky Wrap','Mega BBQ Brekky Wrap','French Toast Fingers',"Jack’s Brekky Roll",'Bacon & Egg Turkish Brekky Roll','Sausage & Egg Turkish Brekky Roll','Hash Brown','Cheese Toastie','Ham & Cheese Toastie','Ham Cheese & Tomato Toastie','Brekky Hunger Tamers'],
    'Sides & Snacks':['Thick Cut Chips','Battered Onion Rings','3 Nuggets & Chips Carry Cup','3 Nuggets & Sauce','6 Nuggets & Sauce','12 Nuggets & Sauces','18 Nuggets & Sauces',"3 Jack's Fried Chicken Southern Style Tenders","5 Jack's Fried Chicken Southern Style Tenders",'Creamy Pepper Tender Snack Wrap','Spicy Tender Snack Wrap','Smoky BBQ Tender Snack Wrap'],
    'Plant Based & Veggie':['Plant Based Whopper®','Vegan Whopper Cheese'],
    'Cold Drinks':['Coke®','Coke® No Sugar','Vanilla Coke®','Sprite®','Fanta® Orange','Fanta® Raspberry','Chocolate Shake','Strawberry Shake','Vanilla Shake','Caramel Shake','Orange Fruit Drink','Keri® Apple Juice','Mount Franklin® Spring Water','Dirty Cola','Blue Lagoon','Blue Lagoon with Creamer','Strawberry Dream','Strawberry Dream with Creamer'],
    'Desserts':['Storm','Sundae','Soft Serve Cone','Original Glazed® Doughnut','Strawberry Sprinkle Doughnut','Choc Iced Doughnut','Classic Assorted 4 Pack']
  }}
};
Object.values(ALPHA0618_CHAIN_MENUS).forEach(c=>{if(c.groups)c.items=[...new Set(Object.values(c.groups).flat())];});
function alpha0618ChainFor(query){const q=alpha0617SearchText(query).replace(/'/g,' ');return Object.values(ALPHA0618_CHAIN_MENUS).find(c=>c.aliases.some(a=>q.includes(a)))||null;}
function alpha0618ChainGuide(query){const c=alpha0618ChainFor(query);if(!c)return'';const q=alpha0617SearchText(query),tail=q.replace(c.aliases.find(a=>q.includes(a))||'','').trim();let items=c.items.filter(x=>!tail||normalise(x).split(' ').some(t=>normalise(tail).includes(t))||normalise(x).includes(tail));if(!items.length)items=c.items;return `<section class="alpha0618-chain-guide"><strong>${esc(c.label)}</strong><small>Australian menu guide · choose an item. HEC will never turn missing nutrition into 0 Cal.</small>${items.slice(0,20).map(x=>`<button type="button" data-alpha0618-chain-item="${esc(c.label)}|${esc(x)}">${esc(x)}</button>`).join('')}</section>`;}
function alpha0626ChainByLabel(label){return Object.values(ALPHA0618_CHAIN_MENUS).find(c=>c.label===label)||null;}
function alpha0626ChainGroup(name){const n=normalise(name);if(/mcmuffin|brekkie|breakfast|hotcake|hash brown/.test(n))return 'Breakfast';if(/nugget|tender|wing|original recipe chicken/.test(n))return 'Chicken & Nuggets';if(/chip|fries|potato|gravy/.test(n))return 'Sides';if(/coca|sprite|fanta|soft drink|pepsi|7up|mountain dew|drink/.test(n))return 'Drinks';return 'Burgers & Main Items';}
function alpha0626OpenChainMenu(label){const c=alpha0626ChainByLabel(label);if(!c)return;const groups=c.groups||(()=>{const x={};c.items.forEach(name=>{const g=alpha0626ChainGroup(name);(x[g]||=[]).push(name);});return x;})();const html=Object.entries(groups).filter(([,items])=>items?.length).map(([g,items])=>`<section class="alpha0626-chain-group"><h4>${esc(g)}</h4>${items.map(name=>`<button type="button" class="secondary wide" data-alpha0618-chain-item="${esc(c.label)}|${esc(name)}">${esc(name)}</button>`).join('')}</section>`).join('');openModal(c.label,`Current Australian menu snapshot${c.updated?` · checked ${c.updated}`:''}. Choose the closest item. HEC will stop before Diary entry when verified nutrition is not yet available.`,'Close',()=>{},html);by('a05-modal-confirm')?.classList.add('hidden');}

function alpha0618ChainItem(chain,name){
  // A small set has current official data in this founder build; all other menu
  // names remain discoverable but must be verified before Diary entry.
  const known={
    "Hungry Jack’s Australia|Whopper®":{kj:2437,protein:28.1,fat:45.2,satFat:13.4,carbs:46.6,sugar:11.6,sodium:846},
    "Hungry Jack’s Australia|Whopper® Cheese":{kj:2747,protein:32.7,fat:51,satFat:17.2,carbs:47.5,sugar:12.2,sodium:1162},
    "Hungry Jack’s Australia|BBQ Brekky Wrap":{kj:2469,protein:37.2,fat:33.2,satFat:14.4,carbs:35.8,sugar:8.5,sodium:1024},
    "Hungry Jack’s Australia|Jack’s Brekky Roll":{kj:2477,protein:34.7,fat:36.9,satFat:15.7,carbs:30.9,sugar:7.4,sodium:1050},
    "KFC Australia|Zinger® Burger":{kj:1874}
  }[`${chain}|${name}`];
  if(!known)return null;const cal=Math.round(known.kj/4.184);return {id:`chain-${Date.now()}`,name,brand:chain,category:'Takeaway / Restaurant',country:'Australia',aliases:[chain,name],defaultAmount:1,defaultUnit:'serve',units:{serve:1},unitLabels:{serve:'Item'},serving:'1 item',nutrients:{calories:cal,protein:known.protein??null,carbs:known.carbs??null,fat:known.fat??null,satFat:known.satFat??null,fibre:null,sugar:known.sugar??null,sodium:known.sodium??null},score:6,source:`Australian Official Menu Data Snapshot · verify current menu`,verified:true};
}
function alpha0618ShowUnverifiedChainItem(chain,name){const query=by('food-search')?.value||ext.ui.foodSearch||'';closeModal();editorState=null;ext.ui.replacingEntryId='';ext.ui.foodSearch=query;saveExt();openFeature('food-library');setTimeout(()=>openModal(name,`HEC recognises this ${chain} item, but the current HEC dataset does not yet contain a complete verified nutrition record for it. Nothing has been added.`,`Close`,()=>{},`<div class="status-box"><strong>Nutrition Information Needed</strong><p>HEC will not borrow calories from another menu item or create a false 0-Cal entry. Choose another verified result, scan/read package information where applicable, or try again after the menu data is updated.</p></div>`),0);}

document.addEventListener('click',e=>{const w=e.target.closest('[data-alpha0618-sausage-wizard]');if(w){alpha0618StartSausageWizard(by('food-search')?.value||'sausage');return;}const menu=e.target.closest('[data-alpha0626-chain-menu]');if(menu){e.preventDefault();e.stopPropagation();alpha0626OpenChainMenu(menu.dataset.alpha0626ChainMenu);return;}const item=e.target.closest('[data-alpha0618-chain-item]');if(item){e.preventDefault();e.stopPropagation();const [chain,name]=item.dataset.alpha0618ChainItem.split('|'),f=alpha0618ChainItem(chain,name);if(!f){alpha0618ShowUnverifiedChainItem(chain,name);return;}FOODS.push(f);FOOD_BY_ID.set(f.id,f);prepareEntry(f,{date:ext.ui.diaryDate||isoToday(),meal:ext.ui.pendingMeal||''});}},true);

/* H. Search presentation prioritises guided intent and Australia. “Burger King”
   is suppressed as an Australian chain query; Hungry Jack’s is the local brand. */
const alpha0618RenderLibraryGuidesBase=renderLibrary;
renderLibrary=function(){
  alpha0618RenderLibraryGuidesBase();
  const results=by('food-results'),query=by('food-search')?.value||'';if(!results||!query)return;
  const qn=alpha0617SearchText(query);
  if(/\bburger king\b/.test(qn)){results.innerHTML='<div class="resource-empty"><strong>Burger King Is Not An Australian Chain.</strong><p>Try Hungry Jack’s for the Australian menu, or search the individual food name.</p></div>';return;}
  const chain=alpha0618ChainGuide(query);if(chain)results.insertAdjacentHTML('afterbegin',chain);
  if(/\bsausage\b/.test(qn)&&!/\bsausage roll\b/.test(qn))results.insertAdjacentHTML('afterbegin',`<section class="alpha0618-primary-intent"><button type="button" data-alpha0618-sausage-wizard="1"><strong>Sausage — Guided Entry</strong><small>Choose meat → plain/flavoured → cooking method → size/grams. Words you already typed are skipped.</small></button></section>`);
};

/* I. Chain aliases and natural Australian brand wording rank properly. */
const alpha0618SearchTextBase=alpha0617SearchText;
function alpha0618SearchText(value){return alpha0618SearchTextBase(value).replace(/\bmaccas\b/g,'mcdonalds').replace(/\bmacca s\b/g,'mcdonalds').replace(/\bhungry jack s\b/g,'hungry jacks');}
const alpha0618RankBase=searchRank;
searchRank=function(food,query){const q=alpha0618SearchText(query);if(/\bburger king\b/.test(q)&&normalise(food.brand).includes('burger king'))return 0;return alpha0618RankBase(food,q);};

/* J. Version/data continuity. */
ext.version='0.6.18';saveExt();

/* ================================================================
   Alpha 0.6.32 — AUSTRALIAN ENTITY REGISTRY + FOOD INTELLIGENCE
   ================================================================
   One active search controller. Search behaviour is data-driven:
   - Query parser separates quantity/unit from food identity.
   - Generic foods resolve to a food concept, then facets are derived from
     Australian food records plus reusable category/taxonomy metadata.
   - Brand/product queries progressively narrow real product records.
   - Unknown foods use the same dynamic concept/refinement path when a strong
     database concept exists; otherwise HEC offers safe search/scan/create fallbacks.
   - Extra query words may only preserve or increase specificity.
*/
const ALPHA0623_BUILD=ACTIVE_VERSION;
const REG29=window.HECAustralianEntityRegistry;
const S23=window.HECSearchFoundation;
const B25=window.HECGuidedBranching;
const C8=window.HECFoodCatalogue;
const P8=window.HECPackagedFoods;
let alpha0623ShowRaw=false;
let alpha0623Wizard=null;

function s23Norm(v){return S23?.norm?S23.norm(v):normalise(v);}
function s23Singular(v){return S23?.singular?S23.singular(v):s23Norm(v);}
function s23Title(v){return S23?.title?S23.title(v):String(v||'').replace(/\b\w/g,c=>c.toUpperCase());}
function s23Parsed(v){return S23?.parseQuery?S23.parseQuery(v):{raw:String(v||''),normalised:s23Norm(v),food:s23Singular(v),quantityExplicit:false,quantity:1,unit:'',tokens:s23Singular(v).split(' ').filter(Boolean)};}
// Replace the permissive legacy substring ranker with token-aware matching.
// This makes `banana` outrank banana bread and prevents `pie` matching `piece`.
const alpha0623LegacyRank=searchRank;
// Alpha 0.6.32: parse/identify the query once, not once per food record. The
// 0.6.29 ranker was correct but repeatedly rescanned the entity registry while
// AFCD, local and online foods were being ranked on every keystroke.
const alpha0630QueryContextCache=new Map();
function alpha0630QueryContext(raw){
  const key=s23Norm(raw);if(!key)return{parsed:s23Parsed(raw),entities:[],residualTokens:[]};let ctx=alpha0630QueryContextCache.get(key);if(ctx)return ctx;
  const parsed=s23Parsed(raw),entities=REG29?.identify?REG29.identify(raw):[],residual=parsed.entityResidual??(REG29?.stripRecognisedEntities?REG29.stripRecognisedEntities(parsed.food):parsed.food);
  ctx={parsed,entities,residualTokens:s23Singular(residual).split(' ').filter(Boolean)};alpha0630QueryContextCache.set(key,ctx);if(alpha0630QueryContextCache.size>120)alpha0630QueryContextCache.delete(alpha0630QueryContextCache.keys().next().value);return ctx;
}
function alpha0629EntityInfo(raw){return alpha0630QueryContext(raw).entities;}
function alpha0629ResidualTokens(raw){return alpha0630QueryContext(raw).residualTokens;}
function alpha0629EntityMatch(entity,food){return REG29?.entityMatchesHay?REG29.entityMatchesHay(entity,`${food?.brand||''} ${food?.name||''} ${(food?.aliases||[]).join(' ')} ${food?.sourceDisplayName||''} ${(food?.sourceAliases||[]).join(' ')}`):false;}
searchRank=function(food,query){
  const ctx=alpha0630QueryContext(query),p=ctx.parsed,nq=p.food;if(!nq)return 100;
  const identityEntities=ctx.entities.filter(x=>['brand','retailer','restaurant'].includes(x.entity.type));
  let entityBonus=0;
  for(const m of identityEntities){if(alpha0629EntityMatch(m.entity,food))entityBonus+=950;else if(m.entity.type==='brand'||m.entity.type==='retailer')return 0;}
  const qt=ctx.residualTokens;
  let base=0;
  if(C8?.rank){
    const options={saved:ext.savedFoodIds?.includes(food.id),locallyVerified:!!ext.foodVerification?.[food.id]?.packageVerifiedAt};
    base=C8.rank(food,nq,options).score;
    if(!base&&identityEntities.length&&qt.length)base=C8.rank(food,qt.join(' '),options).score;
    if(!qt.length&&identityEntities.length)base=Math.max(base,900);
  }else base=alpha0623LegacyRank(food,nq);
  return base?base+entityBonus:0;
};
function s23Head(food){return s23Singular(String(food?.name||'').split(',')[0]);}
function s23ProductLike(food){
  if(!food||food.category==='Recipe'||food.afcd)return false;
  if(food.foodSourceId)return true;
  const brand=String(food.brand||'').trim(),source=String(food.source||'');
  return !!food.barcode||/Open Food Facts|Product|Barcode|Package|User Created|Online/i.test(source)|| (!!brand&&!/^(fresh produce|generic|australian|hec guided|australian food composition database)/i.test(brand));
}
let alpha0630FoodSearchRevision=0,alpha0630BrandIndexRevision=-1,alpha0630BrandIndexValues=[];
const alpha0630ProductMatchCache=new Map(),alpha0630ProductIntentCache=new Map();
function alpha0630InvalidateFoodSearchCaches(){alpha0630FoodSearchRevision++;alpha0630ProductMatchCache.clear();alpha0630ProductIntentCache.clear();alpha0630BrandIndexRevision=-1;alpha0630QueryContextCache.clear();}
function s23BrandIndex(){
  if(alpha0630BrandIndexRevision===alpha0630FoodSearchRevision)return alpha0630BrandIndexValues;
  const vals=[];for(const f of allFoods()){if(!s23ProductLike(f))continue;const b=String(f.brand||'').trim();if(b&&b.length>1&&b.length<60)vals.push(b);}
  for(const e of REG29?.entries||[])if(['brand','retailer','restaurant'].includes(e.type))vals.push(e.name,...(e.aliases||[]));
  alpha0630BrandIndexValues=[...new Set(vals)].sort((a,b)=>b.length-a.length);alpha0630BrandIndexRevision=alpha0630FoodSearchRevision;return alpha0630BrandIndexValues;
}
function s23BrandMatch(raw){
  const registered=REG29?.primary?REG29.primary(raw,['brand','retailer','restaurant']):null;if(registered)return registered.entity.name;
  const q=s23Norm(raw);return s23BrandIndex().find(b=>{const n=s23Norm(b);return q===n||q.startsWith(n+' ');})||'';
}
function s23InferCategory(food){
  const c=s23Norm(food?.category||''),n=s23Norm(food?.name||'');
  if(/fruit/.test(c)||/\bapple\b|\borange\b|\bbanana\b|\bpear\b|\bmango\b|\bgrape\b|\bberry\b/.test(n))return 'fruit';
  if(/vegetable/.test(c)||/potato|tomato|capsicum|carrot|pumpkin|broccoli|cauliflower|onion/.test(n))return 'vegetable';
  if(/dairy|milk|cheese|yoghurt|yogurt/.test(c+n))return 'dairy';
  if(/meat/.test(c)||/\bbeef\b|\blamb\b|\bpork\b|\bchicken\b|\bsausage\b/.test(n))return 'meat';
  if(/fish|seafood|salmon|tuna|prawn/.test(c+n))return 'seafood';
  if(/grain|cereal|bread|rice|pasta|oat/.test(c+n))return 'grain';
  if(/drink|beverage|coffee|tea|juice/.test(c+n))return 'drink';
  if(/pie/.test(n))return 'pie';
  return 'generic';
}
function s23DynamicConcept(raw){
  const p=s23Parsed(raw),q=p.food;if(!q)return null;
  // A partial prefix is search input, not a food. Dynamic concepts are created
  // only when an actual Australian/local food record has that complete head.
  const exactHead=allFoods().filter(f=>f.category!=='Recipe'&&!s23ProductLike(f)&&s23Head(f)===q);
  if(exactHead.length){return {key:`dynamic-${q.replace(/\s+/g,'-')}`,label:s23Title(q),aliases:[q],category:s23InferCategory(exactHead[0]),facetOrder:null,natural:{unit:'g',label:'g',grams:1},dynamic:true};}
  return null;
}
function s23Concept(raw){return S23?.conceptFromQuery?.(raw)||s23DynamicConcept(raw);}
function s23LikelyProduct(raw,concept=null){
  const p=s23Parsed(raw),q=p.food;if(!q)return false;const cacheKey=`${alpha0630FoodSearchRevision}|${s23Norm(raw)}`;if(alpha0630ProductIntentCache.has(cacheKey))return alpha0630ProductIntentCache.get(cacheKey);
  if(C8?.friesIntent?.(raw)?.generic){alpha0630ProductIntentCache.set(cacheKey,false);return false;}
  let answer=false;
  const c=concept||s23Concept(raw),exactGeneric=!!c&&(c.aliases||[]).some(alias=>s23Singular(alias)===q);
  if(!exactGeneric&&(alpha0618ChainFor(raw)||REG29?.primary?.(raw,['brand','retailer','restaurant'])||s23BrandMatch(raw)||allFoods().some(food=>food.foodSourceId&&C8?.rank?.(food,q)?.score>=900)))answer=true;
  else{const strongGeneric=exactGeneric||allFoods().filter(f=>f.category!=='Recipe'&&!s23ProductLike(f)).some(f=>searchRank(f,p.food)>=900);if(!strongGeneric){const prefix=S23?.likelyBrandPrefix?.(p,c)||'';answer=!!prefix||(!c&&!s23DynamicConcept(raw));}}
  alpha0630ProductIntentCache.set(cacheKey,answer);if(alpha0630ProductIntentCache.size>160)alpha0630ProductIntentCache.delete(alpha0630ProductIntentCache.keys().next().value);return answer;
}
function s23ProductMatches(raw,limit=16){
  const ctx=alpha0630QueryContext(raw),q=ctx.parsed.food,residual=ctx.residualTokens,entities=ctx.entities.filter(x=>['brand','retailer','restaurant'].includes(x.entity.type));if(!q)return[];
  const cacheKey=`${alpha0630FoodSearchRevision}|${s23Norm(raw)}`;let ranked=alpha0630ProductMatchCache.get(cacheKey);
  if(!ranked){let scored=allFoods().filter(s23ProductLike).map(food=>{
    const hay=s23Norm(`${food.brand||''} ${food.name||''} ${(food.aliases||[]).join(' ')} ${food.sourceDisplayName||''} ${(food.sourceAliases||[]).join(' ')}`),hayTokens=hay.split(' ');
    let score=searchRank(food,raw),entityMatched=true;
    for(const m of entities){if(alpha0629EntityMatch(m.entity,food))score+=850;else entityMatched=false;}
    const missing=residual.filter(t=>!hayTokens.some(f=>f===t||f.startsWith(t)||(t.length>=4&&fuzzyTokenMatch(t,f)))).length;
    if(!residual.length&&entities.length&&entityMatched)score+=600;else if(residual.length&&missing===0)score+=500+residual.length*35;score-=missing*350;return{food,score,missing,entityMatched};
  }).filter(x=>x.score>0&&x.entityMatched&&x.missing===0).sort((a,b)=>b.score-a.score||Number(b.food.country==='Australia')-Number(a.food.country==='Australia')||a.food.name.localeCompare(b.food.name));
    if(C8?.dedupeRanked)scored=C8.dedupeRanked(scored.map(x=>({food:x.food,rank:x.score}))).map(x=>({food:x.food,score:x.rank}));
    ranked=scored.map(x=>x.food);const policy=C8?.partitionSearchRecords?.(allFoods());if(policy){const primary=new Set(policy.primary.map(food=>C8.canonicalKey(food)));ranked=ranked.filter(food=>primary.has(C8.canonicalKey(food)));}
    alpha0630ProductMatchCache.set(cacheKey,ranked);if(alpha0630ProductMatchCache.size>120)alpha0630ProductMatchCache.delete(alpha0630ProductMatchCache.keys().next().value);
  }
  return ranked.slice(0,limit);
}
function s23EnergyMeta(food){const value=C8?.provenance?.(food)?.label||'',brand=normalise(food?.brand||''),label=normalise(value),sourceMeta=!label||label===brand||['verified food','packaged food','food record'].includes(label)?'':value;return [food.brand,sourceMeta,cleanMeasureText(food.serving),energyText(food.nutrients?.calories,food.nutrients?.energyKj)].filter(Boolean).join(' · ');}
function s23ProductRow(food){const loggable=C8?.canLog?C8.canLog(food):true;return `<button type="button" class="live-match-row" ${loggable?`data-food-add="${esc(food.id)}"`:`data-food-details="${esc(food.id)}"`}><span><strong>${esc(food.name)}</strong><small>${esc(loggable?s23EnergyMeta(food):food.nutritionStatus==='configurable'?'Configurable meal · Details only':'Nutrition unavailable · Details only')}</small></span><b>${loggable?'＋':'›'}</b></button>`;}


/* Alpha 0.6.32 — deterministic live-search intelligence.
   Product results may arrive asynchronously, but results already shown for an
   unchanged query keep their order. Newly discovered rows append instead of
   jumping above what the user was about to tap. */
const alpha0627StableSearchCache=new Map();
function alpha0627StableProductMatches(raw,limit=20){
  const key=s23Norm(raw);if(!key)return[];const current=s23ProductMatches(raw,Math.max(limit,40));let cached=alpha0627StableSearchCache.get(key);
  if(!cached){cached=[];alpha0627StableSearchCache.set(key,cached);}
  const byId=new Map(allFoods().map(f=>[String(f.id),f]));
  const seen=new Set(cached);for(const f of current){const id=String(f.id);if(!seen.has(id)){cached.push(id);seen.add(id);}}
  return cached.map(id=>byId.get(id)||getFood(id)).filter(Boolean).slice(0,limit);
}
function alpha0627InvalidateSearch(raw){const key=s23Norm(raw);if(key)alpha0627StableSearchCache.delete(key);}

function alpha0627GenericHeadSuggestions(raw,limit=8){
  const q=s23Singular(raw);if(q.length<2)return[];const seen=new Map();
  for(const food of allFoods()){
    if(food.category==='Recipe'||s23ProductLike(food))continue;const head=s23Head(food);if(!head||head.length<2)continue;
    let score=0;if(head===q)score=2000;else if(head.startsWith(q))score=1400-Math.min(300,head.length-q.length);else if(q.length>=4&&head.includes(q))score=700;
    if(!score)continue;const old=seen.get(head);if(!old||score>old.score)seen.set(head,{head,score,food});
  }
  return [...seen.values()].sort((a,b)=>b.score-a.score||a.head.length-b.head.length||a.head.localeCompare(b.head)).slice(0,limit);
}
function alpha0627ConceptSuggestions(raw,limit=7){
  const q=s23Parsed(raw).food;if(q.length<2)return[];const out=[],seen=new Set();
  for(const hit of (REG29?.predict?.(raw,limit)||[])){
    const e=hit.entity,key=`entity:${e.id}`;if(seen.has(key))continue;seen.add(key);out.push({label:e.name,query:e.name,kind:'entity',meta:e.type==='retailer'?'Australian supermarket / retailer':e.type==='restaurant'?'Australian restaurant / takeaway':'Recognised food brand'});
  }
  for(const c of (S23?.predictConcepts?.(raw,limit)||[])){const label=c.label,key=s23Norm(label);if(!seen.has(key)){seen.add(key);out.push({label,query:c.aliases?.[0]||label,kind:'concept'});}}
  for(const x of alpha0627GenericHeadSuggestions(raw,limit)){const key=s23Norm(x.head);if(!seen.has(key)){seen.add(key);out.push({label:s23Title(x.head),query:x.head,kind:'dynamic'});}}
  return out.slice(0,limit);
}
function alpha0627ChainItemSuggestions(raw,limit=8){
  const q=s23Norm(raw);if(q.length<3)return[];const rows=[];
  for(const chain of Object.values(ALPHA0618_CHAIN_MENUS||{}))for(const name of chain.items||[]){const n=s23Norm(name);if(n===q||n.startsWith(q)||n.split(' ').some(w=>w.startsWith(q))||n.includes(q))rows.push({chain,name,score:n===q?2000:n.startsWith(q)?1600:n.split(' ').some(w=>w.startsWith(q))?1300:900});}
  return rows.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,limit);
}
function alpha0627SourceModeFromQuery(raw,concept){
  const explicit=S23?.sourceModeFromQuery?.(raw)||'';if(explicit)return explicit;
  if(s23BrandMatch(raw)||alpha0618ChainFor(raw))return'commercial';
  return'';
}
function alpha0627SourceModeCandidates(candidates,mode,concept){
  if(!mode||mode==='unsure')return candidates;
  const want=mode==='home'?/home made|homemade|home grown|homegrown/:mode==='restaurant'?/takeaway|restaurant|fast food/:mode==='bakery'?/bakery|cafe/:/commercial|ready to eat|packaged|purchased frozen|bakery|canned|tinned/;
  const filtered=(candidates||[]).filter(f=>want.test(s23Norm(`${f.name||''} ${s23Features(f,concept).source||''}`)));
  if(filtered.length)return filtered;
  if(mode==='home'||mode==='restaurant'||mode==='bakery')return [];
  return candidates;
}
function alpha0627SourceRows(raw,concept){
  if(!S23?.shouldOfferSourceFirst?.(concept,s23Parsed(raw)))return'';
  const choices=S23.clarificationChoices?.(raw,concept)||[];const icons={'Homemade':'🏠','Home Grown':'🌱','Commercial / Bought':'🏷️','Commercial / Packaged':'🏷️','Takeaway / Restaurant':'🍽️','Not Sure / Typical':'↔','Hot Chips / Fries':'🍟','Packet Chips / Crisps':'🥔','Brand / Store Product':'🏷️'};
  const help=v=>/commercial/i.test(v)?'Use product, store or brand information when available':/home/i.test(v)?'Use the closest safe homemade/home-grown pathway':/takeaway|restaurant/i.test(v)?'Use restaurant/takeaway choices':'Let HEC narrow it without assuming a source';
  return `<div class="alpha0627-source-first"><small>What best describes this food?</small>${choices.map(choice=>{const v=choice.label||choice;return `<button type="button" class="live-match-row" data-alpha0627-source="${esc(v)}" data-alpha0627-mode="${esc(choice.source||'')}" data-alpha0627-query="${esc(choice.query||raw)}"><span><strong>${icons[v]||'•'} ${esc(v)}</strong><small>${esc(help(v))}</small></span><b>›</b></button>`;}).join('')}</div>`;
}
function alpha0627OpenCommercialRoute(raw,concept){
  if(concept?.key==='bread'){
    const extra=`<div class="alpha0623-wizard-list"><button type="button" class="secondary wide" data-alpha0628-bread-route="bakery" data-alpha0628-query="${esc(raw)}">Bakery / Café / Restaurant</button><button type="button" class="secondary wide" data-alpha0628-bread-route="store" data-alpha0628-query="${esc(raw)}">Supermarket / Store Brand</button><button type="button" class="secondary wide" data-alpha0628-bread-route="brand" data-alpha0628-query="${esc(raw)}">Bread Brand</button><button type="button" class="secondary wide" data-alpha0628-bread-route="typical" data-alpha0628-query="${esc(raw)}">Not Sure / Typical</button></div>`;
    openModal('Bread · Commercial / Bought','Where is the bread from?','Close',()=>{},extra);by('a05-modal-confirm')?.classList.add('hidden');return;
  }
  const matches=alpha0627StableProductMatches(raw,18);const rows=matches.length?matches.map(s23ProductRow).join(''):'<div class="alpha0623-search-status"><strong>No exact packaged product is loaded yet.</strong><small>Keep typing a brand/product name, scan the barcode, read the nutrition panel, or continue with a generic commercial guide.</small></div>';
  openModal(`${concept?.label||s23Title(raw)} · Commercial / Bought`,'Choose the exact product when you recognise it.','Close',()=>{},`${rows}<button type="button" class="secondary wide" data-alpha0627-commercial-guide="${esc(raw)}">I can’t see it — continue guided entry</button>`);by('a05-modal-confirm')?.classList.add('hidden');
}

function s23ConceptCandidates(raw,concept){
  const p=s23Parsed(raw),aliases=(concept?.aliases||[p.food]).map(s23Singular),pool=allFoods().filter(f=>f.category!=='Recipe'&&!s23ProductLike(f));
  let candidates=pool.filter(f=>aliases.includes(s23Head(f)));
  // Steak is commonly stored as "Lamb, steak..." / "Beef, steak..." in AFCD.
  // Treat steak as a meat-family token rather than requiring it to be the head.
  if(concept?.key==='steak'){
    const steakRows=pool.filter(f=>/\bsteak\b/.test(s23Norm(f.name||''))&&s23InferCategory(f)==='meat');
    candidates=[...new Map([...candidates,...steakRows].map(f=>[f.id,f])).values()];
  }
  // AFCD fries names generally begin with "Potato", so head-token matching
  // alone wrongly left the guided Hot Chips / Fries path with no records.
  if(concept?.key==='fries'){
    const friesRows=C8?.genericFriesCandidates?.(pool)||[];
    candidates=[...new Map([...candidates,...friesRows].map(f=>[f.id,f])).values()];
  }
  // Named concepts stay inside their own food family. Earlier broad fallback
  // let Apple drift into cider and Banana into banana bread/prawns.
  if(!candidates.length&&concept?.dynamic){
    candidates=pool.map(food=>({food,score:searchRank(food,p.food)})).filter(x=>x.score>=900).sort((a,b)=>b.score-a.score||a.food.name.localeCompare(b.food.name)).map(x=>x.food).slice(0,80);
  }
  // User-facing Bread does not treat wrap/tortilla as ordinary bread. Those
  // remain independently searchable food concepts/records.
  if(concept?.key==='bread')candidates=candidates.filter(f=>!/\bwrap\b|\btortilla\b/i.test(f.name||''));
  return candidates.slice(0,120);
}
function s23FacetOrder(concept){
  if(concept?.facetOrder?.length)return concept.facetOrder;
  const map={fruit:['form','variety'],vegetable:['variety','form','prep','source'],dairy:['type','fat','style','form','source'],meat:['protein','cut','flavour','prep','addedFat','source','size'],seafood:['type','form','prep','addedFat','source'],grain:['type','grain','source','prep','size'],drink:['type','milk','size','source'],pie:['kind','filling','protein','source','form','size'],prepared:['type','protein','source','size'],snack:['type','flavour','source','size'],egg:['species','part','size','prep','addedFat'],generic:['type','form','prep','source','size']};
  return map[concept?.category]||map.generic;
}
function s23Features(food,concept){return B25?.features?B25.features(food,concept):(S23?.descriptorFeatures?.(food.name,concept)||{});}
function s23Unique(values){return [...new Set(values.filter(Boolean).map(v=>String(v).trim()).filter(Boolean))];}
function s23ChoiceValues(facet,candidates,concept){
  const derived=B25?.choiceValues?B25.choiceValues(facet,candidates,concept):s23Unique(candidates.map(f=>s23Features(f,concept)[facet]));
  let supplemental=(concept?.supplemental?.[facet]||[]).filter(v=>!/not sure/i.test(v));
  if(facet==='prep'&&['potato','pumpkin','carrot','broccoli','cauliflower','chicken','beef','pork','lamb','steak','fish','salmon','prawn','sausage'].includes(concept?.key))supplemental=[...supplemental,'Air Fried'];
  // Taxonomy choices are useful for identification (not invented nutrition).
  // If the selected choice has no safe nutrition record, match validation still
  // stops before Review and offers scan/panel/create instead of guessing.
  return s23Unique([...derived,...supplemental]).filter(v=>!/^(Other|Not Sure|Typical)$/i.test(v));
}
function s23QuerySeeds(raw,concept){
  const p=s23Parsed(raw),out=S23?.queryFacetSeeds?.(p,concept)||{},candidates=s23ConceptCandidates(raw,concept);
  // If the user's words name one of the record-derived choices, treat it as already answered.
  for(const facet of s23FacetOrder(concept)){
    if(out[facet])continue;
    const values=s23ChoiceValues(facet,candidates,concept);
    const aliases=(concept?.aliases||[]).map(s23Singular).sort((a,b)=>b.length-a.length),alias=aliases.find(a=>(` ${p.food} `).includes(` ${a} `))||'',modifier=alias?s23Norm(p.food.replace(alias,'')).trim():'';
    const hit=values.sort((a,b)=>s23Norm(b).length-s23Norm(a).length).find(v=>{const vn=s23Norm(v);return vn&&((` ${p.food} `).includes(` ${vn} `)||(modifier&&vn.includes(modifier))||(modifier&&modifier.includes(vn)));});
    if(hit)out[facet]=hit;
  }
  // Semantic implications: meat/curry savoury pies and fruit pies need not ask Savoury/Sweet again.
  if(concept?.category==='pie'&&!out.kind){if(/\b(apple|fruit|berry|sweet)\b/.test(p.food))out.kind='Sweet';else if(/\b(curry|beef|lamb|pork|chicken|meat|steak|vegetable|seafood)\b/.test(p.food))out.kind='Savoury';}
  if(concept?.category==='pie'&&!out.filling&&/\b(beef|lamb|pork|meat|steak)\b/.test(p.food))out.filling='Meat';
  return out;
}
function s23FacetMatches(food,facet,value,concept){
  if(!value||/not sure|typical|other/i.test(value))return true;
  if(B25?.evidence)return B25.evidence(food,facet,value,concept).status==='match';
  const f=s23Features(food,concept),actual=s23Norm(f[facet]||''),wanted=s23Norm(value);
  return !!actual&&(actual===wanted||actual.includes(wanted)||wanted.includes(actual));
}
function s23FilterCandidates(candidates,state,concept){
  // Strict filtering is intentional. Earlier builds silently kept the old pool
  // when an answer had no matches, allowing contradictory paths to finish on
  // an unrelated nutrition record.
  if(B25?.filter)return B25.filter(candidates,state,concept);
  return (candidates||[]).filter(food=>Object.entries(state||{}).every(([facet,value])=>!value||/not sure|typical|other/i.test(value)||s23FacetMatches(food,facet,value,concept)));
}
function alpha0627WizardFacetOrder(w){
  let order=[...s23FacetOrder(w?.concept)];
  if(w?.concept?.key==='egg'){
    const part=s23Norm(w?.state?.part||''),prep=s23Norm(w?.state?.prep||'');
    // Species identifies the egg before any size-based calculation. Whole eggs
    // then establish size before cooking. Separated yolk/white branches retain
    // their direct practical measures without irrelevant cooking questions.
    if(/yolk|white/.test(part))order=['species','part'];
    else {order=['species','part','size','prep'];if(/fried/.test(prep))order.push('addedFat');}
  }
  return w?.sourceMode?order.filter(f=>f!=='source'):order;
}
function s23NextFacet(w){
  if(B25?.nextFacet){
    while(true){
      const next=B25.nextFacet(w.candidates,w.state,w.concept,alpha0627WizardFacetOrder(w));
      if(next.error)return {error:next.error,choices:[],facet:''};
      if(next.auto?.length){
        let changed=false;
        for(const a of next.auto)if(!w.state[a.facet]){w.state[a.facet]=a.value;changed=true;}
        if(changed)continue;
      }
      return next.facet?{facet:next.facet,choices:next.choices}:null;
    }
  }
  const filtered=s23FilterCandidates(w.candidates,w.state,w.concept);
  if(!filtered.length)return {error:'no-compatible-candidates',choices:[],facet:''};
  for(const facet of alpha0627WizardFacetOrder(w)){
    if(w.state[facet])continue;
    const choices=s23ChoiceValues(facet,filtered,w.concept);
    if(choices.length>=2)return {facet,choices};
  }
  return null;
}
const S23_QUESTIONS={kind:'Is it savoury or sweet?',filling:'What is the main filling or style?',protein:'What is the main protein or meat?',species:'What kind of egg is it?',variety:'Which variety is closest?',type:'Which type is closest?',cut:'Which cut or style is closest?',fat:'Which fat/style option is closest?',flavour:'Is it plain or flavoured?',style:'Which style is closest?',part:'Which part of the egg are you using?',addedFat:'Was any fat or oil added?',form:'What form is it in?',prep:'How is it prepared or cooked?',source:'Where is it from?',grain:'Which grain/style is closest?',milk:'Which milk option is used?',skin:'Skinless or with skin?',size:'What size is closest?',topping:'Which topping/style is closest?'};
function s23BestSource(w){
  const p=s23Parsed(w.query),pool=s23FilterCandidates(w.candidates,w.state,w.concept);
  const safePool=(w.concept?.key==='curry'&&!/\b(powder|paste|sauce)\b/.test(p.food))?pool.filter(f=>!/\b(powder|paste|sauce)\b/i.test(f.name)):pool;
  if(!safePool.length)return null;
  return safePool.map(food=>{
    const validation=B25?.validateWithQuery?B25.validateWithQuery(food,w.state,w.concept,w.query):(B25?.validate?B25.validate(food,w.state,w.concept):{valid:true,matched:0});
    if(!validation.valid)return {food,score:-Infinity};
    const score=searchRank(food,p.food)+Number(food.country==='Australia')*80+Number(food.afcd)*60+(validation.matched||0)*130;
    return {food,score};
  }).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score)[0]?.food||null;
}
function s23GuidedName(w){
  const p=s23Parsed(w.query);let base=S23?.labelFor?.(p,w.concept)||s23Title(p.food||w.concept.label);
  if(w.concept?.key==='egg'){
    const part=w.state.part||'Whole',prep=w.state.prep||'',size=w.state.size||'',species=w.state.species||'';
    if(/yolk/i.test(part))return species&&!/chicken/i.test(species)?`${species} Egg Yolk`:'Egg Yolk';
    if(/white/i.test(part))return species&&!/chicken/i.test(species)?`${species} Egg White`:'Egg White';
    const speciesWord=species&&!/chicken/i.test(species)?species:'';
    return [size,prep,speciesWord,'Egg'].filter(Boolean).join(' ').replace(/Microwave Poached/i,'Microwave-Poached');
  }
  if(w.concept?.key==='sausage')return [w.state.prep,w.state.protein,w.state.flavour&&!/plain/i.test(w.state.flavour)?w.state.flavour:'','Sausage'].filter(Boolean).join(' ');
  if(w.concept?.key==='corn-chip')return [w.state.flavour&&!/plain/i.test(w.state.flavour)?w.state.flavour:'','Corn Chips'].filter(Boolean).join(' ');
  if(s23Norm(base)===s23Norm(w.concept.label)){const lead=['variety','type','protein','filling','flavour'].map(k=>w.state[k]).find(v=>v&&!/not sure|typical|other/i.test(v));if(lead)base=`${lead} ${w.concept.label}`;}
  return base;
}
function s23Naturalise(source,w){
  const f=clone(source),natural=w.concept?.natural||{unit:'g',label:'g',grams:1};f.id=`guided-${w.concept.key}-${uid('s23')}`;f.name=s23GuidedName(w);f.brand='HEC Guided Entry';f.guided=true;f.verified=false;
  const selected=Object.entries(w.state).filter(([,v])=>v&&!/not sure|typical|other/i.test(v)).map(([k,v])=>`${s23Title(k)}: ${v}`).join(' · ');
  f.source=`HEC guided match · ${source.name} (${source.source||source.brand||'Australian reference'}).${selected?' Selected: '+selected+'.':''}`;
  const units={...(f.units||{})},labels={...(f.unitLabels||{})};
  if(natural.unit==='g'){units.g=.01;labels.g='g';f.defaultUnit='g';f.defaultAmount=natural.grams>1?natural.grams:100;f.serving=`Reference quantity: ${formatNumber(f.defaultAmount,true)} g (change grams as needed)`;}
  else if(natural.grams===1&&natural.unit==='mL'){units.mL=.01;labels.mL='mL';f.defaultUnit='mL';f.defaultAmount=250;f.serving='Enter amount in mL';}
  else if(natural.grams>1){units[natural.unit]=natural.grams/100;labels[natural.unit]=natural.label;units.g=.01;labels.g='g';f.defaultUnit=natural.unit;f.defaultAmount=1;f.serving=natural.label;}
  f.units=units;f.unitLabels=labels;FOODS.push(f);FOOD_BY_ID.set(f.id,f);return f;
}
function s23FinishWizard(w){
  const source=s23BestSource(w);
  if(!source){
    const selected=Object.entries(w.state||{}).filter(([,v])=>v&&!/not sure|typical|other/i.test(v)).map(([k,v])=>`${s23Title(k)}: ${v}`).join(' · ');
    openModal(w.concept.label,'HEC could not find one nutrition record that matches all of those choices. Nothing has been added.','Close',()=>{},`<p>${selected?`Your path was <strong>${esc(selected)}</strong>.</p>`:''}<p>HEC will not substitute a contradictory food just to finish the entry. Try a broader description, scan the barcode, read the Nutrition Panel, or create a food.</p>`);return;
  }
  const validation=B25?.validateWithQuery?B25.validateWithQuery(source,w.state,w.concept,w.query):(B25?.validate?B25.validate(source,w.state,w.concept):{valid:true});
  if(!validation.valid){
    const issues=B25?.describeIssues?B25.describeIssues(validation.issues).join('; '):'The selected choices do not agree with the nutrition record.';
    openModal(w.concept.label,'HEC stopped this match because the nutrition reference conflicts with your selections. Nothing has been added.','Close',()=>{},`<p>${esc(issues)}</p><p>Try a broader description, scan the barcode, read the Nutrition Panel, or create a food.</p>`);return;
  }
  const guided=s23Naturalise(source,w),date=ext.ui?.mealEntrySession?.date||(ext.ui.pendingMeal?ext.ui.diaryDate:isoToday())||isoToday();
  let requestedUnit=(w.parsed.unit&&unitOptions(guided)[w.parsed.unit]!==undefined)?w.parsed.unit:null;
  // "egg" in a phrase such as "2 eggs" is the food/count word, not permission
  // to throw away the Large/Medium size already selected in the wizard.
  if(w.concept?.key==='egg'&&requestedUnit==='egg')requestedUnit=null;
  prepareEntry(guided,{date,meal:ext.ui.pendingMeal||'',amount:w.parsed.quantityExplicit?w.parsed.quantity:null,unit:requestedUnit||defaultUnit(guided)});
}
function s23RenderWizard(){
  const w=alpha0623Wizard;if(!w)return;const next=s23NextFacet(w);if(!next){s23FinishWizard(w);return;}
  if(next.error){s23FinishWizard(w);return;}
  const {facet,choices}=next,stepNumber=w.history.length+1,question=S23_QUESTIONS[facet]||`Choose ${s23Title(facet)}`;
  const breadcrumb=w.history.map(h=>`${s23Title(h.facet)}: ${h.value}`).join(' › ');
  w.choicePages=w.choicePages||{};const pageSize=6,totalPages=Math.max(1,Math.ceil(choices.length/pageSize));let page=Math.max(0,Math.min(Number(w.choicePages[facet]||0),totalPages-1));w.choicePages[facet]=page;
  const pageChoices=choices.slice(page*pageSize,(page+1)*pageSize),nav=[];
  if(page>0)nav.push('<button type="button" class="secondary wide" data-alpha0623-earlier>← Earlier Choices</button>');
  if(page<totalPages-1)nav.push('<button type="button" class="secondary wide" data-alpha0623-more>More Choices →</button>');
  const buttons=[...pageChoices,'Not Sure / Typical'];
  const pageText=totalPages>1?` · Choices ${page*pageSize+1}–${Math.min((page+1)*pageSize,choices.length)} of ${choices.length}`:'';
  openModal(w.concept.label,question,'Close',()=>{},`<div class="alpha0623-wizard-nav"><button type="button" class="secondary" data-alpha0623-back>← ${w.history.length?'Back One Step':'Back To Search'}</button><small>Step ${stepNumber}${breadcrumb?` · ${esc(breadcrumb)}`:''}${pageText}</small></div><div class="alpha0623-wizard-list">${buttons.map(v=>`<button type="button" class="secondary wide" data-alpha0623-choice="${esc(v)}">${esc(v)}</button>`).join('')}${nav.join('')}</div>`);
  by('a05-modal-confirm')?.classList.add('hidden');
  by('a05-modal')?.querySelector('[data-alpha0623-back]')?.addEventListener('click',()=>{closeModal();if(w.history.length){const last=w.history.pop();delete w.state[last.facet];w.choicePages={};setTimeout(s23RenderWizard,0);}else setTimeout(()=>openFeature('food-library'),0);},{once:true});
  by('a05-modal')?.querySelector('[data-alpha0623-more]')?.addEventListener('click',()=>{w.choicePages[facet]=Math.min(totalPages-1,page+1);closeModal();setTimeout(s23RenderWizard,0);},{once:true});
  by('a05-modal')?.querySelector('[data-alpha0623-earlier]')?.addEventListener('click',()=>{w.choicePages[facet]=Math.max(0,page-1);closeModal();setTimeout(s23RenderWizard,0);},{once:true});
  qa('[data-alpha0623-choice]').forEach(b=>b.addEventListener('click',()=>{if(b.disabled)return;b.disabled=true;b.setAttribute('aria-busy','true');const value=b.dataset.alpha0623Choice;w.state[facet]=value;w.history.push({facet,value});w.choicePages={};closeModal();if(w.concept?.key==='corn-chip'&&facet==='flavour'&&/flavoured/i.test(value)){requestAnimationFrame(()=>openModal('Flavoured Corn Chips','Flavour can change the nutrition and often identifies the exact product.','Search',()=>{const detail=String(by('alpha0628-corn-chip-detail')?.value||'').trim();if(!detail){showActionToast('Type a flavour or brand, or close this window and scan the package.',null,4000);return;}closeModal();const next=`${detail} corn chips`;ext.ui.foodSearch=next;saveExt();openFeature('food-library');setTimeout(()=>{if(by('food-search')){by('food-search').value=next;by('food-search').focus();}renderLibrary();renderFoodLiveMatches(next);},40);},'<label>Flavour or brand<input id="alpha0628-corn-chip-detail" placeholder="For example, cheese, Doritos Cheese Supreme or Mission"></label><p class="fine">For an exact packaged product you can also scan the barcode or read the Nutrition Panel.</p>'));return;}requestAnimationFrame(s23RenderWizard);},{once:true}));
}
function s23StartWizard(raw,sourceMode=''){
  const p=s23Parsed(raw),concept=s23Concept(raw);if(!concept){openModal('Food Search','HEC could not identify a reliable food concept from that search yet.','Close',()=>{},'<p>Keep typing, choose one of HEC’s predictions, scan the barcode, read the Nutrition Panel, or create the food.</p>');return;}
  sourceMode=sourceMode||alpha0627SourceModeFromQuery(raw,concept);
  if(!sourceMode&&S23?.shouldOfferSourceFirst?.(concept,p)){
    const choices=S23.sourceChoices?.(concept)||[];
    openModal(concept.label,'What best describes this food?','Close',()=>{},`<div class="alpha0623-wizard-list">${choices.map(v=>`<button type="button" class="secondary wide" data-alpha0627-source="${esc(v)}" data-alpha0627-query="${esc(raw)}">${esc(v)}</button>`).join('')}</div>`);by('a05-modal-confirm')?.classList.add('hidden');return;
  }
  let candidates=s23ConceptCandidates(raw,concept);candidates=alpha0627SourceModeCandidates(candidates,sourceMode,concept);if(!candidates.length){openModal(concept.label,'No reliable Australian nutrition records were found for that food concept yet.','Close',()=>{},'<p>Scan the barcode, read the Nutrition Panel, or create the food so HEC does not guess nutrition.</p>');return;}
  alpha0623Wizard={query:raw,parsed:p,concept,candidates,state:s23QuerySeeds(raw,concept),history:[],sourceMode};s23RenderWizard();
}
function s23GuideLabel(raw,concept){const p=s23Parsed(raw);return S23?.labelFor?.(p,concept)||s23Title(p.food||concept?.label||raw);}
function s23GuideButton(raw,compact=false){const c=s23Concept(raw),label=s23GuideLabel(raw,c);return `<button type="button" class="${compact?'live-match-row':'alpha0623-guide-row'}" data-alpha0623-guide="${esc(raw)}"><span><strong>${esc(label)}</strong><small>${compact?'Guided food entry · only relevant questions':'Start guided food entry'}</small></span><b>›</b></button>`;}

function s23RenderLive(raw){
  const box=by('food-live-results'),term=String(raw||'').trim();if(!box)return;
  if(!term||document.activeElement!==by('food-search')){box.classList.add('hidden');box.innerHTML='';return;}
  const q=s23Norm(term);
  if(/\bburger king\b/.test(q)){box.innerHTML=`<div class="live-match-heading"><strong>Top Match</strong><small>Australian search · Alpha ${ACTIVE_VERSION}</small></div><button type="button" class="live-match-row" data-alpha0623-chain-redirect="Hungry Jacks"><span><strong>Hungry Jack’s</strong><small>Australian equivalent</small></span><b>›</b></button>`;box.classList.remove('hidden');return;}
  const chain=alpha0618ChainFor(term);if(chain){const alias=(chain.aliases||[]).find(a=>q.includes(s23Norm(a)))||'',tail=q.replace(s23Norm(alias),'').trim(),items=(chain.items||[]).filter(x=>!tail||s23Norm(x).includes(tail)).slice(0,6);box.innerHTML=`<button type="button" class="live-match-heading alpha0626-chain-heading" data-alpha0626-chain-menu="${esc(chain.label)}"><span><strong>${esc(chain.label)}</strong><small>Australian menu · tap here to browse the full menu</small></span><b>›</b></button>${items.map(x=>`<button type="button" class="live-match-row" data-alpha0618-chain-item="${esc(chain.label)}|${esc(x)}"><span><strong>${esc(x)}</strong><small>${esc(chain.label)}</small></span><b>＋</b></button>`).join('')}`;box.classList.remove('hidden');return;}
  const concept=s23Concept(term),product=s23LikelyProduct(term,concept);
  // A legacy menu-guide item can find its Australian chain without requiring
  // the chain first: Whopper → Hungry Jack’s and Zinger → KFC. Food Source
  // records such as McMuffins use the common product resolver above. An exact
  // generic food concept still wins (e.g. Sausage must
  // remain Sausage rather than becoming Sausage McMuffin).
  const menuItems=!concept?alpha0627ChainItemSuggestions(term,8):[];if(menuItems.length){box.innerHTML=`<div class="live-match-heading"><strong>Top Matches</strong><small>Recognised Australian menu items</small></div>${menuItems.map(x=>`<button type="button" class="live-match-row" data-alpha0618-chain-item="${esc(x.chain.label)}|${esc(x.name)}"><span><strong>${esc(x.name)}</strong><small>${esc(x.chain.label)}</small></span><b>＋</b></button>`).join('')}`;box.classList.remove('hidden');return;}
  if(concept&&!product){const source=alpha0627SourceRows(term,concept);box.innerHTML=`<div class="live-match-heading"><strong>${esc(s23GuideLabel(term,concept))}</strong><small>HEC Food Intelligence · Alpha ${ACTIVE_VERSION}</small></div>${source||s23GuideButton(term,true)}`;box.classList.remove('hidden');return;}
  // Predict likely complete foods from partial text before creating a generic
  // "App", "Banan" or "Che" food. Product matches remain secondary.
  const predictions=alpha0627ConceptSuggestions(term,7);if(predictions.length&&!REG29?.primary?.(term,['brand','retailer','restaurant'])){const products=alpha0627StableProductMatches(term,4);box.innerHTML=`<div class="live-match-heading"><strong>HEC Thinks You May Mean</strong><small>Suggestions narrow as you type</small></div>${predictions.map(x=>`<button type="button" class="live-match-row" data-alpha0627-prediction="${esc(x.query)}"><span><strong>${esc(x.label)}</strong><small>${esc(x.meta||'Food suggestion')}</small></span><b>›</b></button>`).join('')}${products.length?`<div class="live-match-heading alpha0627-secondary-heading"><strong>Product Matches</strong><small>Secondary while HEC is predicting the food</small></div>${products.map(s23ProductRow).join('')}`:''}`;box.classList.remove('hidden');return;}
  if(product){const matches=alpha0627StableProductMatches(term,7),entity=REG29?.primary?.(term,['brand','retailer','restaurant']);const heading=entity?.entity?.name||'Product Matches',meta=entity?(entity.entity.type==='retailer'?'Recognised Australian supermarket / retailer':entity.entity.type==='restaurant'?'Recognised Australian restaurant source':'Recognised food brand · source already known'):'Stable ranking · every word narrows the result';box.innerHTML=`<div class="live-match-heading"><strong>${esc(heading)}</strong><small>${esc(meta)}</small></div>${matches.length?matches.map(s23ProductRow).join(''):'<div class="alpha0623-search-status"><strong>Brand/source recognised.</strong><small>Keep typing the product or flavour, refresh online results, scan the barcode, or read the Nutrition Panel. HEC will not ask whether a recognised brand is homemade.</small></div>'}`;box.classList.remove('hidden');return;}
  box.innerHTML='<div class="live-match-heading"><strong>Keep Typing</strong><small>HEC is predicting the food, not treating the unfinished letters as a food</small></div><div class="alpha0623-search-status"><strong>No confident food yet.</strong><small>Add another letter or identifying word, or use barcode/nutrition-panel capture.</small></div>';box.classList.remove('hidden');
}

function s23ApplyFullSurface(){
  const results=by('food-results'),input=by('food-search');if(!results||!input)return;const raw=input.value.trim(),tab=activeLibraryTab();
  results.querySelectorAll('.alpha0618-r2-universal-guide,.alpha0618-primary-intent,.alpha0617-guide,.alpha0618-chain-guide,.alpha0620-guide-surface,.alpha0622-search-surface,.alpha0623-search-surface').forEach(x=>x.remove());
  results.classList.remove('alpha0622-guide-active','alpha0622-product-active','alpha0622-show-raw','alpha0623-guide-active','alpha0623-product-active','alpha0623-show-raw');
  if(!raw||['recent','saved','combined','recipes','meals'].includes(tab))return;
  if(alpha0618ChainFor(raw)||/\bburger king\b/.test(s23Norm(raw)))return;
  const concept=s23Concept(raw),product=s23LikelyProduct(raw,concept);
  if(concept&&!product){const rawCount=results.querySelectorAll('.resource-row').length,source=alpha0627SourceRows(raw,concept);results.insertAdjacentHTML('afterbegin',`<section class="alpha0623-search-surface"><strong>${esc(s23GuideLabel(raw,concept))}</strong><small>${source?'Choose the source that best describes the food, then HEC will narrow only the relevant attributes.':'HEC will ask only distinctions that can help select the closest nutrition record, then move to quantity and serving.'}</small>${source||s23GuideButton(raw,false)}${rawCount?`<button type="button" class="alpha0623-database-toggle" data-alpha0623-toggle-raw>Browse ${rawCount} database match${rawCount===1?'':'es'}</button>`:''}</section>`);results.classList.add('alpha0623-guide-active');if(alpha0623ShowRaw)results.classList.add('alpha0623-show-raw');return;}
  const predictions=alpha0627ConceptSuggestions(raw,6);if(predictions.length&&!REG29?.primary?.(raw,['brand','retailer','restaurant'])){results.insertAdjacentHTML('afterbegin',`<section class="alpha0623-search-surface"><strong>HEC Thinks You May Mean</strong><small>Choose a prediction or keep typing. Unfinished letters are never treated as a food.</small>${predictions.map(x=>`<button type="button" class="alpha0623-guide-row" data-alpha0627-prediction="${esc(x.query)}"><span><strong>${esc(x.label)}</strong><small>${esc(x.meta||'Food suggestion')}</small></span><b>›</b></button>`).join('')}</section>`);results.classList.add('alpha0623-guide-active');return;}
  if(product){
    const matches=alpha0627StableProductMatches(raw,20),entity=REG29?.primary?.(raw,['brand','retailer','restaurant']),html=matches.length?matches.map(resourceFoodRow).join(''):`<div class="alpha0623-search-status"><strong>${entity?'Recognised '+esc(entity.entity.name):'No loaded exact product yet'}.</strong><p>${entity?'HEC already knows this commercial source context. Keep typing the product or flavour, refresh online products, scan the barcode, or read the Nutrition Panel.':'HEC is checking online packaged-food sources. Keep typing to narrow the name, use Refresh Online Results, scan the barcode, or read the Nutrition Panel.'}</p></div>`;
    results.insertAdjacentHTML('afterbegin',`<section class="alpha0623-search-surface alpha0623-product-surface"><strong>${esc(entity?.entity?.name||'Product Search')}</strong><small>${entity?'Recognised entity · source questions already answered by the search phrase':'Your brand and product words are preserved. Each extra word narrows real product records instead of reverting to a broad food category.'}</small>${html}</section>`);results.classList.add('alpha0623-product-active');return;
  }
  results.insertAdjacentHTML('afterbegin',`<section class="alpha0623-search-surface"><strong>Exact Food Not Identified Yet</strong><small>Keep typing, refresh online products, scan a barcode, read the Nutrition Panel, or create a food. HEC will not invent a food from unfinished letters.</small></section>`);results.classList.add('alpha0623-guide-active','alpha0623-show-raw');
}

// One canonical controller owns live search and the full search surface from here onward.
renderFoodLiveMatches=s23RenderLive;
const alpha0623RenderLibraryBase=renderLibrary;
renderLibrary=function(){alpha0623RenderLibraryBase();s23ApplyFullSurface();};

// Voice/text uses the same identity parser and candidate hierarchy as normal search.
const alpha0623ParseVoiceBase=parseVoice;
function s23VoiceFood(raw){
  const p=s23Parsed(raw),concept=s23Concept(p.food);if(!concept)return null;
  const candidates=s23ConceptCandidates(p.food,concept);if(!candidates.length)return null;
  let ranked=candidates.map(food=>({food,score:searchRank(food,p.food)})).sort((a,b)=>b.score-a.score);return ranked[0]?.food||null;
}
parseVoice=function(text){
  const p=s23Parsed(text),meal=mealFromText(text);let food=s23VoiceFood(p.food);
  if(!food)return alpha0623ParseVoiceBase(text);
  food=enrichNaturalUnits(food);let unit=(p.unit&&unitOptions(food)[p.unit]!==undefined)?p.unit:defaultUnit(food);
  const concept=s23Concept(p.food),natural=concept?.natural;if(natural&&natural.grams>1&&unitOptions(food)[natural.unit]===undefined){const copy=clone(food);copy.id=`voice-${concept.key}-${uid('s23')}`;copy.units={...(copy.units||{}),[natural.unit]:natural.grams/100,g:.01};copy.unitLabels={...(copy.unitLabels||{}),[natural.unit]:natural.label,g:'g'};copy.defaultUnit=natural.unit;FOODS.push(copy);FOOD_BY_ID.set(copy.id,copy);food=copy;unit=natural.unit;}
  return {items:[{foodId:food.id,amount:p.quantity||1,unit,heard:String(text||'')}],meal,heard:String(text||'')};
};

// Fresh additions are always independent diary instances; only explicit Edit/Replace may remove an entry.
document.addEventListener('click',e=>{if(e.target.closest('[data-food-add],[data-alpha0623-guide],#review-scan-food')){ext.ui.replacingEntryId='';if(editorState&&!editorState.entryId)editorState.entryId=null;}},true);

document.addEventListener('click',e=>{
  const prediction=e.target.closest('[data-alpha0627-prediction]');if(prediction){e.preventDefault();const value=prediction.dataset.alpha0627Prediction||'';ext.ui.foodSearch=value;if(by('food-search')){by('food-search').value=value;by('food-search').focus();}saveExt();renderLibrary();renderFoodLiveMatches(value);return;}
  const source=e.target.closest('[data-alpha0627-source]');if(source){e.preventDefault();const query=source.dataset.alpha0627Query||by('food-search')?.value||'',label=source.dataset.alpha0627Source,concept=s23Concept(query);const mode=source.dataset.alpha0627Mode||(/home/i.test(label)?'home':/commercial|bought|brand|store|packet/i.test(label)?'commercial':/takeaway|restaurant|hot chips|fries/i.test(label)?'restaurant':'unsure');closeModal();if(mode==='commercial'){if(concept?.key==='corn-chip'||concept?.key==='chips'){s23StartWizard(query,'commercial');return;}alpha0627OpenCommercialRoute(query,concept);return;}s23StartWizard(query,mode);return;}
  const breadRoute=e.target.closest('[data-alpha0628-bread-route]');if(breadRoute){e.preventDefault();const q=breadRoute.dataset.alpha0628Query||'bread',route=breadRoute.dataset.alpha0628BreadRoute;closeModal();if(route==='bakery'){s23StartWizard(q,'bakery');return;}if(route==='typical'){s23StartWizard(q,'commercial');return;}openModal(route==='store'?'Supermarket / Store Brand Bread':'Bread Brand','Type the store or bread brand so HEC can search the exact product before falling back to a generic bread.','Search',()=>{const brand=String(by('alpha0628-bread-brand')?.value||'').trim();if(!brand)return;closeModal();const next=`${brand} ${q}`;ext.ui.foodSearch=next;saveExt();openFeature('food-library');setTimeout(()=>{if(by('food-search')){by('food-search').value=next;by('food-search').focus();}renderLibrary();renderFoodLiveMatches(next);},40);},'<label>Store or brand<input id="alpha0628-bread-brand" placeholder="For example, Woolworths, Coles, Tip Top or Sunblest"></label>');return;}

  const commercialGuide=e.target.closest('[data-alpha0627-commercial-guide]');if(commercialGuide){e.preventDefault();const q=commercialGuide.dataset.alpha0627CommercialGuide;closeModal();s23StartWizard(q,'commercial');return;}
  const guide=e.target.closest('[data-alpha0623-guide]');if(guide){e.preventDefault();s23StartWizard(guide.dataset.alpha0623Guide);return;}
  const raw=e.target.closest('[data-alpha0623-toggle-raw]');if(raw){alpha0623ShowRaw=!alpha0623ShowRaw;by('food-results')?.classList.toggle('alpha0623-show-raw',alpha0623ShowRaw);raw.textContent=alpha0623ShowRaw?'Hide Database Matches':'Browse Database Matches';return;}
  const redirect=e.target.closest('[data-alpha0623-chain-redirect]');if(redirect){const value=redirect.dataset.alpha0623ChainRedirect;ext.ui.foodSearch=value;by('food-search').value=value;saveExt();renderLibrary();renderFoodLiveMatches(value);return;}
},true);
// Explicit refresh is the only action that may re-rank an unchanged product query.
by('search-online-foods')?.addEventListener('click',()=>alpha0627InvalidateSearch(by('food-search')?.value||''),true);

window.HEC_ALPHA0623_SEARCH_TEST={
  build:ALPHA0623_BUILD,
  parse:q=>s23Parsed(q),
  concept:q=>s23Concept(q)?.label||'',
  guideLabel:q=>{const c=s23Concept(q);return c?s23GuideLabel(q,c):'';},
  productIntent:q=>s23LikelyProduct(q,s23Concept(q)),
  productNames:q=>s23ProductMatches(q,10).map(f=>`${f.brand||''} ${f.name}`.trim()),
  candidates:q=>{const c=s23Concept(q);return c?s23ConceptCandidates(q,c).slice(0,10).map(f=>f.name):[];},
  facets:q=>{const c=s23Concept(q);if(!c)return {};const cs=s23ConceptCandidates(q,c),out={};for(const f of s23FacetOrder(c))out[f]=s23ChoiceValues(f,cs,c);return out;}
};
ext.version=ACTIVE_VERSION;ext.ui.universalGuidedSearch=true;ext.ui.guidedSearchArchitecture='food-intelligence-v629';ext.ui.guidedMatchValidation='strict-compatible-source-v629';saveExt();

/* ================================================================
   Alpha 0.6.32 — UNIVERSAL SERVING & MEASURE FOUNDATION
   ================================================================
   Search identification now hands every resolved food to one serving resolver.
   The resolver prefers explicit package data, then trustworthy source measures,
   then Australian Dietary Guidelines standard serves, and otherwise retains
   grams/mL rather than inventing a household conversion.
*/
const ALPHA0624_BUILD=ACTIVE_VERSION;
const S24=window.HECServingFoundation;

function s24ContextForFood(food,extra={}){
  return {conceptCategory:extra.conceptCategory||food?.guidedConceptCategory||'',conceptKey:extra.conceptKey||food?.guidedConceptKey||'',query:extra.query||food?.guidedQuery||food?.name||'',selected:extra.selected||food?.guidedSelections||{}};
}
function s24Apply(food,extra={}){return S24?.applyToFood?S24.applyToFood(food,s24ContextForFood(food,extra)):food;}

// One serving resolver owns the unit list/default from this point onward.
const alpha0624UnitOptionsBase=unitOptions;
const alpha0624DefaultUnitBase=defaultUnit;
unitOptions=function(food){s24Apply(food);return food?.units||alpha0624UnitOptionsBase(food);};
defaultUnit=function(food){s24Apply(food);return food?.servingDefaultUnit||food?.defaultUnit||alpha0624DefaultUnitBase(food);};

// Preserve guided-query context so dynamically discovered foods (for example,
// lettuce or quinoa) receive the same serving logic as named concepts.
const alpha0624NaturaliseBase=s23Naturalise;
s23Naturalise=function(source,w){
  const f=alpha0624NaturaliseBase(source,w);
  f.guidedConceptCategory=w?.concept?.category||'';f.guidedConceptKey=w?.concept?.key||'';f.guidedQuery=w?.query||'';f.guidedSelections=clone(w?.state||{});
  s24Apply(f,{conceptCategory:w?.concept?.category,conceptKey:w?.concept?.key,query:w?.query,selected:w?.state});
  return f;
};

// Open Food Facts serving-basis repair. A 100 g reference is no longer called a
// package serve when the source does not actually provide serving mass/volume.
// If an explicit package serving is present, per-serving nutrition is retained
// and grams/mL scale from that exact package quantity.
function s24OffNu(nu,key,suffix){const v=nu?.[`${key}_${suffix}`];return v===undefined||v===null||v===''?null:Number(v);}
function s24OffEnergy(nu,suffix){let kcal=s24OffNu(nu,'energy-kcal',suffix);if(kcal===null){const kj=s24OffNu(nu,'energy-kj',suffix);if(kj!==null)kcal=kj/4.184;}return kcal;}
makeOpenFoodFactsFood=function(product){
  const nu=product.nutriments||{},servingText=String(product.serving_size||'').trim();
  const parsedMass=servingText.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i),qtyField=Number(product.serving_quantity),qtyUnit=String(product.serving_quantity_unit||'').toLowerCase();
  let servingQty=Number.isFinite(qtyField)&&qtyField>0?qtyField:(parsedMass?Number(String(parsedMass[1]).replace(',','.')):0);
  let rawUnit=(Number.isFinite(qtyField)&&qtyField>0?qtyUnit:(parsedMass?.[2]||'')).toLowerCase(),measureUnit=rawUnit.includes('ml')?'mL':rawUnit==='g'?'g':'';
  const explicitMass=servingQty>0&&!!measureUnit;
  const hasDirectServing=s24OffEnergy(nu,'serving')!==null;
  const hasPer100=s24OffEnergy(nu,'100g')!==null;
  let basis='per100-reference',factor=1,servingLabel='Reference per 100 g',units={g:.01},unitLabels={g:'g'},defaultUnit='g',defaultAmount=100;
  if(explicitMass){basis='package-explicit';factor=servingQty/100;servingLabel=servingText||`${formatNumber(servingQty,true)} ${measureUnit}`;units={serve:1,[measureUnit]:1/servingQty};unitLabels={serve:`Package Serve (${servingLabel})`,[measureUnit]:measureUnit};defaultUnit='serve';defaultAmount=1;}
  else if(servingText&&hasDirectServing){basis='package-serving-no-mass';servingLabel=`Package Serve (${servingText}; weight/volume not supplied)`;units={serve:1};unitLabels={serve:servingLabel};defaultUnit='serve';defaultAmount=1;}
  const basisWarnings=[];
  const coherent=(direct,per100,key)=>{
    const scaled=per100===null?null:per100*factor;
    if(direct===null)return scaled;
    if(scaled===null||Math.abs(scaled)<1e-9)return direct;
    const delta=Math.abs(direct-scaled)/Math.max(Math.abs(scaled),0.001);
    if(delta<=0.25)return direct;
    basisWarnings.push(key);
    return scaled;
  };
  const pick=(key)=>{
    if(basis==='package-explicit')return coherent(s24OffNu(nu,key,'serving'),s24OffNu(nu,key,'100g'),key);
    if(basis==='package-serving-no-mass')return s24OffNu(nu,key,'serving');
    return s24OffNu(nu,key,'100g');
  };
  let calories;
  if(basis==='package-explicit')calories=coherent(s24OffEnergy(nu,'serving'),s24OffEnergy(nu,'100g'),'energy');
  else if(basis==='package-serving-no-mass')calories=s24OffEnergy(nu,'serving');
  else calories=s24OffEnergy(nu,'100g');
  const sodium=pick('sodium');
  const nutrients={calories:calories===null?null:Number(calories),protein:pick('proteins'),carbs:pick('carbohydrates'),fat:pick('fat'),satFat:pick('saturated-fat'),fibre:pick('fiber'),sugar:pick('sugars'),sodium:sodium===null?null:Number(sodium)*1000};
  const countryText=[product.countries,...(product.countries_tags||[])].filter(Boolean).join(' ');
  const food={id:`off-${product.code}`,sourceId:String(product.code||''),recordType:'online-candidate',verificationStatus:calories===null?'recognised-only':'unverified',recognisedOnly:calories===null,market:/australia/i.test(countryText)?'AU':'international',barcode:String(product.code||''),name:product.product_name||product.generic_name||`Barcode ${product.code}`,brand:product.brands||'',category:'Online Product',country:/australia/i.test(countryText)?'Australia':'International',aliases:[product.product_name,product.generic_name,product.brands].filter(Boolean),defaultAmount,defaultUnit,units,unitLabels,serving:servingLabel,nutrients,foodGroups:{},waterMl:measureUnit==='mL'&&explicitMass?servingQty*.9:0,hydrationType:measureUnit==='mL'?'drink':'food',score:6,source:'Open Food Facts · Community Supplied · Verify Package',verified:false,ingredients:product.ingredients_text||'',allergens:product.allergens||[],imageUrl:product.image_front_small_url||product.image_front_url||'',packageQuantity:product.quantity||'',packagingText:product.packaging_text||'',packageServingText:servingText,packageServingExplicit:basis==='package-explicit',servingBasis:basis,servingBasisCheck:basisWarnings.length?`Corrected ${basisWarnings.length} inconsistent serving field${basisWarnings.length===1?'':'s'} from per-100 data`:'Serving fields coherent',servingBasisWarnings:basisWarnings};
  const bundle=suffix=>({calories:s24OffEnergy(nu,suffix),protein:s24OffNu(nu,'proteins',suffix),carbs:s24OffNu(nu,'carbohydrates',suffix),fat:s24OffNu(nu,'fat',suffix),satFat:s24OffNu(nu,'saturated-fat',suffix),fibre:s24OffNu(nu,'fiber',suffix),sugar:s24OffNu(nu,'sugars',suffix),sodium:(x=>x===null?null:x*1000)(s24OffNu(nu,'sodium',suffix))});
  P8?.attachBasis?.(food,{perServing:bundle('serving'),per100:bundle('100g'),servingAmount:explicitMass?servingQty:null,servingUnit:measureUnit,servingText,manufacturerServing:explicitMass});
  if(basis==='per100-reference'&&!hasPer100&&hasDirectServing){food.serving='Package serving supplied without a usable mass/volume basis';food.units={serve:1};food.unitLabels={serve:'Package Serve (weight/volume unavailable)'};food.defaultUnit='serve';food.defaultAmount=1;food.servingBasis='package-serving-no-mass';}
  return s24Apply(food);
};

// Ensure online queries request the fields required to distinguish package serve
// from a 100 g nutrition reference.
const alpha0624FetchBase=window.fetch.bind(window);
window.fetch=function(input,init){
  if(typeof input==='string'&&input.includes('world.openfoodfacts.org')&&input.includes('fields=')){
    try{const url=new URL(input);const fields=(url.searchParams.get('fields')||'').split(',').filter(Boolean);['quantity','product_quantity','product_quantity_unit','packaging_text','categories','categories_tags','serving_size','serving_quantity','serving_quantity_unit'].forEach(f=>{if(!fields.includes(f))fields.push(f);});url.searchParams.set('fields',fields.join(','));input=url.toString();}catch{}
  }
  return alpha0624FetchBase(input,init);
};

// Apply the serving resolver before the editor builds its unit dropdown, and make
// the provenance visible without turning a dietary standard serve into a claim
// about the exact physical weight of every individual item.
const alpha0624PrepareEntryBase=prepareEntry;
prepareEntry=function(food,opts={}){
  s24Apply(food);
  alpha0624PrepareEntryBase(food,opts);
  const note=by('entry-source-warning');if(note&&food?.servingFoundationSource){
    const hint=food.servingRangeHint?` ${food.servingRangeHint}`:'';
    note.insertAdjacentHTML('beforeend',`<p class="fine"><strong>Serving Measures:</strong> ${esc(food.servingFoundationSource)}.${esc(hint)}</p>`);
  }else if(note&&food?.servingRangeHint){note.insertAdjacentHTML('beforeend',`<p class="fine"><strong>Serving Measure:</strong> ${esc(food.servingRangeHint)}</p>`);}
};

// Diagnostics used by the release regression suite.
window.HEC_ALPHA0624_SERVING_TEST={
  build:ALPHA0624_BUILD,
  diagnostic:(food,context={})=>S24?.diagnostic?S24.diagnostic(clone(food),context):{},
  byQuery:(q)=>{const c=s23Concept(q),source=c?s23BestSource({query:q,parsed:s23Parsed(q),concept:c,candidates:s23ConceptCandidates(q,c),state:s23QuerySeeds(q,c)}):null;if(!source)return null;return S24?.diagnostic?S24.diagnostic(clone(source),{conceptCategory:c.category,conceptKey:c.key,query:q}):null;},
  productFromOFF:(product)=>{const f=makeOpenFoodFactsFood(product);return {name:f.name,basis:f.servingBasis,serving:f.serving,defaultUnit:defaultUnit(f),units:clone(f.units),labels:clone(f.unitLabels),nutrients:clone(f.nutrients),basisCheck:f.servingBasisCheck,warnings:clone(f.servingBasisWarnings||[])};}
};
ext.version=ACTIVE_VERSION;
ext.ui.universalGuidedSearch=true;
ext.ui.guidedSearchArchitecture='food-intelligence-v629-entity-registry+predictive-source-routing+stable-ranking';
ext.ui.guidedMatchValidation='strict-compatible-source-v629';
ext.ui.servingMeasureFoundation='contextual-measures-v629-identity-sanitised';
ext.ui.entityRegistryVersion=REG29?.version||ACTIVE_VERSION;

window.HEC_ALPHA0629_ENTITY_TEST={
  build:ACTIVE_VERSION,
  identify:q=>(REG29?.identify?.(q)||[]).map(x=>({id:x.entity.id,type:x.entity.type,name:x.entity.name,concept:x.entity.foodConcept||'',source:x.entity.sourceMode||''})),
  residual:q=>REG29?.stripRecognisedEntities?.(q)||'',
  concept:q=>s23Concept(q)?.key||'',
  productIntent:q=>s23LikelyProduct(q,s23Concept(q)),
  productNames:q=>s23ProductMatches(q,12).map(f=>`${f.brand||''} ${f.name}`.trim())
};

/* Alpha 0.6.32 — founder polish: identity, locked serving, front-pack OCR. */
const alpha0631SavedOnlineIds=new Set(ext.savedFoodIds||[]);ext.onlineFoods=(ext.onlineFoods||[]).filter(f=>alpha0631SavedOnlineIds.has(f.id)||alpha0631UsableOnlineFood(f));alpha0630InvalidateFoodSearchCaches();
function alpha0631UsefulBrand(brand){const b=String(brand||'').trim();return b&&!/^(fresh|fresh produce|generic|generic australian|australian eggs|australian dairy|hec guided entry|cafe estimate|recipe estimate|australian food composition database|usda)$/i.test(b);}
function alpha0631DisplayIdentity(item){const name=String(item?.name||'').trim(),brand=String(item?.brand||'').trim();if(!alpha0631UsefulBrand(brand)||s23Norm(name).includes(s23Norm(brand)))return name;return `${brand} ${name}`.trim();}
entryCard=function(entry){const label=alpha0631DisplayIdentity(entry);return `<article class="simple-diary-entry recorded-entry" data-entry-id="${esc(entry.id)}"><button class="entry-open" data-entry-edit="${esc(entry.id)}"><span><strong>${esc(label)}</strong><small>${esc(entryNaturalQuantity(entry))}</small></span><b>${energyText(entry.nutrients?.calories)}</b></button><button class="entry-more" data-entry-menu="${esc(entry.id)}" aria-label="More actions for ${esc(label)}">•••</button><div class="entry-inline-actions hidden" data-entry-actions="${esc(entry.id)}"><button data-entry-copy="${esc(entry.id)}">Copy</button><button data-entry-move="${esc(entry.id)}">Move</button><button data-entry-delete="${esc(entry.id)}" class="delete-action">Delete Food</button></div></article>`;};
alpha0615OpenMealOverview=function(meal){const date=ext.ui.diaryDate||isoToday(),items=entriesForDate(date).filter(e=>e.meal===meal&&e.status!=='skipped'),total=sumNutrients(items).calories;openModal(`${meal} · ${formatNumber(total)} Cal`,`${relativeDateLabel(date)} · Tap a food to edit it. Swipe left on a row to reveal Delete.`,`Done`,()=>{},`<div class="meal-overview-list">${items.length?items.map(e=>`<div class="meal-overview-row" data-overview-row="${esc(e.id)}"><button type="button" class="meal-overview-edit" data-overview-edit="${esc(e.id)}"><span><strong>${esc(alpha0631DisplayIdentity(e))}</strong><small>${esc(entryNaturalQuantity(e))}</small></span><b>${energyText(e.nutrients?.calories)}</b></button><button type="button" class="meal-overview-delete" data-overview-delete="${esc(e.id)}">🗑 Delete</button></div>`).join(''):`<p class="empty-state">No Foods Yet.</p>`}</div><button type="button" class="secondary wide" data-overview-add="${esc(meal)}">＋ Add Food To ${esc(meal)}</button>${items.length?`<div class="quick-action-row alpha0632-overview-transfer"><button type="button" class="secondary" data-copy-diary-meal="${esc(meal)}">Copy Meal</button><button type="button" class="secondary" data-move-diary-meal="${esc(meal)}">Move Meal</button></div>`:''}`);setTimeout(()=>alpha0615EnableSwipeDelete(),0);};

const alpha0631PrepareEntryBase=prepareEntry;
prepareEntry=function(food,opts={}){if(!opts.entry&&C8&&!C8.canLog(food)){showActionToast(food?.entryBlockedReason||'This item cannot be added to Diary as one fixed nutrition value.',null,8000);showFoodDetails(food?.id);return;}alpha0631PrepareEntryBase(food,opts);const unit=by('entry-unit'),label=unit?.closest('label');if(!label)return;const locked=food?.lockedServingUnit&&unitOptions(food)?.[food.lockedServingUnit]!==undefined;if(locked){unit.value=food.lockedServingUnit;label.classList.add('alpha0631-locked-unit');label.setAttribute('aria-hidden','true');}else{label.classList.remove('alpha0631-locked-unit');label.removeAttribute('aria-hidden');}updateEntryPreview();};

let alpha0631FrontFile=null;
function alpha0631FrontNameFromText(text){const lines=String(text||'').split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>=2&&x.length<=80);const rejects=/nutrition|information|ingredients|servings?|energy|protein|fat|carbohydrate|sodium|sugar|storage|cooking|instructions?|best before|use by|barcode|www\.|\bkj\b|\bkcal\b|\bcal\b|\b100\s*g\b/i;const clean=lines.filter(x=>!rejects.test(x)&&!/^\d+[.,]?\d*\s*(g|kg|ml|l)\b/i.test(x));const entityLine=clean.find(x=>REG29?.identify?.(x)?.some(m=>['brand','retailer'].includes(m.entity.type)));const chosen=[];if(entityLine)chosen.push(entityLine);for(const line of clean){if(chosen.includes(line))continue;if(/[a-z]{3}/i.test(line))chosen.push(line);if(chosen.length>=3)break;}return chosen.join(' ').replace(/\s+/g,' ').trim().slice(0,120);}
by('ocr-front-image')?.addEventListener('change',event=>{const file=event.target.files?.[0]||null;alpha0631FrontFile=file;const preview=by('ocr-front-preview'),button=by('run-front-ocr'),status=by('ocr-front-status');if(button)button.disabled=!file;if(!file){preview?.classList.add('hidden');if(preview)preview.innerHTML='';if(status)status.textContent='';return;}const url=URL.createObjectURL(file);if(preview){preview.innerHTML=`<img src="${url}" alt="Front of food package">`;preview.classList.remove('hidden');}if(status)status.textContent='Front photo ready. Tap Read Brand & Product Name.';});
by('run-front-ocr')?.addEventListener('click',async()=>{if(!alpha0631FrontFile)return;const status=by('ocr-front-status');if(status)status.textContent='Reading the front of the pack…';try{const ok=await ensureOcrLibrary();if(!ok)throw new Error('OCR unavailable');const image=await prepareOcrImage(alpha0631FrontFile);const worker=await Tesseract.createWorker('eng',1);const result=await worker.recognize(image);await worker.terminate();const suggested=alpha0631FrontNameFromText(result.data?.text||'');if(suggested){if(by('ocr-food-name'))by('ocr-food-name').value=suggested;if(status)status.textContent=`Suggested name: ${suggested}. Check it against the package and edit if needed.`;}else if(status)status.textContent='HEC read the photo but could not confidently isolate the product name. Enter or correct the name below.';}catch{if(status)status.textContent='The front photo could not be read reliably. You can still type the product name and use the Nutrition Panel values.';}});

function alpha0631ViewportHarden(){document.documentElement.style.setProperty('--hec-vv-width',`${Math.round(window.visualViewport?.width||window.innerWidth)}px`);}
window.visualViewport?.addEventListener('resize',alpha0631ViewportHarden,{passive:true});window.visualViewport?.addEventListener('scroll',alpha0631ViewportHarden,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(alpha0631ViewportHarden,120),{passive:true});alpha0631ViewportHarden();

window.HEC_ALPHA0631_TEST={build:ACTIVE_VERSION,externalQuery:alpha0631ExternalSearchQuery,conceptCandidates:q=>{const c=s23Concept(q);return c?s23ConceptCandidates(q,c).map(f=>f.name):[];},displayIdentity:alpha0631DisplayIdentity,frontName:alpha0631FrontNameFromText};
ext.version=ACTIVE_VERSION;ext.ui.searchPolish='incremental-online-v631';ext.ui.nutritionPanelScaling='basis-aware-v631';ext.ui.productFrontAssist='optional-front-ocr-v631';saveExt();

/* Alpha 0.6.33 RC3 — search state, intent, serving and diary correction batch. */
function rc3NutritionGuidance(values={}){
  const bits=[];
  if(hasEnergyValue(values?.calories))bits.push(`This selected amount provides ${formatNumber(values.calories)} Cal`);
  if(Number.isFinite(Number(values?.protein))&&Number(values.protein)>0)bits.push(`protein ${formatNumber(values.protein,true)} g`);
  if(Number.isFinite(Number(values?.satFat))&&Number(values.satFat)>=5)bits.push(`saturated fat ${formatNumber(values.satFat,true)} g`);
  if(Number.isFinite(Number(values?.sodium))&&Number(values.sodium)>=600)bits.push(`sodium ${formatNumber(values.sodium)} mg`);
  return bits.length?`${bits.join(' · ')}. Compare these factual values with the rest of your day and your own needs.`:'Only the available source nutrition is shown; missing nutrients have not been estimated.';
}
function rc3SourceLabel(item,food=getFood(item?.foodId)){
  const snap=item?.foodSnapshot||{},source=food?.sourceDisplayName||snap.sourceDisplayName||snap.brand||food?.brand||item?.brand||'';
  return alpha0631UsefulBrand(source)?source:'';
}
function rc3NeutralSearch(){
  const live=by('food-live-results'),results=by('food-results');if(live){live.innerHTML='';live.classList.add('hidden');}
  if(results&&activeLibraryTab()==='all')results.innerHTML='<div class="resource-empty rc3-neutral-search"><strong>Find A Food</strong><p>Start typing a food, product, brand or Australian food term. Previous searches are not shown here.</p></div>';
  by('online-search-actions')?.classList.add('hidden');by('online-food-status')?.classList.add('hidden');
}
function rc3ClearSearchContext({preserveMeal=true}={}){
  alpha0630CancelFoodSearchWork({invalidateOnline:true});alpha0630InvalidateFoodSearchCaches();
  ext.ui.foodSearch='';ext.ui.pendingDrink=null;delete ext.ui.foodSearchSnapshot;delete ext.ui.foodSearchView;delete ext.ui.sourceIntent;delete ext.ui.searchSnapshot;
  if(!preserveMeal){ext.ui.pendingMeal='';alpha0616ClearMealSession();}
  if(by('food-search'))by('food-search').value='';saveExt();rc3NeutralSearch();
}
function rc3DrinkCompatible(food,drink){
  const options=unitOptions(food),amount=Number(drink?.amount)||250;if(drink&&options?.mL!==undefined)return {amount,unit:'mL',usedDrinkContext:true};
  return {amount:null,unit:null,usedDrinkContext:false};
}
function rc3QuantityCheck(food,amount,unit){return C8?.naturalQuantityWarning?.(food,amount,unit)||{level:'normal',requiresConfirmation:false,message:''};}

const rc3OpenFeatureBase=openFeature;
openFeature=function(id,options={}){
  const fromHome=options.fromHome||document.querySelector('#home.active');
  if(id==='food-library'&&(fromHome||options.freshSearch))rc3ClearSearchContext({preserveMeal:!fromHome&&!!ext.ui.pendingMeal});
  rc3OpenFeatureBase(id,options);
  if(id==='food-library'&&!String(by('food-search')?.value||'').trim())rc3NeutralSearch();
};
window.openAlpha05Feature=openFeature;

const rc3RenderLibraryBase=renderLibrary;
renderLibrary=function(){rc3RenderLibraryBase();if(!String(by('food-search')?.value||'').trim())rc3NeutralSearch();};

window.addEventListener('input',event=>{
  const input=event.target;if(input?.id!=='food-search')return;const value=input.value||'',previous=ext.ui.foodSearch||'',changed=C8?.corrected?.(previous)!==C8?.corrected?.(value);
  ext.ui.foodSearch=value;if(changed){delete ext.ui.foodSearchSnapshot;delete ext.ui.searchSnapshot;alpha0630InvalidateFoodSearchCaches();alpha0627InvalidateSearch(previous);const results=by('food-results');if(results){results.classList.remove('alpha0623-guide-active','alpha0623-show-raw');results.innerHTML='<div class="resource-empty rc3-search-transition"><strong>Updating Search</strong><p>Matching only the words in your current search.</p></div>';}}
  if(!value.trim()){ext.ui.pendingDrink=null;rc3NeutralSearch();}
  else if(ext.ui.pendingDrink&&!S23?.queryIntent?.(value)?.drink){ext.ui.pendingDrink=null;const context=by('library-entry-context');if(context&&!ext.ui.pendingMeal){context.innerHTML='';context.classList.add('hidden');}}
  saveExt();
},true);
window.addEventListener('click',event=>{
  const clear=event.target.closest?.('#clear-food-search');if(clear)rc3ClearSearchContext({preserveMeal:true});
  const add=event.target.closest?.('[data-food-add]');if(add&&ext.ui.pendingDrink){
    event.preventDefault();event.stopImmediatePropagation();const food=getFood(add.dataset.foodAdd);if(!food||!C8?.canLog?.(food))return;const choice=rc3DrinkCompatible(food,ext.ui.pendingDrink);ext.ui.pendingDrink=null;saveExt();prepareEntry(food,{date:ext.ui.diaryDate||isoToday(),meal:ext.ui.pendingMeal||'',status:'eaten',amount:choice.amount,unit:choice.unit});return;
  }
},true);

const rc3PrepareEntryBase=prepareEntry;
prepareEntry=function(food,opts={}){
  const options=unitOptions(food),next={...opts},locked=food?.lockedServingUnit;
  if(next.unit&&options?.[next.unit]===undefined){next.unit=null;next.amount=null;}
  if(locked&&next.unit&&next.unit!==locked){next.unit=locked;next.amount=null;}
  rc3PrepareEntryBase(food,next);
  if(!editorState?.entryId){
    editorState.libraryOnly=false;const destinationGrid=by('entry-date')?.closest('.form-grid');destinationGrid?.classList.remove('hidden');if(by('entry-date')&&!by('entry-date').value)by('entry-date').value=isoToday();
    if(by('save-food-entry'))by('save-food-entry').textContent='Add to Diary';
    if(by('save-food-entry-and-food'))by('save-food-entry-and-food').textContent='Add & Save to My Foods';
  }
  updateEntryPreview();
};

let rc3SaveLocked=false,rc3ConfirmedQuantity='';
function rc3QuantitySignature(food,amount,unit,action){return `${food?.id||''}|${Number(amount)}|${unit||''}|${action||''}`;}
window.addEventListener('click',event=>{
  const save=event.target.closest?.('#save-food-entry,#save-food-entry-and-food'),voice=event.target.closest?.('#confirm-voice-log');if(!save&&!voice)return;
  if(rc3SaveLocked){event.preventDefault();event.stopImmediatePropagation();return;}
  const checks=voice?(voiceParsed.items||[]).map(item=>{const food=getFood(item.foodId);return {food,item,warning:rc3QuantityCheck(food,item.amount,item.unit)};}):[{food:getFood(editorState?.foodId),item:{amount:by('entry-amount')?.value,unit:by('entry-unit')?.value},warning:rc3QuantityCheck(getFood(editorState?.foodId),by('entry-amount')?.value,by('entry-unit')?.value)}];
  const flagged=checks.find(x=>x.warning.requiresConfirmation),signature=checks.map(x=>rc3QuantitySignature(x.food,x.item.amount,x.item.unit,save?.id||'voice')).join(';');
  if(flagged&&rc3ConfirmedQuantity!==signature){event.preventDefault();event.stopImmediatePropagation();openModal('Check This Quantity',flagged.warning.message,'Use This Quantity',()=>{rc3ConfirmedQuantity=signature;(save||voice).click();},'<p class="fine">Nothing has been saved yet. Cancel to return and correct the amount.</p>');return;}
  rc3ConfirmedQuantity='';rc3SaveLocked=true;setTimeout(()=>{rc3SaveLocked=false;},700);
},true);

alpha0631DisplayIdentity=function(item){return String(item?.name||'').trim();};
entryCard=function(entry){const name=alpha0631DisplayIdentity(entry),source=rc3SourceLabel(entry),quantity=`${formatNaturalAmount(entry.amount)} ${friendlyUnitLabel(getFood(entry.foodId)||{},entry.unit,entry.amount)}`,secondary=[source,quantity].filter(Boolean).join(' · ');return `<article class="simple-diary-entry recorded-entry" data-entry-id="${esc(entry.id)}"><button class="entry-open" data-entry-edit="${esc(entry.id)}"><span><strong class="entry-primary-name">${esc(name)}</strong><small class="entry-source-meta">${esc(secondary)}</small></span><b>${energyText(entry.nutrients?.calories)}</b></button><button class="entry-more" data-entry-menu="${esc(entry.id)}" aria-label="More actions for ${esc(name)}">•••</button><div class="entry-inline-actions hidden" data-entry-actions="${esc(entry.id)}"><button data-entry-copy="${esc(entry.id)}">Copy</button><button data-entry-move="${esc(entry.id)}">Move</button><button data-entry-delete="${esc(entry.id)}" class="delete-action">Delete Food</button></div></article>`;};
alpha0615OpenMealOverview=function(meal){const date=ext.ui.diaryDate||isoToday(),items=entriesForDate(date).filter(e=>e.meal===meal&&e.status!=='skipped'),total=sumNutrients(items).calories;openModal(`${meal} · ${formatNumber(total)} Cal`,`${relativeDateLabel(date)} · Tap a food to edit it. Swipe left on a row to reveal Delete.`,`Done`,()=>{},`<div class="meal-overview-list">${items.length?items.map(e=>{const source=rc3SourceLabel(e),meta=[source,entryNaturalQuantity(e)].filter(Boolean).join(' · ');return `<div class="meal-overview-row" data-overview-row="${esc(e.id)}"><button type="button" class="meal-overview-edit" data-overview-edit="${esc(e.id)}"><span><strong>${esc(e.name)}</strong><small>${esc(meta)}</small></span><b>${energyText(e.nutrients?.calories)}</b></button><button type="button" class="meal-overview-delete" data-overview-delete="${esc(e.id)}">🗑 Delete</button></div>`;}).join(''):`<p class="empty-state">No Foods Yet.</p>`}</div><button type="button" class="secondary wide" data-overview-add="${esc(meal)}">＋ Add Food To ${esc(meal)}</button>${items.length?`<div class="quick-action-row alpha0632-overview-transfer"><button type="button" class="secondary" data-copy-diary-meal="${esc(meal)}">Copy Meal</button><button type="button" class="secondary" data-move-diary-meal="${esc(meal)}">Move Meal</button></div>`:''}`);setTimeout(()=>alpha0615EnableSwipeDelete(),0);};

/* Alpha 0.6.33 RC4 — exact canonical products lead every selectable surface,
   while source navigation retains a separate visible product filter. */
function rc4ExactProduct(raw){
  const query=s23Parsed(raw).food;if(!query)return null;let ranked=allFoods().filter(s23ProductLike).map(food=>{const result=C8?.rank?.(food,query)||{score:searchRank(food,query),tier:''};return{food,score:Number(result.score)||0,tier:result.tier||''};}).filter(item=>['exact-name','exact-alias'].includes(item.tier));
  if(C8?.dedupeRanked)ranked=C8.dedupeRanked(ranked.map(item=>({food:item.food,rank:item.score}))).map(item=>({food:item.food,score:item.rank,tier:C8.rank(item.food,query).tier}));ranked.sort((a,b)=>b.score-a.score||Number(!!b.food.foodSourceId)-Number(!!a.food.foodSourceId)||a.food.name.localeCompare(b.food.name));return ranked[0]?.food||null;
}
function rc4SourceOnly(raw){return new Set(['mcdonalds','maccas','macca s']).has(C8?.norm?.(raw)||normalise(raw));}
function rc4SourceMeta(food){if(!food?.foodSourceId)return null;return {sourceId:food.foodSourceId,label:food.sourceDisplayName||food.brand||'Food Source'};}
function rc4SourceFoods(sourceId){const foods=allFoods().filter(food=>food.foodSourceId===sourceId&&food.itemStatus!=='retired');return C8?.dedupe?C8.dedupe(foods):foods;}
function rc4SourceProductQuery(raw){const value=String(raw||'').trim();if(!value||rc4SourceOnly(value))return'';const residual=REG29?.stripRecognisedEntities?.(value);return String(residual===undefined?value:residual).trim();}
function rc4RelatedProducts(raw,exact,limit=5){
  const source=rc4SourceMeta(exact),exactKey=C8?.canonicalKey?.(exact)||exact.id,ranked=allFoods().filter(s23ProductLike).map(food=>({food,result:C8?.rank?.(food,s23Parsed(raw).food)||{score:searchRank(food,raw)}})).filter(item=>item.result.score>0&&(C8?.canonicalKey?.(item.food)||item.food.id)!==exactKey).sort((a,b)=>Number(!!source&&b.food.foodSourceId===source.sourceId)-Number(!!source&&a.food.foodSourceId===source.sourceId)||b.result.score-a.result.score||a.food.name.localeCompare(b.food.name));return ranked.slice(0,limit).map(item=>item.food);
}
function rc4SourceButton(source,query){return source?`<button type="button" class="rc4-source-navigation" data-rc4-source-browse="${esc(source.sourceId)}" data-rc4-source-label="${esc(source.label)}" data-rc4-source-query="${esc(query)}"><span><strong>Browse ${esc(source.label)}</strong><small>Keep “${esc(query)}” as the visible product filter</small></span><b>›</b></button>`:'';}
function rc4RenderExactLive(raw,exact){const box=by('food-live-results'),related=rc4RelatedProducts(raw,exact,4),source=rc4SourceMeta(exact);box.innerHTML=`<div class="live-match-heading rc4-exact-heading"><span><strong>Exact Product Match</strong><small>Exact canonical identity is shown first</small></span></div>${s23ProductRow(exact)}${related.length?`<div class="live-match-heading rc4-related-heading"><strong>Close Product Matches</strong><small>Related products from the loaded catalogue</small></div>${related.map(s23ProductRow).join('')}`:''}${rc4SourceButton(source,raw)}<div class="alpha0623-search-status"><strong>Broader guidance remains available below.</strong><small>The exact product is not displaced by source navigation, generic guidance or online results.</small></div>`;box.classList.remove('hidden');}
const rc4RenderLiveBase=s23RenderLive;
function rc4RenderLive(raw){const term=String(raw||'').trim(),box=by('food-live-results');if(!term||document.activeElement!==by('food-search')){box?.classList.add('hidden');if(box)box.innerHTML='';return;}const exact=rc4ExactProduct(term);if(exact){rc4RenderExactLive(term,exact);return;}rc4RenderLiveBase(term);}
s23RenderLive=rc4RenderLive;renderFoodLiveMatches=rc4RenderLive;

function rc4RenderExactSurface(raw,exact){const results=by('food-results'),related=rc4RelatedProducts(raw,exact,8),source=rc4SourceMeta(exact);if(!results)return;results.className='food-results alpha0623-product-active rc4-exact-results';results.innerHTML=`<section class="rc4-exact-surface"><div class="rc4-exact-heading"><span><strong>Exact Product Match</strong><small>${esc(raw)} resolved to one canonical loaded product.</small></span></div>${resourceFoodRow(exact)}${related.length?`<strong class="rc4-related-heading">Close Product Matches</strong>${related.map(resourceFoodRow).join('')}`:''}${rc4SourceButton(source,raw)}<div class="search-guidance compact-search-guidance"><strong>Broader Search Guidance</strong><small>Change the search text to explore a generic food path. Exact identity stays first while this query is active.</small></div></section>`;}
function rc4SourceRanked(sourceId,raw){const all=rc4SourceFoods(sourceId),filter=rc4SourceProductQuery(raw);if(!filter)return{all,filter,matched:[...all].sort((a,b)=>String(a.categoryMemberships?.[0]||a.category||'').localeCompare(String(b.categoryMemberships?.[0]||b.category||''))||a.name.localeCompare(b.name))};const matched=all.map(food=>({food,result:C8?.rank?.(food,filter)||{score:searchRank(food,filter),tier:''}})).filter(item=>item.result.score>0).sort((a,b)=>Number(['exact-name','exact-alias'].includes(b.result.tier))-Number(['exact-name','exact-alias'].includes(a.result.tier))||b.result.score-a.result.score||a.food.name.localeCompare(b.food.name)).map(item=>item.food);return{all,filter,matched};}
function rc4RenderSourceSurface(state,raw){
  const results=by('food-results');if(!results)return;const ranked=rc4SourceRanked(state.sourceId,raw),shown=Math.min(Number(state.shown)||20,ranked.matched.length),visible=ranked.matched.slice(0,shown),scope=ranked.filter?`Showing ${visible.length} matching ${visible.length===1?'item':'items'} from ${ranked.all.length} loaded ${state.label} entries`:`Showing ${visible.length} of ${ranked.all.length} loaded ${state.label} entries`;results.className='food-results rc4-source-results';results.innerHTML=`<section class="rc4-source-surface"><div class="rc4-source-heading"><span><strong>${esc(state.label)}</strong><small>Loaded Australian catalogue only — not a claim of a complete national menu</small></span></div><p class="rc4-source-scope">${esc(scope)}</p><div class="rc4-source-tools">${ranked.filter?'<button type="button" class="secondary" data-rc4-clear-source-filter>Clear Product Filter</button>':''}<button type="button" class="secondary" data-rc4-leave-source>Back To All Resources</button></div>${visible.length?visible.map(resourceFoodRow).join(''):`<div class="resource-empty"><strong>No Matching ${esc(state.label)} Product.</strong><p>Clear the product filter to browse every loaded current entry.</p></div>`}${shown<ranked.matched.length?`<button type="button" class="secondary wide" data-rc4-source-more>Show More (${ranked.matched.length-shown} remaining)</button>`:''}</section>`;if(by('online-search-actions'))by('online-search-actions').classList.add('hidden');if(by('online-food-status'))by('online-food-status').classList.add('hidden');}
function rc4ApplySearchSurface(){const input=by('food-search'),raw=input?.value.trim()||'',exact=rc4ExactProduct(raw);let state=ext.ui.foodSourceBrowse||null;if(rc4SourceOnly(raw)){state={sourceId:'mcdonalds-au',label:"McDonald's Australia",query:raw,shown:state?.sourceId==='mcdonalds-au'?state.shown||20:20};ext.ui.foodSourceBrowse=state;}if(state){if(C8?.corrected?.(state.query)!==C8?.corrected?.(raw)){state.query=raw;state.shown=20;}rc4RenderSourceSurface(state,raw);return;}if(exact)rc4RenderExactSurface(raw,exact);}
const rc4RenderLibraryBase=renderLibrary;renderLibrary=function(){rc4RenderLibraryBase();rc4ApplySearchSurface();};
const rc4ClearSearchContextBase=rc3ClearSearchContext;rc3ClearSearchContext=function(options={}){delete ext.ui.foodSourceBrowse;rc4ClearSearchContextBase(options);};
document.addEventListener('click',event=>{
  const source=event.target.closest?.('[data-rc4-source-browse]');if(source){event.preventDefault();event.stopImmediatePropagation();const query=source.dataset.rc4SourceQuery||by('food-search')?.value||'';ext.ui.foodSourceBrowse={sourceId:source.dataset.rc4SourceBrowse,label:source.dataset.rc4SourceLabel||'Food Source',query,shown:20};ext.ui.foodSearch=query;if(by('food-search')){by('food-search').value=query;by('food-search').blur?.();}saveExt();renderLibrary();if(typeof rc6ScrollSourceHub==='function')rc6ScrollSourceHub();return;}
  if(event.target.closest?.('[data-rc4-clear-source-filter]')){event.preventDefault();event.stopImmediatePropagation();if(by('food-search')){by('food-search').value='';by('food-search').blur?.();}ext.ui.foodSearch='';if(ext.ui.foodSourceBrowse){ext.ui.foodSourceBrowse.query='';ext.ui.foodSourceBrowse.shown=20;}saveExt();renderLibrary();if(typeof rc6ScrollSourceHub==='function')rc6ScrollSourceHub();return;}
  if(event.target.closest?.('[data-rc4-leave-source]')){event.preventDefault();event.stopImmediatePropagation();if(by('food-search')){by('food-search').value='';by('food-search').blur?.();}ext.ui.foodSearch='';delete ext.ui.foodSourceBrowse;saveExt();renderLibrary();if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>by('food-results')?.scrollIntoView?.({block:'start'}));return;}
  if(event.target.closest?.('[data-rc4-source-more]')){event.preventDefault();event.stopImmediatePropagation();if(ext.ui.foodSourceBrowse)ext.ui.foodSourceBrowse.shown=(Number(ext.ui.foodSourceBrowse.shown)||20)+20;saveExt();renderLibrary();}
},true);

entryCard=function(entry){const name=alpha0631DisplayIdentity(entry),source=rc3SourceLabel(entry),quantity=`${formatNaturalAmount(entry.amount)} ${friendlyUnitLabel(getFood(entry.foodId)||{},entry.unit,entry.amount)}`,planned=entry.status==='planned',secondary=[source,quantity].filter(Boolean).join(' · ');return `<article class="simple-diary-entry ${planned?'planned-entry':'recorded-entry'}" data-entry-id="${esc(entry.id)}"><button class="entry-open" data-entry-edit="${esc(entry.id)}"><span><strong class="entry-primary-name">${esc(name)}${planned?'<span class="rc4-planned-badge">Planned</span>':''}</strong><small class="entry-source-meta">${esc(secondary)}</small></span><b>${energyText(entry.nutrients?.calories)}</b></button><button class="entry-more" data-entry-menu="${esc(entry.id)}" aria-label="More actions for ${esc(name)}">•••</button><div class="entry-inline-actions hidden" data-entry-actions="${esc(entry.id)}"><button data-entry-copy="${esc(entry.id)}">Copy</button><button data-entry-move="${esc(entry.id)}">Move</button><button data-entry-delete="${esc(entry.id)}" class="delete-action">Delete Food</button></div></article>`;};

window.HEC_RC4_SEARCH_TEST={exactName:q=>rc4ExactProduct(q)?.name||'',sourceOnly:rc4SourceOnly,sourceQuery:rc4SourceProductQuery,sourceCount:id=>rc4SourceFoods(id).length,sourceNames:(id,q,limit=300)=>rc4SourceRanked(id,q).matched.slice(0,limit).map(food=>food.name)};

/* Alpha 0.6.33 RC5 — source-quality-aware exact decisions and reviewed
   category browsing. Browse metadata is presentation-only; nutrition remains
   the immutable catalogue value. */
const RC5_SOURCE_CATEGORIES=Object.freeze(['Meals & Bundles','Breakfast','Burgers','Chicken & Nuggets','Wraps','Sides & Fries','Cold Drinks','McCafé / Hot Drinks','Desserts & Treats','Sauces','Other']);
const rc5ExactProductBase=rc4ExactProduct,rc5SourceOnlyBase=rc4SourceOnly;
function rc5PackagedBrand(raw){const query=C8?.norm?.(raw)||normalise(raw);return allFoods().filter(food=>['online-candidate','packaged'].includes(C8?.recordType?.(food))).map(food=>({food,brand:C8?.norm?.(food.brand)||normalise(food.brand)})).filter(item=>item.brand.length>2&&(` ${query} `).includes(` ${item.brand} `)).sort((a,b)=>b.brand.length-a.brand.length)[0]||null;}
function rc5SearchContext(raw){const normal=C8?.norm?.(raw)||normalise(raw),mcdonalds=/\b(?:mcdonalds|mc donalds|maccas|macca s|macca)\b/.test(normal),packaged=mcdonalds?null:rc5PackagedBrand(raw);let product=String(REG29?.stripRecognisedEntities?.(raw)??raw).trim();if(packaged)product=(C8?.norm?.(product)||normalise(product)).replace(new RegExp(`\\b${packaged.brand.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\b`,'g'),' ').replace(/\s+/g,' ').trim();product=s23Parsed(product).food||product;return {mcdonalds,packaged,product:C8?.corrected?.(product)||normalise(product)};}
function rc5ExactCandidates(query,predicate=()=>true){let ranked=allFoods().filter(food=>s23ProductLike(food)&&predicate(food)).map(food=>({food,result:C8?.rank?.(food,query)||{score:searchRank(food,query),tier:''}})).filter(item=>['exact-name','exact-alias'].includes(item.result.tier));ranked.sort((a,b)=>b.result.score-a.result.score||Number(!!b.food.foodSourceId)-Number(!!a.food.foodSourceId)||a.food.name.localeCompare(b.food.name));return ranked.map(item=>item.food);}
function rc5ExactDecision(raw){
  const context=rc5SearchContext(raw),query=context.product;if(!query)return{kind:'none',primary:null,choices:[],context};
  if(!context.mcdonalds&&!context.packaged&&C8?.friesIntent?.(raw)?.generic)return{kind:'none',primary:null,choices:[],context};
  const registeredBrand=!context.mcdonalds?REG29?.primary?.(raw,['brand','retailer']):null;if(registeredBrand){const fullIdentity=rc5ExactCandidates(raw,food=>REG29?.entityMatchesHay?.(registeredBrand.entity,`${food.brand||''} ${food.name||''} ${(food.aliases||[]).join(' ')}`));if(fullIdentity.length)return{kind:'exact',primary:fullIdentity[0],choices:fullIdentity.slice(0,1),context};}
  if(context.packaged){const sameBrand=food=>(C8?.norm?.(food.brand)||normalise(food.brand))===context.packaged.brand,fullIdentity=rc5ExactCandidates(raw,sameBrand);if(fullIdentity.length)return{kind:'exact',primary:fullIdentity[0],choices:fullIdentity.slice(0,1),context};const branded=rc5ExactCandidates(query,sameBrand);if(branded.length)return{kind:'exact',primary:branded[0],choices:branded.slice(0,1),context};}
  if(context.mcdonalds&&/^(?:fries|french fries)$/.test(query)){const official=rc4SourceFoods('mcdonalds-au').filter(food=>/^(?:Small|Medium|Large) Fries$/.test(food.name)).sort((a,b)=>['Small Fries','Medium Fries','Large Fries'].indexOf(a.name)-['Small Fries','Medium Fries','Large Fries'].indexOf(b.name));return official.length?{kind:'choice',primary:null,choices:official,context,reason:'Choose the McDonald’s fries size: Small, Medium or Large.'}:{kind:'none',primary:null,choices:[],context};}
  if(/^(?:quarter pounder with cheese|quarter pounder cheese)$/.test(query)){
    const source=rc4SourceFoods('mcdonalds-au'),official=['Quarter Pounder','Cheesy Quarter Pounder'].map(name=>source.find(food=>food.name===name)).filter(Boolean),community=rc5ExactCandidates(query,food=>C8?.recordType?.(food)==='online-candidate');
    return {kind:'choice',primary:null,choices:[...official,...community].slice(0,3),context,reason:'The reviewed menu does not define “with cheese” as an alias for one official product.'};
  }
  if(context.mcdonalds){const official=rc5ExactCandidates(query,food=>food.foodSourceId==='mcdonalds-au');return official.length?{kind:'exact',primary:official[0],choices:official.slice(0,1),context}:{kind:'none',primary:null,choices:[],context};}
  const exact=rc5ExactProductBase(query),localExact=exact&&C8?.recordType?.(exact)!=='online-candidate'&&(C8?.exactProductQuality?.(exact,{candidates:allFoods().filter(s23ProductLike)})||{exactEligible:true}).exactEligible;return localExact?{kind:'exact',primary:exact,choices:[exact],context}:{kind:'none',primary:null,choices:[],context};
}
rc4ExactProduct=function(raw){const decision=rc5ExactDecision(raw);return decision.kind==='exact'?decision.primary:null;};
rc4SourceOnly=function(raw){const value=C8?.norm?.(raw)||normalise(raw);return rc5SourceOnlyBase(raw)||new Set(['mc donalds','macca','macca s']).has(value);};
function rc5RenderChoiceLive(raw,decision){const box=by('food-live-results');if(!box)return;box.innerHTML=`<div class="live-match-heading rc4-exact-heading"><span><strong>Choose The Product You Mean</strong><small>${esc(decision.reason)}</small></span></div>${decision.choices.map(s23ProductRow).join('')}<div class="alpha0623-search-status"><strong>Official Australian menu options are shown first.</strong><small>A community-supplied packaged record is not treated as the restaurant product unless you name its brand.</small></div>`;box.classList.remove('hidden');}
function rc5RenderChoiceSurface(raw,decision){const results=by('food-results');if(!results)return;results.className='food-results alpha0623-product-active rc5-choice-results';results.innerHTML=`<section class="rc4-exact-surface"><div class="rc4-exact-heading"><span><strong>Choose The Product You Mean</strong><small>${esc(decision.reason)}</small></span></div>${decision.choices.map(resourceFoodRow).join('')}<div class="search-guidance compact-search-guidance"><strong>Source check</strong><small>Reviewed McDonald’s Australia menu products are listed before community-supplied packaged alternatives. Name a packaged brand to select that source explicitly.</small></div></section>`;}
const rc5RenderLiveBase=s23RenderLive;
function rc5RenderLive(raw){const term=String(raw||'').trim(),box=by('food-live-results');if(!term||document.activeElement!==by('food-search')){box?.classList.add('hidden');if(box)box.innerHTML='';return;}const decision=rc5ExactDecision(term);if(decision.kind==='choice'){rc5RenderChoiceLive(term,decision);return;}rc5RenderLiveBase(term);}
s23RenderLive=rc5RenderLive;renderFoodLiveMatches=rc5RenderLive;

function rc5CategoryGroups(sourceId){const foods=rc4SourceFoods(sourceId),groups=RC5_SOURCE_CATEGORIES.map(name=>({name,foods:foods.filter(food=>(food.browseCategory||'Other')===name)})).filter(group=>group.foods.length);return {foods,groups};}
function rc5SourceRanked(sourceId,raw,category=''){const all=rc4SourceFoods(sourceId),filter=rc4SourceProductQuery(raw);let matched=all;if(filter){const tokens=(C8?.tokens?.(filter)||normalise(filter).split(' ')).filter(Boolean);matched=all.map(food=>{const result=C8?.rank?.(food,filter)||{score:searchRank(food,filter),tier:''},hay=C8?.norm?.(`${food.name} ${(food.aliases||[]).join(' ')} ${(food.browseTags||[]).join(' ')}`)||normalise(`${food.name} ${(food.aliases||[]).join(' ')} ${(food.browseTags||[]).join(' ')}`),tagScore=tokens.length&&tokens.every(token=>hay.includes(token))?650+tokens.length:0;return{food,result:{...result,score:Math.max(Number(result.score)||0,tagScore)}};}).filter(item=>item.result.score>0).sort((a,b)=>Number(['exact-name','exact-alias'].includes(b.result.tier))-Number(['exact-name','exact-alias'].includes(a.result.tier))||b.result.score-a.result.score||a.food.name.localeCompare(b.food.name)).map(item=>item.food);}else if(category&&category!=='All Items')matched=all.filter(food=>(food.browseCategory||'Other')===category);matched=[...matched].sort((a,b)=>a.name.localeCompare(b.name));return{all,filter,matched,category};}
function rc5RenderSourceSurface(state,raw){
  const results=by('food-results');if(!results)return;const ranked=rc5SourceRanked(state.sourceId,raw,state.category||''),grouped=rc5CategoryGroups(state.sourceId);results.className='food-results rc4-source-results rc5-source-results';
  const heading=`<div class="rc4-source-heading"><span><strong>${esc(state.label)}</strong><small>Loaded Australian catalogue only — not a claim of a complete national menu</small></span></div>`;
  if(!ranked.filter&&!state.category){const cards=[...grouped.groups,{name:'All Items',foods:grouped.foods}].map(group=>`<button type="button" class="rc5-category-card" data-rc5-source-category="${esc(group.name)}"><span><strong>${esc(group.name)}</strong><small>${group.foods.length} ${group.foods.length===1?'item':'items'}</small></span><b>›</b></button>`).join('');results.innerHTML=`<section class="rc4-source-surface rc5-category-hub">${heading}<p class="rc4-source-scope">Browse ${grouped.foods.length} loaded products by reviewed menu category, or type a product name above.</p><div class="rc5-category-grid">${cards}</div><div class="rc4-source-tools"><button type="button" class="secondary" data-rc4-leave-source>Back To All Resources</button></div></section>`;}
  else{const shown=Math.min(Number(state.shown)||20,ranked.matched.length),visible=ranked.matched.slice(0,shown),label=ranked.filter?`Search results for “${ranked.filter}”`:(state.category||'All Items'),scope=`Showing ${visible.length} of ${ranked.matched.length} ${ranked.matched.length===1?'item':'items'} · ${ranked.all.length} loaded in total`;results.innerHTML=`<section class="rc4-source-surface rc5-category-products">${heading}<div class="rc5-category-title"><span><strong>${esc(label)}</strong><small>${esc(scope)}</small></span><button type="button" class="secondary" data-rc5-back-categories>Back To Categories</button></div><div class="rc4-source-tools">${ranked.filter?'<button type="button" class="secondary" data-rc4-clear-source-filter>Clear Product Filter</button>':''}<button type="button" class="secondary" data-rc4-leave-source>Back To All Resources</button></div>${visible.length?visible.map(resourceFoodRow).join(''):`<div class="resource-empty"><strong>No Matching ${esc(state.label)} Product.</strong><p>Return to categories or change the product search.</p></div>`}${shown<ranked.matched.length?`<button type="button" class="secondary wide" data-rc5-source-more>Show More (${ranked.matched.length-shown} remaining)</button>`:''}</section>`;}
  by('online-search-actions')?.classList.add('hidden');by('online-food-status')?.classList.add('hidden');
}
function rc5ApplySearchSurface(){const raw=by('food-search')?.value.trim()||'',state=ext.ui.foodSourceBrowse||null;if(state){const live=by('food-live-results');if(live){live.innerHTML='';live.classList.add('hidden');}rc5RenderSourceSurface(state,raw);return;}const decision=rc5ExactDecision(raw);if(decision.kind==='choice')rc5RenderChoiceSurface(raw,decision);}
const rc5RenderLibraryBase=renderLibrary;renderLibrary=function(){rc5RenderLibraryBase();rc5ApplySearchSurface();};
document.addEventListener('click',event=>{
  const category=event.target.closest?.('[data-rc5-source-category]');if(category){event.preventDefault();event.stopImmediatePropagation();if(by('food-search'))by('food-search').value='';ext.ui.foodSearch='';if(ext.ui.foodSourceBrowse){ext.ui.foodSourceBrowse.query='';ext.ui.foodSourceBrowse.category=category.dataset.rc5SourceCategory;ext.ui.foodSourceBrowse.shown=20;}saveExt();renderLibrary();return;}
  if(event.target.closest?.('[data-rc5-back-categories]')){event.preventDefault();event.stopImmediatePropagation();if(by('food-search')){by('food-search').value='';by('food-search').blur?.();}ext.ui.foodSearch='';if(ext.ui.foodSourceBrowse){ext.ui.foodSourceBrowse.query='';delete ext.ui.foodSourceBrowse.category;ext.ui.foodSourceBrowse.shown=20;}saveExt();renderLibrary();if(typeof rc6ScrollSourceHub==='function')rc6ScrollSourceHub();return;}
  if(event.target.closest?.('[data-rc5-source-more]')){event.preventDefault();event.stopImmediatePropagation();if(ext.ui.foodSourceBrowse)ext.ui.foodSourceBrowse.shown=(Number(ext.ui.foodSourceBrowse.shown)||20)+20;saveExt();renderLibrary();}
},true);
window.HEC_RC5_SEARCH_TEST={decision:q=>{const value=rc5ExactDecision(q);return{kind:value.kind,primary:value.primary?.name||'',choices:value.choices.map(food=>({name:food.name,source:food.sourceDisplayName||food.brand||'',type:C8?.recordType?.(food)||''})),context:{mcdonalds:value.context.mcdonalds,packaged:value.context.packaged?.food?.brand||'',product:value.context.product}};},sourceOnly:rc4SourceOnly,categories:id=>rc5CategoryGroups(id).groups.map(group=>({name:group.name,count:group.foods.length})),sourceNames:(id,q,category='',limit=300)=>rc5SourceRanked(id,q,category).matched.slice(0,limit).map(food=>food.name)};

/* Alpha 0.6.33 RC6 — direct source browsing and deliberate one-serving add. */
function rc6ScrollSourceHub(){requestAnimationFrame(()=>q('.rc5-category-hub,.rc5-category-products')?.scrollIntoView?.({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));}
function rc6SourceTrusted(food){const type=C8?.recordType?.(food)||'';if(['food-source','afcd','private','recipe'].includes(type))return true;if(food?.verified||food?.verificationStatus==='verified'||ext.foodVerification?.[food?.id])return true;return type==='local'&&!!food?.source&&!/var(?:y|ies)|estimate/i.test(food.source);}
function rc6QuickAddEligibility(food,{date=ext.ui.diaryDate||isoToday(),meal=ext.ui.pendingMeal||''}={}){const safety=foodSafety(food||{}),policy=C8?.quickAddPolicy?.(food,{date,meal,sourceTrusted:rc6SourceTrusted(food),safetyBlocked:safety.blocked})||{ready:false,reason:'identity',date,meal,amount:defaultAmount(food),unit:defaultUnit(food)},messages={identity:'Food identity is unavailable.',destination:'Choose the active date and destination meal first.',nutrition:'Complete fixed nutrition is unavailable.',serving:'A reviewed natural serving is unavailable.',source:'Review this source before adding.',safety:safety.message||'A profile safety check requires review.'};return {...policy,reason:policy.ready?'':messages[policy.reason]||policy.reason};}
function rc6FullReviewEligibility(food){const safety=foodSafety(food||{}),policy=C8?.fullReviewPolicy?.(food,{safetyBlocked:safety.blocked})||{ready:false,reason:'identity',amount:defaultAmount(food),unit:defaultUnit(food)};return {...policy,safety};}
function rc6OpenFullReview(food){const review=rc6FullReviewEligibility(food);if(!review.ready){showFoodDetails(food?.id);return {opened:false,...review};}const date=ext.ui?.mealEntrySession?.date||ext.ui.diaryDate||isoToday(),meal=ext.ui.pendingMeal||ext.ui?.mealEntrySession?.meal||'';prepareEntry(food,{date,meal,status:date>isoToday()?'planned':'eaten',source:food.source,amount:review.amount,unit:review.unit});return {opened:true,date,meal,amount:review.amount,unit:review.unit};}
function rc6QuickAdd(food,context={}){const check=rc6QuickAddEligibility(food,context);if(!check.ready)return {added:false,...check};const values=scaledNutrients(food,check.amount,check.unit),label=cleanUserUnitLabel(unitLabel(food,check.unit)),status=check.date>isoToday()?'planned':'eaten',entry={id:uid('entry'),foodId:food.id,name:food.name,brand:food.brand||'',date:check.date,meal:check.meal,status,amount:check.amount,unit:check.unit,unitLabel:label,metricEquivalent:naturalMetricEquivalent(food,check.amount,check.unit),time:status==='planned'?'':localClock(),notes:'Quick added as one reviewed natural serving',nutrients:values,foodGroups:scaledFoodGroups(food,check.amount,check.unit),foodGroupAttribution:foodGroupAttributionState(food),waterMl:scaledWaterMl(food,check.amount,check.unit),hydrationType:food.hydrationType||'food',score:food.score,source:food.source||'',foodSnapshot:P8?.diarySnapshot?.(food,{amount:check.amount,unit:check.unit,unitLabel:label,nutrients:values})||null,localDate:check.date,timeZone:activeTimeZone(),...recordTimestamps()};addEntry(entry);return {added:true,entry,...check};}
const rc6ResourceFoodRowBase=resourceFoodRow;
resourceFoodRow=function(food){let html=rc6ResourceFoodRowBase(food),check=rc6QuickAddEligibility(food),review=rc6FullReviewEligibility(food);if(review.ready){html=html.replace('<article class="resource-row ','<article class="resource-row rc6-food-row ').replace(`data-food-details="${esc(food.id)}"`,`data-food-review="${esc(food.id)}" aria-label="Review and edit ${esc(food.name)} entry"`).replace('<button class="resource-save ',`<button class="resource-details" type="button" data-food-details="${esc(food.id)}" aria-label="Nutrition details for ${esc(food.name)}" title="Nutrition Details">ⓘ</button><button class="resource-save `);}if(check.ready){html=html.replace(`data-food-add="${esc(food.id)}"`,`data-food-add="${esc(food.id)}" data-rc6-quick-add="true"`).replace('aria-label="Review and add','aria-label="Quick add one serving of').replace('class="resource-add ','class="resource-add rc6-quick-add ');}return html;};
s23ProductRow=function(food){const loggable=C8?.canLog?C8.canLog(food):true,check=rc6QuickAddEligibility(food),review=rc6FullReviewEligibility(food),reviewAttr=review.ready?`data-food-review="${esc(food.id)}" aria-label="Review and edit ${esc(food.name)} entry"`:`data-food-details="${esc(food.id)}" aria-label="View ${esc(food.name)} details"`,info=review.ready?`<button type="button" class="rc6-live-food-info" data-food-details="${esc(food.id)}" aria-label="Nutrition details for ${esc(food.name)}" title="Nutrition Details">ⓘ</button>`:'',action=check.ready?`data-food-add="${esc(food.id)}" data-rc6-quick-add="true" aria-label="Quick add one serving of ${esc(food.name)} to ${esc(check.meal)}"`:review.ready?`data-food-review="${esc(food.id)}" aria-label="Review and edit ${esc(food.name)} entry"`:`data-food-details="${esc(food.id)}" aria-label="View ${esc(food.name)} details"`;return `<div class="live-match-row rc6-live-food-row ${review.ready?'rc6-has-info':''}"><button type="button" class="rc6-live-food-review" ${reviewAttr}><span><strong>${esc(food.name)}</strong><small>${esc(loggable?s23EnergyMeta(food):food.nutritionStatus==='configurable'?'Configurable meal · Details only':'Nutrition unavailable · Details only')}</small></span><b>${review.ready?'Review':'Details'}</b></button>${info}<button type="button" class="rc6-live-food-add" ${action}>${check.ready?'＋':'›'}</button></div>`;};
let rc6QuickAddLockTarget=null,rc6QuickAddLockUntil=0;
document.addEventListener('click',event=>{const review=event.target.closest?.('[data-food-review]');if(review&&q('#food-library.active')){event.preventDefault();event.stopImmediatePropagation();rc6OpenFullReview(getFood(review.dataset.foodReview));return;}const add=event.target.closest?.('[data-rc6-quick-add="true"]');if(!add||!q('#food-library.active'))return;event.preventDefault();event.stopImmediatePropagation();const now=Date.now();if(add===rc6QuickAddLockTarget&&now<rc6QuickAddLockUntil)return;rc6QuickAddLockTarget=add;rc6QuickAddLockUntil=now+550;const food=getFood(add.dataset.foodAdd),result=rc6QuickAdd(food);if(!result.added){showActionToast(result.reason||'Open Details to review this food.',null,5000);return;}showActionToast(`Added 1 ${food.name} to ${result.meal}.`,null,3000);},true);
const rc6RenderLibraryBase=renderLibrary;
function rc6GroupGenericFries(raw){
  if(!C8?.friesIntent?.(raw)?.generic)return;const results=by('food-results');if(!results||results.querySelector(':scope > .founder-polish-overseas'))return;const collapse=[];let count=0;
  [...results.children].forEach(child=>{if(child.classList.contains('all-resources-online')){collapse.push(child);count+=child.querySelectorAll('.resource-row').length||1;return;}if(!child.classList.contains('resource-row'))return;const id=child.querySelector('[data-food-review],[data-food-details]')?.dataset.foodReview||child.querySelector('[data-food-review],[data-food-details]')?.dataset.foodDetails,food=getFood(id),market=C8?.marketFor?.(food);if(market&&market!=='AU'&&!/australia/i.test(food?.country||'')){collapse.push(child);count++;}});
  if(!collapse.length)return;const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');details.className='founder-polish-overseas';body.className='founder-polish-overseas-body';summary.textContent=`Show more online/overseas matches (${count})`;details.append(summary,body);collapse.forEach(node=>body.append(node));results.append(details);
}
function rc6FocusedSearchModel({innerWidth,innerHeight,visualWidth,visualHeight,offsetTop=0,focused=false,contextHeight=0}={}){const width=Number(visualWidth)||Number(innerWidth)||0,height=Number(visualHeight)||Number(innerHeight)||0,layoutHeight=Number(innerHeight)||height,narrow=width<=700,reduced=height<=layoutHeight-110&&height/layoutHeight<=.84,keyboardOpen=!!focused&&narrow&&reduced,availableHeight=Math.max(170,Math.round(height-Math.max(0,Number(contextHeight)||0)-64));return {width,height,offsetTop:Number(offsetTop)||0,narrow,reduced,focused:!!focused,keyboardOpen,compact:keyboardOpen,availableHeight};}
let rc6FoodViewportFrame=0,rc6FoodKeyboardWasOpen=false,rc6FoodKeyboardPositioned=false;
function rc6SyncFoodSearchViewport(){if(rc6FoodViewportFrame)return;rc6FoodViewportFrame=requestAnimationFrame(()=>{rc6FoodViewportFrame=0;const input=by('food-search'),vv=window.visualViewport,context=by('library-entry-context'),focused=document.activeElement===input,model=rc6FocusedSearchModel({innerWidth:window.innerWidth,innerHeight:window.innerHeight,visualWidth:vv?.width||window.innerWidth,visualHeight:vv?.height||window.innerHeight,offsetTop:vv?.offsetTop||0,focused,contextHeight:context&&!context.classList.contains('hidden')?context.offsetHeight:0});document.documentElement.style.setProperty('--hec-visual-viewport-height',`${Math.round(model.height)}px`);document.documentElement.style.setProperty('--hec-visual-viewport-width',`${Math.round(model.width)}px`);document.documentElement.style.setProperty('--hec-visual-viewport-offset',`${Math.round(model.offsetTop)}px`);document.documentElement.style.setProperty('--hec-keyboard-top',`${Math.round(model.offsetTop+model.height)}px`);document.documentElement.style.setProperty('--hec-search-available-height',`${model.availableHeight}px`);document.documentElement.style.setProperty('--hec-focused-context-height',`${Math.max(0,Number(context?.offsetHeight)||0)}px`);document.body.classList.toggle('food-search-focused',focused);document.body.classList.toggle('food-search-keyboard-open',model.keyboardOpen);document.body.classList.toggle('food-search-compact',model.compact);if(model.compact&&!rc6FoodKeyboardWasOpen&&!rc6FoodKeyboardPositioned){rc6FoodKeyboardPositioned=true;requestAnimationFrame(()=>q('#food-library .resource-page')?.scrollIntoView?.({block:'start',behavior:'auto'}));}if(!focused)rc6FoodKeyboardPositioned=false;rc6FoodKeyboardWasOpen=model.keyboardOpen;});}
renderLibrary=function(){rc6RenderLibraryBase();const input=by('food-search'),raw=input?.value.trim()||'';if(rc4SourceOnly(raw)){ext.ui.foodSourceBrowse={sourceId:'mcdonalds-au',label:"McDonald's Australia",query:raw,shown:ext.ui.foodSourceBrowse?.shown||20};delete ext.ui.foodSourceBrowse.category;rc5RenderSourceSurface(ext.ui.foodSourceBrowse,raw);const live=by('food-live-results');if(live){live.innerHTML='';live.classList.add('hidden');}input?.blur?.();}else rc6GroupGenericFries(raw);rc6SyncFoodSearchViewport();};
window.addEventListener('input',event=>{const input=event.target;if(input?.id!=='food-search'||!rc4SourceOnly(input.value))return;setTimeout(()=>{if(!rc4SourceOnly(input.value))return;ext.ui.foodSourceBrowse={sourceId:'mcdonalds-au',label:"McDonald's Australia",query:input.value,shown:20};saveExt();renderLibrary();input.blur();rc6ScrollSourceHub();},0);},true);
by('food-search')?.addEventListener('focus',rc6SyncFoodSearchViewport);by('food-search')?.addEventListener('blur',()=>setTimeout(rc6SyncFoodSearchViewport,0));window.visualViewport?.addEventListener('resize',rc6SyncFoodSearchViewport);window.visualViewport?.addEventListener('scroll',rc6SyncFoodSearchViewport);rc6SyncFoodSearchViewport();
by('weight-log-by-voice')?.addEventListener('click',event=>{event.preventDefault();const date=by('checkin-date')?.value||isoToday();ext.ui.quickLogOrigin='weight-checkin';ext.ui.diaryDate=date;saveExt();openFeature('quick-log');if(by('voice-date'))by('voice-date').value=date;if(by('quick-voice-prompt'))by('quick-voice-prompt').textContent='Tell me your weight and date. I will confirm before using Weight Check-In.';alpha0633StartListening('request');});

/* Alpha 0.6.33 — product semantics and focused mobile search presentation. */
const PS33=window.HECProductServingSemantics;
function ps33MarkedRow(html,role){const marker=role==='exact'?'semantic-exact-match':'semantic-close-match';return String(html||'').replace('class="live-match-row ','class="live-match-row '+marker+' ').replace('class="resource-row ','class="resource-row '+marker+' ');}
function ps33RankedFoods(query,limit=30){let ranked=allFoods().filter(s23ProductLike).map(food=>({food,result:C8?.rank?.(food,query)||{score:searchRank(food,query)}})).filter(item=>item.result.score>0);if(C8?.dedupeRanked)ranked=C8.dedupeRanked(ranked.map(item=>({food:item.food,rank:item.result.score,result:item.result}))).map(item=>({food:item.food,result:item.result||C8.rank(item.food,query),score:item.rank}));ranked.sort((a,b)=>(Number(b.result?.score)||Number(b.score)||0)-(Number(a.result?.score)||Number(a.score)||0)||a.food.name.localeCompare(b.food.name));return ranked.slice(0,limit).map(item=>item.food);}
rc4RenderExactLive=function(raw,exact){const box=by('food-live-results'),related=rc4RelatedProducts(raw,exact,4),source=rc4SourceMeta(exact);box.innerHTML=`<div class="live-match-heading rc4-exact-heading"><span><strong>Exact Product Match</strong><small>Exact canonical identity is shown first</small></span></div>${ps33MarkedRow(s23ProductRow(exact),'exact')}${related.length?`<div class="live-match-heading rc4-related-heading"><strong>Close Product Matches</strong><small>Related products from the loaded catalogue</small></div>${related.map(food=>ps33MarkedRow(s23ProductRow(food),'close')).join('')}`:''}${rc4SourceButton(source,raw)}<div class="alpha0623-search-status"><strong>Broader guidance remains available below.</strong><small>The exact product is not displaced by source navigation, generic guidance or online results.</small></div>`;box.classList.remove('hidden');};
rc4RenderExactSurface=function(raw,exact){const results=by('food-results'),related=rc4RelatedProducts(raw,exact,8),source=rc4SourceMeta(exact);if(!results)return;results.className='food-results alpha0623-product-active rc4-exact-results';results.innerHTML=`<section class="rc4-exact-surface"><div class="rc4-exact-heading"><span><strong>Exact Product Match</strong><small>${esc(raw)} resolved to one canonical loaded product.</small></span></div>${ps33MarkedRow(resourceFoodRow(exact),'exact')}${related.length?`<strong class="rc4-related-heading">Close Product Matches</strong>${related.map(food=>ps33MarkedRow(resourceFoodRow(food),'close')).join('')}`:''}${rc4SourceButton(source,raw)}<div class="search-guidance compact-search-guidance"><strong>Broader Search Guidance</strong><small>Change the search text to explore a generic food path. Exact identity stays first while this query is active.</small></div></section>`;};
rc5RenderChoiceLive=function(raw,decision){const box=by('food-live-results');if(!box)return;box.innerHTML=`<div class="live-match-heading rc4-exact-heading"><span><strong>Choose The Product You Mean</strong><small>${esc(decision.reason)}</small></span></div>${decision.choices.map((food,index)=>ps33MarkedRow(s23ProductRow(food),index===0?'exact':'close')).join('')}<div class="alpha0623-search-status"><strong>Official Australian menu options are shown first.</strong><small>A community-supplied packaged record is not treated as the restaurant product unless you name its brand.</small></div>`;box.classList.remove('hidden');};
rc5RenderChoiceSurface=function(raw,decision){const results=by('food-results');if(!results)return;results.className='food-results alpha0623-product-active rc5-choice-results';results.innerHTML=`<section class="rc4-exact-surface"><div class="rc4-exact-heading"><span><strong>Choose The Product You Mean</strong><small>${esc(decision.reason)}</small></span></div>${decision.choices.map((food,index)=>ps33MarkedRow(resourceFoodRow(food),index===0?'exact':'close')).join('')}<div class="search-guidance compact-search-guidance"><strong>Source check</strong><small>Reviewed McDonald’s Australia menu products are listed before community-supplied packaged alternatives. Name a packaged brand to select that source explicitly.</small></div></section>`;};

function ps33BrandFamily(raw){const value=C8?.brandFamilyResults?.(allFoods().filter(s23ProductLike),raw);return value?.intent?.kind==='brand-family'?value:null;}
function ps34GenericFamily(raw){const schema=GUIDED_PRODUCTS?.genericSchemaForQuery?.(raw),products=schema?GUIDED_PRODUCTS.genericReferenceCandidates(allFoods(),schema):[];return products.length?{intent:{kind:'generic-category',concept:{key:schema.key,name:schema.name}},entity:{key:schema.key,name:schema.name},products,primary:products,broader:[],activeTier:1,catalogue:false,genericReference:true}:null;}
function ps33FamilyRows(family,limit){return [...family.primary,...family.broader].slice(0,limit);}
let ps34GuidedSession=null,ps34GuidedQuery='',ps34GuidedFamily=null,ps34RestoredQuery='',ps34WasLocked=false;
function ps34ResolutionLocked(){return !!ps34GuidedSession?.searchLock?.locked&&!!ps34GuidedSession?.exactNutritionalIdentity;}
function ps34EnsureGuided(raw,family){if(!GUIDED_PRODUCTS)return null;const query=String(raw||'').trim();if(!ps34GuidedSession||ps34GuidedQuery!==query){ps34GuidedQuery=query;ps34GuidedFamily=family;ps34GuidedSession=GUIDED_PRODUCTS.createSession(family.products,query,{intent:family.intent,destination:{date:ext.ui.diaryDate||isoToday(),meal:ext.ui.pendingMeal||''}});}return ps34GuidedSession;}
function ps34StartCatalogueGuide(raw,foods,intent){const entity=intent?.brand||intent?.concept||intent?.product||{name:'Australian product',key:'catalogue'},family={intent,entity,products:foods,primary:foods,broader:[],activeTier:2,catalogue:true};ps34GuidedSession=null;ps34GuidedQuery='';ps34GuidedFamily=family;ps34EnsureGuided(raw,family);ps33RenderBrandFamilyLive(raw,family);ps33RenderBrandFamilySurface(raw,family);return ps34GuidedSession;}
function ps34GuidedNav(session){const canBack=session.answers?.length||session.stage!==GUIDED_PRODUCTS.stages.IDENTITY;return `<div class="guided-resolution-nav">${canBack?'<button type="button" class="secondary" data-gpr-back>← Back</button>':''}<button type="button" class="secondary" data-gpr-cancel>Cancel</button></div>`;}
function ps34GuidedMarkup(raw,family,{compact=false}={}){
  const session=ps34EnsureGuided(raw,family);if(!session)return '';
  const identityKind=family.intent?.kind==='generic-category'?'Generic food':family.intent?.kind==='consumer-brand'?'Recognised brand':'Product matches',recognised=`<div class="guided-resolution-understanding"><strong>${esc(identityKind)}: ${esc(family.entity.name)}</strong><small>Product identity is resolved before serving or amount.</small></div>`;
  if(session.stage===GUIDED_PRODUCTS.stages.IDENTITY){const question=session.nextQuestion,branded=session.genericConcept?'<button type="button" class="secondary wide" data-gpr-branded>Browse Branded Products</button>':'';if(session.resolutionState===GUIDED_PRODUCTS.states.INCOMPLETE||!question)return `<section class="guided-resolution-card ${compact?'guided-resolution-compact':''}">${recognised}<div class="guided-resolution-question"><strong>Product identity needs more information</strong><small>A barcode or broad family label is not treated as the exact food you consumed.</small></div>${branded}${ps34GuidedNav(session)}<div class="guided-resolution-fallback"><small>Keep typing, scan for a better source name, read the Nutrition Panel, or complete the product name manually.</small></div></section>`;const choices=(question.options||[]).map(option=>`<button type="button" class="guided-resolution-choice" data-gpr-answer="${esc(question.key)}" data-gpr-value="${esc(option.value)}"><span>${esc(option.label)}</span><b>›</b></button>`).join('');return `<section class="guided-resolution-card ${compact?'guided-resolution-compact':''}">${recognised}<div class="guided-resolution-question"><strong>${esc(question?.question||'Which exact product?')}</strong><small>${question.key==='product'?'Choose the real product name. Optional narrowing is used only when it materially helps.':'Only the unresolved attributes needed to identify one nutrition record are asked.'}</small></div><div class="guided-resolution-choices">${choices}</div>${branded}${ps34GuidedNav(session)}<div class="guided-resolution-fallback"><small>Can’t find it? Keep typing, scan its barcode, read the Nutrition Panel, or create it manually.</small></div></section>`;}
  const product=session.exactProduct,identity=`<div class="guided-resolution-exact"><small>${session.identityKind==='generic-reference'?'Exact Australian nutrition reference':'Exact canonical product'}</small><strong>${esc(product?.name||'')}</strong><span>${esc(product?.brand||'')}</span></div>`;
  if(session.stage===GUIDED_PRODUCTS.stages.MEASURE){const choices=(session.servingProfile?.measures||[]).map(measure=>`<button type="button" class="guided-resolution-choice" data-gpr-measure="${esc(measure.key)}"><span>${esc(measure.label)}</span><b>›</b></button>`).join('');return `<section class="guided-resolution-card ${compact?'guided-resolution-compact':''}">${identity}<div class="guided-resolution-question"><strong>How are you measuring it?</strong><small>No amount has been assumed from the nutrition reference serving or package size.</small></div><div class="guided-resolution-choices">${choices||'<p>Only a verified metric measure can be offered for this product.</p>'}</div>${ps34GuidedNav(session)}</section>`;}
  if(session.stage===GUIDED_PRODUCTS.stages.AMOUNT)return `<section class="guided-resolution-card ${compact?'guided-resolution-compact':''}">${identity}<div class="guided-resolution-question"><strong>How much?</strong><small>${esc(session.selectedMeasure?.label||session.selectedMeasure?.key||'')}</small></div><label class="guided-resolution-amount">Enter the amount<input type="number" inputmode="decimal" min="0.01" step="0.01" value="1" data-gpr-amount></label><button type="button" class="primary guided-resolution-continue" data-gpr-continue>Continue</button>${ps34GuidedNav(session)}</section>`;
  const calories=session.nutrition?.calories;return `<section class="guided-resolution-card ${compact?'guided-resolution-compact':''}">${identity}<div class="guided-resolution-question"><strong>Ready for review</strong><small>${formatNaturalAmount(session.amount)} × ${esc(session.selectedMeasure?.label||session.selectedMeasure?.key||'')}${Number.isFinite(Number(calories))?` · ${energyText(calories,session.nutrition?.energyKj)}`:''}</small></div><button type="button" class="primary guided-resolution-continue" data-gpr-review>Review And Confirm</button>${ps34GuidedNav(session)}</section>`;
}
function ps33RenderBrandFamilyLive(raw,family){const box=by('food-live-results');if(!box)return;if(ps34ResolutionLocked()||document.activeElement!==by('food-search')){box.innerHTML='';box.classList.add('hidden');return;}box.innerHTML=ps34GuidedMarkup(raw,family,{compact:true});box.classList.toggle('hidden',!box.innerHTML);ps34SyncGuidedUiState();}
function ps33RenderBrandFamilySurface(raw,family){const results=by('food-results');if(!results)return;if(!ps34ResolutionLocked()&&document.activeElement===by('food-search')){results.className='food-results brand-family-results';results.innerHTML='';return;}results.className='food-results brand-family-results';results.innerHTML=ps34GuidedMarkup(raw,family);ps34SyncGuidedUiState();}
function ps34SyncGuidedUiState(){const active=!!ps34GuidedSession,unresolved=active&&ps34GuidedSession.stage===GUIDED_PRODUCTS?.stages?.IDENTITY&&!ps34GuidedSession.exactProduct,locked=ps34ResolutionLocked();document.body.classList.toggle('guided-product-unresolved',unresolved);document.body.classList.toggle('progressive-food-resolution-active',active);document.body.classList.toggle('progressive-food-resolution-locked',locked);if(locked&&!ps34WasLocked&&typeof psLargeSearchToken!=='undefined')psLargeSearchToken++;ps34WasLocked=locked;}
function ps34RenderGuided(){const raw=by('food-search')?.value.trim()||ps34GuidedQuery,family=ps34GuidedFamily||ps33BrandFamily(raw)||ps34GenericFamily(raw);if(!family)return;ps34SyncGuidedUiState();ps33RenderBrandFamilyLive(raw,family);ps33RenderBrandFamilySurface(raw,family);rc6SyncFoodSearchViewport();}
function ps34SelectGuidedProductChoice(choiceId,answerKey){const session=ps34GuidedSession,question=session?.nextQuestion,key=String(answerKey||question?.key||''),value=String(choiceId||''),valid=session?.stage===GUIDED_PRODUCTS?.stages?.IDENTITY&&question?.key===key&&question.options?.some(option=>String(option.value)===value);if(!valid)return false;GUIDED_PRODUCTS.answerDistinction(session,key,value);ps34RenderGuided();return true;}
document.addEventListener('click',event=>{
  const answer=event.target.closest('[data-gpr-answer]'),measure=event.target.closest('[data-gpr-measure]'),back=event.target.closest('[data-gpr-back]'),cancel=event.target.closest('[data-gpr-cancel]'),branded=event.target.closest('[data-gpr-branded]'),next=event.target.closest('[data-gpr-continue]'),review=event.target.closest('[data-gpr-review]');if(!answer&&!measure&&!back&&!cancel&&!branded&&!next&&!review)return;
  event.preventDefault();event.stopPropagation();if(!ps34GuidedSession)return;
  if(answer){ps34SelectGuidedProductChoice(answer.dataset.gprValue,answer.dataset.gprAnswer);return;}else if(measure)GUIDED_PRODUCTS.selectMeasure(ps34GuidedSession,measure.dataset.gprMeasure);else if(back){ps34GuidedSession=GUIDED_PRODUCTS.back(ps34GuidedSession);if(ps34GuidedSession.restoreSearchRequested){ps34RestoredQuery=ps34GuidedQuery;ps34GuidedSession=null;ps34GuidedFamily=null;ps34SyncGuidedUiState();renderLibrary();return;}}else if(cancel){ps34GuidedSession=null;ps34GuidedQuery='';ps34GuidedFamily=null;ps34RestoredQuery='';ps34SyncGuidedUiState();const input=by('food-search');if(input)input.value='';ext.ui.foodSearch='';saveExt();renderLibrary();return;}else if(branded){const query=ps34GuidedQuery;ps34RestoredQuery=query;ps34GuidedSession=null;ps34GuidedFamily=null;ps34SyncGuidedUiState();psLargeSearch(query,{forceBranded:true});return;}else if(next){const card=next.closest('.guided-resolution-card'),amount=Number(card?.querySelector('[data-gpr-amount]')?.value);GUIDED_PRODUCTS.selectAmount(ps34GuidedSession,amount);}else if(review){const selected=ps34GuidedSession.exactProduct,food=getFood(selected?.id)||selected;if(food)prepareEntry(food,{date:ps34GuidedSession.destination?.date||ext.ui.diaryDate||isoToday(),meal:ps34GuidedSession.destination?.meal||ext.ui.pendingMeal||'',amount:ps34GuidedSession.amount,unit:ps34GuidedSession.selectedMeasure?.key});return;}ps34RenderGuided();
},true);
const ps33ExactProductBase=rc4ExactProduct;rc4ExactProduct=function(raw){if(ps33BrandFamily(raw))return null;const exact=ps33ExactProductBase(raw);if(!exact||C8?.recordType?.(exact)==='online-candidate')return null;return (C8?.exactProductQuality?.(exact)||{exactEligible:true}).exactEligible?exact:null;};
const ps33RenderLiveBase=s23RenderLive;s23RenderLive=function(raw){const term=String(raw||'').trim();if(ps34RestoredQuery&&ps34RestoredQuery!==term)ps34RestoredQuery='';const family=ps34RestoredQuery===term?null:ps33BrandFamily(term)||ps34GenericFamily(term);if(ps34GuidedQuery&&ps34GuidedQuery!==term){ps34GuidedSession=null;ps34GuidedQuery='';ps34GuidedFamily=null;ps34SyncGuidedUiState();}if(ps34ResolutionLocked()){ps34RenderGuided();return;}if(family&&document.activeElement===by('food-search')){ps34GuidedFamily=family;ps33RenderBrandFamilyLive(term,family);ps34SyncGuidedUiState();return;}ps33RenderLiveBase(term);};renderFoodLiveMatches=s23RenderLive;
let psLargeSearchToken=0,psLargeState=null,psFederatedSearchState=C8?.newFederatedSearchState?.()||{revision:0,query:'',local:[],localCommitted:false,online:[]};
function psSearchBeginRevision(raw){const before=psFederatedSearchState.revision||0,revision=C8?.beginQueryRevision?.(psFederatedSearchState,raw)??before;if(revision!==before){psLargeSearchToken++;psLargeState=null;}return revision;}
function psSearchRevisionFor(raw){return C8?.revisionMatches?.(psFederatedSearchState,psFederatedSearchState.revision,raw)?psFederatedSearchState.revision:psSearchBeginRevision(raw);}
function psSearchRevisionCurrent(revision,raw){return C8?.revisionMatches?.(psFederatedSearchState,revision,raw)??true;}
function psRecordOnlineResults(revision,raw,foods){return C8?.appendOnlineSnapshot?.(psFederatedSearchState,revision,raw,foods)||false;}
function psCommitLocalResult(result,revision,{append=false}={}){if(!result)return null;const accepted=append?C8?.appendLocalSnapshot?.(psFederatedSearchState,revision,result.query,result.foods):C8?.commitLocalSnapshot?.(psFederatedSearchState,revision,result.query,result.foods,{intent:result.intent,total:result.total});if(!accepted)return null;return {...result,foods:append?[...(result.foods||[])]:[...(psFederatedSearchState.local||result.foods)]};}
function psLargeRows(result,foods=result.foods){return foods.map(food=>resourceFoodRow(food).replace(`data-food-details="${esc(food.id)}"`,`data-gpr-catalogue-product="${esc(food.id)}"`)).join('');}
function psLargeRender(result,{append=false}={}){if(ps34GuidedSession)return;const target=by('food-results');if(!target)return;const kind=result.intent?.kind,primary=result.foods.filter(food=>food.searchGroup==='primary'),broader=result.foods.filter(food=>food.searchGroup!=='primary'),heading=kind==='consumer-brand'?`Brand · ${result.brand?.name||result.query}`:kind==='generic-category'?`Generic Food · ${result.concept?.name||result.query}`:kind==='exact-product'?'Best Exact Product Match':'Best Australian Product Matches',facetCopy=result.facets?.length?` · ${result.facets.slice(0,4).map(facet=>`${facet.label} (${facet.count})`).join(' · ')}`:'',rows=kind==='generic-category'&&primary.length?`<div class="catalogue-result-group"><strong>Primary category matches</strong>${psLargeRows(result,primary)}</div>${broader.length?`<details><summary>More Australian catalogue results</summary>${psLargeRows(result,broader)}</details>`:''}`:psLargeRows(result),section=`<section class="off-catalogue-results" data-off-results><div class="online-source-banner"><strong>${esc(heading)}</strong><p>${result.total.toLocaleString()} Australian catalogue product${result.total===1?'':'s'} · package size identifies the product, not consumption${esc(facetCopy)}.</p></div><div data-off-rows>${rows}</div>${result.hasMore?`<button type="button" class="secondary wide off-load-more" data-off-load-more="${result.offset+result.foods.length}">Load More Products</button>`:''}</section>`;const existing=target.querySelector('[data-off-results]');if(append&&existing){existing.querySelector('[data-off-rows]')?.insertAdjacentHTML('beforeend',rows);existing.querySelector('[data-off-load-more]')?.remove();if(result.hasMore)existing.insertAdjacentHTML('beforeend',`<button type="button" class="secondary wide off-load-more" data-off-load-more="${result.offset+result.foods.length}">Load More Products</button>`);}else{existing?.remove();target.insertAdjacentHTML('beforeend',section);}}
async function psLargeSearch(raw,{offset=0,append=false,forceBranded=false}={}){const api=window.HECOpenFoodFactsAU,query=String(raw||'').trim();if(!api||query.length<2||(!forceBranded&&ps34GuidedSession))return null;const revision=psSearchRevisionFor(query),token=++psLargeSearchToken;try{const preview=await api.search(query,{offset,limit:24});if(token!==psLargeSearchToken||(!forceBranded&&ps34GuidedSession)||!psSearchRevisionCurrent(revision,query)||(by('food-search')?.value.trim()||'')!==query)return null;if(offset===0&&['consumer-brand','brand-product'].includes(preview.intent?.kind)&&preview.total>0&&preview.total<=500){const complete=await api.search(query,{offset:0,limit:preview.total});if(token!==psLargeSearchToken||(!forceBranded&&ps34GuidedSession)||!psSearchRevisionCurrent(revision,query)||(by('food-search')?.value.trim()||'')!==query)return null;const probe=GUIDED_PRODUCTS?.createSession?.(complete.foods,query,{intent:complete.intent}),presentation=GUIDED_PRODUCTS?.presentationForSession?.(probe);if(['direct-products','useful-facet','exact-product'].includes(presentation)){const stable=psCommitLocalResult(complete,revision);if(!stable)return null;psLargeState=stable;ps34StartCatalogueGuide(query,stable.foods,stable.intent);return stable;}const stablePreview=psCommitLocalResult(preview,revision);if(!stablePreview)return null;psLargeState=stablePreview;psLargeRender(stablePreview,{append:false});return stablePreview;}const stable=psCommitLocalResult(preview,revision,{append});if(!stable)return null;psLargeState=stable;psLargeRender(stable,{append});return stable;}catch(error){console.warn('Australian product catalogue search unavailable',error);return null;}}
function psLargeSchedule(raw){const query=String(raw||'').trim();if(query.length<2||ps34GuidedSession){psLargeSearchToken++;return;}setTimeout(()=>{if((by('food-search')?.value.trim()||'')===query&&!ps34GuidedSession)psLargeSearch(query);},40);}
document.addEventListener('click',event=>{const more=event.target.closest('[data-off-load-more]');if(!more||!psLargeState)return;event.preventDefault();psLargeSearch(psLargeState.query,{offset:Number(more.dataset.offLoadMore)||0,append:true});});
document.addEventListener('click',event=>{const choice=event.target.closest('[data-gpr-catalogue-product]');if(!choice)return;const food=window.HECOpenFoodFactsAU?.getLoaded?.(choice.dataset.gprCatalogueProduct);if(!food)return;event.preventDefault();event.stopPropagation();ps34StartCatalogueGuide(by('food-search')?.value.trim()||food.name,[food],{kind:'exact-product',product:{id:food.id,name:food.name}});},true);
const ps33RenderLibraryBase=renderLibrary;renderLibrary=function(){ps33RenderLibraryBase();const raw=by('food-search')?.value.trim()||'',family=ps34RestoredQuery===raw?null:ps33BrandFamily(raw)||ps34GenericFamily(raw);if(ps34GuidedFamily&&ps34GuidedQuery===raw)ps34RenderGuided();else if(family){ps34GuidedFamily=family;ps34EnsureGuided(raw,family);ps34RenderGuided();}else if(psLargeState?.query===raw)psLargeRender(psLargeState);psLargeSchedule(raw);rc6SyncFoodSearchViewport();};

window.HEC_PRODUCT_SEMANTICS_TEST={
  classify:food=>PS33?.classify?.(food),policy:food=>PS33?.servingPolicy?.(food),validate:food=>PS33?.validate?.(food),rankedNames:(query,limit=30)=>ps33RankedFoods(query,limit).map(food=>food.name),brandFamily:query=>{const value=ps33BrandFamily(query);return value?{name:value.entity.name,products:ps33FamilyRows(value,30).map(food=>food.name)}:null;},
  viewport:()=>({height:window.visualViewport?.height||window.innerHeight,width:window.visualViewport?.width||window.innerWidth,focused:document.activeElement===by('food-search'),keyboardOpen:document.body.classList.contains('food-search-keyboard-open'),compact:document.body.classList.contains('food-search-compact'),positioned:rc6FoodKeyboardPositioned}),viewportModel:rc6FocusedSearchModel
};
window.HEC_GUIDED_PRODUCT_TEST={start:(records,query,options)=>GUIDED_PRODUCTS?.createSession?.(records,query,options),summary:session=>GUIDED_PRODUCTS?.summary?.(session),separation:session=>GUIDED_PRODUCTS?.separationAudit?.(session),selectChoice:ps34SelectGuidedProductChoice,ui:()=>({query:ps34GuidedQuery,stage:ps34GuidedSession?.stage||'',state:ps34GuidedSession?.resolutionState||'',product:ps34GuidedSession?.exactProduct?.name||'',destination:clone(ps34GuidedSession?.destination||null)})};
window.HEC_LARGE_CATALOGUE_TEST={search:(query,options)=>window.HECOpenFoodFactsAU?.search?.(query,options),voiceSearch:(query,options)=>window.HECOpenFoodFactsAU?.search?.(query,options),barcode:value=>window.HECOpenFoodFactsAU?.lookupBarcode?.(value),progression:(previous,next)=>window.HECOpenFoodFactsAU?.queryProgression?.(previous,next),state:()=>window.HECOpenFoodFactsAU?.cacheState?.(),federatedState:()=>({revision:psFederatedSearchState.revision,query:psFederatedSearchState.query,local:[...(psFederatedSearchState.local||[])],online:[...(psFederatedSearchState.online||[])]})};

window.HEC_RC6_FOOD_TEST={friesIntent:q=>C8?.friesIntent?.(q),recentDestination:(active,history,filter)=>{const previous=ext.ui.pendingMeal;ext.ui.pendingMeal=active;const value=alpha0618RecentTargetMeal({meal:history});ext.ui.pendingMeal=previous;return value;},quickEligibility:(food,context)=>rc6QuickAddEligibility(food,context),sourceOnly:rc4SourceOnly};
window.HEC_RC6_VOICE_TEST={actionRequest:q=>alpha0633VoiceRequest(q),actionReady:rc6VoiceActionReady,conversation:()=>({gestureSession:alpha0633GestureSession,state:alpha0633Conversation.state,responseTimeoutMs:7000}),showAnswerFallback:alpha0633ShowAnswerFallback};
window.HEC_RC6_FOUNDER_POLISH_TEST={formatQuantity:value=>C8?.displayQuantity?.(value),resolve:q=>{const value=C8?.resolve?.(allFoods(),q);return{status:value?.status||'none',name:value?.food?.name||'',reason:value?.reason||'',choices:(value?.candidates||[]).map(food=>food.name)};},friesCandidates:q=>{const concept=s23Concept(q);return concept?s23ConceptCandidates(q,concept).map(food=>food.name):[];},exactDecision:q=>{const value=rc5ExactDecision(q);return{kind:value.kind,name:value.primary?.name||'',choices:value.choices.map(food=>food.name)};},deleteEntry:deleteDiaryEntryWithUndo};

window.HEC_RC3_FOOD_SEARCH_TEST={
  build:ACTIVE_VERSION,intent:q=>S23?.queryIntent?.(q),voiceText:(q,names=[])=>S23?.stripVoiceWake?.(q,names),voiceRequest:q=>alpha0633VoiceRequest(q),
  productIntent:q=>s23LikelyProduct(q,s23Concept(q)),productNames:q=>s23ProductMatches(q,12).map(f=>f.name),drinkChoice:(food,drink)=>rc3DrinkCompatible(food,drink),quantity:(food,amount,unit)=>rc3QuantityCheck(food,amount,unit),sourceLabel:rc3SourceLabel
};
ext.ui.foodSearchCorrections='rc3-intent-state-serving-diary';saveExt();

})();
