import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('public/research/vehicle-catalog.json'));
const get=id=>data.records.find(r=>r.id===id);
test('every source record belongs to exactly one family and generation',()=>{
 const all=data.families.flatMap(f=>f.generations.flatMap(g=>g.recordIds));
 assert.equal(new Set(all).size,all.length);assert.deepEqual(all.sort(),data.records.map(r=>r.id).sort());
 assert.equal(new Set(data.families.map(f=>f.id)).size,data.families.length);
 for(const f of data.families){assert.deepEqual(f.recordIds.slice().sort(),f.generations.flatMap(g=>g.recordIds).sort());for(const g of f.generations)for(const id of g.recordIds){assert.equal(get(id).familyId,f.id);assert.equal(get(id).generationId,g.id);}}
});
test('GS badges share S160 body generation but retain distinct powertrains and IDs',()=>{
 for(const id of ['gs300','gs400','gs430']){assert.equal(get(id).familyId,'lexus-gs');assert.equal(get(id).generationId,'s160');}
 assert.equal(new Set(['gs300','gs400','gs430'].map(id=>get(id).engineId)).size,3);
 assert.equal(get('ls400').familyId,get('ls430').familyId);assert.notEqual(get('ls400').generationId,get('ls430').generationId);
 assert.equal(get('ls430').engineId,get('gs430').engineId);
});
test('regional overviews deduplicate; historical uncertainty and body distinctions survive',()=>{
 assert.equal(data.families.filter(f=>f.make==='Toyota'&&f.name==='Supra').length,1);
 const corolla=data.families.find(f=>f.id==='toyota-corolla');assert(corolla.recordIds.length>1);
 assert(data.families.some(f=>f.id==='toyota-corolla-cross'));
 for(const r of data.records.filter(r=>r.kind==='historical-record'))assert(r.generationId.startsWith('source-'));
});
test('engine references cannot silently enable geometry in other installations',()=>{
 for(const e of data.engines){assert(e.sourceUrl.startsWith('https://'));for(const id of e.recordIds)assert.equal(get(id).engineId,e.id);}
 assert.equal(data.engines.find(e=>e.id==='3uz-fe').assetUrl,null);
 assert.equal(get('gs400').assetStatus,'exterior-reference');
});
import {matchesCatalogRecord} from '../scripts/catalog-families.mjs';
test('badge searches do not match incidental body description substrings',()=>{
 assert(matchesCatalogRecord(get('gs400'),'GS 400'));
 assert(matchesCatalogRecord(get('gs400'),'GS400'));
 assert(!matchesCatalogRecord(get('ls400'),'GS 400'));
 assert(matchesCatalogRecord(get('gs300'),'2JZ-GE'));
});
