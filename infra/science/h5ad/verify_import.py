"""On-demand real-file commissioning: full published count parity + hostile upload rejection.

Run with the demo environment from docs/h5ad-source.md. Uses actual source cells,
not a fake service, and invokes the same importer used by the queue worker.
"""
import argparse
import json
from pathlib import Path
import sys
import tempfile

import anndata as ad
import h5py
import numpy as np

from importer import ImportFailure, import_file, inspect_file


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--bundle', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    selection = {'matrix': 'X', 'geneColumn': '_index', 'groupColumn': 'seurat_clusters', 'embedding': 'X_umap', 'speciesId': 'glycine-max', 'tissue': 'root', 'genomeBuild': 'Wm82v4', 'rawCountsConfirmed': True, 'sampleColumn': 'sample_id'}
    receipt = import_file(args.source, args.output / 'full-real-import', 'full-real-import', selection)
    parity = {}
    for filename, dtype in [('rna-counts/values.bin', '<f8'), ('rna-counts/cell-indices.bin', '<u4'), ('rna-counts/gene-pointers.bin', '<u4'), ('library-sums.bin', '<f8'), ('sum-counts.bin', '<f8'), ('sum-log.bin', '<f8'), ('detected.bin', '<u4')]:
        a = np.fromfile(args.bundle / filename, dtype=dtype)
        b = np.fromfile(args.output / 'full-real-import' / filename, dtype=dtype)
        assert a.shape == b.shape
        error = float(np.max(np.abs(a.astype(float) - b.astype(float))))
        assert error < 1e-10, filename
        parity[filename] = {'values': len(a), 'maxError': error, 'exact': bool(np.array_equal(a, b))}
    assert json.loads((args.bundle / 'embedding.json').read_text()) == json.loads((args.output / 'full-real-import/embedding.json').read_text())
    # Actual cells from the input exercise alternate legal encodings and rejected files.
    backed = ad.read_h5ad(args.source, backed='r')
    small = backed[:100, :].to_memory(); backed.file.close()
    outcomes = {}
    for name, matrix in [('csc', small.X.tocsc()), ('dense', small.X.toarray())]:
        variant = small.copy(); variant.X = matrix
        file = args.output / f'{name}.h5ad'; variant.write_h5ad(file, compression='gzip')
        result = import_file(file, args.output / f'{name}-import', f'{name}-import', selection)
        assert result['dataset']['nCells'] == 100
        outcomes[name] = 'imported actual counts'
    cases = {}
    normalized = small.copy(); normalized.X = normalized.X.astype(float); normalized.X.data = np.log1p(normalized.X.data)
    cases['normalized-counts'] = normalized
    no_umap = small.copy(); del no_umap.obsm['X_umap']; cases['missing-umap'] = no_umap
    duplicate = small.copy(); names = list(duplicate.var_names); names[1] = names[0]; duplicate.var_names = names; cases['duplicate-genes'] = duplicate
    for name, variant in cases.items():
        file = args.output / f'{name}.h5ad'; variant.write_h5ad(file, compression='gzip')
        try: import_file(file, args.output / f'{name}-import', f'{name}-import', selection)
        except ImportFailure as e: outcomes[name] = e.code
        else: raise AssertionError(f'{name} was accepted')
    for name, link in [('external', h5py.ExternalLink('/etc/passwd', '/')), ('soft', h5py.SoftLink('/X'))]:
        file = args.output / f'{name}.h5ad'
        with h5py.File(file, 'w') as f: f['linked'] = link
        try: inspect_file(file)
        except ImportFailure as e: outcomes[name] = e.code
        else: raise AssertionError(f'{name} was accepted')
    vfile = args.output / 'virtual.h5ad'
    with h5py.File(vfile, 'w', libver='latest') as f:
        layout = h5py.VirtualLayout(shape=(2,), dtype='f8')
        layout[:] = h5py.VirtualSource('/etc/passwd', 'X', shape=(2,))
        f.create_virtual_dataset('virtual', layout)
    try: inspect_file(vfile)
    except ImportFailure as e: outcomes['virtual'] = e.code
    else: raise AssertionError('virtual was accepted')
    # Duplicate CSR coordinates must fail explicitly rather than be summed silently.
    dup = args.output / 'duplicate-coordinates.h5ad'; small.write_h5ad(dup, compression='gzip')
    with h5py.File(dup, 'r+') as f: f['X/indices'][1] = f['X/indices'][0]
    try: import_file(dup, args.output / 'duplicate-coordinates-import', 'duplicate-coordinates-import', selection)
    except ImportFailure as e: outcomes['duplicate-coordinates'] = e.code
    else: raise AssertionError('duplicate coordinates were accepted')
    report = {'parity': parity, 'allUmapPointsExact': True, 'boundaries': outcomes, 'import': receipt}
    (args.output / 'verification.json').write_text(json.dumps(report, indent=2))
    print(json.dumps({'parity': parity, 'allUmapPointsExact': True, 'boundaries': outcomes}))

if __name__ == '__main__': main()
