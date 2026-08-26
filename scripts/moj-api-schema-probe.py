import re,json,urllib.request,urllib.parse
from pathlib import Path
BASE='https://laws.moj.gov.sa'; PAGE=BASE+'/ar/JudicialDecisionsList'
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'text/html,application/javascript,*/*'})
 with urllib.request.urlopen(req,timeout=30) as r:return r.read().decode('utf-8','ignore')
html=get(PAGE);srcs=re.findall(r'<script[^>]+src=["\']([^"\']+)',html,re.I)
endpoints=[];keyset=set();interesting=set();contexts=[]
for src in srcs:
 url=urllib.parse.urljoin(BASE,src)
 try: js=get(url)
 except Exception: continue
 for needle in ['judgements-list','judgementsList','Judgements/']:
  for m in re.finditer(re.escape(needle),js,re.I):
   ctx=js[max(0,m.start()-5000):min(len(js),m.end()+9000)]
   if 'judgement' not in ctx.lower(): continue
   contexts.append({'url':url,'needle':needle,'context':ctx[:14000]})
   endpoints += re.findall(r'https?[^"\']+|/[A-Za-z0-9_./-]*[Jj]udg[A-Za-z0-9_./?-]*',ctx)
   for k in re.findall(r'([A-Za-z][A-Za-z0-9_]{2,40})\s*:',ctx): keyset.add(k)
   for k in re.findall(r'["\']([A-Za-z][A-Za-z0-9_]{2,40})["\']',ctx):
    if any(w in k.lower() for w in ['court','judge','judg','case','year','date','city','page','sort','appeal','search','keyword','type','number']): interesting.add(k)
out={'scripts':srcs,'endpoints':sorted(set(endpoints))[:50],'objectKeys':sorted(keyset),'interestingStrings':sorted(interesting),'contexts':contexts[:4]}
Path('tmp').mkdir(exist_ok=True);Path('tmp/moj-api-schema.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('contexts',len(contexts),'keys',len(keyset),'interesting',sorted(interesting))
