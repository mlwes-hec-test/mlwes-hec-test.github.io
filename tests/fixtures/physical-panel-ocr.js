'use strict';
// Synthetic observations model the founder's transcribed distortions, not
// actual iPhone recognition output. Geometry and confidence are explicit.
const bread=`NUTRITION INFORMATION
Servings per package: 10.5 (19 slices and 2 crusts)
Serving size: 67 g (2 slices)
Per Serving %DI Per 100 g
Energy
697 kJ
8%
1040 kJ
(166 Cal)
(248 Cal)
Protein
6.29
92g
Fat, Total
16g
244
Saturated
<10g
<10g
Carbohydrate
308g
4609
Sugars
21g
?
Dietary Fibre
159
Sodium
255 mg
380mg`;
const milk=`Servings per pack: 4
Serving Size: 2S0 rnL
Per Serving Per 100 mL
Energy 478 kJ 191 kJ
Protein 850 / 349
Fat 330 / 130
Carbohydrate 1239 / 499
Sodium 108 mg / 43 mg
Calcium 315 mg / 126 mg`;
const drink=`DRY DRINK MIX
Servings per pack:
10
Serving size:
12.5 g
ONE SACHET = ONE SERVING
Per Serving
Per 100 mL
As Prepared
Energy
200 kJ
130 kJ
(47 Cal)
(32 Cal)
Protein <1 g <1 g
Fat 1.8 g 1.2 g
Saturated fat 1.6 g 1.1 g
Carbohydrate 9.1 g 6.2 g
Sugars 3.3 g 2.2 g
Sodium 51 mg 35 mg`;
function spatial({prepared=false,weakServe=false,weakQualifier=false,metadataOnly=false}={}){
  const words=[],add=(text,x,y,confidence=96)=>words.push({text,confidence,bbox:{x0:x,y0:y,x1:x+text.length*8,y1:y+18}});
  add('Servings per pack:',20,0);add(prepared?'10':'4',330,0);add('(',405,0);add('unreadable packet notes)',420,0,30);
  add('Serving size:',20,30);add(prepared?'12.5':'250',330,30);add(prepared?'g':'mL',375,30,prepared?96:30);
  if(prepared){add('ONE SACHET',20,60);add('=',160,60);add('ONE SERVING',190,60);}
  if(!metadataOnly){
    add('Per',500,100);add('Serving',500,125);add('%DI',760,100);
    add('Per',960,100);add('100',960,125);add('mL',960,150);
    if(prepared){add('As',960,175);add('Prepared',960,200);}
    add('Energy',20,245);add(prepared?'200':'478',510,245,weakServe?40:96);add('kJ',553,245);add('8.0',760,245);add(prepared?'130':'191',970,245);add('kJ',1013,245);
    add(prepared?'(47':'(114',510,275);add('Cal)',553,275);add(prepared?'(32':'(46',970,275);add('Cal)',1013,275);
    add('Protein',20,325);add(prepared?'<':'850',510,325,weakQualifier?30:96);if(prepared){add('1',530,325);add('g',545,325);}add(prepared?'<1 g':'349',970,325);
    add('Carbohydrate',20,370);add('1239',510,370);add('499',970,370);
    add('Sodium',20,415);add(prepared?'51':'108',510,415);add('mg',553,415);add('5',760,415);add(prepared?'35':'43',970,415);add('mg',1013,415);
    add('Calcium',20,460);add('315',510,460);add('mg',553,460);add('126',970,460);add('mg',1013,460);
  }
  // Column-first flattened text has lost row ownership and the heading wraps.
  return {text:'NUTRITION INFORMATION\nServing Size: 2S0 rnL\nEnergy\nProtein\nSodium\nCalcium\n478 kJ\n850\n108 mg\n315 mg\n191 kJ\n349\n43 mg\n126 mg',confidence:43,blocks:words.map(w=>({paragraphs:[{lines:[{text:w.text,words:[w]}]}]}))};
}
module.exports={bread,milk,drink,spatial};
