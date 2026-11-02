"""Strict no-leak validation and timestamp-stable public QA fallback."""
import importlib.util
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("persist_public_qa",ROOT/"scripts/persist_public_qa.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class PublicQAFallbackTest(unittest.TestCase):
    def payload(self):
        return {"schema":1,"source":"Approved-only Google Sheets publication",
                "generatedAt":"2026-11-02T05:00:00Z",
                "items":[{"id":"PUBLIC001","group":"tthc","question":"Câu hỏi đã duyệt?",
                          "answer":"Câu trả lời công khai.","public":True}]}
    def test_identical_items_do_not_trigger_deploy(self):
        old=self.payload()
        fresh=dict(old,generatedAt="2026-11-03T05:00:00Z")
        self.assertIs(mod.preserve_if_unchanged(old,fresh),old)
    def test_real_change_updates_public_fallback(self):
        old=self.payload()
        changed=self.payload()
        changed["items"]=[dict(changed["items"][0],answer="Đã thay đổi và duyệt.")]
        self.assertIs(mod.preserve_if_unchanged(old,changed),changed)
    def test_unreviewed_duplicates_and_private_fields_rejected(self):
        for key,val in [("public",False),("group","private"),("secret","DO_NOT_PUBLISH")]:
            doc=self.payload()
            doc["items"]=[dict(doc["items"][0],**{key:val})]
            with self.assertRaises(ValueError):
                mod.preserve_if_unchanged(None,doc)
        duplicate=self.payload()
        duplicate["items"].append(dict(duplicate["items"][0]))
        with self.assertRaises(ValueError):
            mod.validate_published(duplicate)
        top=self.payload()
        top["privateToken"]="SECRET"
        with self.assertRaises(ValueError):
            mod.validate_published(top)

if __name__=="__main__":unittest.main()
