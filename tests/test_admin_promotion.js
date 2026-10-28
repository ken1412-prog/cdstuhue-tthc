'use strict';
/* Mock-only acceptance test: authorized promotion, wrong phrase, no replay.
 * No external Drive or Sheets; no personal data used.
 */
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const gs=fs.readFileSync('apps-script/admin-portal/AdminPortal.gs','utf8');
const keys=['THU_NOP','THU_NOP_CITY','CHUA_KHAI','NGAN_HANG'];
const ids=keys.map((_,i)=>'private_stage_sheet_id_00000'+i);
const tabs=['Sheet1','Sheet1','CHUA_KHAI_CHUAN','TKNH_LISTro'];
const filenames=keys.map((_,i)=>'new_report_'+i+'.xlsx');
const counts=[46,1,100,40];
const sheets={};
function make(name,n=60,w=14){
 const cells=Array.from({length:n},()=>Array(w).fill(''));
 const col=c=>c.split('').reduce((v,x)=>v*26+x.charCodeAt(0)-64,0);
 const parse=(r,c,h,width)=>{
  if(typeof r==='string'){
   const m=/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(r);
   assert(m,'Bad range '+r);
   return [Number(m[2]),col(m[1]),m[4]?Number(m[4])-Number(m[2])+1:1,
    m[3]?col(m[3])-col(m[1])+1:1];
  }
  return[r,c,h||1,width||1];
 };
 const sh={
  cells,
  getRange(r,c,h,w){
   const [row,column,rows,cols]=parse(r,c,h,w);
   const values=()=>Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>cells[row+i-1][column+j-1]));
   return{
    getValues:values,getValue:()=>values()[0][0],
    getDisplayValues:()=>values().map(x=>x.map(String)),
    getDisplayValue:()=>String(values()[0][0]),
    setValue:v=>{cells[row-1][column-1]=v},
    setValues:arr=>arr.forEach((r,i)=>r.forEach((v,j)=>{cells[row+i-1][column+j-1]=v})),
    clearContent:()=>{for(let i=0;i<rows;i++)for(let j=0;j<cols;j++)cells[row+i-1][column+j-1]=''}
   };
  },
  appendRow:r=>cells.push(r),
  setFrozenRows:()=>{}
 };
 sheets[name]=sh;
 return sh;
}
const stage=make('DU_LIEU_CHO_DUYET',10,9);
keys.forEach((key,i)=>{
 stage.cells[i+1]=[key,key,ids[i],tabs[i],counts[i],'2026-10-26',
  filenames[i],'ĐÃ DUYỆT',''];
});
const registry=make('NGUON_4_FILE',12,8);
['THU_NOP','CHUA_KHAI','PHAN_BO','NGAN_HANG'].forEach((k,i)=>{
 registry.cells[i+1]=[k,'old', 'old_id_'+i,'Sheet1',3,'2026-10-25','','RIÊNG TƯ'];
});
const policy=make('DUYET_WEBSITE',12,5);
['TỔNG HỢP THU NỘP','XẾP HẠNG 46 ĐƠN VỊ','CHƯA KHAI BÁO THEO ĐƠN VỊ CHA',
 'XÁC NHẬN PHÂN BỔ','TÀI KHOẢN NGÂN HÀNG'].forEach((k,i)=>{
 policy.cells[i+1]=[k,'ĐÃ DUYỆT','','2026-10-25','allowed-scope'];
});
const overview=make('TONG_QUAN',40,14);
overview.cells[0][1]='SỐ LIỆU 25/10/2026';
const ranking=make('XEP_HANG_SNAPSHOT',50,10);
const hub={getSheetByName:k=>sheets[k]||null,insertSheet:name=>make(name,5,6)};
const payments=Array.from({length:46},(_,i)=>{
 const row=Array(14).fill(0);row[1]='Đảng bộ '+i;row[2]=100;
 row[10]=1;row[11]=100;row[12]=50;return row;
});
const city=[Array(14).fill(0)];
city[0][2]=4600;city[0][10]=100;city[0][11]=4600;city[0][12]=2300;
const sources=Object.fromEntries(ids.map((id,i)=>[id,{
 getSheetByName:tab=>tab===tabs[i]?{
  getRange:()=>({getValues:()=>i===0?payments:city})
 }:null
}]));
const values=new Map([['CDSTUHUE_STATS_HUB_ID','hub_id'],
 ['CDSTUHUE_EXCEL_INBOX_FOLDER_ID','inbox_id']]);
