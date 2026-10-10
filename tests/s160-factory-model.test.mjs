import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import fs from 'node:fs';
import {createFactoryGeometry,oilOpening} from '../modeling/s160/refine_factory_details.mjs';
import {serviceStudies} from '../lib/s160-service.ts';
const geometry=createFactoryGeometry();
function ray(origin,direction){const m=new T.Mesh(geometry.get('engine-cover'),new T.MeshBasicMaterial({side:T.DoubleSide}));m.updateMatrixWorld();return new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,.4).intersectObject(m);}
test('appearance cover has an actual oil opening and open underside',()=>{
 assert.equal(ray([oilOpening.x,1.1,oilOpening.z],[0,-1,0]).length,0);
 const hits=ray([0,.80,1.465],[0,1,0]);assert(hits.length>0);assert(hits[0].point.y>.91,'underside ray must reach the inner roof, not a solid bottom');
 assert(ray([-.08,1.1,1.465],[0,-1,0]).length>0,'the surrounding shell must remain present');
});
test('installed engine study keeps body context, hides hood and carries reference provenance',()=>{
 const s=serviceStudies.find(x=>x.id==='under-hood');assert(s.visible.includes('body')&&s.visible.includes('structure'));assert(s.hidden.includes('hood'));assert(s.focus.includes('hood'));assert(s.parts.includes('battery')&&s.parts.includes('brake-reservoir'));
 const prior=JSON.parse(fs.readFileSync('modeling/validation/s160-airbox-2026-10-09.json')),next=JSON.parse(fs.readFileSync('modeling/validation/s160-factory-2026-10-10.json'));assert.equal(next.baseSha256,prior.sha256);assert.equal(next.verifiedParts,0);
 const lift=serviceStudies.find(x=>x.id==='cover-pcv');assert.deepEqual(lift.offsets['engine-cover'],lift.offsets['engine-cover-lettering']);assert.deepEqual(lift.offsets['engine-cover'],lift.offsets['engine-cover-nut-1']);
});
