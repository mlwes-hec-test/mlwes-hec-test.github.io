/* Healthy Eating Companion — KFC Australia reviewed public-source checkpoint.
   Identity comes from the live Australian menu reviewed on 2 September 2026.
   Energy values are only attached where an official fixed item corresponds
   exactly; the September 2023 nutrition page is never used to infer macros.
*/
(function(global){
  'use strict';

  const checkedDate='2026-09-02';
  const checkedAt='2026-09-02T15:30:00+10:00';
  const menuUrl='https://www.kfc.com.au/menu';
  const nutritionUrl='https://www.kfc.com.au/nutrition-allergen';
  const categories=Object.freeze([
    ['Featured Offers','Liquid Gold Zinger® Box|Christmas in July Feast|Giant Liquid Gold Sauce|Footy Feed'],
    ['Burgers','Original Crispy Burger|Original Crispy Burger Combo|Original Crispy Bacon & Cheese Burger|Original Crispy Bacon & Cheese Burger Combo|Original Crispy BBQ Bacon Stacker® Burger|Original Crispy BBQ Bacon Stacker® Burger Combo|Double Tender™ Burger|Double Tender™ Burger Combo|Zinger® Burger|Zinger® Burger Combo|Zinger® Bacon & Cheese Burger|Zinger® Bacon & Cheese Burger Combo|Zinger Stacker® Burger|Zinger Stacker® Burger Combo|Zinger® Crunch Burger™|Zinger® Crunch Burger™ Combo'],
    ['Boxed Meals','Liquid Gold Zinger® Box|Zinger® Burger Box|Mega Chicken Box|Original Crispy Burger Box|Original Crispy Bacon & Cheese Burger Box|Original Crispy BBQ Bacon Stacker® Burger Box|3 Piece Box|Original Tenders™ Box|Zinger® Bacon & Cheese Burger Box|Zinger Stacker® Burger Box|Zinger® Crunch Burger™ Box|Original Crunch Twister® Box|Zinger® Crunch Twister® Box'],
    ['Chicken','3 Pieces Wicked Boneless|3 Pieces Wicked Boneless Combo|6 Pieces Wicked Boneless|6 Pieces Wicked Boneless Combo|1 Piece of Chicken|3 Pieces of Chicken|3 Piece Combo|6 Pieces of Chicken|21 Pieces of Chicken|Original Crispy Fillet Piece|Zinger® Fillet Piece|Snack Popcorn Chicken®|Snack Popcorn Chicken® Combo|Regular Popcorn Chicken®|Regular Popcorn Chicken® Combo|Maxi Popcorn Chicken®|Maxi Popcorn Chicken® Combo|3 Wicked Wings®|3 Wicked Wings® Combo|6 Wicked Wings®|6 Wicked Wings® Combo|10 Wicked Wings®|10 Wicked Wings® Combo|3 Original Tenders™|3 Original Tenders™ Combo|5 Original Tenders™|5 Original Tenders™ Combo|6 Nuggets|6 Nugget Combo|10 Nuggets|10 Nugget Combo'],
    ['Snack Hacks','Giant Liquid Gold Sauce|Regular Chips|Original Pepper Mayo Slider|Original BBQ Slider|Original Supercharged Slider|Snack Popcorn Chicken®|3 Nuggets|1 Piece of Chicken|Double Chocolate Mousse|Pepsi Freeze|Mountain Dew Freeze|Raspberry Freeze|Regular Pepsi Max|Regular Pepsi|Regular 7Up|Regular Mountain Dew|Regular Solo|Regular Sunkist No Sugar|Bottled Water|Sparkling Water'],
    ['Protein Picks','Zinger® Protein Pack|Zinger® Protein Bowl|Zinger® Protein Bowl Combo|Chris’ Big Bro Combo'],
    ['Shared Meals','Christmas in July Feast|Footy Feed|Family Feast|Value Feast|Burger Feast|Giant Feast|Mega Burger Feast|Delivery Feast'],
    ['Twisters & Bowls','Zinger® Crunch Twister®|Zinger® Crunch Twister® Combo|Original Crunch Twister®|Original Crunch Twister® Combo|Zinger® Crunch Bowl|Zinger® Crunch Bowl Combo|Original Tenders™ Crunch Bowl|Original Tenders™ Crunch Bowl Combo|Zinger® Protein Bowl|Zinger® Protein Bowl Combo'],
    ['Go Buckets & Kids Meals','Go Bucket® Wicked Boneless|Go Bucket® Popcorn Chicken®|Go Bucket® 1 Original Tender|Go Bucket® 2 Wicked Wings®|Go Bucket® 3 Nuggets|Kids Meal with BBQ Slider|Kids Meal with Nuggets|Kids Meal with Snack Popcorn Chicken®'],
    ['Everyday Value','$24.95 Burger Dinner|$24.95 Boneless Dinner'],
    ['Sides & Desserts','Giant Liquid Gold Sauce|Large Chips|Regular Chips|Large Chips|Regular Chips|Double Chocolate Mousse|Crunchy Jalapeno Slaw|Large Potato & Gravy|Regular Potato & Gravy|Large Coleslaw|Regular Coleslaw|Regular Gravy|Dinner Roll|4 Dipping Sauces|Dipping Sauces'],
    ['Cold Drinks','Raspberry Freeze|Pepsi Freeze|Mountain Dew Freeze|Pepsi Max|Pepsi|7Up|Mountain Dew|Solo|Sunkist No Sugar|Bottled Water|Sparkling Water|Apple Juice|Lipton Peach Ice Tea']
  ].map(([name,items])=>Object.freeze({name,items:Object.freeze(items.split('|'))})));

  /* Official kJ per named fixed serving. The live menu supplies current
     identity; unless noted by a product/component page, the matching value is
     corroboration from the official nutrition page labelled September 2023. */
  const energyKj=Object.freeze({
    'Original Crispy Burger':1874,'Original Crispy Bacon & Cheese Burger':2384,'Original Crispy BBQ Bacon Stacker Burger':3526,'Double Tender Burger':1882,
    'Zinger Burger':1874,'Zinger Bacon & Cheese Burger':2298,'Zinger Stacker Burger':3082,'Zinger Crunch Burger':2378,
    '3 Pieces Wicked Boneless':1434,'6 Pieces Wicked Boneless':2868,'1 Piece of Chicken':984,'3 Pieces of Chicken':3093,'6 Pieces of Chicken':5901,'21 Pieces of Chicken':20654,
    'Original Crispy Fillet Piece':936,'Zinger Fillet Piece':936,'Snack Popcorn Chicken':1009,'Regular Popcorn Chicken':1644,'Maxi Popcorn Chicken':3014,
    '3 Wicked Wings':1629,'6 Wicked Wings':3259,'10 Wicked Wings':5431,'3 Original Tenders':1803,'5 Original Tenders':3194,'3 Nuggets':525,'6 Nuggets':1324,'10 Nuggets':2298,
    'Original Pepper Mayo Slider':1125,'Original BBQ Slider':1012,'Original Supercharged Slider':1082,'Double Chocolate Mousse':1490,
    'Zinger Protein Bowl':2309,'Zinger Crunch Twister':2435,'Original Crunch Twister':2164,'Zinger Crunch Bowl':1738,'Original Tenders Crunch Bowl':1687,
    'Large Chips':2371,'Regular Chips':1186,'Crunchy Jalapeno Slaw':802,'Large Potato & Gravy':1094,'Regular Potato & Gravy':267,'Large Coleslaw':1588,'Regular Coleslaw':388,'Regular Gravy':241,'Dinner Roll':449,
    'Pepsi Freeze':734,'Mountain Dew Freeze':782,'Raspberry Freeze':760,'Regular Pepsi Max':6,'Regular Pepsi':434,'Regular 7Up':695,'Regular Mountain Dew':439,'Regular Solo':780,'Regular Sunkist No Sugar':8,'Bottled Water':0,'Sparkling Water':0,'Apple Juice':589,'Lipton Peach Ice Tea':395
  });

  const currentProductPages=Object.freeze({
    'Zinger Burger':'https://www.kfc.com.au/menu/burgers/zinger-burger',
    'Zinger Burger Combo':'https://www.kfc.com.au/menu/burgers/zinger-burger-combo',
    'Regular Popcorn Chicken':'https://www.kfc.com.au/menu/chicken/regular-popcorn-chicken',
    'Regular Popcorn Chicken Combo':'https://www.kfc.com.au/menu/chicken/regular-popcorn-chicken-combo',
    '3 Wicked Wings Combo':'https://www.kfc.com.au/menu/chicken/3-wicked-wings-combo',
    'Regular Chips':'https://www.kfc.com.au/menu/sides-desserts/regular-chips',
    '3 Piece Box':'https://www.kfc.com.au/menu/boxed-meals/3-piece-box'
  });
  const COMBO_COMPONENT_URL=currentProductPages['Zinger Burger Combo'],BOX_COMPONENT_URL=currentProductPages['3 Piece Box'],FEAST_COMPONENT_URL='https://www.kfc.com.au/menu/shared-meals/value-feast';
  const currentComponentEnergy=Object.freeze({
    'Zinger Burger':{energyKj:1874,url:COMBO_COMPONENT_URL},'3 Pieces of Chicken':{energyKj:3093,url:BOX_COMPONENT_URL},
    'Regular Chips':{energyKj:1186,url:COMBO_COMPONENT_URL},'Large Chips':{energyKj:2371,url:COMBO_COMPONENT_URL},'Regular Potato & Gravy':{energyKj:267,url:BOX_COMPONENT_URL},'Large Potato & Gravy':{energyKj:1094,url:FEAST_COMPONENT_URL},'Regular Coleslaw':{energyKj:388,url:BOX_COMPONENT_URL},'Large Coleslaw':{energyKj:1588,url:FEAST_COMPONENT_URL},'Regular Gravy':{energyKj:241,url:BOX_COMPONENT_URL},'Dinner Roll':{energyKj:449,url:BOX_COMPONENT_URL},
    'Regular Pepsi Max':{energyKj:6,url:COMBO_COMPONENT_URL},'Regular Pepsi':{energyKj:434,url:COMBO_COMPONENT_URL},'Regular 7Up':{energyKj:695,url:COMBO_COMPONENT_URL},'Regular Mountain Dew':{energyKj:439,url:COMBO_COMPONENT_URL},'Regular Solo':{energyKj:780,url:COMBO_COMPONENT_URL},'Regular Sunkist No Sugar':{energyKj:8,url:COMBO_COMPONENT_URL},'Sparkling Water':{energyKj:0,url:COMBO_COMPONENT_URL},'Apple Juice':{energyKj:589,url:COMBO_COMPONENT_URL},'Lipton Peach Ice Tea':{energyKj:395,url:COMBO_COMPONENT_URL},'Pepsi Freeze':{energyKj:734,url:COMBO_COMPONENT_URL},'Mountain Dew Freeze':{energyKj:782,url:COMBO_COMPONENT_URL},'Raspberry Freeze':{energyKj:760,url:COMBO_COMPONENT_URL}
  });
  const sourceConflicts=Object.freeze({
    'Regular Gravy':Object.freeze({resolvedEnergyKj:241,olderEnergyKj:215,resolution:'Use the current official product-page component value; retain the September 2023 guide value as a disclosed conflict.'}),
    '3 Pieces of Chicken':Object.freeze({resolvedEnergyKj:3093,olderEnergyKj:2951,resolution:'Use the current official 3 Piece Box component value for three Original Recipe pieces; retain the differently worded September 2023 guide value as a disclosed conflict.'})
  });
  const productOptions=Object.freeze({
    'Zinger Burger':Object.freeze([
      {name:'Bacon Slice',energyKj:231,status:'official-current-component'},
      {name:'Cheese Slice',energyKj:164,status:'official-current-component'},
      {name:'Tomato Slices',energyKj:22,status:'official-current-component'},
      {name:'Corn Chips',energyKj:null,status:'energy-unknown'},
      {name:'Wicked Sauce',energyKj:null,status:'energy-unknown'},
      {name:'Crunchy Slaw',energyKj:null,status:'energy-unknown'}
    ])
  });
  const configurablePatterns=Object.freeze([/\bcombo\b/i,/\bbox\b/i,/\bfeast\b/i,/\bdinner\b/i,/\bmeal\b/i,/\bgo bucket\b/i,/\bprotein pack\b/i,/chris.+big bro/i]);
  const data={
    checkedDate,checkedAt,menuUrl,nutritionUrl,categories,energyKj,currentProductPages,currentComponentEnergy,sourceConflicts,productOptions,configurablePatterns,
    nutritionPublishedLabel:'Information correct as at September 2023',
    sourceCaptures:Object.freeze([
      {url:menuUrl,role:'current-menu-identity-and-category-membership',retrievedAt:checkedAt,contentHash:null,hashStatus:'raw HTML unavailable from the reviewed browsing surface'},
      {url:nutritionUrl,role:'older-exact-name-energy-corroboration-only',retrievedAt:checkedAt,contentHash:null,hashStatus:'raw HTML unavailable from the reviewed browsing surface'}
    ]),
    normalisedSnapshotSha256:'e5304c7ae295577e809099a1e52b7a6fd4c8d147d5a86c846bc0068d88d359c2'
  };
  global.HECKFCAustraliaRawCatalogueData=data;if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
