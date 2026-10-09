import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.PAGES_BASE_PATH||'/wrenchwise/';
for(const path of ['index.html','catalog/index.html','assembly/index.html','components/index.html','research/index.html','404.html']){
 const html=fs.readFileSync('dist-pages/'+path,'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^\"]+)"/g)){
  assert(match[1].startsWith(base),`${path}: ${match[1]} escapes Pages base`);
  assert(fs.existsSync('dist-pages/'+match[1].slice(base.length)),`${path}: missing ${match[1]}`);
 }
}
const catalog=JSON.parse(fs.readFileSync('public/research/vehicle-catalog.json'));
for(const r of [...catalog.records,...catalog.engines])if(r.assetUrl)assert(fs.existsSync('dist-pages'+r.assetUrl),`Missing model ${r.id}`);
for(const path of ['models/gs300-parts.json','models/gs300-evidence.json','models/components/2jz-ge-vvti-parts.json'])assert(fs.existsSync('dist-pages/'+path));
assert(!fs.existsSync('dist-pages/api'),'Server endpoints must not be shipped as static API responses');
for(const file of fs.readdirSync('dist-pages/assets').filter(f=>f.endsWith('.js'))){
 const js=fs.readFileSync('dist-pages/assets/'+file,'utf8');
 assert(!js.includes('wrenchwise-workshop.zhandolia.chatgpt.site'),`Runtime still depends on prior host: ${file}`);
 assert(!js.includes('fetch("/api/'),`Root API fetch in ${file}`);
}
console.log('Pages routes, repo-prefixed entrypoints, model assets and host independence verified.');
