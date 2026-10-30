import {test,expect} from '@playwright/test';

// The primary flow: library → job → the model, with the step floating over it.

test('the library leads with engines and coverage, not with one vehicle',async({page})=>{
 await page.goto('');
 await expect(page.locator('h1')).toHaveText('See how it comes apart.');

 const tile=page.locator('.ww-tile').filter({hasText:'2JZ-GE VVT-i'});
 await expect(tile).toHaveCount(1);
 await expect(tile).toContainText('2000 Lexus GS300');
 await expect(tile).toContainText('37 modelled');
 await expect(tile.getByRole('link',{name:/Timing belt replacement/})).toBeVisible();

 // Variants ruled out by a shared family name are first-class content.
 await expect(page.getByRole('heading',{name:'Named, and deliberately not covered'})).toBeVisible();
 await expect(page.locator('.ww-ruled li')).toHaveCount(3);
 await expect(page.locator('.ww-ruled')).toContainText('2JZ-GTE');
 await expect(page.getByText('No dimension is measured.',{exact:false})).toBeVisible();
});

test('search spans jobs, parts and engines and filters down',async({page})=>{
 await page.goto('');
 const search=page.getByRole('searchbox',{name:'Search jobs, parts and engines'});
 const kind=page.getByRole('combobox',{name:'Filter by type'});

 await kind.selectOption('job');
 await search.fill('cam belt');
 await expect(page.locator('.ww-hit')).toHaveCount(1);
 await expect(page.locator('.ww-hit')).toContainText('Timing belt replacement');

 await kind.selectOption('component');
 await search.fill('hydraulic tensioner');
 await expect(page.locator('.ww-hit').filter({hasText:'Hydraulic timing belt tensioner'})).toHaveCount(1);

 await kind.selectOption('all');
 await search.fill('definitely-not-a-part');
 await expect(page.getByText('Nothing matches.')).toBeVisible();
 await page.getByRole('button',{name:'Show everything'}).click();
 await expect(page.locator('.ww-hit').first()).toBeVisible();

 await page.getByRole('combobox',{name:'Filter by system'}).selectOption('cooling');
 await expect(page.locator('.ww-hit').filter({hasText:'Radiator assembly'})).toHaveCount(1);
 await expect(page.locator('.ww-hit').filter({hasText:'Timing belt idler'})).toHaveCount(0);
});

test('the model carries the step, and its parts are marked on it',async({page})=>{
 const manifest=page.waitForResponse(r=>r.url().includes('/assets/2jz-ge-vvti-jzs160/r1/assembly.json')&&r.status()===200);
 const core=page.waitForResponse(r=>r.url().endsWith('core.glb')&&r.status()===200);
 const access=page.waitForResponse(r=>r.url().endsWith('access.glb')&&r.status()===200);
 await page.goto('job/?job=2jz-ge-vvti-timing-belt&step=release-tensioner');

 await expect(page.getByRole('heading',{name:'Remove the hydraulic tensioner'})).toBeVisible();
 await Promise.all([manifest,core,access]);
 await expect(page.locator('canvas')).toBeVisible();

 // The step's own parts get a marker, labelled, while it is the current step.
 const hotspots=page.locator('.ww-hotspot:not([hidden])');
 await expect(hotspots).toHaveCount(3);
 await expect(page.locator('.ww-hotspot').filter({hasText:'Hydraulic timing belt tensioner'})).toBeVisible();

 // Tapping a marker opens the part, in plain language first.
 await page.locator('.ww-hotspot').filter({hasText:'Hydraulic timing belt tensioner'}).click();
 await expect(page.locator('.ww-part h2')).toHaveText('Hydraulic timing belt tensioner');
 await expect(page).toHaveURL(/part=timing-belt-tensioner/);

 // The technical record is one tap down, not gone.
 const more=page.locator('.ww-part .ww-more').first();
 await expect(more.locator('.ww-more-body')).toBeHidden();
 await more.locator('summary').click();
 await expect(more).toContainText('identity');
 await expect(more).toContainText('estimated, not measured');

 await page.getByRole('button',{name:'Close part detail'}).click();
 await expect(page.locator('.ww-part')).toHaveCount(0);
});

