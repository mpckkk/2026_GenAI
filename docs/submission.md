# Hackathon submission preparation

Requirements below follow the user's submission instructions supplied on 2026-10-25. Required technology: **Zetaris and one Meterless Engine in a working feature**. Celloras uses **H-MEM**. Cursor and NVIDIA are optional, and there are no event credits to claim. The working OpenShell/Codex runtime remains in place; optional Nightshift/Nemotron setup does not block this submission.

## Four deliverables

| Deliverable              | Contents                                                                             | Current status                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Demo video, 1–4 minutes  | The agent's main research workflow, actual Zetaris query provenance and H-MEM recall | Recording pending; outline below                                                                  |
| Slide deck               | Problem, solution, architecture, sponsor use and observed results                    | Deck artifact pending; outline below                                                              |
| Public GitHub repository | All code, setup, usage and dependencies in the README                                | Public visibility verified; application is on `celloras.com`, while default branch remains `main` |
| Sponsor explanation      | Zetaris's role, the H-MEM Engine and a test/demo showing each working                | [Written explanation and test pointers](sponsor-explanation.md) prepared                          |

Use the code URL **https://github.com/mpckkk/2026_GenAI/tree/celloras.com** in the GitHub field. It points to the application branch and meets the stated `github.com` domain requirement. Confirm the form accepts that branch URL before final submission. The live app is https://celloras.com; it is a separate demo link.

## One experiment, one research question

The demonstration should answer: **“What are these cells, what supports that interpretation, and what did we decide?”**

Use the existing soybean-root dataset. It avoids a multi-gigabyte upload during the recording and contains real measured expression, published coordinates and inspectable reference evidence. Give the recording its own experiment/account so demonstration decisions do not alter shared research.

1. Open the root demo and ask the agent to annotate the groups. Inspect the actual returned annotation card and expand **Reference, method and validation** to show Zetaris provenance.
2. Select one group and ask what supports its candidate and what remains uncertain. Show the measured markers, alternative candidates and source rows. Cluster 6 is a straightforward Root hair example; inspect the actual result before choosing it for recording.
3. Save an explicit review with a short rationale. Label it as the presenter's demonstration decision. The candidate calculation must remain unchanged.
4. In a later turn, ask what was decided for that exact group and why. Show the H-MEM recalled-decision receipt and follow its source. A browser reload alone does not prove memory retrieval; capture the actual receipt. Use the existing automated journey to demonstrate recall beyond recent context separately.
5. Correct that same review and ask again. Confirm the current recall reflects the correction, the earlier answer remains historical and another group's decision remains unaffected.

Existing live checks prove Zetaris annotation and H-MEM retrieval separately. **The combined rehearsal above is still open.** Before recording, retain the annotation run ID, Zetaris query receipt, review ID and recalled source from this same experiment. If any step fails, fix and repeat it before describing the workflow as demonstrated.

## Recording outline — target 3:30

| Time      | Screen/action                                | Point to explain                                                                            |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Root cell map and research question          | Naming cell groups requires inspecting markers, sources and competing interpretations.      |
| 0:20–1:15 | Agent annotation and evidence card           | Show measured evidence and the verified Zetaris reference receipt.                          |
| 1:15–1:50 | Candidate explanation and saved review       | The agent assists the investigation; the researcher records the decision and rationale.     |
| 1:50–2:45 | Later question, H-MEM receipt and correction | Recall the earlier decision with its source; show that a correction changes current recall. |
| 2:45–3:15 | Architecture and test evidence               | Explain the two sponsor boundaries and the real tests behind them.                          |
| 3:15–3:30 | Repo and live app                            | Show where to inspect the code, reproduce setup and try the workflow.                       |

Rehearse with real model latency. If waiting is shortened in editing, label it; label any prepared result as an earlier actual run. Do not imply the total analysis took the edited video's duration.

## Six-slide outline

1. **Problem:** researchers repeatedly compare marker evidence and reconstruct earlier label decisions. Use one concrete ambiguous group, not an unsupported time-saving statistic.
2. **Solution:** ask → inspect evidence → review → return later. Show actual Celloras cards and the researcher's role.
3. **Architecture:** Next.js/Keycloak → owned agent worker → scientific tools + Zetaris reference adapter; explicit reviews → H-MEM + PostgreSQL → later sourced recall. OpenShell/Codex runs the agent.
4. **Zetaris:** show the reference table, SELECT-only account boundary and saved query receipt. State the current 42-association scope.
5. **Meterless H-MEM:** show a decision, later recall and correction, with source links and project isolation. Identify the pinned official Engine implementation.
6. **Proof and next work:** real test results, public repository and demo; separate measured functionality from future plants, additional references and `.h5ad` uploads.

Avoid unsupported claims of classification accuracy, full-atlas federation or “weeks to seconds.” Current annotation is exploratory; same-study agreement is not independent validation. Keep this boundary concise in the presentation and link [methods](annotation-method.md) for detail.
