import {test,expect} from '@playwright/test';
import path from 'node:path';

test('GS300 hood-hidden study opens in body context and links factory references',async({page})=>{
 const model=page.waitForResponse(r=>r.url().includes('gs300-assembly.glb?v=')&&r.status()===200);
 await page.goto('assembly/?study=under-hood');await model;
 await expect(page.getByRole('button',{name:'Engine bay Under the hood · installed layout',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByText('The hood is hidden so you can inspect the 2JZ-GE inside the S160 body.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Engine bay Engine cover & PCV connection',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Engine cover & PCV connection',exact:true})).toBeVisible();
 const stage=await page.locator('.assembly-stage').boundingBox();expect(stage?.height).toBeLessThanOrEqual(800);
 await page.goto('research/#s160-factory-references');
 await expect(page.getByRole('link',{name:'Toyota / Lexus Technical Information System',exact:true})).toHaveAttribute('href','https://techinfo.toyota.com/');
});

test('one vehicle choice opens the correct viewer and browser history restores it',async({page})=>{
 await page.goto('library/');
 await expect(page.getByRole('heading',{name:'Your car. Your next discovery.'})).toBeVisible();
 await page.getByRole('button',{name:'Lexus GS · S160 · second generation Guided mechanical studies',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Lexus GS 300 · S160',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Toyota Camry · XV70 · eighth generation Exterior exploration',exact:true}).click();
 await expect(page).toHaveURL(/model=toyota-camry-2020-236a5a/);
 await expect(page.getByRole('heading',{name:'Toyota Camry 2020',exact:true})).toBeVisible();
 await expect(page.getByRole('img',{name:/Toyota Camry 2020 exploration/})).toBeVisible();
 await page.goBack();
 await expect(page.getByRole('heading',{name:'Lexus GS 300 · S160',exact:true})).toBeVisible();
 await page.getByLabel('Search vehicles').fill('LS400 1997');
 await page.getByRole('button',{name:/Lexus LS · UCF20/}).click();
 await expect(page.getByRole('heading',{name:'Lexus LS400 · 1998',exact:true})).toBeVisible();
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
 await page.goto('workshop/?vehicle=gs300');
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
 // IndexedDB restoration competes with software WebGL startup on CI runners.
 // Keep checking the saved title, with a bounded allowance for asynchronous restore.
 await expect(page.getByText('Browser regression reference',{exact:true}).first()).toBeVisible({timeout:20000});
 await expect(page.locator('canvas')).toBeVisible();
 await expect(page.getByText('This saved model is not available in this browser.')).toHaveCount(0);
});

test('phone layouts fit the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const route of ['','library/','assembly/?lesson=engine-bay-orientation','catalog/','workshop/?vehicle=gs300']){
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

test('homepage is vehicle-neutral and system preview and search work',async({page})=>{
 await page.goto('');
 await expect(page.locator('h1')).toContainText('KNOW YOUR');
 await expect(page.getByText(/GS 300|GS300|S160/)).toHaveCount(0);
 await expect(page.locator('canvas')).toHaveCount(0);
 await page.getByRole('button',{name:'Separate layers',exact:true}).click();
 await expect(page.getByRole('button',{name:'Bring layers together'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Electrical',exact:true}).click();
 await expect(page.getByRole('img',{name:'Illustrative electrical system diagram',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Brakes',exact:true}).click();
 await expect(page.getByRole('img',{name:'Illustrative brakes system diagram',exact:true})).toBeVisible();
 await page.getByLabel('Find a make, model or body generation').fill('Camry');
 await page.getByRole('button',{name:'Search vehicles',exact:true}).click();
 await expect(page).toHaveURL(/library\/\?q=Camry/);
 await expect(page.getByLabel('Search vehicles')).toHaveValue('Camry');
 await expect(page.getByRole('heading',{name:'Your car. Your next discovery.'})).toBeVisible();
 await page.getByRole('button',{name:/Toyota Camry · XV70/}).click();
 await expect(page.getByRole('heading',{name:'Toyota Camry 2020',exact:true})).toBeVisible();
 await page.goBack();
 await expect(page.getByLabel('Search vehicles')).toHaveValue('Camry');
 await expect(page.getByRole('heading',{name:'Your car. Your next discovery.'})).toBeVisible();
});

test('legacy vehicle links still open the selected workshop',async({page})=>{
 await page.goto('?vehicle=gs300');
 await expect(page.locator('.vehicle-picker')).toContainText('GS 300');
 await expect(page.locator('canvas')).toBeVisible();
});

test('all four original LS studies open and retain generation-specific anatomy controls',async({page})=>{
 test.setTimeout(120000);
 for(const [id,title] of [['ucf10','Lexus LS400 · 1990'],['ucf20','Lexus LS400 · 1998'],['ucf30','Lexus LS430 · 2001'],['xf40','Lexus LS460 · 2007']]){
  await page.goto('library/?model=lexus-ls-'+id);
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('Loading the 3D model…',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Under the hood',exact:true}).click();
  await expect(page.getByRole('button',{name:'Under the hood',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('combobox',{name:'LS component system'}).selectOption('electrical');
  await page.getByRole('button',{name:'12-volt battery',exact:true}).click();
  await expect(page.getByRole('heading',{name:'12-volt battery',exact:true})).toBeVisible();
  if(id!=='ucf10'){await expect(page.getByRole('button',{name:'Restore finishing covers',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Restore finishing covers',exact:true}).click();}
  await page.getByRole('button',{name:'Engine anatomy',exact:true}).click();
  await expect(page.getByRole('img',{name:/engine study/})).toBeVisible();
  if(id!=='ucf10'){
   await page.getByRole('button',{name:'Hide finishing covers',exact:true}).click();
   await expect(page.getByRole('button',{name:'Restore finishing covers',exact:true})).toHaveAttribute('aria-pressed','true');
  }
 }
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
