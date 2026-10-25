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

### 2. Chỉ CHỐT khi chủ sở hữu yêu cầu — không có lịch tự động

Tháng 10/2026 **vẫn là dữ liệu đang cập nhật**, kể cả khi qua ngày 31/10 hoặc sang tháng 11, cho đến khi chủ sở hữu yêu cầu riêng: **"Chốt/lưu tháng 10 và chuyển sang tháng 11"**.

Workflow `Freeze approved payment month` **chỉ có** `workflow_dispatch`, không còn `schedule`/cron. Khi có lệnh chính thức, quản trị viên nhập `period=2026-10` và `confirmation=CHOT 2026-10`; chương trình đối chiếu đã qua tháng 10, nguồn JSON đúng kỳ, đã duyệt, có đủ 46 Đảng bộ. Nếu chưa đạt, không ghi file và không chuyển kỳ. Khi thành công, lưu:
- `site/data/payment-history/2026-10.json` (bản đã chốt, không ghi đè bằng chương trình).
- `site/data/payment-history.json` (danh sách kỳ có bản lưu).

Bản chỉ chứa **trường công khai đã duyệt**: tỷ lệ, tên và thứ hạng Đảng bộ, x/y số tổ chức có TK ngân hàng và x/y hồ sơ khai báo nếu đã duyệt công khai từng chỉ tiêu. Không chứa số tiền, số tài khoản, CCCD, tên cá nhân hoặc dữ liệu riêng tư. Cần chốt kỳ cũ **trước** khi thay nguồn sang kỳ mới; không tự khóa hoặc đổi `KY_BAO_CAO`.

### 3. Cập nhật Google Sheets cho tháng 11

Mẫu dữ liệu nguồn thực tế là **46 Đảng bộ** trong Sheet riêng tư của nhóm `THU_NOP` (14 cột), không lấy tỷ lệ từ Lào Cai. Để chuyển sang kỳ mới:

1. **Chỉ sau khi bạn ra lệnh chốt và đã lưu thành công tháng 10**, sao chép tab nguồn thành tab mới, ví dụ `Thang11`, **làm trống phần dữ liệu mẫu trên tab tháng 11 mới rồi nhập báo cáo thực tế tháng 11**. Không xóa tab cũ, không tải lên website dữ liệu nhạy cảm.
2. Trong Google Sheet riêng tư **CDSTUHUE STATS HUB 2026**, tại tab `NGUON_4_FILE`, đổi trường *tên tab* hàng `THU_NOP` (cột D) sang tab tháng 11, đồng thời cập nhật *ngày snapshot* ở cột F sang ngày tháng 11. Các Sheet còn lại không được coi mặc nhiên là số liệu tháng 11.
3. Tạo tab `KY_BAO_CAO` trong STATS HUB; ô **B2** nhập chính xác `2026-11` (ô A2 có thể ghi `Kỳ thu nộp`). Tháng 10 dùng `2026-10`. Nếu tab này chưa có, phiên bản Apps Script mới vẫn tạm giữ mặc định `2026-10` để không làm thay đổi bản hiện tại.
4. Đối chiếu tổng thu, 46 tên đơn vị và tỷ lệ; tại tab `DUYET_WEBSITE`, duyệt lại phạm vi `TỔNG HỢP THU NỘP` và `XẾP HẠNG 46 ĐƠN VỊ`, ngày duyệt thuộc **tháng 11 hoặc muộn hơn**, trước khi cho phép xuất bản. Tính năng xuất công khai sẽ **từ chối tháng 11** nếu chưa có ngày duyệt hợp lệ hoặc ngày snapshot THU_NOP không thuộc kỳ đã chọn.
5. **Cài/cập nhật một lần** bản `apps-script/Code.gs` mới vào dự án Web App đang vận hành, giữ nguyên các Script Properties và Web App URL, chọn **Deploy → Manage deployments → Edit → New version → Deploy**. Đây là bước cần thực hiện phía chủ sở hữu; sửa mã trên GitHub **không tự cập nhật bản Apps Script đã triển khai**.
6. Kiểm tra endpoint đã triển khai `/exec?kind=stats` trả `period:"2026-11"`, `public:true`, `reviewed:true`, đúng 46 bản xếp hạng; tiếp đó chạy `Publish CDSTUHUE website` để cập nhật dữ liệu công khai. Tháng 10 sẽ nằm trong bộ chọn dưới nhãn **Đã chốt**, tháng 11 có nhãn **Kỳ mới nhất**.

**Không có lũy kế tỷ lệ tự cộng** vì tỷ lệ các tháng không thể cộng trực tiếp, và website không có số tiền/số hồ sơ gốc được phép công bố. Nếu cần chỉ tiêu lũy kế, phải có bảng lũy kế tổng hợp và phê duyệt riêng; không giả lập kết quả.

**Lưu ý về dữ liệu nhiều nguồn:** các mô-đun ngân hàng, chưa khai báo và phân bổ không mặc định cùng kỳ với thu đảng phí. Khi xem **tháng đã chốt**, website chỉ hiển thị phần thu nộp và xếp hạng tương ứng; không ghép chỉ tiêu từ các kỳ khác. Không truy cập Google Sheets trực tiếp từ trình duyệt người xem.


