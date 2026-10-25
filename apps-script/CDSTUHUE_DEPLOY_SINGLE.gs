/* CDSTUHUE OWNER DEPLOY SINGLE-FILE BUNDLE */

/* Contains Code.gs + ExcelIntake.gs. Do NOT keep duplicate old .gs modules in the Apps Script project. */

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
    .addSeparator()
    .addItem('Kiểm tra 4 file Excel', 'cdstuhueCheckExcelMenu')
    .addItem('Nhập 4 Excel thành bản nháp', 'cdstuhueStageExcelMenu')
    .addItem('Duyệt và chuyển nguồn chính thức', 'cdstuhueApproveStagedBatch')
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
    const payload=kind==='finance'?buildFinanceFeed_():kind==='qa'?buildPublicFeed_():kind==='intake-status'?questionIntakeStatus_():kind==='stats'?buildStatsFeed_():kind==='menu'?buildMenuFeed_():{schema:1,error:'Unknown public feed type'};
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


/* REPORTING HUB — only owner-reviewed, aggregated statistics.
 * NEVER publish person names, CCCD, phone numbers, account numbers, or raw rows.
 * Script property: CDSTUHUE_STATS_HUB_ID
 * Gated by DUYET_WEBSITE col B = ĐÃ DUYỆT AND valid approval date in col D.
 * A source edit updates the next approved aggregate export; no direct VNeID access.
 */
