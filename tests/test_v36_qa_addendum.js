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
assert(data&&data.date==='2026-11-10');
const revised=['QA101','QA104','QA110','QA112','QA114','QA115','QA116'];
const added=['QA125','QA126','QA127','QA128'];
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
assert(app.includes('v36Gallery(x)'));
for(const [id,images] of Object.entries(data.media)){
 assert(revised.includes(id)||added.includes(id),'Only V36 QA can receive a graphic');
 for(const item of images){
  assert(/^assets\/img\/v36-qa-[a-z-]+\.svg$/.test(item.src),'Local picture must be whitelisted');
  const imagePath=path.join(base,'site',item.src);
  assert(fs.existsSync(imagePath),'Missing '+item.src);
  const svg=fs.readFileSync(imagePath,'utf8');
  assert(svg.includes('<svg')&&svg.includes('KHÔNG PHẢI ẢNH CHỤP'),'Must clearly label source diagram');
  assert(!/NGUYỄN THỊ NGỌC ANH|HỒ MỘNG TOÀN|040301000715|CCCD:[0-9]{9,12}/i.test(svg),'No private identifiers');
 }
}
assert(!data.media.QA113&&!data.media.QA128,'Do not assign 6-cell screenshot to temporary 8-cell procedure');
const old=fs.readFileSync(path.join(base,'site/assets/qa-click-guides-v35.js'),'utf8');
assert(old.includes('window.CDSTUHUE_V36_QA?.revisions?.[id]'),'Old contradictory guide must be disabled');
console.log('V36 editorial QA (7 edited + 4 new), top priority, picture privacy and sources PASS');
