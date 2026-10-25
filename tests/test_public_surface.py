"""Check accidental public-origin link leakage without blocking native copy or selection.

HTML, JavaScript and CSS downloaded into browsers always remain inspectable.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
PUBLIC_ASSETS = [
    SITE / "index.html",
    SITE / "hoi-dap.html",
    SITE / "assets" / "app.js",
    SITE / "assets" / "styles.css",
]
ORIGIN_LINK = re.compile(
    r"(?:https?:)?//(?:www\.)?(?:"
    r"github\.com/ken1412-prog/cdstuhue-tthc"
    r"|raw\.githubusercontent\.com/ken1412-prog/cdstuhue-tthc"
    r"|ken1412-prog\.github\.io(?:/cdstuhue-tthc)?"
    r")",
    re.IGNORECASE,
)


class PublicSurfaceTests(unittest.TestCase):
    def test_monthly_approved_finance_tracker(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn("function paymentTop3Cards(records)",js)
        self.assertIn("const top=rec.slice(0,3)",js)
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("payment-tracker-panel",js)
        self.assertIn("payment-table-viewport",js)
        self.assertIn("closePaymentDetail()",js)
        self.assertNotIn("v.owner",js[js.index("function statsDashboard()"):js.index("function financeView()")])

    def test_no_duplicate_finance_page_highlights(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        # Preserve homepage Top 3, but omit it from detailed finance hero.
        self.assertIn("financeCards({compact:true})",js)
        self.assertIn("compact&&top.length",js)
        self.assertIn("function financeView(){return paymentMonthControls()+financeCards()+statsDashboard()}",js)
        # The repeated three KPI cards in the detail view are removed.
        self.assertNotIn("const viewCards=",js)
        self.assertNotIn("'+viewCards+'",js)
        # Keep the full ranked payment, bank and missing-filing sections.
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("Bảng xếp hạng theo 46 Đảng bộ",js)
        self.assertIn("statsRankingPair(v.unitRanking,'bản ghi')",js)
        self.assertIn("stats-missing-panel",js)

    def test_top3_and_statistical_bars_without_extra_search(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("function paymentTop3Cards(records)",js)
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("const top=rec.slice(0,3)",js)
        self.assertIn("payment-table-viewport",js)
        self.assertIn("const maxMissing=Math.max",js)
        for marker in ("stats-payment-top3","stats-bank-panel","stats-missing-panel"):
            self.assertIn(marker,css)
        self.assertNotIn('id="rankingSearch"',js)

    def test_non_ai_assistant_remains_available_on_mobile(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("$('#openAssistant').onclick=toggleAssistant",js)
        self.assertNotIn("$('#navAssistant').onclick=toggleAssistant",js)
        self.assertIn("$('#assistantMobileFab').onclick=toggleAssistant",js)
        self.assertIn(".assistant-mobile-fab:not([hidden])",css)
        self.assertNotIn("api.openai.com",js)

    def test_footer_byline_and_mobile_qa_width(self):
        for page in ("index.html", "hoi-dap.html"):
            html=(SITE / page).read_text(encoding="utf-8")
            self.assertIn('<div class="footer-byline">',html)
            self.assertIn('<span class="footer-copyright">© 2026 CDSTUHUE</span><span class="footer-author">NKien',html)
            self.assertIn('assets/styles.css?v=20261025-user-bridge-contain-v11',html)
            self.assertNotIn('id="navAssistant"',html)
            self.assertIn('id="openAssistant"',html)
            self.assertIn('id="assistantMobileFab"',html)
            self.assertNotIn("Nkien —",html)
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn("qa-latest-panel",js)
        self.assertIn(".qa-list{min-width:0;max-width:100%;grid-template-columns:minmax(0,1fr)}",css)
        self.assertIn(".qa-item-top .badge{min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",css)
        self.assertIn(".footer-byline{display:flex;align-items:baseline;",css)

    def test_compact_payment_columns_and_no_sensitive_details(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("TK NH đã có / Tổng đơn vị",js)
        self.assertIn("HS khai báo / Tổng ĐV",js)
        self.assertIn("Thu trong kỳ (%)",js)
        self.assertIn("payment-rate-inline",js)
        self.assertIn("payment-rate-inline",css)
        self.assertNotIn("Tên chủ tài khoản",js)
        self.assertNotIn("Số tài khoản ngân hàng",js)

    def test_private_count_fields_are_independently_approved(self):
        app=(SITE / "assets/app.js").read_text(encoding="utf-8")
        sync=(ROOT / "scripts/sync_public.py").read_text(encoding="utf-8")
        gs=(ROOT / "apps-script/Code.gs").read_text(encoding="utf-8")
        self.assertIn("function paymentCountPair(done,total)",app)
        self.assertIn("paymentFiledText(x)",app)
        self.assertIn("HS_FILED_XY_BY_LEVEL2",gs)
        self.assertIn("BANK_XY_BY_LEVEL2",gs)
        self.assertIn("const members=statsWhole_(r[2])",gs)
        self.assertIn("filed=[7,8,9]",gs)
        self.assertIn("filedTotal:reconciled?members:null",gs)
        self.assertIn("filing_xy_ok=isinstance(extra,dict) and extra.get('filedXY') is True",sync)
        self.assertIn("if filing_xy_ok:",sync)
        self.assertIn("done/total",sync)
        self.assertNotIn("data/payment-history/2026-10.json",app)

    def test_bright_approved_monthly_finance(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        for marker in ("paymentMonthControls()", "selectPaymentMonth(", "paymentFilteredRecords(",
                       "exportPaymentMonth()", "data/payment-history.json", "paymentMonthSelect",
                       "paymentStatusFilter", "paymentSort", "paymentSearch"):
            self.assertIn(marker,js)
        for marker in ("payment-period-toolbar", "payment-period-badge", "payment-table-tools",
                       "hue-downtown-2560.jpg", "nguyen-hoang-bridge-3840.jpg", "#172c4a", "#c51620"):
            self.assertIn(marker,css)
        self.assertIn("data?.closed!==true",js)
        self.assertIn("data.modules.ranking.records.length!==46",js)
        self.assertNotIn("api.openai.com",js)

    def test_high_resolution_hue_photos_are_local(self):
        for name in ("hue-downtown-2560.jpg", "nguyen-hoang-bridge-3840.jpg"):
            image=SITE / "assets" / "img" / name
            self.assertTrue(image.is_file())
            self.assertGreater(image.stat().st_size,100000)
            self.assertLess(image.stat().st_size,3000000)
            self.assertEqual(image.read_bytes()[:2],bytes([0xff,0xd8]))

    def test_hue_bridge_photos_are_prominent(self):
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("CDSTUHUE photo selection: Nguyễn Hoàng + Thuận An",css)
        self.assertIn("nqs.1cdn.vn/2026/01/03/",css)
        self.assertIn("nguyen-hoang-bridge-3840.jpg",css)
        self.assertIn("rgba(245,250,253,.38)",css)
        self.assertIn("url('./img/nguyen-hoang-bridge-3840.jpg') center 46% /cover fixed no-repeat!important",css)

    def test_nguyen_hoang_hero_shows_bridge_arch_not_right_bank(self):
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        # Check the final cascade block, not an obsolete earlier hero declaration.
        final=css[css.rfind("/* CDSTUHUE photo selection:"):]
        self.assertIn("left top /140% auto no-repeat!important",final)
        self.assertIn("left top /155% auto no-repeat!important",final)
        self.assertIn("nguyen-hoang-bridge-3840.jpg",final)

    def test_user_provided_bridge_hero_asset_and_framing(self):
        image=SITE / "assets" / "img" / "nguyen-hoang-user-banner.avif"
        self.assertTrue(image.is_file())
        self.assertGreater(image.stat().st_size,5000)
        self.assertIn(b"ftypavif",image.read_bytes()[:32])
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        final=css[css.rfind("/* User-supplied panoramic bridge hero"):]
        self.assertIn("nguyen-hoang-user-banner.avif",final)
        self.assertIn("right center /auto 100% no-repeat",final)
        self.assertIn("center top /100% auto no-repeat",final)
        self.assertIn("rgba(7,24,44,.99)",final)
        active=css[css.rfind("/* Hero seamless full-width bridge photo"):]
        self.assertIn("right center / contain no-repeat",active)
        self.assertIn("width:72%",active)
        self.assertIn("transform:none",active)
        self.assertIn("mask-image:linear-gradient",active)

    def test_no_redundant_dashboard_explanations(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        for removed in (
            "Dòng chưa khai báo đã đối chiếu",
            "Chỉ báo cáo đã duyệt",
            "Bản đã duyệt được cập nhật trong kỳ.",
            "Bản thu nộp và xếp hạng đã khóa;",
            "Không phải tỷ lệ đảng viên. ",
            "Nguồn: các bảng thống kê đã được duyệt.",
            "Tổng hợp thống kê đảng phí, tiến độ thủ tục và tri thức hỗ trợ kỹ thuật của Thành phố Huế.",
            "Báo cáo tổng hợp theo kỳ, dựa trên dữ liệu được phép công khai hoặc minh họa có gắn nhãn.",
        ):
            self.assertNotIn(removed,js)
        self.assertIn("subtitleEl.hidden=!sub",js)
        self.assertIn("const maxMissing=Math.max",js)
        self.assertIn("rowBlock(rank.top",js)
        self.assertIn("rowBlock(rank.bottom",js)

    def test_no_original_host_or_repo_links_in_ui_assets(self):
        for path in PUBLIC_ASSETS:
            with self.subTest(path=path.name):
                self.assertFalse(
                    ORIGIN_LINK.search(path.read_text(encoding="utf-8")),
                    f"Unexpected hard-coded original host or GitHub repository URL: {path}",
                )

    def test_no_source_maps_published(self):
        self.assertFalse(list(SITE.rglob("*.map")), "Do not publish JS/CSS source maps")
        for path in PUBLIC_ASSETS:
            with self.subTest(path=path.name):
                self.assertNotIn("sourceMappingURL=", path.read_text(encoding="utf-8"))

    def test_source_hotkeys_are_only_soft_deterrence(self):
        js = (SITE / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn("function discourageSourceHotkeys(e)", js)
        self.assertIn("document.addEventListener('keydown',discourageSourceHotkeys,true)", js)
        self.assertIn("k==='f12'", js)
        self.assertIn("k==='u'", js)
        self.assertNotIn("oncontextmenu", js)
        self.assertNotIn("preventDefault(); // copy", js)
        # Copy, paste, screenshot and right-click context menu remain native.
        self.assertNotRegex(js, r"addEventListener\s*\(\s*['\"](?:copy|contextmenu|selectstart)['\"]")

    def test_copy_text_and_native_browser_features_remain_available(self):
        js = (SITE / "assets/app.js").read_text(encoding="utf-8")
        css = (SITE / "assets/styles.css").read_text(encoding="utf-8")
        html = "\n".join((SITE / x).read_text(encoding="utf-8")
                         for x in ("index.html", "hoi-dap.html"))
        for forbidden in ("oncontextmenu=", "oncopy=", "onselectstart="):
            self.assertNotIn(forbidden, html.lower())
        self.assertNotRegex(js, r"addEventListener\s*\(\s*['\"](?:contextmenu|copy|selectstart)['\"]")
        self.assertNotRegex(css, r"(?is)(?:html|body)\s*\{[^{}]*\buser-select\s*:\s*none")
        self.assertIn('id="qaModal"', html)
        self.assertIn("data-qa=", js)


if __name__ == "__main__":
    unittest.main()
