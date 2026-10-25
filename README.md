# CDSTUHUE PRO v3 — Website công khai, chỉnh sửa dễ dàng

**Bản bàn giao 24/10/2026.** Website HTML/CSS/JavaScript nhiều chuyên mục; giao diện chuyên nghiệp lấy cảm hứng bố cục từ website Lào Cai, không sao chép dữ liệu địa phương. **Không tích hợp, không tìm cách vượt VNeID.** Website độc lập, không phải cổng dịch vụ công chính thức.

## Có sẵn trong bản này

- **Tổng quan:** trang chủ thống kê đảng phí, truy cập nhanh 04 thủ tục, kho hỏi đáp và bản tin.
- **Đảng phí và tài khoản ngân hàng:** thẻ chỉ số, biểu đồ theo 5 nhóm đơn vị, kỳ báo cáo, thời điểm cập nhật, nguồn đối chiếu; dữ liệu thật **chỉ hiện sau khi phê duyệt**.
- **03 TTHC khác:** chuyển sinh hoạt chính thức, chuyển sinh hoạt tạm thời, lấy ý kiến nhận xét nơi cư trú. Mỗi trang là **hướng dẫn/tra cứu câu hỏi đã duyệt**. Chưa có báo cáo tiến độ toàn thành phố; không dựng biểu đồ tiến độ giả.
- **Hỏi đáp:** TTHC, Sổ tay Đảng viên, CSDL 4.0; tìm tiếng Việt không dấu, tìm mã QA, mở câu trả lời, sao chép liên kết.
- **Tài liệu, báo cáo, xuất CSV/in, trợ lý tra cứu đơn giản trong kho đã duyệt**; giao diện máy tính và điện thoại.
- **Trang theo dõi đơn vị** để mở rộng sau (mặc định chưa có số liệu).

## Xem giao diện ngay

Tải tệp `CDSTUHUE_PRO_V3_DEMO.html` đi kèm bàn giao rồi nhấp đúp mở bằng Edge. Demo dùng **hoàn toàn dữ liệu giả lập**, có nhãn rõ ràng. Không có dữ liệu VNeID hoặc nội dung QA nội bộ trong tệp demo.

Để chạy mã nguồn thật trên máy:

```bash
cd site
python -m http.server 8000
```

Mở `http://localhost:8000/` (bản công khai mặc định rỗng) hoặc `http://localhost:8000/?demo=1` (bản minh họa).

## Cấu trúc gói

```text
site/
  index.html, hoi-dap.html
  assets/styles.css, assets/app.js
  data/approved.json, data/finance.json, data/progress.json
apps-script/Code.gs
scripts/sync_public.py
.github/workflows/deploy.yml
tests/test_site.py
README.md
```

## Kết nối Google Sheet (cần thực hiện một lần, có quyền chủ sở hữu)

Google Sheet gốc **Hỗ trợ kỹ thuật CDSTUHUE**, ID chỉ nằm trong cấu hình Apps Script, không xuất ra web.

- Ba tab `QA TTHC`, `QA STDV`, `QA CSDL 4.0` là nội dung nguồn.
- `WEB_PUBLISH` gồm 223 mã QA chờ duyệt, D=`ĐÃ DUYỆT`/`CHỜ DUYỆT`/`TẠM ẨN`. QA không tự công khai chỉ bằng thay dropdown: phải kiểm tra nội dung và xác nhận duyệt trong menu **Xuất bản website**. Công cụ lưu dấu vân tay K; đổi nội dung sau duyệt sẽ chặn xuất bản đến lần xác nhận tiếp theo.
- `WEB_FINANCE_PUBLIC` là tab **mới** lưu số liệu đảng phí *chỉ sau khi bạn kiểm tra và quyết định công khai*. Không chứa/sao chép dữ liệu chi tiết từ VNeID. Chỉ một bản snapshot (kỳ, ngày, nguồn) hợp lệ được xuất ra website mỗi lần cập nhật.

### Cách nhập WEB_FINANCE_PUBLIC

