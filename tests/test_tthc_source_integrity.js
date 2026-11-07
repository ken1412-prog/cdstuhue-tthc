const assert=require('node:assert/strict'),fs=require('node:fs');
const mapping=JSON.parse(fs.readFileSync('scripts/tthc_qa_corrections_20261105.json','utf8'));
const script=fs.readFileSync('site/assets/tthc-20261105.js','utf8');
const app=fs.readFileSync('site/assets/app.js','utf8');
const approved=JSON.parse(fs.readFileSync('site/data/approved.json','utf8'));
assert.equal(mapping.count,44);assert.equal(Object.keys(mapping.changes).length,44);
assert.ok(approved.items.length>=245, 'Approved QA count must not unexpectedly shrink');
assert(script.includes('window.CDSTUHUE_TTHC_CORRECTIONS=Object.freeze(corrections)'));
assert(script.includes('Trả lời cập nhật 05/11/2026'));
assert(!script.includes('Xem câu trả lời trước cập nhật'));
assert(app.includes('window.CDSTUHUE_TTHC_CORRECTIONS?.[id]'));
for(const [id,v] of Object.entries(mapping.changes))assert(v.answer.length>=70&&approved.items.some(x=>x.id===id));
for(const name of ['index.html','hoi-dap.html']){
 const html=fs.readFileSync('site/'+name,'utf8');
 const patchTag='assets/tthc-20261105.js?v=20261105-v41-qa-source',appTag='assets/app.js?v=20261102-qa-retry-fallback-v12-v41-source-qa';
 assert(html.includes(patchTag)&&html.includes(appTag));
 assert(html.indexOf(patchTag)<html.indexOf(appTag),'Patch must load before app to update source QA on first render');
}
console.log('Reviewed QA source overlay PASS – 44 corrected, '+approved.items.length+' retained');