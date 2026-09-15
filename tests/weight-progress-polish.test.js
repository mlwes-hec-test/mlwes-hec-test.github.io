'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const weight=require('../weight-progress-foundation.js');
const today='2026-09-15',record=(date,weightKg,id=date)=>({id,date,weightKg});
const series=(count,fn)=>Array.from({length:count},(_,i)=>record(weight.shiftDate(today,i-count+1),fn(i)));
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('a tenth of a kilogram occupies at most 5% of the vertical scale',()=>{
  const model=weight.chartModel(series(2,i=>80+i*.1),{today,period:'all'});
  assert(model.domain.span>=2);assert(Math.abs(model.points[0].y-model.points[1].y)<=.051);
  assert(model.domain.min<80&&model.domain.max>80.1);
});
test('empty and single layouts contain no invented line points',()=>{
  for(const records of [[],[record(today,80)]]){
    const model=weight.chartModel(records,{today}),layout=weight.chartLayout(model,{width:268,height:280});
    assert.equal(layout.points.length,records.length);assert.equal(layout.labels.length,records.length);
    if(records.length){assert.equal(layout.points[0].x,(layout.left+layout.right)/2);assert.equal(layout.labels[0].text,'80.0');}
  }
});
test('responsive layouts retain every original record and its model position without mutation',()=>{
  const records=series(400,i=>90-i*.01),original=JSON.stringify(records),model=weight.chartModel(records,{today,period:'all'}),modelBefore=JSON.stringify(model);
  for(const width of [268,335,644]){
    const layout=weight.chartLayout(model,{width,height:354});
    assert.equal(layout.points.length,400);
    layout.points.forEach((point,i)=>{assert.strictEqual(point.record,model.records[i]);assert(Math.abs((point.x-layout.left)/(layout.right-layout.left)-model.points[i].x)<1e-10);assert(Math.abs((point.y-layout.top)/(layout.bottom-layout.top)-model.points[i].y)<1e-10);});
  }
  assert.equal(JSON.stringify(records),original);assert.equal(JSON.stringify(model),modelBefore);
});
test('flat, close, rising, falling and long histories have bounded, non-overlapping value labels',()=>{
  for(const records of [series(16,()=>80),series(16,i=>80+[0,.1,-.1][i%3]),series(6,i=>80+i),series(6,i=>85-i),series(400,i=>90-i*.016+Math.sin(i)*.2)]){
    for(const width of [268,335,644]){
      const model=weight.chartModel(records,{today,period:'all'}),layout=weight.chartLayout(model,{width,height:354});
      assert(layout.labels.length>0);assert(layout.labels.some(label=>label.index===records.length-1),'selected latest value remains labelled');
      layout.labels.forEach((label,i)=>{assert.equal(label.text,Number(model.records[label.index].weightKg).toFixed(1));assert(label.box.left>=layout.left&&label.box.right<=width);assert(label.box.top>=0&&label.box.bottom<layout.height-25);assert(layout.labels.slice(i+1).every(other=>!overlaps(label.box,other.box)));});
    }
  }
});
test('labels alternate around close readings and selected older readings are prioritised',()=>{
  const records=series(12,i=>80+[0,.1,-.1][i%3]),model=weight.chartModel(records,{today,period:'all',selectedId:records[5].id}),layout=weight.chartLayout(model,{width:335,height:354});
  assert.equal(layout.labels[0].index,5);
  assert(layout.labels.some(label=>label.y<layout.points[label.index].y));
  assert(layout.labels.some(label=>label.y>layout.points[label.index].y));
});
test('date labels keep both endpoints and thin independently of saved points',()=>{
  const model=weight.chartModel(series(400,()=>80),{today,period:'all'});
  for(const width of [268,335,644]){const layout=weight.chartLayout(model,{width});assert.equal(layout.dateIndices[0],0);assert.equal(layout.dateIndices.at(-1),399);assert(layout.dateIndices.length<=Math.max(2,Math.floor((layout.right-layout.left)/90)));}
});
test('summary retains effective-date baseline, current, goal and signed change semantics',()=>{
  const records=[record('2025-12-01',100,'before-profile'),record('2026-01-01',90,'start'),record('2026-08-01',89,'later-marker'),record(today,82,'old'),{...record(today,83,'latest'),updatedAt:'2026-09-15T06:00:00Z'},record('2026-09-16',79,'future')];
  const summary=weight.journeySummary(records,{today,profileStart:'2026-01-01',startingWeightDate:'2026-08-01',goal:'lose',goalWeight:75,period:'7'});
  assert.equal(summary.start.id,'start');assert.equal(summary.current.id,'latest');assert.equal(summary.goalWeight,75);assert.equal(summary.totalChange,-7);assert.equal(summary.change.label,'Weight loss since start');assert.equal(summary.change.value,7);
  assert.deepEqual(weight.changeDescription(1.2,'lose'),{label:'Change since start',value:1.2,direction:'neutral'});
  assert.equal(weight.changeDescription(-1,'maintain').label,'Change since start');
  assert.equal(weight.changeDescription(0,'lose').value,0);
});
