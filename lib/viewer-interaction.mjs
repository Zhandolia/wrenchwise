import * as THREE from 'three';

/** Each viewer owns its material snapshots; source maps and colors stay intact. */
export function createMaterialHighlighter(){
 /** @type {WeakMap<THREE.Material,{color:THREE.Color,intensity:number}>} */
 const originals=new WeakMap();
 /** @param {THREE.Material} material @param {boolean} selected @param {number} color @param {number} intensity */
 return (material,selected,color=0xff8e4c,intensity=.35)=>{
  if(!(material instanceof THREE.MeshStandardMaterial||material instanceof THREE.MeshLambertMaterial||material instanceof THREE.MeshPhongMaterial))return;
  let original=originals.get(material);
  if(!original){original={color:material.emissive.clone(),intensity:material.emissiveIntensity};originals.set(material,original);}
  material.emissive.copy(original.color);
  material.emissiveIntensity=original.intensity;
  if(selected){material.emissive.setHex(color);material.emissiveIntensity=intensity;}
 };
}

/** Ignore invisible ancestors and non-rendering faces rather than selecting helper planes.
 * @param {THREE.Intersection} hit
 */
export function isVisibleModelHit(hit){
 let ancestor=/** @type {THREE.Object3D|null} */(hit.object);
 while(ancestor){if(!ancestor.visible||ancestor.userData.selectable===false)return false;ancestor=ancestor.parent;}
 if(!(hit.object instanceof THREE.Mesh))return false;
 const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex??0]:hit.object.material;
 return Boolean(material&&material.visible&&material.colorWrite&&!(material.transparent&&material.opacity===0));
}

/** Resize projection without destroying the user's orbit, target or zoom.
 * @param {THREE.PerspectiveCamera} camera @param {number} width @param {number} height
 */
export function resizePerspective(camera,width,height){
 if(width<=0||height<=0||!Number.isFinite(width+height))return false;
 camera.aspect=width/height;camera.updateProjectionMatrix();return true;
}
