/** Original detail study of RM718U EM-15/18/21/22. Not OEM CAD.
 * Existing placement is retained. Tooth pitch/count, seal profiles, dimensions
 * and mating interfaces are illustrative. Never use this asset to time an engine.
 * node modeling/s160/refine_timing.mjs FACTORY_BASELINE OUTPUT MANIFEST
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {refine} from './refine_intake.mjs';
export const revision='timing-detail-2026-10-10';
export const revisedIds=['timing-belt','timing-idler','timing-tensioner','timing-tensioner-boot'];
const merge=gs=>mergeGeometries(gs.map(g=>{const a=g.index?g.toNonIndexed():g;for(const k of Object.keys(a.attributes))if(!['position','normal'].includes(k))a.deleteAttribute(k);return a;}));
function ring(outer,inner,depth,x,y,z){const s=new T.Shape();s.absarc(0,0,outer,0,Math.PI*2,false);const h=new T.Path();h.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(h);return new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:64}).translate(x,y,z-depth/2);}
function lathe(profile,x,y,z){return new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),64).translate(x,y,z);}
export function createTimingGeometry(){
 const points=[[-.169,.843],[-.165,.872],[-.145,.898],[-.105,.907],[.105,.911],[.145,.897],[.171,.866],[.173,.84],[.125,.69],[.071,.525],[.035,.447],[.021,.424],[-.02,.425],[-.038,.454],[-.060,.555],[-.066,.615],[-.079,.652],[-.13,.755]];
 const curve=new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(x,y,1.635)),true,'centripetal');
 const vertices=[],indices=[],segments=720;
 for(let i=0;i<=segments;i++){const p=curve.getPointAt(i/segments),t=curve.getTangentAt(i/segments),n=new T.Vector3(-t.y,t.x,0).normalize();for(const [depth,thickness] of [[-.014,-.002],[.014,-.002],[.014,.002],[-.014,.002]])vertices.push(p.x+n.x*thickness,p.y+n.y*thickness,p.z+depth);}
 for(let i=0;i<segments;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+(j+1)%4,d=(i+1)*4+j;indices.push(a,b,c,a,c,d);}
 const belt=new T.BufferGeometry();belt.setAttribute('position',new T.Float32BufferAttribute(vertices,3));belt.setIndex(indices);belt.computeVertexNormals();
 // Repeated tread detail is deliberately NOT a claim about the OEM tooth count.
 const beltPieces=[belt],illustrativeTeeth=156;
 for(let i=0;i<illustrativeTeeth;i++){const p=curve.getPointAt(i/illustrativeTeeth),t=curve.getTangentAt(i/illustrativeTeeth);const n=new T.Vector3(t.y,-t.x,0).normalize();const tooth=new T.BoxGeometry(.0038,.003,.026);tooth.rotateZ(Math.atan2(t.y,t.x));tooth.translate(p.x+n.x*.003,p.y+n.y*.003,p.z);beltPieces.push(tooth);}
 const idler=merge([ring(.034,.011,.024,-.094,.627,1.635),ring(.032,.026,.004,-.094,.627,1.650),ring(.032,.026,.004,-.094,.627,1.620),ring(.018,.007,.021,-.094,.627,1.635)]);
 const body=lathe([[0,-.0385],[.013,-.0385],[.017,-.035],[.018,-.030],[.018,.026],[.016,.032],[.012,.0385],[.0065,.0385]],-.152,.512,1.615);
 const lugs=[ring(.011,.0055,.016,-.174,.49,1.615),ring(.011,.0055,.016,-.130,.49,1.615)];
 const bridges=[new T.BoxGeometry(.014,.015,.016).translate(-.159,.49,1.615),new T.BoxGeometry(.014,.015,.016).translate(-.145,.49,1.615)];
 // Bridges stop before the through-holes, preserving bolt visibility from either side.

 const boot=lathe([[.006,-.006],[.009,-.006],[.011,-.0045],[.011,-.003],[.009,-.0015],[.011,0],[.011,.0015],[.009,.003],[.010,.0045],[.008,.006],[.006,.006]],-.152,.55,1.615);
 // The exported vehicle assembly lowers the engine by 90 mm relative to the builder.
 return new Map([['timing-belt',merge(beltPieces)],['timing-idler',idler],['timing-tensioner',merge([body,...lugs,...bridges])],['timing-tensioner-boot',boot]].map(([id,g])=>[id,g.translate(0,-.09,0)]));
}
if(process.argv[1]?.endsWith('refine_timing.mjs')){
 const [input,output,manifestPath]=process.argv.slice(2);assert(input&&output&&manifestPath,'Supply baseline, output and manifest');
 const parent=JSON.parse(fs.readFileSync('modeling/validation/s160-factory-2026-10-10.json'));
 const report=refine(input,output,{revision,expectedSha256:parent.sha256,geometry:createTimingGeometry(),sourceRefs:Object.fromEntries(revisedIds.map(id=>[id,['rm718u-timing']]))});
 const m=JSON.parse(fs.readFileSync(manifestPath)),delta=report.parts.reduce((n,p)=>n+p.triangles-p.previousTriangles,0);
 m.triangleCount+=delta-(m.timingSurfaceRevision?.triangleDelta||0);
 m.timingSurfaceRevision={revision,baseSha256:report.baseSha256,sha256:report.sha256,triangleDelta:delta,sourceIds:['rm718u-timing'],verified:false};
 for(const p of report.parts){const part=m.parts.find(q=>q.id===p.id);assert(part,p.id);part.dimensionsMetres=[p.boundsMetres[0],p.boundsMetres[2],p.boundsMetres[1]];part.surfaceRevision=revision;part.sourceRefs=[...new Set([...part.sourceRefs||[],'rm718u-timing'])];part.source='Original Wrenchwise geometry; RM718U timing-system study';part.notes=p.id==='timing-belt'?'Smooth ribbon with illustrative internal teeth. Tooth count, pitch, width, wrap, routing, tension and pulley orientation are unverified. Not an alignment reference.':'RM718U-informed surface study with recessed idler surfaces, hydraulic-body mounting ears or flexible boot folds. Dimensions, hole positions, working clearances and materials remain estimated.';}
 fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');fs.writeFileSync('modeling/validation/s160-timing-2026-10-10.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