| Cột | Nội dung |
|---|---|
| A | Kỳ báo cáo dạng `YYYY-MM`, ví dụ `2026-10` |
| B | Ngày đối chiếu dạng `YYYY-MM-DD`, ví dụ `2026-10-24` |
| C | Tên nguồn **đã được phép công khai**, bắt buộc |
| D | Số hồ sơ trong báo cáo (nếu có) |
| E | Số chưa khai báo (nếu có) |
| F | Số chờ phê duyệt (nếu có) |
| G | Số chờ nộp (nếu có) |
| H:L | Số tài khoản theo 5 nhóm: Đảng bộ trực thuộc Trung ương, Đảng bộ cơ sở, Đảng bộ trực thuộc cơ sở, Đảng bộ bộ phận, Chi bộ; để trống nếu chưa xác minh chỉ tiêu |
| M | Ghi chú công khai, lưu ý phạm vi báo cáo hoặc định nghĩa chỉ tiêu |
| N | Trạng thái `CHỜ DUYỆT`, `ĐÃ DUYỆT`, `TẠM ẨN` |
| O:P | Ngày duyệt và mã xác nhận phiên bản **script tự điền, không sửa** |

Lưu ý: **Không suy ra hoặc ghép các con số từ hai Dashboard có phạm vi/đơn vị khác nhau**. Không nhập số tài khoản ngân hàng, CCCD, số điện thoại, tên người hay mã hồ sơ vào bảng công khai. Có thể chỉ công bố một vài chỉ tiêu; các ô chưa có số liệu để trống và website hiện dấu `—`, không hiện `0` giả.

#### Cài Apps Script

1. Vào Sheet nguồn → `Tiện ích mở rộng → Apps Script`.
2. Dán **toàn bộ** `apps-script/Code.gs`. Vào `Project Settings → Script Properties` đặt `CDSTUHUE_SHEET_ID` bằng ID Sheet nguồn; không đưa ID này vào repo/web nếu không cần.
3. Lưu, cấp quyền theo cơ chế của Google rồi tải lại Sheet. Menu **Xuất bản website** xuất hiện.
4. Để công khai một QA: rà soát, thay D thành `ĐÃ DUYỆT`, chọn dòng, chọn **Xác nhận duyệt những dòng đang chọn**.
5. Để công khai tài chính: nhập A:M ở `WEB_FINANCE_PUBLIC`, điền N=`ĐÃ DUYỆT`, chọn dòng, chọn **Xác nhận duyệt thống kê đảng phí (dòng chọn)** và xác nhận. Script ghi O:P. Không có dòng đủ duyệt thì `finance.json` sẽ rỗng/không công khai.
6. `Deploy → New deployment → Web app`: `Execute as Me`, `Who has access: Anyone` **chỉ sau khi tự kiểm tra mã nguồn** để biết endpoint sẽ công khai chính xác những gì. Lấy URL `/exec`. Endpoint có `?kind=qa` và `?kind=finance`; không có API bí mật của VNeID trong web app.

#### GitHub Pages miễn phí

1. Tạo repository GitHub mới, **Public**. Tải **toàn bộ nội dung gói nguồn** lên nhánh `main` (giữ `.github/workflows/deploy.yml` và thư mục `site/`). Không tải file Excel quản trị hay JSON nội bộ.
2. `Settings → Pages → Build and deployment → Source: GitHub Actions`.
3. `Settings → Secrets and variables → Actions → New repository secret`: `QA_PUBLIC_ENDPOINT` = URL Apps Script `/exec` đã triển khai.
4. `Actions → Publish CDSTUHUE website → Run workflow` để triển khai. Workflow kiểm tra và cập nhật **QA lẫn finance** khoảng hai giờ/lần. Website chỉ thay đổi dữ liệu khi chạy workflow thành công; lịch có thể trễ. Bấm `Tải mới` trên website chỉ tải lại bản đã xuất bản, **không** tự gọi cổng quản trị hoặc Sheets nội bộ.
5. Nếu chưa cài Apps Script/secret, website vẫn có giao diện công khai với các mục trống và chế độ minh họa `?demo=1`.

Khi sửa mã Apps Script, cập nhật deployment của Google, không chỉ lưu code trong editor.

## Quy tắc công khai và tính chính xác

