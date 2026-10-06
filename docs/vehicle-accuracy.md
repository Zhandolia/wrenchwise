# Vehicle accuracy is the product

Reference: 2000 Lexus GS 300, US market, left-hand drive, stock automatic, 2JZ-GE VVT-i. The current model is an original surface/assembly study, not a validated replica. A high component count does not establish accuracy.

## Revision 3: external identity correction

The previous body had a generic rectangular bumper, narrow grille, horizontally flattened lamps, disconnected roof/window trim and six-spoke filled wheel discs. This revision replaces the exterior generator with a separate S160-specific surface module. It models a wider tapered grille, taller swept outer lamps and smaller inner lamps, rounded wraparound fascias, a continuous roof crown, bounded window seals, separate rear lamp sections and open five-spoke wheel studies. Main workshop and assembly views load the same GLB.

Sources inspected:

- [Lexus USA 1998–2000 GS 300 gallery](https://pressroom.lexus.com/album/1998-2000-lexus-gs-300-second-2nd-generation/): target generation/year reference; full-size images were not accessible during this pass.
- [Lexus UK 1997–2000 exterior photographs](https://media.lexus.co.uk/images/gs-300-1998-2000-exterior/): front, side and rear proportions. UK photographs show market-specific trim; they cannot verify US lamps, side markers or wheel fitment.
- [Lexus UK engine detail](https://media.lexus.co.uk/images/gs-300-1998-2000-engine/): VVT-i actuator anatomy photograph; insufficient to measure a complete engine.
- [Archived Lexus 2000 US brochure](https://dgv4.xr793.org/wp-content/uploads/2018/11/2000-Lexus-GS.pdf): rounded overall dimension targets.
- [Archived Lexus specification sheet](https://xr793.com/wp-content/uploads/2022/01/2000-Lexus-GS-Specs.pdf): unresolved tire-size/height discrepancies recorded in the manifest.

Reference photographs remain with their owners; no Lexus press images are redistributed in this repository. Screenshots under modeling/validation are renders of original geometry. Original geometry/code are MIT licensed; trademarks remain their owners' property.

## Validation levels

1. **Reference study:** recognizable surface work interpreted from photos; no mechanical or dimensional claim.
2. **Measured geometry:** exact variant identified, measurement/scan source recorded, uncertainty stated, dimensions checked.
3. **Assembly validated:** mating faces, fasteners, connectors, clearances and component placement checked on the vehicle.
4. **Procedure validated:** source-backed sequence reviewed and performed on the exact vehicle configuration.

The current model remains at level 1. Mechanical internals are schematic. No parts are level 2–4. Published overall dimensions only establish coordinate scale targets.

## Required next data

- Orthographic body measurements or a scan, with lens/camera calibration for photo matching.
- Exact US OE wheel and tire identification, lamp lenses and side-marker locations.
- Front/rear suspension hardpoint coordinates and underbody measurements.
- VVT-i engine external castings, timing cover geometry, mounting brackets, water pump, tensioner, and bolt/connector maps.
- A650E casting, mounting, cooler plumbing and service-pan geometry. Existing internals are not an accurate transmission design.
- VIN-specific part-number/quantity reconciliation and permitted service data.

Do not mark a part verified because it looks plausible or because an automated mesh test passes. Do not publish repair timing marks, torque values or fastening instructions without their exact source and review.

## Review this revision

Original renders: [perspective](../modeling/validation/gs300-assembly.png), [front](../modeling/validation/gs300-front.png), [side](../modeling/validation/gs300-side.png), [rear](../modeling/validation/gs300-rear.png). These make remaining surface/fitment errors visible; they are progress records, not an accuracy sign-off.

Priority order is body silhouette and panel continuity, then the VVT-i timing-service assembly, then the A650E exterior and vehicle packaging. Source-backed measurements must precede service-grade internal detail.
