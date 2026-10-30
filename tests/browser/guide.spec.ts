import {test,expect} from '@playwright/test';

// The primary flow: configuration → job → preparation → steps linked to 3D
// components → final checks.

test('the index finds a job by keyword and by part, and states what is applicable',async({page})=>{
 await page.goto('');
 await expect(page.locator('h1')).toHaveText('Jobs & parts');
 await expect(page.locator('.wr-config')).toContainText('2000 Lexus GS300');
 await expect(page.locator('.wr-config')).toContainText('2JZ-GE VVT-i');

 const search=page.getByRole('searchbox',{name:'Search jobs, parts and engines'});
 const kind=page.getByRole('combobox',{name:'Filter by type'});
 await kind.selectOption('job');
 await search.fill('cam belt');
 await expect(page.locator('.wr-row')).toHaveCount(1);
 await expect(page.locator('.wr-row')).toContainText('Timing belt replacement');

 await kind.selectOption('component');
 await search.fill('hydraulic tensioner');
 await expect(page.locator('.wr-row').filter({hasText:'Hydraulic timing belt tensioner'})).toHaveCount(1);

 await kind.selectOption('all');
 await search.fill('definitely-not-a-part');
 await expect(page.getByText('Nothing matches those filters.')).toBeVisible();
 await page.getByRole('button',{name:'Show everything'}).click();
 await expect(page.locator('.wr-row').first()).toBeVisible();

 await page.getByRole('combobox',{name:'Filter by system'}).selectOption('timing-drive');
 await expect(page.locator('.wr-row').filter({hasText:'Timing belt idler'})).toHaveCount(1);
 await expect(page.locator('.wr-row').filter({hasText:'Radiator assembly'})).toHaveCount(0);
 await page.getByRole('combobox',{name:'Filter by system'}).selectOption('cooling');
 await expect(page.locator('.wr-row').filter({hasText:'Radiator assembly'})).toHaveCount(1);
 await page.getByRole('button',{name:'Clear filters'}).click();

 // The release record is on the page, gaps and all.
 await expect(page.getByRole('heading',{name:/Unresolved gaps \(\d+\)/})).toBeVisible();
 await expect(page.getByText('No dimension is measured.',{exact:false})).toBeVisible();
});

