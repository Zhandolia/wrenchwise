import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('public/models/components/2jz-ge-vvti-parts.json'));
test('component export preserves source part IDs, metric scene and uncertainty',()=>{
 const b=fs.readFileSync('public/models/components/2jz-ge-vvti.glb');
 assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);assert(b.length<5*1024*1024);
 const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 const ids=g.nodes.filter(n=>n.extras?.partId).map(n=>n.extras.partId);
 assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,212);
 assert.deepEqual(ids.sort(),manifest.parts.map(p=>p.id).sort());
 const source=JSON.parse(fs.readFileSync('public/models/gs300-parts.json'));
 for(const p of manifest.parts){assert(source.parts.some(s=>s.id===p.id&&s.status==='modeled'));assert.equal(p.accuracy,'unverified');assert(['core','installation'].includes(p.layer));}
 assert.equal(manifest.units,'metres');assert.equal(manifest.verifiedParts,0);assert.deepEqual(manifest.approvedVehicleIds,[]);assert.deepEqual(manifest.studyVehicleIds,['gs300']);
 for(const n of g.nodes.filter(n=>n.extras?.partId)){assert.equal(n.extras.componentId,manifest.componentId);assert.equal(n.extras.accuracy,'unverified');}
 assert(g.buffers.every(b=>!b.uri));assert(g.extensionsUsed.includes('EXT_meshopt_compression'));
});
test('vehicle sump and bolt-on equipment are excluded from core reuse layer',()=>{
 for(const id of ['oil-pan-lower','oil-pan-upper','alternator','ac-compressor','water-pump','intake-plenum'])assert.equal(manifest.parts.find(p=>p.id===id).layer,'installation');
 assert(!manifest.parts.some(p=>['body','transmission','interior','structure'].includes(p.system)));
 assert(!manifest.parts.some(p=>['radiator','fuel-tank','airbox'].includes(p.id)));
});
