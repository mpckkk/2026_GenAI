# Celloras demo

The new video starts with **Add dataset** and a real 29 MB soybean H5AD, then follows one group from its cell map to annotation, sources and a remembered review. Use the [3-minute upload video script](submission.md#upload-video-script--target-300). The complete public uploaded-data rehearsal passed on **2026-10-26 at 00:50:59 UTC**: download, browser upload, Linux import, agent annotation through Zetaris, measured-marker comparison, saved review and Meterless H-MEM recall.

The existing prepared public workflow passed on 2026-10-25: annotation through Zetaris, measured-marker comparison, explicit researcher review, H-MEM recall and correction. Its [2:40 prepared-run script](submission.md#simple-video-script--target-240) and saved outputs remain available below. The four-slide pitch and technical companion are ready; the video still needs recording.

## The concrete research task

Find root-hair candidates in the published soybean root atlas. Root hairs help plants absorb water and nutrients; identifying the corresponding cells is a step toward studying their biology. The demo reanalyses GSE270392, follows group 6 (388 nuclei), inspects its two measured supporting genes and recalls the saved demonstration review. It does not measure nutrient uptake or a treatment response. [Biological motivation](https://pubmed.ncbi.nlm.nih.gov/27812010/) · [Dataset](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE270392).

## Start the video with an H5AD upload

Use a separate experiment for the recording. Sign in, choose **Add dataset**, then **Download soybean root**. The authenticated `/api/datasets/demo-h5ad` download is about 29 MB and contains the actual published GSE270392 root counts converted to H5AD. It retains 7,496 nuclei, 40,127 genes, 12 existing cell groups and the original UMAP. [Source and conversion proof](h5ad-source.md).

This is a processed single-cell dataset containing raw RNA counts, not raw sequencing reads. Existing groups and UMAP are required. The import does not run alignment, QC, clustering or UMAP; describe it as **“Add your single-cell dataset.”**

1. Select the downloaded `celloras-soybean-root-demo.h5ad` and choose **Upload & check file**. Keep the actual upload progress visible briefly.
2. Select `X` for raw counts, **Gene index** (`_index`) for genes, `seurat_clusters` for groups and `X_umap` for the cell map. Choose **root**, enter `Wm82v4`, and confirm that the matrix contains raw RNA counts. Complete the import and open the experiment.
3. Show the real 7,496-nucleus map. Each dot is a nucleus; nearby dots have similar expression in the authors' existing embedding. Ask the agent to annotate the groups and explain the evidence. The agent's result must come from this newly uploaded dataset.
4. Select group **6**, containing **388 nuclei**, and inspect its **Root hair** candidate. Show the two supporting genes, `Glyma.01G224900` and `Glyma.17G030700`, without reading their IDs aloud. Open the source rows and the actual **Marker reference retrieved through Zetaris** receipt. If the fresh result differs or fails, investigate before recording; do not substitute another experiment's card.
5. Show the saved **Accepted · Root hair** review for this exact group. Its note says: “Illustrative demo review: keep Root hair provisional for group 6. Measured support includes Glyma.01G224900 and Glyma.17G030700. Confirm with independent evidence before treating this as a validated identity.” Acceptance records the researcher's provisional interpretation; it does not validate the identity or change the agent's numerical result. For a fresh recording, save this explicitly illustrative review in a separate experiment.
6. Use **Ask about my saved decision → Send**. Show the actual reply and expand **Recalled 1 saved decision** to expose the **Meterless H-MEM** source. Follow its link to the saved review. Use the current receipt from this experiment, not a receipt from the older prepared demo.

A concise annotation prompt is: “Suggest cell types for the groups in my soybean root dataset. Show the cell map, explain which evidence supports the candidates, and flag unresolved groups.” For the recall: “What did I decide about group 6, and why? Cite my saved review and distinguish it from the computed suggestion.”

For the 1–4 minute recording, cut the actual transfer/import/model waits where necessary and label each cut **Processing time shortened**. Never imply the edited duration is analysis latency. When showing a completed rehearsal, label it **Earlier actual run**. Keep the narration focused on identifying the cells and retaining evidence, not setup screens. [Shot-by-shot script](submission.md#upload-video-script--target-300).

**Public rehearsal passed:** 2026-10-26, 00:50:59 UTC. [Open Soybean H5AD · video demo](https://celloras.com/app/projects/fd21eefc-6a63-4c06-89fd-007ed138c77f) after signing in with the advertised demo account. The uploaded 28,919,346-byte file matched SHA-256 `f4c9395d190ce8e073e36ee531664c82e8bd7adaf9b29dfe64fa593088c74890`. The result contains all 7,496 map points, 7 suggested groups, 1 ambiguous group and 4 unresolved groups. Group 6 has the Root hair candidate and the two genes above.

| Saved proof                 | ID / link                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Upload                      | `e3c86263-e5aa-4af6-9475-a0858c0d7ba0`                                                                                                                                                     |
| Annotation                  | Run `f21b6943-c980-454b-8870-643773341ae9` · [agent reply](https://celloras.com/app/projects/fd21eefc-6a63-4c06-89fd-007ed138c77f?chatBefore=15#turn-99d92aaa-32b0-4cb0-8c95-61212fb791b2) |
| Zetaris                     | Query `e37392b3-f96d-4ee6-82e9-73fe75b301a2` · all 42 hash-verified reference associations                                                                                                 |
| Measured-marker comparison  | Run `38707d03-31ee-464c-85bb-05c4790a3de0` · turn `04e88095-b965-4fff-ad97-e4853919c6a1`                                                                                                   |
| Provisional accepted review | `272f903e-e478-4bec-a57f-60d9380288fb`                                                                                                                                                     |
| H-MEM recall                | Turn `1cbd56fc-5cd6-4a33-be98-cf842d84bedb` · source `annotation-review:272f903e-e478-4bec-a57f-60d9380288fb`                                                                              |

The stored annotation result remained unchanged after review and recall. This new experiment contains an **accepted provisional** demonstration review; the older prepared experiment below contains a later **unresolved** correction. Keep those two histories distinct. The full receipt is retained in the ignored `.artifacts/h5ad-public/receipt.json`; recorded results are summarized in [verification](verification.md).

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