- **Không** truy vấn hoặc lưu cookie/OTP/Token VNeID, không nhúng tài khoản cấp tỉnh, không vượt phân quyền từng vai trò cấp dưới.
- `WEB_FINANCE_PUBLIC` **không tự động kéo dữ liệu từ gqtthc.dcs.vn**. Phần lấy dữ liệu từ hệ thống đảng phí vẫn là bước cần thực hiện riêng về sau.
- Dù dữ liệu có ở Google Sheet nội bộ, nếu chưa duyệt, website chỉ hiển thị chỗ trống hoặc bản demo rõ nhãn. Trong `site/data` mặc định không có số liệu thật và không có nội dung QA nội bộ.
- Số liệu tài chính chỉ so sánh cùng chỉ tiêu, cùng phạm vi, cùng kỳ và cùng thời gian quan sát. Không cộng các chỉ tiêu chưa xác định và không giả định các con số khác nhau phải bằng nhau.
- Đổi trạng thái sang `TẠM ẨN` thì nội dung ngừng xuất bản trong lần đồng bộ kế tiếp, nhưng **các bản cache hoặc lịch sử GitHub Actions/Git của người khác có thể vẫn giữ dữ liệu đã từng công khai**.
- Mã nguồn gói không tự động lập GitHub repository hay deploy Apps Script. Việc xuất bản cần hành động trong tài khoản sở hữu GitHub/Google của bạn.

## Kiểm thử

```bash
node --check site/assets/app.js
python -m unittest discover -s tests -v
```

Trong Edge, kiểm tra trang Tổng quan, Thống kê đảng phí, ba chuyên mục hướng dẫn, Hỏi đáp, tìm kiếm không dấu và chế độ điện thoại. Đầu tiên hãy thử duyệt **một câu QA đã rà soát không nhạy cảm**, sau đó thử một bản tài chính tổng hợp đã xác minh và được phép công khai. Khi chưa có sự đồng ý xuất bản, không duyệt dữ liệu chỉ để lấp bảng trống.


## Hộp nhận câu hỏi riêng tư từ website (mới)

Đã tạo một Google Sheet riêng tư chỉ chủ sở hữu truy cập, tên **CDSTUHUE – Hộp tiếp nhận câu hỏi riêng tư**, tab `INBOX_QUESTIONS`. Không chia sẻ quyền xem/chỉnh sửa Sheet này cho người gửi.

Mã `apps-script/Code.gs` bổ sung `doPost` để nhận câu hỏi trong ba nhóm TTHC / STDV / CSDL 4.0, lưu riêng câu hỏi cùng mã nhận, thời gian và trạng thái MỚI. Có giới hạn độ dài, honeypot, kiểm tra thông tin cá nhân theo mẫu, ngăn lặp gần thời điểm gửi và giới hạn 30 câu/giờ, 150 câu/ngày (toàn hệ thống). Những biện pháp này giảm spam nhưng không thể chặn mọi spam hay thông tin nhạy cảm.

**Để kích hoạt an toàn (chủ sở hữu thực hiện):**

1. Mở Apps Script **CDSTUHUE_WEB_PUBLIC** đã liên kết với Sheet QA gốc. Thay nội dung dự án bằng bản `apps-script/Code.gs` MỚI trong repo (mã cũ không có `doPost`).
2. Giữ thuộc tính `CDSTUHUE_SHEET_ID` như trước. Thêm `CDSTUHUE_INBOX_ID` = ID Sheet hộp thư riêng đã tạo (tra trong URL Sheet inbox); thêm `CDSTUHUE_QUESTIONS_ENABLED` = `true`.
3. Trong Apps Script: **Deploy → Manage deployments → Edit → Version: New version → Deploy**. Thử `URL/exec?kind=intake-status`: mong đợi JSON `acceptsQuestions:true` khi đã cấu hình.
4. Chỉ khi chạy thử tiếp nhận thành công vào `INBOX_QUESTIONS`, cập nhật `site/data/questions-config.json` tại GitHub: `{"schema":1,"enabled":true,"endpoint":"https://script.google.com/macros/s/.../exec"}`. Dùng chính URL web-app đang chạy, không đưa khóa, token hoặc ID Sheet nội bộ vào file này. Website sẽ tự triển khai khi commit.
5. Vào website, bấm Trợ lý tra cứu nhanh → Đặt câu hỏi mới, thử gửi một câu hỏi giả không có thông tin cá nhân; xác nhận có mã tiếp nhận và dòng mới trong hộp thư. Nếu có lỗi, đặt `enabled:false` trong JSON để tắt nút Gửi. Bản hỏi–đáp đã duyệt vẫn tra cứu bình thường.

**Lưu ý:** Không đặt URL Google Sheet gốc làm endpoint. Đường dẫn Apps Script web app là công khai, nhưng mã chỉ cấp quyền ghi câu hỏi hợp lệ vào Sheet hộp thư riêng, không trả về danh sách câu hỏi hay mở quyền của Sheet. Chống spam bản này chỉ ở mức cơ bản; nếu lượng người dùng lớn, nên dùng dịch vụ có xác thực, CAPTCHA và giới hạn truy cập ngoài.


