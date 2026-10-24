#!/usr/bin/env python3
"""Download an Apps Script approved-only JSON feed, verify and publish it to the static site.

Fail-closed: rejects schema mismatch, errors, duplicates, unapproved flags, anomalous payloads.
The endpoint URL comes from GitHub Actions secret QA_PUBLIC_ENDPOINT, never the front-end.
"""
from __future__ import annotations
import datetime as dt
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'site' / 'data' / 'approved.json'
FINANCE_OUTPUT = ROOT / 'site' / 'data' / 'finance.json'
STATS_OUTPUT = ROOT / 'site' / 'data' / 'stats.json'
VALID_GROUPS = {'tthc', 'stdv', 'csdl'}


def validate(data):
    if not isinstance(data, dict) or data.get('schema') != 1 or not isinstance(data.get('items'), list):
        raise ValueError('Invalid public feed schema')
    if data.get('error'):
        raise ValueError('Public feed error')
    seen = set()
    clean = []
    for i, row in enumerate(data['items']):
        if not isinstance(row, dict) or row.get('public') is not True:
            raise ValueError(f'Item {i} is not explicitly public')
        x = {key: str(row.get(key) or '') for key in
             ['id', 'group', 'topic', 'question', 'answer', 'keywords',
              'alternatives', 'updated', 'sourceUrl', 'publicNote']}
        if x['group'] not in VALID_GROUPS or not x['id'].strip() or not x['question'].strip() or not x['answer'].strip():
            raise ValueError(f'Item {i} missing required public fields')
        if x['id'] in seen:
            raise ValueError(f'Duplicate public QA ID: {x["id"]}')
        seen.add(x['id'])
        u = urlparse(x['sourceUrl'])
        if x['sourceUrl'] and (u.scheme != 'https' or not u.netloc):
            x['sourceUrl'] = ''
        x['public'] = True
        clean.append(x)
    if len(clean)>5000:
        raise ValueError('Unreasonably large public feed')
    result={'schema':1,'generatedAt':str(data.get('generatedAt') or dt.datetime.now(dt.timezone.utc).isoformat()),
            'source':'Approved-only Google Sheets publication','items':clean}
    return result


def validate_finance(feed):
    if not isinstance(feed,dict) or feed.get('schema') != 1 or feed.get('error'):
        raise ValueError('Invalid finance publication response')
    if feed.get('public') is not True or feed.get('reviewed') is not True:
        return {'schema':1,'public':False,'reviewed':False,'period':'','observedAt':'',
                'source':'','reportRecords':None,'notDeclared':None,'waitingApproval':None,
                'waitingPayment':None,'bankGroups':[],'notes':'Chưa có thống kê được duyệt công khai.'}
    import re
    if not re.fullmatch(r'20\d\d-(0[1-9]|1[0-2])',str(feed.get('period') or '')):
        raise ValueError('Invalid finance period')
    if not re.fullmatch(r'20\d\d-\d\d-\d\d',str(feed.get('observedAt') or '')):
        raise ValueError('Invalid finance date')
    source=str(feed.get('source') or '').strip()
    if not source or len(source)>240:
        raise ValueError('Invalid finance source')
    keys=['reportRecords','notDeclared','waitingApproval','waitingPayment']
    clean={k:feed.get(k) for k in keys}
    if any(v is not None and (isinstance(v,bool) or not isinstance(v,int) or v<0) for v in clean.values()):
        raise ValueError('Invalid finance metric')
    bank=feed.get('bankGroups')
    allowed={'Đảng bộ trực thuộc Trung ương','Đảng bộ cơ sở','Đảng bộ trực thuộc cơ sở','Đảng bộ bộ phận','Chi bộ'}
    if not isinstance(bank,list) or len(bank)>5:
        raise ValueError('Invalid finance groups')
    out=[];seen=set()
    for x in bank:
        if not isinstance(x,dict) or x.get('name') not in allowed or x['name'] in seen:
            raise ValueError('Invalid finance group label')
        n=x.get('accounts')
        if isinstance(n,bool) or not isinstance(n,int) or n<0:
            raise ValueError('Invalid finance group value')
        seen.add(x['name']);out.append({'name':x['name'],'accounts':n})
    if not out and not any(v is not None for v in clean.values()):
        raise ValueError('Empty finance snapshot')
    return {'schema':1,'public':True,'reviewed':True,'period':feed['period'],
            'observedAt':feed['observedAt'],'source':source,**clean,
            'bankGroups':out,'notes':str(feed.get('notes') or '')[:500],
            'approvedAt':str(feed.get('approvedAt') or '')[:30]}


