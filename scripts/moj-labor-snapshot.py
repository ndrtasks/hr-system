import json, time
from pathlib import Path
import requests

LIST='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list'
OUT=Path('tmp/moj-labor-raw.json')
HEAD={'Content-Type':'application/json;charset=UTF-8','User-Agent':'Mozilla/5.0'}
COURT_TYPE=2
TARGET=65

def post(page):
    payload={'pageNumber':page,'pageSize':12,'viewType':'grid','courtTypes':COURT_TYPE,'sortingBy':2}
    r=requests.post(LIST,json=payload,headers=HEAD,timeout=20)
    r.raise_for_status(); return (((r.json() or {}).get('model') or {}).get('judgementsCollection') or [])

def clean(j):
    jid=str(j.get('id') or '')
    return {'id':jid,'judgmentNumber':str(j.get('judgementNumber') or ''),'caseNumber':str(j.get('caseNumber') or ''),'courtName':str(j.get('courtName') or ''),'courtType':j.get('courtType'),'judgmentDate':str(j.get('judgementDate') or ''),'hijriYear':j.get('hijriYear'),'city':str(j.get('city') or ''),'isAppeal':bool(j.get('isAppeal')),'url':f'https://laws.moj.gov.sa/ar/JudicialDecisionsList/2/{jid}'}

def main():
    rows=[];seen=set()
    for page in range(1,10):
        batch=post(page)
        if not batch: break
        for j in batch:
            jid=str(j.get('id') or '')
            if not jid or jid in seen or 'عمال' not in str(j.get('courtName') or ''): continue
            seen.add(jid);rows.append(clean(j))
            if len(rows)>=TARGET: break
        if len(rows)>=TARGET: break
        time.sleep(.1)
    if len(rows)<TARGET: raise RuntimeError(f'Expected at least {TARGET} labor judgments, got {len(rows)}')
    data={'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source':'Saudi Ministry of Justice laws portal','courtType':COURT_TYPE,'count':len(rows),'judgments':rows[:TARGET]}
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('MOJ labor snapshot:',COURT_TYPE,len(rows[:TARGET]),rows[0]['judgmentNumber'],rows[-1]['judgmentNumber'])

if __name__=='__main__': main()
