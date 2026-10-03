'use strict';
// Exact supplied v56 snippets. Nutrition-region placement, boxes and confidence
// are representative test observations, not a captured physical OCR dump.
// The founder confirmed that an explicit 100 mL heading is not known to exist.
const bread=`NUTRITION INFORMATION
Servings per package: 10.5 (19 slices and 2 crusts)
Servingsize:67g(2sice)`;
const drink=`NUTRITION INFORMATION
ONE SACHET = ONE SERVING
TOR | senings Per Pack: 10
Serving Sze:1258
Quantity Serving | Serving
AsPrepared |
47 Cal     32 Cal
Contains on average
47 calories per sachet`;
function lines(text){return {text,confidence:43,blocks:[{paragraphs:[{lines:text.split('\n').map(line=>({text:line,words:line.split(/\s+/).map(text=>({text,confidence:text==='TOR'?35:96}))}))}]}]};}
function spatial(kind='drink'){
 const text=kind==='bread'?bread:drink,data=lines(text),words=[];
 for(const [i,line] of text.split('\n').entries()){
  const parts=line==='47 Cal     32 Cal'?[['47 Cal',460],['32 Cal',900]]:line==='Quantity Serving | Serving'?[['Quantity',20],['Serving',460],['|',730],['Serving',900]]:line==='AsPrepared |'?[['AsPrepared',900],['|',1010]]:[[line,20]];
  for(const [text,x] of parts)words.push({text,confidence:96,bbox:{x0:x,x1:x+text.length*7,y0:i*35,y1:i*35+18}});
 }
 data.blocks=words.sort((a,b)=>a.bbox.x0-b.bbox.x0||a.bbox.y0-b.bbox.y0).map(w=>({paragraphs:[{lines:[{text:w.text,words:[w]}]}]}));return data;
}
// Separate controlled variation with additional explicit heading evidence.
// Never present this as the exact physical transcription above.
function explicitReference({heading='AsPrepared',weak=false,reverse=false}={}){
 const words=[],add=(text,x,y,confidence=96)=>words.push({text,confidence,bbox:{x0:x,x1:x+text.length*7,y0:y,y1:y+18}});
 add(reverse?'Per 100 mL':'Per Serving',460,0);add(reverse?'Per Serving':'Per 100 mL',900,0);add(heading,reverse?460:900,30);
 add(reverse?'32 Cal':'47 Cal',470,80,weak?35:96);add(reverse?'47 Cal':'32 Cal',910,80);
 add('Protein',20,120);add('?',470,120);add('?',910,120);
 return {text:'Unreadable flattened table',confidence:40,blocks:words.map(w=>({paragraphs:[{lines:[{text:w.text,words:[w]}]}]}))};
}
module.exports={bread,drink,lines,spatial,explicitReference};
