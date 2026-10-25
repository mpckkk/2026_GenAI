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
