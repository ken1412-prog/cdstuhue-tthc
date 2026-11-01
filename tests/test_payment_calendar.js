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
