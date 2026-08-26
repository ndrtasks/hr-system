import json, urllib.request
from pathlib import Path
URL='https://laws-gateway.moj.gov.sa/apis/legislations/v1/Judgements/judgements-list'
def call(payload):
 b=json.dumps(payload).encode(); req=urllib.request.Request(URL,data=b,headers={'Content-Type':'application/json;charset=UTF-8','User-Agent':'Mozilla/5.0'},method='POST')
 with urllib.request.urlopen(req,timeout=15) as r:return json.load(r)
def coll(d):return ((d.get('model') or {}).get('judgementsCollection') or [])
out={'unfiltered':[],'probes':{}}
try: out['unfiltered']=coll(call({'pageNumber':1,'pageSize':12,'viewType':'grid','sortingBy':2}))
except Exception as e: out['unfiltered_error']=repr(e)
# Small probe set; 250 is a known valid category in MOJ's same API, while 0-5 test common route/category values.
for c in [0,1,2,3,4,5,250]:
 try:
  rows=coll(call({'pageNumber':1,'pageSize':5,'viewType':'grid','courtTypes':c,'sortingBy':2}))
  out['probes'][str(c)]=rows
 except Exception as e: out['probes'][str(c)]={'error':repr(e)}
Path('tmp').mkdir(exist_ok=True);Path('tmp/moj-probe.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('MOJ probe done',[(k,len(v) if isinstance(v,list) else 'err') for k,v in out['probes'].items()])
