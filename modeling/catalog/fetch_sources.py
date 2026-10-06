"""Fetch the two audited CC BY source meshes from the public Objaverse distribution."""
import hashlib,json,sys,urllib.request
from pathlib import Path
repo=Path(__file__).resolve().parents[2]
out=Path(sys.argv[1]) if len(sys.argv)>1 else repo/'work/catalog-sources'
out.mkdir(parents=True,exist_ok=True)
for source in json.loads((repo/'research/asset-licenses.json').read_text()):
 path=out/(source['sourceUID']+'.glb')
 if not path.exists():urllib.request.urlretrieve(source['publicMirror'],path)
 if hashlib.sha256(path.read_bytes()).hexdigest()!=source['sourceSha256']:
  raise RuntimeError('Source changed; inspect new file and license before use: '+source['vehicle'])
 print(source['vehicle'],path)
