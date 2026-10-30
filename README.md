# Wrenchwise

An interactive mechanical reference for engines, their components, and the jobs done on them. The flow is:

**engine → job → preparation → steps linked to 3D components → final checks.**

The unit of coverage is an **engine variant in a recorded configuration**, never a model name. A shared family name is not shared parts, so each variant is covered on its own terms or not at all — and the library says which.

The first variant carried all the way through is the **2JZ-GE VVT-i as installed in a 2000 US-market, left-hand-drive Lexus GS300 (JZS160)**, with a 16-step timing-belt walkthrough bound to a selectable 37-component assembly. That is the first entry in the library, not the subject of the project; adding the next engine is a content change, documented in [docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md).

> **This is an educational overview, not a verified repair procedure.** No dimension in the model is measured — every length and position is estimated from photograph proportions. No torque, timing or clearance value is entered. No qualified technician has reviewed the sequence, and nothing has been validated on a vehicle. `content/releases.json` lists all eleven open gaps, and the application prints them on the library page.

**Website:** https://zhandolia.github.io/wrenchwise/

GitHub Pages builds and publishes this repository on every push to `main`, using `.github/workflows/pages.yml`.

## The primary flow

| Route | What it is |
| --- | --- |
| `/` | The library: engine cards with the vehicles each is recorded in and the jobs available, search across jobs, parts and engines, a resume card, the variants deliberately not covered, and the release record with its open gaps |
| `/guide/` | Procedure workspace: contents, instructions and the 3D assembly together on desktop; Guide and 3D tabs on a phone |
| `/archive/` | The earlier exploration workspace and its studies, kept working at their own routes |

Both the engine cards and the "named, and deliberately not covered" list are derived from content: an engine appears once it has a component inventory, and every variant an engine's `notEquivalentTo` rules out becomes a coverage entry with its reason. Nothing on the library page is written per engine.

## Interface

Two surfaces, deliberately different. A **light reading column** holds the text you work from, and a **dark stage** holds the model — the contrast is the main focus device, and it is what makes silver and cast finishes read as metal rather than as shadow. Within the reading column exactly one thing is large: the step you are on.

- A **phase rail** across the top shows the shape of the job (access → positioning → removal → inspection → installation → tensioning → verification → reassembly) and names the phase you are in.
- Instructions are the biggest body text on the page. Tools, parts, sources, gaps and the assembly delta fold away until asked for; cautions and completion checks never do.
- The action bar is pinned to the bottom of the column, so what to do next is always on screen.
- Systems are colour-coded consistently across the part chips, the part callout and the generated illustration, so "the blue ones" means the same thing wherever you are looking.
- Selecting a part opens a callout over the stage rather than a panel that eats the column.

Each step drives the assembly state, and the assembly drives the instructions: clicking a component in 3D opens it in the inspector and puts it in the URL; clicking a component chip in the instructions selects it in the model. Procedural removal (what the step physically takes off, folded cumulatively over the steps so far) is rendered and labelled separately from viewing aids (hide, isolate, ghost, explanatory separation), so an exploded view is never mistaken for a removal sequence.

Progress — preparation checklist, per-step completion checks, final checks and position — is stored in `localStorage` per procedure **and revision**. A revision change, a corrupt value or an unknown check id starts clean rather than restoring the wrong step.

Nothing in the interface states a mechanical fact without its source and status beside it. Components carry five independent verification axes (identity, dimensions, placement, fitment, procedure); a specification with no established value shows the empty slot, its status and where to look it up. Sources recorded as unauthorized mirrors are named for traceability and never linked.

## How the content and the model fit together

```
content/            configurations, engines, component inventory, procedures,
                    sources, releases — validated against content/schema/
modeling/wrenchwise/ recipes.json (shape + material per component)
                     build_assembly.mjs  → public/assets/<engine>/r<n>/   (served, CI-verified)
                     build_timing_assembly.py → Blender authoring scene
src/                content catalog, procedure state, search, Three.js controller, UI
```

Content is discovered with a glob, so adding a configuration, engine or procedure needs no code change. See **[docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md)** for the full recipe, including the evidence rules the validators enforce, and **[modeling/wrenchwise/README.md](modeling/wrenchwise/README.md)** for the geometry pipeline.

