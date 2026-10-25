/**
 * CDSTUHUE: check four newly uploaded Excel files without changing any live data.
 * Requires Apps Script advanced Drive service v3 and private script property
 * CDSTUHUE_EXCEL_INBOX_FOLDER_ID. Execute cdstuhuePreflightExcel4 manually.
 */
function cdstuhueExcelNormalize_(value) {
  return String(value == null ? '' : value).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function cdstuhueExcelInt_(v,where) {
  const n=typeof v==='number'?v:(typeof v==='string'&&/^\d+$/.test(v.trim())?Number(v.trim()):NaN);
  if(!Number.isSafeInteger(n)||n<0)throw Error('Số không hợp lệ ở '+where);
  return n;
}
function cdstuhueExcelIdentify_(sh) {
  if(sh.getLastRow()<2||sh.getMaxColumns()<8)return '';
  const rows=sh.getRange(1,1,2,Math.min(14,sh.getMaxColumns())).getDisplayValues();
  const h=(r,c)=>cdstuhueExcelNormalize_(rows[r][c]);
  if(h(0,1)==='ten don vi'&&h(1,2).includes('tong sl dang vien')&&h(1,11).includes('tong tien theo ho so'))return 'THU_NOP';
  if(h(0,1)==='ten don vi'&&h(0,2)==='ten dang vien'&&h(0,3)==='don vi cha')return 'CHUA_KHAI';
  if(h(0,1)==='ten co quan'&&h(0,2)==='trang thai xac nhan')return 'PHAN_BO';
  if(h(0,1)==='ma co quan'&&h(0,2)==='ten co quan'&&h(0,3)==='ma co quan cha'&&h(0,7).includes('trang thai cau hinh tai khoan ngan hang'))return 'NGAN_HANG';
  return '';
}
function cdstuhueExcelValidate_(type,sh) {
  const first=type==='THU_NOP'?3:2, n=sh.getLastRow()-first+1;
  if(n<1||n>25000)throw Error(type+': số dòng không hợp lệ');
  if(type==='THU_NOP') {
    if(n!==46||sh.getMaxColumns()<14)throw Error('THU_NOP: phải đủ 46 đơn vị / 14 cột');
    const rows=sh.getRange(3,1,46,14).getValues(), names=new Set();
    let members=0,required=0,received=0;
    rows.forEach((r,i)=>{
      const line=i+3, name=cdstuhueExcelNormalize_(r[1]);
      if(cdstuhueExcelInt_(r[0],'STT '+line)!==i+1||!name||names.has(name))throw Error('THU_NOP: mã thứ tự/tên đơn vị sai tại dòng '+line);
      names.add(name);
      const total=cdstuhueExcelInt_(r[2],'C'+line), filed=[7,8,9].reduce((a,j)=>a+cdstuhueExcelInt_(r[j],'H-J'+line),0);
      if(filed>total+1||cdstuhueExcelInt_(r[10],'K'+line)>total)throw Error('THU_NOP: hồ sơ vượt số đảng viên dòng '+line);
      const due=cdstuhueExcelInt_(r[11],'L'+line),done=cdstuhueExcelInt_(r[12],'M'+line);
      if(done>due)throw Error('THU_NOP: tiền nộp vượt tiền phải nộp dòng '+line);
      members+=total;required+=due;received+=done;
    });
    if(!required)throw Error('THU_NOP: tổng tiền chưa có');
    return {rows:n,members,required,received};
  }
  if(type==='CHUA_KHAI') {
    if(sh.getMaxColumns()<6)throw Error('CHUA_KHAI: thiếu cột');
    // Never read column C (personal names).
    const unit=sh.getRange(2,2,n,1).getDisplayValues(),parent=sh.getRange(2,4,n,1).getDisplayValues();
    for(let i=0;i<n;i++)if(!String(unit[i][0]).trim()||!String(parent[i][0]).trim())throw Error('CHUA_KHAI: thiếu đơn vị dòng '+(i+2));
    return {rows:n};
  }
  if(type==='PHAN_BO') {
    const counters={XAC_NHAN:0,CHUA_XAC_NHAN:0,TY_LE_TD_CHO_XAC_NHAN:0};
    sh.getRange(2,3,n,1).getDisplayValues().forEach((r,i)=>{
      const k=String(r[0]).trim();
      if(!Object.prototype.hasOwnProperty.call(counters,k))throw Error('PHAN_BO: trạng thái không xác định dòng '+(i+2));
      counters[k]++;
    });
    return {rows:n,statuses:counters};
  }
  if(type==='NGAN_HANG') {
    const names=sh.getRange(2,2,n,2).getDisplayValues(),states=sh.getRange(2,8,n,1).getDisplayValues();
    let registered=0,notRegistered=0;
    for(let i=0;i<n;i++){
      if(!String(names[i][0]).trim()||!String(names[i][1]).trim())throw Error('NGAN_HANG: thiếu mã/tên đơn vị dòng '+(i+2));
      const s=String(states[i][0]).trim();
      if(s==='Đã có tài khoản ngân hàng')registered++;
      else if(s==='Chưa có tài khoản ngân hàng')notRegistered++;
      else throw Error('NGAN_HANG: trạng thái không xác định dòng '+(i+2));
    }
    return {rows:n,registered,notRegistered};
  }
  throw Error('Không nhận diện được cấu trúc Excel');
}
function cdstuhuePreflightExcel4() {
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
    if(['THU_NOP','CHUA_KHAI','PHAN_BO','NGAN_HANG'].some(k=>!report.sources[k]))throw Error('Chưa đủ bốn loại báo cáo');
    console.log(JSON.stringify(report)); // Aggregate counts only. Never log person/account data.
    return report;
  }finally{
    temp.forEach(x=>{try{DriveApp.getFileById(x).setTrashed(true)}catch(e){console.warn('Cannot trash temporary validation file')}});
    lock.releaseLock();
  }
}