def get_json(endpoint):
    request=Request(endpoint,headers={'User-Agent':'CDSTUHUE-PublicFeedSync/2.0','Accept':'application/json'})
    with urlopen(request,timeout=35) as response:
        if response.status != 200:raise RuntimeError('HTTP '+str(response.status))
        raw=response.read(8*1024*1024+1)
    if len(raw)>8*1024*1024:raise ValueError('Oversized publication feed')
    return json.loads(raw)


def main():
    endpoint=os.environ.get('QA_PUBLIC_ENDPOINT','').strip()
    parts=urlparse(endpoint)
    if parts.scheme != 'https' or parts.netloc not in {'script.google.com','script.googleusercontent.com'} or not parts.path.endswith('/exec'):
        raise SystemExit('QA_PUBLIC_ENDPOINT must be a deployed Google Apps Script /exec HTTPS URL')
    sep='&' if '?' in endpoint else '?'
    # Both sources must pass validation before any output is replaced.
    qa=validate(get_json(endpoint+sep+'kind=qa'))
    finance=validate_finance(get_json(endpoint+sep+'kind=finance'))
    stats={'schema':1,'public':False,'reviewed':False,'period':'2026-10','modules':{},'note':'Chưa có thống kê được duyệt.'}
    try:
        candidate=get_json(endpoint+sep+'kind=stats')
        if isinstance(candidate,dict) and candidate.get('schema')==1 and candidate.get('public') is True and candidate.get('reviewed') is True and isinstance(candidate.get('modules'),dict):
            # Public website uses an explicit field allowlist: percentages and ranks ONLY.
            raw=candidate['modules']
            modules={}
            p=raw.get('payment')
            if isinstance(p,dict):
                rate=p.get('completionRate')
                if (isinstance(rate,(int,float)) and not isinstance(rate,bool)
                        and 0 <= rate <= 2):
                    modules['payment']={'completionRate':round(rate,8)}
            r=raw.get('ranking')
            if isinstance(r,dict) and isinstance(r.get('records'),list) and len(r['records']) <= 100:
                records=[]
                for row in r['records']:
                    if not isinstance(row,dict):continue
                    rank,name,rate=row.get('rank'),row.get('name'),row.get('rate')
                    if (isinstance(rank,int) and not isinstance(rank,bool)
                            and 1 <= rank <= 100 and isinstance(name,str)
                            and 2 <= len(name.strip()) <= 190
                            and isinstance(rate,(int,float)) and not isinstance(rate,bool)
                            and 0 <= rate <= 2):
                        records.append({'rank':rank,'name':name.strip(),'rate':round(rate,8)})
                if records: modules['ranking']={'records':records,'eligibleUnits':len(records)}
            if modules:
                stats={'schema':1,'public':True,'reviewed':True,
                       'period':str(candidate.get('period') or '')[:7],
                       'generatedAt':str(candidate.get('generatedAt') or '')[:32],
                       'source':'Google Sheets - approved ratio/ranking only',
                       'modules':modules}
    except (ValueError,RuntimeError,OSError,KeyError,TimeoutError):
        pass
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    FINANCE_OUTPUT.write_text(json.dumps(finance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    STATS_OUTPUT.write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(qa["items"])} approved QA and finance publication: {finance["public"]}')


if __name__=='__main__':
    main()
