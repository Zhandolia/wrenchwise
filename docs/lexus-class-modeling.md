# Lexus LS / IS / ES / GX / LX modeling checkpoint — 2026-10-06

## October 9: LS400, LS430, ES300 and ES330 research

After sign-in, the LS430 GLB and original 1997 ES300 scan were acquired and inspected. The LS430 has missing wheels, a roll cage, an intercooler and multiple alternative engine groups. Its `pessima` group names and `2jz_gte.011` material raise unresolved provenance questions; it fails stock 3UZ-FE installation review. The file is retained locally, not redistributed. `modeling/validation/ls430-candidate-review.json` records its hash and findings.

The ES300 scan is now downloadable and interactive at `/research/#es300-source-scan`, clearly labeled **1997 research reference only**. It preserves 79,896 triangles and the author's embedded JPEG. Roof/windshield damage, fused ground and missing mechanical underside are visible. Attribution and viewer metadata were added without changing the binary geometry or texture. Reproduce with `node modeling/lexus-classes/prepare_es300_scan.mjs /path/to/original.glb`; the script rejects a different source hash. It does not replace the 2000 target or enable repair instructions. All four requested complete stock models remain unfinished.

### Initial research checkpoint (before sign-in)

The requested four-car expansion is **not a completed model delivery**. Six candidates and sixteen source records are tracked in `research/lexus-expansion-2026-10-09.json`, published at `/research/#requested-lexus-models`. Existing working years remain 2000 LS400, 2001 LS430, 2000 ES300 and 2004 ES330. The proposed 2004 LS430 and 2003 ES300 alternatives have not been selected. Generation and engine-family links now distinguish UCF20/1UZ, UCF30/3UZ, XV20/1MZ and XV30/3MZ; none enables shared installation geometry.

Manufacturer brochures establish nominal envelopes and configuration differences. Matched dealer engine photographs were inspected for 2000 ES300, 2004 ES330 and the alternative 2004 LS430. The 1997 ES300 scan has visible roof/glass defects and predates the current target's facelift. The LS430 download requires login, and its broad year label and uploader license still require source-file and provenance review. The modified LS400 and private-use ES/Windom candidates do not establish suitable stock, redistributable meshes.

The ledger records source scope, incompatible references, unresolved dimensions, per-car modeling work and capture requirements. No new meshes were uploaded; no physical parts were verified. Next: obtain acceptable source files or calibrated reference captures, inspect the exterior from six views, then model and measure the installed engine bay and separate parts. Engine labels and brochure dimensions alone cannot certify a 1:1 vehicle.

This checkpoint adds one accepted **visual reference**, not five completed replicas. No complete 1:1 or service-ready model is established. Generations remain separate within each family; engine badges do not create duplicate body families, and shared families do not establish compatible engines or parts.

## ES: XV70 exterior and cabin

Added a CC BY 4.0 source labeled **2021 Lexus ES350 F Sport**, by David_Holiday, as `lexus-es-xv70-reference`. The source has detailed exterior panels, grille, lamp surfaces, wheels and approximate cabin geometry. It has no usable engine/transmission assembly and a flat underbody. This is separate from the existing ES 300 and ES 330 targets.

The Blender preparation preserves 490,894 triangles, removes four empty groups, bakes source transforms, restores PBR paint/rubber/metal/glass and recalculates paint shading. Forty-two selectable material groups are not forty-two identified OEM parts. One embedded source JPEG is retained; the source does not supply a complete PBR texture set. Meshopt export is 3,940,344 bytes. Length is uniformly normalized to the 195.9-inch US brochure envelope, without stretching axes independently. Width includes mirrors; no physical dimensions are validated.

Six views were reviewed. Initial imported bounding boxes were inconsistent and were replaced by measurements of actual world vertices. A paint-vertex welding trial caused black shading artifacts and was discarded; the final export preserves separate source vertices. Residual surface unevenness, cabin approximation and configuration identification remain open.

- Source/rights/hash: `research/asset-licenses.json`
- Export review: `modeling/validation/es-xv70-reference-v1.json`
- OEM reference: https://www.lexus.com/content/dam/lexus/documents/brochures/models/2021/MY21-Lexus-ES-ESh-Brochure.pdf
- Viewer: `/?vehicle=lexus-es-xv70-reference`

## IS: development geometry retained, stock catalog rejected

A separate CC BY 4.0 source, **Draft request: Toyota Altezza 2001** by BaizilikoVIIChai, was acquired, reoriented, uniformly normalized, given corrected materials and exported. It retains 51,938 triangles and 61 material groups. The compressed development mesh is stored under `modeling/lexus-classes/development/`; it is not in the vehicle selector.

Review found modified wheels/trim, blank lamp surfaces, coarse panels and a missing cabin. These differences prevent representing it as a stock Lexus IS. The alternative IS300/200 listing uses Free Standard terms rather than CC BY and has unresolved source provenance. Simply relabeling either source is not an acceptable reconstruction.

Next: establish an exact Lexus XE10 market/year/trim; reconstruct lamps, stock wheels, bumpers and cabin from that configuration; compare front, rear, both sides, roof and underside before accepting. Manufacturer reference: https://pressroom.lexus.com/lexus-is-icons-2001-lexus-is/

## LS, GX and LX: candidates, no imported geometry

`research/lexus-class-modeling.json` records candidate URLs, uploader licenses, review state and specific next steps. None of these three families has new accepted geometry in this checkpoint.

