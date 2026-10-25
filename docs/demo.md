# Celloras demo

The complete public workflow passed on 2026-10-25: annotation through Zetaris, measured-marker comparison, explicit researcher review, H-MEM recall and correction. Use the [simple 2:40 video script](submission.md#simple-video-script--target-240) to tell the story through one Root hair candidate, its evidence and the researcher's remembered decision. The video and deck are still pending.

## Open the ready demo

Start with the visuals: [interactive cell map](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320?chatBefore=4#turn-056b9b64-0f3b-4bb9-85d8-d026c0a18b31) and [measured-marker comparison](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320?chatBefore=9#turn-c554f03a-bb55-458e-85fe-46dc920ef619). Both are saved inside **Soybean root · real cells** under the demo login. Scroll to **Cell map** or **Expression comparison** below the response text. Select group 6 on the map to highlight its 388 nuclei; the dot plot compares its two supporting genes across all groups. Dot size shows detection fraction and color shows mean expression. These are actual saved scientific results.

1. [Sign in](https://celloras.com/login), click **Use demo credentials**, then **Log in**.
2. [Open the prepared annotation](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320?chatBefore=8#turn-048dd33d-077c-40a8-a7da-251b04aab83b). Scroll to **Cell-type suggestions**, select **Cluster 6** and expand **Root hair**. Show the two measured supporting genes and their source rows. **Reference, method and validation** shows actual Zetaris delivery.
3. [Open the complete conversation](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320). The four prepared turns contain annotation, the marker dot plot, the original saved-decision recall and the corrected recall. These are saved outputs from actual agent runs.
4. Expand **Recalled 1 saved decision** to show H-MEM's source. Follow the group link to its annotation card. The review history retains the provisional Root hair review and its withdrawal; the computed suggestion and measurements remain unchanged.
5. For a live follow-up, select group 6 and click **Ask about my saved decision**, then Send. The current demonstration review is unresolved pending independent evidence.

All steps use the same 7,496-nucleus soybean-root experiment. The prepared reviews are labelled demonstrations. For a fresh recording from the beginning, register a separate account and follow the guided journey below; the shared demo already contains its completed review/correction history.

The local Keycloak login can show a **Demo login** panel with email, password and **Use demo credentials**, which fills the regular form. Set `CELLORAS_DEMO_EMAIL` and `CELLORAS_DEMO_PASSWORD` for an existing demo account in the ignored `.env`, then run `docker compose up -d --no-deps keycloak`. These values are intentionally public on that login page. Leaving either blank hides the panel; registration stays unchanged. This does not create an account or bypass authentication.

## Prepare the complete workflow

With the real dataset, worker and authentication running, execute:

```sh
# Local: use a fresh real account for an isolated rehearsal.
CELLORAS_WORKFLOW_AUTH=register npm run demo:workflow

# Public: use the existing account advertised on the login page.
CELLORAS_DEMO_URL=https://celloras.com npm run demo:workflow
```

The browser journey annotates all groups, inspects marker/source evidence, generates a real dot plot, saves a labelled demonstration review for group 6, recalls it through H-MEM, then withdraws it and verifies the corrected recall. It checks that the numerical result and the earlier answer's receipt remain unchanged. The public run requires an actual Zetaris query receipt and all 42 verified reference associations.

Beside a saved review, **Ask about my saved decision** drafts the question with its exact group and analysis context. It preserves an unfinished question; press Send when ready.

Run one preparation at a time. Fixed submission IDs resume completed turns for the same account, and later researcher edits are preserved. A failed turn stops preparation without automatic inference retry; inspect the failure before starting a new rehearsal. Registration mode intentionally creates a fresh acceptance account on each invocation. To resume locally with an existing account, set `CELLORAS_DEMO_EMAIL` and `CELLORAS_DEMO_PASSWORD` and omit registration mode. `node --env-file=.env scripts/prepare-workflow-demo.mjs` can read those values from the ignored local configuration.

The command writes direct experiment/turn links, source receipts and desktop/mobile screenshots to ignored `.artifacts/workflow-demo/`. It does not save browser credentials or sessions. Prepared reviews are demonstration decisions, not independent biological validation.

## Bring a marker CSV

Create an experiment, then choose **Upload markers → Use example → Import marker groups**. Select **Find cell-type evidence** beside Example A. The real agent compares its four genes with the compatible Wm82v4 published reference and renders a Root hair evidence card. Expand the candidate and **Evidence details** to inspect the original table rows. Ask why the candidate is provisional, or save your own review.

You can also upload a CSV exported from Excel, select its group/gene columns and confirm its tissue and genome version. The original CSV is downloadable and groups remain available after reload. Unknown or incompatible context remains unresolved. [Format and limits](marker-upload.md).

The included file is an illustrative selection from the published marker panel, not a new experiment or an accuracy benchmark. This flow compares gene lists. Use the existing root demo below for measured expression, UMAP and all-cluster annotation; no large browser upload is needed for that demo.

## Guided real-data journey

Sign in and choose **Explore soybean root demo** on the experiments page. It creates or resumes your own saved workspace. The source is the GSE270392 root RNA dataset: 7,496 nuclei, 40,127 genes and 12 original source clusters. Import it once using [the dataset guide](dataset-import.md).

1. Choose **Annotate all clusters**. The agent runs the actual marker comparison and returns an annotation card with proposed, ambiguous and unresolved results.
2. Select cluster **6**. Inspect the Root hair candidate, the two supporting markers and the source rows. Expand alternatives, conflicts and methods to see why a label remains provisional. Cluster **8_2** is a useful caution: only 25 nuclei, and the suggested label disagrees with the authors' published label in the separate same-study comparison.
3. Ask the agent to explain the selected result, or inspect a supporting gene's expression and compare markers in a dot plot. These actions retain the selected cluster and preserve an unfinished draft.
4. Review the label explicitly: accept a returned candidate, enter a correction, keep it unresolved or reject it. Add your rationale and save. Reload to show that the evidence remains unchanged and researcher decisions have their own history.
5. Use the published UMAP to explore other clusters, find enriched genes or search for relevant papers. The curated literature corpus is separate from the new Wm82v4 annotation reference; gene-specific literature searches can still return no compatible passages. Earlier root/nodule marker-list examples use an older genome build.

The existing UMAP and clusters are preserved, not recomputed. Marker ranking uses mean differences in log1p counts per 10,000. Annotation uses explicit exploratory expression rules against a compatible published reference; scores are not calibrated confidence, statistical significance or independent validation. Source cluster IDs do not establish cell identities. The agent can request these tools in freeform chat, with bounded execution and canonical cards. See [annotation methods](annotation-method.md) and [literature coverage](literature.md).

## Earlier curated-marker examples

These older root/nodule examples require the bundled `CELLORAS_REFERENCE_PROVIDER=published` configuration in a local environment. The active Zetaris table covers the Wm82v4 root panel only. Do not switch production providers for this older walkthrough; use the guided root journey for the sponsor demonstration.

Sign in to the local app and open **Soybean demo**. Its prepared conversation contains a real agent lookup and an inspectable evidence card. The sidebar also contains **Soybean nodule demo**.

These examples use selected published marker associations. They do not represent uploaded samples or an analyzed expression matrix. All displayed evidence and assistant responses come through the working reference adapter and OpenShell agent.

### Earlier two-minute presentation

1. **Root evidence:** open Soybean demo. Explain that the researcher saved a tissue, genome build and marker list, then asked the agent to retrieve evidence. Expand **Endodermis** and follow **Source paragraph**. Two genes match the limited reference; the third has no reference hit. Open **Saved review** to show the explicitly labeled provisional demo decision and its research-history link.
2. **Ask a live question:** send “Why is the Endodermis label only provisional, and what evidence would strengthen or weaken it?” The connected agent uses the saved context and actual evidence. Its next answer is a real model execution.
3. **Show uncertainty:** switch to Soybean nodule demo. Expand **Shared markers**. One gene supports both Sclereid layer and Vascular bundle. Open **Review and save your decision**, choose the unresolved option, add a note and save. Reload to demonstrate persistence.

Other useful prompts:

- “Show my saved sample and markers as cards.”
- “Explain the limits of this reference in plain language.”
- “What additional evidence would distinguish these two nodule cell types?”

The demo demonstrates conversational evidence retrieval, visual source inspection and researcher review. Full-atlas coverage and validated automatic annotation remain future work. The separate guided root demo above now supports actual expression-matrix exploration. [Reference scope](soybean-reference.md).

### Prepare or resume the earlier local demo

Start the existing app, Keycloak, PostgreSQL and OpenShell worker. Supply `CELLORAS_DEMO_EMAIL` and `CELLORAS_DEMO_PASSWORD` as environment variables for an existing local account, then run:

```sh
npm run demo:prepare
```

The script signs in through Keycloak and uses authenticated application APIs. Inputs live in `data/demo-experiments.json`; no credentials or prewritten assistant results are stored there. It reuses uniquely named owned projects, appends explicit illustrative inputs and a walkthrough note, and waits for real agent evidence. Only the root example receives a clearly labeled prepared review; the nodule decision is left to the presenter.

Stable submission IDs resume the same records and agent turns. Rerunning preserves user messages/reviews and does not repeat completed inference. A failed turn stops preparation for inspection instead of submitting another model run automatically. Project creation is not automatically retried after an uncertain response; on rerun, the script reconciles the unique owned name, and stops if duplicates exist. Run one preparation process at a time.

Direct experiment links, IDs and screenshots are written to ignored `.artifacts/demo-ready/`. Browser sessions and credentials are not saved. `CELLORAS_DEMO_URL` can select another loopback URL; remote deployment is deliberately outside this local preparation command.
