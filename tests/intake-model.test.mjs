import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {revisedIds as intakeIds} from '../modeling/s160/refine_intake.mjs';
import {revisedIds as airboxIds} from '../modeling/s160/refine_airbox.mjs';
import {revisedIds as factoryIds} from '../modeling/s160/refine_factory_details.mjs';
import {revisedIds as timingIds} from '../modeling/s160/refine_timing.mjs';
const revisedIds=[...intakeIds,...airboxIds,...factoryIds,...timingIds];
const raw=fs.readFileSync('public/models/gs300-assembly.glb');
const jsonLength=raw.readUInt32LE(12),g=JSON.parse(raw.toString('utf8',20,20+jsonLength));
const bin=raw.subarray(28+jsonLength);
const report=JSON.parse(fs.readFileSync('modeling/validation/s160-timing-2026-10-10.json'));
test('revised GLB retains attribution and valid embedded mesh data',()=>{
 assert.equal(raw.readUInt32LE(8),raw.length);
 assert.equal(g.buffers[0].byteLength,bin.length);
 assert(g.asset.copyright.includes('CC BY 4.0'));assert(g.asset.copyright.includes('Wrenchwise MIT'));
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),report.sha256);
 assert.deepEqual(g.nodes.filter(n=>n.extras?.surfaceRevision).map(n=>n.extras.partId).sort(),[...revisedIds].sort());
 for(const id of revisedIds){
  const node=g.nodes.find(n=>n.extras?.partId===id),p=g.meshes[node.mesh].primitives[0];
  assert.equal(node.extras.accuracy,'unverified');
  for(const index of [...Object.values(p.attributes),p.indices]){
   const a=g.accessors[index],v=g.bufferViews[a.bufferView];assert.equal(v.buffer,0);
   assert(v.byteOffset%4===0&&v.byteOffset+v.byteLength<=bin.length);
   const values=a.componentType===5126?new Float32Array(bin.buffer,bin.byteOffset+v.byteOffset,a.count*3):new Uint32Array(bin.buffer,bin.byteOffset+v.byteOffset,a.count);
   assert([...values].every(Number.isFinite));
   if(index===p.indices)assert([...values].every(i=>i<g.accessors[p.attributes.POSITION].count));
  }
 }
});
test('revised mesh bounds match the published inventory in vehicle coordinates',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/models/gs300-parts.json'));
 const matrices=[];
 function visit(i,parent){const n=g.nodes[i];const local=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3().fromArray(n.translation||[0,0,0]),new T.Quaternion().fromArray(n.rotation||[0,0,0,1]),new T.Vector3().fromArray(n.scale||[1,1,1]));matrices[i]=parent.clone().multiply(local);for(const c of n.children||[])visit(c,matrices[i]);}
 for(const i of g.scenes[g.scene||0].nodes)visit(i,new T.Matrix4());
 for(const id of revisedIds){
  const ni=g.nodes.findIndex(n=>n.extras?.partId===id),p=g.meshes[g.nodes[ni].mesh].primitives[0];
  const a=g.accessors[p.attributes.POSITION],v=g.bufferViews[a.bufferView];
  const values=new Float32Array(bin.buffer,bin.byteOffset+v.byteOffset,a.count*3),box=new T.Box3();
  for(let i=0;i<values.length;i+=3)box.expandByPoint(new T.Vector3(values[i],values[i+1],values[i+2]).applyMatrix4(matrices[ni]));
  const size=box.getSize(new T.Vector3()),expected=manifest.parts.find(p=>p.id===id).dimensionsMetres;
  for(const [i,value] of [size.x,size.z,size.y].entries())assert(Math.abs(value-expected[i])<1e-5,id+' bounds');
 }
 const actual=g.nodes.filter(n=>n.mesh!==undefined).reduce((total,n)=>total+g.meshes[n.mesh].primitives.reduce((sum,p)=>sum+(g.accessors[p.indices]?.count||g.accessors[p.attributes.POSITION].count)/3,0),0);
 assert.equal(manifest.triangleCount,actual);
});