Release `r1` assets: `core.glb` (33 meshes, engine structure and timing drive, loaded first) and `access.glb` (11 meshes, the assemblies removed for access), 8,456 triangles and 697 KB in total, plus `assembly.json` and a generated `layout.svg` used as the illustration when WebGL is unavailable.

## Checks

```sh
node scripts/validate-content.mjs                    # schemas, cross-references, release record
node modeling/wrenchwise/build_assembly.mjs --check  # the export is reproducible from the inventory
node scripts/validate-assets.mjs                     # ids, scale, materials, budgets, procedure coverage
node --test tests/*.test.mjs                         # needs Node 22.6+ for .ts imports; CI uses 24
npx tsc --noEmit
npm run build:pages && node scripts/validate-pages.mjs
npx playwright test
```

Software checks confirm navigation, component mapping, visibility, camera framing, procedure state, persistence, mobile behaviour and loading failures. **They establish nothing about mechanical accuracy.** See the content gate below.

## Develop the GitHub Pages site

```sh
npm ci
npm run dev:pages
# Production artifact and local preview:
npm run build:pages
node scripts/validate-pages.mjs
npm run preview:pages
```

The default base path is `/wrenchwise/`. Direct links to `/guide/`, `/archive/`, `/catalog/`, `/assembly/`, `/components/` and `/research/` have real static directory entrypoints beneath that prefix. Set `PAGES_BASE_PATH=/` only when deploying to a domain root. `dist-pages/` contains only public assets and the static application; server routes, credentials and the earlier database are not included.

## Legacy server development

