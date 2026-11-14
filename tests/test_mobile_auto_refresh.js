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
 assert(src.includes("firstPublicSync=false;\n updateGlobal();render();\n setTimeout(finalizeQaLoadFromTimeout,12000);\n startLiveStats();\n loadData();}"),
  'Render public navigation immediately, then fetch published data');
 assert(src.includes("menuReady:true"),'Verified public menu bootstraps the first screen');
 assert(src.includes("const menuTask=read('data/menu.json')"),'Menu refresh runs asynchronously');
 assert(src.includes("const qaTask=read('data/approved.json')"),'QA refresh runs independently');
 assert(src.includes("const statsTask=read('data/stats.json')"),'Stats refresh runs independently');
 assert(src.includes("await Promise.all([menuTask,qaTask,progressTask,financeTask,statsTask,archiveTask])"),
  'Independent public JSON requests must be concurrent');
 assert(src.includes("controller.abort()"),'Unresponsive requests must have a timeout');
 assert(src.includes('Đang kiểm tra danh sách câu hỏi đã duyệt công khai…'),'QA loading must be explicit, not empty');
 assert(src.includes('class="panel cds-qa-loading" aria-busy="true"'),'QA loading must be accessible and non-blocking');
 assert(src.includes("statsCheck:'checking'"),
  'A network pending state must not claim approval is missing');
 assert(src.includes("state.statsCheck='not-approved'"),
  'Only explicit unapproved response can display not-approved state');
 assert(!src.includes('Chờ kiểm tra và duyệt dữ liệu của kỳ mới.'),
  'Never present an unverified loading state as an approval failure');
 const firstPaint=src.slice(src.indexOf('async function loadDataCore(){'),
  src.indexOf('/* Live approved statistics:'));
 assert(firstPaint.includes('await Promise.all([menuTask,qaTask,progressTask,financeTask,statsTask,archiveTask])'),
  'All public JSON sources must run in parallel');
 assert(!firstPaint.includes('await Promise.all([refreshLiveStats()'),
  'A slow public endpoint must never block the first paint');
 assert(!src.includes('Đang kiểm tra dữ liệu công khai mới nhất…'),
  'Do not insert a blocking full-page loading card');
 assert(src.includes('if(!liveSourceAccepted.stats){'));
 assert(src.includes('if(!liveSourceAccepted.qa){'));
 assert(src.includes('if(!liveSourceAccepted.menu)state.menu='));
 assert(src.includes('if(hadError)scheduleDataLoadRecovery();'));
 assert(html.includes('20261114-qa-workflow-v9'));
 const qaGuard=between('function finalizeQaLoadFromTimeout(){','\nfunction boot(){');
 const guarded={state:{qaLoading:true,demo:false,qa:[],qaLoadError:false},
   updateGlobal:()=>{},render:()=>{}};
 vm.createContext(guarded);
 vm.runInContext(qaGuard+'\nthis.finalizeQa=finalizeQaLoadFromTimeout;',guarded);
 guarded.finalizeQa();
 assert.equal(guarded.state.qaLoading,false);
 assert.equal(guarded.state.qaLoadError,true,
   'Mobile QA spinner must stop if the feed hangs past twelve seconds');
 guarded.state.qa=[{id:'PUBLIC001'}];guarded.state.qaLoading=true;
 guarded.finalizeQa();
 assert.equal(guarded.state.qaLoadError,false,
   'Approved QA kept when a late network request stalls');
 assert(src.includes('data-action="retry-qa"'),
   'QA error screen must offer manual retry');
 assert(headers.includes('/assets/app.js'));
 console.log('Mobile auto-refresh PASS: startup retry, endpoint retry, tab restore and version bust');
}
main().catch(err=>{console.error(err);process.exitCode=1});
