import json, os, re, time, hashlib
from pathlib import Path
import requests

LIST='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list'
OUT=Path('tmp/moj-labor-raw.json')
HEAD={'Content-Type':'application/json;charset=UTF-8','User-Agent':'Mozilla/5.0'}

def post(payload):
    r=requests.post(LIST,json=payload,headers=HEAD,timeout=60)
    r.raise_for_status(); return r.json() or {}

def collection(data): return ((data.get('model') or {}).get('judgementsCollection') or [])

def detect_type():
    # Known MOJ commercial category is around 250. Scan a narrow band first, then broaden only if needed.
    bands=[range(240,261),range(200,240),range(261,321)]
    tried=[]
    for band in bands:
      for c in band:
        tried.append(c)
        try:
          rows=collection(post({'pageNumber':1,'pageSize':3,'viewType':'grid','courtTypes':c,'sortingBy':2}))
        except Exception:
          continue
        txt=' '.join(str(x.get(k,'')) for x in rows for k in ('courtName','courtType','caseType'))
        if 'عمال' in txt:
          return c, rows
        time.sleep(.08)
    raise RuntimeError('Could not detect MOJ labor court type; tried '+str(tried[:5])+'...'+str(tried[-5:]))

def get_rows(court_type, need=72):
    out=[]; page=1; seen=set()
    while len(out)<need and page<=12:
      rows=collection(post({'pageNumber':page,'pageSize':12,'viewType':'grid','courtTypes':court_type,'sortingBy':2}))
      if not rows: break
      for j in rows:
        jid=str(j.get('id') or '')
        if jid and jid not in seen:
          seen.add(jid); out.append(j)
      page+=1; time.sleep(.15)
    return out[:need]

def clean_meta(j, court_type):
    jid=str(j.get('id') or '')
    return {
      'id':jid,
      'judgmentNumber':str(j.get('judgementNumber') or ''),
      'caseNumber':str(j.get('caseNumber') or ''),
      'courtName':str(j.get('courtName') or ''),
      'courtType':str(j.get('courtType') or ''),
      'caseType':str(j.get('caseType') or ''),
      'judgmentDate':str(j.get('judgementDate') or ''),
      'hijriYear':str(j.get('hijriYear') or ''),
      'city':str(j.get('city') or ''),
      'url':f'https://laws.moj.gov.sa/ar/JudicialDecisionsList/0/{jid}',
      'apiCourtType':court_type,
    }

def main():
    court_type, sample=detect_type()
    rows=get_rows(court_type,84)
    data={'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source':'Saudi MOJ laws portal','courtType':court_type,'count':len(rows),'sample':sample[:3],'judgments':[clean_meta(j,court_type) for j in rows]}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('MOJ labor snapshot:',court_type,len(rows))

if __name__=='__main__': main()
