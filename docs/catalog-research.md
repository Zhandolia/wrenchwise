# Lexus catalog geometry audit — 2026-10-06

This is an incomplete vehicle reconstruction project. No asset is a verified 1:1 replica or an approved repair guide. The target is a stock US-market automatic for each entry. Only the 2000 GS 300 year/market/configuration has been explicitly confirmed by the owner; other years below are working choices.

## Result

- All 11 catalog entries researched.
- 230 manufacturer album photo records visually reviewed; 228 distinct file hashes. Repeated angles and interior images are included in these counts, not presented as six-sided exterior coverage.
- Two CC BY source meshes acquired legally from the public Objaverse distribution: GS300 and RX300, both by David_Holiday.
- Four browser-ready exterior references prepared from those two sources: GS300, GS400, GS430 and RX300. GS400/430 are body-source adaptations, not independent factory models, and have no vehicle-specific engine/transmission model.
- Seven entries still have no accepted geometry. A procedural LS400 experiment was rejected after two iterations and not used to fill the catalog.
- Zero complete six-view OEM photo sets; zero mechanically verified models.

## Vehicle-specific disposition

| Working target | Geometry decision | OEM reference limitation | Next concrete geometry work |
|---|---|---|---|
| 2000 GS 300 | Acquired CC BY S160 body; materials restored; optional spoiler removed; dark grille finish | Shared 1998 GS300/400 Canadian photos; no true top/underbody | Correct US side markers and exact wheels; reconcile height; measure VVT-i engine service area |
| 2000 GS 400 | Adapted shared S160 body; badge changed | Eight album images, mostly front three-quarter | Verify wheel option and GS400 trim; acquire 1UZ-FE VVT-i anatomy rather than copying the 2JZ |
| 2001 GS 430 | Adapted S160 body with chrome grille finish and clear rear signal treatment | 2001 Canadian trim, factory engine bay photo; no top/underbody | Verify facelift lamps, wheels and US details; obtain 3UZ-FE and exact transmission geometry |
| 2000 LS 400 | No accepted mesh; free candidates have wrong/modified fitment or restricted redistribution | Six usable exterior images; GS interior incorrectly filed in album | Acquire stock UCF20 facelift mesh/scan, model rectangular lamp assemblies and long rear quarter from verified references |
| 2001 LS 430 | CC BY candidate found; Sketchfab login required | Good front/rear/both-side obliques, high roof angles; another wrong GS interior | Download candidate and determine pre-/post-facelift before accepting any geometry |
| 2000 ES 300 | 1997 CC BY photoscan found; login required; facelift corrections necessary | Five album images, no usable rear/profile set | Download scan; rebuild 2000 bumper, grille, rear lenses and badge from 2000 references |
| 2004 ES 330 | No redistributable exact mesh found | Large OEM album contains ES300 badge, 3.0 engine and uncertain later-year photos | Establish clean MCV31 2004 reference set before building body; do not use Windom STL as US geometry |
| 2000 RX 300 | Acquired CC BY first-generation mesh; materials and lamp colors restored | Canadian photos; exact lamp and marker fitment still unresolved | Correct US markers/lamps and wheel trim; choose FWD/AWD before modeling underside |
| 2004 RX 330 | CC BY 2005 photoscan found; login required | Strong side/front references, roof obliques, 3.3 engine bay; no underside | Download and retopologize scan; resolve 2004 details and FWD/AWD |
| 2003 GX 470 | No accepted stock mesh; off-road miniature rejected; paid body scan found | 2004 Canadian photos are adjacent-year references; no underside | Obtain 2003 body/underbody measurement coverage; preserve non-VVT-i 2UZ and early transmission configuration |
| 2000 LX 470 | 2002 download candidate has license/provenance/texture uncertainties | Album contains an RX300 photo, explicitly excluded | Obtain pre-2003 stock reference mesh or measured body; preserve 2000 four-speed driveline |

Sources for every row, full URLs, photo hashes, per-image classification, wrong-image exclusions, specifications and candidate licenses are in [`research/vehicle-sources.json`](../research/vehicle-sources.json). Current asset licenses and immutable source hashes are in [`research/asset-licenses.json`](../research/asset-licenses.json).

