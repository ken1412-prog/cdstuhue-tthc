# Triển khai CDSTUHUE — một file Apps Script

**Mục tiêu:** Chủ sở hữu chỉ tải bốn file Excel vào Drive, chương trình tự phân loại theo TÊN CỘT, tạo nguồn chuẩn và tổng hợp; web chỉ nhận dữ liệu đã duyệt. Không sử dụng AI tổng hợp số.

## 1. Cài vào dự án Web App đang chạy
1. Mở Google Sheet gốc **Hỗ trợ kỹ thuật CDSTUHUE** → Tiện ích mở rộng → Apps Script (dự án CDSTUHUE_WEB_PUBLIC).
2. **Sao lưu mã cũ bên ngoài dự án** trước khi đổi.
3. Mở file **apps-script/CDSTUHUE_DEPLOY_SINGLE.gs** của repo. Sao chép toàn bộ nội dung và **thay nội dung Code.gs hiện tại**.
4. Nếu dự án có file ExcelIntake.gs cũ thì **xóa file trùng khỏi dự án**. Một-file mới đã chứa đủ hai module. Không giữ bản backup ở dạng .gs trong cùng dự án để tránh khai báo trùng.
5. Trong Apps Script, vào **Services (+) → Drive API → Add**, chọn **v3**. Nhấn Save.

## 2. Ba Script Properties cần có
Trong **Project settings → Script properties**, bảo đảm có các khóa sau (dùng ID thực tế từ Google Drive):
- **CDSTUHUE_SHEET_ID**: Sheet gốc Hỗ trợ kỹ thuật CDSTUHUE.
- **CDSTUHUE_STATS_HUB_ID**: Sheet riêng tư CDSTUHUE STATS HUB 2026.
- **CDSTUHUE_EXCEL_INBOX_FOLDER_ID**: thư mục riêng tư CDSTUHUE - NHAP 4 FILE EXCEL.
**Giữ nguyên** các khóa có sẵn như CDSTUHUE_INBOX_ID và CDSTUHUE_QUESTIONS_ENABLED. Không đặt giá trị ID trong mã GitHub công khai.

## 3. Triển khai đúng URL /exec cũ
**Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy**.
Giữ cấu hình Execute as Me và quyền truy cập của Web App đang dùng; không tạo Web App thứ hai và không chia sẻ quyền công khai cho Google Sheets nguồn.
Kiểm tra URL /exec hiện có với kind=qa, kind=stats, kind=menu. Web App không có API để nhập hoặc duyệt nguồn Excel từ ngoài.

## 4. Chạy lần đầu
1. Thư mục Drive nhận đúng bốn Excel: **46 Đảng bộ; 1 tổng thành phố; chưa khai báo; ngân hàng** (không còn phân bổ).
2. Trong trình soạn Apps Script, chọn hàm **cdstuhuePreflightExcel4 → Run** để cấp quyền và kiểm tra.
3. Chọn **cdstuhueStageExcel4 → Run** để chuyển thành bốn Sheet nháp riêng tư, tự sắp cột và ghi sổ tại STATS HUB / tab DU_LIEU_CHO_DUYET.
4. Kiểm tra bốn dòng nguồn nháp. Tại **cột F** điền ngày snapshot/kỳ đúng YYYY-MM-DD (hoặc YYYY-MM). Tại **cột H** chỉ khi số đúng và có quyền công khai thì đặt **ĐÃ DUYỆT** cho cả bốn.
5. Trở lại Google Sheet QA gốc, tải lại trang và dùng menu **Xuất bản website → Duyệt và chuyển nguồn chính thức**. Gõ chính xác **DUYET YYYY-MM**, ví dụ DUYET 2026-10. Chức năng kiểm tra lại, đổi nguồn đã duyệt, cập nhật TONG_QUAN và XEP_HANG_SNAPSHOT.
6. Website tự đọc bản được duyệt qua GitHub Actions khoảng hai giờ/lần. Có thể chạy thủ công **Publish CDSTUHUE website** để cập nhật ngay.

## 5. Sau này khi có bốn Excel mới
Chuyển bốn Excel cũ ra khỏi thư mục đầu vào (giữ lịch sử riêng), đưa bốn Excel mới vào, chạy lại **Kiểm tra → Nhập bản nháp → Duyệt và chuyển nguồn**.
Có thể chạy **cdstuhueInstallIntakeWatch** một lần để tự kiểm tra/tạo bản nháp mỗi giờ nếu bộ Excel thay đổi. Bước duyệt nguồn **không tự động**, để tránh công khai dữ liệu chưa được đối chiếu.

## 6. Quy tắc linh hoạt cột
Excel được nhận diện theo tên cột, chấp nhận cột bị xóa/đảo, tên tương đương và khác hoa/thường/dấu tiếng Việt. Những cột không dùng có thể bỏ. Nếu thiếu trường **bắt buộc cho phép tính hiện có** thì báo lỗi, không đoán số.
Báo cáo thành phố không bắt buộc có ba trạng thái hồ sơ; chỉ cần tên, tổng người, số chưa hồ sơ, tiền theo hồ sơ và tiền đã nộp.
Tab chuẩn hóa CHUA_KHAI không sao chép tên cá nhân; dữ liệu thô và ID nguồn chỉ nằm trên Google Drive riêng tư.

## 7. Tháng mới và lỗi
Không tự chốt tháng. Trước khi chuyển kỳ, chốt kỳ cũ theo quy trình đã duyệt và đặt đúng KY_BAO_CAO!B2 (nếu chưa có tab thì tạm mặc định 2026-10).
Lỗi kiểm tra hoặc dữ liệu thay đổi sau duyệt: **dừng và không chuyển nguồn**. Script giữ bản cấu hình cũ trong Script Properties để đối chiếu phục hồi; không dùng AI tính hoặc sửa số.

**Mã source bảo trì:** apps-script/Code.gs + apps-script/ExcelIntake.gs. **Mã dán một lần:** apps-script/CDSTUHUE_DEPLOY_SINGLE.gs.