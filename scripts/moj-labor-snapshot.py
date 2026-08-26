import json, time
from pathlib import Path
import requests

LIST='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list'
OUT=Path('tmp/moj-labor-raw.json')
HEAD={'Content-Type':'application/json;charset=UTF-8','User-Agent':'Mozilla/5.0'}
COURT_FILTER=2
TARGET=65
PAGE_SIZE=100
MAX_PAGES=20

def post(page):
    payload={'pageNumber':page,'pageSize':PAGE_SIZE,'viewType':'grid','courtTypes':COURT_FILTER,'sortingBy':2}
    r=requests.post(LIST,json=payload,headers=HEAD,timeout=20)
    r.raise_for_status(); return (((r.json() or {}).get('model') or {}).get('judgementsCollection') or [])

def clean(j):
    jid=str(j.get('id') or '')
    route=str(j.get('courtType') if j.get('courtType') is not None else 0)
    return {'id':jid,'judgmentNumber':str(j.get('judgementNumber') or ''),'caseNumber':str(j.get('caseNumber') or ''),'courtName':str(j.get('courtName') or ''),'courtType':j.get('courtType'),'judgmentDate':str(j.get('judgementDate') or ''),'hijriYear':j.get('hijriYear'),'city':str(j.get('city') or ''),'isAppeal':bool(j.get('isAppeal')),'url':f'https://laws.moj.gov.sa/ar/JudicialDecisionsList/{route}/{jid}'}

def main():
    rows=[];seen=set();page_stats=[];errors=[]
    for page in range(1,MAX_PAGES+1):
        try: batch=post(page)
        except Exception as e:
            errors.append({'page':page,'error':repr(e)});continue
        labor=0
        for j in batch:
            if 'عمال' not in str(j.get('courtName') or ''): continue
            labor+=1
            jid=str(j.get('id') or '')
            if not jid or jid in seen: continue
            seen.add(jid);rows.append(clean(j))
            if len(rows)>=TARGET: break
        page_stats.append({'page':page,'returned':len(batch),'labor':labor,'uniqueTotal':len(rows)})
        if len(rows)>=TARGET or not batch: break
        time.sleep(.08)
    data={'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source':'Saudi Ministry of Justice laws portal','filter':COURT_FILTER,'target':TARGET,'count':len(rows),'pageSize':PAGE_SIZE,'pageStats':page_stats,'errors':errors,'judgments':rows[:TARGET]}
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    if len(rows)<TARGET: raise RuntimeError(f'Only {len(rows)} unique labor judgments found after {len(page_stats)} pages')
    print('MOJ labor snapshot: unique=',len(rows[:TARGET]),'pages=',len(page_stats),'errors=',len(errors))

if __name__=='__main__': main()
