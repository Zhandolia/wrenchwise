import {build} from 'vite';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
await build({configFile:'vite.pages.config.ts'});
// Real directory entrypoints make direct links and reloads work on GitHub Pages.
const html=await fs.readFile('dist-pages/index.html');
for(const route of ['catalog','assembly','components','research','library']){
 await fs.mkdir(`dist-pages/${route}`,{recursive:true});
 await fs.writeFile(`dist-pages/${route}/index.html`,html);
}
await fs.writeFile('dist-pages/404.html',html);
await fs.writeFile('dist-pages/.nojekyll','');
const manifest=await fs.readFile('public/research/model-library.json');
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await fs.writeFile('dist-pages/build-info.json',JSON.stringify({revision,builtAt:new Date().toISOString(),libraryModels:JSON.parse(manifest).models.length,libraryManifestSha256:createHash('sha256').update(manifest).digest('hex')},null,2)+'\n');