## Báo cáo đảng phí: bốn nguồn dữ liệu và bảng xếp hạng (24/10/2026)

Đã nhập bốn tệp nguồn thành **bốn Google Sheets riêng tư**. Tất cả dữ liệu cá nhân, thông tin người xác nhận, CCCD, số tài khoản ngân hàng đều ở các Sheet nguồn và KHÔNG xuất lên GitHub Pages. Có thêm một Sheet riêng tư `CDSTUHUE STATS HUB 2026` với tab `TONG_QUAN`, `NGUON_4_FILE`, `DUYET_WEBSITE`, `XEP_HANG_SNAPSHOT`.

Bảng điều hành công khai chỉ được phép thể hiện tỷ lệ thu nộp (%) và thứ hạng đơn vị khi đã duyệt. Tổng tiền, tiền phải nộp, tiền đã nộp và số tiền theo từng đơn vị chỉ giữ tại Google Sheets riêng tư. Các phạm vi không tương đương. Đặc biệt chỉ tiêu chưa có hồ sơ trong báo cáo 46 đơn vị là 14.964 — không được tự đồng nhất với 15.901 dòng trong danh sách khác.

Cài bản `apps-script/Code.gs` mới vào dự án Apps Script CDSTUHUE_WEB_PUBLIC và thêm Script property `CDSTUHUE_STATS_HUB_ID` có giá trị là **ID Sheet STATS HUB riêng tư**. Sau đó chọn Deploy → Manage deployments → Edit → New version → Deploy; giữ nguyên web app /exec đang dùng. Trước khi mở công khai: chủ sở hữu kiểm tra từng nhóm trong `DUYET_WEBSITE`, chỉ đổi sang `ĐÃ DUYỆT` và điền ngày xác nhận YYYY-MM-DD khi có quyền công bố. Khi chưa được duyệt, endpoint `?kind=stats` trả `public:false` và website không hiển thị thống kê.

Mỗi 2 giờ, workflow hiện hành gọi /exec?kind=stats và lưu `site/data/stats.json`. Tab nguồn trong `NGUON_4_FILE` chứa 4 Google Sheet IDs riêng tư, tuyệt đối không đưa tab này hoặc bất kỳ nguồn thô nào lên repository.

Phân hệ thu nộp có bảng xếp hạng chỉ xuất phần trăm, thứ hạng và tên đơn vị; chỉ xét các đơn vị với tối thiểu 100 đảng viên ở cùng báo cáo 46 đơn vị. Không suy diễn xếp hạng là hiệu quả công tác chung; không ghép số liệu từ các nguồn khác nhau. Khi sửa 4 Sheet nguồn, lần đồng bộ *sau khi nguồn được duyệt để công khai* sẽ tính lại tổng hợp và xếp hạng. Nếu cập nhật sang kỳ khác, cần chỉnh kỳ hiển thị và phê duyệt lại phạm vi báo cáo trước khi xuất.

**Phạm vi xuất bản thống kê:** Người quản trị được phép duyệt và công bố cả năm phân hệ (tỷ lệ thu nộp; xếp hạng đơn vị; số dòng chưa khai báo và tỷ trọng theo đơn vị cha; trạng thái/tỷ lệ xác nhận phân bổ; trạng thái/tỷ lệ đăng ký tài khoản ngân hàng). Không công bố bất kỳ số tiền, số tài khoản ngân hàng, tên cá nhân, mã định danh, dữ liệu hồ sơ từng người hoặc bảng nguồn thô nào. Tỷ trọng trong danh sách chưa khai báo không phải tỷ lệ trên tổng đảng viên vì khác mẫu số. Bộ lọc scripts/sync_public.py có danh sách trường được phép cho từng phân hệ.


## Quản trị ẨN/HIỆN toàn bộ danh mục

Quản trị viên điều khiển **15 mục** trong tab `QUAN_TRI_DANH_MUC` của Google Sheet riêng tư `CDSTUHUE STATS HUB 2026`: Tổng quan, Thống kê, Tiến độ, 4 thủ tục, Tất cả QA, 3 nhóm QA, Tài liệu, Báo cáo, Hướng dẫn và Trợ lý tra cứu nhanh. Cột C chỉ nhận `HIỆN` hoặc `ẨN`; người có tài khoản Google chủ sở hữu mới được chỉnh sửa.

