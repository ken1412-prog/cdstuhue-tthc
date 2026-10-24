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
    def test_top3_and_statistical_bars_without_extra_search(self):
        js=(SITE / "assets/app.js").read_text(encoding="utf-8")
        css=(SITE / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("function paymentTop3Cards(records)",js)
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("const top=(m.ranking?.records||[]).slice(0,3)",js)
        self.assertIn("stats-ranking-scroll",js)
        self.assertIn("const maxMissing=Math.max",js)
        for marker in ("stats-payment-top3","stats-bank-panel","stats-missing-panel"):
            self.assertIn(marker,css)
        self.assertNotIn('id="rankingSearch"',js)

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
