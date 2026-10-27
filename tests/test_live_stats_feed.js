'use strict';
/* Owner-approved live feed is a fixed callback; never reflects user-provided
   code or private IDs and never skips the existing public approval builder. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('apps-script/Code.gs','utf8');
const client=fs.readFileSync('site/assets/app.js','utf8');
const cache=new Map();
let builds=0;
const context={
 PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},
 CacheService:{getScriptCache:()=>({
  get:key=>cache.get(key)||null,
  put:(key,v,ttl)=>{assert.equal(ttl,60);cache.set(key,v)}
 })},
 ContentService:{
  MimeType:{JAVASCRIPT:'text/javascript',JSON:'application/json'},
  createTextOutput:content=>({content,setMimeType(v){this.mime=v;return this}})
 },
 console
};
vm.createContext(context);vm.runInContext(code,context,{timeout:3500});
context.buildStatsFeed_=()=>{
 builds++;
 return {schema:1,public:true,reviewed:true,period:'2026-10',
  modules:{payment:{completionRate:0.881,sourceSnapshot:'2026-10-26'},
   ranking:{records:[{name:'Đảng bộ thử nghiệm',rank:1,rate:0.881}]}}};
};
let out=context.doGet({parameter:{kind:'stats-live',callback:'alert(1);',sid:'injected'}});
assert.equal(out.mime,'text/javascript');
assert.match(out.content,/^cdstuhueStatsReceive\(\{/);
assert.doesNotMatch(out.content,/alert\(1\)|injected|private_id|secret/);
let payload=JSON.parse(out.content.slice('cdstuhueStatsReceive('.length,-2));
assert.equal(payload.public,true);
assert.equal(payload.modules.payment.completionRate,0.881);
assert.equal(builds,1);
out=context.doGet({parameter:{kind:'stats-live',callback:'otherCallback'}});
assert.equal(builds,1,'Short public-cache avoids repeated expensive Sheets reads');
assert.match(out.content,/^cdstuhueStatsReceive\(/);
assert.doesNotMatch(out.content,/otherCallback/);
assert(client.includes('startLiveStats();'));
assert(client.includes("url.searchParams.set('kind','stats-live')"));
assert(client.includes('applyLiveStats(payload)'));
assert(client.includes("config('data/online-config.json')"));
assert(client.includes("config('data/questions-config.json')"));
assert(client.includes('setInterval(()=>{'));
assert(client.includes('180000'));
assert(!client.includes("url.searchParams.set('sid'"));
assert(!client.includes("url.searchParams.set('callback'"));
context.buildPublicFeed_=()=>({
 schema:1,count:1,generatedAt:'2026-10-27T08:00:00Z',
 items:[{id:'QA001',group:'tthc',question:'Câu hỏi đã duyệt',
   answer:'Câu trả lời công khai',public:true,sourceUrl:''}]
});
context.buildMenuFeed_=()=>({
 schema:1,visible:{overview:true,finance:true,units:false,assistant:true}
});
out=context.doGet({parameter:{kind:'qa-live',callback:'alert(999)',source:'private'}});
assert.equal(out.mime,'text/javascript');
assert.match(out.content,/^cdstuhueQAReceive\(\{/);
assert.doesNotMatch(out.content,/alert\(999\)|private/);
payload=JSON.parse(out.content.slice('cdstuhueQAReceive('.length,-2));
assert.equal(payload.items[0].public,true);
assert.equal(payload.items.length,1);
out=context.doGet({parameter:{kind:'menu-live',callback:'evil()'}});
assert.equal(out.mime,'text/javascript');
assert.match(out.content,/^cdstuhueMenuReceive\(\{/);
assert.doesNotMatch(out.content,/evil\(\)/);
payload=JSON.parse(out.content.slice('cdstuhueMenuReceive('.length,-2));
assert.equal(payload.visible.finance,true);
assert(client.includes("loadApprovedLiveScript('qa','cdstuhueQAReceive',applyLiveQA)"));
assert(client.includes("loadApprovedLiveScript('menu','cdstuhueMenuReceive',applyLiveMenu)"));
assert(client.includes("refreshLivePublished();"));
assert(client.includes('selectedFinanceStats()'));
assert(client.includes('Đã xuất thống kê từ cùng nguồn đã duyệt'));

console.log('Live approved stats, QA, menu, and export PASS: fixed callbacks, guarded data, automatic refresh');