Không đặt mật khẩu trong HTML/JavaScript công khai. Các trạng thái được đọc bởi `apps-script/Code.gs` qua `/exec?kind=menu`, rồi `scripts/sync_public.py` chỉ xuất 15 cờ boolean vào `site/data/menu.json`. Website áp dụng cùng chính sách cho menu bên, các thẻ Tổng quan, liên kết nội bộ trên các trang khác, bộ lọc QA, Trợ lý và đường dẫn `?view=...` nhập trực tiếp. Mục bị ẩn sẽ không có đường dẫn mở trên giao diện; nếu nhập URL cũ, người xem bị chuyển sang danh mục đầu tiên còn hiển thị hoặc trang thông báo trống khi tất cả đều tắt.

**Cách bật tự động:** cập nhật bản mới nhất `apps-script/Code.gs` vào dự án `CDSTUHUE_WEB_PUBLIC`, giữ thuộc tính `CDSTUHUE_STATS_HUB_ID`, sau đó Deploy → Manage deployments → Edit → New version → Deploy. Kiểm tra `/exec?kind=menu` thấy đủ 15 cờ. Sau đó chỉ cần đổi trạng thái ở cột C và chờ lịch GitHub Actions hai giờ/lần hoặc chạy thủ công `Publish CDSTUHUE website → Run workflow` để áp dụng. Dữ liệu tổng hợp và nguồn gốc vẫn do các quy tắc duyệt công khai riêng điều khiển.

**Giới hạn kỹ thuật:** GitHub Pages là website tĩnh; ẨN danh mục không phải phân quyền truy cập bí mật. Người có URL thẳng tới JSON hoặc đã lưu bản công khai từ trước vẫn có thể truy cập bản dữ liệu đó. Với dữ liệu mật, cần một hệ thống xác thực phía máy chủ và ngừng xuất dữ liệu bí mật ngay từ nguồn.


## Thu nộp đảng phí theo tháng — bản sáng Huế, tháng 10/2026 trở đi

### 1. Những gì hiển thị trên CDSTUHUE

- **Tổng quan điều hành**: giữ Top 03 Đảng bộ dẫn đầu của kỳ công khai mới nhất và 3 chỉ số tổng hợp. Không thêm lại bảng Top 3 trùng lặp vào trang chi tiết.
- **Thống kê đảng phí**: có bộ **Chọn tháng** (ví dụ Tháng 10/2026, Tháng 11/2026), nhãn **Mới nhất** hoặc **Đã chốt**, bảng 46 Đảng bộ được duyệt, tỷ lệ thu trong kỳ, tình trạng hoàn thành, số tài khoản ngân hàng/hồ sơ **chỉ khi các trường tổng hợp ấy được duyệt riêng**, cửa sổ chi tiết từng đơn vị.
- Có tìm kiếm tên Đảng bộ không dấu, lọc **tất cả / hoàn thành 100% / đang triển khai**, sắp xếp thứ hạng, tỷ lệ thấp trước hoặc theo tên; tải CSV từ các hàng đang lọc. Trường hợp không có mẫu số/không duyệt, hiện dấu **—**, không tự tạo tỷ lệ.
- Giao diện dùng tông **trắng kem–đỏ–vàng** như bảng điều hành nội bộ, sử dụng ảnh Huế đã nằm sẵn trong site. Không kết nối nguồn hình ảnh bên ngoài.

### 2. Khóa tháng 10 chỉ sau 31/10/2026

GitHub Actions `Freeze approved payment month` chạy từ **00:15 sáng giờ Việt Nam, ngày 01–07 mỗi tháng** để tự thử đóng kỳ trước. Khi nhận được `stats.json` **đã công khai, đã duyệt, có đúng kỳ tháng trước và đủ 46 Đảng bộ**, mã `scripts/freeze_payment_month.py` sẽ lưu lần đầu thành:
- `site/data/payment-history/2026-10.json` (hoặc kỳ tương ứng);
- `site/data/payment-history.json` (chỉ mục các tháng đã chốt).

