import re,json,urllib.request,urllib.parse
from pathlib import Path
BASE='https://laws.moj.gov.sa'
PAGE=BASE+'/ar/JudicialDecisionsList'
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'text/html,application/javascript,*/*'})
 with urllib.request.urlopen(req,timeout=30) as r:return r.read().decode('utf-8','ignore')
html=get(PAGE)
srcs=re.findall(r'<script[^>]+src=["\']([^"\']+)',html,re.I)
results=[]
for src in srcs:
 url=urllib.parse.urljoin(BASE,src)
 try: js=get(url)
 except Exception as e: results.append({'url':url,'error':repr(e)});continue
 hits=[]
 for needle in ['judgements-list','Judgements/judgements-list','pageNumber','courtTypes','sortingBy']:
  for m in re.finditer(re.escape(needle),js,re.I):
   a=max(0,m.start()-1800);b=min(len(js),m.end()+3500);hits.append(js[a:b])
 if hits: results.append({'url':url,'length':len(js),'hits':hits[:12]})
out={'htmlLength':len(html),'scripts':srcs,'matches':results}
Path('tmp').mkdir(exist_ok=True);Path('tmp/moj-api-schema.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('scripts',len(srcs),'bundles with api markers',len(results))
