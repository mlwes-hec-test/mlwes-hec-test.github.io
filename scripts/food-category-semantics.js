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
module.exports={classify};
