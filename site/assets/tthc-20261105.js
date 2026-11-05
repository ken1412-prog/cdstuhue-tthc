/* CDSTUHUE | Nội dung đảng phí sau cập nhật 05/11/2026. 245 QA nguồn giữ nguyên. */
(()=>{'use strict';
const corrected={"QA006":["Hệ thống tự tính và tạo nghĩa vụ đảng phí theo kỳ. Miễn/giảm cần được cấu hình đúng; miễn 100% không phát sinh khoản tiền phải thanh toán.",["Mở Thu nộp Đảng phí → Xem chi tiết nghĩa vụ → chọn kỳ và kiểm tra mức miễn/giảm.","Nếu số tiền hoặc tỷ lệ miễn/giảm sai, gửi Yêu cầu điều chỉnh kèm minh chứng để cán bộ chi bộ xem xét.","Không phải lập tờ khai hằng tháng rồi chờ phê duyệt."]],"QA007":["Đảng phí bình thường KHÔNG phải chờ Bí thư/Ủy viên tài chính phê duyệt. Hệ thống tự tính nghĩa vụ, đảng viên kiểm tra và nộp trực tiếp.",["Dữ liệu BHXH được tiếp nhận ngày 05; kỳ thu mở lúc 00:00 ngày 06 hằng tháng.","Số tiền đúng: Thu nộp Đảng phí → Xem chi tiết nghĩa vụ → chọn kỳ → Đóng/Nộp đảng phí → thanh toán. Ngân hàng xác nhận thì hệ thống chuyển Đã nộp, có biên lai điện tử.","Số tiền chưa đúng: đảng viên gửi đề nghị xem xét/điều chỉnh, kèm minh chứng; cán bộ phụ trách chi bộ xác nhận mức đóng. Chỉ trường hợp này mới có bước xét duyệt.","Miễn 100% đúng cấu hình thì hệ thống có thể hoàn thành khoản 0 đồng không cần thanh toán."]],"QA017":["Mức đóng tính từ BHXH chưa đúng thì gửi Yêu cầu điều chỉnh, không chờ phê duyệt tờ khai tháng.",["Vào Thu nộp Đảng phí → Xem chi tiết nghĩa vụ → chọn kỳ.","Chọn Yêu cầu điều chỉnh/Gửi thông tin mức đảng phí, nêu mức đề nghị, lý do, đính kèm minh chứng.","Cán bộ được phân quyền xem xét; sau khi xác nhận mức, đảng viên thanh toán."]],"QA026":["Không cần Bí thư hoặc Ủy viên tài chính phê duyệt đảng phí định kỳ khi hệ thống đã tính đúng. Chỉ yêu cầu điều chỉnh mức đóng mới cần cán bộ có quyền xét duyệt.",["Nếu số tiền đúng, đảng viên thanh toán thẳng qua ngân hàng.","Nếu số tiền sai, gửi yêu cầu điều chỉnh kèm minh chứng.","Cán bộ phụ trách chi bộ được phân quyền vào Quản lý hồ sơ Đảng phí → Hồ sơ cần điều chỉnh → Xử lý yêu cầu để xét mức đóng."]],"QA030":["Cơ chế mới tự tính và tự tạo nghĩa vụ đảng phí hằng tháng, không có bước duyệt tờ khai thường kỳ.",["Dữ liệu BHXH nhận ngày 05; mở thu từ 00:00 ngày 06.","Nếu số tiền đúng, đảng viên nộp trực tiếp. Nếu sai, gửi yêu cầu điều chỉnh để được xem xét.","Không cần bật chức năng tự phê duyệt tờ khai như quy trình trước."]],"QA033":["Khoản đảng phí nộp thiếu các tháng trước được truy thu vào kỳ nộp hiện tại; không mở lại các tháng đã khóa sổ.",["Nếu BHXH có dữ liệu chênh lệch, hệ thống tự tính truy thu.","Nếu chưa có dữ liệu, đảng viên cung cấp trong yêu cầu điều chỉnh để cán bộ được phân quyền xác nhận.","Nộp khoản kỳ này cùng tiền truy thu; hệ thống phân bổ vào tháng nộp bù."]],"QA042":["Với kỳ đảng phí bình thường, Bí thư không cần nhận hồ sơ để duyệt. Không thấy hồ sơ chờ duyệt chưa phải lỗi.",["Đảng viên kiểm tra Xem chi tiết nghĩa vụ theo đúng kỳ thu.","Số tiền đúng thì thanh toán trực tiếp, không chờ phê duyệt.","Chỉ khi đã gửi Yêu cầu điều chỉnh mà cán bộ không thấy hồ sơ mới cần kiểm tra phân quyền, kỳ thu và đồng bộ tổ chức đảng."]],"QA063":["Xác nhận tỷ lệ phân bổ là công việc riêng để đơn vị nhận tiền, không phải điều kiện duyệt tờ khai đảng phí định kỳ.",["Đảng viên thanh toán nghĩa vụ nếu hệ thống tính đúng, không cần cán bộ duyệt tờ khai.","Đơn vị muốn nhận phần phân bổ phải xác thực tài khoản ngân hàng của tổ chức và xác nhận tỷ lệ phân bổ.","Thiếu điều kiện nhận phân bổ có thể khiến tiền chưa chuyển về đơn vị; không đồng nghĩa khoản đảng phí chưa được nộp."]],"QA104":["Sai số tiền đảng phí: dùng Yêu cầu điều chỉnh và đính kèm minh chứng; không phải từ chối tờ khai định kỳ để khai lại.",["Mở Xem chi tiết nghĩa vụ → chọn kỳ → Yêu cầu điều chỉnh.","Ghi mức đề nghị và lý do, gửi minh chứng.","Cán bộ được phân quyền xử lý yêu cầu; đảng viên nộp sau khi mức được xác nhận."]],"QA110":["Đảng viên không phải tự kê khai hồ sơ và chờ Bí thư duyệt mỗi tháng. Hệ thống tự tạo nghĩa vụ, đảng viên đối chiếu rồi nộp.",["Vào Thu nộp Đảng phí → Xem chi tiết nghĩa vụ → chọn kỳ.","Kiểm tra căn cứ tính, truy thu/giảm trừ, miễn/giảm và số phải đóng.","Nếu đúng, bấm Đóng đảng phí → chọn phương thức → thanh toán qua ngân hàng.","Sau khi ngân hàng xác nhận, kiểm tra trạng thái Đã nộp và biên lai. Nếu sai mức, gửi Yêu cầu điều chỉnh trước khi thanh toán."]],"QA111":["Nộp hộ là thanh toán nghĩa vụ đã được hệ thống tính cho người khác, không phải khai hộ hồ sơ định kỳ chờ duyệt.",["Trong Thu nộp Đảng phí, mở mục nộp hộ và Xem chi tiết nghĩa vụ.","Tra cứu đúng người bằng CCCD, họ tên, ngày sinh theo các trường yêu cầu.","Đối chiếu kỳ, số tiền và thanh toán qua ngân hàng; nếu mức tính sai thì gửi điều chỉnh trước khi nộp."]],"QA120":["Đảng phí thường kỳ không phải gửi tờ khai lên Đảng bộ để phê duyệt. Chỉ cần kiểm tra tuyến xử lý khi yêu cầu điều chỉnh bị chuyển sai cấp.",["Nghĩa vụ đúng: đảng viên nộp trực tiếp.","Nếu yêu cầu điều chỉnh đi sai cấp, kiểm tra kỳ, mã hồ sơ, cây tổ chức và tài khoản có quyền xử lý.","Nếu dữ liệu tổ chức chưa đồng bộ, chuyển đầu mối quản trị để xử lý định tuyến, không duyệt nhầm cấp."]],"QA122":["Hệ thống báo không nợ đảng phí: kiểm tra kỳ thu và nghĩa vụ tự sinh, không yêu cầu tạo tờ khai mới rồi chờ Bí thư duyệt.",["Mở Thu nộp Đảng phí → Xem chi tiết nghĩa vụ → chọn đúng kỳ (mở thu từ 00:00 ngày 06).","Kiểm tra số phải nộp, miễn/giảm và dữ liệu BHXH.","Nếu mức tính sai, gửi Yêu cầu điều chỉnh; nếu nghĩa vụ dương nhưng báo không nợ thì lưu thông tin kỳ, trạng thái và nhờ hỗ trợ tra soát.","Không tạo giao dịch thanh toán thử để tránh trùng."]]};
const other={
QA101:"Nhận xét nơi cư trú gồm ba quy trình: giới thiệu sinh hoạt, lấy ý kiến phục vụ công tác cán bộ và nhận xét cuối năm.",
QA112:"Chuyển sinh hoạt chính thức dùng giấy giới thiệu điện tử sáu ô; chi bộ xác nhận điện tử, đảng ủy ký số theo cấp.",
QA113:"Chuyển sinh hoạt tạm thời có hai chiều đi và về, tương ứng các ô 1–4 và 5–8.",
QA114:"Nhận xét nơi cư trú: chi bộ tạo hồ sơ hoặc lập danh sách, nơi cư trú nhận xét và cấp có quyền ký."
};
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
function link(parent){const a=el('a','','Xem hướng dẫn 04 quy trình TTHC');a.href='cap-nhat-tthc-2026-11.html';a.target='_blank';a.rel='noopener noreferrer';parent.append(a)}
function fixCards(){
 const page=document.getElementById('page');if(!page)return;
 for(const card of page.querySelectorAll('.qa-item[data-qa]')){
  const entry=corrected[card.dataset.qa],p=card.querySelector('p');
  if(entry&&p&&p.textContent!==entry[0])p.textContent=entry[0];
 }
}
function fixModal(){
 const b=document.getElementById('modalBody'),m=document.getElementById('modalId');
 if(!b||!m||m.textContent.includes('MINH HỌA'))return;
 const id=String(m.textContent||'').trim().split(/\s+/)[0],answer=b.querySelector('.answer');
 if(!answer)return;
 if(corrected[id]){
  if(answer.classList.contains('tthc-current-answer'))return;
  const archivedText=answer.textContent;answer.classList.add('tthc-current-answer');answer.replaceChildren();
  const [summary,steps]=corrected[id];
  answer.append(el('p','tthc-current-summary',summary));
  const list=el('ol','tthc-current-steps');for(const step of steps)list.append(el('li','',step));answer.append(list);
  const h=answer.previousElementSibling;if(h?.tagName==='H3')h.textContent='Trả lời theo quy trình mới · 05/11/2026';
  const archive=el('details','tthc-archive-answer');archive.append(el('summary','','Xem câu trả lời trước cập nhật'),el('p','',archivedText));answer.after(archive);
  const source=el('div','tthc-source-current');link(source);source.append(el('p','','Theo tài liệu tập huấn 05/11/2026 và Quyết định 762-QĐ/VPTW ngày 31/10/2026.'));archive.after(source);
  for(const x of b.querySelectorAll('.tthc-20261105-alert'))x.remove();
  const oldGuide=b.querySelector('.qa-click-guide');if(oldGuide)oldGuide.hidden=true;
  return;
 }
 if(other[id]&&!b.querySelector('.tthc-20261105-alert')){
  const note=el('div','tthc-20261105-alert');note.append(el('h3','','Quy trình cập nhật'),el('p','',other[id]));link(note);answer.after(note);
 }
}
function boot(){const b=document.getElementById('modalBody'),p=document.getElementById('page');
 if(b)new MutationObserver(fixModal).observe(b,{childList:true});
 if(p)new MutationObserver(fixCards).observe(p,{childList:true});
 fixModal();fixCards();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();