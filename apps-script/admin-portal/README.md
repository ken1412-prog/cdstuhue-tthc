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

## Mở trang Quản trị

Mở **trực tiếp URL `/exec` của Web App `CDSTUHUE_ADMIN_PRIVATE`** đã lưu lúc cài đặt. Nút ⚙ Quản trị không còn hiển thị trên website công khai để tránh nhầm với khu vực dành riêng cho chủ sở hữu. Sau khi Google xác thực tài khoản có quyền, đăng nhập bằng mật khẩu quản trị riêng. **Không dùng URL `/exec` của Web App QA công khai.**

## Các tính năng đã có

- **Ẩn/hiện các mục website:** ghi vào `STATS HUB → QUAN_TRI_DANH_MUC`; mục Tổng quan không được tắt.
- **Duyệt/tạm ẩn phân hệ thống kê:** ghi vào `STATS HUB → DUYET_WEBSITE`, giữ nguyên giới hạn phạm vi công khai đã duyệt. Không đưa phân bổ quay lại.
- **Duyệt và chuyển bốn nguồn Excel:** kiểm tra → tạo bản nháp → duyệt kỳ/cột H trong `DU_LIEU_CHO_DUYET` → bấm **3. Chuyển 4 nguồn chính thức** ngay trong trang Quản trị; xác nhận đúng `DUYET YYYY-MM`. Máy chủ đối chiếu lại bốn nguồn, sao lưu cấu hình và thay `NGUON_4_FILE` chỉ khi hợp lệ.
- Có nhật ký `NHAT_KY_QUAN_TRI` để đối chiếu ai/điều gì được thay đổi (trong dự án owner-only thì người thao tác là chủ sở hữu).
- Liên kết trực tiếp tới STATS HUB và bảng hỏi đáp để rà soát.

## Lưu ý vận hành và bảo mật

- Đây là **Web App riêng**. Không dán hai file này vào Code.gs của Web App QA/stats công khai; nếu cài chung thì người lạ có thể truy cập các RPC của cùng project.
- Mật khẩu riêng chỉ được xác minh ở máy chủ; Script Properties lưu bản băm + salt sau bootstrap; mật khẩu không hiện trong HTML, GitHub hoặc localStorage.
- Tối đa 5 lượt sai, khóa tạm khoảng 15 phút; phiên quản trị sống 25 phút trong CacheService và chỉ giữ trên tab đang mở.
- Những thay đổi ẩn/hiện cần website chạy workflow **Publish CDSTUHUE website** (lịch khoảng 2 giờ/lần) để cập nhật số công khai; không có nút nào tự ghi HTML mới bằng mật khẩu.
- Trang quản trị được mở qua URL Apps Script riêng tư, không được công bố nút đăng nhập trên website công khai.
- Muốn thay mật khẩu, thao tác trong Apps Script dự án quản trị do chủ sở hữu kiểm soát. Không gửi mật khẩu cho AI.

**Các file:** AdminPortal.gs, Admin.html, README.md; chỉ cài vào dự án quản trị riêng tư.
## Nâng cấp giao diện hiện có — nhập Excel từ chính trang Quản trị

**Nếu bạn đã cài và đăng nhập được trang Quản trị:** không tạo dự án hoặc triển khai URL mới. Chỉ cập nhật đúng dự án `CDSTUHUE_ADMIN_PRIVATE` đang hoạt động:

