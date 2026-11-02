'use strict';
/* No-lookahead month transition: Vietnam midnight opens the new month,
   independent of last reviewed upload, user visits, or Apps Script state. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('site/assets/app.js','utf8');
const start=source.indexOf('function currentReportMonth(');
const end=source.indexOf('function paymentMonthControls(){',start);
assert(start>0&&end>start);
const FixedDate=class extends Date {
 constructor(...args){super(...(args.length?args:['2026-11-30T17:01:00Z']));}
 static now(){return Date.parse('2026-11-30T17:01:00Z');}
};
const ctx={Date:FixedDate,Intl,state:{
 stats:{period:'2026-11',public:true,reviewed:true,modules:{payment:{completionRate:0.9}}},
 paymentArchive:null,paymentHistory:[{period:'2026-10',closed:true}]
}};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx,{timeout:2500});
assert.equal(ctx.currentReportMonth(new Date('2026-11-30T16:59:59Z')),'2026-11');
assert.equal(ctx.currentReportMonth(new Date('2026-11-30T17:00:00Z')),'2026-12');
assert.equal(ctx.currentReportMonth(new Date('2026-12-01T17:01:00Z')),'2026-12');
assert.equal(ctx.currentReportMonth(),'2026-12');
assert.equal(ctx.selectedFinanceStats(),null,
 'Never present approved November values as live December values');
let months=ctx.paymentMonths();
assert.equal(months[0].period,'2026-12');
assert.equal(months[0].waiting,true);
assert.equal(months[1].period,'2026-11');
assert.equal(months[1].pendingClose,true);
assert.equal(months[2].period,'2026-10');
assert.equal(months[2].closed,true);
ctx.state.paymentHistory.unshift({period:'2026-11',closed:true});
months=ctx.paymentMonths();
assert.equal(months[1].closed,true);
assert.equal(months[1].pendingClose,undefined);
const archive={period:'2026-11',closed:true,modules:{payment:{completionRate:0.9}}};
ctx.state.paymentArchive=archive;
assert.equal(ctx.selectedFinanceStats(),archive,'Closed November is not mutated by December');
ctx.state.paymentArchive=null;
ctx.state.stats={period:'2026-12',public:true,reviewed:true};
assert.equal(ctx.selectedFinanceStats(),ctx.state.stats);
assert.equal(ctx.paymentMonths()[0].waiting,false);
console.log('Vietnam reporting-calendar rollover and approved-month archive PASS');


/* Regression: load the ACTUAL frozen October index and its 46 public rows
   through the same code paths as the live dropdown. Previous /^20\\d/
   silently rejected 2026-10, even though the archive was not deleted. */
async function verifyRealArchivedOctober(){
 const start=source.indexOf(" const archiveTask=read('data/payment-history.json').then(idx=>{");
 const end=source.indexOf("\n await Promise.all([menuTask",start);
 assert(start>=0&&end>start,'Archive index loader must exist');
 const historyState={paymentHistory:[],view:'finance'};
 let renderCount=0;
 const loader={state:historyState,
   read:async path=>{
     assert.equal(path,'data/payment-history.json');
     return JSON.parse(fs.readFileSync('site/'+path,'utf8'));
   },
   render:()=>{renderCount++}
 };
 vm.createContext(loader);
 await vm.runInContext('(async()=>{'+source.slice(start,end)+'\nawait archiveTask;})()',loader,{timeout:3000});
 assert.deepEqual(historyState.paymentHistory.map(x=>x.period),['2026-10'],
   'October must survive the LIVE history-index filter, not a mock selector');
 assert.equal(historyState.paymentHistory[0].closed,true);
 assert.equal(renderCount,1,'Archived month must trigger a new finance render');
 const full=JSON.parse(fs.readFileSync('site/data/payment-history/2026-10.json','utf8'));
 assert.equal(full.period,'2026-10');
 assert.equal(full.closed,true);
 assert.equal(full.public,true);
 assert.equal(full.reviewed,true);
 assert.equal(full.modules.ranking.records.length,46);
 const selectStart=source.indexOf('async function selectPaymentMonth(month){');
 const selectEnd=source.indexOf('function paymentFilteredRecords(',selectStart);
 assert(selectStart>0&&selectEnd>selectStart);
 const archiveState={paymentArchive:null,paymentHistory:historyState.paymentHistory,
   paymentQuery:'old',paymentStatus:'complete',paymentSort:'name'};
 const errors=[];
 const selector={state:archiveState,currentReportMonth:()=> '2026-11',
   fetch:async path=>{
     assert.equal(path,'data/payment-history/2026-10.json');
     return {ok:true,json:async()=>JSON.parse(fs.readFileSync('site/'+path,'utf8'))};
   },
   toast:message=>{errors.push(message)},render:()=>{}
 };
 vm.createContext(selector);
 vm.runInContext(source.slice(selectStart,selectEnd)+
   '\nthis.selectPaymentMonth=selectPaymentMonth;',selector,{timeout:3000});
 await selector.selectPaymentMonth('2026-10');
 assert.equal(errors.length,0,'October must be readable');
 assert.equal(archiveState.paymentArchive?.period,'2026-10');
 assert.equal(archiveState.paymentArchive.modules.ranking.records.length,46);
 assert.equal(archiveState.paymentArchive.modules.payment.completionRate,full.modules.payment.completionRate);
 assert.equal(archiveState.paymentQuery,'');
 assert.equal(archiveState.paymentStatus,'all');
 assert.equal(archiveState.paymentSort,'rank');
 console.log('Real October 2026 archived index, dropdown and 46-row retrieval PASS');
}
verifyRealArchivedOctober().catch(e=>{console.error(e);process.exitCode=1;});
