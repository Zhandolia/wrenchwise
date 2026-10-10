import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectDeploymentFiles,digest,validateDeploymentManifest,verifyFileBytes} from '../scripts/deployment-manifest.mjs';
test('deployment inventory includes nested lazy chunks, styles, research and non-library models',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'wrenchwise-release-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const inputs={'index.html':'<main/>','assets/library-abc.js':'export default 1','assets/library-abc.css':'body{}','research/ls-review.json':'{}','models/assembly.glb':'glTF','build-info.json':'{}','deployment-manifest.json':'{}'};
 for(const [name,contents] of Object.entries(inputs)){await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),contents);}
 const files=await collectDeploymentFiles(root);
 assert.equal(files.length,5);assert(files.some(f=>f.path==='assets/library-abc.js'));assert(files.some(f=>f.path==='models/assembly.glb'));
 validateDeploymentManifest({version:1,files});
 for(const file of files)verifyFileBytes(file,await fs.readFile(path.join(root,file.path)));
 // A stale chunk with the same byte length must fail, even if its HTTP status is 200.
 const file=files.find(f=>f.path==='assets/library-abc.js');
 assert.throws(()=>verifyFileBytes(file,Buffer.from('export default 2')),/hash mismatch/);
 assert.throws(()=>verifyFileBytes(file,Buffer.from('short')),/truncated/);
});
test('deployment inventory rejects traversal, duplicate paths and malformed hashes',()=>{
 const file={path:'assets/page.js',bytes:1,sha256:digest('x')};
 for(const unsafe of ['../secret','/outside','assets/../../secret','https://example.com/x','assets//x','assets/x?query','assets\\x'])assert.throws(()=>validateDeploymentManifest({version:1,files:[{...file,path:unsafe}]}),/Unsafe/);
 assert.throws(()=>validateDeploymentManifest({version:1,files:[file,file]}),/Duplicate/);
 assert.throws(()=>validateDeploymentManifest({version:1,files:[{...file,sha256:'wrong'}]}),/hash/);
});
