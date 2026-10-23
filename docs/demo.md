# Celloras demo

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

The demo demonstrates conversational evidence retrieval, visual source inspection and researcher review. Full-atlas coverage, matrix analysis and validated automatic annotation remain future work. [Reference scope](soybean-reference.md).

## Prepare or resume the local demo

Start the existing app, Keycloak, PostgreSQL and OpenShell worker. Supply `CELLORAS_DEMO_EMAIL` and `CELLORAS_DEMO_PASSWORD` as environment variables for an existing local account, then run:

```sh
npm run demo:prepare
```

The script signs in through Keycloak and uses authenticated application APIs. Inputs live in `data/demo-experiments.json`; no credentials or prewritten assistant results are stored there. It reuses uniquely named owned projects, appends explicit illustrative inputs and a walkthrough note, and waits for real agent evidence. Only the root example receives a clearly labeled prepared review; the nodule decision is left to the presenter.

Stable submission IDs resume the same records and agent turns. Rerunning preserves user messages/reviews and does not repeat completed inference. A failed turn stops preparation for inspection instead of submitting another model run automatically. Project creation is not automatically retried after an uncertain response; on rerun, the script reconciles the unique owned name, and stops if duplicates exist. Run one preparation process at a time.

Direct experiment links, IDs and screenshots are written to ignored `.artifacts/demo-ready/`. Browser sessions and credentials are not saved. `CELLORAS_DEMO_URL` can select another loopback URL; remote deployment is deliberately outside this local preparation command.
