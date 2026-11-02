#!/usr/bin/env python3
"""Keep only the validated owner-approved public QA snapshot in Git main.

The CI public-feed exporter is the validation boundary. This step rechecks its
output before it can become a stable Netlify/GitHub Pages fallback. If only
the generated timestamp changed, restore the existing file byte-for-byte to
avoid generating a deployment for every poll. Never export unreviewed fields.
"""
from __future__ import annotations
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "site/data/approved.json"
PUBLIC_FIELDS = {
    "id", "group", "topic", "question", "answer", "keywords",
    "alternatives", "updated", "sourceUrl", "publicNote", "public"
}
GROUPS = {"tthc", "stdv", "csdl"}


def validate_published(doc):
    if not isinstance(doc, dict) or doc.get("schema") != 1 or not isinstance(doc.get("items"), list):
        raise ValueError("Invalid approved publication schema")
    if set(doc) - {"schema", "source", "generatedAt", "items"}:
        raise ValueError("Non-public top-level fields in approved QA")
    if len(doc["items"]) > 5000:
        raise ValueError("Excessive approved QA count")
    ids = set()
    for entry in doc["items"]:
        if not isinstance(entry, dict) or set(entry) - PUBLIC_FIELDS:
            raise ValueError("Unexpected QA field in public payload")
        if entry.get("public") is not True or entry.get("group") not in GROUPS:
            raise ValueError("Unapproved QA in published payload")
        if not all(isinstance(entry.get(x), str) and entry[x].strip()
                   for x in ("id", "question", "answer")):
            raise ValueError("Incomplete approved QA entry")
        if entry["id"] in ids:
            raise ValueError("Duplicate public QA identifier")
        ids.add(entry["id"])
    return doc


def preserve_if_unchanged(previous, fresh):
    validate_published(fresh)
    if (isinstance(previous, dict)
            and previous.get("schema") == fresh["schema"]
            and previous.get("source") == fresh.get("source")
            and previous.get("items") == fresh["items"]):
        return previous
    return fresh


def main():
    fresh = json.loads(TARGET.read_text(encoding="utf-8"))
    prior_text = subprocess.check_output(
        ["git", "show", "HEAD:site/data/approved.json"],
        cwd=ROOT, text=True, encoding="utf-8")
    old = json.loads(prior_text)
    chosen = preserve_if_unchanged(old, fresh)
    if chosen is old:
        TARGET.write_text(prior_text, encoding="utf-8")
        print("Public QA unchanged; keep prior stable snapshot")
    else:
        TARGET.write_text(json.dumps(chosen, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        print("Public approved QA snapshot changed:", len(chosen["items"]))


if __name__ == "__main__":
    main()
