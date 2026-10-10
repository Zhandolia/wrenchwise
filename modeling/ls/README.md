# Original LS studies

Coordinates are metres, Y up, Z forward, X vehicle-left. These are original,
photo-informed educational approximations, not scanned or validated repair models.
Published overall dimensions constrain the envelope. Local surfaces, part sizes,
hidden hardware and hose routes remain estimates. Photo references are linked in
`config.mjs`; no reference photograph is redistributed as a texture.

## Second-generation refinement

`ucf20-refinement.mjs` represents the **1998 UK RHD facelift LS400, 1UZ-FE VVT-i**.
The Lexus LEX 401 front/rear photographs guide the crowned bonnet, rounded cabin,
facelift combination lamps, horizontal grille, bumper profiles, and seven-opening
16-inch alloys. A photographed 1998 RHD engine bay guides the large black cover
with a central intake aperture, front-entry duct, vehicle-right coolant reservoir,
vehicle-left battery/fuse box and moulded inlet shroud. It does not represent the
1995–1997 front end or every wheel/market option.

The generic study supplies illustrative hidden mechanical parts. The dedicated
refiner replaces visible exterior and bay parts while preserving interactive IDs.
Cover decorations follow the removable cover; the central opening is real geometry.
Regression rays check that headlights are not buried behind the fascia, alloy
openings remain open after compression, and the cover opening exposes the intake.

Rebuild one generation without replacing the other three assets:

```sh
node modeling/ls/build.mjs lexus-ls-ucf20
node modeling/ls/compress.mjs work/tools/gltf lexus-ls-ucf20
node --test tests/ls-originals.test.mjs
node scripts/build-pages.mjs
```

The compression-tool directory must contain the dependencies documented by
`compress.mjs`. GLBs, part inventories and both research indexes are committed.
