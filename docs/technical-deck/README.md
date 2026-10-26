# Celloras technical companion

A separate nine-slide explanation of the implementation, alongside the [four-slide pitch](../pitchdeck/README.md).

- [Presentation PDF](Celloras-Technical-Deck.pdf)
- [Editable PowerPoint](Celloras-Technical-Deck.pptx)
- [Speaker notes and sources](speaker-notes.md)

The deck covers the agent/tool boundary, a real conversation with the annotation card, data sources, Zetaris SQL retrieval, numerical annotation, Meterless H-MEM, storage and ownership, evidence against the supplied judging criteria, and remaining work.

The architecture diagrams, text and two tables are editable. Product screenshots and measured plots are embedded images from the real demo. The conversation screenshot was captured from public agent turn `7d65780e-45ae-42c3-9ee3-0f2b112d767a` on 26 October 2026. It displays the previously computed annotation rather than claiming a new analysis.

This is an implementation snapshot, not the video or the short pitch. H5AD support is marked in progress until the complete uploaded-file workflow passes. The selected input is a transparent H5AD conversion of the verified GSE270392 root counts. The native SOTA H5AD uses logged values and SoyZH13 gene IDs and is unsuitable for the current Wm82v4 raw-count workflow.

Rubric values are the supplied weights (Demo 15, Product & UX 10, Sponsor Tech 10), not scores awarded to Celloras. Zetaris and a Meterless Engine are the required sponsor pair. NVIDIA OpenShell is also used; Cursor usage is not claimed.

Validation: structural/package checks, Inter font policy, native tables on slides 7–8, first-party re-import, and rendered-slide review. PDF export also receives page-by-page visual inspection.
