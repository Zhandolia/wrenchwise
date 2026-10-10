import * as THREE from 'three';

/** Release a viewer's owned resources, including line helpers and shared textures.
 * @param {THREE.Object3D} root
 * @param {THREE.Material[]} extraMaterials Materials retained outside the scene.
 */
export function disposeViewerResources(root,extraMaterials=[]){
 const geometries=new Set(),materials=new Set(extraMaterials),textures=new Set(),images=new Set();
 root.traverse(object=>{
  const drawable=/** @type {THREE.Mesh} */(object);
  if(drawable.geometry)geometries.add(drawable.geometry);
  if(drawable.material)for(const material of Array.isArray(drawable.material)?drawable.material:[drawable.material])materials.add(material);
 });
 for(const material of materials){
  for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
  material.dispose();
 }
 for(const texture of textures){
  const image=texture.source?.data;
  if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)images.add(image);
  texture.dispose();
 }
 for(const image of images)image.close();
 for(const geometry of geometries)geometry.dispose();
}
