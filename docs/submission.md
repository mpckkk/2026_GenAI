# Hackathon submission preparation

Requirements below follow the user's submission instructions supplied on 2026-10-25. Required technology: **Zetaris and one Meterless Engine in a working feature**. Celloras uses **H-MEM**. Cursor and NVIDIA are optional, and there are no event credits to claim. The working OpenShell/Codex runtime remains in place; optional Nightshift/Nemotron setup does not block this submission.

## Four deliverables

| Deliverable              | Contents                                                                             | Current status                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Demo video, 1–4 minutes  | The agent's main research workflow, actual Zetaris query provenance and H-MEM recall | Recording pending; outline below                                                                  |
| Slide deck               | Problem, solution, architecture, sponsor use and observed results                    | [PowerPoint and PDF prepared](pitchdeck/README.md)                                                |
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

**The combined public rehearsal passed on 2026-10-25.** The [ready demo](demo.md#open-the-ready-demo) contains actual annotation, a measured-marker dot plot, an illustrative saved review, H-MEM recall and its correction in one experiment. Annotation run `af2c9005-6be1-4f7c-baf4-dede8d06155c` retains Zetaris query `f7fbb611-05df-4f96-83c8-efe2e60e8d32`; recall turns `65facd5a-7116-4c72-8115-fa09d923913c` and `caf0379c-ae9f-4631-9af3-bc77bc6be142` retain the original and corrected review sources. Repeating preparation reused those exact records without additional inference or review writes. Numerical evidence and the earlier answer's receipt remained unchanged. Separate memory regression checks cover older-context and distinct-group behavior; this combined rehearsal covers one annotation group.

The prepared history is available for walkthroughs now. The [four-slide deck](pitchdeck/README.md) is prepared. The actual 1–4 minute recording remains outstanding; rehearse any new live prompts before recording.

## Simple video script — target 2:40

Tell one story: **Which soybean cells are root-hair candidates, what evidence supports that, and what did the researcher decide?** Follow group 6, the Root hair candidate, throughout. The viewer should understand the result before hearing the implementation details.

| Time      | Show                                                                                                                                                                                     | Narration                                                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:20 | The soybean root cell map, already open. Caption: **Finding soybean root-hair cells**                                                                                                             | “Root-hair cells help soybeans absorb water and nutrients. Our demo uses gene-activity data from 7,496 soybean nuclei. Can we find the root-hair cells? Let’s follow one group and inspect the evidence.”                                  |
| 0:20–0:50 | The real annotation request and its returned map. Select **Root hair · Group 6**; the selected group contains 388 nuclei. Caption: **Ask Celloras**.                                     | “The agent runs the analysis and shows suggested cell types on the map. Let's inspect this group. Root hair is its candidate; groups with insufficient evidence stay unresolved.”                                                          |
| 0:50–1:25 | The Root hair evidence, then the saved two-gene expression plot. Open one source row and the **Reference, method and validation** disclosure. Caption: **Check the evidence · Zetaris**. | “Two marker genes support this candidate. We can inspect their measured expression and open the published source. Zetaris supplies the versioned marker reference used in this analysis, and the result keeps a record of that retrieval.” |
| 1:25–1:50 | **Saved annotation decision** for the same group. Keep the current demonstration decision visible. Caption: **The researcher decides**.                                                  | “The researcher still makes the decision. In this demo, they keep the group unresolved until independent evidence is checked. That decision and its reason stay separate from the agent's suggestion.”                                     |
| 1:50–2:20 | The later question and its answer. Expand **Recalled 1 saved decision**, then follow its group link. Caption: **Remember the decision · Meterless H-MEM**.                               | “Later, the researcher asks what they decided. Meterless H-MEM retrieves the saved decision and its reason, with a link back to the record. The next conversation can pick up where the research stopped.”                                 |
| 2:20–2:40 | Return to the annotated map, use **Download image**, then show the app and GitHub branch links.                                                                                          | “Celloras helps researchers investigate cell identities and keep their reasoning with the evidence. This working demo starts with soybean. Try it at celloras.com.”                                                                        |

### Presenter setup

Sign in before recording, close Study context, and keep the map and chat large enough to read. Use the [prepared annotation](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320?chatBefore=8#turn-048dd33d-077c-40a8-a7da-251b04aab83b), [measured-marker plot](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320?chatBefore=9#turn-c554f03a-bb55-458e-85fe-46dc920ef619) and the corrected H-MEM recall in the [same conversation](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320). Scroll to each result before recording its shot. Use cuts between these views so the audience follows the investigation without watching a long scroll.

The two supporting genes are `Glyma.01G224900` and `Glyma.17G030700`; show their labels without reading the IDs aloud. Briefly point to the selected group on the plot. Explain its dot size and color only if the shot needs it: size is the fraction of nuclei expressing a gene, color is mean expression.

Show the actual **Marker reference retrieved through Zetaris** line and the actual **H-MEM** recall receipt. Keep the architecture diagram, SQL, service-health page and the detailed correction history for the deck. Each sponsor gets a visible job in the research story.

### Recording state and remaining work

The prepared outputs came from real agent runs; the current saved decision for group 6 is **unresolved pending independent evidence**, while the computed candidate remains Root hair. Use the corrected recall turn `caf0379c-ae9f-4631-9af3-bc77bc6be142`, not the earlier provisional review's answer. The script follows that existing state and does not require changing shared reviews.

For a fresh continuous recording, use a separate experiment/account, run annotation, save the same explicitly illustrative unresolved decision, and use **Ask about my saved decision → Send**. Rehearse that run before recording; the short version above is a script, not a newly executed rehearsal or finished video. Existing full-workflow acceptance is recorded above.

Label prepared result footage **Earlier actual run**. If waiting is shortened in editing, label the cut; the target duration is the edited video length. Keep the existing candidate/review distinction visible. Finish with https://celloras.com and https://github.com/mpckkk/2026_GenAI/tree/celloras.com.

## Deck — four slides

The [editable PowerPoint](pitchdeck/Celloras-Pitch-Deck.pptx) and [PDF](pitchdeck/Celloras-Pitch-Deck.pdf) use four slides: the agent and its visual output, a without/with comparison, the agent’s tools and sponsor roles, and an actual sourced decision-recall answer. [Speaker notes](pitchdeck/speaker-notes.md) contain a roughly two-minute narration and exact sources. The [deck guide](pitchdeck/README.md#fit-to-the-judging-criteria) maps the content to the official 100-point rubric.

Avoid unsupported claims of classification accuracy, full-atlas federation or “weeks to seconds.” Current annotation is exploratory; same-study agreement is not independent validation. Keep this boundary concise in the presentation and link [methods](annotation-method.md) for detail.
