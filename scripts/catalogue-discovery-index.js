'use strict';
// Project the same food-family metadata into every index without rewriting sources.
const D=require('../catalogue-discovery');
function augment(out,kind){
  const file='../../'+kind+'-au-catalogue.js',script=out[file],match=script.match(/const index=(.*?);(?:const adapter|if\(typeof module)/s);
  if(!match)throw Error('Missing catalogue index: '+kind);
  const index=JSON.parse(match[1]),foods=new Map(index.files.flatMap(s=>JSON.parse(out[s.path]).records).map(f=>[f.id,f]));
  for(const e of index.entries){const food=foods.get(e.id),c=D.category(food);if(c){e.browseCategoryId=c.id;if(kind==='brand')e.categoryId=c.id;if(!index.categories.some(x=>x.id===c.id))index.categories.push({...c,label:c.label,scope:'food'});}}
  out[file]=script.replace(match[1],JSON.stringify(index));return out;
}
module.exports={augment};
