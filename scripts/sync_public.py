#!/usr/bin/env python3
"""Download an Apps Script approved-only JSON feed, verify and publish it to the static site.

Fail-closed: rejects schema mismatch, errors, duplicates, unapproved flags, anomalous payloads.
The endpoint URL comes from GitHub Actions secret QA_PUBLIC_ENDPOINT, never the front-end.
"""
from __future__ import annotations
import datetime as dt
import json
import os
import re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'site' / 'data' / 'approved.json'
FINANCE_OUTPUT = ROOT / 'site' / 'data' / 'finance.json'
STATS_OUTPUT = ROOT / 'site' / 'data' / 'stats.json'
MENU_OUTPUT = ROOT / 'site' / 'data' / 'menu.json'
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
            # Export only explicitly reviewed aggregate fields. No financial amounts,
            # bank account identifiers, individual records or private source IDs.
            raw=candidate['modules']
            modules={}
            def bounded_int(value, limit=100000):
                return (int(value) if isinstance(value,int) and
                        not isinstance(value,bool) and 0<=value<=limit else None)
            def bounded_rate(value):
                return (round(float(value),8) if isinstance(value,(int,float))
                        and not isinstance(value,bool) and 0<=value<=2 else None)
            def approved_unit_rankings(value):
                if not isinstance(value,dict):
                    return None
                def safe_side(key):
                    raw_rows=value.get(key)
                    if not isinstance(raw_rows,list) or len(raw_rows)!=10:
                        return None
                    out=[]
                    for item in raw_rows:
                        if not isinstance(item,dict):
                            return None
                        name=item.get('name')
                        done=bounded_int(item.get('done'),30000)
                        total=bounded_int(item.get('total'),30000)
                        rate=bounded_rate(item.get('rate'))
                        if (not isinstance(name,str) or not 2<=len(name.strip())<=190
                            or not name.strip().lower().startswith('đảng bộ')
                            or total is None or total<=0 or done is None or done>total
                            or rate is None or rate>1 or abs(rate-done/total)>0.000001):
                            return None
                        out.append({'name':name.strip(),'done':done,'total':total,'rate':round(rate,8)})
                    return out
                top=safe_side('top')
                bottom=safe_side('bottom')
                unit_count=bounded_int(value.get('eligibleUnits'),46)
                if top is None or bottom is None or unit_count!=46:
                    return None
                if any(top[i]['rate']<top[i+1]['rate'] for i in range(9)):
                    return None
                if any(bottom[i]['rate']>bottom[i+1]['rate'] for i in range(9)):
                    return None
                return {'eligibleUnits':46,'top':top,'bottom':bottom}

            def approved_missing_level2(value, source_count):
                if not isinstance(value,dict):
                    return None
                unit_count=bounded_int(value.get('eligibleUnits'),46)
                matched=bounded_int(value.get('matchedRows'),source_count)
                unmatched=bounded_int(value.get('unmatchedRows'),source_count)
                if (unit_count!=46 or matched is None or unmatched is None
                    or matched+unmatched!=source_count or matched==0):
                    return None
                def validated_side(key):
                    items=value.get(key)
                    if not isinstance(items,list) or len(items)!=10:
                        return None
                    output=[]
                    seen=set()
                    for item in items:
                        if not isinstance(item,dict):
                            return None
                        name=item.get('name')
                        count=bounded_int(item.get('count'),source_count)
                        if (not isinstance(name,str) or not 2<=len(name.strip())<=190
                            or not name.strip().lower().startswith('đảng bộ')
                            or count is None or name.strip() in seen):
                            return None
                        seen.add(name.strip())
                        output.append({'name':name.strip(),'count':count})
                    return output
                top=validated_side('top')
                bottom=validated_side('bottom')
                if top is None or bottom is None:
                    return None
                if any(top[i]['count']<top[i+1]['count'] for i in range(9)):
                    return None
                if any(bottom[i]['count']>bottom[i+1]['count'] for i in range(9)):
                    return None
                return {'eligibleUnits':46,'matchedRows':matched,'unmatchedRows':unmatched,
                        'top':top,'bottom':bottom}
            payment=raw.get('payment')
            if isinstance(payment,dict):
                rate=bounded_rate(payment.get('completionRate'))
                if rate is not None:
                    modules['payment']={'completionRate':rate}
            rank=raw.get('ranking')
            if isinstance(rank,dict) and isinstance(rank.get('records'),list) and len(rank['records'])<=100:
                records=[]
                extra=rank.get('approvedExtraFields')
                filing_ok=isinstance(extra,dict) and extra.get('filedRate') is True
                filing_xy_ok=isinstance(extra,dict) and extra.get('filedXY') is True
                bank_ok=isinstance(extra,dict) and extra.get('bankXY') is True
                for item in rank['records']:
                    if not isinstance(item,dict): continue
                    n=bounded_int(item.get('rank'),100)
                    label=item.get('name')
                    pct=bounded_rate(item.get('rate'))
                    if n is not None and n>=1 and isinstance(label,str) and 2<=len(label.strip())<=190 and pct is not None:
                        row={'rank':n,'name':label.strip(),'rate':pct}
                        if filing_ok:
                            value=bounded_rate(item.get('filedRate'))
                            if value is not None and value<=1:
                                row['filedRate']=value
                        if filing_xy_ok:
                            done=bounded_int(item.get('filedDone'),30000)
                            total=bounded_int(item.get('filedTotal'),30000)
                            if done is not None and total is not None and total>0 and done<=total:
                                row.update(filedDone=done,filedTotal=total)
                                # Counts and ratios must be derived from exactly
                                # the same aggregate numerator/denominator.
                                if filing_ok and 'filedRate' in row and abs(row['filedRate']-done/total)>0.000001:
                                    row.pop('filedRate',None)
                                    row.pop('filedDone',None)
                                    row.pop('filedTotal',None)
                        if bank_ok:
                            done=bounded_int(item.get('bankDone'),30000)
                            total=bounded_int(item.get('bankTotal'),30000)
                            if done is not None and total is not None and total>0 and done<=total:
                                row.update(bankDone=done,bankTotal=total)
                        records.append(row)
                if records:
                    modules['ranking']={'records':records,'eligibleUnits':len(records),
                        'scope':'Đảng bộ trực thuộc Thành ủy Huế'}
            missing=raw.get('missing')
            if isinstance(missing,dict):
                count=bounded_int(missing.get('rowCount'),30000)
                parents=bounded_int(missing.get('distinctParents'),2000)
                if count is not None and parents is not None and count>=1 and isinstance(missing.get('rowsByParent'),list):
                    rows=[]
                    for item in missing['rowsByParent'][:30]:
                        if not isinstance(item,dict): continue
                        label=item.get('name')
                        nr=bounded_int(item.get('rows'),count)
                        if isinstance(label,str) and 2<=len(label.strip())<=190 and nr is not None and nr>=20:
                            rows.append({'name':label.strip(),'rows':nr,'share':round(nr/count,8)})
                    modules['missing']={'rowCount':count,'distinctParents':parents,
                        'rowsByParent':rows,
                        'countType':'Số dòng chưa khai báo theo danh sách riêng, không phải tỷ lệ chưa khai báo trên tổng đảng viên'}
                    excluded=bounded_int(missing.get('excludedCaQsRows'),30000)
                    no_parent=bounded_int(missing.get('excludedNoParentRows'),30000)
                    ambiguous=bounded_int(missing.get('excludedAmbiguousRows'),30000)
                    incomplete=bounded_int(missing.get('excludedIncompleteRows'),30000)
                    source_rows=bounded_int(missing.get('sourceRowCount'),30000)
                    if all(x is not None for x in (excluded,no_parent,ambiguous,incomplete,source_rows)):
                        if count+excluded+no_parent+ambiguous+incomplete!=source_rows:
                            modules.pop('missing',None)
                        else:
                            modules['missing'].update({
                                'sourceRowCount':source_rows,
                                'excludedCaQsRows':excluded,
                                'excludedNoParentRows':no_parent,
                                'excludedAmbiguousRows':ambiguous,
                                'excludedIncompleteRows':incomplete})
                    elif excluded is not None and excluded+count<=30000:
                        # Backward compatibility with the previous Apps Script deployment.
                        modules['missing']['excludedCaQsRows']=excluded
                    verified=approved_missing_level2(missing.get('level2Ranking'),count)
                    if verified is not None and 'missing' in modules:
                        modules['missing']['level2Ranking']=verified
                    # Public only: total unresolved case count and distinct unit-parent pairs.
                    unlinked=bounded_int(missing.get('unlinkedSourceRows'),30000)
                    unit_pairs=bounded_int(missing.get('unlinkedUnitPairs'),30000)
                    if ('missing' in modules and unlinked is not None and unit_pairs is not None
                            and 0<=unit_pairs<=unlinked<=(
                                modules['missing'].get('sourceRowCount') or count)):
                        modules['missing']['unlinkedSourceRows']=unlinked
                        modules['missing']['unlinkedUnitPairs']=unit_pairs
            allocation=raw.get('allocation')
            if isinstance(allocation,dict):
                n=bounded_int(allocation.get('rowCount'),30000)
                confirmed=bounded_int(allocation.get('confirmed'),30000)
                pending=bounded_int(allocation.get('unconfirmed'),30000)
                wait=bounded_int(allocation.get('waitingRate'),30000)
                if n is not None and n>0 and all(v is not None for v in (confirmed,pending,wait)) and confirmed+pending+wait==n:
                    modules['allocation']={'rowCount':n,'confirmed':confirmed,'unconfirmed':pending,
                        'waitingRate':wait,'confirmedRate':round(confirmed/n,8),
                        'unconfirmedRate':round(pending/n,8),'waitingRateShare':round(wait/n,8)}
                    verified=approved_unit_rankings(allocation.get('unitRanking'))
                    if verified is not None:
                        modules['allocation']['unitRanking']=verified
            bank=raw.get('banking')
            if isinstance(bank,dict):
                n=bounded_int(bank.get('rowCount'),30000)
                registered=bounded_int(bank.get('registered'),30000)
                absent=bounded_int(bank.get('notRegistered'),30000)
                if n is not None and n>0 and registered is not None and absent is not None and registered+absent==n:
                    modules['banking']={'rowCount':n,'registered':registered,
                        'notRegistered':absent,'registrationRate':round(registered/n,8)}
                    verified=approved_unit_rankings(bank.get('unitRanking'))
                    if verified is not None:
                        modules['banking']['unitRanking']=verified
                    unmatched=bounded_int(bank.get('unmappedForRanking'),30000)
                    if unmatched is not None:
                        modules['banking']['unmappedForRanking']=unmatched
                    excluded=bounded_int(bank.get('excludedCaQsUnits'),30000)
                    city=bounded_int(bank.get('excludedCityRoot'),2)
                    if excluded is not None and city is not None:
                        modules['banking'].update(excludedCaQsUnits=excluded,excludedCityRoot=city)
            if modules:
                approved_date=str(candidate.get('approvedDate') or '').strip()
                if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',approved_date):
                    approved_date=''
                else:
                    from datetime import date
                    try:
                        date.fromisoformat(approved_date)
                    except ValueError:
                        approved_date=''
                stats={'schema':1,'public':True,'reviewed':True,
                    'period':str(candidate.get('period') or '')[:7],
                    'approvedDate':approved_date,
                    'generatedAt':str(candidate.get('generatedAt') or '')[:32],
                    'source':'Approved multi-source summary statistics',
                    'warning':'Nguồn có phạm vi khác nhau; không cộng chéo hoặc suy ra tỷ lệ khi thiếu mẫu số.',
                    'modules':modules}
    except (ValueError,RuntimeError,OSError,KeyError,TimeoutError) as exc:
        print(f'Stats export unavailable ({type(exc).__name__}); publishing empty stats safely')
    print('Stats groups ready: ' + ', '.join(stats['modules']) if stats['modules'] else 'Stats groups ready: none')
    # Visibility defaults are safe even before the owner's Apps Script is redeployed.
    defaults={'overview':True,'finance':True,'units':False,
              'chinh-thuc':False,'tam-thoi':False,'nhan-xet':False,'dang-phi':False,
              'qa-all':True,'qa-tthc':True,'qa-stdv':True,'qa-csdl':True,
              'resources':False,'reports':False,'guide':False,'assistant':True}
    menu={'schema':1,'visible':defaults.copy()}
    try:
        raw=get_json(endpoint+sep+'kind=menu')
        flags=raw.get('visible') if isinstance(raw,dict) and raw.get('schema')==1 else None
        if isinstance(flags,dict):
            for key in defaults:
                if isinstance(flags.get(key),bool):
                    menu['visible'][key]=flags[key]
    except (ValueError,RuntimeError,OSError,KeyError,TimeoutError,TypeError) as exc:
        print(f'Menu feed unavailable ({type(exc).__name__}): using default menu visibility')
    print('Hidden navigation categories: '+', '.join(k for k,v in menu['visible'].items() if not v))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    FINANCE_OUTPUT.write_text(json.dumps(finance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    STATS_OUTPUT.write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    MENU_OUTPUT.write_text(json.dumps(menu,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(qa["items"])} approved QA and finance publication: {finance["public"]}')


if __name__=='__main__':
    main()
