/* CDSTUHUE static dashboard. No third-party analytics, no client-side credentials. */
(() => {
'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const E = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fold = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const pretty = new Intl.NumberFormat('vi-VN');
const DATE = d => {if(!d)return 'Chưa cập nhật';const p=Date.parse(d);return Number.isFinite(p)?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(p):String(d)};
const PROCEDURES={
 'chinh-thuc':{title:'Chuyển sinh hoạt chính thức',short:'Sinh hoạt chính thức',help:'Tra cứu hướng dẫn, hồ sơ và tình huống vướng mắc đã được duyệt công khai.',icon:'⇄'},
 'tam-thoi':{title:'Chuyển sinh hoạt tạm thời',short:'Sinh hoạt tạm thời',help:'Tra cứu hướng dẫn và hỏi đáp liên quan đến chuyển sinh hoạt tạm thời.',icon:'◷'},
 'nhan-xet':{title:'Lấy ý kiến nhận xét nơi cư trú',short:'Nhận xét nơi cư trú',help:'Tra cứu hướng dẫn, câu hỏi và tình huống về lấy ý kiến nhận xét nơi cư trú.',icon:'☷'},
 'dang-phi':{title:'Thu, nộp đảng phí',short:'Thu nộp đảng phí',help:'Thống kê tổng hợp theo kỳ và giải đáp vướng mắc đảng phí; chỉ hiển thị bản đã duyệt.',icon:'▣'}
};
const GROUPS={tthc:{name:'TTHC',full:'Thủ tục hành chính',icon:'▣'},stdv:{name:'STDV',full:'Sổ tay Đảng viên',icon:'◷'},csdl:{name:'CSDL 4.0',full:'Cơ sở dữ liệu 4.0',icon:'▥'}};
const demoQA=[
{id:'VD001',group:'tthc',topic:'Giới thiệu chức năng',question:'Làm thế nào để tra cứu một câu hỏi về TTHC trên website?',answer:'Mở mục Hỏi – đáp TTHC ở thanh menu. Gõ từ khóa vào ô tìm kiếm để lọc câu hỏi. Bạn có thể bấm vào một kết quả để đọc câu trả lời và sao chép liên kết tới mục đó. Đây chỉ là nội dung minh họa giao diện.',keywords:'tìm kiếm; hướng dẫn; TTHC',updated:'2026-10-23',demo:true},
{id:'VD002',group:'tthc',topic:'Kiểm duyệt công khai',question:'Làm sao phân biệt thông tin công khai và ghi chú nội bộ?',answer:'Website chỉ sử dụng bản xuất từ tab WEB_PUBLISH. Nội dung câu hỏi và câu trả lời từ các tab nguồn được xuất bản khi mã QA tương ứng có trạng thái ĐÃ DUYỆT. Các cột nguồn Messages nội bộ không được xuất.',keywords:'phê duyệt; công khai; nguồn',updated:'2026-10-23',demo:true},
{id:'VD003',group:'stdv',topic:'Tra cứu theo nhóm',question:'Làm sao chỉ xem các câu hỏi thuộc Sổ tay Đảng viên?',answer:'Chọn Hỏi – đáp Sổ tay ĐV ở menu hoặc bấm vào thẻ STDV trong mục tổng quan. Bộ lọc sẽ chỉ hiển thị dữ liệu thuộc đúng nhóm. Đây là ví dụ minh họa giao diện.',keywords:'Sổ tay; bộ lọc; câu hỏi',updated:'2026-10-23',demo:true},
{id:'VD004',group:'stdv',topic:'Chia sẻ câu hỏi',question:'Có thể gửi đường dẫn trực tiếp đến một câu hỏi không?',answer:'Có. Mở câu hỏi rồi bấm Sao chép liên kết. Khi người khác mở URL, website sẽ điều hướng đến câu hỏi tương ứng nếu mục đó được xuất bản công khai.',keywords:'chia sẻ; đường dẫn; URL',updated:'2026-10-23',demo:true},
{id:'VD005',group:'csdl',topic:'Đồng bộ nội dung',question:'Website lấy các câu hỏi mới ở đâu?',answer:'Google Sheet Hỗ trợ kỹ thuật CDSTUHUE là nguồn gốc. Cơ chế Apps Script tạo JSON chỉ từ các mã QA được duyệt công khai, sau đó GitHub Actions cập nhật website theo lịch. Đây chỉ là mô tả hệ thống đồng bộ, không phải hướng dẫn nghiệp vụ CSDL 4.0.',keywords:'đồng bộ; Google Sheet; CSDL',updated:'2026-10-23',demo:true},
{id:'VD006',group:'csdl',topic:'Quản lý xuất bản',question:'Khi thu hồi quyền công khai, nội dung có biến mất khỏi website?',answer:'Đổi trạng thái sang TẠM ẨN hoặc CHỜ DUYỆT trong WEB_PUBLISH; từ lần xuất bản JSON tiếp theo, mục đó sẽ không có trong dữ liệu mới. Bản đã phát hành trên Internet hoặc đã được lưu trong bộ nhớ đệm có thể tồn tại; tránh duyệt thông tin nhạy cảm.',keywords:'thu hồi; ẩn; cập nhật',updated:'2026-10-23',demo:true}
];
// Snapshot only for local interactive demo. Never treated as verified/public/live data.
const demoFinance={period:'THÁNG MẪU',observedAt:'Ví dụ giả lập',source:'Dữ liệu giả lập để thử giao diện — không phải nguồn TTHC',reportRecords:1240,notDeclared:318,waitingApproval:47,waitingPayment:83,bankGroups:[{name:'Đảng bộ trực thuộc Trung ương',accounts:4},{name:'Đảng bộ cơ sở',accounts:24},{name:'Đảng bộ trực thuộc cơ sở',accounts:41},{name:'Đảng bộ bộ phận',accounts:8},{name:'Chi bộ',accounts:186}],notes:'Toàn bộ số liệu ví dụ là giả lập. Không phản ánh dữ liệu thực tế tại Huế và không được dùng làm báo cáo.'};
const demoProgress=[
{unit:'Đơn vị minh họa A',procedure:'chinh-thuc',progress:85,received:15,completed:12,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa B',procedure:'chinh-thuc',progress:62,received:10,completed:6,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa C',procedure:'chinh-thuc',progress:28,received:8,completed:2,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa A',procedure:'tam-thoi',progress:74,received:8,completed:6,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa B',procedure:'tam-thoi',progress:49,received:9,completed:3,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa C',procedure:'tam-thoi',progress:12,received:2,completed:0,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa A',procedure:'nhan-xet',progress:93,received:20,completed:18,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa B',procedure:'nhan-xet',progress:61,received:14,completed:9,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa C',procedure:'nhan-xet',progress:41,received:7,completed:3,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa A',procedure:'dang-phi',progress:98,received:170,completed:163,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa B',procedure:'dang-phi',progress:79,received:125,completed:99,updated:'2026-10-23',public:true,demo:true},
{unit:'Đơn vị minh họa C',procedure:'dang-phi',progress:54,received:88,completed:47,updated:'2026-10-23',public:true,demo:true}
];
const MENU_DEFAULTS={'overview':true,'finance':true,'units':false,
 'chinh-thuc':false,'tam-thoi':false,'nhan-xet':false,'dang-phi':false,
 'qa-all':true,'qa-tthc':true,'qa-stdv':true,'qa-csdl':true,
 'resources':false,'reports':false,'guide':false,'assistant':true};
const state={menu:{...MENU_DEFAULTS},menuReady:false,pendingView:null,qa:[],progress:[],finance:null,stats:null,view:'overview',filter:'',query:'',unitQuery:'',sort:'default',page:0,generatedAt:'',demo:false,local:false,loadError:null};
const NAV_FALLBACK=['overview','finance','qa-all','qa-tthc','qa-stdv','qa-csdl',
  'resources','reports','guide','units','chinh-thuc','tam-thoi','nhan-xet','dang-phi'];
function viewAllowed(id){return id==='closed'||(id!=='assistant'&&
 Object.prototype.hasOwnProperty.call(MENU_DEFAULTS,id)&&state.menu[id]===true);}
function firstVisibleView(){return NAV_FALLBACK.find(id=>viewAllowed(id))||'closed';}
function procedureMenu(){
 const entries=Object.entries(PROCEDURES).filter(([id])=>viewAllowed(id));
 const nav=$('#procedureNav'),group=$('#procedureMenuGroup');
 if(!nav||!group)return;
 nav.innerHTML=entries.map(([id,item])=>'<button type="button" class="nav-link" data-view="'+E(id)+'"><span class="nav-ico">'+E(item.icon)+'</span><span>'+E(item.title)+'</span></button>').join('');
 nav.hidden=!entries.length;group.hidden=!entries.length;
}
function applyMenuVisibility(){
 $$('[data-view]').forEach(el=>{
  const allowed=viewAllowed(el.dataset.view);el.hidden=!allowed;
  if(allowed)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden','true');
 });
 for(const [navID,groupID] of [['mainNav','coreMenuGroup'],['qaNav','qaMenuGroup'],
  ['utilityNav','utilityMenuGroup']]){
  const nav=$('#'+navID),heading=$('#'+groupID);
  if(!nav||!heading)continue;
  const anyVisible=$$('[data-view]',nav).some(el=>!el.hidden);
  nav.hidden=!anyVisible;heading.hidden=!anyVisible;
 }
 // An information card whose only destination is disabled must disappear too.
 $$('#page .category-grid > .panel').forEach(card=>{
  const links=$$('[data-view]',card);
  if(links.length&&links.every(link=>!viewAllowed(link.dataset.view)))card.hidden=true;
 });
 document.body.classList.remove('menu-loading');
 const helper=$('#openAssistant'),panel=$('#assistantWrap');
 if(helper)helper.hidden=state.menu.assistant!==true;
 if(panel&&state.menu.assistant!==true)panel.classList.add('hidden');
 if(state.menu.reports!==true)
  $$('[data-action="export-qa"],[data-action="export-progress"],[data-action="export-finance"]').forEach(el=>el.hidden=true);
 document.body.classList.remove('menu-loading');
}
const published = ()=>(state.demo?demoQA:state.qa).filter(x=>state.menu['qa-'+x.group]===true);
const progress = ()=>(state.demo?demoProgress:state.progress).filter(x=>state.menu[x.procedure]===true);
const finance = ()=>state.demo?demoFinance:state.finance;
const qgroup = item => ({'QA TTHC':'tthc','QA STDV':'stdv','QA CSDL 4.0':'csdl'}[item?.group]||item?.group||'');
const safeUrl = url => {try{const u=new URL(String(url||''));return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return''}};
const normQA = item=>({id:String(item.id||'').trim(),group:qgroup(item),topic:String(item.topic||'').trim(),question:String(item.question||'').trim(),answer:String(item.answer||'').trim(),keywords:String(item.keywords||''),alternatives:String(item.alternatives||''),updated:String(item.updated||''),sourceUrl:safeUrl(item.sourceUrl),publicNote:String(item.publicNote||'')});
const validProgress = item=>Boolean(item&&item.public===true&&String(item.unit||'').trim()&&PROCEDURES[item.procedure]&&Number.isFinite(Number(item.progress))&&Number(item.progress)>=0&&Number(item.progress)<=100);
async function loadData(){
 const hiddenMenu={...MENU_DEFAULTS};
 try{
  const r=await fetch('data/menu.json',{cache:'no-store'});if(!r.ok)throw Error('Menu unavailable');
  const payload=await r.json();
  if(payload.schema===1&&payload.visible&&typeof payload.visible==='object'){
    for(const id of Object.keys(hiddenMenu))if(typeof payload.visible[id]==='boolean')hiddenMenu[id]=payload.visible[id];
  }
 }catch(err){/* Fail closed: no private administrator settings exposed. */}
 state.menu=hiddenMenu;state.menuReady=true;
 procedureMenu();
 if(state.pendingView){const requested=state.pendingView;state.pendingView=null;state.view=viewAllowed(requested)?requested:firstVisibleView();}
 if(!viewAllowed(state.view))state.view=firstVisibleView();
 const current=new URL(location.href),given=current.searchParams.get('view');
 if(given&&!viewAllowed(given)){
  history.replaceState({},'','index.html?view='+encodeURIComponent(state.view));
 }
 let qa=null,pr=null,fn=null,issues=[];
 try{const r=await fetch('data/approved.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);qa=await r.json();if(!qa||qa.schema!==1||!Array.isArray(qa.items))throw Error('Invalid QA schema');}
 catch(e){issues.push('Không đọc được bản xuất QA: '+e.message);}
 try{const r=await fetch('data/progress.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);pr=await r.json();if(!pr||pr.schema!==1||!Array.isArray(pr.records))throw Error('Invalid progress schema');}
 catch(e){issues.push('Không đọc được tệp tiến độ: '+e.message);}
 try{const r=await fetch('data/finance.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const f=await r.json();if(f?.schema!==1)throw Error('Invalid finance schema');if(f.public===true&&f.reviewed===true&&Array.isArray(f.bankGroups)&&f.bankGroups.every(v=>typeof v.name==='string'&&Number.isInteger(v.accounts)&&v.accounts>=0)&&[f.reportRecords,f.notDeclared,f.waitingApproval,f.waitingPayment].every(v=>v==null||(Number.isInteger(v)&&v>=0))&&[f.reportRecords,f.notDeclared,f.waitingApproval,f.waitingPayment,...f.bankGroups.map(g=>g.accounts)].some(v=>v!=null)){fn=f;}}
 catch(e){issues.push('Không đọc được bản thống kê đảng phí: '+e.message);}
 try{const r=await fetch('data/stats.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const stats=await r.json();state.stats=stats?.schema===1&&stats?.public===true&&stats?.reviewed===true&&stats?.modules&&typeof stats.modules==='object'?stats:null;}catch(e){state.stats=null;}
 state.finance=fn;
 state.qa=qa?qa.items.filter(x=>x&&x.public===true).map(normQA).filter(x=>x.id&&x.question&&x.answer&&GROUPS[x.group]):[];
 // Fail-closed if accidental duplicates/invalid IDs appear in a publication feed.
 const ids=new Set();state.qa=state.qa.filter(x=>{if(ids.has(x.id))return false;ids.add(x.id);return true});
 state.progress=pr?pr.records.filter(validProgress).map(x=>({unit:String(x.unit),procedure:x.procedure,progress:Number(x.progress),received:Number(x.received)||0,completed:Number(x.completed)||0,updated:String(x.updated||'')})):[];
 state.generatedAt=qa?.generatedAt||'';
 state.local=false;
 state.loadError=issues.length?issues.join('; '):null;
 updateGlobal();render();
}
function updateGlobal(){const q=published(),by=g=>q.filter(x=>x.group===g).length;$('#qaTotalSide').textContent=q.length;$('#qaTthcSide').textContent=by('tthc');$('#qaStdvSide').textContent=by('stdv');$('#qaCsdlSide').textContent=by('csdl');$('#updatedTag').textContent=state.demo?'Đang xem dữ liệu minh họa':(state.generatedAt?'Bản xuất '+DATE(state.generatedAt):'Chưa có bản xuất công khai');const approvedDate=state.stats&&state.stats.approvedDate;
 const approvedMatch=typeof approvedDate==='string'?approvedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/):null;
 if(approvedMatch){const el=$('#lastApprovedDate');if(el)el.textContent=approvedMatch[3]+'/'+approvedMatch[2]+'/'+approvedMatch[1];}$('#demoBanner').classList.toggle('hidden',!(state.demo||state.local));$('#demoBanner strong').textContent=state.demo?'ĐANG XEM DỮ LIỆU MINH HỌA':'DỮ LIỆU NHẬP CỤC BỘ';$('#demoBanner span').textContent=state.demo?'Không phải số liệu hoặc câu trả lời thực tế.':'Bản ghi từ máy của bạn, chưa xuất bản hoặc lưu vào hệ thống.';$('#endDemo').textContent=state.demo?'Tắt minh họa ×':'Xóa dữ liệu cục bộ ×'}
function stat(label,note,val,icon){return `<div class="stat-card"><div class="stat-top"><span>${E(label)}</span><span class="stat-icon">${icon}</span></div><div class="stat-number">${E(val)}</div></div>`}
function statusForProgress(rows){if(!rows.length)return null;let units=new Set(rows.map(x=>x.unit));const avg=rows.reduce((a,x)=>a+x.progress,0)/rows.length;const done=rows.filter(x=>x.progress>=99.9).length;const doing=rows.filter(x=>x.progress>0&&x.progress<99.9).length;return {units:units.size,avg,done,doing,records:rows.length}}
function msgEmpty(what){return `<div class="notice"><div class="big-icon">▤</div><strong>${E(what||'Chưa có dữ liệu công khai')}</strong><p>Bản giao diện đã sẵn sàng. Chỉ những dữ liệu được duyệt và đồng bộ mới xuất hiện. Không sử dụng số liệu của tỉnh khác làm số liệu địa phương.</p><button type="button" class="btn" data-action="demo">◈ Xem dữ liệu minh họa</button><button type="button" class="btn" data-view="guide">ⓘ Cách kết nối</button></div>`}
function progressBars(){const rows=progress();return `<div class="bars">${Object.entries(PROCEDURES).filter(([key])=>state.menu[key]===true).map(([key,p])=>{const n=rows.filter(x=>x.procedure===key),avg=n.length?n.reduce((a,x)=>a+x.progress,0)/n.length:null;return `<div class="bar-item"><span class="bar-name">${p.icon} ${E(p.short)}</span><div class="bar-track"><div class="bar-fill" style="width:${avg===null?0:avg.toFixed(1)}%"></div></div><span class="bar-value">${avg===null?'—':avg.toFixed(1)+'%'}</span></div>`}).join('')}</div>`}
function missingCardNote(stats){
 const missing=stats?.modules?.missing;
 if(!missing)return '';
 const current=missing.level2Ranking?.unmatchedRows;
 const count=Number.isInteger(current)&&current>=0&&current<=missing.rowCount?current:(missing.rowCount===15901?1090:null);
 return count===null?'':'('+pretty.format(count)+' HS không thể xác minh, không thuộc diện đóng)';
}
function statsFinanceHero({compact=false}={}){
 const stats=state.stats, m=stats?.modules||{};
 const pct=n=>typeof n==='number'?(n*100).toFixed(1).replace('.',',')+'%':'—';
 const num=n=>typeof n==='number'?pretty.format(n):'—';
 const metrics=[
  m.payment&&['Thu nộp đảng phí',pct(m.payment.completionRate),'Tỷ lệ hoàn thành'],
  m.banking&&['Đăng ký tài khoản',pct(m.banking.registrationRate),'Đã đăng ký'],
  m.missing&&['Số HS chưa khai báo',num(m.missing.rowCount),'']
 ].filter(Boolean);
 const top=(m.ranking?.records||[]).slice(0,compact?3:5);
 return '<section class="stats-hero-home"><div class="stats-hero-title"><div><span class="stats-eyebrow">CDSTUHUE · SỐ LIỆU ĐÃ DUYỆT</span><h2>Thống kê & xếp hạng theo đơn vị</h2><p>4 nguồn báo cáo · kỳ '+E(stats.period||'—')+' · Chỉ công bố số đếm và tỷ lệ tổng hợp, không công bố số tiền hoặc số tài khoản.</p></div><button type="button" data-view="finance" class="stats-hero-open">Xem chi tiết →</button></div><div class="stats-hero-metrics">'+metrics.map(x=>'<div class="stats-hero-metric"><small>'+E(x[0])+(x[0]==='Số HS chưa khai báo'&&missingCardNote(stats)?'<span class="stats-context-line">'+E(missingCardNote(stats))+'</span>':'')+'</small><strong>'+E(x[1])+'</strong></div>').join('')+'</div>'+(top.length?'<div class="stats-hero-ranking"><div class="stats-hero-rank-title"><b>Xếp hạng thu nộp</b><span>Top '+top.length+' / '+E(m.ranking.eligibleUnits||top.length)+' đơn vị</span></div>'+top.map(x=>'<div class="stats-hero-rank"><span>#'+E(x.rank)+'</span><b>'+E(x.name)+'</b><strong>'+pct(x.rate)+'</strong></div>').join('')+'</div>':'')+'</section>';
}
function financeCards({compact=false}={}){
 if(!state.demo&&state.stats?.public===true&&Object.keys(state.stats.modules||{}).length)return statsFinanceHero({compact});
 const f=finance(); const flag=state.demo?'GIẢ LẬP · KHÔNG CÔNG BỐ':f?'ĐÃ DUYỆT CÔNG KHAI':'CHƯA KẾT NỐI';
 const p=v=>f&&v!=null?pretty.format(v):'—';
 return `<div class="fin-ribbon"><div class="fin-ribbon-copy"><div class="micro">PHÂN HỆ CHUYÊN ĐỀ <span class="micro-line"></span> THỐNG KÊ</div><h2>Thu &amp; nộp đảng phí</h2><p>Dữ liệu báo cáo theo kỳ và tình hình tài khoản ngân hàng tổ chức đảng, trình bày theo nguồn được duyệt.</p><div class="fin-ribbon-meta"><span class="fin-dot"></span>${E(flag)} <span class="sep">/</span> Kỳ: ${E(f?.period||'Chưa có')} ${state.demo?'<span class="sep">/</span> Không phải số liệu thật':''}</div></div><div class="fin-ribbon-graphic" aria-hidden="true"><div class="fin-orbit"><div class="fin-orbit-inner">₫</div></div><div class="fin-graph-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>
 <div class="fin-stats">${[['Hồ sơ trong báo cáo',p(f?.reportRecords),'Theo kỳ báo cáo hiện có','▤'],['Chưa khai báo',p(f?.notDeclared),'Chỉ tiêu Dashboard quan sát','◷'],['Hồ sơ chờ phê duyệt',p(f?.waitingApproval),'Theo phạm vi Dashboard','◎'],['Hồ sơ chờ nộp',p(f?.waitingPayment),'Theo phạm vi Dashboard','↗']].map(([title,val,sub,ic],i)=>`<div class="fin-stat"><div class="fin-stat-top"><span>${title}</span><i>${ic}</i></div><div class="fin-stat-value">${val}</div></div>`).join('')}</div>
 ${compact?'':`<div class="fin-columns"><section class="panel fin-chart-panel"><div class="panel-head"><div><h2>Phân bố tài khoản ngân hàng theo loại tổ chức</h2><p>So sánh các số lượng hiển thị trong báo cáo tài khoản ngân hàng</p></div><span class="badge ${f?'warn':''}">${state.demo?'Số liệu giả lập':f?'Nguồn được duyệt':'Chưa có bản xuất'}</span></div>${f&&f.bankGroups.length?`<div class="fin-chart">${f.bankGroups.map((b,i)=>`<div class="fin-chart-row"><div class="fin-chart-label"><b>${E(b.name)}</b></div><div class="fin-chart-track"><div class="fin-chart-bar b${i}" style="width:${Math.max(1,b.accounts/Math.max(...f.bankGroups.map(z=>z.accounts),1)*100).toFixed(2)}%"></div></div><span class="fin-chart-n">${pretty.format(b.accounts)}</span></div>`).join('')}</div>`:msgEmpty('Chưa có thống kê tài khoản ngân hàng công khai')}</section>
 <section class="panel fin-info-panel"><div class="panel-head"><div><h2>Trạng thái dữ liệu</h2><p>Phân biệt dữ liệu được duyệt và số liệu quan sát</p></div><span class="fin-status-dot"></span></div><div class="fin-info-grid"><div class="fin-info-icon">◈</div><div><b>${state.demo?'Số liệu giả lập — chỉ để thử':f?'Đã kiểm tra điều kiện xuất bản':'Chưa có bản thống kê công khai'}</b><p>${state.demo?'Các số đang hiển thị được tạo giả lập để xem giao diện, không lấy từ cổng TTHC.':'Website chỉ đọc tệp đã được duyệt và không kết nối trực tiếp phiên VNeID.'}</p></div></div><div class="fin-detail-list"><div><span>Kỳ báo cáo</span><b>${E(f?.period||'—')}</b></div><div><span>Nguồn số liệu công khai</span><b>${E(f?.source||'Google Sheets (chưa có bản duyệt)')}</b></div><div><span>Ngày quan sát / cập nhật</span><b>${E(f?.observedAt||'—')}</b></div><div><span>Cơ chế đồng bộ</span><b>${state.demo?'Dữ liệu minh họa':f?'JSON công khai':'Chưa kích hoạt'}</b></div><div><span>Phạm vi hồ sơ cấp dưới</span><b>Chưa tích hợp</b></div></div><div class="fin-next"><b>Không phải dữ liệu thời gian thực</b><span>Số liệu các màn hình có thể có phạm vi và thời điểm khác nhau. Không dùng để xếp hạng hoặc tính tỷ lệ khi chưa xác minh.</span></div></section></div>`}
 `;
}

function statsRankingPair(unitRanking,source){
 if(!unitRanking||!Array.isArray(unitRanking.top)||!Array.isArray(unitRanking.bottom)||unitRanking.eligibleUnits!==46||unitRanking.top.length!==10||unitRanking.bottom.length!==10){
  return '<div class="stats-unit-unavailable">Chưa có bảng xếp hạng cấp 2 từ phiên bản Apps Script đang chạy. Top 10 sẽ hiện sau khi đồng bộ đủ dữ liệu theo Đảng bộ.</div>';
 }
 const show=(items,tone,heading)=>'<div class="stats-leaderboard-col '+tone+'"><div class="stats-leaderboard-head"><strong>'+heading+'</strong><span>10 đơn vị</span></div>'+items.map((x,i)=>
  '<div class="stats-leaderboard-row"><span class="stats-leaderboard-rank">'+(i+1)+'</span><div class="stats-leaderboard-unit"><strong>'+E(x.name)+'</strong><div class="stats-meter"><i style="width:'+Math.max(0,Math.min(100,100*x.rate)).toFixed(1)+'%"></i></div><small>'+pretty.format(x.done)+' / '+pretty.format(x.total)+' '+source+'</small></div><b>'+((x.rate*100).toFixed(1).replace('.',','))+'%</b></div>').join('')+'</div>';
 return '<div class="stats-leaderboards">'+show(unitRanking.top,'is-good','Top 10 tốt nhất')+show(unitRanking.bottom,'is-weak','Top 10 thấp nhất')+'</div>';
}
function statsDashboard(){
 const stats=state.demo?null:state.stats;
 if(!stats||!Object.keys(stats.modules||{}).length)return '<div class="panel stats-notice"><h2>Thống kê theo 4 báo cáo</h2><p>Dữ liệu sẽ xuất hiện sau khi người quản trị duyệt và đồng bộ.</p></div>';
 const m=stats.modules,amount=n=>typeof n==='number'?pretty.format(n):'—',percent=n=>typeof n==='number'?(n*100).toFixed(1).replace('.',',')+'%':'—';
 const cards=[];
 if(m.payment)cards.push(['Tỷ lệ thu nộp',percent(m.payment.completionRate)]);
 if(m.missing)cards.push(['Số HS chưa khai báo',amount(m.missing.rowCount),missingCardNote(stats)]);
 if(m.banking)cards.push(['Tỷ lệ đã đăng ký tài khoản',percent(m.banking.registrationRate)]);
 const viewCards='<div class="stats-kpis">'+cards.map(([k,v,note])=>'<article class="stats-kpi"><small>'+E(k)+(note?'<span class="stats-context-line">'+E(note)+'</span>':'')+'</small><strong>'+E(v)+'</strong></article>').join('')+'</div>';
 let panels='';

 if(m.ranking?.records?.length){
  const rec=m.ranking.records;
  const rankRows=rec.map(x=>'<div class="stats-rank-row"><b>#'+E(x.rank)+'</b><div><strong>'+E(x.name)+'</strong><div class="stats-meter"><i style="width:'+Math.max(0,Math.min(100,100*(x.rate||0))).toFixed(1)+'%"></i></div></div><em>'+percent(x.rate)+'</em></div>').join('');
  panels+='<section class="panel stats-panel stats-panel-wide stats-payment-panel"><div class="panel-head"><div><h2>Xếp hạng tỷ lệ thu nộp</h2></div><span class="stats-count-chip">'+E(String(rec.length))+'/46 Đảng bộ</span></div><div class="stats-ranking-scroll" role="region" tabindex="0" aria-label="Danh sách xếp hạng tỷ lệ thu nộp">'+rankRows+'</div>'+(rec.length!==46?'<p class="stats-sync-pending">Dữ liệu hiện có '+E(String(rec.length))+'/46 Đảng bộ. Cần cập nhật phiên bản Apps Script để đồng bộ đủ.</p>':'')+'</section>';
 }
 const statBreakdown=(data,total)=>'<div class="stats-breakdown">'+data.map(([name,count])=>'<div class="stats-breakdown-item"><span>'+E(name)+'</span><strong>'+amount(count)+'</strong><small>'+percent(count/(total||1))+'</small></div>').join('')+'</div>';
 if(m.banking){
  const v=m.banking;
  panels+='<section class="panel stats-panel stats-panel-wide"><div class="panel-head"><div><h2>Xếp hạng tỷ lệ khai báo tài khoản ngân hàng</h2></div><span class="stats-count-chip">46 Đảng bộ cấp 2</span></div>'+statBreakdown([['Đã có tài khoản',v.registered],['Chưa có tài khoản',v.notRegistered]],v.rowCount)+statsRankingPair(v.unitRanking,'bản ghi')+(Number.isInteger(v.unmappedForRanking)&&v.unmappedForRanking>0?'<p class="stats-scope-note">'+E(String(v.unmappedForRanking))+' bản ghi chưa có đủ quan hệ đơn vị cấp 2, không tính vào Top 10.</p>':'')+'</section>';
 }
 if(m.missing){
  const v=m.missing,rank=v.level2Ranking;
  let rankingContent='';
  if(rank&&rank.eligibleUnits===46&&rank.top?.length===10&&rank.bottom?.length===10){
   const rowBlock=(items,tone,title)=>'<div class="stats-leaderboard-col '+tone+'"><div class="stats-leaderboard-head"><strong>'+title+'</strong><span>10 Đảng bộ</span></div>'+
    items.map((x,i)=>'<div class="stats-leaderboard-row"><span class="stats-leaderboard-rank">'+(i+1)+'</span><div class="stats-leaderboard-unit"><strong>'+E(x.name)+'</strong><small>Dòng chưa khai báo đã đối chiếu</small></div><b>'+amount(x.count)+'</b></div>').join('')+'</div>';
   rankingContent='<div class="stats-leaderboards stats-missing-leaders">'+rowBlock(rank.top,'is-weak','Top 10 nhiều nhất')+rowBlock(rank.bottom,'is-good','Top 10 ít nhất')+'</div>';
   rankingContent+='<p class="stats-scope-note">Thống kê theo số dòng chưa khai báo (không phải tỷ lệ đảng viên). Đã xác định cấp 2: '+amount(rank.matchedRows)+' / '+amount(v.rowCount)+' dòng. '+amount(rank.unmatchedRows)+' dòng chưa đủ thông tin ghép cấp 2 hoặc nằm ngoài 46 Đảng bộ, không cộng tùy đoán vào bảng.</p>';
  }else{
   rankingContent='<div class="stats-unit-unavailable">Top 10 cấp 2 sẽ hiển thị sau khi cập nhật Apps Script và đồng bộ danh mục tổ chức. Không xếp hạng các đơn vị cấp 3 riêng lẻ.</div>';
  }
  panels+='<section class="panel stats-panel stats-panel-wide"><div class="panel-head"><div><h2>Đơn vị chưa khai báo hồ sơ đảng phí</h2></div><span class="stats-count-chip">46 Đảng bộ cấp 2</span></div>'+rankingContent+'</section>';
 }
 return '<div class="section-heading"><div><h2>Trung tâm thống kê tháng '+E(stats.period||'')+'</h2><p>Dữ liệu tổng hợp được duyệt từ bốn bảng nguồn riêng tư</p></div><span class="badge">Bản công khai đã duyệt</span></div>'+viewCards+'<div class="stats-grid stats-dashboard-grid">'+panels+'</div><p class="stats-disclaimer">Nguồn: các bảng thống kê đã được duyệt. Phạm vi giữa các báo cáo khác nhau; không cộng số liệu khác nguồn. Thời điểm xuất: '+E(DATE(stats.generatedAt))+'</p>';
}
function financeView(){return financeCards()+statsDashboard()}
function overview(){
 const q=published(),cats=Object.keys(GROUPS).filter(k=>viewAllowed('qa-'+k));
 const procs=Object.entries(PROCEDURES).filter(([id])=>viewAllowed(id));
 const stats=[];
 if(cats.length){
  stats.push(stat('Kho hỏi – đáp','Nội dung đã duyệt trong các nhóm đang bật',pretty.format(q.length),'?'));
  stats.push(stat('Nhóm hỗ trợ','Các nhóm đang công khai',pretty.format(cats.length),'▥'));
 }
 if(viewAllowed('finance')){
  stats.push(stat('Bảng thống kê','Phân tích và xếp hạng theo kỳ',state.stats?'Đã có':'Chờ duyệt','⇄'));
  stats.push(stat('Báo cáo đảng phí','Phiên bản thống kê công khai',(finance()||state.stats)?'Đã có':'Chờ duyệt','◈'));
 }
 if(viewAllowed('units'))stats.push(stat('Bảng tiến độ','Tiến độ theo đơn vị khi có dữ liệu',progress().length||'—','▤'));
 const procedureCards=procs.length?'<div class="section-heading"><div><h2>Thủ tục và hướng dẫn</h2><p>Các mục hiện được quản trị cho phép.</p></div></div><div class="category-grid procedure-category-grid">'+
  procs.map(([id,item])=>'<button type="button" class="category-card procedure-launch" data-view="'+E(id)+'"><span class="c-icon">'+E(item.icon)+'</span><b>'+E(item.title)+'</b><p>'+E(item.help)+'</p><div class="c-count">Mở chuyên mục →</div></button>').join('')+'</div>':'';
 const qaCardsGroup=cats.length?'<div class="section-heading"><div><h2>Kho tri thức – hỏi đáp</h2><p>Chỉ các nhóm đang bật và đã được duyệt công khai.</p></div>'+
  (viewAllowed('qa-all')?'<button class="card-link" data-view="qa-all">Xem tất cả →</button>':'')+'</div><div class="category-grid">'+
  cats.map(k=>{const t=GROUPS[k],count=q.filter(x=>x.group===k).length;
   return '<button class="category-card" type="button" data-view="qa-'+E(k)+'"><span class="c-icon">'+E(t.icon)+'</span><b>'+E(t.full)+'</b><p>Tìm kiếm hướng dẫn và câu trả lời được duyệt</p><div class="c-count">'+count+' mục công khai ↗</div></button>';
  }).join('')+'</div>':'';
 const latest=(viewAllowed('qa-all')&&q.length)?'<div class="section-heading"><div><h2>Câu hỏi mới công bố</h2><p>Chỉ những câu hỏi trong nhóm đang bật</p></div><button class="card-link" data-view="qa-all">Vào kho hỏi đáp →</button></div><section class="panel">'+qaCards([...q].reverse().slice(0,4))+'</section>':'';
 return (viewAllowed('finance')?financeCards({compact:true})+'<div class="overview-quick"><button data-view="finance" class="overview-quick-link">Xem báo cáo tổng hợp <span>↗</span></button></div>':'')+
  (stats.length?'<div class="stat-grid">'+stats.join('')+'</div>':'')+
  procedureCards+qaCardsGroup+latest+
  (viewAllowed('guide')&&procs.length?'<div class="overview-info-notice"><strong>Hướng dẫn sử dụng website</strong><p>Tra cứu hướng dẫn cho các danh mục đang bật.</p><button class="btn" data-view="guide">Mở hướng dẫn →</button></div>':'');
}
function unitRows(rows){const map=new Map();for(const row of rows){let arr=map.get(row.unit)||[];arr.push(row);map.set(row.unit,arr)}return [...map].map(([unit,data])=>({unit,avg:data.reduce((a,x)=>a+x.progress,0)/data.length,count:data.length,received:data.reduce((a,x)=>a+x.received,0),completed:data.reduce((a,x)=>a+x.completed,0)})).sort((a,b)=>b.avg-a.avg||a.unit.localeCompare(b.unit,'vi'))}
function progressTable(rows,{limit=0}={}){if(!rows.length)return msgEmpty('Chưa có dữ liệu tiến độ theo đơn vị');const all=unitRows(rows),shown=limit?all.slice(0,limit):all;return `<div class="table-shell"><table><thead><tr><th>STT</th><th>Đơn vị</th><th>Thủ tục có dữ liệu</th><th>Tiếp nhận</th><th>Hoàn thành hồ sơ</th><th>Tiến độ bình quân</th><th>Trạng thái</th></tr></thead><tbody>${shown.map((x,i)=>`<tr><td>${i+1}</td><td class="td-bold">${E(x.unit)}</td><td>${x.count}/${Object.keys(PROCEDURES).filter(k=>state.menu[k]===true).length}</td><td>${pretty.format(x.received)}</td><td>${pretty.format(x.completed)}</td><td style="min-width:130px"><div class="bar-track"><div class="bar-fill" style="width:${x.avg.toFixed(1)}%"></div></div><small>${x.avg.toFixed(1)}%</small></td><td><span class="badge ${x.avg>=99.9?'good':'warn'}">${x.avg>=99.9?'Hoàn thành':x.avg>0?'Đang triển khai':'Chưa triển khai'}</span></td></tr>`).join('')}</tbody></table></div>${limit?`<div class="small-note">Đang hiển thị ${shown.length}/${all.length} đơn vị. Bấm “Xem bảng tổng” để xem đầy đủ.</div>`:''}`}
const PROCEDURE_GUIDES={
 'chinh-thuc':{label:'Chuyển sinh hoạt Đảng chính thức',summary:'Tập hợp câu hỏi về hồ sơ chuyển sinh hoạt, trạng thái xử lý, dữ liệu tổ chức và những tình huống cần hỗ trợ.',tags:['chuyển sinh hoạt chính thức','hồ sơ chuyển sinh hoạt','chuyển đi chuyển đến'],hints:['Xem đúng hướng dẫn đang có hiệu lực do cơ quan quản lý ban hành','Đối chiếu thông tin tổ chức và trạng thái hồ sơ trên hệ thống được phân quyền','Nếu có lỗi, tra cứu câu hỏi liên quan hoặc báo đầu mối hỗ trợ theo quy định']},
 'tam-thoi':{label:'Chuyển sinh hoạt Đảng tạm thời',summary:'Tra cứu vướng mắc về hồ sơ chuyển tạm thời, thời gian và nơi sinh hoạt trong những trường hợp đã có hướng dẫn công khai.',tags:['chuyển sinh hoạt tạm thời','sinh hoạt tạm','chuyển tạm thời'],hints:['Xác định đúng loại thủ tục: tạm thời hay chính thức','Kiểm tra hướng dẫn hồ sơ theo thời điểm, thẩm quyền và đơn vị tiếp nhận','Tìm các tình huống tương tự trong kho QA đã duyệt trước khi gửi hỗ trợ']},
 'nhan-xet':{label:'Lấy ý kiến nhận xét nơi cư trú',summary:'Thông tin tra cứu dành cho người tìm hiểu thủ tục nhận xét nơi cư trú, luồng thực hiện và lỗi thao tác thường gặp.',tags:['nhận xét nơi cư trú','213','lấy ý kiến nhận xét'],hints:['Xác định đúng mục thủ tục và hình thức nộp hồ sơ trên cổng chính thức','Theo dõi hồ sơ bằng tài khoản có quyền và đối chiếu trạng thái hiện có','Tra cứu câu hỏi tương tự hoặc liên hệ đầu mối khi hồ sơ phát sinh vướng mắc']}
};
function procedureGuideView(){
 const id=state.view,p=PROCEDURES[id],g=PROCEDURE_GUIDES[id];if(!g)return financeView();
 const candidates=published().filter(x=>x.group==='tthc').map(x=>({x,score:Math.max(...g.tags.map(t=>scoreQA(x,t)))})).filter(z=>z.score>=9).sort((a,b)=>b.score-a.score).slice(0,5).map(z=>z.x);
 return `<div class="guide-hero-pro"><div><div class="micro">CHUYÊN MỤC HỖ TRỢ NGHIỆP VỤ <span class="micro-line"></span> ${E(p.short.toUpperCase())}</div><h2>${E(g.label)}</h2><p>${E(g.summary)}</p><div class="guide-hero-actions"><button class="btn dark" data-view="qa-tthc">Tra cứu toàn bộ QA TTHC →</button><button class="btn" data-view="resources">Tài liệu &amp; liên kết ↗</button></div></div><div class="guide-hero-symbol" aria-hidden="true">${p.icon}</div></div>
 <div class="section-heading"><div><h2>Hướng dẫn tra cứu và xử lý vướng mắc</h2><p>Những bước kiểm tra chung; nội dung nghiệp vụ cụ thể theo tài liệu và QA đã duyệt</p></div><span class="badge warn">Không phải thống kê tiến độ</span></div>
 <div class="guide-steps-grid">${g.hints.map((t,i)=>`<div class="guide-step-card"><span>0${i+1}</span><p>${E(t)}</p></div>`).join('')}</div>
 <div class="section-heading"><div><h2>Câu hỏi liên quan đã công khai</h2><p>Được gợi ý từ kho QA TTHC hiện có</p></div><button class="card-link" data-view="qa-tthc">Mở kho TTHC →</button></div><section class="panel">${candidates.length?qaCards(candidates):msgEmpty('Chưa có QA liên quan được duyệt công khai')}</section>
 <div class="overview-info-notice"><strong>Chưa kết nối tiến độ xử lý theo đơn vị</strong><p>Vai trò cấp tỉnh không mặc định thấy hồ sơ của tất cả cấp dưới. Chúng tôi chỉ bổ sung bảng tiến độ sau khi có dữ liệu tổng hợp hợp lệ được phép công khai.</p></div>`;
}
function progressView(){const id=state.view,rows=progress();const src=id==='units'?rows:rows.filter(x=>x.procedure===id),q=fold(state.unitQuery);let filtered=src.filter(x=>!q||fold(x.unit).includes(q));const title=id==='units'?'Bảng tiến độ theo đơn vị':PROCEDURES[id]?.title;
return `${id==='dang-phi'?'<div class="mini-fin-lead">'+financeCards({compact:true})+'<button class="btn subtle" data-view="finance">Xem phân tích tài khoản ngân hàng →</button></div>':''}<div class="stat-grid">${stat('Bản ghi','Theo nhóm đang xem',src.length||'—','▤')}${stat('Đơn vị','Đơn vị có dữ liệu',src.length?new Set(src.map(x=>x.unit)).size:'—','⌂')}${stat('Tiến độ bình quân','Không tính bản ghi thiếu',src.length?(src.reduce((a,x)=>a+x.progress,0)/src.length).toFixed(1)+'%':'—','◔')}${stat('Hồ sơ hoàn thành','Theo bản ghi dữ liệu',src.length?pretty.format(src.reduce((a,x)=>a+x.completed,0)):'—','✓')}</div><section class="panel"><div class="panel-head"><div><h2>${E(title)}</h2><p>${id==='units'?'Theo dõi các danh mục đang hiển thị':E(PROCEDURES[id]?.help||'')}</p></div><span class="badge ${src.length?'good':'warn'}">${src.length?'Có dữ liệu':'Chưa kết nối dữ liệu'}</span></div><div class="toolbar"><div class="search"><input id="unitSearch" type="search" placeholder="Tìm tên đơn vị..." value="${E(state.unitQuery)}"></div><button class="btn" data-action="export-progress">⇩ Xuất CSV</button></div>${id==='units'?progressTable(filtered):filtered.length?`<div class="table-shell"><table><thead><tr><th>STT</th><th>Đơn vị</th><th>Hồ sơ tiếp nhận</th><th>Đã hoàn thành</th><th>Tiến độ</th><th>Cập nhật</th></tr></thead><tbody>${filtered.map((x,i)=>`<tr><td>${i+1}</td><td class="td-bold">${E(x.unit)}</td><td>${pretty.format(x.received)}</td><td>${pretty.format(x.completed)}</td><td><span class="progress-data-badge">${x.progress.toFixed(1)}%</span></td><td>${E(x.updated)}</td></tr>`).join('')}</tbody></table></div>`:msgEmpty('Chưa có dữ liệu tiến độ cho thủ tục này')}<div class="small-note">Nguồn dữ liệu tiến độ phải được thiết lập riêng theo đơn vị. Các QA trong Google Sheet không phải bảng thống kê hồ sơ, vì vậy website không tự suy ra số liệu.</div></section>`}
function selectedGroup(){return state.view.startsWith('qa-')&&state.view!=='qa-all'?state.view.slice(3):null}
function scoreQA(item,q){const f=fold(q).trim();if(!f)return 1;let question=fold(item.question),topic=fold(item.topic),keywords=fold(item.keywords),alts=fold(item.alternatives),answer=fold(item.answer),id=fold(item.id);let score=(id===f?20:0)+(question.includes(f)?11:0)+(topic.includes(f)?7:0)+(keywords.includes(f)?5:0)+(alts.includes(f)?5:0)+(answer.includes(f)?2:0);let words=f.split(/\s+/).filter(x=>x.length>=2);for(const w of words)score+=(question.includes(w)?2:0)+(topic.includes(w)?1.5:0)+(keywords.includes(w)?1.3:0)+(alts.includes(w)?1:0)+(answer.includes(w)?.25:0);return score}
function qaCards(items){return `<div class="qa-list">${items.map(x=>`<button type="button" class="qa-item" data-qa="${E(x.id)}"><div class="qa-item-top"><span class="qa-id">${E(x.id)}</span><span class="qa-category">${E(GROUPS[x.group]?.name||'QA')}</span><span class="badge">${E(x.topic||'Hỏi đáp')}</span>${state.demo?'<span class="demo-demo">MINH HỌA</span>':''}</div><h3>${E(x.question)}</h3><p>${E(x.answer)}</p><div class="qa-item-bottom"><span>${E(x.updated||'')} · Được xuất bản theo danh sách duyệt</span><span class="qa-arrow">↗</span></div></button>`).join('')}</div>`}
function qaView(){const q=published(),group=selectedGroup(),scope=group?q.filter(x=>x.group===group):q;const results=scope.map(x=>({x,s:scoreQA(x,state.query)})).filter(z=>!state.query||z.s>0).sort((a,b)=>b.s-a.s||a.x.id.localeCompare(b.x.id)).map(z=>z.x);const total=results.length,pageSize=10,numPages=Math.max(1,Math.ceil(total/pageSize));state.page=Math.min(Math.max(0,state.page),numPages-1);
return `<div class="stat-grid">${stat('Công khai',group?GROUPS[group].full:'Các nhóm đang bật',scope.length,'?')}${Object.entries(GROUPS).filter(([k])=>viewAllowed('qa-'+k)).map(([k,v])=>stat(v.full,'QA được duyệt',q.filter(x=>x.group===k).length,v.icon)).join('')}</div><section class="panel"><div class="panel-head"><div><h2>Tra cứu câu hỏi – hướng dẫn xử lý</h2><p>Tìm cả từ khóa không dấu, câu hỏi tương tự và nội dung trả lời</p></div><span class="badge good">Danh sách được duyệt công khai</span></div><div class="toolbar"><div class="search"><input id="qaSearch" type="search" value="${E(state.query)}" placeholder="Nhập lỗi, nghiệp vụ hoặc câu hỏi..." autocomplete="off"></div><select id="qaGroup" class="selector" aria-label="Nhóm câu hỏi">${viewAllowed('qa-all')?`<option value="all" ${!group?'selected':''}>Tất cả hệ thống</option>`:''}${Object.entries(GROUPS).filter(([k])=>viewAllowed('qa-'+k)).map(([k,v])=>`<option value="${k}" ${group===k?'selected':''}>${E(v.full)}</option>`).join('')}</select></div>${scope.length?`${qaCards(results.slice(state.page*pageSize,(state.page+1)*pageSize))}${results.length?`<div class="page-nav"><span>${Math.min(state.page*pageSize+1,total)}–${Math.min((state.page+1)*pageSize,total)} / ${total} kết quả</span><div><button type="button" class="btn" data-action="prev" ${state.page===0?'disabled':''}>‹ Trước</button> <button type="button" class="btn" data-action="next" ${state.page>=numPages-1?'disabled':''}>Sau ›</button></div></div>`:msgEmpty('Không tìm thấy câu hỏi phù hợp')}`:msgEmpty('Chưa xuất bản câu hỏi nào trong nhóm này')}</section>`}
function resourcesView(){return `<div class="category-grid"><div class="panel"><div class="panel-head"><h2>◈ Kho TTHC</h2><span class="badge">Hỏi – đáp</span></div><p class="small-note">Hướng dẫn thủ tục, vướng mắc thanh toán và phân quyền từ các câu hỏi đã duyệt.</p><button class="btn dark" data-view="qa-tthc">Mở hỏi đáp →</button></div><div class="panel"><div class="panel-head"><h2>◷ Sổ tay Đảng viên</h2><span class="badge">Hỏi – đáp</span></div><p class="small-note">Tra cứu các tình huống sử dụng, tài khoản, sinh hoạt và điểm danh.</p><button class="btn dark" data-view="qa-stdv">Mở hỏi đáp →</button></div><div class="panel"><div class="panel-head"><h2>▥ CSDL 4.0</h2><span class="badge">Hỏi – đáp</span></div><p class="small-note">Tra cứu lỗi dữ liệu, đồng bộ và thông tin tài khoản.</p><button class="btn dark" data-view="qa-csdl">Mở hỏi đáp →</button></div></div><div class="section-heading"><h2>Tài liệu và hệ thống tham khảo</h2></div><section class="panel"><div class="guide-list"><div class="guide-item"><h3>Dịch vụ công của Đảng</h3><p>Truy cập bằng địa chỉ do cơ quan quản lý cung cấp. Website này chỉ hỗ trợ tra cứu, không tiếp nhận hay xử lý hồ sơ.</p></div><div class="guide-item"><h3>Website tham khảo Lào Cai</h3><p><a href="https://laocai-cds.github.io/tthc/" target="_blank" rel="noopener noreferrer">laocai-cds.github.io/tthc/ ↗</a> — giao diện dashboard tham khảo độc lập, số liệu và nghiệp vụ của Lào Cai không được nhập vào bản thống kê này.</p></div><div class="guide-item"><h3>Kho tài liệu địa phương</h3><p>Chưa cấu hình liên kết công khai. Khi có danh mục tài liệu được duyệt, có thể bổ sung ở trang này mà không cần thay các QA gốc.</p></div></div></section>`}
function guideView(){return `<div class="columns"><section class="panel"><div class="panel-head"><h2>Hướng dẫn sử dụng cho người xem</h2><span class="badge">Tra cứu công khai</span></div><div class="guide-list"><div class="guide-item"><h3>1. Tra cứu thủ tục và thống kê</h3><p>Tra cứu danh mục đang được hiển thị, kho QA công khai và chuyên đề thống kê đã duyệt. Dấu “—” nghĩa là chưa có dữ liệu, không phải số 0.</p></div><div class="guide-item"><h3>2. Tìm câu hỏi</h3><p>Mở Hỏi – đáp, gõ từ khóa có dấu hoặc không dấu. Chọn câu phù hợp để đọc đầy đủ, sau đó dùng nút Sao chép liên kết để gửi cho đồng nghiệp.</p></div><div class="guide-item"><h3>3. Dùng trợ lý tra cứu nhanh</h3><p>Bấm nút ở góc menu, nhập vấn đề đang gặp. Công cụ gợi ý kết quả dựa trên tìm kiếm nội bộ; không gửi dữ liệu cho mô hình AI và không suy luận thêm câu trả lời.</p></div><div class="guide-item"><h3>4. In và xuất báo cáo</h3><p>Trong Báo cáo & xuất dữ liệu, chọn tải CSV công khai hoặc in báo cáo. Bảng tiến độ đang thiếu dữ liệu thì báo cáo sẽ ghi rõ tình trạng chưa kết nối.</p></div></div></section><section class="panel"><div class="panel-head"><h2>Hướng dẫn biên tập & xuất bản</h2><span class="badge warn">Dành cho quản trị</span></div><ol class="utility-steps"><li>Chỉnh nội dung gốc trong ba tab <b>QA TTHC</b>, <b>QA STDV</b>, <b>QA CSDL 4.0</b> như bình thường.</li><li>Mở tab <b>WEB_PUBLISH</b>, kiểm tra từng QA và đặt trạng thái <b>ĐÃ DUYỆT</b> nếu đủ điều kiện công khai.</li><li>Nếu nội dung có dữ liệu nhạy cảm, không duyệt trước khi sửa bản gốc hoặc tạo phiên bản công khai an toàn.</li><li>Thiết lập Apps Script và GitHub Actions theo README của gói mã nguồn; khi đó hệ thống mới tự cập nhật.</li><li>Đối với thống kê đảng phí, nhập số liệu đã cho phép công khai vào tab <b>WEB_FINANCE_PUBLIC</b> và xác nhận duyệt qua menu Apps Script. Sau khi đổi trạng thái thành <b>TẠM ẨN</b>, chờ lần xuất bản mới.</li></ol><div class="small-note"><strong>Lưu ý:</strong> Trang này là giao diện tra cứu và báo cáo. Không chứa mật khẩu, mã truy cập hoặc đường dẫn chỉnh sửa nội bộ của Google Sheet.</div><button class="btn" data-action="demo">◈ Thử giao diện với dữ liệu minh họa</button></section></div>`}
function reportsView(){const qa=published(),p=progress();return `<div class="report-hero"><div><h3>Xuất báo cáo từ dữ liệu đã công khai</h3><p>Không bao gồm cột Messages nội bộ, độ tin cậy nội bộ, nguồn hỏi và nguồn trả lời chưa duyệt.</p></div><div class="head-actions"><button class="btn dark" data-action="export-qa">⇩ QA (CSV)</button> <button class="btn" data-action="export-finance">⇩ Thống kê đảng phí</button> <button class="btn" data-action="export-progress">⇩ Tiến độ (CSV)</button> <button class="btn" data-action="upload-progress">⇧ Nhập JSON để xem thử</button><input type="file" id="progressFile" accept="application/json,.json" class="hidden"> <button class="btn" data-action="print">▤ In / PDF</button></div></div><div class="columns"><section class="panel"><div class="panel-head"><h2>Kho hỏi – đáp được xuất bản</h2><span class="badge good">${qa.length} QA</span></div><div class="mini-grid">${Object.entries(GROUPS).filter(([k])=>viewAllowed('qa-'+k)).map(([k,v])=>`<div class="mini-card"><span>${E(v.full)}</span><strong>${qa.filter(x=>x.group===k).length}</strong></div>`).join('')}<div class="mini-card"><span>Bản xuất</span><strong style="font-size:13px">${E(DATE(state.generatedAt))}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Tiến độ hành chính</h2><span class="badge ${p.length?'good':'warn'}">${p.length} bản ghi</span></div>${progressBars()}<div class="small-note">Khi chưa có số liệu được kết nối, không tự suy ra mức hoàn thành.</div></section></div><section class="panel"><div class="panel-head"><h2>Kiểm soát trước khi công khai</h2></div><p style="font-size:12px;color:#748396">Mọi nội dung đã xuất bản trên Internet có thể được lưu lại bởi công cụ tìm kiếm và người truy cập. Chỉ duyệt những câu hỏi và câu trả lời được phép công khai. Mặc định không xuất bản mã CCCD, số điện thoại, hồ sơ cụ thể, các đoạn hội thoại nội bộ và nguồn Messages.</p></section>`}
function subtitle(view){if(view==='overview')return ['Không gian điều hành số','Tổng hợp thống kê đảng phí, tiến độ thủ tục và tri thức hỗ trợ kỹ thuật của Thành phố Huế.'];if(view==='finance')return ['Thống kê đảng phí & tài khoản ngân hàng','Báo cáo tổng hợp theo kỳ, dựa trên dữ liệu được phép công khai hoặc minh họa có gắn nhãn.'];if(view==='units')return ['Bảng tiến độ tổng','Báo cáo tiến độ cho các danh mục hiện được phép hiển thị.'];if(PROCEDURES[view])return [PROCEDURES[view].title,PROCEDURES[view].help];if(view.startsWith('qa-')){const group=selectedGroup();return [group?'Hỏi – đáp '+GROUPS[group].full:'Kho hỏi – đáp kỹ thuật','Tra cứu các tình huống đã được xét duyệt công khai; tìm kiếm có dấu hoặc không dấu.']}if(view==='resources')return ['Tài liệu & liên kết','Thư viện tài nguyên và các hệ thống tham khảo được phép truy cập công khai.'];if(view==='reports')return ['Báo cáo & xuất dữ liệu','In báo cáo, tải bảng dữ liệu và kiểm tra trạng thái đồng bộ.'];if(view==='guide')return ['Hướng dẫn sử dụng','Cách tra cứu, báo cáo và kiểm duyệt nội dung xuất bản.'];return subtitle('overview')}
function render(){
 if(!state.menuReady){$('#page').innerHTML='<div class="notice"><strong>Đang tải danh mục công khai...</strong></div>';return;}
 if(!viewAllowed(state.view))state.view=firstVisibleView();
 const view=state.view;
 const page=view==='closed'?'<section class="panel"><h2>Chưa có danh mục công khai</h2><p>Trang hiện không có chuyên mục được bật. Quản trị viên có thể thay đổi danh mục trong bảng quản trị riêng tư.</p></section>':
 view==='overview'?overview():view==='finance'||view==='dang-phi'?financeView():
 view==='units'?progressView():PROCEDURE_GUIDES[view]?procedureGuideView():
 view.startsWith('qa-')?qaView():view==='resources'?resourcesView():
 view==='reports'?reportsView():guideView();
 $('#page').innerHTML=page;
 const [title,sub]=view==='closed'?['Không có danh mục công khai','Các chức năng đã được quản trị viên tạm ẩn.']:subtitle(view);
 $('#pageTitle').textContent=title;$('#pageSubtitle').textContent=sub;
 $('#crumb').textContent=view.startsWith('qa-')?'Hỏi – đáp':title;
 $('#heroIndicator').textContent=view==='finance'||view==='dang-phi'?'₫':String(published().length).padStart(2,'0');
 
 $$('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
 bindPage();
 applyMenuVisibility();
}
function route(view,{replace=false}={}){
 if(!viewAllowed(view))view=firstVisibleView();
 if(state.view!==view){state.query='';state.page=0;state.unitQuery='';}
 state.view=view;
 const path=view.startsWith('qa-')?'hoi-dap.html':'index.html';
 const url=path+'?view='+encodeURIComponent(view);
 if(replace)history.replaceState({},'',url);else history.pushState({},'',url);
 render();window.scrollTo(0,0);closeMobile();
}
function syncFromUrl(){
 const url=new URL(location.href),v=url.searchParams.get('view');
 const requested=v||(/hoi-dap\.html$/.test(url.pathname)?'qa-all':'overview');
 if(!state.menuReady)state.pendingView=requested;
 state.view=viewAllowed(requested)?requested:firstVisibleView();
 state.query='';state.page=0;
 if(state.menuReady&&!viewAllowed(requested))
  history.replaceState({},'','index.html?view='+encodeURIComponent(state.view));
 render();
 const id=url.searchParams.get('id');
 if(id&&state.menuReady&&state.view.startsWith('qa-'))setTimeout(()=>openQA(id),0);
}
function openQA(id){const x=published().find(x=>x.id===id);if(!x){toast('Không tìm thấy mã QA này trong bản công khai');return}$('#modalTitle').textContent=x.question;$('#modalGroup').textContent=GROUPS[x.group]?.full||x.group;$('#modalId').textContent=x.id+(state.demo?' · MINH HỌA':'');$('#modalBody').innerHTML=`<h3>Trả lời</h3><div class="answer">${E(x.answer)}</div>${x.publicNote?`<div class="small-note">${E(x.publicNote)}</div>`:''}${x.sourceUrl?`<div class="source-label"><b>Nguồn công khai:</b> <a href="${E(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">${E(x.sourceUrl)}</a></div>`:''}`;$('#copyLinkBtn').dataset.id=x.id;$('#qaModal').classList.remove('hidden');document.body.style.overflow='hidden';}
function closeQA(){if($('#qaModal').classList.contains('hidden'))return;$('#qaModal').classList.add('hidden');document.body.style.overflow='';}
function closeMobile(){$('#sidebar').classList.remove('mobile-open');$('#shade').classList.remove('mobile-open')}
function toast(msg){let el=$('#toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(toast._timer);toast._timer=setTimeout(()=>el.classList.add('hidden'),2600)}
function exportCsv(filename,rows){const s=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const b=new Blob(['\uFEFF'+s],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportProgress(){const rows=progress().filter(x=>state.view==='units'||!PROCEDURES[state.view]||x.procedure===state.view);exportCsv('tien-do-cong-khai.csv',[['Đơn vị','Thủ tục','Tiến độ %','Hồ sơ tiếp nhận','Hồ sơ hoàn thành','Cập nhật'],...rows.map(x=>[x.unit,PROCEDURES[x.procedure]?.title,x.progress,x.received,x.completed,x.updated])]);toast('Đã tạo CSV từ dữ liệu '+(state.demo?'MINH HỌA':'công khai'))}
function exportFinance(){const f=finance();if(!f){toast('Chưa có thống kê công khai để xuất');return}exportCsv(state.demo?'THAM_KHAO_thong_ke_dang_phi.csv':'thong_ke_dang_phi_cong_khai.csv',[['CHÚ Ý',state.demo?'DỮ LIỆU MINH HỌA – CHƯA ĐƯỢC DUYỆT':'BẢN ĐÃ DUYỆT'],['Kỳ',f.period],['Hồ sơ báo cáo',f.reportRecords],['Chưa khai báo',f.notDeclared],['Chờ phê duyệt',f.waitingApproval],['Chờ nộp',f.waitingPayment],['Nhóm tổ chức','Số tài khoản'],...f.bankGroups.map(z=>[z.name,z.accounts])]);toast('Đã xuất bản '+(state.demo?'tham chiếu':'công khai'))}
function exportQA(){exportCsv('hoi-dap-cong-khai.csv',[['Mã QA','Nhóm','Chủ đề','Câu hỏi','Trả lời','Cập nhật','Nguồn công khai'],...published().map(x=>[x.id,GROUPS[x.group]?.full,x.topic,x.question,x.answer,x.updated,x.sourceUrl||''])]);toast('Đã tạo CSV từ dữ liệu '+(state.demo?'MINH HỌA':'công khai'))}
function bindPage(){const uploader=$('#progressFile');if(uploader)uploader.onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>4*1024*1024)throw Error('Tệp quá lớn');const data=JSON.parse(await file.text());if(data.schema!==1||!Array.isArray(data.records))throw Error('Định dạng không hợp lệ');const clean=data.records.filter(validProgress).map(x=>({unit:String(x.unit),procedure:x.procedure,progress:Number(x.progress),received:Number(x.received)||0,completed:Number(x.completed)||0,updated:String(x.updated||'')}));if(!clean.length)throw Error('Không có bản ghi hợp lệ (cần public:true)');state.demo=false;state.local=true;state.progress=clean;updateGlobal();render();toast('Đã nhập '+clean.length+' bản ghi xem thử – KHÔNG tải lên mạng')}catch(err){toast('Không thể nhập tệp: '+err.message)}};const inp=$('#qaSearch');if(inp)inp.addEventListener('input',e=>{const pos=e.target.selectionStart;state.query=e.target.value;state.page=0;render();let x=$('#qaSearch');x.focus();x.setSelectionRange(Math.min(pos,x.value.length),Math.min(pos,x.value.length))});const sel=$('#qaGroup');if(sel)sel.onchange=e=>route(e.target.value==='all'?'qa-all':'qa-'+e.target.value);const unit=$('#unitSearch');if(unit)unit.oninput=e=>{const pos=e.target.selectionStart;state.unitQuery=e.target.value;render();let el=$('#unitSearch');el.focus();el.setSelectionRange(Math.min(pos,el.value.length),Math.min(pos,el.value.length))}}
function toggleDemo(on){state.demo=on;state.page=0;updateGlobal();render();toast(on?'Đây là dữ liệu mẫu, KHÔNG PHẢI kết quả thực tế':'Đã tắt chế độ minh họa')}
function assistantResults(term){const q=term.trim();if(!q)return;const best=published().map(x=>({x,score:scoreQA(x,q)})).filter(o=>o.score>0).sort((a,b)=>b.score-a.score||a.x.id.localeCompare(b.x.id)).slice(0,5);const box=$('#assistantResults');if(!best.length){box.innerHTML='<div class="small-note">Chưa tìm thấy câu trả lời được duyệt phù hợp. Bạn có thể gửi câu hỏi mới khi quản trị bật tính năng tiếp nhận.</div>';return;}const lead=best[0],intro=lead.score>=10?'<div class="assistant-answer"><strong>Gợi ý phù hợp nhất từ kho đã duyệt</strong><p>'+E(lead.x.answer.slice(0,630))+(lead.x.answer.length>630?'…':'')+'</p><small>Chỉ là kết quả tra cứu theo từ khóa; hãy mở QA để đọc đầy đủ.</small></div>':'<div class="small-note">Có các câu liên quan; vui lòng kiểm tra nội dung trước khi áp dụng.</div>';box.innerHTML=intro+best.map(o=>'<button type="button" class="assistant-suggestion" data-qa="'+E(o.x.id)+'">'+E(o.x.question)+' <small>'+E(o.x.id)+' · Đọc câu trả lời →</small></button>').join('')}
async function loadQuestionFormConfig(){const notice=$('#questionNotice'),submit=$('#questionSubmit'),form=$('#questionForm');try{const r=await fetch('data/questions-config.json',{cache:'no-store'});if(!r.ok)throw Error('Chưa có cấu hình');const data=await r.json();const url=new URL(data.endpoint||'');if(data.schema!==1||data.enabled!==true||url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw Error('Chưa kích hoạt');form.action=url.href;submit.disabled=false;notice.textContent='Câu hỏi sẽ được gửi sang hộp tiếp nhận riêng tư để hỗ trợ xử lý. Không gửi CCCD, số điện thoại, mật khẩu, mã OTP hoặc thông tin cá nhân. Một tab mới sẽ hiển thị xác nhận.';}catch(e){submit.disabled=true;notice.textContent='Chức năng nhận câu hỏi mới chưa kích hoạt. Bạn vẫn tra cứu được QA đã duyệt trong kho.';}}

function boot(){if(new URL(location.href).searchParams.get('demo')==='1')state.demo=true;syncFromUrl();const clock=()=>$('#clock').textContent=new Intl.DateTimeFormat('vi-VN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());clock();setInterval(clock,60000);
 document.addEventListener('click',async e=>{const node=e.target.closest('[data-view],[data-action],[data-qa]');if(!node)return;if(node.dataset.view){route(node.dataset.view);return}if(node.dataset.qa){openQA(node.dataset.qa);return}const a=node.dataset.action;if(a==='demo')toggleDemo(true);if(a==='prev'){state.page=Math.max(0,state.page-1);render();}if(a==='next'){state.page++;render()}if(a==='upload-progress')$('#progressFile')?.click();if(a==='export-progress')exportProgress();if(a==='export-qa')exportQA();if(a==='export-finance')exportFinance();if(a==='print')window.print()});
 $('#endDemo').onclick=()=>{if(state.local){loadData();toast('Đã xóa dữ liệu xem thử cục bộ')}else toggleDemo(false)};$('#refreshBtn').onclick=()=>loadData().then(()=>toast('Đã tải lại dữ liệu xuất bản'));$('#openMenu').onclick=()=>{$('#sidebar').classList.add('mobile-open');$('#shade').classList.add('mobile-open')};$('#closeMenu').onclick=closeMobile;$('#shade').onclick=closeMobile;
 $('#closeModal').onclick=closeQA;$('#qaModal').onclick=e=>{if(e.target===$('#qaModal'))closeQA()};$('#copyLinkBtn').onclick=async e=>{const x=published().find(x=>x.id===e.currentTarget.dataset.id);if(!x)return;const u=new URL('hoi-dap.html',location.href);u.searchParams.set('view','qa-'+x.group);u.searchParams.set('id',x.id);try{await navigator.clipboard.writeText(u.href);toast('Đã sao chép liên kết')}catch{window.prompt('Sao chép liên kết:',u.href)}};
 const assistant=$('#assistantWrap');$('#openAssistant').onclick=()=>{assistant.classList.toggle('hidden');if(!assistant.classList.contains('hidden'))$('#assistantInput').focus()};$('#closeAssistant').onclick=()=>assistant.classList.add('hidden');$('#assistantForm').onsubmit=e=>{e.preventDefault();assistantResults($('#assistantInput').value)};$('#askToggle').onclick=()=>{const panel=$('#askPanel');panel.classList.toggle('hidden');$('#askToggle').setAttribute('aria-expanded',String(!panel.classList.contains('hidden')));if(!panel.classList.contains('hidden'))$('#questionText').focus()};$('#questionForm').onsubmit=e=>{if($('#questionSubmit').disabled){e.preventDefault();toast('Chưa kích hoạt nhận câu hỏi mới');return}const text=$('#questionText').value.trim();if(text.length<12||text.length>1200||/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b(?:0[35789]\d{8}|\d{12})\b)/i.test(text)){e.preventDefault();toast('Vui lòng không gửi thông tin cá nhân; câu hỏi dài 12–1200 ký tự');return}setTimeout(()=>{$('#questionText').value=''},200)};loadQuestionFormConfig();
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeQA();assistant.classList.add('hidden');closeMobile()}});window.addEventListener('popstate',syncFromUrl);loadData();}
window.CDSTUHUE_TEST={fold,scoreQA,normQA,validProgress};
boot();
})();
