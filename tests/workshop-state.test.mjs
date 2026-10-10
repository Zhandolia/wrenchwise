import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workshopSelectionUrl,resolveSavedAsset,createScopeGuard,noteContextLabel,isValidNoteChapter} from '../lib/workshop-state.mjs';
test('personal asset selection survives URL round trip without crossing vehicle scope',()=>{
 const models=[{id:'local-one',vehicle:'gs300'},{id:'local-two',vehicle:'ls400'}];
 const url=workshopSelectionUrl('https://example.com/wrenchwise/?campaign=learn#notes','ls400','local-two');
 assert.equal(url.searchParams.get('campaign'),'learn');assert.equal(url.hash,'#notes');
 assert.equal(resolveSavedAsset(models,url.searchParams.get('vehicle'),url.searchParams.get('asset')),models[1]);
 assert.equal(resolveSavedAsset(models,'gs300','local-two'),undefined);
 assert.equal(resolveSavedAsset(models,'ls400','deleted-asset'),undefined);
 assert.equal(workshopSelectionUrl(url,'gs300').searchParams.has('asset'),false);
});
test('note save completion is rejected after switching away and back to its vehicle',async()=>{
 const guard=createScopeGuard();const original=guard.enter('gs300:demo');
 let complete;const save=new Promise(resolve=>{complete=resolve;});
 const visible=[];const result=save.then(note=>{if(guard.isCurrent(original))visible.push(note);});
 guard.enter('ls400:demo');const returned=guard.enter('gs300:demo');complete('old save');await result;
 assert.deepEqual(visible,[]);assert(guard.isCurrent(returned));assert(!guard.isCurrent(original));
 assert.equal(guard.enter('gs300:demo'),returned);
});
test('vehicle notes and legacy exploration chapters retain truthful context',()=>{
 assert.equal(noteContextLabel({chapter:-1},'gs300'),'Vehicle note');
 assert.equal(noteContextLabel({chapter:0},'ls400'),'Vehicle note');
 assert.equal(noteContextLabel({chapter:2},'gs300'),'GS 300 exploration · Chapter 3');
 for(const chapter of [-1,0,5])assert(isValidNoteChapter(chapter));
 for(const chapter of [-2,6,1.5,null,'0'])assert(!isValidNoteChapter(chapter));
});
