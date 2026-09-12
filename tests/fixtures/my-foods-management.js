'use strict';
const {legacyFood}=require('../legacy-saved-food-runtime');
const {earlierAlphaUser}=require('./alpha-0.6.32-migration-fixtures');
function fixture(){
  const first=legacyFood({id:'legacy-first',name:'Synthetic Orchard Seed Spread'});
  const second=legacyFood({id:'legacy-second',name:first.name,defaultUnit:'g',defaultAmount:100,units:{g:.01},unitLabels:{g:'g'},serving:'100 g',nutrients:{calories:0,protein:null,sodium:null}});
  const current=legacyFood({id:'custom-current',name:'Synthetic Current Food',recordType:'private',verificationStatus:'user-confirmed',source:'Manual Entry',defaultUnit:'g',defaultAmount:100,units:{g:.01},unitLabels:{g:'g'},serving:'100 g'});
  const protectedOnly=legacyFood({id:'protected-only',name:'Synthetic Protected Food'});
  const bookmark=legacyFood({id:'online-bookmark',name:'Synthetic Bookmarked Food',source:'Online packaged food'});
  // This id-less record is copied from the existing supported old-format fixture.
  const unkeyed=earlierAlphaUser().ext.customFoods[0];
  const ext={version:'0.6.16',customFoods:[first,second,current,unkeyed],onlineFoods:[bookmark],savedFoodIds:[first.id,second.id,bookmark.id],recipes:[{id:'recipe-sentinel',name:'Unrelated saved recipe',ingredients:[{foodId:first.id,amount:.5,unit:'kg'}]}],diary:{'2026-09-10':[{id:'diary-sentinel',foodId:first.id,name:first.name,date:'2026-09-10',meal:'Breakfast',status:'eaten',amount:.5,unit:'kg',nutrients:{calories:615},foodSnapshot:first}]},mealTemplates:[],ui:{diaryDate:'2026-09-10'}};
  const protectedLibrary={customFoods:[first,second,protectedOnly],onlineFoods:[bookmark],savedFoodIds:[first.id,second.id,protectedOnly.id,bookmark.id],recipes:ext.recipes,mealTemplates:[]};
  return {ext,protectedLibrary};
}
module.exports={fixture};
