import json, re, time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

META=Path('tmp/moj-labor-raw.json')
OUT=Path('tmp/moj-labor-details')

def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def window(text,needle,before=1200,after=5200):
 i=text.find(needle)
 return '' if i<0 else text[max(0,i-before):min(len(text),i+after)]
def compact(text):
 text=clean(text)
 parts=[text[:4500]]
 for k in ['الطلبات','الأسباب','الحكم:','الحكم ','أحكام محكمة الاستئناف','نص الاستئناف']:
  x=window(text,k)
  if x: parts.append(x)
 out=clean(' | '.join(parts))
 # enough for accurate summarisation but prevents huge raw judgments in the repo
 return out[:22000]

def driver():
 o=Options();o.add_argument('--headless=new');o.add_argument('--no-sandbox');o.add_argument('--disable-dev-shm-usage');o.add_argument('--disable-gpu');o.add_argument('--window-size=1365,900');o.page_load_strategy='eager'
 return webdriver.Chrome(options=o)

def load(d,url,jid):
 routes=[url,f'https://laws.moj.gov.sa/ar/JudicialDecisionsList/0/{jid}',f'https://laws.moj.gov.sa/ar/JudicialDecisionsList/3/{jid}']
 last=''
 for u in dict.fromkeys(routes):
  try:
   d.get(u)
   WebDriverWait(d,12).until(lambda x: len(clean(x.find_element('tag name','body').text))>500)
   text=clean(d.find_element('tag name','body').text);last=text
   if 'المحكمة العمالية' in text and ('الحكم' in text or 'الأسباب' in text): return u,text
  except Exception: pass
 return routes[0],last

def main():
 meta=json.loads(META.read_text(encoding='utf-8'));rows=meta.get('judgments',[])
 if len(rows)<60: raise RuntimeError(f'Metadata must contain at least 60 labor cases; got {len(rows)}')
 OUT.mkdir(parents=True,exist_ok=True);d=driver();items=[]
 try:
  for i,j in enumerate(rows[:65],1):
   used,text=load(d,j['url'],j['id'])
   items.append({**j,'sourceUrl':used,'rawLength':len(text),'text':compact(text),'sourceCheckedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
   print(i,j.get('judgmentNumber'),len(text),'ok' if 'المحكمة العمالية' in text else 'WARN')
 finally: d.quit()
 for old in OUT.glob('page-*.json'): old.unlink()
 for i in range(0,len(items),5):
  page=i//5+1;(OUT/f'page-{page:02}.json').write_text(json.dumps(items[i:i+5],ensure_ascii=False,indent=2),encoding='utf-8')
 summary={'generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'count':len(items),'pages':(len(items)+4)//5,'failed':[x['judgmentNumber'] for x in items if 'المحكمة العمالية' not in x['text']]}
 (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
 if summary['failed']: raise RuntimeError('Detail extraction failed for '+','.join(summary['failed']))

if __name__=='__main__': main()
