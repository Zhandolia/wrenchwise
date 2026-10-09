import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const audit=read('research/lexus-expansion-2026-10-09.json');
const catalog=read('public/research/vehicle-catalog.json');

test('requested Lexus targets retain separate generations and correct engine families',()=>{
 const expected={ls400:['ucf20','1uz-fe-vvti',2000],ls430:['ucf30','3uz-fe',2001],es300:['xv20','1mz-fe-vvti',2000],es330:['xv30','3mz-fe',2004]};
 for(const [id,[generation,engine,year]] of Object.entries(expected)){
  const record=catalog.records.find(r=>r.id===id),target=audit.targets.find(t=>t.id===id);
  assert.equal(record.generationId,generation);
  assert.equal(record.engineId,engine);
  assert.equal(target.engineId,engine);
  assert.equal(target.workingYear,year);
  assert(catalog.engines.find(e=>e.id===engine).recordIds.includes(id));
 }
});

test('unreviewed source candidates cannot appear as accepted vehicle or engine assets',()=>{
 for(const target of audit.targets){
  const record=catalog.records.find(r=>r.id===target.id);
  assert.equal(target.assetUrl,null);
  assert.equal(record.assetUrl,null);
  assert.equal(record.assetStatus,'not-built');
  assert.equal(catalog.engines.find(e=>e.id===target.engineId).assetUrl,null);
 }
 assert.equal(audit.publication.newVehicleMeshesUploaded,0);
 assert.equal(audit.completeVehicleModels,0);
 assert.equal(audit.physicallyVerifiedParts,0);
});

test('published research matches reviewed evidence and all target references resolve',()=>{
 assert.deepEqual(read('public/research/lexus-expansion-2026-10-09.json'),audit);
 const ids=audit.sources.map(s=>s.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const t of audit.targets){
  for(const id of [...t.sourceIds,t.dimensionSourceId])assert(ids.includes(id),`${t.id}: missing ${id}`);
  assert(t.sourceIds.includes(t.dimensionSourceId));
  assert(t.nominalEnvelopeInches.wheelbase<t.nominalEnvelopeInches.length);
 }
 for(const source of audit.sources)assert.equal(new URL(source.url).protocol,'https:');
});
