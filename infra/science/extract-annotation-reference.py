"""Read pinned publisher XLSX bytes using only Python's standard library.

This is an import-time tool; the application uses the generated factual JSON.
The two tables have separate, explicit purposes: literature markers are the
ranking reference; published labels are a retrospective benchmark only.
"""

import collections
import csv
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def rows(filename):
    with zipfile.ZipFile(filename) as archive:
        strings = ["".join(t.itertext()) for t in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        with archive.open("xl/worksheets/sheet1.xml") as source:
            for _, element in ET.iterparse(source, events=["end"]):
                if element.tag != "{" + NS["x"] + "}row":
                    continue
                values = {}
                for cell in element.findall("x:c", NS):
                    value = cell.find("x:v", NS)
                    if value is not None:
                        values[re.sub(r"\d+", "", cell.attrib["r"])] = (
                            strings[int(value.text)] if cell.get("t") == "s" else value.text
                        )
                yield int(element.attrib["r"]), values
                element.clear()


def label(value):
    # Display normalization only. Gene identifiers are never rewritten.
    return value.replace("_", " ")


def marker_table(filename):
    markers, corroboration = [], []
    for row, values in rows(filename):
        if row == 1:
            assert values["A"].startswith("Table S2."), "Wrong source table"
        if row == 3:
            assert values["A"] == "geneID" and values["H"] == "Root"
            assert values["S"] == "Gene ID" and values["Z"] == "Tissue"
        if row > 3 and values.get("H") not in (None, "NA", ""):
            gene = values["A"]
            assert re.fullmatch(r"Glyma\.\d{2}G\d{6}", gene), "Malformed source gene"
            markers.append({
                "row": row, "geneId": gene, "cellType": label(values["H"]),
                "sourceLabel": values["H"], "expectedCellType": values["B"],
                "markerName": values["C"], "sourceSpecies": values["O"],
                "orthologyType": None if values.get("P") in (None, "NA") else values["P"],
                "orthologId": values.get("Q"), "originalReference": values["R"],
            })
        if values.get("Z") == "Root":
            assert re.fullmatch(r"Glyma\.\d{2}G\d{6}", values["S"])
            corroboration.append({
                "row": row, "geneId": values["S"], "cellType": label(values["Y"]),
                "averageLog2FC": float(values["T"]),
                "detectionFraction": float(values["U"]),
                "otherDetectionFraction": float(values["V"]),
                "adjustedPValue": float(values["X"]),
            })
    assert len(markers) == 42 and len({r["geneId"] for r in markers}) == 41
    assert len({r["cellType"] for r in markers}) == 9 and len(corroboration) == 330
    return {"records": markers, "corroboration": corroboration}


def benchmark(filename, cells_csv):
    with open(cells_csv) as source:
        dataset_cells = {row[""]: row["seurat_clusters"] for row in csv.DictReader(source)}
    observed, cluster_counts = {}, collections.defaultdict(collections.Counter)
    for row, values in rows(filename):
        if row == 1:
            assert values["A"].startswith("Table S1."), "Wrong metadata table"
        if row == 3:
            assert values["S"] == "cellID" and values["AC"] == "Celltype"
        if values.get("T") == "Root":
            cell_id, cluster = values["S"], values["Z"]
            assert cell_id not in observed, "Duplicate source barcode"
            assert dataset_cells.get(cell_id) == cluster, "Source and dataset cluster mismatch"
            observed[cell_id] = cluster
            cluster_counts[cluster][label(values["AC"])] += 1
    assert observed == dataset_cells and len(observed) == 7496
    assert len(cluster_counts) == 12 and all(len(v) == 1 for v in cluster_counts.values())
    return {"matchedCellCount": len(observed), "cellMembershipSha256": hashlib.sha256(
        json.dumps(sorted(observed.items()), separators=(",", ":")).encode()).hexdigest(),
        "clusters": [{"cluster": cluster, "nCells": sum(counts.values()),
            "publishedLabel": next(iter(counts))} for cluster, counts in sorted(cluster_counts.items())]}


if sys.argv[1] == "markers" and len(sys.argv) == 3:
    print(json.dumps(marker_table(sys.argv[2])))
elif sys.argv[1] == "benchmark" and len(sys.argv) == 4:
    print(json.dumps(benchmark(sys.argv[2], sys.argv[3])))
else:
    raise ValueError("Usage: extract-annotation-reference.py markers XLSX | benchmark XLSX CELLS_CSV")
