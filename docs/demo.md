# Celloras demo

## Guided real-data journey

Sign in and choose **Explore soybean root demo** on the experiments page. It creates or resumes your own saved workspace. The source is the GSE270392 root RNA dataset: 7,496 nuclei, 40,127 genes and 12 original source clusters. Import it once using [the dataset guide](dataset-import.md).

1. Choose **Explore cell groups** to show the published UMAP.
2. Select a cluster in the plot or its keyboard-accessible cluster buttons. Choose **Find markers** to see descriptive enrichment against the rest.
3. Click a gene to inspect actual expression, or compare the top genes in a dot plot. Suggestions execute in the conversation and preserve an unfinished draft.
4. Ask for papers about the atlas annotation methods, or use **Find relevant papers** for the current genes. The evidence card links to actual passages and explains compatibility. Gene-specific searches may honestly return no compatible curated evidence: the existing marker table uses an older genome build.
5. Open **Save my interpretation**, write your rationale and save it as uncertain, supported or rejected. Reload to show that the result and explicit researcher decision persist separately.

The existing UMAP and clusters are preserved, not recomputed. Ranking uses mean differences in log1p counts per 10,000, not statistical significance or cell-type confidence. Source cluster IDs do not establish cell identities. The agent can request these same tools in freeform chat, with bounded execution and canonical cards. See [literature coverage](literature.md).

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
