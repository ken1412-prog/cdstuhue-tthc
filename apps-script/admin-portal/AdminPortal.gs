/**
 * CDSTUHUE OWNER-ONLY ADMIN PORTAL (standalone Apps Script project).
 *
 * CRITICAL: Deploy as a SECOND Web App, "Execute as Me", access "Only myself".
 * NEVER deploy as "Anyone" or add this file to the public QA Web App project.
 * All privileged RPCs check a short-lived server-side session. The static
 * GitHub Pages website never receives a password, credential or sheet ID.
 *
 * Script Properties (private):
 *  CDSTUHUE_STATS_HUB_ID = the private STATS HUB ID
 *  CDSTUHUE_ADMIN_INITIAL_PASSWORD = one-time 12+ character password
 * Run cdsAdminBootstrap from the editor ONCE; it writes a salted hash and
 * deletes CDSTUHUE_ADMIN_INITIAL_PASSWORD. Only then deploy this Web App.
 */
const CDS_ADMIN_MENU_KEYS_=[
 'overview','finance','units','chinh-thuc','tam-thoi','nhan-xet','dang-phi',
 'qa-all','qa-tthc','qa-stdv','qa-csdl','resources','reports','guide','assistant'
];
const CDS_ADMIN_MODULE_KEYS_=[
 'TỔNG HỢP THU NỘP','XẾP HẠNG 46 ĐƠN VỊ',
 'CHƯA KHAI BÁO THEO ĐƠN VỊ CHA','TÀI KHOẢN NGÂN HÀNG'
];
const CDS_ADMIN_SOURCE_KEYS_=['THU_NOP','THU_NOP_CITY','CHUA_KHAI','NGAN_HANG'];
const CDS_ADMIN_TTL_=1500; // 25 minutes, nothing persisted in browser
function cdsAdminProps_(){return PropertiesService.getScriptProperties();}
function cdsAdminHash_(s){
 const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s));
 return bytes.map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
}
function cdsAdminEquals_(a,b){
 const x=String(a||''),y=String(b||'');
 let mismatch=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++)
   mismatch|=(x.charCodeAt(i)||0)^(y.charCodeAt(i)||0);
 return mismatch===0;
}
/** Run manually from Apps Script editor, never from the public site. */
function cdsAdminBootstrap(){
 const p=cdsAdminProps_();
 if(p.getProperty('CDSTUHUE_ADMIN_PASSWORD_HASH'))
   throw Error('Mật khẩu quản trị đã được cài; không tự ghi đè.');
 if(!p.getProperty('CDSTUHUE_STATS_HUB_ID'))
   throw Error('Thiếu CDSTUHUE_STATS_HUB_ID');
 const initial=p.getProperty('CDSTUHUE_ADMIN_INITIAL_PASSWORD')||'';
 if(initial.length<12||initial.length>128)
   throw Error('Mật khẩu ban đầu phải có từ 12 đến 128 ký tự.');
 const salt=Utilities.getUuid()+Utilities.getUuid();
 p.setProperties({
   CDSTUHUE_ADMIN_PASSWORD_SALT:salt,
   CDSTUHUE_ADMIN_PASSWORD_HASH:cdsAdminHash_(salt+'|'+initial)
 },false);
 p.deleteProperty('CDSTUHUE_ADMIN_INITIAL_PASSWORD');
 console.log('Đã thiết lập mật khẩu băm và xóa mật khẩu ban đầu. Không ghi lại mật khẩu.');
 return 'Đã tạo mật khẩu. Tiếp theo hãy triển khai Web App chỉ cho chủ sở hữu.';
}
function doGet(){
 return HtmlService.createHtmlOutputFromFile('Admin')
   .setTitle('Quản trị CDSTUHUE')
   .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function cdsAdminSession_(token){
 if(typeof token!=='string'||!(/^[0-9a-f-]{73}$/i.test(token)))
   throw Error('Phiên đăng nhập không hợp lệ. Đăng nhập lại.');
 const key='cdsadmin_session_'+cdsAdminHash_(token);
 if(CacheService.getScriptCache().get(key)!=='YES')
   throw Error('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
 return key;
}
function cdsAdminLogin(password){
 const p=cdsAdminProps_(),cache=CacheService.getScriptCache();
 const key='cdsadmin_failed_login',fail=Number(cache.get(key)||0);
 if(fail>=5)throw Error('Quá nhiều lượt đăng nhập. Hãy thử lại sau 15 phút.');
 if(!p.getProperty('CDSTUHUE_ADMIN_PASSWORD_HASH'))
   throw Error('Chưa thiết lập mật khẩu quản trị trong Apps Script.');
 const candidate=cdsAdminHash_((p.getProperty('CDSTUHUE_ADMIN_PASSWORD_SALT')||'')+
   '|'+String(password||''));
 if(!cdsAdminEquals_(candidate,p.getProperty('CDSTUHUE_ADMIN_PASSWORD_HASH'))){
   cache.put(key,String(fail+1),900);
   throw Error('Mật khẩu không đúng.');
 }
 cache.remove(key);
 const token=Utilities.getUuid()+'-'+Utilities.getUuid();
 cache.put('cdsadmin_session_'+cdsAdminHash_(token),'YES',CDS_ADMIN_TTL_);
 return {token,expiresInSeconds:CDS_ADMIN_TTL_};
}
function cdsAdminLogout(token){
 const key=cdsAdminSession_(token);
 CacheService.getScriptCache().remove(key);
 return {ok:true};
}
function cdsAdminHub_(token){
 cdsAdminSession_(token);
 const id=cdsAdminProps_().getProperty('CDSTUHUE_STATS_HUB_ID');
 if(!id)throw Error('Chưa cấu hình STATS HUB');
 return SpreadsheetApp.openById(id);
}
function cdsAdminGetSnapshot(token){
 const hub=cdsAdminHub_(token);
 const menu=hub.getSheetByName('QUAN_TRI_DANH_MUC'),
   policy=hub.getSheetByName('DUYET_WEBSITE'),
   staging=hub.getSheetByName('DU_LIEU_CHO_DUYET');
 if(!menu||!policy)throw Error('STATS HUB thiếu tab quản trị');
 const menuValues=menu.getRange(2,1,Math.min(30,menu.getLastRow()-1),5).getDisplayValues();
 const moduleValues=policy.getRange(2,1,Math.min(20,policy.getLastRow()-1),5).getDisplayValues();
 const nav=menuValues.filter(r=>CDS_ADMIN_MENU_KEYS_.includes(r[0]))
  .map(r=>({id:r[0],name:String(r[1]||r[0]).slice(0,110),
    visible:String(r[2]).trim()==='HIỆN',group:String(r[4]||'').slice(0,80)}));
 const modules=moduleValues.filter(r=>CDS_ADMIN_MODULE_KEYS_.includes(r[0]))
  .map(r=>({name:r[0],approved:String(r[1]).trim()==='ĐÃ DUYỆT',
    approvedOn:String(r[3]||'').slice(0,30),
    scope:String(r[4]||'').slice(0,300)}));
 const staged=staging?staging.getRange(2,1,4,9).getDisplayValues()
  .filter(r=>CDS_ADMIN_SOURCE_KEYS_.includes(r[0]))
  .map(r=>({code:r[0],name:String(r[1]||'').slice(0,130),
    rows:Number(r[4])||0,snapshot:String(r[5]||'').slice(0,20),
    status:String(r[7]||'').slice(0,50)})):[];
 return {nav,modules,staged,serverTime:new Date().toISOString(),
   info:'Thay đổi tại đây được lưu vào STATS HUB. Website đồng bộ theo lịch GitHub.'};
}
function cdsAdminAudit_(hub,action,key,oldValue,newValue){
 let sheet=hub.getSheetByName('NHAT_KY_QUAN_TRI');
 if(!sheet){
   sheet=hub.insertSheet('NHAT_KY_QUAN_TRI');
   sheet.getRange(1,1,1,6).setValues([[
     'THỜI GIAN','HÀNH ĐỘNG','ĐỐI TƯỢNG','TRƯỚC','SAU','NGUỒN']]);
   sheet.setFrozenRows(1);
 }
 sheet.appendRow([new Date(),action,key,String(oldValue).slice(0,120),
   String(newValue).slice(0,120),'OWNER-ONLY ADMIN PORTAL']);
}
function cdsAdminSetMenu(token,id,on){
 if(typeof on!=='boolean'||!CDS_ADMIN_MENU_KEYS_.includes(id))
   throw Error('Danh mục không hợp lệ');
 if(id==='overview'&&!on)throw Error('Tổng quan bắt buộc hiển thị');
 const hub=cdsAdminHub_(token);
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(10000))throw Error('Đang có thao tác quản trị khác');
 try{
   const sh=hub.getSheetByName('QUAN_TRI_DANH_MUC');
   const rows=sh.getRange(2,1,sh.getLastRow()-1,3).getDisplayValues();
   const index=rows.findIndex(r=>r[0]===id);
   if(index<0)throw Error('Không thấy danh mục trong STATS HUB');
   const newValue=on?'HIỆN':'ẨN',oldValue=rows[index][2];
   if(oldValue!==newValue){
     sh.getRange(index+2,3).setValue(newValue);
     cdsAdminAudit_(hub,'ẨN/HIỆN DANH MỤC',id,oldValue,newValue);
   }
   return {ok:true,id,visible:on};
 }finally{lock.releaseLock();}
}
function cdsAdminSetModule(token,name,on){
 if(typeof on!=='boolean'||!CDS_ADMIN_MODULE_KEYS_.includes(name))
   throw Error('Phân hệ không được phép quản trị');
 const hub=cdsAdminHub_(token),lock=LockService.getScriptLock();
 if(!lock.tryLock(10000))throw Error('Đang có thao tác quản trị khác');
 try{
   const sh=hub.getSheetByName('DUYET_WEBSITE');
   const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getDisplayValues();
   const index=rows.findIndex(r=>r[0]===name);
   if(index<0)throw Error('Không tìm thấy phân hệ');
   const row=index+2,oldValue=rows[index][1],newValue=on?'ĐÃ DUYỆT':'TẠM ẨN';
   if(on&&!String(rows[index][4]||'').trim())
     throw Error('Chưa có phạm vi công khai được duyệt; không thể tự cấp quyền mới');
   if(oldValue!==newValue){
     sh.getRange(row,2).setValue(newValue);
     if(on)sh.getRange(row,4).setValue(
       Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd'));
     cdsAdminAudit_(hub,'DUYỆT/ẨN THỐNG KÊ',name,oldValue,newValue);
   }
   return {ok:true,name,approved:on};
 }finally{lock.releaseLock();}
}
function cdsAdminSetStagedReview(token,code,on,snapshot){
 if(typeof on!=='boolean'||!CDS_ADMIN_SOURCE_KEYS_.includes(code))
   throw Error('Mã nguồn không hợp lệ');
 const iso=String(snapshot||'').trim();
 if(!/^20\d{2}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(iso))
   throw Error('Ngày nguồn phải có dạng YYYY-MM hoặc YYYY-MM-DD');
 const hub=cdsAdminHub_(token),lock=LockService.getScriptLock();
 if(!lock.tryLock(10000))throw Error('Đang có thao tác quản trị khác');
 try{
   const sh=hub.getSheetByName('DU_LIEU_CHO_DUYET');
   if(!sh)throw Error('Chưa có bảng dữ liệu chờ duyệt');
   const rows=sh.getRange(2,1,4,9).getDisplayValues();
   const index=rows.findIndex(r=>r[0]===code);
   if(index<0)throw Error('Không tìm thấy nguồn chờ duyệt');
   if(!String(rows[index][2]||'').trim()||
      !String(rows[index][3]||'').trim()||
      !(Number(rows[index][4])>0))
     throw Error('Nguồn chưa có Sheet nháp hợp lệ');
   // Does NOT switch NGUON_4_FILE and never overrides owner promotion gate.
   const oldValue=rows[index][7],next=on?'ĐÃ DUYỆT':'CHỜ DUYỆT';
   sh.getRange(index+2,6).setValue(iso);
   sh.getRange(index+2,8).setValue(next);
   cdsAdminAudit_(hub,'DUYỆT NHÁP (CHƯA CHUYỂN NGUỒN)',code,oldValue,next);
   return {ok:true,code,reviewed:on,activated:false};
 }finally{lock.releaseLock();}
}
