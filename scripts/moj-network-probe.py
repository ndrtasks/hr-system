import json,time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

o=Options();o.add_argument('--headless=new');o.add_argument('--no-sandbox');o.add_argument('--disable-dev-shm-usage');o.add_argument('--window-size=1400,1000');o.set_capability('goog:loggingPrefs',{'performance':'ALL'})
d=webdriver.Chrome(options=o)
out=[]
try:
 for route in ['https://laws.moj.gov.sa/ar/JudicialDecisionsList/0','https://laws.moj.gov.sa/ar/JudicialDecisionsList/2']:
  d.get(route);time.sleep(7)
  for entry in d.get_log('performance'):
   try:m=json.loads(entry['message'])['message']
   except:continue
   if m.get('method')!='Network.requestWillBeSent':continue
   req=m.get('params',{}).get('request',{});url=req.get('url','')
   if 'Judgements' in url or 'judgement' in url.lower():
    out.append({'route':route,'url':url,'method':req.get('method'),'postData':req.get('postData'),'headers':{k:v for k,v in req.get('headers',{}).items() if k.lower() in ['content-type','accept-language']}})
finally:d.quit()
Path('tmp').mkdir(exist_ok=True);Path('tmp/moj-network.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('captured',len(out));[print(x.get('method'),x.get('url'),x.get('postData')) for x in out]
