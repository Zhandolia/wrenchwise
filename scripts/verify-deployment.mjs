import {validateDeploymentManifest,verifyFileBytes} from './deployment-manifest.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {setTimeout} from 'node:timers/promises';

const [site,revision]=process.argv.slice(2);
assert(site&&/^[a-f0-9]{40}$/.test(revision||''),'Usage: node scripts/verify-deployment.mjs <site-url> <full-commit-sha>');
const base=new URL(site.endsWith('/')?site:site+'/');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function get(relative){
 const url=new URL(relative,base);url.searchParams.set('deployment',revision);
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(60000)});
 assert(response.ok,`${url.pathname}: HTTP ${response.status}`);
 return Buffer.from(await response.arrayBuffer());
}
// Pages can report deployment complete before all CDN edges serve the new entrypoint.
let info;
for(let attempt=0;attempt<12;attempt++){
 try{info=JSON.parse(await get('build-info.json'));assert.equal(info.revision,revision);break;}
 catch(error){if(attempt===11)throw error;await setTimeout(10000);}
}
const manifestBytes=await get('research/model-library.json');
assert.equal(sha(manifestBytes),info.libraryManifestSha256,'Deployed manifest differs from the build');
const manifest=JSON.parse(manifestBytes);
assert.equal(manifest.models.length,info.libraryModels);
for(const route of ['','workshop/','catalog/','library/','assembly/','components/','research/']){
 const html=(await get(route)).toString();
 assert(html.includes('id="root"'),`Missing app entrypoint: ${route}`);
 for(const [,src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)){
  assert(src.startsWith(base.pathname),'Script escapes deployment base');
  await get(src.slice(base.pathname.length));
 }
}
const inventoryBytes=await get('deployment-manifest.json');
assert.equal(sha(inventoryBytes),info.deploymentManifestSha256,'Deployed inventory differs from build');
const files=validateDeploymentManifest(JSON.parse(inventoryBytes));
assert.equal(files.length,info.deploymentFiles);
for(const model of manifest.models){
 const file=files.find(f=>f.path===model.assetUrl.slice(1));
 assert(file,`Missing library model in deployment inventory: ${model.id}`);
 assert.equal(file.sha256,model.sha256);assert.equal(file.bytes,model.bytes);
}
const queue=[...files];
await Promise.all(Array.from({length:3},async()=>{
 while(queue.length){
  const file=queue.shift();
  verifyFileBytes(file,await get(file.path));
 }
}));
console.log(`Verified deployed commit ${revision}: six routes and all ${files.length} files, including lazy page chunks and ${manifest.models.length} library models.`);
