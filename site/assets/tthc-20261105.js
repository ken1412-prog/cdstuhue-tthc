/* Update 05/11/2026: supplementary instructions only. Preserve 245 approved QA. */
(()=>{'use strict';
const impacted=new Set(['QA006','QA007','QA017','QA026','QA030','QA034','QA052','QA062','QA104','QA110','QA111','QA115','QA120','QA122']);
const detail={
QA110:['Đăng nhập → Thu nộp Đảng phí → Xem chi tiết nghĩa vụ → chọn kỳ.','Kiểm tra dữ liệu BHXH, truy thu/giảm trừ và số phải nộp.','Đúng thì nhấn Đóng đảng phí, chọn phương thức, kiểm tra biên lai.','Sai hoặc thiếu căn cứ thì Yêu cầu điều chỉnh / Gửi thông tin mức đảng phí, đính kèm minh chứng rồi chờ xử lý.'],
QA111:['Thu nộp Đảng phí → Thu nộp Đảng phí hộ → Xem chi tiết nghĩa vụ.','Tra cứu người nộp hộ bằng số thẻ, họ tên, ngày sinh.','Kiểm tra đúng kỳ và số tiền → Đóng đảng phí; nếu sai mức thì yêu cầu điều chỉnh.'],
QA115:['Tài khoản có quyền → Quản lý hồ sơ Đảng phí → Hồ sơ cần điều chỉnh.','Tìm hồ sơ → Xử lý yêu cầu → đối chiếu minh chứng.','Nhập Mức phê duyệt và lý do → Phê duyệt điều chỉnh; hồ sơ về Chờ nộp.']
};
function el(t,c,txt){const x=document.createElement(t);if(c)x.className=c;if(txt!==undefined)x.textContent=txt;return x}
function render(){const b=document.getElementById('modalBody'),m=document.getElementById('modalId');if(!b||!m||!b.querySelector('.answer'))return;const str=m.textContent||'';if(str.includes('MINH HỌA'))return;const id=str.trim().split(/\s+/)[0];if(!impacted.has(id))return;const old=b.querySelector('.qa-click-guide');if(old&&detail[id])old.hidden=true;if(b.querySelector('.tthc-20261105-alert'))return;
const x=el('section','tthc-20261105-alert');x.append(el('h3','','Cập nhật quy trình TTHC 05/11/2026'),el('p','','Câu trả lời gốc được giữ nguyên theo lần duyệt. Một số bước tự kê khai và phê duyệt đảng phí định kỳ đã thay đổi; xem thông tin mới bên dưới.'));
const a=el('a','','Xem 04 thủ tục và sơ đồ quy trình mới ↗');a.href='cap-nhat-tthc-2026-11.html';a.target='_blank';a.rel='noopener noreferrer';x.append(a);
if(detail[id]){const f=el('figure'),link=el('a');link.href='assets/img/tthc-2026-11-dang-phi.svg';link.target='_blank';link.rel='noopener';const img=el('img');img.src=link.href;img.alt='Sơ đồ quy trình đảng phí mới';img.loading='lazy';link.append(img);f.append(link);x.append(f);const ol=el('ol');for(const s of detail[id])ol.append(el('li','',s));x.append(ol)}
x.append(el('p','tthc-source','Theo tài liệu tập huấn 05/11/2026 và Quyết định 762-QĐ/VPTW ngày 31/10/2026.'));b.insertBefore(x,b.querySelector('.answer').nextSibling)}
function boot(){const b=document.getElementById('modalBody');if(!b)return;new MutationObserver(render).observe(b,{childList:true});render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()})();