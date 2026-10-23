# Landing page assets

## Botanical hero

- File: `public/images/soybean-root-editorial-v1.webp`
- Generated on: 2026-10-23 with the built-in `image_gen` tool.
- Dimensions: 1122 × 1402 pixels; 181,224 bytes.
- SHA-256: `1c8e59834ae22983217296e721964ad85f8f61caec08ea70002ddc12ccdc2492`.
- The original generated PNG is retained in the image-generation output store. Its SHA-256 is `b9579c1aeb3146982634944cc2a451e047d64d83d9dfe886160366e4306346cc`.
- Delivery conversion: Sharp WebP, quality 90, effort 6. No resizing, cropping, compositing or retouching.
- Suggested alt text: “Illustrative soybean plant with green leaves and branching roots.”
- This is AI-generated botanical editorial art. It is not a photograph of the study specimen, a scientific figure, or evidence for any cell identity. The existing Celloras logo is unchanged.

Exact generation prompt:

```text
Use case: ads-marketing
Asset type: polished editorial botanical image for the right-hand hero of Celloras, a plant single-cell research web app.
Primary request: one beautiful, botanically plausible young soybean plant (Glycine max), shown whole from vivid green leaves down to delicate exposed roots, on a clean pale warm-white studio background. This is a conceptual botanical editorial image, not a scientific figure or specimen record.
Subject: a young soybean seedling with several characteristic broad oval trifoliate leaflets, subtly veined surfaces, natural imperfect edges, slender green stems, a branching pale tan root system with fine lateral roots. A few small specks of earth may cling to roots; no pot, no hands, no apparatus. Keep roots visible and naturally irregular rather than diagrammatic.
Style/medium: refined high-end editorial botanical photography, tactile natural detail, quiet museum specimen sensibility, believable organic form. Soft daylight from upper left, gentle shadows, subtle warm paper-toned background without obvious texture or gradients. Fresh saturated forest and leaf greens, restrained warm neutral roots.
Composition/framing: portrait image approximately 4:5. The plant is gracefully asymmetric, centered, filling roughly 85 percent of the image height with comfortable empty margins. Leaves fill the upper half, roots the lower half. The entire plant is inside the frame. Designed to sit beside large black headline text on a white website, no typography in the image.
Constraints: no text, no labels, no charts, no microscopy, no cell shapes, no molecular graphics, no grids, no glowing effects, no neon, no decorative UI, no watermark, no logo. No invented biological findings or annotated anatomy.
```

## Source-data UMAP preview

The landing page's UMAP preview is derived from the real public soybean-root dataset, independently of the generated botanical artwork.

- Delivery file: `public/images/soybean-root-umap.json`.
- Dataset: `gse270392-root-rna-v1`; GEO accession [GSE270392](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE270392).
- Study: [A spatially resolved multiomic single-cell atlas of soybean development](https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/).
- Source artifact: `.artifacts/scientific-data/gse270392-root-rna-v1/embedding.json`.
- Source embedding SHA-256: `6ae97d470aff45ee4cb4145d878322b7f2beda2610ab5de32e98acf0b7499e9c`.
- All 7,496 source nuclei and all 12 source clusters are retained. Source UMAP coordinates are rounded to six decimal places; cell identifiers are omitted. The projection is not recomputed or sampled.
- Colors and interactive highlighting distinguish source clusters, not validated biological cell identities. The preview must not imply an annotation result.

For the dataset import, expression transformations, limitations and artifact verification, see [dataset-import.md](dataset-import.md).
