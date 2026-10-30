# Adding an engine, a configuration or a procedure

Everything in the primary flow is data. A new configuration, engine variant,
component inventory or procedure is a change under `content/` plus geometry
recipes under `modeling/wrenchwise/`. **No application code changes are
needed**: `src/content/catalog.ts` discovers content files with a glob, and the
index, search, guide and viewer read whatever it finds.

What *is* required is evidence. The checks below fail the build when content
claims more than its sources support.

---

## 0. Before anything: assemble the reference package

Record every reference in `content/sources.json` first, with its revision, the
configurations it applies to, how it was accessed and what it may be used for.

| You want to establish | You need a source whose `permittedUses` include |
| --- | --- |
| What a part is, and what it connects to | `identity`, `relationship` |
| How it looks and how a hose or belt runs | `appearance`, `routing` |
| Where it sits in the assembly | `placement` |
| A dimension | `dimensions` |
| A sequence, torque or clearance | `procedure`, `specification` |
| A part number | `part-number` |

Rules the validator enforces:

- An exploded parts diagram is an **assembly reference**. Give it `identity`
  and `relationship`, never `dimensions`.
- A component whose `dimensions.status` is `measured` must cite a source that
  permits `dimensions`. Otherwise the build fails.
- A source with `usageRights.status: "unauthorized-mirror"` is recorded for
  traceability and **never linked from the interface** (`sourceIsLinkable`
  returns false). Anything derived from one is marked `mirror-derived` and must
  be re-checked against a licensed copy before it can be called verified.

---

## 1. Configuration — `content/configurations/<id>.json`

Schema: `content/schema/configuration.schema.json`.

One record per vehicle *as a mechanic identifies it*: model year, market,
steering, chassis and the engine variant actually installed. A shared model name
is not applicability.

Set `identificationStatus` honestly — `target-only` means no physical reference
vehicle has been identified. List everything still open in
`unresolvedVariants` (production range, emissions equipment, transmission).

## 2. Engine variant — `content/engines/<id>.json`

Schema: `content/schema/engine.schema.json`.

`code` + `variant` + the chassis it is recorded in. `notEquivalentTo` is
required and must have at least one entry: name the variants that share the
family name but differ in parts, accessory layout or procedure, and say why.
This is what stops "it's a 2JZ" from becoming "the parts are the same".

These entries are not just documentation. The library page renders them as the
"named, and deliberately not covered" list, with your reason as the
explanation. Equally, adding an engine with a component inventory makes it
appear as a card in the library — with the configurations it is installed in,
its systems and its jobs — with no code change. Nothing on that page is written
per engine.

`frame` defines the coordinate system all geometry uses: metres, with
`x` engine left, `y` up and `z` forward along the crankshaft toward the timing
drive. Keep it identical across engines unless you have a reason not to.

## 3. Component inventory — `content/components/<engine-id>.json`

Schema: `content/schema/components.schema.json`.

Each service-relevant component gets a stable id and:

- `name`, `system`, `parentId`, `kind`
- `kind: "group"` marks geometry that stands in for **several physical pieces**.
  The interface says so when such a part is selected. Use it rather than
  pretending a radiator assembly is one part.
- `quantity` with its own status and sources
- `applicability` — configuration and engine ids, listed explicitly
- `oemPartNumber` — `null` with `not-established` until a catalog gives it
- `dimensions` — every value with `unit` and `method`
- `placement` — `position` in the engine frame, plus `axis` where the shape
  needs one
- `asset.layer` (`core` loads first, `access` loads after) and `asset.meshIds`
- `procedureStepIds`, `sourceIds`, `gaps`
- `verification` with five **independent** axes: `identity`, `dimensions`,
  `placement`, `fitment`, `procedure`. A part can be correctly identified while
  its dimensions are estimated and its fitment is unknown. Never collapse them.

## 4. Geometry recipe — `modeling/wrenchwise/recipes.json`

Every component id in the inventory needs an entry, or both builders fail with
`No geometry recipe for: …`.

```jsonc
"timing-belt-idler": {
  "parts": [
    {
      "shape": "idlerPulley",
      "material": "pulley-gray",
      "params": { "radius": { "dim": "radius" }, "width": { "dim": "width" } }
    }
  ]
}
```

- **Shapes**: `box`, `cone`, `cylinder`, `disc`, `hexBolt`, `archedShell`,
  `curvedTube`, `groovedPulley`, `toothedPulley`, `idlerPulley`, `beltPath`.
  They are defined once in `modeling/wrenchwise/lib/primitives.mjs` and mirrored
  vertex for vertex in `build_timing_assembly.py`.