test('a step drives the assembly, and the assembly drives the instructions',async({page})=>{
 // Register the asset waiters before navigating: the viewer starts loading
 // as soon as the page mounts.
 const manifest=page.waitForResponse(r=>r.url().includes('/assets/2jz-ge-vvti-jzs160/r1/assembly.json')&&r.status()===200);
 const core=page.waitForResponse(r=>r.url().endsWith('core.glb')&&r.status()===200);
 const access=page.waitForResponse(r=>r.url().endsWith('access.glb')&&r.status()===200);
 await page.goto('guide/?job=2jz-ge-vvti-timing-belt&step=preparation');
 await expect(page.getByRole('heading',{name:'Timing belt replacement'})).toBeVisible();
 await expect(page.getByText('Educational overview, not a verified repair procedure')).toBeVisible();
 await expect(page.getByText('2JZ-GE without VVT-i (1993–1997 GS300/SC300, Supra NA)',{exact:false})).toBeVisible();

 await Promise.all([manifest,core,access]);
 await expect(page.locator('canvas')).toBeVisible();
 await expect(page.locator('.wr-inspector')).toContainText('37 components');

 // Jump to a step from the contents. The step's own assembly change is listed.
 await page.getByRole('navigation',{name:'Contents'}).getByRole('button',{name:'Remove the hydraulic tensioner'}).click();
 await expect(page.getByRole('heading',{name:'Remove the hydraulic tensioner'})).toBeVisible();
 await expect(page.locator('.wr-instructions')).toContainText('Removed: Hydraulic timing belt tensioner');
 await expect(page).toHaveURL(/step=release-tensioner/);

 // Instructions → model: selecting a component chip reaches the inspector.
 await page.getByRole('button',{name:'Hydraulic timing belt tensioner',exact:true}).click();
 await expect(page.locator('.wr-inspector h2')).toHaveText('Hydraulic timing belt tensioner');
 await expect(page.locator('.wr-inspector')).toContainText('identity');
 await expect(page).toHaveURL(/part=timing-belt-tensioner/);

 // Isolation and explanatory separation are labelled as viewing aids.
 await page.getByRole('button',{name:'Isolate selected'}).click();
 await expect(page.getByRole('button',{name:'Isolate selected'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Separate for clarity'}).click();
 await expect(page.getByText('This is an explanatory separation, not a removal sequence',{exact:false})).toBeVisible();
});

test('checks persist across a reload and the index offers to resume',async({page})=>{
 await page.goto('guide/?job=2jz-ge-vvti-timing-belt&step=release-tensioner');
 await expect(page.getByRole('heading',{name:'Remove the hydraulic tensioner'})).toBeVisible();
 await page.getByRole('checkbox',{name:'Tensioner, boot and both bolts removed and kept together.'}).check();
 await expect(page.locator('.wr-nav-count')).toContainText('Step 8 of 16');

 await page.reload();
 await expect(page.getByRole('heading',{name:'Remove the hydraulic tensioner'})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Tensioner, boot and both bolts removed and kept together.'})).toBeChecked();

 await page.getByRole('link',{name:'Jobs & parts',exact:true}).click();
 await expect(page.locator('.wr-resume')).toContainText('Remove the hydraulic tensioner');
 await page.locator('.wr-resume a').click();
 await expect(page.getByRole('heading',{name:'Remove the hydraulic tensioner'})).toBeVisible();
});

test('navigation runs preparation to final checks and specifications stay honest',async({page})=>{
 await page.goto('guide/?job=2jz-ge-vvti-timing-belt&step=preparation');
 await expect(page.locator('.wr-nav-count')).toContainText('Preparation');
 await page.getByRole('button',{name:'Back'}).first().isDisabled();

 await page.getByRole('button',{name:'Next'}).click();
 await expect(page.locator('.wr-nav-count')).toContainText('Step 1 of 16');

 await page.getByRole('navigation',{name:'Contents'}).getByRole('button',{name:'Connect the belt and set the tensioner'}).click();
 await expect(page.getByText('Maximum tensioner press force')).toBeVisible();
 await expect(page.locator('.wr-defs')).toContainText('not entered');

 await page.getByRole('navigation',{name:'Contents'}).getByRole('button',{name:'Final checks'}).click();
 await expect(page.getByRole('heading',{name:'Before the car moves'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
 await expect(page.getByText('Progress is stored in this browser only.',{exact:false})).toBeVisible();
});

test('the phone layout keeps the guide first and switches to the 3D tab',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('guide/?job=2jz-ge-vvti-timing-belt&step=crank-bolt');
 await expect(page.getByRole('heading',{name:'Loosen the crankshaft pulley bolt'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Assembly view'})).toBeHidden();

 await page.getByRole('button',{name:'3D view',exact:true}).click();
 await expect(page.getByRole('region',{name:'Assembly view'})).toBeVisible();
 await expect(page.getByRole('article',{name:'Instructions'})).toBeHidden();

 await page.getByRole('button',{name:'Guide',exact:true}).click();
 await expect(page.getByRole('article',{name:'Instructions'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

test('a missing assembly falls back to the illustration without losing the instructions',async({page})=>{
 await page.route('**/assets/2jz-ge-vvti-jzs160/r1/assembly.json',route=>route.abort());
 await page.goto('guide/?job=2jz-ge-vvti-timing-belt&step=inspect');
 await expect(page.getByRole('heading',{name:'Inspect belt, idler and tensioner'})).toBeVisible();
 await expect(page.getByText('The 3D assembly could not be loaded',{exact:false})).toBeVisible();
 await expect(page.getByRole('img',{name:/front elevation/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
});
