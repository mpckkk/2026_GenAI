# Curated literature retrieval

Celloras has an explicitly selected local lexical backend for a small, reviewed public corpus. It does not call an embedding model, claim full-paper search, or infer a cell identity from a retrieved paragraph. Private experiment data is not stored in this corpus.

The provider-neutral `LiteratureSearch` interface lives in `app/core/literature.ts`. `CuratedLiterature` implements `health()` and `search({query, speciesId, tissue, genomeVersion, genes?, limit?})`. The caller owns experiment authorization and persists the result snapshot. The backend returns a corpus version/hash, stable passage IDs, exact source links, source-byte and evidence hashes, coverage, methods, context compatibility, and explicit exclusions.

| Source                                                                                             | Imported coverage                                                                                     | Deliberate limit                                                                         |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Zhang et al., Cell](https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/)                           | Three reviewed atlas coverage, RNA processing and annotation paragraphs                               | Table S2 has not been imported. No v4 marker association is asserted.                    |
| [Cervantes-Pérez et al., Plant Communications](https://pmc.ncbi.nlm.nih.gov/articles/PMC11369782/) | Build and validation context; 62 gene/tissue/label associations rechecked against Methods p0230/p0235 | A limited marker list for Glycine_max_v2.1.52, not a complete atlas or a classifier.     |
| [Haghani et al., Journal of Experimental Botany](https://doi.org/10.1093/jxb/erag218)              | A factual roadmap summary from the publisher-deposited Crossref abstract                              | Full guide and tables are not ingested. The publisher HTML rejected automated retrieval. |

There are 68 passages across three sources. Generated factual summaries are separate from `applicability`, which states Celloras interpretation rules and limits. Raw article text stays in ignored `.artifacts/literature`. The tracked corpus contains no complete article, private data, credentials or generated annotation.

## Importing actual sources

Use Node 22, curl and the installed repository dependencies from the repository root:

```sh
node scripts/import-literature.mjs
```

This downloads the exact public URLs declared in `data/literature/curation.json`, verifies source identity and reviewed paragraph anchors, checks every marker association against its original paragraph, hashes source bytes and normalized evidence text, then atomically replaces `data/literature/soybean-v1.json`. Source checks fail if the page contains a bot challenge, DOI/title changes, an anchor disappears or an association cannot be found. There is no automatic cache fallback. Downloaded HTML may contain changing site metadata; its byte hash can change while paragraph hashes remain stable.

Previously downloaded real source files can be explicitly revalidated with:

```sh
node scripts/import-literature.mjs --source-dir .artifacts/literature
```

The input directory must contain `atlas.html`, `markers.html`, `guide-crossref.json` and `retrieval-receipts.json` from a successful fetch. Receipts preserve the actual retrieval date and verify each source hash during a later import. An import does not use a model to invent or update summaries. Changed source meaning requires review and a new corpus version.

## Search and compatibility

- Species and tissue filters are exact. General plant methodology is marked `general`, never treated as species-specific validation.
- Genome filtering excludes incompatible sources. `Wm82v4`, `Williams 82 v4`, `William 82 v4` and `Gmax_508_v4.0` are documented spellings for this atlas's assembly. No gene-ID mapping, liftover or orthology inference happens.
- A non-empty `genes` list restricts results to exact curated gene associations. General methods are not substituted when gene evidence is missing.
- Query words match curated titles, summaries and reviewed keywords. Results are ordered by matched words and requested genes, with a stable ID tie-break. This order is retrieval relevance, never biological confidence.
- `kind` separates marker associations, methods and study context. Neither relevance nor a method description establishes support or contradiction for a particular annotation.
- A missing hit means no match in this limited collection. It does not mean the gene lacks biological evidence. Automated contradiction classification is not implemented.
- NVIDIA embeddings/reranking and Zetaris can implement the same retrieval boundary after actual configuration and verification. Neither is silently selected or represented as connected here.

## Observed checks

The importer fetched all three real sources and verified all 62 associations on 2026-10-23. A real corpus retrieval check produced these results (full local report: ignored `.artifacts/literature/retrieval-checks.json`):

| Query context                                | Observed result                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Root, Wm82v4, annotation/marker evidence     | Atlas method/context passages plus general roadmap; v2 marker source explicitly excluded. |
| Root, Glycine_max_v2.1.52, Glyma.14G218700   | Exact endodermal marker association, linking to original Methods p0230.                   |
| Root, Wm82v4, the same gene                  | No gene association; incompatible v2 source reported.                                     |
| Root, Wm82v4, Glyma.01G000100                | No gene association; no invented result.                                                  |
| Arabidopsis, TAIR10, annotation workflow     | Only general roadmap context; no soybean association leaked across species.               |
| Nodule, Glycine_max_v2.1.52, Glyma.14G218700 | No association; the root-only record did not cross the tissue filter.                     |

These checks exercise downloaded sources, ingestion and actual retrieval. They do not prove model tool orchestration, UI rendering or an end-to-end researcher workflow; those require the integrated application checks.
