'use strict';
/* Unit-level completion must follow approved numerators/denominators, never an
 * empty child list or the overall party-fee rate. Data dates are source dates.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('site/assets/app.js','utf8');
const css=fs.readFileSync('site/assets/styles.css','utf8');
const start=js.indexOf('function paymentIncompleteUnits(');
const end=js.indexOf('function openPaymentDetail(',start);
assert(start>=0&&end>start,'Popup helper definitions must exist');
const helpers=new Function('E','pretty',js.slice(start,end)+
 'return {paymentCompletePair,paymentFiledComplete,paymentDetailFinding,paymentLastUpdateDate};')(
 x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 new Intl.NumberFormat('vi-VN'));
const {paymentCompletePair,paymentFiledComplete,paymentDetailFinding,paymentLastUpdateDate}=helpers;
assert.equal(paymentCompletePair(6,6),true);
assert.equal(paymentCompletePair(0,0),false,'No zero/zero completion');
assert.equal(paymentCompletePair(null,null),false);
assert.equal(paymentCompletePair(5,6),false);
assert.equal(paymentCompletePair(7,6),false);
assert.equal(paymentFiledComplete({filedDone:34,filedTotal:34}),true);
assert.equal(paymentFiledComplete({filedDone:33,filedTotal:34,filedRate:1}),false,
 'Explicit incomplete counts override an inconsistent rate');
assert.equal(paymentFiledComplete({filedRate:1}),true,'Approved exact rate alone is sufficient');
assert.equal(paymentFiledComplete({filedRate:0.999999}),false);
const bank=paymentDetailFinding('Chưa có tài khoản ngân hàng',[],true,
 'Đã hoàn thành khai báo tài khoản Ngân hàng');
assert(bank.includes('payment-incomplete-section is-complete'));
assert(bank.includes('Đã hoàn thành khai báo tài khoản Ngân hàng'));
assert(!bank.includes('Không ghi nhận đơn vị'));
const filed=paymentDetailFinding('Còn hồ sơ chưa khai báo',null,true,
 'Đã hoàn thành khai báo hồ sơ');
assert(filed.includes('Đã hoàn thành khai báo hồ sơ'));
assert(!filed.includes('Chưa có danh sách'));
const ongoing=paymentDetailFinding('Chưa có tài khoản ngân hàng',
 [{name:'Đơn vị <A>',parentName:'Parent'}],false,'Đã hoàn thành');
assert(ongoing.includes('Đơn vị &lt;A&gt;'));
assert(!ongoing.includes('is-complete'));
assert(!ongoing.includes('Đã hoàn thành'));
const unknown=paymentDetailFinding('Còn hồ sơ chưa khai báo',[],false,'Đã hoàn thành');
assert(unknown.includes('Không ghi nhận đơn vị'));
assert(!unknown.includes('is-complete'),'Empty list is not proof of completion');
assert.equal(paymentLastUpdateDate({
 approvedDate:'2026-10-25',modules:{
  payment:{sourceSnapshot:'2026-10-26'},
  banking:{sourceSnapshot:'2026-10-27'},
  missing:{sourceSnapshot:'2026-10-24'}
 }
}),'27/10/2026');
assert.equal(paymentLastUpdateDate({approvedDate:'2026-10-29',modules:{
 banking:{sourceSnapshot:'2026-10-27'}}}),'29/10/2026');
assert.equal(paymentLastUpdateDate({approvedDate:'2026-02-30'}),'—');
assert.equal(paymentLastUpdateDate({period:'2026-10',generatedAt:'2026-10-27T14:00:00Z'}),'—',
 'Neither current time nor a month-only period can fabricate source day');
const modal=js.slice(js.indexOf('function openPaymentDetail('),js.indexOf('function closePaymentDetail('));
assert(modal.includes("const bankIsComplete=paymentCompletePair(row.bankDone,row.bankTotal)"));
assert(modal.includes("const filedIsComplete=paymentFiledComplete(row)"));
assert(modal.includes("bankIsComplete&&filedIsComplete"));
assert(modal.includes("bankIsComplete,"));
assert(modal.includes("filedIsComplete,"));
assert(modal.includes("paymentLastUpdateDate(stats)"));
assert(modal.includes("Dữ liệu cập nhật lần cuối: "));
assert(!modal.includes('Danh sách hồ sơ chỉ xác định cấp con'));
assert(!modal.includes('Chỉ công bố tên đơn vị được duyệt'));
assert(css.includes('#paymentModal .payment-incomplete-section.is-complete'));
assert(css.includes('background:linear-gradient(110deg,#08684f,#07523f)'));
for(const file of ['site/index.html','site/hoi-dap.html']){
 const html=fs.readFileSync(file,'utf8');
 assert(html.includes('id="paymentDetailBody"'));
}
// Render the actual dialog for completed and incomplete units.
const runtime=js.slice(js.indexOf('function paymentCountPair('),
 js.indexOf('function closePaymentDetail('));
const nodes={};
for(const id of ['paymentModal','paymentDetailBody','paymentDetailTitle',
 'paymentDetailPeriod','closePaymentDetail']){
 nodes[id]={innerHTML:'',textContent:'',classList:{remove(){}},focus(){}};
}
const appState={demo:false,paymentArchive:null};
const row={rank:1,name:'Đảng bộ thử nghiệm',rate:0.88,
 bankDone:6,bankTotal:6,filedDone:34,filedTotal:34,
 bankPendingUnits:[],unfiledUnits:[]};
const stats={schema:1,public:true,reviewed:true,period:'2026-10',
 approvedDate:'2026-10-26',modules:{
 payment:{sourceSnapshot:'2026-10-26'},
 banking:{sourceSnapshot:'2026-10-25'},ranking:{records:[row]}}};
const select=node=>nodes[node.slice(1)];
const openDetail=new Function('state','selectedFinanceStats',String.fromCharCode(36),
 'paymentPeriod','E','pretty','document',runtime+'return openPaymentDetail;')(
 appState,()=>stats,select,()=> 'Tháng 10/2026',
 x=>String(x),new Intl.NumberFormat('vi-VN'),{body:{style:{overflow:''}}});
openDetail(0);
let shown=nodes.paymentDetailBody.innerHTML;
assert(shown.includes('Đã hoàn thành khai báo tài khoản Ngân hàng'));
assert(shown.includes('Đã hoàn thành khai báo hồ sơ'));
assert(shown.includes('Tình trạng khai báo cấp con'));
assert(shown.includes('Dữ liệu cập nhật lần cuối: 26/10/2026'));
row.bankDone=5;row.filedDone=33;
row.bankPendingUnits=[{name:'Đơn vị A',parentName:'Parent'}];
row.unfiledUnits=[{name:'Đơn vị B',parentName:'Parent'}];
openDetail(0);
shown=nodes.paymentDetailBody.innerHTML;
assert(shown.includes('Đơn vị A')&&shown.includes('Đơn vị B'));
assert(shown.includes('Đơn vị cấp con cần xử lý'));
assert(!shown.includes('Đã hoàn thành khai báo tài khoản Ngân hàng'));
assert(!shown.includes('Đã hoàn thành khai báo hồ sơ'));

console.log('Payment popups PASS: per-unit 100%, partial/unknown, archived dates, dark green status, no obsolete notes');