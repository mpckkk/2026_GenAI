# Celloras — speaker notes and sources

Present slides 1–8. Keep slides 9–10 for questions.

## Slide 1

Celloras makes plant cell annotation a conversation. A researcher asks the agent to analyze the groups, inspect their marker genes and explain the evidence. The dots shown here are all 7,496 nuclei in the soybean-root demo, using the original UMAP coordinates and a single color without identity labels.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/

## Slide 2

Knowing which cells are present is a step toward interpreting a plant experiment. The evidence comes from measured expression, compatible marker references, papers and earlier reviews. Researchers have to connect those pieces for each interpretation. We are automating the execution and evidence handling; the researcher keeps the scientific judgment. No time-savings benchmark is claimed.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/

## Slide 3

This is an actual Celloras annotation output, not a product mockup. The complete soybean root dataset contains 7,496 nuclei in 12 source groups. Seven receive exploratory suggestions, one is ambiguous and four remain unresolved. Click any group to inspect the evidence. These counts are not an accuracy score.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## Slide 4

Follow one group. Root hair is its candidate because two marker genes meet the exploratory support rules. The plot shows their actual measured expression across all source groups. The arrow points to group 6. A candidate is a starting point for review; independent evidence still matters.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 5

Zetaris has a working role in the annotation: the application retrieves the published root marker panel through a read-only query, checks all 42 associations against the expected reference content and saves the query receipt with the result. This slide includes the actual retrieval line from the saved annotation. The current integration serves one versioned marker panel, not full-atlas federation.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 6

The researcher corrected the demonstration review: keep group 6 unresolved until independent evidence is checked. The computed Root hair candidate did not change. In a later turn, Meterless H-MEM retrieves the current saved review, its reason and its source. The screenshot is an actual recall receipt from this workflow. Correction-aware retrieval and project isolation have separate regression checks.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md

## Slide 7

The web application authenticates the researcher and enforces ownership. The server-side OpenShell/Codex agent selects and runs real scientific tools. Zetaris supplies the verified marker reference. Explicit researcher reviews become project-owned memory in the official Meterless H-MEM engine, persisted in PostgreSQL. Later requests retrieve those reviews with source links. Provider interfaces keep these responsibilities separate.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/tree/celloras.com
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md

## Slide 8

The goal is to reduce the repeated work of assembling evidence and reconstructing decisions. The current working demo starts with soybean. Independent biological validation and support for researchers’ own compatible datasets are the next milestone, with other plants added through species and reference interfaces. These are next steps, not claims of completed features. Try the working workflow at celloras.com.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://github.com/mpckkk/2026_GenAI/tree/celloras.com

## Slide 9

Appendix. The independent base-R arithmetic check passed 2,952 values at tolerance 1e-10, with maximum absolute error 2.9004576518332215e-15. This is implementation agreement, not biological accuracy. The combined public workflow rehearsal passed on 25 October 2026 and retained actual Zetaris and H-MEM receipts. The same-study panel needs independent biological validation.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 10

Detailed source links and narration accompany every slide. Product images are actual Celloras outputs and source receipts. The opening point cloud is replotted from all 7,496 nuclei without changing their original coordinates or applying identity labels. Design references: Front’s original 2016 Series A deck, published by its founders, plus the previously inspected Airbnb and Buffer decks. Their assets and business metrics are not reused.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/tree/celloras.com
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://front.com/blog/inside-fronts-series-a-slide-deck