function statsNumber_(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s=String(v||'').trim().replace(/\s/g,'');
  if(!s) return 0;
  const n=Number(s.replace(/,/g,''));
  return Number.isFinite(n) ? n : 0;
}
function statsWhole_(n){return Math.max(0,Math.round(statsNumber_(n)));}
function statsRows_(id,tab,firstRow,colCount){
  const sh=SpreadsheetApp.openById(id).getSheetByName(tab);
  if(!sh)throw new Error('Stats source not found');
  const size=sh.getLastRow()-firstRow+1;
  if(size<=0)return [];
  if(size>25000)throw new Error('Source exceeds safety size limit');
  return sh.getRange(firstRow,1,size,colCount).getValues();
}
function statsUnitRankings_(items){
  const list=items.filter(x=>x&&x.total>0&&x.done>=0&&x.done<=x.total)
    .map(x=>({name:String(x.name||'').slice(0,190),total:x.total,done:x.done,rate:x.done/x.total}));
  if(list.length!==46)return null;
  const byName=(a,b)=>a.name.localeCompare(b.name,'vi');
  const top=list.slice().sort((a,b)=>b.rate-a.rate||b.total-a.total||byName(a,b)).slice(0,10);
  const bottom=list.slice().sort((a,b)=>a.rate-b.rate||b.total-a.total||byName(a,b)).slice(0,10);
  return {eligibleUnits:list.length,top,bottom};
}
function buildStatsFeed_(){
  const hubId=PropertiesService.getScriptProperties().getProperty('CDSTUHUE_STATS_HUB_ID');
  if(!hubId)return {schema:1,public:false,reviewed:false,modules:{},message:'Chưa cấu hình thống kê công khai.'};
  const hub=SpreadsheetApp.openById(hubId);
  const policy=hub.getSheetByName('DUYET_WEBSITE');
  const sources=hub.getSheetByName('NGUON_4_FILE');
  if(!policy||!sources)throw new Error('Missing reporting hub configuration');
  const gates={};
  const approvedScopes={};
  let lastApprovedDate='';
  policy.getRange(2,1,5,5).getDisplayValues().forEach(r=>{
    const rawDate=String(r[3]||'').trim();
    const m=rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const iso=m?m[3]+'-'+m[2]+'-'+m[1]:rawDate;
    const dateValid=/^\d{4}-\d{2}-\d{2}$/.test(iso)&&
      !Number.isNaN(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso;
    const approved=String(r[1]).trim()==='ĐÃ DUYỆT'&&dateValid;
    const key=String(r[0]).trim();
    gates[key]=approved;
    approvedScopes[key]=approved?String(r[4]||''):'';
    if(approved&&iso>lastApprovedDate)lastApprovedDate=iso;
  });
  const src={};
  sources.getRange(2,1,4,8).getDisplayValues().forEach(r=>{
    const key=String(r[0]).trim();
    if(!['THU_NOP','THU_NOP_CITY','CHUA_KHAI','NGAN_HANG'].includes(key))return;
    const id=String(r[2]).trim(),tab=String(r[3]).trim();
    if(!/^[A-Za-z0-9_-]{20,}$/.test(id)||!tab)throw new Error('Invalid private source configuration');
    src[key]={id,tab,snapshot:String(r[5]||'')};
  });
  // Transition-safe: legacy PHAN_BO is ignored until the hub switches to THU_NOP_CITY.
  if(!src.THU_NOP||!src.CHUA_KHAI||!src.NGAN_HANG)
    throw new Error('Incomplete private source configuration');
  if(Object.keys(src).length>4)throw new Error('Too many source configurations');
  // Period is owner-controlled in the private STATS HUB. Never infer a new month
  // from today's date, because the underlying upload may still be from last month.
  // For backward compatibility the missing KY_BAO_CAO tab means October 2026.
  const monthSheet=hub.getSheetByName('KY_BAO_CAO');
  const period=monthSheet?String(monthSheet.getRange('B2').getDisplayValue()||'').trim():'2026-10';
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period))
    throw new Error('Invalid private KY_BAO_CAO!B2. Expected YYYY-MM.');
  const periodSource=String(src.THU_NOP.snapshot||'').trim();
  const dateIso=periodSource.match(/^(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  const dateVi=periodSource.match(/^\d{2}\/(0[1-9]|1[0-2])\/(20\d{2})$/);
  const sourcePeriod=dateIso?(dateIso[1]+'-'+dateIso[2]):dateVi?(dateVi[2]+'-'+dateVi[1]):'';
  if(sourcePeriod&&sourcePeriod!==period)
    return {schema:1,public:false,reviewed:false,period,modules:{},
      note:'Kỳ báo cáo không trùng mốc nguồn THU_NOP, chờ đối chiếu và duyệt lại.'};
  // A new month must be explicitly reapproved after that month starts.
  if(period!=='2026-10'&&(!lastApprovedDate||lastApprovedDate.slice(0,7)<period))
    return {schema:1,public:false,reviewed:false,period,modules:{},
      note:'Chưa có xác nhận duyệt của kỳ báo cáo mới.'};
  const keys={payment:'TỔNG HỢP THU NỘP',ranking:'XẾP HẠNG 46 ĐƠN VỊ',
     missing:'CHƯA KHAI BÁO THEO ĐƠN VỊ CHA',banking:'TÀI KHOẢN NGÂN HÀNG'};
  const enabled=Object.fromEntries(Object.entries(keys).map(([k,name])=>[k,!!gates[name]]));
  const count=Object.values(enabled).filter(Boolean).length;
  if(count===0)return {schema:1,public:false,reviewed:false,period,modules:{},note:'Chưa có phân hệ thống kê được duyệt công khai.'};
  const modules={};let payments=null;
  // Existing approval permits only names/rates; extra per-unit aggregates need
  // their own explicit DUYET_WEBSITE scope tokens before public export.
  const bankXYApproved=enabled.banking&&approvedScopes['TÀI KHOẢN NGÂN HÀNG'].includes('BANK_XY_BY_LEVEL2');
  const filedRateApproved=enabled.ranking&&approvedScopes['XẾP HẠNG 46 ĐƠN VỊ'].includes('HS_DECLARED_RATE');
  // Publishing integer numerator/denominator per unit requires a separate
  // approval from the existing percentage-only scope.
  const filedXYApproved=enabled.ranking&&approvedScopes['XẾP HẠNG 46 ĐƠN VỊ'].includes('HS_FILED_XY_BY_LEVEL2');
  // Owner-approved three-way status totals: no individual-level records.
  const filingStatusApproved=enabled.ranking&&approvedScopes['XẾP HẠNG 46 ĐƠN VỊ'].includes('HS_FILING_STATUS_SUMMARY_46');
  const orgKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  if(enabled.payment||enabled.ranking){
    const list=statsRows_(src.THU_NOP.id,src.THU_NOP.tab,3,14)
      .filter(r=>statsNumber_(r[0])>0&&String(r[1]||'').trim());
    if(list.length!==46)throw new Error('Unexpected number of payment reporting units');

    // City summary is one control row, not another of the 46 units.
    // Optional only during the migration of the private source registry.
    if(src.THU_NOP_CITY){
      const cityRows=statsRows_(src.THU_NOP_CITY.id,src.THU_NOP_CITY.tab,3,14)
        .filter(r=>statsNumber_(r[0])>0&&String(r[1]||'').trim());
      if(cityRows.length!==1||orgKey(cityRows[0][1])!==orgKey('Đảng bộ Thành phố Huế'))
        throw new Error('Invalid city-level summary source');
      const city=cityRows[0],sums={members:0,noFile:0,due:0,paid:0};
      list.forEach(r=>{
        sums.members+=statsWhole_(r[2]);sums.noFile+=statsWhole_(r[10]);
        sums.due+=statsWhole_(r[11]);sums.paid+=statsWhole_(r[12]);
      });
      if(statsWhole_(city[2])<sums.members||
          statsWhole_(city[10])<sums.noFile||
          statsWhole_(city[11])<sums.due||
          statsWhole_(city[12])!==sums.paid)
        throw new Error('City summary does not reconcile with 46 payment units');
      // The city control totals are private unless separately approved.
    }

    let sumRequired=0,sumReceived=0;
    payments=list.map(r=>{
      const required=statsWhole_(r[11]),received=statsWhole_(r[12]);
      sumRequired+=required;sumReceived+=received;
      // Use total members from source column C as requested denominator.
      // H+I+J are three filed-case statuses; K denotes no filing.
      // Do not silently substitute H+I+J+K or fee-paying membership.
      const members=statsWhole_(r[2]);
      const filed=[7,8,9].reduce((n,i)=>n+statsWhole_(r[i]),0);
      const reconciled=members>0&&filed<=members;
      return {name:String(r[1]).trim().slice(0,190),members,required,
        rate:required>0?received/required:null,
        filedDone:reconciled?filed:null,
        filedTotal:reconciled?members:null,
        filedRate:reconciled?filed/members:null};
    });
    if(filingStatusApproved&&list.length===46){
      // H = filed but awaiting review; I+J = reviewed (fee unpaid or paid);
      // K = not filed. Use the same 46 organization rows as the ranking.
      let members=0,completed=0,pendingApproval=0,notFiled=0;
      let valid=true,sourceOverage=0,sourceDiscrepancyUnits=0;
      list.forEach(r=>{
        const total=statsWhole_(r[2]),h=statsWhole_(r[7]),
          i=statsWhole_(r[8]),j=statsWhole_(r[9]),k=statsWhole_(r[10]);
        if(total<=0)valid=false;
        const extra=Math.max(0,h+i+j+k-total);
        if(extra>0){sourceOverage+=extra;sourceDiscrepancyUnits++;}
        members+=total;
        pendingApproval+=h;completed+=i+j;notFiled+=k;
      });
      const unclassified=members-completed-pendingApproval-notFiled;
      // Only a single 1-record source overage can be reported without changing
      // actual input values. Larger inconsistencies still block publishing.
      if(valid&&members>0&&unclassified>=0&&sourceOverage<=1&&sourceDiscrepancyUnits<=1){
        modules.filingSummary={
          totalMembers:members,completed,pendingApproval,notFiled,unclassified,
          sourceOverage,sourceDiscrepancyUnits,
          interpretation:'Completed means reviewed filing; payment may still be pending.',
          scope:'46 Đảng bộ cấp 2 trong báo cáo thu nộp',
          sourceSnapshot:src.THU_NOP.snapshot
        };
      }
    }
    if(enabled.payment)modules.payment={
      scope:'46 đơn vị trong báo cáo',
      completionRate:sumRequired>0?sumReceived/sumRequired:null,
      metric:'Tỷ lệ thu nộp của kỳ báo cáo',
      sourceSnapshot:src.THU_NOP.snapshot
    };
    if(enabled.ranking){
      const ranked=payments.filter(x=>x.required>0)
        .sort((a,b)=>(b.rate||0)-(a.rate||0)||a.name.localeCompare(b.name,'vi'))
        .map((x,i)=>({rank:i+1,name:x.name,rate:x.rate,
          ...((filedRateApproved||filedXYApproved)&&x.filedRate!==null?{filedRate:x.filedRate}:{}),
          ...(filedXYApproved&&x.filedDone!==null&&x.filedTotal!==null?
             {filedDone:x.filedDone,filedTotal:x.filedTotal}:{})}));
      modules.ranking={
        scope:'46 Đảng bộ trực thuộc Thành ủy Huế trong báo cáo',
        eligibleUnits:ranked.length,
        sort:'Tỷ lệ thu nộp; đồng tỷ lệ xếp theo tên',
        records:ranked,sourceSnapshot:src.THU_NOP.snapshot,
        approvedExtraFields:{filedRate:filedRateApproved||filedXYApproved,
          filedXY:filedXYApproved,bankXY:bankXYApproved}};
    }
  }
  let missingOrgRows=null;
  if(enabled.missing){
    const sh=SpreadsheetApp.openById(src.CHUA_KHAI.id).getSheetByName(src.CHUA_KHAI.tab);
    if(!sh)throw new Error('Missing undeclared records source');
    const size=sh.getLastRow()-1;
    if(size>25000)throw new Error('Missing records source exceeds safety size limit');
    // Only organization-name columns B and D. Never read column C (person name).
    const unitNames=size>0?sh.getRange(2,2,size,1).getDisplayValues():[];
    const parentNames=size>0?sh.getRange(2,4,size,1).getDisplayValues():[];
    const counts={};let n=0;
    missingOrgRows=[];
    for(let i=0;i<size;i++){
      const unit=String(unitNames[i]?.[0]||'').trim(),parent=String(parentNames[i]?.[0]||'').trim();
      if(unit&&parent){counts[parent]=(counts[parent]||0)+1;n++;}
      missingOrgRows.push({unit,parent});
    }
    const byParent=Object.keys(counts).filter(k=>counts[k]>=20)
      .map(name=>({name:name.slice(0,190),rows:counts[name]}))
      .sort((a,b)=>b.rows-a.rows||a.name.localeCompare(b.name,'vi')).slice(0,30);
    modules.missing={rowCount:n,distinctParents:Object.keys(counts).length,
      rowsByParent:byParent,countType:'Số dòng trong danh sách, không xác nhận số người duy nhất',
      noCrossSourceReconciliation:false,sourceSnapshot:src.CHUA_KHAI.snapshot};
  }
  // Only public organization identifiers, parent links and status cells are read.
  // Column F (bank account number) and individual confirmation columns are NEVER read.
  let unitTree=null;
  if(enabled.banking||enabled.missing){
    const sh=SpreadsheetApp.openById(src.NGAN_HANG.id).getSheetByName(src.NGAN_HANG.tab);
    if(!sh)throw new Error('Missing banking hierarchy source');
    const n=sh.getLastRow()-1;
    if(n>25000)throw new Error('Bank source exceeds safety size');
    const info=n>0?sh.getRange(2,2,n,4).getDisplayValues():[];
    const status=enabled.banking&&n>0?sh.getRange(2,8,n,1).getDisplayValues():[];
    const nodes={};
    info.forEach(r=>{const code=String(r[0]||'').trim(),name=String(r[1]||'').trim(),parent=String(r[2]||'').trim();
      if(code&&name&&!Object.prototype.hasOwnProperty.call(nodes,code))nodes[code]={name:name.slice(0,190),parent};});
    // The owner excludes the military/border-guard branches A57.12 / A57.13
    // and the specific police sub-branch A57.121.39 from the 46-unit report.
    // Prefix boundaries are deliberate: A57.121 and its other children stay.
    const isExcludedCaQs=code=>{
      const c=String(code||'').trim();
      return /^A57\.(?:12|13)(?:\.|$)/.test(c)||/^A57\.121\.39(?:\.|$)/.test(c);
    };
    const roots=Object.keys(nodes).filter(code=>nodes[code].parent==='A57'&&!isExcludedCaQs(code));
    if(roots.length!==46)throw new Error('Unexpected level-2 organization count');
    const rootSet=new Set(roots);
    function rootOf(code){
      let key=String(code||'').trim(),seen=new Set();
      for(let depth=0;depth<20&&key&&!seen.has(key);depth++){
        if(isExcludedCaQs(key))return '';
        if(rootSet.has(key))return key;
        seen.add(key);key=nodes[key]?.parent||'';
      }
      return '';
    }
    unitTree={roots,nodes,rootOf,info,status,isExcludedCaQs};
    if(enabled.banking){
      let registered=0,notRegistered=0,unmapped=0;
      const excludedCaQsUnits=info.filter(r=>isExcludedCaQs(r[0])).length;
      const excludedCityRoot=info.filter(r=>String(r[0]||'').trim()==='A57').length;
      const groups={};
      roots.forEach(code=>{groups[code]={name:nodes[code].name,total:0,done:0};});
      info.forEach((r,i)=>{
        const state=String(status[i]?.[0]||'').trim();
        if(state!=='Đã có tài khoản ngân hàng'&&state!=='Chưa có tài khoản ngân hàng')return;
        if(String(r[0]||'').trim()==='A57'||isExcludedCaQs(r[0]))return;
        const root=rootOf(r[0]);
        if(!root){unmapped++;return;}
        if(state==='Đã có tài khoản ngân hàng')registered++;else notRegistered++;
        groups[root].total++;
        if(state==='Đã có tài khoản ngân hàng')groups[root].done++;
      });
      // Both numerator and denominator contain ONLY organizations mapped to 46
      // direct-level-2 units. Do not dilute the rate with CA/QS or city root.
      const all=registered+notRegistered;
      const ranked=statsUnitRankings_(Object.values(groups));
      modules.banking={rowCount:all,registered,notRegistered,
        registrationRate:all?registered/all:null,
        unitRanking:ranked,unmappedForRanking:unmapped,
        excludedCaQsUnits,excludedCityRoot,
        sourceSnapshot:src.NGAN_HANG.snapshot};
      if(bankXYApproved&&modules.ranking?.records?.length===46){
        const byName=new Map(),rows=modules.ranking.records;
        Object.values(groups).forEach(g=>{
          const key=orgKey(g.name);
          if(byName.has(key))throw new Error('Ambiguous level-2 bank organization name');
          byName.set(key,g);
        });
        if(byName.size!==46||rows.some(r=>!byName.has(orgKey(r.name))))
          throw new Error('Bank/payment names do not fully reconcile');
        const mapped=rows.map(r=>byName.get(orgKey(r.name)));
        const mappedTotal=mapped.reduce((n,g)=>n+g.total,0);
        const mappedDone=mapped.reduce((n,g)=>n+g.done,0);
        if(mappedTotal!==all||mappedDone!==registered)
          throw new Error('Bank aggregate count mismatch');
        rows.forEach((r,i)=>{r.bankDone=mapped[i].done;r.bankTotal=mapped[i].total;});
      }
    }
  }

  // Exclude out-of-scope or unassignable missing-filed member records.
  // Read only organization names and parent links; never person/account fields.
  if(enabled.missing&&unitTree&&missingOrgRows){
    const byName={},roots=new Set(unitTree.roots);
    unitTree.info.forEach(r=>{
      const code=String(r[0]||'').trim(),name=String(r[1]||'').trim();
      if(!code||!name)return;
      const key=orgKey(name);
      if(!byName[key])byName[key]=[];
      byName[key].push({code,
        parentCode:String(r[2]||'').trim(),
        parentName:String(r[3]||'').trim(),
        root:unitTree.isExcludedCaQs(code)?'EXCLUDED':unitTree.rootOf(code)});
    });
    const distinctRoots=items=>[...new Set(items.map(x=>x.root).filter(Boolean))];
    const groups={};
    unitTree.roots.forEach(code=>{groups[code]={name:unitTree.nodes[code].name,count:0};});
    const sourceRowCount=missingOrgRows.length;
    // Reproduce the published 46-Đảng-bộ unresolved cohort without reading personal names.
    // Distinct organizations use (unit name, parent name), not unit name alone.
    const publishRootsByName={};
    unitTree.info.forEach(r=>{
      const key=orgKey(r[1]),root=unitTree.rootOf(r[0]);
      if(!key||!root)return;
      if(!publishRootsByName[key])publishRootsByName[key]=new Set();
      publishRootsByName[key].add(root);
    });
    const unlinkedPairs=new Set(),unlinkedNames=new Set(),unlinkedParents=new Set();
    let unlinkedSourceRows=0;
    missingOrgRows.forEach(r=>{
      const pk=orgKey(r.parent),uk=orgKey(r.unit);
      const pr=publishRootsByName[pk],cr=publishRootsByName[uk];
      let resolved='';
      if(pr&&pr.size===1)resolved=[...pr][0];
      else if(pr&&pr.size>1&&cr&&cr.size===1){
        const candidate=[...cr][0];
        if(pr.has(candidate))resolved=candidate;
      }
      if(resolved)return;
      unlinkedSourceRows++;
      unlinkedPairs.add(uk+'|'+pk);
      if(uk)unlinkedNames.add(uk);
      if(pk)unlinkedParents.add(pk);
    });

    let matched=0,excludedCaQsRows=0,excludedNoParentRows=0;
    let excludedAmbiguousRows=0,excludedIncompleteRows=0;
    const matchedOrgRows=[];
    missingOrgRows.forEach(r=>{
      const parentKey=orgKey(r.parent),unitKey=orgKey(r.unit);
      if(!parentKey||!unitKey){excludedIncompleteRows++;return;}
      const parents=byName[parentKey]||[],children=byName[unitKey]||[];
      // The (child, parent) pair disambiguates repeated Chi bộ names.
      // A bank parent code link is accepted only for a named parent candidate.
      const paired=children.filter(child=>
        orgKey(child.parentName)===parentKey||
        parents.some(parent=>parent.code===child.parentCode));
      const pairedRoots=distinctRoots(paired),parentRoots=distinctRoots(parents);
      let candidates=[];
      if(pairedRoots.length===1)candidates=pairedRoots;
      else if(parentRoots.length===1)candidates=parentRoots;
      else if(pairedRoots.length>1)candidates=pairedRoots;
      else if(parentRoots.length>1)candidates=parentRoots;
      else if(parentKey===orgKey('Đảng bộ Thành phố Huế')){
        // A57 is level 1. Its exactly named level-2 child can be mapped.
        const childRoots=distinctRoots(children);
        if(childRoots.length===1&&roots.has(childRoots[0])&&
           orgKey(unitTree.nodes[childRoots[0]].name)===unitKey)
          candidates=childRoots;
      }
      if(candidates.length===1&&candidates[0]==='EXCLUDED'){
        excludedCaQsRows++;return;
      }
      if(candidates.length===1&&roots.has(candidates[0])){
        groups[candidates[0]].count++;matched++;matchedOrgRows.push(r);return;
      }
      if(candidates.length>1)excludedAmbiguousRows++;
      else if(!parents.length)excludedNoParentRows++;
      else excludedAmbiguousRows++;
    });
    if(matched+excludedCaQsRows+excludedNoParentRows+
       excludedAmbiguousRows+excludedIncompleteRows!==sourceRowCount)
      throw new Error('Missing-filed scope reconciliation mismatch');
    missingOrgRows=matchedOrgRows;
    const counts={};
    missingOrgRows.forEach(r=>{counts[r.parent]=(counts[r.parent]||0)+1;});
    const byParent=Object.keys(counts).filter(k=>counts[k]>=20)
      .map(name=>({name:name.slice(0,190),rows:counts[name]}))
      .sort((a,b)=>b.rows-a.rows||a.name.localeCompare(b.name,'vi')).slice(0,30);
    modules.missing.rowCount=matched;
    modules.missing.sourceRowCount=sourceRowCount;
    modules.missing.distinctParents=Object.keys(counts).length;
    modules.missing.rowsByParent=byParent;
    modules.missing.excludedCaQsRows=excludedCaQsRows;
    modules.missing.excludedNoParentRows=excludedNoParentRows;
    modules.missing.excludedAmbiguousRows=excludedAmbiguousRows;
    modules.missing.excludedIncompleteRows=excludedIncompleteRows;
    modules.missing.unlinkedSourceRows=unlinkedSourceRows;
    modules.missing.unlinkedUnitPairs=unlinkedPairs.size;
    modules.missing.unlinkedDistinctNames=unlinkedNames.size;
    modules.missing.unlinkedParentNames=unlinkedParents.size;
    const records=Object.values(groups);
    const byUnitName=(a,b)=>a.name.localeCompare(b.name,'vi');
    const top=records.slice().sort((a,b)=>b.count-a.count||byUnitName(a,b)).slice(0,10);
    const bottom=records.slice().sort((a,b)=>a.count-b.count||byUnitName(a,b)).slice(0,10);
    modules.missing.level2Ranking={
      eligibleUnits:46,matchedRows:matched,unmatchedRows:0,top,bottom};
    // Write only aggregate counters to the PRIVATE reporting hub.
    // The two TONG_QUAN formulas follow these cells without manual copy/paste.
    try{
      const audit=hub.getSheetByName('DOI_CHIEU_HO_SO');
      if(audit){
        const next=[[unlinkedSourceRows],[unlinkedPairs.size],
          [unlinkedNames.size],[unlinkedParents.size]];
        const prev=audit.getRange(2,2,4,1).getValues();
        if(JSON.stringify(prev)!==JSON.stringify(next))
          audit.getRange(2,2,4,1).setValues(next);
        const stamp=String(src.CHUA_KHAI.snapshot||'').trim();
        if(stamp&&audit.getRange('B7').getDisplayValue()!==stamp)
          audit.getRange('B7').setValue(stamp);
      }
    }catch(auditError){
      console.warn('Private unmatched audit sync skipped: '+String(auditError));
    }
  }
  // IMPORTANT: Never expose source spreadsheet IDs, individual names,
  // personal identities, bank account numbers or raw row contents.
  return {schema:1,public:true,reviewed:true,period,
    approvedDate:lastApprovedDate,
    generatedAt:new Date().toISOString(),source:'Four owner-managed Google Sheets, approved aggregates only',
    warning:'Nguồn có phạm vi khác nhau. Không cộng dồn hoặc đồng nhất chỉ tiêu giữa các báo cáo.',
    modules};
}

/* Owner-managed navigation visibility.
 * Only the connected owner can edit QUAN_TRI_DANH_MUC in the private reporting hub.
 * Public output consists of four boolean flags, never private spreadsheet data.
 * Do not use a password in browser JavaScript: GitHub Pages is public.
 */
function buildMenuFeed_(){
  // Only explicit values from the owner's private Sheet control what is public.
  const defaults={
    'overview':true,'finance':true,'units':false,
    'chinh-thuc':false,'tam-thoi':false,'nhan-xet':false,'dang-phi':false,
    'qa-all':true,'qa-tthc':true,'qa-stdv':true,'qa-csdl':true,
    'resources':false,'reports':false,'guide':false,'assistant':true
  };
  const visible=Object.assign({},defaults);
  const hubId=PropertiesService.getScriptProperties().getProperty('CDSTUHUE_STATS_HUB_ID');
  if(!hubId)return {schema:1,visible};
  const sh=SpreadsheetApp.openById(hubId).getSheetByName('QUAN_TRI_DANH_MUC');
  if(!sh)return {schema:1,visible};
  const n=Math.min(100,Math.max(0,sh.getLastRow()-1));
  if(n)sh.getRange(2,1,n,3).getDisplayValues().forEach(row=>{
    const id=String(row[0]||'').trim();
    const setting=String(row[2]||'').trim();
    if(Object.prototype.hasOwnProperty.call(defaults,id) &&
       (setting==='HIỆN'||setting==='ẨN'))visible[id]=setting==='HIỆN';
  });
  return {schema:1,visible};
}

/* PRIVATE EXCEL INTAKE / OWNER APPROVAL */

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


