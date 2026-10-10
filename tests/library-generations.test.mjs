import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareLibraryEntries,matchesLibraryModel} from '../lib/library-search.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const library=read('research/model-library.json');
const review=read('research/lexus-ls-generation-review.json');
test('all five LS generations are discoverable in order; original studies remain separate from held third-party candidates',()=>{
 assert.deepEqual(review,read('public/research/lexus-ls-generation-review.json'));
 const generations=[...review.generations,...library.models.filter(m=>m.family==='LS')].sort(compareLibraryEntries);
 assert.equal(generations.length,5);
 assert.deepEqual(generations.map(m=>m.generation.toLowerCase().match(/first|second|third|fourth|fifth/)[0]),['first','second','third','fourth','fifth']);
 for(const m of review.generations){
  assert.equal(m.status,'original-provisional-study');assert.equal(m.studyUrl,'/library/?model='+m.id);
  assert.equal(m.assetUrl,undefined);
  assert(!library.models.some(asset=>asset.id===m.id));
  assert(matchesLibraryModel(m,'Lexus LS'));
  assert(matchesLibraryModel(m,m.generation.split(' ')[0]));
  assert.equal(new URL(m.referenceUrl).protocol,'https:');
 }
 for(const c of review.candidates.filter(c=>c.disposition==='held-not-published'))assert(!library.models.some(m=>m.sourceSha256===c.sourceSha256));
});
