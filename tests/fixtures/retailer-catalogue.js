'use strict';
// Entirely synthetic architecture evidence, never loaded by the application.
function evidence(id){return {trustClass:'official-au-retailer',sourceId:'synthetic-au-retailer',recordId:id,url:'https://retailer.example/au/'+id,retrievedAt:'2026-09-12T00:00:00Z',sha256:'synthetic-fixture-only'};}
function membership(retailerId,id,{scope='food',categoryId='bread'}={}){return {retailerId,market:'AU',scope,verified:true,categoryIds:[categoryId],listingState:'listed-at-retrieval',evidence:evidence(id)};}
function food(id,extra={}){return {id,canonicalId:id,recordType:'packaged',source:'Synthetic retailer fixture',market:'AU',country:'Australia',name:'Fixture White Bread',brand:'Fixture Baker',category:'Bread',physicalForm:'sliced',pack:{amount:500,unit:'g'},defaultUnit:'g',defaultAmount:100,units:{g:.01,serve:.4},unitLabels:{g:'g',serve:'40 g serve'},manufacturerServing:{amount:40,unit:'g'},serving:'40 g serving; 500 g pack',nutrients:{calories:200,energyKj:836,protein:7,carbs:40,fat:2,satFat:null,sugar:3,sodium:300,fibre:null},nutritionPer100:{calories:200,energyKj:836,protein:7,carbs:40,fat:2,satFat:null,sugar:3,sodium:300,fibre:null},sourceProvenance:evidence(id),...extra};}
function fixture({retailerId='woolworths',name='Woolworths',extraProducts=23}={}){
  const retailer={id:retailerId,name,market:'AU',aliases:[]},categories=[{id:'bread',label:'Bread & Bakery',scope:'food'},{id:'cereal',label:'Breakfast Cereals',scope:'food'},{id:'household',label:'Household',scope:'non-food'}];
  const add=(id,extra={})=>food(id,{retailerMemberships:[membership(retailerId,id)],...extra});
  const house=add('synthetic-house',{brand:name,commercialIdentities:[{entityId:retailerId,relationship:'own-label',consumerBrand:name,market:'AU',verified:true,evidence:evidence('house-brand-proof')}],conceptIds:['bread']});
  const national=add('synthetic-national',{name:'Fixture Corn Flakes',brand:"Kellogg's",category:'Breakfast cereal',physicalForm:'solid',retailerMemberships:[membership(retailerId,'synthetic-national',{categoryId:'cereal'})],conceptIds:['cereal']});
  const nationalBread=add('synthetic-national-bread',{name:'Fixture Wholemeal Bread',brand:'Tip Top',conceptIds:['bread']});
  const privateLabel=add('synthetic-private-label',{name:'Fixture Seeded Bread',brand:'Fixture Pantry',commercialIdentities:[{entityId:retailerId,relationship:'private-label',consumerBrand:'Fixture Pantry',market:'AU',verified:true,evidence:evidence('private-label-proof')}],conceptIds:['bread']});
  const missing=food('synthetic-no-membership',{brand:name,name:name+' Fixture Unverified Bread'}),nonfood=add('synthetic-nonfood',{name:'Fixture Cleaning Powder',category:'Household',retailerMemberships:[membership(retailerId,'synthetic-nonfood',{scope:'non-food',categoryId:'household'})]});
  const invalid=add('synthetic-community-only',{retailerMemberships:[{...membership(retailerId,'synthetic-community-only'),evidence:{...evidence('synthetic-community-only'),trustClass:'open-food-facts-au'}}]});
  const records=[house,national,nationalBread,privateLabel,...Array.from({length:extraProducts},(_,i)=>add('synthetic-extra-'+i,{name:'Fixture Bread Variant '+String(i+1).padStart(2,'0')})),missing,nonfood,invalid];
  const entries=records.map(r=>({id:r.id,canonicalId:r.canonicalId,barcode:r.barcode,recordType:r.recordType,market:r.market,brand:r.brand,conceptIds:r.conceptIds||[],retailerMemberships:r.retailerMemberships||[],commercialIdentities:r.commercialIdentities||[]}));
  return {retailer,categories,records,entries,house,national,nationalBread,privateLabel,missing,nonfood,invalid};
}
module.exports={evidence,membership,food,fixture};
