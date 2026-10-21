"""Package only committed source and public lab evidence, plus portable Git history."""
from pathlib import Path
import subprocess,zipfile,hashlib
root=Path(__file__).resolve().parents[1];out=root.parent/'CampusDocumentHub-Week10-Submission.zip';art=root/'artifacts';art.mkdir(exist_ok=True)
if subprocess.check_output(['git','status','--porcelain'],cwd=root).strip():raise SystemExit('Commit changes before packaging.')
bundle=art/'CampusDocumentHub.git.bundle';subprocess.run(['git','bundle','create',str(bundle),'--all'],cwd=root,check=True)
evidence=subprocess.check_output(['git','log','-1','--format=fuller','--stat'],cwd=root)
paths=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for name in filter(None,paths):z.write(root/name,'CampusDocumentHub/'+name)
 z.write(bundle,'CampusDocumentHub/CampusDocumentHub.git.bundle');z.writestr('CampusDocumentHub/GIT-COMMIT.txt',evidence)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert not any('/node_modules/' in n or '/bin/' in n or '/obj/' in n or '/.git/' in n or n.endswith('.db') or n.endswith('.blob') for n in z.namelist())
 assert any(n.endswith('04-rejected-upload.png') for n in z.namelist())
sha=hashlib.sha256(out.read_bytes()).hexdigest();out.with_suffix('.sha256.txt').write_text(sha+'  '+out.name+'\n')
print(str(out));print('SHA-256: '+sha)
