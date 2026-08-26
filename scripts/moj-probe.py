import json, urllib.request, time
from pathlib import Path
URL='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list'
def call(payload,timeout=45):
 b=json.dumps(payload).encode(); req=urllib.request.Request(URL,data=b,headers={'Content-Type':'application/json;charset=UTF-8','User-Agent':'Mozilla/5.0'},method='POST')
 with urllib.request.urlopen(req,timeout=timeout) as r:return json.load(r)
def coll(d):return ((d.get('model') or {}).get('judgementsCollection') or [])
out={'probes':{}}
for size in [100,500,1000]:
 t=time.time()
 try:
  rows=coll(call({'pageNumber':1,'pageSize':size,'viewType':'grid','courtTypes':2,'sortingBy':2}))
  labor=sum(1 for x in rows if 'عمال' in str(x.get('courtName') or ''))
  out['probes'][f'size-{size}']={'count':len(rows),'labor':labor,'seconds':round(time.time()-t,2),'rows':rows[:3]}
 except Exception as e: out['probes'][f'size-{size}']={'error':repr(e),'seconds':round(time.time()-t,2)}
Path('tmp').mkdir(exist_ok=True);Path('tmp/moj-probe.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('MOJ large-page probe',[(k,v.get('count'),v.get('labor'),v.get('seconds')) for k,v in out['probes'].items()])
