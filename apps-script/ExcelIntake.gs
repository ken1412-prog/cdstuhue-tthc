/**
 * CDSTUHUE: check four source Excel files: 46 units, city summary, unfiled, banking.
 * Requires Apps Script advanced Drive service v3 and private script property
 * CDSTUHUE_EXCEL_INBOX_FOLDER_ID. Execute cdstuhuePreflightExcel4 manually.
 */
// Logical fields, not fixed Excel column letters. Only required information
// must survive a future export; optional headers and their ordering may change.
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
  cdstuhueExcelRequired_(family,desc.cols);
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
      const h=cdstuhueExcelInt_(data.pending[i],type+' / pending dòng '+line);
      const j=cdstuhueExcelInt_(data.approvedNotPaid[i],type+' / approvedNotPaid dòng '+line);
      const k=cdstuhueExcelInt_(data.approvedPaid[i],type+' / approvedPaid dòng '+line);
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
  cdstuhueExcelRequired_(family,desc.cols);
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
      return row;
    });
    normalized.getRange(head.length+begin+1,1,count,width).setValues(rows);
  }
  return tab;
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


/**
 * Phase 3: owner-approved, explicit promotion. No public /exec endpoint calls this.
 * Source validation and owner approval are two separate gates.
 *
 * From the spreadsheet menu:
 *  1. stage four Excel files
 *  2. review DU_LIEU_CHO_DUYET and mark all four H cells "ĐÃ DUYỆT"
 *  3. run this function and type "DUYET YYYY-MM" in the owner-only UI
 * Existing DUYET_WEBSITE scope tokens are preserved. Approval dates for
 * previously enabled modules are re-stamped only after this explicit action.
 */
