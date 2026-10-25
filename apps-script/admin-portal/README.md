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
## Nâng cấp giao diện hiện có — nhập Excel từ chính trang Quản trị

**Nếu bạn đã cài và đăng nhập được trang Quản trị:** không tạo dự án hoặc triển khai URL mới. Chỉ cập nhật đúng dự án `CDSTUHUE_ADMIN_PRIVATE` đang hoạt động:

1. Mở dự án Apps Script quản trị hiện tại. Thay toàn bộ mã trong **Mã.gs / Code.gs** bằng bản mới tại `AdminPortal.gs`; thay toàn bộ nội dung HTML trong **Admin.html** bằng bản mới tại `Admin.html`. Sao lưu cũ trước khi sửa. **Không dán file `ExcelIntake.gs` riêng**, vì mã nhập Excel đã được tích hợp trong `AdminPortal.gs` mới và các hàm nhập có hậu tố `_` để không cho gọi trực tiếp từ giao diện.
2. Vào **Project settings → Script properties** thêm `CDSTUHUE_EXCEL_INBOX_FOLDER_ID` bằng ID thư mục Drive riêng tư nhận bốn Excel. **Giữ nguyên các thuộc tính/mật khẩu băm đang có. Không chạy lại `cdsAdminBootstrap`.**
3. Chọn **Services (+) → Drive API → Add (v3)** để hỗ trợ chuyển Excel sang Google Sheets nháp, rồi Save.
4. Chọn **Deploy → Manage deployments → WEBAPP → Edit (bút chì) → New version → Deploy**. URL `/exec` hiện có không đổi. Tải lại trang, đăng nhập bằng mật khẩu đã thiết lập trước đây.
5. Cuộn xuống mục **Nhập và kiểm tra 4 Excel**: bấm **1. Kiểm tra 4 Excel**, đọc kết quả rồi bấm **2. Tạo bản nháp sau kiểm tra**. Chờ thông báo thành công. Dữ liệu đã chuẩn hóa nằm trên Google Drive riêng tư, các mã nguồn và số liệu tổng hợp ghi trong `DU_LIEU_CHO_DUYET` của STATS HUB.
6. Kiểm tra ngày nguồn ở cột F và đánh dấu duyệt từng nguồn trong panel. **Không tự chuyển `NGUON_4_FILE` hoặc cập nhật website** ở bước này; việc chuyển nguồn cần triển khai phiên bản dữ liệu công khai tương thích và xác nhận cuối.

**Bảo mật:** toàn bộ RPC bấm nút có kiểm tra phiên mật khẩu phía máy chủ; các hàm nhập cốt lõi kết thúc bằng `_`, không mở trực tiếp cho `google.script.run`. Tệp cá nhân không xuất lên GitHub. Nếu chưa cấu hình thư mục Excel, hai nút nhập sẽ bị vô hiệu hóa.

**Ghi chú vận hành:** chỉ giữ đúng 4 file Excel của một lượt trong thư mục nhận; chuyển 4 file lượt cũ sang thư mục lưu trữ bên ngoài trước khi đưa lượt mới. Giữ kỳ báo cáo chính xác, không để chương trình tự suy ra kỳ từ ngày hệ thống.