### 4. Vì sao TK NH và HS khai báo theo từng Đảng bộ từng hiển thị “—”?

Ngày 25/10/2026 đã kiểm tra `DUYET_WEBSITE`: hàng **XẾP HẠNG 46 ĐƠN VỊ** hiện chỉ duyệt *tên, thứ hạng, tỷ lệ thu*; hàng **TÀI KHOẢN NGÂN HÀNG** chỉ duyệt *số lượng/tỷ lệ tổng hợp toàn nguồn*. Do đó mã Apps Script **không xuất x/y từng Đảng bộ**, mặc dù nguồn đã có. Đây là kiểm soát công khai, không phải thiếu bản ghi.

Nguồn `THU_NOP` có 46 Đảng bộ, tổng số đảng viên ở **C**, số hồ sơ đã khai báo = **H + I + J**, số chưa có hồ sơ = **K**. Công thức được chỉnh thành **(H + I + J) / C**, không dùng `(H+I+J)/(H+I+J+K)` vì không cùng mẫu số và có thể sai lệch. Kết quả được kiểm tra đúng điều kiện `0 <= khai_báo <= tổng_ĐV`; sai lệch thì để `—`, không bịa số.

Nguồn ngân hàng có trạng thái **đã có/chưa có** và quan hệ mã đơn vị; tổng hợp `bankDone/bankTotal` theo 46 Đảng bộ cấp 2, loại phần không xác định quan hệ. Đây là **số tổ chức có tài khoản / tổng tổ chức có bản ghi hợp lệ**, không phải số tài khoản ngân hàng cá nhân.

Phải có **quyết định phê duyệt công khai riêng** trước khi hiện chi tiết x/y trên website. Khi chủ sở hữu đồng ý rõ ràng, đặt trong cột E của `DUYET_WEBSITE`:
- Hàng **TÀI KHOẢN NGÂN HÀNG**: thêm `BANK_XY_BY_LEVEL2` để cho phép số tổ chức có TK NH / tổng tổ chức theo 46 Đảng bộ.
- Hàng **XẾP HẠNG 46 ĐƠN VỊ**: thêm `HS_FILED_XY_BY_LEVEL2` để cho phép số hồ sơ đã khai báo / tổng ĐV theo 46 Đảng bộ; nếu muốn duyệt riêng tỷ lệ mà chưa duyệt x/y, dùng `HS_DECLARED_RATE`.

Không tự sửa cột E/phạm vi duyệt chỉ vì đã đọc được nguồn. Sau khi phạm vi được chủ sở hữu duyệt, triển khai phiên bản `apps-script/Code.gs` đã cập nhật vào web app thực tế, rồi chạy workflow xuất dữ liệu được duyệt. `scripts/sync_public.py` kiểm tra thêm cờ `approvedExtraFields` và điều kiện tử/mẫu để không xuất quá quyền. Trên website, dấu `—` nghĩa là chưa được duyệt công khai hoặc chưa đối chiếu đầy đủ, **không phải 0**.


## Phạm vi thống kê 46 Đảng bộ: trừ 108 đơn vị CA/QS (25/10/2026)

Theo chỉ đạo chủ sở hữu, **không tính 108 đơn vị thuộc nhánh Quân sự/Biên phòng (107) và Công an (1)** bị đứt chuỗi cấp 2; **không tính dòng Đảng bộ Thành phố Huế A57 vì đây là cấp gốc**. Cả 109 dòng đều không phải “thiếu thông tin” để cộng đoán vào 46 Đảng bộ. Không xóa hay sửa dữ liệu Google Sheets nguồn.

- Mã nhánh loại: `A57.12.*`, `A57.13.*` (Quân sự/Biên phòng) và **chính xác** `A57.121.39.*` (Công an phường Thủy Xuân). Regex dùng dấu chấm/điểm kết thúc có ranh giới: **không loại** các mã khác thuộc `A57.121` hay `A57.120`.
- Mẫu số **TK NH** chỉ chứa tổ chức có trạng thái hợp lệ thuộc 46 Đảng bộ sau khi bỏ 108 CA/QS và A57 cấp gốc. Theo kiểm tra nguồn tại thời điểm này, x/y = **1.996/2.767** (771 chưa có); 108 CA/QS đều ở trạng thái “chưa có”, còn A57 gốc “đã có”. Nếu dữ liệu Sheets thay đổi, tỷ lệ tính lại trên dữ liệu mới.
- **Danh sách chưa khai báo hồ sơ**: chỉ đọc **cột B (tên đơn vị) và D (tên cấp cha)**, tuyệt đối không đọc cột C (tên người). Loại các dòng có cặp tên đơn vị/cấp cha khớp duy nhất với nhánh CA/QS, hoặc cha khớp một tổ chức trong nhánh CA/QS và **không** trùng tên tổ chức ở nhánh được tính. Không loại một “Chi bộ 1”, “Chi bộ Văn phòng” chỉ vì tên giống nhau. Kiểm tra 25/10 phát hiện **928 dòng** loại chắc chắn, số dòng giữ để thống kê là **14.973** so với 15.901 dòng nguồn. Xếp hạng 46 Đảng bộ được tính lại trên số dòng **sau loại**, không tự gán các bản ghi còn chưa đối chiếu.
- Công khai chỉ các số đếm/tỷ lệ thống kê đã được duyệt. Không xuất danh tính đảng viên, mã định danh cá nhân, chủ tài khoản hoặc số tài khoản.
- Nếu phiên bản **Apps Script Web App** đang chạy chưa được cập nhật từ `apps-script/Code.gs`, GitHub Actions **không thể tự điều chỉnh dữ liệu gốc trên endpoint**: cần Deploy → Manage deployments → Edit → New version → Deploy của chủ sở hữu trước khi số liệu cập nhật ở website. Không tự chỉnh trạng thái/phạm vi `DUYET_WEBSITE`.


