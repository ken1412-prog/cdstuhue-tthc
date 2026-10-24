/** CDSTUHUE — Approved-only public JSON feed from the private QA spreadsheet.
 * Install this as a BOUND SCRIPT via Google Sheet → Extensions → Apps Script.
 * Script property CDSTUHUE_SHEET_ID = the actual spreadsheet ID.
 * Deploy Web App: Execute as Me; access: Anyone. Never approve sensitive data.
 * WEB_PUBLISH column K stores a version fingerprint: any change requires reapproval.
 */
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('CDSTUHUE_SHEET_ID');
const APPROVAL_SHEET = 'WEB_PUBLISH';
const FINANCE_SHEET = 'WEB_FINANCE_PUBLIC';
const SOURCE_SHEETS = {'QA TTHC':'tthc','QA STDV':'stdv','QA CSDL 4.0':'csdl'};
const APPROVED_LITERAL = 'ĐÃ DUYỆT';

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Xuất bản website')
    .addItem('Xác nhận duyệt những dòng đang chọn', 'confirmSelectedWebApprovals')
    .addItem('Kiểm tra tổng số đang được xuất bản', 'showWebApprovalCount')
    .addSeparator()
    .addItem('Xác nhận duyệt thống kê đảng phí (dòng chọn)', 'confirmSelectedFinanceApprovals')
    .addToUi();
}

