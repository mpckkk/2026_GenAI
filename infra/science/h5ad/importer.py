"""Bounded, explicit H5AD inspection and import; never computes labels or embeddings."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import tempfile

# Disable dynamic HDF5 plugin loading before importing the library.
os.environ['HDF5_PLUGIN_PATH'] = '/nonexistent'
import h5py
import numpy as np

LIMITS = {'maxCells': 100000, 'maxGenes': 100000, 'maxNonzero': 100000000, 'maxGroups': 100}
BLOCK = 1000000
SAFE = re.compile(r'^[A-Za-z0-9_.-]{1,100}$')

class ImportFailure(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message
        super().__init__(message)

def check(condition, message, code='h5ad_invalid'):
    if not condition:
        raise ImportFailure(code, message)

def text(value):
    return value.decode('utf-8', errors='strict') if isinstance(value, bytes) else str(value)

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(1024 * 1024): h.update(chunk)
    return h.hexdigest()

def write_json(path, obj):
    Path(path).write_text(json.dumps(obj, separators=(',', ':'), ensure_ascii=False, allow_nan=False))

def audit(f):
    """Traverse links, not payloads. No external files, VDS, plugin filters or cycles."""
    seen = set()
    count = 0
    def walk(group, depth=0):
        nonlocal count
        check(depth <= 32, 'HDF5 nesting exceeds the supported limit.')
        address = h5py.h5o.get_info(group.id).addr
        if address in seen: return
        seen.add(address)
        for name in group.keys():
            count += 1
            check(count <= 10000, 'HDF5 contains too many objects.')
            check(isinstance(group.get(name, getlink=True), h5py.HardLink), 'External and soft HDF5 links are not accepted.')
            obj = group[name]
            if isinstance(obj, h5py.Group): walk(obj, depth + 1)
            else:
                check(not obj.is_virtual and not obj.external, 'External or virtual HDF5 datasets are not accepted.')
                props = obj.id.get_create_plist()
                for i in range(props.get_nfilters()):
                    check(props.get_filter(i)[0] in (1, 2, 3, 4, 5, 6), 'Custom HDF5 compression filters are not accepted.')
                check(obj.dtype.kind not in ('V',), 'Compound HDF5 data is not supported.')
    walk(f)
    check('obs' in f and 'var' in f, 'This file does not contain AnnData obs and var tables.')

def index_key(group):
    key = text(group.attrs.get('_index', '_index'))
    check(key in group, 'AnnData table is missing its index.')
    return key

def vector(obj, maximum, expected=None):
    if isinstance(obj, h5py.Group):
        check(text(obj.attrs.get('encoding-type', '')) == 'categorical', 'Only ordinary or categorical metadata columns are supported.')
        check('codes' in obj and 'categories' in obj, 'Malformed categorical column.')
        codes = vector(obj['codes'], maximum, expected)
        categories = vector(obj['categories'], maximum)
        check(codes.dtype.kind in 'iu' and np.all(codes >= 0) and np.all(codes < len(categories)), 'Missing or invalid categorical metadata values.')
        return categories[codes]
    check(obj.ndim == 1 and len(obj) <= maximum, 'Metadata column dimensions exceed the supported limit.')
    check(expected is None or len(obj) == expected, 'Metadata column does not align with the matrix.')
    # Bound each string read; the worker process also has a hard memory ceiling.
    if obj.dtype.kind in 'OSU':
        values = []
        for start in range(0, len(obj), 256):
            for item in obj[start:start + 256]:
                value = text(item)
                check(0 < len(value) <= 256 and '\x00' not in value, 'Metadata values must contain 1–256 characters.')
                values.append(value)
        return np.asarray(values, dtype=object)
    check(obj.dtype.kind in 'biuf', 'Unsupported metadata type.')
    values = obj[:]
    check(np.all(np.isfinite(values)), 'Metadata contains missing or non-finite values.')
    return values

def strings(obj, maximum, expected=None):
    return [text(v) for v in vector(obj, maximum, expected)]

def matrix_info(obj, key, n_cells, n_genes):
    if isinstance(obj, h5py.Dataset):
        shape = obj.shape
        dtype = obj.dtype
        sparse = False
    else:
        check(text(obj.attrs.get('encoding-type', '')) in ('csr_matrix', 'csc_matrix'), f'{key} is not a supported CSR/CSC matrix.')
        shape = tuple(int(v) for v in obj.attrs.get('shape', []))
        check(all(k in obj for k in ('data', 'indices', 'indptr')), f'{key} is missing sparse arrays.')
        check(all(obj[k].ndim == 1 for k in ('data', 'indices', 'indptr')), 'Sparse arrays must be one-dimensional.')
        check(len(obj['data']) == len(obj['indices']) <= LIMITS['maxNonzero'], 'Sparse matrix exceeds the nonzero limit or has inconsistent arrays.')
        check(obj['indices'].dtype.kind in 'iu' and obj['indptr'].dtype.kind in 'iu', 'Sparse indices must be integers.')
        dtype, sparse = obj['data'].dtype, True
    check(len(shape) == 2 and shape == (n_cells, n_genes), f'{key} shape does not match its cell and gene indexes.')
    check(dtype.kind in 'iuf' and 0 < shape[0] <= LIMITS['maxCells'] and 0 < shape[1] <= LIMITS['maxGenes'], 'Unsupported count matrix dimensions or type.')
    return {'key': key, 'label': key, 'shape': list(shape), 'sparse': sparse, 'dtype': str(dtype)}

def inspect_file(source):
    with h5py.File(source, 'r') as f:
        audit(f)
        n_cells, n_genes = len(f['obs'][index_key(f['obs'])]), len(f['var'][index_key(f['var'])])
        check(1 < n_cells <= LIMITS['maxCells'] and 0 < n_genes <= LIMITS['maxGenes'], 'Dataset dimensions exceed the supported limits.')
        matrices, genes, groups, embeddings = [], [{'key': '_index', 'label': 'Gene index', 'scope': 'main'}], [], []
        keys = (['X'] if 'X' in f else []) + [f'layers/{k}' for k in f.get('layers', {})]
        if 'raw/X' in f and 'raw/var' in f: keys.append('raw/X')
        for key in keys:
            var = f['raw/var'] if key == 'raw/X' else f['var']
            matrices.append(matrix_info(f[key], key, n_cells, len(var[index_key(var)])))
        check(matrices, 'No expression matrix was found.')
        for group_path, scope in [('var', 'main'), ('raw/var', 'raw')]:
            if group_path not in f: continue
            var = f[group_path]
            for key in var:
                if key == index_key(var): continue
                try:
                    values = strings(var[key], LIMITS['maxGenes'], len(var[index_key(var)]))
                    if len(set(values)) == len(values) and all(SAFE.fullmatch(v) for v in values):
                        genes.append({'key': f'{group_path}/{key}', 'label': f'{group_path}/{key}', 'scope': scope})
                except ImportFailure: pass
        for key in f['obs']:
            if key == index_key(f['obs']): continue
            try:
                values = strings(f['obs'][key], LIMITS['maxCells'], n_cells)
                unique = list(dict.fromkeys(values))
                if 2 <= len(unique) <= LIMITS['maxGroups']:
                    groups.append({'key': key, 'label': key, 'nGroups': len(unique), 'examples': unique[:5]})
            except ImportFailure: pass
        for key, obj in f.get('obsm', {}).items():
            # Only two-dimensional existing embeddings. A named PCA is not presented as UMAP.
            if 'umap' in key.lower() and isinstance(obj, h5py.Dataset) and obj.shape == (n_cells, 2) and obj.dtype.kind in 'fiu':
                embeddings.append({'key': key, 'label': key, 'dimensions': 2})
        return {'version': 1, 'nCells': n_cells, 'nGenes': n_genes, 'matrices': matrices, 'geneColumns': genes, 'groupColumns': groups, 'embeddings': embeddings, 'limits': LIMITS,
                'warnings': ['Choose the matrix containing raw RNA counts. Integer values alone do not establish that a matrix contains raw counts.', 'Existing groups and UMAP are required. This import does not perform quality control, clustering or UMAP.']}

def matrix_blocks(obj, shape):
    """Yield (cell index, gene index, positive count) arrays without densifying sparse data."""
    rows, cols = shape
    if isinstance(obj, h5py.Dataset):
        step = max(1, BLOCK // cols)
        for start in range(0, rows, step):
            values = np.asarray(obj[start:start + step, :], dtype=np.float64)
            validate_counts(values)
            rr, cc = np.nonzero(values)
            yield rr + start, cc, values[rr, cc]
        return
    csr = text(obj.attrs['encoding-type']) == 'csr_matrix'
    majors, minors = (rows, cols) if csr else (cols, rows)
    p = obj['indptr'][:]
    check(len(p) == majors + 1 and p[0] == 0 and p[-1] == len(obj['data']) and np.all(p[1:] >= p[:-1]), 'Invalid sparse matrix pointers.')
    start = 0
    while start < majors:
        end = min(majors, max(start + 1, int(np.searchsorted(p, int(p[start]) + BLOCK, side='right')) - 1))
        lo, hi = int(p[start]), int(p[end])
        check(hi - lo <= max(BLOCK, minors), 'Sparse block exceeds supported memory bound.')
        indices = obj['indices'][lo:hi].astype(np.int64)
        values = obj['data'][lo:hi].astype(np.float64)
        validate_counts(values)
        check(np.all(indices >= 0) and np.all(indices < minors), 'Sparse matrix contains out-of-range indices.')
        major = np.repeat(np.arange(start, end), np.diff(p[start:end + 1]).astype(np.int64))
        order = np.lexsort((indices, major))
        sorted_major, sorted_minor = major[order], indices[order]
        check(not np.any((sorted_major[1:] == sorted_major[:-1]) & (sorted_minor[1:] == sorted_minor[:-1])), 'Duplicate sparse coordinates are not accepted. Consolidate them explicitly before import.')
        nonzero = values > 0
        yield (major[nonzero], indices[nonzero], values[nonzero]) if csr else (indices[nonzero], major[nonzero], values[nonzero])
        start = end

def validate_counts(values):
    check(np.all(np.isfinite(values)) and np.all(values >= 0) and np.all(values <= 2**53 - 1) and np.all(values == np.floor(values)), 'The selected matrix must contain finite, nonnegative integer raw counts.', 'h5ad_counts_invalid')

def import_file(source, output, dataset_id, selection, source_metadata=None):
    check(re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', dataset_id), 'Invalid dataset identifier.')
    check(selection.get('rawCountsConfirmed') is True, 'Confirm that the selected matrix contains raw RNA counts.')
    check(selection.get('speciesId') == 'glycine-max', 'This release supports soybean datasets (Glycine max).')
    for key in ('tissue', 'genomeBuild'):
        check(isinstance(selection.get(key), str) and re.fullmatch(r'[A-Za-z0-9_. -]{1,80}', selection[key]), f'A valid {key} is required.')
    inspection = inspect_file(source)
    info = next((m for m in inspection['matrices'] if m['key'] == selection.get('matrix')), None)
    check(info is not None, 'Choose an inspected expression matrix.')
    check(any(g['key'] == selection.get('groupColumn') for g in inspection['groupColumns']), 'Choose an inspected grouping column containing 2–100 groups.')
    check(any(e['key'] == selection.get('embedding') for e in inspection['embeddings']), 'Choose an existing two-dimensional UMAP.')
    n_cells, n_genes = info['shape']
    output = Path(output)
    check(not output.exists(), 'An immutable imported dataset already exists.')
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = Path(tempfile.mkdtemp(prefix=f'.{dataset_id}-', dir=output.parent))
    try:
        with h5py.File(source, 'r') as f:
            audit(f)
            var_path = 'raw/var' if selection['matrix'] == 'raw/X' else 'var'
            gene_path = selection.get('geneColumn', '_index')
            if gene_path == '_index': gene_path = f'{var_path}/{index_key(f[var_path])}'
            else:
                check(gene_path.startswith(var_path + '/') and any(g['key'] == gene_path for g in inspection['geneColumns']), 'The gene column must belong to the selected matrix.')
            genes = strings(f[gene_path], LIMITS['maxGenes'], n_genes)
            check(len(set(genes)) == n_genes and all(SAFE.fullmatch(g) for g in genes), 'Gene IDs must be unique, exact IDs of 1–100 letters, numbers, dots, underscores or hyphens. No automatic aliasing is performed.')
            cells = strings(f['obs'][index_key(f['obs'])], LIMITS['maxCells'], n_cells)
            check(len(set(cells)) == n_cells, 'Cell IDs must be unique.')
            labels = strings(f['obs'][selection['groupColumn']], LIMITS['maxCells'], n_cells)
            unique = sorted(set(labels), key=lambda s: [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', s)])
            safe_groups = all(re.fullmatch(r'[A-Za-z0-9_.-]{1,64}', value) for value in unique)
            mapping = {value: value if safe_groups else f'group-{i + 1}' for i, value in enumerate(unique)}
            group_index = {value: i for i, value in enumerate(unique)}
            ci = np.asarray([group_index[v] for v in labels], dtype=np.int64)
            clusters = [{'id': mapping[value], 'nCells': int(np.sum(ci == i)), 'publishedLabel': None, 'sourceValue': value} for i, value in enumerate(unique)]
            embedding = np.asarray(f['obsm'][selection['embedding']][:], dtype=np.float64)
            check(np.all(np.isfinite(embedding)), 'UMAP contains non-finite coordinates.')
            samples = ['uploaded'] * n_cells
            if selection.get('sampleColumn'):
                check(selection['sampleColumn'] in f['obs'], 'Unknown sample column.')
                samples = strings(f['obs'][selection['sampleColumn']], LIMITS['maxCells'], n_cells)
            points = [{'cellId': cells[i], 'x': float(embedding[i, 0]), 'y': float(embedding[i, 1]), 'cluster': mapping[labels[i]], 'sampleId': samples[i]} for i in range(n_cells)]
            library = np.zeros(n_cells, dtype=np.float64)
            gene_nnz = np.zeros(n_genes, dtype=np.int64)
            nnz = 0
            matrix = f[selection['matrix']]
            for rr, cc, values in matrix_blocks(matrix, (n_cells, n_genes)):
                nnz += len(values)
                check(nnz <= LIMITS['maxNonzero'], 'Count matrix exceeds the nonzero limit.')
                np.add.at(library, rr, values)
                gene_nnz += np.bincount(cc, minlength=n_genes)
            check(np.all(library > 0) and np.all(library <= 2**53 - 1), 'Every cell must have a positive, exactly representable raw count total.')
            pointers = np.concatenate(([0], np.cumsum(gene_nnz))).astype('<u4')
            count_dir = temp / 'rna-counts'; count_dir.mkdir()
            cell_indices = np.memmap(count_dir / 'cell-indices.bin', dtype='<u4', mode='w+', shape=(nnz,))
            counts = np.memmap(count_dir / 'values.bin', dtype='<f8', mode='w+', shape=(nnz,))
            cursor = pointers[:-1].astype(np.int64)
            width = len(clusters)
            sum_counts, sum_log = np.zeros((2, n_genes, width), dtype=np.float64)
            detected = np.zeros((n_genes, width), dtype=np.uint32)
            for rr, cc, values in matrix_blocks(matrix, (n_cells, n_genes)):
                order = np.lexsort((rr, cc))
                rr, cc, values = rr[order], cc[order], values[order]
                starts = np.r_[0, np.flatnonzero(cc[1:] != cc[:-1]) + 1, len(cc)] if len(cc) else []
                for a, b in zip(starts[:-1], starts[1:]):
                    g = int(cc[a]); dest = int(cursor[g]); end = dest + int(b - a)
                    cell_indices[dest:end], counts[dest:end] = rr[a:b], values[a:b]
                    cursor[g] = end
                np.add.at(sum_counts, (cc, ci[rr]), values)
                np.add.at(sum_log, (cc, ci[rr]), np.log1p(values / library[rr] * 10000))
                np.add.at(detected, (cc, ci[rr]), 1)
            cell_indices.flush(); counts.flush(); del cell_indices, counts
            check(np.array_equal(cursor, pointers[1:]), 'Sparse import count alignment failed.')
            pointers.tofile(count_dir / 'gene-pointers.bin')
            library.astype('<f8').tofile(temp / 'library-sums.bin')
            sum_counts.astype('<f8').tofile(temp / 'sum-counts.bin')
            sum_log.astype('<f8').tofile(temp / 'sum-log.bin')
            detected.astype('<u4').tofile(temp / 'detected.bin')
            write_json(count_dir / 'genes.json', [{'geneId': g, 'sourceGeneId': g} for g in genes])
            write_json(temp / 'clusters.json', clusters)
            write_json(temp / 'embedding.json', {'name': 'UMAP', 'points': points})
        source_dir = temp / 'source'; source_dir.mkdir()
        shutil.copyfile(source, source_dir / 'original.h5ad')
        digest = sha256(source_dir / 'original.h5ad')
        check(not source_metadata or not source_metadata.get('sha256') or source_metadata['sha256'] == digest, 'The uploaded source changed after inspection.')
        write_json(source_dir / 'selection.json', selection)
        filename = (source_metadata or {}).get('filename', Path(source).name)
        dataset = {'id': dataset_id, 'title': filename, 'speciesId': 'glycine-max', 'species': 'Glycine max', 'tissue': selection['tissue'], 'genomeBuild': selection['genomeBuild'], 'genomeBuildEvidence': 'Genome build declared by the uploader. No cross-build mapping or independent build verification is performed.', 'nCells': n_cells, 'nGenes': n_genes,
            'source': {'accession': 'User upload', 'url': '', 'paperUrl': '', 'sha256': digest, 'bytes': Path(source).stat().st_size, 'format': 'h5ad', 'kind': 'uploaded-h5ad', 'originalFile': 'source/original.h5ad', 'filename': filename},
            'clusterField': selection['groupColumn'], 'embeddingField': selection['embedding'], 'geneAliasRule': 'Exact selected gene IDs. No inferred aliases, symbol conversion or cross-build mapping.',
            'warnings': ['Raw RNA counts, species, tissue and genome build were declared by the uploader.', 'Existing cell groups and UMAP are preserved. Import does not compute QC, clustering or UMAP, and group names are not new annotations.']}
        files = {str(p.relative_to(temp)): {'bytes': p.stat().st_size, 'sha256': sha256(p)} for p in sorted(temp.rglob('*')) if p.is_file()}
        manifest = {'format': 'celloras-sparse-v1', 'version': 1, 'dataset': dataset, 'backend': 'local-sparse-cpu', 'endianness': 'little', 'importer': {'version': 1, 'kind': 'h5ad', 'selection': selection}, 'assays': [{'name': 'RNA', 'nGenes': n_genes, 'layers': {'counts': f'Uploader-selected raw counts from {selection["matrix"]}'}}], 'clusters': clusters, 'verification': {'nCells': n_cells, 'nGenes': n_genes, 'rawNonzero': nnz, 'rawCountSum': float(library.sum()), 'clusters': len(clusters), 'umapAligned': True, 'rawCountsIntegerNonnegative': True, 'duplicateCoordinatesRejected': True}, 'files': files}
        write_json(temp / 'manifest.json', manifest)
        manifest_sha = sha256(temp / 'manifest.json')
        os.rename(temp, output)
        return {'manifestSha256': manifest_sha, 'datasetId': dataset_id, 'dataset': {**dataset, 'artifactVersion': manifest_sha}}
    except BaseException:
        shutil.rmtree(temp, ignore_errors=True)
        raise

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['inspect', 'import'])
    parser.add_argument('--source', required=True)
    parser.add_argument('--selection')
    parser.add_argument('--output')
    parser.add_argument('--dataset-id')
    args = parser.parse_args()
    try:
        result = inspect_file(args.source) if args.operation == 'inspect' else import_file(args.source, args.output, args.dataset_id, json.loads(Path(args.selection).read_text()))
        print(json.dumps(result, ensure_ascii=False, allow_nan=False))
    except ImportFailure as e:
        print(json.dumps({'error': e.code, 'message': e.message}))
        raise SystemExit(1)
