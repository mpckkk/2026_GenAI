#!/usr/bin/env python3
"""Create a transparent H5AD conversion of the verified public soybean root bundle.

This copies real raw counts, groups and original UMAP. It does not generate cells,
labels or embeddings. The separate parent RDS SHA remains in uns provenance.
Requires numpy, h5py, scipy, anndata (see docs/h5ad-source.md).
"""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile

import anndata as ad
import numpy as np
import pandas as pd
from scipy.sparse import csc_matrix


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        while chunk := f.read(1024 * 1024): h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists(): raise ValueError('Refusing to overwrite a demo input.')
    manifest_path = args.bundle / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    expected = '02f079834ad067c47b77e1e34c86501d783fa78fc1797c7aa7f8ab23c13bbda5'
    if digest(manifest_path) != expected: raise ValueError('Expected the pinned verified GSE270392 root manifest.')
    for name, record in manifest['files'].items():
        if digest(args.bundle / name) != record['sha256']: raise ValueError(f'Verification failed: {name}')
    d = manifest['dataset']
    genes = json.loads((args.bundle / 'rna-counts/genes.json').read_text())
    points = json.loads((args.bundle / 'embedding.json').read_text())['points']
    pointers = np.fromfile(args.bundle / 'rna-counts/gene-pointers.bin', dtype='<u4')
    indices = np.fromfile(args.bundle / 'rna-counts/cell-indices.bin', dtype='<u4')
    values = np.fromfile(args.bundle / 'rna-counts/values.bin', dtype='<f8')
    # Store exact integer counts in CSR for efficient import. No normalization.
    matrix = csc_matrix((values.astype(np.uint32), indices, pointers), shape=(d['nCells'], d['nGenes'])).tocsr()
    obs = pd.DataFrame({'seurat_clusters': pd.Categorical([p['cluster'] for p in points]), 'sample_id': pd.Categorical([p['sampleId'] for p in points])}, index=[p['cellId'] for p in points])
    var = pd.DataFrame({'source_gene_id': [g['sourceGeneId'] for g in genes]}, index=[g['geneId'] for g in genes])
    a = ad.AnnData(X=matrix, obs=obs, var=var)
    a.obsm['X_umap'] = np.asarray([[p['x'], p['y']] for p in points], dtype=np.float64)
    a.uns['celloras_provenance'] = {'format_conversion': 'Lossless raw RNA counts, original UMAP, groups and sample IDs converted from the published RDS via the verified Celloras sparse bundle. Not an author-deposited H5AD.', 'source_accession': d['source']['accession'], 'source_url': d['source']['url'], 'paper_url': d['source']['paperUrl'], 'source_rds_sha256': d['source']['sha256'], 'bundle_manifest_sha256': expected, 'species': d['species'], 'species_id': d['speciesId'], 'tissue': d['tissue'], 'genome_build': d['genomeBuild'], 'matrix': 'X contains original raw RNA UMI counts', 'gene_ids': 'var index uses the verified alias removing only the literal ann1. prefix; original IDs retained in source_gene_id'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix='.h5ad-demo-', suffix='.h5ad', dir=args.output.parent, delete=False) as tmp:
        temporary = Path(tmp.name)
    try:
        a.write_h5ad(temporary, compression='gzip')
        b = ad.read_h5ad(temporary)
        assert (b.X != matrix).nnz == 0
        assert np.array_equal(b.obsm['X_umap'], a.obsm['X_umap'])
        assert list(b.obs_names) == list(a.obs_names) and list(b.var_names) == list(a.var_names)
        temporary.replace(args.output)
    finally:
        temporary.unlink(missing_ok=True)
    receipt = {'file': str(args.output), 'bytes': args.output.stat().st_size, 'sha256': digest(args.output), 'nCells': a.n_obs, 'nGenes': a.n_vars, 'rawNonzero': matrix.nnz, 'rawCountSum': int(matrix.sum()), 'groups': int(obs.seurat_clusters.nunique()), 'exactCountAndUmapRoundtrip': True, 'sourceRdsSha256': d['source']['sha256']}
    args.output.with_suffix('.receipt.json').write_text(json.dumps(receipt, indent=2))
    print(json.dumps(receipt))

if __name__ == '__main__': main()
