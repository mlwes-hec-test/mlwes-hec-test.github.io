'use strict';
// Read-only audit of the pre-existing OFF projection and other accepted sources.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../food-catalogue'),O=require('../off-catalogue'),index=require('../brand-au-catalogue');
function run(){
  const status={},manifest=require('../data/open-food-facts-au/manifest.json');let total=0;
  for(const shard of manifest.productShards)for(const raw of require('../data/open-food-facts-au/'+shard.path).products){
    const food=O.toFood(raw),key=C.productEligibility(food).addability.status;status[key]=(status[key]||0)+1;total++;O.loadedFoods.clear();
  }
  const records=index.files.flatMap(s=>require('../data/brand-au/'+s.path).records),known=require('../australian-catalogue-data').packagedProducts,overlaps=[];
  for(const food of records){const peers=known.filter(p=>p.barcode&&p.barcode===food.barcode);if(!peers.length)continue;
    const merged=C.canonicaliseRecords([food,...peers]);const conflicts=merged.flatMap(f=>C.sourceConflicts(f).filter(c=>c.severity==='material'&&(!c.resolution||c.resolution==='unresolved')));
    overlaps.push({id:food.id,peers:peers.map(f=>f.id),canonicalIds:merged.map(f=>f.id),conflicts});assert.equal(merged.length,1);assert.equal(conflicts.length,0,food.id);
  }
  return {projection:'Unmodified committed OFF primary-brand/category projection',total,status,otherAcceptedPackagedOverlaps:overlaps};
}
if(require.main===module){const report=run();fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
module.exports={run};
