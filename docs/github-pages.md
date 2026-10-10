# GitHub Pages hosting

Production URL: https://zhandolia.github.io/wrenchwise/

The repository is published by `.github/workflows/pages.yml` on pushes to `main` and manual workflow dispatches. The job validates catalog/model evidence, runs tests and TypeScript, builds static output, uploads the Pages artifact and deploys it to the `github-pages` environment. GitHub records each deployment and its source commit automatically. No ChatGPT/Sites credential or runtime is used.

## Static application

`vite.pages.config.ts` builds the existing React pages from `pages/main.tsx`. Dynamic imports split the workshop, assembly, catalog, component library and research routes. `scripts/build-pages.mjs` writes a real `index.html` for each route so direct links and refreshes work on Pages; it also writes a 404 page and `.nojekyll`. `lib/app-path.ts` prefixes navigation, downloads, manifests and GLB URLs with `/wrenchwise/`. External links, fragments and local blob URLs are preserved.

`npm run build:pages` produces `dist-pages/`. `npm run preview:pages` previews that artifact at the printed `/wrenchwise/` URL. `PAGES_BASE_PATH` can override the prefix for a different repository or domain root. A changed prefix requires rebuilding.

## Storage scope

GitHub Pages serves static files, so the D1/R2 server API cannot execute here. The Pages build uses IndexedDB for personal GLB imports and notes. UI labels explicitly say these stay in the current browser; no file or note is submitted to GitHub or another server. Imported models and notes survive reloads but do not sync between devices. Clearing site storage removes them.

The existing 20 MB GLB limit, embedded-asset restriction, vertex/node checks and source/license fields remain. Community-wide changes are made through repository contributions. Shared uploads/discussions require a separately designed backend; this release does not pretend local notes are public comments. Data from the prior private site has not been copied into this public deployment. Legacy server code remains available in the repository, outside the Pages bundle.

## Verification

- Automated checks cover catalog/evidence integrity, compressed geometry, base-path behavior and all route entrypoints/model files in the generated artifact.
- Browser QA covered the ES viewer, assembly/evidence loading, local note persistence after reload and importing/reopening a generated test GLB from the local model library.
- The static bundle is checked for dependence on the prior ChatGPT host and accidental root API requests.
- Model geometry remains provisional. Hosting migration does not change its accuracy or turn the studies into repair procedures.

### Complete deployed-file verification

The Pages build now writes `deployment-manifest.json`, containing the size and SHA-256 of every deployable file except the two self-referential metadata files and `.nojekyll` (a build-control marker that Pages does not serve as a public URL). `build-info.json` binds that manifest to the Git revision. Local artifact validation recalculates the inventory; post-deploy validation downloads every listed file with bounded concurrency and checks its size and hash. This includes lazy route JavaScript, CSS, evidence JSON, assembly models and library models. A successful check demonstrates file integrity and availability; browser interaction checks remain separate.
