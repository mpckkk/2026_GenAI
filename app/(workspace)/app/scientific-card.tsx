"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  AnalysisReview,
  AnalysisRun,
  ScientificRun,
} from "@/app/core/analysis";
import type {
  ScientificPoint,
  ScientificResult,
} from "@/app/core/scientific-data";
import type { GuidedAction } from "./next-actions";
import styles from "./scientific-card.module.css";

const number = new Intl.NumberFormat("en-GB");
const percent = (value: number) => `${(100 * value).toFixed(1)}%`;

export interface ScientificSelection {
  datasetId: string;
  cluster: string | null;
}

export function AnalysisReviewForm({
  projectId,
  runId,
  cluster,
  initialReviews = [],
}: {
  projectId: string;
  runId: string;
  cluster?: string | null;
  initialReviews?: AnalysisReview[];
}) {
  const id = useId();
  const submissionId = useRef<string | null>(null);
  const [decision, setDecision] =
    useState<AnalysisReview["decision"]>("uncertain");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState<AnalysisReview | null>(null);
  const latest = saved ?? initialReviews[0];
  const history = saved
    ? initialReviews.filter((review) => review.id !== saved.id)
    : initialReviews.slice(1);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !note.trim()) return;
    const asNew =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("name") ===
      "saveAsNew";
    if (asNew && !conflict) return;
    setPending(true);
    setError(null);
    if (!submissionId.current || asNew)
      submissionId.current = crypto.randomUUID();
    try {
      const response = await fetch(
        `/api/projects/${projectId}/analyses/${runId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId: submissionId.current,
            decision,
            note,
            ...(cluster ? { cluster } : {}),
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Your review could not be saved. Please retry.",
        );
      }
      if (!body.review?.id)
        throw new Error(
          "The saved review could not be confirmed. Retry to check the same save.",
        );
      setSaved(body.review);
      submissionId.current = null;
      setConflict(false);
      setNote("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The save could not be confirmed. Your interpretation is still here; retry to check the same save.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.review}>
      {latest && (
        <div role={saved ? "status" : undefined}>
          <h4>Your saved interpretation</h4>
          <p className={styles.caption}>
            {latest.decision === "supported"
              ? "Supported by current evidence"
              : latest.decision === "uncertain"
                ? "Uncertain — needs more evidence"
                : "Interpretation rejected"}
            {latest.cluster ? ` · Cluster ${latest.cluster}` : ""}
          </p>
          <p className={styles.caption}>{latest.note}</p>
          <p className={styles.caption}>
            {new Date(latest.createdAt).toLocaleString("en-GB", {
              timeZone: "UTC",
            })}{" "}
            UTC · Earlier results and reviews are preserved.
          </p>
        </div>
      )}
      {history.length > 0 && (
        <details>
          <summary>Earlier interpretations ({history.length})</summary>
          {history.map((review) => (
            <div key={review.id}>
              <p className={styles.caption}>
                <strong>{review.decision}</strong>
                {review.cluster ? ` · Cluster ${review.cluster}` : ""} ·{" "}
                {new Date(review.createdAt).toLocaleString("en-GB", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </p>
              <p className={styles.caption}>{review.note}</p>
            </div>
          ))}
        </details>
      )}
      <details>
        <summary>
          {latest ? "Add another interpretation" : "Save my interpretation"}
        </summary>
        <form
          onSubmit={(event) => void save(event)}
          aria-label="Save your scientific interpretation"
        >
          <p className={styles.caption}>
            Record your judgment and the evidence behind it
            {cluster ? ` for cluster ${cluster}` : ""}. This does not change the
            source data or turn a cluster ID into an annotation.
          </p>
          <label htmlFor={`${id}-decision`}>
            How well is your interpretation supported?
          </label>
          <select
            id={`${id}-decision`}
            value={decision}
            disabled={pending}
            onChange={(event) =>
              setDecision(event.target.value as AnalysisReview["decision"])
            }
          >
            <option value="uncertain">Uncertain — needs more evidence</option>
            <option value="supported">Supported by current evidence</option>
            <option value="rejected">Interpretation rejected</option>
          </select>
          <label htmlFor={`${id}-note`}>Your interpretation and reasons</label>
          <textarea
            id={`${id}-note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            required
            maxLength={4000}
            disabled={pending}
            placeholder="What do you conclude, what supports it, and what remains unresolved?"
          />
          {error && (
            <p role="alert" className={styles.error}>
              {error} Your draft is retained.
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.button}
              data-primary="true"
              disabled={pending || !note.trim()}
            >
              {pending ? "Saving interpretation…" : "Save interpretation"}
            </button>
            {conflict && (
              <button
                type="submit"
                name="saveAsNew"
                className={styles.button}
                disabled={pending || !note.trim()}
              >
                Save as a new interpretation
              </button>
            )}
          </div>
        </form>
      </details>
    </div>
  );
}

export function ScientificCard({
  run,
  selection,
  onSelect,
  onRun,
  onLoaded,
  actionsDisabled,
}: {
  run: ScientificRun;
  selection: ScientificSelection | null;
  onSelect: (selection: ScientificSelection) => void;
  onRun: (action: GuidedAction) => void;
  onLoaded: (result: ScientificResult) => void;
  actionsDisabled: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState<{
    result: ScientificResult;
    reviews: AnalysisReview[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void (async () => {
          try {
            const response = await fetch(
              `/api/projects/${run.projectId}/analyses/${run.id}`,
              { cache: "no-store", signal: controller.signal },
            );
            const body = (await response.json()) as AnalysisRun & {
              reviews: AnalysisReview[];
              error?: string;
            };
            if (!response.ok)
              throw new Error(
                body.error ||
                  "This saved result could not be loaded. Please retry.",
              );
            if (
              body.id !== run.id ||
              !("operation" in body.result) ||
              !("payload" in body.result)
            )
              throw new Error(
                "The scientific result is incomplete. No plot was substituted.",
              );
            if (controller.signal.aborted) return;
            setLoaded({ result: body.result, reviews: body.reviews });
            setError(null);
            onLoaded(body.result);
          } catch (failure) {
            if (!controller.signal.aborted)
              setError(
                failure instanceof Error
                  ? failure.message
                  : "This saved result could not be loaded. Please retry.",
              );
          }
        })();
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [run.id, run.projectId, attempt, onLoaded]);
  return (
    <section
      ref={container}
      className={styles.card}
      data-response-card="scientific_result"
      data-analysis-id={run.id}
      aria-label="Scientific result card"
    >
      <header className={styles.header}>
        <strong>
          {run.result.operation === "inspect"
            ? "Cell map"
            : run.result.operation === "markers"
              ? "Marker exploration"
              : run.result.operation === "expression"
                ? "Gene expression"
                : "Expression comparison"}
        </strong>
        <span>Computed from published data</span>
      </header>
      {loaded ? (
        <>
          <ScientificResultContent
            result={loaded.result}
            selection={selection}
            onSelect={onSelect}
            onRun={onRun}
            actionsDisabled={actionsDisabled}
          />
          <AnalysisReviewForm
            projectId={run.projectId}
            runId={run.id}
            cluster={
              loaded.result.operation === "markers"
                ? loaded.result.payload.cluster
                : null
            }
            initialReviews={loaded.reviews}
          />
        </>
      ) : error ? (
        <div className={styles.body}>
          <p role="alert" className={styles.error}>
            {error}
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry loading the result
          </button>
        </div>
      ) : (
        <p role="status" className={styles.loading}>
          Loading the saved scientific result…
        </p>
      )}
    </section>
  );
}

function expressionColor(value: number, max: number) {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return `rgb(${Math.round(237 - 210 * fraction)}, ${Math.round(241 - 147 * fraction)}, ${Math.round(237 - 205 * fraction)})`;
}

function Umap({
  points,
  expression,
  selectedCluster,
  onSelect,
}: {
  points: ScientificPoint[];
  expression?: { gene: string; range: [number, number] };
  selectedCluster: string | null;
  onSelect: (cluster: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const projected = useRef<{ point: ScientificPoint; x: number; y: number }[]>(
    [],
  );
  const [hover, setHover] = useState<ScientificPoint | null>(null);
  const bounds = useMemo(
    () =>
      points.reduce(
        (box, point) => ({
          minX: Math.min(box.minX, point.x),
          maxX: Math.max(box.maxX, point.x),
          minY: Math.min(box.minY, point.y),
          maxY: Math.max(box.maxY, point.y),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      ),
    [points],
  );

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    function draw() {
      if (!element) return;
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const ratio = window.devicePixelRatio || 1;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      const context = element.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.clearRect(0, 0, width, height);
      const scale = Math.min(
        (width - 48) / (bounds.maxX - bounds.minX || 1),
        (height - 32) / (bounds.maxY - bounds.minY || 1),
      );
      const centerX = (bounds.maxX + bounds.minX) / 2;
      const centerY = (bounds.maxY + bounds.minY) / 2;
      projected.current = points.map((point) => ({
        point,
        x: width / 2 + (point.x - centerX) * scale,
        y: height / 2 - (point.y - centerY) * scale,
      }));
      const ordered = selectedCluster
        ? [...projected.current].sort(
            (a, b) =>
              Number(a.point.cluster === selectedCluster) -
              Number(b.point.cluster === selectedCluster),
          )
        : projected.current;
      for (const { point, x, y } of ordered) {
        context.fillStyle = expression
          ? expressionColor(point.value ?? 0, expression.range[1])
          : selectedCluster === point.cluster
            ? "#1b5e20"
            : selectedCluster
              ? "#e2e5e1"
              : "#6b786d";
        context.beginPath();
        context.arc(
          x,
          y,
          selectedCluster === point.cluster ? 2 : 1.65,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    draw();
    return () => observer.disconnect();
  }, [points, bounds, expression, selectedCluster]);

  function nearest(event: {
    currentTarget: HTMLCanvasElement;
    clientX: number;
    clientY: number;
  }) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    let result: ScientificPoint | null = null;
    let distance = 64;
    for (const candidate of projected.current) {
      const squared = (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
      if (squared < distance) {
        distance = squared;
        result = candidate.point;
      }
    }
    return result;
  }

  return (
    <div className={styles.plot}>
      <span className={styles.axisY}>UMAP 2</span>
      <canvas
        ref={canvas}
        className={styles.canvas}
        role="img"
        aria-label={`Published UMAP of ${number.format(points.length)} nuclei${expression ? `, colored by ${expression.gene} expression` : ", with selectable source clusters"}. Select a cluster using the buttons below.`}
        onPointerMove={(event) => setHover(nearest(event))}
        onPointerLeave={() => setHover(null)}
        onClick={(event) => {
          const point = nearest(event);
          if (point) onSelect(point.cluster);
        }}
      />
      <p className={styles.axisX}>UMAP 1</p>
      <p className={styles.plotReadout}>
        {hover
          ? `Cluster ${hover.cluster} · ${hover.sampleId}${expression ? ` · ${hover.value?.toFixed(2)} log1p(CP10k) · ${hover.rawCount} raw counts` : ""}`
          : "Select a group on the plot or use the cluster buttons below."}
      </p>
      {expression && (
        <div className={styles.legend}>
          <span>0</span>
          <span className={styles.legendScale} />
          <span>{expression.range[1].toFixed(2)} log1p(CP10k)</span>
        </div>
      )}
    </div>
  );
}

function Dotplot({
  result,
  onSelect,
}: {
  result: Extract<ScientificResult, { operation: "dotplot" }>;
  onSelect: (cluster: string) => void;
}) {
  const { genes, clusters, values } = result.payload;
  const width = Math.max(360, 100 + genes.length * 96);
  const height = 120 + clusters.length * 32;
  const max = Math.max(0, ...values.map((value) => value.meanLogExpression));
  return (
    <div
      className={styles.tableWrap}
      tabIndex={0}
      role="region"
      aria-label="Gene expression plot; scroll horizontally to see all genes"
    >
      <svg
        className={styles.dotplot}
        style={{ width, minWidth: "100%" }}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gene expression across source clusters. Dot area shows the fraction of nuclei with detected expression. Color shows mean log-normalized expression."
      >
        {genes.map((gene, index) => (
          <text
            key={gene.geneId}
            x={100 + index * 96}
            y={70}
            transform={`rotate(-35, ${100 + index * 96}, 70)`}
            fontSize="11"
            fill="#444"
          >
            {gene.geneId}
          </text>
        ))}
        {clusters.map((cluster, index) => (
          <g key={cluster.id}>
            <text x="8" y={104 + index * 32} fontSize="12" fill="#444">
              Cluster {cluster.id}
            </text>
            <line
              x1="80"
              x2={width - 16}
              y1={100 + index * 32}
              y2={100 + index * 32}
              stroke="#f0f0f0"
            />
          </g>
        ))}
        {values.map((value) => {
          const x = genes.findIndex((gene) => gene.geneId === value.geneId);
          const y = clusters.findIndex(
            (cluster) => cluster.id === value.cluster,
          );
          return (
            <circle
              key={`${value.geneId}:${value.cluster}`}
              cx={100 + x * 96}
              cy={100 + y * 32}
              r={Math.sqrt(value.detectionFraction) * 12}
              fill={expressionColor(value.meanLogExpression, max)}
              stroke="#c9d3c9"
              strokeWidth="0.5"
            >
              <title>{`${value.geneId} · Cluster ${value.cluster}: ${percent(value.detectionFraction)} detected, mean ${value.meanLogExpression.toFixed(3)} log1p(CP10k)`}</title>
            </circle>
          );
        })}
      </svg>
      <p className={styles.caption}>
        Dot area: fraction detected · Color: mean log1p(CP10k), 0–
        {max.toFixed(2)}. Zero detection produces no dot. Scroll sideways to see
        all genes when needed.
      </p>
      <details className={styles.caption}>
        <summary>Read the exact values</summary>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Gene</th>
              <th>Cluster</th>
              <th>Detected</th>
              <th>Mean expression</th>
            </tr>
          </thead>
          <tbody>
            {values.map((value) => (
              <tr key={`${value.geneId}:${value.cluster}`}>
                <td>
                  <code>{value.geneId}</code>
                </td>
                <td>
                  <button
                    className={styles.geneButton}
                    type="button"
                    onClick={() => onSelect(value.cluster)}
                  >
                    {value.cluster}
                  </button>
                </td>
                <td>{percent(value.detectionFraction)}</td>
                <td>{value.meanLogExpression.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function ScientificResultContent({
  result,
  selection,
  onSelect,
  onRun,
  actionsDisabled,
}: {
  result: ScientificResult;
  selection: ScientificSelection | null;
  onSelect: (selection: ScientificSelection) => void;
  onRun: (action: GuidedAction) => void;
  actionsDisabled: boolean;
}) {
  const [showAllMarkers, setShowAllMarkers] = useState(false);
  const markerTableId = useId();
  const dataset = result.dataset;
  const selectedCluster =
    selection?.datasetId === dataset.id ? selection.cluster : null;
  const select = (cluster: string) =>
    onSelect({ datasetId: dataset.id, cluster });
  const clusterButtons = [
    ...(result.operation === "inspect" || result.operation === "dotplot"
      ? result.payload.clusters
      : result.operation === "expression"
        ? Array.from(
            result.payload.embedding.points.reduce(
              (map, point) =>
                map.set(point.cluster, (map.get(point.cluster) ?? 0) + 1),
              new Map<string, number>(),
            ),
          ).map(([id, nCells]) => ({ id, nCells, publishedLabel: "" }))
        : []),
  ].sort((left, right) =>
    left.id.localeCompare(right.id, "en", { numeric: true }),
  );
  function inspectMarkers(cluster: string) {
    onRun({
      label: `Find markers for cluster ${cluster}`,
      prompt: `Find genes enriched in source cluster ${cluster} of ${dataset.title}. Explain the comparison and limits; do not assign a cell identity without evidence.`,
      action: { operation: "markers", datasetId: dataset.id, cluster },
    });
  }
  return (
    <>
      <div className={styles.body}>
        <h3>
          {result.operation === "inspect"
            ? "Explore the soybean root"
            : result.operation === "markers"
              ? `Genes enriched in cluster ${result.payload.cluster}`
              : result.operation === "expression"
                ? result.payload.gene.geneId
                : "Compare expression across groups"}
        </h3>
        <p className={styles.caption}>
          {dataset.species} · {dataset.tissue} · {dataset.source.accession}
        </p>
        {result.operation === "inspect" && (
          <div className={styles.facts}>
            <div>
              <strong>{number.format(dataset.nCells)}</strong>
              <span>nuclei</span>
            </div>
            <div>
              <strong>{result.payload.clusters.length}</strong>
              <span>source clusters</span>
            </div>
            <div>
              <strong>{number.format(dataset.nGenes)}</strong>
              <span>RNA features</span>
            </div>
          </div>
        )}
        {(result.operation === "inspect" ||
          result.operation === "expression") && (
          <Umap
            points={result.payload.embedding.points}
            selectedCluster={selectedCluster}
            onSelect={select}
            expression={
              result.operation === "expression"
                ? {
                    gene: result.payload.gene.geneId,
                    range: result.payload.range,
                  }
                : undefined
            }
          />
        )}
        {result.operation === "dotplot" && (
          <Dotplot result={result} onSelect={select} />
        )}
        {clusterButtons.length > 0 && (
          <>
            <p className={styles.caption}>
              Choose a source cluster to investigate. Cluster numbers are group
              identifiers, not cell-type annotations.
            </p>
            <div
              className={styles.clusterGrid}
              aria-label="Select a source cluster"
            >
              {clusterButtons.map((cluster) => (
                <button
                  type="button"
                  key={cluster.id}
                  aria-pressed={selectedCluster === cluster.id}
                  onClick={() => select(cluster.id)}
                >
                  Cluster {cluster.id}
                  <span>{number.format(cluster.nCells)} nuclei</span>
                </button>
              ))}
            </div>
            {selectedCluster && (
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  data-primary="true"
                  type="button"
                  disabled={actionsDisabled}
                  onClick={() => inspectMarkers(selectedCluster)}
                >
                  Find markers for cluster {selectedCluster} →
                </button>
              </div>
            )}
          </>
        )}
        {result.operation === "markers" && (
          <>
            <p className={styles.caption}>
              {number.format(result.payload.nCells)} nuclei compared with{" "}
              {number.format(result.payload.otherNCells)} remaining nuclei.
              Ranked enrichment is exploratory; it does not establish cell
              identity.
            </p>
            <div
              className={styles.tableWrap}
              style={
                showAllMarkers
                  ? { maxHeight: 440, overflowY: "auto" }
                  : undefined
              }
            >
              <table className={styles.table} id={markerTableId}>
                <thead>
                  <tr>
                    <th>Gene</th>
                    <th>Enrichment score</th>
                    <th>Detected in cluster</th>
                    <th>Detected elsewhere</th>
                  </tr>
                </thead>
                <tbody>
                  {result.payload.markers
                    .slice(0, showAllMarkers ? undefined : 6)
                    .map((gene) => (
                      <tr key={gene.geneId}>
                        <td>
                          <button
                            className={styles.geneButton}
                            type="button"
                            disabled={actionsDisabled}
                            title={`Show expression of ${gene.geneId}`}
                            onClick={() =>
                              onRun({
                                label: `Show ${gene.geneId}`,
                                prompt: `Show ${gene.geneId} expression on the published UMAP for ${dataset.title}. Explain expression beyond the selected cluster.`,
                                action: {
                                  operation: "expression",
                                  datasetId: dataset.id,
                                  genes: [gene.geneId],
                                },
                              })
                            }
                          >
                            {gene.geneId} ↗
                          </button>
                        </td>
                        <td>{gene.score.toFixed(3)}</td>
                        <td>{percent(gene.detectionFraction)}</td>
                        <td>{percent(gene.otherDetectionFraction)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className={styles.caption}>
              Select a gene to run an expression overlay. Showing{" "}
              {showAllMarkers
                ? result.payload.markers.length
                : Math.min(6, result.payload.markers.length)}{" "}
              of {result.payload.markers.length} returned genes.
            </p>
            {result.payload.markers.length > 0 && (
              <div className={styles.actions}>
                {result.payload.markers.length > 6 && (
                  <button
                    type="button"
                    className={styles.button}
                    aria-expanded={showAllMarkers}
                    aria-controls={markerTableId}
                    onClick={() => setShowAllMarkers((current) => !current)}
                  >
                    {showAllMarkers
                      ? "Show top 6 genes"
                      : `Show all ${result.payload.markers.length} genes`}
                  </button>
                )}
                <button
                  className={styles.button}
                  data-primary="true"
                  type="button"
                  disabled={actionsDisabled}
                  onClick={() =>
                    onRun({
                      label: "Compare top genes",
                      prompt: `Compare the top six enriched genes from source cluster ${result.payload.cluster} across all source clusters in ${dataset.title}. Show a dot plot and explain specificity.`,
                      action: {
                        operation: "dotplot",
                        datasetId: dataset.id,
                        genes: result.payload.markers
                          .slice(0, 6)
                          .map((gene) => gene.geneId),
                      },
                    })
                  }
                >
                  Compare top genes across clusters →
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <details className={styles.details}>
        <summary>Methods, source and limitations</summary>
        <p>
          <strong>{result.method.label}.</strong> {result.method.description}
        </p>
        <dl>
          <dt>Assay / layer</dt>
          <dd>
            {result.method.assay} / {result.method.layer}
          </dd>
          <dt>Genome build</dt>
          <dd>
            {dataset.genomeBuild} — {dataset.genomeBuildEvidence}
          </dd>
          <dt>Parameters</dt>
          <dd>
            {Object.entries(result.method.parameters)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" · ")}
          </dd>
          <dt>Dataset version</dt>
          <dd>
            <code>{dataset.artifactVersion}</code>
          </dd>
          <dt>Source file SHA-256</dt>
          <dd>
            <code>{dataset.source.sha256}</code>
          </dd>
        </dl>
        <p>
          <a
            href={dataset.source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source file (GEO) ↗
          </a>
          {" · "}
          <a
            href={dataset.source.paperUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Atlas paper ↗
          </a>
        </p>
        {result.warnings.length > 0 && (
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <p>
          Computed{" "}
          {new Date(result.generatedAt).toLocaleString("en-GB", {
            timeZone: "UTC",
          })}{" "}
          UTC. This result is saved separately from your interpretations.
        </p>
      </details>
    </>
  );
}
