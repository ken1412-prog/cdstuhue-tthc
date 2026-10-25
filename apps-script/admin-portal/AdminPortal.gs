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
 const qaId=cdsAdminProps_().getProperty('CDSTUHUE_QA_SHEET_ID')||'';
 return {nav,modules,staged,serverTime:new Date().toISOString(),
   links:{hub:hub.getUrl(),
     qa:/^[A-Za-z0-9_-]{20,}$/.test(qaId)?
       'https://docs.google.com/spreadsheets/d/'+qaId+'/edit':''},
   excelInputConfigured:!!cdsAdminProps_().getProperty('CDSTUHUE_EXCEL_INBOX_FOLDER_ID'),
   hasPendingBatch:!!cdsAdminProps_().getProperty('CDSTUHUE_PENDING_STAGE_JSON'),
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


/** Excel intake actions in the OWNER-ONLY administration project. */
function cdsAdminCheckExcel(token){
  cdsAdminSession_(token);
  const result=cdstuhuePreflightExcel4_();
  if(!result.valid||!result.reconciled)throw Error('Bộ bốn file chưa đối chiếu khớp');
  const safe={};
  CDS_ADMIN_SOURCE_KEYS_.forEach(k=>{
    const r=result.sources[k];
    safe[k]={rows:r.rows,
      members:r.members||0,registered:r.registered||0,notRegistered:r.notRegistered||0,
      required:r.required||0,received:r.received||0,notFiled:r.notFiled||0};
  });
  return {ok:true,reconciled:true,sources:safe,
    info:'Đối chiếu đạt. Chưa cập nhật bất kỳ nguồn dữ liệu đang chạy nào.'};
}
function cdsAdminStageExcel(token){
  cdsAdminSession_(token);
  const out=cdstuhueStageExcel4_();
  const safe={};
  if(out.sources)CDS_ADMIN_SOURCE_KEYS_.forEach(k=>{
    const r=out.sources[k]||{};
    safe[k]={rows:r.rows||0,members:r.members||0,notFiled:r.notFiled||0,
      registered:r.registered||0,notRegistered:r.notRegistered||0};
  });
  const hub=cdsAdminHub_(token);
  cdsAdminAudit_(hub,'TẠO BỘ NHÁP EXCEL','Bốn nguồn','',out.mode);
  return {ok:true,mode:out.mode,changed:out.mode==='STAGED_AWAITING_REVIEW',
    reconciled:out.reconciled===true,sources:safe,
    info:out.mode==='UNCHANGED'?'Đã có bộ nháp cùng dữ liệu, không tạo trùng.':
      'Bốn Google Sheets nháp đã tạo và ghi chờ duyệt. Nguồn live không đổi.'};
}

/* === FLEXIBLE EXCEL IMPORT SUPPORT / INTERNAL ONLY === */
const CDSTUHUE_EXCEL_ALIASES_={
  payment:{
    name:['ten don vi','ten dang bo','ten to chuc'],
    members:['tong sl dang vien','tong so dang vien','tong dang vien','tong so luong dang vien','so luong dang vien'],
    pending:['chua duyet','ho so chua duyet','khai bao chua duyet'],
    approvedNotPaid:['da duyet chua nop','da duyet chua thu','ho so da duyet chua nop'],
    approvedPaid:['da duyet da nop','da duyet da thu','ho so da duyet da nop'],
    noFile:['so dang vien chua co ho so','so luong dang vien chua co ho so','chua co ho so','so dang vien chua khai bao ho so'],
    due:['tong tien theo ho so da khai bao','tong tien phai nop','tong tien phai thu','tong tien ho so da khai bao'],
    paid:['tong tien da nop','so tien da nop','tong so tien da nop','tong tien da thu'],
    stt:['stt','so thu tu']
  },
  missing:{
    unit:['ten don vi','ten to chuc','ten co quan','don vi'],
    parent:['don vi cha','ten don vi cha','co quan cha','ten co quan cha','don vi cap tren'],
    code:['ma don vi','ma co quan','ma to chuc'],
    stt:['stt','so thu tu'],period:['ky dang phi','ky bao cao']
  },
  banking:{
    code:['ma co quan','ma don vi','ma to chuc'],
    name:['ten co quan','ten don vi','ten to chuc'],
    parentCode:['ma co quan cha','ma don vi cha','ma don vi cap tren','ma co quan cap tren'],
    parentName:['co quan cha','ten co quan cha','don vi cha','ten don vi cha'],
    status:['trang thai cau hinh tai khoan ngan hang','trang thai tai khoan ngan hang',
      'trang thai dang ky tai khoan ngan hang','trang thai dang ky tknh','trang thai cau hinh tknh'],
    stt:['stt','so thu tu']
  }
};
function cdstuhueExcelNormalize_(value) {
  return String(value == null ? '' : value).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d')
    .toLowerCase().replace(/\(\s*\d+\s*\)/g,' ')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function cdstuhueExcelInt_(v,where) {
  let n=NaN;
  if(typeof v==='number')n=v;
  else if(typeof v==='string'){
    const s=v.trim();
    if(/^\d+$/.test(s))n=Number(s);
    else if(/^\d{1,3}([., ]\d{3})+$/.test(s))n=Number(s.replace(/[., ]/g,''));
  }
  if(!Number.isSafeInteger(n)||n<0)throw Error('Số không hợp lệ ở '+where);
  return n;
}
function cdstuhueExcelHeaders_(sh,type) {
  const cols=Math.min(sh.getLastColumn(),80);
  if(cols<1)throw Error('Excel không có tiêu đề cột');
  const two=type==='payment'&&sh.getLastRow()>=2;
  const rows=sh.getRange(1,1,two?2:1,cols).getDisplayValues();
  const aliases=CDSTUHUE_EXCEL_ALIASES_[type];
  const found={}; const duplicates={};
  Object.keys(aliases).forEach(field=>{
    const allowed=aliases[field];
    const indices=[];
    for(let c=0;c<cols;c++){
      if(rows.some(row=>allowed.includes(cdstuhueExcelNormalize_(row[c]))))
        indices.push(c+1);
    }
    if(indices.length>1&&!(type==='banking'&&field==='status'))
      throw Error('Cột '+field+' xuất hiện nhiều lần, cần kiểm tra tránh nhập nhầm');
    if(indices.length)found[field]=indices[indices.length-1];
    if(indices.length>1)duplicates[field]=indices;
  });
  const isPaySecond=two&&rows[1].some(v=>[
    ...aliases.members,...aliases.pending,...aliases.approvedNotPaid,
    ...aliases.approvedPaid,...aliases.noFile,...aliases.due,...aliases.paid
  ].includes(cdstuhueExcelNormalize_(v)));
  return {cols:found,duplicates,headerRows:isPaySecond?2:1};
}
function cdstuhueExcelRequired_(type,found) {
  const needed=type==='payment'?
    ['name','members','pending','approvedNotPaid','approvedPaid','noFile','due','paid']:
    type==='paymentCity'?['name','members','noFile','due','paid']:
    type==='missing'?['unit','parent']:
    ['code','name','parentCode','parentName','status'];
  const absent=needed.filter(k=>!found[k]);
  if(absent.length)throw Error('Thiếu trường BẮT BUỘC: '+type+' / '+absent.join(', ')+
    '. Các cột khác có thể xóa hoặc đổi thứ tự.');
}
function cdstuhueExcelDescribe_(sh,type) {
  const info=cdstuhueExcelHeaders_(sh,type);
  return {cols:info.cols,duplicates:info.duplicates,
    first:info.headerRows+1,rows:sh.getLastRow()-info.headerRows};
}
function cdstuhueExcelIdentify_(sh) {
  if(sh.getLastRow()<2)return '';
  const payment=cdstuhueExcelDescribe_(sh,'payment');
  if(payment.cols.name&&payment.cols.members&&
     (payment.cols.due||payment.cols.paid)){
    return payment.rows===46?'THU_NOP':payment.rows===1?'THU_NOP_CITY':'';
  }
  const bank=cdstuhueExcelDescribe_(sh,'banking');
  if(bank.cols.code&&bank.cols.name&&(bank.cols.status||bank.cols.parentCode))
    return 'NGAN_HANG';
  const missing=cdstuhueExcelDescribe_(sh,'missing');
  if(missing.cols.unit&&(missing.cols.parent||missing.cols.code))
    return 'CHUA_KHAI';
  return '';
}
function cdstuhueExcelRead_(sh,desc,field) {
  const col=desc.cols[field];
  if(!col)return Array.from({length:desc.rows},()=>null);
  return sh.getRange(desc.first,col,desc.rows,1).getValues().map(r=>r[0]);
}
function cdstuhueExcelValidate_(type,sh) {
  const family=type==='THU_NOP'||type==='THU_NOP_CITY'?'payment':
    type==='CHUA_KHAI'?'missing':'banking';
  const desc=cdstuhueExcelDescribe_(sh,family),n=desc.rows;
  cdstuhueExcelRequired_(type==='THU_NOP_CITY'?'paymentCity':family,desc.cols);
  if(n<1||n>25000)throw Error(type+': số dòng vượt giới hạn');
  if(family==='payment'){
    if(n!==(type==='THU_NOP'?46:1))
      throw Error(type+': phải đúng '+(type==='THU_NOP'?46:1)+' dòng báo cáo');
    const fields=['name','members','pending','approvedNotPaid','approvedPaid','noFile','due','paid'];
    const data=Object.fromEntries(fields.map(k=>[k,cdstuhueExcelRead_(sh,desc,k)]));
    const names=new Set();
    let members=0,required=0,received=0,notFiled=0;
    for(let i=0;i<n;i++){
      const line=desc.first+i;
      const name=cdstuhueExcelNormalize_(data.name[i]);
      if(!name||names.has(name))throw Error(type+': trùng/thiếu tên đơn vị tại dòng '+line);
      names.add(name);
      const total=cdstuhueExcelInt_(data.members[i],type+' / members dòng '+line);
      const h=type==='THU_NOP_CITY'&&!desc.cols.pending?0:
        cdstuhueExcelInt_(data.pending[i],type+' / pending dòng '+line);
      const j=type==='THU_NOP_CITY'&&!desc.cols.approvedNotPaid?0:
        cdstuhueExcelInt_(data.approvedNotPaid[i],type+' / approvedNotPaid dòng '+line);
      const k=type==='THU_NOP_CITY'&&!desc.cols.approvedPaid?0:
        cdstuhueExcelInt_(data.approvedPaid[i],type+' / approvedPaid dòng '+line);
      const noFile=cdstuhueExcelInt_(data.noFile[i],type+' / noFile dòng '+line);
      const due=cdstuhueExcelInt_(data.due[i],type+' / due dòng '+line);
      const done=cdstuhueExcelInt_(data.paid[i],type+' / paid dòng '+line);
      if(h+j+k>total+1||noFile>total||done>due)
        throw Error(type+': dữ liệu hồ sơ/tiền không hợp lệ tại dòng '+line);
      members+=total;required+=due;received+=done;notFiled+=noFile;
    }
    if(type==='THU_NOP_CITY'&&
        cdstuhueExcelNormalize_(data.name[0])!=='dang bo thanh pho hue')
      throw Error('Tệp tổng thành phố thiếu dòng Đảng bộ Thành phố Huế');
    if(required<=0)throw Error(type+': tổng tiền theo hồ sơ phải lớn hơn 0');
    return {rows:n,members,required,received,notFiled,optionalColumnsAllowed:true};
  }
  if(family==='missing'){
    // Read ONLY public organizational columns, not personal names or identifiers.
    const unit=cdstuhueExcelRead_(sh,desc,'unit');
    const parent=cdstuhueExcelRead_(sh,desc,'parent');
    for(let i=0;i<n;i++)
      if(!String(unit[i]??'').trim()||!String(parent[i]??'').trim())
        throw Error('CHUA_KHAI: thiếu đơn vị/đơn vị cha tại dòng '+(i+desc.first));
    return {rows:n,optionalColumnsAllowed:true};
  }
  const code=cdstuhueExcelRead_(sh,desc,'code');
  const name=cdstuhueExcelRead_(sh,desc,'name');
  const parentCode=cdstuhueExcelRead_(sh,desc,'parentCode');
  const parentName=cdstuhueExcelRead_(sh,desc,'parentName');
  const status=cdstuhueExcelRead_(sh,desc,'status');
  const repeated=desc.duplicates.status;
  if(repeated){
    // Old canonical exports can contain the status twice (F/H). Reject
    // conflicting values instead of silently choosing one by column index.
    const first=sh.getRange(desc.first,repeated[0],n,1).getDisplayValues();
    for(let i=0;i<n;i++){
      const a=String(first[i][0]||'').trim(),b=String(status[i]||'').trim();
      if(a&&b&&a!==b)throw Error('NGAN_HANG: hai cột trạng thái mâu thuẫn tại dòng '+(desc.first+i));
    }
  }
  let registered=0,notRegistered=0;const seen=new Set();
  for(let i=0;i<n;i++){
    const id=String(code[i]??'').trim(),state=String(status[i]??'').trim();
    if(!id||!String(name[i]??'').trim()||!String(parentCode[i]??'').trim()||
       !String(parentName[i]??'').trim()||seen.has(id))
      throw Error('NGAN_HANG: thiếu/trùng mã, đơn vị hoặc cấp cha dòng '+(desc.first+i));
    seen.add(id);
    if(state==='Đã có tài khoản ngân hàng')registered++;
    else if(state==='Chưa có tài khoản ngân hàng')notRegistered++;
    else throw Error('NGAN_HANG: trạng thái không hợp lệ tại dòng '+(desc.first+i));
  }
  return {rows:n,registered,notRegistered,optionalColumnsAllowed:true};
}
/**
 * Always create a fixed-format *private* downstream tab. Public Apps Script
 * reads B/D for missing and B:E/H for bank; changing Excel columns must never
 * change those stable internal contracts.
 *
 * Personal names are NOT copied into CHUA_KHAI_CHUAN (column C stays empty).
 */
function cdstuhueNormalizeStagedSheet_(type,sh) {
  const family=type==='THU_NOP'||type==='THU_NOP_CITY'?'payment':
    type==='CHUA_KHAI'?'missing':'banking';
  const desc=cdstuhueExcelDescribe_(sh,family);
  cdstuhueExcelRequired_(type==='THU_NOP_CITY'?'paymentCity':family,desc.cols);
  const ss=sh.getParent(),n=desc.rows,tab='CDSTUHUE_CHUAN';
  if(ss.getSheetByName(tab))throw Error('Excel nguồn đã có tên tab chuẩn hóa, cần đổi tên tab nguồn');
  const normalized=ss.insertSheet(tab);
  const width=family==='payment'?14:family==='missing'?6:8;
  const head=family==='payment'?
    [['STT','Tên đơn vị','Đảng viên','','','','','Hồ sơ đảng phí','','','','Số tiền','',''],
     ['','','Tổng sl đảng viên (1)','','','','','Chưa duyệt (6)',
      'Đã duyệt, chưa nộp (7)','Đã duyệt, đã nộp (8)','Số đảng viên chưa có hồ sơ (9)',
      'Tổng tiền theo hồ sơ đã khai báo','Tổng tiền đã nộp','Tỷ lệ hoàn thành']]:
    family==='missing'?
      [['STT','TÊN ĐƠN VỊ','TÊN ĐẢNG VIÊN','ĐƠN VỊ CHA','KỲ ĐẢNG PHÍ','MÃ ĐƠN VỊ']]:
      [['STT','Mã cơ quan','Tên cơ quan','Mã cơ quan cha','Cơ quan cha',
        'Trạng thái cấu hình tài khoản ngân hàng','Ngày tạo TKNH',
        'Trạng thái cấu hình tài khoản ngân hàng']];
  const height=n+head.length;
  if(normalized.getMaxRows()<height)
    normalized.insertRowsAfter(normalized.getMaxRows(),height-normalized.getMaxRows());
  normalized.getRange(1,1,head.length,width).setValues(head);
  normalized.setFrozenRows(head.length);
  const maps=family==='payment'?
    {1:'name',2:'members',7:'pending',8:'approvedNotPaid',9:'approvedPaid',
      10:'noFile',11:'due',12:'paid'}:
    family==='missing'?{1:'unit',3:'parent',4:'period',5:'code'}:
      {1:'code',2:'name',3:'parentCode',4:'parentName',5:'status',7:'status'};
  // Small chunks avoid Apps Script memory/time spikes with ~15K rows.
  for(let begin=0;begin<n;begin+=400){
    const count=Math.min(400,n-begin),data={};
    Object.keys(maps).forEach(index=>{
      const field=maps[index],col=desc.cols[field];
      if(col&&!data[field])
        data[field]=sh.getRange(desc.first+begin,col,count,1).getValues().map(r=>r[0]);
    });
    const rows=Array.from({length:count},(_,i)=>{
      const row=Array(width).fill('');
      row[0]=begin+i+1;
      Object.keys(maps).forEach(idx=>{
        const field=maps[idx];
        if(data[field])row[Number(idx)]=data[field][i];
      });
      // The one-row city control does not need three filing-status fields.
      // Canonicalize absent optional city fields to 0 so a second validation
      // does not confuse deliberately omitted columns with corrupt values.
      if(type==='THU_NOP_CITY'){
        [7,8,9].forEach(idx=>{if(row[idx]==='')row[idx]=0;});
      }
      return row;
    });
    normalized.getRange(head.length+begin+1,1,count,width).setValues(rows);
  }
  return tab;
}
function cdstuhuePreflightExcel4_() {
  const id=PropertiesService.getScriptProperties().getProperty('CDSTUHUE_EXCEL_INBOX_FOLDER_ID');
  if(!id||!/^[A-Za-z0-9_-]{20,}$/.test(id))throw Error('Chưa cấu hình ID thư mục Excel riêng tư');
  if(typeof Drive==='undefined'||!Drive.Files||!Drive.Files.create)throw Error('Chưa bật Advanced Drive API v3');
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Đã có lượt kiểm tra đang chạy');
  const temp=[];
  try{
    const itr=DriveApp.getFolderById(id).getFiles(),files=[];
    while(itr.hasNext()){
      const f=itr.next(),mime=f.getMimeType();
      if(!['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime)||!/\.xlsx?$/i.test(f.getName()))
        throw Error('Thư mục chỉ nhận 4 tệp Excel .xlsx / .xls');
      files.push(f);
    }
    if(files.length!==4)throw Error('Cần đúng 4 file Excel, hiện có '+files.length);
    const report={schema:1,mode:'DRY_RUN_ONLY',imported:false,valid:true,sources:{}};
    for(const f of files){
      const converted=Drive.Files.create({name:'_CDSTUHUE_TEMP_CHECK_',mimeType:'application/vnd.google-apps.spreadsheet',parents:[id]},f.getBlob(),{fields:'id'});
      if(!converted||!converted.id)throw Error('Chuyển đổi Excel thất bại');
      temp.push(converted.id);
      const matched=SpreadsheetApp.openById(converted.id).getSheets()
        .map(sh=>({sh,type:cdstuhueExcelIdentify_(sh)})).filter(x=>x.type);
      if(matched.length!==1)throw Error('Không xác định duy nhất mẫu của một Excel');
      const type=matched[0].type;
      if(report.sources[type])throw Error('Trùng loại Excel: '+type);
      report.sources[type]={file:f.getName(),...cdstuhueExcelValidate_(type,matched[0].sh)};
    }
    if(['THU_NOP','THU_NOP_CITY','CHUA_KHAI','NGAN_HANG'].some(k=>!report.sources[k]))
      throw Error('Cần đủ 46 đơn vị, tổng thành phố, chưa khai báo và ngân hàng');
    const detailed=report.sources.THU_NOP,city=report.sources.THU_NOP_CITY;
    if(city.members<detailed.members||city.required<detailed.required||
       city.received!==detailed.received||city.notFiled<detailed.notFiled)
      throw Error('Số tổng thành phố không khớp báo cáo 46 đơn vị; dừng nạp');
    if(city.notFiled!==report.sources.CHUA_KHAI.rows)
      throw Error('Danh sách chưa khai báo không khớp số hồ sơ trong tổng thành phố; dừng nạp');
    report.reconciled=true;
    console.log(JSON.stringify(report)); // Aggregate counts only. Never log person/account data.
    return report;
  }finally{
    temp.forEach(x=>{try{DriveApp.getFileById(x).setTrashed(true)}catch(e){console.warn('Cannot trash temporary validation file')}});
    lock.releaseLock();
  }
}


/**
 * Phase 2: stage a complete, validated four-file batch to NEW PRIVATE sheets.
 * Never changes active source IDs, DUYET_WEBSITE or any public website file.
 * This function can be run manually; see cdstuhueInstallIntakeWatch().
 */
function cdstuhueBatchSignature_(files) {
  const text=files.map(f=>[f.getId(),f.getSize(),f.getLastUpdated().getTime(),'SCHEMA_HEADER_V3'].join(':'))
    .sort().join('|');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text)
    .map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
}
function cdstuhueInputFiles_() {
  const id=PropertiesService.getScriptProperties().getProperty('CDSTUHUE_EXCEL_INBOX_FOLDER_ID');
  if(!id)throw Error('Cần cấu hình thư mục Excel trong Script Properties');
  const dir=DriveApp.getFolderById(id),iterator=dir.getFiles(),files=[];
  while(iterator.hasNext()){
    const file=iterator.next();
    if(!/\.xlsx?$/i.test(file.getName())||
      !['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.getMimeType()))
      throw Error('Thư mục đầu vào có tệp không đúng định dạng Excel');
    files.push(file);
  }
  if(files.length!==4)throw Error('Cần đúng bốn Excel, hiện có '+files.length);
  return {dir,files,signature:cdstuhueBatchSignature_(files)};
}
function cdstuhueStageExcel4_() {
  if(typeof Drive==='undefined'||!Drive.Files||!Drive.Files.create)
    throw Error('Bật Advanced Drive API v3 trước khi chạy');
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Đang có phiên xử lý Excel khác');
  let created=null,completed=false;
  try{
    const input=cdstuhueInputFiles_();
    const props=PropertiesService.getScriptProperties();
    if(props.getProperty('CDSTUHUE_LAST_STAGED_SIGNATURE')===input.signature)
      return {mode:'UNCHANGED',imported:false,message:'Bốn Excel giống đợt đã kiểm tra gần nhất'};
    const label=Utilities.formatDate(new Date(),'Asia/Bangkok','yyyyMMdd_HHmmss');
    created=input.dir.createFolder('STAGED_PRIVATE_'+label);
    const output={schema:1,mode:'STAGED_AWAITING_REVIEW',imported:false,
      reconciled:false,signature:input.signature,
      stagedFolderId:created.getId(),sources:{}};
    for(const f of input.files){
      const c=Drive.Files.create({name:'_CDSTUHUE_PRIVATE_STAGED_',
        mimeType:'application/vnd.google-apps.spreadsheet',parents:[created.getId()]},
        f.getBlob(),{fields:'id'});
      if(!c||!c.id)throw Error('Không chuyển đổi được Excel');
      const ss=SpreadsheetApp.openById(c.id);
      const matched=ss.getSheets().map(sh=>({sh,type:cdstuhueExcelIdentify_(sh)}))
        .filter(x=>!!x.type);
      if(matched.length!==1)throw Error('Excel không nhận diện được loại duy nhất');
      const obj=matched[0];
      if(output.sources[obj.type])throw Error('Hai file trùng loại '+obj.type);
      const summary=cdstuhueExcelValidate_(obj.type,obj.sh);
      const targetTab=cdstuhueNormalizeStagedSheet_(obj.type,obj.sh);
      DriveApp.getFileById(c.id).setName('CDSTUHUE STAGING '+obj.type+' '+label);
      output.sources[obj.type]={id:c.id,tab:targetTab,summary,sourceName:f.getName()};
    }
    const keys=['THU_NOP','THU_NOP_CITY','CHUA_KHAI','NGAN_HANG'];
    if(keys.some(k=>!output.sources[k]))throw Error('Bộ bốn Excel thiếu một nguồn');
    const unit=output.sources.THU_NOP.summary,city=output.sources.THU_NOP_CITY.summary;
    if(city.members<unit.members||city.required<unit.required||
       city.received!==unit.received||city.notFiled<unit.notFiled||
       city.notFiled!==output.sources.CHUA_KHAI.summary.rows)
      throw Error('Tổng thành phố, 46 Đảng bộ và chưa khai báo chưa đối chiếu khớp');
    output.reconciled=true;
    // Write a manifest ONLY to the private STATS HUB's staging tab.
    const hubId=props.getProperty('CDSTUHUE_STATS_HUB_ID');
    if(!hubId)throw Error('Chưa cấu hình CDSTUHUE_STATS_HUB_ID để ghi sổ nháp');
    const hub=SpreadsheetApp.openById(hubId);
    const tab=hub.getSheetByName('DU_LIEU_CHO_DUYET');
    if(!tab)throw Error('Không thấy tab DU_LIEU_CHO_DUYET trong STATS HUB');
    const names={THU_NOP:'Thu nộp 46 Đảng bộ',THU_NOP_CITY:'Tổng toàn thành phố',
      CHUA_KHAI:'Chưa khai báo',NGAN_HANG:'Ngân hàng'};
    const items=keys.map(k=>[k,names[k],output.sources[k].id,output.sources[k].tab,
      output.sources[k].summary.rows,'CHỜ XÁC NHẬN KỲ',output.sources[k].sourceName,
      'ĐẠT - CHỜ DUYỆT','Nháp riêng tư; chưa cập nhật NGUON_4_FILE']);
    tab.getRange(1,1,5,9).setValues([[
      'MÃ NGUỒN','LOẠI BÁO CÁO','ID SHEET NHÁP RIÊNG TƯ','TAB ĐÃ CHUẨN HÓA',
      'SỐ DÒNG','KỲ NGUỒN','EXCEL GỐC','TRẠNG THÁI','GHI CHÚ'],...items]);
    // Store metadata only; leave approval states and active source tables intact.
    props.setProperty('CDSTUHUE_PENDING_STAGE_JSON',JSON.stringify(output));
    props.setProperty('CDSTUHUE_LAST_STAGED_SIGNATURE',input.signature);
    completed=true;
    console.log('Staged four validated Excel sources for owner review (no public writes).');
    return {mode:output.mode,imported:false,reconciled:true,
      stagedFolderId:output.stagedFolderId,
      sources:Object.fromEntries(keys.map(k=>[k,output.sources[k].summary]))};
  }finally{
    if(created&&!completed){
      try{
        const itr=created.getFiles();
        while(itr.hasNext())itr.next().setTrashed(true);
        created.setTrashed(true);
      }catch(e){console.warn('Manual cleanup of failed private staging may be required');}
    }
    lock.releaseLock();
  }
}

