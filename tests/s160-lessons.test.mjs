import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {s160OrientationLesson as lesson} from '../lib/s160-lessons.ts';
import {serviceStudies} from '../lib/s160-service.ts';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const manifest=read('public/models/gs300-parts.json');
const target=read('research/s160/reference-configuration.json');

test('orientation lesson selects existing study geometry and traceable sources for the declared configuration',()=>{
 assert.equal(lesson.configurationId,target.configurationId);
 assert.equal(new Set(lesson.steps.map(step=>step.id)).size,lesson.steps.length);
 assert(lesson.steps.length>=3);
 for(const step of lesson.steps){
  const study=serviceStudies.find(study=>study.id===step.studyId);
  assert(study,`Missing study ${step.studyId}`);
  assert(step.partIds.length&&step.sourceIds.length);
  for(const id of step.partIds){
   assert(manifest.parts.some(part=>part.id===id),`Missing part ${id}`);
   assert(study.parts.includes(id),`Part ${id} is outside study ${study.id}`);
  }
  for(const id of step.sourceIds){
   assert(study.sourceIds.includes(id),`Source ${id} is outside study ${study.id}`);
   assert(manifest.sources.some(source=>source.id===id),`Missing source ${id}`);
  }
 }
});

test('each lesson question has one resolvable answer and explanations for every choice',()=>{
 for(const step of lesson.steps){
  const {options,correctOptionId}=step.check;
  assert(options.length>=2);
  assert.equal(new Set(options.map(option=>option.id)).size,options.length);
  assert.equal(options.filter(option=>option.id===correctOptionId).length,1);
  assert(options.every(option=>option.label.trim()&&option.explanation.trim()));
  assert(step.objective.trim()&&step.limitation.trim());
 }
});
