# Soybean marker evidence reference

Celloras can retrieve published gene-to-cell-type associations for soybean roots and mature nodules. This is an exact-match evidence aid. It does not assign calibrated probabilities, perform matrix analysis or establish annotation accuracy.

## Source and scope

[Cervantes-Pérez et al., _Plant Communications_ (2024), DOI 10.1016/j.xplc.2024.100984](https://doi.org/10.1016/j.xplc.2024.100984) reports marker genes used for Molecular Cartography cell-type annotation. The reference extracts factual associations from the Methods paragraphs for [root](https://pmc.ncbi.nlm.nih.gov/articles/PMC11369782/#p0230) and [nodule](https://pmc.ncbi.nlm.nih.gov/articles/PMC11369782/#p0235). Each result retains the paragraph URL, source label, gene ID, tissue and source sample stage.

- 62 associations, 45 distinct gene IDs, six cell-type labels per tissue.
- Root samples: 6-day-old Williams 82 roots. Nodule samples: 28 days after inoculation.
- Transcriptome reference reported in the Methods: **Glycine_max_v2.1.52**, Ensembl Plants release 52. The article separately mentions another build for proteomics; that is not the transcriptome build used here.
- Identifier namespace: **Glyma**, case-sensitive gene IDs such as `Glyma.16G106800`.
- Extraction version: `2024.100984-mc-v1`. Each run records the reference's canonical JSON SHA-256 and downloaded source HTML SHA-256.
- Source article identifies its license as CC BY-NC-ND 4.0. This repository stores factual associations and attribution, not the article text, figures or supplementary workbook. It does not claim ownership of the source or a broader license for it.

The source's `CYP93A1` and `G4DT` symbols have no explicit gene-ID mappings in these paragraphs and are excluded. The source prints `Glyma.15G2100100`, which does not match its gene-ID format; it is recorded as an exclusion and never silently corrected. Bacterial probe IDs are outside this soybean reference. Source-specific labels are retained; display labels normalize grammatical terms such as “endodermal” to “Endodermis.” No cell ontology or cross-species mapping is inferred.

The Zhang et al. Soybean Multi-Omic Atlas remains a candidate for broader coverage. Its Table S2 download was blocked by a browser challenge during this implementation. Downloadable GEO raw cell-state counts were inspected but were not relabeled as marker evidence or ingested. **This reference is not the complete soybean-atlas.com database.**

## Matching and unresolved cases

The source adapter requires the marker set's saved species, tissue, genome/annotation version and identifier namespace. Metadata comparisons ignore surrounding whitespace and case; gene IDs match exactly. Supported tissue values are `Root` and `Nodule`. No build, orthology, alias or transcript-to-gene conversion occurs.

Missing metadata produces `context_required`. An unsupported species/tissue/build/namespace produces `incompatible`. Both skip matching and show the needed context. A complete compatible query with no supported matches produces `no_matches`. Unsupported identifier strings are listed separately from valid-format identifiers absent from the selected tissue reference.

For compatible queries, a candidate appears when at least one submitted gene exactly matches an association for that tissue. Candidates are alphabetical. Distinct-gene counts are overlap counts, never confidence, statistical significance or a ranked prediction. The same gene may support multiple candidates; shared genes and competing candidates remain visible. Missing reference hits do not imply biological absence. Developmental stage, cultivar, treatment, cell state, doublets and dropout still need researcher assessment. A researcher can save a provisional candidate, keep the cell type unresolved or reject the evidence.

## Reproduce the factual extraction

Save the primary article's HTML locally. The importer reads only the named Methods paragraphs and fails if their expected layout, transcriptome version or record counts change:

```sh
python3 scripts/import-soybean-reference.py path/to/root-nodule-paper.html
npx prettier --write data/references/soybean-root-nodule-2024.json
```

Review all changed facts, exclusions and source hashes before changing the published reference version. The source asset is bundled in the worker/app images; querying a saved marker set does not send it to a reference website. A broken reference raises an explicit service error, with no substitute source or fabricated result.

## Example for the live workflow

Use these values only for a dataset that actually has matching metadata; do not relabel another build to make the lookup run.

1. Save a soybean sample with tissue `Root`, genome version `Glycine_max_v2.1.52`, namespace `Glyma`.
2. Save a marker set attached to it: `Glyma.14G218700 Glyma.16G106800 Glyma.01G000100`.
3. Ask: “Look up published marker evidence for this saved marker set.”
4. The expected reference associations are two Endodermis genes; `Glyma.01G000100` is not in the limited root marker list. Inspect the source links and explicitly save your review.

For nodule, `Glyma.13G334500` is shared by the source's sclereid-layer and vascular-bundle lists. It must remain ambiguous. These are source-consistency acceptance examples, **not an independent benchmark or evidence of classification accuracy**. Expert-reviewed examples or a held-out dataset are still required before claiming validated annotation performance.
