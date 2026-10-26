"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/app/core/types";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./dataset-upload.module.css";

type Inspection = {
  nCells: number;
  nGenes: number;
  matrices: {
    key: string;
    label: string;
    shape: [number, number];
    sparse: boolean;
    dtype: string;
  }[];
  geneColumns: { key: string; label: string; scope: "main" | "raw" }[];
  groupColumns: {
    key: string;
    label: string;
    nGroups: number;
    examples: string[];
  }[];
  embeddings: { key: string; label: string; dimensions: number }[];
  warnings: string[];
};
type Upload = {
  uploadId: string;
  filename: string;
  sizeBytes: number;
  offset: number;
  fileFingerprint: string;
  status:
    | "uploading"
    | "inspect_queued"
    | "inspecting"
    | "awaiting_selection"
    | "import_queued"
    | "importing"
    | "ready"
    | "failed";
  inspection?: Inspection | null;
  error?: string | null;
  dataset?: {
    id: string;
    title: string;
    nCells: number;
    nGenes: number;
  } | null;
  url?: string;
};
type Selection = {
  matrix: string;
  geneColumn: string;
  groupColumn: string;
  embedding: string;
  genomeBuild: string;
  tissue: string;
  rawCountsConfirmed: boolean;
};
const blankSelection: Selection = {
  matrix: "",
  geneColumn: "",
  groupColumn: "",
  embedding: "",
  genomeBuild: "",
  tissue: "",
  rawCountsConfirmed: false,
};
const count = new Intl.NumberFormat("en-GB");
const pendingStatuses = new Set([
  "inspect_queued",
  "inspecting",
  "import_queued",
  "importing",
]);
const toError = (reason: unknown) =>
  reason instanceof Error
    ? reason.message
    : "The request could not be confirmed. Please retry.";
