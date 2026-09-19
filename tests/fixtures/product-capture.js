'use strict';
// All numbers and identities below are synthetic; they are NOT Wicked Sister data.
const solidText='NUTRITION INFORMATION\nServings per package 6\nServing size 125 g\nAverage quantity per serving    Average quantity per 100 g\nEnergy 625 kJ 500 kJ\nProtein 5 g 4 g\nFat, total 5 g 4 g\n- Saturated fat 3 g 2.4 g\nCarbohydrate 20 g 16 g\n- Sugars 15 g 12 g\nDietary fibre 1.25 g 1 g\nSodium 75 mg 60 mg\nCalcium 150 mg 120 mg\nIngredients: Milk, synthetic vanilla flavour, starch.';
const liquidText='NUTRITION INFORMATION\nServings per package 4\nServing size 250 mL\nAverage quantity per 100 mL    Average quantity per serving\nEnergy 200 kJ 500 kJ\nProtein 3 g 7.5 g\nFat 1 g 2.5 g\nSaturated fat 0.5 g 1.25 g\nCarbohydrate 6 g 15 g\nSugars 4 g 10 g\nSodium 35 mg 87.5 mg\nCalcium 100 mg 250 mg';
const identity={id:'synthetic-barcode-custard',barcode:'9900000000001',name:'Synthetic Vanilla Custard',brand:'Synthetic Fixture Brand',packageSize:'750 g',recordType:'online-candidate',verificationStatus:'recognised-only',recognisedOnly:true,nutritionStatus:'unavailable',loggable:false,nutrients:{calories:null},units:{},ingredients:'',foodGroups:{},waterMl:null};
function broken(){return {...identity,id:'synthetic-old-private',recordType:'private',nutritionPer100:{energyKj:500,calories:500/4.184,protein:4,carbs:16,fat:4,sugar:12,sodium:60,calcium:120},nutritionPer100Unit:'g',manufacturerServing:{amount:125,unit:'g'}};}
module.exports={solidText,liquidText,identity,broken};

