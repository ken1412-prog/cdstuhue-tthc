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
    def test_real_truong_tien_photo_mask_and_mobile_chase(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        part=css.split("/* CDSTUHUE REAL TRƯỜNG TIỀN NIGHT PHOTO V11",1)[1]
        self.assertIn("url('./img/truong-tien-real-neon.webp')",part)
        self.assertIn("url('./img/truong-tien-arc-light.webp')",part)
        self.assertIn("-webkit-mask-image:",part)
        self.assertIn("animation:cds-real-arch-chase 5.5s linear infinite",part)
        self.assertIn("@media screen and (max-width:760px)",part)
        self.assertIn("@media(prefers-reduced-motion:reduce)",part)
        self.assertIn("overflow:hidden",part)
        self.assertNotIn("width:440px",part)
        for img in ("truong-tien-real-neon.webp","truong-tien-arc-light.webp"):
            p=SITE/"assets/img"/img
            self.assertTrue(p.is_file(),img)
            self.assertLess(p.stat().st_size,850000,img)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertEqual(html.count('class="sidebar-bridge-gleam" aria-hidden="true"'),1)
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)


    def test_menu_has_instant_public_bootstrap_and_async_qa(self):
        app=(SITE/"assets/app.js").read_text(encoding="utf-8")
        import json
        menu=json.loads((SITE/"data/menu.json").read_text(encoding="utf-8"))["visible"]
        expected={"overview":True,"finance":True,"units":False,
                  "chinh-thuc":False,"tam-thoi":False,"nhan-xet":False,
                  "dang-phi":False,"qa-all":True,"qa-tthc":True,
                  "qa-stdv":True,"qa-csdl":True,
                  "resources":False,"reports":False,"guide":False,"assistant":True}
        self.assertEqual(menu,expected)
        self.assertIn("menuReady:true",app)
        self.assertIn("const qaTask=read('data/approved.json')",app)
        self.assertIn("const menuTask=read('data/menu.json')",app)
        self.assertIn("await Promise.all([menuTask,qaTask,progressTask,financeTask,statsTask,archiveTask])",app)
        self.assertIn("if(state.qaLoading&&!state.demo)",app)
        self.assertIn("controller.abort()",app)
        self.assertIn("startLiveStats();",app)
        self.assertIn("loadData();}",app)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)


    def test_cyan_photos_are_true_recolored_files_not_blue_overlays(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE REAL RECOLORED PHOTO ASSETS V10"
        self.assertEqual(css.count(marker),1)
        final_css=css.split(marker,1)[1]
        self.assertIn("url('./img/hue-bridge-night-cyan.webp')",final_css)
        self.assertIn("url('./img/nguyen-hoang-user-banner-cyan.webp')",final_css)
        self.assertIn("background-blend-mode:normal",final_css)
        self.assertNotIn("linear-gradient(107deg,rgba(4,78,191",final_css)
        self.assertIn("background:url('./img/neon-ribbons-wide.svg')",final_css)
        self.assertIn("@media screen and (min-width:761px)",final_css)
        self.assertIn("@media screen and (max-width:760px)",final_css)
        for file in ("hue-bridge-night-cyan.webp", "nguyen-hoang-user-banner-cyan.webp"):
            p=SITE/"assets/img"/file
            self.assertTrue(p.is_file(),file)
            self.assertLess(p.stat().st_size,950000,file)
            self.assertEqual(p.read_bytes()[:4], b"RIFF")
            self.assertEqual(p.read_bytes()[8:12], b"WEBP")
        self.assertTrue((SITE/"assets/img/hue-bridge-night.webp").is_file())
        self.assertTrue((SITE/"assets/img/nguyen-hoang-user-banner.avif").is_file())
        pipeline=(ROOT/".github/workflows/deploy.yml").read_text(encoding="utf-8")
        self.assertIn("python scripts/recolor_cyan_assets.py",pipeline)


    def test_crisp_fast_background_sparkles_keep_original_photos(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE CRISP MOVING SPARKLES V9"
        self.assertEqual(css.count(marker),1)
        visual=css.split(marker,1)[1].split("/* CDSTUHUE REAL RECOLORED PHOTO ASSETS V10",1)[0]
        self.assertIn("animation:cds-sparkle-ribbon-v9 14s",visual)
        self.assertIn("animation:cds-sparkle-point-a-v9 10s",visual)
        self.assertIn("animation:cds-sparkle-point-b-v9 13s",visual)
        self.assertIn("animation:cds-sparkle-photo-v9 16s",visual)
        self.assertIn("animation-duration:15s",visual)
        self.assertIn("animation-duration:17s",visual)
        self.assertIn("@media (prefers-reduced-motion:reduce)",visual)
        self.assertIn("@media print",visual)
        self.assertNotIn("nguyen-hoang-bridge-3840.jpg",visual)
        self.assertNotIn("nguyen-hoang-user-banner.avif",visual)
        self.assertNotIn("grid-template",visual)
        self.assertNotIn("padding:",visual)
        self.assertIn("url('./img/nguyen-hoang-user-banner.avif') right center / auto 100% no-repeat",css)
        self.assertIn("url('./img/nguyen-hoang-user-banner.avif') center top /100% auto no-repeat",css)
        self.assertIn("animation:cds-border-orbit 3s linear infinite",css)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
        for image in ("neon-ribbons-sidebar.svg","neon-ribbons-wide.svg"):
            path=SITE/"assets/img"/image
            self.assertTrue(path.is_file())
            self.assertLess(path.stat().st_size,5000)
            svg=path.read_text(encoding="utf-8")
            self.assertNotIn("<script",svg)
            self.assertIn('fill="#efffff"',svg)


    def test_strong_cyan_photo_overlay_preserves_exact_panorama(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE TRUE CYAN OVERLAY V8"
        self.assertEqual(css.count(marker),1)
        overlay=css.split(marker,1)[1].split("/* CDSTUHUE CRISP MOVING SPARKLES V9",1)[0]
        self.assertIn("mix-blend-mode:screen",overlay)
        self.assertIn("animation:cds-cyan-photo-light 23s",overlay)
        self.assertIn("@keyframes cds-cyan-photo-light",overlay)
        self.assertIn("opacity:.76",overlay)
        self.assertIn("opacity:.96",overlay)
        self.assertIn("opacity:.82",overlay)
        self.assertIn("background-blend-mode:screen,normal",overlay)
        self.assertIn("url('./img/hue-bridge-night.webp')",overlay)
        self.assertIn(".main .hero::after",overlay)
        self.assertIn(".main .stats-hero-home::after",overlay)
        self.assertIn(".main .payment-tracker-panel,",overlay)
        self.assertIn("linear-gradient(135deg,#f6fcff",overlay)
        self.assertIn("@media screen and (max-width:760px)",overlay)
        self.assertIn("@media(prefers-reduced-motion:reduce)",overlay)
        # No replacement of user-provided panorama or its desktop/mobile framing.
        self.assertNotIn("nguyen-hoang-bridge-3840.jpg",overlay)
        self.assertNotIn("nguyen-hoang-user-banner.avif",overlay)
        self.assertIn("url('./img/nguyen-hoang-user-banner.avif') center top /100% auto no-repeat",css)
        self.assertIn("url('./img/nguyen-hoang-user-banner.avif') right center / auto 100% no-repeat",css)
        self.assertNotIn("grid-template-columns",overlay)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)


    def test_hero_banner_photograph_not_replaced_by_blue_glass(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        v6=css.split("/* CDSTUHUE CONTAINED BLUE GLASS V6",1)[1].split("/* CDSTUHUE TRUE CYAN OVERLAY V8",1)[0]
        main_hero=v6.split(".main .hero{",1)[1].split("}",1)[0]
        self.assertNotIn("background:",main_hero)
        self.assertNotIn("background-image:",main_hero)
        self.assertIn(".main .hero::after",v6)
        self.assertIn("linear-gradient(105deg,rgba(4,81,170,.20)",v6)
        self.assertNotIn("url('./img/nguyen-hoang-bridge-3840.jpg')",v6)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)


    def test_blue_glass_v6_contained_menu_light_and_blue_main(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE CONTAINED BLUE GLASS V6"
        self.assertEqual(css.count(marker),1)
        visual=css.split(marker,1)[1].split("/* CDSTUHUE TRUE CYAN OVERLAY V8",1)[0]
        self.assertIn(".sidebar{\n  overflow:hidden;",visual)
        self.assertIn(".sidebar-ambient{",visual)
        self.assertIn("pointer-events:none;",visual)
        self.assertIn("@keyframes cds-aurora-sheen-a",visual)
        self.assertIn("@keyframes cds-aurora-sheen-b",visual)
        self.assertIn("background-blend-mode:color,normal",visual)
        self.assertIn("url('./img/hue-bridge-night.webp')",visual)
        self.assertNotIn("url('./img/nguyen-hoang-bridge-3840.jpg')",visual)
        self.assertIn("Blue tint belongs only to ::after",visual)
        self.assertIn("linear-gradient(105deg,rgba(4,81,170,.20)",visual)
        # Original photo source and framing must remain in base rules.
        self.assertIn("url('./img/nguyen-hoang-user-banner.avif') right center / auto 100% no-repeat",css)
        self.assertIn("url('./img/nguyen-hoang-user-banner.avif') center top /100% auto no-repeat",css)
        self.assertIn(".main .payment-period-toolbar{",visual)
        self.assertIn(".main .payment-tracker-panel,",visual)
        self.assertIn(".main .qa-list .qa-item,",visual)
        self.assertIn("@media screen and (max-width:760px)",visual)
        self.assertIn("@media(prefers-reduced-motion:reduce)",visual)
        self.assertNotIn("grid-template-columns",visual)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertEqual(html.count('class="sidebar-ambient" aria-hidden="true"'),1)
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)


    def test_cobalt_reference_fast_three_second_ring_and_slow_light(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE REFERENCE COBALT NEON V5"
        self.assertEqual(css.count(marker),1)
        # Scope the historical V5 assertions to the V5 section only.
        # Later main-canvas enhancements legitimately use fixed light layers.
        visual=css.split(marker,1)[1].split("/* CDSTUHUE CONTAINED BLUE GLASS V6",1)[0]
        self.assertIn("linear-gradient(176deg,#072b65",visual)
        self.assertIn("linear-gradient(100deg,#f6405c",visual)
        self.assertIn("url('./img/hue-bridge-night.webp')",visual)
        self.assertIn("url('./img/neon-ribbons-sidebar.svg')",visual)
        self.assertIn("url('./img/neon-ribbons-wide.svg')",visual)
        self.assertIn("animation:cds-cobalt-drift 22s",visual)
        self.assertIn("animation:cds-cobalt-wide 24s",visual)
        self.assertIn("animation:cds-border-orbit 3s linear infinite",visual)
        self.assertIn("animation-duration:3s;",visual)
        self.assertIn(".qa-item:is(:active,:focus,:focus-visible)::after",visual)
        self.assertIn(".dialog-backdrop:not(.hidden) .qa-dialog::after",visual)
        self.assertIn(".dialog-backdrop:not(.hidden) .payment-detail-dialog::after",visual)
        self.assertIn("@media screen and (max-width:760px)",visual)
        self.assertIn("@media(prefers-reduced-motion:reduce)",visual)
        # No functional, structural or main page background modifications.
        self.assertNotIn("body{",visual)
        self.assertNotIn("grid-template",visual)
        self.assertNotIn("position:fixed",visual)
        self.assertNotIn("z-index:50",visual)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)


    def test_light_ribbon_art_is_lightweight_responsive_and_accessible(self):
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("CDSTUHUE LIGHT RIBBONS MOTION V4",css)
        self.assertIn("neon-ribbons-sidebar.svg",css)
        self.assertIn("neon-ribbons-wide.svg",css)
        self.assertIn("@keyframes cds-ribbons-drift",css)
        self.assertIn("@keyframes cds-wide-shimmer",css)
        self.assertIn("@keyframes cds-border-orbit",css)
        self.assertIn(".sidebar .nav-link.active::after",css)
        self.assertIn(".qa-item:is(:active,:focus-visible)::after",css)
        self.assertIn(".payment-detail-dialog::after",css)
        self.assertIn("@media(prefers-reduced-motion:reduce),print",css)
        self.assertIn("@media(max-width:760px)",css)
        self.assertIn("pointer-events:none",css)
        for image in ("neon-ribbons-sidebar.svg","neon-ribbons-wide.svg"):
            path=SITE / "assets/img" / image
            self.assertTrue(path.is_file(),image)
            self.assertLess(path.stat().st_size,5000,image)
            art=path.read_text(encoding="utf-8")
            self.assertIn("<svg ",art)
            self.assertNotIn("<script",art)
            self.assertNotIn("href=",art)
        # Existing background and photo are untouched.
        self.assertIn("url('./img/hue-bridge-night.webp')",css)
        self.assertIn("url('./img/nguyen-hoang-bridge-3840.jpg')",css)


    def test_soft_bubble_glow_scoped_to_sidebar_and_middle_desktop_mobile(self):
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE SOFT BUBBLE GLOW V3"
        self.assertEqual(css.count(marker),1)
        effects=css.split(marker,1)[1].split("/* CDSTUHUE LIGHT RIBBONS MOTION V4",1)[0]
        self.assertIn(".sidebar::after{",effects)
        self.assertIn("radial-gradient(circle at 18% 12%",effects)
        self.assertIn(".sidebar .nav-link.active{",effects)
        self.assertIn(".main .hero{",effects)
        self.assertIn(".main .stats-hero-home{",effects)
        self.assertIn(".main .payment-period-toolbar{",effects)
        self.assertIn(".main .payment-tracker-panel,",effects)
        self.assertIn(".main .stats-dashboard-grid>.stats-panel-wide{",effects)
        self.assertIn(".main .topbar .announcement{",effects)
        self.assertIn("@media screen and (max-width:760px)",effects)
        self.assertIn("@media print{",effects)
        # Never replace the existing Huế body/hero photos, or alter
        # sizing, layout, labels and click targets in this visual-only patch.
        self.assertNotIn("body{",effects)
        self.assertNotIn("url(",effects)
        self.assertNotIn("grid-template",effects)
        self.assertNotIn("padding:",effects)
        self.assertNotRegex(effects,r"(?m)^\\s*(?:min-|max-)?width\\s*:")
        self.assertNotRegex(effects.replace("height:39%",""),r"(?m)^\\s*(?:min-|max-)?height\\s*:")
        self.assertIn("url('./img/nguyen-hoang-user-banner.avif')",css)
        self.assertIn("url('./img/hue-bridge-night.webp')",css)


    def test_last_approved_date_visible_and_compact_on_mobile(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        for page in ("index.html", "hoi-dap.html"):
            html=(SITE / page).read_text(encoding="utf-8")
            self.assertIn('class="announcement-label-mobile">Cập nhật lần cuối:</span>',html)
            self.assertIn('id="lastApprovedDateMobile" aria-live="polite">—</span>',html)
            self.assertIn('id="lastApprovedDate" aria-live="polite">—</span>',html)
            self.assertNotIn('id="lastApprovedDate" aria-live="polite">24/10/2026</span>',html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
        self.assertIn("const approvedDate=state.stats?.period===currentReportMonth()?state.stats.approvedDate:null;",js)
        self.assertIn("if(fullDate)fullDate.textContent=approvedFull;",js)
        self.assertIn("if(shortDate)shortDate.textContent=approvedShort;",js)
        self.assertIn(".topbar .announcement{\n  display:inline-flex!important;",css)
        self.assertIn(".topbar-left .breadcrumb{display:none!important}",css)

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
        self.assertIn("compact&&top.some(x=>(paymentRate(x)??0)>0)",js)
        self.assertIn("function financeView(){return paymentMonthControls()+statsDashboard()}",js)
        self.assertNotIn("function financeView(){return paymentMonthControls()+financeCards()+statsDashboard()}",js)
        # The home hero remains, but the finance category must not repeat it.
        for page in ("index.html","hoi-dap.html"):
            html=(SITE / page).read_text(encoding="utf-8")
            self.assertIn('>Thống kê đảng phí <span>↗</span>',html)
            self.assertNotIn("Khám phá thống kê",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
        # The repeated three KPI cards in the detail view are removed.
        self.assertNotIn("const viewCards=",js)
        self.assertNotIn("'+viewCards+'",js)
        # Keep the full ranked payment, bank and missing-filing sections.
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("Bảng xếp hạng theo 46 Đảng bộ",js)
        self.assertIn("statsRankingPair(v.unitRanking,'bản ghi')",js)
        self.assertIn("stats-missing-panel",js)
        # The fourth overview-only card is inert and responsive.
        self.assertIn('class="stats-hero-metric stats-hero-guide"',js)
        self.assertIn('<small>Tài liệu hướng dẫn</small><strong>Đang cập nhật</strong>',js)
        self.assertIn(".stats-hero-home .stats-hero-guide", (SITE / "assets/styles.css").read_text(encoding="utf-8"))
        self.assertIn("m.filingSummary",js)
        self.assertNotIn("Trung tâm thống kê · ",js)
        self.assertNotIn("Đang chờ bản dữ liệu tổng hợp 3 trạng thái",js)
        self.assertNotIn("hồ sơ chênh vượt tổng đảng viên tại",js)
        self.assertNotIn("Bấm tên đơn vị để xem chỉ tiêu được duyệt.",js)
        self.assertNotIn('<span class="stats-count-chip">46 Đảng bộ cấp 2</span>',js)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE / page).read_text(encoding="utf-8")
            self.assertIn('id="sidebarVisitCount">123</strong>',html)
            self.assertIn('Tổng lượt truy cập:',html)
            self.assertNotIn('NKIEN TEST',html)
            self.assertIn('class="brand-signature site-visits"',html)
        self.assertIn("Đã khai báo HS nhưng chưa duyệt",js)
        self.assertIn("Chưa khai báo hồ sơ",js)
        # Hero card must display the entire undeclared source list (15,238
        # on Oct 25), not the 46-unit mapped subset (14,235).
        self.assertIn("m.missing.sourceRowCount>=m.missing.rowCount",js)
        self.assertIn("num(Number.isInteger(m.missing.sourceRowCount)",js)

    def test_top3_and_statistical_bars_without_extra_search(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("function paymentTop3Cards(records)",js)
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("const top=rec.slice(0,3)",js)
        self.assertIn("payment-table-viewport",js)
        self.assertIn("function filingRankingFromApprovedUnits(records)",js)
        self.assertIn("statsRankingPair(filingRank,'hồ sơ','Tỷ lệ khai báo hồ sơ')",js)
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
            self.assertIn('assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30',html)
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
        self.assertIn("return state.stats?.period===currentReportMonth()?state.stats:null;",js)
        self.assertIn("function currentReportMonth(date=new Date())",js)
        self.assertIn("state.statsCheck==='checking'?'Đang đồng bộ bản thống kê đã duyệt.'",js)
        self.assertIn("x.unavailable?' · Chưa đồng bộ'",js)
        self.assertNotIn("Chờ kiểm tra và duyệt dữ liệu của kỳ mới.",js)
        self.assertIn("x.pendingClose?' · Chờ chốt'",js)
        self.assertIn("if(n===null)return 'Chưa phát sinh';",js)
        self.assertIn("notIncurred=rec.filter(x=>paymentRate(x)===null).length",js)
        self.assertIn("valid_rate=('rate' in item", (ROOT / "scripts/sync_public.py").read_text(encoding="utf-8"))
        self.assertIn("const current=currentReportMonth(),months=state.paymentHistory",js)
        self.assertIn("const archived=state.paymentHistory.some(x=>x.period===month&&x.closed===true);",js)
        self.assertNotIn("...row,bankDone:bank.bankDone",js)
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
        active=css[css.rfind("/* Nguyễn Hoàng: keep photo at natural banner scale"):]
        self.assertIn("right center / auto 100% no-repeat",active)
        self.assertIn("width:100%",active)
        self.assertIn("transform:none",active)
        self.assertIn("mask-image:linear-gradient",active)

    def test_filing_summary_month_validated_against_feed(self):
        # candidate is the complete Apps Script feed; raw is just its modules.
        sync=(ROOT / "scripts" / "sync_public.py").read_text(encoding="utf-8")
        self.assertIn("candidate.get('period')==str(filing['sourceSnapshot'])[:7]",sync)
        self.assertNotIn("raw.get('period')==str(filing['sourceSnapshot'])[:7]",sync)

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
        self.assertIn("function filingRankingFromApprovedUnits(records)",js)
        self.assertIn("x.filedDone/x.filedTotal",js)
        self.assertIn("Xếp hạng tỷ lệ khai báo hồ sơ",js)
        self.assertIn("statsRankingPair(filingRank,'hồ sơ','Tỷ lệ khai báo hồ sơ')",js)
        self.assertNotIn("Top 10 nhiều nhất",js)

    def test_no_original_host_or_repo_links_in_ui_assets(self):
        for path in PUBLIC_ASSETS:
            with self.subTest(path=path.name):
                self.assertFalse(
                    ORIGIN_LINK.search(path.read_text(encoding="utf-8")),
                    f"Unexpected hard-coded original host or GitHub repository URL: {path}",
                )

    def test_allocation_is_retired_from_publication(self):
        sync=(Path(__file__).resolve().parents[1] / 'scripts' / 'sync_public.py').read_text(encoding='utf-8')
        self.assertNotIn("modules['allocation']", sync)
        self.assertNotIn("allocation=raw.get('allocation')", sync)

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


    def test_subordinate_lists_do_not_clip_on_mobile(self):
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn(".payment-incomplete-list{list-style:none;padding:0;margin:9px 0 0;max-height:none;overflow:visible}",css)
        self.assertNotIn(".payment-incomplete-list{max-height:190px}",css)
        self.assertIn("paymentDetailFinding('Còn hồ sơ chưa khai báo',",js)
        self.assertIn("paymentDetailFinding('Chưa có tài khoản ngân hàng',",js)
        self.assertIn("Dữ liệu cập nhật lần cuối: ",js)
        self.assertNotIn('Danh sách hồ sơ chỉ xác định cấp con',js)
        self.assertNotIn('Chỉ công bố tên đơn vị được duyệt',js)



    def test_online_counter_uses_real_presence_not_fake_number(self):
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        script=(ROOT / "apps-script" / "Code.gs").read_text(encoding="utf-8")
        workflow=(ROOT / ".github" / "workflows" / "deploy.yml").read_text(encoding="utf-8")
        for page in ("index.html", "hoi-dap.html"):
            html=(SITE / page).read_text(encoding="utf-8")
            self.assertIn('id="footerOnlineCount"', html)
            self.assertIn('<span>Đang online:</span>', html)
            self.assertNotIn('title="Chưa kết nối được bộ đếm trực tuyến"', html)
            self.assertNotIn('Hoạt động 15 phút (ước tính):', html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12", html)
        self.assertIn(".footer-online{", css)
        self.assertIn('position:fixed!important', css)
        self.assertIn('id="sidebarVisitCount"', (SITE / 'index.html').read_text(encoding='utf-8'))
        self.assertIn("function startOnlinePresence()", js)
        self.assertIn("startOnlinePresence();", js)
        self.assertIn("window.cdstuhueOnlineReceive=show", js)
        self.assertNotIn('badge.title=', js)
        self.assertIn("element.textContent='—'", js)
        self.assertIn("function cdstuhuePresence_(e)", script)
        self.assertIn("CacheService.getScriptCache()", script)
        self.assertIn("ContentService.MimeType.JAVASCRIPT", script)
        self.assertIn("scripts/build_online_config.py", workflow)
        self.assertNotIn("Math.random()", js[js.index("function startOnlinePresence"):js.index("function boot()")])


    def test_quick_search_sidebar_button_is_centered_and_qa_labelled(self):
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        for page in ("index.html","hoi-dap.html"):
            html=(SITE / page).read_text(encoding="utf-8")
            self.assertIn('id="openAssistant"',html)
            self.assertIn('class="side-assist-heading"',html)
            self.assertIn('<small>Trong kho câu hỏi</small>',html)
            self.assertNotIn('Trợ lý tra cứu nhanh <small>Không dùng AI bên ngoài</small>',html)
            self.assertIn('assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30',html)
        self.assertIn('/* Centered quick-search launcher in the sidebar */',css)
        self.assertIn('justify-content:center;',css[css.rfind('/* Centered quick-search launcher in the sidebar */'):])
        self.assertIn('text-align:center;',css[css.rfind('/* Centered quick-search launcher in the sidebar */'):])



    def test_main_cobalt_aurora_v12_preserves_public_layout_and_motion_safety(self):
        css = (SITE / "assets/styles.css").read_text(encoding="utf-8")
        marker = "/* CDSTUHUE MAIN COBALT AURORA V12"
        self.assertEqual(css.count(marker), 1)
        patch = css.split(marker, 1)[1].split("/* CDSTUHUE GLOSS TRAILS V13", 1)[0]
        for required in (
            ".main::before{", "pointer-events:none;", "z-index:0;",
            ".main>.content{position:relative;z-index:1}",
            "animation:cds-main-aurora-v12 18s",
            "animation:cds-main-selector-wave-v12 13s",
            "animation:cds-main-tile-glint-v12 13s",
            "@media(max-width:760px)", "@media(prefers-reduced-motion:reduce)",
            "@media print", ".main::before{left:226px}",
            ".main::before{left:0", "animation:none!important",
        ):
            self.assertIn(required, patch)
        # Main-only presentation: original photos, sidebar and application
        # behaviour are not touched by the new trailing visual override.
        for forbidden in (".sidebar{", ".hero::before{", ".main .hero{", "user-select:none"):
            self.assertNotIn(forbidden, patch)
        for page in ("index.html", "hoi-dap.html"):
            html = (SITE / page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30", html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12", html)

    def test_v13_gloss_trails_follow_existing_paths_without_touching_sources(self):
        import xml.etree.ElementTree as ET
        css = (SITE / "assets/styles.css").read_text(encoding="utf-8")
        marker = "/* CDSTUHUE GLOSS TRAILS V13"
        self.assertEqual(css.count(marker), 1)
        visual = css.split(marker, 1)[1].split("/* CDSTUHUE BLUE SILK WAVES V14",1)[0]
        original = ET.parse(SITE / "assets/img/neon-ribbons-wide.svg").getroot()
        chasefile = SITE / "assets/img/neon-ribbons-chase-v13.svg"
        chase = ET.parse(chasefile).getroot()
        base_paths = {p.get("d") for p in original.iter() if p.tag.endswith("path")}
        traced_paths = [p.get("d") for p in chase.iter() if p.tag.endswith("path")]
        self.assertEqual(len(traced_paths), 4)
        self.assertTrue(set(traced_paths).issubset(base_paths))
        svg = chasefile.read_text(encoding="utf-8")
        self.assertIn('attributeName="stroke-dashoffset"', svg)
        self.assertIn('repeatCount="indefinite"', svg)
        self.assertIn("prefers-reduced-motion: reduce", svg)
        for token in (
            "url('./img/neon-ribbons-chase-v13.svg')",
            "url('./img/neon-ribbons-wide.svg')",
            ".main .stats-hero-metric:not(.stats-hero-guide)::after",
            ".main .payment-tracker-totals>div::after",
            ".main .stats-payment-leader::after",
            ".main .payment-rank-badge.top-1",
            ".main .payment-rank-badge.top-2",
            ".main .payment-rank-badge.top-3",
            "animation:cds-v13-ribbon-breathe",
            "animation:cds-v13-card-pulse",
            "animation:cds-v13-percent-sheen",
            "@media(max-width:760px)",
            "@media(prefers-reduced-motion:reduce)",
            "@media print",
            "pointer-events:none",
        ):
            self.assertIn(token, visual)
        # Critical: the genuine panorama and left drawer must remain untouched.
        for forbidden in (".sidebar{", ".hero::before{", ".main .hero{",
                          "site/data/", "user-select:none", "overflow-x:hidden"):
            self.assertNotIn(forbidden, visual)
        for page in ("index.html", "hoi-dap.html"):
            html = (SITE / page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30", html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12", html)

    def test_v14_silk_waves_keep_real_photos_and_are_accessible(self):
        import xml.etree.ElementTree as ET
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE BLUE SILK WAVES V14"
        self.assertEqual(css.count(marker),1)
        v14=css.split(marker,1)[1]
        for asset in ("blue-silk-wide-v14.svg","blue-silk-sidebar-v14.svg"):
            p=SITE/"assets/img"/asset
            self.assertTrue(p.is_file(),asset)
            self.assertLess(p.stat().st_size,6000,asset)
            root=ET.parse(p).getroot()
            self.assertTrue(any(x.tag.endswith("feGaussianBlur") for x in root.iter()))
            self.assertFalse(any(x.tag.endswith("animate") for x in root.iter()))
            self.assertFalse(any(x.get("stroke-dasharray") for x in root.iter()))
        for required in ("blue-silk-wide-v14.svg","blue-silk-sidebar-v14.svg",
                         ".sidebar::after{",".main .hero::after,",
                         ".sidebar-ambient::before,.sidebar-ambient::after{",
                         ".main::before{opacity:.20;animation:none!important}",
                         "cds-v14-silk-flow","prefers-reduced-motion:reduce",
                         "@media print","pointer-events:none"):
            self.assertIn(required,v14)
        for forbidden in (".sidebar::before{",".hero::before{","site/data/",
                          "neon-ribbons-chase-v13.svg","user-select:none"):
            self.assertNotIn(forbidden,v14)
        js=(SITE/"assets/app.js").read_text(encoding="utf-8")
        self.assertIn('class="panel cds-qa-loading" aria-busy="true"',js)
        self.assertIn("Không cần tải lại trang",js)
        self.assertNotIn("Đang nạp bản câu hỏi đã duyệt.",js)
        self.assertIn("const qaTask=read('data/approved.json')",js)
        self.assertIn("applyLiveQA(feed)",js)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)

    def test_v15_panorama_light_is_stronger_and_clipped_to_curves(self):
        import xml.etree.ElementTree as ET
        mask_file=SITE/"assets/img/blue-silk-hero-path-mask-v15.svg"
        self.assertTrue(mask_file.is_file())
        mask=ET.parse(mask_file).getroot()
        waves=ET.parse(SITE/"assets/img/blue-silk-wide-v14.svg").getroot()
        reference_paths={x.get("d") for x in waves.iter() if x.tag.endswith("path")}
        drawn_paths=[x.get("d") for x in mask.iter() if x.tag.endswith("path")]
        self.assertEqual(len(drawn_paths),6)
        self.assertTrue(set(drawn_paths).issubset(reference_paths))
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        patch=css.split("/* CDSTUHUE HERO BRIGHT FLOW V15",1)[1].split("/* CDSTUHUE MENU & STATS BRIGHT RUN V16",1)[0]
        for required in (
            ".main .hero>.hero-silk-runner{",
            "pointer-events:none",
            "blue-silk-hero-path-mask-v15.svg",
            "mask-image:url(",
            "-webkit-mask-image:url(",
            "cds-v15-hero-travel 6.3s",
            ".main .hero>.hero-copy,",
            "z-index:2",
            "prefers-reduced-motion:reduce",
            "@media print"
        ):
            self.assertIn(required,patch)
        for forbidden in (".sidebar{",".sidebar::after{",".hero::before{",
                          "site/data/","neon-ribbons-chase-v13.svg"):
            self.assertNotIn(forbidden,patch)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)

    def test_v16_sidebar_and_stats_strong_silk_light_travel(self):
        import xml.etree.ElementTree as ET
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        part=css.split("/* CDSTUHUE MENU & STATS BRIGHT RUN V16",1)[1].split("/* CDSTUHUE SOFT FLOW TIMING V17",1)[0]
        m=ET.parse(SITE/"assets/img/blue-silk-sidebar-mask-v16.svg").getroot()
        s=ET.parse(SITE/"assets/img/blue-silk-sidebar-v14.svg").getroot()
        paths={p.get("d") for p in m.iter() if p.tag.endswith("path")}
        original={p.get("d") for p in s.iter() if p.tag.endswith("path")}
        self.assertEqual(len(paths),2)
        self.assertTrue(paths.issubset(original))
        self.assertFalse(any(p.get("stroke-dasharray") for p in m.iter()))
        for token in (
            ".sidebar::after{", ".main .stats-hero-home::after,",
            ".main .payment-period-toolbar::after{",
            "blue-silk-sidebar-mask-v16.svg",
            "blue-silk-hero-path-mask-v15.svg",
            "cds-v16-sidebar-travel 7.2s linear infinite",
            "cds-v16-wide-travel 6.4s linear infinite",
            "brightness(1.75)",
            "pointer-events:none",
            "@media(max-width:760px)",
            "@media(prefers-reduced-motion:reduce)",
            "@media print",
        ):
            self.assertIn(token,part)
        for forbidden in (".hero::before{", ".main .hero::after",
                          ".main .hero>.hero-silk-runner", "site/data/"):
            self.assertNotIn(forbidden,part)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)

    def test_v17_soft_flow_reduces_speed_without_changing_light_or_data(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE SOFT FLOW TIMING V17"
        self.assertEqual(css.count(marker),1)
        visual=css.split(marker,1)[1].split("/* CDSTUHUE SIDEBAR UNDER-TEXT SILK V18",1)[0]
        for token in (
            "cds-v17-hero-light-pass 21s linear infinite",
            "0%{background-position:132% 0}",
            "100%{background-position:-110% 0}",
            ".main .hero::after{animation-duration:28s}",
            ".sidebar::after{animation-duration:23s}",
            ".main .stats-hero-home::after{animation-duration:22s}",
            ".main .payment-period-toolbar::after{animation-duration:25s}",
            ".sidebar-bridge-gleam{animation-duration:19s}",
            "@media(max-width:760px)",
            "after{animation-duration:24s}",
            ".sidebar::after{animation-duration:26s}",
            "@media(prefers-reduced-motion:reduce)",
            "animation:none!important",
        ):
            self.assertIn(token,visual)
        for forbidden in ("site/data/",".sidebar::before{",".hero::before{",
                          "filter:brightness","mask-image:","user-select:none"):
            self.assertNotIn(forbidden,visual)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)

    def test_v18_light_is_under_menu_labels_with_natural_silk_wave(self):
        import xml.etree.ElementTree as ET
        path=SITE/"assets/img/sidebar-soft-blue-ribbons-v18.svg"
        self.assertTrue(path.is_file())
        self.assertLess(path.stat().st_size,5000)
        root=ET.parse(path).getroot()
        self.assertTrue(any(el.tag.endswith("feGaussianBlur") for el in root.iter()))
        self.assertFalse(any(el.tag.endswith("animate") or el.get("stroke-dasharray") for el in root.iter()))
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE SIDEBAR UNDER-TEXT SILK V18"
        self.assertEqual(css.count(marker),1)
        part=css.split(marker,1)[1].split("/* CDSTUHUE TRUONG TIEN TWO SPOTLIGHTS V19",1)[0]
        for term in ("sidebar-soft-blue-ribbons-v18.svg","z-index:0!important",
                     "z-index:3!important","mask-image:none!important",
                     "pointer-events:none","filter:none!important",
                     ".sidebar .nav-link:not(.active){",
                     ".sidebar .nav-link.active{","cds-v18-silk-drift 35s",
                     "prefers-reduced-motion:reduce","@media print"):
            self.assertIn(term,part)
        for forbidden in (".sidebar::before{",".hero::before{","site/data/"):
            self.assertNotIn(forbidden,part)
        for p in ("index.html","hoi-dap.html"):
            html=(SITE/p).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertIn('class="sidebar-bridge-gleam" aria-hidden="true"',html)

    def test_v19_two_bridge_spotlights_stay_below_navigation(self):
        import xml.etree.ElementTree as ET
        file=SITE/"assets/img/truong-tien-two-spotlights-v19.svg"
        self.assertTrue(file.is_file())
        self.assertLess(file.stat().st_size,5500)
        root=ET.parse(file).getroot()
        self.assertTrue(any(x.tag.endswith("feGaussianBlur") for x in root.iter()))
        self.assertFalse(any(x.tag.endswith("animate") for x in root.iter()))
        svg=file.read_text(encoding="utf-8")
        self.assertIn("id=\"leftCone\"",svg)
        self.assertIn("id=\"rightCone\"",svg)
        self.assertIn("id=\"lens\"",svg)
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE TRUONG TIEN TWO SPOTLIGHTS V19"
        self.assertEqual(css.count(marker),1)
        v19=css.split(marker,1)[1].split("/* CDSTUHUE INDEPENDENT BRIDGE SEARCHLIGHT SWEEP V20",1)[0]
        for token in (
            ".sidebar>.sidebar-twin-spotlights{",
            "height:46%", "z-index:1", "pointer-events:none",
            "truong-tien-two-spotlights-v19.svg",
            "mix-blend-mode:screen", "cds-v19-twin-light 18s",
            "z-index:3!important", "max-width:760px",
            "prefers-reduced-motion:reduce", "@media print",
        ):
            self.assertIn(token,v19)
        for forbidden in (".sidebar::before{",".sidebar::after{",".hero::before{",
                          "site/data/","truong-tien-real-neon.webp"):
            self.assertNotIn(forbidden,v19)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertEqual(html.count('class="sidebar-twin-spotlights" aria-hidden="true"'),1)
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="sidebar-bridge-gleam" aria-hidden="true"'),1)

    def test_v20_independent_bridge_searchlights_really_sweep_from_fixed_lamps(self):
        import xml.etree.ElementTree as ET
        original=ET.parse(SITE/"assets/img/truong-tien-two-spotlights-v19.svg").getroot()
        source_paths={x.get("d") for x in original.iter() if x.tag.endswith("path")}
        for name in ("left","right"):
            asset=SITE/"assets/img"/f"truong-tien-searchlight-{name}-v20.svg"
            self.assertTrue(asset.is_file())
            self.assertLess(asset.stat().st_size,4200)
            root=ET.parse(asset).getroot()
            self.assertEqual(len([x for x in root.iter() if x.tag.endswith("path")]),2)
            self.assertTrue({x.get("d") for x in root.iter() if x.tag.endswith("path")}.issubset(source_paths))
            self.assertTrue(any(x.tag.endswith("feGaussianBlur") for x in root.iter()))
            self.assertFalse(any(x.tag.endswith("animate") for x in root.iter()))
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE INDEPENDENT BRIDGE SEARCHLIGHT SWEEP V20"
        self.assertEqual(css.count(marker),1)
        patch=css.split(marker,1)[1].split("/* CDSTUHUE CONTENT NO-FLASH V21",1)[0]
        for token in (
            ".sidebar>.sidebar-twin-spotlights{",
            "background:none", "animation:none",
            "pointer-events:none", "isolation:isolate",
            ".sidebar>.sidebar-twin-spotlights::before{",
            ".sidebar>.sidebar-twin-spotlights::after{",
            "truong-tien-searchlight-left-v20.svg",
            "truong-tien-searchlight-right-v20.svg",
            "transform-origin:24.8% 64.3%",
            "transform-origin:77.5% 64.6%",
            "animation:cds-v20-searchlight-left 16s ease-in-out infinite alternate",
            "animation:cds-v20-searchlight-right 19s ease-in-out infinite alternate",
            "transform:rotate(-11deg)", "transform:rotate(10deg)",
            "transform:rotate(12deg)", "transform:rotate(-10deg)",
            "z-index:3!important",
            "prefers-reduced-motion:reduce",
            "@media print",
        ):
            self.assertIn(token,patch)
        for forbidden in (".sidebar::before{", ".sidebar::after{", ".hero::before{",
                          "site/data/", "user-select:none"):
            self.assertNotIn(forbidden,patch)
        for name in ("index.html","hoi-dap.html"):
            html=(SITE/name).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertEqual(html.count('class="sidebar-twin-spotlights" aria-hidden="true"'),1)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)

    def test_v21_content_is_not_blinking_or_repainting_without_request(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE CONTENT NO-FLASH V21"
        self.assertEqual(css.count(marker),1)
        v21=css.split(marker,1)[1].split("/* CDSTUHUE V22 —",1)[0]
        required=(
            ".main .hero::after,",
            ".main .stats-hero-home::after,",
            ".main .payment-period-toolbar::after{",
            "background-image:url('./img/blue-silk-wide-v14.svg')!important",
            "animation:none!important",
            "background-position:center!important",
            ".main .hero>.hero-silk-runner{",
            "display:none!important",
            ".main .payment-tracker-totals>div,",
            ".main .stats-hero-metric:not(.stats-hero-guide),",
            ".main .stats-payment-leader,",
            ".main .stats-kpi::after,",
            ".main .payment-rank-badge.top-1,",
            ".main::before{",
            "@media(max-width:760px)",
            "@media(prefers-reduced-motion:reduce)",
            "@media print",
        )
        for token in required:
            self.assertIn(token,v21)
        for forbidden in (".sidebar::after{",".sidebar::before{",
                          ".sidebar-twin-spotlights::before{",
                          ".sidebar-twin-spotlights::after{",
                          "site/data/","user-select:none"):
            self.assertNotIn(forbidden,v21)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="sidebar-twin-spotlights" aria-hidden="true"'),1)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)

    def test_v22_bridge_double_speed_hero_path_and_qa_buttons_without_page_flash(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE V22 —"
        self.assertEqual(css.count(marker),1)
        patch=css.split(marker,1)[1].split("/* CDSTUHUE V23 CONTINUOUS TWIN HERO LIGHT",1)[0]
        for item in (
            ".sidebar>.sidebar-twin-spotlights::before{",
            "animation-duration:8s!important",
            ".sidebar>.sidebar-twin-spotlights::after{",
            "animation-duration:9.5s!important",
            ".main .hero>.hero-silk-runner{",
            "display:block!important",
            ".main .hero>.hero-silk-runner::before,",
            "animation:cds-v22-hero-path-run 10.5s linear infinite!important",
            "background-position:132% 0",
            "background-position:-110% 0",
            ".main .hero::after{animation:none!important}",
            ".sidebar .side-assist,",
            ".assistant-mobile-fab:not([hidden]){",
            "animation:cds-v22-qa-breathe 4.8s ease-in-out infinite",
            "filter:brightness(1.065)",
            "animation-duration:9s!important",
            "animation-duration:10.5s!important",
            "animation-duration:12s!important",
            "@media(prefers-reduced-motion:reduce)",
            "@media print",
        ):
            self.assertIn(item,patch)
        for forbidden in (".main::before{",".main .stats-kpi::after{",
                          ".main .payment-period-toolbar::after{",
                          "site/data/","user-select:none"):
            self.assertNotIn(forbidden,patch)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="side-assist"'),1)
            self.assertEqual(html.count('class="assistant-mobile-fab"'),1)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)

    def test_v24_visible_desktop_hero_two_seamless_tracks(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE V24 DESKTOP HERO LIGHT VISIBLE"
        self.assertEqual(css.count(marker),1)
        chunk=css.split(marker,1)[1].split("/* CDSTUHUE V25 — gentle quick-QA",1)[0]
        for token in (
            ".main .hero>.hero-silk-runner{",
            "display:block!important",
            "mix-blend-mode:screen",
            "blue-silk-hero-path-mask-v15.svg",
            "background-repeat:repeat-x!important",
            "opacity:.96!important",
            "mask-mode:alpha",
            "@media screen and (min-width:761px)",
            "background-size:320px 100%!important",
            "animation:cds-v24-desktop-one 8s linear infinite!important",
            "animation:cds-v24-desktop-two 8s linear infinite!important",
            "to{background-position:-320px 0px}",
            "from{background-position:-160px 0px}",
            "to{background-position:-480px 0px}",
            "background-size:190px 100%!important",
            "animation:cds-v24-mobile-one 12s linear infinite!important",
            "animation:cds-v24-mobile-two 12s linear infinite!important",
            "to{background-position:-190px 0px}",
            "to{background-position:-285px 0px}",
            ".main .hero::after{animation:none!important}",
            "@media(prefers-reduced-motion:reduce)", "@media print",
        ):
            self.assertIn(token,chunk)
        for forbidden in ("calc(", ".sidebar::after{", ".main::before{",
                          ".main .stats-kpi::after{", "site/data/"):
            self.assertNotIn(forbidden,chunk)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)

    def test_v25_quick_qa_buttons_gently_twinkle_without_layout_shift(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE V25 — gentle quick-QA button double glint."
        self.assertEqual(css.count(marker),1)
        block=css.split(marker,1)[1].split("/* CDSTUHUE V26 — NGỌ MÔN NIGHT HERO",1)[0]
        for token in (
            ".sidebar .side-assist,",
            ".assistant-mobile-fab:not([hidden]){",
            "animation:cds-v25-qa-soft-twinkle 4.2s ease-in-out infinite",
            "@keyframes cds-v25-qa-soft-twinkle",
            "filter:brightness(1.075)",
            "filter:brightness(1.07)",
            "0 0 17px rgba(255,133,173,.47)",
            "transform:none",
            "opacity:1",
            ":focus-visible",
            "outline:3px solid #ffe0a0",
            "prefers-reduced-motion:reduce",
            "animation:none!important",
            "@media print",
        ):
            self.assertIn(token,block)
        for forbidden in (".hero", ".main::before", "scale(", "opacity:0",
                          "site/data/", "user-select:none"):
            self.assertNotIn(forbidden,block)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertEqual(html.count('class="side-assist"'),1)
            self.assertEqual(html.count('class="assistant-mobile-fab"'),1)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)

    def test_v26_ngo_mon_night_hero_preserves_sidebar_and_source(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE V26 — NGỌ MÔN NIGHT HERO"
        self.assertEqual(css.count(marker),1)
        part=css.split(marker,1)[1].split("/* CDSTUHUE V27 — NGỌ MÔN HERO BRIGHTNESS",1)[0]
        for token in (
            "Quang Nguyen Vinh / Pexels",
            "14021268",
            "https://images.pexels.com/photos/14021268/pexels-photo-14021268.jpeg",
            ".main .hero {",
            ".main .hero::before {",
            "display:none!important",
            "background-color:#0b2d50 !important",
            "@media screen and (max-width:760px)",
            ".main .hero>.hero-copy{position:relative;z-index:2}",
            "@media print",
        ):
            self.assertIn(token,part)
        for forbidden in (".sidebar{",".sidebar::before{",
                          ".sidebar>.sidebar-twin-spotlights",
                          ".stats-hero-home{","site/data/",
                          "user-select:none"):
            self.assertNotIn(forbidden,part)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)

    def test_v27_ngo_mon_is_brighter_without_affecting_stats_or_ui(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE V27 — NGỌ MÔN HERO BRIGHTNESS"
        self.assertEqual(css.count(marker),1)
        visual=css.split(marker,1)[1].split("/* CDSTUHUE V29 — NGỌ MÔN GOLDEN FLOWING LIGHT",1)[0].split("/* CDSTUHUE V28 — NGỌ MÔN FLOWING LIGHT",1)[0]
        for token in (
            "@media screen{",
            ".main .hero{",
            "rgba(5,22,44,.58) 0%",
            "rgba(6,27,49,.43) 38%",
            "rgba(4,28,54,.25) 71%",
            "rgba(4,30,55,.12) 100%",
            "@media screen and (max-width:760px)",
            "rgba(6,23,45,.23) 0%",
            "rgba(7,28,53,.33) 42%",
            "rgba(5,27,51,.53) 82%",
            "rgba(5,28,53,.69) 100%",
            "pexels-photo-14021268.jpeg",
            ".main .hero h1,",
            ".main .hero .eyebrow{",
            "@media print",
        ):
            self.assertIn(token,visual)
        for forbidden in (".sidebar", ".stats-hero-home",
                          ".hero-silk-runner", "site/data/", "animation:",
                          "user-select:none"):
            self.assertNotIn(forbidden,visual)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)


    def test_payment_month_archive_filter_accepts_real_october(self):
        import json
        from pathlib import Path
        app=(SITE/"assets/app.js").read_text(encoding="utf-8")
        history=json.loads((SITE/"data/payment-history.json").read_text(encoding="utf-8"))
        archive=json.loads((SITE/"data/payment-history/2026-10.json").read_text(encoding="utf-8"))
        self.assertEqual(history["months"][0]["period"],"2026-10")
        self.assertEqual(history["months"][0]["closed"],True)
        self.assertTrue(archive["reviewed"] and archive["public"] and archive["closed"])
        self.assertEqual(len(archive["modules"]["ranking"]["records"]),46)
        self.assertIn(r'/^20\d{2}-(0[1-9]|1[0-2])$/.test(x.period)',app)
        self.assertNotIn(r'/^20\\d{2}-(0[1-9]|1[0-2])$/.test(x.period)',app)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)

    def test_v29_ngo_mon_gold_lights_move_on_both_media_sizes(self):
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE V29 — NGỌ MÔN GOLDEN FLOWING LIGHT"
        self.assertEqual(css.count(marker),1)
        block=css.split(marker,1)[1].split("/* CDSTUHUE V30 — REFERENCE SHAPED TWO-WAY WHITE GOLD STREAMS",1)[0]
        for required in (
            ".main .hero>.hero-silk-runner{",
            "display:block!important",
            "blue-silk-hero-path-mask-v15.svg",
            "#fff2a1 49%,#fff8cc 51%",
            "background-repeat:repeat-x!important",
            "rgba(244,172,27,.58) 31%",
            "rgba(255,215,70,.97) 43%",
            "rgba(255,192,47,.93)",
            "rgba(255,231,130,.99)",
            "rgba(122,74,0,.12) 0%",
            "rgba(122,74,0,.12) 100%",
            "animation:cds-v29-desktop-leading 7s linear infinite!important",
            "animation:cds-v29-desktop-following 7s linear infinite!important",
            "to{background-position:-340px center}",
            "from{background-position:-170px center}",
            "to{background-position:-510px center}",
            "animation:cds-v29-mobile-leading 8s linear infinite!important",
            "animation:cds-v29-mobile-following 8s linear infinite!important",
            "to{background-position:-220px center}",
            "to{background-position:-330px center}",
            ".main .hero::after{animation:none!important}",
            "z-index:2",
            "@media(prefers-reduced-motion:reduce)",
        ):
            self.assertIn(required,block)
        for forbidden in (".sidebar::after{",".stats-hero-home{",".main::before{",
                          "site/data/","calc(","user-select:none"):
            self.assertNotIn(forbidden,block)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)

    def test_v30_two_reference_shaped_gold_ribbons_run_opposite_and_seamlessly(self):
        import xml.etree.ElementTree as ET
        css=(SITE/"assets/styles.css").read_text(encoding="utf-8")
        marker="/* CDSTUHUE V30 — REFERENCE SHAPED TWO-WAY WHITE GOLD STREAMS"
        self.assertEqual(css.count(marker),1)
        block=css.split(marker,1)[1]
        upper=(SITE/"assets/img/ngo-mon-upper-flow-mask-v30.svg")
        lower=(SITE/"assets/img/ngo-mon-lower-flow-mask-v30.svg")
        base=(SITE/"assets/img/ngo-mon-two-wide-gold-waves-v30.svg")
        ns={"s":"http://www.w3.org/2000/svg"}
        static_paths=ET.parse(base).findall(".//s:path",ns)
        upper_paths=ET.parse(upper).findall(".//s:path",ns)
        lower_paths=ET.parse(lower).findall(".//s:path",ns)
        self.assertEqual(len(static_paths),8)
        self.assertEqual(len(upper_paths),3)
        self.assertEqual(len(lower_paths),3)
        self.assertEqual(len(set(x.attrib["d"] for x in static_paths)),2)
        self.assertEqual({x.attrib["d"] for x in upper_paths},{static_paths[0].attrib["d"]})
        self.assertEqual({x.attrib["d"] for x in lower_paths},{static_paths[4].attrib["d"]})
        self.assertNotEqual(static_paths[0].attrib["d"],static_paths[4].attrib["d"])
        for token in (
            "ngo-mon-two-wide-gold-waves-v30.svg",
            "ngo-mon-upper-flow-mask-v30.svg",
            "ngo-mon-lower-flow-mask-v30.svg",
            "#ffffff 47%",
            "#ffffff 53%",
            "animation:cds-v30-gold-right-desk 7.4s linear infinite!important",
            "animation:cds-v30-gold-left-desk 8.2s linear infinite!important",
            "background-size:660px 100%!important",
            "to{background-position:660px center}",
            "to{background-position:-660px center}",
            "animation:cds-v30-gold-right-mobile 8s linear infinite!important",
            "animation:cds-v30-gold-left-mobile 8.8s linear infinite!important",
            "background-size:440px 100%!important",
            "to{background-position:440px center}",
            "to{background-position:-440px center}",
            "background-repeat:repeat-x!important",
            "opacity:1!important",
            "animation:none!important",
            "z-index:2",
            "prefers-reduced-motion:reduce",
        ):
            self.assertIn(token,block)
        for forbidden in (".main::before{",".sidebar::after{",".stats-hero-home{",
                          "site/data/","scale(","user-select:none"):
            self.assertNotIn(forbidden,block)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertEqual(html.count('class="hero-silk-runner" aria-hidden="true"'),1)


    def test_v31_public_qa_fallback_is_preserved_and_mobile_loading_has_exit(self):
        app=(SITE/"assets/app.js").read_text(encoding="utf-8")
        deploy=(ROOT/".github/workflows/deploy.yml").read_text(encoding="utf-8")
        script=(ROOT/"scripts/persist_public_qa.py").read_text(encoding="utf-8")
        for token in (
            "function finalizeQaLoadFromTimeout(){",
            "state.qaLoading=false;",
            "state.qaLoadError=state.qa.length===0;",
            "setTimeout(finalizeQaLoadFromTimeout,12000)",
            'data-action="retry-qa"',
            "if(a==='retry-qa')",
            "loadData().then(()=>refreshLivePublished())",
        ):
            self.assertIn(token,app)
        self.assertIn("python scripts/persist_public_qa.py",deploy)
        self.assertIn("git add site/data/approved.json",deploy)
        self.assertIn("if ! git diff --quiet -- site/data/approved.json",deploy)
        self.assertIn("PUBLIC_FIELDS",script)
        self.assertIn('entry.get("public") is not True',script)
        self.assertIn("preserve_if_unchanged",script)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/app.js?v=20261102-qa-retry-fallback-v12",html)
            self.assertIn("assets/styles.css?v=20261102-ngo-mon-white-gold-crossflow-v30",html)

if __name__ == "__main__":
    unittest.main()
