/** Original surface interpretation, not factory CAD. Metres, +Y up, +Z front.
 * node modeling/s160/refine_factory_details.mjs AIRBOX_BASELINE OUTPUT MANIFEST
 * See research/s160-factory-reference-audit.json for the inspected references.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {refine} from './refine_intake.mjs';
export const revision='factory-details-2026-10-10';
export const revisedIds=['engine-cover','pcv-valve','pcv-hose'];
const merge=gs=>mergeGeometries(gs.map(g=>{const a=g.index?g.toNonIndexed():g;for(const k of Object.keys(a.attributes))if(!['position','normal'].includes(k))a.deleteAttribute(k);return a;}));
function mesh(v){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v.flat(2),3));g.computeVertexNormals();return g;}
function quad(v,a,b,c,d){v.push(a,b,c,a,c,d);}
export const oilOpening={x:.103,z:1.30,radius:.030};
function outline(){const s=new T.Shape();s.moveTo(-.168,1.258);s.lineTo(.161,1.258);s.bezierCurveTo(.191,1.258,.210,1.294,.211,1.338);s.lineTo(.213,1.531);s.bezierCurveTo(.212,1.595,.162,1.615,.104,1.609);s.bezierCurveTo(.060,1.608,.031,1.581,0,1.578);s.bezierCurveTo(-.036,1.584,-.086,1.606,-.135,1.602);s.bezierCurveTo(-.197,1.600,-.214,1.573,-.213,1.527);s.lineTo(-.209,1.320);s.bezierCurveTo(-.207,1.280,-.193,1.258,-.168,1.258);return s;}
// Inherited oil-cap and nut positions are retained. No measured hole coordinates.
export function coverHeight(x,z){return .907+.012*Math.exp(-(((z-1.465)/.10)**2))-.014*(x/.215)**4-.025*Math.max(0,(z-1.53)/.085);}
function cover(){
 const s=outline(),hole=new T.Path();hole.absarc(oilOpening.x,oilOpening.z,oilOpening.radius,0,Math.PI*2,true);s.holes.push(hole);
 const top=new TessellateModifier(.012,5).modify(new T.ShapeGeometry(s,40));
 const p=top.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);p.setXYZ(i,x,coverHeight(x,z),z);}top.computeVertexNormals();
 // Reverse winding: ShapeGeometry's XY front becomes -Y after this mapping.
 const reverse=g=>{const a=g.toNonIndexed?g.index?g.toNonIndexed():g:g;const pos=a.getAttribute('position');for(let i=0;i<pos.count;i+=3){const b=[pos.getX(i+1),pos.getY(i+1),pos.getZ(i+1)];pos.setXYZ(i+1,pos.getX(i+2),pos.getY(i+2),pos.getZ(i+2));pos.setXYZ(i+2,...b);}a.computeVertexNormals();return a;};
 reverse(top);const underside=reverse(top.clone().translate(0,-.003,0));
 const v=[],outer=s.getPoints(120),bottom=.846;
 for(let i=0;i<outer.length-1;i++){
  const a=outer[i],b=outer[i+1],ya=coverHeight(a.x,a.y),yb=coverHeight(b.x,b.y);
  // Rolled shoulder and open skirt; no solid slab across the underside.
  const ia=[a.x*.986,bottom+.003,a.y],ib=[b.x*.986,bottom+.003,b.y];
  quad(v,[a.x,ya,a.y],[a.x*1.006,ya-.014,a.y],[b.x*1.006,yb-.014,b.y],[b.x,yb,b.y]);
  quad(v,[a.x*1.006,ya-.014,a.y],[a.x,bottom,a.y],[b.x,bottom,b.y],[b.x*1.006,yb-.014,b.y]);
  quad(v,ia,[a.x*.986,ya-.003,a.y], [b.x*.986,yb-.003,b.y],ib);
  quad(v,[a.x,bottom,a.y],ia,ib,[b.x,bottom,b.y]);
 }
 const hp=hole.getPoints(96);for(let i=0;i<hp.length-1;i++){const a=hp[i],b=hp[i+1];quad(v,[a.x,coverHeight(a.x,a.y),a.y],[b.x,coverHeight(b.x,b.y),b.y],[b.x,coverHeight(b.x,b.y)-.003,b.y],[a.x,coverHeight(a.x,a.y)-.003,a.y]);}
 const shell=merge([top,underside,mesh(v)]);shell.deleteAttribute('normal');const smooth=mergeVertices(shell,1e-6);smooth.computeVertexNormals();return smooth;
}
const pcvBase=new T.Vector3(.14,.842,.93);
// EC-4 identifies an elbow outlet and a cylindrical seat. Dimensions estimated.
export const pcvOutlet=pcvBase.clone().add(new T.Vector3(.026,.025,0));
function pcv(){
 const path=new T.CatmullRomCurve3([pcvBase.clone().add(new T.Vector3(0,-.014,0)),pcvBase.clone().add(new T.Vector3(0,.012,0)),pcvBase.clone().add(new T.Vector3(.007,.025,0)),pcvOutlet]);
 const body=new T.TubeGeometry(path,36,.008,24,false),inner=new T.TubeGeometry(path,36,.0048,24,false);
 const ii=inner.index.array;for(let i=0;i<ii.length;i+=3)[ii[i+1],ii[i+2]]=[ii[i+2],ii[i+1]];inner.computeVertexNormals();
 const seat=new T.CylinderGeometry(.013,.011,.012,32,1,true);seat.translate(pcvBase.x,pcvBase.y-.002,pcvBase.z);
 const collar=new T.TorusGeometry(.009,.002,8,32);collar.rotateY(Math.PI/2);collar.translate(pcvOutlet.x-.002,pcvOutlet.y,pcvOutlet.z);
 return merge([body,inner,seat,collar]);
}
export function createFactoryGeometry(){
 const hosePath=new T.CatmullRomCurve3([pcvOutlet.clone(),new T.Vector3(.198,.868,.916),new T.Vector3(.252,.890,.901),new T.Vector3(.33,.90,.91)]);
 return new Map([['engine-cover',cover()],['pcv-valve',pcv()],['pcv-hose',new T.TubeGeometry(hosePath,64,.007,20,false)]]);
}
if(process.argv[1]?.endsWith('refine_factory_details.mjs')){
 const [input,output,manifestPath]=process.argv.slice(2);assert(input&&output&&manifestPath,'Supply baseline, output and manifest');
 const parent=JSON.parse(fs.readFileSync('modeling/validation/s160-airbox-2026-10-09.json'));
 const sourceRefs=Object.fromEntries(revisedIds.map(id=>[id,[id==='engine-cover'?'lexus-factory-vvti':'rm718u-pcv-page','gs300-engine-photo']]));
 const report=refine(input,output,{revision,expectedSha256:parent.sha256,geometry:createFactoryGeometry(),sourceRefs});
 const m=JSON.parse(fs.readFileSync(manifestPath)),delta=report.parts.reduce((n,p)=>n+p.triangles-p.previousTriangles,0);
 m.triangleCount+=delta-(m.factorySurfaceRevision?.triangleDelta||0);
 m.factorySurfaceRevision={revision,baseSha256:report.baseSha256,sha256:report.sha256,triangleDelta:delta,sourceIds:['lexus-factory-vvti','rm718u-pcv-page','gs300-engine-photo'],verified:false};
 for(const p of report.parts){const part=m.parts.find(q=>q.id===p.id);assert(part,p.id);part.dimensionsMetres=[p.boundsMetres[0],p.boundsMetres[2],p.boundsMetres[1]];part.surfaceRevision=revision;part.sourceRefs=[...new Set([...part.sourceRefs||[],p.id==='engine-cover'?'lexus-factory-vvti':'rm718u-pcv-page','gs300-engine-photo'])];part.notes=p.id==='engine-cover'?'Factory-cutaway and stock-photo-informed crowned forward cover, open underside and oil-cap opening. Outer contour, wall thickness and inherited mounting coordinates are estimates. No measured fit.':'RM718U EC-4-informed elbow PCV valve and connected hose. Port form is referenced; diameter, hidden valve internals, position and hose route remain estimated. No flow calibration or service validation.';}
 for(const id of revisedIds)m.parts.find(p=>p.id===id).source='Original Wrenchwise geometry; '+sourceRefs[id].join(', ');
 fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');fs.writeFileSync('modeling/validation/s160-factory-2026-10-10.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({revision,bytes:report.bytes,parts:report.parts.map(p=>p.id),verifiedParts:0}));
}
