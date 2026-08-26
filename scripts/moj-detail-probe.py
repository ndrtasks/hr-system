import json, re, urllib.request
from pathlib import Path
URL='https://laws.moj.gov.sa/ar/JudicialDecisionsList/0/DKf5ytmxZrvYhoM1ZK7wwgivHyuVfTmDJxc1lMywXjpyvcDetl9wihLLxDAYSDS-'
req=urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0','Accept-Language':'ar'})
with urllib.request.urlopen(req,timeout=20) as r:
 html=r.read().decode('utf-8','ignore')
text=re.sub(r'<script[\s\S]*?</script>',' ',html,flags=re.I);text=re.sub(r'<style[\s\S]*?</style>',' ',text,flags=re.I);text=re.sub(r'<[^>]+>',' ',text);text=re.sub(r'\s+',' ',text)
out={'status_length':len(html),'hasLabor':'المحكمة العمالية' in html or 'المحكمة العمالية' in text,'hasJudgment':'الحكم' in text,'sample':text[:5000]}
Path('tmp').mkdir(exist_ok=True);Path('tmp/moj-detail-probe.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(out['status_length'],out['hasLabor'],out['hasJudgment'])
