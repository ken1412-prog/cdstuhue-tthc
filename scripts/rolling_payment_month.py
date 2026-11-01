#!/usr/bin/env python3
"""Preserve approved public statistics by month, no manual calendar switch.

A working monthly snapshot contains only already-approved aggregate fields;
at the first run in a new month it becomes an immutable archive.
No private IDs, names of individuals, financial amounts, or account numbers.
"""
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo
from freeze_payment_month import MONTH, select_payment_snapshot, freeze


def _save_if_changed(path, payload):
    content = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def roll(today, site_root, public_stats=None):
    root = Path(site_root) / "data"
    staging = root / "payment-staging"
    archive = root / "payment-history"
    current = today.strftime("%Y-%m")
    count = 0
    # Freeze only historical months with a previously reviewed, valid snapshot.
    if staging.exists():
        for item in sorted(staging.glob("*.json")):
            month = item.stem
            if not MONTH.fullmatch(month) or month >= current:
                continue
            if (archive / (month + ".json")).exists():
                continue
            try:
                approved = json.loads(item.read_text(encoding="utf-8"))
                if freeze(approved, today, archive, month):
                    count += 1
            except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
                print("Skip invalid previous-month snapshot:", month, type(exc).__name__)
    if public_stats is None:
        path = root / "stats.json"
        public_stats = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    month = str(public_stats.get("period") or "")
    if (public_stats.get("public") is True and public_stats.get("reviewed") is True
            and MONTH.fullmatch(month) and month <= current):
        try:
            doc = select_payment_snapshot(public_stats, month, today)
            if month == current:
                doc["closed"] = False
                doc.pop("closedOn", None)
                doc["generatedAt"] = ""  # avoid commits from poll timestamps
                count += int(_save_if_changed(staging / (month + ".json"), doc))
            elif not (archive / (month + ".json")).exists():
                count += int(freeze(public_stats, today, archive, month))
        except (ValueError, KeyError, TypeError) as exc:
            print("No eligible approved monthly snapshot:", type(exc).__name__)
    return count


if __name__ == "__main__":
    today = dt.datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
    print("Approved monthly archive changes:", roll(today, Path("site")))
