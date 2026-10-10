import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {disposeViewerResources} from '../lib/viewer-resources.mjs';

test('viewer teardown releases shared geometry and textures once, including line helpers',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture();
 const material=new THREE.MeshStandardMaterial({map:texture,normalMap:texture});
 const clone=material.clone(),grid=new THREE.GridHelper();
 root.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,clone),grid);
 const resources=[geometry,texture,material,clone,grid.geometry,grid.material];
 const disposed=new Map(resources.map(resource=>[resource,0]));
 for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));
 disposeViewerResources(root,[material]);
 for(const count of disposed.values())assert.equal(count,1);
});

test('a completed GLTF that never entered the scene can still release all owned resources',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture();
 const material=new THREE.MeshStandardMaterial({map:texture});
 root.add(new THREE.Mesh(geometry,material));
 let disposed=0;
 for(const resource of [geometry,texture,material])resource.addEventListener('dispose',()=>disposed++);
 disposeViewerResources(root);
 assert.equal(disposed,3);
});
