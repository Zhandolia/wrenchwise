# S160 progress ledger

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
