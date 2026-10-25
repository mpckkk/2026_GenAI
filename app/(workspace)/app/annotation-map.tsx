"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnnotationMap } from "@/app/core/analysis";
import type {
  AnnotationCluster,
  AnnotationResult,
} from "@/app/core/annotation";
import styles from "./annotation-map.module.css";
import { plantDefinitions } from "@/app/plant-catalog";

const palette = [
  "#548c72",
  "#b77a61",
  "#8c78b4",
  "#658fa9",
  "#c29a43",
  "#379a95",
  "#a56c96",
  "#779545",
];
const number = new Intl.NumberFormat("en-GB");
export function annotationColors(clusters: AnnotationCluster[]) {
  const labels = [
    ...new Set(
      clusters
        .filter((c) => c.status === "suggested" && c.suggestedLabel)
        .map((c) => c.suggestedLabel!),
    ),
  ].sort();
  return new Map(
    clusters.map((c) => [
      c.cluster,
      c.status === "suggested" && c.suggestedLabel
        ? palette[labels.indexOf(c.suggestedLabel) % palette.length]
        : c.status === "ambiguous"
          ? "#d5ae69"
          : "#b7c1bd",
    ]),
  );
}

export function AnnotationMapView({
  projectId,
  runId,
  result,
  selected,
  onSelect,
}: {
  projectId: string;
  runId: string;
  result: AnnotationResult;
  selected: string;
  onSelect: (cluster: string) => void;
}) {
  const [map, setMap] = useState<AnnotationMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/analyses/${runId}/map`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = (await response.json()) as AnnotationMap;
        if (
          !response.ok ||
          data.runId !== runId ||
          data.dataset?.artifactVersion !== result.dataset.artifactVersion ||
          !Array.isArray(data.embedding?.points)
        )
          throw new Error(
            "The cell map could not be loaded for this saved dataset. Your annotation evidence is still available below.",
          );
        if (!controller.signal.aborted) {
          setMap(data);
          setError(null);
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "The cell map could not be loaded.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId, runId, result.dataset.artifactVersion, attempt]);

  const plot = useMemo(() => {
    if (!map) return null;
    const points = map.embedding.points;
    const bounds = points.reduce(
      (b, p) => ({
        minX: Math.min(b.minX, p.x),
        maxX: Math.max(b.maxX, p.x),
        minY: Math.min(b.minY, p.y),
        maxY: Math.max(b.maxY, p.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );
    const scale = Math.min(
      620 / (bounds.maxX - bounds.minX || 1),
      330 / (bounds.maxY - bounds.minY || 1),
    );
    const colors = annotationColors(result.payload.clusters);
    const groups = new Map<string, { x: number; y: number }[]>();
    for (const point of points) {
      const coordinates = {
        x: 360 + (point.x - (bounds.maxX + bounds.minX) / 2) * scale,
        y: 260 - (point.y - (bounds.maxY + bounds.minY) / 2) * scale,
      };
      if (!groups.has(point.cluster)) groups.set(point.cluster, []);
      groups.get(point.cluster)!.push(coordinates);
    }
    const legends = new Map<
      string,
      { label: string; color: string; count: number }
    >();
    const labelBoxes: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    const labels: {
      cluster: string;
      text: string;
      x: number;
      y: number;
      cx: number;
      cy: number;
      width: number;
    }[] = [];
    for (const [id, coordinates] of groups) {
      const cluster = result.payload.clusters.find((c) => c.cluster === id);
      const label =
        cluster?.suggestedLabel && cluster.status === "suggested"
          ? cluster.suggestedLabel
          : cluster?.status === "ambiguous"
            ? "Ambiguous"
            : cluster
              ? "Unresolved"
              : "Not assessed";
      const color = colors.get(id) || "#e0e5e1";
      const previous = legends.get(label);
      legends.set(label, {
        label,
        color,
        count: (previous?.count || 0) + coordinates.length,
      });
      if (cluster?.status !== "suggested" || !cluster.suggestedLabel) continue;
      const cx = coordinates.reduce((s, p) => s + p.x, 0) / coordinates.length;
      const cy = coordinates.reduce((s, p) => s + p.y, 0) / coordinates.length;
      const width = label.length * 7 + 16;
      const offsets = [
        [14, -16],
        [14, 20],
        [-width - 14, -16],
        [-width - 14, 20],
        [14, -44],
        [-width / 2, 42],
        [14, 64],
        [-width - 14, -64],
      ];
      let box = {
        x: Math.max(20, Math.min(700 - width, cx + 14)),
        y: cy - 16,
        width,
        height: 24,
      };
      for (const [dx, dy] of offsets) {
        const candidate = {
          x: Math.max(20, Math.min(700 - width, cx + dx)),
          y: Math.max(88, Math.min(411, cy + dy)),
          width,
          height: 24,
        };
        if (
          !labelBoxes.some(
            (b) =>
              candidate.x < b.x + b.width + 5 &&
              candidate.x + width + 5 > b.x &&
              candidate.y < b.y + b.height + 5 &&
              candidate.y + 24 + 5 > b.y,
          )
        ) {
          box = candidate;
          break;
        }
      }
      labelBoxes.push(box);
      labels.push({
        cluster: id,
        text: label,
        x: box.x,
        y: box.y,
        cx,
        cy,
        width,
      });
    }
    return {
      groups,
      colors,
      labels,
      legends: [...legends.values()],
      height: 480 + Math.ceil(legends.size / 4) * 26,
    };
  }, [map, result.payload.clusters]);

  async function download() {
    if (!svg.current || !plot) return;
    setExporting(true);
    setExportError(null);
    let url: string | undefined;
    let png: string | undefined;
    try {
      const clone = svg.current.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", "1440");
      clone.setAttribute("height", String(plot.height * 2));
      url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], {
          type: "image/svg+xml;charset=utf-8",
        }),
      );
      const picture = new Image();
      picture.src = url;
      await picture.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1440;
      canvas.height = plot.height * 2;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Image export is unavailable in this browser.");
      context.drawImage(picture, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("The image could not be exported.")),
          "image/png",
        ),
      );
      png = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = png;
      link.download = `celloras-${result.dataset.id}-annotation.png`;
      link.click();
    } catch (failure) {
      setExportError(
        failure instanceof Error
          ? failure.message
          : "The image could not be exported.",
      );
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (png) setTimeout(() => URL.revokeObjectURL(png!), 1000);
      setExporting(false);
    }
  }

  if (error)
    return (
      <div className={styles.loading}>
        <p role="alert">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
        >
          Retry cell map
        </button>
      </div>
    );
  if (!map || !plot)
    return (
      <p role="status" className={styles.loading}>
        Loading the cells behind this annotation…
      </p>
    );
  return (
    <figure className={styles.figure}>
      <svg
        ref={svg}
        viewBox={`0 0 720 ${plot.height}`}
        role="img"
        aria-label={`Cell-type annotation map of ${number.format(map.embedding.points.length)} nuclei. Colors show computed suggestions, with ambiguous and unresolved groups kept separate.`}
        data-annotation-map="true"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        <rect width="720" height={plot.height} rx="12" fill="#fafcf9" />
        <text x="24" y="34" fontSize="20" fontWeight="600" fill="#233b2c">
          {plantDefinitions.find(
            (plant) => plant.id === result.dataset.speciesId,
          )?.commonName || result.dataset.species}{" "}
          {result.dataset.tissue}
        </text>
        <text x="24" y="56" fontSize="12" fill="#617164">
          {number.format(map.embedding.points.length)} nuclei · Cell-type
          suggestions
        </text>
        <text x="696" y="34" textAnchor="end" fontSize="11" fill="#718274">
          CELLORAS
        </text>
        {[...plot.groups]
          .sort(([a], [b]) => Number(a === selected) - Number(b === selected))
          .map(([id, points]) => (
            <g
              key={id}
              data-map-cluster={id}
              onClick={() => onSelect(id)}
              style={{ cursor: "pointer" }}
              fill={plot.colors.get(id) || "#e0e5e1"}
              opacity={id === selected ? 1 : 0.78}
            >
              <title>
                {result.payload.clusters.find((c) => c.cluster === id)
                  ?.suggestedLabel || "Identity open"}{" "}
                · Group {id} · {number.format(points.length)} nuclei
              </title>
              {points.map((p, index) => (
                <circle
                  key={index}
                  cx={p.x}
                  cy={p.y}
                  r={id === selected ? 1.9 : 1.65}
                />
              ))}
            </g>
          ))}
        {plot.labels.map((label) => (
          <g
            key={label.cluster}
            onClick={() => onSelect(label.cluster)}
            style={{ cursor: "pointer" }}
          >
            <line
              x1={label.cx}
              y1={label.cy}
              x2={label.x + label.width / 2}
              y2={label.y + 12}
              stroke="#91a095"
              strokeWidth="0.7"
            />
            <rect
              x={label.x}
              y={label.y}
              width={label.width}
              height="24"
              rx="6"
              fill="white"
              fillOpacity="0.94"
              stroke={
                label.cluster === selected
                  ? plot.colors.get(label.cluster)
                  : "#e3e9e1"
              }
              strokeWidth="1"
            />
            <text
              x={label.x + 8}
              y={label.y + 16}
              fill="#263c2c"
              fontSize="12"
              fontWeight={label.cluster === selected ? "600" : "400"}
            >
              {label.text}
            </text>
          </g>
        ))}
        <path d="M28 405v28h35" fill="none" stroke="#87968b" strokeWidth="1" />
        <text x="29" y="448" fontSize="9" fill="#87968b">
          UMAP 1
        </text>
        <text
          x="13"
          y="416"
          fontSize="9"
          fill="#87968b"
          transform="rotate(-90 13 416)"
        >
          UMAP 2
        </text>
        <line x1="24" y1="464" x2="696" y2="464" stroke="#e0e7dc" />
        {plot.legends.map((item, index) => (
          <g
            key={item.label}
            transform={`translate(${28 + (index % 4) * 172},${487 + Math.floor(index / 4) * 26})`}
          >
            <circle r="4" cy="-4" fill={item.color} />
            <text x="11" fontSize="11" fill="#435448">
              {item.label}{" "}
              <tspan fill="#829084">{number.format(item.count)}</tspan>
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        <span>Select a cell group to see its evidence below.</span>
        <button
          type="button"
          onClick={() => void download()}
          disabled={exporting}
        >
          {exporting ? "Saving image…" : "Download image ↓"}
        </button>
      </figcaption>
      {exportError && (
        <p className={styles.error} role="alert">
          {exportError}
        </p>
      )}
    </figure>
  );
}
