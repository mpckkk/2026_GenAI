# Read the exact deposited object without installing or changing Seurat.
# S4 attributes are inspected directly; no analysis or normalization is run in R.
args <- commandArgs(TRUE)
stopifnot(length(args) == 2)
obj <- readRDS(gzfile(args[1]))
out <- args[2]
dir.create(out, recursive = TRUE, showWarnings = FALSE)
meta <- attr(obj, 'meta.data')
stopifnot(nrow(meta) == 7496, !anyDuplicated(rownames(meta)))
write.csv(meta, file.path(out, 'cells.csv'), row.names = TRUE)
for (nm in names(attr(obj, 'reductions'))) {
  reduction <- attr(attr(obj, 'reductions')[[nm]], 'cell.embeddings')
  stopifnot(identical(rownames(reduction), rownames(meta)), all(is.finite(reduction)))
  write.csv(reduction, file.path(out, paste0(nm, '.csv')), row.names = TRUE)
}
for (nm in c('RNA', 'SCT')) {
  assay <- attr(obj, 'assays')[[nm]]
  for (layer in c('counts', 'data')) {
    m <- attr(assay, layer)
    stopifnot(inherits(m, 'dgCMatrix'), identical(attr(m, 'Dimnames')[[2]], rownames(meta)))
    prefix <- file.path(out, paste0(nm, '-', layer))
    writeBin(attr(m, 'p'), paste0(prefix, '-p.bin'), size = 4, endian = 'little')
    writeBin(attr(m, 'i'), paste0(prefix, '-i.bin'), size = 4, endian = 'little')
    writeBin(attr(m, 'x'), paste0(prefix, '-x.bin'), size = 8, endian = 'little')
    writeLines(attr(m, 'Dimnames')[[1]], paste0(prefix, '-genes.txt'))
    cat(nm, layer, 'dimensions', attr(m, 'Dim'), 'nonzero', length(attr(m, 'x')), 'sum', sum(attr(m, 'x')), '\n')
  }
  counts <- attr(assay, 'counts'); data <- attr(assay, 'data')
  stopifnot(identical(attr(counts, 'p'), attr(data, 'p')), identical(attr(counts, 'i'), attr(data, 'i')))
  if (nm == 'RNA') stopifnot(identical(attr(counts, 'x'), attr(data, 'x')))
  if (nm == 'SCT') stopifnot(max(abs(log1p(attr(counts, 'x')) - attr(data, 'x'))) < 1e-12)
}
# Independent values for the JS import/runtime acceptance check, calculated
# directly from the original sparse object, including implicit zeros.
rna <- attr(attr(obj, 'assays')[['RNA']], 'counts')
p <- attr(rna, 'p'); i <- attr(rna, 'i'); x <- attr(rna, 'x')
geneIds <- attr(rna, 'Dimnames')[[1]]
selected <- c(1L, 100L, 1000L, 10000L, 20000L, 40000L)
rows <- list()
for (g in selected) {
  raw <- numeric(nrow(meta))
  for (cell in seq_len(nrow(meta))) {
    if (p[cell + 1L] > p[cell]) {
      positions <- seq.int(p[cell] + 1L, p[cell + 1L])
      hit <- positions[i[positions] == g - 1L]
      if (length(hit)) raw[cell] <- x[hit]
    }
  }
  normalized <- log1p(raw / meta$nCount_RNA * 10000)
  for (cluster in unique(as.character(meta$seurat_clusters))) {
    selectedCells <- as.character(meta$seurat_clusters) == cluster
    rows[[length(rows) + 1L]] <- data.frame(sourceGeneId = geneIds[g], cluster = cluster,
      meanCount = mean(raw[selectedCells]), meanLogExpression = mean(normalized[selectedCells]),
      detectionFraction = mean(raw[selectedCells] > 0), otherMeanLogExpression = mean(normalized[!selectedCells]))
  }
}
write.csv(do.call(rbind, rows), file.path(out, 'reference-checks.csv'), row.names = FALSE)
commandLines <- unlist(lapply(names(attr(obj, 'commands')), function(nm) {
  command <- attr(obj, 'commands')[[nm]]
  c(nm, attr(command, 'call.string'))
}), use.names = FALSE)
writeLines(commandLines, file.path(out, 'commands.txt'))
cat('Validated export complete\n')
