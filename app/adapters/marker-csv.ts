import {
  markerImportLimits,
  type ImportedMarkerGroup,
  type MarkerColumns,
} from "../core/marker-import";

/** UTF-8 CSV adapter shared by the preview and authoritative server import. */
export function readMarkerCsv(text: string): {
  headers: string[];
  rows: string[][];
} {
  if (new TextEncoder().encode(text).length > markerImportLimits.bytes)
    throw new Error(
      "Choose a CSV smaller than 256 KiB. Full expression matrices are not supported here.",
    );
  if (!text.trim() || /\0|[\uD800-\uDFFF]/u.test(text))
    throw new Error("Choose a valid UTF-8 CSV file.");
  const source = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    endedQuote = false;
  const finishField = () => {
    row.push(field);
    field = "";
    endedQuote = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value.trim())) records.push(row);
    row = [];
    if (records.length > markerImportLimits.rows + 1)
      throw new Error("Use at most 4,000 data rows per upload.");
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          endedQuote = true;
        }
      } else field += char;
    } else if (char === ",") finishField();
    else if (char === "\n" || char === "\r") {
      finishRow();
      if (char === "\r" && source[i + 1] === "\n") i++;
    } else if (char === '"' && !field && !endedQuote) quoted = true;
    else {
      if (endedQuote || char === '"')
        throw new Error(
          "A CSV quote is misplaced. Export the file as CSV UTF-8 and try again.",
        );
      field += char;
    }
    if (field.length > 10000 || row.length > 50)
      throw new Error(
        "This file has unusually large cells or too many columns. Upload a marker table.",
      );
  }
  if (quoted) throw new Error("A CSV quote is not closed.");
  if (field || row.length || endedQuote) finishRow();
  const headers = records.shift()?.map((value) => value.trim()) ?? [];
  if (
    headers.length < 2 ||
    headers.length > 50 ||
    headers.some((h) => !h || h.length > 120) ||
    new Set(headers).size !== headers.length
  )
    throw new Error(
      "Use a header row with distinct, nonempty column names, including a group and a gene column.",
    );
  if (!records.length)
    throw new Error("The file has headers but no marker rows.");
  const bad = records.findIndex((r) => r.length !== headers.length);
  if (bad >= 0)
    throw new Error(
      `Data row ${bad + 1} does not match the header's ${headers.length} columns.`,
    );
  return { headers, rows: records };
}

export function groupMarkerCsv(
  table: ReturnType<typeof readMarkerCsv>,
  columns: MarkerColumns,
): ImportedMarkerGroup[] {
  const groupIndex = table.headers.indexOf(columns.group),
    geneIndex = table.headers.indexOf(columns.gene);
  if (groupIndex < 0 || geneIndex < 0 || groupIndex === geneIndex)
    throw new Error("Choose different group and gene columns from this file.");
  const groups = new Map<string, ImportedMarkerGroup>();
  for (const [index, row] of table.rows.entries()) {
    const label = row[groupIndex].trim(),
      gene = row[geneIndex].trim();
    if (!label || label.length > 120)
      throw new Error(
        `Data row ${index + 1} needs a group name of 1–120 characters.`,
      );
    if (!gene || gene.length > 100 || /[\s,;]/u.test(gene))
      throw new Error(
        `Data row ${index + 1} needs one gene identifier, without spaces or separators.`,
      );
    let group = groups.get(label);
    if (!group) {
      group = { label, genes: [], rows: 0 };
      groups.set(label, group);
      if (groups.size > markerImportLimits.groups)
        throw new Error("Upload at most 20 cell groups at a time.");
    }
    group.rows++;
    if (!group.genes.includes(gene)) group.genes.push(gene);
    if (group.genes.length > markerImportLimits.genesPerGroup)
      throw new Error(
        `Group ${label} has more than 200 distinct genes. Export a focused marker list.`,
      );
  }
  return [...groups.values()];
}
