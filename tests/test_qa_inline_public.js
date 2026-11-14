'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('site/assets/app.js');
const overlay=read('site/assets/tthc-20261105.js');
const approved=JSON.parse(read('site/data/approved.json')).items;
const env={window:{}};
vm.runInNewContext(read('site/assets/qa-v36-20261110.js'),env);
const qa=env.window.CDSTUHUE_V36_QA;
const cut=app.slice(app.indexOf('function cleanPublishedQA('),app.indexOf('const normQA ='));
assert(cut.includes('window.CDSTUHUE_CLEAN_QA=cleanPublishedQA'),'Single QA cleaning function must be exported');
const clean=new Function('window',cut+'return window.CDSTUHUE_CLEAN_QA;')({});
const native=approved.find(x=>x.id==='QA124');
assert(native&&native.answer.includes('github.io'),'Keep original signed-off QA source intact');
const changed=approved.filter(x=>clean(x.answer)!==x.answer);
assert(changed.length===10,'Exactly ten original QA answers have site self-links removed');
for(const q of approved){
 const result=clean(q.answer);
 assert(!/ken1412-prog\.github\.io\/cdstuhue-tthc|github\.com\/ken1412-prog\/cdstuhue-tthc/.test(result),'No internal GitHub links in QA '+q.id);
 assert(result.length>0,'Do not empty any QA '+q.id);
}
assert(clean(approved.find(x=>x.id==='CSDL001').answer).includes('https://tcxdd.dcs.vn/dangvien'),'Keep actionable official service URLs');
const c=overlay.match(/const corrections=(\{[^\n]+\});/);
assert(c,'Find original 05/11 correction data');
const corrections=JSON.parse(c[1]);
for(const [id,patch] of Object.entries(corrections)){
 if(patch.answer)assert(!/github\.io\/cdstuhue-tthc/.test(clean(patch.answer)),'No old correction URL in '+id);
}
const modal=app.slice(app.indexOf('function openQA(id)'),app.indexOf('function closeQA()',app.indexOf('function openQA(id)')));
assert(!modal.includes('source-label')&&!modal.includes('Nguồn công khai')&&!modal.includes('publicNote'),'No extra source/technical metadata block in popup');
const overlayUI=overlay.slice(overlay.indexOf('function applyModal()'),overlay.indexOf('function applyCards()'));
assert(!overlayUI.includes('Xem hướng dẫn thao tác 04 TTHC'),'Do not auto-append handbook links');
assert(overlayUI.includes('CDSTUHUE_CLEAN_QA'),'Old overlay must use the same text sanitizer');
const pics=Object.values(qa.media).flat();
assert(pics.length===57,'Preserve reviewed images and 40 new step-specific PDF screenshot placements');
for(const [id,items] of Object.entries(qa.media)){
 const answer=(qa.revisions[id]||qa.newItems.find(x=>x.id===id)).answer;
 const lines=answer.split(/\n+/).map(line=>line.trim()).filter(Boolean);
 for(const item of items){
  assert(item.reviewed===true,'Only approved pictures');
  assert(lines.filter(line=>line.startsWith(item.after)).length===1,'Every picture belongs to one exact instruction: '+id);
 }
}
const from=app.indexOf('function qaAllocationVisual()');
const to=app.indexOf('function openQA(id)',from);
assert(from>=0&&to>from,'Find inline photo and financial visual renderer');
const render=new Function('state','window','E',app.slice(from,to)+'return qaAnswerContent;')(
 {demo:false},{CDSTUHUE_V36_QA:qa},
 x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
);
const example={id:'QA101',...qa.revisions.QA101};
const page=render(example);
assert(page.includes('qa-inline-photo'),'Images are embedded inside answer');
assert(page.indexOf('2. Vào Quản lý Đảng viên')<page.indexOf('v36-pdf-bi-thu-nhan-xet-chu-dong')&&page.indexOf('v36-pdf-bi-thu-nhan-xet-chu-dong')<page.indexOf('3. Kiểm tra'),'First process 3 photo follows the correct action');
assert((page.match(/class="qa-inline-photo"/g)||[]).length===3,'Three focused process 3 screenshots appear');
const finance=render({...native,answer:clean(corrections.QA124.answer)});
assert(finance.includes('qa-alloc-inline')&&finance.includes('<table>'),'Financial comparison is embedded rather than linked');
assert(finance.includes('30% × 30.000 đồng')&&!finance.includes('github.io'),'Correct remainder calculation without external navigation');
console.log('Public QA inline images and clean self-reference display PASS');
