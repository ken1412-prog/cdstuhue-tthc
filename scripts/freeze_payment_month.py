#!/usr/bin/env python3
"""Close an approved public payment period into an immutable static JSON snapshot.

Runs only after explicit manual confirmation of a past month. No automatic closing.
Source is the ALREADY PUBLISHED public
stats.json (not private Google Sheets). Keeps only explicitly approved
aggregate payment/ranking fields; never publishes bank account numbers,
money, names of individuals or raw worksheet records.
"""
import argparse
import datetime as dt
import json
import re
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

MONTH = re.compile(r"^20\d{2}-(0[1-9]|1[0-2])$")
NAME = re.compile(r"^Đảng bộ\b", re.I)
DEFAULT_SOURCE = "https://ken1412-prog.github.io/cdstuhue-tthc/data/stats.json"


def previous_month(today):
    first = today.replace(day=1)
    return (first - dt.timedelta(days=1)).strftime("%Y-%m")


def safe_rate(v):
    return type(v) in (int, float) and 0 <= v <= 1


def safe_count(v):
    return type(v) is int and 0 <= v <= 30000


def select_payment_snapshot(raw, month, closed_on):
    if not (isinstance(raw, dict) and raw.get("schema") == 1
            and raw.get("public") is True and raw.get("reviewed") is True
            and MONTH.fullmatch(str(raw.get("period", "")))
            and raw["period"] == month):
        raise ValueError("No approved source matching the closed month")
    approved = str(raw.get("approvedDate") or "")
    try:
        approval_date = dt.date.fromisoformat(approved)
    except ValueError as exc:
        raise ValueError("Missing valid approval date") from exc
    if approval_date > closed_on:
        raise ValueError("Approval date cannot be in the future")
    modules = raw.get("modules") or {}
    payment = modules.get("payment") or {}
    ranking = modules.get("ranking") or {}
    rate = payment.get("completionRate")
    records = ranking.get("records")
    if not safe_rate(rate) or not isinstance(records, list) or len(records) != 46:
        raise ValueError("A complete 46-unit approved payment ranking is required")
    safe = []
    names = set()
    for i, r in enumerate(records, start=1):
        if not isinstance(r, dict):
            raise ValueError("Invalid ranking row")
        name = r.get("name")
        if not (r.get("rank") == i and type(r.get("rank")) is int and
                isinstance(name, str) and 2 <= len(name.strip()) <= 190 and
                NAME.search(name.strip()) and name.strip().casefold() not in names and
                safe_rate(r.get("rate"))):
            raise ValueError("Unapproved rank, unit, or rate")
        if safe and safe[-1]["rate"] < r["rate"]:
            raise ValueError("Ranking must be sorted by descending rate")
        names.add(name.strip().casefold())
        row = {"rank": i, "name": name.strip(), "rate": r["rate"]}
        if safe_rate(r.get("filedRate")):
            row["filedRate"] = r["filedRate"]
        if safe_count(r.get("filedDone")) and safe_count(r.get("filedTotal")) \
                and r["filedTotal"] > 0 and r["filedDone"] <= r["filedTotal"]:
            pair_rate = r["filedDone"] / r["filedTotal"]
            if "filedRate" not in row or abs(row["filedRate"] - pair_rate) < 0.000001:
                row.update(filedDone=r["filedDone"], filedTotal=r["filedTotal"])
        if safe_count(r.get("bankDone")) and safe_count(r.get("bankTotal")) \
                and r["bankTotal"] > 0 and r["bankDone"] <= r["bankTotal"]:
            row.update(bankDone=r["bankDone"], bankTotal=r["bankTotal"])
        safe.append(row)
    return {
        "schema": 1, "public": True, "reviewed": True, "closed": True,
        "period": month, "approvedDate": approved,
        "generatedAt": str(raw.get("generatedAt") or "")[:32],
        "closedOn": closed_on.isoformat(),
        "source": "Immutable approved public payment snapshot",
        "modules": {
            "payment": {"completionRate": rate},
            "ranking": {"eligibleUnits": 46, "records": safe}
        }
    }


def freeze(source, today, folder, month):
    if not MONTH.fullmatch(month):
        raise ValueError('Invalid month')
    if month >= today.strftime('%Y-%m'):
        raise ValueError('Cannot close current or future month')
    folder = Path(folder)
    target = folder / (month + ".json")
    if target.exists():
        print("Already frozen; immutable: " + str(target))
        return False
    snapshot = select_payment_snapshot(source, month, today)
    folder.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    index_path = folder.parent / "payment-history.json"
    entries = []
    if index_path.exists():
        current = json.loads(index_path.read_text(encoding="utf-8"))
        entries = current.get("months", []) if current.get("schema") == 1 else []
    entries = [x for x in entries if isinstance(x, dict)
               and MONTH.fullmatch(str(x.get("period", "")))
               and (folder / (x["period"] + ".json")).is_file()]
    if not any(x["period"] == month for x in entries):
        entries.append({"period": month, "closed": True})
    entries.sort(key=lambda x: x["period"], reverse=True)
    index_path.write_text(json.dumps({"schema": 1, "months": entries},
                                     ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Frozen approved payment period: " + month)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-url", default=DEFAULT_SOURCE)
    parser.add_argument("--input", help="Local public JSON, for offline testing")
    parser.add_argument("--today", help="Vietnam local date YYYY-MM-DD, for tests")
    parser.add_argument("--output-dir", default="site/data/payment-history")
    parser.add_argument("--close-period", required=True)
    parser.add_argument("--confirm", required=True)
    args = parser.parse_args()
    today = (dt.date.fromisoformat(args.today) if args.today else
             dt.datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date())
    if not MONTH.fullmatch(args.close_period):
        parser.error("Closing period must be YYYY-MM")
    if args.confirm != "CHOT " + args.close_period:
        parser.error("Requires explicit matching confirmation")
    if args.close_period >= today.strftime("%Y-%m"):
        parser.error("Cannot close current or future month")
    if args.input:
        raw = json.loads(Path(args.input).read_text(encoding="utf-8"))
    else:
        request = urllib.request.Request(args.source_url,
                     headers={"User-Agent": "CDSTUHUE-public-month-freeze/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.status != 200:
                raise RuntimeError("Published snapshot unavailable")
            raw = json.loads(response.read(2_000_000))
    try:
        freeze(raw, today, Path(args.output_dir), args.close_period)
    except ValueError as exc:
        # Fail closed: do not create a fake static month if no approved public feed exists.
        print("No eligible approved snapshot: " + str(exc))


if __name__ == "__main__":
    main()
