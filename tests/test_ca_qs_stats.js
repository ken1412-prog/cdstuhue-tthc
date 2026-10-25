/* Synthetic Apps Script regression: never read person names or account numbers.
 * This fixture deliberately reuses a generic Chi bộ name in an excluded branch
 * and an included branch, proving that name-only filtering is unsafe. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const policies = [
 ['TỔNG HỢP THU NỘP','ĐÃ DUYỆT','','2026-10-25',''],
 ['XẾP HẠNG 46 ĐƠN VỊ','ĐÃ DUYỆT','','2026-10-25','HS_FILED_XY_BY_LEVEL2 HS_FILING_STATUS_SUMMARY_46'],
 ['CHƯA KHAI BÁO THEO ĐƠN VỊ CHA','ĐÃ DUYỆT','','2026-10-25',''],
 ['XÁC NHẬN PHÂN BỔ','CHỜ DUYỆT','','',''],
 ['TÀI KHOẢN NGÂN HÀNG','ĐÃ DUYỆT','','2026-10-25','BANK_XY_BY_LEVEL2']
];
const ids = ['PAYMENTS_SOURCE_2026_OCTOBER','MISSING_SOURCE_2026_OCTOBER',
             'ALLOCATION_SOURCE_2026_OCTOBER','BANKING_SOURCE_2026_OCTOBER'];
const keys = ['THU_NOP','CHUA_KHAI','PHAN_BO','NGAN_HANG'];
const sourceRows = keys.map((key,i)=>[key,key,ids[i],'Raw','','2026-10-24','','RIÊNG TƯ']);
const payments = Array.from({length:46},(_,i)=>{
 const row = Array(14).fill(0);
 row[0]=i+1;row[1]='Đảng bộ đơn vị '+(i+1);row[2]=100;
 row[7]=10;row[8]=10;row[9]=50;row[10]=30;
 row[11]=100;row[12]=80;
 return row;
});
const bank = [{code:'A57',name:'Đảng bộ Thành phố Huế',
               parent:'4',parentName:'Đơn vị cao nhất',state:'Đã có tài khoản ngân hàng'}];
for(let i=1;i<=46;i++){
 bank.push({code:'A57.U'+i,name:'Đảng bộ đơn vị '+i,parent:'A57',
  parentName:'Đảng bộ Thành phố Huế',state:'Đã có tài khoản ngân hàng'});
}
bank.push({code:'A57.U1.01',name:'Chi bộ 1',parent:'A57.U1',
 parentName:'Đảng bộ đơn vị 1',state:'Chưa có tài khoản ngân hàng'});
// 107 military / border guard + 1 police sub-branch.
for(let i=0;i<107;i++){
 bank.push({code:i<80?'A57.12.'+(i+1):'A57.13.'+(i+1),
  name:i===0?'Chi bộ 1':'Chi bộ Loại '+i,
  parent:i===80?'A57.13.17':(i<80?'A57.12':'A57.13'),
  parentName:i===80?'Đảng bộ Đồn Biên phòng Phong Hải':
    (i<80?'Đảng bộ Quân sự':'Đảng bộ Biên phòng'),
  state:'Chưa có tài khoản ngân hàng'});
}
bank.push({code:'A57.121.39.03',name:'Chi bộ An Ninh',
 parent:'A57.121.39',parentName:'Đảng bộ Công an phường Thủy Xuân',
 state:'Chưa có tài khoản ngân hàng'});

const missing = [
 {unit:'Chi bộ 1',parent:'Đảng bộ Quân sự'},    // exclude by exact pair
 {unit:'Chi bộ Loại 1',parent:'Đảng bộ Quân sự'}, // exclude by exact pair
 {unit:'Chi bộ lạ',parent:'Chi bộ Loại 2'},     // exclude by unique verified parent
 {unit:'Chi bộ 1',parent:'Đảng bộ đơn vị 1'},   // preserve: same name, other parent
 {unit:'Chi bộ 1',parent:'Đảng bộ khác'},       // preserve: ambiguous name
 {unit:'Chi bộ phòng kế toán',parent:'Đảng bộ đơn vị 2'}, // preserve
 {unit:'Chi bộ không có dòng cha',parent:'Đảng bộ Đồn Biên phòng Phong Hải'}, // exclude
 {unit:'Đảng bộ đơn vị 2',parent:'Đảng bộ Thành phố Huế'}, // match level 2
 {unit:'Chi bộ không rõ',parent:'Chi bộ 1'} // ambiguous parent across branches
];
function wrapRows(data,firstRow=2){
 return {
  getLastRow:()=>data.length+firstRow-1,
  getRange:(r,c,n,width)=>({
   getValues:()=>data.slice(r-firstRow,r-firstRow+n),
   getDisplayValues:()=>data.slice(r-firstRow,r-firstRow+n)
  })
 };
}
const hub={
 getSheetByName:name=>{
  if(name==='DUYET_WEBSITE')return {getRange:()=>({getDisplayValues:()=>policies})};
  if(name==='NGUON_4_FILE')return {getRange:()=>({getDisplayValues:()=>sourceRows})};
  return null;
 }
};
const books = {};
books[ids[0]]={getSheetByName:()=>wrapRows(payments,3)};
books[ids[1]]={getSheetByName:()=>({
 getLastRow:()=>missing.length+1,
 getRange:(row,column,count,width)=>{
  assert.equal(row,2);
  assert.equal(width,1);
  assert.ok(column===2||column===4,'Never inspect private person name column C');
  const records=missing.map(x=>[column===2?x.unit:x.parent]);
  return {getDisplayValues:()=>records};
 }
})};
books[ids[3]]={getSheetByName:()=>({
 getLastRow:()=>bank.length+1,
 getRange:(row,column,count,width)=>{
  assert.equal(row,2);assert.equal(count,bank.length);
  if(column===2&&width===4)return {getDisplayValues:()=>bank.map(x=>[x.code,x.name,x.parent,x.parentName])};
  if(column===8&&width===1)return {getDisplayValues:()=>bank.map(x=>[x.state])};
  throw Error('Unexpected bank range; private columns must never be read');
 }
})};
const props={getProperty:name=>name==='CDSTUHUE_STATS_HUB_ID'?'HUB':'QA'};
const context={
 PropertiesService:{getScriptProperties:()=>props},
 SpreadsheetApp:{openById:id=>id==='HUB'?hub:books[id]||(()=>{throw Error('Unknown book')})()},
};
vm.runInNewContext(fs.readFileSync('apps-script/Code.gs','utf8'),context,{timeout:4000});
const feed=context.buildStatsFeed_();
assert.equal(feed.public,true);
assert.equal(feed.modules.ranking.records.length,46);
assert.equal(feed.modules.filingSummary.sourceOverage,0);
assert.equal(feed.modules.filingSummary.sourceDiscrepancyUnits,0);
payments[0][10]+=1; // One unit has one more status than its member total.
payments[1][10]-=2; // Another unit has two fewer; overall remains reconcilable.
const oneCaseExtra=context.buildStatsFeed_().modules.filingSummary;
assert.equal(oneCaseExtra.sourceOverage,1);
assert.equal(oneCaseExtra.sourceDiscrepancyUnits,1);
assert.equal(oneCaseExtra.unclassified,1);
payments[0][10]+=2; // More than one extra must block publication.
assert.equal(context.buildStatsFeed_().modules.filingSummary,undefined);
payments[0][10]-=3;
payments[1][10]+=2;
assert.deepEqual(JSON.parse(JSON.stringify(feed.modules.filingSummary&&[
 feed.modules.filingSummary.totalMembers,feed.modules.filingSummary.completed,
 feed.modules.filingSummary.pendingApproval,feed.modules.filingSummary.notFiled,
 feed.modules.filingSummary.unclassified])),[4600,2760,460,1380,0]);
for(const filedUnit of feed.modules.ranking.records){
 assert.equal(filedUnit.filedDone,70); // H+I+J, not K
 assert.equal(filedUnit.filedTotal,100); // total party members in column C
 assert.ok(Math.abs(filedUnit.filedRate-0.7)<1e-12);
}

const bankResult=feed.modules.banking;
assert.equal(bankResult.excludedCaQsUnits,108);
assert.equal(bankResult.excludedCityRoot,1);
assert.equal(bankResult.unmappedForRanking,0);
assert.equal(bankResult.rowCount,47);
assert.equal(bankResult.registered,46);
assert.equal(bankResult.notRegistered,1);
assert.equal(bankResult.registrationRate,46/47);
const missingResult=feed.modules.missing;
assert.equal(missingResult.sourceRowCount,9);
assert.equal(missingResult.excludedCaQsRows,3);
assert.equal(missingResult.excludedNoParentRows,2);
assert.equal(missingResult.excludedAmbiguousRows,1);
assert.equal(missingResult.excludedIncompleteRows,0);
assert.equal(missingResult.rowCount,3);
assert.equal(missingResult.level2Ranking.eligibleUnits,46);
assert.equal(missingResult.level2Ranking.matchedRows,3);
assert.equal(missingResult.level2Ranking.unmatchedRows,0);
const mappedTotal=feed.modules.ranking.records.reduce((sum,r)=>sum+(r.bankTotal||0),0);
assert.equal(mappedTotal,47);
console.log('CA/QS exclusions passed: 108 organizations, 1 city root, member records safely filtered.');
