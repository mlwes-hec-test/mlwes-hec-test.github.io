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
module.exports={classify,reviewedFamily};
