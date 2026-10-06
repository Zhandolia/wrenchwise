# S160 v5 priority audit

Audit date: 2026-10-06. Baseline: `58a0019a3d4b8d5cc91d3b376abbf97913a85659`. This is a planning audit of repository evidence, not a new mechanical sign-off.

The target remains the confirmed 2000 US-market GS300, LHD, stock automatic, 2JZ-GE VVT-i.

## Baseline

513 modeled groups; 246 gap records; zero verified parts; 895,338 triangles; 6,725,604-byte web GLB. A group may contain many physical pieces. Gap records are not a remaining physical-parts count.

## Findings

### A01 · P0

No complete component has measured geometry or physical fitment validation. Mesh count and recognizable appearance cannot establish repair readiness.

Evidence: `public/models/gs300-parts.json: validation`; `docs/s160-mechanical-v5.md: What still prevents 1:1 status`.

### A02 · P0

Timing pulley teeth, belt path and A650E clutch/planetary counts are procedural estimates. These details must not be treated as synchronization, rebuild or ordering specifications.

Evidence: `modeling/s160/build_mechanical.py:154`; `modeling/s160/build_mechanical.py:174`; `modeling/s160/build_mechanical.py:393`; `modeling/s160/build_mechanical.py:397`.

### A03 · P0

The fit check casts rays to the provisional hood only and checks selected v5 systems; it is not an assembly collision or clearance test. Passing this check does not establish mounting, underbody clearance, mating fit or tool access.

Evidence: `modeling/s160/check_fit.py`.

### A04 · P0

Inventory gaps mix absent geometry, unknown fitment, incomplete detail and unverified dimensions. 246 is a count of gap records, not the number of physical parts left to model. These pairs require reconciliation, not automatic gap closure.

Evidence: `pending-engine-19 vs crank-pulley-seal`; `pending-engine-32 vs vvti-filter-screen`; `pending-transmission-4 vs output-shaft-splines`; `pending-transmission-12 vs valve-body-separator`; `pending-suspension-18 vs ps-reservoir`; `pending-cooling-9`.

### A05 · P1

Some sources are family-level or adjacent-year references; no actual reference-car build identity is recorded. Source applicability must be recorded at feature level; family evidence cannot silently verify the 2000 US variant.

Evidence: `research/s160-mechanical-sources.json: a650e-valve-overhaul`; `research/s160-mechanical-sources.json: transtar-a650e`; `public/models/gs300-parts.json: sources`.

### A06 · P1

Exploration offsets and hidden-part lists describe presentation states, not reviewed removal/reassembly dependencies. A service procedure needs separate dependency, fastener, connector, tool, fluid and verification records.

Evidence: `lib/s160-service.ts`; `components/assembly-viewer.tsx:17`.

### A07 · P1

Validation currently checks metadata and selected counts; it rejects any part marked verified rather than testing evidence for verified status. No GitHub Actions workflow is present. Add evidence gates and automated regression reports before progressing to measured/validated parts.

Evidence: `modeling/s160/validate_web.mjs`; `.github/workflows (absent at baseline)`.

### A08 · P1

895338 triangles and a compressed file size are recorded, but device frame-time, picking latency and memory measurements are absent. Compression reduces transfer size; runtime responsiveness needs separate measurement.

Evidence: `modeling/validation/s160-v5-web.json`; `modeling/validation/s160-v5-review.json: notValidated`.

## Gap distribution

| System | Gap records |
|---|---:|
| body | 41 |
| engine | 31 |
| transmission | 12 |
| driveline | 17 |
| suspension | 20 |
| brakes | 19 |
| wheels | 10 |
| cooling | 13 |
| intake | 11 |
| exhaust | 10 |
| electrical | 20 |
| interior | 28 |
| structure | 14 |

See the machine-readable snapshot in `research/audits/s160-v5-priority-baseline.json`. Counts are historical at the stated commit; use the current manifest for later releases.
