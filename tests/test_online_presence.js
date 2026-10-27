'use strict';
/* Offline test of the public Apps Script online-session counter.
 * It must not rely on Sheets, identify visitors, or invent a count.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const storage=new Map(),persisted=new Map();
let now=1700000000000;
let releases=0;
const lock={tryLock:()=>true,releaseLock:()=>{releases++}};
const ctx={
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>persisted.get(key)||null,setProperty:(key,val)=>persisted.set(key,val)})},
 CacheService:{getScriptCache:()=>({
  get:key=>storage.get(key)||null,
  put:(key,value)=>{storage.set(key,value)}
 })},
 LockService:{getScriptLock:()=>lock},
 ContentService:{
  MimeType:{JAVASCRIPT:'text/javascript',JSON:'application/json'},
  createTextOutput:value=>({content:value,setMimeType(mime){this.mime=mime;return this}})
 },
 Date:{now:()=>now},
 console
};
const frontend=fs.readFileSync('site/assets/app.js','utf8');
assert.match(frontend,/searchParams\.set\('visitor',sid\)/);
assert(frontend.includes("u.searchParams.set('visit',visit)"));
assert.doesNotMatch(frontend,/searchParams\.set\(['"](sid|c)['"]/);
const backend=fs.readFileSync('apps-script/Code.gs','utf8');
assert.match(backend,/parameters\.visitor/);
assert.doesNotMatch(backend,/parameters\.sid/);
vm.runInNewContext(fs.readFileSync('apps-script/Code.gs','utf8'),ctx,{timeout:3000});
const id1='a'.repeat(32),id2='b'.repeat(32);
const req=id=>({parameter:{kind:'presence',visitor:id}});
assert.equal(ctx.cdstuhuePresence_(req('bad')).ok,false);
// Apps Script reserves 'sid' and 'c' URL parameters: never send them.
assert.ok(!req('safe').parameter.sid);
assert.ok(!req('safe').parameter.c);
let a=ctx.cdstuhuePresence_(req(id1));
assert.equal(a.online,1);
assert.equal(a.windowSeconds,180);
a=ctx.cdstuhuePresence_(req(id1));
assert.equal(a.online,1,'repeat same browser should not grow counter');
a=ctx.cdstuhuePresence_(req(id2));
assert.equal(a.online,2,'a second browser increases count');
assert.equal(JSON.stringify(a).includes(id1),false);
assert.equal(JSON.stringify(a).includes(id2),false);
const response=ctx.doGet(req(id1));
assert.equal(response.mime,'text/javascript');
assert.match(response.content,/^cdstuhueOnlineReceive\(\{.*\}\);$/);
assert.doesNotMatch(response.content,/a{32}|b{32}/);
now+=180001; // sessions without fresh pings must age out
a=ctx.cdstuhuePresence_(req(id2));
assert.equal(a.online,1);
assert.ok(releases>=4);
assert.equal(a.totalVisits,123);
const visitA='c'.repeat(32),visitB='d'.repeat(32);
let count=ctx.cdstuhuePresence_({parameter:{visitor:id1,visit:visitA}});
assert.equal(count.totalVisits,124);
count=ctx.cdstuhuePresence_({parameter:{visitor:id1,visit:visitA}});
assert.equal(count.totalVisits,124,'same visit must not increment');
count=ctx.cdstuhuePresence_({parameter:{visitor:id2,visit:visitA}});
assert.equal(count.totalVisits,124,'two tabs sharing token do not increment');
count=ctx.cdstuhuePresence_({parameter:{visitor:id2,visit:visitB}});
assert.equal(count.totalVisits,125);
assert.equal(persisted.get('CDSTUHUE_TOTAL_VISITS_V1'),'125');
storage.delete('CDSTUHUE_PRESENCE_V1');
count=ctx.cdstuhuePresence_(req(id1));
assert.equal(count.totalVisits,125,'total not lost on presence cache eviction');
assert.equal(JSON.stringify(count).includes(visitB),false);
count=ctx.cdstuhuePresence_({parameter:{visitor:id2,visit:'bad'}});
assert.equal(count.totalVisits,125);
console.log('Online and total visit counts PASS: 123 baseline, stored cumulatively, deduplicated');