const props={getProperty:k=>values.get(k)||null,
 setProperty:(k,v)=>values.set(k,v),deleteProperty:k=>values.delete(k)};
const context={
 PropertiesService:{getScriptProperties:()=>props},
 SpreadsheetApp:{openById:id=>id==='hub_id'?hub:sources[id]},
 Utilities:{formatDate:()=> '2026-10-26'},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
 console
};
vm.createContext(context);vm.runInContext(gs,context);
context.cdsAdminSession_=token=>{if(token!=='VALID')throw Error('Phiên đăng nhập không hợp lệ')};
context.cdstuhueInputFiles_=()=>({signature:'batch-a',
 files:filenames.map(name=>({getName:()=>name}))});
const summary={
 THU_NOP:{rows:46,members:4600,required:4600,received:2300,notFiled:46},
 THU_NOP_CITY:{rows:1,members:4600,required:4600,received:2300,notFiled:100},
 CHUA_KHAI:{rows:100},
 NGAN_HANG:{rows:40,registered:30,notRegistered:10}
};
context.cdstuhueExcelValidate_=key=>summary[key];
context.cdsAdminAudit_=()=>{};
const initial=JSON.stringify(registry.cells.slice(1,5));
assert.throws(()=>context.cdsAdminPromoteStaged('INVALID','DUYET 2026-10'),/Phiên/);
assert.throws(()=>context.cdsAdminPromoteStaged('VALID','INCORRECT'),/Xác nhận sai/);
assert.equal(JSON.stringify(registry.cells.slice(1,5)),initial,'No mutation on rejected action');
stage.cells[2][7]='CHỜ DUYỆT';
assert.throws(()=>context.cdsAdminPromoteStaged('VALID','DUYET 2026-10'),/chưa được chủ sở hữu duyệt/);
stage.cells[2][7]='ĐÃ DUYỆT';
// Synthetic 1-record drift: still requires a separate owner acknowledgement.
assert.match(context.cdstuhueMissingCountReconcile_(8760,8761),/CẢNH BÁO/);
assert.throws(()=>context.cdstuhueMissingCountReconcile_(8760,8762),/lệch quá 1 hồ sơ/);
stage.cells[3][4]=101;
summary.CHUA_KHAI.rows=101;
assert.throws(()=>context.cdsAdminPromoteStaged('VALID','DUYET 2026-10'),/Cần đọc và xác nhận riêng/);
assert.equal(JSON.stringify(registry.cells.slice(1,5)),initial,'Warning must not publish without acknowledgement');
stage.cells[3][4]=100;
summary.CHUA_KHAI.rows=100;
const result=context.cdsAdminPromoteStaged('VALID','DUYET 2026-10');
assert.equal(result.promoted,true);
assert.equal(result.period,'2026-10');
assert.deepEqual(registry.cells.slice(1,5).map(r=>r[0]),keys);
assert.equal(overview.cells[0][1],'SỐ LIỆU 26/10/2026');
assert.equal(overview.cells[2][1],4600);
assert.equal(ranking.cells[1][1],'Đảng bộ 0');
assert(stage.cells.slice(1,5).every(r=>r[7]==='ĐÃ CHUYỂN NGUỒN'));
assert(values.has('CDSTUHUE_PREVIOUS_CONFIG_JSON'));
assert(policy.cells.slice(1,6).every(r=>r[4]==='allowed-scope'));
assert.throws(()=>context.cdsAdminPromoteStaged('VALID','DUYET 2026-10'),/đã được chuyển/);
console.log('Owner promotion PASS: authenticated, approved, explicit period, validated and non-replay');
