"""Check accidental public-origin link leakage without blocking native copy or selection.

HTML, JavaScript and CSS downloaded into browsers always remain inspectable.
"""
import re
import unittest
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"
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
        self.assertIn("function financeView(){return financeCards()+statsDashboard()}",js)
        # The repeated three KPI cards in the detail view are removed.
        self.assertNotIn("const viewCards=",js)
        self.assertNotIn("'+viewCards+'",js)
        # Keep the full ranked payment, bank and missing-filing sections.
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("Xếp hạng tỷ lệ thu nộp",js)
        self.assertIn("statsRankingPair(v.unitRanking,'bản ghi')",js)
        self.assertIn("stats-missing-panel",js)

    def test_top3_and_statistical_bars_without_extra_search(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("function paymentTop3Cards(records)",js)
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("const top=rec.slice(0,3)",js)
        self.assertIn("stats-ranking-scroll",js)
        self.assertIn("const maxMissing=Math.max",js)
        for marker in ("stats-payment-top3","stats-bank-panel","stats-missing-panel"):
            self.assertIn(marker,css)
        self.assertNotIn('id="rankingSearch"',js)

    def test_non_ai_assistant_remains_available_on_mobile(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("$('#navAssistant').onclick=toggleAssistant",js)
        self.assertIn("$('#assistantMobileFab').onclick=toggleAssistant",js)
        self.assertIn(".assistant-mobile-fab:not([hidden])",css)
        self.assertNotIn("api.openai.com",js)

    def test_footer_byline_and_mobile_qa_width(self):
        for page in ("index.html", "hoi-dap.html"):
            html=(SITE / page).read_text(encoding="utf-8")
            self.assertIn('<div class="footer-byline">',html)
            self.assertIn('<span class="footer-copyright">© 2026 CDSTUHUE</span><span class="footer-author">NKien',html)
            self.assertIn('assets/styles.css?v=20261025-footer-qa-fit',html)
            self.assertNotIn("Nkien —",html)
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn("qa-latest-panel",js)
        self.assertIn(".qa-list{min-width:0;max-width:100%;grid-template-columns:minmax(0,1fr)}",css)
        self.assertIn(".qa-item-top .badge{min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",css)
        self.assertIn(".footer-byline{display:flex;align-items:baseline;",css)

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
