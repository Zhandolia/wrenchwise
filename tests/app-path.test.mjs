import {test} from 'node:test';
import assert from 'node:assert/strict';
test('GitHub Pages paths retain repo prefix, queries, fragments and external targets',async()=>{
 globalThis.__GITHUB_PAGES__=true;globalThis.__APP_BASE_PATH__='/wrenchwise/';
 const {appPath,localWorkshop}=await import('../lib/app-path.ts?pages');
 assert.equal(localWorkshop,true);
 for(const [input,output] of [['/','/wrenchwise/'],['/catalog','/wrenchwise/catalog'],['/?vehicle=lexus-es-xv70-reference','/wrenchwise/?vehicle=lexus-es-xv70-reference'],['/models/gs300-assembly.glb','/wrenchwise/models/gs300-assembly.glb'],['/wrenchwise/catalog','/wrenchwise/catalog'],['#parts','#parts'],['https://example.com','https://example.com'],['//example.com','//example.com'],['blob:local-model','blob:local-model']])assert.equal(appPath(input),output);
 delete globalThis.__GITHUB_PAGES__;delete globalThis.__APP_BASE_PATH__;
 const fallback=await import('../lib/app-path.ts?server');assert.equal(fallback.localWorkshop,false);assert.equal(fallback.appPath('/catalog'),'/catalog');
});