// Fetch exactly five public-source columns: N, O, Q, R, Y.
function readSources_(book) {
  const maps = {};
  Object.keys(SOURCE_SHEETS).forEach(tab => {
    const sh=book.getSheetByName(tab);
    if(!sh) throw new Error('Missing QA source tab');
    const n=sh.getLastRow()-1;
    const m=new Map();
    if(n>0){
      const a=sh.getRange(2,14,n,2).getDisplayValues(); // N:O
      const b=sh.getRange(2,17,n,2).getDisplayValues(); // Q:R
      const d=sh.getRange(2,25,n,1).getDisplayValues(); // Y
      for(let i=0;i<n;i++){
        const id=String(a[i][0]||'').trim();
        if(id&&!m.has(id))m.set(id,{id,topic:String(a[i][1]||'').trim(),
          question:String(b[i][0]||'').trim(),answer:String(b[i][1]||'').trim(),updated:String(d[i][0]||'').trim()});
      }
    }
    maps[tab]=m;
  });
  return maps;
}
function readAllRules_(book) {
  const sh=book.getSheetByName(APPROVAL_SHEET);
  if(!sh)throw new Error('WEB_PUBLISH missing');
  const n=sh.getLastRow()-1;
  return {sh, rows:n>0?sh.getRange(2,1,n,11).getDisplayValues():[]};
}
function makePublic_(rule,src) {
  const [id,sheet,,status,questionOverride,urlRaw,publicNote,approvedAt,answerOverride,keywords]=rule;
  if(String(status||'').trim()!==APPROVED_LITERAL||!SOURCE_SHEETS[sheet]||!src)return null;
  const question=String(questionOverride||src.question).trim();
  const answer=String(answerOverride||src.answer).trim();
  if(!question||!answer)return null;
  const url=String(urlRaw||'').trim();
  return {id:String(id).trim(),group:SOURCE_SHEETS[sheet],topic:src.topic,
    question,answer,keywords:String(keywords||'').trim(),alternatives:'',
    sourceUrl:/^https:\/\/[^\s<>"']+$/i.test(url)?url:'',
    publicNote:String(publicNote||'').trim(),updated:String(approvedAt||src.updated||'').trim(),public:true};
}
function fingerprint_(item) {
  // Hash every field that may become public. A modified source Q/R or public override
  // no longer matches until the reviewer explicitly signs off again.
  const canonical=JSON.stringify(['CDSTUHUE-PUBLIC-V1',item.id,item.group,item.topic,
    item.question,item.answer,item.keywords,item.sourceUrl,item.publicNote,item.updated]);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,canonical,
    Utilities.Charset.UTF_8).map(x=>('0'+(x<0?x+256:x).toString(16)).slice(-2)).join('');
}
function buildPublicFeed_() {
  if(!SPREADSHEET_ID)throw new Error('Missing script property CDSTUHUE_SHEET_ID');
  const book=SpreadsheetApp.openById(SPREADSHEET_ID),sources=readSources_(book);
  const rules=readAllRules_(book).rows;
  const result=[],seen=new Set();
  for(const rule of rules){
    const id=String(rule[0]||'').trim(),tab=String(rule[1]||'').trim();
    if(!id||!SOURCE_SHEETS[tab]||String(rule[3]||'').trim()!==APPROVED_LITERAL)continue;
    const item=makePublic_(rule,sources[tab].get(id));
    if(!item||seen.has(id)||!rule[10]||fingerprint_(item)!==String(rule[10]).trim())continue;
    result.push(item);seen.add(id);
  }
  result.sort((a,b)=>a.group.localeCompare(b.group)||a.id.localeCompare(b.id));
  return {schema:1,generatedAt:new Date().toISOString(),source:'Verified WEB_PUBLISH only',count:result.length,items:result};
}
function doGet(e){
  try {
    const kind=String((e&&e.parameter&&e.parameter.kind)||'qa');
    const payload=kind==='finance'?buildFinanceFeed_():kind==='qa'?buildPublicFeed_():kind==='intake-status'?questionIntakeStatus_():{schema:1,error:'Unknown public feed type'};
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  } catch(err){return ContentService.createTextOutput(JSON.stringify({schema:1,error:'Public feed unavailable'})).setMimeType(ContentService.MimeType.JSON)}
}
// Reviewer selects rows in WEB_PUBLISH, sets D=ĐÃ DUYỆT, and invokes this menu action.
// This stamps column H and hashes the exact public fields into K. A new hash can only
// be set by another explicit review action. Never publish from just a dropdown change.
function confirmSelectedWebApprovals(){
  const ui=SpreadsheetApp.getUi();
  const active=SpreadsheetApp.getActiveSpreadsheet(),sh=active.getActiveSheet();
  if(sh.getName()!==APPROVAL_SHEET){ui.alert('Hãy chọn các dòng trong WEB_PUBLISH.');return}
  if(active.getId()!==SPREADSHEET_ID){ui.alert('Không khớp Google Sheet nguồn.');return}
  const range=sh.getActiveRange();
  if(!range||range.getRow()<=1||range.getNumRows()>100){ui.alert('Chọn từ 1 đến 100 dòng dữ liệu, không chọn hàng tiêu đề.');return}
  const sources=readSources_(active),start=range.getRow(),count=range.getNumRows();
  const original=sh.getRange(start,1,count,11).getDisplayValues();
  const stamp=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');
  let applied=0,skipped=0;
  // Batch by two column ranges only after generating fingerprints for all selected rows.
  const dates=[],hashes=[];
  for(let i=0;i<count;i++){
    const row=original[i].slice(),id=String(row[0]||'').trim(),tab=String(row[1]||'').trim();
    if(row[3]!==APPROVED_LITERAL||!SOURCE_SHEETS[tab]){dates.push([row[7]]);hashes.push([row[10]]);skipped++;continue}
    row[7]=stamp;
    const pub=makePublic_(row,sources[tab].get(id));
    if(!pub){dates.push([original[i][7]]);hashes.push([original[i][10]]);skipped++;continue}
    dates.push([stamp]);hashes.push([fingerprint_(pub)]);applied++;
  }
  if(!applied){ui.alert('Không có dòng ĐÃ DUYỆT hợp lệ trong vùng chọn.');return}
  sh.getRange(start,8,count,1).setValues(dates);sh.getRange(start,11,count,1).setValues(hashes);
  ui.alert('Đã xác nhận '+applied+' bản công khai; bỏ qua '+skipped+'. Nội dung thay đổi sau này phải được duyệt lại.');
}
function showWebApprovalCount(){SpreadsheetApp.getUi().alert('Số mục đủ điều kiện xuất bản: '+buildPublicFeed_().count)}


/** Finance public snapshot. Independent of QA source and VNeID; manually reviewed summaries only.
 * A:M = period/date/source/4 metrics/5 grouped bank counts/public note;
 * N=approval status, O=approved date, P=fingerprint.
 */
