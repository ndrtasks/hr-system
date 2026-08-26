import json, time
from pathlib import Path
import requests

LIST='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list'
OUT=Path('tmp/moj-labor-raw.json')
HEAD={'Content-Type':'application/json;charset=UTF-8','User-Agent':'Mozilla/5.0'}
FILTERS=[2,1]  # appeal first, then first-instance; duplicate detail IDs collapse to one case
TARGET=65
PAGE_SIZE=100
MAX_PAGES=20

def post(stage,page):
    payload={'pageNumber':page,'pageSize':PAGE_SIZE,'viewType':'grid','courtTypes':stage,'sortingBy':2}
    r=requests.post(LIST,json=payload,headers=HEAD,timeout=20)
    r.raise_for_status(); return (((r.json() or {}).get('model') or {}).get('judgementsCollection') or [])

def clean(j,stage):
    jid=str(j.get('id') or '')
    return {'id':jid,'judgmentNumber':str(j.get('judgementNumber') or ''),'caseNumber':str(j.get('caseNumber') or ''),'courtName':str(j.get('courtName') or ''),'courtType':j.get('courtType'),'judgmentDate':str(j.get('judgementDate') or ''),'hijriYear':j.get('hijriYear'),'city':str(j.get('city') or ''),'isAppeal':bool(j.get('isAppeal')),'stageFilter':stage,'url':f'https://laws.moj.gov.sa/ar/JudicialDecisionsList/{stage}/{jid}'}

def main():
    rows=[];seen=set();page_stats=[];errors=[]
    for stage in FILTERS:
      for page in range(1,MAX_PAGES+1):
        try: batch=post(stage,page)
        except Exception as e:
            errors.append({'stage':stage,'page':page,'error':repr(e)});continue
        labor=0
        for j in batch:
            if 'عمال' not in str(j.get('courtName') or ''): continue
            labor+=1
            jid=str(j.get('id') or '')
            if not jid or jid in seen: continue
            seen.add(jid);rows.append(clean(j,stage))
        page_stats.append({'stage':stage,'page':page,'returned':len(batch),'labor':labor,'uniqueTotal':len(rows)})
        if len(rows)>=TARGET or not batch: break
        time.sleep(.05)
      if len(rows)>=TARGET: break
    rows.sort(key=lambda x:(x.get('judgmentDate') or '',x.get('judgmentNumber') or ''),reverse=True)
    chosen=rows[:TARGET]
    data={'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source':'Saudi Ministry of Justice laws portal','filters':FILTERS,'target':TARGET,'count':len(rows),'selected':len(chosen),'targetReached':len(rows)>=TARGET,'pageSize':PAGE_SIZE,'pageStats':page_stats,'errors':errors,'judgments':chosen}
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('MOJ labor discovery: unique=',len(rows),'selected=',len(chosen),'targetReached=',len(rows)>=TARGET,'errors=',len(errors))

if __name__=='__main__': main()
