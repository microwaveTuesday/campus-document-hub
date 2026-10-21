import subprocess, os, sys, pathlib, tempfile, time, urllib.request, sqlite3
root=pathlib.Path(__file__).resolve().parents[1];private=tempfile.mkdtemp(prefix='CampusHub-test-');env=os.environ.copy();env['ASPNETCORE_ENVIRONMENT']='Development';env['StorageRoot']=private
print('Isolated test storage: '+private,flush=True)
log=open(root/'artifacts'/'test-server.log','w',encoding='utf-8')
args=['dotnet',str(root/'Api/bin/Debug/net10.0/Api.dll'),'--urls','http://127.0.0.1:5081']
def start():
 p=subprocess.Popen(args,cwd=root/'Api',env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
 for _ in range(120):
  if p.poll() is not None:raise RuntimeError('Server failed. Read artifacts/test-server.log')
  try:
   with urllib.request.urlopen('http://127.0.0.1:5081/api/session',timeout=1) as r:
    if r.status==200:return p
  except:time.sleep(.25)
 p.terminate();raise RuntimeError('Server did not start')
def stop(p):
 p.terminate()
 try:p.wait(timeout=10)
 except subprocess.TimeoutExpired:p.kill();p.wait()
p=None
try:
 p=start();subprocess.run([sys.executable,'tests/integration.py'],cwd=root,env=env,check=True)
 db=sqlite3.connect(pathlib.Path(private)/'metadata.db');before=db.execute('select count(*) from Files').fetchone()[0];db.close()
 orphan=pathlib.Path(private)/'11111111-1111-1111-1111-111111111111.blob';orphan.write_bytes(b'orphan recovery fixture')
 stop(p);p=start();db=sqlite3.connect(pathlib.Path(private)/'metadata.db');after=db.execute('select count(*) from Files').fetchone()[0];db.close()
 assert before==after and before>0 and not orphan.exists()
 assert len(list(pathlib.Path(private).glob('*.blob')))==after
 (root/'docs/RECOVERY-RESULTS.md').write_text('# Restart and recovery verification\n\nPASS — persisted metadata and blobs survive a full API process restart.\n\nPASS — a simulated orphan blob without metadata is removed on restart.\n\nPASS — accepted blob count matches metadata count after recovery.\n',encoding='utf-8')
 subprocess.run(['node','Client/tests/browser.mjs','http://127.0.0.1:5081'],cwd=root,check=True)
 print('All API, recovery and browser checks passed.',flush=True)
finally:
 if p is not None:stop(p)
 log.close()
