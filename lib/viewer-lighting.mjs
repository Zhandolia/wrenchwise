import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/** Consistent reference lighting. Caller owns and disposes the returned environment.
 * @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer
 */
export function addReferenceLighting(scene,renderer){
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
 room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd9edff,0x182332,2.1));
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(4,6,3);scene.add(key);
 const warm=new THREE.DirectionalLight(0xffac72,1.5);warm.position.set(-3,2,-2);scene.add(warm);
 return environment;
}
