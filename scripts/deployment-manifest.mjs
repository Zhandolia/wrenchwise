import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const metadata=new Set(['build-info.json','deployment-manifest.json','.nojekyll']);
export async function collectDeploymentFiles(root){
 const files=[];
 async function walk(relative=''){
  for(const item of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
   const name=relative?relative+'/'+item.name:item.name;
   assert(!item.isSymbolicLink(),`Deployment must not contain symlinks: ${name}`);
   if(item.isDirectory())await walk(name);
   else if(item.isFile()&&!metadata.has(name)){
    const bytes=await fs.readFile(path.join(root,name));
    files.push({path:name,bytes:bytes.length,sha256:digest(bytes)});
   }
  }
 }
 await walk();
 return files.sort((a,b)=>a.path.localeCompare(b.path));
}
export function validateDeploymentManifest(manifest){
 assert.equal(manifest.version,1,'Unsupported deployment manifest');
 assert(Array.isArray(manifest.files)&&manifest.files.length>0,'Empty deployment manifest');
 const paths=new Set();
 for(const file of manifest.files){
  assert(typeof file.path==='string'&&/^[a-zA-Z0-9_./-]+$/.test(file.path),'Unsafe deployment path');
  assert(!file.path.split('/').some(p=>!p||p==='.'||p==='..'),'Unsafe deployment path');
  assert(!metadata.has(file.path),'Build-only or recursive deployment metadata');
  assert(!paths.has(file.path),'Duplicate deployment file');paths.add(file.path);
  assert(Number.isSafeInteger(file.bytes)&&file.bytes>=0,'Invalid deployment file size');
  assert(/^[a-f0-9]{64}$/.test(file.sha256),'Invalid deployment file hash');
 }
 return manifest.files;
}
export function verifyFileBytes(file,bytes){
 assert.equal(bytes.length,file.bytes,`${file.path}: truncated or unexpected download`);
 assert.equal(digest(bytes),file.sha256,`${file.path}: deployed file hash mismatch`);
}
