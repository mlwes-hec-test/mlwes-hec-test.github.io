(function(global){
  "use strict";
  const VERSION="0.6.33",BASE="./data/open-food-facts-au/",PAGE_SIZE=24;
  const cache=new Map(),loadedFoods=new Map();
  const norm=value=>String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  const brandKey=value=>norm(value).replace(/\s/g,"");
  const tokens=value=>norm(value).split(" ").filter(token=>token.length>1&&!new Set(["a","an","and","au","en","for","in","of","or","the","to","with"]).has(token));
  const prefix=value=>(String(value||"").slice(0,2)+"__").slice(0,2);
  async function load(path){if(cache.has(path))return cache.get(path);const promise=fetch(`${BASE}${path}`).then(response=>{if(!response.ok)throw new Error(`OFF catalogue ${response.status}: ${path}`);return response.json();});cache.set(path,promise);try{return await promise;}catch(error){cache.delete(path);throw error;}}
  const manifest=()=>load("manifest.json");
  function servingAmount(value){const match=String(value||"").match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(g|ml)\b/i);return match?{amount:Number(match[1]),unit:match[2].toLowerCase()==="ml"?"mL":"g"}:null;}
  function toFood(record){
    const explicit=servingAmount(record.servingSize),units={g:.01},unitLabels={g:"g"},sourceNutrients=record.nutrients||{};
    if(explicit?.unit==="mL"){delete units.g;delete unitLabels.g;units.mL=.01;unitLabels.mL="mL";}
    if(explicit){units.serve=explicit.amount/100;unitLabels.serve=`manufacturer serving (${record.servingSize})`;}
    const nutrients={calories:sourceNutrients.calories,energyKj:sourceNutrients.energyKj,protein:sourceNutrients.protein,carbs:sourceNutrients.carbs,fat:sourceNutrients.fat,satFat:sourceNutrients.saturatedFat,fibre:sourceNutrients.fibre,sugar:sourceNutrients.sugars,sodium:sourceNutrients.sodium==null?undefined:sourceNutrients.sodium*1000,salt:sourceNutrients.salt};
    for(const key of Object.keys(nutrients))if(nutrients[key]==null)delete nutrients[key];
    const food={...record,id:record.id,sourceId:record.sourceId,barcode:record.barcode,name:record.name||record.genericName||`Barcode ${record.barcode}`,brand:record.brand||"Brand not listed",aliases:[record.name,record.genericName,record.brand].filter(Boolean),category:"Australian Packaged Product",country:"Australia",market:"AU",recordType:"external-catalogue",defaultAmount:100,defaultUnit:explicit?.unit||"g",units,unitLabels,serving:record.servingSize?`Manufacturer serving ${record.servingSize}; nutrition basis 100 ${explicit?.unit||"g"}`:`Nutrition reference 100 g`,nutrients,sourceNutrients,packageSize:record.quantity||"",score:5,verified:false,source:"Open Food Facts · Australian external catalogue",entryBlockedReason:record.nutritionCompleteness==="complete"?"":"We found the exact product, but its nutrition information is incomplete. Read the Nutrition Panel, scan/update the barcode, or enter nutrition manually.",nutritionStatus:record.nutritionCompleteness,provenanceClass:"australian-external-catalogue",sourceReferences:[{source:"Open Food Facts",id:record.sourceId,url:record.sourceUrl||""}]};
    loadedFoods.set(food.id,food);return food;
  }
  async function hydrate(refs){
    const grouped=new Map();for(const ref of refs){const [shard,index]=String(ref).split(":");if(!grouped.has(shard))grouped.set(shard,[]);grouped.get(shard).push([ref,Number(index)]);}
    const result=new Map();await Promise.all([...grouped].map(async([shard,items])=>{const data=await load(`products/${shard}.json`);for(const [ref,index] of items){const record=data.products[index];if(record)result.set(ref,toFood(record));}}));return refs.map(ref=>result.get(ref)).filter(Boolean);
  }
  async function exactBrandRefs(query){const key=brandKey(query);if(!key)return null;const data=await load(`brands/${prefix(key)}.json`).catch(()=>null);const brand=data?.brands?.[key];return brand?{key,name:brand.name,refs:brand.refs}:null;}
  async function postingRefs(query){
    const queryTokens=[...new Set(tokens(query).flatMap(token=>[token,token.replace(/\s/g,"")]))];if(!queryTokens.length)return[];
    const lists=await Promise.all(queryTokens.map(async token=>{const data=await load(`search/${prefix(token)}.json`).catch(()=>null);return data?.tokens?.[token]||[];}));if(lists.some(list=>!list.length))return[];
    const maps=lists.map(list=>new Map(list.map(item=>[item[0],item]))),refs=[...maps[0].keys()].filter(ref=>maps.every(map=>map.has(ref)));
    refs.sort((a,b)=>{const score=ref=>maps.reduce((sum,map)=>sum+(map.get(ref)?.[1]||0)*10+(map.get(ref)?.[2]||0),0);return score(b)-score(a)||a.localeCompare(b);});return refs;
  }
  async function search(query,{offset=0,limit=PAGE_SIZE}={}){
    const brandCandidate=await exactBrandRefs(query),brand=brandCandidate?.refs?.length>=2?brandCandidate:null,refs=brand?.refs||await postingRefs(query),start=Math.max(0,Number(offset)||0),size=Math.min(500,Math.max(1,Number(limit)||PAGE_SIZE)),pageRefs=refs.slice(start,start+size),foods=await hydrate(pageRefs);
    return {query:String(query||""),total:refs.length,offset:start,limit:size,hasMore:start+foods.length<refs.length,foods,refs:pageRefs,brand:brand?{key:brand.key,name:brand.name,count:brand.refs.length}:null,source:"Open Food Facts Australia"};
  }
  async function lookupBarcode(value){const code=String(value||"").replace(/\D/g,"");if(!code)return null;const data=await load(`barcodes/${prefix(code)}.json`).catch(()=>null),ref=data?.barcodes?.[code];if(!ref)return null;return (await hydrate([ref]))[0]||null;}
  function federate(curated,external){const C=global.HECFoodCatalogue;const ranked=[...(curated||[]),...(external||[])].map(food=>({food,rank:C?.rank?.(food,food.name)?.score||0}));return C?.dedupeRanked?C.dedupeRanked(ranked).map(item=>item.food):[...new Map(ranked.map(item=>[item.food.barcode?`barcode:${item.food.barcode}`:item.food.id,item.food])).values()];}
  const api={version:VERSION,base:BASE,pageSize:PAGE_SIZE,norm,brandKey,tokens,manifest,search,lookupBarcode,hydrate,toFood,federate,loadedFoods,getLoaded:id=>loadedFoods.get(id)||null,cacheState:()=>({files:cache.size,products:loadedFoods.size})};
  global.HECOpenFoodFactsAU=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
