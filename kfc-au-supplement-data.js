/* Reviewed supplemental KFC Australia facts, 11 September 2026.
   The protected September 2 payload is unchanged. Numerical table facts only;
   no promotional copy, inferred macros or configurable meal totals. */
(function(global){
  'use strict';
  const guide='https://www.kfc.com.au/nutrition-allergen',individual='https://www.kfc.com.au/nutrition-allergen-item';
  const box='https://www.kfc.com.au/menu/boxed-meals/original-crispy-burger-box';
  const dips='https://www.kfc.com.au/menu/chicken/3-original-tenders';
  const checkedDate='2026-09-11',checkedAt='2026-09-11T19:21:53+10:00';
  // Columns: average serving g; then kJ, protein g, fat g, saturated fat g,
  // carbohydrate g, sugars g, sodium mg. Per-100 rows omit serving weight.
  const nutritionRows=[
    ['Original Crispy Burger',[183,1874,24.7,22.3,2.1,35.9,4.3,776],[1024,13.5,12.2,1.1,19.6,2.3,424]],
    ['Pickle Burger',[200,2288,25.3,29.6,2.9,43.2,10.2,1232],[1146,12.7,14.8,1.5,21.6,5.1,617]],
    ['Pickle Zinger Burger',[202,2288,26.8,29.8,3.1,41.8,10.3,1401],[1134,13.3,14.8,1.6,20.7,5.1,694]],
    ['Pickle Loaded Chips',[354,4211,23,54.6,5.2,106.2,7.4,1132],[1189,6.5,15.4,1.5,30,2.1,320]],
    ['Frickles',[90,864,2.5,14.4,1.1,17,1.8,920],[956,2.8,15.9,1.2,18.8,2,1018]],
    ['Pickle Sauce',[130,3174,0.4,79.7,6.3,12.2,8.5,793],[2441,0.3,61.3,4.8,9.4,6.5,610]],
    ['Pickle Pepsi Max',[436,20,0.3,0,0,0.8,0.5,741],[5,0.1,0,0,0.2,0.1,170]],
    ['Pickle Pepsi',[452,448,0.1,0,0,27.9,27.9,731],[99,0,0,0,6.2,6.2,162]],
    ['Zinger Burger',[185,1874,26.2,22.5,2.3,34.4,4.4,944],[1013,14.2,12.2,1.2,18.6,2.4,510]],
    ['1 Piece of Chicken',[87,984,20.4,13.9,2.6,7.2,0.2,407],[1137,23.6,16.1,3,8.3,0.2,470]],
    ['3 Wicked Wings',[124,1629,22.6,27.3,4.8,13.9,1.2,698],[1315,18.2,22,3.9,11.2,1,563]],
    ['6 Wicked Wings',[248,3259,45.1,54.5,9.7,27.8,2.5,1395],[1315,18.2,22,3.9,11.2,1,563]],
    ['10 Wicked Wings',[413,5431,75.2,90.9,16.1,46.3,4.1,2325],[1315,18.2,22,3.9,11.2,1,563]],
    ['Regular Chips',[120,1186,4.4,11.5,1.1,40.6,0.5,113],[988,3.7,9.6,0.9,33.8,0.4,94]],
    ['Large Chips',[240,2371,8.9,23,2.2,81.1,1,226],[988,3.7,9.6,0.9,33.8,0.4,94]],
    ['Regular Popcorn Chicken',[114,1644,19.3,24.4,2.4,24.2,0.7,939],[1442,16.9,21.4,2.1,21.2,0.6,824]],
    ['Snack Popcorn Chicken',[70,1009,11.8,15,1.5,14.8,0.4,577],[1442,16.9,21.4,2.1,21.2,0.6,824]],
    ['Maxi Popcorn Chicken',[209,3014,35.3,44.7,4.4,44.3,1.3,1722],[1442,16.9,21.4,2.1,21.2,0.6,824]],
    ['3 Nuggets',[48,525,8,7.7,1.2,6,0.1,296],[1093,16.7,16,2.4,12.5,0.3,616]]
  ];
  const newMenuRows=[
    ['Pickle Burger',['Featured Offers','Burgers'],'burger'],['Pickle Zinger Burger',['Featured Offers','Burgers'],'burger'],
    ['Pickle Loaded Chips',['Featured Offers','Sides & Desserts'],'serve'],['Frickles',['Featured Offers','Sides & Desserts'],'serve'],
    ['Pickle Sauce',['Featured Offers','Sides & Desserts'],'serve'],['Pickle Pepsi Max',['Featured Offers','Cold Drinks'],'drink'],['Pickle Pepsi',['Featured Offers','Cold Drinks'],'drink']
  ];
  const newComponents=[
    ...[['Large Pepsi Max',10,'pepsi-max'],['Large Pepsi',684,'pepsi'],['Large 7Up',1077,'7up'],['Large Mountain Dew',691,'mountain-dew'],['Large Solo',1198,'solo'],['Large Sunkist No Sugar',12,'sunkist-no-sugar']].map(([name,energyKj,family])=>({name,energyKj,category:'Cold Drinks',unit:'drink',size:'Large',family,url:box})),
    ...[['Aioli Dip',567],['BBQ Dip',205],['Supercharged Dip',440],['Sweet & Sour Dip',274],['Tomato Dip',148]].map(([name,energyKj])=>({name,energyKj,category:'Sides & Desserts',unit:'serve',url:dips}))
  ];
  // The individual table is explicitly dated 24/03/2025. Its sodium header
  // says g/serve despite mg-like values. Preserve those raw cells as evidence;
  // do not silently reinterpret their units or invent runtime sodium.
  const individualRows=[
    ['Chicken Wicked Boneless (individual)',48,[478,9.4,5.8,0.7,6.1,0.1],[996,19.6,12,1.5,12.8,0.2],[368,766],'piece'],
    ['Chicken Tender Original Recipe (plain)',38,[412,8.6,5.1,0.5,4.4,0.2],[1081,22.7,13.5,1.4,11.5,0.4],[283,744],'tender'],
    ['Chicken Wicked Wing (individual)',41,[543,7.5,9.1,1.6,4.6,0.4],[1315,18.2,22,3.9,11.2,1],[233,563],'wing'],
    ['Chicken Nugget (plain)',16,[175,2.7,2.6,0.4,2,0],[1093,16.7,16,2.4,12.5,0.3],[99,616],'nugget']
  ];
  const standardOrders={
    '3 Original Tenders':{label:'3 tenders + 1 Aioli Dip',energyKj:1803,url:dips},
    '5 Original Tenders':{label:'5 tenders + 2 Aioli Dips',energyKj:3194,url:'https://www.kfc.com.au/menu/chicken/5-original-tenders'},
    '10 Nuggets':{label:'10 nuggets + 2 Sweet & Sour Dips',energyKj:2298,url:'https://www.kfc.com.au/menu/chicken/10-nuggets'}
  };
  const uncertainPromotions=['Liquid Gold Zinger Box','Christmas in July Feast','Giant Liquid Gold Sauce','$24.95 Burger Dinner','$24.95 Boneless Dinner'];
  const findings={
    menuConflict:'Root menu, category surfaces and search snapshots disagree on Liquid Gold, Pickle and Hot Rod promotions. Listed-at-retrieval does not guarantee store availability; no unconfirmed retirement.',
    absentUnresolved:['Pickle Burger Combo','Pickle Burger Box','Picklecore Meal','Pickle Feast','$15 Pickles Boxfull','$10 Boxfull','$15 Boxfull','$5 Boxfull','1 Hot Rod','3 Hot Rods','6 Hot Rods'],
    historicalUnconfirmed:['Zinger Power Burger','Supercharged Power Slider','Mega Mozza Dipper'],
    blockedOrders:[{name:'6 Nuggets',guideEnergyKj:1324,componentEnergyKj:175,defaultDipEnergyKj:567,url:'https://www.kfc.com.au/menu/chicken/6-nuggets',reason:'Current page selects Aioli Dip, while guide energy corresponds to six plain nuggets plus Sweet & Sour Dip. Configuration is not established by the bare product name.'}]
  };
  const data={checkedDate,checkedAt,guide,individual,individualPublishedDate:'2025-03-24',guidePublishedLabel:'Information correct as at September 2023',menuUrl:'https://www.kfc.com.au/menu/protein-picks',nutritionRows,newMenuRows,newComponents,individualRows,standardOrders,uncertainPromotions,findings};
  global.HECKFCAustraliaSupplement=data;if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
