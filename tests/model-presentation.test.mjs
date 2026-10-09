import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {displayPoints,fitDisplay} from '../lib/model-presentation.mjs';
import {matchesLibraryModel} from '../lib/library-search.mjs';
const library=JSON.parse(fs.readFileSync('research/model-library.json'));
test('camera ignores transparent helper planes and unreferenced geometry',()=>{
 const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(2,1,4),new THREE.MeshBasicMaterial()));
 const helper=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));root.add(helper);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,999,999,999],3));geometry.setIndex([0,1,2]);root.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()));
 const points=displayPoints(root),fit=fitDisplay(points,1.5);
 assert.deepEqual(fit.size.toArray(),[2,1.5,4]);
});
test('camera centers and fits the same silhouette fraction across scales, rotations and viewport shapes',()=>{
 for(const aspect of [.55,1,2.4])for(const scale of [.001,1,100])for(const yaw of [0,Math.PI/2,Math.PI]){
  const root=new THREE.Group();root.scale.setScalar(scale);root.rotation.y=yaw;root.position.set(3,7,-12);
  root.add(new THREE.Mesh(new THREE.BoxGeometry(2,1.5,5),new THREE.MeshBasicMaterial()));
  const points=displayPoints(root);for(const dir of [new THREE.Vector3(1.1,.65,1.5),new THREE.Vector3(0,.12,1)]){
   const fit=fitDisplay(points,aspect,dir);const camera=new THREE.PerspectiveCamera(35,aspect,.00001,100000);camera.position.copy(fit.position);camera.lookAt(fit.center);camera.updateMatrixWorld(true);
   let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const v=new THREE.Vector3();
   for(let i=0;i<points.length;i+=3){v.fromArray(points,i).project(camera);assert(Math.abs(v.x)<=.821&&Math.abs(v.y)<=.821);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
   assert(Math.abs((minX+maxX)/2)<.002);assert(Math.abs((minY+maxY)/2)<.002,JSON.stringify({aspect,scale,yaw,minY,maxY}));assert(Math.abs(Math.max(maxX-minX,maxY-minY)-1.64)<.005);
  }
 }
});
test('body search finds chassis, spaced badges and source years without splitting AE86 variants',()=>{
 const find=q=>library.models.filter(m=>matchesLibraryModel(m,q));
 assert.equal(find('SC 300')[0].family,'SC');assert.equal(find('W20')[0].family,'MR2');
 assert.equal(find('AE86').length,2);assert.equal(new Set(find('AE86').map(m=>m.bodyGroup)).size,1);
 assert.equal(find('2012')[0].generation,'XW30 · third generation');assert.equal(find('Prius').length,2);
 assert.equal(new Set(find('Prius').map(m=>m.bodyGroup)).size,2);
 assert(library.models.every(m=>m.bodyStyle&&m.generation&&Number.isFinite(m.presentation.yawDegrees)));
});
