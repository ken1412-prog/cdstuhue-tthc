/* CDSTUHUE V35 — reference-only click guides attached to already approved QA.
   No new QA records, no changes to approved answer or WEB_PUBLISH. */
(()=>{
'use strict';
const GUIDES={"QA110":{"title":"Tự kê khai và thanh toán","diagram":true,"notes":"Thanh toán chỉ sau khi hồ sơ/mức đóng được phê duyệt. Nếu ngân hàng đã trừ tiền nhưng trạng thái chưa cập nhật, không nộp lại ngay.","steps":[["Đăng nhập","Vào Cổng DVC Đảng → “Đăng nhập” → xác thực VNeID."],["Kê khai","Chọn “Thu, nộp đảng phí cho bản thân” → “Nộp hồ sơ” ở phần kê khai, kiểm tra thông tin và mức đóng, tích ô cam đoan rồi gửi."],["Chờ phê duyệt","Người có quyền tại chi bộ kiểm tra và phê duyệt mức đóng trước khi thanh toán."],["Thanh toán","Chọn “Nộp đảng phí” → “Thanh toán” → kiểm tra kỳ và số tiền → chọn phương thức → “Tiếp theo” nếu lấy mã QR."],["Biên lai","Thanh toán bằng ngân hàng, xem biên lai hoặc “Danh sách giao dịch nộp đảng phí” để đối chiếu."]],"sources":[["Cổng DVC Đảng","https://dichvucong.dcs.vn/web/home","chính thức"],["Hướng dẫn 5 bước","https://quyetthang.haiphong.gov.vn/chi-dao-dieu-hanh/huong-dan-thu-nop-dang-phi-truc-tuyen-qua-cong-dich-vu-cong-cua-dang-05-buoc-989905","23/10/2026"]]},"QA111":{"title":"Khai hộ và nộp hộ","notes":"Khai hộ tạo tờ khai; nộp hộ thanh toán hồ sơ đã duyệt. Các nút quản trị chỉ xuất hiện theo vai trò được phân quyền.","steps":[["Khai hộ","Đăng nhập VNeID → “Kê khai thông tin thu nộp đảng phí hộ” → “Nộp hồ sơ”."],["Nhập liệu","Kiểm tra người khai hộ → “Tiếp theo”; nhập đảng viên, mức đóng và liên hệ → “Tiếp theo”; tích ô “Tôi cam đoan…” → “Nộp hồ sơ”."],["Chờ duyệt","Đợi xác nhận/phê duyệt tờ khai trước khi thanh toán."],["Nộp hộ","Với Bí thư/phụ trách tài chính: “Quản lý đảng phí” → “Danh sách đảng phí chờ nộp” → “Nộp hộ Đảng phí”."],["Thêm người và thanh toán","“Thêm hồ sơ nộp hộ” → chọn người → “Thêm vào danh sách” → kiểm tra số tiền → “Thanh toán” → lưu biên lai."]],"sources":[["Khai hộ","https://thuvienphapluat.vn/phap-luat/ho-tro-phap-luat/huong-dan-ke-khai-thong-tin-dong-dang-phi-cua-dang-vien-truc-tuyen-2026-tren-dich-vu-cong-ra-sao-kh-517200-296045.html","14/10/2026"],["Nộp hộ","https://thuvienphapluat.vn/phap-luat/ho-tro-phap-luat/huong-dan-cach-nop-ho-dang-phi-truc-tuyen-2026-nhu-the-nao-huong-dan-cach-nop-dang-phi-ho-nguoi-kha-160173-296688.html","17/10/2026"]]},"QA091":{"title":"Tra cứu trạng thái hồ sơ","notes":"Chỉ điền mã hồ sơ và mã bảo mật trên cổng chính thức; không gửi chúng vào kho hỏi đáp công khai.","steps":[["Mở tra cứu","Truy cập trang chủ và tìm khung “Tra cứu trạng thái xử lý hồ sơ”."],["Điền mã","Nhập “Mã hồ sơ” và “Mã bảo mật”."],["Xem kết quả","Bấm “Tra cứu”, kiểm tra trạng thái và thông báo bổ sung nếu có."]],"sources":[["Trang DVC Đảng","https://dichvucong.dcs.vn/web/home","chính thức"]]},"QA115":{"title":"Duyệt hồ sơ đảng phí","notes":"Chỉ tài khoản có quyền xử lý; nếu hồ sơ sai mức tiền thì phải điều chỉnh trước khi duyệt.","steps":[["Mở danh sách","Đăng nhập trang xử lý → “Hồ sơ chờ phê duyệt” hoặc “Danh sách đảng phí chờ phê duyệt”."],["Chi tiết","Chọn “Chi tiết”, kiểm tra người kê khai, kỳ và mức đóng."],["Duyệt","Đúng thì “Duyệt”/“Phê duyệt đảng phí”; sai thì dùng “Điều chỉnh” theo quyền rồi mới duyệt."]],"sources":[["Hướng dẫn xử lý","https://www.evngenco2.vn/vi/news/tin-tuc/huong-dan-thu-nop-dang-phi-truc-tuyen-qua-cong-dich-vu-cong-cua-dang-3377.html","19/10/2026"]]},"QA116":{"title":"Kiểm tra trước và sau nộp","notes":"Checklist tham khảo, không thay thế điều kiện hồ sơ chính thức.","steps":[["Trước khi nộp","Đối chiếu thủ tục, cơ quan tiếp nhận, thông tin người đề nghị, trường bắt buộc và tệp đính kèm."],["Xem lại","Ở bước “Xem lại hồ sơ và nộp” nếu có, đọc kỹ và bấm “Nộp hồ sơ”."],["Sau khi gửi","Lưu mã hồ sơ, vào “Tra cứu trạng thái xử lý hồ sơ” để theo dõi yêu cầu bổ sung."]],"sources":[["Trang DVC Đảng","https://dichvucong.dcs.vn/web/home","chính thức"]]},"QA046":{"title":"Tìm tài liệu hướng dẫn mới","notes":"Trang tài liệu tải động; chưa thể xác minh ngày cập nhật từng file. Không coi PDF cũ là quy trình mới nhất.","steps":[["Mở nguồn","Vào Cổng DVC Đảng, tìm mục “Hướng dẫn sử dụng”."],["Chọn thủ tục","Mở tài liệu đúng thủ tục, đối chiếu phiên bản và nút trên giao diện thực tế."],["Nếu giao diện khác","Liên hệ đầu mối hỗ trợ; không tự bỏ qua bước duyệt hoặc xác nhận."]],"sources":[["Trang hướng dẫn","https://dichvucong.dcs.vn/web/dvc/ho-tro/huong-dan-dan-su-dung","cổng chính thức"]]}};
const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
function supplement(){
 const body=document.getElementById('modalBody'),idNode=document.getElementById('modalId');
 if(!body||!idNode||body.querySelector('.qa-click-guide'))return;
 const id=(idNode.textContent||'').trim().split(/\s+/)[0];
 if((idNode.textContent||'').includes('MINH HỌA'))return;
 const guide=GUIDES[id];if(!guide)return;
 const section=make('section','qa-click-guide');
 section.setAttribute('aria-label','Hướng dẫn bấm nút tham khảo');
 section.append(make('h3','qa-click-heading','Hướng dẫn bấm nút · '+guide.title),
   make('p','qa-click-explain','Bổ sung tham khảo từ nguồn công khai, đối chiếu 02/11/2026; không thay thế câu trả lời đã duyệt.'));
 if(guide.diagram){
  const fig=make('figure','qa-click-flow');
  const img=make('img');img.src='assets/img/qa-dang-phi-5-buoc-v35.svg';
  img.alt='Sơ đồ minh họa 5 bước: đăng nhập, kê khai, chờ phê duyệt, thanh toán và biên lai';
  img.loading='lazy';
  fig.append(img,make('figcaption','', 'Sơ đồ minh họa quy trình, không phải ảnh chụp giao diện thực tế.'));
  section.append(fig);
 }
 const list=make('ol','qa-click-list');
 for(const [title,detail] of guide.steps){
  const li=make('li');
  li.append(make('strong','',title),make('p','',detail));
  list.append(li);
 }
 section.append(list,make('p','qa-click-note','Lưu ý: '+guide.notes));
 const sources=make('div','qa-click-sources');
 sources.append(make('b','','Tài liệu đối chiếu:'));
 for(const [name,url,date] of guide.sources){
  const a=make('a','',name+' · '+date+' ↗');
  a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  sources.append(a);
 }
 section.append(sources);body.append(section);
}
function install(){
 const body=document.getElementById('modalBody');
 if(!body)return;
 // The approved answer is rendered in app.js; attach optional guide AFTER it.
 const observer=new MutationObserver(()=>supplement());
 observer.observe(body,{childList:true});
 supplement();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