test('cautions stay on the surface while the record folds away',async({page})=>{
 await page.goto('job/?job=2jz-ge-vvti-timing-belt&step=set-position');
 // A warning is never collapsed.
 await expect(page.getByRole('alert')).toContainText('piston-to-valve contact');

 // The step's provenance is available, closed by default.
 const fold=page.locator('.ww-card .ww-more').filter({hasText:'Where this step comes from'});
 await expect(fold.locator('.ww-more-body')).toBeHidden();
 await fold.locator('summary').click();
 await expect(fold).toContainText('RM718U');

 // A specification with no established value shows the empty slot.
 await page.goto('job/?job=2jz-ge-vvti-timing-belt&step=tension');
 await expect(page.getByText('Maximum tensioner press force')).toBeVisible();
 await expect(page.locator('.ww-kv')).toContainText('not filled in yet');
});

test('progress persists across a reload and the library offers to resume',async({page})=>{
 await page.goto('job/?job=2jz-ge-vvti-timing-belt&step=release-tensioner');
 await page.getByRole('checkbox',{name:'Tensioner, boot and both bolts removed and kept together.'}).check();
 await expect(page.locator('.ww-count')).toContainText('1/22 checks');

 await page.reload();
 await expect(page.getByRole('heading',{name:'Remove the hydraulic tensioner'})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Tensioner, boot and both bolts removed and kept together.'})).toBeChecked();

 await page.getByRole('link',{name:'Wrenchwise'}).click();
 await expect(page.locator('.ww-resume')).toContainText('Remove the hydraulic tensioner');
 await page.locator('.ww-resume a').click();
 await expect(page.getByRole('heading',{name:'Remove the hydraulic tensioner'})).toBeVisible();
});

test('the steps drawer navigates the job from preparation to final checks',async({page})=>{
 await page.goto('job/?job=2jz-ge-vvti-timing-belt&step=preparation');
 await expect(page.getByRole('heading',{name:'Timing belt replacement'})).toBeVisible();
 await expect(page.getByText('This is a learning guide, not a verified repair procedure.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Back'})).toBeDisabled();

 await page.getByRole('button',{name:'Steps',exact:true}).click();
 const drawer=page.getByRole('navigation',{name:'Steps'});
 await drawer.getByRole('button',{name:/Inspect belt, idler and tensioner/}).click();
 await expect(page.getByRole('heading',{name:'Inspect belt, idler and tensioner'})).toBeVisible();
 await expect(page.locator('.ww-eyebrow')).toContainText('Step 11 of 16');

 await page.getByRole('button',{name:'Steps',exact:true}).click();
 await drawer.getByRole('button',{name:'Final checks'}).click();
 await expect(page.getByRole('heading',{name:'Before the car moves'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
});

test('the phone layout puts the step in a sheet under the model',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('job/?job=2jz-ge-vvti-timing-belt&step=crank-bolt');
 await expect(page.getByRole('heading',{name:'Loosen the crankshaft pulley bolt'})).toBeVisible();
 await expect(page.locator('canvas')).toBeVisible();

 // The sheet collapses to give the model the whole screen.
 const collapse=page.getByRole('button',{name:'Collapse the step'});
 await collapse.click();
 await expect(page.getByRole('heading',{name:'Loosen the crankshaft pulley bolt'})).toBeHidden();
 await page.getByRole('button',{name:'Expand the step'}).click();
 await expect(page.getByRole('heading',{name:'Loosen the crankshaft pulley bolt'})).toBeVisible();

 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

test('a missing model leaves the steps and the drawing working',async({page})=>{
 await page.route('**/assets/2jz-ge-vvti-jzs160/r1/assembly.json',route=>route.abort());
 await page.goto('job/?job=2jz-ge-vvti-timing-belt&step=inspect');
 await expect(page.getByRole('heading',{name:'Inspect belt, idler and tensioner'})).toBeVisible();
 await expect(page.getByText('The 3D model could not be loaded',{exact:false})).toBeVisible();
 await expect(page.getByRole('img',{name:/front elevation/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
});

test('the earlier /guide/ links still open the job',async({page})=>{
 await page.goto('guide/?job=2jz-ge-vvti-timing-belt&step=radiator');
 await expect(page.getByRole('heading',{name:'Radiator assembly'})).toBeVisible();
});
