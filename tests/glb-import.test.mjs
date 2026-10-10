import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectGlb} from '../lib/glb.ts';

function glb(manifest){
 const text=JSON.stringify({asset:{version:'2.0'},meshes:[{primitives:[]}],...manifest});
 const json=Buffer.from(text+' '.repeat((4-Buffer.byteLength(text)%4)%4));
 const bytes=new ArrayBuffer(json.length+20),view=new DataView(bytes);
 for(const [offset,value] of [[0,0x46546c67],[4,2],[8,bytes.byteLength],[12,json.length],[16,0x4e4f534a]])view.setUint32(offset,value,true);
 new Uint8Array(bytes,20).set(json);
 return bytes;
}

test('the downloadable Meshopt library model passes local-import inspection',()=>{
 const file=fs.readFileSync('public/models/library/lexus-sc300-1993-2070ca.glb');
 const model=inspectGlb(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
 assert.deepEqual(model.extensionsRequired,['EXT_meshopt_compression','KHR_mesh_quantization']);
});

test('unsupported decoders and external resources remain rejected',()=>{
 assert.throws(()=>inspectGlb(glb({extensionsRequired:['KHR_draco_mesh_compression']})),/unsupported extension/);
 assert.throws(()=>inspectGlb(glb({images:[{uri:'https://example.com/texture.png'}]})),/self-contained/);
});

test('small compressed input cannot request huge or inconsistent output allocations',()=>{
 const compressed=(count,byteStride,byteLength)=>({bufferViews:[{byteLength,extensions:{EXT_meshopt_compression:{count,byteStride}}}]});
 assert.throws(()=>inspectGlb(glb({buffers:[{byteLength:257*1024*1024}]})),/256 MB/);
 assert.throws(()=>inspectGlb(glb(compressed(100000000,16,1600000000))),/256 MB/);
 assert.throws(()=>inspectGlb(glb(compressed(100,16,1))),/does not match/);
 assert.throws(()=>inspectGlb(glb(compressed(-1,16,-16))),/256 MB/);
 const many=compressed(10000000,16,160000000);
 many.bufferViews.push({...many.bufferViews[0]});
 assert.throws(()=>inspectGlb(glb(many)),/256 MB/);
});