## Review and rework performed

1. Opened and visually inspected all manufacturer contact sheets, including all three sheets in each 50-image album.
2. Excluded the RX300 photo in the LX470 album, GS interiors in both LS albums, ES300 badge and 3.0 engine in the ES330 album. Quarantined uncertain facelift/interior references.
3. Inspected original GS/RX geometry in Blender, including mesh groups, materials, bounds and source vertex colors. An AI-generated dataset caption called the GS an ES350; actual geometry and source metadata established it as a GS source.
4. Restored PBR paint, trim, glass, tire, alloy, reflector and lamp materials. Removed the optional GS spoiler, adjusted grille finish, and made derivative GS badging explicit.
5. Batched hundreds of decorative fragments into approximately ten selectable groups per exterior. These groups are not claimed to be individual OEM parts.
6. Rendered front, rear, left, right, top, underbody and perspective review views. Generated renders are not OEM references and do not close missing-reference gaps.
7. Corrected a hood grouping error that initially removed the front fenders along with the hood. Corrected RX tail-lamp material classification after comparing the rear render to the manufacturer photograph.
8. Combined the GS reference body with the previous provisional mechanical assembly. The first fit check found the schematic radiator pack protruding above the hood; it was repositioned for the visual study. This is not a verified mechanical fitment adjustment.
9. Rejected the original LS400 trial: repairing the surface discontinuities did not make the silhouette, fascia, lamps or windows accurate enough. The failed experiment is retained separately, not delivered as a completed catalog vehicle.

10. Browser QA exposed invisible multi-material submeshes. The GLB viewer now inherits parent part metadata for wheel, glass and lamp primitives. RX selection and GS hood inventory inspection work without browser errors.
11. Corrected the review-camera framing for top and underside renders; those views expose placeholder flat underfloors, not detailed mechanical undersides.

## Software validation

TypeScript and the production build pass. Five GLBs have valid embedded buffers, license credits and part metadata. At revision 4, the combined GS manifest matched 256 modeled groups with 291 inventoried gaps. See [revision 5](s160-mechanical-v5.md) for the later GS300 engine and transmission rebuild. Zero verified parts remain. No frame-rate benchmark or mechanical validation is claimed.

## Dimensional review

Uniform normalization uses the published overall length; it does not stretch each axis until all numbers appear to pass. The source GS mesh is approximately 1452 mm high after scaling to 4805.7 mm length, compared with the working brochure height target of 1419.9 mm. That discrepancy is unresolved. Widths measured across the full source include mirrors and must not be compared directly with a body-width specification.

The RX reference measures approximately 1669 mm in height after scaling to 4574.5 mm length. Agreement with a published envelope is not proof of correct panel surfaces or internal parts. Wheelbase, tire option, suspension position and hardpoints need independent checks.

## Part detail that remains unbuilt or unverified

Every vehicle needs its own source-backed breakdown of body stampings and closures; glazing/seals; lights and harness connectors; interior and restraints; subframes or ladder frame; suspension arms, bushings and joints; steering; hubs, bearings, brakes and ABS; engine castings and covers; crank/rods/pistons; valvetrain; timing drive and exact marks; lubrication; cooling and pump; intake/fuel/emissions; exhaust; automatic transmission, valve body and cooling; differential/shafts/transfer case where applicable; hoses, clips, brackets, seals and individual fasteners.

This is a scope inventory, not an exhaustive OEM bill of materials. Exact quantities, part numbers, mating faces, clearances, torque values, service order and hidden geometry require VIN-specific parts documentation, licensed service references and physical measurements or scans. Exterior photographs cannot establish them.

## Reproduction

```sh
python3 modeling/catalog/fetch_sources.py work/catalog-sources
blender -b --python modeling/catalog/prepare_downloaded.py -- work/catalog-sources work/catalog-prepared
```

The source assets are CC BY 4.0; keep creator attribution with exported models. Manufacturer photographs are reference material and are not redistributed with the public source. See [`THIRD_PARTY_ASSETS.md`](../THIRD_PARTY_ASSETS.md).
