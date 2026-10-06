import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('public/research/vehicle-catalog.json'));
test('catalog preserves targets and every imported lineage vehicle; no fake asset coverage',()=>{
 assert.equal(new Set(data.records.map(r=>r.id)).size,data.records.length);
 assert.equal(data.records.filter(r=>r.kind==='historical-record').length,607);
 const sources=new Set(data.sources.map(s=>s.id));
 for(const r of data.records){assert(data.makes.some(m=>m.name===r.make));assert(r.sourceIds.length>0);for(const id of r.sourceIds)assert(sources.has(id));
  if(r.assetUrl){assert(fs.existsSync('public'+r.assetUrl));assert.equal(r.kind,'workshop-target');assert.notEqual(r.assetStatus,'not-built');}
  else assert.equal(r.assetStatus,'not-built');
  if(r.kind!=='workshop-target')assert.equal(r.configurationStatus,'unresolved');
 }
 assert.deepEqual(data.records.filter(r=>r.assetUrl).map(r=>r.id).sort(),['gs300','gs400','gs430','rx300','toyota-gr-supra-reference']);
 for(const id of ['gs300','gs400','gs430','ls400','ls430','es300','es330','rx300','rx330','gx470','lx470'])assert(data.records.some(r=>r.id===id));
 for(const make of ['Toyota','Lexus'])assert(data.records.some(r=>r.make===make));
 assert.equal(data.coverage.status,'incomplete');
});
