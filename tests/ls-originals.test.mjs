import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Box3,Vector3,MeshBasicMaterial} from 'three';
import {matchesLibraryModel} from '../lib/library-search.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const index=read('research/lexus-ls-originals.json');

test('four original LS generations have independent provenance, searchable generation ranges and matching public files',()=>{
 assert.deepEqual(index,read('public/research/lexus-ls-originals.json'));
 assert.deepEqual(index.models.map(m=>m.id),['lexus-ls-ucf10','lexus-ls-ucf20','lexus-ls-ucf30','lexus-ls-xf40']);
 assert.equal(new Set(index.models.map(m=>m.sha256)).size,4);
 for(const m of index.models){
  assert.equal(m.author,'Wrenchwise');assert(matchesLibraryModel(m,'LS '+m.generation.split(' ')[0]));
  const b=fs.readFileSync('public'+m.assetUrl),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12))),manifest=read('public'+m.manifestUrl);
  assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);assert.equal(b.length,m.bytes);assert(b.length<2*1024*1024);
  assert.equal(manifest.sha256,m.sha256);assert.equal(manifest.verifiedParts,0);assert.equal(manifest.kind,'original-provisional-study');
  assert(g.asset.copyright.includes('Original geometry'));assert(g.asset.copyright.includes('MIT'));assert(g.extensionsUsed.includes('EXT_meshopt_compression'));assert(g.buffers.every(x=>!x.uri));assert(!g.images?.length);
  const ids=g.nodes.filter(n=>n.extras?.partId).map(n=>n.extras.partId);
  assert.equal(new Set(ids).size,ids.length);assert.deepEqual(ids.sort(),manifest.parts.map(p=>p.id).sort());
  for(const part of ['hood','engine-block','cam-cover--1','cam-cover-1','battery','air-cleaner','radiator','alternator','oil-cap'])assert(ids.includes(part),m.id+': '+part);
  assert(manifest.parts.every(p=>p.accuracy==='estimated'));assert(m.sourceIds.every(id=>index.sources.some(s=>s.id===id)));
  assert(Math.abs(manifest.wheelCentersMetres.front-manifest.wheelCentersMetres.rear-m.nominalDimensionsMetres.wheelbase)<1e-9);
 }
 assert(matchesLibraryModel(index.models[1],'LS400 1997'));
 assert.equal(index.models[0].engine,'1UZ-FE');assert.equal(index.models[1].engine,'1UZ-FE VVT-i');assert.equal(index.models[2].engine,'3UZ-FE');assert.equal(index.models[3].engine,'1UR-FSE');
 assert(!index.models[3].name.includes('600h'));
});

test('decoded LS assets preserve finite geometry, envelope targets, wheelbase and engine-bay selection',async()=>{
 for(const model of index.models){
  const b=fs.readFileSync('public'+model.assetUrl),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'geometry-only',loadMaterial:()=>Promise.resolve(new MeshBasicMaterial())})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  const root=gltf.scene;root.updateMatrixWorld(true);const size=new Box3().setFromObject(root,true).getSize(new Vector3()),manifest=read('public'+model.manifestUrl);
  for(const axis of ['x','y','z'])assert(Math.abs(size[axis]-manifest.boundsMetres[axis])<.003);
  assert(Math.abs(size.z-model.nominalDimensionsMetres.length)<.10,'Trim envelope must remain near published length');
  assert(Math.abs(size.y-model.nominalDimensionsMetres.height)<.04,'Roof envelope');
  const byId=new Map();root.traverse(o=>{if(o.isMesh){byId.set(o.userData.partId,o);for(const x of o.geometry.attributes.position.array)assert(Number.isFinite(x));}});
  const position=id=>new Box3().setFromObject(byId.get(id),true).getCenter(new Vector3());
  assert(Math.abs(position('wheel-0-1-hub').z-position('wheel-1-1-hub').z-model.nominalDimensionsMetres.wheelbase)<.003);
  assert(position('cam-cover--1').x<0);assert(position('cam-cover-1').x>0);
  assert(position('radiator').z>position('engine-block').z);assert(position('hood').y>position('engine-block').y);
  assert.equal(byId.get('battery').userData.system,'electrical');assert.equal(byId.get('hood').userData.system,'body');
 }
});
