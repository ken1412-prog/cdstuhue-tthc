'use strict';
/* Offline test of the public Apps Script online-session counter.
 * It must not rely on Sheets, identify visitors, or invent a count.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const storage=new Map();
let now=1700000000000;
let releases=0;
const lock={tryLock:()=>true,releaseLock:()=>{releases++}};
const ctx={
 PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},
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
vm.runInNewContext(fs.readFileSync('apps-script/Code.gs','utf8'),ctx,{timeout:3000});
const id1='a'.repeat(32),id2='b'.repeat(32);
const req=id=>({parameter:{kind:'presence',sid:id}});
assert.equal(ctx.cdstuhuePresence_(req('bad')).ok,false);
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
console.log('Presence: anonymous sessions, dedupe, 3-minute expiry and fixed JSONP PASS');
