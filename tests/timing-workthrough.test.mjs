import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {timingLesson,timingSources,timingPartIds} from '../lib/timing-belt-lesson.ts';
import {serviceStudies} from '../lib/s160-service.ts';
import {readWorkthroughProgress} from '../lib/workthrough-progress.mjs';
import {createTimingGeometry} from '../modeling/s160/refine_timing.mjs';
const manifest=JSON.parse(fs.readFileSync('public/models/gs300-parts.json'));
test('timing phases have configuration-specific references and renderable mechanical parts',()=>{
 const target=JSON.parse(fs.readFileSync('research/s160/reference-configuration.json'));
 assert.equal(timingLesson.configurationId,target.configurationId);
 for(const step of timingLesson.steps){
  const study=serviceStudies.find(s=>s.id===step.studyId);assert(study);assert(!study.visible.includes('body'));
  assert(step.sourceIds.length);for(const id of step.sourceIds)assert(timingSources.some(s=>s.id===id));
  for(const {id} of step.parts){const part=manifest.parts.find(p=>p.id===id);assert.equal(part?.status,'modeled',id);assert(study.visible.includes(part.system),id+' must be visible in the phase');}
 }
 for(const id of timingPartIds)assert(manifest.parts.some(p=>p.id===id&&p.status==='modeled'),id);
});
test('saved learning state tolerates malformed and retired progress',()=>{
 for(const raw of ['broken','null','{}','[]'])assert.deepEqual(readWorkthroughProgress(raw,timingLesson.steps),{step:'prepare',reviewed:[]});
 assert.deepEqual(readWorkthroughProgress(JSON.stringify({step:'retired',reviewed:['access','access','retired',7]}),timingLesson.steps),{step:'prepare',reviewed:['access']});
 assert.deepEqual(readWorkthroughProgress(JSON.stringify({step:'tension',reviewed:['inspect']}),timingLesson.steps),{step:'tension',reviewed:['inspect']});
});
test('hydraulic tensioner mounting ears retain real through-holes in the mesh',()=>{
 const geometry=createTimingGeometry().get('timing-tensioner'),mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();
 for(const x of [-.174,-.130]){const hits=new T.Raycaster(new T.Vector3(x,.40,1.7),new T.Vector3(0,0,-1),0,.2).intersectObject(mesh);assert.equal(hits.length,0,'mounting hole must remain open');}
 assert(new T.Raycaster(new T.Vector3(-.174,.409,1.7),new T.Vector3(0,0,-1),0,.2).intersectObject(mesh).length>0,'mounting ear must exist around the hole');
});

test('refined timing parts retain the exported engine height offset',()=>{
 const g=createTimingGeometry();
 for(const [id,expected] of [['timing-idler',.537],['timing-tensioner',.422],['timing-tensioner-boot',.46]]){const part=g.get(id);part.computeBoundingBox();assert(Math.abs(part.boundingBox.getCenter(new T.Vector3()).y-expected)<1e-6,id+' must align with the unchanged drive hardware');}
});
