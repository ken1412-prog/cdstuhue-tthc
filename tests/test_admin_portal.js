'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.join(__dirname,'..');
const gs=fs.readFileSync(path.join(root,'apps-script/admin-portal/AdminPortal.gs'),'utf8');
const html=fs.readFileSync(path.join(root,'apps-script/admin-portal/Admin.html'),'utf8');
const launcher=fs.readFileSync(path.join(root,'site/assets/admin-launcher.js'),'utf8');
new vm.Script(gs);
new vm.Script(launcher);
assert(html.includes('type="password"'));
assert(html.includes('google.script.run'));
assert(html.includes('Duyệt / tạm ẩn thống kê'));
assert(!html.includes('1PBwfYm0wds9GaNMigr_aiUnuI7YIM6i6PKUYKkcUV60'),'Private HUB id must not be in HTML');
assert(!html.includes('1OZgFV1Urhy0u3fTl98psR8P3M_htv4F8PB94eDMej3w'),'Private QA id must not be in HTML');
assert(!launcher.includes('CDSTUHUE_ADMIN_PASSWORD'),'No passwords stored on GitHub Pages');
assert(launcher.includes('localStorage.setItem(KEY,url)'),'Launcher stores URL only');
const htmlScripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.equal(htmlScripts.length,1);
new vm.Script(htmlScripts[0]);
const props=new Map([
 ['CDSTUHUE_STATS_HUB_ID','private_hub_id'],
 ['CDSTUHUE_ADMIN_INITIAL_PASSWORD','a-Long-Unique-Password-2026']
]);
const cache=new Map();
const rowsMenu=[
 ['overview','Tổng quan','HIỆN','','TỔNG HỢP'],
 ['finance','Thống kê','HIỆN','','TỔNG HỢP'],
 ['assistant','Trợ lý','ẨN','','TIỆN ÍCH']
];
const rowsApproval=[
 ['TỔNG HỢP THU NỘP','ĐÃ DUYỆT','','2026-10-25','Chỉ tỷ lệ'],
 ['XẾP HẠNG 46 ĐƠN VỊ','ĐÃ DUYỆT','','2026-10-25','Chỉ 46 đơn vị'],
 ['CHƯA KHAI BÁO THEO ĐƠN VỊ CHA','ĐÃ DUYỆT','','2026-10-25','Chỉ tổng hợp'],
 ['XÁC NHẬN PHÂN BỔ','ĐÃ DUYỆT','','2026-10-25','legacy'],
 ['TÀI KHOẢN NGÂN HÀNG','ĐÃ DUYỆT','','2026-10-25','Chỉ tổng hợp']
];
const rowsStage=[
 ['THU_NOP','46 đơn vị','private_id','Sheet1',46,'2026-10-25','filename','ĐẠT - CHỜ DUYỆT',''],
 ['THU_NOP_CITY','Thành phố','private_id','Sheet1',1,'2026-10-25','filename','ĐẠT - CHỜ DUYỆT',''],
 ['CHUA_KHAI','Chưa khai','private_id','Sheet1',15238,'2026-10-25','filename','ĐẠT - CHỜ DUYỆT',''],
 ['NGAN_HANG','Ngân hàng','private_id','TKNH',2876,'2026-10-25','filename','ĐẠT - CHỜ DUYỆT','']
];
const sheets={
 'QUAN_TRI_DANH_MUC':{rows:rowsMenu},
 'DUYET_WEBSITE':{rows:rowsApproval},
 'DU_LIEU_CHO_DUYET':{rows:rowsStage}
};
const audit=[];
function sheet(r){
 return {
  getLastRow:()=>r.rows.length+1,
  getDisplayValues:()=>r.rows,
  getRange:(row,col,n=1,width=1)=>({
   getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:width},(_,j)=>String(r.rows[row+i-2]?.[col+j-1]??''))),
   setValue:x=>{r.rows[row-2][col-1]=x;return true},
   setValues:v=>{for(let i=0;i<v.length;i++){const index=row+i-2;if(index<0)continue;if(!r.rows[index])r.rows[index]=[];for(let j=0;j<v[i].length;j++)r.rows[index][col+j-1]=v[i][j]}}
  }),
  appendRow:values=>{audit.push(values)},
  setFrozenRows:()=>{}
 };
}
const hub={
 getUrl:()=> 'https://docs.google.com/spreadsheets/d/private_hub_id/edit',
 getSheetByName:name=>{
  if(name==='NHAT_KY_QUAN_TRI'&&sheets[name])return sheet(sheets[name]);
  return sheets[name]?sheet(sheets[name]):null;
 },
 insertSheet:name=>{sheets[name]={rows:[]};return sheet(sheets[name])}
};
const runtime={
 PropertiesService:{getScriptProperties:()=>({
  getProperty:key=>props.get(key)||null,
  setProperties:obj=>Object.entries(obj).forEach(([k,v])=>props.set(k,v)),
  deleteProperty:key=>props.delete(key),
 })},
 Utilities:{
  DigestAlgorithm:{SHA_256:'sha256'},
  computeDigest:(_alg,value)=>Array.from(crypto.createHash('sha256').update(value).digest()),
  getUuid:()=>crypto.randomUUID(),
  formatDate:()=> '2026-10-25'
 },
 CacheService:{getScriptCache:()=>({
   get:key=>cache.get(key)||null,
   put:(key,value)=>{cache.set(key,value)},
   remove:key=>cache.delete(key)
 })},
 SpreadsheetApp:{openById:id=>id==='private_hub_id'?hub:(()=>{throw Error('wrong id')})()},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
 console
};
vm.createContext(runtime);
vm.runInContext(gs,runtime);
assert.throws(()=>runtime.cdsAdminGetSnapshot('wrong'),/Phiên/);
assert.throws(()=>runtime.cdsAdminCheckExcel('wrong'),/Phiên/);
assert.throws(()=>runtime.cdsAdminStageExcel('wrong'),/Phiên/);
assert(gs.includes('function cdstuhuePreflightExcel4_()'));
assert(gs.includes('function cdstuhueStageExcel4_()'));
assert(!gs.includes('function cdstuhuePreflightExcel4()'));
assert(!gs.includes('function cdstuhueStageExcel4()'));
assert(html.includes('id="checkExcel"')&&html.includes('id="stageExcel"'));
assert(html.includes('cdsAdminCheckExcel')&&html.includes('cdsAdminStageExcel'));

