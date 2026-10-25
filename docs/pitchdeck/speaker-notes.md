# Celloras — speaker notes and sources

## Slide 1

Celloras helps plant researchers investigate cell identity in a conversation. The map is an actual output from the soybean-root demonstration. Every suggested name can be investigated, and the researcher keeps the final decision.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/

## Slide 2

The difficulty is not generating a label. Researchers compare gene expression, consult compatible references, and keep track of why they accepted or rejected an interpretation. Celloras brings those steps together. No time-saving or accuracy benchmark is claimed.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/

## Slide 3

The agent chooses analysis tools and returns interactive elements in the conversation. The screenshot is from the actual public application. Candidate results and researcher reviews are stored separately. Later conversations can retrieve the review through H-MEM.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/tree/celloras.com
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 4

This is GSE270392, a published soybean root single-nucleus RNA dataset. The original coordinates and groups are retained; Celloras overlays its exploratory marker-based suggestions. Gray groups remain unresolved. Source group IDs are not biological labels.

Sources and provenance:

- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## Slide 5

Root hair is the computed candidate for group 6. Glyma.01G224900 and Glyma.17G030700 meet the supporting-marker thresholds. The plot is measured expression, not a generated illustration. Zetaris supplies the 42 associations across 41 genes in the versioned root reference; it is one published panel, not full-atlas federation. Query receipt f7fbb611-05df-4f96-83c8-efe2e60e8d32 is retained on annotation af2c9005-6be1-4f7c-baf4-dede8d06155c. The same-study panel is exploratory and is not independent biological validation.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 6

This actual recall is from the combined public demo. The researcher changed the demonstration review to unresolved pending independent evidence; the calculated Root hair candidate stayed unchanged. H-MEM retrieves the current review and cites its source. The official pinned Meterless reference implementation is used with project-owned PostgreSQL persistence. Separate regression checks test retrieval beyond recent context and isolation between groups.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 7

The web app authenticates researchers and enforces ownership. The server-side agent invokes scientific tools, while the Zetaris adapter retrieves a verified marker reference. Only explicit researcher reviews enter decision memory. H-MEM uses the official Meterless engine with owned state in PostgreSQL and returns a sourced recall. NVIDIA OpenShell runs the CLI agent. Model, reference and memory interfaces provide extension points; not every possible provider is deployed.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/tree/celloras.com
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/architecture.md

## Slide 8

Seven groups received a provisional suggestion, one was ambiguous and four stayed unresolved. These are outcome counts, not accuracy metrics. The independent base-R arithmetic check passed 2,952 numerical comparisons at tolerance 1e-10. It validates the computation, not the biological identity. The combined public sponsor rehearsal passed on 25 October 2026 and included correction-aware recall. No independent classifier accuracy is claimed.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 9

These are next steps, not completed capabilities. We start with one working soybean workflow, then validate independently, support researchers’ own compatible datasets, and add plants through explicit reference and species adapters. Try the current application at celloras.com. The application code is on the celloras.com branch of the public repository.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/tree/celloras.com
- https://celloras.com
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## Slide 10

Design references are the real original Airbnb and Buffer decks, inspected through published copies. Their narrative structure and economy influenced this deck; their assets, market claims and business metrics were not reused. Screenshots and scientific plots are from actual Celloras runs, captured on 25 October 2026. Full source links are provided on their corresponding slides.

Sources and provenance:

- https://github.com/mpckkk/2026_GenAI/tree/celloras.com
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://www.startups.com/articles/airbnb-pitch-deck-teardown-and-redesign
- https://buffer.com/resources/from-0-to-1000000-users-the-journey-and-statistics-of-buffer/
