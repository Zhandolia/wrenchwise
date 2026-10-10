/** Install the pinned tools in work/tools/gltf, then run after build.mjs. */
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
const require=createRequire(path.resolve(process.argv[2]||'work/tools/gltf','package.json'));
const dependency=s=>import(pathToFileURL(require.resolve(s)).href);
const {NodeIO}=await dependency('@gltf-transform/core');
const {ALL_EXTENSIONS}=await dependency('@gltf-transform/extensions');
const {weld,meshopt,prune,dedup}=await dependency('@gltf-transform/functions');
const {MeshoptEncoder,MeshoptDecoder}=await dependency('meshoptimizer');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const index=JSON.parse(fs.readFileSync('research/lexus-ls-originals.json'));
for(const model of index.models){
 if(process.argv[3]&&model.id!==process.argv[3])continue;
 const file='public'+model.assetUrl,doc=await io.read(file);
 await doc.transform(weld(),dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
 const bytes=await io.writeBinary(doc);fs.writeFileSync(file,bytes);
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 const manifest=JSON.parse(fs.readFileSync('public'+model.manifestUrl));
 manifest.bytes=model.bytes=bytes.length;manifest.sha256=model.sha256=sha256;manifest.encoding='EXT_meshopt_compression';manifest.triangleCount=doc.getRoot().listNodes().reduce((sum,n)=>sum+(n.getMesh()?.listPrimitives().reduce((v,p)=>v+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0)||0),0);
 fs.writeFileSync('public'+model.manifestUrl,JSON.stringify(manifest,null,2)+'\n');
 console.log(`${model.id}: ${(bytes.length/1024/1024).toFixed(2)} MiB`);
}
for(const file of ['research/lexus-ls-originals.json','public/research/lexus-ls-originals.json'])fs.writeFileSync(file,JSON.stringify(index,null,2)+'\n');
