#!/usr/bin/env python3
"""Emit public endpoint configuration for an anonymous, optional presence tally.

The endpoint already serves the approved public QA feed. It is not an admin
deployment. The public site must never receive a spreadsheet ID or a credential.
"""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'site'/'data'/'online-config.json'

def main():
    endpoint=os.environ.get('QA_PUBLIC_ENDPOINT','').strip()
    safe=None
    if endpoint:
        parsed=urlsplit(endpoint)
        if (parsed.scheme=='https' and parsed.hostname=='script.google.com'
                and re.fullmatch(r'/macros/s/[A-Za-z0-9_-]+/exec',parsed.path)
                and not (parsed.username or parsed.password or parsed.port)):
            # Strip optional query/fragment from the already-public Web App URL.
            # The site only needs the canonical /exec path; no secret or query
            # arguments from CI may ever be copied into its public config.
            safe='https://script.google.com'+parsed.path
        else:
            # Never publish a potentially private or unexpected URL.
            print('Online counter disabled: public QA endpoint URL is not a safe /exec URL')
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps({'schema':1,'endpoint':safe},ensure_ascii=False,
                              separators=(',',':'))+'\n',encoding='utf-8')
    print('Online counter public endpoint configured:',bool(safe))

if __name__=='__main__':
    main()
