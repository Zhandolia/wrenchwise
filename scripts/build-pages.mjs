import {build} from 'vite';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {collectDeploymentFiles,digest,validateDeploymentManifest} from './deployment-manifest.mjs';
await build({configFile:'vite.pages.config.ts'});
// Real directory entrypoints make direct links and reloads work on GitHub Pages.
const html=await fs.readFile('dist-pages/index.html');
for(const route of ['workshop','catalog','assembly','components','research','library']){
 await fs.mkdir(`dist-pages/${route}`,{recursive:true});
 await fs.writeFile(`dist-pages/${route}/index.html`,html);
}
await fs.writeFile('dist-pages/404.html',html);
await fs.writeFile('dist-pages/.nojekyll','');
const manifest=await fs.readFile('public/research/model-library.json');
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const deployment={version:1,files:await collectDeploymentFiles('dist-pages')};
validateDeploymentManifest(deployment);
const deploymentBytes=JSON.stringify(deployment,null,2)+'\n';
await fs.writeFile('dist-pages/deployment-manifest.json',deploymentBytes);
await fs.writeFile('dist-pages/build-info.json',JSON.stringify({revision,deploymentManifestSha256:digest(deploymentBytes),deploymentFiles:deployment.files.length,builtAt:new Date().toISOString(),libraryModels:JSON.parse(manifest).models.length,libraryManifestSha256:createHash('sha256').update(manifest).digest('hex')},null,2)+'\n');
