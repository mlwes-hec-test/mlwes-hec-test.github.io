'use strict';
// Transcriptions from the physical v55 brief, not captured Tesseract dumps.
// Positions/confidences below are representative test evidence, not measured.
const bread=`NUTRITION INFORMATION
Servings per package: 10.5 (19 slices and 2 crusts)
Sening an 67g (2 slices)
Quantity % Daily intake
Quantity
per serving
per100 g
Energy 697 kJ
1040
(248 Cal)
Protein 6.29
9249
- Saturated <10g
<10 g
Carbohydrate 30849
460g
- Sugars 219
Dietary Fibre 159
Sodium 255 mg
380 mg`;
const drink=`NUTRITION INFORMATION
Servings Per Pack: 10
Serving Size: 12.5 g
Average Quantity Per Serving
Per 100ml
Serving | AsPrepared
Energy 200kJ
130 kJ
47 Cal
32 Cal
Fat, Total
...
Carbohydrate | 9.18
...
- Sugars 33g
...
Contains on average 47 calories per sachet`;
function lines(text){
  return {text,confidence:43,blocks:[{paragraphs:[{lines:text.split('\n').map(line=>({text:line,words:line.split(/\s+/).map(text=>({text,confidence:/Sening|^an$/.test(text)||/per package/.test(line)&&/^(?:\(19|slices|and|crusts\))$/.test(text)?35:96}))}))}]}]};
}
function spatial(kind='bread'){
  const data=lines(kind==='bread'?bread:drink),words=[],add=(text,x,y,confidence=96)=>words.push({text,confidence,bbox:{x0:x,y0:y,x1:x+text.length*7,y1:y+18}});
  add(kind==='bread'?'Servings per package:':'Servings Per Pack:',20,0);add(kind==='bread'?'10.5':'10',310,0);if(kind==='bread')add('(19 slices and 2 crusts)',375,0,35);
  add(kind==='bread'?'Sening an':'Serving Size:',20,30,kind==='bread'?35:96);add(kind==='bread'?'67g':'12.5 g',310,30);if(kind==='bread')add('(2 slices)',370,30);
  add('Quantity',480,70);add('% Daily intake',720,70);add('Quantity',940,70);
  add('per serving',480,100);add(kind==='bread'?'per100 g':'Per 100ml',940,100);if(kind==='drink')add('AsPrepared',940,130);
  add('Energy',20,180);add(kind==='bread'?'697 kJ':'200kJ',490,180);add(kind==='bread'?'1040':'130 kJ',950,180);
  if(kind==='drink')add('47 Cal',490,210);add(kind==='bread'?'(248 Cal)':'32 Cal',950,210);
  add(kind==='bread'?'Protein':'Fat, Total',20,250);add(kind==='bread'?'6.29':'...',490,250);add(kind==='bread'?'9249':'...',950,250);
  add('Carbohydrate',20,290);add(kind==='bread'?'30849':'9.18',490,290);add(kind==='bread'?'460g':'...',950,290);
  if(kind==='bread'){add('Dietary Fibre',20,330);add('159',490,330);add('Sodium',20,370);add('255 mg',490,370);add('380 mg',950,370);}
  // Independent blocks deliberately flatten in column order, not row order.
  data.blocks=words.sort((a,b)=>a.bbox.x0-b.bbox.x0||a.bbox.y0-b.bbox.y0).map(w=>({paragraphs:[{lines:[{text:w.text,words:[w]}]}]}));
  return data;
}
module.exports={bread,drink,lines,spatial};
