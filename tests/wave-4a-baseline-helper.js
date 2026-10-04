'use strict';
// Historical assertions may compare the pre-Wave-4A record only after checking
// the entire current record against its exact pinned, reviewed overlay.
const assert=require('node:assert/strict'),C=require('../food-catalogue');
const wave=require('../scripts/catalogue-wave-4a').derive();
const patches=new Map(wave.products.map(f=>[C.canonicalKey(f),JSON.parse(JSON.stringify(f))]));
const previous=new Map([...wave.input.baseline.approved,...wave.input.independent].map(f=>[C.canonicalKey(f),f]));
function beforeWave4A(food){const key=C.canonicalKey(food),patch=patches.get(key);if(!patch)return food;assert.deepEqual(food,patch,'Unexpected change outside exact reviewed Wave 4A overlay: '+key);const prior=previous.get(key);assert(prior);return prior;}
module.exports={beforeWave4A};
