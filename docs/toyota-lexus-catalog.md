# Toyota and Lexus catalog expansion — 2026-10-06

Wrenchwise is a multi-make platform. Toyota and Lexus are the first catalog scope; GS300 is the initial mechanical development target, not the product boundary.

## Coverage

The first expanded release contains 816 source-linked records: 607 historical Toyota lineage entries, 198 regional nameplate overview entries and 11 preserved workshop targets. These are mixed record types, not 816 unique cars or finished 3D models. The 2012 history snapshot is Japan-oriented and excludes timeline-only event markers. Source ordinals are not global generation numbers. Missing end dates do not imply ongoing production. Sources, dated fact snapshots and reproducible generation are committed.

The regional sources cover manufacturer catalogs for Japan, US, Europe/UK, India, Indonesia and South Africa, plus the cited China BEV announcement. Worldwide generation/trim/market mapping remains incomplete, especially historical exports and China-specific models. The catalog makes those gaps visible. Concept-only vehicles, racing-only vehicles and marine products are excluded. Original Toyota historical commercial vehicles remain included.

## Data and UI

Make, name, record type, regional scope, generation label, historical introduction month, configuration status, source IDs and asset state are independent fields. Manufacturer names are strings rather than a GS300-specific enum, allowing later makes. Existing 11 vehicle IDs, comments, model uploads and links remain compatible. Both upload/comment APIs now use the same catalog registry as the UI. Search is token-based and results are paginated; model-needed records never load a generic car. Exact powertrain and chassis are intentionally unresolved when a source only identifies a family.

The new /catalog route and existing vehicle picker use one component. The GS300 mechanical viewer remains a dedicated assembly route. The existing acquired exteriors keep their existing license and limits.

## Modeling sequence across makes

For each exact configuration: acquire reference identity and rights; capture six exterior orientations plus cabin, underside and disassembled mechanical references; establish measured datums; reconstruct body closures and installed assemblies; model functional interfaces, hardware and routing; validate fit/access; review each proposed procedure physically; then profile/export. Six photographs alone cannot establish internal geometry. No model is approved because it shares an engine name or platform with another record. Reuse needs matching OEM interfaces and variant evidence.

Reuse candidate research order: GS/Aristo and related 2JZ installations; UZ-powered Lexus sedans; related Toyota/Lexus SUVs; Toyota Corolla/Camry/RAV4 families. These are research groups, not compatibility assertions. Each market/engine/transmission/drive variant requires its own configuration and validation. Modern Toyota vehicles that use non-Toyota-designed powertrains must retain their actual architecture.

## Reproduce

Run `node scripts/build-vehicle-catalog.mjs`; `--check` detects stale generated data. `node scripts/migrate-s160-evidence.mjs --check` and `node --test tests/*.test.mjs` validate coverage/evidence invariants. The factual history snapshot records the fetched source hash and excludes source photographs, authored prose and layout data. No manufacturer source media was redistributed.
