"""Run against a dedicated test instance; never against your personal document store."""
import http.client, os, sqlite3
import urllib.request as U, urllib.error, http.cookiejar, json, uuid, zlib, struct, hashlib, pathlib, sys, datetime
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5081'
ROOT=pathlib.Path(__file__).resolve().parents[1]
FIX=ROOT/'tests'/'fixtures'; FIX.mkdir(exist_ok=True)
OUT=ROOT/'docs'; OUT.mkdir(exist_ok=True)
def png(w=2,h=2):
 def chunk(k,b): return struct.pack('>I',len(b))+k+b+struct.pack('>I',zlib.crc32(k+b)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\x64\x90\x50'*w)*min(h,2)))+chunk(b'IEND',b'')
def pdf():
 objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Contents 4 0 R /Resources << >> >>',b'<< /Length 0 >>\nstream\n\nendstream']
 data=b'%PDF-1.4\n'; offsets=[0]
 for i,obj in enumerate(objects,1): offsets.append(len(data));data+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
 x=len(data);data+=b'xref\n0 5\n0000000000 65535 f \n'+b''.join(f'{o:010} 00000 n \n'.encode() for o in offsets[1:]);return data+f'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n'.encode()
PNG=png(); PDF=pdf()
(FIX/'campus-notes.pdf').write_bytes(PDF);(FIX/'campus-photo.png').write_bytes(PNG);(FIX/'disguised.png').write_bytes(b'This is plain text, not a PNG image.');(FIX/'empty.pdf').write_bytes(b'')
class Client:
 def __init__(self): self.opener=U.build_opener(U.HTTPCookieProcessor(http.cookiejar.CookieJar()));self.token=''
 def request(self,path,method='GET',body=None,headers=None):
  headers=dict(headers or {})
  if method=='POST' and self.token:headers['X-CSRF-TOKEN']=self.token
  try:
   with self.opener.open(U.Request(BASE+path,data=body,method=method,headers=headers)) as r:return r.status,r.read(),dict(r.headers)
  except urllib.error.HTTPError as e:return e.code,e.read(),dict(e.headers)
 def csrf(self):self.token=json.loads(self.request('/api/csrf')[1])['token']
 def login(self,user,pw=None):
  self.csrf();r=self.request('/api/login','POST',json.dumps({'username':user,'password':pw or user.title()+'Demo!2026'}).encode(),{'Content-Type':'application/json'});self.csrf();return r
 def upload(self,name,data,mime='image/png',field='file'):
  boundary=uuid.uuid4().hex
  body=f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode()+data+f'\r\n--{boundary}--\r\n'.encode()
  return self.request('/api/files','POST',body,{'Content-Type':'multipart/form-data; boundary='+boundary})
results=[]
def check(case,response,status,detail='',predicate=None):
 actual=response[0];ok=actual==status and (predicate is None or predicate(response))
 try:body=json.loads(response[1])
 except:body=None
 results.append({'case':case,'expected':str(status)+' '+detail,'actual':str(actual)+(' '+json.dumps(body,ensure_ascii=True) if body is not None and not isinstance(body,list) else ''),'passed':ok,'defect':'—' if ok else 'Investigate'})
 print(('PASS' if ok else 'FAIL')+' '+case+' '+str(actual));return response
anon=Client();alice=Client();bob=Client()
check('Anonymous upload denied',anon.upload('photo.png',PNG),401)
check('Anonymous library denied',anon.request('/api/files'),401)
check('Wrong password rejected',alice.login('alice','wrong'),401)
check('Alice signs in',alice.login('alice'),200)
check('Bob signs in',bob.login('bob'),200)
a=check('Valid PNG accepted',alice.upload('campus-photo.png',PNG),201,predicate=lambda r:json.loads(r[1])['status']=='Available');record=json.loads(a[1]);fid=record['id']
check('Owner download returns original bytes',alice.request('/api/files/'+fid),200,'identical bytes and attachment',lambda r:r[1]==PNG and 'attachment' in r[2].get('Content-Disposition','') and r[2].get('X-Content-Type-Options')=='nosniff')
check('Other owner cannot retrieve known ID',bob.request('/api/files/'+fid),404)
check('Anonymous cannot retrieve known ID',anon.request('/api/files/'+fid),401)
check('Library contains only owner metadata',bob.request('/api/files'),200,'empty list',lambda r:json.loads(r[1])==[])
check('Valid PDF accepted',alice.upload('campus-notes.pdf',PDF,'application/pdf'),201)
check('Zero byte PDF rejected',alice.upload('empty.pdf',b'','application/pdf'),400)
check('Oversized file rejected',alice.upload('large.png',b'x'*5_000_001),400)
# Verify early rejection from Content-Length without transmitting a giant body.
conn=http.client.HTTPConnection(BASE.split('//')[1]);conn.putrequest('POST','/api/files');conn.putheader('Content-Length','5300000');conn.endheaders();resp=conn.getresponse()
check('Request body ceiling enforced before reading body',(resp.status,resp.read(),dict(resp.headers)),413);conn.close()
check('Unsupported extension rejected',alice.upload('program.exe',b'MZ','application/octet-stream'),400)
check('Double extension rejected',alice.upload('report.pdf.exe',PDF,'application/pdf'),400)
check('Text disguised as PNG rejected',alice.upload('disguised.png',b'This is plain text, not a PNG image.'),400)
check('PNG signature with corrupt payload rejected',alice.upload('broken.png',PNG[:33]),400)
check('Invalid PDF rejected',alice.upload('broken.pdf',b'%PDF-1.4\nnot a document','application/pdf'),400)
check('Declared MIME mismatch rejected',alice.upload('wrong.png',PNG,'application/pdf'),400)
check('Extension/content mismatch rejected',alice.upload('wrong.jpg',PNG,'image/jpeg'),400)
check('Extreme image dimensions rejected',alice.upload('huge-dimensions.png',png(9000,2)),400)
check('Wrong multipart field rejected',alice.upload('wrong.png',PNG,field='other'),400)
check('Duplicate display name uses new ID',alice.upload('campus-photo.png',PNG),201,'new generated ID',lambda r:json.loads(r[1])['id']!=fid)
check('Path in supplied name reduced to basename',alice.upload('../outside.png',PNG),201,'display name outside.png',lambda r:json.loads(r[1])['originalName']=='outside.png')
check('Long filename rejected',alice.upload('a'*181+'.png',PNG),400)
check('Nonexistent file returns 404',alice.request('/api/files/'+str(uuid.uuid4())),404)
saved=alice.token;alice.token='';check('Missing CSRF upload token rejected',alice.upload('csrf.png',PNG),400);alice.token=saved
before=len(json.loads(alice.request('/api/files')[1]));alice.upload('reject.png',b'bad');after=len(json.loads(alice.request('/api/files')[1]))
check('Rejected upload leaves metadata unchanged',(200 if before==after else 500,b'',{}),200)
# A valid PDF padded with a comment before EOF tests the exact accepted byte boundary.
limit=PDF[:-6]+b'%' + b' '* (5_000_000-len(PDF)-2)+b'\n'+PDF[-6:]
assert len(limit)==5_000_000
check('Valid PDF exactly at 5 MB accepted',alice.upload('at-limit.pdf',limit,'application/pdf'),201)
if os.environ.get('StorageRoot'):
 db=pathlib.Path(os.environ['StorageRoot'])/'metadata.db';conn=sqlite3.connect(db)
 blobs=set(db.parent.glob('*.blob'));conn.execute("CREATE TRIGGER TestFailure BEFORE INSERT ON Files BEGIN SELECT RAISE(ABORT, 'test-only metadata failure'); END");conn.commit()
 try:check('Metadata failure returns 503 and cleans bytes',alice.upload('failure.png',PNG),503,'no orphan blob',lambda r:set(db.parent.glob('*.blob'))==blobs)
 finally:conn.execute('DROP TRIGGER TestFailure');conn.commit();conn.close()
check('Logout succeeds',alice.request('/api/logout','POST'),204)
check('Signed-out retrieval denied',alice.request('/api/files/'+fid),401)
check('Private storage has no static route',anon.request('/private/'+fid+'.blob'),404)
(OUT/'test-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
lines=['# Week 10 test record','', 'Executed: '+datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(), '', 'Real HTTP integration tests against a dedicated local ASP.NET Core instance. Test fixtures are synthetic; no personal documents are used.','', '| Case | Expected | Actual | Result | Defect |','|---|---|---|---|---|']
for r in results:lines.append('| '+r['case']+' | '+r['expected']+' | '+r['actual'].replace('|','\\|')+' | '+('PASS' if r['passed'] else 'FAIL')+' | '+r['defect']+' |')
(OUT/'TEST-RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f'{sum(r["passed"] for r in results)}/{len(results)} passed')
sys.exit(0 if all(r['passed'] for r in results) else 1)
