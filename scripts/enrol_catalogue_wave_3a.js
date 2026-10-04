'use strict';
// One-time bounded review enrolment, before any admission or category projection.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),O=require('../off-catalogue'),X=require('./catalogue-round-two');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'data/catalogue-wave-3a');
const read=n=>JSON.parse(fs.readFileSync(path.join(BASE,n),'utf8')),write=(n,d)=>fs.writeFileSync(path.join(BASE,n),JSON.stringify(d,null,2)+'\n');
assert(!fs.existsSync(path.join(BASE,'candidate-manifest.json')),'Do not silently replace enrolment');
const baseline=read('baseline.json'),other=read('baseline-records.json').aldi.other;
const frozen=[];
for(const file of fs.readdirSync(path.join(ROOT,'data/open-food-facts-au/products')).sort()){
 const relative='data/open-food-facts-au/products/'+file,raw=fs.readFileSync(path.join(ROOT,relative));
 const sha256=X.hash(raw);
 JSON.parse(raw).products.forEach((record,row)=>frozen.push({file:relative,row,sha256,record}));
}
const keys=new Set(baseline.retailers.aldi.identities.map(f=>f.key)),global=require('../brand-au-catalogue'),globalKeys=new Set(global.entries.map(C.canonicalKey));
const families=require('../data/catalogue-round-three/family-audit-before.json').rows.filter(f=>f.retailer==='aldi');
const held=families.flatMap(f=>f.decisions.filter(d=>!keys.has(d.canonicalKey)).map(d=>({...d,family:f.key,relationshipVerified:!!f.relationshipVerified,evidenceIds:f.evidenceIds})));
const heldUnique=[...new Map(held.map(d=>[d.canonicalKey,d])).values()];
write('retained-holds.json',{note:'Inventory only, not a review/admission of every identity. Includes uncertain family associations; no ownership inference.',total:heldUnique.length,verifiedFamilyIdentities:new Set(held.filter(d=>d.relationshipVerified).map(d=>d.canonicalKey)).size,records:heldUnique});
const aCodes=['4061461224905','4061459052275','4088700040119','4061461397524','4088700153604','4088700153970','4088700091999','4088700067840','4061462110801','4069365222331','4061462842412','4061462564468','22000682','22002136','4061463046932'];
const bCodes=['4088700198728','4061461640736','4061462020650','4061462197710','4061462230264','4061462270932','4061462623004','4061463342751','4061464721135','4061464747678','4069365476444','4088700038994','4088700055625','4088700157039','4088700157060','4088700207109','4088700355213'];
const candidates=[],peers=[];
for(const code of aCodes){const prior=heldUnique.find(d=>d.gtin===code),source=frozen.find(p=>p.record.barcode===code);assert(prior&&source);peers.push(source);const food=O.toFood(source.record);candidates.push({group:'A',canonicalKey:'barcode:'+code,name:prior.name,brand:prior.brand,sourceId:source.record.id,baselineSha256:X.hash(JSON.stringify(source.record)),priorReasons:prior.reasons,family:prior.family,relationshipVerified:prior.relationshipVerified,evidenceIds:prior.evidenceIds,currentEligibility:C.productEligibility(food).addability,reason:'Review retained nutrition, energy, serving or relationship hold; exact compatible evidence required.'});}
for(const code of bCodes){const food=other.find(f=>f.barcode===code);assert(food);candidates.push({group:'B',canonicalKey:C.canonicalKey(food),name:food.name,brand:food.brand,baselineSha256:X.hash(JSON.stringify(food)),reason:'Whole-product semantic review of accepted fallback item; nutrition and serving unchanged.'});}
const sources=[
 ['C','farmdale','Farmdale','Full Cream Milk 3L','farmdale-full-cream-milk-3l-000000000000398894'],
 ['C','market-fare','Market Fare','Mixed Vegetables 1kg','market-fare-mixed-vegetables-1kg-000000000000365539'],
 ['C','elmsbury','Elmsbury','Meat Pies 6 Pack 900g','elmsbury-meat-pies-6-pack-900g-000000000000366728'],
 ['C','seasons-bubble','Seasons Pride',"Bubble n Squeak 620g",'seasons-pride-bubble-n-squeak-620g-000000000365218001'],
 ['C','seasons-corn','Seasons Pride','Corn Fritters 500g','seasons-pride-corn-fritters-500g-000000000365218002'],
 ['D','vegemite','Vegemite','Vegemite 370g','vegemite-vegemite-370g-000000000000370431'],
 ['D','pepsi','Pepsi Max','Pepsi Max 2L','pepsi-max-pepsi-max-2l-000000000000367148']
];
for(const [group,id,brand,name,slug]of sources){const related=frozen.filter(p=>C.brandKey(p.record.brand)===C.brandKey(brand)&&((id==='farmdale'&&/full cream/i.test(p.record.name)&&! /powder|lactose|long life|uht/i.test(p.record.name))||(id==='market-fare'&&/^mixed vegetables$/i.test(p.record.name))||(id==='elmsbury'&&/meat pies?/i.test(p.record.name))||(id==='seasons-bubble'&&/bubble/i.test(p.record.name))||(id==='seasons-corn'&&/corn fritters/i.test(p.record.name))||(id==='vegemite'&&/^vegemite$/i.test(p.record.name))||(id==='pepsi'&&/pepsi max/i.test(p.record.name))));peers.push(...related);candidates.push({group,candidateSourceKey:'aldi:'+slug.split('-').at(-1),canonicalKey:'unresolved:aldi:'+id,identityUnresolved:true,name,brand,url:'https://www.aldi.com.au/product/'+slug,possibleOverlapKeys:related.map(p=>'barcode:'+p.record.barcode).sort(),reason:group==='C'?'Thin-category/family depth; establish exact identity, panel, preparation and private-label evidence.':'Bounded independent discovery; separate presence from ownership and nutrition.'});}
candidates.forEach((c,i)=>c.candidateId='3A-'+c.group+'-'+String(i+1).padStart(2,'0'));
assert(candidates.length<=70);assert.equal(new Set(candidates.map(c=>c.canonicalKey)).size,candidates.length);
const groupLimits={A:15,B:30,C:20,D:5};for(const [group,limit]of Object.entries(groupLimits))assert(candidates.filter(c=>c.group===group).length<=limit);
write('candidate-manifest.json',{schemaVersion:1,wave:'3A',startingHead:baseline.startingHead,enrolledAt:new Date().toISOString(),reviewCeiling:70,groupLimits,selection:'15 retained holds spanning basis/conflicts and family uncertainty; 17 high-confidence fallback concepts; 5 thin-family source candidates; 2 independent source candidates. Unresolved source keys are not minted food identities. Cross-retailer consequences are separate projection accounting.',candidates});
write('baseline-peers.json',{records:[...new Map(peers.map(p=>[p.record.id,p])).values()],globalCanonicalKeys:[...globalKeys].sort()});
const protectedFiles=read('protected-files.json'),protectedSet=new Set(protectedFiles.map(p=>p.file));
for(const dir of ['data/woolworths-au','data/coles-au','data/aldi-au','data/catalogue-round-two','data/catalogue-round-three'])for(const file of fs.readdirSync(path.join(ROOT,dir)).filter(f=>/source-policy|review-input|off-input|supplement|approved-products|reviewed-evidence|public-evidence/.test(f))){const relative=dir+'/'+file;if(!protectedSet.has(relative))protectedFiles.push({file:relative,sha256:X.hash(fs.readFileSync(path.join(ROOT,relative)))});}
write('protected-files.json',protectedFiles);
console.log(JSON.stringify({candidates:candidates.length,groups:Object.fromEntries(Object.keys(groupLimits).map(g=>[g,candidates.filter(c=>c.group===g).length])),heldInventory:heldUnique.length,selectedPeerRecords:peers.length}));
