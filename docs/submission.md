# Hackathon submission preparation

## Latest organizer correction, supplied 27 October

The user supplied a newer organizer message explicitly requiring **Zetaris, a Meterless Engine in a working feature, and Nightshift as the AI provider**. The demo must include one real Nightshift request, and the README needs at least three sample inputs and outputs. Treat this as the current submission target; the older rule audit below records conflicting earlier guidance.

Zetaris and H-MEM have workflow evidence. Nightshift is working: three investigations completed on the live app on 27 October, running NVIDIA Nemotron 3 Ultra ([receipt](evidence/nightshift-investigations-2026-10-27.json)).

Required technology for the current plan: **Zetaris, one Meterless Engine, and Nightshift as the AI provider**. Celloras uses **H-MEM** as its Engine and currently runs Codex through NVIDIA OpenShell. Nightshift runs group investigations on NVIDIA Nemotron 3 Ultra. The dated audit below preserves the earlier rule conflict.

## Four deliverables

| Deliverable              | Contents                                                                             | Current status                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Demo video, 1–4 minutes  | The agent's main research workflow, actual Zetaris query provenance and H-MEM recall | Recording pending; outline below                                                                  |
| Slide deck               | Problem, solution, architecture, sponsor use and observed results                    | PowerPoint and PDF prepared                                                                       |
| Public GitHub repository | All code, setup, usage and dependencies in the README                                | Public visibility verified; application is on `celloras.com`, while default branch remains `main` |
| Sponsor explanation      | Zetaris's role, the H-MEM Engine and a test/demo showing each working                | [Written explanation and test pointers](../README.md#how-we-use-the-sponsor-technology) prepared  |

Use the code URL **https://github.com/mpckkk/2026_GenAI/tree/celloras.com** in the GitHub field. It points to the application branch and meets the stated `github.com` domain requirement. Confirm the form accepts that branch URL before final submission. The live app is https://celloras.com; it is a separate demo link.

## Event rule audit — 26 October 2026

