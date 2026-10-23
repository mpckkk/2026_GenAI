# Celloras — Plant Single Cell Atlas MVP

A polished Streamlit app for source-backed plant research discovery. It searches NCBI GEO for study metadata, NCBI Gene for gene annotations, and Europe PMC for publications, preserving accessions, gene IDs, DOI/PMID links, and source URLs.


## Run locally

Requires Python 3.11 or 3.12.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
streamlit run celloras_app.py
```

## Deploy publicly with Streamlit Community Cloud

1. Create a GitHub repository for this project and push these files to the default branch.
2. Visit https://share.streamlit.io/ and sign in with GitHub.
3. Choose **Create app**, select your repository/branch, and set the main file path to `celloras_app.py`.
4. In advanced settings, select Python 3.12 if needed. No secrets are required for the public APIs in this MVP.
5. Deploy, then test one GEO search and one Europe PMC search from the public URL.
6. Check the app logs after deployment. Push updates to GitHub to redeploy.

Official deployment docs: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy

## Data sources

- NCBI GEO: https://www.ncbi.nlm.nih.gov/geo/
- GEO programmatic access: https://www.ncbi.nlm.nih.gov/geo/info/geo_paccess.html
- NCBI Gene: https://www.ncbi.nlm.nih.gov/gene/
- NCBI E-utilities documentation: https://www.ncbi.nlm.nih.gov/books/NBK25497/
- Europe PMC REST API: https://europepmc.org/RestfulWebService
