# QA image library V36 — chỉ ảnh đã kiểm duyệt

**Trạng thái hiện tại: CHƯA CÓ ẢNH GỐC KHẢ DỤNG ĐỂ ĐƯA LÊN WEBSITE.**

Nguồn Messages Archive có 19.221 dòng tin nhắn và ghi nhận 2.171 nhãn \`[Hình ảnh]\` (quét 02/11/2026) nhưng chưa có tệp JPG/PNG/WEBP hoặc URL ảnh trực tiếp, nên không thể khôi phục ảnh gốc chỉ bằng dữ liệu văn bản. Không tự lấy ảnh gần tin nhắn vì có thể sai ngữ cảnh, chứa dữ liệu nội bộ hoặc cá nhân.

## Khi có tệp ảnh nguyên gốc từ Zalo/Android

1. Lưu ảnh trong thư mục riêng, không đẩy nguyên bộ vào website.
2. Đối chiếu từng ảnh với đúng tin nhắn (nhóm, thời điểm, người trao đổi, câu hỏi và câu trả lời); mọi trường hợp không chắc chắn đều để ở bản nháp riêng tư.
3. Xác minh QA đang được duyệt trong \`site/data/approved.json\` và nội dung ảnh không chứa số CCCD, điện thoại, tài khoản, OTP, tên người, hồ sơ riêng, nội dung chat nội bộ. Che/ẩn các chi tiết riêng tư và xóa EXIF.
4. Sau khi đã duyệt **ảnh cho mục đích công khai**, chuyển sang JPG/PNG/WEBP dung lượng không quá 4MB, tên file an toàn trong \`site/assets/qa-media/\`.
5. Bổ sung \`site/data/qa-media-public.json\`:
   \`\`\`json
   {"schema":1,"items":[{"id":"QA110","public":true,"images":[
     {"src":"assets/qa-media/qa110-step1.webp","alt":"Màn hình đã che dữ liệu cá nhân, hướng dẫn bước nộp đảng phí","caption":"Bước kê khai – hình nguồn đã đối chiếu và cho phép công khai","reviewed":true}
   ]}]}
   \`\`\`
   Ví dụ đường dẫn là cấu trúc dữ liệu, **không chứng minh file đó đã tồn tại**. Không thêm mục khi chưa có ảnh thật.
6. Chạy test \`python -m unittest discover -s tests -p test_public_qa_media.py -v\` rồi triển khai. Ảnh chỉ hiện trong hộp chi tiết QA đã duyệt, bấm ảnh mở bản đầy đủ.

## Điều bắt buộc giữ nguyên
- 245 câu QA được duyệt, dữ liệu nguồn Google Sheet và thứ tự Messages Archive.
- Mặc định **không hiện ô ảnh trống**, không lấy hình minh họa AI/ảnh không phải nguồn thay cho screenshot.
- Không tự công khai link Drive riêng tư/tin nhắn trong Messages.
