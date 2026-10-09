# GS S160 priorities and implementation plan

## Active queue — 9 October 2026

The first intake revision is published as `084d1ef`. Continue in this order; the older task specifications below remain the acceptance criteria, not a statement that their work is done.

| Priority | Next work | State / completion criteria |
|---|---|---|
| 1 | Reference configuration and capture records (S160-01/03) | Configuration record, four capture requests and six measurement requests added. Validation rejects empty or untraceable completion. Physical identification and acquisition remain pending. |
| 2 | Air-cleaner housing, lid and duct interface (S160-04a) | Next geometry checkpoint. Retain selectable IDs, compare against photographed form, check modeled joint continuity, record all estimated dimensions. |
| 3 | Engine-bay inspection (S160-09) | Add air-cleaner layers view; ensure camera, highlighting and isolated components remain useful. Software checks do not establish a real removal sequence. |
| 4 | Cooling, battery and accessory installation (S160-03/04a) | Obtain exact-target views and measurements before correcting mounting and hose/connector endpoints. |
| 5 | Timing/water-pump service geometry and procedure (S160-04/05/06) | Exact service sources, measured interfaces, physical fit/access review and qualified mechanic review required. |
| 6 | Next vehicle configuration | Select exact year/engine/market after the GS300 modeling/verification process works. Interior work remains deferred. |

Reference records: `research/s160/reference-configuration.json` and `research/s160/capture-plan.json`. Fill measured values only from actual observations with uncertainty, source and measurer recorded; the current mesh bounds are not measurements. These records feed the evidence configuration and are checked by CI. Keep each completed checkpoint in a descriptive commit and confirm its GitHub push and deployment.

Planning checkpoint: 2026-10-06. Target: 2000 Lexus GS300 / JZS160 / US / LHD / stock automatic / 2JZ-GE VVT-i. Baseline model: v5, commit `58a0019a3d4b8d5cc91d3b376abbf97913a85659`.

The next product milestone is a **measured and physically reviewed timing-belt/water-pump service assembly** for this configuration, including everything that must be accessed or removed. Complete vehicle coverage remains the longer-term objective. This plan does not mark any component or procedure verified.

Current evidence: 513 modeled groups, 246 gap records, zero verified parts. See [the audit](s160-priority-audit.md) and its [snapshot](../research/audits/s160-v5-priority-baseline.json). More triangles or a smaller gap count are not acceptance criteria for accuracy.

## Ordered tasks

### S160-01 · P0 · Establish a reference vehicle and evidence register

**Problem:** The market/year/powertrain target is known, but the actual measurement vehicle, production month and relevant equipment variants have not been established. Some current references concern an adjacent year or an A650E family rather than the exact installation.

**Solution:** Create one reference configuration record: production month, engine/transmission identification, emissions specification and documented deviations from stock. Use a reference identifier in the public repository; keep the full VIN and identifying owner information out of public artifacts unless publication is explicitly intended. Associate each source with applicability, revision/page/figure, permitted use, retrieval date and the exact feature it supports. Track contradictions explicitly. A source supporting a bolt count must not also certify its coordinates.

