# Engine-bay research and first modeling correction

Reviewed 9 October 2026 against repository baseline `32b12c160b0989cbd0338ade6e403cb8f558d7b9` and the live GitHub Pages workshop. This is a scoped source audit and visual modeling checkpoint, not completion of the four vehicles.

## What is actually available in Wrenchwise

The GS300 has the only developed engine-bay assembly among the four named families. Its inventory contains 513 modeled groups, 240 absent-geometry records and six unresolved records. A modeled group can contain multiple physical pieces. None has complete dimensional or fitment verification. The ES XV70, RX300 and GR Supra assets are exterior/cabin references without usable service-level engine geometry, as recorded in `research/asset-licenses.json`. GS400/GS430 exterior variations do not supply their V8 powertrains.

The live workshop supports rotation, zoom, selection, shell visibility and anatomy chapters. Its six timing/water-pump chapters are not a complete repair sequence. The import flow stores files in the current browser; repository assets are required to make models available to everyone.

## Vehicle-specific reference coverage

| Vehicle target | Useful evidence found | What it does not establish |
|---|---|---|
| 2000 US GS300, LHD, stock automatic, 2JZ-GE VVT-i | [Lexus US generation gallery](https://pressroom.lexus.com/album/1998-2000-lexus-gs-300-second-2nd-generation/), [Lexus UK engine detail](https://media.lexus.co.uk/images/gs-300-1998-2000-engine/), and [first-party dealer engine-bay photography](https://www.victorymotorsofcolorado.com/inventory/2000-lexus-gs-300-/136475) | Hidden geometry, metric mounting coordinates, production variation and physical stock condition. UK material is not US fitment certification. |
| ES XV70, exact configuration still to select | [Lexus's 2019 launch documentation](https://pressroom.lexus.com/new-level-perfor-sophistication-next-generation-lexus-es/) distinguishes ES350's 2GR-FKS V6 from ES300h's A25A-FXS four-cylinder hybrid | The existing mesh is listed by its creator as a 2021 ES350 F Sport. A 2019 family reference does not validate that mesh or a 2021 engine installation. |
| First-generation RX300, exact year/market/drivetrain still to select | [Lexus UK RX300 launch documentation](https://media.lexus.co.uk/lexus-rx300-a-new-definition-for-lexus/) identifies the 1MZ-FE V6 | US build details, left/right-hand-drive packaging, mounting geometry and individual service-part dimensions. |
| GR Supra, exact year/engine still to select | [Toyota's 2020 launch](https://pressroom.toyota.com/its-back-2020-gr-supra-ready-for-road/), [2020 brochure with engine-bay photograph](https://www.toyota.com/content/dam/toyota/brochures/pdf/2020/gr-supra_ebrochure.pdf), and [2021 lineup](https://pressroom.toyota.com/vehicle/2021-toyota-supra/) distinguish the 3.0 inline-six and later US 2.0 four-cylinder option | A single Supra exterior cannot establish which powertrain belongs underneath it. The GS300 2JZ model cannot populate the GR Supra. |

The manufacturer pages establish identities and reference opportunities, not CAD. [Toyota/Lexus TIS](https://techinfo.toyota.com/) is the primary route to configuration-specific repair and electrical information. Existing repository references include RM718U excerpts and mirrors; the timing-procedure mirror timed out during this pass, so it was not newly verified. No paid service subscription was purchased or authenticated content accessed.

The sampled downloadable model search found an [autoNgraphic 2JZ-GTE listing](https://sketchfab.com/3d-models/toyota-2jz-gte-engine-free-7ebc9741434540c4831453066d7ae057). Its title identifies a different engine variant; the detail page was inaccessible during review. Its license and internal contents were not verified and it was not imported. This is not an exhaustive marketplace survey or a claim that suitable commercial models do not exist.

## Intake surface revision

The inspected dealer photograph shows a curved inlet duct with a flexible corrugated segment, clamp bands and a meter/connector assembly. The v5 generator instead placed bellows on a fixed Y axis and used fixed X/Y clamp orientations. The updated original geometry sweeps the duct smoothly and aligns these attached surfaces with the local duct direction. The MAF body has a mounting pad, bosses and a separate selectable connector.

Five existing IDs were rebuilt: `air-intake-duct`, `intake-bellows`, `intake-clamps`, `maf`, `maf-connector`. No new vehicle, new inventory count or verified part is claimed. Nine bellows crests remain an artistic approximation. Screw form, connector cavities/pinout, dimensions and installation coordinates are not established. Original v5 duct endpoints and nominal radius are retained as estimates. The source photo is of one dealer vehicle and shows an aftermarket battery; it must not become an OEM battery specification. The listing's V6 description contradicts the inline-six reference and is rejected.

The new **Air duct, bellows & MAF** study provides a close camera view, separate selection and evidence links. The full vehicle and main workshop share the revised GLB. The standalone 2JZ component asset excludes these five installation groups and needs no geometry update. Reference photos are not bundled or redistributed. Existing CC BY exterior attribution and MIT mechanical attribution remain in the GLB.

Rebuild from the original GLB in the baseline commit (extract the Git blob as binary, never through a text redirect):

```sh
node modeling/s160/refine_intake.mjs BASE_V5.glb INTAKE_STAGE.glb public/models/gs300-parts.json > modeling/validation/s160-intake-2026-10-09.json
node modeling/s160/refine_airbox.mjs INTAKE_STAGE.glb public/models/gs300-assembly.glb public/models/gs300-parts.json > modeling/validation/s160-airbox-2026-10-09.json
node scripts/migrate-s160-evidence.mjs
```

The builder refuses a changed base hash and records source/output hashes. Manifest bounds use Blender X/Y/Z; the GLB uses X/Y-up/Z. The Blender ZIP remains the v5 baseline; import the current GLB into Blender to edit the revised surfaces. The prior compressed streams are preserved, including unused bytes for replaced primitives; a future full export can compact these after visual review.

## Evidence needed for the requested realism

1. Select a fixed year, engine, market, steering side, drivetrain and production range. Record stock versus modified equipment.
2. Capture an identified car from the front, both sides, rear and directly above the bay, plus close views with covers removed by a qualified person. Include a scale reference and camera calibration. Photos without scale support visual shape only.
3. Measure or scan the intake, battery tray, radiator/fan pack, reservoirs, brackets and mounting datums. Record the measurement method and uncertainty. Use multiple independent dimensions, not overall vehicle length as the only scale.
4. Obtain the permitted repair manual and parts diagrams for that configuration. Record part identity, mating faces, fastener/connector locations and hose/wire endpoints separately from their appearances.
5. Compare model renders against the references from matched camera views. Check placement and clearance on the physical car. Use an independent mechanic to review each eventual procedure, including preparation, removal, reassembly and final checks.

The first air-cleaner anatomy revision now provides a hollow tapered lower housing, an open-bottom lid with an outlet matching the intake-stage endpoint, a filter frame and pleated media. The legacy `airbox-ribs` ID is retained but renamed to an estimated lid seam bead; unsupported parallel decorative ribs were removed. Internal surfaces and pleat density are authored estimates, not observations from the exterior photograph. The `/assembly/?study=air-cleaner` view lifts the lid and filter for inspection and isolates their five groups. It is not a removal sequence. Mounts, clips, the snorkel-side opening, dimensional matching and installed clearances remain unresolved.

Next work is reference acquisition for those interfaces and surrounding bay packaging, followed by measured battery, cooling and accessory assemblies. Timing marks, belt teeth, torque values and removal sequences must wait for exact source and physical review. Exterior refinements can continue from photographs; interior work is deferred per the requested priority. No web-photo-only workflow can honestly guarantee a 100% replica.
