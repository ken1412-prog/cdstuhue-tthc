'use strict';
// Regression guard: mobile initial-load failures must recover automatically,
// and a missing public endpoint must NOT be cached forever.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('site/assets/app.js','utf8');
const html=fs.readFileSync('site/index.html','utf8');
const headers=fs.readFileSync('site/_headers','utf8');
const between=(a,b)=>{
 const p=src.indexOf(a),q=src.indexOf(b,p+1);
 assert(p>=0&&q>p,'Unable to find target for test: '+a);
 return src.slice(p,q);
};
async function main(){
 const endpointCode=between('function readLiveStatsEndpoint(){','\nfunction applyLiveStats(');
 let tries=0,broken=true;
 const endpointCtx={
  URL,
  fetch:async url=>{
   tries++;
   if(broken)throw Error('Mobile network not ready');
   assert.equal(url,'data/online-config.json');
   return {ok:true,json:async()=>({schema:1,endpoint:
    'https://script.google.com/macros/s/ABC123xyz/exec'})};
  }
 };
 vm.createContext(endpointCtx);
 vm.runInContext('let liveStatsEndpointPromise=null;\n'+endpointCode+
  '\nthis.getEndpoint=readLiveStatsEndpoint;',endpointCtx);
 assert.equal(await endpointCtx.getEndpoint(),null);
 assert.equal(tries,2,'Both source configurations were tried');
 broken=false;
 const endpoint=await endpointCtx.getEndpoint();
 assert.equal(endpoint.hostname,'script.google.com');
 assert.equal(tries,3,'Failed discovery was retried, not memoized forever');
 await endpointCtx.getEndpoint();
 assert.equal(tries,3,'Successful discovery is cached for the session');
 const retryCode=between('function scheduleDataLoadRecovery(){','\nasync function loadDataCore(');
 const jobs=[];let loads=0;
 const recoveryCtx={
  state:{demo:false,local:false,stats:null,qa:[]},
  lastStaticLoadHadError:true,
  document:{visibilityState:'visible'},
  setTimeout:(fn,ms)=>{jobs.push({fn,ms});return jobs.length},
  loadData:()=>{loads++}
 };
 vm.createContext(recoveryCtx);
 vm.runInContext('let dataLoadRetryTimer=null,dataLoadRetryAttempts=0;\n'+retryCode+
  '\nthis.recover=scheduleDataLoadRecovery;',recoveryCtx);
 recoveryCtx.recover();
 recoveryCtx.recover();
 assert.equal(jobs.length,1,'At most one automatic retry per failure');
 assert.equal(jobs[0].ms,5000);
 jobs[0].fn();
 assert.equal(loads,1,'Automatically retry network failures without pressing button');
 recoveryCtx.lastStaticLoadHadError=false;
 recoveryCtx.state.stats={schema:1};
 recoveryCtx.state.qa=[{id:'QA001'}];
 recoveryCtx.recover();
 jobs[1].fn();
 assert.equal(loads,1,'No fetch loop when recovery data exists');
 assert(src.includes("window.addEventListener('pageshow',e=>{"));
 assert(src.includes("if(e.persisted&&!state.demo&&!state.local)"));
 assert(src.includes("if(lastStaticLoadHadError)loadData();"),
  'Only retry failed static network loads, not correctly empty approved data');
 assert(src.includes('startLiveStats();'));
 assert(src.includes('await Promise.all([refreshLiveStats(),refreshLivePublished()]);'));
 assert(src.includes('if(!liveSourceAccepted.stats)state.stats='));
 assert(src.includes('if(!liveSourceAccepted.qa)state.qa='));
 assert(src.includes('if(!liveSourceAccepted.menu)state.menu='));
 assert(src.includes('if(lastStaticLoadHadError)scheduleDataLoadRecovery();'));
 assert(html.includes('20261031-live-first-v2'));
 assert(headers.includes('/assets/app.js'));
 console.log('Mobile auto-refresh PASS: startup retry, endpoint retry, tab restore and version bust');
}
main().catch(err=>{console.error(err);process.exitCode=1});