Use Node 24 LTS (validated on 24.19.0). Node 26 caused a Vite initialization hang in the development environment.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_demonic_juggernaut.sql
npm run dev
```

Apply the initial migration once per local database. Do not replay it. Later schema changes must append new migrations using `npm run db:generate`. Preview runs on the printed localhost URL. `npm start` previews built output. `npx tsc --noEmit` checks types.

## Architecture

React 19 / TypeScript, Vite, Three.js and Shadcn/Radix UI. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the repository audit, the content model and the prioritized plan.

`pages/main.tsx` routes the static application; `lib/app-path.ts` resolves repository-relative URLs. The primary flow lives in `src/`: `src/content/catalog.ts` loads and indexes the content, `src/content/procedure-state.mjs` computes the scene state at a step and the resumable progress, `src/content/search.mjs` is the search, `src/viewer/assembly-scene.ts` is the framework-free Three.js controller, and `src/ui/` is the interface.

The archive keeps its own code: `app/page.tsx` owns the earlier workshop interface, `components/assembly-viewer.tsx` renders the GS 300 asset, `components/workshop-viewer.tsx` renders community uploads, `lib/workshop-data.ts` holds vehicle/chapter content, `lib/glb.ts` checks assets, `lib/workshop-client.ts` provides IndexedDB storage, and `app/api/` contains the retained Vinext / Cloudflare Worker storage routes. The viewer renders on camera/scene changes and caps the assembly pixel ratio at 1.6. Zero lag on all devices is not guaranteed. Textures must be optimized; file/vertex caps do not guarantee a fixed GPU memory budget.

The earlier owner-private server build remains in the source for reference, but it is not part of the GitHub Pages deployment. Its D1/R2 records have not been copied into the public site. GitHub Pages has no shared write API. Restoring public community submissions requires a separately configured backend with identity, moderation and ownership controls.

## Repair-grade content gate

This applies to the primary flow as much as to the archive. Before publishing a real repair guide: obtain licensed model-specific CAD/scans; verify fitment by year/engine/market; capture fastener and connector locations; author sequencing, tools, parts, torque and timing specifications against authorized service information; obtain qualified mechanic review and validate on a physical vehicle; attach reviewer/source/version records. Never label a guide verified based solely on this demo. The validators enforce part of this: `validate-content` refuses a procedure marked `verified` unless `content/releases.json` records a completed mechanical review, and refuses a `measured` dimension whose sources do not permit dimensional use.

Factory service information reference: https://techinfo.toyota.com/ . No factory manual pages, copied procedures, reference photographs or Lexus/Toyota CAD are redistributed. Original component studies cite manufacturer information and distinguish sourced quantities from estimated geometry. Wrenchwise is independent of Lexus/Toyota.

See STARTER.md for the underlying framework and hosting integration.

---

# Archive

Everything below documents the earlier exploration workspace, now served at `/archive/` and its own routes. It is kept working, and its research is cited by the source registry, but it is not part of the primary flow.

## Add a model

Import a self-contained, uncompressed GLB via **Import a model**. The model is stored locally in the browser. To add a model for everyone, contribute licensed assets and source metadata through a repository pull request. Include year, engine, market, original source/creator and asset license. Use named meshes, embedded textures preferably <= 2K, fewer than one million vertices and 1,500 nodes. Imported geometry can be inspected; guide authoring and mapping are not included in this first version. No upload is automatically verified. Uploads and comments are not bundled in the source archive.

## GS 300 model development

The October 9 intake surface revision rebuilds five existing engine-bay groups and adds an [intake close-up study](https://zhandolia.github.io/wrenchwise/assembly/?study=air-intake). Read the [engine-bay audit and reproduction notes](docs/engine-bay-research-2026-10-09.md). It improves visual continuity, not dimensional verification. The downloadable Blender archive remains the v5 baseline; the current GLB contains the newer intake surfaces.

Revision 3 replaces the generic exterior with an S160 pre-facelift photographic surface study. Both workshop views now use the same versioned model. This is still **not a verified 1:1 car**. Read [vehicle accuracy](docs/vehicle-accuracy.md) before contributing geometry. The searchable manifest distinguishes modeled groups from missing items; modeled groups may contain multiple physical pieces.

Build with Blender 4.5:

```sh
blender --background --factory-startup --python modeling/build_gs300.py -- /absolute/output/directory
```

Keep `modeling/gs300_exterior.py` alongside the build script. It exports the named GLB, native Blender file, inventory JSON, perspective render and front/side/rear orthographic renders. Rebuild time depends on CPU/GPU. `public/models/` contains the current web export; `modeling/validation/` records review renders. Dimensions and photographs are references, not certification.

## Catalog reconstruction audit

See [the 11-vehicle research audit](docs/catalog-research.md) and [third-party asset licenses](THIRD_PARTY_ASSETS.md). The current build includes four exterior references derived from two CC BY sources, with seven vehicles still awaiting accepted geometry. No model or repair procedure is mechanically verified.

## S160 mechanical revision 5

The GS300 now has eleven source-linked engine, timing, pump and A650E studies. See [mechanical research and validation](docs/s160-mechanical-v5.md). The assembly contains 413 rebuilt/new mechanical groups and 513 modeled groups overall; **zero complete parts are dimensionally verified**. The hosted GLB uses Meshopt compression; the built-in assembly viewer includes its decoder. Community uploads remain uncompressed.

Run `node modeling/s160/validate_web.mjs` with Node 24 to check manifest/mesh IDs, study references and eight documented quantity groups. Native Blender geometry and modeling scripts are available in the downloadable source archive.

## Next GS300 milestones and progress tracking

The [prioritized S160 roadmap](docs/s160-roadmap.md) defines detailed solutions, dependencies and acceptance checks, beginning with reference evidence and inventory reconciliation, then measured timing/pump service geometry. The [baseline audit](docs/s160-priority-audit.md) explains the current blockers.

Record each major step in the [progress ledger](docs/s160-progress.md), run relevant checks, commit it with a descriptive message and push to the GitHub remote. Confirm the pushed SHA. A planning or software checkpoint does not establish mechanical verification.

Toyota and Lexus are now the first makes in the extensible vehicle registry. See [catalog coverage](docs/toyota-lexus-catalog.md) and `/catalog`. Nameplate discovery and verified 3D coverage are separate.

## Lexus class modeling checkpoint

The ES XV70 exterior/cabin reference is available at `/?vehicle=lexus-es-xv70-reference` (490,894 triangles, 42 selectable material groups, 3.94 MB). An Altezza-derived IS development mesh failed stock identity review and remains outside the catalog. LS, GX and LX source candidates are tracked, not represented as finished cars. See [modeling checkpoint](docs/lexus-class-modeling.md) for geometry, provenance, errors, reproduction and next steps. No new engine or transmission geometry was added in this checkpoint.
