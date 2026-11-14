"""Validate QA image manifest. Every exposed image must be manually approved.

The original Messages Archive contains text markers '[Hình ảnh]', not image
bytes. Never map source message photos to QAs based only on adjacency; do not
put private rows or raw screenshots in public site assets.
"""
import json
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/"site"
ASSET=re.compile(r"^assets/qa-media/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}\.(?:png|jpe?g|webp)$",re.I)
QA_ID=re.compile(r"^QA\d{3,5}$")

class QAImageManifestTest(unittest.TestCase):
    def test_manifest_never_publishes_unreviewed_media(self):
        content=json.loads((SITE/"data/qa-media-public.json").read_text(encoding="utf-8"))
        approved=json.loads((SITE/"data/approved.json").read_text(encoding="utf-8"))
        ids={q["id"] for q in approved["items"]}
        self.assertEqual(content.get("schema"),1)
        self.assertIsInstance(content.get("items"),list)
        self.assertLessEqual(len(content["items"]),len(ids))
        seen=set()
        for entry in content["items"]:
            self.assertEqual(set(entry),{"id","public","images"})
            self.assertRegex(entry["id"],QA_ID)
            self.assertIn(entry["id"],ids)
            self.assertNotIn(entry["id"],seen)
            seen.add(entry["id"])
            self.assertIs(entry["public"],True)
            self.assertIsInstance(entry["images"],list)
            self.assertTrue(1<=len(entry["images"])<=12)
            for image in entry["images"]:
                self.assertEqual(set(image),{"src","alt","caption","reviewed"})
                self.assertIs(image["reviewed"],True)
                self.assertRegex(image["src"],ASSET)
                self.assertTrue(10<=len(image["alt"].strip())<=220)
                self.assertTrue(8<=len(image["caption"].strip())<=400)
                path=SITE/image["src"]
                self.assertTrue(path.is_file(),str(path))
                self.assertLessEqual(path.stat().st_size,4_000_000)

    def test_gallery_is_nonblocking_and_uses_safe_local_assets(self):
        js=(SITE/"assets/qa-image-gallery-v36.js").read_text(encoding="utf-8")
        css=(SITE/"assets/qa-image-gallery-v36.css").read_text(encoding="utf-8")
        for token in ("data/qa-media-public.json?v=20261102-v36",
                      "QA_ID.test(item.id)","item.public!==true",
                      "img.reviewed===true", "const ASSET=",
                      "body.querySelector('.answer')",
                      "body.querySelector('.qa-media-gallery')",
                      "image.loading='lazy'",
                      "image.alt=img.alt",
                      "link.rel='noopener noreferrer'",
                      "catch(_err)", "fetchDone=true;render()"):
            self.assertIn(token,js)
        self.assertIn(".qa-media-grid{",css)
        for page in ("index.html","hoi-dap.html"):
            html=(SITE/page).read_text(encoding="utf-8")
            self.assertIn("assets/qa-image-gallery-v36.js?v=20261114-qa-pdf-guides-v6",html)
            self.assertIn("assets/qa-image-gallery-v36.css?v=20261102-v36",html)
            self.assertIn("assets/app.js?v=20261114-qa-pdf-guides-v6",html)
            self.assertIn("assets/qa-click-guides-v35.js?v=20261114-qa-pdf-guides-v6",html)

if __name__=="__main__":
    unittest.main()
