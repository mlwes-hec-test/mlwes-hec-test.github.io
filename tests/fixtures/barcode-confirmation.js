'use strict';
// Disposable, invented identity and numbers; never a real founder product.
const code='9900000000103'; // EAN-13 checksum valid.
const nutrients={energyKj:670,calories:670/4.184,protein:3.3,fat:5.3,satFat:.8,carbs:23,sugar:12.5,fibre:1.2,sodium:158};
const food={id:'off-'+code,barcode:code,name:'Synthetic Vanilla Dessert',brand:'Fixture Kitchen',country:'International',recordType:'online-candidate',source:'Open Food Facts',packageSize:'170 g',units:{serve:1,g:1/170},defaultUnit:'serve',defaultAmount:1,nutrients,serving:'1 portion (170 g)',foodGroups:{},waterMl:null};
const product={code,product_name:food.name,brands:food.brand,quantity:'170 g',serving_size:'1 portion (170 g)',serving_quantity:170,serving_quantity_unit:'g',nutriments:Object.fromEntries(Object.entries({'energy-kj':670,proteins:3.3,fat:5.3,'saturated-fat':.8,carbohydrates:23,sugars:12.5,fiber:1.2,sodium:.158}).flatMap(([key,value])=>[[key+'_serving',value],[key+'_100g',value/1.7]]))};
const badText='Serving size 170 g\nAverage quantity per serving\nEnergy 670 kJ\nFat 33 g';
const decimalText='Servings per package 1\nServing size 170 g\nAverage Quantity per Serving    Average Quantity per 100 g\nEnergy (kJ) 670 394.12\nProtein (g) 3.3 1.94\nFat (g) 5.3 3.12\nSaturated fat (g) 0.8 0.47\nCarbohydrate (g) 23 13.53\nSugars (g) 12.5 7.35\nFibre (g) 1.2 0.71\nSodium (mg) 158 92.94';
module.exports={code,nutrients,food,product,badText,decimalText};