- **LS:** The XF30 download reviewed in-browser displays HUMSTER3D branding despite an uploader CC BY label. Excluded pending provenance resolution. A separate LS500 candidate needs download and author review. Its XF50 body cannot replace UCF20/UCF30 catalog targets.
- **GX:** A candidate's title says “2023 GX 550 h.” The official US release identifies the 2024 GX550 with a 3.4-liter twin-turbo V6. Resolve the year/market/trim before naming the model; J250 must remain separate from GX470/J120. Official reference: https://pressroom.lexus.com/a-new-legend-is-born-the-all-new-2024-lexus-gx/
- **LX:** The LX600 candidate requires normal download access and original-creator review. J310 must remain separate from the existing LX470/J100 target. No claimed interior or mechanical completeness has been verified.

The attempted Sketchfab download opened a login form. Sign-in was requested; no credentials were supplied or bypass attempted. Authentication will enable further download attempts, but will not itself establish licensing, configuration or accuracy.

## Reproduction and acceptance

Use Blender 4.5:

```sh
blender -b --python modeling/lexus-classes/prepare_references.py -- es /path/to/source.glb /path/to/output
npx @gltf-transform/cli@4.5.1 meshopt /path/to/output/es-xv70-reference.glb public/models/catalog/es-xv70-reference.glb --quantize-position 16
```

Use `is` with its separately hash-gated source to reproduce the rejected development study. Copy the ES manifest to `public/models/catalog/es-xv70-parts.json`. Source SHA256 checks reject silently changed downloads.

Acceptance checks: source attribution, GLB integrity, embedded geometry, material-group IDs, web size, metric envelope (checked against decoded exported vertices), family/generation separation, and no promotion of rejected candidates. Application checks include all tests, generated catalog/evidence consistency, assembly validation, TypeScript and production build. Browser QA checks the rendered ES, selection and keyboard orbit. None of these software checks validates mechanical accuracy.

Remaining vehicle work requires exact configuration references and measured interfaces, plus engine, transmission, suspension, brakes, wiring, cooling, fuel and underbody geometry. Exterior photographs cannot establish hidden mechanical geometry. Do not enable repair procedures from this visual-only checkpoint.

## Published checkpoint

- Modeling/source milestone: `adae328461625b370e10ede0370ecf2470b2c95c`.
- Published validation/provenance revision: `1aef451146182d25d116e3dd3ccb90337dc7a2da`.
- GitHub Actions: https://github.com/Zhandolia/wrenchwise/actions/runs/37505233269 — successful (15 tests, consistency/assembly checks, TypeScript and production build).
- Site deployment: `appgdep_6ac532843a888191abd173e11db417dc` — succeeded 2026-10-06.
- Live ES: https://wrenchwise-workshop.zhandolia.chatgpt.site/?vehicle=lexus-es-xv70-reference
- Browser review: mesh visible, selection returns source ID, keyboard orbit and reset work. No mechanical accuracy validation was performed.

## Lexus / Toyota community library expansion (2026-10-09)

The `/library/` route adds 17 downloadable visual references: six Lexus vehicles,
ten Toyota vehicles (including two distinct AE86 interpretations), and one modified
2JZ-GTE engine. These are separate from the exact-fitment vehicle catalog.
`research/model-library.json` records original creator/source/license links, input
and output SHA256, file sizes, conversion changes and limited visual review notes.
Credits and adaptation notices are also embedded in each downloadable GLB.

All included listings offered CC BY 4.0 downloads when checked. Source descriptions
and mesh names were reviewed for obvious third-party provenance issues; this is not
an independent authorship guarantee. Excluded candidates included game-derived
CSR2/Real Racing 3 listings, noncommercial-only sources, an IS350 crediting Squir,
and Hilux listings traced to another mod or an OEM website without clear rights.
No listed year, physical dimension, trim, hidden component or service fitment has
been verified. The LC500 is customized, one AE86 is stylized, and the Auris is a
fused exterior photoscan. The RX350 adaptation removes the bundled skinned driver
because it distorted framing. Original filenames/titles remain in the manifest.

To reproduce, obtain the original GLB downloads through each source page and place
them in a local directory using `sourceFilename`. The script rejects changed inputs.
Install conversion tools outside the app's runtime dependencies and run from repo root:

```sh
npm install --prefix work/library-tools --no-audit --no-fund @gltf-transform/core@4.2.1 @gltf-transform/extensions@4.2.1 @gltf-transform/functions@4.2.1 meshoptimizer@0.23.0
node modeling/library/prepare.mjs /path/to/downloads work/library-tools work/library-rebuilt
node --test tests/model-library.test.mjs
```

The default output is `work/library-rebuilt`; the optional fourth argument selects
one manifest ID. Compare `export-results.json` to the committed manifest before
replacing published files. Uniform display normalization and 16-bit meshopt
compression preserve polygon counts, but do not assert a metric scale. RX350 driver
removal is the only deliberate geometry deletion. Materials using legacy specular /
glossiness are converted for the web renderer. The HKS filter included in the 2JZ
engine is separately credited to Reitax under CC BY 4.0.

Validation covers all exported file hashes, embedded credits, polygon counts,
self-contained textures and meshopt buffer decoding. Browser review loaded every
model and inspected one representative view, plus search/filter/selection checks;
this is not comprehensive multiview, dimensional or mechanical validation.
