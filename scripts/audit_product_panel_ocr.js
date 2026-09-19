'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const modules=process.env.HEC_WORKSPACE_NODE_MODULES||path.resolve(path.dirname(process.execPath),'../node_modules'),T=require(path.join(modules,'tesseract.js'));
require('../packaged-foods');const X=require('../capture-foundation');
async function run(){
 const output=path.resolve(process.argv[2]||'data/product-capture-repair/rendered'),cache=path.join(os.tmpdir(),'hec-synthetic-ocr-language');fs.mkdirSync(cache,{recursive:true});
 const qa=require('./audit_physical_form_measures_edge'),{chromium,edge}=qa.browserTools(),browser=await chromium.launch({headless:true,executablePath:edge});
 const p=await browser.newPage();
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=1500;c.height=1000;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,c.width,c.height);g.fillStyle='black';g.font='bold 36px Arial';g.fillText('NUTRITION INFORMATION',40,65);g.font='30px Arial';g.fillText('Servings per package 6',40,125);g.fillText('Serving size 125 g',40,180);g.fillText('Average quantity per serving',530,245);g.fillText('Average quantity per 100 g',1030,245);const rows=[['Energy (kJ)','625','500'],['Protein (g)','5','4'],['Fat, total (g)','5','4'],['Saturated fat (g)','3','2.4'],['Carbohydrate (g)','20','16'],['Sugars (g)','15','12'],['Dietary fibre (g)','1.25','1'],['Sodium (mg)','75','60'],['Calcium (mg)','150','120']];rows.forEach((r,i)=>r.forEach((v,j)=>g.fillText(v,[40,670,1170][j],310+i*60)));g.fillText('Ingredients: Milk, synthetic vanilla flavour, starch.',40,920);return c.toDataURL('image/png').split(',')[1];});
 await browser.close();fs.writeFileSync(path.join(output,'synthetic-panel-flat.png'),Buffer.from(png,'base64'));
 const worker=await T.createWorker('eng',1,{cachePath:cache});let result;
 try{await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1',user_defined_dpi:'300'});result=await worker.recognize(path.join(output,'synthetic-panel-flat.png'));}finally{await worker.terminate();}
 const parsed=X.parseNutritionPanel(result.data.text),report={engine:'Tesseract.js '+require(path.join(modules,'tesseract.js/package.json')).version,fixture:'Synthetic clean flat panel, not Wicked Sister nutrition',confidence:result.data.confidence,text:result.data.text,parsed};
 fs.writeFileSync(path.join(output,'real-ocr.json'),JSON.stringify(report,null,2));
 assert.equal(parsed.perServing.energyKj,625);assert.equal(parsed.per100.energyKj,500);assert.equal(parsed.servingAmount,125);assert.equal(parsed.perServing.protein,5);assert.equal(parsed.per100.protein,4);assert.equal(parsed.perServing.calcium,150);assert.equal(parsed.per100.calcium,120);assert.equal(parsed.servingsPerPack,6);
 console.log(JSON.stringify({pass:true,engine:report.engine,confidence:report.confidence,issues:parsed.issues}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});

