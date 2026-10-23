# Independent numerical acceptance from the actual deposited sparse R object.
# No Seurat or third-party R package is required.
args <- commandArgs(TRUE)
stopifnot(length(args) == 2)
obj <- readRDS(gzcon(gzfile(args[1], 'rb')))
expected <- read.csv(args[2], stringsAsFactors = FALSE, check.names = FALSE)
meta <- attr(obj, 'meta.data')
rna <- attr(obj, 'assays')[['RNA']]
counts <- attr(rna, 'counts')
sourceGenes <- unique(expected$sourceGeneId)
positions <- match(sourceGenes, attr(counts, 'Dimnames')[[1]])
stopifnot(!anyNA(positions), length(positions) == 41, nrow(meta) == 7496)
index <- integer(attr(counts, 'Dim')[1])
index[positions] <- seq_along(positions)
raw <- matrix(0, nrow = nrow(meta), ncol = length(positions))
librarySums <- numeric(nrow(meta))
p <- attr(counts, 'p'); i <- attr(counts, 'i'); x <- attr(counts, 'x')
for (cell in seq_len(nrow(meta))) {
  if (p[cell + 1L] > p[cell]) {
    slots <- seq.int(p[cell] + 1L, p[cell + 1L])
    selected <- index[i[slots] + 1L]
    raw[cell, selected[selected > 0]] <- x[slots[selected > 0]]
    librarySums[cell] <- sum(x[slots])
  }
}
stopifnot(all(librarySums > 0), sum(librarySums) == 16620589)
normalized <- log1p(raw / librarySums * 10000)
clusters <- unique(as.character(meta$seurat_clusters))
means <- sapply(clusters, function(cluster) colMeans(normalized[as.character(meta$seurat_clusters) == cluster, , drop = FALSE]))
geneMeans <- rowMeans(means)
sdPopulation <- sqrt(rowMeans((means - geneMeans)^2))
maximumError <- 0
comparisons <- 0L
for (r in seq_len(nrow(expected))) {
  e <- expected[r, ]
  g <- match(e$sourceGeneId, sourceGenes)
  selected <- as.character(meta$seurat_clusters) == e$cluster
  meanValue <- mean(normalized[selected, g])
  restMean <- mean(normalized[!selected, g])
  z <- if (sdPopulation[g] > 1e-12) (meanValue - geneMeans[g]) / sdPopulation[g] else 0
  actual <- c(meanValue, restMean, mean(raw[selected, g] > 0), mean(raw[!selected, g] > 0), meanValue - restMean, z)
  target <- as.numeric(e[c('meanLogExpression', 'otherMeanLogExpression', 'detectionFraction', 'otherDetectionFraction', 'enrichment', 'zScore')])
  error <- max(abs(actual - target))
  stopifnot(is.finite(error), error < 1e-10)
  maximumError <- max(maximumError, error)
  comparisons <- comparisons + length(actual)
}
cat(sprintf('{"stage":"independent_r_verified","comparisons":%d,"genes":%d,"clusters":%d,"maximumError":%.17g}\n', comparisons, length(sourceGenes), length(clusters), maximumError))
