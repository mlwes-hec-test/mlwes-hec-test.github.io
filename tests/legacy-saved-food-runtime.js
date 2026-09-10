'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
// Execute production loaders, model and calculation functions, including the
// late unitOptions override, against JSON storage owned only by this harness.
function runtime(values,root=ROOT){
  const source=fs.readFileSync(path.join(root,'alpha06.js'),'utf8'),serving=require(path.join(root,'serving-foundation.js'));
  const block=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,`${start} boundary missing`);return source.slice(a,b);};
  const records=new Map(Object.entries(values)),storage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,String(value))};
  const context={localStorage:storage,EXT_KEY:'healthyEatingCompanionAlpha06Functional',LEGACY_EXT_KEYS:['healthyEatingAlpha05Functional'],EXT_DEFAULTS:{customFoods:[],recipes:[],ui:{}},clone:x=>JSON.parse(JSON.stringify(x)),window:{HECServingFoundation:serving},FOODS:[],AFCD_FOODS:[],n:x=>Number(x)||0,NUTRIENT_KEYS:['calories','protein','sodium'],S24:serving,s23Naturalise:()=>{}};
  vm.createContext(context);vm.runInContext(block('function merge(target, source)','const ext = loadExt();')+'const ext=loadExt();'+block('function nonRecipeFoods()','function allFoods()')+block('function unitOptions(food)','function cleanMeasureText')+block('function foodMultiplier(food','function scaledFoodGroups')+block('function s24ContextForFood','// Open Food Facts serving-basis repair')+'globalThis.api={ext,nonRecipeFoods,scaledNutrients,unitOptions,defaultUnit,defaultAmount};',context);
  return {...context.api,storage};
}
const stamp='2026-09-10T01:00:00.000Z';
function legacyFood(extra={}){return {id:'synthetic-legacy-mass',name:'Synthetic saved cereal',brand:'Synthetic fixture',category:'Other',source:'User Created',defaultAmount:1,defaultUnit:'serve',serving:'1 serve (100 g)',units:{serve:1,g:.01,kg:10},unitLabels:{serve:'My custom serve',g:'g',kg:'kg'},nutrients:{calories:123,protein:7,sodium:45,fibre:3},ingredients:'Synthetic only',customNotes:'Keep my label',createdAt:stamp,updatedAt:stamp,...extra};}
function stored(food=legacyFood()){return {healthyEatingCompanionAlpha06Functional:JSON.stringify({customFoods:[food],savedFoodIds:[food.id],recipes:[{id:'recipe-sentinel',name:'Unrelated recipe',ingredients:[{foodId:food.id,amount:.5,unit:'kg'}]}],diary:{'2026-09-10':[{id:'snapshot-sentinel',amount:.5,unit:'kg',nutrients:{calories:615},foodSnapshot:food}]}})};}
module.exports={runtime,legacyFood,stored,ROOT};
