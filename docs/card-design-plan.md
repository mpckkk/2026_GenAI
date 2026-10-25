# Visual research cards

Requested 2026-10-25: make every agent card readable and visually useful, starting with marker evidence. Keep the existing black/white design kit, with green for evidence and selection.

## Presentation sequence

1. Shared shell: small icon/label, clear result heading, readable content, quiet source details, consistent actions.
2. Marker evidence: candidate headline, visible gene-to-candidate matches, compact match coverage, accessible source rows. Multiple candidates remain alphabetical, with no inferred ranking or confidence.
3. Annotation: actual status distribution, navigable groups, candidate evidence bars showing supporting/conflicting/weak gene counts. Preserve review history and action payloads.
4. Scientific results: compact plots with readable legends, selected groups, detection bars in marker tables. Literature: numbered source entries and clear applicability. Context/marker cards: sample facts and gene chips.
5. Verify real saved results and interactions on desktop/mobile, then push and check production.

## File ledger

Create `app/(workspace)/app/result-card.tsx` and `result-card.module.css` for the shared shell/header and count visuals. Update `agent-response.tsx`, `agent-response.module.css`, `evidence-card.tsx`, `annotation-card.tsx`, `annotation-card.module.css`, `scientific-card.tsx`, `scientific-card.module.css`, and `literature-card.tsx` for presentation. Update `docs/verification.md`, `learned.md`, and `CHANGELOG.md` with observed checks. Update the existing marker-evidence browser assertions for the new headline and count explanation. No renames/deletions or domain/API/schema changes.

## Acceptance

Use authenticated real saved records. Capture before/after and desktop/mobile screenshots. Verify source disclosures, candidate/group selection, draft-question actions, review controls, no page overflow, and unchanged canonical response data. Run lint, typecheck and build. Do not present marker overlap or descriptive annotation scores as probabilities. Keep blocked/empty states distinct from a completed lookup with zero matches.

## Evidence detail correction — 2026-10-25

The first release retained repeated provenance paragraphs, and the user rejected it. Replace the evidence list with an inspectable matrix and shared study links.

| Action | File                                                  | Change                                                                                                                                                        |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE | `app/(workspace)/app/marker-provenance.ts`            | Interpret only the exact stored Table S2 v1 producer format; unknown formats remain explicitly unspecified. Never infer study species from a soybean gene ID. |
| CREATE | `app/(workspace)/app/marker-evidence-view.tsx`        | Gene/species/study rows, deduplicated citations and a native accessible detail dialog for one record.                                                         |
| CREATE | `app/(workspace)/app/marker-evidence-view.module.css` | Compact evidence matrix, linked source tiles and responsive inspector.                                                                                        |
| UPDATE | `app/(workspace)/app/evidence-card.tsx`               | Use the evidence matrix for single and competing candidates.                                                                                                  |
| UPDATE | `app/(workspace)/app/agent-response.module.css`       | Remove obsolete inline provenance row styling.                                                                                                                |
| UPDATE | `tests/marker-evidence.spec.ts`                       | Verify grouped source navigation, actual record details and keyboard dismissal alongside the existing real review journey.                                    |
| UPDATE | `docs/verification.md`, `learned.md`, `CHANGELOG.md`  | Record observed evidence, correction and limitations.                                                                                                         |

Order: deterministic presentation metadata → compact component/dialog → real saved-record browser checks → push/live verification. No domain, stored-result, provider or scoring changes; no deleted/renamed files. Exact source text and row links stay available in the inspector. Verify four demo genes map to three Arabidopsis references and one soybean reference, two distinct studies, no silent inference for old paragraph records, unchanged saved responses/reviews, keyboard focus return, and 320px/390px layouts.

## Inline evidence and annotation image — 2026-10-25

The user explicitly rejected the side inspector. Keep gene details inline and lead annotation with a real, selectable UMAP colored by the saved computed suggestions. Export the figure as an image. Do not attach a synthetic cell map to marker-only evidence; that result contains no coordinates.

| Action | File                                                         | Change                                                                                     | Package |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------- |
| UPDATE | `app/(workspace)/app/marker-evidence-view.tsx`               | One compact expanded row; remove modal and focus transfer                                  | 1       |
| UPDATE | `app/(workspace)/app/marker-evidence-view.module.css`        | Inline evidence styling; delete fixed side-panel rules                                     | 1       |
| UPDATE | `tests/marker-evidence.spec.ts`                              | Real source links through inline evidence, no dialog                                       | 1       |
| UPDATE | `app/core/analysis.ts`                                       | Typed annotation map read contract                                                         | 2       |
| UPDATE | `app/services/analysis.ts`                                   | Authorize map access                                                                       | 2       |
| UPDATE | `app/adapters/analysis.ts`                                   | Read exact saved annotation's compatible measured embedding; reject version/count mismatch | 2       |
| CREATE | `app/api/projects/[projectId]/analyses/[runId]/map/route.ts` | Authenticated read endpoint                                                                | 2       |
| CREATE | `app/(workspace)/app/annotation-map.tsx`                     | Selectable color-coded actual UMAP and PNG export                                          | 3       |
| CREATE | `app/(workspace)/app/annotation-map.module.css`              | Responsive figure, labels and export action                                                | 3       |
| UPDATE | `app/(workspace)/app/annotation-card.tsx`                    | Map before candidate controls; share selection                                             | 3       |
| UPDATE | `app/(workspace)/app/annotation-card.module.css`             | Compact matching group legend                                                              | 3       |
| UPDATE | `tests/annotation-journey.spec.ts`                           | Actual map, export, selection and ownership checks                                         | 4       |
| UPDATE | `docs/verification.md`, `learned.md`, `CHANGELOG.md`         | Record real acceptance and rejected panel pattern                                          | 4       |

No files renamed or deleted. No migrations, recalculated embeddings, changed scores or provider activation.

Sequence: (1) inline evidence, (2) owned/version-checked embedding read, (3) rendered/exportable image, (4) real local and public browser checks, then push on `celloras.com`. Acceptance covers original coordinates/counts, saved result immutability, wrong owner/project/run rejection, PNG content, desktop/mobile overflow, keyboard selection and source access. A missing or incompatible embedding shows an explicit error while saved annotation evidence remains readable.
