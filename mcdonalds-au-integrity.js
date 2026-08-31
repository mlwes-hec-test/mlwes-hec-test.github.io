/* Healthy Eating Companion — McDonald's Australia catalogue integrity report.
   Run with Node to print the current Founder-Trial catalogue report as JSON.
*/
'use strict';

const sources=require('./food-sources.js');
const semantics=require('./product-serving-semantics.js');
require('./mcdonalds-au-catalogue.js');

function buildIntegrityReport(){
  const catalogue=sources.getCatalogue('mcdonalds-au'),items=catalogue.items,records=sources.foodRecords({sourceId:'mcdonalds-au'});
  const duplicateItemIds=items.map(item=>item.id).filter((id,index,all)=>all.indexOf(id)!==index);
  const duplicateRecordIds=records.map(record=>record.id).filter((id,index,all)=>all.indexOf(id)!==index);
  const missingNames=items.filter(item=>!String(item.name||'').trim()).map(item=>item.id);
  const oneGramDefaults=records.filter(record=>record.defaultAmount===1&&record.defaultUnit==='g').map(record=>record.id);
  const loggableMissingRequiredNutrition=records.filter(record=>record.loggable&&(record.nutrients?.calories===null||record.nutrients?.calories===undefined||record.nutrients?.energyKj===null||record.nutrients?.energyKj===undefined)).map(record=>record.id);
  const semanticAudit=semantics.audit(records);
  const errors=[...duplicateItemIds.map(id=>`duplicate item id: ${id}`),...duplicateRecordIds.map(id=>`duplicate record id: ${id}`),...missingNames.map(id=>`missing name: ${id}`),...oneGramDefaults.map(id=>`1 g default: ${id}`),...loggableMissingRequiredNutrition.map(id=>`loggable record missing required nutrition: ${id}`),...semanticAudit.unresolved.map(item=>`semantic conflict: ${item.id}: ${item.issues.join(',')}`)];
  return {
    checkedDate:catalogue.source.lastCheckedDate,catalogueVersion:catalogue.source.catalogueVersion,totalEntities:items.length,totalRuntimeRecords:records.length,
    fullyLoggableEntities:items.filter(item=>item.loggable).length,fullyLoggableRecords:records.filter(record=>record.loggable).length,
    incompleteEntities:items.filter(item=>item.nutritionStatus==='unavailable').length,configurableEntities:items.filter(item=>item.nutritionStatus==='configurable').length,
    mccafeFamilies:items.filter(item=>item.categoryMemberships.includes('McCafé Drinks')).length,mccafeVariants:records.filter(record=>record.sourceVariantId&&record.categoryMemberships.includes('McCafé Drinks')).length,
    promotionalEntities:items.filter(item=>item.promotional).length,limitedTimeEntities:items.filter(item=>item.limitedTime).length,
    semanticCategoryCounts:semanticAudit.categoryCounts,semanticFlaggedConflicts:semanticAudit.flaggedConflicts,semanticSafelyAutoResolved:semanticAudit.safelyAutoResolved,semanticUnresolvedCount:semanticAudit.unresolvedCount,semanticUnresolved:semanticAudit.unresolved,
    duplicateItemIds,duplicateRecordIds,missingNames,oneGramDefaults,loggableMissingRequiredNutrition,errorCount:errors.length,errors
  };
}

if(require.main===module)process.stdout.write(`${JSON.stringify(buildIntegrityReport(),null,2)}\n`);
module.exports={buildIntegrityReport};
