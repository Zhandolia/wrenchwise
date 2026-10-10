import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MeshPhysicalMaterial,Texture} from 'three';
import fs from 'node:fs';
import {silverPaintMaterials,applyVehicleFinish} from '../lib/vehicle-finish.mjs';
test('silver finish affects only approved opaque paint and preserves source materials',()=>{
 const source=new MeshPhysicalMaterial({color:'#125734'});source.name='1998 dark emerald pearl';
 const clone=source.clone();assert(applyVehicleFinish(clone,'/models/ls/lexus-ls-ucf20.glb?v=abc'));
 assert.equal(clone.color.getHexString(),'aeb4b8');assert.equal(source.color.getHexString(),'125734');
 for(const name of ['ruby red tail lamp','subtly green tinted glazing','VVT-i cast aluminium','seals and shut lines']){
  const material=source.clone();material.name=name;assert.equal(applyVehicleFinish(material,'/models/ls/lexus-ls-ucf20.glb'),false);assert.equal(material.color.getHexString(),'125734');
 }
 const mapped=source.clone();mapped.map=new Texture();assert.equal(applyVehicleFinish(mapped,'/models/ls/lexus-ls-ucf20.glb'),false);
 assert.equal(applyVehicleFinish(source.clone(),'/models/unreviewed.glb'),false);
});
test('approved paint names exist in shipped assets and have no shared colour atlas',()=>{
 const files=[...fs.readdirSync('public/models/ls').filter(f=>f.endsWith('.glb')).map(f=>'public/models/ls/'+f),...fs.readdirSync('public/models/library').filter(f=>f.endsWith('.glb')).map(f=>'public/models/library/'+f),'public/models/gs300-assembly.glb'];
 for(const [id,names] of Object.entries(silverPaintMaterials)){
  const path=files.find(f=>f.endsWith('/'+id+'.glb'));assert(path,id);
  const b=fs.readFileSync(path),g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  for(const name of names){const m=g.materials.find(m=>m.name===name);assert(m,id+': '+name);assert(!m.pbrMetallicRoughness?.baseColorTexture,id+': textured paint needs a mask');assert(!m.alphaMode||m.alphaMode==='OPAQUE');}
 }
});