assert.throws(()=>runtime.cdsAdminSetMenu('invalid','finance',false),/Phiên/);
assert.equal(runtime.cdsAdminBootstrap().includes('Đã tạo mật khẩu'),true);
assert(!props.has('CDSTUHUE_ADMIN_INITIAL_PASSWORD'));
assert(props.has('CDSTUHUE_ADMIN_PASSWORD_HASH'));
assert(!props.get('CDSTUHUE_ADMIN_PASSWORD_HASH').includes('Long'));
assert.throws(()=>runtime.cdsAdminLogin('bad-passphrase'),/Mật khẩu/);
const token=runtime.cdsAdminLogin('a-Long-Unique-Password-2026').token;
assert.equal(token.length,73);
const snap=runtime.cdsAdminGetSnapshot(token);
assert.equal(snap.nav.length,3);
assert.equal(snap.modules.length,4,'Retired allocation must never render');
assert(!JSON.stringify(snap).includes('private_id'),'No private source file IDs in payload');
assert.throws(()=>runtime.cdsAdminSetMenu(token,'overview',false),/bắt buộc/);
assert.throws(()=>runtime.cdsAdminSetMenu(token,'finance','true'),/không hợp lệ/);
assert.equal(runtime.cdsAdminSetMenu(token,'assistant',true).visible,true);
assert.equal(rowsMenu[2][2],'HIỆN');
assert.throws(()=>runtime.cdsAdminSetModule(token,'XÁC NHẬN PHÂN BỔ',true),/không được phép/);
assert.equal(runtime.cdsAdminSetModule(token,'TỔNG HỢP THU NỘP',false).approved,false);
assert.equal(rowsApproval[0][1],'TẠM ẨN');
assert.equal(runtime.cdsAdminSetStagedReview(token,'CHUA_KHAI',true,'2026-10-25').activated,false);
assert.equal(rowsStage[2][7],'ĐÃ DUYỆT');
assert(audit.length>=3);
runtime.cdsAdminLogout(token);
assert.throws(()=>runtime.cdsAdminGetSnapshot(token),/hết hạn/);
console.log('Owner-only admin: auth, login, dashboard, toggles, staging, privacy checks PASS');
