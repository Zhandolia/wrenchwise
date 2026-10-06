import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p));
test('ES XV70 export retains licensed selectable geometry and metric envelope',()=>{
 const raw=fs.readFileSync('public/models/catalog/es-xv70-reference.glb');
 assert.equal(raw.toString('ascii',0,4),'glTF');assert.equal(raw.readUInt32LE(8),raw.length);assert(raw.length<8*1024*1024);
 const gltf=JSON.parse(raw.toString('utf8',20,20+raw.readUInt32LE(12)));
 assert(gltf.extensionsUsed.includes('EXT_meshopt_compression'));assert(gltf.asset.copyright.includes('David_Holiday'));assert(gltf.asset.copyright.includes('CC BY 4.0'));assert(gltf.buffers.every(b=>!b.uri));
 const m=read('public/models/catalog/es-xv70-parts.json');
 const ids=gltf.nodes.filter(n=>n.extras?.partId).map(n=>n.extras.partId);
 assert.equal(new Set(ids).size,ids.length);assert.deepEqual(ids.sort(),m.parts.map(p=>p.id).sort());
 assert(m.parts.every(p=>p.accuracy==='unverified'));assert.equal(m.verifiedParts,0);assert(!m.parts.some(p=>['engine','transmission'].includes(p.system)));
 assert(Math.abs(m.boundsMetres[1]-4.97586)<.002);
 assert(m.boundsMetres[0]>2&&m.boundsMetres[0]<2.3);assert(m.boundsMetres[2]>1.3&&m.boundsMetres[2]<1.6);
});
test('class audit does not promote candidates or the modified Altezza to stock Lexus geometry',()=>{
 const c=read('public/research/vehicle-catalog.json'), audit=read('research/lexus-class-modeling.json');
 assert.deepEqual(audit.requestedFamilies,['LS','IS','ES','GX','LX']);assert.equal(audit.completeReplicas,0);
 assert.deepEqual(audit,read('public/research/lexus-class-modeling.json'));
 const es=c.records.find(r=>r.id==='lexus-es-xv70-reference');assert.equal(es.familyId,'lexus-es');assert.equal(es.engineId,null);assert.equal(es.assetStatus,'exterior-reference');
 for(const id of ['es300','es330','ls400','ls430','gx470','lx470'])assert.equal(c.records.find(r=>r.id===id).assetUrl,null);
 assert(!c.records.some(r=>r.assetUrl?.includes('is-xe10-development')));
 const licenses=read('research/asset-licenses.json');assert(licenses.some(a=>a.vehicle===es.id&&a.sourceUrl===es.sourceUrl));
});
