'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../food-catalogue'),G=require('../guided-product-resolution'),off=require('../scripts/audit_open_food_facts_au');
C.registerBrandDirectory(require('../australian-catalogue-data').brands);
const digest=id=>crypto.createHash('sha256').update(id).digest('hex');
const patterns={apostrophe:/'/,typographic:/’/,hyphen:/[-‐‑–—]/,ampersand:/&/,punctuationSpacing:/\s[-&’']|[-&’']\s/};
const products=off.allProducts(),used=new Set();
for(const [kind,pattern] of Object.entries(patterns)){
  const candidates=products.filter(r=>r.brand&&r.name.split(/\s+/).length>=3&&pattern.test(r.brand)).sort((a,b)=>digest(a.id).localeCompare(digest(b.id))),selected=[];
  for(const raw of candidates){if(used.has(C.brandKey(raw.brand)))continue;const food=off.api.toFood(raw);if(!C.productEligibility(food).addability.normalLoggingAllowed||C.queryIntent(raw.brand).kind!=='brand-family')continue;selected.push({raw,food});used.add(C.brandKey(raw.brand));if(selected.length===2)break;}
  test(`automatic ${kind} products preserve display and canonical identity across matching variants`,async t=>{
    assert.equal(selected.length,2);
    for(const {raw,food} of selected){const before=JSON.stringify(food),canonical=C.canonicalKey(food),variants=[raw.brand,raw.brand.normalize('NFC'),raw.brand.normalize('NFD'),raw.brand.normalize('NFKD').replace(/[\u0300-\u036f]/g,''),raw.brand.replace(/[’']/g,"'"),raw.brand.replace(/[’']/g,'’'),raw.brand.replace(/[’']/g,''),raw.brand.replace(/[-‐‑–—]/g,'–'),raw.brand.replace(/[-‐‑–—]/g,'‑'),raw.brand.replace(/[-‐‑–—]/g,' '),raw.brand.replace(/&/g,' and ').replace(/[-‐‑–—]/g,' - ').replace(/\s+/g,' ').trim()];
      for(const brand of new Set(variants)){
        const query=brand+' '+raw.name,intent=C.queryIntent(query),indexed=await off.api.search(query,{limit:500});assert(indexed.foods.some(f=>f.id===food.id),query);
        assert.equal(C.brandKey(brand),C.brandKey(raw.brand));assert(C.explicitIdentityMatch(food,query,intent),query);
        const model=C.submittedResultModel([food],query),item=model.groups.flatMap(g=>g.items).find(i=>i.recordId===food.id);assert(item,query);assert.equal(item.id,canonical);
        const session=G.createSession([item.food],query,{intent:{kind:'exact-product'}});assert.equal(session.exactNutritionalIdentity.canonicalId,canonical);assert.equal(session.exactProduct.brand,raw.brand);
      }
      assert.equal(JSON.stringify(food),before);const sibling={...food,id:food.id+'-different',barcode:'9999999999999',brand:'Unrelated Brand'};
      assert.equal(C.strongDuplicateEvidence(food,sibling).duplicate,false);assert.equal(C.canonicaliseRecords([food,sibling]).length,2);
      assert.equal(C.explicitIdentityMatch(sibling,raw.brand+' '+raw.name),false);
      t.diagnostic(JSON.stringify({kind,id:raw.id,brand:raw.brand,name:raw.name,canonicalId:canonical,variants:new Set(variants).size}));
    }
  });
}
