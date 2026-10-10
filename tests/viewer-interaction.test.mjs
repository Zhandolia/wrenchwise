import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMaterialHighlighter,isVisibleModelHit,resizePerspective} from '../lib/viewer-interaction.mjs';
import {createDisplayFitCache,displayPoints} from '../lib/model-presentation.mjs';

test('selection restores original emissive color, intensity and texture after repeated changes',()=>{
 const texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({emissive:0x123456,emissiveIntensity:2.5,emissiveMap:texture});
 const original=material.emissive.clone(),highlight=createMaterialHighlighter();
 highlight(material,false);assert(material.emissive.equals(original));assert.equal(material.emissiveIntensity,2.5);
 for(let i=0;i<3;i++){
  highlight(material,true);assert.equal(material.emissive.getHex(),0xff8e4c);
  highlight(material,false);assert(material.emissive.equals(original));assert.equal(material.emissiveIntensity,2.5);assert.equal(material.emissiveMap,texture);
 }
 assert.doesNotThrow(()=>highlight(new THREE.MeshBasicMaterial(),true));
});

test('ray picking passes through invisible helpers but respects visible glass',()=>{
 const scene=new THREE.Group(),geometry=new THREE.PlaneGeometry(2,2);
 const hidden=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:0}));hidden.position.z=2;
 const body=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());scene.add(hidden,body);scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,5),new THREE.Vector3(0,0,-1));
 assert.equal(ray.intersectObjects(scene.children).find(isVisibleModelHit).object,body);
 hidden.material.opacity=.3;assert.equal(ray.intersectObjects(scene.children).find(isVisibleModelHit).object,hidden);
 hidden.material.visible=false;assert.equal(ray.intersectObjects(scene.children).find(isVisibleModelHit).object,body);
 hidden.material.visible=true;hidden.userData.selectable=false;assert.equal(ray.intersectObjects(scene.children).find(isVisibleModelHit).object,body);
 const parent=new THREE.Group();scene.add(parent);parent.add(body);parent.visible=false;
 assert.equal(ray.intersectObjects(scene.children,true).find(isVisibleModelHit),undefined);
});

test('ray picking uses the intersected material in a multi-material mesh',()=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),[new THREE.MeshBasicMaterial({transparent:true,opacity:0}),new THREE.MeshBasicMaterial()]);
 const hit={object:mesh,face:{materialIndex:0}};
 assert.equal(isVisibleModelHit(hit),false);hit.face.materialIndex=1;assert.equal(isVisibleModelHit(hit),true);
 mesh.material[1].colorWrite=false;assert.equal(isVisibleModelHit(hit),false);
});

test('resizing a portrait viewport preserves orbit and zoom, including hidden-to-visible transitions',()=>{
 const camera=new THREE.PerspectiveCamera(35,2,.02,100);camera.position.set(-3,4,7);camera.lookAt(1,2,3);camera.zoom=1.7;
 const position=camera.position.clone(),rotation=camera.quaternion.clone();
 assert.equal(resizePerspective(camera,390,844),true);assert.equal(camera.aspect,390/844);
 assert(camera.position.equals(position));assert(camera.quaternion.equals(rotation));assert.equal(camera.zoom,1.7);
 assert.equal(resizePerspective(camera,0,0),false);assert.equal(camera.aspect,390/844);
 assert.equal(resizePerspective(camera,844,390),true);assert(camera.position.equals(position));
});

test('cached preset fits remain independent of camera mutation and viewport aspect',()=>{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,1,5),new THREE.MeshBasicMaterial());
 const fit=createDisplayFitCache(displayPoints(mesh)),direction=new THREE.Vector3(1,.65,1.5);
 const original=fit(2,direction),expectedPosition=original.position.clone(),expectedCenter=original.center.clone();
 original.position.set(999,999,999);original.center.set(999,999,999);
 const again=fit(2,direction);assert(again.position.equals(expectedPosition));assert(again.center.equals(expectedCenter));
 assert(fit(.4,direction).distance>again.distance);
});
