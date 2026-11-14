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
assert(data&&data.date==='2026-11-14');
const revised=['QA101','QA104','QA110','QA111','QA112','QA114','QA115','QA116','QA124'];
const added=['QA128','QA129','QA132'];
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
  assert(/^assets\/img\/v36-(?:photo-\d{2,3}|pdf)-[a-z0-9-]+\.(?:png|jpe?g)$/.test(item.src),'Only reviewed local photo crops are supported');
  const imagePath=path.join(base,'site',item.src);
  assert(fs.existsSync(imagePath),'Missing '+item.src);
  const bytes=fs.readFileSync(imagePath);
  assert(bytes.length>=1300 && bytes.length<1000000,'Tightly cropped JPEG/PNG must have plausible size');
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
assert(Object.keys(data.media).length>=9,'At least 9 complete QA have targeted UI images');
assert(Object.values(data.media).flat().length>=25,'At least 25 step-specific photo references');
assert(new Set(Object.values(data.media).flat().map(x=>x.src)).size>=35,'At least 35 unique reviewed real screenshots');
assert(data.revisions.QA110.answer.includes('QR code')&&/Đảng ủy xã\/phường/i.test(data.revisions.QA101.answer),'Guides must name actions and the appropriate institution');
for(const id of ['QA101','QA114','QA115','QA129']){
  const q=data.revisions[id]||data.newItems.find(x=>x.id===id);
  assert(/Quy trình [123]/i.test(q.question)||id==='QA114'&&/ba quy trình/i.test(q.question),'Question must name TTHC 02 sub-process or overall overview: '+id);
}
assert(data.revisions.QA114.answer.includes('QUY TRÌNH 1')&&data.revisions.QA114.answer.includes('QUY TRÌNH 2')&&data.revisions.QA114.answer.includes('QUY TRÌNH 3'));
assert(data.newItems.some(x=>x.id==='QA129'),'Process 1 has dedicated detailed QA');
assert(data.media.QA115.length>=18,'Process 2 integrates secretary download walkthrough and party-member result');
assert(data.media.QA115.every(x=>x.after&&x.reviewed),'Each screenshot must appear after its step');
assert(data.media.QA115.some(x=>x.caption.includes('Xuất kết quả xử lý')),'Include final export action');
assert(data.revisions.QA115.answer.includes('Chi tiết giấy tờ'),'Process 2 integrates party-member result download');
assert(data.media.QA129.some(x=>x.src.includes('v36-photo-117-gioi-thieu-')),'Introduction form is assigned to process 1');
assert(data.media.QA115.some(x=>x.src.includes('v36-photo-103-y-kien-lap')),'Process 2 starts with creating the list at workplace');
for(const q of [...Object.values(data.revisions),...data.newItems]){
  assert(!/video|V36_\d{3}|\d{2}:\d{2}:\d{2}|cấp có quyền|người có quyền|hình dựng lại|theo QA nền/i.test(q.question+' '+q.answer),'No internal source notes or undefined authority in QA: '+q.question);
}
for(const pics of Object.values(data.media))for(const p of pics)assert(!/video|\d{2}:\d{2}:\d{2}|V36_\d{3}/i.test(p.caption+' '+p.alt),'No source annotations in public image captions');
const old=fs.readFileSync(path.join(base,'site/assets/qa-click-guides-v35.js'),'utf8');
assert(old.includes('window.CDSTUHUE_V36_QA?.revisions?.[id]'),'Old contradictory guide must be disabled');
assert(data.media.QA115.length>=18&&data.media.QA132.length===4&&data.media.QA110.length>=5&&data.media.QA104.length===2,'Each complete workflow keeps its step-specific screenshots');
assert(data.revisions.QA115.answer.includes('QUY TRÌNH 2')&&data.revisions.QA101.answer.includes('QUY TRÌNH 3'),'Keep process 2 and 3 distinct');
assert(!Object.values(data.media).flat().some(p=>p.src.includes('ma-qr-that')),'Never publish a payable QR');
assert(!data.newItems.some(x=>['QA125','QA126','QA127','QA130','QA131','QA133','QA134'].includes(x.id)),'Do not publish duplicate fragments or separate result-step QAs');
assert(data.revisions.QA115.answer.includes('CHI BỘ NƠI CÔNG TÁC')&&data.revisions.QA115.answer.includes('CHI BỘ NƠI CƯ TRÚ')&&data.revisions.QA115.answer.includes('CHỜ PHÊ DUYỆT')===false,'Process 2 is complete end-to-end without placeholder status');
assert(data.media.QA101.length===9&&data.media.QA115.length===18,'Integrate result steps and relevant screenshots into complete workflows');
console.log('V36: 9 revised + 3 complete new QA; download steps integrated into main processes PASS');
