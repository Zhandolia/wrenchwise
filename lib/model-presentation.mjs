import * as THREE from 'three';

/** Collect only referenced, rendered vertices: invisible helper planes must not affect framing.
 * @param {THREE.Object3D} root
 */
export function displayPoints(root){
 root.updateMatrixWorld(true);
 const values=[],point=new THREE.Vector3();
 root.traverseVisible(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const mesh=object,geometry=mesh.geometry,position=geometry.getAttribute('position');
  if(!position)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const visible=/** @param {THREE.Material} m */m=>m&&m.visible&&!(m.transparent&&m.opacity===0);
  const index=geometry.getIndex(),count=index?index.count:position.count;
  const groups=Array.isArray(mesh.material)?geometry.groups:[{start:0,count,materialIndex:0}];
  const visited=new Uint8Array(position.count);
  for(const group of groups){
   if(!visible(materials[group.materialIndex??0]))continue;
   const start=Math.max(group.start,geometry.drawRange.start),end=Math.min(group.start+group.count,count,geometry.drawRange.start+geometry.drawRange.count);
   for(let i=start;i<end;i++){
    const vertex=index?index.getX(i):i;if(visited[vertex])continue;visited[vertex]=1;
    mesh.getVertexPosition(vertex,point).applyMatrix4(mesh.matrixWorld);
    if(Number.isFinite(point.x+point.y+point.z))values.push(point.x,point.y,point.z);
   }
  }
 });
 return new Float32Array(values);
}

/** Fit perspective projection to visible geometry with consistent screen margins.
 * @param {Float32Array} points
 * @param {number} aspect
 * @param {THREE.Vector3} direction
 * @param {number} fov
 * @param {number} fill
 */
export function fitDisplay(points,aspect,direction=new THREE.Vector3(1.1,.65,1.5),fov=35,fill=.82){
 if(!points.length||aspect<=0)throw Error('Cannot fit empty geometry or a zero-sized viewport');
 const box=new THREE.Box3(),p=new THREE.Vector3();
 for(let i=0;i<points.length;i+=3)box.expandByPoint(p.fromArray(points,i));
 const center=box.getCenter(new THREE.Vector3()),forward=direction.clone().normalize();
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),forward).normalize();
 const up=new THREE.Vector3().crossVectors(forward,right);
 const tanY=Math.tan(THREE.MathUtils.degToRad(fov)/2),tanX=tanY*aspect;
 const projected=new Float64Array(points.length);
 for(let i=0;i<points.length;i+=3){
  p.fromArray(points,i).sub(center);projected[i]=p.dot(right);projected[i+1]=p.dot(up);projected[i+2]=p.dot(forward);
 }
 let distance=0,shiftX=0,shiftY=0;
 // Center the projected silhouette, not just the world-space box. A long bonnet
 // otherwise pushes a front view toward the bottom and makes it appear smaller.
 for(let iteration=0;iteration<16;iteration++){
  distance=0;
  for(let i=0;i<projected.length;i+=3)distance=Math.max(distance,projected[i+2]+Math.abs(projected[i]-shiftX)/(tanX*fill),projected[i+2]+Math.abs(projected[i+1]-shiftY)/(tanY*fill));
  let left=Infinity,rightEdge=-Infinity,bottom=Infinity,top=-Infinity;
  for(let i=0;i<projected.length;i+=3){
   const depth=distance-projected[i+2],x=(projected[i]-shiftX)/(depth*tanX),y=(projected[i+1]-shiftY)/(depth*tanY);
   left=Math.min(left,x);rightEdge=Math.max(rightEdge,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
  }
  const x=(left+rightEdge)/2,y=(bottom+top)/2;
  if(Math.max(Math.abs(x),Math.abs(y))<.0001||iteration===15)break;
  shiftX+=x*distance*tanX*.5;shiftY+=y*distance*tanY*.5;
 }
 center.addScaledVector(right,shiftX).addScaledVector(up,shiftY);
 return {center,distance,position:center.clone().addScaledVector(forward,distance),size:box.getSize(new THREE.Vector3())};
}
