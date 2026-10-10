# Wrenchwise — prioritized team backlog

Audit date: 2026-10-09 (America/Chicago). Baseline: `73ba7a6`.

Scope: live GitHub Pages flows, library/catalog/workshop code, GLB loading/imports, asset readiness, and release verification. Priorities are based on reproducible behavior or inspected code paths. No P0 issue was confirmed in this review.

- **P0:** outage, data loss, or a release-blocking critical failure.
- **P1:** broken core workflow or major product blocker; first work batch.
- **P2:** reliability, navigation, search, or quality problem; next work batch.
- **P3:** clarity and maintainability improvements.

## Ownership and current assignments

| Team owner | Agent / responsibility | Assignment |
|---|---|---|
| Library frontend | `library_navigation` | Selection history, year search, pending-entry navigation, keyboard feedback |
| 3D platform | `viewer_reliability` | Viewer resource lifecycle, compressed GLB round trips, loading/context errors |
| Catalog & workshop | `catalog_discovery` | Reference links, vehicle URL state, catalog year ranges |
| Team lead / release | Primary agent | Integrate changes, release inventory verification, browser QA, commit and deploy; maintain content acquisition backlog |

## First batch — implemented

| ID | Priority | Evidence / user impact | Owner | Acceptance / verification |
|---|---|---|---|---|
| WW-001 | P1 | Eleven catalog records use local `/research` references. Raw links navigated outside `/wrenchwise/` and reached a missing page. | Catalog & workshop | All rendered reference links use `appPath`; LS400 catalog reference resolves under `/wrenchwise/research`. |
| WW-002 | P1 | Library GLBs require Meshopt/quantization extensions, while the workshop loader lacked the decoder and import validation rejected those extensions. A downloaded SC300 could not be re-imported. | 3D platform | Support only implemented decoder extensions, retain self-contained/resource limits, validate actual library GLB, and complete browser import/render round trip. |
| WW-003 | P1 | GLTF loads completing after unmount were discarded without disposal. Original cloned materials, shared textures and GridHelper resources escaped cleanup. Repeated vehicle switching accumulates resources. | 3D platform | Shared disposal handles mesh/line resources once, late loads are disposed, and disposal regression tests pass. |
| WW-004 | P1 | Deployment checked HTML script existence and library GLBs, but omitted lazy route chunks, styles, other models and evidence files. A green deploy did not prove these files matched the build. | Team lead / release | Build a complete hashed file inventory; verify every deployed file's size/hash, including lazy chunks. Corrupted same-length fixtures must fail. |
| WW-005 | P2 | Library selection used `replaceState` without `popstate`; Back/Forward could disagree with the rendered vehicle. | Library frontend | Select two generations, Back/Forward restores both detail and selector; unknown IDs resolve consistently; unrelated query/hash values survive. |
| WW-006 | P2 | Workshop vehicle choices/imports did not update `?vehicle=`; refresh/share retained a prior vehicle. | Catalog & workshop | Vehicle picker and import update vehicle URL; reload retains chosen vehicle. Local uploaded asset identity still requires separate work (WW-015). |
| WW-007 | P2 | `LS400 1997` missed pending UCF20 despite its known year range. Catalog `SC430 2006` missed its documented 2005–2010 record. | Library frontend + Catalog | Match years within documented closed ranges. Do not extrapolate unknown dates or turn range search into mechanical fitment claims. Boundary/malformed-range tests pass. |
| WW-008 | P2 | Pending-generation details hid previous/next controls and outside-filter feedback. | Library frontend | Available and pending results share traversal and filter feedback; model counts remain separate from generation counts. |
| WW-009 | P2 | Workshop switches could retain old loading/error state; hidden containers could trigger zero-size resize work; graphics-context loss lacked usable feedback. | 3D platform | Reset state on asset switch, ignore inactive/zero-sized resize, and show context-loss/recovery feedback. |
| WW-010 | P3 | Library selection changes were not announced; input/select focus styles were inconsistent. | Library frontend | Selected generation announced through a status region, with visible keyboard focus. |

## Second batch — delivery status

The next implementation batch is complete for WW-013, WW-014, WW-015, WW-016, WW-018, WW-019 and WW-020. WW-021 now has typed viewer lifecycle state and extracted interaction, lighting, lesson and selection helpers; wider component cleanup remains incremental. WW-017 has removed redundant selectors and clarified known versus unresolved records; 732 historical source groups still need documented chassis mapping.

