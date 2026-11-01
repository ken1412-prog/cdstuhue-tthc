"""Month-end freeze is strict, immutable, and excludes private data."""
import datetime as dt
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "freeze_payment", ROOT / "scripts" / "freeze_payment_month.py"
)
freeze_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(freeze_module)


def approved():
    records = [
        {"rank": i, "name": f"Đảng bộ đơn vị {i}",
         "rate": round((47 - i) / 46, 6),
         "bankDone": 14, "bankTotal": 20,
         "filedRate": 0.75, "filedDone": 15, "filedTotal": 20,
         "secret": "MUST_NOT_PUBLISH"}
        for i in range(1, 47)
    ]
    return {
        "schema": 1, "public": True, "reviewed": True,
        "period": "2026-10", "approvedDate": "2026-10-31",
        "generatedAt": "2026-10-31T23:00:00Z",
        "accountNumber": "PRIVATE",
        "modules": {
            "payment": {"completionRate": 0.861, "amount": 123456},
            "ranking": {"records": records, "extra": "DO_NOT_PUBLISH"},
            "banking": {"privateNotes": "HIDDEN"},
        }
    }


class FreezePaymentMonthTest(unittest.TestCase):
    def test_freezes_only_after_end_of_month(self):
        self.assertEqual(freeze_module.previous_month(dt.date(2026, 11, 1)),
                         "2026-10")
        with self.assertRaises(ValueError):
            freeze_module.select_payment_snapshot(
                approved(), "2026-09", dt.date(2026, 10, 25))
        with self.assertRaises(ValueError):
            freeze_module.select_payment_snapshot(
                dict(approved(), reviewed=False), "2026-10", dt.date(2026, 11, 1))

    def test_snapshot_whitelist_and_immutable(self):
        with tempfile.TemporaryDirectory() as td:
            folder = Path(td) / "payment-history"
            now = dt.date(2026, 11, 1)
            self.assertTrue(freeze_module.freeze(approved(), now, folder, '2026-10'))
            output = folder / "2026-10.json"
            first = output.read_text(encoding="utf-8")
            doc = json.loads(first)
            self.assertTrue(doc["closed"])
            self.assertEqual(len(doc["modules"]["ranking"]["records"]), 46)
            self.assertEqual(doc["modules"]["ranking"]["records"][0]["filedDone"], 15)
            self.assertEqual(doc["modules"]["ranking"]["records"][0]["filedTotal"], 20)
            for token in ("MUST_NOT_PUBLISH", "DO_NOT_PUBLISH", "PRIVATE",
                          "accountNumber", "amount", "privateNotes"):
                self.assertNotIn(token, first)
            changed = approved()
            changed["modules"]["payment"]["completionRate"] = 0.001
            self.assertFalse(freeze_module.freeze(changed, now, folder, '2026-10'))
            self.assertEqual(output.read_text(encoding="utf-8"), first)
            index = json.loads((folder.parent / "payment-history.json").read_text())
            self.assertEqual(index["months"], [{"period": "2026-10", "closed": True}])

    def test_no_auto_close_or_early_freeze(self):
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaisesRegex(ValueError, "current or future"):
                freeze_module.freeze(approved(), dt.date(2026, 10, 25), Path(td), "2026-10")
        workflow = (ROOT / ".github/workflows/freeze-payment-month.yml").read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", workflow)
        self.assertNotIn("cron:", workflow)
        self.assertIn("CLOSE_CONFIRMATION", workflow)
        scheduled = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
        self.assertIn("7 17 * * *", scheduled)
        self.assertIn("scripts/rolling_payment_month.py", scheduled)
        script = (ROOT / "scripts/freeze_payment_month.py").read_text(encoding="utf-8")
        self.assertIn("--close-period", script)
        self.assertIn('args.confirm != "CHOT " + args.close_period', script)

    def test_auto_rollover_saves_only_approved_previous_month(self):
        import sys
        sys.path.insert(0, str(ROOT / "scripts"))
        try:
            from rolling_payment_month import roll
            with tempfile.TemporaryDirectory() as td:
                site = Path(td) / "site"
                self.assertEqual(roll(dt.date(2026, 10, 31), site, approved()), 1)
                staged = site / "data" / "payment-staging" / "2026-10.json"
                closed = site / "data" / "payment-history" / "2026-10.json"
                self.assertTrue(staged.is_file())
                self.assertFalse(closed.exists())
                invalid = dict(approved(), period="2026-11", reviewed=False)
                self.assertEqual(roll(dt.date(2026, 11, 1), site, invalid), 1)
                self.assertTrue(closed.is_file())
                old = closed.read_text(encoding="utf-8")
                self.assertEqual(roll(dt.date(2026, 11, 2), site, invalid), 0)
                self.assertEqual(closed.read_text(encoding="utf-8"), old)
                self.assertNotIn("MUST_NOT_PUBLISH", old)
        finally:
            sys.path.remove(str(ROOT / "scripts"))

    def test_november_closes_automatically_on_december_2_even_if_not_visited_on_first(self):
        import sys
        sys.path.insert(0, str(ROOT / "scripts"))
        try:
            from rolling_payment_month import roll
            with tempfile.TemporaryDirectory() as td:
                site = Path(td) / "site"
                november = dict(approved(), period="2026-11", approvedDate="2026-11-30")
                # Capture an owner-reviewed November source during November.
                self.assertEqual(roll(dt.date(2026, 11, 30), site, november), 1)
                working = site / "data/payment-staging/2026-11.json"
                self.assertTrue(working.is_file())
                self.assertFalse((site / "data/payment-history/2026-11.json").exists())
                missing_december = dict(november, reviewed=False)
                # A late visit is irrelevant: scheduled runner closes it on Dec 2.
                self.assertEqual(roll(dt.date(2026, 12, 2), site, missing_december), 1)
                closed = site / "data/payment-history/2026-11.json"
                saved = closed.read_text(encoding="utf-8")
                self.assertEqual(json.loads(saved)["period"], "2026-11")
                self.assertTrue(json.loads(saved)["closed"])
                self.assertEqual(roll(dt.date(2026, 12, 3), site, missing_december), 0)
                self.assertEqual(closed.read_text(encoding="utf-8"), saved)
                self.assertNotIn("MUST_NOT_PUBLISH", saved)
        finally:
            sys.path.remove(str(ROOT / "scripts"))

    def test_recovery_if_november_approved_feed_first_available_on_december_2(self):
        import sys
        sys.path.insert(0, str(ROOT / "scripts"))
        try:
            from rolling_payment_month import roll
            with tempfile.TemporaryDirectory() as td:
                site = Path(td) / "site"
                november = dict(approved(), period="2026-11", approvedDate="2026-11-30")
                # No prior staging due to an outage; still close a valid
                # approved November report when it becomes available later.
                self.assertEqual(roll(dt.date(2026, 12, 2), site, november), 1)
                self.assertTrue((site / "data/payment-history/2026-11.json").is_file())
            with tempfile.TemporaryDirectory() as td:
                site = Path(td) / "site"
                self.assertEqual(roll(dt.date(2026, 12, 2), site,
                                      dict(november, reviewed=False)), 0)
                self.assertFalse((site / "data/payment-history/2026-11.json").exists())
        finally:
            sys.path.remove(str(ROOT / "scripts"))

    def test_incomplete_bad_rates_and_dates_rejected(self):
        base = approved()
        base["modules"]["ranking"]["records"].pop()
        with self.assertRaises(ValueError):
            freeze_module.select_payment_snapshot(base, "2026-10", dt.date(2026, 11, 1))
        base = approved()
        base["modules"]["ranking"]["records"][0]["rate"] = 3
        with self.assertRaises(ValueError):
            freeze_module.select_payment_snapshot(base, "2026-10", dt.date(2026, 11, 1))
        base = approved()
        base["approvedDate"] = "2026-11-08"
        with self.assertRaises(ValueError):
            freeze_module.select_payment_snapshot(base, "2026-10", dt.date(2026, 11, 1))


if __name__ == "__main__":
    unittest.main()