Read all ten expanded sections of the [binding event page](https://hackathon.genai.works/event/open-agent-hackathon-2026#rules). The [Resource Center Official Rules draft](https://hackathon.genai.works/resources?id=01a08ff1-54cc-709a-bfe7-6b34452b676b) and [Submission Requirements](https://hackathon.genai.works/resources?id=01a08ff1-54c3-70c5-b262-31e75dfd1e60) defer to that page when they disagree. In particular, event rules 5.1–5.3 require the two sponsors and permit any model/API; they do not impose the draft's Nightshift-primary condition. Preserve the verified OpenShell path. The [Strong Submission Examples](https://hackathon.genai.works/resources?id=01a08ff1-5601-7225-9eb4-f4a33f7ad374) are illustrative guidance, not a mandatory multi-agent template.

| Event section            | Evidence or remaining action                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Eligibility           | The team must confirm each member's age, single-account status and cash-prize eligibility. Repository tests cannot establish these personal facts.                                                                                                     |
| 2. Teams                 | HackOS shows two members, within the permitted size. The leader must confirm the roster before creating the first submission; no team changes were made during this audit.                                                                             |
| 3. Tracks                | Select one primary track in the final form. Suggested fit: **The Agent That Can Explain Why**. The inspected team view did not show a selected track, so it is not marked confirmed.                                                                   |
| 4. Build window          | First implementation commit `694d1a8` is dated 23 October, inside the window. Declare earlier planning, supplied branding and third-party code/data separately.                                                                                        |
| 5. Technology            | Actual Zetaris retrieval and Meterless H-MEM recall passed in one owned experiment. NVIDIA OpenShell supplies the verified runtime. See [sponsor evidence](../README.md#how-we-use-the-sponsor-technology).                                            |
| 6. Deliverables          | Public branch, README, pitch/engineering decks and sponsor explanation exist. **Final video and form submission are pending.** Include both decks so architecture, stack, scope and future work accompany the short pitch.                             |
| 7. Judging               | Coverage mapping uses the published rubric. It records evidence, not predicted scores.                                                                                                                                                                 |
| 8. Prizes                | No Nemotron-award eligibility is claimed. Prize distribution and any recipient tax obligations remain team matters.                                                                                                                                    |
| 9. Intellectual property | Data/dependency provenance and the vendored H-MEM license are documented. The team must confirm rights to all submitted assets and accept the event's promotional license when submitting. Public availability alone is not a blanket dataset license. |
| 10. Schedule             | Submit before **27 October 2026, 23:45 UTC**, and check for announced changes. This audit did not submit or certify the entry.                                                                                                                         |

The README now explicitly covers what was built, data used, setup/dependencies and three observed input/output examples. A clean checkout at `cc437d2` passed dependency installation, generated-secret setup, Compose validation and a production build on 26 October. This checks bootstrap/build reproducibility; it does not claim a second isolated sponsor installation. The live complete workflow has its separate [acceptance receipt](evidence/agent-activity-public-2026-10-26.json).

Gitleaks 8.30.1 scanned all 52 commits reachable from `celloras.com` with no findings. A wider 53-commit scan also inspected `origin/main` and flagged two entries in a vendored pydeck source map; both were verified as JavaScript symbol names in its `names` array, not credential values. No history was rewritten. `.env.example` contains placeholders, while `.env` and runtime/session artifacts are ignored. This automated check does not replace reviewing the finished video and deck pixels.

The remaining final gates are the recording/link check, form track/roster declarations, rights confirmation and submission receipt. Do not describe the entry as fully submitted or all rules certified before those gates pass.

## Secret-free recording gate

1. Sign in **before** capture. Record only the Celloras content area, with unrelated tabs/notifications hidden. Keep the login panel, environment files, terminal, admin consoles and browser network/storage panels out of the recording, including during transitions.
2. Show one request from **Send / Annotate all groups** through running activity to its completed map. Open **View activity** on that same request and expand the actual Zetaris retrieval receipt. A request ID and content checksum are provenance identifiers; never display API credentials or query cursor tokens.
3. Save an explicitly illustrative review, ask for recall, and show its H-MEM source link. Use the same experiment throughout. Prepared footage must be labelled **Earlier actual run**; label any shortened wait rather than implying an unmeasured speedup.
4. Inspect the exported video from start to finish, including its thumbnail, for keys, tokens, passwords and personal data. Verify 1–4 minute duration, readable text/audio and a judge-accessible video link. Also open both deck links and the exact GitHub branch without repository-owner access.

**Recording status: pending.** Existing screenshots and successful runs prove the workflow, not the existence of a finished video.

## Organizer readiness checklist — verified 26 October

| Requirement                     | Visible proof                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working end-to-end version      | Fresh H5AD upload → annotation → measured-marker plot → review → recall in [the activity demo](https://celloras.com/app/projects/7bdae43c-5cd2-4203-a571-e73b445985db).                                                         |
| Sponsors connected and tested   | The annotation trace contains the real Zetaris query, 42 associations and verified hash; the recall trace contains the exact Meterless H-MEM review source.                                                                     |
| Understandable agent activity   | [Agent activity dashboard](https://celloras.com/app/activity?projectId=7bdae43c-5cd2-4203-a571-e73b445985db): three completed requests, timed steps, inline input/output/source details, original-result links and JSON export. |
| Sample inputs and outputs ready | The 29 MB sample, 7,496-cell map, annotation, two-gene plot and recalled review are saved. [Recorded proof](evidence/agent-activity-public-2026-10-26.json).                                                                    |

For the video, open **View activity** under the annotation answer, expand **Retrieve marker evidence**, then show **Recall saved decisions** on the later request. These are persisted records of the actual execution. Recording and uploading the final 1–4 minute narrated video remain outstanding; the working feature and its sample outputs are ready.

## One experiment, one research question

The demonstration should answer: **“What are these cells, what supports that interpretation, and what did we decide?”**

Start by adding the real **29 MB soybean H5AD sample** to a new experiment. It contains measured expression and the authors' existing groups/UMAP, transparently converted from the published GSE270392 RDS. This makes the input → agent → evidence → review story visible without a multi-gigabyte transfer. Give the recording its own experiment/account so illustrative decisions do not alter shared research. The [upload walkthrough](demo.md#start-the-video-with-an-h5ad-upload) lists the exact field selections. The complete public uploaded-data workflow passed on **2026-10-26 at 00:50:59 UTC**; [open the accepted rehearsal and its receipts](demo.md#start-the-video-with-an-h5ad-upload).

The existing prepared soybean-root experiment remains a verified alternate walkthrough:

1. Open the root demo and ask the agent to annotate the groups. Inspect the actual returned annotation card and expand **Reference, method and validation** to show Zetaris provenance.
2. Select one group and ask what supports its candidate and what remains uncertain. Show the measured markers, alternative candidates and source rows. Cluster 6 is a straightforward Root hair example; inspect the actual result before choosing it for recording.
3. Save an explicit review with a short rationale. Label it as the presenter's demonstration decision. The candidate calculation must remain unchanged.
4. In a later turn, ask what was decided for that exact group and why. Show the H-MEM recalled-decision receipt and follow its source. A browser reload alone does not prove memory retrieval; capture the actual receipt. Use the existing automated journey to demonstrate recall beyond recent context separately.
5. Correct that same review and ask again. Confirm the current recall reflects the correction, the earlier answer remains historical and another group's decision remains unaffected.

**The combined public rehearsal passed on 2026-10-25.** The [ready demo](demo.md#open-the-ready-demo) contains actual annotation, a measured-marker dot plot, an illustrative saved review, H-MEM recall and its correction in one experiment. Annotation run `af2c9005-6be1-4f7c-baf4-dede8d06155c` retains Zetaris query `f7fbb611-05df-4f96-83c8-efe2e60e8d32`; recall turns `65facd5a-7116-4c72-8115-fa09d923913c` and `caf0379c-ae9f-4631-9af3-bc77bc6be142` retain the original and corrected review sources. Repeating preparation reused those exact records without additional inference or review writes. Numerical evidence and the earlier answer's receipt remained unchanged. Separate memory regression checks cover older-context and distinct-group behavior; this combined rehearsal covers one annotation group.

The prepared history is available for walkthroughs now. The four-slide deck is prepared. The actual 1–4 minute recording remains outstanding; rehearse any new live prompts before recording.

## Upload video script — target 3:00

Follow one concrete task: **find root-hair candidates in soybean gene-activity data and retain the evidence for the decision.** Use one newly uploaded experiment throughout. The agent assesses candidates and explains uncertainty; the researcher can accept or revise its interpretation.

| Time      | Show                                                                                                                                                              | Narration                                                                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:25 | **Add dataset**, the 29 MB H5AD and actual upload progress. Small caption: **Published soybean data · converted to H5AD**.                                        | “We have gene-activity data from 7,496 soybean root nuclei. We want to find which groups could be root-hair cells. Start by adding the dataset.”                                                                                 |
| 0:25–0:45 | Confirm the count matrix, gene IDs, groups and UMAP; open the imported cell map. Label a processing cut if used.                                                  | “Celloras checks the file and shows its cell map. Each dot is a nucleus. This file already contains the groups and coordinates; its raw counts are used for the analysis.”                                                       |
| 0:45–1:15 | Send the annotation request. Show the real annotation card, then select **Root hair · Group 6**, highlighting 388 nuclei.                                         | “The agent evaluates the groups against published markers and proposes cell types. Here, Root hair is the candidate. It also identifies groups where the evidence is ambiguous or insufficient.”                                 |
| 1:15–1:50 | Group 6's measured gene evidence, source rows and **Marker reference retrieved through Zetaris** receipt.                                                         | “Two measured marker genes support this candidate. We can inspect the expression and open the published sources. Zetaris supplies the versioned marker reference, and the result records exactly which reference was retrieved.” |
| 1:50–2:15 | Show the **Accepted · Root hair** review for group 6 and its **Illustrative demo review: keep Root hair provisional** note. Keep the computed suggestion visible. | “The agent makes an evidence-based assessment. Here, the researcher accepts Root hair provisionally and records that independent evidence is still needed. That review stays separate from the computed result.”                 |
| 2:15–2:45 | Send **Ask about my saved decision**; show the actual response and expand its **Meterless H-MEM** receipt.                                                        | “Later, we ask what we decided and why. Meterless H-MEM retrieves that saved review and links back to it. The agent can continue from the recorded decision instead of making us explain it again.”                              |
| 2:45–3:00 | Return to the annotated map; show the app and GitHub branch links.                                                                                                | “From a dataset to a visual assessment, inspectable sources and a decision we can return to. Celloras starts with soybean single-cell research.”                                                                                 |

The short video demonstrates both required sponsors through visible working outputs: **Zetaris → the retrieved marker reference** and **Meterless H-MEM → the recalled review**. The agent's actual request/reply and annotation card show the product, rather than an architecture slide. Put the source map, data boundaries and implementation details in the technical deck.

### Upload recording gate

The public uploaded-data rehearsal **passed on 2026-10-26 at 00:50:59 UTC** in [Soybean H5AD · video demo](https://celloras.com/app/projects/fd21eefc-6a63-4c06-89fd-007ed138c77f): authenticated sample download → actual browser upload → ready imported map → real agent annotation → Zetaris query receipt → illustrative provisional accepted review → H-MEM recall receipt. The run returned 7 suggested, 1 ambiguous and 4 unresolved groups; group 6 contains 388 nuclei and a Root hair candidate supported by two measured genes. The saved annotation remained unchanged after review and recall. [Exact IDs and links](demo.md#start-the-video-with-an-h5ad-upload). The video itself is not yet recorded.

Show actual output from the same experiment. If transfer, import or model waiting is removed, caption the cut **Processing time shortened**; three minutes is the edited video duration, not a claimed processing time. For completed rehearsal footage, add **Earlier actual run**. Do not claim the demonstration review is independent validation. For another live rehearsal, investigate any failed step before recording. The already verified prepared-run script below remains an alternate walkthrough of the existing published dataset; it has an unresolved corrected review, unlike the new upload experiment's accepted provisional review.

## Simple video script — target 2:40

Tell one story: **Which soybean cells are root-hair candidates, what evidence supports that, and what did the researcher decide?** Follow group 6, the Root hair candidate, throughout. The viewer should understand the result before hearing the implementation details.

| Time      | Show                                                                                                                                                                                     | Narration                                                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:20 | The soybean root cell map, already open. Caption: **Finding soybean root-hair cells**                                                                                                    | “Root-hair cells help soybeans absorb water and nutrients. Our demo uses gene-activity data from 7,496 soybean nuclei. Can we find the root-hair cells? Let’s follow one group and inspect the evidence.”                                  |
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

The editable PowerPoint and PDF use four slides: the agent and its visual output, a without/with comparison, the agent’s tools and sponsor roles, and an actual sourced decision-recall answer. The deck guide maps the content to the official 100-point rubric.

Avoid unsupported claims of classification accuracy, full-atlas federation or “weeks to seconds.” Current annotation is exploratory; same-study agreement is not independent validation. Keep this boundary concise in the presentation and link [methods](annotation-method.md) for detail.
