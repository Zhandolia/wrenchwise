import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifest=read('research/model-library.json');
const catalog=read('public/research/vehicle-catalog.json');
test('library is mirrored, attributed and kept separate from repair fitment',()=>{
 assert.deepEqual(manifest,read('public/research/model-library.json'));
 assert.equal(new Set(manifest.models.map(m=>m.id)).size,manifest.models.length);
 for(const m of manifest.models){
  assert.equal(m.physicallyVerified,false);assert.equal(m.reviewStatus,'visual-preview-reviewed');
  assert(m.notes.length>60);assert.equal(m.license,'CC BY 4.0');
  for(const key of ['sourceUrl','authorUrl','licenseUrl'])assert(new URL(m[key]).protocol==='https:');
  assert(!catalog.records.some(r=>r.assetUrl===m.assetUrl));
 }
});
for(const m of manifest.models)test(`${m.name}: self-contained GLB, preserved credits and decodable geometry`,async()=>{
 const b=fs.readFileSync('public'+m.assetUrl);
 assert.equal(b.length,m.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),m.sha256);
 assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
 const len=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len);
 assert(g.scenes[g.scene??0].nodes.length>0);
 assert.equal(g.extras.sourceSha256,m.sourceSha256);assert.equal(g.extras.author,m.author);
 assert.equal(g.extras.license,m.license);assert.deepEqual(g.extras.additionalCredits,m.additionalCredits);
 assert.deepEqual(g.extras.changes,m.changes);
 assert((g.images||[]).every(i=>!i.uri&&i.bufferView!==undefined));assert(g.buffers.every(i=>!i.uri));
 const meshNodes=g.nodes.filter(n=>n.mesh!==undefined);
 assert.equal(meshNodes.length,m.meshGroups);
 assert(meshNodes.every(n=>n.extras.system==='body'&&n.extras.accuracy==='unverified'));
 const triangles=g.meshes.flatMap(x=>x.primitives).reduce((sum,p)=>sum+g.accessors[p.indices??p.attributes.POSITION].count/3,0);
 assert.equal(triangles,m.triangles);
 await MeshoptDecoder.ready;
 for(const v of g.bufferViews){
  const c=v.extensions?.EXT_meshopt_compression;if(!c)continue;
  const source=bin.subarray(c.byteOffset??0,(c.byteOffset??0)+c.byteLength);
  assert.equal(source.length,c.byteLength);assert(c.count>0&&c.byteStride>0);
  const decoded=new Uint8Array(c.count*c.byteStride);
  MeshoptDecoder.decodeGltfBuffer(decoded,c.count,c.byteStride,source,c.mode,c.filter);
 }
});
