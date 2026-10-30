import {collectDeploymentFiles,digest,validateDeploymentManifest} from './deployment-manifest.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
assert(fs.existsSync('dist-pages/.nojekyll'),'Missing Pages build-control marker');
const base=process.env.PAGES_BASE_PATH||'/wrenchwise/';
for(const path of ['index.html','guide/index.html','archive/index.html','workshop/index.html','catalog/index.html','assembly/index.html','components/index.html','research/index.html','library/index.html','404.html']){
 const html=fs.readFileSync('dist-pages/'+path,'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^\"]+)"/g)){
  assert(match[1].startsWith(base),`${path}: ${match[1]} escapes Pages base`);
  assert(fs.existsSync('dist-pages/'+match[1].slice(base.length)),`${path}: missing ${match[1]}`);
 }
}
const catalog=JSON.parse(fs.readFileSync('public/research/vehicle-catalog.json'));
for(const r of [...catalog.records,...catalog.engines])if(r.assetUrl)assert(fs.existsSync('dist-pages'+r.assetUrl),`Missing model ${r.id}`);
for(const path of ['models/gs300-parts.json','models/gs300-evidence.json','models/components/2jz-ge-vvti-parts.json'])assert(fs.existsSync('dist-pages/'+path));
// The primary flow's assembly: manifest, every declared layer and the illustration fallback.
const releases=JSON.parse(fs.readFileSync('content/releases.json','utf8'));
const release=releases.releases.find(entry=>entry.id===releases.current);
for(const asset of release.assets)assert(fs.existsSync('dist-pages/'+asset.path.replace(/^public\//,'')),`Missing release asset ${asset.path}`);
for(const procedure of fs.readdirSync('content/procedures').filter(f=>f.endsWith('.json'))){
 const {assembly}=JSON.parse(fs.readFileSync('content/procedures/'+procedure,'utf8'));
 const manifestPath=`dist-pages/assets/${assembly}/assembly.json`;
 assert(fs.existsSync(manifestPath),`Missing assembly manifest for ${assembly}`);
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const file of manifest.files){
  const bytes=fs.readFileSync(`dist-pages/assets/${assembly}/${file.file}`);
  assert.equal(bytes.length,file.byteLength,`${assembly}/${file.file} size differs from the manifest`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,`${assembly}/${file.file} hash differs from the manifest`);
 }
 assert(fs.existsSync(`dist-pages/assets/${assembly}/layout.svg`),`Missing illustration fallback for ${assembly}`);
}
assert(!fs.existsSync('dist-pages/api'),'Server endpoints must not be shipped as static API responses');
for(const file of fs.readdirSync('dist-pages/assets').filter(f=>f.endsWith('.js'))){
 const js=fs.readFileSync('dist-pages/assets/'+file,'utf8');
 assert(!js.includes('wrenchwise-workshop.zhandolia.chatgpt.site'),`Runtime still depends on prior host: ${file}`);
 assert(!js.includes('fetch("/api/'),`Root API fetch in ${file}`);
}
console.log('Pages routes, repo-prefixed entrypoints, model assets and host independence verified.');

const library=JSON.parse(fs.readFileSync("public/research/model-library.json"));
const ls=JSON.parse(fs.readFileSync('public/research/lexus-ls-originals.json'));
for(const m of ls.models){
 assert(fs.existsSync('dist-pages'+m.manifestUrl),`Missing original study inventory ${m.id}`);
 const bytes=fs.readFileSync('dist-pages'+m.assetUrl);
 assert.equal(bytes.length,m.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),m.sha256);
}
for(const m of library.models)assert(fs.existsSync("dist-pages"+m.assetUrl),`Missing library model ${m.id}`);
const buildInfo=JSON.parse(fs.readFileSync('dist-pages/build-info.json'));
assert(/^[a-f0-9]{40}$/.test(buildInfo.revision));
assert.equal(buildInfo.libraryModels,library.models.length);
assert.equal(buildInfo.libraryManifestSha256,createHash('sha256').update(fs.readFileSync('dist-pages/research/model-library.json')).digest('hex'));

const deploymentBytes=fs.readFileSync('dist-pages/deployment-manifest.json');
const deployment=JSON.parse(deploymentBytes);
validateDeploymentManifest(deployment);
assert.equal(buildInfo.deploymentManifestSha256,digest(deploymentBytes));
assert.equal(buildInfo.deploymentFiles,deployment.files.length);
assert.deepEqual(deployment.files,await collectDeploymentFiles('dist-pages'),'Build files differ from deployment inventory');
console.log(`Verified complete deployment inventory: ${deployment.files.length} files, including all lazy chunks and evidence assets.`);
