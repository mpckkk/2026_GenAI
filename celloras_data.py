"""Source-backed discovery adapters for Celloras' plant single-cell atlas MVP.

GEO E-utilities provides searchable study metadata, not a guarantee that processed
expression matrices are available. Europe PMC provides publication metadata.
"""
from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

import requests
import streamlit as st

GEO_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
GEO_ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
HEADERS = {"User-Agent": "CellorasPlantAtlas/0.1 (public research discovery app)"}
TIMEOUT = (5, 25)

ASSAY_TERMS = {
    "Single-cell RNA-seq": '"single-cell" OR "single cell" OR scRNA-seq OR scRNAseq',
    "Single-nucleus RNA-seq": '"single-nucleus" OR "single nucleus" OR snRNA-seq OR snRNAseq',
    "Spatial transcriptomics": '"spatial transcriptomics" OR "spatial gene expression" OR Visium',
    "Single-cell ATAC-seq": '"single-cell ATAC" OR scATAC-seq OR "chromatin accessibility"',
    "Any plant single-cell / spatial study": '"single-cell" OR "single cell" OR "single-nucleus" OR "single nucleus" OR scRNA-seq OR snRNA-seq OR "spatial transcriptomics" OR Visium OR scATAC-seq',
}


def _clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        return ", ".join(str(x) for x in value if x is not None)
    return re.sub(r"\s+", " ", str(value)).strip()


def _safe_limit(limit: int, maximum: int = 50) -> int:
    return max(1, min(int(limit), maximum))


def _geo_url(accession: str) -> str:
    return f"https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc={quote(accession)}"


