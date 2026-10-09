import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createAirboxGeometry} from '../modeling/s160/refine_airbox.mjs';
import {serviceStudies} from '../lib/s160-service.ts';
const geometry=createAirboxGeometry();
function hits(id,origin,direction,far=1){const mesh=new T.Mesh(geometry.get(id),new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();return new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,far).intersectObject(mesh);}
test('housing is open at the filter seat and cover outlet is not capped',()=>{
 const body=hits('airbox',[-.6,.70,1.52],[0,-1,0]);assert(body.length>0);assert(Math.abs(body[0].point.y-.536)<1e-6,'center ray must reach the inner floor');
 assert.equal(hits('airbox-lid',[-.6,.710,1.389],[0,0,-1],.019).length,0,'rear outlet must pass air');
 assert(hits('airbox-lid',[-.69,.710,1.389],[0,0,-1],.019).length>0,'the adjacent rear wall must exist');
 assert.equal(hits('air-filter',[-.6,.7,1.52],[0,-1,0],.1).length,0,'filter frame has an open center');
 assert(hits('air-filter-pleats',[-.6,.7,1.52],[0,-1,0],.1).length>0,'media occupies the filter opening');
});
test('air-cleaner view keeps each assembly together and preserves stage provenance',()=>{
 const s=serviceStudies.find(s=>s.id==='air-cleaner');
 assert.deepEqual(s.offsets['airbox-lid'],s.offsets['airbox-ribs']);
 assert.deepEqual(s.offsets['air-filter'],s.offsets['air-filter-pleats']);
 assert(s.offsets['airbox-lid'][1]>s.offsets['air-filter'][1]);
 assert(s.parts.every(id=>s.only.includes(id)),'every study part must remain selectable in the isolated scene');
 const intake=JSON.parse(fs.readFileSync('modeling/validation/s160-intake-2026-10-09.json'));
 const airbox=JSON.parse(fs.readFileSync('modeling/validation/s160-airbox-2026-10-09.json'));
 assert.equal(airbox.baseSha256,intake.sha256);
 assert.equal(airbox.verifiedParts,0);
});
