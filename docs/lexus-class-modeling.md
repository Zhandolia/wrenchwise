# Lexus LS / IS / ES / GX / LX modeling checkpoint — 2026-10-06

This checkpoint adds one accepted **visual reference**, not five completed replicas. No complete 1:1 or service-ready model is established. Generations remain separate within each family; engine badges do not create duplicate body families, and shared families do not establish compatible engines or parts.

## ES: XV70 exterior and cabin

Added a CC BY 4.0 source labeled **2021 Lexus ES350 F Sport**, by David_Holiday, as `lexus-es-xv70-reference`. The source has detailed exterior panels, grille, lamp surfaces, wheels and approximate cabin geometry. It has no usable engine/transmission assembly and a flat underbody. This is separate from the existing ES 300 and ES 330 targets.

The Blender preparation preserves 490,894 triangles, removes four empty groups, bakes source transforms, restores PBR paint/rubber/metal/glass and recalculates paint shading. Forty-two selectable material groups are not forty-two identified OEM parts. The source contains no bitmap textures. Meshopt export is 3,940,344 bytes. Length is uniformly normalized to the 195.9-inch US brochure envelope, without stretching axes independently. Width includes mirrors; no physical dimensions are validated.

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

Acceptance checks: source attribution, GLB integrity, embedded geometry, material-group IDs, web size, metric envelope, family/generation separation, and no promotion of rejected candidates. Application checks include all tests, generated catalog/evidence consistency, assembly validation, TypeScript and production build. Browser QA checks the rendered ES, selection and keyboard orbit. None of these software checks validates mechanical accuracy.

Remaining vehicle work requires exact configuration references and measured interfaces, plus engine, transmission, suspension, brakes, wiring, cooling, fuel and underbody geometry. Exterior photographs cannot establish hidden mechanical geometry. Do not enable repair procedures from this visual-only checkpoint.
