# Quản trị CDSTUHUE có mật khẩu — cách cài riêng

Website CDSTUHUE trên GitHub Pages là trang tĩnh, vì vậy mật khẩu không được lưu trong mã HTML/JS công khai. Bộ này là **Google Apps Script Web App thứ hai**, riêng tư, tách hoàn toàn Web App QA/stats đang hoạt động.

## Tạo dự án quản trị mới

1. Vào https://script.google.com/home/projects → **New project**, đặt tên `CDSTUHUE_ADMIN_PRIVATE`.
2. Sao chép **AdminPortal.gs** (cùng thư mục với file hướng dẫn này) vào **Code.gs** của dự án quản trị mới.
3. Chọn nút **+ → HTML**, tạo file tên **Admin**; dán toàn bộ nội dung **Admin.html**. Không dán AdminPortal.gs vào dự án Web App công khai.
4. Tại **Project settings → Script properties**, thêm `CDSTUHUE_STATS_HUB_ID` với ID bảng **CDSTUHUE STATS HUB 2026**; và `CDSTUHUE_ADMIN_INITIAL_PASSWORD` với mật khẩu riêng **12–128 ký tự**, khác mật khẩu Google, không gửi mật khẩu trong chat.
   - *Tùy chọn:* `CDSTUHUE_QA_SHEET_ID` = ID bảng **Hỗ trợ kỹ thuật CDSTUHUE** để mở liên kết đến bảng duyệt QA sau khi đăng nhập (không gửi ID này qua trang chủ).
5. Nhấn **Save**. Chọn hàm `cdsAdminBootstrap` → **Run**, cấp quyền cần thiết. Chương trình tự tạo salt/hash SHA-256, xóa thuộc tính mật khẩu khởi tạo. Kiểm tra Script Properties còn `CDSTUHUE_ADMIN_PASSWORD_HASH` và `CDSTUHUE_ADMIN_PASSWORD_SALT`, không còn `CDSTUHUE_ADMIN_INITIAL_PASSWORD`.
6. **Deploy → New deployment → Web app**; chọn **Execute as Me** và **Who has access: Only myself**. *Không* dùng **Anyone** hoặc **Anyone with Google account**. Nếu nền tảng/tổ chức không cung cấp Only myself, dừng để điều chỉnh phương án bảo mật.
7. Sao chép URL Web App quản trị dạng `https://script.google.com/macros/s/.../exec`.

## Mở từ website

Vào website CDSTUHUE, bấm **⚙ Quản trị** ở chân trang. Lần đầu dán URL Web App quản trị; trình duyệt chỉ nhớ URL, không nhớ mật khẩu. Lần sau bấm nút sẽ mở trực tiếp trang quản trị. Giữ **Shift** khi bấm để đổi URL. Google sẽ kiểm tra tài khoản chủ sở hữu, sau đó trang yêu cầu mật khẩu quản trị riêng.

## Các tính năng đã có

- **Ẩn/hiện các mục website:** ghi vào `STATS HUB → QUAN_TRI_DANH_MUC`; mục Tổng quan không được tắt.
- **Duyệt/tạm ẩn phân hệ thống kê:** ghi vào `STATS HUB → DUYET_WEBSITE`, giữ nguyên giới hạn phạm vi công khai đã duyệt. Không đưa phân bổ quay lại.
- **Đánh dấu duyệt các nguồn Excel nháp:** sửa kỳ nguồn (cột F) và trạng thái (cột H) trong `DU_LIEU_CHO_DUYET`. **Chưa tự chuyển nguồn chính thức**, vẫn phải chạy bộ nhập Excel và xác nhận đối chiếu ở bước chuyển nguồn.
- Có nhật ký `NHAT_KY_QUAN_TRI` để đối chiếu ai/điều gì được thay đổi (trong dự án owner-only thì người thao tác là chủ sở hữu).
- Liên kết trực tiếp tới STATS HUB và bảng hỏi đáp để rà soát.

## Lưu ý vận hành và bảo mật

- Đây là **Web App riêng**. Không dán hai file này vào Code.gs của Web App QA/stats công khai; nếu cài chung thì người lạ có thể truy cập các RPC của cùng project.
- Mật khẩu riêng chỉ được xác minh ở máy chủ; Script Properties lưu bản băm + salt sau bootstrap; mật khẩu không hiện trong HTML, GitHub hoặc localStorage.
- Tối đa 5 lượt sai, khóa tạm khoảng 15 phút; phiên quản trị sống 25 phút trong CacheService và chỉ giữ trên tab đang mở.
- Những thay đổi ẩn/hiện cần website chạy workflow **Publish CDSTUHUE website** (lịch khoảng 2 giờ/lần) để cập nhật số công khai; không có nút nào tự ghi HTML mới bằng mật khẩu.
- Nút quản trị hiện trên website cho mọi người nhưng trang quản trị thực tế chỉ chủ sở hữu đăng nhập Google và có mật khẩu riêng mới mở được.
- Muốn thay mật khẩu, thao tác trong Apps Script dự án quản trị do chủ sở hữu kiểm soát. Không gửi mật khẩu cho AI.

**Các file:** AdminPortal.gs, Admin.html, README.md; nút website ở `site/assets/admin-launcher.js`.