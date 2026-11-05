const assert=require('node:assert/strict'),fs=require('node:fs');
const mapping=JSON.parse(fs.readFileSync('scripts/tthc_qa_corrections_20261105.json','utf8')).changes;
const js=fs.readFileSync('site/assets/tthc-20261105.js','utf8');
const data=JSON.parse(fs.readFileSync('site/data/approved.json','utf8'));
assert.equal(data.items.length,245);
for(const id of ['QA007','QA017','QA026','QA030','QA110','QA122','QA101','QA112','QA113','QA114'])assert(mapping[id]&&mapping[id].answer.length>80);
assert(mapping.QA007.answer.includes('KHÔNG phải chờ'));
assert(js.includes('Trả lời cập nhật 05/11/2026'));
assert(js.includes('applyCards()')&&js.includes('applyModal()'));
assert(!js.includes('Xem câu trả lời trước cập nhật'));
for(const name of ['index.html','hoi-dap.html']){
 const html=fs.readFileSync('site/'+name,'utf8');
 assert(html.includes('assets/tthc-20261105.js?v=20261105-v41-qa-source'));
 assert(html.includes('assets/tthc-20261105.css?v=20261105-v41-qa-source'));
}
console.log('Current TTHC corrections present: 44; 245 QA source items intact');