The product now prioritizes interactive learning: the existing S160 GS300 is in the vehicle chooser, a four-step sourced anatomy lesson includes selectable parts, knowledge checks and device-local progress, and raw exports are confined to contributor resources. Community exteriors remain explicitly limited to visual exploration. Existing model URLs are preserved.

**External content gates remain open:** WW-011 cannot be marked complete without publishable LS1–4 assets. WW-012 now has the educational orientation pilot, but measured geometry, exact configuration/part verification and independent repair-procedure review remain outstanding. See [acquisition and pilot evidence](ls-acquisition-and-engine-pilot.md). No new LS model or verified repair procedure is claimed.

Verification added: browser CI exercises one-click vehicle selection/history, pending/empty states, lesson-to-view synchronization and reload progress, compressed local import restoration, phone overflow, and failed route-chunk recovery. The deployment gate runs browser tests before publishing and hashes every public build file afterward.


| ID | Priority | Bug / opportunity and evidence | Owner | Done when |
|---|---|---|---|---|
| WW-011 | P1 | LS generations 1–4 still have **no publishable 3D assets**. Reference/status entries do not satisfy the geometry request. Three inspected candidates have unexplained HUMSTER3D branding; other listings do not establish public redistribution rights. | Team lead / content acquisition | Each generation has traceable creator/license permission for browser delivery and downloads, a reviewed GLB, correct generation/variant labels, and exterior orientation review. Do not count placeholders as models. See `research/lexus-ls-generation-review.json`. |
| WW-012 | P1 | Repair-grade engine-bay coverage is still missing: current evidence reports zero verified parts. Adding exterior references alone does not provide the intended guided repair experience. | Team lead / content + automotive review | Complete one tightly scoped vehicle/engine/market pilot with sourced part identities, measured placement, explicit uncertainty, and an independently reviewed procedure before expanding. |
| WW-013 | P2 | `AssemblyViewer.apply` clears unselected emissive color/intensity, erasing source lamp material appearance. Lighting/material quality is inconsistent across imported sources. | 3D platform | Preserve original emissive values and restore them after selection; compare front/side/rear screenshots for affected assets. |
| WW-014 | P2 | Library resize calls refit, discarding the user's orbit/zoom; fitting also makes multiple full vertex passes. Mobile browser-height changes can cause jumps and stalls. | 3D platform | Keep user camera state across routine resizes, perform initial/reset fitting only when needed, and measure large-model resize performance. |
| WW-015 | P2 | Local model identity is not encoded/restored: `?vehicle=` identifies the car, not the imported model. Reload can return to the built-in or empty model. | Catalog & workshop | Restore a known local model ID after IndexedDB loading, safely fall back when missing, and explain device-local availability for shared links. |
| WW-016 | P2 | Non-demo notes render `Chapter N`; a save completing after a vehicle switch appends to the current list. Confirmed in `app/page.tsx`'s `addComment` and comment rendering. | Catalog & workshop | Scope save results to the initiating vehicle/model, preserve drafts appropriately, and render accurate note context; test delayed save while switching. |
| WW-017 | P2 | Catalog still shows generation and configuration selectors for single-result records. 732 generation groups remain source-ordinal/unresolved rather than a reconciled body taxonomy. | Catalog & workshop | Hide redundant single-option choices; reconcile source records into body generations while preserving engine, market and provenance distinctions. |
| WW-018 | P2 | Browser interactions are manually tested; current Node tests cannot catch a selector that filters without switching the viewer. Lazy route failures lack a page-level retry boundary. | Team lead / release | Add browser smoke coverage for selection/history/import/empty states and an actionable lazy-load error fallback. |
| WW-019 | P2 | Ray picking filters by visibility only; transparent helper geometry excluded from framing can still intercept selection. | 3D platform | Ignore invisible helper materials when raycasting, with a helper-plane/visible-mesh regression case. |
| WW-020 | P3 | Catalog summary combines one provisional assembly and five exterior references as six provisional configurations. | Catalog & workshop | Show separate counts for assemblies, exterior references, pending geometry and verified coverage. |
| WW-021 | P3 | Dense one-line components and `any` viewer state make lifecycle/navigation changes difficult to review. | All frontend owners | Extract small typed state/lifecycle units while preserving behavior; avoid a broad rewrite before P1/P2 fixes. |

## Integration checks

Run Node tests, TypeScript, evidence/catalog consistency, assembly validation, Pages build and artifact validation. Browser-check selection history, year searches, Pages-prefixed reference links, compressed local import, and pending-generation behavior. After push, require successful GitHub workflows and complete deployed inventory verification for the actual commit. Keep this backlog updated with residual limitations instead of treating a green build as completion of the asset/repair roadmap.
