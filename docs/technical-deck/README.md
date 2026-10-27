# Celloras engineering deck

A ten-slide implementation walkthrough.

- [Presentation PDF](Celloras-Technical-Deck.pdf)
- [Editable PowerPoint](Celloras-Technical-Deck.pptx)
- [Interactive HTML flowchart](https://celloras.com/technical-flow.html) · [Editable source](../../public/technical-flow.html)
- [Earlier image version](Celloras-Technical-Flow.png) · [Diagram scope and notes](flowchart-notes.md)

The deck covers deployment topology, the agent runtime interface, turn execution and typed output, H5AD upload states, data ownership, numerical annotation, Zetaris SQL retrieval, Meterless H-MEM persistence, recovery, and measured scaling limits. Diagrams, protocol examples and four tables remain editable.

After this deck's export, release `8e841af` added [native activity tracing](../../README.md#see-what-the-agent-did): append-only PostgreSQL events around the runtime/tool boundaries, an owned dashboard and inspectable sponsor receipts. [Open the fresh demo traces](https://celloras.com/app/activity?projectId=7bdae43c-5cd2-4203-a571-e73b445985db). The deck's statement about pending OpenTelemetry/exporter integration still applies; the new native dashboard does not use that exporter.

The agent runtime boundary supports CLI and HTTP adapters. OpenShell/Codex is the verified implementation. Nightshift implements the same broker protocol through HTTP but still needs live acceptance. Official OpenAI/Anthropic APIs, OpenRouter, Vercel routing and other CLIs are extension targets. A new adapter must implement the runtime contract and join the server-side selector; the deck does not claim those integrations already work.

The source-backed workflow passed on 26 October 2026: an owned H5AD upload, agent annotation, real Zetaris reference retrieval, a saved review and Meterless H-MEM recall. [Open the verified experiment](https://celloras.com/app/projects/fd21eefc-6a63-4c06-89fd-007ed138c77f) or inspect the [acceptance receipt](../evidence/h5ad-public-2026-10-26.json). The sample is a lossless conversion of published GSE270392 root counts. It preserves existing groups and UMAP. No raw FASTQ processing or independent biological accuracy benchmark is claimed.

The engineering limits are explicit: one pinned Zetaris reference table, H-MEM over explicit reviews, a single deployment host with local volumes, and a 4 GiB upload ceiling that has not been load-tested. The deck separates configuration limits from measured evidence.
