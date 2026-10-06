import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {vehicleEvidenceSchema,evidenceCounts} from '../lib/vehicle-evidence.ts';
const base=JSON.parse(fs.readFileSync('public/models/gs300-evidence.json'));
test('migration keeps 759 legacy records and separates six reconciliation records',()=>{
 const data=vehicleEvidenceSchema.parse(base); assert.equal(data.records.length,759);
 assert.deepEqual(evidenceCounts(data),{modeledGroups:513,absentGeometry:240,unresolvedRecords:6,verifiedParts:0,measuredParts:0});
 const c=data.claims.find(c=>c.partId==='water-pump');assert.equal(c.subject,'Water pump mounting bolts');assert.equal(c.value,6);
});
test('reject unreferenced verification, orphan source, unrelated claim, duplicate IDs',()=>{
 for(const mutate of [d=>d.records[0].reviews[0].status='verified',d=>d.claims[0].sourceIds=['not-a-source'],d=>d.records[0].claimIds=[d.claims[0].id],d=>d.records.push(d.records[0])]){
  const d=structuredClone(base);mutate(d);assert.equal(vehicleEvidenceSchema.safeParse(d).success,false);
 }
});
test('reject adjacent-year evidence and stale review; allow narrowly measured exact feature',()=>{
 const d=structuredClone(base),p=d.records[0];d.configuration.referenceId='test-reference';d.configuration.identificationStatus='physically-identified';
 d.sources.push({id:'measurement',title:'Test-only measurement',url:'https://example.org/test',applicability:'exact-target',rights:'test fixture'});
 d.claims.push({id:'measured-width',partId:p.id,domain:'dimensions',subject:'Test datum width',sourceIds:['measurement'],section:'fixture',value:1,unit:'m',datum:'test datums A/B',uncertainty:.01,method:'physical-measurement',referenceId:'test-reference',notes:'Synthetic validation fixture, never published'});
 p.claimIds.push('measured-width');Object.assign(p.reviews.find(r=>r.domain==='dimensions'),{status:'verified',claimIds:['measured-width'],reviewer:'test reviewer',reviewedRevision:d.modelRevision});
 assert.equal(vehicleEvidenceSchema.safeParse(d).success,true);assert.equal(evidenceCounts(d).verifiedParts,0);
 d.sources.at(-1).applicability='adjacent-year';assert.equal(vehicleEvidenceSchema.safeParse(d).success,false);
 d.sources.at(-1).applicability='exact-target';p.reviews.find(r=>r.domain==='dimensions').reviewedRevision='old';assert.equal(vehicleEvidenceSchema.safeParse(d).success,false);
});