Use Toyota/Lexus TIS to identify applicable service manuals, wiring diagrams and bulletins, then reconcile component identity with the exact catalog application. TIS lists those information categories for North American vehicles on its [official portal](https://techinfo.toyota.com/). Record what was actually obtained; a link to a manual is not proof that every relevant page was reviewed. Service drawings are not automatically dimensioned manufacturing drawings.

**Deliverables:** `research/s160/reference-configuration.json`, feature-level source register, unresolved-variant log and reference checklist for the first job.

**Acceptance:** Every component used in the first procedure has an identity/applicability record. Unknowns remain explicit. Adjacent-year evidence cannot qualify as exact-variant evidence without corroboration.

**Dependency:** Actual reference-car or donor-component access and applicable source material. Configuration/register code can begin immediately; physical identification cannot be invented.

### S160-02 · P0 · Separate inventory presence from validation status

**Problem:** The 246 gaps mix missing geometry, uncertain fitment and incomplete measurement. Examples include `pending-engine-19` versus `crank-pulley-seal`, `pending-transmission-4` versus `output-shaft-splines`, and `pending-suspension-18` versus `ps-reservoir`. These are reconciliation candidates, not grounds for automatic closure.

**Solution:** Give each physical component a stable ID, parent assembly and instance relationships. Track independent states for identity, quantity, geometry, dimensions, fitment and procedure review. Split compound gaps: an existing separator-plate study does not resolve missing check balls; a modeled VVT-i filter does not resolve unmodeled oil passages. Distinguish one group containing six pieces from six individually addressable components. Attach nominal values, units, axis/datum, measurement uncertainty, source and reviewer to each measured feature.

Migrate `quantityEvidence` into a feature claim with an explicit subject, such as “pump mounting bolts,” so it cannot be confused with six pumps. Reconcile conflicting or redundant source fields. Preserve historical IDs through aliases and an audit trail.

**Deliverables:** Typed evidence/part schema, migration, reconciliation report and updated inspector fields. The change should improve the existing inspector rather than introduce a new dashboard.

**Acceptance:** No orphan IDs; no duplicated physical components counted as separate missing items; no claimed measurements without supporting evidence. Counts of absent geometry and unverified geometry are reported separately. Migration is reproducible and preserves v5 provenance.

**Dependency:** Can start now; use S160-01's configuration and evidence rules.

### S160-03 · P0 · Capture geometry and establish assembly datums

**Problem:** Current engine/transmission placement was adjusted to fit an unverified body shell. A hood clearance pass therefore cannot establish the real installation.

**Solution:** Establish a vehicle coordinate frame from repeatable measured landmarks, then record engine mounting points, crank axis, bellhousing mating plane, transmission mount, radiator supports and firewall/subframe references. Measure corresponding features on the actual parts. Capture calibrated photographs with scale references and overlapping views; use scans where accessible. Photograph mounting faces, bolt patterns, hose ports and connectors separately. Outer body views cannot reveal hidden assemblies.

Register scans against measured landmarks and use additional independent dimensions as holdout checks. Record residual errors and acquisition uncertainty. Derive model alignment from those measurements; do not non-uniformly distort castings or relocate the powertrain solely to hide intersections. Resolve body height/wheelbase/trim discrepancies independently.

**Deliverables:** Measurement/capture checklist, local-to-vehicle transforms, licensed reference assets or references to restricted assets, landmark residual report and annotated comparison renders.

**Acceptance:** Scale, orientation and placement are independently checked. Each critical feature has a declared, source-appropriate tolerance or an unresolved status. Do not use one blanket tolerance for body panels, bolt holes and seal seats. If source tolerances are absent, report uncertainty and withhold functional-fit claims.

**Dependency:** Physical access or correctly licensed, applicable measured geometry. Preparing the capture tools is possible now; acquiring the measurements is a separate task.

### S160-04 · P1 · Rebuild the complete timing/pump service region

**Problem:** The current cover, pulley, pump and tensioner studies have estimated surfaces. The belt path and pulley teeth are illustrative. Some related seals, brackets and access components are absent or incomplete.

**Solution:** Work in three reviewable subassemblies: (a) intake/radiator/fan/access hardware needed for the selected service path; (b) front engine casting, covers, crank/cam pulleys, idler, hydraulic actuator and mounting brackets; (c) pump casting/backing region, pulley, gasket/O-ring seats, thermostat/inlet/bypass connections and hoses. Determine the actual required set from the applicable procedure rather than assuming this list is exhaustive.

Model measured interfaces first: mating planes, shaft centers, mounting bosses, bolt holes, sealing surfaces and connector locations. Derive belt geometry from confirmed pulley geometry and routing. Add timing marks, belt tooth counts and actionable alignment states only after exact source and review checks. Capture fastener diameter/pitch/length/head type, engagement direction and quantity separately; distinguish hardware to remove from factory-set hardware that remains untouched. Add cast detail and textures after those checks.

**Deliverables:** Editable subassemblies, stable selectable part/fastener IDs, measured-feature comparisons, before/after renders and a complete access-component checklist.

**Acceptance:** Every part referenced by the proposed service sequence exists and is identifiable; no decorative approximation stands in for a critical interface. Quantity, geometry and fitment gates pass independently. The seal/gasket and hardware layout must agree with the actual reference assembly.

**Dependency:** S160-01–03. Source-backed anatomy can improve while data is gathered, but such work remains provisional.

### S160-05 · P1 · Validate assembled fit and removal access

**Problem:** `check_fit.py` currently tests selected vertices against the hood surface. It omits most collisions, mating faces, installed tolerances, tool clearance and removal paths.

**Solution:** Add broad-phase bounds and narrow-phase mesh checks for candidate interfering pairs. Explicitly classify intended contact: bolts in holes, seals compressed against seats and press-fit regions must not become unexplained global exclusions. Check landmarks and interface alignment separately from collision. Test engine-to-body, radiator/fan-to-drive, sump-to-subframe, bellhousing-to-engine and transmission-to-tunnel/support relationships.

For the first procedure, define removal directions and sampled swept volumes; include tool/hand access envelopes where supported by observation. An exploded-view translation is a presentation state until reviewed as a feasible removal path. Tie every exception to part IDs, evidence and review status.

**Deliverables:** Reproducible clearance/interface reports, intentional-contact records, reviewed service paths and failing examples that demonstrate the tests detect real errors.

**Acceptance:** No unexplained critical intersections; required mating landmarks are within their declared criteria; service paths agree with observed access. Computational checks and a hands-on reference-vehicle check are both required for physical-fit approval.

**Dependency:** S160-03–04. Test infrastructure and known-defect fixtures can begin immediately.

### S160-06 · P1 · Author and review the first real repair procedure

**Problem:** The eleven current studies are anatomy views, not complete repair sequences. Showing a fastener is not a validated instruction to remove it.

**Solution:** Create a procedure data model separate from `ServiceStudy`. Each step records prerequisites, affected part IDs, hardware/container grouping, connector state, required tools, fluids, source/page, applicability and an observable completion check. Support branching where equipment or procedure variants differ. Model reassembly, replacements, fluid checks and final verification explicitly instead of simply reversing the removal animation.

Populate specifications only from the applicable reviewed information. Have a qualified reviewer execute or supervise the sequence on the reference configuration and record deviations, corrections and approval against the exact content/model revision. Keep publication status scoped to this procedure and vehicle configuration.

**Deliverables:** Draft timing-belt/water-pump workflow, step-to-part mapping, reviewer log, corrected reassembly sequence and versioned acceptance record.

**Acceptance:** Every actionable step and specification has provenance; no unresolved critical dependency; the sequence has completed hands-on review. Users can distinguish draft exploration from a procedure approved for a named configuration.

**Dependency:** S160-01, S160-04 and S160-05; actual reviewer/vehicle access is still required. No reviewer has been booked by this planning checkpoint.

### S160-07 · P2 · Validate A650E external and pan-service geometry

**Problem:** The A650E model uses family diagrams and representative internal geometry. Case surfaces, pan pattern, strainer seats, cooler plumbing and interfaces are unmeasured.

**Solution:** Identify the actual transmission variant. Measure converter housing, engine mating interface, case, extension, mount, selector/cable bracket, cooler ports and service-pan interface. Validate pan, strainer/seals, sensor/harness and valve-body mounting against the actual unit. Resolve the documented quantities independently from hole placement and hardware dimensions. Carry over the same clearance/evidence gates as the engine work.

Treat internal overhaul as a separate later milestone. Replace representative clutch/planetary counts, stack order, check balls and hydraulic channels only when exact variant evidence and physical review support them. Generic family illustrations must remain labeled as such.

**Deliverables:** Measured external assembly, pan-service component map and validated engine/driveline interfaces. Any eventual fluid-service guide needs its own full procedure review.

**Acceptance:** Exact-unit fitment and critical interfaces checked; no inferred hydraulic routing, torque value, clutch stack or parts-ordering claim.

**Dependency:** S160-01–03 and the S160-05 validation infrastructure. Reference collection can occur alongside engine work; the first engine procedure remains the principal release target.

### S160-08 · P2 · Complete the rest of the GS300 by assembly

**Problem:** Most chassis/interior geometry remains provisional. Finishing only the powertrain will not satisfy the full-car objective.

**Solution:** Extend the audited inventory by OEM catalog assembly and cross-check it against the vehicle. Order work by the next intended job and shared fitment: subframes/mounts/driveline, suspension and steering, braking/hubs, remaining electrical/fluid routing, then body access mechanisms/interior/trim. Preserve dependencies if a body, connector or bracket is required earlier for an approved service path. Resolve US-market lamp, wheel/tire and body-height questions against the reference vehicle.

Use the same identity → measurements → geometry → interface → procedure gates for every assembly. List completion against a declared inventory scope; a procedural generator is not proof that every vehicle component has been covered.

**Deliverables:** One reviewed assembly at a time, with its inventory reconciliation, measurements, renders, applicable job scope and remaining gaps.

**Acceptance:** All items in that assembly's declared scope are accounted for; installed relationships and supported procedures pass review. No full-car “1:1” claim until the complete declared vehicle scope meets its documented accuracy standard.

**Dependency:** Shared evidence/datums/gates from S160-01–05. Additional Lexus models remain lower priority than closing the GS300 accuracy gap.

### S160-09 · P1 throughout · Runtime performance and reproducible releases

**Problem:** The GLB is compressed, but 895,338 triangles still have rendering/picking costs. Current checks do not establish frame-time, GPU memory or device coverage, and validation is not yet automated on GitHub.

**Solution:** Benchmark the current viewer on an explicitly named desktop and representative mobile device, with fixed view, resolution and motion. Measure download/decode time, p95 frame time during orbit/explode, part-picking latency and memory. Proposed initial UX goals are p95 frame time ≤33 ms during interaction and visible selection feedback within 100 ms on those declared devices; these are targets to test, not current guarantees.

Profile before optimizing. Load assemblies on demand; use multiple detail levels and baked material detail for nonfunctional surfaces; retain full precision on service interfaces. Reduce draw calls and consider repeated hardware instances only if each instance keeps a stable selectable identity. Compare decoded compressed geometry against the authoring asset and declared feature tolerances.

Add CI for schema/provenance/ID validation, quantity claims, glTF integrity, types and build. Replace the blanket rejection of `accuracy='verified'` with evidence requirements for each approved state. Keep geometry/physical validation separate from software-test success. Package source, web export, checksums, source rights and QA reports together. Use milestone tags only after their stated acceptance criteria pass.

**Deliverables:** Repeatable benchmark, supported-device results, CI workflow, reproducible asset build manifest and milestone release records.

**Acceptance:** Performance goals demonstrated on named devices; important geometry preserved through export/compression; a fresh build preserves semantic IDs and passes required checks. Physical approval never follows from CI alone.

**Dependency:** Begin baseline benchmarking and CI alongside S160-02; optimize again when measured assets change the workload.

## Execution and GitHub checkpoints

| Checkpoint | Work | Exit evidence |
|---|---|---|
| C0 — planning audit | Completed in this planning turn | Baseline JSON, findings, roadmap |
| C1 — evidence foundation | S160-01/02; initial S160-09 CI | Configuration, source applicability, reconciled inventory, schema checks |
| C2 — measured installation | S160-03 | Measured landmarks and independent alignment checks |
| C3 — timing/pump assemblies | S160-04, committed by subassembly | Source/measurement diffs and reviewed before/after renders |
| C4 — fit and access | S160-05 | Interface, collision and removal-path reports plus physical observations |
| C5 — first reviewed procedure | S160-06 with S160-09 release checks | Exact-revision review record, complete sequence, named-device results |
| C6 — A650E service assembly | S160-07 | Exact-unit geometry and interface evidence |
| C7 onward — vehicle assemblies | S160-08 | One declared assembly scope per checkpoint |

The first implementation work that can start without new physical data is the inventory/evidence migration and automated regression setup. Physical capture and service-information reconciliation should be arranged concurrently; they determine when measured geometry can progress. No calendar estimate is asserted before reference access and scope are known.

After each completed, independently reviewable major step: record the change and remaining uncertainty, run relevant checks, create a descriptive commit, push it to `github`, confirm the remote commit and add its hash to the progress ledger. Unfinished research may be committed as a clearly labeled checkpoint; it must not be marked an achieved accuracy milestone. Code-only and model-only milestones use the same rule. Never combine a new source finding, unreviewed guessed geometry and a verification promotion without separately reviewable evidence.

See [the progress ledger](s160-progress.md). This is a plan and repository checkpoint, not a scheduled background task or a new deployed model version.
