import {build} from 'vite';
import fs from 'node:fs/promises';
await build({configFile:'vite.pages.config.ts'});
// Real directory entrypoints make direct links and reloads work on GitHub Pages.
const html=await fs.readFile('dist-pages/index.html');
for(const route of ['catalog','assembly','components','research']){
 await fs.mkdir(`dist-pages/${route}`,{recursive:true});
 await fs.writeFile(`dist-pages/${route}/index.html`,html);
}
await fs.writeFile('dist-pages/404.html',html);
await fs.writeFile('dist-pages/.nojekyll','');
