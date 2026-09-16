'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../food-catalogue'),I=require('../brand-au-catalogue');
const foods=I.files.flatMap(f=>require('../data/brand-au/'+f.path).records);
test('classification cache distinguishes category fields and invalidates edited identities',()=>{
  const S=require('../search-foundation'),a={name:'Example',categories:['chocolate'],categoryMemberships:[]},b={...a,categories:[],categoryMemberships:['chocolate']};
  assert.notDeepEqual(S.foodConceptEvidence(a),S.foodConceptEvidence(b));
  const clone=JSON.parse(JSON.stringify(a));assert.deepEqual(S.foodConceptEvidence(a),S.foodConceptEvidence(clone));clone.name='White Bread';clone.categories=[];assert.equal(S.foodConceptEvidence(clone).conceptId,'bread');
});
test('indexed peer identity decisions equal the established scan for every admitted category',()=>{
  for(const category of I.categories){const candidates=foods.filter(f=>f.categoryId===category.id),identityIndex=C.identityCandidateIndex(candidates);for(const food of candidates)assert.deepEqual(C.exactProductQuality(food,{candidates,identityIndex}),C.exactProductQuality(food,{candidates}),food.id);}
});
test('indexed identity preserves duplicate labels, family shells and distinct GTIN exceptions',()=>{
  const base={name:'Crisp',brand:'Example',recordType:'packaged',market:'AU',familyName:'Crisp',units:{g:.01},nutrients:{calories:100,protein:1,carbs:10,fat:1}},a={...base,id:'a'},b={...base,id:'b',name:'Crisp salted'},c={...base,id:'c',barcode:'9310055101722'},d={...c,id:'d',barcode:'8801083673301'},e={...base,id:'e',brand:''},candidates=[a,a,b,c,d,e,null],identityIndex=C.identityCandidateIndex(candidates);
  for(const food of [a,b,c,d,e,{...base,id:'merged'}])assert.deepEqual(C.exactProductQuality(food,{candidates,identityIndex}),C.exactProductQuality(food,{candidates}),food.id);
});
