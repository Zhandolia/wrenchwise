# Wrenchwise assembly modelling

Two builders, one source of truth.

```
content/components/<engine>.json   every dimension and position, with evidence status
recipes.json                       which shape and material each component uses
        │
        ├── build_assembly.mjs        Node  → public/assets/<engine>/r<n>/  (served, CI-verified)
        └── build_timing_assembly.py  Blender → authoring .blend + .glb
```

Neither builder may invent a size. Every length and position comes from the
component inventory, where each value carries its own evidence status. The
constants in `recipes.json` — wall thicknesses, tooth pitch, rib pitch, segment
counts — are tessellation choices and are reported as such in the manifest.

## Build the browser assets

```sh
node modeling/wrenchwise/build_assembly.mjs          # writes public/assets/…
node modeling/wrenchwise/build_assembly.mjs --check  # fails if the committed files are stale
node scripts/validate-assets.mjs                     # container, ids, scale, materials, budgets
```

Output per revision:

| File | Role |
| --- | --- |
| `core.glb` | Engine structure and timing drive. Loaded first, so the timing drive is interactive before the rest arrives. |
| `access.glb` | Assemblies removed for access. Loaded second. |
| `assembly.json` | Manifest: hashes, triangle counts, per-component records, build notes, evidence status. |
| `layout.svg` | Front-elevation schematic from the same placements — the illustration shown when WebGL is unavailable. |

One glTF node per selectable component mesh. The node name equals the mesh id,
and `extras` carries `componentId`, `meshId` and `modelRevision`. No glTF
extensions are used, so no decoder is required.

## Build the authoring scene

```sh
blender --background --factory-startup --python modeling/wrenchwise/build_timing_assembly.py \
    -- /absolute/repo/root /absolute/out/assembly.glb
```

It writes the GLB, the `.blend` and a manifest beside it. The scene is authored
directly in the glTF frame (X engine left, Y up, Z forward along the
crankshaft), so the exporter runs with `export_yup=False` — the earlier version
of this script rotated an already-Y-up scene.

**The Node exporter produces the assets the application serves.** It runs in CI,
its output is hash-checked against the committed files, and its geometry is unit
tested. The Blender script exists for authoring work that needs modifiers,
sculpting or rendering; its shape vocabulary mirrors
`lib/primitives.mjs` vertex for vertex, but it has not been executed in this
repository's CI and is not verified there.

## Shape vocabulary

`lib/primitives.mjs` (and the matching functions in the Python script):

| Shape | Parameters |
| --- | --- |
| `box` | `x`, `y`, `z` |
| `cone` / `cylinder` / `disc` | `radius1`/`radius2` or `radius`, `length`/`thickness`, `segments`, `axis` |
| `hexBolt` | `acrossFlats`, `axis` |
| `archedShell` | `span`, `archHeight`, `extrude`, `spanAxis`, `archAxis`, `extrudeAxis`, `thickness` |
| `curvedTube` | `tubeRadius`, `bendRadius`, `arcDegrees`, `plane` |
| `groovedPulley` | `radius`, `width`, `ribPitch` or `grooves` |
| `toothedPulley` | `pitchRadius`, `width`, `toothPitch` or `teeth`, `hubRadius` |
| `idlerPulley` | `radius`, `width` |
| `beltPath` | `pulleys` (resolved from other components), `width`, `thickness`, `plane` |

Shapes are built along local `+Z` and rotated by `axis`. They are centred on
their own origin; placement comes from the inventory.

See `docs/ADDING_CONTENT.md` for the recipe format and the evidence rules.
