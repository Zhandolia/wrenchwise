# Wrenchwise

An open-source 3D automotive learning workshop. The first experience is an illustrative inline-six anatomy exploration for the 2000 Lexus GS 300 concept. **It is not a dimensionally accurate 2JZ-GE model or a verified repair procedure.**

**Website:** https://zhandolia.github.io/wrenchwise/

GitHub Pages builds and publishes this repository on every push to `main`, using `.github/workflows/pages.yml`. The public site runs entirely on GitHub Pages, with no dependency on ChatGPT hosting.

## Included

- Three.js orbit, zoom, touch, keyboard controls and named component selection.
- Shared GS 300 vehicle/engine assembly, removable hood, timing cover visibility, exploded assembly and chapter-linked highlighting.
- Six anatomy chapters, parts-planning checklist and link to Toyota/Lexus TIS.
- Lexus sedan/SUV collection with explicit model-needed states.
- Browser-local GLB imports, source/fitment/license metadata, and persistent local vehicle/chapter notes using IndexedDB. Files and notes stay on the current browser/device; they are not shared or synced. Clearing site storage removes them.
- GLB 2.0 upload validation, 20 MB size limit, self-contained assets, no required compression extensions, vertex/node limits.
- Feature-detected WebMCP tools for reading workshop state and navigating the demo chapters.
- MIT license for application code and original procedural geometry. Dependencies and uploaded assets keep their own licenses.

## Develop the GitHub Pages site

```sh
npm ci
npm run dev:pages
# Production artifact and local preview:
npm run build:pages
node scripts/validate-pages.mjs
npm run preview:pages
```

The default base path is `/wrenchwise/`. Direct links to `/catalog/`, `/assembly/`, `/components/` and `/research/` have real static directory entrypoints beneath that prefix. Set `PAGES_BASE_PATH=/` only when deploying to a domain root. `dist-pages/` contains only public assets and the static application; server routes, credentials and the earlier database are not included.

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

React 19 / TypeScript, Vite, Three.js and Shadcn/Radix UI. `pages/main.tsx` routes the static application; `lib/app-path.ts` resolves repository-relative URLs, and `lib/workshop-client.ts` provides IndexedDB storage for GitHub Pages. A legacy Vinext / Cloudflare Worker server with D1 + R2 is retained for reference. `app/page.tsx` owns the workshop interface, `components/assembly-viewer.tsx` renders the GS 300 asset, `components/workshop-viewer.tsx` renders community uploads, `lib/workshop-data.ts` holds vehicle/chapter content, `lib/glb.ts` checks assets, and `app/api/` contains storage routes. The viewer renders on camera/scene changes and caps the assembly pixel ratio at 1.6. Zero lag on all devices is not guaranteed. Textures must be optimized; file/vertex caps do not guarantee a fixed GPU memory budget.

The earlier owner-private server build remains in the source for reference, but it is not part of the GitHub Pages deployment. Its D1/R2 records have not been copied into the public site. GitHub Pages has no shared write API. Restoring public community submissions requires a separately configured backend with identity, moderation and ownership controls.

## Add a model

Import a self-contained, uncompressed GLB via **Import a model**. The model is stored locally in the browser. To add a model for everyone, contribute licensed assets and source metadata through a repository pull request. Include year, engine, market, original source/creator and asset license. Use named meshes, embedded textures preferably <= 2K, fewer than one million vertices and 1,500 nodes. Imported geometry can be inspected; guide authoring and mapping are not included in this first version. No upload is automatically verified. Uploads and comments are not bundled in the source archive.

## Repair-grade content gate

Before publishing a real repair guide: obtain licensed model-specific CAD/scans; verify fitment by year/engine/market; capture fastener and connector locations; author sequencing, tools, parts, torque and timing specifications against authorized service information; obtain qualified mechanic review and validate on a physical vehicle; attach reviewer/source/version records. Never label a guide verified based solely on this demo.

Factory service information reference: https://techinfo.toyota.com/ . No factory manual pages, copied procedures, reference photographs or Lexus/Toyota CAD are redistributed. Original component studies cite manufacturer information and distinguish sourced quantities from estimated geometry. Wrenchwise is independent of Lexus/Toyota.

See STARTER.md for the underlying framework and hosting integration.

## GS 300 model development

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
