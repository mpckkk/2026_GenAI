# Marker CSV uploads

Open an experiment and choose **Upload markers**. Select a CSV UTF-8 export from Excel or your analysis tool, choose the cell-group and gene-ID columns, and confirm the actual tissue and genome/annotation version. Import the groups, then select **Find cell-type evidence** beside one group. The connected agent retrieves compatible published evidence and explains candidates, alternatives and missing information in the conversation.

## Format

Use a header row and one gene per row. Names can differ: the preview lets you map the two required columns.

```csv
cluster,gene,tissue,genome_version
Group A,Glyma.01G224900,root,Wm82v4
Group A,Glyma.20G032500,root,Wm82v4
```

Limits: 256 KiB of UTF-8 CSV, 4,000 data rows, 20 groups, 200 distinct genes per group and 50 columns. Quoted commas, embedded newlines, escaped quotes, CRLF and a UTF-8 BOM are supported. Repeated exact gene IDs count once per group; case and group names are preserved. Extra columns stay in the original file but do not influence this exact-gene comparison. A single consistent `tissue` or `genome_version` column can populate the context fields for confirmation. Mixed values leave those fields empty.

The included [soybean example](../public/examples/soybean-root-markers.csv) contains ten published markers across three illustrative groups. Each row names its Table S2 source row. It exercises the product with known reference inputs and is not a biological benchmark.

## References and interpretation

- Soybean root, `Wm82v4`, `Glyma`: atlas authors' Table S2 root literature panel, 41 distinct genes and nine cell-type labels, including orthology-derived associations. [Reference provenance](annotation-method.md).
- Soybean root/nodule, `Glycine_max_v2.1.52`, `Glyma`: the earlier published root/nodule reference. [Source scope](soybean-reference.md).

Unknown or incompatible metadata remains unresolved. No genome conversion, symbol guessing, confidence calibration or expression inference occurs. Marker overlap supports candidate identities for researcher review. A CSV of marker IDs does not contain enough information to compute a cell map or measure expression. XLSX, full expression matrices and multi-gigabyte browser uploads are outside this release; the imported public root dataset provides the separate numerical demonstration.

## Storage and execution

`POST /api/projects/:id/marker-imports` validates ownership, origin, limits, column mapping and context before the repository locks the owned project. One PostgreSQL transaction saves the immutable original UTF-8 CSV, SHA-256, context and all marker groups. Any failure rolls back the complete import. Repeating an identical submission ID returns its receipt; changed content returns HTTP 409. The browser retains that ID after an uncertain response rather than duplicating an import.

`GET` returns the latest 20 import receipts. `?download=:importId` returns the original CSV only to its owner. Raw originals remain in the small-file database store; the agent receives bounded saved marker records rather than the whole CSV. The upload's explicit group handle is resolved within the same owned experiment, even when it is older than the worker's recent-record window. The existing evidence tool rechecks ownership and saves the actual result before a card can render.

Migration `008_marker_imports.sql` is additive. Apply it before replacing the app and worker images. Rollback may retain the unused table and saved imports; do not delete researcher data. Model tool schemas and the OpenShell workload image are unchanged.
