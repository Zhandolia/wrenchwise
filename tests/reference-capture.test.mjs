import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {capturePlanSchema,validateCaptureLinks} from '../lib/reference-capture.ts';
const plan=JSON.parse(fs.readFileSync('research/s160/capture-plan.json'));
const reference=JSON.parse(fs.readFileSync('research/s160/reference-configuration.json'));
const evidence=JSON.parse(fs.readFileSync('public/models/gs300-evidence.json'));
const parts=new Set(evidence.records.map(p=>p.id)),sources=new Set(evidence.sources.map(s=>s.id));
test('capture plan references the same configuration and existing inventory',()=>{
 const p=capturePlanSchema.parse(plan);validateCaptureLinks(p,reference,parts,sources);
 assert.deepEqual(reference.configuration,evidence.configuration);
 assert.equal(reference.configurationId,evidence.configurationId);
});
test('capture gate rejects fabricated completion and orphan references',()=>{
 for(const mutate of [p=>p.measurements[0].status='measured',p=>p.measurements[0].value=314,p=>p.captures[0].status='captured',p=>p.measurements[0].datumId='missing']){
  const p=structuredClone(plan);mutate(p);assert.equal(capturePlanSchema.safeParse(p).success,false);
 }
 const p=structuredClone(plan);p.measurements[0].partId='not-a-part';assert.throws(()=>validateCaptureLinks(capturePlanSchema.parse(p),reference,parts,sources));
 const mismatched=structuredClone(reference);mismatched.configurationId='another-engine';assert.throws(()=>validateCaptureLinks(plan,mismatched,parts,sources));
});