function cdstuhueApproveStagedBatch() {
  const ui=SpreadsheetApp.getUi();
  const props=PropertiesService.getScriptProperties();
  const hubId=props.getProperty('CDSTUHUE_STATS_HUB_ID');
  if(!hubId)throw Error('Thiếu Script Property CDSTUHUE_STATS_HUB_ID');
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw Error('Đợt nhập liệu khác đang chạy');
  try {
    const raw=props.getProperty('CDSTUHUE_PENDING_STAGE_JSON');
    if(!raw)throw Error('Chưa có lượt Excel chờ duyệt. Chạy cdstuhueStageExcel4 trước');
    const pending=JSON.parse(raw),keys=['THU_NOP','THU_NOP_CITY','CHUA_KHAI','NGAN_HANG'];
    if(pending.mode!=='STAGED_AWAITING_REVIEW'||pending.reconciled!==true||
       keys.some(key=>!pending.sources?.[key]))throw Error('Dữ liệu nháp chưa đạt kiểm tra');
    if(props.getProperty('CDSTUHUE_ACTIVE_STAGE_SIGNATURE')===pending.signature)
      throw Error('Bộ Excel này đã được chuyển nguồn trước đó');
    const input=cdstuhueInputFiles_();
    if(input.signature!==pending.signature)
      throw Error('Bốn tệp Excel đã thay đổi sau kiểm tra: cần tạo bản nháp mới');
    const hub=SpreadsheetApp.openById(hubId);
    const pendingTab=hub.getSheetByName('DU_LIEU_CHO_DUYET'),
      registry=hub.getSheetByName('NGUON_4_FILE'),
      policy=hub.getSheetByName('DUYET_WEBSITE');
    if(!pendingTab||!registry||!policy)
      throw Error('Thiếu tab quản trị cần thiết trong STATS HUB');
    const rows=pendingTab.getRange(2,1,4,9).getDisplayValues();
    const byKey={};rows.forEach(r=>{if(byKey[r[0]])throw Error('Lặp mã nguồn trong bảng chờ duyệt');byKey[r[0]]=r;});
    const snapshots={};
    keys.forEach(key=>{
      const r=byKey[key],x=pending.sources[key];
      if(!r||r[2]!==x.id||r[3]!==x.tab||
         Number(r[4])!==x.summary.rows||
         String(r[7]||'').trim()!=='ĐÃ DUYỆT')
        throw Error('Nguồn '+key+' chưa được duyệt hoặc đã đổi sau kiểm tra');
      const snapshot=String(r[5]||'').trim();
      if(!/^20\d{2}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(snapshot))
        throw Error('Nguồn '+key+' thiếu kỳ/ngày YYYY-MM hoặc YYYY-MM-DD ở cột F');
      snapshots[key]=snapshot;
      const sh=SpreadsheetApp.openById(x.id).getSheetByName(x.tab);
      if(!sh)throw Error('Sheet chuẩn hóa không tồn tại: '+key);
      const now=cdstuhueExcelValidate_(key,sh);
      if(now.rows!==x.summary.rows||JSON.stringify(now)!==JSON.stringify(x.summary))
        throw Error('Dữ liệu nháp '+key+' đã đổi sau kiểm tra; chạy lại');
    });
    if(snapshots.THU_NOP.slice(0,7)!==snapshots.THU_NOP_CITY.slice(0,7))
      throw Error('46 Đảng bộ và báo cáo thành phố phải cùng kỳ');
    // Do not let this handler close/open a reporting month automatically.
    const monthSheet=hub.getSheetByName('KY_BAO_CAO');
    const period=monthSheet?String(monthSheet.getRange('B2').getDisplayValue()||'').trim():'2026-10';
    if(snapshots.THU_NOP.slice(0,7)!==period)
      throw Error('Kỳ Excel khác KY_BAO_CAO; cần chốt và chuyển kỳ đúng quy trình trước');
    const prompt=ui.prompt(
      'Xác nhận chuyển nguồn chính thức',
      'Bốn nguồn đã duyệt, kỳ '+period+'. Chỉ cập nhật dữ liệu tổng hợp và xuất theo phạm vi đã duyệt. Nhập chính xác: DUYET '+period,
      ui.ButtonSet.OK_CANCEL);
    if(prompt.getSelectedButton()!==ui.Button.OK||
        prompt.getResponseText().trim()!=='DUYET '+period)
      return {promoted:false,cancelled:true};
    const snapshot=registry.getRange(2,1,4,8).getValues();
    const oldApproval=policy.getRange(2,1,5,5).getValues();
    // Keep prior registry for audit/recovery; no raw/person rows enter the log.
    const previous=JSON.stringify({
      changedAt:new Date().toISOString(),registry:snapshot,
      approvals:oldApproval.map(r=>[r[0],r[1],r[3],r[4]])
    });
    if(previous.length>=9000)throw Error('Old configuration exceeds audit safety limit');
    const newRegistry=keys.map(key=>{
      const x=pending.sources[key],old=snapshot.find(r=>r[0]===key);
      return [key,byKey[key][1],x.id,x.tab,x.summary.rows,snapshots[key],
        old?.[6]||'Dữ liệu đã đối chiếu trong CDSTUHUE',
        'RIÊNG TƯ'];
    });
    // Compute/read all aggregates before editing live config.
    const payment=SpreadsheetApp.openById(pending.sources.THU_NOP.id)
      .getSheetByName(pending.sources.THU_NOP.tab).getRange(3,1,46,14).getValues();
    const city=SpreadsheetApp.openById(pending.sources.THU_NOP_CITY.id)
      .getSheetByName(pending.sources.THU_NOP_CITY.tab).getRange(3,1,1,14).getValues()[0];
    const bank=pending.sources.NGAN_HANG.summary,missing=pending.sources.CHUA_KHAI.summary;
    const number=v=>cdstuhueExcelInt_(v,'Private aggregate');
    const sum=col=>payment.reduce((n,r)=>n+number(r[col]),0);
    const people=sum(2),due=sum(11),paid=sum(12),noFile=sum(10),
      cityPeople=number(city[2]),cityDue=number(city[11]),
      cityPaid=number(city[12]),cityMissing=number(city[10]);
    if(cityPaid!==paid||cityMissing!==missing.rows||
       cityPeople<people||cityDue<due||bank.registered+bank.notRegistered!==bank.rows)
      throw Error('Reconciliation changed after review; no publication');
    const ranking=payment.map(r=>({
      name:String(r[1]||'').trim(),members:number(r[2]),due:number(r[11]),
      paid:number(r[12]),noFile:number(r[10]),pending:number(r[7]),
      paidFiled:number(r[9])})).sort((a,b)=>
        (b.paid/b.due)-(a.paid/a.due)||a.name.localeCompare(b.name,'vi'))
      .map((r,i)=>[i+1,r.name,r.members,r.due,r.paid,r.paid/r.due,
        r.noFile,r.pending,r.paidFiled,r.members>=100?'ĐỦ':'KHÔNG']);
    if(ranking.length!==46||ranking.some(r=>!Number.isFinite(r[5])))
      throw Error('Không thể xếp hạng từ nguồn vừa duyệt');
    const overview=hub.getSheetByName('TONG_QUAN'),
      rankings=hub.getSheetByName('XEP_HANG_SNAPSHOT');
    if(!overview||!rankings)throw Error('Thiếu tab tổng hợp của STATS HUB');
    // Only known dashboard value cells are updated. Keep B20:B21 formulas intact.
    const oldValues={
      b2b9:overview.getRange('B2:B9').getValues(),
      a10e12:overview.getRange('A10:E12').getValues(),
      b13b19:overview.getRange('B13:B19').getValues(),
      ranking:rankings.getRange('A2:J47').getValues()
    };
    try {
      registry.getRange(2,1,4,8).setValues(newRegistry);
      overview.getRange('B2:B9').setValues([
        [46],[people],[due],[paid],[paid/due],[noFile],[missing.rows],[missing.rows-noFile]]);
      // PHAN_BO retired. Remove legacy display fields, not the archived source.
      overview.getRange('A10:E12').clearContent();
      overview.getRange('B13:B19').setValues([
        [bank.registered],[bank.notRegistered],[bank.registered/bank.rows],
        [cityPeople],[cityMissing],[cityPeople-people],[cityPaid/cityDue]]);
      rankings.getRange('A2:J47').setValues(ranking);
      // Explicit batch approval renews the existing public scopes, never adds scopes.
      const stamp=Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd');
      const refreshed=oldApproval.map(row=>{
        if(String(row[1]).trim()==='ĐÃ DUYỆT')row[3]=stamp;
        return row;
      });
      policy.getRange(2,1,5,5).setValues(refreshed);
    }catch(e){
      // Best-effort rollback of active registry and private aggregates.
      try{
        registry.getRange(2,1,4,8).setValues(snapshot);
        overview.getRange('B2:B9').setValues(oldValues.b2b9);
        overview.getRange('A10:E12').setValues(oldValues.a10e12);
        overview.getRange('B13:B19').setValues(oldValues.b13b19);
        rankings.getRange('A2:J47').setValues(oldValues.ranking);
        policy.getRange(2,1,5,5).setValues(oldApproval);
      }catch(rollback){console.error('PROMOTION ROLLBACK FAILED: restore previous private config manually');}
      throw e;
    }
    props.setProperty('CDSTUHUE_PREVIOUS_CONFIG_JSON',previous);
    props.setProperty('CDSTUHUE_ACTIVE_STAGE_SIGNATURE',pending.signature);
    props.deleteProperty('CDSTUHUE_PENDING_STAGE_JSON');
    pendingTab.getRange(2,8,4,1).setValues(keys.map(()=>['ĐÃ CHUYỂN NGUỒN']));
    ui.alert('Đã chuyển 4 nguồn đã duyệt vào STATS HUB. Website sẽ nhận qua lịch GitHub Actions; không cần AI tính lại.');
    return {promoted:true,period,rows:keys.map(k=>[k,pending.sources[k].summary.rows])};
  }finally{
    lock.releaseLock();
  }
}
/** Menu wrappers: never expose approval as a public web endpoint. */
function cdstuhueCheckExcelMenu() {
  const result=cdstuhuePreflightExcel4();
  SpreadsheetApp.getUi().alert(result.valid?'Bốn file hợp lệ. Có thể tạo bản nháp.':'Kiểm tra thất bại');
}
function cdstuhueStageExcelMenu() {
  const result=cdstuhueStageExcel4();
  SpreadsheetApp.getUi().alert(result.mode==='STAGED_AWAITING_REVIEW'?
    'Đã tạo bản nháp riêng tư. Mở STATS HUB / DU_LIEU_CHO_DUYET để kiểm tra và duyệt.':
    'Bộ bốn Excel không thay đổi so với lượt đã nạp.');
}
