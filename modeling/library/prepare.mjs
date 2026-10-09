import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

// Run from the repository root; install the pinned conversion dependencies in a separate tools directory.
const [sourceDir,toolsDir,outputDir='work/library-rebuilt',onlyId]=process.argv.slice(2);
if(!sourceDir||!toolsDir)throw Error('Usage: node modeling/library/prepare.mjs <download-directory> <tools-directory> [output-directory] [model-id]');
const require=createRequire(path.resolve(toolsDir,'package.json'));
const dependency=specifier=>import(pathToFileURL(require.resolve(specifier)).href);
const {NodeIO}=await dependency('@gltf-transform/core');
const {ALL_EXTENSIONS}=await dependency('@gltf-transform/extensions');
const {metalRough,meshopt,getBounds,prune}=await dependency('@gltf-transform/functions');
const {MeshoptEncoder,MeshoptDecoder}=await dependency('meshoptimizer');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync('research/model-library.json'));
fs.mkdirSync(outputDir,{recursive:true});
const results=[];
for(const m of manifest.models.filter(m=>!onlyId||m.id===onlyId)){
 const sourcePath=path.join(sourceDir,m.sourceFilename),source=fs.readFileSync(sourcePath);
 if(sha(source)!==m.sourceSha256)throw Error(`Source hash changed: ${m.id}`);
 if(m.license!=='CC BY 4.0')throw Error(`Review license before conversion: ${m.id}`);
 const doc=await io.read(sourcePath),root=doc.getRoot(),scene=root.getDefaultScene()||root.listScenes()[0];
 if(m.id==='lexus-rx-350-rigged-rigged-driver-human-6b9a19'){
  for(const n of root.listNodes())if(n.getSkin()){n.setMesh(null);n.setSkin(null);}
  await doc.transform(prune());
 }
 const b=getBounds(scene),size=b.max.map((v,i)=>v-b.min[i]);
 if(!size.every(Number.isFinite)||Math.max(...size)<=0)throw Error(`Invalid bounds: ${m.id}`);
 const scale=4.8/Math.max(...size),center=b.max.map((v,i)=>(v+b.min[i])/2);
 const parent=doc.createNode('Wrenchwise display normalization').setScale([scale,scale,scale]).setTranslation(center.map(v=>-v*scale));
 for(const n of [...scene.listChildren()]){scene.removeChild(n);parent.addChild(n);}scene.addChild(parent);
 let count=0;
 for(const n of root.listNodes()){n.setCamera(null);if(n.getMesh())n.setExtras({...n.getExtras(),partId:`${m.id}-${++count}`,system:'body',accuracy:'unverified'});}
 root.setExtras({...root.getExtras(),title:m.title,author:m.author,authorUrl:m.authorUrl,sourceUrl:m.sourceUrl,license:m.license,licenseUrl:m.licenseUrl,sourceSha256:m.sourceSha256,additionalCredits:m.additionalCredits,changes:m.changes,scope:manifest.scope});
 if(root.listExtensionsUsed().some(e=>e.extensionName==='KHR_materials_pbrSpecularGlossiness'))await doc.transform(metalRough());
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16}));
 const output=path.join(outputDir,path.basename(m.assetUrl));await io.write(output,doc);
 const bytes=fs.readFileSync(output);results.push({id:m.id,bytes:bytes.length,sha256:sha(bytes)});
 console.log(`${m.id}: ${(bytes.length/1e6).toFixed(2)} MB`);
}
if(!results.length)throw Error('No matching models');
fs.writeFileSync(path.join(outputDir,'export-results.json'),JSON.stringify(results,null,2)+'\n');
