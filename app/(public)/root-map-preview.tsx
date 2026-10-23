"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

type PreviewData = {
  clusters: { id: string; nCells: number }[];
  points: [number, number, number][];
};

// Public, source-derived plot only. No researcher data or inferred cell identities.
export function RootMapPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<PreviewData | null>(null);
  const [cluster, setCluster] = useState("6");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/images/soybean-root-umap.json", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Preview unavailable");
        return response.json() as Promise<PreviewData>;
      })
      .then(setData)
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    if (!data || !canvas.current) return;
    const element = canvas.current;
    const context = element.getContext("2d");
    if (!context) return;
    const draw = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const ratio = window.devicePixelRatio || 1;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const xs = data.points.map(([x]) => x);
      const ys = data.points.map(([, y]) => y);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs);
      const minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const padding = 24;
      const scale = Math.min(
        (width - padding * 2) / (maxX - minX),
        (height - padding * 2) / (maxY - minY),
      );
      const offsetX = (width - (maxX - minX) * scale) / 2;
      const offsetY = (height - (maxY - minY) * scale) / 2;
      const selectedIndex = data.clusters.findIndex(
        (item) => item.id === cluster,
      );
      const drawPoints = (selected: boolean) => {
        context.fillStyle = selected ? "#1b5e20" : "#cbd4c9";
        context.globalAlpha = selected ? 0.88 : 0.68;
        context.beginPath();
        for (const [x, y, index] of data.points) {
          if ((index === selectedIndex) !== selected) continue;
          const cx = offsetX + (x - minX) * scale;
          const cy = height - offsetY - (y - minY) * scale;
          const radius = selected ? 1.65 : 1.25;
          context.moveTo(cx + radius, cy);
          context.arc(cx, cy, radius, 0, Math.PI * 2);
        }
        context.fill();
      };
      drawPoints(false);
      drawPoints(true);
      context.globalAlpha = 1;
    };
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    draw();
    return () => observer.disconnect();
  }, [cluster, data]);

  const selected = data?.clusters.find((item) => item.id === cluster);
  return (
    <figure className={styles.mapCard}>
      <div className={styles.mapTopline}>
        <div>
          <span className={styles.kicker}>Public data preview</span>
          <h3>Soybean root atlas</h3>
        </div>
        <span className={styles.mapBadge}>UMAP</span>
      </div>
      <div className={styles.mapControls}>
        <label htmlFor="landing-cluster">Highlight a source cluster</label>
        <select
          id="landing-cluster"
          value={cluster}
          onChange={(event) => setCluster(event.target.value)}
          disabled={!data}
        >
          {data ? (
            data.clusters.map((item) => (
              <option key={item.id} value={item.id}>
                Cluster {item.id}
              </option>
            ))
          ) : (
            <option value="6">Cluster 6</option>
          )}
        </select>
      </div>
      <div className={styles.plot}>
        <canvas
          ref={canvas}
          aria-label={`Published soybean root UMAP with 7,496 nuclei. ${selected ? `${selected.nCells} nuclei in cluster ${cluster} are highlighted green.` : "Loading data."}`}
          role="img"
        />
        {!data && (
          <p className={styles.plotStatus} role="status">
            {failed
              ? "The preview could not load. You can still open the demo."
              : "Loading the published cell map…"}
          </p>
        )}
        <span className={styles.plotAxisX}>UMAP 1</span>
        <span className={styles.plotAxisY}>UMAP 2</span>
      </div>
      <div className={styles.mapSummary} aria-live="polite">
        <span>
          <span className={styles.dot} aria-hidden="true" />
          Cluster {cluster}
        </span>
        <strong>
          {selected ? `${selected.nCells.toLocaleString("en-US")} nuclei` : "—"}
        </strong>
      </div>
      <figcaption>
        All 7,496 nuclei from GSE270392. Original author UMAP; cluster IDs are
        groups to investigate, not cell-type labels.
      </figcaption>
    </figure>
  );
}
