# GS300 S160 mechanical revision 5

Target: 2000 Lexus GS300, US market, LHD, stock automatic, JZS160, 2JZ-GE VVT-i. This revision improves a provisional assembly. It does not provide a complete 1:1 vehicle or a validated repair procedure.

## Evidence used

Ten source entries are recorded in `research/s160-mechanical-sources.json` with exact URLs, applicability and limits. These include Lexus RM718U engine and cooling sections, 2000 GS300 manufacturer procedures mirrored by Operation CHARM, an adjacent-year A650E overhaul reference, a Transtar exploded parts catalog and a first-party photograph of a 2000 GS300 engine bay.

The RM718U PDF sample, transmission catalog plates and engine photograph were visually inspected. Some hosts blocked direct downloads; their indexed service text was available. The 1997 Supra non-VVT-i manual was rejected as the wrong variant. The photographed car is a reference vehicle, not the user's VIN. The dealer's erroneous “V6” description was rejected. Reference media and manual pages are not redistributed.

## Geometry and interaction

- Engine: revised forward appearance cover, rear intake crossover, throttle/airbox layout, separate ignition coils and leads, six bore/piston/rod studies, camshafts and 24-valve anatomy, lubrication items and VVT-i oil-control hardware.
- Timing: separate idler, hydraulic actuator/pushrod, cam and crank pulleys, cover layers and fastener groups. Belt wrap, pitch and teeth are explicitly unvalidated.
- Cooling: separate accessory-driven pump pulley, pump casting, impeller study, gasket, block O-ring, drain hose, thermostat, inlet and two bypass pipes; radiator, dual fan shroud and hoses.
- Transmission: converter housing, case and extension, front pump, representative clutch/planetary groups, pan, magnets, strainer/seals, three valve-body sections, seven labeled solenoid groups, harness, temperature/speed sensors, selector switch, cooler lines, breather and dipstick.
- Eleven mechanical studies isolate relevant systems and separate cover/pump/pan/strainer layers. Selected parts link to source evidence. The original workshop chapters use the same new assembly.

## Documented quantities versus geometry

| Source fact represented | Quantity | Scope |
| --- | ---: | --- |
| Pump retaining bolts | 6 | RM718U CO-6/8 |
| Pump pulley nuts | 4 | CO-5 |
| Hydraulic tensioner bolts | 2 | EM timing belt |
| A650E pan bolts | 19 | 2000 GS300 AT service |
| Pan magnets | 3 | Same |
| Strainer bolts | 4 | Same |
| Strainer seals | 3 | Same |
| Valve-body retaining bolts | 21 | AT-8 |

The model also records No.1/2/3 cover fastener counts. Quantity evidence does not establish hole coordinates, bolt sizes, thread pitch, torque applicability, lengths, casting shape or service paths. The seven solenoid identities use an adjacent-year family reference; this is not proof of 2000 valve calibration or pinouts. The pan seal represents FIPG, rather than an assumed pre-cut OEM gasket.

## Review and corrections

Review views cover engine layout/front, timing, separated pump layers, transmission case/pan/valve-body, closed vehicle and exposed engine bay. The first draft showed engine/hood interference, an open pan/case gap and poor separation of the valve-body region. The rebuild lowers the estimated installation, reshapes the intake crossover, closes the pan stack and opens the service flange. Fastener shaft direction and casting shading were corrected. The hood surface check is a vertex/ray test against the provisional body only; it is not a full collision or real-vehicle clearance certificate.

Web checks verify every modeled part has a GLB node, all study/source IDs resolve, the eight quantity groups above match their references, and the web asset stays below the hosting file limit. Browser review checks model loading, study changes, part selection, exploded layers and reset. Meshopt compression retains semantic nodes, with 16-bit positions and 12-bit normals; existing out-of-range UVs are left unquantized. Rendering remains demand-driven; no universal frame-rate guarantee is made.

## Rebuild and edit

Open the included `gs300-assembly.blend` to edit the current assembly. The source uses metres, +X vehicle left, -Y forward, +Z up. Blender 4.5 was used. The build script accepts revision 4 or 5 as its base and replaces the mechanical groups while retaining the exterior and other chassis geometry. Run from the repository root:

```sh
blender -b --python modeling/s160/build_mechanical.py -- /path/to/base.blend /path/to/gs300-parts.json /path/to/output
blender -b --python modeling/s160/render_review.py -- /path/to/output/gs300-assembly.blend /path/to/review
blender -b --python modeling/s160/check_fit.py -- /path/to/output/gs300-assembly.blend /path/to/fit.json
npm exec --yes --package=@gltf-transform/cli@4.2.1 -- gltf-transform meshopt /path/to/output/gs300-assembly.glb public/models/gs300-assembly.glb --quantize-position 16 --quantize-normal 12
```

Copy the output manifest and inventory into `public/models`, then run `node modeling/s160/validate_web.mjs` and `npx tsc --noEmit`. The original exterior remains David_Holiday's CC BY 4.0 geometry, adapted in revision 4; see `THIRD_PARTY_ASSETS.md`. Original mechanical geometry and scripts are MIT licensed.

## What still prevents 1:1 status

The inventory retains 246 gaps; it is not an exhaustive OEM bill of materials. No complete part has measured/scanned surface validation. Castings, mating faces, fastener positions, torque specifications, belt pitch/routing/marks, internal clutch/gear quantities, hydraulic channels and suspension hardpoints remain unresolved. Most chassis/interior geometry is inherited and provisional. Six exterior views cannot establish hidden engine or transmission geometry.

The next accuracy step is a measured reference assembly or correctly licensed OEM geometry, followed by fitment checks and a mechanic-reviewed service sequence on a physical 2000 GS300. More procedural surface detail alone cannot close that gap.