Bản đã chốt **bất biến**: chương trình không ghi đè dù Google Sheets kỳ sau thay đổi. Chỉ sao lưu các trường **tỷ lệ tổng hợp, tên và hạng tổ chức, TK NH x/y và tỷ lệ hồ sơ nếu từng trường đã duyệt**, không lấy bảng nguồn, tiền, tài khoản cá nhân, căn cước, tên đảng viên. Nếu nguồn chưa có 46 đơn vị, sai tháng hoặc chưa duyệt, **không lưu bản giả**. Chủ sở hữu có thể mở GitHub → Actions → `Freeze approved payment month` → `Run workflow` để thử đóng lại trong 7 ngày đầu tháng. Không đổi dữ liệu sang tháng 11 **trước khi tháng 10 đã chốt**.

Ngày **25/10/2026 vẫn là tháng 10 đang chạy**; không công bố bản lịch sử tháng 10 trước khi tháng kết thúc. Nếu lịch chạy bị lỗi/cấu hình token repo ngăn commit, phải kiểm tra Actions và chạy lại; không mặc định tuyên bố đã chốt.

### 3. Cập nhật Google Sheets cho tháng 11

Mẫu dữ liệu nguồn thực tế là **46 Đảng bộ** trong Sheet riêng tư của nhóm `THU_NOP` (14 cột), không lấy tỷ lệ từ Lào Cai. Để chuyển sang kỳ mới:

1. **Sau khi đã khóa tháng 10**, sao chép tab dữ liệu nguồn thu nộp đã duyệt thành tab mới, ví dụ `Thang11`, **xóa dữ liệu tháng 10 và nhập báo cáo thực tế tháng 11**. Không xóa tab cũ, không tải lên website dữ liệu nhạy cảm.
2. Trong Google Sheet riêng tư **CDSTUHUE STATS HUB 2026**, tại tab `NGUON_4_FILE`, đổi trường *tên tab* hàng `THU_NOP` (cột D) sang tab tháng 11, đồng thời cập nhật *ngày snapshot* ở cột F sang ngày tháng 11. Các Sheet còn lại không được coi mặc nhiên là số liệu tháng 11.
3. Tạo tab `KY_BAO_CAO` trong STATS HUB; ô **B2** nhập chính xác `2026-11` (ô A2 có thể ghi `Kỳ thu nộp`). Tháng 10 dùng `2026-10`. Nếu tab này chưa có, phiên bản Apps Script mới vẫn tạm giữ mặc định `2026-10` để không làm thay đổi bản hiện tại.
4. Đối chiếu tổng thu, 46 tên đơn vị và tỷ lệ; tại tab `DUYET_WEBSITE`, duyệt lại phạm vi `TỔNG HỢP THU NỘP` và `XẾP HẠNG 46 ĐƠN VỊ`, ngày duyệt thuộc **tháng 11 hoặc muộn hơn**, trước khi cho phép xuất bản. Tính năng xuất công khai sẽ **từ chối tháng 11** nếu chưa có ngày duyệt hợp lệ hoặc ngày snapshot THU_NOP không thuộc kỳ đã chọn.
5. **Cài/cập nhật một lần** bản `apps-script/Code.gs` mới vào dự án Web App đang vận hành, giữ nguyên các Script Properties và Web App URL, chọn **Deploy → Manage deployments → Edit → New version → Deploy**. Đây là bước cần thực hiện phía chủ sở hữu; sửa mã trên GitHub **không tự cập nhật bản Apps Script đã triển khai**.
6. Kiểm tra endpoint đã triển khai `/exec?kind=stats` trả `period:"2026-11"`, `public:true`, `reviewed:true`, đúng 46 bản xếp hạng; tiếp đó chạy `Publish CDSTUHUE website` để cập nhật dữ liệu công khai. Tháng 10 sẽ nằm trong bộ chọn dưới nhãn **Đã chốt**, tháng 11 có nhãn **Kỳ mới nhất**.

**Không có lũy kế tỷ lệ tự cộng** vì tỷ lệ các tháng không thể cộng trực tiếp, và website không có số tiền/số hồ sơ gốc được phép công bố. Nếu cần chỉ tiêu lũy kế, phải có bảng lũy kế tổng hợp và phê duyệt riêng; không giả lập kết quả.

**Lưu ý về dữ liệu nhiều nguồn:** các mô-đun ngân hàng, chưa khai báo và phân bổ không mặc định cùng kỳ với thu đảng phí. Khi xem **tháng đã chốt**, website chỉ hiển thị phần thu nộp và xếp hạng tương ứng; không ghép chỉ tiêu từ các kỳ khác. Không truy cập Google Sheets trực tiếp từ trình duyệt người xem.
