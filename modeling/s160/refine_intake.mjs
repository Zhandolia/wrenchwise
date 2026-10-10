/** Original GS300 intake surface study, 2026-10-09. Metres, glTF Y-up.
 * node modeling/s160/refine_intake.mjs BASE_GLB OUTPUT_GLB [MANIFEST_JSON]
 * The base must be the v5 asset in commit 32b12c1. Does not require Blender.
 * Photo interpretation only: no measured diameters, routing or fitment claims.
 * Existing compressed streams, attribution, node IDs and all other parts survive.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const revisedIds=['air-intake-duct','intake-bellows','intake-clamps','maf','maf-connector'];
// Retain v5 installation endpoints. Convert Blender Z up and its -90 mm
// packaging translation to glTF. These are inherited estimates, not measurements.
export const ductPath=new T.CatmullRomCurve3([
 [-.60,-1.335,.80],[-.56,-1.18,.857],[-.45,-1.06,.971],[-.345,-1.09,.99]
].map(([x,y,z])=>new T.Vector3(x,z-.09,-y)),false,'centripetal');
export const ductRadius=.046;
const segments=160, radial=48;
const frames=ductPath.computeFrenetFrames(segments,false);
export function frameAt(u){
 const i=Math.round(u*segments), center=ductPath.getPointAt(u), tangent=ductPath.getTangentAt(u);
 const normal=frames.normals[i].clone().addScaledVector(tangent,-frames.normals[i].dot(tangent)).normalize();
 return {center,tangent,normal,binormal:new T.Vector3().crossVectors(tangent,normal).normalize()};
}
function atFrame(g,u,offset=[0,0,0]){
 const f=frameAt(u), m=new T.Matrix4().makeBasis(f.normal,f.binormal,f.tangent);
 m.setPosition(f.center.clone().addScaledVector(f.normal,offset[0]).addScaledVector(f.binormal,offset[1]).addScaledVector(f.tangent,offset[2]));
 return g.applyMatrix4(m);
}
// A thin band with a real inner surface, rather than a solid disc across the bore.
function band(radius,width,u){
 const shape=new T.Shape();shape.absarc(0,0,radius,0,Math.PI*2,false);
 const hole=new T.Path();hole.absarc(0,0,radius-.0012,0,Math.PI*2,true);shape.holes.push(hole);
 const g=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false,curveSegments:32});
 g.translate(0,0,-width/2);return atFrame(g,u);
}
function merge(gs){
 const normalized=gs.map(g=>{const n=g.index?g.toNonIndexed():g;for(const name of Object.keys(n.attributes))if(!['position','normal'].includes(name))n.deleteAttribute(name);return n;});
 return mergeGeometries(normalized,false);
}
export function createIntakeGeometry(){
 const duct=new T.TubeGeometry(ductPath,segments,ductRadius,radial,false);
 // Bellows follow local duct normals, eliminating fixed-axis floating rings.
 // Nine crests are a visual interpretation; not an OEM count/specification.
 const bellows=[];
 for(let i=0;i<9;i++)bellows.push(atFrame(new T.TorusGeometry(ductRadius+.0005,.003,8,48),.30+i*.018));
 const clamps=[];
 for(const u of [.035,.965]){
  clamps.push(band(ductRadius+.0026,.009,u));
  clamps.push(atFrame(new RoundedBoxGeometry(.015,.009,.016,2,.002),u,[0,ductRadius+.006,0]));
  const screw=new T.CylinderGeometry(.003,.003,.020,12);screw.rotateX(Math.PI/2);
  clamps.push(atFrame(screw,u,[0,ductRadius+.010,0]));
 }
 // Sensor pad and electrical plug are attached to the same swept duct frame.
 const u=.16;
 const maf=[atFrame(new RoundedBoxGeometry(.014,.052,.071,3,.004),u,[-ductRadius-.006,0,0]),
  atFrame(new RoundedBoxGeometry(.031,.030,.045,3,.003),u,[-ductRadius-.019,0,0])];
 // Pad extends along the duct, and screw bosses sit on its outer face.
 for(const z of [-.027,.027]){
  const boss=new T.CylinderGeometry(.005,.005,.006,16);boss.rotateZ(Math.PI/2);
  maf.push(atFrame(boss,u,[-ductRadius-.016,0,z]));
 }
 const connector=[atFrame(new RoundedBoxGeometry(.026,.023,.028,2,.002),u,[-ductRadius-.044,0,.006]),
  atFrame(new RoundedBoxGeometry(.016,.007,.019,2,.001),u,[-ductRadius-.046,.014,.006])];
 return new Map([['air-intake-duct',duct],['intake-bellows',merge(bellows)],['intake-clamps',merge(clamps)],['maf',merge(maf)],['maf-connector',merge(connector)]]);
}

export function refine(input,output,options={}){
 const revision=options.revision||'intake-2026-10-09';
 const raw=fs.readFileSync(input), jsonLength=raw.readUInt32LE(12);
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),options.expectedSha256||'8bb801e2ac2a2412119def71374ec5974ef2300d3507918c21d8c8bfdaaef5b4','Re-review changed base asset before rebuilding');
 const g=JSON.parse(raw.toString('utf8',20,20+jsonLength));
 if(!options.revision)assert(!g.asset.extras?.intakeRevision,'Use the original v5 asset, not an already refined export');
 assert.equal(g.asset.version,'2.0');
 const binOffset=20+jsonLength+8, binary=raw.subarray(binOffset,binOffset+raw.readUInt32LE(20+jsonLength));
 let length=binary.length;const chunks=[binary];
 const world=[];const walk=(id,parent)=>{const n=g.nodes[id];const m=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3().fromArray(n.translation||[0,0,0]),new T.Quaternion().fromArray(n.rotation||[0,0,0,1]),new T.Vector3().fromArray(n.scale||[1,1,1]));world[id]=parent.clone().multiply(m);for(const c of n.children||[])walk(c,world[id]);};
 for(const id of g.scenes[g.scene||0].nodes)walk(id,new T.Matrix4());
 function accessor(array,type,count,target,min,max){
  const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}
  const data=Buffer.from(array.buffer,array.byteOffset,array.byteLength),offset=length;chunks.push(data);length+=data.length;
  const view=g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target})-1;
  return g.accessors.push({bufferView:view,componentType:array instanceof Float32Array?5126:5125,count,type,...(min?{min,max}:{})})-1;
 }
 const report=[];
 for(const [id,geometry] of options.geometry||createIntakeGeometry()){
  const index=g.nodes.findIndex(n=>n.extras?.partId===id);assert(index>=0,id);
  const node=g.nodes[index], mesh=g.meshes[node.mesh];assert.equal(mesh.primitives.length,1);
  geometry.computeBoundingBox();const bounds=geometry.boundingBox.getSize(new T.Vector3()).toArray();
  const originalTriangles=mesh.primitives.reduce((n,p)=>n+g.accessors[p.indices].count/3,0);
  // Preserve original node transforms (including quantization) for compatibility.
  geometry.applyMatrix4(world[index].clone().invert());geometry.computeBoundingBox();
  const pos=geometry.getAttribute('position'), normal=geometry.getAttribute('normal');
  const indices=geometry.index?new Uint32Array(geometry.index.array):Uint32Array.from({length:pos.count},(_,i)=>i);
  const primitive={attributes:{POSITION:accessor(new Float32Array(pos.array),'VEC3',pos.count,34962,geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray()),NORMAL:accessor(new Float32Array(normal.array),'VEC3',normal.count,34962)},indices:accessor(indices,'SCALAR',indices.length,34963),material:mesh.primitives[0].material,mode:4};
  mesh.primitives=[primitive];node.extras.surfaceRevision=revision;node.extras.accuracy='unverified';
  if(options.sourceRefs?.[id])node.extras.sourceRef=options.sourceRefs[id].join(',');
  report.push({id,triangles:indices.length/3,previousTriangles:originalTriangles,boundsMetres:bounds});
 }
 const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}
 g.buffers[0].byteLength=length;g.asset.extras=options.revision?{...g.asset.extras,surfaceRevision:revision,parentSha256:options.expectedSha256}:{...g.asset.extras,intakeRevision:'2026-10-09',baseSha256:crypto.createHash('sha256').update(raw).digest('hex'),basis:'Photo-informed original surface study; dimensions and installation estimated'};
 let json=Buffer.from(JSON.stringify(g));const padding=(4-json.length%4)%4;json=Buffer.concat([json,Buffer.alloc(padding,32)]);
 const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(length);bh.writeUInt32LE(0x004e4942,4);
 fs.writeFileSync(output,Buffer.concat([header,json,bh,...chunks]));
 return {revision,baseSha256:options.expectedSha256||g.asset.extras.baseSha256,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),bytes:fs.statSync(output).size,parts:report,verifiedParts:0};
}
if(process.argv[1]?.endsWith('refine_intake.mjs')){
 const [input,output,manifestPath]=process.argv.slice(2);assert(input&&output,'Supply input and output GLB paths');
 const report=refine(input,output);
 if(manifestPath){
  const m=JSON.parse(fs.readFileSync(manifestPath));
  const triangleDelta=report.parts.reduce((n,p)=>n+p.triangles-p.previousTriangles,0);
  m.triangleCount+=triangleDelta-(m.intakeSurfaceRevision?.triangleDelta||0);
  m.intakeSurfaceRevision={revision:report.revision,baseSha256:report.baseSha256,sha256:report.sha256,triangleDelta,sourceIds:['gs300-engine-photo'],verified:false};
  for(const p of report.parts){
   const record=m.parts.find(r=>r.id===p.id);assert(record,p.id);
   // Legacy manifest bounds use Blender X/Y/Z, not glTF X/Y/Z.
   record.dimensionsMetres=[p.boundsMetres[0],p.boundsMetres[2],p.boundsMetres[1]];
   record.surfaceRevision=report.revision;
   record.notes='October 2026 intake surface study: smoother duct, path-aligned bellows and bands, attached MAF housing/connector. Photo-informed appearance only. Installation endpoints inherited from v5; diameter, ridge count, fastening details, pinout and dimensions remain estimates. No physical fit or removal procedure validated.';
  }
  fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');
 }
 console.log(JSON.stringify(report,null,2));
}