const fileSize = (bytes: number) =>
  bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GiB`
    : `${(bytes / 1024 ** 2).toFixed(bytes < 1024 ** 2 ? 2 : 1)} MiB`;

async function digest(buffer: ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
async function fingerprint(file: File) {
  const width = 1024 ** 2;
  return digest(
    await new Blob([
      file.slice(0, width),
      file.slice(Math.max(0, file.size - width)),
      String(file.size),
    ]).arrayBuffer(),
  );
}
async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        "Your session expired. Sign in again in another tab, then resume this upload.",
      );
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "The server could not confirm this step. Your uploaded progress is saved.",
    );
  }
  return body as T;
}

export function DatasetUpload({
  initialProject,
}: {
  initialProject: Project | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const stop = useRef(false);
  const [project, setProject] = useState(initialProject);
  const [name, setName] = useState(initialProject?.name ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(Boolean(initialProject));
  const [transferring, setTransferring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(blankSelection);
  const [demoBytes, setDemoBytes] = useState<number | null>(null);
  const limits = useRef({ chunkSize: 8 * 1024 ** 2, maxBytes: 4 * 1024 ** 3 });
  const endpoint = project
    ? `/api/projects/${project.id}/dataset-uploads`
    : null;

  const uploadId = upload?.uploadId;
  const uploadStatus = upload?.status;
  useEffect(() => {
    let active = true;
    void fetch("/api/datasets/demo-h5ad", { method: "HEAD", cache: "no-store" })
      .then((response) => {
        const bytes = Number(response.headers.get("Content-Length"));
        if (active && response.ok && Number.isSafeInteger(bytes) && bytes > 0)
          setDemoBytes(bytes);
      })
      .catch(() => {
        /* The optional demo download is shown only when available. */
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!endpoint) return;
    let active = true;
    void fetch(endpoint, { cache: "no-store" })
      .then(
        readResponse<{
          upload: Upload | null;
          attached: boolean;
          chunkSize: number;
          maxBytes: number;
        }>,
      )
      .then((result) => {
        if (!active) return;
        limits.current = {
          chunkSize: result.chunkSize,
          maxBytes: result.maxBytes,
        };
        if (result.attached && result.upload?.status !== "ready") {
          router.replace(`/app/projects/${project!.id}`);
          return;
        }
        if (!busy.current) setUpload(result.upload);
      })
      .catch((reason) => {
        if (active) setError(toError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint, project, router]);

  useEffect(() => {
    if (
      !uploadId ||
      !uploadStatus ||
      !endpoint ||
      !pendingStatuses.has(uploadStatus)
    )
      return;
    let disposed = false;
    const timer = window.setInterval(() => {
      void fetch(`${endpoint}/${uploadId}`, { cache: "no-store" })
        .then(readResponse<Upload>)
        .then((latest) => {
          if (!disposed) {
            setUpload(latest);
            setError(null);
          }
        })
        .catch((reason) => {
          if (!disposed) setError(toError(reason));
        });
    }, 2000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [endpoint, uploadId, uploadStatus]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    if (transferring) window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [transferring]);

  useEffect(
    () => () => {
      stop.current = true;
    },
    [],
  );

  function choose(candidate?: File) {
    if (!candidate || busy.current) return;
    if (!/\.h5ad$/i.test(candidate.name)) {
      setError("Choose an AnnData file ending in .h5ad.");
      return;
    }
    if (!candidate.size || candidate.size > limits.current.maxBytes) {
      setError(
        `Choose a non-empty .h5ad file up to ${fileSize(limits.current.maxBytes)}.`,
      );
      return;
    }
    if (
      upload?.status === "uploading" &&
      (candidate.name !== upload.filename ||
        candidate.size !== upload.sizeBytes)
    ) {
      setError(
        `Choose the original file, ${upload.filename} (${fileSize(upload.sizeBytes)}), to resume.`,
      );
      return;
    }
    setFile(candidate);
    setError(null);
    if (!name)
      setName(
        candidate.name
          .replace(/\.h5ad$/i, "")
          .replace(/[_-]+/g, " ")
          .slice(0, 120),
      );
  }

  async function transfer() {
    if (busy.current || !file) return;
    busy.current = true;
    stop.current = false;
    setTransferring(true);
    setError(null);
    try {
      const fileFingerprint = await fingerprint(file);
      let activeProject = project;
      if (!activeProject) {
        if (!name.trim()) throw new Error("Give this experiment a name.");
        activeProject = await readResponse<Project>(
          await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
          }),
        );
        setProject(activeProject);
        window.history.replaceState(
          null,
          "",
          `/app/upload?projectId=${activeProject.id}`,
        );
      }
      const base = `/api/projects/${activeProject.id}/dataset-uploads`;
      // Reconcile the server's acknowledged offset before any retry. A lost
      // response can mean a chunk was committed even though the browser failed.
      const saved = await readResponse<{
        upload: Upload | null;
        attached: boolean;
        chunkSize: number;
        maxBytes: number;
      }>(await fetch(base, { cache: "no-store" }));
      limits.current = { chunkSize: saved.chunkSize, maxBytes: saved.maxBytes };
      if (saved.attached)
        throw new Error(
          "This experiment already has a dataset. Open it, or add your file to a new experiment.",
        );
      let current = saved.upload;
      if (!current || current.status === "failed") {
        current = await readResponse<Upload>(
          await fetch(base, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              sizeBytes: file.size,
              fileFingerprint,
            }),
          }),
        );
      }
      if (current.status !== "uploading") {
        setUpload(current);
        return;
      }
      if (
        current.filename !== file.name ||
        current.sizeBytes !== file.size ||
        current.fileFingerprint !== fileFingerprint
      )
        throw new Error(
          "This file does not match the saved upload. Select the original file to continue.",
        );
      setUpload(current);
      while (current.offset < file.size && !stop.current) {
        const offset: number = current.offset;
        const bytes = await file
          .slice(offset, Math.min(offset + limits.current.chunkSize, file.size))
          .arrayBuffer();
        const chunkSha = await digest(bytes);
        if (stop.current) break;
        current = await readResponse<Upload>(
          await fetch(`${base}/${current.uploadId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/octet-stream",
              "Upload-Offset": String(offset),
              "x-chunk-sha256": chunkSha,
            },
            body: bytes,
          }),
        );
        if (current.offset !== offset + bytes.byteLength)
          throw new Error(
            "The saved upload position changed. Resume to check the server's progress.",
          );
        setUpload(current);
      }
      if (current.offset === file.size && !stop.current) {
        setUpload(
          await readResponse<Upload>(
            await fetch(`${base}/${current.uploadId}/complete`, {
              method: "POST",
            }),
          ),
        );
      }
    } catch (reason) {
      setError(toError(reason));
    } finally {
      busy.current = false;
      setTransferring(false);
    }
  }

  async function configure(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !endpoint || !upload) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      setUpload(
        await readResponse<Upload>(
          await fetch(`${endpoint}/${upload.uploadId}/selection`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...selection, speciesId: "glycine-max" }),
          }),
        ),
      );
    } catch (reason) {
      setError(toError(reason));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  const status = upload?.status;
  const inspection = upload?.inspection;
  const stage =
    status === "ready"
      ? 3
      : status && status !== "uploading" && status !== "failed"
        ? 2
        : 1;
  const percent = upload
    ? Math.round((100 * upload.offset) / upload.sizeBytes)
    : 0;
  const selectedMatrix = inspection?.matrices.find(
    (item) => item.key === selection.matrix,
  );
  const selectedGroup = inspection?.groupColumns.find(
    (item) => item.key === selection.groupColumn,
  );
  const waiting = status ? pendingStatuses.has(status) : false;
  const canChoose = !status || status === "uploading" || status === "failed";
  const change = (key: keyof Selection, value: string | boolean) =>
    setSelection((previous) => ({ ...previous, [key]: value }));

  return (
    <div className={styles.page}>
      <Link
        className={styles.back}
        href={project ? `/app/projects/${project.id}` : "/app"}
      >
        ← {project ? "Back to experiment" : "Experiments"}
      </Link>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>START WITH YOUR DATA</span>
        <h1>Add your single-cell dataset.</h1>
        <p>Bring your cells. Celloras helps you find out what they are.</p>
      </header>
      <ol className={styles.steps} aria-label="Dataset import progress">
        {["Upload", "Check data", "Open experiment"].map((label, index) => (
          <li
            key={label}
            data-active={stage === index + 1}
            data-complete={stage > index + 1}
            aria-current={stage === index + 1 ? "step" : undefined}
          >
            <span>{stage > index + 1 ? "✓" : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {loading ? (
        <p role="status" className={styles.loading}>
          Checking saved upload…
        </p>
      ) : (
        <>
          {canChoose && (
            <section
              className={styles.uploadSection}
              aria-label="Choose dataset"
            >
              {!project && (
                <label className={styles.nameLabel}>
                  Experiment name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Soybean root study"
                    maxLength={120}
                    disabled={transferring}
                  />
                </label>
              )}
              <input
                ref={input}
                type="file"
                accept=".h5ad"
                className={styles.fileInput}
                aria-label="Choose H5AD dataset"
                disabled={transferring}
                onChange={(event) => choose(event.target.files?.[0])}
              />
              {!file && (
                <button
                  type="button"
                  className={styles.dropzone}
                  data-dragging={dragging}
                  onClick={() => input.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    choose(event.dataTransfer.files[0]);
                  }}
                >
                  <span className={styles.uploadIcon}>
                    <WorkspaceIcon name="arrow" size={25} />
                  </span>
                  <strong>
                    {upload?.status === "uploading"
                      ? "Select your file to resume"
                      : "Drop your .h5ad file here"}
                  </strong>
                  <span>
                    {upload?.status === "uploading"
                      ? upload.filename
                      : "or choose a file"}
                  </span>
                  <small>AnnData · up to 4 GiB · resumable upload</small>
                </button>
              )}
              {!file && !upload && demoBytes && (
                <div className={styles.demoDownload}>
                  <span>Need a dataset?</span>
                  <a href="/api/datasets/demo-h5ad" download>
                    Download soybean root · {fileSize(demoBytes)}{" "}
                    <span aria-hidden="true">↓</span>
                  </a>
                  <small>
                    7,496 nuclei · Published GSE270392 data converted to H5AD.
                  </small>
                </div>
              )}
              {(file || upload?.status === "uploading") && (
                <div className={styles.fileCard}>
                  <div className={styles.fileHeading}>
                    <span className={styles.fileType}>H5AD</span>
                    <div>
                      <strong>{file?.name ?? upload?.filename}</strong>
                      <span>{fileSize(file?.size ?? upload!.sizeBytes)}</span>
                    </div>
                    {file && !transferring && (
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => input.current?.click()}
                      >
                        Change
                      </button>
                    )}
                  </div>
                  {upload?.status === "uploading" && (
                    <>
                      <div className={styles.progressLabels}>
                        <span>
                          {transferring ? "Uploading" : "Upload paused"}
                        </span>
                        <strong>{percent}%</strong>
                      </div>
                      <progress
                        value={upload.offset}
                        max={upload.sizeBytes}
                        aria-label="Dataset upload"
                      />
                      <p className={styles.hint}>
                        {fileSize(upload.offset)} of{" "}
                        {fileSize(upload.sizeBytes)} saved
                        {transferring
                          ? ". Keep this page open while your file uploads."
                          : ". Resume from this point with the same file."}
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className={styles.uploadActions}>
                {transferring ? (
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => {
                      stop.current = true;
                    }}
                  >
                    Pause upload
                  </button>
                ) : (
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={!file || (!project && !name.trim())}
                    onClick={() => void transfer()}
                  >
                    {upload?.status === "uploading"
                      ? "Resume upload"
                      : "Upload & check file"}
                    <WorkspaceIcon name="chevron" size={16} />
                  </button>
                )}
              </div>
              <details className={styles.requirements}>
                <summary>What should my file include?</summary>
                <p>
                  A processed soybean single-cell or single-nucleus dataset: raw
                  gene counts, cell groups and a UMAP. Celloras uses the groups
                  and map already in your file.
                </p>
                <p>
                  You’ll choose the count layer and genome build next.
                  Sequencing reads (FASTQ) and files containing only normalized
                  expression are not supported.
                </p>
              </details>
            </section>
          )}

          {waiting && (
            <section className={styles.processing} aria-live="polite">
              <span className={styles.spinner} aria-hidden="true" />
              <h2>
                {status === "inspect_queued" || status === "inspecting"
                  ? "Checking what’s in your file"
                  : "Preparing your cell map"}
              </h2>
              <p>
                {status === "inspect_queued" || status === "inspecting"
                  ? "Reading the expression layers, cell groups and saved coordinates."
                  : "Validating the raw counts and preparing measured expression for annotation."}
              </p>
              <p className={styles.hint}>
                Your file is uploaded. You can leave this page and return to
                this experiment.
              </p>
              <div className={styles.processingFile}>{upload?.filename}</div>
            </section>
          )}

          {status === "awaiting_selection" && inspection && (
            <form onSubmit={configure} className={styles.configure}>
              <div className={styles.inspectionHeading}>
                <div>
                  <span className={styles.eyebrow}>FILE RECEIVED</span>
                  <h2>Check your data.</h2>
                </div>
                <div className={styles.facts}>
                  <span>
                    <strong>{count.format(inspection.nCells)}</strong> cells
                  </span>
                  <span>
                    <strong>
                      {count.format(
                        selectedMatrix?.shape[1] ?? inspection.nGenes,
                      )}
                    </strong>{" "}
                    genes
                  </span>
                </div>
              </div>
              <p className={styles.intro}>
                Choose which measurements and cell groups Celloras should use.
              </p>
              <fieldset disabled={submitting}>
                <legend>Expression &amp; cell map</legend>
                <div className={styles.fields}>
                  <label>
                    Raw count layer
                    <select
                      required
                      aria-label="Raw count layer"
                      value={selection.matrix}
                      onChange={(event) =>
                        setSelection((previous) => ({
                          ...previous,
                          matrix: event.target.value,
                          geneColumn: "",
                          rawCountsConfirmed: false,
                        }))
                      }
                    >
                      <option value="">Choose a layer</option>
                      {inspection.matrices.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label} · {count.format(item.shape[1])} genes
                        </option>
                      ))}
                    </select>
                    <small>Original, unnormalized counts.</small>
                  </label>
                  <label>
                    Gene identifiers
                    <select
                      required
                      aria-label="Gene identifiers"
                      value={selection.geneColumn}
                      onChange={(event) =>
                        change("geneColumn", event.target.value)
                      }
                    >
                      <option value="">Choose gene IDs</option>
                      {inspection.geneColumns
                        .filter(
                          (item) =>
                            item.key === "_index" ||
                            item.scope ===
                              (selection.matrix === "raw/X" ? "raw" : "main"),
                        )
                        .map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label}
                          </option>
                        ))}
                    </select>
                    <small>Use identifiers such as Glyma.01G224900.</small>
                  </label>
                  <label>
                    Cell groups
                    <select
                      required
                      aria-label="Cell groups"
                      value={selection.groupColumn}
                      onChange={(event) =>
                        change("groupColumn", event.target.value)
                      }
                    >
                      <option value="">Choose a group column</option>
                      {inspection.groupColumns.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label} · {item.nGroups} groups
                        </option>
                      ))}
                    </select>
                    <small>
                      {selectedGroup
                        ? `${selectedGroup.nGroups} groups: ${selectedGroup.examples.slice(0, 4).join(", ")}${selectedGroup.nGroups > 4 ? "…" : ""}`
                        : "Existing clusters in your dataset."}
                    </small>
                  </label>
                  <label>
                    Cell map
                    <select
                      required
                      aria-label="Cell map"
                      value={selection.embedding}
                      onChange={(event) =>
                        change("embedding", event.target.value)
                      }
                    >
                      <option value="">Choose a UMAP</option>
                      {inspection.embeddings.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <small>Your saved two-dimensional UMAP.</small>
                  </label>
                </div>
              </fieldset>
              <fieldset disabled={submitting}>
                <legend>
                  Study context <span>Soybean · Glycine max</span>
                </legend>
                <div className={styles.fields}>
                  <label>
                    Tissue
                    <select
                      required
                      aria-label="Tissue"
                      value={selection.tissue}
                      onChange={(event) => change("tissue", event.target.value)}
                    >
                      <option value="">Choose tissue</option>
                      <option value="root">Root</option>
                      <option value="nodule">Nodule</option>
                      <option value="leaf">Leaf</option>
                      <option value="stem">Stem</option>
                      <option value="seed">Seed</option>
                      <option value="flower">Flower</option>
                      <option value="other">Other soybean tissue</option>
                    </select>
                  </label>
                  <label>
                    Genome build
                    <input
                      required
                      aria-label="Genome build"
                      value={selection.genomeBuild}
                      onChange={(event) =>
                        change("genomeBuild", event.target.value)
                      }
                      placeholder="e.g. Wm82v4"
                      maxLength={80}
                    />
                    <small>Use the build from your original analysis.</small>
                  </label>
                </div>
                <p className={styles.coverage}>
                  Cell-type annotation currently has a compatible reference for
                  soybean root, Wm82v4. Other contexts can be explored on the
                  map.
                </p>
              </fieldset>
              <label className={styles.confirmation}>
                <input
                  type="checkbox"
                  required
                  checked={selection.rawCountsConfirmed}
                  disabled={submitting}
                  onChange={(event) =>
                    change("rawCountsConfirmed", event.target.checked)
                  }
                />
                <span>
                  I confirm the selected layer contains raw, unnormalized gene
                  counts.
                  <small>
                    Celloras also checks that every count is finite, nonnegative
                    and an integer.
                  </small>
                </span>
              </label>
              {inspection.warnings.length > 0 && (
                <details className={styles.requirements}>
                  <summary>
                    File inspection notes ({inspection.warnings.length})
                  </summary>
                  <ul>
                    {inspection.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </details>
              )}
              {(!inspection.matrices.length ||
                !inspection.groupColumns.length ||
                !inspection.embeddings.length) && (
                <p className={styles.error} role="alert">
                  This file is missing a supported count matrix, cell groups or
                  a saved UMAP. Add them in your single-cell analysis tool and
                  export a new .h5ad file.
                </p>
              )}
              <button
                className={styles.primaryButton}
                disabled={
                  submitting ||
                  !inspection.matrices.length ||
                  !inspection.groupColumns.length ||
                  !inspection.embeddings.length
                }
                type="submit"
              >
                {submitting ? "Saving choices…" : "Prepare my experiment"}
                <WorkspaceIcon name="chevron" size={16} />
              </button>
            </form>
          )}

          {status === "ready" && project && (
            <section className={styles.success}>
              <span className={styles.successIcon}>✓</span>
              <span className={styles.eyebrow}>READY TO EXPLORE</span>
              <h2>Your cells are ready.</h2>
              <p>
                Open the cell map, ask Celloras to suggest cell types, and
                inspect the genes behind each suggestion.
              </p>
              {upload?.dataset && (
                <div className={styles.readyFacts}>
                  <span>
                    <strong>{count.format(upload.dataset.nCells)}</strong> cells
                  </span>
                  <span>
                    <strong>{count.format(upload.dataset.nGenes)}</strong> genes
                  </span>
                </div>
              )}
              <Link
                className={styles.primaryButton}
                href={`/app/projects/${project.id}`}
                onClick={() => router.refresh()}
              >
                Open my experiment
                <WorkspaceIcon name="chevron" size={16} />
              </Link>
            </section>
          )}
          {(error || (status === "failed" && upload?.error)) && (
            <div className={styles.error} role="alert">
              <strong>
                {status === "failed"
                  ? "This file could not be imported."
                  : "This step needs attention."}
              </strong>
              <p>{error || upload?.error}</p>
              {upload?.status === "uploading" && (
                <p>
                  Your completed chunks are saved. Resume to continue from the
                  last confirmed position.
                </p>
              )}
            </div>
          )}
        </>
      )}
      <footer className={styles.footer}>
        <WorkspaceIcon name="flask" size={16} />
        Your dataset stays in this experiment.
      </footer>
    </div>
  );
}
