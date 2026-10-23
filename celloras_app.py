from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
import streamlit as st

from celloras_data import (
    ASSAY_TERMS,
    plant_literature_query,
    search_gene_records,
    search_geo,
    search_papers,
)

BASE_DIR = Path(__file__).parent
LOGO_ICON_PATH = BASE_DIR / "assets" / "logo_icon.png"


@st.cache_data
def img_b64(path: str) -> str:
    return base64.b64encode(Path(path).read_bytes()).decode()


st.set_page_config(
    page_title="Celloras — Plant Cell Atlas",
    page_icon=str(LOGO_ICON_PATH) if LOGO_ICON_PATH.exists() else "🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ------------------------------- Styles (CSS only) ------------------------------
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');
:root { color-scheme: light; }
.stApp { background: #f7f9f7; }
.block-container { max-width: 1420px; padding-top: 4.5rem; padding-bottom: 2.5rem; }
header[data-testid="stHeader"] { background: transparent; }
[data-testid="stSidebar"] { background: #f0f4f0; border-right: 1px solid #e0e7e0; }
html, body, [class*="css"] { font-family: 'DM Sans', sans-serif; }
h1, h2, h3 { font-family: 'Manrope', sans-serif; letter-spacing: -0.025em; }
.brandbar { display:flex; align-items:center; gap:12px; padding: 0 0 1.2rem 0; border-bottom: 1px solid #e0e7e0; margin-bottom: 1.25rem; }
.brandmark { width:60px; height:60px; display:flex; align-items:center; justify-content:center; font-size:1.45rem; }
.brandmark img { width:100%; height:100%; object-fit:contain; }
.brandname { font-family:'Manrope',sans-serif; color:#163b2b; font-weight:800; font-size:1.45rem; line-height:1.2; }
.branddesc { color:#6b7e72; font-size:.83rem; margin-top:2px; }
.hero { background:linear-gradient(115deg,#173d2c 0%,#24573b 68%,#3b6a4a 100%); border-radius:20px; padding:2rem 2.1rem; color:white; margin-bottom:1.2rem; box-shadow:0 8px 24px rgba(26,65,44,.08); }
.hero-kicker { text-transform:uppercase; letter-spacing:.15em; font-size:.72rem; font-weight:700; color:#c3dfc9; }
.hero-title { font-family:'Manrope',sans-serif; font-size:2.25rem; line-height:1.15; letter-spacing:-.04em; font-weight:800; margin:.55rem 0 .6rem; color:#fff; }
.hero-copy { color:#e0eee3; font-size:1rem; max-width:800px; line-height:1.65; margin:0; }
.section-note { color:#65776b; font-size:.88rem; }
.result-card { border:1px solid #e1e8e1; border-radius:14px; padding:1rem 1.1rem; background:#fff; margin:.55rem 0; }
.source-label { color:#597061; font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; }
[data-testid="stMetric"] { background:#fff; border:1px solid #e1e8e1; border-radius:14px; padding:1rem 1.1rem; }
.stButton button, .stDownloadButton button { border-radius:10px; font-weight:600; }
.stTabs [data-baseweb="tab-list"] { gap:10px; border-bottom:1px solid #e0e7e0; }
.stTabs [data-baseweb="tab"] { padding:12px 16px; }
footer { visibility:hidden; }
</style>
""", unsafe_allow_html=True)

# --------------------------- Brand bar and hero (HTML) --------------------------
if LOGO_ICON_PATH.exists():
    brand_mark_html = f'<img src="data:image/png;base64,{img_b64(str(LOGO_ICON_PATH))}" alt="Celloras">'
else:
    brand_mark_html = "🌿"  # fallback if the logo file is missing

st.markdown(f"""
<div class="brandbar">
  <div class="brandmark">{brand_mark_html}</div>
  <div><div class="brandname">Celloras</div><div class="branddesc">Plant single-cell research platform</div></div>
</div>
<div class="hero">
  <div class="hero-kicker">Plant biology · Public research data</div>
  <div class="hero-title">Explore the plant cell landscape.</div>
  <p class="hero-copy">Discover plant single-cell studies, look up gene annotations, and trace research findings back to the public records that support them.</p>
</div>
""", unsafe_allow_html=True)

# ---------------------------------- Sidebar ------------------------------------
with st.sidebar:
    st.markdown("### Search settings")
    species = st.text_input(
        "Plant species",
        value="Arabidopsis thaliana",
        help="Enter a scientific name indexed by NCBI, such as Arabidopsis thaliana, Oryza sativa, Zea mays, or Glycine max.",
    )
    st.markdown("---")
    st.markdown("**Connected public sources**")
    st.markdown("[NCBI GEO ↗](https://www.ncbi.nlm.nih.gov/geo/)")
    st.markdown("[NCBI Gene ↗](https://www.ncbi.nlm.nih.gov/gene/)")
    st.markdown("[Europe PMC ↗](https://europepmc.org/)")
    st.caption("Results link to the original source record.")

study_tab, gene_tab, literature_tab = st.tabs(["Study Explorer", "Gene Explorer", "Publications"])

# ------------------------------ Study Explorer ------------------------------
with study_tab:
    st.subheader("Find plant single-cell datasets")
    st.markdown('<p class="section-note">Search repository records by organism and experimental modality.</p>', unsafe_allow_html=True)
    left, right, action = st.columns([1.3, 1.1, .7], vertical_alignment="bottom")
    with left:
        assay = st.selectbox("Data modality", list(ASSAY_TERMS), index=0, key="study_assay")
    with right:
        study_limit = st.selectbox("Results", [10, 20, 25, 50], index=2, key="study_limit")
    with action:
        run_geo = st.button("Search studies", type="primary", use_container_width=True)

    if "geo_records" not in st.session_state:
        st.session_state.geo_records = []
        st.session_state.geo_search_meta = None
    if run_geo:
        if not species.strip():
            st.warning("Enter a plant species to search.")
        else:
            try:
                with st.spinner("Searching NCBI GEO…"):
                    st.session_state.geo_records = search_geo(species, assay, study_limit)
                    st.session_state.geo_search_meta = {
                        "species": species.strip(), "assay": assay,
                        "searched_at": datetime.now(timezone.utc).isoformat(),
                    }
            except (requests.RequestException, ValueError, KeyError) as exc:
                st.error("NCBI GEO could not be reached. Please retry shortly.")
                st.caption(f"Technical detail: {exc}")

    records = st.session_state.get("geo_records", [])
    meta = st.session_state.get("geo_search_meta")
    if meta:
        metric_a, metric_b, metric_c = st.columns(3)
        metric_a.metric("Records found", len(records))
        metric_b.metric("Organism", meta["species"])
        metric_c.metric("Source", "NCBI GEO")
        st.caption(f"Search performed {meta['searched_at']} · {meta['assay']}")
    if records:
        st.dataframe(
            pd.DataFrame([{k: r.get(k, "") for k in ["accession", "title", "organism", "samples", "study_type"]} for r in records]),
            use_container_width=True,
            hide_index=True,
            column_config={
                "accession": st.column_config.TextColumn("Accession", width="small"),
                "title": st.column_config.TextColumn("Study title", width="large"),
                "organism": st.column_config.TextColumn("Organism"),
                "samples": st.column_config.NumberColumn("Samples"),
                "study_type": st.column_config.TextColumn("Record type"),
            },
        )
        for record in records:
            with st.expander(f"{record['accession']}  ·  {record['title']}"):
                st.markdown(f"**[Open original GEO record ↗]({record['url']})**")
                details_left, details_right = st.columns(2)
                with details_left:
                    st.write("**Organism:**", record.get("organism") or "Not provided in record summary")
                    st.write("**Samples:**", record.get("samples") if record.get("samples") is not None else "Not reported")
                with details_right:
                    st.write("**Record type:**", record.get("study_type") or "Not reported")
                    st.write("**Platform:**", record.get("platform") or "Not reported")
                if record.get("summary"):
                    st.write(record["summary"])
                st.caption("Repository metadata record. Confirm the study files and methods on the source page before interpreting measurements.")
        csv = pd.DataFrame(records).to_csv(index=False).encode("utf-8")
        manifest = {"generated_at_utc": datetime.now(timezone.utc).isoformat(), "query": meta, "source": "NCBI GEO E-utilities", "records": records}
        d1, d2, _ = st.columns([1, 1, 3])
        d1.download_button("Export CSV", csv, "celloras_studies.csv", "text/csv", use_container_width=True)
        d2.download_button("Export JSON", json.dumps(manifest, indent=2, ensure_ascii=False), "celloras_studies.json", "application/json", use_container_width=True)
    elif meta:
        st.info("No records matched this search. Try another modality or check the species spelling.")
    else:
        st.info("Choose a modality and search to browse public plant study records.")

# -------------------------------- Gene Explorer ------------------------------
with gene_tab:
    st.subheader("Gene record lookup")
    st.markdown('<p class="section-note">Search official NCBI Gene annotations by gene symbol, identifier, or name. Gene annotations are distinct from measured expression in a specific dataset.</p>', unsafe_allow_html=True)
    gcol, ncol = st.columns([2.2, .8], vertical_alignment="bottom")
    with gcol:
        gene_query = st.text_input("Gene name or identifier", value="", placeholder="e.g. WOX5, AT1G01010", key="gene_query")
    with ncol:
        gene_limit = st.selectbox("Max records", [5, 10, 20, 50], index=2, key="gene_limit")
    gene_search_clicked = st.button("Search gene records", type="primary", key="gene_search", use_container_width=False)

    if "gene_records" not in st.session_state:
        st.session_state.gene_records = []
        st.session_state.gene_search_meta = None
        st.session_state.gene_papers = []
    if gene_search_clicked:
        if not gene_query.strip() or not species.strip():
            st.warning("Enter both a gene name and plant species.")
        else:
            try:
                with st.spinner("Searching NCBI Gene and related literature…"):
                    st.session_state.gene_records = search_gene_records(gene_query, species, gene_limit)
                    quoted_gene = gene_query.strip().replace('"', " ")
                    quoted_species = species.strip().replace('"', " ")
                    literature_query = f'("{quoted_gene}" AND "{quoted_species}")'
                    st.session_state.gene_papers = search_papers(literature_query, min(gene_limit, 20))
                    st.session_state.gene_search_meta = {
                        "gene_query": gene_query.strip(), "species": species.strip(),
                        "searched_at": datetime.now(timezone.utc).isoformat(),
                    }
            except (requests.RequestException, ValueError, KeyError) as exc:
                st.error("The gene search service could not be reached. Please retry shortly.")
                st.caption(f"Technical detail: {exc}")

    gene_records = st.session_state.get("gene_records", [])
    gene_meta = st.session_state.get("gene_search_meta")
    if gene_meta:
        st.caption(f"Query: {gene_meta['gene_query']} · Organism: {gene_meta['species']} · NCBI Gene")
    if gene_records:
        st.success(f"{len(gene_records)} gene annotation record(s) found")
        for record in gene_records:
            with st.container(border=True):
                title_col, link_col = st.columns([4, 1], vertical_alignment="center")
                with title_col:
                    st.markdown(f"### {record.get('symbol') or 'Gene record'}")
                    st.write(record.get("description") or "No description supplied by NCBI Gene.")
                with link_col:
                    st.link_button("NCBI Gene ↗", record["url"], use_container_width=True)
                metadata = []
                if record.get("gene_id"):
                    metadata.append(f"Gene ID: {record['gene_id']}")
                if record.get("organism"):
                    metadata.append(record["organism"])
                if record.get("tax_id"):
                    metadata.append(f"Taxonomy ID: {record['tax_id']}")
                if record.get("chromosome"):
                    metadata.append(f"Chromosome: {record['chromosome']}")
                if record.get("location"):
                    metadata.append(f"Location: {record['location']}")
                if record.get("aliases"):
                    metadata.append(f"Aliases: {record['aliases']}")
                st.caption(" · ".join(metadata))
                if record.get("summary"):
                    with st.expander("Gene summary"):
                        st.write(record["summary"])
                st.caption("Evidence type: gene annotation · Not a gene-expression measurement")
        export_records = pd.DataFrame(gene_records).to_csv(index=False).encode("utf-8")
        st.download_button("Export gene records (CSV)", export_records, "celloras_gene_records.csv", "text/csv")
    elif gene_meta:
        st.info("No matching gene annotation was returned for this species and query. Try an official symbol or locus identifier.")

    gene_papers = st.session_state.get("gene_papers", [])
    if gene_meta and gene_papers:
        st.markdown("#### Related publications")
        for paper in gene_papers:
            with st.container(border=True):
                st.markdown(f"**[{paper['title']}]({paper['url']})**")
                citation = " · ".join(x for x in [paper.get("authors", ""), paper.get("year", ""), paper.get("journal", "")] if x)
                st.caption(citation or "Bibliographic details not returned")
                if paper.get("doi"):
                    st.caption(f"DOI: {paper['doi']}")

# -------------------------------- Publications -------------------------------
with literature_tab:
    st.subheader("Plant single-cell publications")
    default_query = plant_literature_query(species or "Arabidopsis thaliana")
    paper_query = st.text_input("Search query", value=default_query, help="Europe PMC search syntax; your query is sent to the source API.")
    pcol, paction = st.columns([1, 1], vertical_alignment="bottom")
    with pcol:
        paper_limit = st.selectbox("Maximum publications", [10, 15, 20, 50], index=1, key="publication_limit")
    with paction:
        run_papers = st.button("Search publications", type="primary", key="paper_search")
    if "paper_records" not in st.session_state:
        st.session_state.paper_records = []
        st.session_state.paper_query_used = ""
    if run_papers:
        try:
            with st.spinner("Searching Europe PMC…"):
                st.session_state.paper_records = search_papers(paper_query, paper_limit)
                st.session_state.paper_query_used = paper_query
        except (requests.RequestException, ValueError, KeyError) as exc:
            st.error("Europe PMC could not be reached. Please retry shortly.")
            st.caption(f"Technical detail: {exc}")
    papers = st.session_state.get("paper_records", [])
    if st.session_state.get("paper_query_used"):
        st.caption(f"{len(papers)} result(s) · Europe PMC · {st.session_state.paper_query_used}")
    if papers:
        for paper in papers:
            with st.container(border=True):
                st.markdown(f"**[{paper['title']}]({paper['url']})**")
                citation = " · ".join(x for x in [paper.get("authors", ""), paper.get("year", ""), paper.get("journal", "")] if x)
                st.caption(citation or "Bibliographic details not returned")
                ids = " · ".join(f"{label}: {paper[key]}" for label, key in [("DOI", "doi"), ("PMID", "pmid"), ("PMCID", "pmcid")] if paper.get(key))
                if ids:
                    st.caption(ids)
                if paper.get("abstract"):
                    with st.expander("Abstract"):
                        st.write(paper["abstract"])
        st.download_button("Export publications (CSV)", pd.DataFrame(papers).to_csv(index=False).encode("utf-8"), "celloras_publications.csv", "text/csv")
    elif st.session_state.get("paper_query_used"):
        st.info("No publications matched this query. Try a broader species or topic term.")
    else:
        st.info("Search the literature to view publication records from Europe PMC.")

st.divider()
st.caption("Celloras · Source-linked plant research records from NCBI GEO, NCBI Gene, and Europe PMC.")