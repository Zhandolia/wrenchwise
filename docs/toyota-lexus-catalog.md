# Toyota and Lexus catalog expansion — 2026-10-06

Wrenchwise is a multi-make platform. Toyota and Lexus are the first catalog scope; GS300 is the initial mechanical development target, not the product boundary.

## Coverage

The first expanded release contains 817 source-linked records: 607 historical Toyota lineage entries, 198 regional nameplate overview entries and 11 preserved Lexus workshop targets and one Toyota GR Supra visual-reference target. These are mixed record types, not 817 unique cars or finished 3D models. The 2012 history snapshot is Japan-oriented and excludes timeline-only event markers. Source ordinals are not global generation numbers. Missing end dates do not imply ongoing production. Sources, dated fact snapshots and reproducible generation are committed.

The regional sources cover manufacturer catalogs for Japan, US, Europe/UK, India, Indonesia and South Africa, plus the cited China BEV announcement. Worldwide generation/trim/market mapping remains incomplete, especially historical exports and China-specific models. The catalog makes those gaps visible. Concept-only vehicles, racing-only vehicles and marine products are excluded. Original Toyota historical commercial vehicles remain included.

## Data and UI

Make, name, record type, regional scope, generation label, historical introduction month, configuration status, source IDs and asset state are independent fields. Manufacturer names are strings rather than a GS300-specific enum, allowing later makes. Existing 11 vehicle IDs, comments, model uploads and links remain compatible. Both upload/comment APIs now use the same catalog registry as the UI. Search is token-based and results are paginated; model-needed records never load a generic car. Exact powertrain and chassis are intentionally unresolved when a source only identifies a family.

The new /catalog route and existing vehicle picker use one component. The GS300 mechanical viewer remains a dedicated assembly route. The existing acquired exteriors keep their existing license and limits.

## Modeling sequence across makes

For each exact configuration: acquire reference identity and rights; capture six exterior orientations plus cabin, underside and disassembled mechanical references; establish measured datums; reconstruct body closures and installed assemblies; model functional interfaces, hardware and routing; validate fit/access; review each proposed procedure physically; then profile/export. Six photographs alone cannot establish internal geometry. No model is approved because it shares an engine name or platform with another record. Reuse needs matching OEM interfaces and variant evidence.

Reuse candidate research order: GS/Aristo and related 2JZ installations; UZ-powered Lexus sedans; related Toyota/Lexus SUVs; Toyota Corolla/Camry/RAV4 families. These are research groups, not compatibility assertions. Each market/engine/transmission/drive variant requires its own configuration and validation. Modern Toyota vehicles that use non-Toyota-designed powertrains must retain their actual architecture.

## Reproduce

Run `node scripts/build-vehicle-catalog.mjs`; `--check` detects stale generated data. `node scripts/migrate-s160-evidence.mjs --check` and `node --test tests/*.test.mjs` validate coverage/evidence invariants. The factual history snapshot records the fetched source hash and excludes source photographs, authored prose and layout data. No manufacturer source media was redistributed.

## First Toyota geometry checkpoint

Acquired and adapted the CC BY GR Supra exterior/cabin source by 3dmodels.cars. The browser export retains 136 selectable mesh groups and creator attribution; the source has no usable engine/transmission and a flat underside. Six inspection renders were reviewed, materials and vertical framing corrected, and a second render pass completed. No bitmap textures were present in the source; PBR materials are approximations. Uniform normalization to the rounded 2020 brochure length does not establish exact model-year fitment or dimensional accuracy. The model is attached to a dedicated unverified reference record, never to all Supra generations.

Build: `blender -b --python modeling/catalog/prepare_supra.py -- source.glb output-dir`, followed by `npx @gltf-transform/cli@4.5.1 meshopt output-dir/gr-supra-reference.glb public/models/catalog/gr-supra-reference.glb --quantize-position 16`. Fetch source from the immutable URL/hash in the asset license ledger. No measured GS300 geometry has changed in this checkpoint.

## Family and component organization — 2026-10-06

The browsing catalog now consolidates 817 source records into 356 navigation families. Each family has generation/reference groups and configuration choices. All raw IDs remain stable for uploads, comments and bookmarks. Lexus engine-displacement badges no longer create separate top-level model cards. Toyota regional duplicates and reviewed aliases are grouped by explicit rules. Corolla Cross and other separately named bodies are not silently treated as the Corolla sedan. These 356 navigation groups are not an audited worldwide count of vehicle platforms.

GS300/400/430 targets share the S160 group but keep three engine IDs: 2JZ-GE VVT-i, 1UZ-FE VVT-i and 3UZ-FE. GS430 and LS430 share a 3UZ engine-family research entry, with UK launch-pack provenance; their installation geometry remains unresolved. Legacy LS400 and LS430 targets remain in separate generation groups. Historical source ordinals are never converted into worldwide generation numbers. Engine mapping beyond the initial GS/LS entries still needs source reconciliation.

The `/components` page provides the first reusable component asset: 212 existing S160 v5 mechanical groups extracted into a standalone 2JZ study. Core and GS installation equipment can be filtered separately; users can select/search parts, hide casings, rotate, zoom and download the GLB. The sump and bolt-on equipment are excluded from the core layer. This is modularization of existing geometry, not 212 newly modeled parts or a new complete engine. No original part accuracy/evidence status was upgraded. The full source evidence and remaining gaps stay linked to `/assembly`.

Reproduce the component using `modeling/components/extract_2jz.py` against the hash-gated S160 v5 Blender source, then meshopt-compress the GLB with 16-bit position quantization. The committed manifest keeps stable source IDs, units, visual origin, layers and limitations. Six orthographic views were reviewed; simplified castings, belt routing, open tube ends and unmeasured interfaces remain explicit issues in `modeling/validation/2jz-component-v1.json`. No installation outside the GS300 study is approved.

Next modeling work: replace approximate casting and interface geometry with measured/licensed references; resolve installation-specific sump, mounts, harness, accessories and transmission interfaces; then create reviewed UZ/MZ reuse mappings and assets. Sharing an engine family never proves interchangeable complete installations. No vehicle is 1:1 repair-ready yet.