const BANK_GROUP_NAMES = ['Đảng bộ trực thuộc Trung ương','Đảng bộ cơ sở','Đảng bộ trực thuộc cơ sở','Đảng bộ bộ phận','Chi bộ'];
function publicNumber_(v){
  const s=String(v==null?'':v).trim();
  if(!s)return null;
  if(!/^\d[\d.,\s]*$/.test(s))return null;
  const n=Number(s.replace(/[.,\s]/g,''));
  return Number.isSafeInteger(n)&&n>=0?n:null;
}
function makeFinance_(r){
  if(String(r[13]||'').trim()!==APPROVED_LITERAL)return null;
  const period=String(r[0]||'').trim(),observedAt=String(r[1]||'').trim(),source=String(r[2]||'').trim();
  if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(period)||!/^20\d\d-\d\d-\d\d$/.test(observedAt)||!source||source.length>240)return null;
  const metrics=r.slice(3,7).map(publicNumber_);
  const names=BANK_GROUP_NAMES;
  const bankGroups=r.slice(7,12).map((v,i)=>({name:names[i],accounts:publicNumber_(v)})).filter(z=>z.accounts!==null);
  if(!metrics.some(v=>v!==null)&&!bankGroups.length)return null;
  return {schema:1,public:true,reviewed:true,period,observedAt,source,
    reportRecords:metrics[0],notDeclared:metrics[1],waitingApproval:metrics[2],waitingPayment:metrics[3],
    bankGroups,notes:String(r[12]||'').trim().slice(0,500),
    approvedAt:String(r[14]||'').trim()};
}
function financeFingerprint_(item){
  const canonical=JSON.stringify(['CDSTUHUE-FINANCE-PUBLIC-V1',item.period,item.observedAt,item.source,
    item.reportRecords,item.notDeclared,item.waitingApproval,item.waitingPayment,item.bankGroups,item.notes,item.approvedAt]);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,canonical,
    Utilities.Charset.UTF_8).map(x=>('0'+(x<0?x+256:x).toString(16)).slice(-2)).join('');
}
function buildFinanceFeed_(){
  if(!SPREADSHEET_ID)throw Error('Missing script property');
  const sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FINANCE_SHEET);
  if(!sheet)throw Error('Missing finance publishing tab');
  const count=sheet.getLastRow()-1, rows=count>0?sheet.getRange(2,1,count,16).getDisplayValues():[];
  const eligible=[];
  for(let i=0;i<rows.length;i++){
    const row=rows[i],p=makeFinance_(row);
    if(!p||!row[15]||financeFingerprint_(p)!==String(row[15]).trim())continue;
    eligible.push({row:i,p});
  }
  if(!eligible.length){return {schema:1,public:false,reviewed:false,period:'',observedAt:'',source:'',
    reportRecords:null,notDeclared:null,waitingApproval:null,waitingPayment:null,bankGroups:[],
    notes:'Chưa có bản thống kê được duyệt công khai.'};}
  // Latest row wins among correctly approved entries, no merging of metrics from different periods.
  eligible.sort((a,b)=>a.p.observedAt.localeCompare(b.p.observedAt)||a.row-b.row);
  return eligible[eligible.length-1].p;
}
function confirmSelectedFinanceApprovals(){
  const ui=SpreadsheetApp.getUi(),book=SpreadsheetApp.getActiveSpreadsheet(),sh=book.getActiveSheet();
  if(!SPREADSHEET_ID||book.getId()!==SPREADSHEET_ID||sh.getName()!==FINANCE_SHEET){
    ui.alert('Chỉ thực hiện trong tab WEB_FINANCE_PUBLIC của Sheet đã kết nối.');return;
  }
  const range=sh.getActiveRange();
  if(!range||range.getRow()<2||range.getNumRows()>50){ui.alert('Chọn tối đa 50 dòng dữ liệu, không chọn hàng tiêu đề.');return;}
  const start=range.getRow(),n=range.getNumRows(),rules=sh.getRange(start,1,n,16).getDisplayValues();
  const stamped=[],hashes=[];let ok=0;
  const date=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');
  for(let i=0;i<n;i++){
    const copy=rules[i].slice();copy[14]=date;
    const snapshot=makeFinance_(copy);
    if(snapshot){stamped.push([date]);hashes.push([financeFingerprint_(snapshot)]);ok++;}
    else {stamped.push([rules[i][14]]);hashes.push([rules[i][15]]);}
  }
  if(!ok){ui.alert('Không có dòng hợp lệ: cần trạng thái ĐÃ DUYỆT, kỳ YYYY-MM, ngày YYYY-MM-DD, nguồn đối chiếu và ít nhất một chỉ số.');return;}
  const response=ui.alert('Xác nhận xuất bản',
    'Bạn đã kiểm tra rằng các chỉ số tổng hợp này được phép công khai, không chứa dữ liệu cá nhân và các con số đúng phạm vi/kỳ báo cáo?',
    ui.ButtonSet.YES_NO);
  if(response!==ui.Button.YES)return;
  sh.getRange(start,15,n,1).setValues(stamped);
  sh.getRange(start,16,n,1).setValues(hashes);
  ui.alert('Đã xác nhận '+ok+' dòng thống kê; nội dung chỉnh sau duyệt sẽ tạm ngừng xuất bản đến khi duyệt lại.');
}


