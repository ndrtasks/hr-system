import json, urllib.request
from pathlib import Path
URL='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list'
def call(payload):
 b=json.dumps(payload).encode(); req=urllib.request.Request(URL,data=b,headers={'Content-Type':'application/json;charset=UTF-8','User-Agent':'Mozilla/5.0'},method='POST')
 with urllib.request.urlopen(req,timeout=20) as r:return json.load(r)
def coll(d):return ((d.get('model') or {}).get('judgementsCollection') or [])
out={'probes':{}}
for size in [12,50,100]:
 try:
  rows=coll(call({'pageNumber':1,'pageSize':size,'viewType':'grid','courtTypes':2,'sortingBy':2}))
  out['probes'][f'labor-size-{size}']={'count':len(rows),'rows':rows[:5]}
 except Exception as e: out['probes'][f'labor-size-{size}']={'error':repr(e)}
Path('tmp').mkdir(exist_ok=True);Path('tmp/moj-probe.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('MOJ labor page-size probe',[(k,v.get('count')) for k,v in out['probes'].items()])