1. Mở dự án Apps Script quản trị hiện tại. Thay toàn bộ mã trong **Mã.gs / Code.gs** bằng bản mới tại `AdminPortal.gs`; thay toàn bộ nội dung HTML trong **Admin.html** bằng bản mới tại `Admin.html`. Sao lưu cũ trước khi sửa. **Không dán file `ExcelIntake.gs` riêng**, vì mã nhập Excel đã được tích hợp trong `AdminPortal.gs` mới và các hàm nhập có hậu tố `_` để không cho gọi trực tiếp từ giao diện.
2. Vào **Project settings → Script properties** thêm `CDSTUHUE_EXCEL_INBOX_FOLDER_ID` bằng ID thư mục Drive riêng tư nhận bốn Excel. **Giữ nguyên các thuộc tính/mật khẩu băm đang có. Không chạy lại `cdsAdminBootstrap`.**
3. Chọn **Services (+) → Drive API → Add (v3)** để hỗ trợ chuyển Excel sang Google Sheets nháp, rồi Save.
4. Chọn **Deploy → Manage deployments → WEBAPP → Edit (bút chì) → New version → Deploy**. URL `/exec` hiện có không đổi. Tải lại trang, đăng nhập bằng mật khẩu đã thiết lập trước đây.
5. Cuộn xuống mục **Nhập và kiểm tra 4 Excel**: bấm **1. Kiểm tra 4 Excel**, đọc kết quả rồi bấm **2. Tạo bản nháp sau kiểm tra**. Chờ thông báo thành công. Dữ liệu đã chuẩn hóa nằm trên Google Drive riêng tư, các mã nguồn và số liệu tổng hợp ghi trong `DU_LIEU_CHO_DUYET` của STATS HUB.
6. Kiểm tra ngày nguồn ở cột F và đánh dấu **ĐÃ DUYỆT** cho đủ bốn dòng. Duyệt nháp chưa thay nguồn.
7. Ngay bên dưới, mục **3. Chuyển 4 nguồn chính thức** sẽ bật khi bốn nguồn cùng kỳ đã được duyệt và chưa chuyển. Nhập chính xác `DUYET YYYY-MM` (ví dụ `DUYET 2026-10`) rồi xác nhận lần nữa trong hộp thoại. Hệ thống kiểm tra lại tính hợp lệ của file, trạng thái, ngày kỳ, tổng 46 đơn vị/tổng thành phố, tổng ngân hàng và số chưa khai, sau đó ghi `NGUON_4_FILE`, `TONG_QUAN`, `XEP_HANG_SNAPSHOT`, bảo toàn phạm vi `DUYET_WEBSITE`. Không cần chạy hàm `cdstuhueApproveStagedBatch` trong Sheet QA nữa.
8. Khi hiện **ĐÃ CHUYỂN NGUỒN**, mở lại website hoặc bấm **Làm mới** để lấy thống kê được duyệt trực tiếp từ Web App công khai. **Không cần chạy GitHub Actions cho mỗi đợt cập nhật 4 Excel.** Trang web đang mở sẽ tự kiểm tra lại định kỳ (khoảng 3 phút). Workflow hai giờ/lần chỉ duy trì bản JSON dự phòng.
9. Kiểm tra tab `NGUON_4_FILE`: phải chứa đúng `THU_NOP, THU_NOP_CITY, CHUA_KHAI, NGAN_HANG` (không còn nguồn `PHAN_BO` trong bốn hàng active).

**Bảo mật:** toàn bộ RPC bấm nút có kiểm tra phiên mật khẩu phía máy chủ; các hàm nhập cốt lõi kết thúc bằng `_`, không mở trực tiếp cho `google.script.run`. Tệp cá nhân không xuất lên GitHub. Nếu chưa cấu hình thư mục Excel, hai nút nhập sẽ bị vô hiệu hóa.

**Ghi chú vận hành:** chỉ giữ đúng 4 file Excel của một lượt trong thư mục nhận; chuyển 4 file lượt cũ sang thư mục lưu trữ bên ngoài trước khi đưa lượt mới. Giữ kỳ báo cáo chính xác, không để chương trình tự suy ra kỳ từ ngày hệ thống.


### Cập nhật 26/10/2026 — chuyển nguồn ngay trong Quản trị
- Để **bật** tính năng mới trong Web App quản trị đang chạy, cập nhật cả **AdminPortal.gs** và **Admin.html** trong dự án `CDSTUHUE_ADMIN_PRIVATE`, nhấn **Deploy → Manage deployments → Edit → New version → Deploy**. Chỉ cập nhật GitHub là chưa đủ; URL Web App quản trị cũ giữ nguyên.
- Tính năng này kiểm tra **phiên đăng nhập quản trị trên máy chủ** và xác nhận theo kỳ, không sử dụng `SpreadsheetApp.getUi()` hay đăng một endpoint chuyển nguồn ra Web App QA công khai.
- Nếu bảng nháp chưa khớp bốn Excel còn trong thư mục nhận, hoặc dữ liệu khác đi từ khi duyệt, máy chủ từ chối; phải tạo lại bản nháp và duyệt lại. Không được sửa trực tiếp `NGUON_4_FILE` để bỏ qua bước kiểm tra.
- Không gửi tên đảng viên, mã nguồn Google Sheets riêng tư, hay số tài khoản trong phản hồi của RPC. Nhật ký chỉ ghi hành động và kỳ nguồn, không ghi dữ liệu từng người.


### Tự động xuất thống kê sau khi duyệt — kích hoạt một lần

- Website sẽ gọi Web App QA/stats công khai với `kind=stats-live`; Apps Script chỉ trả các chỉ số/tên đơn vị đã qua cổng `DUYET_WEBSITE`. Không có mật khẩu GitHub, không cần API token, không đưa dữ liệu cá nhân hay IDs nguồn vào HTML.
- **Kích hoạt một lần sau nâng cấp:** triển khai **phiên bản mới** của Web App QA công khai bằng `apps-script/Code.gs` mới (hoặc một file `apps-script/CDSTUHUE_DEPLOY_SINGLE.gs`, theo cách dự án đang cài). Không tạo deployment mới, giữ nguyên URL `/exec`. GitHub Pages sẽ tự build giao diện mới sau commit của repo.
- Từ đợt Excel tiếp theo: chỉ nhập 4 Excel vào Drive, kiểm tra, tạo nháp, duyệt, bấm **Chuyển nguồn chính thức**. Không chạy Apps Script editor hoặc GitHub Actions nữa. Nếu trực tiếp tạm lỗi, website giữ bản JSON đã duyệt gần nhất và thử lại khi mở/tải lại; GitHub Actions theo lịch vẫn đồng bộ dự phòng.
