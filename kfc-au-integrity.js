/* KFC Australia catalogue integrity report. Run directly with Node to print
   the current Founder-Trial snapshot report as JSON. */
'use strict';

const sources=require('./food-sources.js');
const semantics=require('./product-serving-semantics.js');
const raw=require('./kfc-au-catalogue-data.js');
require('./kfc-au-catalogue.js');

function buildIntegrityReport(){
  const catalogue=sources.getCatalogue('kfc-au'),items=catalogue.items,records=sources.foodRecords({sourceId:'kfc-au'}),ids=items.map(item=>item.id),recordIds=records.map(record=>record.id);
  const duplicateItemIds=ids.filter((id,index)=>ids.indexOf(id)!==index),duplicateRecordIds=recordIds.filter((id,index)=>recordIds.indexOf(id)!==index),missingNames=items.filter(item=>!String(item.name||'').trim()).map(item=>item.id),oneGramDefaults=records.filter(record=>record.defaultAmount===1&&record.defaultUnit==='g').map(record=>record.id),loggableMissingEnergy=records.filter(record=>record.loggable&&(!Number.isFinite(Number(record.nutrients?.energyKj))||!Number.isFinite(Number(record.nutrients?.calories)))).map(record=>record.id),inventedMacros=records.filter(record=>record.nutritionStatus==='energy-only'&&['protein','fat','satFat','carbs','sugar','sodium','fibre'].some(key=>Object.hasOwn(record.nutrients||{},key))).map(record=>record.id),identityOnlyLoggable=records.filter(record=>record.nutritionStatus==='identity-only'&&record.loggable).map(record=>record.id),configurableLoggable=records.filter(record=>record.nutritionStatus==='configurable'&&record.loggable).map(record=>record.id),semanticAudit=semantics.audit(records);
  const categoryRows=Object.fromEntries(raw.categories.map(category=>[category.name,category.items.length])),uniqueCategoryItems=Object.fromEntries(raw.categories.map(category=>[category.name,new Set(category.items.map(value=>String(value).replace(/[®™]/g,'').replace(/[’]/g,"'").trim())).size]));
  const errors=[...duplicateItemIds.map(id=>`duplicate item id: ${id}`),...duplicateRecordIds.map(id=>`duplicate record id: ${id}`),...missingNames.map(id=>`missing name: ${id}`),...oneGramDefaults.map(id=>`1 g default: ${id}`),...loggableMissingEnergy.map(id=>`loggable record missing fixed energy: ${id}`),...inventedMacros.map(id=>`energy-only record contains macro data: ${id}`),...identityOnlyLoggable.map(id=>`identity-only record is loggable: ${id}`),...configurableLoggable.map(id=>`configurable record is loggable: ${id}`),...semanticAudit.unresolved.map(item=>`semantic conflict: ${item.id}: ${item.issues.join(',')}`)];
  return {
    checkedDate:catalogue.source.lastCheckedDate,catalogueVersion:catalogue.source.catalogueVersion,normalisedSnapshotSha256:catalogue.source.referenceMetadata.normalisedSnapshotSha256,
    menuRows:catalogue.source.inventory.menuRows,totalEntities:items.length,totalRuntimeRecords:records.length,duplicateSourceRows:catalogue.source.inventory.menuRows-items.length,categoryRows,uniqueCategoryItems,
    nutritionQuality:Object.fromEntries(['complete','energy-only','partial','identity-only','conflict','configurable'].map(status=>[status,items.filter(item=>item.nutritionStatus===status).length])),
    semanticTypes:semanticAudit.categoryCounts,limitedTimeEntities:items.filter(item=>item.limitedTime).length,sourceConflictEntities:items.filter(item=>item.sourceConflict).length,loggableRecords:records.filter(record=>record.loggable).length,detailsOnlyRecords:records.filter(record=>!record.loggable).length,
    officialCurrentIdentityRecords:records.filter(record=>record.officialCurrentIdentity).length,sourceCaptureHashesAvailable:catalogue.source.referenceMetadata.sourceCaptures.filter(capture=>capture.contentHash).length,errorCount:errors.length,errors
  };
}

if(require.main===module)console.log(JSON.stringify(buildIntegrityReport(),null,2));
module.exports={buildIntegrityReport};
