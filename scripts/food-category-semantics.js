'use strict';
// Final semantic precedence for accepted products. No admission or nutrition changes.
const C=require('../food-catalogue');
function classify(food){
  const name=C.norm(food.name||food.product_name),tags=String(food.sourceCategoryTags||food.categories_tags||'');
  // A flavour, filling, mix or other product named after a food is not that food.
  if(/\b(?:mix|mixture|recipe base|seasoning|protein bar|praline|chocolates)\b/.test(name))return null;
  if(/\b(?:mix|mixture|flavour|flavored|flavoured|filling|protein bar|praline|chocolates)\b/.test(name)&&! /\b(?:rice cakes?|ice cream|hot cross buns? (?:with|filled))\b/.test(name))return null;
  if(/\bhot cross buns?\b/.test(name)&&! /\b(?:hot chocolate|praline|chocolates|yog[uh]?urt|ice cream)\b/.test(name))return {id:'bread',conceptIds:['bread-roll'],rule:'hot-cross-bun'};
  // Asian chewy rice cakes are not puffed cracker-style rice cakes.
  if(/\brice cakes?\b/.test(name)&&(/puffed-(?:rice|cereal)-cakes/.test(tags)||/\b(?:thin|brown|popped|mini|coated|topped|salted|flavoured|flavored|quinoa|sesame)\b/.test(name))&&! /\b(?:korean|tteok|mochi|sticky|glutinous|stir fry|soup)\b/.test(name)&&! /(?:glutinous|korean|mochi)/.test(tags))return {id:'biscuits',conceptIds:['cracker'],rule:'rice-cake'};
  if(/\bice cream\b/.test(name)&&! /\b(?:cones? only|cone mix|topping|sauce|flavou?r(?:ed)?)\b/.test(name.replace(/\b(?:irish cream|vanilla|chocolate) flavou?red ice cream\b/,'ice cream')))return {id:'desserts',conceptIds:['frozen-dessert'],rule:'ice-cream'};
  if(/\b(?:yoghurt|yogurt|cookies? .*filling)\b/.test(name))return null;
  if(/\bcheesecakes?\b/.test(name))return {id:'desserts',conceptIds:['dessert'],rule:'cheesecake'};
  if(/\b(?:chocolate (?:mud )?cake|mudcake|cupcakes?)\b/.test(name))return {id:'desserts',conceptIds:['dessert'],rule:'sweet-cake'};
  if(/\bpotato (?:jewels?|gems?)\b/.test(name))return {id:'frozen-potato',conceptIds:['potato'],rule:'potato-bites'};
  if(/\b(?:cottage|shepherds?) pie\b/.test(name)||/\bpotato (?:gratin|bake)\b/.test(name))return {id:'meals',conceptIds:[],rule:'prepared-potato-dish'};
  if(/\b(?:salad kit|pasta salad|lentil and pumpkin salad|chicken caesar salad|chicken satay salad)\b/.test(name)&&! /\bsandwich\b/.test(name))return {id:'produce',conceptIds:[],rule:'prepared-salad'};
  if(/\bstuffed (?:baby )?peppers\b/.test(name))return {id:'produce',conceptIds:[],rule:'stuffed-peppers'};
  if(/\bchicken and potatoes with\b.*\bsauce\b/.test(name))return {id:'meals',conceptIds:[],rule:'chicken-potato-meal'};
  if(/\b(?:beef|chicken|steak|meat)\b.*\bpies?\b/.test(name))return {id:'pizza',conceptIds:[],rule:'savoury-pie'};
  if(/^(?:light spreadable |spreadable (?:light )?)?cream ?cheese(?: spreadable)?$/.test(name))return {id:'cheese',conceptIds:['cheese'],rule:'cream-cheese'};
  // Potato cakes, fish cakes and pancakes need preparation/product-form evidence;
  // keep them for review rather than treating every "cake" as dessert.
  return null;
}
// Opt-in evidence review for a bounded source wave. Existing accepted projections
// are not globally rewritten when a new rule is introduced. The enrolling
// manifest supplies the reviewed identities; these rules contain no brand/GTINs.
function reviewedFamily(food){
  const name=C.norm(food.name||food.product_name);
  const result=(id,conceptIds,rule)=>({id,conceptIds,rule});
  if(/\b(?:with|containing|filled)\b/.test(name))return null;
  if(/\b(?:flavou?red|flavour|flavor|filling|filled|seasoning|recipe base|mix|kit)\b/.test(name)&&! /\bslaw kit\b/.test(name))return null;
  if(/^(?:colby|cheddar|tasty) cheese$/.test(name))return result('cheese',['cheese'],'whole-cheese-head');
  if(/^(?:(?:white|wholemeal|rye) )?sourdough rolls?$/.test(name)||/^rustic (?:diamond|round) rolls?$/.test(name))return result('bread',['bread-roll'],'unfilled-bread-roll-head');
  if(/\b(?:macaroni cheese|mac and cheese|cannelloni)\b/.test(name)&&! /\b(?:snack|chips|bites|sauce|powder)\b/.test(name))return result('meals',[],'pasta-meal');
  if(/\bslaw kit\b/.test(name))return result('produce',[],'slaw-kit');
  if(/\bmarinade$/.test(name)||/^(?:mild|medium|hot|chunky|tomato|fresh) salsa$/.test(name))return result('sauces',[],'marinade-or-salsa');
  if(/\b(?:raw|activated|organic) buckwheat$/.test(name))return result('grains',[],'buckwheat-grain');
  if(/^(?:australian |organic )?(?:quick|rolled|traditional) oats$/.test(name))return result('cereal',['cereal'],'plain-breakfast-oats');
  // Bread form must describe the product, never an ingredient or containing dish.
  if(/\b(?:sausage|meat|chicken|beef|pork|fish|banana|cake|pudding|sandwich|burger|hot dog|crumbs?|flour|pizza|sauce|chips|crispbread|garlic)\b/.test(name))return null;
  if(/\b(?:soft (?:white |wholegrain |wholemeal )?(?:large )?wraps|(?:white|wholemeal) flatbreads)\b/.test(name))return result('bread',['bread'],'plain-flatbread-wrap');
  if(/\b(?:sourdough|pane di casa|soft white)\b.*\bloaf\b/.test(name))return result('bread',['bread'],'plain-bread-loaf');
  if(/\b(?:turkish rolls|white soft rolls|english muffins)\b/.test(name))return result('bread',['bread-roll'],'plain-bread-roll');
  return null;
}
// Conservative fallback-only projection. Whole product heads and preparation
// context outrank ingredients. No brand, retailer, GTIN or individual identity.
function fallbackFamily(food){
  const name=C.norm(food.name||food.product_name),tags=C.norm([...(food.categories||[]),...(food.sourceCategories||[]),food.sourceCategoryTags||'',food.preparationContext||''].join(' '));
  const result=(id,conceptIds,rule)=>({id,conceptIds,rule});
  if(/\b(?:recipe base|seasoning mix|stuffing|filling|filled|containing|meal kit|protein bar|cereal bar|chocolate|soup|stock|broth)\b/.test(name))return null;
  // Corn/tortilla chips are snacks even when cheese/chicken describes flavour.
  if(/\b(?:corn|tortilla) chips\b/.test(name)&&! /\b(?:with|salad|meal|nachos|dip|salsa|guacamole|kit)\b/.test(name)&&! /\band\b.*\b(?:corn|tortilla) chips\b/.test(name))return result('snacks',[],'corn-tortilla-chip-head');
  if(/\b(?:salad|slaw) dressing\b/.test(name))return null;
  if(/\b(?:salad|slaw)(?: kit)?$/.test(name)||/^shaker salads? (?:[a-z]+ )*style$/.test(name)){
    if(!/\b(?:sandwich|wrap|roll|flavou?red|flavour|sauce|seasoning|powder)\b/.test(name))return result('produce',[],'prepared-salad-head');
  }
  if(/\b(?:chips|fries|wedges)\b/.test(name)&&! /\b(?:crisps|snack|corn|tortilla|chicken|fish|burger|meal|with|cheese|broccoli|cauliflower|apple|coconut)\b/.test(name)){
    const frozen=/\b(?:frozen|oven|air fryer)\b/.test(name+' '+tags);
    const cutHead=/^(?:(?:frozen|oven|potato|australian|straight|crinkle|thick|thin|steak|shoestring|cut) )*(?:chips|fries)$/.test(name)&&/\b(?:straight cut|shoestring)\b/.test(name)&&/^(?:weight|solid-weight)$/.test(food.physicalForm||'');
    if(frozen||cutHead||/^(?:frozen )?french fries$/.test(name))return result('frozen-potato',['potato'],'potato-cut-and-preparation');
  }
  if(/\b(?:flavou?red|flavour|flavor|snack|chips|fries|wedges|crisps|bites|croquettes|pie|pasta|rice|pizza|sauce|dressing|dip|soup|bar|curry|meal|sandwich|bread|stuffing)\b/.test(name))return null;
  if(/^(?:(?:light|reduced fat|tasty|processed|natural|cheddar|cheese|burger) )*(?:cheese slices|cheddar slices|cheese burger slices|sliced cheese)$/.test(name)||/^(?:cherry|mini|traditional) bocconcini$/.test(name))return result('cheese',['cheese'],'explicit-cheese-form');
  if(/^(?:[a-z]+ )*(?:marmalade|jam|aioli|marinade)$/.test(name)&&! /\b(?:with|in|coated)\b/.test(name))return result(/\b(?:jam|marmalade)$/.test(name)?'spreads':'sauces',[],'preserve-condiment-head');
  if(/^(?:(?:soft|large|mini|white|wholemeal|wholegrain|plain|spinach|herb|and) )*(?:wraps|flatbreads)$/.test(name)&&! /\b(?:with|filled)\b/.test(name))return result('bread',['bread'],'unfilled-flatbread-wrap');
  if(/^(?:(?:soft|round|white|wholemeal|brioche|classic|plain) )+rolls$/.test(name))return result('bread',['bread-roll'],'plain-bread-roll-form');
  // Meat/fish cuts must describe the product, not a flavoured snack or meal.
  if(/\b(?:with|and)\b/.test(name))return null;
  if(/^(?:(?:grass fed|australian|new york|strip|casserole|rump|sirloin|beef|rib eye|bone in|sharing|flat iron) )+steak$/.test(name)||/^(?:bone in )?rib eye$/.test(name)||/^(?:australian )?sirloin backstrap$/.test(name)||/^(?:slow cook )?brisket$/.test(name)||/^corned silverside(?: salt reduced)?$/.test(name))return result('protein',[],'whole-meat-cut');
  if(/^(?:(?:sliced|english style|picnic|boneless|leg|deli|double smoked|smoked|off the bone) )*ham(?: (?:hock|steaks|off the bone|sliced|double smoked))*$/.test(name))return result('protein',[],'ham-product-head');
  if(/^(?:(?:smoked|responsibly sourced) )*(?:rainbow trout|barramundi|salmon) (?:fillets|portions)(?: boneless)?(?: with skin on)?$/.test(name))return result('protein',[],'fish-species-and-cut');
  return null;
}
// Additional whole-product fallback forms. Shared across every retailer and
// independent brands; source identity strings are never runtime exceptions.
function additionalFallbackFamily(food){
  const name=C.norm(food.name||food.product_name),result=(id,conceptIds,rule)=>({id,conceptIds,rule});
  if(/^(?:vegetable|pork|chicken|beef|mini|cocktail|[0-9]+)(?: (?:vegetable|pork|chicken|beef|mini|cocktail))* spring rolls$/.test(name))return result('pizza',[],'spring-roll-product');
  if(/^(?:smoked )?(?:rainbow trout|salmon) fillets in (?:[a-z]+ )*(?:flavoured )?oil$/.test(name))return result('protein',[],'fish-fillets-in-oil');
  if(/^(?:southern blue )?whiting (?:classic crumbs|crumbed|fillets)$/.test(name)||/^(?:tempura|crumbed|battered) (?:barramundi|whiting|hake|hoki|fish)(?: fillets)?$/.test(name))return result('protein',[],'coated-fish-product');
  if(/^(?:potato )?crisps(?: (?:sea salt|original|salted|sweet chilli and sour cream|salt and vinegar))?$/.test(name)||/^(?:salted |mini )?pretzel (?:twists|sticks)$/.test(name))return result('snacks',[],'crisp-or-pretzel-snack');
  if(/^(?:pecorino romano|fetta cheese|feta cheese|(?:colby|cheddar|tasty) cheese block|(?:mexican|pizza) blend cheese|grana padano(?: pdo)? cheese flaked)$/.test(name))return result('cheese',['cheese'],'whole-cheese-style');
  if(/^(?:grilled|marinated) artichokes$/.test(name)||/^(?:pitted |sliced )?(?:kalamata|green|black) olives$/.test(name))return result('produce',[],'antipasto-vegetable');
  if(/^(?:roasted )?(?:beetroot|eggplant|capsicum) dip$/.test(name))return result('sauces',[],'vegetable-dip-product');
  if(/^(?:artisan |artisan style )?(?:white|wholemeal|rye|multigrain) sourdough$/.test(name))return result('bread',['bread'],'plain-sourdough-bread');
  return null;
}
module.exports={classify,reviewedFamily,fallbackFamily,additionalFallbackFamily};
