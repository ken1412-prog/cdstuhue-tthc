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
         "filedRate": 0.75, "secret": "MUST_NOT_PUBLISH"}
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
            self.assertTrue(freeze_module.freeze(approved(), now, folder))
            output = folder / "2026-10.json"
            first = output.read_text(encoding="utf-8")
            doc = json.loads(first)
            self.assertTrue(doc["closed"])
            self.assertEqual(len(doc["modules"]["ranking"]["records"]), 46)
            for token in ("MUST_NOT_PUBLISH", "DO_NOT_PUBLISH", "PRIVATE",
                          "accountNumber", "amount", "privateNotes"):
                self.assertNotIn(token, first)
            changed = approved()
            changed["modules"]["payment"]["completionRate"] = 0.001
            self.assertFalse(freeze_module.freeze(changed, now, folder))
            self.assertEqual(output.read_text(encoding="utf-8"), first)
            index = json.loads((folder.parent / "payment-history.json").read_text())
            self.assertEqual(index["months"], [{"period": "2026-10", "closed": True}])

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
