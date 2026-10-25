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
    if(!['THU_NOP','CHUA_KHAI','PHAN_BO','NGAN_HANG'].includes(key))return;
    const id=String(r[2]).trim(),tab=String(r[3]).trim();
    if(!/^[A-Za-z0-9_-]{20,}$/.test(id)||!tab)throw new Error('Invalid private source configuration');
    src[key]={id,tab,snapshot:String(r[5]||'')};
  });
  if(Object.keys(src).length!==4)throw new Error('Incomplete private source configuration');
  // Period is owner-controlled in the private STATS HUB. Never infer a new month
  // from today's date, because the underlying upload may still be from last month.
  // For backward compatibility the missing KY_BAO_CAO tab means October 2026.
  const monthSheet=hub.getSheetByName('KY_BAO_CAO');
  const period=monthSheet?String(monthSheet.getRange('B2').getDisplayValue()||'').trim():'2026-10';
  if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(period))
    throw new Error('Invalid private KY_BAO_CAO!B2. Expected YYYY-MM.');
  const periodSource=String(src.THU_NOP.snapshot||'').trim();
  const dateIso=periodSource.match(/^(20\\d{2})-(0[1-9]|1[0-2])(?:-\\d{2})?$/);
  const dateVi=periodSource.match(/^\\d{2}\\/(0[1-9]|1[0-2])\\/(20\\d{2})$/);
  const sourcePeriod=dateIso?(dateIso[1]+'-'+dateIso[2]):dateVi?(dateVi[2]+'-'+dateVi[1]):'';
  if(sourcePeriod&&sourcePeriod!==period)
    return {schema:1,public:false,reviewed:false,period,modules:{},
      note:'Kỳ báo cáo không trùng mốc nguồn THU_NOP, chờ đối chiếu và duyệt lại.'};
  // A new month must be explicitly reapproved after that month starts.
  if(period!=='2026-10'&&(!lastApprovedDate||lastApprovedDate.slice(0,7)<period))
    return {schema:1,public:false,reviewed:false,period,modules:{},
      note:'Chưa có xác nhận duyệt của kỳ báo cáo mới.'};
  const keys={payment:'TỔNG HỢP THU NỘP',ranking:'XẾP HẠNG 46 ĐƠN VỊ',
     missing:'CHƯA KHAI BÁO THEO ĐƠN VỊ CHA',allocation:'XÁC NHẬN PHÂN BỔ',
     banking:'TÀI KHOẢN NGÂN HÀNG'};
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
  const orgKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  if(enabled.payment||enabled.ranking){
    const list=statsRows_(src.THU_NOP.id,src.THU_NOP.tab,3,14)
      .filter(r=>statsNumber_(r[0])>0&&String(r[1]||'').trim());
    if(list.length!==46)throw new Error('Unexpected number of payment reporting units');
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
      if(!unit||!parent)continue;
      counts[parent]=(counts[parent]||0)+1;n++;
      missingOrgRows.push({unit,parent});
    }
    const byParent=Object.keys(counts).filter(k=>counts[k]>=20)
      .map(name=>({name:name.slice(0,190),rows:counts[name]}))
      .sort((a,b)=>b.rows-a.rows||a.name.localeCompare(b.name,'vi')).slice(0,30);
    modules.missing={rowCount:n,distinctParents:Object.keys(counts).length,
      rowsByParent:byParent,countType:'Số dòng trong danh sách, không xác nhận số người duy nhất',
      noCrossSourceReconciliation:true,sourceSnapshot:src.CHUA_KHAI.snapshot};
  }
  if(enabled.allocation){
    const statuses={XAC_NHAN:0,CHUA_XAC_NHAN:0,TY_LE_TD_CHO_XAC_NHAN:0};
    let valid=0;
    statsRows_(src.PHAN_BO.id,src.PHAN_BO.tab,2,3).forEach(r=>{
      const key=String(r[2]||'').trim();
      if(Object.prototype.hasOwnProperty.call(statuses,key)){statuses[key]++;valid++;}
    });
    modules.allocation={rowCount:valid,confirmed:statuses.XAC_NHAN,
      unconfirmed:statuses.CHUA_XAC_NHAN,waitingRate:statuses.TY_LE_TD_CHO_XAC_NHAN,
      sourceSnapshot:src.PHAN_BO.snapshot};
  }
  // Only public organization identifiers, parent links and status cells are read.
  // Column F (bank account number) and individual confirmation columns are NEVER read.
  let unitTree=null;
  if(enabled.allocation||enabled.banking||enabled.missing){
    const sh=SpreadsheetApp.openById(src.NGAN_HANG.id).getSheetByName(src.NGAN_HANG.tab);
    if(!sh)throw new Error('Missing banking hierarchy source');
    const n=sh.getLastRow()-1;
    if(n>25000)throw new Error('Bank source exceeds safety size');
    const info=n>0?sh.getRange(2,2,n,4).getDisplayValues():[];
    const status=enabled.banking&&n>0?sh.getRange(2,8,n,1).getDisplayValues():[];
    const nodes={};
    info.forEach(r=>{const code=String(r[0]||'').trim(),name=String(r[1]||'').trim(),parent=String(r[2]||'').trim();
      if(code&&name&&!Object.prototype.hasOwnProperty.call(nodes,code))nodes[code]={name:name.slice(0,190),parent};});
    const roots=Object.keys(nodes).filter(code=>nodes[code].parent==='A57');
    if(roots.length!==46)throw new Error('Unexpected level-2 organization count');
    const rootSet=new Set(roots);
    function rootOf(code){
      let key=String(code||'').trim(),seen=new Set();
      for(let depth=0;depth<20&&key&&!seen.has(key);depth++){
        if(rootSet.has(key))return key;
        seen.add(key);key=nodes[key]?.parent||'';
      }
      return '';
    }
    unitTree={roots,nodes,rootOf,info,status};
    if(enabled.banking){
      let registered=0,notRegistered=0,unmapped=0;
      const groups={};
      roots.forEach(code=>{groups[code]={name:nodes[code].name,total:0,done:0};});
      info.forEach((r,i)=>{
        const state=String(status[i]?.[0]||'').trim();
        if(state!=='Đã có tài khoản ngân hàng'&&state!=='Chưa có tài khoản ngân hàng')return;
        if(state==='Đã có tài khoản ngân hàng')registered++;else notRegistered++;
        const root=rootOf(r[0]);
        if(!root){unmapped++;return;}
        groups[root].total++;
        if(state==='Đã có tài khoản ngân hàng')groups[root].done++;
      });
      const all=registered+notRegistered;
      const ranked=statsUnitRankings_(Object.values(groups));
      modules.banking={rowCount:all,registered,notRegistered,
        registrationRate:all?registered/all:null,
        unitRanking:ranked,unmappedForRanking:unmapped,
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
        if(mappedTotal!==all-unmapped||mappedDone>registered)
          throw new Error('Bank aggregate count mismatch');
        rows.forEach((r,i)=>{r.bankDone=mapped[i].done;r.bankTotal=mapped[i].total;});
      }
    }
  }

  // Public missing-record ranking: only counts from organization names unambiguously
  // linked to exactly one of the 46 level-2 organizations. No person-level data.
  if(enabled.missing&&unitTree&&missingOrgRows){
    const orgKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const nameRoots={};
    unitTree.info.forEach(r=>{
      const root=unitTree.rootOf(r[0]),key=orgKey(r[1]);
      if(!root||!key)return;
      if(!nameRoots[key])nameRoots[key]=new Set();
      nameRoots[key].add(root);
    });
    const groups={};
    unitTree.roots.forEach(code=>{groups[code]={name:unitTree.nodes[code].name,count:0};});
    let matched=0,unmatched=0;
    missingOrgRows.forEach(r=>{
      const candidates=nameRoots[orgKey(r.parent)];
      const child=nameRoots[orgKey(r.unit)];
      let code='';
      if(candidates&&candidates.size===1)code=[...candidates][0];
      else if(candidates&&candidates.size>1&&child&&child.size===1){
        const possible=[...child][0];
        if(candidates.has(possible))code=possible;
      }
      // Never assign by the child name alone if its parent is not identifiable.
      if(code){groups[code].count++;matched++;}else unmatched++;
    });
    if(matched+unmatched===modules.missing.rowCount&&unitTree.roots.length===46){
      const records=Object.values(groups);
      const byName=(a,b)=>a.name.localeCompare(b.name,'vi');
      const top=records.slice().sort((a,b)=>b.count-a.count||byName(a,b)).slice(0,10);
      const bottom=records.slice().sort((a,b)=>a.count-b.count||byName(a,b)).slice(0,10);
      modules.missing.level2Ranking={eligibleUnits:46,matchedRows:matched,unmatchedRows:unmatched,top,bottom};
    }
  }
  // Allocation sheet has only agency name and status; duplicated names such as
  // "Chi bộ 1" across multiple branches cannot be assigned to a level-2 unit.
  // Optional G column "Mã cơ quan" can enable fully verified per-unit rankings.
  if(enabled.allocation&&unitTree){
    const sh=SpreadsheetApp.openById(src.PHAN_BO.id).getSheetByName(src.PHAN_BO.tab);
    if(!sh)throw new Error('Missing allocation sheet');
    const hasCodes=String(sh.getRange(1,7).getDisplayValue()||'').trim()==='Mã cơ quan';
    if(hasCodes){
      const count=sh.getLastRow()-1;
      if(count>25000)throw new Error('Allocation source exceeds safety size');
      const rows=count>0?sh.getRange(2,3,count,1).getDisplayValues():[];
      const codes=count>0?sh.getRange(2,7,count,1).getDisplayValues():[];
      const groups={};unitTree.roots.forEach(c=>{groups[c]={name:unitTree.nodes[c].name,total:0,done:0};});
      let valid=0,mapped=0;
      rows.forEach((r,i)=>{
        const status=String(r[0]||'').trim();
        if(!['XAC_NHAN','CHUA_XAC_NHAN','TY_LE_TD_CHO_XAC_NHAN'].includes(status))return;
        valid++;
        const code=unitTree.rootOf(codes[i]?.[0]);
        if(!code)return;
        mapped++;groups[code].total++;
        if(status==='XAC_NHAN')groups[code].done++;
      });
      // No partial denominators, no guessed matches and no unverified Top 10.
      if(valid===modules.allocation.rowCount&&mapped===valid){
        modules.allocation.unitRanking=statsUnitRankings_(Object.values(groups));
      }
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