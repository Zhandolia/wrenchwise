import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readLessonProgress,recordLessonAnswer} from '../lib/lesson-progress.mjs';
const steps=[{id:'intake',check:{options:[{id:'duct'},{id:'pump'}],correctOptionId:'duct'}}];
test('lesson progress rejects corrupt, stale or out-of-range saved state',()=>{
 for(const value of ['broken','null','{}','{"step":-1}','{"step":90}'])assert.deepEqual(readLessonProgress(value,steps),{step:0,answers:{}});
 assert.deepEqual(readLessonProgress('{"step":0,"answers":{"intake":"bad","deleted":"duct"}}',steps),{step:0,answers:{}});
});
test('only known lesson answers persist and survive a reload',()=>{
 const initial=readLessonProgress(null,steps);
 assert.equal(recordLessonAnswer(initial,steps[0],'bogus'),initial);
 const answered=recordLessonAnswer(initial,steps[0],'duct');
 assert.deepEqual(readLessonProgress(JSON.stringify(answered),steps),{step:0,answers:{intake:'duct'}});
 assert.deepEqual(initial.answers,{});
});
