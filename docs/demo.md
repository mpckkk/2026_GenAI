# Celloras demo

The local Keycloak login can show a **Demo login** panel with email, password and **Use demo credentials**, which fills the regular form. Set `CELLORAS_DEMO_EMAIL` and `CELLORAS_DEMO_PASSWORD` for an existing demo account in the ignored `.env`, then run `docker compose up -d --no-deps keycloak`. These values are intentionally public on that login page. Leaving either blank hides the panel; registration stays unchanged. This does not create an account or bypass authentication.

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

Sign in to the local app and open **Soybean demo**. Its prepared conversation contains a real agent lookup and an inspectable evidence card. The sidebar also contains **Soybean nodule demo**.

These examples use selected published marker associations. They do not represent uploaded samples or an analyzed expression matrix. All displayed evidence and assistant responses come through the working reference adapter and OpenShell agent.

## Two-minute presentation

1. **Root evidence:** open Soybean demo. Explain that the researcher saved a tissue, genome build and marker list, then asked the agent to retrieve evidence. Expand **Endodermis** and follow **Source paragraph**. Two genes match the limited reference; the third has no reference hit. Open **Saved review** to show the explicitly labeled provisional demo decision and its research-history link.
2. **Ask a live question:** send “Why is the Endodermis label only provisional, and what evidence would strengthen or weaken it?” The connected agent uses the saved context and actual evidence. Its next answer is a real model execution.
3. **Show uncertainty:** switch to Soybean nodule demo. Expand **Shared markers**. One gene supports both Sclereid layer and Vascular bundle. Open **Review and save your decision**, choose the unresolved option, add a note and save. Reload to demonstrate persistence.

Other useful prompts:

- “Show my saved sample and markers as cards.”
- “Explain the limits of this reference in plain language.”
- “What additional evidence would distinguish these two nodule cell types?”

The demo demonstrates conversational evidence retrieval, visual source inspection and researcher review. Full-atlas coverage and validated automatic annotation remain future work. The separate guided root demo above now supports actual expression-matrix exploration. [Reference scope](soybean-reference.md).

## Prepare or resume the local demo

Start the existing app, Keycloak, PostgreSQL and OpenShell worker. Supply `CELLORAS_DEMO_EMAIL` and `CELLORAS_DEMO_PASSWORD` as environment variables for an existing local account, then run:

```sh
npm run demo:prepare
```

The script signs in through Keycloak and uses authenticated application APIs. Inputs live in `data/demo-experiments.json`; no credentials or prewritten assistant results are stored there. It reuses uniquely named owned projects, appends explicit illustrative inputs and a walkthrough note, and waits for real agent evidence. Only the root example receives a clearly labeled prepared review; the nodule decision is left to the presenter.

Stable submission IDs resume the same records and agent turns. Rerunning preserves user messages/reviews and does not repeat completed inference. A failed turn stops preparation for inspection instead of submitting another model run automatically. Project creation is not automatically retried after an uncertain response; on rerun, the script reconciles the unique owned name, and stops if duplicates exist. Run one preparation process at a time.

Direct experiment links, IDs and screenshots are written to ignored `.artifacts/demo-ready/`. Browser sessions and credentials are not saved. `CELLORAS_DEMO_URL` can select another loopback URL; remote deployment is deliberately outside this local preparation command.
