# S160 progress ledger

## 2026-10-09 — Intake surface correction and engine-bay source audit

Rebuilt five existing intake/MAF groups from the v5 installation estimates: smoother duct, path-aligned bellows and clamp bands, and attached sensor/connector detail. Added an intake-focused assembly study and the cross-vehicle source audit in `docs/engine-bay-research-2026-10-09.md`. Preserved all 759 inventory IDs and exterior attribution. Current GLB: 912,186 triangles, 7,987,348 bytes; still zero verified parts. The reusable 2JZ export excludes these groups and is unchanged. Blender ZIP is labeled as the earlier v5 baseline.

Checks: 18 regression tests, mesh/inventory reconciliation, eight documented quantity groups, evidence/catalog generation, TypeScript and GitHub Pages production build. Local catalog check initially encountered checkout line endings; deterministic regeneration resolved it with no catalog content change. Browser inspection confirmed the revised intake renders and its dedicated camera frames the duct. This is a visual modeling checkpoint, not measured installation or procedure completion. The committing revision records the checkpoint; GitHub Actions records publication separately.

Working rule from the project owner: push each major completed step to the GitHub repository to preserve progress. Keep commits descriptive and independently reviewable. Update this ledger when a milestone changes state. Planning a milestone does not complete it.

| Date | Checkpoint | State | Evidence / commit |
|---|---|---|---|
| 2026-10-06 | v5 reference-informed mechanical assembly | Published prototype; no verified parts | `58a0019a3d4b8d5cc91d3b376abbf97913a85659` |
| 2026-10-06 | C0 baseline audit | Complete as a repository audit | `c1c1532`; `research/audits/s160-v5-priority-baseline.json` |
| 2026-10-06 | C0 prioritized implementation plan | Complete as a plan | `docs/s160-roadmap.md`; commit containing this ledger entry |
| — | C1 evidence foundation | Planned | S160-01/02, initial S160-09 |
| — | C2 measured installation | Planned; physical reference data required | S160-03 |
| — | C3 timing/pump assemblies | Planned | S160-04 |
| — | C4 fit and access | Planned; physical review required | S160-05 |
| — | C5 first reviewed procedure | Planned; reviewer and vehicle access required | S160-06/09 |
| — | C6 A650E service assembly | Planned | S160-07 |
| — | C7 onward, remaining GS300 assemblies | Planned | S160-08 |

## Record for every major implementation step

- Scope and stable task/checkpoint ID.
- Source and reference configuration; new measurements and uncertainty.
- Code/geometry changes, comparison renders and artifact hashes where relevant.
- Checks run, results and unresolved defects; physical checks distinguished from software checks.
- Commit SHA and confirmed GitHub push; deployment version only if deployed.
- Reviewer/approval record before promoting any geometry, fitment or procedure status.

Never include credentials, private identifying vehicle/owner data or restricted source media in a public commit. Keep user changes outside the task intact. Use a normal follow-up commit for corrections; do not rewrite shared progress history.

## C1a — evidence migration, 2026-10-06

Implemented a make-independent evidence schema, deterministic v5 migration, separate geometry and validation states, ten quantity claims with explicit hardware subjects, and inspector integration. All 759 legacy IDs are preserved: 513 modeled groups, 240 absent-geometry records and six partial/unresolved records. None of the six was certified complete. Added negative validation tests and GitHub CI; physical reference acquisition and complete inventory reconciliation remain pending. The reference configuration remains a target, not a physically identified car.

GitHub attribution diagnosis: GitHub reported `author: null` and `committer: null` for the previous planning commit. Set repository-local identity to the authenticated Zhandolia account's numeric noreply address for future commits. Existing shared commits were preserved. This is a software/evidence checkpoint, with no new geometry or mechanical approval.

## Catalog foundation — 2026-10-06

C1a evidence migration pushed as `d50aa3ee6501bec586e832bbff49b05bd55a94af`; GitHub confirms author and committer are Zhandolia. Its CI run passed. Expanded manufacturer catalog, shared upload/comment registry and paginated vehicle selection are recorded in the next catalog checkpoint. See `docs/toyota-lexus-catalog.md` for source scope and outstanding worldwide coverage. This expansion does not complete measured geometry milestones C2–C7.

## Toyota visual-reference checkpoint — 2026-10-06

Expanded catalog foundation pushed as `70193a5`; CI passed. The following checkpoint adds the licensed GR Supra reference, source preparation script, component index, immutable provenance, six-view review findings and GLB validation. It is a 136-group visual model, not a complete mechanical replica. Catalog total becomes 817 source records with five provisional asset entries. The application now suppresses the GS300 timing-belt checklist for other vehicle records.

Validation for Toyota reference: five catalog/evidence/GLB tests passed locally; TypeScript passed. Local browser checks confirmed Toyota search, historical-record navigation, correctly scoped source attribution, GS300 quantity subjects and the Supra renderer without browser console errors. No frame-rate or mechanical accuracy claim follows from these checks.

## Publication — 2026-10-06

Toyota reference checkpoint pushed as `913370c63b850146f279c80f4386726afdc2b726`; GitHub confirms author/committer Zhandolia. The Sites production deployment of that exact source succeeded at 2026-10-06 15:49 UTC. The site's access audience was preserved. Catalog/evidence software is updated; GS300 geometry remains model v5. The GR Supra is a newly added CC BY visual reference, with no verified mechanical content.

Completed software checks: deterministic evidence/catalog generation, five regression tests, GLB ID/license/embedding checks, TypeScript and production build. Full 1:1 geometry, complete worldwide Toyota/Lexus configuration coverage, measured performance and physical repair review remain outstanding.

## 2026-10-06 — Family catalog and reusable component publication

- App source: `46f606070cdedfc09d463b113090657173746c12`, pushed to GitHub main with author/committer Zhandolia. GitHub validation: https://github.com/Zhandolia/wrenchwise/actions/runs/37499986889 — passed.
- 817 source records organized into 356 browsing families; legacy storage IDs preserved. S160 GS displacement badges are configuration options. Different engine codes remain distinct. Historical source generations remain explicitly unresolved.
- Added `/components` with a standalone 2JZ study, extracted from S160 v5: 212 groups (118 core / 94 installation), 3,723,168-byte compressed GLB, six reviewed views. This is existing geometry modularized, not a new verified engine or 212 new parts.
- Verified grouped search and configuration switching, V8 missing-geometry state, component mesh selection, layer filtering, casing hiding and browser error log. Twelve tests, evidence reconciliation, assembly validation, TypeScript and production build passed. Fixed false-positive GS400 search matching flagship LS400 text.
- Saved version: `appgprj_6ac44070db5881918afa76b61fb84388~appgver_0b4bbe4173b8819182b1b8e149aed835`.
- Deployment: `appgdep_6ac529f0c6f08191956ff2811ab11f99`; succeeded 2026-10-06T17:04:00Z at https://wrenchwise-workshop.zhandolia.chatgpt.site. Existing owner-private access preserved.
- No complete part or vehicle gained dimensional/fitment/procedure verification. Other catalog families and engine reuse mappings remain unfinished. Priority remains measured component geometry and installation interfaces, followed by reviewed UZ/MZ reuse candidates.
