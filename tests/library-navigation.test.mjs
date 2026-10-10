import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchesLibraryModel,readLibrarySelection,librarySelectionUrl} from '../lib/library-search.mjs';

const library=JSON.parse(fs.readFileSync('research/model-library.json','utf8'));
const review=JSON.parse(fs.readFileSync('research/lexus-ls-generation-review.json','utf8'));
const entries=[...library.models,...review.generations];

test('year search locates the advertised pending generation, including interior years and boundaries',()=>{
 const find=query=>entries.filter(entry=>matchesLibraryModel(entry,query)).map(entry=>entry.id);
 for(const year of [1995,1997,2000])assert.deepEqual(find(`LS400 ${year}`),['lexus-ls-ucf20']);
 assert.deepEqual(find('LS400 1994'),['lexus-ls-ucf10']);
 assert.deepEqual(find('LS400 2001'),[]);
 assert.deepEqual(find('LS430 2004'),['lexus-ls-ucf30']);
 assert.deepEqual(find('LS460 2012'),['lexus-ls-xf40']);
});

test('year search does not imply that a downloadable source model fits other years',()=>{
 const prius=library.models.find(entry=>entry.sourceYear===2012&&entry.family==='Prius');
 assert(matchesLibraryModel(prius,'Prius 2012'));
 assert(!matchesLibraryModel(prius,'Prius 2013'));
 const namedYear={...prius,sourceYear:null,name:'Prius 2012 by Example'};
 assert(!matchesLibraryModel(namedYear,'2012'));
});

test('selection URLs round trip across models and pending references without losing route, query or anchor',()=>{
 const model=library.models[0],generation=review.generations[1];
 const first=librarySelectionUrl('https://example.com/wrenchwise/library/?campaign=fall#details',model);
 const second=librarySelectionUrl('https://example.com'+first,generation);
 const third=librarySelectionUrl('https://example.com'+second,model);
 assert.equal(third,first);
 for(const [path,entry] of [[first,model],[second,generation]]){
  const url=new URL(path,'https://example.com');
  assert.equal(url.pathname,'/wrenchwise/library/');
  assert.equal(url.searchParams.get('campaign'),'fall');
  assert.equal(url.hash,'#details');
  assert.equal(url.searchParams.has('model'),!!entry.assetUrl);
  assert.equal(url.searchParams.has('generation'),!entry.assetUrl);
  assert.deepEqual(readLibrarySelection(entries,url.search),{id:entry.id,group:entry.bodyGroup});
 }
});

test('empty and unknown deep links resolve to a consistent default browsing state',()=>{
 for(const search of ['', '?model=unknown', '?generation=unknown']){
  assert.deepEqual(readLibrarySelection(entries,search),{id:entries[0].id,group:'All'});
 }
});