@st.cache_data(ttl=3600, show_spinner=False)
def search_geo(species: str, assay_label: str, limit: int = 25) -> list[dict[str, Any]]:
    """Search GEO DataSets/Series records and return source-linked metadata."""
    species = _clean(species)
    if not species:
        return []
    assay = ASSAY_TERMS.get(assay_label, ASSAY_TERMS["Any plant single-cell / spatial study"])
    # Keep organism and assay concepts separate so the selected assay can be swapped.
    term = f'"{species}"[Organism] AND ({assay})'
    response = requests.get(
        GEO_ESEARCH,
        params={"db": "gds", "term": term, "retmode": "json", "retmax": _safe_limit(limit)},
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    ids = response.json().get("esearchresult", {}).get("idlist", [])
    if not ids:
        return []
    summary_response = requests.get(
        GEO_ESUMMARY,
        params={"db": "gds", "id": ",".join(ids), "retmode": "json"},
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    summary_response.raise_for_status()
    result = summary_response.json().get("result", {})
    records: list[dict[str, Any]] = []
    for uid in result.get("uids", []):
        item = result.get(uid, {})
        accession = _clean(item.get("accession"))
        if not accession:
            continue
        records.append({
            "accession": accession,
            "title": _clean(item.get("title")) or "Untitled GEO record",
            "summary": _clean(item.get("summary")),
            "organism": _clean(item.get("taxon")),
            "samples": item.get("n_samples"),
            "study_type": _clean(item.get("gdstype")),
            "platform": _clean(item.get("gpl")),
            "source": "NCBI Gene Expression Omnibus (GEO)",
            "url": _geo_url(accession),
            "data_status": "Study metadata found; processed matrix/file availability not yet verified",
        })
    return records


@st.cache_data(ttl=3600, show_spinner=False)
def search_papers(query: str, limit: int = 20) -> list[dict[str, Any]]:
    """Search Europe PMC for publications; returned records remain source-linked."""
    query = _clean(query)
    if not query:
        return []
    response = requests.get(
        EUROPE_PMC_SEARCH,
        params={"query": query, "format": "json", "resultType": "core", "pageSize": _safe_limit(limit)},
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    results = response.json().get("resultList", {}).get("result", [])
    papers: list[dict[str, Any]] = []
    for item in results:
        doi = _clean(item.get("doi"))
        pmid = _clean(item.get("pmid"))
        pmcid = _clean(item.get("pmcid"))
        url = f"https://doi.org/{quote(doi)}" if doi else (
            f"https://pubmed.ncbi.nlm.nih.gov/{quote(pmid)}/" if pmid else
            f"https://europepmc.org/article/PMC/{quote(pmcid)}" if pmcid else
            "https://europepmc.org/"
        )
        papers.append({
            "title": _clean(item.get("title")) or "Untitled publication",
            "authors": _clean(item.get("authorString")),
            "year": _clean(item.get("pubYear")),
            "journal": _clean(item.get("journalTitle")),
            "doi": doi,
            "pmid": pmid,
            "pmcid": pmcid,
            "abstract": _clean(item.get("abstractText")),
            "source": "Europe PMC",
            "url": url,
        })
    return papers



NCBI_GENE_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
NCBI_GENE_ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"


def _ncbi_term_safe(value: str) -> str:
    """Normalize user input before embedding it in an Entrez query phrase."""
    value = _clean(value)
    return value.replace('"', " ").strip()


@st.cache_data(ttl=3600, show_spinner=False)
def search_gene_records(gene_query: str, species: str, limit: int = 20) -> list[dict[str, Any]]:
    """Search NCBI Gene and return source-linked annotation records.

    These are gene annotation records, not gene-expression measurements.
    """
    gene_query = _ncbi_term_safe(gene_query)
    species = _ncbi_term_safe(species)
    if not gene_query or not species:
        return []

    term = f'("{gene_query}"[Gene Name] OR "{gene_query}"[All Fields]) AND "{species}"[Organism]'
    response = requests.get(
        NCBI_GENE_ESEARCH,
        params={"db": "gene", "term": term, "retmode": "json", "retmax": _safe_limit(limit)},
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    ids = response.json().get("esearchresult", {}).get("idlist", [])
    if not ids:
        return []

    summary_response = requests.get(
        NCBI_GENE_ESUMMARY,
        params={"db": "gene", "id": ",".join(ids), "retmode": "json"},
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    summary_response.raise_for_status()
    result = summary_response.json().get("result", {})
    records: list[dict[str, Any]] = []
    for uid in result.get("uids", []):
        item = result.get(uid, {})
        gene_id = _clean(item.get("uid") or uid)
        organism = item.get("organism") or {}
        genomic_info = item.get("genomicinfo") or []
        locations = []
        for locus in genomic_info:
            chr_name = _clean(locus.get("chraccver") or locus.get("chr"))
            start = locus.get("chrstart")
            stop = locus.get("chrstop")
            if chr_name and start is not None and stop is not None:
                locations.append(f"{chr_name}:{start}-{stop} (NCBI source coordinates)")
            elif chr_name:
                locations.append(chr_name)
        records.append({
            "gene_id": gene_id,
            "symbol": _clean(item.get("name")),
            "description": _clean(item.get("description")),
            "organism": _clean(organism.get("scientificname")) if isinstance(organism, dict) else _clean(organism),
            "tax_id": organism.get("taxid") if isinstance(organism, dict) else None,
            "chromosome": _clean(item.get("chromosome")),
            "location": "; ".join(locations) or _clean(item.get("maplocation")),
            "aliases": _clean(item.get("otheraliases")),
            "summary": _clean(item.get("summary")),
            "source": "NCBI Gene",
            "url": f"https://www.ncbi.nlm.nih.gov/gene/{quote(gene_id)}",
            "record_type": "Gene annotation; not an expression measurement",
        })
    return records

def plant_literature_query(species: str, topic: str = "single-cell atlas") -> str:
    """Build a Europe PMC query with explicit species and research topic."""
    species = _clean(species)
    topic = _clean(topic)
    return f'("{species}" AND ("{topic}" OR "single-cell" OR "single nucleus" OR "spatial transcriptomics"))'
