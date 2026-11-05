const assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('site/assets/app.js','utf8');
const qaPage=fs.readFileSync('site/hoi-dap.html','utf8');
// This public QA page omits optional "ask a new question" controls.
// Missing controls may not abort boot before approved.json is fetched.
assert(!qaPage.includes('id="askToggle"'));
assert(!qaPage.includes('id="questionForm"'));
assert(app.includes("if($('#askToggle'))$('#askToggle').onclick="));
assert(app.includes("if($('#questionForm'))$('#questionForm').onsubmit="));
assert(app.includes("if(!notice||!submit||!form)return;try{"));
assert(app.includes("syncFromUrl();loadData();const clock="));
assert(app.includes("const qaTask=read('data/approved.json')"));
assert(app.includes("setTimeout(finalizeQaLoadFromTimeout,12000)"));
const approved=JSON.parse(fs.readFileSync('site/data/approved.json','utf8'));
assert.equal(approved.items.length,245);
console.log('QA bootstrap optional-controls regression PASS (245 approved QA untouched)');