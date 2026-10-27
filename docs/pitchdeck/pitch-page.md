# Celloras browser pitch

Initial version: build the approved six-beat pitch as a standalone page at `/pitch.html` on the existing Celloras deployment. White and black with restrained green, large editorial type, actual GSE270392 coordinates and real product captures. Keep the private `pitch-outline.md` untracked.

## File ledger and sequence

1. Create `public/pitch.html`, `public/pitch/pitch.css` and `public/pitch/pitch.js` for the narrative, responsive presentation and the real-data map interaction.
2. Create `public/pitch/logo.png`, `public/pitch/conversation.png`, `public/pitch/recall.png` and `public/pitch/activity.png` by copying unchanged brand and product captures. Record their original sources here. Reuse the existing botanical image and coordinate JSON.
3. Update this document, `docs/verification.md`, `learned.md` and `CHANGELOG.md` with observed results and asset provenance.

Deleted files: none. Renamed files: none. Application behavior, authentication, scientific analysis and provider configuration are outside this change.

## Acceptance

Inspect the actual page on desktop and mobile, including map mode changes, navigation, evidence disclosure and the enlarged screenshot. Confirm every asset loads, no horizontal clipping occurs and Nightshift remains visibly pending. Verify the pushed static page and assets on the public deployment. This is presentation work; no new inference or scientific accuracy claim is required.

## Implemented page

- Six story sections: the detective work after sequencing, the evidence behind a cell name, the agent, one root-hair finding, recorded tool activity and the ambition for more plants.
- White page, restrained green, real interactive UMAP, actual product captures, responsive layout and source disclosure. Login and technical-flow links use the existing application.
- Public URL after rollout: https://celloras.com/pitch.html. The private outline remains outside Git.

## Asset and claim provenance

- `public/pitch/logo.png` is an unchanged copy of `docs/assets/celloras-logo.png`. The botanical illustration reuses `public/images/soybean-root-editorial-v1.webp`.
- The canvas reads the existing `public/images/soybean-root-umap.json`: all 7,496 original author coordinates, 12 source groups, no downsampling or recomputation. Labels in the initial view are source IDs. The selected group is source group 6, 388 nuclei. The question-mark label is a provisional suggestion, not the authors' label presented as an agent result.
- `conversation.png` and `recall.png` were captured from the actual application on 27 October. Both belong to experiment `7bdae43c-5cd2-4203-a571-e73b445985db`, the same uploaded H5AD demonstration documented in `docs/evidence/agent-activity-public-2026-10-26.json`. No new analysis or model request was submitted.
- Annotation turn: `3ff0f30e-3655-4e83-8b4e-08f703054b46`; run: `6faf249a-4a9b-4af0-a462-03369a6f2d52`. Result: 7 suggested, 1 ambiguous, 4 unresolved groups. The HTML conversation uses the first sentence of the real request and response, explicitly identified as excerpts beside the actual result card.
- Root-hair evidence: `Glyma.01G224900` and `Glyma.17G030700`. Review `adbcacc8-62f6-452f-a1da-87d559bb8ff1` explicitly treats the identity as provisional. Recall turn: `ee487b10-71e8-45c7-82d0-c857bc47588f`. The real screenshot retains the illustrative-review qualification.
- `activity.png` is an unchanged copy of the inspected `.artifacts/activity-public/13-activity-expanded-tool-and-source.png`, showing the real 42-entry Zetaris reference query and annotation result. Captures contain no keys, tokens or login fields.
- Same-study marker reference means workflow evidence, not an independent accuracy evaluation. Cross-study expression comparison is future work. No novelty, publication-readiness or time-savings benchmark is claimed.
- Nightshift investigations run on NVIDIA Nemotron 3 Ultra; three completed on the live app on 27 October. The page shows this; the recorded agent runtime is Codex through OpenShell.

## Browser verification

Inspected the real page at 1440px desktop and 390px mobile, including all six sections and loaded screenshots. Toggled both map modes, verified the 388/7,496 captions, opened the source disclosure and checked image loading. No page errors, failed content requests or horizontal overflow. Static preview used port 3125 because the already-running production Next process on port 3100 had not indexed the newly added files. Deployment rebuild includes the new public files. Evidence is kept in ignored `.artifacts/pitch-page/`.

## Revision after design feedback

The first version was rejected as generic. Replace the long marketing page with six presentation frames, retaining the same route and verified assets. One point per frame: product, manual work, agent demonstration, root-hair evidence, architecture and recorded tool use, then plant coverage. Remove the detective metaphor, repeated CTAs and paragraphs that restate the same promise. Desktop frames fit the viewport with keyboard/button navigation; mobile uses normal vertical reading. Keep the real workflow and pending Nightshift status explicit.

File ledger: rewrite `public/pitch.html`, `public/pitch/pitch.css`, `public/pitch/pitch.js`; update this document, verification notes, learned notes and changelog. Reuse existing images without edits. No runtime, science, login, private outline or database changes.

Reference: Sequoia's [pitch guidance](https://sequoiacap.com/article/writing-a-business-plan) puts the company purpose before the problem and solution. Apply that sequence within the hackathon's required demo and architecture content; do not add invented traction or market claims. Use the Presentations and Made to Stick skills for concise copy and one visual idea per frame.

### Revision verification

Inspected all six desktop frames at 1440 × 900. Each stays within the fitted stage with no overflow. The actual result and recall screenshots remain unchanged. Verified direct slide buttons, Home/ArrowRight keyboard navigation, source-dialog open/Escape-close, image loading and the 390px mobile reading layout. No browser page errors or horizontal mobile overflow. Evidence: `.artifacts/pitch-revision/`.

Current copy: Meet your cells → The data is ready, the interpretation isn't → Upload and ask the agent to annotate → Root-hair evidence and saved review → Architecture and recorded tool use → An AI colleague for plant research. The preceding long-page description is implementation history, not the current presentation.
