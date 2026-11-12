'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const raw=fs.readFileSync(path.join(base,'site/assets/qa-v36-20261110.js'),'utf8');
const env={window:{}};
vm.runInNewContext(raw,env);
const data=env.window.CDSTUHUE_V36_QA;
assert(data&&data.date==='2026-11-12');
const revised=['QA101','QA104','QA110','QA111','QA112','QA114','QA115','QA116','QA124'];
const added=['QA125','QA126','QA127','QA128','QA129'];
assert.deepEqual(Object.keys(data.revisions).sort(),revised.sort());
assert.deepEqual(Array.from(data.newItems,x=>x.id).sort(),added.sort());
assert(data.newItems.every(x=>x.public===true&&x.group==='tthc'&&x.answer.length>100));
const fallback=JSON.parse(fs.readFileSync(path.join(base,'site/data/approved.json'),'utf8'));
assert(fallback.items.length>=245);
assert(new Set(fallback.items.map(x=>x.id)).size===fallback.items.length);
assert(revised.every(id=>fallback.items.some(x=>x.id===id)),'Existing reviewed QA must remain in fallback');
assert(added.every(id=>!fallback.items.some(x=>x.id===id)),'New V36 QA are standalone editorial additions');
const app=fs.readFileSync(path.join(base,'site/assets/app.js'),'utf8');
assert(app.includes('state.qa=withV36QA(filtered)'));
assert(app.includes('const next=withV36QA(parsed)'));
assert(app.includes('V36_NEW.has(x.id)?5:V36_EDITED.has(x.id)?4'));
assert(app.includes('qaAnswerContent(x)'),'Answer must include images inline after relevant step');
assert(!app.includes('v36Gallery(x)'),'Do not prepend an unrelated image gallery');
for(const [id,images] of Object.entries(data.media)){
 assert(revised.includes(id)||added.includes(id),'Only V36 QA can receive a graphic');
 for(const item of images){
  assert(/^assets\/img\/v36-photo-\d{2,3}-[a-z0-9-]+\.(?:png|jpe?g)$/.test(item.src),'Only reviewed local photo crops are supported');
  const imagePath=path.join(base,'site',item.src);
  assert(fs.existsSync(imagePath),'Missing '+item.src);
  const bytes=fs.readFileSync(imagePath);
  assert(bytes.length>=12000 && bytes.length<1000000,'Real sanitized crop must have plausible size');
  assert(item.reviewed===true,'Every photo must be individually approved for this QA');
  assert(typeof item.after==='string'&&item.after.length>5,'Photo must be anchored to an exact QA step');
  const qa=data.revisions[id]||data.newItems.find(x=>x.id===id);
  const hit=qa.answer.split(/\n+/).map(line=>line.trim()).filter(line=>line.startsWith(item.after));
  assert(hit.length===1,'Photo must resolve to exactly one answer step in '+id+': '+item.after);
  const isJpeg=bytes[0]===0xff&&bytes[1]===0xd8;
  const isPng=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  assert(isJpeg||isPng,'Invalid sanitized raster');
 }
}
assert(!data.media.QA113&&!data.media.QA128,'Do not assign 6-cell screenshot to temporary 8-cell procedure');
assert(Object.keys(data.media).length>=11,'At least 11 QA have targeted UI images');
assert(Object.values(data.media).flat().length>=25,'At least 25 step-specific photo references');
assert(new Set(Object.values(data.media).flat().map(x=>x.src)).size===20,'Exactly 20 unique reviewed screenshots');
assert(data.revisions.QA110.answer.includes('1. ĐẢNG VIÊN')&&data.revisions.QA101.answer.includes('ĐẢNG ỦY XÃ/PHƯỜNG NƠI CƯ TRÚ'),'Guides must name actors and explicit actions');
for(const id of ['QA101','QA114','QA115','QA125','QA126','QA127','QA129']){
  const q=data.revisions[id]||data.newItems.find(x=>x.id===id);
  assert(/Quy trình [123]/i.test(q.question),'Question must name TTHC 02 sub-process: '+id);
}
assert(data.revisions.QA114.answer.includes('QUY TRÌNH 1')&&data.revisions.QA114.answer.includes('QUY TRÌNH 2')&&data.revisions.QA114.answer.includes('QUY TRÌNH 3'));
assert(data.newItems.some(x=>x.id==='QA129'),'Process 1 has dedicated detailed QA');
assert(data.media.QA129.some(x=>x.src.includes('v36-photo-117-gioi-thieu-')),'Introduction form is assigned to process 1');
assert(!data.media.QA126.some(x=>x.src.includes('v36-photo-117-')),'Do not mislabel introduction as process 2');
for(const q of [...Object.values(data.revisions),...data.newItems]){
  assert(!/video|V36_\d{3}|\d{2}:\d{2}:\d{2}|cấp có quyền|người có quyền|hình dựng lại|theo QA nền/i.test(q.question+' '+q.answer),'No internal source notes or undefined authority in QA: '+q.question);
}
for(const pics of Object.values(data.media))for(const p of pics)assert(!/video|\d{2}:\d{2}:\d{2}|V36_\d{3}/i.test(p.caption+' '+p.alt),'No source annotations in public image captions');
const old=fs.readFileSync(path.join(base,'site/assets/qa-click-guides-v35.js'),'utf8');
assert(old.includes('window.CDSTUHUE_V36_QA?.revisions?.[id]'),'Old contradictory guide must be disabled');
console.log('V36 verified: 9 revised + 5 new QA, residence procedures 1/2/3 separated, exact authorities and clean photo captions PASS');