- **Parameters** are numbers, or `{ "dim": "<key>", "scale": n, "plus": n,
  "default": n }` reading the inventory, or `{ "abs": "<key>" }` in an offset
  slot for an absolute frame coordinate, or `{ "quantity": true }`.
  A `dim` with no value and no `default` is an error — the builder will not
  invent a size.
- **Several meshes per component**: `instances` with mode `mirror-x`,
  `bolt-circle` or `linear-y`, or an explicit `meshes` array when the meshes
  differ in shape.
- **Repeats within one mesh**: `repeat: { axis, count, spacing }`, centred.
- **Belts**: list `pulleys` by component id and the dimension that gives each
  radius. The builder takes the hull of the pulley *circles*, so pulley size
  decides contact; any pulley left inside the loop is reported in the manifest's
  `buildNotes` rather than forced into a self-crossing band.
- Constants in a recipe (wall thickness, tooth pitch, rib pitch, segment counts)
  are **tessellation choices**. They are reported as such in the manifest and
  must never be read as fastener, tooth or groove counts.

Then rebuild and commit the result:

```bash
node modeling/wrenchwise/build_assembly.mjs
```

This writes `public/assets/<engine-id>/r<revision>/` with `core.glb`,
`access.glb`, `assembly.json` and `layout.svg`. CI re-runs it with `--check`
and fails if the committed files are stale.

### The Blender path

`modeling/wrenchwise/build_timing_assembly.py` reads the same `recipes.json` and
the same inventory, and is the authoring path for anything that needs Blender's
modifiers or renderer:

```bash
blender --background --factory-startup --python modeling/wrenchwise/build_timing_assembly.py \
    -- /path/to/repo /path/to/out/assembly.glb
```

The scene is authored directly in the glTF frame, so the exporter runs with
`export_yup=False`. The browser assets committed to the repository come from the
Node exporter, because that is the path CI can run and verify.

## 5. Procedure — `content/procedures/<id>.json`

Schema: `content/schema/procedure.schema.json`.

- `assembly` points at `<engine-id>/r<revision>` — the asset folder.
- `contentStatus` is `educational-overview` until a mechanical review is
  recorded. The validator refuses `verified` unless
  `content/releases.json` has a release with `mechanicalReview.status:
  "complete"` covering the procedure.
- Each step defines instruction text, `prerequisites` (step ids defined
  earlier), `componentIds`, `tools`, `replacementParts`, `specifications`,
  `view`, `cautions`, `completionChecks`, `sourceRefs`, `contentStatus` and
  `gaps`.
- A specification with no established value keeps `value: null` and
  `status: "not-entered"`, with a `sourceRef` saying where to look it up. The
  interface shows the slot and the gap. **Do not invent torque values, timing
  references, fastener counts or sequences.**

### `view` — the two kinds of change

| Field | Meaning | Cumulative? |
| --- | --- | --- |
| `remove` | The step physically takes the part off | yes, folded over steps 0..n |
| `restore` | The step refits it | yes |
| `hide` | Hidden to see past it | no, step-local |
| `highlight` | Drawn in blue for this step | no, step-local |
| `explode` | Explanatory separation | no, step-local |
| `camera` | Suggested view | no, step-local |

`scripts/validate-assets.mjs` rejects a `remove` of something already removed
and a `restore` of something never removed, so the fold can never drift.

## 6. Release record — `content/releases.json`

Every release records the model revision, supported configurations, available
procedures, evidence status, review status, the assets it ships and the gaps
still open. The index page renders the gap list verbatim.

`evidenceStatus: "illustrative"` means **no dimension in the release is
measured**. Anything stronger requires a mechanical review entry.

## 7. Run the checks

```bash
node scripts/validate-content.mjs          # schemas, cross-references, release record
node modeling/wrenchwise/build_assembly.mjs --check
node scripts/validate-assets.mjs           # container, ids, scale, materials, budgets
node --test tests/*.test.mjs               # Node 22.6+ (CI uses 24)
npx tsc --noEmit
npm run build:pages && node scripts/validate-pages.mjs
npx playwright test
```

## 8. What none of this establishes

Automated checks confirm the software and the internal consistency of the
content. They say nothing about mechanical accuracy. Before any procedure is
described as verified for real repair work:

1. Read the factory procedure from a licensed copy and replace every
   `mirror-derived` locator with a verified citation.
2. Establish part numbers from the OEM catalog for the production range.
3. Measure the parts, and promote `dimensions.status` from `estimated` to
   `measured` with the measurement source recorded.
4. Have a qualified technician review the sequence and physical access, and
   validate it on a vehicle. Record the reviewer and date in the release's
   `mechanicalReview`.
