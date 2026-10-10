import {test,expect} from '@playwright/test';
import path from 'node:path';

test('one vehicle choice opens the correct viewer and browser history restores it',async({page})=>{
 await page.goto('library/');
 await expect(page.getByRole('heading',{name:'Lexus GS 300 · S160',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Toyota Camry · XV70 · eighth generation Exterior exploration',exact:true}).click();
 await expect(page).toHaveURL(/model=toyota-camry-2020-236a5a/);
 await expect(page.getByRole('heading',{name:'Toyota Camry 2020',exact:true})).toBeVisible();
 await expect(page.getByRole('img',{name:/Toyota Camry 2020 exploration/})).toBeVisible();
 await page.goBack();
 await expect(page.getByRole('heading',{name:'Lexus GS 300 · S160',exact:true})).toBeVisible();
 await page.getByLabel('Search vehicles').fill('LS400 1997');
 await page.getByRole('button',{name:/Lexus LS · UCF20/}).click();
 await expect(page.getByRole('heading',{name:'This generation’s learning workspace is in development.'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Download GLB/})).toHaveCount(0);
 await page.getByLabel('Search vehicles').fill('definitely-no-car');
 await expect(page.getByText('No vehicles match those filters.')).toBeVisible();
});

test('lesson check advances the anatomy view and survives reload',async({page})=>{
 await page.goto('assembly/?lesson=engine-bay-orientation');
 const lesson=page.getByRole('region',{name:'Guided engine-bay lesson'});
 await expect(lesson.getByRole('button',{name:'Next step'})).toBeDisabled();
 await lesson.getByRole('radio',{name:'Component names and their approximate relationships'}).check();
 await lesson.getByRole('button',{name:'Next step'}).click();
 await expect(lesson.getByRole('heading',{name:'Trace the intake duct',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Air duct, bellows & MAF',exact:true})).toBeVisible();
 await page.reload();
 await expect(lesson.getByRole('heading',{name:'Trace the intake duct',exact:true})).toBeVisible();
 await expect(lesson.getByText('1 / 4 checks complete')).toBeVisible();
 await lesson.getByRole('button',{name:'MAF electrical connector',exact:true}).click();
 await expect(page.locator('.part-inspector h2')).toHaveText('MAF electrical connector');
});

test('compressed personal import stays selected on reload',async({page})=>{
 await page.goto('');
 await page.locator('.vehicle-picker').click();
 await page.getByRole('button',{name:'Import a model',exact:true}).click();
 await page.getByLabel('Model name').fill('Browser regression reference');
 await page.getByLabel('Year, engine & market').fill('Test reference only');
 await page.getByLabel('Source / creator').fill('Existing licensed SC300 fixture');
 await page.getByLabel('Asset license').fill('CC BY 4.0');
 await page.locator('input[type=file]').setInputFiles(path.resolve('public/models/library/lexus-sc300-1993-2070ca.glb'));
 await page.getByRole('checkbox',{name:'I created this asset or have permission to use it under the stated license.'}).check();
 await page.getByRole('button',{name:'Import & explore',exact:true}).click();
 await expect(page).toHaveURL(/asset=/);
 await expect(page.getByText('Browser regression reference',{exact:true}).first()).toBeVisible();
 await page.reload();
 await expect(page.getByText('Browser regression reference',{exact:true}).first()).toBeVisible();
 await expect(page.locator('canvas')).toBeVisible();
 await expect(page.getByText('This saved model is not available in this browser.')).toHaveCount(0);
});

test('phone layouts fit the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const route of ['library/','assembly/?lesson=engine-bay-orientation','catalog/']){
  await page.goto(route);await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 }
});

test('a failed route chunk offers a usable reload recovery',async({page})=>{
 await page.route('**/assets/page-*.js',route=>route.abort());
 await page.goto('library/');
 await expect(page.getByRole('heading',{name:'This workspace couldn’t load.'})).toBeVisible();
 await page.unroute('**/assets/page-*.js');
 await page.getByRole('button',{name:'Reload workspace'}).click();
 await expect(page.getByRole('heading',{name:'Choose a car. Understand how it works.'})).toBeVisible();
});