### Cập nhật nguồn dữ liệu tháng 10 — 25/10/2026

- Đã cập nhật **các Google Sheets nguồn riêng tư tại cùng ID**: thu nộp 46 đơn vị, danh sách chưa khai báo và trạng thái đăng ký tài khoản ngân hàng. Bảng xác nhận phân bổ không đổi vì chưa có nguồn mới.
- **Tháng 10/2026 vẫn đang mở**, không tạo snapshot chốt kỳ hoặc chuyển tháng. Giữ nguyên cổng phê duyệt dữ liệu và quy tắc loại thông tin cá nhân khỏi JSON công khai.
- Thay đổi định dạng Excel được chuẩn hóa về các cột mà Apps Script hiện tại đọc: danh sách chưa khai báo giữ tên đơn vị ở B và đơn vị cha ở D; trạng thái tài khoản ngân hàng ở H. Mã đơn vị nguồn mới được giữ ở F, chỉ trong Sheet riêng tư.
- Trang web đồng bộ lại dữ liệu tổng hợp thông qua workflow GitHub Pages; nếu Apps Script Web App production chưa được triển khai theo mã mới nhất, cần kiểm tra endpoint trước khi xác nhận số liệu công khai.


## Tiếp nhận 4 Excel tự động — Bước 1 (DRY RUN, chưa cập nhật số)

Đã chuẩn bị bộ kiểm tra 4 file tại apps-script/ExcelIntake.gs. Khi được cài trong Apps Script quản trị riêng, chương trình nhận diện file qua tiêu đề cột; không dựa vào tên file, không dùng AI.

**Cách sử dụng:** tải đúng 4 file Excel (.xlsx hoặc .xls) cùng một lượt vào thư mục Google Drive riêng tư CDSTUHUE - NHAP 4 FILE EXCEL. Trong dự án Apps Script của chủ sở hữu, thêm file GS theo nội dung ExcelIntake.gs, bật Services / Drive API v3; thêm Script Property CDSTUHUE_EXCEL_INBOX_FOLDER_ID là ID thư mục Google Drive này. Chạy cdstuhuePreflightExcel4 thủ công. Nếu kết quả mode=DRY_RUN_ONLY, valid=true và đủ THU_NOP, CHUA_KHAI, PHAN_BO, NGAN_HANG thì cấu trúc đầu vào đạt kiểm tra ban đầu.

Quan trọng: bước 1 KHÔNG tự ghi/đổi Google Sheets nguồn, không thay TONG_QUAN, DUYET_WEBSITE hoặc website. Chương trình tạm chuyển đổi Excel thành Sheet riêng tư để đối chiếu, sau đó đưa bản tạm vào Thùng rác; không công bố dữ liệu cá nhân. Chỉ sang bước 2 (nạp dữ liệu có sao lưu và đối chiếu) sau khi thử thành công với 4 file.

## Cập nhật 25/10/2026: bốn file mới, bỏ xác nhận phân bổ

Nguồn Excel đầu vào chính thức từ nay là: THU_NOP (46 Đảng bộ), THU_NOP_CITY (1 dòng tổng thành phố), CHUA_KHAI (danh sách chưa khai báo), NGAN_HANG (tài khoản ngân hàng). PHAN_BO ngừng dùng trong quy trình mới; bộ xuất bản trên GitHub sẽ bỏ trường allocation dù endpoint cũ còn trả về. Không xóa dữ liệu phân bổ lịch sử trong Google Drive.

Kiểm tra chỉ đọc bằng apps-script/ExcelIntake.gs. Đầu vào CHUA_KHAI hỗ trợ bản Excel gốc với mã đơn vị ở cột B và đơn vị cha ở E; NGAN_HANG hỗ trợ Excel 6 cột với trạng thái ở F. Không đổi vị trí thủ công. Việc cập nhật bản Google Apps Script production cần thao tác triển khai riêng của chủ sở hữu. Trước đó hệ thống website vẫn chạy với nguồn cũ ngoài phân bổ.
