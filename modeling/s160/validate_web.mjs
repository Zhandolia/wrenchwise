import fs from 'node:fs';
import assert from 'node:assert/strict';
import {serviceStudies} from '../../lib/s160-service.ts';
const manifest=JSON.parse(fs.readFileSync('public/models/gs300-parts.json'));
const buffer=fs.readFileSync('public/models/gs300-assembly.glb');
assert.equal(buffer.toString('ascii',0,4),'glTF');
const gltf=JSON.parse(buffer.toString('utf8',20,20+buffer.readUInt32LE(12)));
const ids=new Set(manifest.parts.filter(p=>p.status==='modeled').map(p=>p.id));
const nodes=new Set(gltf.nodes.filter(n=>n.extras?.partId).map(n=>n.extras.partId));
assert.deepEqual([...nodes].sort(),[...ids].sort(),'Every modeled inventory part must have a named GLB node');
assert.equal(manifest.parts.length,new Set(manifest.parts.map(p=>p.id)).size,'Duplicate part IDs');
const sources=new Set(manifest.sources.map(s=>s.id));
for(const p of manifest.parts){assert.notEqual(p.accuracy,'verified');for(const ref of p.sourceRefs||[])assert(sources.has(ref),`${p.id}: missing source ${ref}`)}
const count=(prefix,n)=>assert.equal([...ids].filter(id=>new RegExp('^'+prefix+'[0-9]+$').test(id)).length,n,prefix);
count('trans-pan-bolt-',19);count('trans-pan-magnet-',3);count('trans-strainer-bolt-',4);count('trans-strainer-seal-',3);count('water-pump-bolt-',6);count('water-pump-pulley-nut-',4);count('valve-body-bolt-',21);count('timing-tensioner-bolt-',2);
for(const s of serviceStudies){for(const id of [...s.parts,...s.focus,...s.hidden,...Object.keys(s.offsets||{})])assert(ids.has(id),`${s.id}: unknown part ${id}`);for(const id of s.sourceIds)assert(sources.has(id),`${s.id}: unknown source ${id}`)}
assert(buffer.length<25*1024*1024,'Web asset exceeds hosting per-file budget');
assert(gltf.extensionsUsed.includes('EXT_meshopt_compression'));
console.log(JSON.stringify({version:manifest.version,modeled:ids.size,missing:manifest.parts.filter(p=>p.status==='missing').length,studies:serviceStudies.length,triangles:manifest.triangleCount,bytes:buffer.length,quantityGroupsChecked:8,verifiedParts:0}));