/* PRIVATE QUESTION INTAKE
 * The input is posted by an ordinary browser HTML form; no spreadsheet write
 * permissions are granted to visitors. Never return inbox rows in doGet.
 *
 * Script properties required before enabling:
 *   CDSTUHUE_INBOX_ID            private spreadsheet ID
 *   CDSTUHUE_QUESTIONS_ENABLED   true
 *
 * IMPORTANT: the inbox must be a SEPARATE, OWNER-ONLY Google Sheet.
 * Do not point this to the public or link-shared Q&A spreadsheet.
 */
const INTAKE_TAB = 'INBOX_QUESTIONS';
const INTAKE_GROUPS = {tthc:'TTHC',stdv:'STDV',csdl:'CSDL 4.0'};
function questionIntakeStatus_(){
  const p=PropertiesService.getScriptProperties();
  const enabled=p.getProperty('CDSTUHUE_QUESTIONS_ENABLED')==='true'&&
    !!p.getProperty('CDSTUHUE_INBOX_ID');
  return {schema:1,acceptsQuestions:enabled,privacy:'private-inbox',maxQuestionLength:1200};
}
function intakeSafeText_(value){
  return String(value||'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim();
}
function intakeDigest_(text){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8)
    .map(x=>('0'+(x<0?x+256:x).toString(16)).slice(-2)).join('');
}
function intakeAsLiteral_(text){
  // Google Sheets treats strings beginning with "=" as formulas. Force text.
  const val=intakeSafeText_(text);
  return /^[=+\-@\t\r]/.test(val)?"'"+val:val;
}
function questionReceipt_(message,ok){
  const safe=String(message||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const title=ok?'Đã tiếp nhận câu hỏi':'Không thể tiếp nhận';
  const html='<!doctype html><html lang="vi"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title>'+
    '<style>body{font:15px/1.7 system-ui,Arial;background:#f4f7fb;margin:0;padding:30px;color:#18324f}'+
    '.box{max-width:510px;margin:auto;background:white;padding:27px;border-radius:15px;box-shadow:0 12px 36px #10204012}'+
    'h1{font-size:23px;margin:0 0 12px}p{white-space:pre-wrap}small{color:#657187}</style>'+
    '</head><body><main class="box"><h1>'+title+'</h1><p>'+safe+'</p>'+
    '<small>CDSTUHUE • Không gửi dữ liệu cá nhân hoặc mã OTP.</small></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title);
}
function doPost(e){
  try{
    const ticket=acceptQuestion_(e);
    return questionReceipt_('Đã lưu câu hỏi. Mã tiếp nhận: '+ticket+
      '.\nBộ phận hỗ trợ sẽ rà soát khi có điều kiện. Không có cam kết thời gian phản hồi.',true);
  }catch(err){
    // Error messages below are fixed literals; never reveal IDs, code, stack,
    // or any submitted question text to anonymous callers.
    const msg=String(err&&err.message||'');
    const allowed=['Chức năng nhận câu hỏi chưa bật.','Thiếu thông tin hoặc nội dung không hợp lệ.',
      'Chỉ hỗ trợ câu hỏi liên quan TTHC, STDV, CSDL 4.0.',
      'Vui lòng bỏ thông tin cá nhân, số điện thoại, email và mã định danh.',
      'Hệ thống đang giới hạn lượng câu hỏi, vui lòng thử lại sau.',
      'Câu hỏi này đã được tiếp nhận gần đây.',
      'Hộp thư chưa sẵn sàng.'];
    return questionReceipt_(allowed.includes(msg)?msg:'Không thể lưu câu hỏi ở thời điểm này.',false);
  }
}
function acceptQuestion_(e){
  const prop=PropertiesService.getScriptProperties();
  if(prop.getProperty('CDSTUHUE_QUESTIONS_ENABLED')!=='true')throw Error('Chức năng nhận câu hỏi chưa bật.');
  const inboxId=prop.getProperty('CDSTUHUE_INBOX_ID');
  if(!inboxId)throw Error('Hộp thư chưa sẵn sàng.');
  const params=e&&e.parameter||{};
  const kind=intakeSafeText_(params.kind);
  const group=intakeSafeText_(params.group).toLowerCase();
  const question=intakeSafeText_(params.question).replace(/\s+/g,' ');
  if(kind!=='question'||intakeSafeText_(params.website))throw Error('Thiếu thông tin hoặc nội dung không hợp lệ.');
  if(!Object.prototype.hasOwnProperty.call(INTAKE_GROUPS,group))
    throw Error('Chỉ hỗ trợ câu hỏi liên quan TTHC, STDV, CSDL 4.0.');
  if(question.length<12||question.length>1200||intakeSafeText_(params.consent)!=='yes')
    throw Error('Thiếu thông tin hoặc nội dung không hợp lệ.');
  // Reject common forms of personal data. This is not a full DLP solution.
  if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(question)||
     /(?:\+84|0)[35789]\d{8}\b/.test(question)||
     /\b\d{9,13}\b/.test(question)||
     /(?:OTP|mã xác nhận)\s*[:=]\s*\d{4,8}/i.test(question))
    throw Error('Vui lòng bỏ thông tin cá nhân, số điện thoại, email và mã định danh.');
  const digest=intakeDigest_(group+'\n'+question.toLowerCase());
  const cache=CacheService.getScriptCache();
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw Error('Hệ thống đang giới hạn lượng câu hỏi, vui lòng thử lại sau.');
  try{
    if(cache.get('Q_'+digest))throw Error('Câu hỏi này đã được tiếp nhận gần đây.');
    const book=SpreadsheetApp.openById(inboxId);
    const sh=book.getSheetByName(INTAKE_TAB);
    if(!sh||sh.getRange('A1').getDisplayValue()!=='Mã yêu cầu')
      throw Error('Hộp thư chưa sẵn sàng.');
    const now=new Date();
    const hour=Utilities.formatDate(now,'Asia/Ho_Chi_Minh','yyyy-MM-dd-HH');
    const day=Utilities.formatDate(now,'Asia/Ho_Chi_Minh','yyyy-MM-dd');
    let quota={};
    try{quota=JSON.parse(prop.getProperty('CDSTUHUE_QUESTION_RATE')||'{}')}catch(x){quota={}}
    const hCount=quota.hour===hour?Number(quota.hourCount||0):0;
    const dCount=quota.day===day?Number(quota.dayCount||0):0;
    if(hCount>=30||dCount>=150)throw Error('Hệ thống đang giới hạn lượng câu hỏi, vui lòng thử lại sau.');
    const ticket='Q-'+Utilities.formatDate(now,'Asia/Ho_Chi_Minh','yyMMdd')+'-'+Utilities.getUuid().slice(0,8).toUpperCase();
    const stamp=Utilities.formatDate(now,'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss');
    const next=sh.getLastRow()+1;
    if(next>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),100);
    // Format all input cells as text to avoid formula interpretation/injection.
    sh.getRange(next,1,1,9).setNumberFormat('@');
    sh.getRange(next,1,1,9).setValues([[
      ticket,stamp,INTAKE_GROUPS[group],intakeAsLiteral_(question),
      'MỚI','','',stamp,'Website CDSTUHUE'
    ]]);
    prop.setProperty('CDSTUHUE_QUESTION_RATE',
      JSON.stringify({hour,hourCount:hCount+1,day,dayCount:dCount+1}));
    cache.put('Q_'+digest,'1',3600);
    return ticket;
  }finally{lock.releaseLock();}
}
