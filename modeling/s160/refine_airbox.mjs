/** Original air-cleaner anatomy geometry. All dimensions are estimates in metres.
 * Rebuild after refine_intake.mjs; keep the intermediate intake GLB for provenance.
 * node modeling/s160/refine_airbox.mjs INTAKE_GLB OUTPUT_GLB [MANIFEST_JSON]
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {refine,frameAt,ductRadius} from './refine_intake.mjs';
export const revisedIds=['airbox','airbox-lid','air-filter','air-filter-pleats','airbox-ribs'];
export const revision='airbox-2026-10-09';
const cx=-.6,cz=1.5275;
function merge(gs){return mergeGeometries(gs.map(g=>{const n=g.index?g.toNonIndexed():g;for(const k of Object.keys(n.attributes))if(!['position','normal'].includes(k))n.deleteAttribute(k);return n;}));}
function mesh(vertices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(2),3));g.computeVertexNormals();return g;}
function quad(v,a,b,c,d){v.push(a,b,c,a,c,d);}
function loop(w,d,y,ch=.012){return [[-w/2+ch,-d/2],[w/2-ch,-d/2],[w/2,-d/2+ch],[w/2,d/2-ch],[w/2-ch,d/2],[-w/2+ch,d/2],[-w/2,d/2-ch],[-w/2,-d/2+ch]].map(([x,z])=>[cx+x,typeof y==='function'?y(cz+z):y,cz+z]);}
function walls(a,b,reverse=false,skip=[]){const v=[];for(let i=0;i<a.length;i++){if(skip.includes(i))continue;const j=(i+1)%a.length;if(reverse)quad(v,a[i],a[j],b[j],b[i]);else quad(v,a[i],b[i],b[j],a[j]);}return mesh(v);}
function cap(a,up){const v=[],c=a.reduce((p,q)=>p.map((x,i)=>x+q[i]/a.length),[0,0,0]);for(let i=0;i<a.length;i++){const j=(i+1)%a.length;v.push(c,up?a[j]:a[i],up?a[i]:a[j]);}return mesh(v);}
function ring(w,d,iw,id,low,high){const a=loop(w,d,low),b=loop(w,d,high),c=loop(iw,id,low),e=loop(iw,id,high);return merge([walls(a,b),walls(c,e,true),walls(b,e,true),walls(a,c)]);}
export function createAirboxGeometry(){
 const lower=loop(.235,.257,.530),upper=loop(.270,.295,.650);
 const insideLow=loop(.227,.249,.536),insideTop=loop(.262,.287,.650);
 const body=merge([walls(lower,upper),walls(insideLow,insideTop,true),walls(upper,insideTop,true),cap(lower,false),cap(insideLow,true),ring(.276,.301,.262,.287,.647,.653)]);
 // An open-bottom cover, with a rear outlet through the wall, not a solid block.
 const roof=z=>.768-(z-1.38)*.10;
 const bottom=loop(.285,.295,.654),top=loop(.285,.295,roof);
 const ib=loop(.279,.289,.654),it=loop(.279,.289,z=>roof(z)-.003);
 const outer=walls(bottom,top,false,[0]),inner=walls(ib,it,true,[0]);
 const back=new T.Shape();back.moveTo(-.1305,.654);back.lineTo(.1305,.654);back.lineTo(.1305,.768);back.lineTo(-.1305,.768);back.closePath();
 const hole=new T.Path();hole.absarc(0,.710,ductRadius-.0025,0,2*Math.PI,true);back.holes.push(hole);
 const rear=new T.ExtrudeGeometry(back,{depth:.003,bevelEnabled:false,curveSegments:48});rear.translate(cx,0,1.38);
 const f=frameAt(0),start=new T.Vector3(cx,.710,1.38);
 const neckPath=new T.CubicBezierCurve3(start,start.clone().add(new T.Vector3(0,0,-.021)),f.center.clone().addScaledVector(f.tangent,-.012),f.center);
 // Shared ring frames guarantee coaxial inner/outer surfaces and an open bore.
 const frames=neckPath.computeFrenetFrames(32,false),v=[];
 const circle=(i,r)=>Array.from({length:48},(_,j)=>{const a=j/48*2*Math.PI;return neckPath.getPointAt(i/32).clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r).toArray();});
 for(let i=0;i<32;i++){const a=circle(i,ductRadius),b=circle(i+1,ductRadius),c=circle(i,ductRadius-.0025),d=circle(i+1,ductRadius-.0025);for(let j=0;j<48;j++){const k=(j+1)%48;quad(v,a[j],a[k],b[k],b[j]);quad(v,c[j],d[j],d[k],c[k]);}}
 for(const i of [0,32]){const a=circle(i,ductRadius),b=circle(i,ductRadius-.0025);for(let j=0;j<48;j++){const k=(j+1)%48;i===0?quad(v,a[j],b[j],b[k],a[k]):quad(v,a[j],a[k],b[k],b[j]);}}
 const neck=mesh(v);neck.deleteAttribute('normal');const smoothNeck=mergeVertices(neck);smoothNeck.computeVertexNormals();
 const lid=merge([outer,inner,cap(top,true),cap(it,false),walls(bottom,ib),rear,smoothNeck]);
 const filter=ring(.258,.283,.231,.256,.649,.662);
 // Illustrative pleat density, not a documented OEM count or service dimension.
 const media=[];const count=30,z0=cz-.124,step=.248/count;
 for(let i=0;i<count;i++){const z=z0+i*step;quad(media,[cx-.114,.650,z],[cx-.114,.663,z+step/2],[cx+.114,.663,z+step/2],[cx+.114,.650,z]);quad(media,[cx-.114,.663,z+step/2],[cx-.114,.650,z+step],[cx+.114,.650,z+step],[cx+.114,.663,z+step/2]);}
 // The inherited material is double-sided; duplicate reversed faces cause z-fighting.
 const paper=mesh(media);
 // Retain the legacy group ID but replace unsupported lid ribs with a seam bead.
 const bead=ring(.288,.298,.282,.292,.654,.657);
 return new Map([['airbox',body],['airbox-lid',lid],['air-filter',filter],['air-filter-pleats',paper],['airbox-ribs',bead]]);
}
if(process.argv[1]?.endsWith('refine_airbox.mjs')){
 const [input,output,manifestPath]=process.argv.slice(2);assert(input&&output,'Supply input and output GLB paths');
 const parent=JSON.parse(fs.readFileSync('modeling/validation/s160-intake-2026-10-09.json'));
 const report=refine(input,output,{revision,expectedSha256:parent.sha256,geometry:createAirboxGeometry()});
 if(manifestPath){const m=JSON.parse(fs.readFileSync(manifestPath));const delta=report.parts.reduce((n,p)=>n+p.triangles-p.previousTriangles,0);m.triangleCount+=delta-(m.airboxSurfaceRevision?.triangleDelta||0);m.airboxSurfaceRevision={revision,baseSha256:report.baseSha256,sha256:report.sha256,triangleDelta:delta,sourceIds:['gs300-engine-photo'],verified:false};for(const p of report.parts){const record=m.parts.find(r=>r.id===p.id);assert(record,p.id);record.dimensionsMetres=[p.boundsMetres[0],p.boundsMetres[2],p.boundsMetres[1]];record.surfaceRevision=revision;record.notes='October 2026 air-cleaner anatomy study: hollow tapered housing, separate cover with open duct neck, filter frame and illustrative pleats. Photo-informed external arrangement; internal shape, wall thickness, pleat count, all dimensions and fitment are estimates. Separation is illustrative, not an approved removal path.';if(p.id==='airbox-ribs')record.name='Air-cleaner lid seam bead (estimated)';}fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
}
