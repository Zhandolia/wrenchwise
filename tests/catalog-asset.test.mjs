import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Supra export preserves selectable IDs, license and embedded compressed geometry',()=>{
 const raw=fs.readFileSync('public/models/catalog/gr-supra-reference.glb');
 assert.equal(raw.toString('ascii',0,4),'glTF');assert.equal(raw.readUInt32LE(8),raw.length);assert(raw.length<20*1024*1024);
 const gltf=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12)));
 assert(gltf.extensionsUsed.includes('EXT_meshopt_compression'));assert(gltf.asset.copyright.includes('3dmodels.cars'));assert(gltf.asset.copyright.includes('CC BY 4.0'));
 assert(gltf.buffers.every(b=>!b.uri));
 const parts=JSON.parse(fs.readFileSync('public/models/catalog/gr-supra-parts.json')).parts;
 const ids=gltf.nodes.filter(n=>n.extras?.partId).map(n=>n.extras.partId);
 assert.equal(new Set(ids).size,ids.length);assert.deepEqual(ids.sort(),parts.map(p=>p.id).sort());
 assert(parts.every(p=>p.accuracy==='unverified'));assert(!parts.some(p=>['engine','transmission'].includes(p.system)));
});
