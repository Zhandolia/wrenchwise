# LS acquisition and GS300 educational pilot

Research checkpoint: 9 October 2026. Owners: content research and team lead. Related backlog: WW-011 (LS generations 1–4), WW-012 (engine-bay learning pilot).

## Deliverable and limits

`lib/s160-lessons.ts` adds a four-step educational orientation lesson using the existing GS300 assembly: installed layout, intake duct, air-cleaner layers and pump drive. Each step identifies selectable existing parts, source IDs, learning objectives, observations, limitations and an explained knowledge check. Its sequence is a learning sequence inside the viewer, not a removal sequence. It introduces no measured geometry, repair instructions or independent automotive approval.

The current GS300 asset is the strongest available foundation for this scope. Exterior community cars do not become repair-ready by adding engine labels. The lesson deliberately keeps the existing 2000 US LHD GS300 / 2JZ-GE VVT-i / stock automatic target; it does not populate GS400, GS430 or LS installations with the same engine.

## S160 asset lineage

| Checkpoint | Repository evidence | Reuse decision |
|---|---|---|
| Exterior acquisition | `research/asset-licenses.json`, GS300 source by David_Holiday, CC BY 4.0, input SHA256 `bdb8bd8392c5da44e1bcd32c9a1c5928f1afa08c59ac39df9e010c6d75e74080` | Keep source attribution. The exterior source supplied no usable engine or transmission anatomy. |
| Original mechanical v5 | Commit `58a0019`, `docs/s160-mechanical-v5.md`, `research/s160-mechanical-sources.json` | Source-informed authored geometry; no verified dimensions or procedure. |
| Intake refinement | Commit `084d1ef`, `modeling/validation/s160-intake-2026-10-09.json` | Five existing intake/MAF groups refined without upgrading evidence status. |
| Air-cleaner refinement | Commit `d03277b`, `modeling/validation/s160-airbox-2026-10-09.json` | Hollow housing, separate lid/filter and illustrative offsets. Current GLB report: 8,592,728 bytes, SHA256 `f3d75a0637002ce2458d7676b5ccd962b5d3a88fd1f4178986f5eaccb5b9f514`. |
| Standalone component | `modeling/validation/2jz-component-v1.json` | Existing v5 component extraction; it is not the later refined installed intake. Do not represent the older Blender ZIP as the current refined source. |

The reference configuration remains `target-only`, with no physical reference ID. All four requested photo captures and all six air-cleaner measurements in `research/s160/capture-plan.json` are pending. The authored lesson cannot close these evidence gaps.

## Primary reference checks

