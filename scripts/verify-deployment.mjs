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
for(const route of ['','catalog/','library/','assembly/','components/','research/']){
 const html=(await get(route)).toString();
 assert(html.includes('id="root"'),`Missing app entrypoint: ${route}`);
 for(const [,src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)){
  assert(src.startsWith(base.pathname),'Script escapes deployment base');
  await get(src.slice(base.pathname.length));
 }
}
const queue=[...manifest.models];
await Promise.all(Array.from({length:3},async()=>{
 while(queue.length){
  const model=queue.shift();
  assert(/^\/models\/library\/[a-z0-9-]+\.glb$/.test(model.assetUrl));
  const bytes=await get(model.assetUrl.slice(1));
  assert.equal(bytes.length,model.bytes,`${model.id}: truncated download`);
  assert.equal(sha(bytes),model.sha256,`${model.id}: deployed model hash mismatch`);
 }
}));
console.log(`Verified deployed commit ${revision}: six routes and all ${manifest.models.length} model downloads match the published manifest.`);
