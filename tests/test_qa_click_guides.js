const assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('site/assets/qa-click-guides-v35.js','utf8');
const allowed=['QA046','QA091','QA110','QA111','QA115','QA116'];
for(const id of allowed)assert(app.includes('"'+id+'":'),'Missing guide '+id);
for(const id of ['QA112','QA113','QA114'])assert(!app.includes('"'+id+'":'),'Unverified guide '+id);
assert(app.includes("MutationObserver"),'Attach only after approved answer render');
assert(app.includes("document.createElement"),'Build DOM without source HTML injection');
assert(app.includes("body.querySelector('.qa-click-guide')"),'No duplicate guide');
assert(app.includes('MINH HỌA'),'Do not leak real info into demo');
assert(app.includes("body.querySelector('.answer')?.append(section)"),'Only append optional practical steps within the approved answer');
assert(!app.includes("sources.append(make('b','','Tài liệu đối chiếu:'))"),'Do not re-add source blocks');
assert(app.includes('qa-dang-phi-5-buoc-v35.svg'));
const orig=JSON.parse(fs.readFileSync('site/data/approved.json','utf8'));
assert.ok(orig.items.length>=245, 'Approved QA count must not unexpectedly shrink');
for(const page of ['site/index.html','site/hoi-dap.html']){
 const html=fs.readFileSync(page,'utf8');
 assert(html.includes('assets/qa-click-guides-v35.js?v=20261114-qa-workflow-v7'));
 assert(html.includes('assets/qa-click-guides-v35.css?v=20261102-v35'));
}
console.log('QA click guides PASS: '+orig.items.length+' approved QA, safe DOM and diagram');