The [Lexus second-generation GS300 launch pack](https://media.lexus.co.uk/wp-content/uploads/sites/3/pdf/GS300-Gen2-1997.pdf) identifies the 2JZ-GE inline-six with VVT-i. It is a UK family reference, not proof of the exact US installation. The [official engine photograph](https://media.lexus.co.uk/images/gs-300-1998-2000-engine/) remains available and limits image reuse to editorial purposes; the lesson links to sources without bundling their images.

[Toyota/Lexus TIS](https://techinfo.toyota.com/) is the official North American route to repair manuals, wiring diagrams and technical information. Its public portal was checked; no subscription was bought and no authenticated procedure was retrieved. The lesson's pump quantities and mechanical relationships use the existing RM718U evidence audit, not a newly obtained manual or independent physical review. Existing source mirrors are clearly identified in `research/s160-mechanical-sources.json`.

## LS generation acquisition recheck

Official generation references remain accessible: [1990–1994 US LS400](https://pressroom.lexus.com/album/1990-1994-lexus-ls-400-first-1st-generation/), [1995–2000 US LS400](https://pressroom.lexus.com/album/1995-2000-lexus-ls-400-second-2nd-generation/), [third-generation UK LS](https://media.lexus.co.uk/vehicles/ls-2001-2006/) and [fourth-generation UK LS](https://media.lexus.co.uk/vehicles/ls-2006-2017/). These establish browsing references, not redistributable CAD. Market dates are not interchangeable.

Public Sketchfab downloadable searches were repeated for `Lexus LS400`, `Lexus LS430`, `Lexus LS460`, `Toyota Celsior`, `LS 400`, `LS 430`, `LS 460`, `Celsior` and `Lexus LS`. Every returned page had no next-page cursor. This is a bounded platform search, not proof that no acceptable model exists elsewhere.

| Candidate | Current evidence | Decision / blocker |
|---|---|---|
| Nieve5677 LS Mk1, Mk2 and XF30 | Still discoverable with CC Attribution metadata; previous local inspection recorded HUMSTER3D branding. See `research/lexus-ls-generation-review.json`. | Keep held. No new creator-permission evidence found; do not strip branding or convert to evade attribution. |
| [Merc_TV LS430 alternate upload](https://sketchfab.com/3d-models/lexus-ls430-mk3-2000-2006-6d0660bb631b40f9b74c1dfc4e829393) | Public model API reports downloadable CC BY 4.0, empty description, 439,699 vertices and 805,469 faces. The previously rejected `4cf8d47...` upload has the same title, author and counts. | Possible duplicate, not proven binary-identical. No download performed. It supplies no new provenance evidence and cannot clear the rejected modified/incomplete model's concerns. |
| VIP Yakuza LS400 | Search still returns the modified CC Attribution listing. Prior ledger records an ownership dispute. | Hold; no resolution located. Modified styling also does not establish a stock generation asset. |
| Evgeniy PS1 LS400, UID `a8ff42b324c140c1b2de7041b4265696` | Public model metadata endpoint returned HTTP 404 during this check. | Not presently actionable; no geometry or license accepted. |
| [3D CAD Browser LS460](https://www.3dcadbrowser.com/3d-model/lexus-ls460) | Listing expressly prohibits redistribution of source files; account required. | Unsuitable for the site's public GLB download under the displayed terms. |
| [Behr_Bros LS460 on FlatPyramid](https://www.flatpyramid.com/3d-models/vehicles-3d-models/automobile/lexus-ls-460/) | Listing shows $109.95, royalty-free, no copyright transfer and not resellable. | Public GLB redistribution permission remains unestablished. Do not buy on the assumption that a rendering license covers file distribution. |

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) permits sharing and adaptation with attribution, a license link and modification notices, but supplies no warranties or guarantee of every necessary permission. A label on a disputed upload does not resolve its provenance. No new LS model has passed acquisition review in this checkpoint. No purchases, outreach or model downloads were performed.

## Next assignments and acceptance

| Priority | Owner | Concrete next action | Acceptance evidence |
|---|---|---|---|
| P1 · WW-012a | Frontend / learning experience | Integrate the four-step orientation data with study selection, part highlighting, answered checks and clear completion feedback. | Every step selects its intended study; source links resolve; keyboard and mobile flow work; completion says learning progress only. |
| P1 · WW-012b | Vehicle evidence / automotive reviewer | Identify one stock target vehicle and complete the existing air-cleaner capture and measurement plan. | Configuration record, calibrated captures, values with method/uncertainty, repeatable datums and independent checks. No reviewer or vehicle access is currently arranged. |
| P1 · WW-012c | Content / automotive reviewer | After measured anatomy, author one configuration-specific maintenance procedure from permitted factory information and review it against the physical vehicle. | Named reviewer, exact model/source revision, complete preparation-to-final-check scope and recorded corrections. Until then, keep learning mode separate from repair instructions. |
| P1 · WW-011 | Asset acquisition | Obtain original-creator terms permitting web delivery, adaptation and public GLB downloads, or commission original generation-specific geometry. | Original author and chain of rights, license, source hash, exact depicted configuration, exterior multiview review and declared mechanical coverage. |
| P2 | Modeling / release | Refresh the editable Blender source from the accepted current assembly while preserving all asset attribution. | Reproducible output matches the advertised revision; older baseline remains clearly labeled. |

The immediate achievable product improvement is an honest interactive orientation lesson using the strongest existing assembly. Four missing LS generations and repair-grade engine-bay coverage remain open work; neither is completed by this content delivery.
