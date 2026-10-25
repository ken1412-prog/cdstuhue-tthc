/**
 * CDSTUHUE: check four source Excel files: 46 units, city summary, unfiled, banking.
 * Requires Apps Script advanced Drive service v3 and private script property
 * CDSTUHUE_EXCEL_INBOX_FOLDER_ID. Execute cdstuhuePreflightExcel4 manually.
 */
function cdstuhueExcelNormalize_(value) {
  return String(value == null ? '' : value).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase()
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function cdstuhueExcelInt_(v,where) {
  const n=typeof v==='number'?v:(typeof v==='string'&&/^\d+$/.test(v.trim())?Number(v.trim()):NaN);
  if(!Number.isSafeInteger(n)||n<0)throw Error('Số không hợp lệ ở '+where);
  return n;
}
function cdstuhueExcelIdentify_(sh) {
  if(sh.getLastRow()<2||sh.getMaxColumns()<6)return '';
  const rows=sh.getRange(1,1,2,Math.min(14,sh.getMaxColumns())).getDisplayValues();
  const h=(r,c)=>cdstuhueExcelNormalize_(rows[r][c]);
  if(h(0,1)==='ten don vi'&&h(1,2).includes('tong sl dang vien')&&h(1,11).includes('tong tien theo ho so')) {
    const n=sh.getLastRow()-2;
    return n===46?'THU_NOP':n===1?'THU_NOP_CITY':'';
  }
  // Accept canonical six-column layout and the exported layout with MA DON VI in B.
  if ((h(0,1)==='ten don vi'&&h(0,2)==='ten dang vien'&&h(0,3)==='don vi cha') ||
      (h(0,1)==='ma don vi'&&h(0,2)==='ten don vi'&&h(0,3)==='ten dang vien'&&h(0,4)==='don vi cha'))
    return 'CHUA_KHAI';
  if(h(0,1)==='ma co quan'&&h(0,2)==='ten co quan'&&h(0,3)==='ma co quan cha'&&
      (h(0,5).includes('trang thai cau hinh tai khoan ngan hang') ||
       h(0,7).includes('trang thai cau hinh tai khoan ngan hang')))
    return 'NGAN_HANG';
  return '';
}
function cdstuhueExcelValidate_(type,sh) {
  const first=(type==='THU_NOP'||type==='THU_NOP_CITY')?3:2, n=sh.getLastRow()-first+1;
  if(n<1||n>25000)throw Error(type+': số dòng không hợp lệ');
  if(type==='THU_NOP'||type==='THU_NOP_CITY') {
    if(n!==(type==='THU_NOP'?46:1)||sh.getMaxColumns()<14)
      throw Error(type+': sai số dòng hoặc thiếu cột (46 đơn vị / 1 tổng thành phố)');
    const rows=sh.getRange(3,1,n,14).getValues(), names=new Set();
    let members=0,required=0,received=0,notFiled=0;
    rows.forEach((r,i)=>{
      const line=i+3, name=cdstuhueExcelNormalize_(r[1]);
      if(cdstuhueExcelInt_(r[0],'STT '+line)!==i+1||!name||names.has(name))throw Error('THU_NOP: mã thứ tự/tên đơn vị sai tại dòng '+line);
      names.add(name);
      const total=cdstuhueExcelInt_(r[2],'C'+line), filed=[7,8,9].reduce((a,j)=>a+cdstuhueExcelInt_(r[j],'H-J'+line),0);
      if(filed>total+1||cdstuhueExcelInt_(r[10],'K'+line)>total)throw Error('THU_NOP: hồ sơ vượt số đảng viên dòng '+line);
      const due=cdstuhueExcelInt_(r[11],'L'+line),done=cdstuhueExcelInt_(r[12],'M'+line);
      if(done>due)throw Error('THU_NOP: tiền nộp vượt tiền phải nộp dòng '+line);
      members+=total;required+=due;received+=done;
      notFiled+=cdstuhueExcelInt_(r[10],'K'+line);
    });
    if(!required)throw Error('THU_NOP: tổng tiền chưa có');
    if(type==='THU_NOP_CITY'&&
        cdstuhueExcelNormalize_(rows[0][1])!=='dang bo thanh pho hue')
      throw Error('THU_NOP_CITY: tên dòng tổng thành phố không hợp lệ');
    return {rows:n,members,required,received,notFiled};
  }
  if(type==='CHUA_KHAI') {
    if(sh.getMaxColumns()<6)throw Error('CHUA_KHAI: thiếu cột');
    // Never read column C (personal names).
    const h=sh.getRange(1,1,1,6).getDisplayValues()[0].map(cdstuhueExcelNormalize_);
    const shifted=h[1]==='ma don vi'&&h[2]==='ten don vi'&&h[4]==='don vi cha';
    const unit=sh.getRange(2,shifted?3:2,n,1).getDisplayValues(),
      parent=sh.getRange(2,shifted?5:4,n,1).getDisplayValues();
    for(let i=0;i<n;i++)if(!String(unit[i][0]).trim()||!String(parent[i][0]).trim())throw Error('CHUA_KHAI: thiếu đơn vị dòng '+(i+2));
    return {rows:n};
  }
  if(type==='NGAN_HANG') {
    const header=sh.getRange(1,1,1,Math.min(8,sh.getMaxColumns())).getDisplayValues()[0];
    const statusCol=cdstuhueExcelNormalize_(header[7]||'').includes('trang thai cau hinh tai khoan ngan hang')?8:6;
    const names=sh.getRange(2,2,n,2).getDisplayValues(),
      states=sh.getRange(2,statusCol,n,1).getDisplayValues();
    let registered=0,notRegistered=0;
    for(let i=0;i<n;i++){
      if(!String(names[i][0]).trim()||!String(names[i][1]).trim())throw Error('NGAN_HANG: thiếu mã/tên đơn vị dòng '+(i+2));
      const s=String(states[i][0]).trim();
      if(s==='Đã có tài khoản ngân hàng')registered++;
      else if(s==='Chưa có tài khoản ngân hàng')notRegistered++;
      else throw Error('NGAN_HANG: trạng thái không xác định dòng '+(i+2));
    }
    return {rows:n,registered,notRegistered,layout:statusCol===8?'canonical':'uploaded6'};
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
  const text=files.map(f=>[f.getId(),f.getSize(),f.getLastUpdated().getTime()].join(':'))
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
function cdstuhueNormalizeStagedSheet_(type,sheet) {
  const ss=sheet.getParent(),last=sheet.getLastRow();
  if(type==='CHUA_KHAI'){
    const head=sheet.getRange(1,1,1,6).getDisplayValues()[0].map(cdstuhueExcelNormalize_);
    if(head[1]==='ten don vi'&&head[3]==='don vi cha')return sheet.getName();
    if(head[1]!=='ma don vi'||head[2]!=='ten don vi'||head[4]!=='don vi cha')
      throw Error('CHUA_KHAI: không thể chuẩn hóa thứ tự cột');
    const dest=ss.insertSheet('CHUA_KHAI_CHUAN');
    if(dest.getMaxRows()<last)dest.insertRowsAfter(dest.getMaxRows(),last-dest.getMaxRows());
    // Processing stays inside the private Sheet; no personal rows enter logs or public JSON.
    for(let pos=1;pos<=last;pos+=500){
      const chunk=sheet.getRange(pos,1,Math.min(500,last-pos+1),6).getValues();
      dest.getRange(pos,1,chunk.length,6).setValues(
        chunk.map(r=>[r[0],r[2],r[3],r[4],r[5],r[1]]));
    }
    dest.setFrozenRows(1);
    return dest.getName();
  }
  if(type==='NGAN_HANG'){
    const head=sheet.getRange(1,1,1,Math.min(8,sheet.getMaxColumns())).getDisplayValues()[0];
    if(cdstuhueExcelNormalize_(head[7]||'').includes('trang thai cau hinh tai khoan ngan hang'))
      return sheet.getName();
    if(!cdstuhueExcelNormalize_(head[5]||'').includes('trang thai cau hinh tai khoan ngan hang'))
      throw Error('NGAN_HANG: thiếu cột trạng thái F');
    // Keep original 6 columns untouched; H is canonical for the existing aggregator.
    sheet.getRange(1,8,last,1).setValues(sheet.getRange(1,6,last,1).getValues());
  }
  return sheet.getName();
}
function cdstuhueStageExcel4() {
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
/** Optional owner-installed hourly check; NEVER publishes without approval. */
function cdstuhueAutoIntakeWatch() {
  const props=PropertiesService.getScriptProperties();
  const input=cdstuhueInputFiles_();
  if(input.signature!==props.getProperty('CDSTUHUE_LAST_STAGED_SIGNATURE'))
    return cdstuhueStageExcel4();
  return {mode:'UNCHANGED',imported:false};
}
function cdstuhueInstallIntakeWatch() {
  const exists=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='cdstuhueAutoIntakeWatch');
  if(!exists)ScriptApp.newTrigger('cdstuhueAutoIntakeWatch').timeBased().everyHours(1).create();
  return {hourly:true,changesPublicData:false};
}
